import { NextResponse } from 'next/server';
import {
  bearerFromRequest,
  verifyFirebaseIdToken,
} from '../../../lib/verify-id-token';
import { sendPushToUser } from '../../../lib/push-notify';

/**
 * POST /api/notify/push
 * Auth required. Sends FCM web push to another user's fcmToken.
 * Body: { toUid, title, body, data? }
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
    const toUid = String(body.toUid || '').trim();
    const title = String(body.title || 'AJ Super Portal').trim();
    const text = String(body.body || body.message || '').trim();
    const data =
      body.data && typeof body.data === 'object'
        ? Object.fromEntries(
            Object.entries(body.data as Record<string, unknown>).map(([k, v]) => [
              k,
              String(v ?? ''),
            ])
          )
        : {};

    if (!toUid || !title) {
      return NextResponse.json({ ok: false, error: 'invalid_params' }, { status: 400 });
    }
    if (toUid === actor.uid) {
      return NextResponse.json({ ok: false, error: 'self_notify' }, { status: 400 });
    }

    const result = await sendPushToUser({
      toUid,
      title,
      body: text || title,
      data: { ...data, fromUid: actor.uid },
    });

    if (!result.ok) {
      const status =
        result.error === 'admin_sdk_missing'
          ? 503
          : result.error === 'no_fcm_token' || result.error === 'user_not_found'
            ? 404
            : 500;
      return NextResponse.json({ ok: false, error: result.error }, { status });
    }

    return NextResponse.json({ ok: true, sent: result.sent || 1 });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'push_failed';
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
