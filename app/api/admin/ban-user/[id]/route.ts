import { NextResponse } from 'next/server';
import { verifyAdminFromRequest } from '../../../../lib/admin-auth';
import {
  ACCOUNT_STATUS,
  BAN_FORBIDDEN_MESSAGE,
  isUserBanned,
} from '../../../../lib/user-ban';

export const dynamic = 'force-dynamic';

const PROJECT_ID = 'aj-super-portal';
const FIRESTORE_BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

type RouteContext = { params: Promise<{ id: string }> };

function firestoreDocToPlain(fields: Record<string, any> | undefined): Record<string, unknown> {
  if (!fields) return {};
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(fields)) {
    if (value.stringValue !== undefined) out[key] = value.stringValue;
    else if (value.booleanValue !== undefined) out[key] = value.booleanValue;
    else if (value.integerValue !== undefined) out[key] = Number(value.integerValue);
    else if (value.doubleValue !== undefined) out[key] = value.doubleValue;
    else if (value.nullValue !== undefined) out[key] = null;
    else if (value.timestampValue !== undefined) out[key] = value.timestampValue;
  }
  return out;
}

/**
 * POST /api/admin/ban-user/:id
 * Auth: Bearer <Firebase ID token> of CEO admin only.
 * Sets target user's accountStatus to 'banned' and terminates their session.
 */
export async function POST(request: Request, context: RouteContext) {
  try {
    const authHeader = request.headers.get('authorization') || request.headers.get('Authorization');
    const idToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';

    const admin = await verifyAdminFromRequest(request);
    if (!admin || !idToken) {
      return NextResponse.json(
        { error: 'Unauthorized. Admin access required.' },
        { status: 401 }
      );
    }

    const { id: targetUid } = await context.params;
    if (!targetUid?.trim()) {
      return NextResponse.json({ error: 'User id is required.' }, { status: 400 });
    }

    if (targetUid === admin.uid) {
      return NextResponse.json({ error: 'You cannot ban your own admin account.' }, { status: 400 });
    }

    let reason = 'Banned by admin';
    try {
      const body = await request.json();
      if (body?.reason && typeof body.reason === 'string') {
        reason = body.reason.slice(0, 500);
      }
    } catch {
      // empty / non-JSON body is fine
    }

    // Read user with admin's ID token (authenticated Firestore REST)
    const getRes = await fetch(`${FIRESTORE_BASE}/users/${encodeURIComponent(targetUid)}`, {
      headers: { Authorization: `Bearer ${idToken}` },
    });

    if (getRes.status === 404) {
      return NextResponse.json({ error: 'User not found.' }, { status: 404 });
    }
    if (!getRes.ok) {
      const errText = await getRes.text().catch(() => '');
      console.error('[ban-user] get user failed:', getRes.status, errText);
      return NextResponse.json(
        { error: 'Failed to read user. Check Firestore rules for admin access.' },
        { status: 502 }
      );
    }

    const docJson = await getRes.json();
    const existing = firestoreDocToPlain(docJson.fields);

    if (isUserBanned(existing)) {
      return NextResponse.json({
        ok: true,
        alreadyBanned: true,
        message: BAN_FORBIDDEN_MESSAGE,
        user: {
          uid: targetUid,
          accountStatus: ACCOUNT_STATUS.BANNED,
          isBanned: true,
        },
      });
    }

    const nowMs = Date.now();
    const patchBody = {
      fields: {
        accountStatus: { stringValue: ACCOUNT_STATUS.BANNED },
        isBanned: { booleanValue: true },
        bannedBy: { stringValue: admin.uid },
        banReason: { stringValue: reason },
        bannedAt: { timestampValue: new Date(nowMs).toISOString() },
        sessionTerminatedAt: { integerValue: String(nowMs) },
      },
    };

    const mask = [
      'accountStatus',
      'isBanned',
      'bannedBy',
      'banReason',
      'bannedAt',
      'sessionTerminatedAt',
    ]
      .map((f) => `updateMask.fieldPaths=${encodeURIComponent(f)}`)
      .join('&');

    const patchRes = await fetch(
      `${FIRESTORE_BASE}/users/${encodeURIComponent(targetUid)}?${mask}`,
      {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${idToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(patchBody),
      }
    );

    if (!patchRes.ok) {
      const errText = await patchRes.text().catch(() => '');
      console.error('[ban-user] patch failed:', patchRes.status, errText);
      return NextResponse.json(
        {
          error:
            'Failed to ban user. Ensure Firestore rules allow the admin to update accountStatus/isBanned on users.',
        },
        { status: 502 }
      );
    }

    return NextResponse.json({
      ok: true,
      message: 'User banned successfully. Active session will be terminated.',
      user: {
        uid: targetUid,
        accountStatus: ACCOUNT_STATUS.BANNED,
        isBanned: true,
        banReason: reason,
        bannedBy: admin.uid,
      },
    });
  } catch (error) {
    console.error('[ban-user] error:', error);
    return NextResponse.json(
      { error: 'Failed to ban user. Please try again.' },
      { status: 500 }
    );
  }
}
