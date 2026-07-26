/**
 * Verify a Firebase ID token via Identity Toolkit REST API
 * (no firebase-admin dependency required).
 */

const FIREBASE_API_KEY =
  process.env.NEXT_PUBLIC_FIREBASE_API_KEY ||
  process.env.FIREBASE_API_KEY ||
  'AIzaSyDp2od-lrfAhEHV5oAIqBW5rWjaRbnAdFM';

export type VerifiedUser = {
  uid: string;
  email?: string;
};

export async function verifyFirebaseIdToken(
  idToken: string
): Promise<VerifiedUser | null> {
  if (!idToken || typeof idToken !== 'string') return null;
  try {
    const res = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${FIREBASE_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
        cache: 'no-store',
      }
    );
    if (!res.ok) return null;
    const data = (await res.json()) as {
      users?: Array<{ localId?: string; email?: string }>;
    };
    const u = data.users?.[0];
    if (!u?.localId) return null;
    return { uid: u.localId, email: u.email };
  } catch {
    return null;
  }
}

export function bearerFromRequest(req: Request): string | null {
  const h = req.headers.get('authorization') || req.headers.get('Authorization');
  if (!h) return null;
  const m = /^Bearer\s+(.+)$/i.exec(h.trim());
  return m?.[1] || null;
}
