import { NextResponse } from 'next/server';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '../../../../firebaseConfig';
import {
  AD_CLICK_VALUE_USD,
  AD_IMPRESSION_ECPM_USD,
  isAdPlacement,
  MONETAG_INTERSTITIAL_ZONE,
  type AdEventType,
} from '../../../lib/ads-config';
import {
  bearerFromRequest,
  verifyFirebaseIdToken,
} from '../../../lib/verify-id-token';

const EVENTS: AdEventType[] = ['impression', 'click', 'complete', 'skip', 'fail'];

/**
 * POST /api/ads/track
 * Auth optional (Bearer). Logs impression/click/complete to `ad_events`
 * and attributes estimated admin revenue for impressions + clicks.
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

    const eventRef = await addDoc(collection(db, 'ad_events'), {
      uid,
      event,
      placement,
      knownPlacement: isAdPlacement(placement),
      zoneId,
      meta,
      createdAt: serverTimestamp(),
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
        await addDoc(collection(db, 'AdminRevenue'), {
          type: `ad_${event}`,
          source: 'ad_network',
          placement,
          zoneId,
          uid,
          adminShare: adminUsd,
          userNet: 0,
          totalPool: adminUsd,
          eventId: eventRef.id,
          createdAt: serverTimestamp(),
        });
      } catch {
        /* non-fatal */
      }
    }

    return NextResponse.json({ ok: true, eventId: eventRef.id, adminUsd });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'track_failed';
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
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
