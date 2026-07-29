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
  ALPHA_CAPTCHA_COINS,
  DAILY_CAPS,
} from '../../../lib/reward-sources';
import {
  bearerFromRequest,
  verifyFirebaseIdToken,
} from '../../../lib/verify-id-token';

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
 * action: complete → verify typed code, credit 10 AJ Coins (max 5/day)
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
      alphaCaptchaDayKey?: string;
      alphaCaptchaDayCount?: number;
    };
    const dailyCount =
      ud.alphaCaptchaDayKey === dayKey ? Number(ud.alphaCaptchaDayCount || 0) : 0;

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
      await setDoc(doc(db, 'alpha_captcha_sessions', sessionId), {
        uid: user.uid,
        code,
        createdAt: serverTimestamp(),
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
        { ok: false, error: 'daily_limit', remainingToday: 0 },
        { status: 429 }
      );
    }

    const sessionRef = doc(db, 'alpha_captcha_sessions', sessionId);
    const sessionSnap = await getDoc(sessionRef);
    if (!sessionSnap.exists()) {
      return NextResponse.json({ ok: false, error: 'invalid_session' }, { status: 400 });
    }
    const session = sessionSnap.data() as {
      uid: string;
      code: string;
      expiresAt: number;
      consumed?: boolean;
      slot?: number;
    };
    if (session.uid !== user.uid) {
      return NextResponse.json({ ok: false, error: 'session_mismatch' }, { status: 403 });
    }
    if (session.consumed) {
      return NextResponse.json({
        ok: true,
        duplicate: true,
        creditedCoins: 0,
        message: 'Captcha already claimed',
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

    const slot = typeof session.slot === 'number' ? session.slot : dailyCount;
    const txId = `alpha_captcha_${user.uid}_${dayKey}_${slot}`;
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
        lastAlphaCaptchaAt: serverTimestamp(),
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
        : `Verified! +${result.balanceCredited} AJ Coins 🪙`,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'alpha_captcha_failed';
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    rewardCoins: ALPHA_CAPTCHA_COINS,
    maxDaily: MAX_DAILY,
  });
}
