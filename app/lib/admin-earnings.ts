/**
 * Cumulative owner earnings ledger (`admin_stats/earnings`).
 * Admin SDK only.
 */
import { FieldValue, getAdminDb } from './firebase-admin';
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

  const db = getAdminDb();
  if (!db) throw new Error('admin_sdk_missing');

  const source = String(opts.source || '');
  const isGift = source === 'live_gift' || source.includes('gift');
  const isAd =
    source.startsWith('ad_') || source.includes('adsterra') || source === 'ad_network';

  const patch: Record<string, unknown> = {
    totalOwnerUsd: FieldValue.increment(ownerUsd),
    totalOwnerCoins: FieldValue.increment(ownerCoins),
    eventCount: FieldValue.increment(1),
    updatedAt: FieldValue.serverTimestamp(),
    currency: 'USD',
  };
  if (isGift) {
    patch.giftOwnerUsd = FieldValue.increment(ownerUsd);
    patch.giftOwnerCoins = FieldValue.increment(ownerCoins);
  }
  if (isAd) {
    patch.adOwnerUsd = FieldValue.increment(ownerUsd);
  }

  await db.doc(ADMIN_EARNINGS_DOC).set(patch, { merge: true });
}
