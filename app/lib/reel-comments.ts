/**
 * TikTok-style permanent comments — top-level Firestore collection.
 * Avoids nested `user_posts/{id}/comments` rules that often aren't published.
 *
 * Doc shape:
 *   reel_comments/{id} = {
 *     postId, postType, text, uid, username, photo,
 *     createdAt, createdAtMs
 *   }
 */

export const REEL_COMMENTS_COL = 'reel_comments';

export type ReelCommentPostType = 'user_posts' | 'pulse_posts' | 'yt_posts' | 'videos';

export type ReelCommentDoc = {
  postId: string;
  postType: ReelCommentPostType;
  text: string;
  uid: string;
  username: string;
  photo: string;
  createdAtMs: number;
};

export function sortCommentsAsc<T extends { createdAtMs?: number; createdAt?: unknown }>(
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

/** Merge server snapshot with pending local comments so UI never blinks empty. */
export function mergeCommentLists(
  serverRows: Array<Record<string, unknown> & { id: string }>,
  pendingRows: Array<Record<string, unknown> & { id: string }>,
  postId: string
): Array<Record<string, unknown> & { id: string }> {
  const byKey = new Map<string, Record<string, unknown> & { id: string }>();

  for (const row of serverRows) {
    byKey.set(String(row.id), { ...row, pending: false });
  }

  for (const pending of pendingRows) {
    if (String(pending.postId || '') !== String(postId)) continue;
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

  return sortCommentsAsc(
    [...byKey.values()] as Array<{ createdAtMs?: number; createdAt?: unknown; id: string }>
  ) as Array<Record<string, unknown> & { id: string }>;
}
