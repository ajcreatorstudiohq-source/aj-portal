import { NextResponse } from 'next/server';
import { verifyAdminFromRequest } from '../../../lib/admin-auth';
import { getAdminDb } from '../../../lib/firebase-admin';
import { CASH_RATE, coinsToUsd, formatUsd } from '../../../lib/economy';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export type UserEconomyStat = {
  uid: string;
  /** Lifetime AJ Coins credited to this user (ledgers). */
  lifetimeEarnedCoins: number;
  lifetimeEarnedUsd: number;
  /** All withdrawal requests (pending + paid + other). */
  withdrawRequestedCoins: number;
  withdrawPaidCoins: number;
  withdrawPendingCoins: number;
  /** Owner/admin hub share generated from this user's activity. */
  adminProfitUsd: number;
  adminProfitCoins: number;
  adminEvents: number;
};

function paidStatus(status: string) {
  const s = status.toLowerCase();
  return (
    s === 'approved' ||
    s === 'paid' ||
    s === 'completed' ||
    s === 'success' ||
    s === 'done'
  );
}

function pendingStatus(status: string) {
  const s = status.toLowerCase();
  return s === 'pending' || s === 'processing' || s === 'review' || s === '';
}

function emptyStat(uid: string): UserEconomyStat {
  return {
    uid,
    lifetimeEarnedCoins: 0,
    lifetimeEarnedUsd: 0,
    withdrawRequestedCoins: 0,
    withdrawPaidCoins: 0,
    withdrawPendingCoins: 0,
    adminProfitUsd: 0,
    adminProfitCoins: 0,
    adminEvents: 0,
  };
}

/**
 * GET /api/admin/user-economy
 * CEO-only — per-uid lifetime earnings, withdraw requests, admin hub profit share.
 */
export async function GET(request: Request) {
  try {
    const admin = await verifyAdminFromRequest(request);
    if (!admin) {
      return NextResponse.json({ ok: false, error: 'forbidden' }, { status: 403 });
    }

    const adminDb = getAdminDb();
    if (!adminDb) {
      return NextResponse.json(
        {
          ok: false,
          error: 'admin_sdk_missing',
          message: 'Configure FIREBASE_SERVICE_ACCOUNT_JSON to load per-user economy.',
        },
        { status: 503 }
      );
    }

    const byUid = new Map<string, UserEconomyStat>();

    const touch = (uid: string) => {
      if (!uid) return emptyStat('');
      let row = byUid.get(uid);
      if (!row) {
        row = emptyStat(uid);
        byUid.set(uid, row);
      }
      return row;
    };

    const addEarned = (uid: string, coins: number) => {
      if (!uid || coins <= 0) return;
      const row = touch(uid);
      row.lifetimeEarnedCoins += coins;
    };

    // reward_ledger — flat / split user credits
    try {
      const snap = await adminDb.collection('reward_ledger').limit(4000).get();
      snap.forEach((docSnap) => {
        const d = docSnap.data() as Record<string, unknown>;
        const uid = String(d.uid || '');
        const coins = Math.max(
          0,
          Math.floor(
            Number(
              d.flatCoins ?? d.userCoins ?? d.userNetCoins ?? d.balanceCredited ?? 0
            ) || 0
          )
        );
        addEarned(uid, coins);
      });
    } catch (e) {
      console.warn('[admin/user-economy] reward_ledger', e);
    }

    // offerwall_ledger — Watch Ads / offerwall
    try {
      const snap = await adminDb.collection('offerwall_ledger').limit(4000).get();
      snap.forEach((docSnap) => {
        const d = docSnap.data() as Record<string, unknown>;
        const uid = String(d.uid || '');
        const coins = Math.max(
          0,
          Math.floor(Number(d.coins ?? d.flatCoins ?? d.userCoins ?? 0) || 0)
        );
        addEarned(uid, coins);
      });
    } catch (e) {
      console.warn('[admin/user-economy] offerwall_ledger', e);
    }

    // Withdrawals
    try {
      const snap = await adminDb.collection('manual_withdrawals').limit(2000).get();
      snap.forEach((docSnap) => {
        const d = docSnap.data() as { uid?: string; coins?: number; status?: string };
        const uid = String(d.uid || '');
        if (!uid) return;
        const coins = Math.max(0, Math.floor(Number(d.coins || 0)));
        const row = touch(uid);
        row.withdrawRequestedCoins += coins;
        const status = String(d.status || 'pending');
        if (paidStatus(status)) row.withdrawPaidCoins += coins;
        else if (pendingStatus(status)) row.withdrawPendingCoins += coins;
      });
    } catch (e) {
      console.warn('[admin/user-economy] withdrawals', e);
    }

    // AdminRevenue — hub profit + lifetime fallback (userNetCoins)
    const lifetimeFromRevenue = new Map<string, number>();
    try {
      const snap = await adminDb.collection('AdminRevenue').limit(4000).get();
      snap.forEach((docSnap) => {
        const d = docSnap.data() as Record<string, unknown>;
        const uid = String(d.uid || d.earnerUid || '');
        if (!uid || uid === 'anonymous') return;
        const usd = Number(d.ownerUsd ?? d.adminShare ?? 0) || 0;
        const coins =
          Number(d.adminShareCoins ?? d.entryCoins ?? 0) ||
          Math.floor(usd * CASH_RATE);
        if (usd > 0 || coins > 0) {
          const row = touch(uid);
          row.adminProfitUsd += usd;
          row.adminProfitCoins += coins;
          row.adminEvents += 1;
        }
        const userCoins = Math.max(
          0,
          Math.floor(
            Number(
              d.userNetCoins ??
                d.userCoins ??
                d.flatCoins ??
                d.balanceCredited ??
                0
            ) || 0
          )
        );
        if (userCoins > 0) {
          lifetimeFromRevenue.set(
            uid,
            (lifetimeFromRevenue.get(uid) || 0) + userCoins
          );
        }
      });
    } catch (e) {
      console.warn('[admin/user-economy] AdminRevenue', e);
    }

    const users: Record<string, UserEconomyStat & {
      lifetimeEarnedUsdLabel: string;
      withdrawRequestedUsdLabel: string;
      adminProfitUsdLabel: string;
    }> = {};

    // Also ensure every revenue/ledger uid is present
    for (const uid of lifetimeFromRevenue.keys()) touch(uid);

    for (const [uid, row] of byUid) {
      if (row.lifetimeEarnedCoins <= 0) {
        row.lifetimeEarnedCoins = lifetimeFromRevenue.get(uid) || 0;
      }
      row.lifetimeEarnedUsd = coinsToUsd(row.lifetimeEarnedCoins);
      row.adminProfitUsd = Number(row.adminProfitUsd.toFixed(6));
      users[uid] = {
        ...row,
        lifetimeEarnedUsdLabel: formatUsd(row.lifetimeEarnedUsd),
        withdrawRequestedUsdLabel: formatUsd(coinsToUsd(row.withdrawRequestedCoins)),
        adminProfitUsdLabel: formatUsd(row.adminProfitUsd),
      };
    }

    return NextResponse.json({
      ok: true,
      users,
      userCount: Object.keys(users).length,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'user_economy_failed';
    console.error('[admin/user-economy]', msg, e);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
