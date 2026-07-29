/**
 * Adsterra ad configuration for AJ Super Portal.
 * Monetag / gozen / sunny-sprout / alwingulla are permanently removed.
 *
 * Rewarded Watch Ads credit a fixed coin amount (ADSTERRA_REWARD_COINS).
 * Owner still earns real $ from Adsterra dashboard on every Direct Link open.
 */

import { ADSTERRA_CLICK_USD, splitAdClickUsd } from './economy';

export { ADSTERRA_CLICK_USD };

/** Social Bar (layout body) */
export const ADSTERRA_SOCIAL_BAR_SRC =
  'https://pl30561815.effectivecpmnetwork.com/27/52/bb/2752bb08c97718e98b6e804097bf17b9.js';

/** Native Banner — TikReels / Pulse in-feed (real Adsterra paid unit) */
export const ADSTERRA_NATIVE_BANNER_ID = 'container-178c3036bfb7d0d24511c11f8fc26aa5';
export const ADSTERRA_NATIVE_BANNER_SRC =
  'https://pl30561816.effectivecpmnetwork.com/178c3036bfb7d0d24511c11f8fc26aa5/invoke.js';

/** Direct rewarded / watch-ad smartlink (opens in new tab — paid clicks) */
export const ADSTERRA_REWARDED_LINK =
  'https://www.effectivecpmnetwork.com/b8jtkn6i4?key=77409a0e0aa4602b6d03798ff53516b3';

/** Alias — impression/click track estimates use the same click $ base */
export const AD_CLICK_VALUE_USD = ADSTERRA_CLICK_USD;

/** Full 70/30 split of one Adsterra click (ledger / hisaab) */
export function getAdsterraClickSplit() {
  return splitAdClickUsd(ADSTERRA_CLICK_USD);
}

/** User AJ Coins per Watch Ads / rewarded Direct Link claim */
export const ADSTERRA_REWARD_COINS = 5;

/** Watch-ad verification timer before Claim unlocks (high-quality visit) */
export const ADSTERRA_VERIFY_SECONDS = 30;

/** Insert TikTok-style Adsterra in-feed slide after every N posts */
export const INFEED_AD_EVERY_N = 4;

/** Legacy aliases — Monetag disabled (zone 0, empty tag URLs) */
export const MONETAG_INTERSTITIAL_ZONE = 0;
export const MONETAG_TAG_URL = '';
export const MONETAG_TAG_URLS: Record<number, string> = {};

export const AD_COOLDOWN_MS = 5 * 60 * 1000;
export const REWARDED_VIDEO_COOLDOWN_MS = 60 * 1000;
export const OFFERWALL_VIDEO_MAX_DAILY = Number(
  process.env.NEXT_PUBLIC_OFFERWALL_VIDEO_MAX_DAILY ||
    process.env.OFFERWALL_VIDEO_MAX_DAILY ||
    8
);

/** Estimated admin eCPM used when logging impression revenue (no user credit). */
export const AD_IMPRESSION_ECPM_USD = 2.5;

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
  'pk_match_start',
  'pk_match_end',
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
