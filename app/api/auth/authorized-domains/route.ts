import { NextResponse } from 'next/server';
import {
  ensureAuthorizedDomains,
  fetchAuthorizedDomains,
} from '../../../lib/auth-domains-sync';
import {
  isAllowedPreviewAuthHost,
  normalizeAuthHost,
} from '../../../lib/auth-domains';
import { verifyAdminFromRequest } from '../../../lib/admin-auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/auth/authorized-domains
 * Admin: list current Firebase authorized domains.
 *
 * POST /api/auth/authorized-domains
 * Body: { host?: string } — defaults to request Origin/Host.
 * Allows only known Netlify/Vercel preview hosts for this portal,
 * then PATCHes Identity Toolkit authorizedDomains via Admin SDK.
 *
 * Public POST is intentional for deploy previews: each preview can
 * self-register its hostname so Google OAuth works without manual Console steps.
 */
export async function GET(request: Request) {
  const admin = await verifyAdminFromRequest(request);
  if (!admin) {
    return NextResponse.json({ ok: false, error: 'forbidden' }, { status: 403 });
  }
  const result = await fetchAuthorizedDomains();
  const status = result.ok ? 200 : result.error === 'admin_sdk_missing' ? 503 : 500;
  return NextResponse.json(result, { status });
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const origin = request.headers.get('origin') || '';
    const referer = request.headers.get('referer') || '';
    let host = normalizeAuthHost(String(body.host || ''));
    if (!host && origin) {
      try {
        host = normalizeAuthHost(new URL(origin).host);
      } catch {
        /* ignore */
      }
    }
    if (!host && referer) {
      try {
        host = normalizeAuthHost(new URL(referer).host);
      } catch {
        /* ignore */
      }
    }
    if (!host) {
      return NextResponse.json(
        { ok: false, error: 'missing_host', message: 'Pass { host } or call from the preview origin.' },
        { status: 400 }
      );
    }
    if (!isAllowedPreviewAuthHost(host)) {
      return NextResponse.json(
        {
          ok: false,
          error: 'host_not_allowed',
          message: `Host "${host}" is not an allowed Netlify/Vercel preview for AJ Portal.`,
          host,
        },
        { status: 403 }
      );
    }

    const result = await ensureAuthorizedDomains([host]);
    const status = result.ok
      ? 200
      : result.error === 'admin_sdk_missing'
        ? 503
        : result.error === 'host_not_allowed'
          ? 403
          : 500;
    return NextResponse.json({ ...result, host }, { status });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'auth_domains_failed';
    console.error('[auth/authorized-domains]', msg, e);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
