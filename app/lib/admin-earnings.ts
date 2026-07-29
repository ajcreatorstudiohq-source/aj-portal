/**
 * Cumulative owner earnings ledger (`admin_stats/earnings`)
 * + credit owner-share AJ Coins to the portal admin user wallet.
 *
 * Profit model (withdraw-safe):
 * - Partner/Adsterra pays you 100% of revenue externally.
 * - Users only hold 30% as withdrawable coins (liability).
 * - Owner 70% (gift 40%) is tracked here AND added to admin Hub wallet
 *   so the CEO ID balance shows platform share.
 * - Paying a user withdraw only pays their 30% — your remaining share stays profitable.
 */
import { FieldValue, getAdminDb } from './firebase-admin';
import { CASH_RATE } from './economy';
import { ADMIN_EMAIL, ADMIN_UIDS } from './admin-auth';
import type { Firestore } from 'firebase-admin/firestore';

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

let cachedAdminUid: string | null | undefined;

/** Resolve portal CEO Firebase uid (env UID list, then email lookup). */
export async function resolvePortalAdminUid(
  db?: Firestore | null
): Promise<string | null> {
  if (ADMIN_UIDS.length > 0) return ADMIN_UIDS[0]!;
  if (cachedAdminUid !== undefined) return cachedAdminUid;

  const adminDb = db || getAdminDb();
  if (!adminDb) {
    cachedAdminUid = null;
    return null;
  }

  try {
    const cfg = await adminDb.doc('admin_stats/config').get();
    const uid = String((cfg.data() as { ownerUid?: string } | undefined)?.ownerUid || '').trim();
    if (uid) {
      cachedAdminUid = uid;
      return cachedAdminUid;
    }
  } catch {
    /* ignore */
  }

  try {
    const byEmail = await adminDb
      .collection('users')
      .where('email', '==', ADMIN_EMAIL)
      .limit(1)
      .get();
    if (!byEmail.empty) {
      cachedAdminUid = byEmail.docs[0]!.id;
      try {
        await adminDb.doc('admin_stats/config').set(
          {
            ownerUid: cachedAdminUid,
            ownerEmail: ADMIN_EMAIL,
            updatedAt: FieldValue.serverTimestamp(),
          },
          { merge: true }
        );
      } catch {
        /* non-fatal */
      }
      return cachedAdminUid;
    }
  } catch {
    /* fall through */
  }

  cachedAdminUid = null;
  return null;
}

/**
 * Credit owner share to ledger AND admin personal wallet.
 * @param earnerUid — user who received the user-side coins; skip wallet mint when same as admin
 *   (admin already got userCoins on their balance — avoid 100% pool double-mint on self-earn).
 *   PK fees / gifts still pass earnerUid as payer; wallet credit always applies when
 *   `forceWalletCredit` is true (coins moved from users into owner share).
 */
export async function creditAdminEarnings(opts: {
  ownerUsd: number;
  ownerCoins?: number;
  source?: string;
  earnerUid?: string;
  /** When true, always add coins to admin wallet (PK entry, gift burn share). */
  forceWalletCredit?: boolean;
}): Promise<{ adminUid: string | null; walletCredited: number }> {
  const ownerUsd = Math.max(0, Number(opts.ownerUsd) || 0);
  const ownerCoins =
    opts.ownerCoins != null
      ? Math.max(0, Math.floor(Number(opts.ownerCoins) || 0))
      : Math.floor(ownerUsd * CASH_RATE);
  if (ownerUsd <= 0 && ownerCoins <= 0) {
    return { adminUid: null, walletCredited: 0 };
  }

  const db = getAdminDb();
  if (!db) throw new Error('admin_sdk_missing');

  const source = String(opts.source || '');
  const isGift = source === 'live_gift' || source.includes('gift');
  const isAd =
    source.startsWith('ad_') ||
    source.includes('adsterra') ||
    source === 'ad_network' ||
    source === 'offerwall_video' ||
    source === 'offerwall';
  const isPk = source === 'pk_match' || source.includes('pk');

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
  if (isPk) {
    patch.pkOwnerUsd = FieldValue.increment(ownerUsd);
    patch.pkOwnerCoins = FieldValue.increment(ownerCoins);
  }

  await db.doc(ADMIN_EARNINGS_DOC).set(patch, { merge: true });

  const adminUid = await resolvePortalAdminUid(db);
  if (!adminUid || ownerCoins <= 0) {
    return { adminUid, walletCredited: 0 };
  }

  const earner = String(opts.earnerUid || '').trim();
  const skipSelfMint =
    !opts.forceWalletCredit && earner && earner === adminUid;
  if (skipSelfMint) {
    return { adminUid, walletCredited: 0 };
  }

  const userRef = db.collection('users').doc(adminUid);
  try {
    await db.runTransaction(async (tx) => {
      const snap = await tx.get(userRef);
      if (!snap.exists) throw new Error('admin_user_not_found');
      const bal = Math.max(
        0,
        Math.floor(Number((snap.data() as { balance?: number }).balance) || 0)
      );
      tx.update(userRef, {
        balance: bal + ownerCoins,
        lastOwnerShareAt: FieldValue.serverTimestamp(),
        lastWalletWriteAt: FieldValue.serverTimestamp(),
        lastRewardSource: `owner_share_${source || 'earn'}`,
      });
    });
    return { adminUid, walletCredited: ownerCoins };
  } catch (e) {
    console.error('[admin-earnings] wallet credit failed', e);
    return { adminUid, walletCredited: 0 };
  }
}
