/**
 * Server-side reward application with idempotency + AdminRevenue logging.
 * Unified $5–$7 pool / $1–$1.50 user split across all earning channels.
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
  type RewardSplit,
  type GameProgressDoc,
} from './economy';
import {
  DAILY_CAPS,
  type RewardSource,
} from './reward-sources';

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
  /** When true, enforce per-source daily caps on users/{uid} */
  enforceDailyCap?: boolean;
}): Promise<ApplyRewardResult> {
  const {
    uid,
    txId,
    source,
    seed,
    meta = {},
    ledgerCollection = 'reward_ledger',
    enforceDailyCap = true,
  } = opts;

  if (!uid || !txId) {
    return { ok: false, error: 'missing_uid_or_tx' };
  }

  const ledgerRef = doc(db, ledgerCollection, txId);
  const userRef = doc(db, 'users', uid);
  const split = computeRewardSplit(seed);
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
        await addDoc(collection(db, 'AdminRevenue'), {
          type: source,
          totalPool: result.split.totalUsd,
          adminShare: result.split.adminUsd,
          userNet: result.split.userUsd,
          totalPoolCoins: result.split.userCoins + result.split.adminCoins,
          adminShareCoins: result.split.adminCoins,
          userNetCoins: result.split.userCoins,
          uid,
          txId,
          meta,
          date: serverTimestamp(),
        });
      } catch {
        // Non-fatal — user credit already committed
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
