import { NextResponse } from 'next/server';
import { getSignedPlayUrl, parseFirebaseStoragePath } from '../../../lib/admin-storage';
import { isFirebaseStorageUrl } from '../../../lib/tikreel';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/media/proxy?u=<encoded media url>
 * Firebase Storage → Admin signed URL (or stream). CDN URLs → redirect.
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

    if (
      /res\.cloudinary\.com|files\.catbox\.moe|litter\.catbox\.moe|i\.ibb\.co/i.test(
        target
      )
    ) {
      return NextResponse.redirect(target.replace(/^http:\/\//i, 'https://'), 302);
    }

    if (isFirebaseStorageUrl(target) || parseFirebaseStoragePath(target)) {
      const signed = await getSignedPlayUrl(target);
      if (signed) {
        return NextResponse.redirect(signed, 302);
      }

      // No Admin SDK — try streaming the download URL from the server
      try {
        const range = request.headers.get('range') || undefined;
        const upstream = await fetch(target, {
          redirect: 'follow',
          headers: range ? { Range: range } : undefined,
        });
        if (upstream.ok || upstream.status === 206) {
          const headers = new Headers();
          const ct = upstream.headers.get('Content-Type') || 'video/mp4';
          headers.set('Content-Type', ct);
          headers.set('Cache-Control', 'public, max-age=3600');
          const cr = upstream.headers.get('Content-Range');
          const cl = upstream.headers.get('Content-Length');
          const ar = upstream.headers.get('Accept-Ranges');
          if (cr) headers.set('Content-Range', cr);
          if (cl) headers.set('Content-Length', cl);
          if (ar) headers.set('Accept-Ranges', ar);
          return new NextResponse(upstream.body, {
            status: upstream.status,
            headers,
          });
        }
        console.warn('[api/media/proxy] upstream', upstream.status);
      } catch (e) {
        console.warn('[api/media/proxy] stream failed', e);
      }

      return NextResponse.redirect(target, 302);
    }

    return NextResponse.redirect(target.replace(/^http:\/\//i, 'https://'), 302);
  } catch (e) {
    console.error('[api/media/proxy]', e);
    return NextResponse.json({ error: 'proxy_failed' }, { status: 500 });
  }
}
