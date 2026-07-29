/**
 * Admin-only wallet mutations. All balance / invested / botTier changes
 * MUST go through Firebase Admin SDK after firestore.rules lock.
 */
import 'server-only';
import { FieldValue, getAdminDb } from './firebase-admin';
import type { Firestore } from 'firebase-admin/firestore';

export function requireAdminDb(): Firestore {
  const db = getAdminDb();
  if (!db) {
    throw new Error('admin_sdk_missing');
  }
  return db;
}

export async function adminGetUserBalance(uid: string): Promise<number> {
  const db = requireAdminDb();
  const snap = await db.collection('users').doc(uid).get();
  if (!snap.exists) throw new Error('user_not_found');
  return Math.max(0, Math.floor(Number((snap.data() as { balance?: number }).balance) || 0));
}

/** Atomic debit; throws insufficient_balance | user_not_found | admin_sdk_missing */
export async function adminDebitBalance(
  uid: string,
  amount: number,
  extra: Record<string, unknown> = {}
): Promise<{ balance: number }> {
  const coins = Math.floor(Number(amount) || 0);
  if (coins <= 0) throw new Error('invalid_amount');
  const db = requireAdminDb();
  const userRef = db.collection('users').doc(uid);
  return db.runTransaction(async (tx) => {
    const snap = await tx.get(userRef);
    if (!snap.exists) throw new Error('user_not_found');
    const bal = Math.max(0, Math.floor(Number((snap.data() as { balance?: number }).balance) || 0));
    if (bal < coins) throw new Error('insufficient_balance');
    const next = bal - coins;
    tx.update(userRef, {
      balance: next,
      ...extra,
      lastWalletWriteAt: FieldValue.serverTimestamp(),
    });
    return { balance: next };
  });
}

export async function adminCreditBalance(
  uid: string,
  amount: number,
  extra: Record<string, unknown> = {}
): Promise<{ balance: number }> {
  const coins = Math.floor(Number(amount) || 0);
  if (coins <= 0) throw new Error('invalid_amount');
  const db = requireAdminDb();
  const userRef = db.collection('users').doc(uid);
  return db.runTransaction(async (tx) => {
    const snap = await tx.get(userRef);
    if (!snap.exists) throw new Error('user_not_found');
    const bal = Math.max(0, Math.floor(Number((snap.data() as { balance?: number }).balance) || 0));
    const next = bal + coins;
    tx.update(userRef, {
      balance: next,
      ...extra,
      lastWalletWriteAt: FieldValue.serverTimestamp(),
    });
    return { balance: next };
  });
}

/**
 * Activate AI Trading Bot — debit cost, set invested + botTier (server-only).
 */
export async function adminActivateBot(opts: {
  uid: string;
  tier: 'basic' | 'vvip';
  cost: number;
}): Promise<{ balance: number; invested: number; botTier: string }> {
  const cost = Math.floor(Number(opts.cost) || 0);
  if (cost <= 0) throw new Error('invalid_amount');
  if (opts.tier !== 'basic' && opts.tier !== 'vvip') throw new Error('invalid_tier');
  const db = requireAdminDb();
  const userRef = db.collection('users').doc(opts.uid);
  return db.runTransaction(async (tx) => {
    const snap = await tx.get(userRef);
    if (!snap.exists) throw new Error('user_not_found');
    const data = snap.data() as { balance?: number; botTier?: string };
    const bal = Math.max(0, Math.floor(Number(data.balance) || 0));
    if (bal < cost) throw new Error('insufficient_balance');
    const next = bal - cost;
    tx.update(userRef, {
      balance: next,
      botTier: opts.tier,
      invested: cost,
      lastSync: FieldValue.serverTimestamp(),
      lastWalletWriteAt: FieldValue.serverTimestamp(),
    });
    return { balance: next, invested: cost, botTier: opts.tier };
  });
}

/**
 * Withdraw request — zero balance + create manual_withdrawals (atomic).
 */
export async function adminRequestWithdraw(opts: {
  uid: string;
  email?: string;
  method: string;
  payoutDetails: Record<string, string>;
  minCoins: number;
}): Promise<{ coins: number }> {
  const db = requireAdminDb();
  const userRef = db.collection('users').doc(opts.uid);
  const withdrawRef = db.collection('manual_withdrawals').doc();
  return db.runTransaction(async (tx) => {
    const snap = await tx.get(userRef);
    if (!snap.exists) throw new Error('user_not_found');
    const bal = Math.max(0, Math.floor(Number((snap.data() as { balance?: number }).balance) || 0));
    if (bal < opts.minCoins) throw new Error('below_minimum');
    tx.update(userRef, {
      balance: 0,
      lastWithdrawAt: FieldValue.serverTimestamp(),
      lastWalletWriteAt: FieldValue.serverTimestamp(),
    });
    tx.set(withdrawRef, {
      uid: opts.uid,
      email: opts.email || '',
      coins: bal,
      method: opts.method,
      payoutDetails: opts.payoutDetails,
      status: 'pending',
      date: FieldValue.serverTimestamp(),
      createdAt: FieldValue.serverTimestamp(),
    });
    return { coins: bal };
  });
}

/**
 * Live gift: debit sender full cost, credit creator share (Admin atomic).
 */
export async function adminSendGift(opts: {
  fromUid: string;
  toUid: string;
  giftCost: number;
  creatorCoins: number;
  giftId?: string;
  meta?: Record<string, unknown>;
}): Promise<{ fromBalance: number; credited: number }> {
  const cost = Math.floor(Number(opts.giftCost) || 0);
  const credit = Math.floor(Number(opts.creatorCoins) || 0);
  if (cost <= 0) throw new Error('invalid_amount');
  if (opts.fromUid === opts.toUid) throw new Error('self_gift');
  const db = requireAdminDb();
  const fromRef = db.collection('users').doc(opts.fromUid);
  const toRef = db.collection('users').doc(opts.toUid);
  const ledgerRef = db.collection('reward_ledger').doc(
    `gift_${opts.fromUid}_${opts.toUid}_${opts.giftId || 'x'}_${Date.now()}`
  );

  return db.runTransaction(async (tx) => {
    const [fromSnap, toSnap] = await Promise.all([tx.get(fromRef), tx.get(toRef)]);
    if (!fromSnap.exists) throw new Error('sender_not_found');
    if (!toSnap.exists) throw new Error('recipient_not_found');
    const fromBal = Math.max(
      0,
      Math.floor(Number((fromSnap.data() as { balance?: number }).balance) || 0)
    );
    if (fromBal < cost) throw new Error('insufficient_balance');
    const toBal = Math.max(
      0,
      Math.floor(Number((toSnap.data() as { balance?: number }).balance) || 0)
    );
    const nextFrom = fromBal - cost;
    const nextTo = toBal + credit;
    tx.update(fromRef, {
      balance: nextFrom,
      lastGiftSentAt: FieldValue.serverTimestamp(),
      lastWalletWriteAt: FieldValue.serverTimestamp(),
    });
    if (credit > 0) {
      tx.update(toRef, {
        balance: nextTo,
        lastGiftReceivedAt: FieldValue.serverTimestamp(),
        lastRewardAt: FieldValue.serverTimestamp(),
        lastRewardSource: 'live_gift',
        lastWalletWriteAt: FieldValue.serverTimestamp(),
      });
    }
    tx.set(ledgerRef, {
      uid: opts.toUid,
      fromUid: opts.fromUid,
      source: 'live_gift',
      coins: credit,
      giftCost: cost,
      meta: opts.meta || {},
      createdAt: FieldValue.serverTimestamp(),
    });
    return { fromBalance: nextFrom, credited: credit };
  });
}
