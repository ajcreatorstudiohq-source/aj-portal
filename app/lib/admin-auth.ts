/**
 * Verify a Firebase ID token belongs to the portal CEO/admin.
 * Uses Identity Toolkit REST (no firebase-admin required).
 */

const FIREBASE_API_KEY = 'AIzaSyDp2od-lrfAhEHV5oAIqBW5rWjaRbnAdFM';
export const ADMIN_EMAIL = 'ajcreatorstudio.hq@gmail.com';

export type VerifiedAdmin = {
  uid: string;
  email: string;
};

export async function verifyAdminFromRequest(request: Request): Promise<VerifiedAdmin | null> {
  const authHeader = request.headers.get('authorization') || request.headers.get('Authorization');
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
    if (!user?.localId || !user?.email) return null;

    if (String(user.email).toLowerCase() !== ADMIN_EMAIL.toLowerCase()) {
      return null;
    }

    return { uid: user.localId as string, email: user.email as string };
  } catch {
    return null;
  }
}
