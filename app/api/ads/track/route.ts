import { NextResponse } from 'next/server';
import {
  AD_CLICK_VALUE_USD,
  AD_IMPRESSION_ECPM_USD,
  isAdPlacement,
  MONETAG_INTERSTITIAL_ZONE,
  type AdEventType,
} from '../../../lib/ads-config';
import { PLATFORM_EARN_SHARE, USER_EARN_SHARE, CASH_RATE } from '../../../lib/economy';
import { creditAdminEarnings } from '../../../lib/admin-earnings';
import {
  bearerFromRequest,
  verifyFirebaseIdToken,
} from '../../../lib/verify-id-token';
import { FieldValue, getAdminDb } from '../../../lib/firebase-admin';
import { normalizeServerClaimFailure } from '../../../lib/claim-errors';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const EVENTS: AdEventType[] = ['impression', 'click', 'complete', 'skip', 'fail'];

/**
 * POST /api/ads/track
 * Auth optional (Bearer). Logs impression/click/complete to `ad_events`
 * via Admin SDK (client SDK has no auth on the server → permission denied).
 */
export async function POST(request: Request) {
  try {
    const token = bearerFromRequest(request);
    let uid = 'anonymous';
    if (token) {
      const user = await verifyFirebaseIdToken(token);
      if (user) uid = user.uid;
    }

    const body = await request.json().catch(() => ({}));
    const event = String(body.event || '') as AdEventType;
    if (!EVENTS.includes(event)) {
      return NextResponse.json({ ok: false, error: 'invalid_event' }, { status: 400 });
    }
    const placement = String(body.placement || '');
    if (!placement || placement.length > 64) {
      return NextResponse.json({ ok: false, error: 'invalid_placement' }, { status: 400 });
    }
    const zoneId = Number(body.zoneId || MONETAG_INTERSTITIAL_ZONE);
    const meta =
      body.meta && typeof body.meta === 'object' ? (body.meta as Record<string, unknown>) : {};

    const adminDb = getAdminDb();
    if (!adminDb) {
      // Tracking must never crash the claim UX — soft-fail
      return NextResponse.json({
        ok: true,
        skipped: true,
        error: 'admin_sdk_missing',
        message: 'Ad event not stored (Admin SDK missing).',
      });
    }

    const eventRef = await adminDb.collection('ad_events').add({
      uid,
      event,
      placement,
      knownPlacement: isAdPlacement(placement),
      zoneId,
      meta,
      createdAt: FieldValue.serverTimestamp(),
      dayKey: new Date().toISOString().slice(0, 10),
    });

    let adminUsd = 0;
    if (event === 'impression') {
      adminUsd = Number((AD_IMPRESSION_ECPM_USD / 1000).toFixed(6));
    } else if (event === 'click') {
      adminUsd = AD_CLICK_VALUE_USD;
    }

    if (adminUsd > 0) {
      try {
        await adminDb.collection('AdminRevenue').add({
          type: `ad_${event}`,
          source: 'ad_network',
          currency: 'USD',
          platformSharePct: PLATFORM_EARN_SHARE,
          userSharePct: USER_EARN_SHARE,
          placement,
          zoneId,
          uid,
          adminShare: adminUsd,
          ownerUsd: adminUsd,
          adminShareCoins: Math.floor(adminUsd * CASH_RATE),
          userNet: 0,
          totalPool: adminUsd,
          eventId: eventRef.id,
          createdAt: FieldValue.serverTimestamp(),
        });
        await creditAdminEarnings({
          ownerUsd: adminUsd,
          ownerCoins: Math.floor(adminUsd * CASH_RATE),
          source: `ad_${event}`,
          earnerUid: uid !== 'anonymous' ? uid : undefined,
          forceWalletCredit: true,
        });
      } catch {
        /* non-fatal */
      }
    }

    return NextResponse.json({ ok: true, eventId: eventRef.id, adminUsd });
  } catch (e: unknown) {
    console.error('[ads/track]', e);
    const norm = normalizeServerClaimFailure(e);
    // Soft-fail tracking — never break Hub claim UX
    return NextResponse.json(
      { ok: true, skipped: true, error: norm.error, message: norm.message },
      { status: 200 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    events: EVENTS,
    impressionEcpmUsd: AD_IMPRESSION_ECPM_USD,
    clickValueUsd: AD_CLICK_VALUE_USD,
  });
}
