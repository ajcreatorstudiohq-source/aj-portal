/**
 * TikReel helpers — normalize media docs and load a user's full video grid
 * without relying on "global newest N then client-filter" (which drops older posts).
 */

export type TikReelPost = {
  id: string;
  uid?: string;
  userId?: string;
  username?: string;
  photo?: string;
  text?: string;
  image?: string;
  videoUrl?: string;
  thumbnail?: string;
  url?: string;
  mediaUrl?: string;
  isVideo?: boolean;
  likes?: number;
  views?: number;
  commentCount?: number;
  cssFilter?: string;
  textOverlay?: string;
  createdAt?: unknown;
  createdAtMs?: number;
  postId?: string;
  _source?: 'user_posts' | 'videos' | 'users_videos';
  [key: string]: unknown;
};

function pickMediaUrl(data: Record<string, unknown>): string {
  return String(
    data.videoUrl ||
      data.image ||
      data.url ||
      data.src ||
      data.mediaUrl ||
      data.thumbnail ||
      data.thumb ||
      ''
  );
}

function looksLikeVideo(url: string, data: Record<string, unknown>): boolean {
  if (data.isVideo === true) return true;
  if (data.isVideo === false) return false;
  const mime = String(data.mime || data.contentType || data.type || '');
  if (mime.startsWith('video/')) return true;
  return /\.(mp4|webm|mov|m4v)(\?|$)/i.test(url);
}

export function createdAtMs(data: Record<string, unknown>): number {
  const ca = data.createdAt as { toMillis?: () => number } | number | undefined;
  if (ca && typeof ca === 'object' && typeof ca.toMillis === 'function') {
    return ca.toMillis();
  }
  return Number(data.createdAtMs || data.createdAt || 0);
}

/** Normalize any TikReel / videos / user_posts document into a playable feed row. */
export function normalizeTikReelPost(
  id: string,
  data: Record<string, unknown>,
  source?: TikReelPost['_source']
): TikReelPost {
  const media = pickMediaUrl(data);
  const owner = String(data.uid || data.userId || '');
  const isVideo = looksLikeVideo(media, data);
  const thumb = String(
    data.thumbnail || data.thumb || data.poster || data.cover || media || ''
  );
  return {
    ...data,
    id,
    uid: owner || undefined,
    userId: String(data.userId || data.uid || '') || undefined,
    username: String(data.username || 'AJ_Member'),
    photo: String(data.photo || ''),
    text: String(data.text || data.caption || data.textOverlay || ''),
    image: media,
    videoUrl: media,
    thumbnail: thumb,
    isVideo,
    likes: Number(data.likes || 0),
    views: Number(data.views || 0),
    commentCount: Number(data.commentCount || 0),
    cssFilter: String(data.cssFilter || 'none'),
    textOverlay: data.textOverlay ? String(data.textOverlay) : undefined,
    createdAt: data.createdAt,
    createdAtMs: createdAtMs(data),
    postId: data.postId ? String(data.postId) : undefined,
    _source: source,
  };
}

/** Merge + dedupe by id / postId / media URL, newest first. */
export function mergeTikReelPosts(lists: TikReelPost[][]): TikReelPost[] {
  const seen = new Set<string>();
  const out: TikReelPost[] = [];
  for (const list of lists) {
    for (const p of list) {
      const keys = [
        p.id,
        p.postId ? `post:${p.postId}` : '',
        p.videoUrl || p.image ? `media:${p.videoUrl || p.image}` : '',
      ].filter(Boolean);
      if (keys.some((k) => seen.has(k))) continue;
      if (!p.videoUrl && !p.image && !p.thumbnail) continue;
      keys.forEach((k) => seen.add(k));
      out.push(p);
    }
  }
  out.sort((a, b) => (b.createdAtMs || 0) - (a.createdAtMs || 0));
  return out;
}

/** Keep only posts owned by uid (accepts uid or userId field). */
export function filterOwnedBy(posts: TikReelPost[], uid: string): TikReelPost[] {
  return posts.filter((p) => {
    const owner = String(p.userId || p.uid || '');
    return owner === uid;
  });
}
