/**
 * Server-side reward application with idempotency + AdminRevenue logging.
 * Credits AJ Coins 🪙 to user wallets (UI never shows currency as USD).
 */
import {
  collection,
  doc,
  getDoc,
  addDoc,
  updateDoc,
  increment,
  serverTimestamp,
  runTransaction,
} from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import {
  computeRewardSplit,
  PLATFORM_EARN_SHARE,
  USER_EARN_SHARE,
  CASH_RATE,
  coinsToUsd,
  type RewardSplit,
  type GameProgressDoc,
} from './economy';
import {
  DAILY_CAPS,
  type RewardSource,
} from './reward-sources';
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

/** Fields written on every AdminRevenue row so owner share is clear in USD. */
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

/**
 * Credit user wallet + log platform revenue. Idempotent on `txId`.
 * Default: user 30% AJ Coins, owner 70% USD ledger.
 * Gifts may pass splitOverride + share pct overrides (40/60).
 */
export async function applySplitReward(opts: {
  uid: string;
  txId: string;
  source: RewardSource;
  seed: string;
  meta?: Record<string, unknown>;
  ledgerCollection?: string;
  /** When true, enforce per-source daily caps on users/{uid} */
  enforceDailyCap?: boolean;
  /** Override split (e.g. gifts = 40% admin / 60% creator of giftCost). */
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

  if (!uid || !txId) {
    return { ok: false, error: 'missing_uid_or_tx' };
  }

  const ledgerRef = doc(db, ledgerCollection, txId);
  const userRef = doc(db, 'users', uid);
  const split = splitOverride ?? computeRewardSplit(seed);
  const dayKey = dayKeyUtc();
  const cap = DAILY_CAPS[source] ?? 5;

  try {
    const result = await runTransaction(db, async (tx) => {
      const existing = await tx.get(ledgerRef);
      if (existing.exists()) {
        return { duplicate: true as const, split, dailyCapHit: false };
      }

      const userSnap = await tx.get(userRef);
      if (!userSnap.exists()) {
        throw new Error('user_not_found');
      }

      const data = userSnap.data() as {
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

      tx.set(ledgerRef, {
        uid,
        source,
        txId,
        ...split,
        meta,
        dayKey: typeof meta.dayKey === 'string' ? meta.dayKey : dayKey,
        createdAt: serverTimestamp(),
      });

      const userUpdate: Record<string, unknown> = {
        balance: increment(split.userCoins),
        lastRewardAt: serverTimestamp(),
        lastRewardSource: source,
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
        await addDoc(
          collection(db, 'AdminRevenue'),
          adminRevenueFields(
            result.split,
            {
              type: source,
              uid,
              txId,
              meta,
              date: serverTimestamp(),
            },
            { platformSharePct, userSharePct }
          )
        );
      } catch {
        // Non-fatal — user credit already committed
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
 * Credit an exact AJ Coin amount (idempotent). Used for fixed post rewards etc.
 * Flat coins = user's share; USD valued at CASH_RATE (withdraw). Admin ledger gets
 * the complementary 70% of the implied pool so hisaab stays 100% consistent.
 */
export async function applyFlatCoins(opts: {
  uid: string;
  txId: string;
  source: RewardSource;
  coins: number;
  meta?: Record<string, unknown>;
  ledgerCollection?: string;
  enforceDailyCap?: boolean;
  /** Extra user field updates inside the same transaction (e.g. lastBotClaimAt) */
  userPatch?: Record<string, unknown>;
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
  } = opts;

  if (!uid || !txId) return { ok: false, error: 'missing_uid_or_tx' };
  const credit = Math.max(0, Math.floor(coins));
  if (credit <= 0) return { ok: false, error: 'invalid_coins' };

  const ledgerRef = doc(db, ledgerCollection, txId);
  const userRef = doc(db, 'users', uid);
  const dayKey = dayKeyUtc();
  const cap = DAILY_CAPS[source] ?? 5;

  // Flat credit is the user's 30% — back-calculate full pool for admin 70%
  const userUsd = coinsToUsd(credit);
  const totalUsd =
    USER_EARN_SHARE > 0
      ? Number((userUsd / USER_EARN_SHARE).toFixed(6))
      : userUsd;
  const adminUsd = Number((totalUsd - userUsd).toFixed(6));
  const split: RewardSplit = {
    totalUsd,
    userUsd,
    adminUsd,
    userCoins: credit,
    adminCoins: Math.floor(adminUsd * CASH_RATE),
  };

  try {
    const result = await runTransaction(db, async (tx) => {
      const existing = await tx.get(ledgerRef);
      if (existing.exists()) {
        return { duplicate: true as const, split, dailyCapHit: false };
      }

      const userSnap = await tx.get(userRef);
      if (!userSnap.exists()) throw new Error('user_not_found');

      const data = userSnap.data() as {
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

      tx.set(ledgerRef, {
        uid,
        source,
        txId,
        ...split,
        flatCoins: credit,
        meta,
        dayKey,
        createdAt: serverTimestamp(),
      });

      const userUpdate: Record<string, unknown> = {
        balance: increment(credit),
        lastRewardAt: serverTimestamp(),
        lastRewardSource: source,
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
        await addDoc(
          collection(db, 'AdminRevenue'),
          adminRevenueFields(result.split, {
            type: source,
            uid,
            txId,
            meta,
            flatCoins: credit,
            date: serverTimestamp(),
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
  const userRef = doc(db, 'users', uid);
  const snap = await getDoc(userRef);
  if (!snap.exists()) throw new Error('user_not_found');
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
  const userRef = doc(db, 'users', uid);
  const snap = await getDoc(userRef);
  if (!snap.exists()) throw new Error('user_not_found');
  const data = snap.data() as {
    gameProgress?: Record<string, GameProgressDoc>;
    unlockedGames?: string[];
  };
  const unlocked = Array.isArray(data.unlockedGames) ? [...data.unlockedGames] : [];
  if (!unlocked.includes(gameId)) unlocked.push(gameId);
  const prev = data.gameProgress?.[gameId] || {
    installed: false,
    level: 0,
    claimedMilestones: [],
  };
  await updateDoc(userRef, {
    unlockedGames: unlocked,
    [`gameProgress.${gameId}`]: {
      ...prev,
      installed: true,
      installedAt: serverTimestamp(),
    },
  });
  return { unlockedGames: unlocked, alreadyInstalled: !!prev.installed };
}
