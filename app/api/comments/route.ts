import { NextResponse } from 'next/server';
import { FieldValue, getAdminDb } from '../../lib/firebase-admin';
import { verifyFirebaseIdToken } from '../../lib/verify-id-token';
import { REEL_COMMENTS_COL, dedupeComments } from '../../lib/reel-comments';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/comments?postId=...
 * Returns permanent comments for a post (Admin SDK).
 * Auth optional — public read so every viewer sees the same thread.
 */
export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('authorization') || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
    if (token) {
      const decoded = await verifyFirebaseIdToken(token);
      if (!decoded?.uid) {
        return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
      }
    }

    const postId = new URL(request.url).searchParams.get('postId') || '';
    if (!postId) {
      return NextResponse.json({ ok: false, error: 'missing_postId' }, { status: 400 });
    }

    const db = getAdminDb();
    if (!db) {
      return NextResponse.json({ ok: false, error: 'admin_unavailable' }, { status: 503 });
    }

    const [byPostId, byPostIds] = await Promise.all([
      db.collection(REEL_COMMENTS_COL).where('postId', '==', postId).limit(200).get(),
      db
        .collection(REEL_COMMENTS_COL)
        .where('postIds', 'array-contains', postId)
        .limit(200)
        .get()
        .catch(() => null),
    ]);

    const mapDoc = (d: { id: string; data: () => Record<string, unknown> }) => {
      const data = d.data();
      return {
        id: d.id,
        postId: data.postId,
        postIds: Array.isArray(data.postIds) ? data.postIds : undefined,
        postType: data.postType,
        text: data.text,
        uid: data.uid,
        username: data.username,
        photo: data.photo,
        createdAtMs: Number(data.createdAtMs || 0),
      };
    };

    const comments = dedupeComments([
      ...byPostId.docs.map(mapDoc),
      ...(byPostIds ? byPostIds.docs.map(mapDoc) : []),
    ]);

    return NextResponse.json({ ok: true, comments });
  } catch (e) {
    console.error('[api/comments GET]', e);
    return NextResponse.json({ ok: false, error: 'server_error' }, { status: 500 });
  }
}

/**
 * POST /api/comments — permanent write via Admin SDK (bypasses client rules).
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
      postIds?: string[];
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

    const postIds = Array.from(
      new Set(
        [postId, ...(Array.isArray(body.postIds) ? body.postIds : [])]
          .map((v) => String(v || '').trim())
          .filter(Boolean)
      )
    ).slice(0, 10);

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
      postIds,
      postType,
      text,
      uid: decoded.uid,
      username: String(body.username || 'AJ_Member').slice(0, 40),
      photo: String(body.photo || ''),
      createdAt: FieldValue.serverTimestamp(),
      createdAtMs,
    });

    try {
      if (['user_posts', 'pulse_posts', 'videos'].includes(postType)) {
        await Promise.all(
          postIds.map((pid) =>
            db
              .collection(postType)
              .doc(pid)
              .set({ commentCount: FieldValue.increment(1) }, { merge: true })
              .catch(() => undefined)
          )
        );
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
        postIds,
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
