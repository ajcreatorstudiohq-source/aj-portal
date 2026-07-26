import { NextResponse } from 'next/server';
import {
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  updateDoc,
  increment,
} from 'firebase/firestore';
import { db } from '../../../../firebaseConfig';
import { getOfferwallServerConfig, OFFERWALL_PUBLIC } from '../../../lib/economy';
import { applySplitReward } from '../../../lib/reward-engine';
import {
  bearerFromRequest,
  verifyFirebaseIdToken,
} from '../../../lib/verify-id-token';

/**
 * POST /api/offerwall/complete
 * Auth: Bearer <Firebase ID token>
 * Body: { offerId?: string, note?: string }
 *
 * Authenticated completion path used by the in-app Offerwall UI after the
 * user finishes an offer (or validated preview task). Enforces daily caps
 * and uses the same $5–$7 pool / $1–$1.50 user split as the postback API.
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
    const offerId = String(body.offerId || `manual_${Date.now()}`);
    const note = String(body.note || '');

    // Daily rate limit via user doc counters (no composite index required)
    const dayKey = new Date().toISOString().slice(0, 10);
    const userRef = doc(db, 'users', user.uid);
    const userSnap = await getDoc(userRef);
    if (!userSnap.exists()) {
      return NextResponse.json({ ok: false, error: 'user_not_found' }, { status: 404 });
    }
    const ud = userSnap.data() as {
      offerwallDayKey?: string;
      offerwallDayCount?: number;
    };
    const dailyCount =
      ud.offerwallDayKey === dayKey ? Number(ud.offerwallDayCount || 0) : 0;
    const ow = getOfferwallServerConfig();
    if (dailyCount >= ow.maxDailyCompletions) {
      return NextResponse.json(
        { ok: false, error: 'daily_limit', max: ow.maxDailyCompletions },
        { status: 429 }
      );
    }

    const txId = `offerwall_auth_${user.uid}_${offerId}`;
    const result = await applySplitReward({
      uid: user.uid,
      txId,
      source: 'offerwall',
      seed: txId,
      meta: { offerId, note, via: 'authenticated_complete', dayKey },
      ledgerCollection: 'offerwall_ledger',
    });

    if (!result.ok) {
      return NextResponse.json(
        { ok: false, error: result.error || 'credit_failed' },
        { status: 500 }
      );
    }

    if (!result.duplicate) {
      try {
        if (ud.offerwallDayKey === dayKey) {
          await updateDoc(userRef, {
            offerwallDayCount: increment(1),
            lastOfferwallAt: serverTimestamp(),
          });
        } else {
          await updateDoc(userRef, {
            offerwallDayKey: dayKey,
            offerwallDayCount: 1,
            lastOfferwallAt: serverTimestamp(),
          });
        }
        await setDoc(
          doc(db, 'offerwall_ledger', txId),
          { dayKey, uid: user.uid, updatedAt: serverTimestamp() },
          { merge: true }
        );
      } catch {}
    }

    return NextResponse.json({
      ok: true,
      duplicate: !!result.duplicate,
      creditedCoins: result.balanceCredited ?? 0,
      userUsd: result.split?.userUsd,
      adminUsd: result.split?.adminUsd,
      totalPoolUsd: result.split?.totalUsd,
      message: result.duplicate
        ? 'Offer already credited'
        : `Offer complete! +${result.balanceCredited} AJ Coins ($${result.split?.userUsd.toFixed(2)})`,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'complete_failed';
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}

export async function GET() {
  const ow = getOfferwallServerConfig();
  return NextResponse.json({
    ok: true,
    wallUrl: OFFERWALL_PUBLIC.wallUrl,
    userRewardUsd: { min: 1.0, max: 1.5 },
    providerPoolUsd: { min: 5.0, max: 7.0 },
    maxDailyCompletions: ow.maxDailyCompletions,
    postback: '/api/offerwall/callback',
  });
}
