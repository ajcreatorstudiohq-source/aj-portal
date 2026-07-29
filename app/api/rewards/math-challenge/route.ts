import { NextResponse } from 'next/server';
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../../../../firebaseConfig';
import { applyFlatCoins } from '../../../lib/reward-engine';
import {
  DAILY_CAPS,
  MATH_CHALLENGE_COINS,
} from '../../../lib/reward-sources';
import {
  bearerFromRequest,
  verifyFirebaseIdToken,
} from '../../../lib/verify-id-token';

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
 * action: complete → verify answer, credit 5 AJ Coins (max 5/day)
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

    const body = await request.json().catch(() => ({}));
    const action = String(body.action || 'prepare');
    const dayKey = dayKeyUtc();
    const userRef = doc(db, 'users', user.uid);
    const userSnap = await getDoc(userRef);
    if (!userSnap.exists()) {
      return NextResponse.json({ ok: false, error: 'user_not_found' }, { status: 404 });
    }
    const ud = userSnap.data() as {
      mathChallengeDayKey?: string;
      mathChallengeDayCount?: number;
    };
    const dailyCount =
      ud.mathChallengeDayKey === dayKey ? Number(ud.mathChallengeDayCount || 0) : 0;

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
      await setDoc(doc(db, 'math_challenge_sessions', sessionId), {
        uid: user.uid,
        prompt: q.prompt,
        answer: q.answer,
        createdAt: serverTimestamp(),
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
        { ok: false, error: 'daily_limit', remainingToday: 0 },
        { status: 429 }
      );
    }

    const sessionRef = doc(db, 'math_challenge_sessions', sessionId);
    const sessionSnap = await getDoc(sessionRef);
    if (!sessionSnap.exists()) {
      return NextResponse.json({ ok: false, error: 'invalid_session' }, { status: 400 });
    }
    const session = sessionSnap.data() as {
      uid: string;
      answer: number;
      expiresAt: number;
      consumed?: boolean;
      slot?: number;
      dayKey?: string;
    };
    if (session.uid !== user.uid) {
      return NextResponse.json({ ok: false, error: 'session_mismatch' }, { status: 403 });
    }
    if (session.consumed) {
      return NextResponse.json({
        ok: true,
        duplicate: true,
        creditedCoins: 0,
        message: 'Challenge already claimed',
      });
    }
    if (Date.now() > Number(session.expiresAt || 0)) {
      return NextResponse.json({ ok: false, error: 'session_expired' }, { status: 400 });
    }
    if (userAnswer !== Number(session.answer)) {
      await updateDoc(sessionRef, {
        failedAttempts: (Number((session as { failedAttempts?: number }).failedAttempts) || 0) + 1,
        lastWrongAt: serverTimestamp(),
      }).catch(() => {});
      return NextResponse.json(
        { ok: false, error: 'wrong_answer', message: 'Incorrect — try a new challenge.' },
        { status: 400 }
      );
    }

    const slot = typeof session.slot === 'number' ? session.slot : dailyCount;
    const txId = `math_challenge_${user.uid}_${dayKey}_${slot}`;
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
        lastMathChallengeAt: serverTimestamp(),
      },
    });

    if (!result.ok) {
      const status = result.error === 'daily_limit' || result.dailyCapHit ? 429 : 500;
      return NextResponse.json(
        {
          ok: false,
          error: result.dailyCapHit ? 'daily_limit' : result.error || 'credit_failed',
        },
        { status }
      );
    }

    await updateDoc(sessionRef, {
      consumed: true,
      completedAt: serverTimestamp(),
    });

    return NextResponse.json({
      ok: true,
      duplicate: !!result.duplicate,
      creditedCoins: result.balanceCredited ?? 0,
      balance: result.balance,
      remainingToday: Math.max(
        0,
        MAX_DAILY - (result.duplicate ? dailyCount : dailyCount + 1)
      ),
      message: result.duplicate
        ? 'Already credited'
        : `Correct! +${result.balanceCredited} AJ Coins 🪙`,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'math_challenge_failed';
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    rewardCoins: MATH_CHALLENGE_COINS,
    maxDaily: MAX_DAILY,
  });
}
