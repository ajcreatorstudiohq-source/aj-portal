import { NextResponse } from 'next/server';
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
  increment,
} from 'firebase/firestore';
import { db } from '../../../../firebaseConfig';
import { OFFERWALL_VIDEO_MAX_DAILY } from '../../../lib/ads-config';
import { applySplitReward } from '../../../lib/reward-engine';
import {
  bearerFromRequest,
  verifyFirebaseIdToken,
} from '../../../lib/verify-id-token';

const SESSION_TTL_MS = 3 * 60 * 1000;

function dayKeyUtc() {
  return new Date().toISOString().slice(0, 10);
}

/**
 * POST /api/ads/rewarded
 * Auth: Bearer <Firebase ID token>
 *
 * action: 'prepare'  → create short-lived session (anti-replay)
 * action: 'complete' → validate session + credit via $1–$1.50 split (`offerwall_video`)
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
    const action = String(body.action || 'complete');
    const placement = String(body.placement || 'offerwall_rewarded_video').slice(0, 64);
    const dayKey = dayKeyUtc();
    const userRef = doc(db, 'users', user.uid);
    const userSnap = await getDoc(userRef);
    if (!userSnap.exists()) {
      return NextResponse.json({ ok: false, error: 'user_not_found' }, { status: 404 });
    }
    const ud = userSnap.data() as {
      offerwallVideoDayKey?: string;
      offerwallVideoDayCount?: number;
    };
    const dailyCount =
      ud.offerwallVideoDayKey === dayKey ? Number(ud.offerwallVideoDayCount || 0) : 0;

    if (action === 'prepare') {
      if (dailyCount >= OFFERWALL_VIDEO_MAX_DAILY) {
        return NextResponse.json(
          {
            ok: false,
            error: 'daily_limit',
            remainingToday: 0,
            message: `Daily video ad limit (${OFFERWALL_VIDEO_MAX_DAILY}) reached.`,
          },
          { status: 429 }
        );
      }
      const sessionId = `rv_${user.uid}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const expiresAt = Date.now() + SESSION_TTL_MS;
      await setDoc(doc(db, 'ad_reward_sessions', sessionId), {
        uid: user.uid,
        placement,
        createdAt: serverTimestamp(),
        expiresAt,
        dayKey,
        consumed: false,
        slot: dailyCount,
      });
      return NextResponse.json({
        ok: true,
        sessionId,
        expiresAt,
        remainingToday: Math.max(0, OFFERWALL_VIDEO_MAX_DAILY - dailyCount),
        userRewardUsd: { min: 1.0, max: 1.5 },
        providerPoolUsd: { min: 5.0, max: 7.0 },
      });
    }

    if (action !== 'complete') {
      return NextResponse.json({ ok: false, error: 'invalid_action' }, { status: 400 });
    }

    const sessionId = String(body.sessionId || '').trim();
    if (!sessionId) {
      return NextResponse.json({ ok: false, error: 'missing_session' }, { status: 400 });
    }

    const sessionRef = doc(db, 'ad_reward_sessions', sessionId);
    const sessionSnap = await getDoc(sessionRef);
    if (!sessionSnap.exists()) {
      return NextResponse.json({ ok: false, error: 'invalid_session' }, { status: 400 });
    }
    const session = sessionSnap.data() as {
      uid: string;
      expiresAt: number;
      consumed?: boolean;
      slot?: number;
      placement?: string;
    };
    if (session.uid !== user.uid) {
      return NextResponse.json({ ok: false, error: 'session_mismatch' }, { status: 403 });
    }
    if (session.consumed) {
      return NextResponse.json({
        ok: true,
        duplicate: true,
        creditedCoins: 0,
        message: 'Session already rewarded',
      });
    }
    if (Date.now() > Number(session.expiresAt || 0)) {
      return NextResponse.json({ ok: false, error: 'session_expired' }, { status: 400 });
    }
    if (dailyCount >= OFFERWALL_VIDEO_MAX_DAILY) {
      return NextResponse.json(
        { ok: false, error: 'daily_limit', remainingToday: 0 },
        { status: 429 }
      );
    }

    // Require network-reported show OR allow fallback completion after prepare
    // (inventory gaps still credit once per session — capped daily).
    const networkShown = !!body.networkShown;
    const slot = typeof session.slot === 'number' ? session.slot : dailyCount;
    const txId = `offerwall_video_${user.uid}_${dayKey}_${slot}`;

    const result = await applySplitReward({
      uid: user.uid,
      txId,
      source: 'offerwall_video',
      seed: txId,
      meta: {
        placement: session.placement || placement,
        sessionId,
        networkShown,
        via: 'rewarded_video',
        dayKey,
        ...(body.meta && typeof body.meta === 'object' ? body.meta : {}),
      },
      ledgerCollection: 'offerwall_ledger',
      enforceDailyCap: true,
    });

    if (!result.ok) {
      const status = result.error === 'daily_limit' ? 429 : 500;
      return NextResponse.json(
        { ok: false, error: result.error || 'credit_failed', dailyCapHit: !!result.dailyCapHit },
        { status }
      );
    }

    await updateDoc(sessionRef, {
      consumed: true,
      completedAt: serverTimestamp(),
      networkShown,
      txId,
    });

    if (!result.duplicate) {
      try {
        if (ud.offerwallVideoDayKey === dayKey) {
          await updateDoc(userRef, {
            offerwallVideoDayCount: increment(1),
            lastOfferwallVideoAt: serverTimestamp(),
          });
        } else {
          await updateDoc(userRef, {
            offerwallVideoDayKey: dayKey,
            offerwallVideoDayCount: 1,
            lastOfferwallVideoAt: serverTimestamp(),
          });
        }
      } catch {
        /* non-fatal */
      }
    }

    const remaining = Math.max(
      0,
      OFFERWALL_VIDEO_MAX_DAILY - (result.duplicate ? dailyCount : dailyCount + 1)
    );

    return NextResponse.json({
      ok: true,
      duplicate: !!result.duplicate,
      creditedCoins: result.balanceCredited ?? 0,
      userUsd: result.split?.userUsd,
      adminUsd: result.split?.adminUsd,
      totalPoolUsd: result.split?.totalUsd,
      remainingToday: remaining,
      message: result.duplicate
        ? 'Video reward already claimed'
        : `Video complete! +${result.balanceCredited} AJ Coins ($${Number(result.split?.userUsd).toFixed(2)}). Platform kept $${Number(result.split?.adminUsd).toFixed(2)}.`,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'rewarded_failed';
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    maxDaily: OFFERWALL_VIDEO_MAX_DAILY,
    userRewardUsd: { min: 1.0, max: 1.5 },
    providerPoolUsd: { min: 5.0, max: 7.0 },
    source: 'offerwall_video',
  });
}
