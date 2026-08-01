/**
 * Firebase Admin Storage helpers — signed URLs bypass client Storage rules (403).
 */
import 'server-only';
import { getAdminApp } from './firebase-admin';

const DEFAULT_BUCKET =
  process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ||
  process.env.FIREBASE_STORAGE_BUCKET ||
  'aj-super-portal.appspot.com';

export function getAdminStorage() {
  const app = getAdminApp();
  if (!app) return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { getStorage } = require('firebase-admin/storage') as typeof import('firebase-admin/storage');
    return getStorage(app);
  } catch (e) {
    console.warn('[firebase-admin] storage init failed', e);
    return null;
  }
}

/** Parse Firebase Storage download / GCS URL → object path. */
export function parseFirebaseStoragePath(url: string): {
  bucket: string;
  path: string;
} | null {
  if (!url) return null;
  try {
    const m1 = url.match(
      /firebasestorage\.googleapis\.com\/v0\/b\/([^/]+)\/o\/([^?]+)/i
    );
    if (m1) {
      return { bucket: decodeURIComponent(m1[1]), path: decodeURIComponent(m1[2]) };
    }
    const m2 = url.match(
      /https?:\/\/([^/]+)\.firebasestorage\.app\/(?:v0\/b\/[^/]+\/)?o\/([^?]+)/i
    );
    if (m2) {
      return {
        bucket: DEFAULT_BUCKET,
        path: decodeURIComponent(m2[2]),
      };
    }
    const m3 = url.match(/storage\.googleapis\.com\/([^/]+)\/(.+?)(?:\?|$)/i);
    if (m3) {
      return { bucket: decodeURIComponent(m3[1]), path: decodeURIComponent(m3[2]) };
    }
  } catch {
    /* ignore */
  }
  return null;
}

/**
 * Signed read URL for a Firebase Storage object (Admin SDK bypasses rules).
 */
export async function getSignedPlayUrl(
  sourceUrl: string,
  expiresMs = 6 * 60 * 60 * 1000
): Promise<string | null> {
  const parsed = parseFirebaseStoragePath(sourceUrl);
  if (!parsed) return null;
  const storage = getAdminStorage();
  if (!storage) return null;

  const candidates = Array.from(
    new Set([
      DEFAULT_BUCKET,
      parsed.bucket,
      parsed.bucket.replace(/\.firebasestorage\.app$/, '.appspot.com'),
      `${parsed.bucket}.appspot.com`,
    ].filter(Boolean))
  );

  for (const bucketName of candidates) {
    try {
      const file = storage.bucket(bucketName).file(parsed.path);
      const [exists] = await file.exists();
      if (!exists) continue;
      const [signed] = await file.getSignedUrl({
        action: 'read',
        expires: Date.now() + expiresMs,
      });
      return signed;
    } catch (e) {
      console.warn('[media] signed url try failed', bucketName, e);
    }
  }
  return null;
}
