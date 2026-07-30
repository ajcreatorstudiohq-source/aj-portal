import { NextResponse } from 'next/server';
import { RtcRole, RtcTokenBuilder } from 'agora-token';
import {
  AGORA_APP_ID,
  AGORA_TOKEN_TTL_SEC,
  getAgoraAppCertificate,
} from '../../../lib/agora-config';
import {
  bearerFromRequest,
  verifyFirebaseIdToken,
} from '../../../lib/verify-id-token';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/agora/token
 * Body: { channel: string, role?: 'host' | 'audience', uid?: number|string }
 * Returns RTC token for TikReels Live (Agora).
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
    const channel = String(body.channel || body.channelName || '')
      .trim()
      .replace(/[^a-zA-Z0-9_\-]/g, '_')
      .slice(0, 64);
    if (!channel) {
      return NextResponse.json({ ok: false, error: 'missing_channel' }, { status: 400 });
    }

    const roleRaw = String(body.role || 'audience').toLowerCase();
    const role = roleRaw === 'host' || roleRaw === 'publisher' ? RtcRole.PUBLISHER : RtcRole.SUBSCRIBER;

    // Agora numeric uid — hash Firebase uid to stable uint32 (avoid 0)
    let uidNum = 0;
    if (body.uid != null && String(body.uid).trim() !== '') {
      const n = Number(body.uid);
      uidNum = Number.isFinite(n) && n >= 0 ? Math.floor(n) % 2147483647 : 0;
    }
    if (!uidNum) {
      let h = 0;
      for (let i = 0; i < user.uid.length; i++) {
        h = (Math.imul(31, h) + user.uid.charCodeAt(i)) | 0;
      }
      uidNum = (Math.abs(h) % 2147483646) + 1;
    }

    const certificate = getAgoraAppCertificate();
    if (!AGORA_APP_ID || !certificate) {
      return NextResponse.json(
        { ok: false, error: 'agora_not_configured' },
        { status: 503 }
      );
    }

    const expire = Math.floor(Date.now() / 1000) + AGORA_TOKEN_TTL_SEC;
    const privilegeExpire = expire;
    const rtcToken = RtcTokenBuilder.buildTokenWithUid(
      AGORA_APP_ID,
      certificate,
      channel,
      uidNum,
      role,
      expire,
      privilegeExpire
    );

    return NextResponse.json({
      ok: true,
      appId: AGORA_APP_ID,
      channel,
      token: rtcToken,
      uid: uidNum,
      role: role === RtcRole.PUBLISHER ? 'host' : 'audience',
      expireAt: expire,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'token_failed';
    console.error('[agora/token]', msg);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    appId: AGORA_APP_ID,
    note: 'POST with Bearer token + { channel, role }',
  });
}
