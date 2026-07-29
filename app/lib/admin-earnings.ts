/**
 * Cumulative owner earnings ledger (`admin_stats/earnings`)
 * + credit owner-share AJ Coins to the portal admin user wallet.
 *
 * Profit model (withdraw-safe):
 * - Partner/Adsterra pays you 100% of revenue externally.
 * - Users only hold 30% as withdrawable coins (liability).
 * - Owner 70% (gift 40%) is tracked here AND added to admin Hub wallet
 *   so the CEO ID (ajcreatorstudio.hq@gmail.com) balance shows platform share.
 * - Paying a user withdraw only pays their 30% — your remaining share stays profitable.
 */
import 'server-only';
import { FieldValue, getAdminAuth, getAdminDb } from './firebase-admin';
import { CASH_RATE } from './economy';
import { ADMIN_EMAIL, ADMIN_UIDS } from './admin-auth';
import type { Firestore } from 'firebase-admin/firestore';

export type { AdminEarningsTotals } from './admin-earnings-types';

export const ADMIN_EARNINGS_DOC = 'admin_stats/earnings';
export const ADMIN_CONFIG_DOC = 'admin_stats/config';

let cachedAdminUid: string | null | undefined;
let cachedAtMs = 0;
const POSITIVE_CACHE_MS = 5 * 60 * 1000;
const NEGATIVE_CACHE_MS = 5 * 1000;

function rememberAdminUid(uid: string | null): string | null {
  cachedAdminUid = uid;
  cachedAtMs = Date.now();
  return uid;
}

/** Persist CEO uid so earn paths can credit the Hub wallet without env. */
export async function persistPortalAdminUid(
  uid: string,
  email?: string | null,
  db?: Firestore | null
): Promise<void> {
  const id = String(uid || '').trim();
  if (!id) return;
  rememberAdminUid(id);
  const adminDb = db || getAdminDb();
  if (!adminDb) return;
  try {
    await adminDb.doc(ADMIN_CONFIG_DOC).set(
      {
        ownerUid: id,
        ownerEmail: String(email || ADMIN_EMAIL)
          .trim()
          .toLowerCase(),
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
  } catch (e) {
    console.error('[admin-earnings] persistPortalAdminUid failed', e);
  }
}

/**
 * Resolve portal CEO Firebase uid.
 * Order: ADMIN_UIDS env → admin_stats/config → Auth getUserByEmail → users.email query.
 */
export async function resolvePortalAdminUid(
  db?: Firestore | null
): Promise<string | null> {
  if (ADMIN_UIDS.length > 0) {
    return rememberAdminUid(ADMIN_UIDS[0]!);
  }

  const now = Date.now();
  if (cachedAdminUid) {
    if (now - cachedAtMs < POSITIVE_CACHE_MS) return cachedAdminUid;
  } else if (cachedAdminUid === null && now - cachedAtMs < NEGATIVE_CACHE_MS) {
    return null;
  }

  const adminDb = db || getAdminDb();
  if (!adminDb) {
    return rememberAdminUid(null);
  }

  // 1) Saved config (set when CEO opens Admin Hisaab / bind-owner)
  try {
    const cfg = await adminDb.doc(ADMIN_CONFIG_DOC).get();
    const uid = String(
      (cfg.data() as { ownerUid?: string } | undefined)?.ownerUid || ''
    ).trim();
    if (uid) {
      return rememberAdminUid(uid);
    }
  } catch {
    /* ignore */
  }

  // 2) Firebase Auth by email (most reliable for Google login CEO)
  try {
    const auth = getAdminAuth();
    if (auth) {
      const user = await auth.getUserByEmail(ADMIN_EMAIL);
      if (user?.uid) {
        await persistPortalAdminUid(user.uid, ADMIN_EMAIL, adminDb);
        return rememberAdminUid(user.uid);
      }
    }
  } catch (e) {
    console.warn('[admin-earnings] getUserByEmail failed', e);
  }

  // 3) Firestore users.email exact match
  try {
    const byEmail = await adminDb
      .collection('users')
      .where('email', '==', ADMIN_EMAIL)
      .limit(1)
      .get();
    if (!byEmail.empty) {
      const uid = byEmail.docs[0]!.id;
      await persistPortalAdminUid(uid, ADMIN_EMAIL, adminDb);
      return rememberAdminUid(uid);
    }
  } catch (e) {
    console.warn('[admin-earnings] users.email query failed', e);
  }

  // 4) Case / field variants (email vs Email)
  try {
    const snap = await adminDb.collection('users').limit(400).get();
    for (const doc of snap.docs) {
      const data = doc.data() as { email?: string; Email?: string };
      const em = String(data.email || data.Email || '')
        .trim()
        .toLowerCase();
      if (em === ADMIN_EMAIL) {
        await persistPortalAdminUid(doc.id, ADMIN_EMAIL, adminDb);
        return rememberAdminUid(doc.id);
      }
    }
  } catch (e) {
    console.warn('[admin-earnings] users scan failed', e);
  }

  console.error(
    '[admin-earnings] Could not resolve portal admin uid for',
    ADMIN_EMAIL,
    '— set ADMIN_UIDS on Vercel or open Admin Hisaab once while logged in as CEO.'
  );
  return rememberAdminUid(null);
}

/**
 * Credit owner share to ledger AND admin personal wallet.
 * @param earnerUid — user who received the user-side coins; skip EXTRA owner-share mint
 *   when same as admin (admin already received userCoins on that claim).
 *   PK fees / gifts use forceWalletCredit so coins move into the admin wallet.
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
    console.error('[admin-earnings] wallet skip — adminUid unresolved', {
      source,
      ownerCoins,
      ownerUsd,
    });
    return { adminUid, walletCredited: 0 };
  }

  const earner = String(opts.earnerUid || '').trim();
  const skipSelfMint =
    !opts.forceWalletCredit && earner && earner === adminUid;
  if (skipSelfMint) {
    // Admin already got userCoins on this claim — do not also mint 70% on self-earn
    return { adminUid, walletCredited: 0 };
  }

  const userRef = db.collection('users').doc(adminUid);
  try {
    await db.runTransaction(async (tx) => {
      const snap = await tx.get(userRef);
      if (!snap.exists) {
        // Ensure CEO wallet doc exists so owner-share can land
        tx.set(
          userRef,
          {
            email: ADMIN_EMAIL,
            balance: ownerCoins,
            lastOwnerShareAt: FieldValue.serverTimestamp(),
            lastWalletWriteAt: FieldValue.serverTimestamp(),
            lastRewardSource: `owner_share_${source || 'earn'}`,
            createdAt: FieldValue.serverTimestamp(),
          },
          { merge: true }
        );
        return;
      }
      const bal = Math.max(
        0,
        Math.floor(Number((snap.data() as { balance?: number }).balance) || 0)
      );
      tx.update(userRef, {
        balance: bal + ownerCoins,
        email: ADMIN_EMAIL,
        lastOwnerShareAt: FieldValue.serverTimestamp(),
        lastWalletWriteAt: FieldValue.serverTimestamp(),
        lastRewardSource: `owner_share_${source || 'earn'}`,
      });
    });
    console.info('[admin-earnings] wallet credited', {
      adminUid,
      ownerCoins,
      source,
      earner: earner || null,
    });
    return { adminUid, walletCredited: ownerCoins };
  } catch (e) {
    console.error('[admin-earnings] wallet credit failed', e);
    return { adminUid, walletCredited: 0 };
  }
}
