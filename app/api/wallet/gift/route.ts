import { NextResponse } from 'next/server';
import {
  bearerFromRequest,
  verifyFirebaseIdToken,
} from '../../../lib/verify-id-token';
import { adminSendGift } from '../../../lib/admin-wallet';
import { splitGiftCoins, GIFT_ADMIN_SHARE, GIFT_CREATOR_SHARE, isAllowedGiftCost } from '../../../lib/economy';
import { FieldValue, getAdminDb } from '../../../lib/firebase-admin';
import { creditAdminEarnings } from '../../../lib/admin-earnings';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/wallet/gift
 * Body: { toUid, giftCost, giftId?, meta? }
 * Debits sender full catalog cost; credits creator 60% (Admin atomic).
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
    const toUid = String(body.toUid || body.beneficiaryUid || '').trim();
    const giftCost = Math.floor(Number(body.giftCost || body.cost) || 0);
    const giftId = String(body.giftId || '').slice(0, 64);
    if (!toUid || giftCost <= 0) {
      return NextResponse.json({ ok: false, error: 'invalid_gift' }, { status: 400 });
    }
    if (!isAllowedGiftCost(giftCost)) {
      return NextResponse.json(
        {
          ok: false,
          error: 'invalid_gift_cost',
          message: 'Gift cost must match a catalog item.',
        },
        { status: 400 }
      );
    }

    const split = splitGiftCoins(giftCost);
    const result = await adminSendGift({
      fromUid: user.uid,
      toUid,
      giftCost,
      creatorCoins: split.userCoins,
      giftId,
      meta: body.meta && typeof body.meta === 'object' ? body.meta : {},
    });

    if (split.adminUsd > 0) {
      try {
        const adminDb = getAdminDb();
        if (adminDb) {
          await adminDb.collection('AdminRevenue').add({
            type: 'live_gift',
            source: 'live_gift',
            currency: 'USD',
            platformSharePct: GIFT_ADMIN_SHARE,
            userSharePct: GIFT_CREATOR_SHARE,
            uid: toUid,
            fromUid: user.uid,
            totalPool: split.totalUsd,
            adminShare: split.adminUsd,
            ownerUsd: split.adminUsd,
            userNet: split.userUsd,
            userNetCoins: split.userCoins,
            adminShareCoins: split.adminCoins,
            giftCost,
            createdAt: FieldValue.serverTimestamp(),
          });
          await creditAdminEarnings({
            ownerUsd: split.adminUsd,
            ownerCoins: split.adminCoins,
            source: 'live_gift',
            earnerUid: user.uid,
            forceWalletCredit: true,
          });
        }
      } catch {
        /* non-fatal — gift already applied */
      }
    }

    return NextResponse.json({
      ok: true,
      creditedCoins: result.credited,
      fromBalance: result.fromBalance,
      adminUsd: split.adminUsd,
      message: `Gift sent. Creator +${result.credited} AJ Coins.`,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'gift_failed';
    const status =
      msg === 'insufficient_balance'
        ? 402
        : msg === 'admin_sdk_missing'
          ? 503
          : msg === 'self_gift'
            ? 400
            : 400;
    return NextResponse.json(
      {
        ok: false,
        error: msg,
        message:
          msg === 'insufficient_balance'
            ? 'Insufficient balance.'
            : msg === 'admin_sdk_missing'
              ? 'Server wallet unavailable.'
              : 'Gift failed.',
      },
      { status }
    );
  }
}
