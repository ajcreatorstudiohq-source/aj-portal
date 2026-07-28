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
