import { NextResponse } from 'next/server';
import { applyFlatCoins } from '../../../lib/reward-engine';
import { getGameById, isValidMilestone, type GameProgressDoc } from '../../../lib/economy';
import { GAME_REWARD_COINS } from '../../../lib/reward-sources';
import {
  bearerFromRequest,
  verifyFirebaseIdToken,
} from '../../../lib/verify-id-token';
import { getAdminDb } from '../../../lib/firebase-admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/games/milestone — Admin SDK credit only.
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

    const adminDb = getAdminDb();
    if (!adminDb) {
      return NextResponse.json(
        { ok: false, error: 'admin_sdk_missing', message: 'Server wallet unavailable.' },
        { status: 503 }
      );
    }

    const userSnap = await adminDb.collection('users').doc(user.uid).get();
    if (!userSnap.exists) {
      return NextResponse.json({ ok: false, error: 'user_not_found' }, { status: 404 });
    }
    const data = userSnap.data() as {
      gameProgress?: Record<string, GameProgressDoc>;
    };
    const progress = data.gameProgress?.[gameId];
    if (!progress?.installed) {
      return NextResponse.json({ ok: false, error: 'game_not_installed' }, { status: 400 });
    }
    const currentLevel = Math.max(Number(progress.level || 0), reportedLevel || 0);
    if (currentLevel < level) {
      return NextResponse.json({ ok: false, error: 'level_not_reached' }, { status: 400 });
    }
    const claimed = Array.isArray(progress.claimedMilestones)
      ? [...progress.claimedMilestones]
      : [];
    if (claimed.includes(level)) {
      return NextResponse.json({
        ok: true,
        duplicate: true,
        creditedCoins: 0,
        message: 'Milestone already claimed',
      });
    }

    const txId = `milestone_${user.uid}_${gameId}_${level}`;
    const result = await applyFlatCoins({
      uid: user.uid,
      txId,
      source: 'game_milestone',
      coins: GAME_REWARD_COINS,
      meta: { gameId, level, reportedLevel },
      enforceDailyCap: true,
      userPatch: {
        [`gameProgress.${gameId}.level`]: currentLevel,
        [`gameProgress.${gameId}.claimedMilestones`]: [...claimed, level],
      },
    });

    if (!result.ok) {
      return NextResponse.json(
        {
          ok: false,
          error: result.error || 'milestone_failed',
          message: result.error === 'daily_limit' ? 'Daily game reward limit reached.' : result.error,
        },
        { status: result.error === 'daily_limit' ? 429 : 400 }
      );
    }

    return NextResponse.json({
      ok: true,
      duplicate: result.duplicate,
      creditedCoins: result.balanceCredited ?? 0,
      gameId,
      level,
      message: result.duplicate
        ? 'Milestone already claimed'
        : `+${result.balanceCredited} AJ Coins for level ${level}`,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'milestone_failed';
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
