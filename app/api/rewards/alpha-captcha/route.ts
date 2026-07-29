import { NextResponse } from 'next/server';
import { applyFlatCoins } from '../../../lib/reward-engine';
import {
  ALPHA_CAPTCHA_COINS,
  DAILY_CAPS,
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
const MAX_DAILY = DAILY_CAPS.alpha_captcha;
const CHARSET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no I/O/0/1 ambiguity

function dayKeyUtc() {
  return new Date().toISOString().slice(0, 10);
}

function makeCode(len = 6): string {
  let out = '';
  for (let i = 0; i < len; i++) {
    out += CHARSET[Math.floor(Math.random() * CHARSET.length)];
  }
  return out;
}

/**
 * POST /api/rewards/alpha-captcha
 * action: prepare  → 6-char alphanumeric challenge
 * action: complete → verify typed code, credit via Admin SDK
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
      alphaCaptchaDayKey?: string;
      alphaCaptchaDayCount?: number;
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
      ud.alphaCaptchaDayKey === dayKey ? Number(ud.alphaCaptchaDayCount || 0) : 0;
    const currentBalance = Math.max(0, Math.floor(Number(ud.balance) || 0));

    if (action === 'prepare') {
      if (dailyCount >= MAX_DAILY) {
        return NextResponse.json(
          {
            ok: false,
            error: 'daily_limit',
            remainingToday: 0,
            message: `Daily captcha limit (${MAX_DAILY}) reached.`,
          },
          { status: 429 }
        );
      }
      const code = makeCode(6);
      const sessionId = `acap_${user.uid}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      await adminDb.collection('alpha_captcha_sessions').doc(sessionId).set({
        uid: user.uid,
        code,
        createdAt: FieldValue.serverTimestamp(),
        expiresAt: Date.now() + SESSION_TTL_MS,
        dayKey,
        consumed: false,
        slot: dailyCount,
      });
      return NextResponse.json({
        ok: true,
        sessionId,
        code, // display-only challenge string (user must retype)
        rewardCoins: ALPHA_CAPTCHA_COINS,
        remainingToday: Math.max(0, MAX_DAILY - dailyCount),
      });
    }

    if (action !== 'complete') {
      return NextResponse.json({ ok: false, error: 'invalid_action' }, { status: 400 });
    }

    const sessionId = String(body.sessionId || '').trim();
    const typed = String(body.code || '')
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '');
    if (!sessionId || typed.length < 4) {
      return NextResponse.json({ ok: false, error: 'invalid_params' }, { status: 400 });
    }
    if (dailyCount >= MAX_DAILY) {
      return NextResponse.json(
        { ok: false, error: 'daily_limit', remainingToday: 0, balance: currentBalance },
        { status: 429 }
      );
    }

    const sessionRef = adminDb.collection('alpha_captcha_sessions').doc(sessionId);
    const sessionSnap = await sessionRef.get();
    if (!sessionSnap.exists) {
      return NextResponse.json({ ok: false, error: 'invalid_session' }, { status: 400 });
    }
    const session = sessionSnap.data() as {
      uid: string;
      code: string;
      expiresAt: number;
      consumed?: boolean;
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
        message: 'Captcha already claimed for this session. Start a new one.',
      });
    }
    if (Date.now() > Number(session.expiresAt || 0)) {
      return NextResponse.json({ ok: false, error: 'session_expired' }, { status: 400 });
    }
    if (typed !== String(session.code || '').toUpperCase()) {
      return NextResponse.json(
        { ok: false, error: 'wrong_code', message: 'Code mismatch — try a new captcha.' },
        { status: 400 }
      );
    }

    // Session-scoped ledger — never soft-lock on day/slot after economy reset.
    const txId = `alpha_captcha_${sessionId}`;
    const result = await applyFlatCoins({
      uid: user.uid,
      txId,
      source: 'alpha_captcha',
      coins: ALPHA_CAPTCHA_COINS,
      meta: { sessionId, verified: true },
      enforceDailyCap: true,
      userPatch: {
        alphaCaptchaDayKey: dayKey,
        alphaCaptchaDayCount: dailyCount + 1,
        lastAlphaCaptchaAt: FieldValue.serverTimestamp(),
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
                ? `Daily captcha limit (${MAX_DAILY}) reached.`
                : 'Credit failed. Please try a new captcha.',
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
        ? 'Already credited for this captcha session'
        : `Verified! +${result.balanceCredited} AJ Coins 🪙`,
    });
  } catch (e: unknown) {
    console.error('[alpha-captcha]', e);
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
    rewardCoins: ALPHA_CAPTCHA_COINS,
    maxDaily: MAX_DAILY,
  });
}
