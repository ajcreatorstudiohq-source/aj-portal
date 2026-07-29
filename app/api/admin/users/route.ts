import { NextResponse } from 'next/server';
import { verifyAdminFromRequest } from '../../../lib/admin-auth';
import { getAdminAuth, getAdminDb, FieldValue } from '../../../lib/firebase-admin';
import { ACCOUNT_STATUS } from '../../../lib/user-ban';
import { SIGNUP_BONUS_COINS } from '../../../lib/economy';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export type AdminUserListItem = {
  uid: string;
  name: string;
  username: string;
  email: string;
  photo: string;
  balance: number;
  accountStatus: string;
  isBanned: boolean;
  banReason: string;
  status: string;
  lastSeenMs: number;
  createdAtMs: number;
  referralId: string;
  followersCount: number;
  followingCount: number;
  postsCount: number;
  authOnly?: boolean;
};

function mapDoc(uid: string, data: Record<string, unknown>): AdminUserListItem {
  return {
    uid,
    name: String(data.name || ''),
    username: String(data.username || ''),
    email: String(data.email || ''),
    photo: String(data.photo || data.photoURL || '/logo.png'),
    balance: typeof data.balance === 'number' ? data.balance : Number(data.balance || 0) || 0,
    accountStatus: String(data.accountStatus || ACCOUNT_STATUS.ACTIVE),
    isBanned: Boolean(data.isBanned) || data.accountStatus === ACCOUNT_STATUS.BANNED,
    banReason: String(data.banReason || ''),
    status: String(data.status || 'offline'),
    lastSeenMs: Number(data.lastSeenMs || 0) || 0,
    createdAtMs: Number(data.createdAtMs || 0) || 0,
    referralId: String(data.referralId || ''),
    followersCount: Number(data.followersCount || data.followers || 0) || 0,
    followingCount: Number(data.followingCount || data.following || 0) || 0,
    postsCount: Number(data.postsCount || 0) || 0,
  };
}

/**
 * GET /api/admin/users
 * CEO-only — full user directory from Firestore + Auth orphans (auto-backfilled).
 */
export async function GET(request: Request) {
  try {
    const admin = await verifyAdminFromRequest(request);
    if (!admin) {
      return NextResponse.json({ ok: false, error: 'forbidden' }, { status: 403 });
    }

    const adminDb = getAdminDb();
    if (!adminDb) {
      return NextResponse.json(
        {
          ok: false,
          error: 'admin_sdk_missing',
          message: 'Configure FIREBASE_SERVICE_ACCOUNT_JSON for authoritative user list.',
        },
        { status: 503 }
      );
    }

    const byUid = new Map<string, AdminUserListItem>();
    const usersSnap = await adminDb.collection('users').get();
    usersSnap.forEach((doc) => {
      byUid.set(doc.id, mapDoc(doc.id, doc.data() as Record<string, unknown>));
    });

    let authBackfilled = 0;
    const auth = getAdminAuth();
    if (auth) {
      let pageToken: string | undefined;
      do {
        const page = await auth.listUsers(1000, pageToken);
        for (const record of page.users) {
          if (byUid.has(record.uid)) {
            const existing = byUid.get(record.uid)!;
            // Fill missing profile bits from Auth
            if (!existing.email && record.email) existing.email = record.email;
            if (!existing.name && record.displayName) existing.name = record.displayName;
            if ((!existing.photo || existing.photo === '/logo.png') && record.photoURL) {
              existing.photo = record.photoURL;
            }
            continue;
          }

          const now = Date.now();
          const username =
            String(record.displayName || '')
              .toLowerCase()
              .replace(/[^a-z0-9_]+/g, '_')
              .replace(/^_+|_+$/g, '')
              .slice(0, 24) || `user_${record.uid.slice(0, 6)}`;

          const payload = {
            name: record.displayName || username,
            username,
            email: record.email || '',
            photo: record.photoURL || '',
            photoURL: record.photoURL || '',
            balance: SIGNUP_BONUS_COINS,
            botTier: 'none',
            invested: 0,
            purchasedCoins: 0,
            uid: record.uid,
            lastSync: FieldValue.serverTimestamp(),
            createdAtMs: record.metadata.creationTime
              ? Date.parse(record.metadata.creationTime) || now
              : now,
            lastSeenMs: record.metadata.lastSignInTime
              ? Date.parse(record.metadata.lastSignInTime) || now
              : now,
            hasSocialProfile: true,
            followers: 0,
            following: 0,
            postsCount: 0,
            followersCount: 0,
            followingCount: 0,
            totalLikes: 0,
            status: 'offline',
            fcmToken: '',
            accountStatus: ACCOUNT_STATUS.ACTIVE,
            isBanned: false,
            bannedAt: null,
            bannedBy: null,
            banReason: null,
            sessionTerminatedAt: null,
          };

          try {
            await adminDb.collection('users').doc(record.uid).set(payload, { merge: true });
            authBackfilled += 1;
            byUid.set(record.uid, mapDoc(record.uid, payload as Record<string, unknown>));
          } catch (e) {
            console.warn('[admin/users] backfill failed', record.uid, e);
            byUid.set(record.uid, {
              uid: record.uid,
              name: record.displayName || username,
              username,
              email: record.email || '',
              photo: record.photoURL || '/logo.png',
              balance: 0,
              accountStatus: ACCOUNT_STATUS.ACTIVE,
              isBanned: false,
              banReason: '',
              status: 'offline',
              lastSeenMs: payload.lastSeenMs,
              createdAtMs: payload.createdAtMs,
              referralId: '',
              followersCount: 0,
              followingCount: 0,
              postsCount: 0,
              authOnly: true,
            });
          }
        }
        pageToken = page.pageToken;
      } while (pageToken);
    }

    const users = Array.from(byUid.values()).sort((a, b) => {
      const ac = a.createdAtMs || a.lastSeenMs || 0;
      const bc = b.createdAtMs || b.lastSeenMs || 0;
      return bc - ac;
    });

    return NextResponse.json({
      ok: true,
      userCount: users.length,
      authBackfilled,
      users,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'admin_users_failed';
    console.error('[admin/users]', msg, e);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
