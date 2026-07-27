import { NextResponse } from 'next/server';
import { getGameById } from '../../../lib/economy';
import { markGameInstalled } from '../../../lib/reward-engine';
import {
  bearerFromRequest,
  verifyFirebaseIdToken,
} from '../../../lib/verify-id-token';

/**
 * POST /api/games/install
 * Body: { gameId: string }
 * Auth: Bearer <Firebase ID token>
 *
 * Unlocks a game package for play. Opening/download MUST NOT credit AJ Coins.
 * Wallet credits only via verified CPAGrip /api/postback or milestone APIs.
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

    return NextResponse.json({
      ok: true,
      gameId,
      unlockedGames: result.unlockedGames,
      alreadyInstalled: result.alreadyInstalled,
      creditedCoins: 0,
      pendingVerification: !result.alreadyInstalled,
      downloadUrl: game.url,
      message: result.alreadyInstalled
        ? `${game.name} already unlocked — clear milestones or complete CPAGrip offers for AJ Coins 🪙.`
        : `${game.name} unlocked — Pending Verification ⏳. AJ Coins credit only after verified CPAGrip install/offer postback (click alone = 0 coins).`,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'install_failed';
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
