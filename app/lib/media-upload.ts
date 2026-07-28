/**
 * Public media hosting for TikReel / Pulse — avoids Firebase Storage 403/CORS.
 *
 * Order:
 *  1. Same-origin /api/media/upload (server → Cloudinary → Catbox → Litterbox)
 *  2. Direct Cloudinary (browser unsigned preset)
 *  3. Direct Catbox (may fail CORS in some browsers)
 *  Never use Firebase Storage for videos.
 */

import { getApps, initializeApp } from 'firebase/app';
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { fileLooksLikeVideo, isFirebaseStorageUrl } from './tikreel';

const CLOUDINARY_CLOUD_NAME =
  process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || 'atm28akz';
const CLOUDINARY_UPLOAD_PRESET =
  process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || 'aj_portal';

const firebaseConfig = {
  apiKey:
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY ||
    'AIzaSyDp2od-lrfAhEHV5oAIqBW5rWjaRbnAdFM',
  authDomain:
    process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ||
    'aj-super-portal.firebaseapp.com',
  projectId:
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'aj-super-portal',
  storageBucket:
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ||
    'aj-super-portal.appspot.com',
  messagingSenderId:
    process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '288191292906',
  appId:
    process.env.NEXT_PUBLIC_FIREBASE_APP_ID ||
    '1:288191292906:web:bc31cb072948533f88fe93',
};

function getStorageClient() {
  const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
  return getStorage(app);
}

/** Server upload — no browser CORS, never Firebase Storage. */
export async function uploadViaApi(file: File): Promise<string> {
  try {
    const fd = new FormData();
    fd.append('file', file, file.name || (fileLooksLikeVideo(file) ? 'reel.mp4' : 'photo.jpg'));
    const res = await fetch('/api/media/upload', { method: 'POST', body: fd });
    const data = (await res.json().catch(() => ({}))) as { ok?: boolean; url?: string };
    if (!res.ok || !data?.url) {
      console.warn('API media upload failed', res.status, data);
      return '';
    }
    return String(data.url);
  } catch (e) {
    console.warn('API media upload error', e);
    return '';
  }
}

export async function uploadToCloudinary(file: File): Promise<string> {
  const fd = new FormData();
  fd.append('file', file);
  fd.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
  const isVideo = fileLooksLikeVideo(file);
  const endpoint = isVideo
    ? `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/video/upload`
    : `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`;
  try {
    const res = await fetch(endpoint, { method: 'POST', body: fd });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      console.warn('Cloudinary upload failed', res.status, data);
      return '';
    }
    return String(data.secure_url || data.url || '');
  } catch (e) {
    console.warn('Cloudinary upload error', e);
    return '';
  }
}

export async function uploadToCatbox(file: File): Promise<string> {
  try {
    const fd = new FormData();
    fd.append('reqtype', 'fileupload');
    fd.append(
      'fileToUpload',
      file,
      file.name || (fileLooksLikeVideo(file) ? 'reel.mp4' : 'photo.jpg')
    );
    const res = await fetch('https://catbox.moe/user/api.php', {
      method: 'POST',
      body: fd,
    });
    const text = (await res.text()).trim();
    if (!res.ok || !/^https?:\/\//i.test(text)) {
      console.warn('Catbox upload failed', res.status, text.slice(0, 120));
      return '';
    }
    return text;
  } catch (e) {
    console.warn('Catbox upload error', e);
    return '';
  }
}

export async function uploadToFirebaseStorage(file: File, uid: string): Promise<string> {
  try {
    const storage = getStorageClient();
    const isVideo = fileLooksLikeVideo(file);
    const folder = isVideo ? 'tikreels' : 'profile_photos';
    const ext = isVideo
      ? file.name.match(/\.(mp4|webm|mov|m4v)$/i)?.[0] || '.mp4'
      : file.name.match(/\.(jpe?g|png|webp|gif)$/i)?.[0] || '.jpg';
    const safeBase =
      String(file.name || 'media')
        .replace(/\.[^.]+$/, '')
        .replace(/[^\w.\-]+/g, '_')
        .slice(0, 40) || 'media';
    const ref = storageRef(storage, `${folder}/${uid}/${Date.now()}_${safeBase}${ext}`);
    await uploadBytes(ref, file, {
      contentType: file.type || (isVideo ? 'video/mp4' : 'image/jpeg'),
    });
    return await getDownloadURL(ref);
  } catch (e) {
    console.warn('Firebase Storage upload error', e);
    return '';
  }
}

/**
 * Durable public HTTPS URL for TikReel/Pulse.
 * Server API first; never Firebase Storage for videos.
 */
export async function uploadMediaDurable(
  file: File,
  uid: string,
  opts?: { allowFirebaseStorage?: boolean }
): Promise<string> {
  const isVideo = fileLooksLikeVideo(file);

  let url = await uploadViaApi(file);
  if (url) return url;

  url = await uploadToCloudinary(file);
  if (url) return url;

  url = await uploadToCatbox(file);
  if (url) return url;

  if (isVideo && opts?.allowFirebaseStorage !== true) {
    console.warn('Public hosts failed; not falling back to Firebase Storage for video');
    return '';
  }

  if (opts?.allowFirebaseStorage === true || !isVideo) {
    url = await uploadToFirebaseStorage(file, uid);
  }
  return url || '';
}

/**
 * Rewrite Firebase Storage media through same-origin proxy (signed URL).
 * Public CDN URLs pass through unchanged.
 */
export function toPlayableMediaUrl(url: string): string {
  const u = String(url || '').trim();
  if (!u || u.startsWith('blob:') || u.startsWith('data:') || u.startsWith('/')) return u;
  if (isFirebaseStorageUrl(u)) {
    return `/api/media/proxy?u=${encodeURIComponent(u)}`;
  }
  return u;
}
