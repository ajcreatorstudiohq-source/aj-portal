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

function looksLikeVideo(url: string, data: Record<string, unknown>): boolean {
  if (data.isVideo === true) return true;
  // Explicit false only wins when there is no strong video URL signal
  const mime = String(data.mime || data.contentType || data.type || '');
  if (mime.startsWith('video/')) return true;
  if (!url) return data.isVideo === true;
  // Cloudinary video delivery
  if (/\/video\/upload\//i.test(url)) return true;
  // Common extensions (also works with Firebase ?alt=media and %2F encoding)
  if (/\.(mp4|webm|mov|m4v|mkv)([.?&#_]|$)/i.test(url)) return true;
  if (/%2e(mp4|webm|mov|m4v)/i.test(url)) return true;
  // Firebase / storage paths that include video
  if (/firebasestorage\.googleapis\.com/i.test(url) && /video/i.test(url)) return true;
  if (data.isVideo === false) return false;
  return false;
}

/** Prefer a playable video URL over a still thumbnail when both exist. */
function pickMediaUrl(data: Record<string, unknown>): string {
  const candidates = [
    data.videoUrl,
    data.image,
    data.url,
    data.src,
    data.mediaUrl,
    data.thumbnail,
    data.thumb,
  ]
    .map((v) => String(v || '').trim())
    .filter(Boolean);

  const videoish = candidates.find((u) =>
    looksLikeVideo(u, { ...data, isVideo: data.isVideo === true ? true : undefined })
  );
  return videoish || candidates[0] || '';
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
  const isVideo =
    source === 'videos' ||
    source === 'users_videos' ||
    looksLikeVideo(media, data);
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

/** Merge + dedupe by id / postId / media URL, newest first. Prefer video rows. */
export function mergeTikReelPosts(lists: TikReelPost[][]): TikReelPost[] {
  const byKey = new Map<string, TikReelPost>();
  const order: string[] = [];

  const primaryKeys = (p: TikReelPost) =>
    [
      p.id,
      p.postId ? `post:${p.postId}` : '',
      p.videoUrl || p.image ? `media:${p.videoUrl || p.image}` : '',
    ].filter(Boolean);

  for (const list of lists) {
    for (const p of list) {
      if (!p.videoUrl && !p.image && !p.thumbnail) continue;
      const keys = primaryKeys(p);
      const existingKey = keys.find((k) => byKey.has(k));
      if (existingKey) {
        const prev = byKey.get(existingKey)!;
        // Upgrade still → video if duplicate media
        if (!prev.isVideo && p.isVideo) {
          const upgraded = { ...prev, ...p, isVideo: true, videoUrl: p.videoUrl || prev.videoUrl, image: p.videoUrl || p.image || prev.image };
          byKey.set(existingKey, upgraded);
          keys.forEach((k) => byKey.set(k, upgraded));
        }
        continue;
      }
      keys.forEach((k) => byKey.set(k, p));
      order.push(keys[0]);
    }
  }

  const out = order
    .map((k) => byKey.get(k))
    .filter((p): p is TikReelPost => !!p);
  // unique by identity
  const seen = new Set<TikReelPost>();
  const unique = out.filter((p) => {
    if (seen.has(p)) return false;
    seen.add(p);
    return true;
  });
  unique.sort((a, b) => (b.createdAtMs || 0) - (a.createdAtMs || 0));
  return unique;
}

/** Public helper for UI — detect playable video media. */
export function isPlayableTikReel(post: {
  isVideo?: boolean;
  videoUrl?: string;
  image?: string;
  url?: string;
  mediaUrl?: string;
}): boolean {
  const url = String(post.videoUrl || post.image || post.url || post.mediaUrl || '');
  return looksLikeVideo(url, { isVideo: post.isVideo });
}

/** Keep only posts owned by uid (accepts uid or userId field). */
export function filterOwnedBy(posts: TikReelPost[], uid: string): TikReelPost[] {
  return posts.filter((p) => {
    const owner = String(p.userId || p.uid || '');
    return owner === uid;
  });
}
