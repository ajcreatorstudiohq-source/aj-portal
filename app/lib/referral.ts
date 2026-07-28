/**
 * Unique referral codes for every portal user.
 * Format: AJ + 8 chars (no ambiguous 0/O/1/I) — e.g. AJ7K2M9X4P
 */
import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  runTransaction,
  serverTimestamp,
  updateDoc,
  where,
} from 'firebase/firestore';
import { db } from '../../firebaseConfig';

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

/** Build a short deterministic-ish code from a seed string. */
export function makeReferralCode(seed: string): string {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  let out = 'AJ';
  let x = h >>> 0;
  for (let i = 0; i < 8; i++) {
    out += ALPHABET[x % ALPHABET.length];
    x = Math.imul(x ^ (x >>> 13), 16777619) >>> 0;
  }
  return out;
}

function randomReferralCode(): string {
  let out = 'AJ';
  for (let i = 0; i < 8; i++) {
    out += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  }
  return out;
}

/**
 * Ensure `users/{uid}` has a unique `referralId` + `referral_ids/{code}` map.
 * Safe to call for new and existing users (idempotent when already set).
 */
export async function ensureUserReferralId(uid: string): Promise<string> {
  const userRef = doc(db, 'users', uid);
  const snap = await getDoc(userRef);
  if (!snap.exists()) throw new Error('user_not_found');
  const existing = String((snap.data() as { referralId?: string }).referralId || '')
    .trim()
    .toUpperCase();
  if (existing) {
    // Keep map in sync if missing
    try {
      const mapRef = doc(db, 'referral_ids', existing);
      const mapSnap = await getDoc(mapRef);
      if (!mapSnap.exists()) {
        await runTransaction(db, async (tx) => {
          const again = await tx.get(mapRef);
          if (!again.exists()) {
            tx.set(mapRef, { uid, createdAt: serverTimestamp() });
          }
        });
      }
    } catch {
      /* non-fatal */
    }
    return existing;
  }

  for (let attempt = 0; attempt < 12; attempt++) {
    const code =
      attempt < 4
        ? makeReferralCode(`${uid}:${attempt}:${Date.now()}`)
        : randomReferralCode();
    const mapRef = doc(db, 'referral_ids', code);
    try {
      await runTransaction(db, async (tx) => {
        const userAgain = await tx.get(userRef);
        if (!userAgain.exists()) throw new Error('user_not_found');
        const already = String(
          (userAgain.data() as { referralId?: string }).referralId || ''
        )
          .trim()
          .toUpperCase();
        if (already) throw new Error(`done:${already}`);

        const mapSnap = await tx.get(mapRef);
        if (mapSnap.exists()) throw new Error('taken');

        tx.set(mapRef, { uid, createdAt: serverTimestamp() });
        tx.update(userRef, {
          referralId: code,
          referralIdCreatedAt: serverTimestamp(),
        });
      });
      return code;
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : '';
      if (msg.startsWith('done:')) return msg.slice(5);
      if (msg === 'taken') continue;
      if (msg === 'user_not_found') throw e;
      // race / permission — try next code
      continue;
    }
  }

  // Last resort: AJ + uid fragment (still unique enough with map check)
  const fallback = `AJ${uid.replace(/[^a-zA-Z0-9]/g, '').slice(-8).toUpperCase()}`.padEnd(
    10,
    'X'
  );
  try {
    await updateDoc(userRef, {
      referralId: fallback,
      referralIdCreatedAt: serverTimestamp(),
    });
    try {
      await runTransaction(db, async (tx) => {
        const mapRef = doc(db, 'referral_ids', fallback);
        const m = await tx.get(mapRef);
        if (!m.exists()) tx.set(mapRef, { uid, createdAt: serverTimestamp() });
      });
    } catch {
      /* ignore */
    }
  } catch {
    /* ignore */
  }
  return fallback;
}

/**
 * Resolve a pasted code to the referrer's Firebase uid.
 * Accepts referralId (preferred) or legacy raw uid.
 */
export async function resolveReferrerUid(rawCode: string): Promise<string | null> {
  const trimmed = String(rawCode || '').trim();
  if (!trimmed) return null;
  const upper = trimmed.toUpperCase();

  try {
    const mapSnap = await getDoc(doc(db, 'referral_ids', upper));
    if (mapSnap.exists()) {
      const uid = String((mapSnap.data() as { uid?: string }).uid || '').trim();
      if (uid) return uid;
    }
  } catch {
    /* continue */
  }

  try {
    const q = query(
      collection(db, 'users'),
      where('referralId', '==', upper),
      limit(1)
    );
    const snap = await getDocs(q);
    if (!snap.empty) return snap.docs[0]!.id;
  } catch {
    /* index may be missing — fall through */
  }

  // Legacy: friends may still paste Firebase uid
  try {
    const byUid = await getDoc(doc(db, 'users', trimmed));
    if (byUid.exists()) return trimmed;
  } catch {
    /* ignore */
  }

  return null;
}
