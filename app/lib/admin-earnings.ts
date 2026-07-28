/**
 * Cumulative owner earnings ledger (`admin_stats/earnings`).
 * Updated whenever platform share is logged to AdminRevenue.
 */
import { doc, setDoc, increment, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import { COIN_RATE } from './economy';

export const ADMIN_EARNINGS_DOC = 'admin_stats/earnings';

export type AdminEarningsTotals = {
  totalOwnerUsd: number;
  totalOwnerCoins: number;
  giftOwnerUsd: number;
  giftOwnerCoins: number;
  adOwnerUsd: number;
  eventCount: number;
  updatedAt?: unknown;
};

/**
 * Add owner share into the running portal total (coins + USD).
 * Safe to call after every AdminRevenue write — non-fatal on failure.
 */
export async function creditAdminEarnings(opts: {
  ownerUsd: number;
  ownerCoins?: number;
  source?: string;
}): Promise<void> {
  const ownerUsd = Math.max(0, Number(opts.ownerUsd) || 0);
  const ownerCoins =
    opts.ownerCoins != null
      ? Math.max(0, Math.floor(Number(opts.ownerCoins) || 0))
      : Math.floor(ownerUsd * COIN_RATE);
  if (ownerUsd <= 0 && ownerCoins <= 0) return;

  const source = String(opts.source || '');
  const isGift = source === 'live_gift' || source.includes('gift');
  const isAd = source.startsWith('ad_') || source.includes('adsterra') || source === 'ad_network';

  const patch: Record<string, unknown> = {
    totalOwnerUsd: increment(ownerUsd),
    totalOwnerCoins: increment(ownerCoins),
    eventCount: increment(1),
    updatedAt: serverTimestamp(),
    currency: 'USD',
  };
  if (isGift) {
    patch.giftOwnerUsd = increment(ownerUsd);
    patch.giftOwnerCoins = increment(ownerCoins);
  }
  if (isAd) {
    patch.adOwnerUsd = increment(ownerUsd);
  }

  await setDoc(doc(db, 'admin_stats', 'earnings'), patch, { merge: true });
}
