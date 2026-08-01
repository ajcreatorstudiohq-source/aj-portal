import { NextResponse } from 'next/server';
import {
  bearerFromRequest,
  verifyFirebaseIdToken,
} from '../../../lib/verify-id-token';
import { getAdminAuth, getAdminDb, FieldValue } from '../../../lib/firebase-admin';
import { ACCOUNT_STATUS } from '../../../lib/user-ban';
import { SIGNUP_BONUS_COINS } from '../../../lib/economy';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function buildUsername(displayName: string | undefined, uid: string): string {
  const fromName = String(displayName || '')
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 24);
  return fromName || `user_${uid.slice(0, 6)}`;
}

/**
 * POST /api/auth/ensure-profile
 * Ensures Firestore `users/{uid}` exists with full profile fields right after Google signup.
 * Uses Admin SDK so rules / client race cannot leave Auth-only orphans.
 */
export async function POST(request: Request) {
  try {
    const token = bearerFromRequest(request);
    if (!token) {
      return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
    }
    const user = await verifyFirebaseIdToken(token);
    if (!user) {
      return NextResponse.json({ ok: false, error: 'invalid_token' }, { status: 401 });
    }

    const adminDb = getAdminDb();
    if (!adminDb) {
      return NextResponse.json(
        {
          ok: false,
          error: 'admin_sdk_missing',
          message: 'Client should create users/{uid} via setDoc.',
        },
        { status: 503 }
      );
    }

    const auth = getAdminAuth();
    let displayName = '';
    let email = user.email || '';
    let photoURL = '';
    if (auth) {
      try {
        const record = await auth.getUser(user.uid);
        displayName = record.displayName || '';
        email = record.email || email;
        photoURL = record.photoURL || '';
      } catch {
        /* use token claims */
      }
    }

    const ref = adminDb.collection('users').doc(user.uid);
    const snap = await ref.get();
    const now = Date.now();
    const username = buildUsername(displayName, user.uid);

    if (!snap.exists) {
      await ref.set({
        name: displayName || username,
        username,
        email: email || '',
        photo: photoURL || '',
        photoURL: photoURL || '',
        balance: SIGNUP_BONUS_COINS,
        botTier: 'none',
        invested: 0,
        purchasedCoins: 0,
        uid: user.uid,
        lastSync: FieldValue.serverTimestamp(),
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
        accountStatus: ACCOUNT_STATUS.ACTIVE,
        isBanned: false,
        bannedAt: null,
        bannedBy: null,
        banReason: null,
        sessionTerminatedAt: null,
      });
      return NextResponse.json({
        ok: true,
        created: true,
        uid: user.uid,
        username,
        email,
        name: displayName || username,
        photo: photoURL || '',
      });
    }

    const data = snap.data() || {};
    const patch: Record<string, unknown> = {
      lastSeenMs: now,
      status: 'online',
    };
    if (!data.email && email) patch.email = email;
    if (!data.name && displayName) patch.name = displayName;
    if (!data.username) patch.username = username;
    if (!data.photo && photoURL) {
      patch.photo = photoURL;
      patch.photoURL = photoURL;
    }
    if (!data.createdAtMs) patch.createdAtMs = now;
    if (!data.uid) patch.uid = user.uid;
    if (data.accountStatus == null) patch.accountStatus = ACCOUNT_STATUS.ACTIVE;
    if (data.isBanned == null) patch.isBanned = false;
    // Admin SDK may fill economy fields missing from presence stubs
    if (data.balance == null) {
      patch.balance = SIGNUP_BONUS_COINS;
      if (data.botTier == null) patch.botTier = 'none';
      if (data.invested == null) patch.invested = 0;
      if (data.purchasedCoins == null) patch.purchasedCoins = 0;
      patch.lastSync = FieldValue.serverTimestamp();
    }

    await ref.set(patch, { merge: true });

    const next = (await ref.get()).data() || {};
    return NextResponse.json({
      ok: true,
      created: false,
      uid: user.uid,
      username: String(next.username || username),
      email: String(next.email || email || ''),
      name: String(next.name || displayName || ''),
      photo: String(next.photo || next.photoURL || photoURL || ''),
      balance: Number(next.balance || 0),
      referralId: String(next.referralId || ''),
      createdAtMs: Number(next.createdAtMs || 0) || null,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'ensure_profile_failed';
    console.error('[ensure-profile]', msg, e);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
