import { NextResponse } from 'next/server';
import { fileLooksLikeVideo } from '../../../lib/tikreel';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const CLOUDINARY_CLOUD_NAME =
  process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME ||
  process.env.CLOUDINARY_CLOUD_NAME ||
  'atm28akz';
const CLOUDINARY_UPLOAD_PRESET =
  process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET ||
  process.env.CLOUDINARY_UPLOAD_PRESET ||
  'aj_portal';
const CLOUDINARY_API_KEY = process.env.CLOUDINARY_API_KEY || '';
const CLOUDINARY_API_SECRET = process.env.CLOUDINARY_API_SECRET || '';

async function uploadCloudinary(buf: Buffer, filename: string, isVideo: boolean): Promise<string> {
  const endpoint = isVideo
    ? `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/video/upload`
    : `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`;

  const blob = new Blob([new Uint8Array(buf)], {
    type: isVideo ? 'video/mp4' : 'image/jpeg',
  });

  // Prefer signed upload when API secret is configured (most reliable)
  if (CLOUDINARY_API_KEY && CLOUDINARY_API_SECRET) {
    try {
      const timestamp = Math.floor(Date.now() / 1000);
      const crypto = await import('crypto');
      const folder = 'tikreels';
      const toSign = `folder=${folder}&timestamp=${timestamp}${CLOUDINARY_API_SECRET}`;
      const signature = crypto.createHash('sha1').update(toSign).digest('hex');
      const fd = new FormData();
      fd.append('file', blob, filename);
      fd.append('api_key', CLOUDINARY_API_KEY);
      fd.append('timestamp', String(timestamp));
      fd.append('signature', signature);
      fd.append('folder', folder);
      const res = await fetch(endpoint, { method: 'POST', body: fd });
      const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
      if (res.ok) return String(data.secure_url || data.url || '');
      console.warn('[api/media/upload] Cloudinary signed failed', res.status, data);
    } catch (e) {
      console.warn('[api/media/upload] Cloudinary signed error', e);
    }
  }

  // Unsigned preset (must be Unsigned in Cloudinary dashboard)
  try {
    const fd = new FormData();
    fd.append('file', blob, filename);
    fd.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
    const res = await fetch(endpoint, { method: 'POST', body: fd });
    const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    if (!res.ok) {
      console.warn('[api/media/upload] Cloudinary unsigned failed', res.status, data);
      return '';
    }
    return String(data.secure_url || data.url || '');
  } catch (e) {
    console.warn('[api/media/upload] Cloudinary unsigned error', e);
    return '';
  }
}

async function uploadCatbox(buf: Buffer, filename: string, isVideo: boolean): Promise<string> {
  const fd = new FormData();
  fd.append('reqtype', 'fileupload');
  fd.append(
    'fileToUpload',
    new Blob([new Uint8Array(buf)], { type: isVideo ? 'video/mp4' : 'image/jpeg' }),
    filename
  );
  const res = await fetch('https://catbox.moe/user/api.php', {
    method: 'POST',
    body: fd,
  });
  const text = (await res.text()).trim();
  if (!res.ok || !/^https?:\/\//i.test(text)) {
    console.warn('[api/media/upload] Catbox failed', res.status, text.slice(0, 160));
    return '';
  }
  return text;
}

/** Free temporary host (72h) — last public fallback. */
async function uploadLitterbox(buf: Buffer, filename: string, isVideo: boolean): Promise<string> {
  const fd = new FormData();
  fd.append('reqtype', 'fileupload');
  fd.append('time', '72h');
  fd.append(
    'fileToUpload',
    new Blob([new Uint8Array(buf)], { type: isVideo ? 'video/mp4' : 'image/jpeg' }),
    filename
  );
  const res = await fetch('https://litterbox.catbox.moe/resources/internals/api.php', {
    method: 'POST',
    body: fd,
  });
  const text = (await res.text()).trim();
  if (!res.ok || !/^https?:\/\//i.test(text)) {
    console.warn('[api/media/upload] Litterbox failed', res.status, text.slice(0, 160));
    return '';
  }
  return text;
}

/**
 * POST /api/media/upload
 * multipart form: file (+ optional uid)
 * Returns public HTTPS URL (Cloudinary → Catbox → Litterbox). Never Firebase Storage.
 */
export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const file = form.get('file');
    if (!file || typeof file === 'string') {
      return NextResponse.json({ ok: false, error: 'file_required' }, { status: 400 });
    }

    const blob = file as File;
    const maxBytes = 80 * 1024 * 1024;
    if (blob.size > maxBytes) {
      return NextResponse.json({ ok: false, error: 'file_too_large' }, { status: 413 });
    }

    const buf = Buffer.from(await blob.arrayBuffer());
    const name = blob.name || 'media.bin';
    const isVideo =
      fileLooksLikeVideo(
        new File([buf], name, { type: blob.type || 'application/octet-stream' })
      ) || /^video\//i.test(blob.type || '');

    const filename = isVideo
      ? name.replace(/\.[^.]+$/, '') + '.mp4'
      : name.replace(/\.[^.]+$/, '') + '.jpg';

    let url = await uploadCloudinary(buf, filename, isVideo);
    let host = url ? 'cloudinary' : '';
    if (!url) {
      url = await uploadCatbox(buf, filename, isVideo);
      host = url ? 'catbox' : '';
    }
    if (!url) {
      url = await uploadLitterbox(buf, filename, isVideo);
      host = url ? 'litterbox' : '';
    }

    if (!url) {
      return NextResponse.json(
        {
          ok: false,
          error: 'upload_failed',
          message:
            'Public hosts failed. Set Cloudinary unsigned preset aj_portal, or CLOUDINARY_API_KEY + CLOUDINARY_API_SECRET.',
        },
        { status: 502 }
      );
    }

    return NextResponse.json({
      ok: true,
      url,
      host,
      isVideo,
      contentType: isVideo ? 'video/mp4' : 'image/jpeg',
    });
  } catch (e) {
    console.error('[api/media/upload]', e);
    return NextResponse.json({ ok: false, error: 'server_error' }, { status: 500 });
  }
}
