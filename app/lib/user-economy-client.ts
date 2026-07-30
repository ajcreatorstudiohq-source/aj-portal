/**
 * Client-side per-user economy aggregation for Admin Users cards.
 * Used when `/api/admin/user-economy` lacks Admin SDK (Netlify) or fails.
 *
 * Sources (CEO-readable):
 * - AdminRevenue → hub profit (ownerUsd) + lifetime fallback via userNetCoins
 * - manual_withdrawals → withdraw requested / paid / pending
 * - reward_ledger / offerwall_ledger → lifetime earn (CEO read in rules)
 */
import {
  collection,
  getDocs,
  limit,
  query,
} from 'firebase/firestore';
import { db } from '../firebase';
import { CASH_RATE, coinsToUsd, formatUsd } from './economy';
import { isEstimatedRevenueRow } from './settled-revenue';

export type ClientUserEconomyStat = {
  uid: string;
  lifetimeEarnedCoins: number;
  lifetimeEarnedUsd: number;
  lifetimeEarnedUsdLabel: string;
  surveyEarnedCoins: number;
  surveyEarnedUsd: number;
  surveyEarnedUsdLabel: string;
  surveyAdminUsd: number;
  surveyAdminUsdLabel: string;
  withdrawRequestedCoins: number;
  withdrawPaidCoins: number;
  withdrawPendingCoins: number;
  withdrawRequestedUsdLabel: string;
  adminProfitUsd: number;
  adminProfitCoins: number;
  adminProfitUsdLabel: string;
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

function empty(uid: string): ClientUserEconomyStat {
  return {
    uid,
    lifetimeEarnedCoins: 0,
    lifetimeEarnedUsd: 0,
    lifetimeEarnedUsdLabel: formatUsd(0),
    surveyEarnedCoins: 0,
    surveyEarnedUsd: 0,
    surveyEarnedUsdLabel: formatUsd(0),
    surveyAdminUsd: 0,
    surveyAdminUsdLabel: formatUsd(0),
    withdrawRequestedCoins: 0,
    withdrawPaidCoins: 0,
    withdrawPendingCoins: 0,
    withdrawRequestedUsdLabel: formatUsd(0),
    adminProfitUsd: 0,
    adminProfitCoins: 0,
    adminProfitUsdLabel: formatUsd(0),
    adminEvents: 0,
  };
}

function touch(
  map: Map<string, ClientUserEconomyStat>,
  uid: string
): ClientUserEconomyStat {
  let row = map.get(uid);
  if (!row) {
    row = empty(uid);
    map.set(uid, row);
  }
  return row;
}

export async function loadClientUserEconomy(): Promise<
  Record<string, ClientUserEconomyStat>
> {
  const byUid = new Map<string, ClientUserEconomyStat>();
  const lifetimeFromLedger = new Map<string, number>();
  const lifetimeFromRevenue = new Map<string, number>();

  // Hub profit + lifetime fallback from AdminRevenue (CEO can read)
  try {
    const snap = await getDocs(query(collection(db, 'AdminRevenue'), limit(4000)));
    snap.forEach((docSnap) => {
      const d = docSnap.data() as Record<string, unknown>;
      const uid = String(d.uid || d.earnerUid || '');
      if (!uid || uid === 'anonymous') return;
      const row = touch(byUid, uid);
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
      if (isEstimatedRevenueRow(d)) return;
      const usd = Number(d.ownerUsd ?? d.adminShare ?? 0) || 0;
      const coins =
        Number(d.adminShareCoins ?? d.entryCoins ?? 0) ||
        Math.floor(usd * CASH_RATE);
      if (usd > 0 || coins > 0) {
        row.adminProfitUsd += usd;
        row.adminProfitCoins += coins;
        row.adminEvents += 1;
      }
    });
  } catch (e) {
    console.warn('[user-economy-client] AdminRevenue', e);
  }

  // Lifetime from reward_ledger
  try {
    const snap = await getDocs(query(collection(db, 'reward_ledger'), limit(4000)));
    snap.forEach((docSnap) => {
      const d = docSnap.data() as Record<string, unknown>;
      const uid = String(d.uid || '');
      if (!uid) return;
      const coins = Math.max(
        0,
        Math.floor(
          Number(
            d.flatCoins ?? d.userCoins ?? d.userNetCoins ?? d.balanceCredited ?? 0
          ) || 0
        )
      );
      if (coins > 0) {
        touch(byUid, uid);
        lifetimeFromLedger.set(uid, (lifetimeFromLedger.get(uid) || 0) + coins);
      }
    });
  } catch (e) {
    console.warn('[user-economy-client] reward_ledger', e);
  }

  // Lifetime from offerwall_ledger (+ survey breakdown)
  try {
    const snap = await getDocs(query(collection(db, 'offerwall_ledger'), limit(4000)));
    snap.forEach((docSnap) => {
      const d = docSnap.data() as Record<string, unknown>;
      const uid = String(d.uid || '');
      if (!uid) return;
      const meta = (d.meta && typeof d.meta === 'object'
        ? (d.meta as Record<string, unknown>)
        : {}) as Record<string, unknown>;
      const coins = Math.max(
        0,
        Math.floor(Number(d.coins ?? d.flatCoins ?? d.userCoins ?? 0) || 0)
      );
      if (coins > 0) {
        touch(byUid, uid);
        lifetimeFromLedger.set(uid, (lifetimeFromLedger.get(uid) || 0) + coins);
      }
      const via = String(meta.via || '').toLowerCase();
      const provider = String(meta.provider || '').toLowerCase();
      const source = String(d.source || '');
      const isSurvey =
        via.includes('theorem') ||
        provider.includes('theorem') ||
        (source === 'offerwall' && !provider.includes('adsterra'));
      if (isSurvey && coins > 0) {
        const row = touch(byUid, uid);
        row.surveyEarnedCoins += coins;
        if (!(d.settled === false || meta.settled === false || meta.estimated === true)) {
          const payout = Number(meta.providerPayoutUsd ?? meta.providerPayout ?? 0);
          row.surveyAdminUsd +=
            Number(d.adminUsd ?? meta.adminUsd ?? 0) ||
            (payout > 0 ? payout * 0.7 : 0) ||
            0;
        }
      }
    });
  } catch (e) {
    console.warn('[user-economy-client] offerwall_ledger', e);
  }

  // Withdrawals
  try {
    const snap = await getDocs(query(collection(db, 'manual_withdrawals'), limit(2000)));
    snap.forEach((docSnap) => {
      const d = docSnap.data() as { uid?: string; coins?: number; status?: string };
      const uid = String(d.uid || '');
      if (!uid) return;
      const coins = Math.max(0, Math.floor(Number(d.coins || 0)));
      const row = touch(byUid, uid);
      row.withdrawRequestedCoins += coins;
      const status = String(d.status || 'pending');
      if (paidStatus(status)) row.withdrawPaidCoins += coins;
      else if (pendingStatus(status)) row.withdrawPendingCoins += coins;
    });
  } catch (e) {
    console.warn('[user-economy-client] withdrawals', e);
  }

  const out: Record<string, ClientUserEconomyStat> = {};
  for (const [uid, row] of byUid) {
    const fromLedger = lifetimeFromLedger.get(uid) || 0;
    const fromRevenue = lifetimeFromRevenue.get(uid) || 0;
    // Prefer ledger totals; fall back to AdminRevenue userNetCoins if ledgers empty/unreadable
    row.lifetimeEarnedCoins = fromLedger > 0 ? fromLedger : fromRevenue;
    row.lifetimeEarnedUsd = coinsToUsd(row.lifetimeEarnedCoins);
    row.surveyEarnedUsd = coinsToUsd(row.surveyEarnedCoins);
    row.surveyAdminUsd = Number(row.surveyAdminUsd.toFixed(6));
    row.adminProfitUsd = Number(row.adminProfitUsd.toFixed(6));
    out[uid] = {
      ...row,
      lifetimeEarnedUsdLabel: formatUsd(row.lifetimeEarnedUsd),
      surveyEarnedUsdLabel: formatUsd(row.surveyEarnedUsd),
      surveyAdminUsdLabel: formatUsd(row.surveyAdminUsd),
      withdrawRequestedUsdLabel: formatUsd(coinsToUsd(row.withdrawRequestedCoins)),
      adminProfitUsdLabel: formatUsd(row.adminProfitUsd),
    };
  }
  return out;
}
