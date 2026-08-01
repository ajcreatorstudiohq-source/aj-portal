import { NextResponse } from 'next/server';
import { createHash } from 'crypto';
import appConfig from '../../../lib/app-config';
import { fileLooksLikeVideo } from '../../../lib/tikreel';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const {
  cloudName: CLOUDINARY_CLOUD_NAME,
  apiKey: CLOUDINARY_API_KEY,
  apiSecret: CLOUDINARY_API_SECRET,
  uploadPreset: CLOUDINARY_UPLOAD_PRESET,
} = appConfig.cloudinary;

async function uploadCloudinary(buf: Buffer, filename: string, isVideo: boolean): Promise<string> {
  const resource = isVideo ? 'video' : 'image';
  const endpoint = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/${resource}/upload`;
  const blob = new Blob([new Uint8Array(buf)], {
    type: isVideo ? 'video/mp4' : 'image/jpeg',
  });

  // Signed upload (keys from app-config) — reliable for TikReel videos
  if (CLOUDINARY_API_KEY && CLOUDINARY_API_SECRET) {
    try {
      const timestamp = Math.floor(Date.now() / 1000);
      const folder = 'tikreels';
      const toSign = `folder=${folder}&timestamp=${timestamp}${CLOUDINARY_API_SECRET}`;
      const signature = createHash('sha1').update(toSign).digest('hex');
      const fd = new FormData();
      fd.append('file', blob, filename);
      fd.append('api_key', CLOUDINARY_API_KEY);
      fd.append('timestamp', String(timestamp));
      fd.append('signature', signature);
      fd.append('folder', folder);
      const res = await fetch(endpoint, { method: 'POST', body: fd });
      const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
      if (res.ok) {
        const url = String(data.secure_url || data.url || '');
        if (url) return url.replace(/^http:\/\//i, 'https://');
      }
      console.warn('[api/media/upload] Cloudinary signed failed', res.status, data);
    } catch (e) {
      console.warn('[api/media/upload] Cloudinary signed error', e);
    }
  }

  // Unsigned preset fallback
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
    return String(data.secure_url || data.url || '').replace(/^http:\/\//i, 'https://');
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
 * multipart: file → public HTTPS URL (Cloudinary signed → Catbox → Litterbox)
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
          message: 'All public hosts failed. Check Cloudinary keys in app-config.',
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
