import { NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { getAdminDb } from '../../lib/firebase-admin';
import { verifyFirebaseIdToken } from '../../lib/verify-id-token';
import { REEL_COMMENTS_COL } from '../../lib/reel-comments';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * POST /api/comments
 * Body: { postId, postType?, text }
 * Auth: Bearer <Firebase ID token>
 * Writes a permanent comment via Admin SDK (bypasses client rules).
 */
export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('authorization') || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
    if (!token) {
      return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
    }

    const decoded = await verifyFirebaseIdToken(token);
    if (!decoded?.uid) {
      return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
    }

    const body = (await request.json().catch(() => ({}))) as {
      postId?: string;
      postType?: string;
      text?: string;
      username?: string;
      photo?: string;
    };

    const postId = String(body.postId || '').trim();
    const text = String(body.text || '').trim();
    if (!postId || !text) {
      return NextResponse.json({ ok: false, error: 'missing_fields' }, { status: 400 });
    }
    if (text.length > 1000) {
      return NextResponse.json({ ok: false, error: 'text_too_long' }, { status: 400 });
    }

    const db = getAdminDb();
    if (!db) {
      return NextResponse.json(
        {
          ok: false,
          error: 'admin_unavailable',
          message: 'Set FIREBASE_SERVICE_ACCOUNT_JSON for server comment writes.',
        },
        { status: 503 }
      );
    }

    const postType = String(body.postType || 'user_posts');
    const createdAtMs = Date.now();
    const ref = await db.collection(REEL_COMMENTS_COL).add({
      postId,
      postType,
      text,
      uid: decoded.uid,
      username: String(body.username || 'AJ_Member').slice(0, 40),
      photo: String(body.photo || ''),
      createdAt: FieldValue.serverTimestamp(),
      createdAtMs,
    });

    // Best-effort commentCount bump on parent
    try {
      if (['user_posts', 'pulse_posts', 'videos'].includes(postType)) {
        await db
          .collection(postType)
          .doc(postId)
          .set({ commentCount: FieldValue.increment(1) }, { merge: true });
      }
    } catch {
      /* parent may not exist */
    }

    return NextResponse.json({
      ok: true,
      id: ref.id,
      comment: {
        id: ref.id,
        postId,
        postType,
        text,
        uid: decoded.uid,
        username: String(body.username || 'AJ_Member').slice(0, 40),
        photo: String(body.photo || ''),
        createdAtMs,
      },
    });
  } catch (e) {
    console.error('[api/comments]', e);
    return NextResponse.json({ ok: false, error: 'server_error' }, { status: 500 });
  }
}
