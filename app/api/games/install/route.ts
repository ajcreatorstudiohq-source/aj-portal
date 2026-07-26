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
 * Marks a game as installed/unlocked for the user. No free wallet earnings —
 * real rewards unlock only via level milestones or offerwall.
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
      message: `${game.name} installed. Clear milestone levels to earn wallet rewards.`,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'install_failed';
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
