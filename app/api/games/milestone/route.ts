import { NextResponse } from 'next/server';
import {
  doc,
  getDoc,
  updateDoc,
  increment,
  serverTimestamp,
  collection,
  addDoc,
  runTransaction,
} from 'firebase/firestore';
import { db } from '../../../../firebaseConfig';
import {
  computeRewardSplit,
  getGameById,
  isValidMilestone,
  type GameProgressDoc,
} from '../../../lib/economy';
import {
  bearerFromRequest,
  verifyFirebaseIdToken,
} from '../../../lib/verify-id-token';

/**
 * POST /api/games/milestone
 * Body: { gameId: string, level: number }
 * Auth: Bearer <Firebase ID token>
 *
 * Validates install + level reached + milestone definition, then credits
 * $1.00–$1.50 USD equivalent to the user and logs the remainder of the
 * $5–$7 pool as AdminRevenue. Idempotent per user/game/level.
 */
export async function POST(request: Request) {
  try {
    const token = bearerFromRequest(request);
    if (!token) {
      return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
    }
    const user = await verifyFirebaseIdToken(token);
    if (!user) {
      return NextResponse.json({ ok: false, error: 'invalid_token' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const gameId = String(body.gameId || '');
    const level = Number(body.level);
    const reportedLevel = Number(body.reportedLevel || level);

    if (!getGameById(gameId) || !isValidMilestone(gameId, level) || !Number.isFinite(level)) {
      return NextResponse.json({ ok: false, error: 'invalid_milestone' }, { status: 400 });
    }

    const txId = `milestone_${user.uid}_${gameId}_${level}`;
    const ledgerRef = doc(db, 'reward_ledger', txId);
    const userRef = doc(db, 'users', user.uid);
    const seed = txId;
    const split = computeRewardSplit(seed);

    const outcome = await runTransaction(db, async (tx) => {
      const ledgerSnap = await tx.get(ledgerRef);
      if (ledgerSnap.exists()) {
        return { duplicate: true as const, split };
      }

      const userSnap = await tx.get(userRef);
      if (!userSnap.exists()) throw new Error('user_not_found');

      const data = userSnap.data() as {
        gameProgress?: Record<string, GameProgressDoc>;
      };
      const progress = data.gameProgress?.[gameId];
      if (!progress?.installed) throw new Error('game_not_installed');

      const currentLevel = Math.max(Number(progress.level || 0), reportedLevel || 0);
      if (currentLevel < level) throw new Error('level_not_reached');

      const claimed = Array.isArray(progress.claimedMilestones)
        ? [...progress.claimedMilestones]
        : [];
      if (claimed.includes(level)) {
        return { duplicate: true as const, split };
      }
      claimed.push(level);

      tx.set(ledgerRef, {
        uid: user.uid,
        source: 'game_milestone',
        txId,
        gameId,
        level,
        ...split,
        createdAt: serverTimestamp(),
      });

      tx.update(userRef, {
        balance: increment(split.userCoins),
        lastRewardAt: serverTimestamp(),
        lastRewardSource: 'game_milestone',
        [`gameProgress.${gameId}.level`]: currentLevel,
        [`gameProgress.${gameId}.claimedMilestones`]: claimed,
        [`gameProgress.${gameId}.lastLevelAt`]: serverTimestamp(),
      });

      return { duplicate: false as const, split, claimed, currentLevel };
    });

    if (!outcome.duplicate) {
      try {
        await addDoc(collection(db, 'AdminRevenue'), {
          type: 'game_milestone',
          totalPool: outcome.split.totalUsd,
          adminShare: outcome.split.adminUsd,
          userNet: outcome.split.userUsd,
          totalPoolCoins: outcome.split.userCoins + outcome.split.adminCoins,
          adminShareCoins: outcome.split.adminCoins,
          userNetCoins: outcome.split.userCoins,
          uid: user.uid,
          txId,
          gameId,
          level,
          date: serverTimestamp(),
        });
      } catch {}
    }

    return NextResponse.json({
      ok: true,
      duplicate: outcome.duplicate,
      gameId,
      level,
      creditedCoins: outcome.duplicate ? 0 : outcome.split.userCoins,
      userUsd: outcome.split.userUsd,
      adminUsd: outcome.split.adminUsd,
      totalPoolUsd: outcome.split.totalUsd,
      message: outcome.duplicate
        ? 'Milestone already claimed'
        : `Milestone L${level} complete! +${outcome.split.userCoins} AJ Coins ($${outcome.split.userUsd.toFixed(2)})`,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'milestone_failed';
    const status =
      msg === 'game_not_installed' || msg === 'level_not_reached' ? 400 : 500;
    return NextResponse.json({ ok: false, error: msg }, { status });
  }
}

/** PATCH — report level progress without claiming (install required). */
export async function PATCH(request: Request) {
  try {
    const token = bearerFromRequest(request);
    if (!token) {
      return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
    }
    const user = await verifyFirebaseIdToken(token);
    if (!user) {
      return NextResponse.json({ ok: false, error: 'invalid_token' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const gameId = String(body.gameId || '');
    const level = Math.floor(Number(body.level) || 0);
    if (!getGameById(gameId) || level < 1) {
      return NextResponse.json({ ok: false, error: 'invalid_level' }, { status: 400 });
    }

    const userRef = doc(db, 'users', user.uid);
    const snap = await getDoc(userRef);
    if (!snap.exists()) {
      return NextResponse.json({ ok: false, error: 'user_not_found' }, { status: 404 });
    }
    const data = snap.data() as { gameProgress?: Record<string, GameProgressDoc> };
    const progress = data.gameProgress?.[gameId];
    if (!progress?.installed) {
      return NextResponse.json({ ok: false, error: 'game_not_installed' }, { status: 400 });
    }
    const next = Math.max(Number(progress.level || 0), level);
    await updateDoc(userRef, {
      [`gameProgress.${gameId}.level`]: next,
      [`gameProgress.${gameId}.lastLevelAt`]: serverTimestamp(),
    });

    return NextResponse.json({ ok: true, gameId, level: next });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'level_update_failed';
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
