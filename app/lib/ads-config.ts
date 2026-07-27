/**
 * Central ad placement + Monetag zone configuration for AJ Super Portal.
 * Banner / interstitial / rewarded video placements share one zone today;
 * placement IDs keep analytics and admin revenue attributable per surface.
 */

export const MONETAG_INTERSTITIAL_ZONE = 11377822;
export const MONETAG_TAG_URL = 'https://nap5k.com/tag.min.js';
export const MONETAG_TAG_URLS: Record<number, string> = {
  [MONETAG_INTERSTITIAL_ZONE]: MONETAG_TAG_URL,
};

/** Full-screen interstitial / rewarded cooldown (shared across hub + offerwall) */
export const AD_COOLDOWN_MS = 5 * 60 * 1000;
export const REWARDED_VIDEO_COOLDOWN_MS = 90 * 1000;
export const OFFERWALL_VIDEO_MAX_DAILY = Number(
  process.env.NEXT_PUBLIC_OFFERWALL_VIDEO_MAX_DAILY ||
    process.env.OFFERWALL_VIDEO_MAX_DAILY ||
    8
);

/** Estimated admin eCPM used when logging impression revenue (no user credit). */
export const AD_IMPRESSION_ECPM_USD = 2.5;
export const AD_CLICK_VALUE_USD = 0.05;

export const AD_PLACEMENTS = [
  'hub_nav_interstitial',
  'offerwall_rewarded_video',
  'games_banner',
  'games_interstitial',
  'tikreel_infeed',
  'pulse_infeed',
  'live_go_banner',
  'live_join_banner',
  'live_matches_banner',
] as const;

export type AdPlacement = (typeof AD_PLACEMENTS)[number];

export function isAdPlacement(v: string): v is AdPlacement {
  return (AD_PLACEMENTS as readonly string[]).includes(v);
}

export const AD_FALLBACK_VIDEOS = [
  'https://test-videos.co.uk/vids/jellyfish/mp4/h264/720/Jellyfish_720_10s_1MB.mp4',
  'https://test-videos.co.uk/vids/bigbuckbunny/mp4/h264/720/Big_Buck_Bunny_720_10s_1MB.mp4',
  'https://test-videos.co.uk/vids/sintel/mp4/h264/720/Sintel_720_10s_1MB.mp4',
  'https://media.w3.org/2010/05/sintel/trailer.mp4',
  'https://media.w3.org/2010/05/video/movie_300.mp4',
  'https://test-videos.co.uk/vids/bigbuckbunny/mp4/h264/360/Big_Buck_Bunny_360_10s_1MB.mp4',
];

export const AD_FALLBACK_POSTERS = [
  'https://images.unsplash.com/photo-1550745165-9bc0b252726c?w=400&h=800&fit=crop',
  'https://images.unsplash.com/photo-1611162617474-5b21e879e872?w=400&h=800&fit=crop',
  'https://images.unsplash.com/photo-1598899134739-24c46f58b8c0?w=400&h=800&fit=crop',
  'https://images.unsplash.com/photo-1633618451480-89e6c3c5c3c3?w=400&h=800&fit=crop',
  'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=400&h=800&fit=crop',
];

export type AdEventType = 'impression' | 'click' | 'complete' | 'skip' | 'fail';
