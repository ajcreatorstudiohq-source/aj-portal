import { NextResponse } from 'next/server';
import {
  bearerFromRequest,
  verifyFirebaseIdToken,
} from '../../../lib/verify-id-token';
import { notifyAdminWithdrawRequest } from '../../../lib/telegram';

/**
 * POST /api/notify/telegram-withdraw
 * Called after a user submits a withdraw request — alerts admin on Telegram.
 */
export async function POST(request: Request) {
  try {
    const token = bearerFromRequest(request);
    if (!token) {
      return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
    }
    const actor = await verifyFirebaseIdToken(token);
    if (!actor) {
      return NextResponse.json({ ok: false, error: 'invalid_token' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const coins = Math.floor(Number(body.coins || 0));
    const method = String(body.method || 'Unknown');
    const email = String(body.email || actor.email || '');
    const username = String(body.username || '');
    const payoutSummary = String(body.payoutSummary || '').slice(0, 400);

    if (!Number.isFinite(coins) || coins <= 0) {
      return NextResponse.json({ ok: false, error: 'invalid_coins' }, { status: 400 });
    }

    const result = await notifyAdminWithdrawRequest({
      uid: actor.uid,
      email,
      username,
      coins,
      method,
      payoutSummary,
    });

    if (!result.ok) {
      return NextResponse.json(
        { ok: false, error: result.error || 'telegram_failed' },
        { status: 502 }
      );
    }

    return NextResponse.json({ ok: true, telegram: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'telegram_failed';
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
