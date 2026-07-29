import { NextResponse } from 'next/server';
import {
  bearerFromRequest,
  verifyFirebaseIdToken,
} from '../../../lib/verify-id-token';
import { adminRequestWithdraw } from '../../../lib/admin-wallet';
import { MIN_WITHDRAW_COINS } from '../../../lib/economy';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/wallet/withdraw
 * Zeros balance and creates manual_withdrawals via Admin SDK.
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
    const method = String(body.method || '').trim();
    if (!method) {
      return NextResponse.json({ ok: false, error: 'missing_method' }, { status: 400 });
    }
    const payoutDetails =
      body.payoutDetails && typeof body.payoutDetails === 'object'
        ? (body.payoutDetails as Record<string, string>)
        : {};

    const result = await adminRequestWithdraw({
      uid: user.uid,
      email: user.email,
      method,
      payoutDetails,
      minCoins: MIN_WITHDRAW_COINS,
    });

    return NextResponse.json({
      ok: true,
      coins: result.coins,
      message: `Withdrawal of ${result.coins.toLocaleString()} AJ Coins submitted.`,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'withdraw_failed';
    const status =
      msg === 'below_minimum'
        ? 400
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
          msg === 'below_minimum'
            ? `Minimum ${MIN_WITHDRAW_COINS.toLocaleString()} AJ Coins required.`
            : msg === 'admin_sdk_missing'
              ? 'Server wallet unavailable. Configure FIREBASE_SERVICE_ACCOUNT_JSON.'
              : 'Withdrawal failed.',
      },
      { status }
    );
  }
}
