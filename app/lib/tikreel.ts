/**
 * TikReel / Pulse media helpers — Firebase-connected feed normalization.
 * Ensures Storage + Cloudinary URLs render as the correct <video> or <img>.
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
  _source?: 'user_posts' | 'videos' | 'users_videos' | 'pulse_posts';
  [key: string]: unknown;
};

const VIDEO_EXT_RE = /\.(mp4|webm|mov|m4v|mkv|3gp|avi)([.?&#_]|$)/i;
const VIDEO_EXT_ENC_RE = /%(2e|2E)(mp4|webm|mov|m4v|mkv)/i;

/** True when a URL itself is a playable video asset (not a JPEG poster). */
export function urlLooksLikeVideo(url: string): boolean {
  if (!url) return false;
  const u = url.trim();
  if (/\/video\/upload\//i.test(u)) return true; // Cloudinary video
  if (/\/image\/upload\//i.test(u) && !VIDEO_EXT_RE.test(u)) return false;
  if (VIDEO_EXT_RE.test(u) || VIDEO_EXT_ENC_RE.test(u)) return true;
  // Firebase Storage folders used by this portal for videos
  if (/tikreels%2F|\/tikreels\//i.test(u)) return true;
  if (/videos%2F|\/o\/videos%/i.test(u)) return true;
  if (/firebasestorage\.googleapis\.com/i.test(u) && /video/i.test(u)) return true;
  if (/firebasestorage\.app/i.test(u) && (/tikreels|video/i.test(u) || VIDEO_EXT_RE.test(u))) {
    return true;
  }
  return false;
}

function mimeLooksLikeVideo(data: Record<string, unknown>): boolean {
  const mime = String(data.mime || data.contentType || data.type || '');
  return mime.startsWith('video/');
}

export function looksLikeVideo(url: string, data: Record<string, unknown> = {}): boolean {
  if (mimeLooksLikeVideo(data)) return true;
  if (urlLooksLikeVideo(url)) return true;
  if (data.isVideo === true && urlLooksLikeVideo(String(data.videoUrl || ''))) return true;
  // Flag alone is not enough if the only URL is a still image
  if (data.isVideo === true && url && !urlLooksLikeImage(url)) return true;
  return false;
}

function urlLooksLikeImage(url: string): boolean {
  if (!url) return false;
  if (/\/image\/upload\//i.test(url)) return true;
  if (/\.(jpe?g|png|gif|webp|avif|bmp)([.?&#_]|$)/i.test(url)) return true;
  return false;
}

function collectCandidates(data: Record<string, unknown>): string[] {
  return [
    data.videoUrl,
    data.mediaUrl,
    data.src,
    data.url,
    data.image,
    data.thumbnail,
    data.thumb,
    data.poster,
    data.cover,
  ]
    .map((v) => String(v || '').trim())
    .filter(Boolean);
}

/**
 * Split playable video URL vs display/poster image from a Firestore doc.
 */
export function resolveMediaUrls(data: Record<string, unknown>): {
  videoUrl: string;
  imageUrl: string;
  isVideo: boolean;
} {
  const candidates = collectCandidates(data);
  const videoUrl =
    candidates.find((u) => urlLooksLikeVideo(u)) ||
    (mimeLooksLikeVideo(data) ? candidates[0] || '' : '') ||
    (data.isVideo === true
      ? candidates.find((u) => !urlLooksLikeImage(u)) || ''
      : '');

  const imageUrl =
    candidates.find((u) => urlLooksLikeImage(u) && u !== videoUrl) ||
    (!videoUrl ? candidates[0] || '' : '') ||
    String(data.thumbnail || data.thumb || data.poster || '') ||
    videoUrl ||
    '';

  const isVideo =
    Boolean(videoUrl) ||
    mimeLooksLikeVideo(data) ||
    (data.isVideo === true && Boolean(videoUrl || candidates[0]));

  return {
    videoUrl: videoUrl || (isVideo && !urlLooksLikeImage(candidates[0] || '') ? candidates[0] || '' : ''),
    imageUrl: imageUrl || videoUrl || '',
    isVideo: Boolean(videoUrl) || (data.isVideo === true && !urlLooksLikeImage(String(data.image || ''))),
  };
}

export function createdAtMs(data: Record<string, unknown>): number {
  const ca = data.createdAt as { toMillis?: () => number } | number | undefined;
  if (ca && typeof ca === 'object' && typeof ca.toMillis === 'function') {
    return ca.toMillis();
  }
  return Number(data.createdAtMs || data.createdAt || 0);
}

/** Normalize TikReel / videos / user_posts / pulse docs into a playable row. */
export function normalizeTikReelPost(
  id: string,
  data: Record<string, unknown>,
  source?: TikReelPost['_source']
): TikReelPost {
  const media = resolveMediaUrls(data);
  const owner = String(data.uid || data.userId || '');
  const forceVideo =
    source === 'videos' || source === 'users_videos' || data.isVideo === true;
  const isVideo = media.isVideo || (forceVideo && Boolean(media.videoUrl || media.imageUrl));
  const playUrl = media.videoUrl || (isVideo ? media.imageUrl : '');
  const display = media.imageUrl || playUrl;

  return {
    ...data,
    id,
    uid: owner || undefined,
    userId: String(data.userId || data.uid || '') || undefined,
    username: String(data.username || 'AJ_Member'),
    photo: String(data.photo || ''),
    text: String(data.text || data.caption || data.textOverlay || ''),
    // Keep both: image for posters/grid, videoUrl for <video>
    image: isVideo ? playUrl || display : display,
    videoUrl: playUrl || (isVideo ? display : ''),
    thumbnail: display || playUrl,
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

/** Pulse posts — same media resolution, always tagged pulse_posts. */
export function normalizePulsePost(
  id: string,
  data: Record<string, unknown>
): TikReelPost {
  return normalizeTikReelPost(id, data, 'pulse_posts');
}

/** Merge + dedupe; prefer rows that have a real video URL. */
export function mergeTikReelPosts(lists: TikReelPost[][]): TikReelPost[] {
  const byKey = new Map<string, TikReelPost>();
  const order: string[] = [];

  const primaryKeys = (p: TikReelPost) =>
    [
      p.id,
      p.postId ? `post:${p.postId}` : '',
      p.videoUrl || p.image ? `media:${p.videoUrl || p.image}` : '',
    ].filter(Boolean);

  const score = (p: TikReelPost) =>
    (p.isVideo && urlLooksLikeVideo(String(p.videoUrl || p.image || '')) ? 2 : 0) +
    (p.videoUrl || p.image ? 1 : 0);

  for (const list of lists) {
    for (const p of list) {
      if (!p.videoUrl && !p.image && !p.thumbnail) continue;
      const keys = primaryKeys(p);
      const existingKey = keys.find((k) => byKey.has(k));
      if (existingKey) {
        const prev = byKey.get(existingKey)!;
        if (score(p) > score(prev)) {
          const upgraded = {
            ...prev,
            ...p,
            isVideo: prev.isVideo || p.isVideo,
            videoUrl: p.videoUrl || prev.videoUrl,
            image: p.videoUrl || p.image || prev.image,
          };
          keys.forEach((k) => byKey.set(k, upgraded));
          byKey.set(existingKey, upgraded);
        }
        continue;
      }
      keys.forEach((k) => byKey.set(k, p));
      order.push(keys[0]);
    }
  }

  const seen = new Set<TikReelPost>();
  const unique = order
    .map((k) => byKey.get(k))
    .filter((p): p is TikReelPost => {
      if (!p || seen.has(p)) return false;
      seen.add(p);
      return true;
    });
  unique.sort((a, b) => (b.createdAtMs || 0) - (a.createdAtMs || 0));
  return unique;
}

/** Play when we have a real video URL (not just isVideo + JPEG). */
export function isPlayableTikReel(post: {
  isVideo?: boolean;
  videoUrl?: string;
  image?: string;
  url?: string;
  mediaUrl?: string;
}): boolean {
  const url = String(post.videoUrl || post.image || post.url || post.mediaUrl || '');
  return urlLooksLikeVideo(url) || (post.isVideo === true && !!url && !urlLooksLikeImage(url));
}

/** Best src for <video> or <img>. */
export function getPlayableSrc(post: {
  isVideo?: boolean;
  videoUrl?: string;
  image?: string;
  url?: string;
  mediaUrl?: string;
  thumbnail?: string;
}): { src: string; kind: 'video' | 'image' | 'none' } {
  const video = String(post.videoUrl || '').trim();
  const image = String(post.image || post.url || post.mediaUrl || post.thumbnail || '').trim();
  if (urlLooksLikeVideo(video)) return { src: video, kind: 'video' };
  if (urlLooksLikeVideo(image)) return { src: image, kind: 'video' };
  if (post.isVideo && image && !urlLooksLikeImage(image)) return { src: image, kind: 'video' };
  if (image) return { src: image, kind: 'image' };
  if (video) return { src: video, kind: urlLooksLikeVideo(video) ? 'video' : 'image' };
  return { src: '', kind: 'none' };
}

export function filterOwnedBy(posts: TikReelPost[], uid: string): TikReelPost[] {
  return posts.filter((p) => {
    const owner = String(p.userId || p.uid || '');
    return !owner || owner === uid;
  });
}

/** Infer video from File (mobile often sends empty MIME). */
export function fileLooksLikeVideo(file: File): boolean {
  if (file.type.startsWith('video/')) return true;
  if (file.type.startsWith('image/')) return false;
  return /\.(mp4|webm|mov|m4v|mkv|3gp)$/i.test(file.name || '');
}
