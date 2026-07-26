import { NextResponse } from 'next/server';
import { getGameById } from '../../../lib/economy';
import { applySplitReward, markGameInstalled } from '../../../lib/reward-engine';
import {
  bearerFromRequest,
  verifyFirebaseIdToken,
} from '../../../lib/verify-id-token';

/**
 * POST /api/games/install
 * Body: { gameId: string }
 * Auth: Bearer <Firebase ID token>
 *
 * Downloads/unlocks a game. First install credits via the unified
 * $5–$7 / $1–$1.50 split. Further earnings require level milestones.
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
    const game = getGameById(gameId);
    if (!game || game.comingSoon || !game.url) {
      return NextResponse.json({ ok: false, error: 'invalid_game' }, { status: 400 });
    }

    const result = await markGameInstalled(user.uid, gameId);

    let reward: Awaited<ReturnType<typeof applySplitReward>> | null = null;
    if (!result.alreadyInstalled) {
      const txId = `earn_game_install_${user.uid}_${gameId}`;
      reward = await applySplitReward({
        uid: user.uid,
        txId,
        source: 'game_install',
        seed: txId,
        meta: { gameId, gameName: game.name },
        enforceDailyCap: true,
      });
    }

    const credited = reward && reward.ok && !reward.duplicate ? reward.balanceCredited || 0 : 0;

    return NextResponse.json({
      ok: true,
      gameId,
      unlockedGames: result.unlockedGames,
      alreadyInstalled: result.alreadyInstalled,
      creditedCoins: credited,
      userUsd: reward?.split?.userUsd,
      adminUsd: reward?.split?.adminUsd,
      totalPoolUsd: reward?.split?.totalUsd,
      downloadUrl: game.url,
      message: result.alreadyInstalled
        ? `${game.name} already installed — clear milestones to earn more.`
        : credited > 0
          ? `${game.name} downloaded! +${credited} AJ Coins. Clear levels for more.`
          : `${game.name} installed. Clear milestone levels to earn wallet rewards.`,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'install_failed';
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
