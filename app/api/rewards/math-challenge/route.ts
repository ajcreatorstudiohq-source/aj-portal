import { NextResponse } from 'next/server';
import { applyFlatCoins } from '../../../lib/reward-engine';
import {
  DAILY_CAPS,
  MATH_CHALLENGE_COINS,
} from '../../../lib/reward-sources';
import {
  bearerFromRequest,
  verifyFirebaseIdToken,
} from '../../../lib/verify-id-token';
import { FieldValue, getAdminDb, getFirebaseAdminDiag } from '../../../lib/firebase-admin';
import { normalizeServerClaimFailure } from '../../../lib/claim-errors';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const SESSION_TTL_MS = 5 * 60 * 1000;
const MAX_DAILY = DAILY_CAPS.math_challenge;

function dayKeyUtc() {
  return new Date().toISOString().slice(0, 10);
}

function makeQuestion() {
  const ops = ['+', '-', '×'] as const;
  const op = ops[Math.floor(Math.random() * ops.length)];
  let a = 2 + Math.floor(Math.random() * 18); // 2–19
  let b = 2 + Math.floor(Math.random() * 18);
  if (op === '-' && b > a) {
    const t = a;
    a = b;
    b = t;
  }
  if (op === '×') {
    a = 2 + Math.floor(Math.random() * 9);
    b = 2 + Math.floor(Math.random() * 9);
  }
  const answer = op === '+' ? a + b : op === '-' ? a - b : a * b;
  const prompt = `${a} ${op} ${b}`;
  return { prompt, answer, a, b, op };
}

/**
 * POST /api/rewards/math-challenge
 * action: prepare  → new math question session
 * action: complete → verify answer, credit MATH_CHALLENGE_COINS (Admin SDK only)
 */
export async function POST(request: Request) {
  try {
    const token = bearerFromRequest(request);
    if (!token) {
      return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
    }
    const user = await verifyFirebaseIdToken(token);
    if (!user) {
      return NextResponse.json({ ok: false, error: 'invalid_token' }, { status: 401 });
    }

    const adminDb = getAdminDb();
    if (!adminDb) {
      const diag = getFirebaseAdminDiag();
      return NextResponse.json(
        {
          ok: false,
          error: 'admin_sdk_missing',
          message:
            diag.lastError ||
            'Server cannot credit coins. Configure FIREBASE_SERVICE_ACCOUNT_JSON.',
        },
        { status: 503 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const action = String(body.action || 'prepare');
    const dayKey = dayKeyUtc();
    const userRef = adminDb.collection('users').doc(user.uid);
    const userSnap = await userRef.get();
    if (!userSnap.exists) {
      return NextResponse.json({ ok: false, error: 'user_not_found' }, { status: 404 });
    }
    const ud = userSnap.data() as {
      mathChallengeDayKey?: string;
      mathChallengeDayCount?: number;
      balance?: number;
      isBanned?: boolean;
      accountStatus?: string;
    };
    if (ud.isBanned || ud.accountStatus === 'banned') {
      return NextResponse.json(
        { ok: false, error: 'account_banned', message: 'Account restricted.' },
        { status: 403 }
      );
    }
    const dailyCount =
      ud.mathChallengeDayKey === dayKey ? Number(ud.mathChallengeDayCount || 0) : 0;
    const currentBalance = Math.max(0, Math.floor(Number(ud.balance) || 0));

    if (action === 'prepare') {
      if (dailyCount >= MAX_DAILY) {
        return NextResponse.json(
          {
            ok: false,
            error: 'daily_limit',
            remainingToday: 0,
            message: `Daily Math Challenge limit (${MAX_DAILY}) reached.`,
          },
          { status: 429 }
        );
      }
      const q = makeQuestion();
      const sessionId = `math_${user.uid}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      await adminDb.collection('math_challenge_sessions').doc(sessionId).set({
        uid: user.uid,
        prompt: q.prompt,
        answer: q.answer,
        createdAt: FieldValue.serverTimestamp(),
        expiresAt: Date.now() + SESSION_TTL_MS,
        dayKey,
        consumed: false,
        slot: dailyCount,
      });
      return NextResponse.json({
        ok: true,
        sessionId,
        prompt: q.prompt,
        rewardCoins: MATH_CHALLENGE_COINS,
        remainingToday: Math.max(0, MAX_DAILY - dailyCount),
        expiresInSec: Math.floor(SESSION_TTL_MS / 1000),
      });
    }

    if (action !== 'complete') {
      return NextResponse.json({ ok: false, error: 'invalid_action' }, { status: 400 });
    }

    const sessionId = String(body.sessionId || '').trim();
    const userAnswer = Math.floor(Number(body.answer));
    if (!sessionId || !Number.isFinite(userAnswer)) {
      return NextResponse.json({ ok: false, error: 'invalid_params' }, { status: 400 });
    }
    if (dailyCount >= MAX_DAILY) {
      return NextResponse.json(
        { ok: false, error: 'daily_limit', remainingToday: 0, balance: currentBalance },
        { status: 429 }
      );
    }

    const sessionRef = adminDb.collection('math_challenge_sessions').doc(sessionId);
    const sessionSnap = await sessionRef.get();
    if (!sessionSnap.exists) {
      return NextResponse.json({ ok: false, error: 'invalid_session' }, { status: 400 });
    }
    const session = sessionSnap.data() as {
      uid: string;
      answer: number;
      expiresAt: number;
      consumed?: boolean;
      creditedCoins?: number;
      failedAttempts?: number;
    };
    if (session.uid !== user.uid) {
      return NextResponse.json({ ok: false, error: 'session_mismatch' }, { status: 403 });
    }
    if (session.consumed) {
      return NextResponse.json({
        ok: true,
        duplicate: true,
        creditedCoins: 0,
        balance: currentBalance,
        message: 'Challenge already claimed for this session. Start a new one.',
      });
    }
    if (Date.now() > Number(session.expiresAt || 0)) {
      return NextResponse.json({ ok: false, error: 'session_expired' }, { status: 400 });
    }
    if (userAnswer !== Number(session.answer)) {
      await sessionRef
        .set(
          {
            failedAttempts: (Number(session.failedAttempts) || 0) + 1,
            lastWrongAt: FieldValue.serverTimestamp(),
          },
          { merge: true }
        )
        .catch(() => {});
      return NextResponse.json(
        { ok: false, error: 'wrong_answer', message: 'Incorrect — try a new challenge.' },
        { status: 400 }
      );
    }

    // Session-scoped ledger — never soft-lock on day/slot after economy reset.
    const txId = `math_challenge_${sessionId}`;
    const result = await applyFlatCoins({
      uid: user.uid,
      txId,
      source: 'math_challenge',
      coins: MATH_CHALLENGE_COINS,
      meta: { sessionId, promptAnswered: true },
      ledgerCollection: 'reward_ledger',
      enforceDailyCap: true,
      userPatch: {
        mathChallengeDayKey: dayKey,
        mathChallengeDayCount: dailyCount + 1,
        lastMathChallengeAt: FieldValue.serverTimestamp(),
      },
    });

    if (!result.ok) {
      const status = result.error === 'daily_limit' || result.dailyCapHit ? 429 : 500;
      return NextResponse.json(
        {
          ok: false,
          error: result.dailyCapHit ? 'daily_limit' : result.error || 'credit_failed',
          balance: result.balance ?? currentBalance,
          message:
            result.error === 'admin_sdk_missing'
              ? 'Server cannot credit coins. Configure FIREBASE_SERVICE_ACCOUNT_JSON.'
              : result.dailyCapHit
                ? `Daily Math Challenge limit (${MAX_DAILY}) reached.`
                : 'Credit failed. Please try a new challenge.',
        },
        { status }
      );
    }

    await sessionRef.set(
      {
        consumed: true,
        completedAt: FieldValue.serverTimestamp(),
        creditedCoins: result.balanceCredited ?? 0,
        txId,
        balanceAfter: result.balance ?? null,
      },
      { merge: true }
    );

    return NextResponse.json({
      ok: true,
      duplicate: !!result.duplicate,
      creditedCoins: result.balanceCredited ?? 0,
      balance: result.balance ?? currentBalance,
      remainingToday: Math.max(
        0,
        MAX_DAILY - (result.duplicate ? dailyCount : dailyCount + 1)
      ),
      message: result.duplicate
        ? 'Already credited for this challenge session'
        : `Correct! +${result.balanceCredited} AJ Coins 🪙`,
    });
  } catch (e: unknown) {
    console.error('[math-challenge]', e);
    const norm = normalizeServerClaimFailure(e);
    return NextResponse.json(
      { ok: false, error: norm.error, message: norm.message },
      { status: norm.status }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    rewardCoins: MATH_CHALLENGE_COINS,
    maxDaily: MAX_DAILY,
  });
}
