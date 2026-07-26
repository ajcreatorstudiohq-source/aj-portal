/**
 * Server-side reward application with idempotency + AdminRevenue logging.
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

export type RewardSource = 'offerwall' | 'game_milestone' | 'game_install';

export type ApplyRewardResult = {
  ok: boolean;
  duplicate?: boolean;
  error?: string;
  split?: RewardSplit;
  balanceCredited?: number;
};

/**
 * Credit user wallet + log platform revenue. Idempotent on `txId`.
 * Collections:
 *   - offerwall_ledger/{txId} or reward_ledger/{txId}
 *   - users/{uid}.balance += userCoins
 *   - AdminRevenue (admin share of $5–$7 pool)
 */
export async function applySplitReward(opts: {
  uid: string;
  txId: string;
  source: RewardSource;
  seed: string;
  meta?: Record<string, unknown>;
  ledgerCollection?: string;
}): Promise<ApplyRewardResult> {
  const {
    uid,
    txId,
    source,
    seed,
    meta = {},
    ledgerCollection = 'reward_ledger',
  } = opts;

  if (!uid || !txId) {
    return { ok: false, error: 'missing_uid_or_tx' };
  }

  const ledgerRef = doc(db, ledgerCollection, txId);
  const userRef = doc(db, 'users', uid);
  const split = computeRewardSplit(seed);

  try {
    const result = await runTransaction(db, async (tx) => {
      const existing = await tx.get(ledgerRef);
      if (existing.exists()) {
        return { duplicate: true as const, split };
      }

      const userSnap = await tx.get(userRef);
      if (!userSnap.exists()) {
        throw new Error('user_not_found');
      }

      tx.set(ledgerRef, {
        uid,
        source,
        txId,
        ...split,
        meta,
        dayKey: typeof meta.dayKey === 'string' ? meta.dayKey : null,
        createdAt: serverTimestamp(),
      });

      tx.update(userRef, {
        balance: increment(split.userCoins),
        lastRewardAt: serverTimestamp(),
        lastRewardSource: source,
      });

      return { duplicate: false as const, split };
    });

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
    unlockedGames?: string[];
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
  return { unlockedGames: unlocked };
}

export async function updateGameLevel(uid: string, gameId: string, level: number) {
  const userRef = doc(db, 'users', uid);
  const snap = await getDoc(userRef);
  if (!snap.exists()) throw new Error('user_not_found');
  const data = snap.data() as { gameProgress?: Record<string, GameProgressDoc> };
  const prev = data.gameProgress?.[gameId];
  if (!prev?.installed) throw new Error('game_not_installed');
  const nextLevel = Math.max(prev.level || 0, level);
  await updateDoc(userRef, {
    [`gameProgress.${gameId}.level`]: nextLevel,
    [`gameProgress.${gameId}.lastLevelAt`]: serverTimestamp(),
  });
  return nextLevel;
}

export async function claimMilestoneFields(
  uid: string,
  gameId: string,
  level: number
) {
  const userRef = doc(db, 'users', uid);
  const snap = await getDoc(userRef);
  if (!snap.exists()) throw new Error('user_not_found');
  const data = snap.data() as { gameProgress?: Record<string, GameProgressDoc> };
  const prev = data.gameProgress?.[gameId];
  if (!prev?.installed) throw new Error('game_not_installed');
  if ((prev.level || 0) < level) throw new Error('level_not_reached');
  const claimed = Array.isArray(prev.claimedMilestones)
    ? [...prev.claimedMilestones]
    : [];
  if (claimed.includes(level)) throw new Error('already_claimed');
  claimed.push(level);
  await updateDoc(userRef, {
    [`gameProgress.${gameId}.claimedMilestones`]: claimed,
  });
  return claimed;
}
