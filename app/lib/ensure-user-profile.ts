/**
 * Client-side user profile ensure — every Google signup/login gets a full
 * `users/{uid}` doc so Admin Users live list sees them immediately.
 */
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { SIGNUP_BONUS_COINS } from './economy';
import { DEFAULT_ACCOUNT_BAN_FIELDS } from './user-ban';

export type AuthUserLike = {
  uid: string;
  displayName?: string | null;
  email?: string | null;
  photoURL?: string | null;
  getIdToken?: () => Promise<string>;
};

export function buildPortalUsername(displayName: string | null | undefined, uid: string): string {
  const fromName = String(displayName || '')
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 24);
  return fromName || `user_${uid.slice(0, 6)}`;
}

/** True when doc looks like a presence stub / incomplete signup. */
export function isIncompleteUserProfile(data: Record<string, unknown> | undefined): boolean {
  if (!data) return true;
  const hasUsername = Boolean(String(data.username || '').trim());
  const hasCreated = Number(data.createdAtMs || 0) > 0;
  const hasBalanceKey = Object.prototype.hasOwnProperty.call(data, 'balance');
  // Presence-only merge often writes status/lastSeenMs without username/createdAtMs/balance
  return !hasUsername || !hasCreated || !hasBalanceKey;
}

export type EnsureProfileResult = {
  created: boolean;
  username: string;
  name: string;
  photo: string;
  referralReady: boolean;
};

/**
 * Upsert a complete portal profile. Safe to call on every login.
 * Prefer calling BEFORE presence heartbeat so stubs don't win the race.
 */
export async function ensureClientUserProfile(
  user: AuthUserLike
): Promise<EnsureProfileResult> {
  const userRef = doc(db, 'users', user.uid);
  const snap = await getDoc(userRef);
  const existing = snap.exists() ? (snap.data() as Record<string, unknown>) : undefined;
  const incomplete = isIncompleteUserProfile(existing);
  const username =
    String(existing?.username || '').trim() ||
    buildPortalUsername(user.displayName, user.uid);
  const name =
    String(existing?.name || '').trim() ||
    String(user.displayName || '').trim() ||
    username;
  const photo =
    String(existing?.photo || existing?.photoURL || '').trim() ||
    String(user.photoURL || '').trim() ||
    '';
  const now = Date.now();
  const created = !snap.exists();

  if (created) {
    // Full create — balance:0 allowed by Firestore create rules
    try {
      await setDoc(userRef, {
        name,
        username,
        email: user.email || '',
        photo,
        photoURL: photo,
        balance: SIGNUP_BONUS_COINS,
        botTier: 'none',
        invested: 0,
        purchasedCoins: 0,
        uid: user.uid,
        lastSync: serverTimestamp(),
        createdAtMs: now,
        lastSeenMs: now,
        hasSocialProfile: true,
        followers: 0,
        following: 0,
        postsCount: 0,
        followersCount: 0,
        followingCount: 0,
        totalLikes: 0,
        status: 'online',
        fcmToken: '',
        ...DEFAULT_ACCOUNT_BAN_FIELDS,
      });
    } catch (e) {
      console.warn('ensureClientUserProfile create', e);
    }
  } else if (incomplete) {
    // Fill missing profile fields only — do NOT touch economy keys (rules block owner updates)
    const patch: Record<string, unknown> = {
      status: 'online',
      lastSeenMs: now,
      uid: user.uid,
    };
    if (!String(existing?.username || '').trim()) patch.username = username;
    if (!String(existing?.name || '').trim()) patch.name = name;
    if (!String(existing?.email || '').trim() && user.email) patch.email = user.email;
    if (!String(existing?.photo || existing?.photoURL || '').trim() && photo) {
      patch.photo = photo;
      patch.photoURL = photo;
    }
    if (!Number(existing?.createdAtMs || 0)) patch.createdAtMs = now;
    if (existing?.hasSocialProfile == null) patch.hasSocialProfile = true;
    if (existing?.accountStatus == null) {
      Object.assign(patch, DEFAULT_ACCOUNT_BAN_FIELDS);
    }
    try {
      await setDoc(userRef, patch, { merge: true });
    } catch (e) {
      console.warn('ensureClientUserProfile enrich', e);
    }
  } else {
    try {
      await setDoc(
        userRef,
        {
          status: 'online',
          lastSeenMs: now,
        },
        { merge: true }
      );
    } catch {
      /* non-fatal */
    }
  }

  // Admin SDK backfill (adds missing balance on stubs when service account is set)
  if (typeof user.getIdToken === 'function') {
    try {
      const token = await user.getIdToken();
      await fetch('/api/auth/ensure-profile', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch {
      /* non-fatal */
    }
  }

  return {
    created,
    username,
    name,
    photo,
    referralReady: true,
  };
}
