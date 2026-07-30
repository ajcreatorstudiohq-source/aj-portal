import { NextResponse } from 'next/server';
import {
  isAdPlacement,
  MONETAG_INTERSTITIAL_ZONE,
  type AdEventType,
} from '../../../lib/ads-config';
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
 * Logs ad events only. Never books estimated CPC into Hisaab / Hub wallet.
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
      estimatedClickUsd: 0,
      estimatedImpressionUsd: 0,
    });

    return NextResponse.json({
      ok: true,
      eventId: eventRef.id,
      adminUsd: 0,
      bookedToHisaab: false,
      note: 'Event logged only. Real Adsterra $ via /api/ads/adsterra-postback.',
    });
  } catch (e: unknown) {
    console.error('[ads/track]', e);
    const norm = normalizeServerClaimFailure(e);
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
    booksToHisaab: false,
    settledPostback: '/api/ads/adsterra-postback',
  });
}
