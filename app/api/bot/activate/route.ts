import { NextResponse } from 'next/server';
import {
  bearerFromRequest,
  verifyFirebaseIdToken,
} from '../../../lib/verify-id-token';
import { adminActivateBot } from '../../../lib/admin-wallet';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const BOT_COSTS = {
  basic: 2500,
  vvip: 5000,
} as const;

/**
 * POST /api/bot/activate
 * Body: { tier: 'basic' | 'vvip' }
 * Debits coins + sets invested/botTier via Admin SDK only.
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
    const tierRaw = String(body.tier || '').toLowerCase();
    if (tierRaw !== 'basic' && tierRaw !== 'vvip') {
      return NextResponse.json({ ok: false, error: 'invalid_tier' }, { status: 400 });
    }
    const tier = tierRaw as 'basic' | 'vvip';
    const cost = BOT_COSTS[tier];

    const result = await adminActivateBot({ uid: user.uid, tier, cost });
    return NextResponse.json({
      ok: true,
      botTier: result.botTier,
      invested: result.invested,
      balance: result.balance,
      cost,
      message: `${tier.toUpperCase()} bot activated. Sync profits after 24h.`,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'activate_failed';
    const status =
      msg === 'insufficient_balance'
        ? 402
        : msg === 'admin_sdk_missing'
          ? 503
          : msg === 'user_not_found'
            ? 404
            : 400;
    return NextResponse.json(
      {
        ok: false,
        error: msg,
        message:
          msg === 'admin_sdk_missing'
            ? 'Server wallet unavailable. Configure FIREBASE_SERVICE_ACCOUNT_JSON.'
            : msg === 'insufficient_balance'
              ? 'Insufficient balance.'
              : 'Bot activation failed.',
      },
      { status }
    );
  }
}
