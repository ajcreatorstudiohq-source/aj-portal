/**
 * Server-side reward application with idempotency + AdminRevenue logging.
 * Uses Firebase Admin SDK only — client cannot write users.balance.
 */
import { FieldValue, getAdminDb } from './firebase-admin';
import {
  computeRewardSplit,
  PLATFORM_EARN_SHARE,
  USER_EARN_SHARE,
  CASH_RATE,
  coinsToUsd,
  type RewardSplit,
  type GameProgressDoc,
} from './economy';
import { DAILY_CAPS, type RewardSource } from './reward-sources';
import { creditAdminEarnings } from './admin-earnings';

export type { RewardSource };

export type ApplyRewardResult = {
  ok: boolean;
  duplicate?: boolean;
  error?: string;
  split?: RewardSplit;
  balanceCredited?: number;
  dailyCapHit?: boolean;
};

function dayKeyUtc() {
  return new Date().toISOString().slice(0, 10);
}

function adminRevenueFields(
  split: RewardSplit,
  extra: Record<string, unknown> = {},
  shares?: { platformSharePct?: number; userSharePct?: number }
) {
  return {
    currency: 'USD',
    platformSharePct: shares?.platformSharePct ?? PLATFORM_EARN_SHARE,
    userSharePct: shares?.userSharePct ?? USER_EARN_SHARE,
    totalPool: split.totalUsd,
    adminShare: split.adminUsd,
    ownerUsd: split.adminUsd,
    userNet: split.userUsd,
    totalPoolCoins: split.userCoins + split.adminCoins,
    adminShareCoins: split.adminCoins,
    userNetCoins: split.userCoins,
    ...extra,
  };
}

function requireDb() {
  const db = getAdminDb();
  if (!db) throw new Error('admin_sdk_missing');
  return db;
}

/**
 * Credit user wallet + log platform revenue. Idempotent on `txId`.
 */
export async function applySplitReward(opts: {
  uid: string;
  txId: string;
  source: RewardSource;
  seed: string;
  meta?: Record<string, unknown>;
  ledgerCollection?: string;
  enforceDailyCap?: boolean;
  splitOverride?: RewardSplit;
  platformSharePct?: number;
  userSharePct?: number;
}): Promise<ApplyRewardResult> {
  const {
    uid,
    txId,
    source,
    seed,
    meta = {},
    ledgerCollection = 'reward_ledger',
    enforceDailyCap = true,
    splitOverride,
    platformSharePct,
    userSharePct,
  } = opts;

  if (!uid || !txId) return { ok: false, error: 'missing_uid_or_tx' };

  let db;
  try {
    db = requireDb();
  } catch {
    return { ok: false, error: 'admin_sdk_missing' };
  }

  const ledgerRef = db.collection(ledgerCollection).doc(txId);
  const userRef = db.collection('users').doc(uid);
  const split = splitOverride ?? computeRewardSplit(seed);
  const dayKey = dayKeyUtc();
  const cap = DAILY_CAPS[source] ?? 5;

  try {
    const result = await db.runTransaction(async (tx) => {
      const existing = await tx.get(ledgerRef);
      if (existing.exists) {
        return { duplicate: true as const, split, dailyCapHit: false };
      }

      const userSnap = await tx.get(userRef);
      if (!userSnap.exists) throw new Error('user_not_found');

      const data = userSnap.data() as {
        balance?: number;
        dailyRewards?: Record<string, { dayKey?: string; count?: number }>;
      };

      let nextDailyCount: number | null = null;
      if (enforceDailyCap) {
        const slot = data.dailyRewards?.[source];
        const count = slot?.dayKey === dayKey ? Number(slot.count || 0) : 0;
        if (count >= cap) {
          return { duplicate: false as const, split, dailyCapHit: true };
        }
        nextDailyCount = count + 1;
      }

      const bal = Math.max(0, Math.floor(Number(data.balance) || 0));
      tx.set(ledgerRef, {
        uid,
        source,
        txId,
        ...split,
        meta,
        dayKey: typeof meta.dayKey === 'string' ? meta.dayKey : dayKey,
        createdAt: FieldValue.serverTimestamp(),
      });

      const userUpdate: Record<string, unknown> = {
        balance: bal + split.userCoins,
        lastRewardAt: FieldValue.serverTimestamp(),
        lastRewardSource: source,
        lastWalletWriteAt: FieldValue.serverTimestamp(),
      };
      if (nextDailyCount !== null) {
        userUpdate[`dailyRewards.${source}.dayKey`] = dayKey;
        userUpdate[`dailyRewards.${source}.count`] = nextDailyCount;
      }
      tx.update(userRef, userUpdate);

      return { duplicate: false as const, split, dailyCapHit: false };
    });

    if (result.dailyCapHit) {
      return {
        ok: false,
        error: 'daily_limit',
        dailyCapHit: true,
        split: result.split,
        balanceCredited: 0,
      };
    }

    if (!result.duplicate) {
      try {
        await db.collection('AdminRevenue').add(
          adminRevenueFields(
            result.split,
            {
              type: source,
              uid,
              txId,
              meta,
              date: FieldValue.serverTimestamp(),
            },
            { platformSharePct, userSharePct }
          )
        );
      } catch {
        /* non-fatal */
      }
      try {
        await creditAdminEarnings({
          ownerUsd: result.split.adminUsd,
          ownerCoins: result.split.adminCoins,
          source,
        });
      } catch {
        /* non-fatal */
      }
    }

    return {
      ok: true,
      duplicate: result.duplicate,
      split: result.split,
      balanceCredited: result.duplicate ? 0 : result.split.userCoins,
    };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'reward_failed';
    return { ok: false, error: msg };
  }
}

/**
 * Credit an exact AJ Coin amount (idempotent). Admin SDK only.
 */
export async function applyFlatCoins(opts: {
  uid: string;
  txId: string;
  source: RewardSource;
  coins: number;
  meta?: Record<string, unknown>;
  ledgerCollection?: string;
  enforceDailyCap?: boolean;
  userPatch?: Record<string, unknown>;
  allowZero?: boolean;
}): Promise<ApplyRewardResult> {
  const {
    uid,
    txId,
    source,
    coins,
    meta = {},
    ledgerCollection = 'reward_ledger',
    enforceDailyCap = true,
    userPatch,
    allowZero = false,
  } = opts;

  if (!uid || !txId) return { ok: false, error: 'missing_uid_or_tx' };
  const credit = Math.max(0, Math.floor(coins));
  if (credit <= 0 && !allowZero) return { ok: false, error: 'invalid_coins' };

  let db;
  try {
    db = requireDb();
  } catch {
    return { ok: false, error: 'admin_sdk_missing' };
  }

  const zeroSplit: RewardSplit = {
    totalUsd: 0,
    userUsd: 0,
    adminUsd: 0,
    userCoins: 0,
    adminCoins: 0,
  };

  if (credit <= 0 && allowZero) {
    const userRef = db.collection('users').doc(uid);
    try {
      if (userPatch && Object.keys(userPatch).length) {
        await userRef.update({
          ...userPatch,
          lastRewardAt: FieldValue.serverTimestamp(),
          lastRewardSource: source,
          lastWalletWriteAt: FieldValue.serverTimestamp(),
        });
      }
      return { ok: true, duplicate: false, split: zeroSplit, balanceCredited: 0 };
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'reward_failed';
      return { ok: false, error: msg };
    }
  }

  const ledgerRef = db.collection(ledgerCollection).doc(txId);
  const userRef = db.collection('users').doc(uid);
  const dayKey = dayKeyUtc();
  const cap = DAILY_CAPS[source] ?? 5;

  const userUsd = coinsToUsd(credit);
  const totalUsd =
    USER_EARN_SHARE > 0 ? Number((userUsd / USER_EARN_SHARE).toFixed(6)) : userUsd;
  const adminUsd = Number((totalUsd - userUsd).toFixed(6));
  const split: RewardSplit = {
    totalUsd,
    userUsd,
    adminUsd,
    userCoins: credit,
    adminCoins: Math.floor(adminUsd * CASH_RATE),
  };

  try {
    const result = await db.runTransaction(async (tx) => {
      const existing = await tx.get(ledgerRef);
      if (existing.exists) {
        return { duplicate: true as const, split, dailyCapHit: false };
      }

      const userSnap = await tx.get(userRef);
      if (!userSnap.exists) throw new Error('user_not_found');

      const data = userSnap.data() as {
        balance?: number;
        dailyRewards?: Record<string, { dayKey?: string; count?: number }>;
      };

      let nextDailyCount: number | null = null;
      if (enforceDailyCap) {
        const slot = data.dailyRewards?.[source];
        const count = slot?.dayKey === dayKey ? Number(slot.count || 0) : 0;
        if (count >= cap) {
          return { duplicate: false as const, split, dailyCapHit: true };
        }
        nextDailyCount = count + 1;
      }

      const bal = Math.max(0, Math.floor(Number(data.balance) || 0));
      tx.set(ledgerRef, {
        uid,
        source,
        txId,
        ...split,
        flatCoins: credit,
        meta,
        dayKey,
        createdAt: FieldValue.serverTimestamp(),
      });

      const userUpdate: Record<string, unknown> = {
        balance: bal + credit,
        lastRewardAt: FieldValue.serverTimestamp(),
        lastRewardSource: source,
        lastWalletWriteAt: FieldValue.serverTimestamp(),
        ...(userPatch || {}),
      };
      if (nextDailyCount !== null) {
        userUpdate[`dailyRewards.${source}.dayKey`] = dayKey;
        userUpdate[`dailyRewards.${source}.count`] = nextDailyCount;
      }
      tx.update(userRef, userUpdate);

      return { duplicate: false as const, split, dailyCapHit: false };
    });

    if (result.dailyCapHit) {
      return {
        ok: false,
        error: 'daily_limit',
        dailyCapHit: true,
        split: result.split,
        balanceCredited: 0,
      };
    }

    if (!result.duplicate && result.split.adminUsd > 0) {
      try {
        await db.collection('AdminRevenue').add(
          adminRevenueFields(result.split, {
            type: source,
            uid,
            txId,
            meta,
            flatCoins: credit,
            date: FieldValue.serverTimestamp(),
          })
        );
      } catch {
        /* non-fatal */
      }
      try {
        await creditAdminEarnings({
          ownerUsd: result.split.adminUsd,
          ownerCoins: result.split.adminCoins,
          source,
        });
      } catch {
        /* non-fatal */
      }
    }

    return {
      ok: true,
      duplicate: result.duplicate,
      split: result.split,
      balanceCredited: result.duplicate ? 0 : credit,
    };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'reward_failed';
    return { ok: false, error: msg };
  }
}

export async function ensureGameProgress(
  uid: string,
  gameId: string
): Promise<GameProgressDoc> {
  const db = requireDb();
  const snap = await db.collection('users').doc(uid).get();
  if (!snap.exists) throw new Error('user_not_found');
  const data = snap.data() as {
    gameProgress?: Record<string, GameProgressDoc>;
  };
  const progress = data.gameProgress?.[gameId];
  if (progress) return progress as GameProgressDoc;
  return {
    installed: false,
    level: 0,
    claimedMilestones: [],
  };
}

export async function markGameInstalled(uid: string, gameId: string) {
  const db = requireDb();
  const userRef = db.collection('users').doc(uid);
  const snap = await userRef.get();
  if (!snap.exists) throw new Error('user_not_found');
  const data = snap.data() as {
    gameProgress?: Record<string, GameProgressDoc>;
    unlockedGames?: string[];
  };
  const unlocked = Array.isArray(data.unlockedGames) ? [...data.unlockedGames] : [];
  const alreadyInstalled = !!data.gameProgress?.[gameId]?.installed;
  if (!unlocked.includes(gameId)) unlocked.push(gameId);
  const prev = data.gameProgress?.[gameId] || {
    installed: false,
    level: 0,
    claimedMilestones: [],
  };
  await userRef.update({
    unlockedGames: unlocked,
    [`gameProgress.${gameId}`]: {
      ...prev,
      installed: true,
      installedAt: FieldValue.serverTimestamp(),
    },
  });
  return { unlockedGames: unlocked, alreadyInstalled };
}
