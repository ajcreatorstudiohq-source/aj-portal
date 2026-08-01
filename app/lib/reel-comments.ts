/**
 * TikTok-style permanent comments — top-level Firestore collection.
 *
 * Doc shape:
 *   reel_comments/{id} = {
 *     postId, postIds?, postType, text, uid, username, photo,
 *     createdAt, createdAtMs
 *   }
 */

export const REEL_COMMENTS_COL = 'reel_comments';

export type ReelCommentPostType = 'user_posts' | 'pulse_posts' | 'yt_posts' | 'videos';

export type ReelCommentDoc = {
  postId: string;
  postIds?: string[];
  postType: ReelCommentPostType;
  text: string;
  uid: string;
  username: string;
  photo: string;
  createdAtMs: number;
};

/** Unique non-empty post id aliases for a feed/profile row. */
export function resolveCommentPostIds(post: {
  id?: unknown;
  postId?: unknown;
  videoId?: unknown;
} | null): string[] {
  if (!post) return [];
  const ids = [post.postId, post.id, post.videoId]
    .map((v) => String(v || '').trim())
    .filter(Boolean);
  return Array.from(new Set(ids));
}

export function sortCommentsAsc<T extends { id?: string; createdAtMs?: number; createdAt?: unknown }>(
  rows: T[]
): T[] {
  return [...rows].sort((a, b) => {
    const am =
      Number(a.createdAtMs || 0) ||
      (a.createdAt &&
      typeof a.createdAt === 'object' &&
      typeof (a.createdAt as { toMillis?: () => number }).toMillis === 'function'
        ? (a.createdAt as { toMillis: () => number }).toMillis()
        : 0);
    const bm =
      Number(b.createdAtMs || 0) ||
      (b.createdAt &&
      typeof b.createdAt === 'object' &&
      typeof (b.createdAt as { toMillis?: () => number }).toMillis === 'function'
        ? (b.createdAt as { toMillis: () => number }).toMillis()
        : 0);
    return am - bm;
  });
}

export function dedupeComments(
  rows: Array<Record<string, unknown> & { id: string }>
): Array<Record<string, unknown> & { id: string }> {
  type Row = Record<string, unknown> & { id: string };
  const byId = new Map<string, Row>();
  const contentKeys = new Set<string>();
  const sorted = [...rows].sort((a, b) => {
    const am = Number(a.createdAtMs || 0);
    const bm = Number(b.createdAtMs || 0);
    return am - bm;
  });
  for (const row of sorted) {
    const id = String(row.id);
    if (byId.has(id)) continue;
    const contentKey = `${row.uid || ''}|${row.text || ''}|${Math.floor(Number(row.createdAtMs || 0) / 5000)}`;
    if (contentKeys.has(contentKey)) continue;
    contentKeys.add(contentKey);
    byId.set(id, row);
  }
  return [...byId.values()].sort(
    (a, b) => Number(a.createdAtMs || 0) - Number(b.createdAtMs || 0)
  );
}

/** Merge server snapshot with pending local comments so UI never blinks empty. */
export function mergeCommentLists(
  serverRows: Array<Record<string, unknown> & { id: string }>,
  pendingRows: Array<Record<string, unknown> & { id: string }>,
  postIds: string | string[]
): Array<Record<string, unknown> & { id: string }> {
  const allowed = new Set(
    (Array.isArray(postIds) ? postIds : [postIds]).map(String).filter(Boolean)
  );
  const byKey = new Map<string, Record<string, unknown> & { id: string }>();

  for (const row of serverRows) {
    byKey.set(String(row.id), { ...row, pending: false });
  }

  for (const pending of pendingRows) {
    const pid = String(pending.postId || '');
    const aliases = Array.isArray(pending.postIds)
      ? pending.postIds.map(String)
      : [];
    const matchesPost =
      allowed.has(pid) || aliases.some((a) => allowed.has(a)) || allowed.size === 0;
    if (!matchesPost) continue;
    const matched = serverRows.find((s) => {
      if (String(s.id) === String(pending.id)) return true;
      return (
        String(s.uid || '') === String(pending.uid || '') &&
        String(s.text || '') === String(pending.text || '') &&
        Math.abs(Number(s.createdAtMs || 0) - Number(pending.createdAtMs || 0)) < 20000
      );
    });
    if (matched) continue;
    byKey.set(String(pending.id), { ...pending, pending: true });
  }

  return dedupeComments([...byKey.values()]);
}
