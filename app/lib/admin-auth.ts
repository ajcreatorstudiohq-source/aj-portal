/**
 * Portal CEO / admin identity checks.
 * UI + API must both use these helpers so normal users never see or call admin tools.
 */

const FIREBASE_API_KEY =
  process.env.FIREBASE_API_KEY ||
  process.env.NEXT_PUBLIC_FIREBASE_API_KEY ||
  'AIzaSyDp2od-lrfAhEHV5oAIqBW5rWjaRbnAdFM';

/** Primary admin email (Continue with Google) */
export const ADMIN_EMAIL = (
  process.env.NEXT_PUBLIC_ADMIN_EMAIL ||
  process.env.ADMIN_EMAIL ||
  'ajcreatorstudio.hq@gmail.com'
)
  .trim()
  .toLowerCase();

/**
 * Optional extra admin UIDs (comma-separated).
 * Set NEXT_PUBLIC_ADMIN_UIDS / ADMIN_UIDS in env if you want UID-only admins
 * in addition to ADMIN_EMAIL.
 */
function parseAdminUids(): string[] {
  const raw =
    process.env.NEXT_PUBLIC_ADMIN_UIDS ||
    process.env.ADMIN_UIDS ||
    '';
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

export const ADMIN_UIDS: readonly string[] = parseAdminUids();

export type AdminIdentity = {
  uid?: string | null;
  email?: string | null;
};

/** True only for the configured admin email and/or allow-listed UIDs. */
export function isPortalAdminUser(user: AdminIdentity | null | undefined): boolean {
  if (!user) return false;
  const email = String(user.email || '')
    .trim()
    .toLowerCase();
  const uid = String(user.uid || '').trim();
  if (email && email === ADMIN_EMAIL) return true;
  if (uid && ADMIN_UIDS.includes(uid)) return true;
  return false;
}

export type VerifiedAdmin = {
  uid: string;
  email: string;
};

/**
 * Verify a Firebase ID token belongs to the portal CEO/admin.
 * Uses Identity Toolkit REST (no firebase-admin required).
 */
export async function verifyAdminFromRequest(request: Request): Promise<VerifiedAdmin | null> {
  const authHeader =
    request.headers.get('authorization') || request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;

  const idToken = authHeader.slice('Bearer '.length).trim();
  if (!idToken) return null;

  try {
    const res = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${FIREBASE_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
      }
    );

    if (!res.ok) return null;

    const data = await res.json();
    const user = data?.users?.[0];
    if (!user?.localId) return null;

    const uid = String(user.localId);
    const email = String(user.email || '');

    if (!isPortalAdminUser({ uid, email })) {
      return null;
    }

    return { uid, email };
  } catch {
    return null;
  }
}
