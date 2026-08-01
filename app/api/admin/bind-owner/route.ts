import { NextResponse } from 'next/server';
import { verifyAdminFromRequest } from '../../../lib/admin-auth';
import {
  persistPortalAdminUid,
  resolvePortalAdminUid,
} from '../../../lib/admin-earnings';
import { getAdminDb } from '../../../lib/firebase-admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/admin/bind-owner
 * CEO-only — saves ownerUid so other users' earns credit this Hub wallet.
 */
export async function POST(request: Request) {
  try {
    const admin = await verifyAdminFromRequest(request);
    if (!admin) {
      return NextResponse.json({ ok: false, error: 'forbidden' }, { status: 403 });
    }

    await persistPortalAdminUid(admin.uid, admin.email);
    const resolved = await resolvePortalAdminUid(getAdminDb());

    return NextResponse.json({
      ok: true,
      ownerUid: resolved || admin.uid,
      ownerEmail: admin.email || '',
      message:
        'Admin Hub wallet bound. New user earns will credit owner-share coins here.',
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'bind_failed';
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}

/** GET — show whether owner wallet binding is ready (no secrets). */
export async function GET(request: Request) {
  try {
    const admin = await verifyAdminFromRequest(request);
    if (!admin) {
      return NextResponse.json({ ok: false, error: 'forbidden' }, { status: 403 });
    }
    const resolved = await resolvePortalAdminUid(getAdminDb());
    return NextResponse.json({
      ok: true,
      bound: !!resolved,
      ownerUid: resolved,
      sessionUid: admin.uid,
      match: resolved === admin.uid,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'status_failed';
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
