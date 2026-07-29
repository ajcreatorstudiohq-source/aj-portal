import { NextResponse } from 'next/server';
import { verifyAdminFromRequest } from '../../../lib/admin-auth';
import { FieldValue, getAdminDb } from '../../../lib/firebase-admin';

/**
 * POST /api/admin/reset-economy
 * CEO-only — zeros all user balances + admin earnings, clears test ledgers.
 * Body: { confirm: "RESET_ALL_TO_ZERO" }
 *
 * Requires FIREBASE_SERVICE_ACCOUNT_JSON on the server.
 */
export async function POST(request: Request) {
  try {
    const admin = await verifyAdminFromRequest(request);
    if (!admin) {
      return NextResponse.json({ ok: false, error: 'forbidden' }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    if (String(body.confirm || '') !== 'RESET_ALL_TO_ZERO') {
      return NextResponse.json(
        {
          ok: false,
          error: 'confirm_required',
          message: 'Send { confirm: "RESET_ALL_TO_ZERO" } to proceed.',
        },
        { status: 400 }
      );
    }

    const db = getAdminDb();
    if (!db) {
      return NextResponse.json(
        {
          ok: false,
          error: 'admin_sdk_missing',
          message:
            'FIREBASE_SERVICE_ACCOUNT_JSON is not configured. Use Admin panel client reset, or set the service account on Vercel.',
        },
        { status: 503 }
      );
    }

    let usersZeroed = 0;
    const users = await db.collection('users').get();
    let batch = db.batch();
    let ops = 0;
    for (const d of users.docs) {
      batch.update(d.ref, {
        balance: 0,
        invested: 0,
        offerwallVideoDayCount: 0,
        offerwallVideoDayKey: '',
        offerwallDayCount: 0,
        mathChallengeDayCount: 0,
        mathChallengeDayKey: '',
        alphaCaptchaDayCount: 0,
        alphaCaptchaDayKey: '',
        dailyRewards: {},
        economyResetAt: FieldValue.serverTimestamp(),
      });
      ops += 1;
      usersZeroed += 1;
      if (ops % 400 === 0) {
        await batch.commit();
        batch = db.batch();
      }
    }
    if (ops % 400 !== 0) await batch.commit();

    await db.doc('admin_stats/earnings').set(
      {
        totalOwnerUsd: 0,
        totalOwnerCoins: 0,
        giftOwnerUsd: 0,
        giftOwnerCoins: 0,
        adOwnerUsd: 0,
        eventCount: 0,
        currency: 'USD',
        resetAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    async function wipe(name: string, cap = 8000) {
      let deleted = 0;
      while (deleted < cap) {
        const snap = await db!.collection(name).limit(400).get();
        if (snap.empty) break;
        const b = db!.batch();
        snap.docs.forEach((docSnap) => b.delete(docSnap.ref));
        await b.commit();
        deleted += snap.size;
        if (snap.size < 400) break;
      }
      return deleted;
    }

    const adminRevenueDeleted = await wipe('AdminRevenue');
    const rewardLedgerDeleted = await wipe('reward_ledger');
    const offerwallLedgerDeleted = await wipe('offerwall_ledger');
    const adEventsDeleted = await wipe('ad_events');
    const adSessionsDeleted = await wipe('ad_reward_sessions');
    const mathSessionsDeleted = await wipe('math_challenge_sessions');
    const captchaSessionsDeleted = await wipe('alpha_captcha_sessions');

    return NextResponse.json({
      ok: true,
      usedAdminSdk: true,
      usersScanned: users.size,
      usersZeroed,
      adminRevenueDeleted,
      rewardLedgerDeleted,
      offerwallLedgerDeleted,
      adEventsDeleted,
      adSessionsDeleted,
      mathSessionsDeleted,
      captchaSessionsDeleted,
      adminStatsReset: true,
      message:
        'Economy reset complete. All user balances and admin ledger estimates are 0.',
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'reset_failed';
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
