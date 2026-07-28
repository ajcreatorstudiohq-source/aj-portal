import { NextResponse } from 'next/server';
import { getSignedPlayUrl, parseFirebaseStoragePath } from '../../../lib/admin-storage';
import { isFirebaseStorageUrl } from '../../../lib/tikreel';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/media/proxy?u=<encoded media url>
 *
 * For Firebase Storage URLs that return 403 to browsers: issue a GCS signed URL
 * (Admin SDK) and redirect. Public CDN URLs are redirected as-is.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const raw = searchParams.get('u') || searchParams.get('url') || '';
    if (!raw) {
      return NextResponse.json({ error: 'missing_url' }, { status: 400 });
    }

    let target = raw;
    try {
      target = decodeURIComponent(raw);
    } catch {
      target = raw;
    }

    if (!/^https?:\/\//i.test(target)) {
      return NextResponse.json({ error: 'invalid_url' }, { status: 400 });
    }

    // Already public CDN — redirect (or 302)
    if (
      /res\.cloudinary\.com|files\.catbox\.moe|litter\.catbox\.moe|i\.ibb\.co/i.test(
        target
      )
    ) {
      return NextResponse.redirect(target, 302);
    }

    if (isFirebaseStorageUrl(target) || parseFirebaseStoragePath(target)) {
      const signed = await getSignedPlayUrl(target);
      if (signed) {
        return NextResponse.redirect(signed, 302);
      }
      // Fall through: try original URL (may still work with token)
      return NextResponse.redirect(target, 302);
    }

    // Allow other https media hosts
    return NextResponse.redirect(target, 302);
  } catch (e) {
    console.error('[api/media/proxy]', e);
    return NextResponse.json({ error: 'proxy_failed' }, { status: 500 });
  }
}
