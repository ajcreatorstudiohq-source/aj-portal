/**
 * Canonical multi-source earning channels for AJ Super Portal.
 *
 * NO-LOSS ECONOMY:
 * User AJ Coins ONLY when backed by real network dollars:
 *   - Watch Ads / Math / Captcha → 30% of ADSTERRA_CLICK_USD
 *   - Offerwall / AdGem postback → 30% of partner payout USD
 *   - Gifts → zero-sum from sender balance (40/60)
 * Everything else (posts, referral, live, bot mint, bare milestones) → 0 coins.
 */

import { ADSTERRA_REWARD_COINS } from './ads-config';
import { REFERRAL_BONUS_COINS, NO_LOSS_ECONOMY } from './economy';

export const REWARD_SOURCES = [
  'game_install',
  'game_milestone',
  'offerwall',
  'offerwall_video',
  'app_download',
  'tiktok_post',
  'pulse_post',
  'live_view',
  'live_host',
  'live_gift',
  'ai_bot_sync',
  'pk_match',
  'referral',
  'math_challenge',
  'alpha_captcha',
] as const;

export type RewardSource = (typeof REWARD_SOURCES)[number];

export function isRewardSource(v: string): v is RewardSource {
  return (REWARD_SOURCES as readonly string[]).includes(v);
}

/** Max successful credits per user per source per UTC day */
export const DAILY_CAPS: Record<RewardSource, number> = {
  game_install: 6,
  game_milestone: 12,
  offerwall: 5,
  offerwall_video: 8,
  app_download: 1,
  tiktok_post: 5,
  pulse_post: 5,
  live_view: 3,
  live_host: 3,
  live_gift: 20,
  ai_bot_sync: 3,
  pk_match: 5,
  referral: 10,
  math_challenge: 5,
  alpha_captcha: 5,
};

export const SOURCE_LABELS: Record<RewardSource, string> = {
  game_install: 'Game Download & Install',
  game_milestone: 'Game Level Milestone',
  offerwall: 'Offerwall Task',
  offerwall_video: 'Offerwall Rewarded Video',
  app_download: 'Portal App Download',
  tiktok_post: 'TikReel Upload',
  pulse_post: 'Pulse Upload',
  live_view: 'Live Match Viewing',
  live_host: 'Live Stream Hosting',
  live_gift: 'Live Gift Received',
  ai_bot_sync: 'AI Trading Bot Sync',
  pk_match: 'PK Live Match',
  referral: 'Referral Bonus',
  math_challenge: 'Daily Math Challenge',
  alpha_captcha: 'Premium Alphanumeric Captcha',
};

/**
 * Sources that may credit user coins under no-loss rules.
 * (Gifts handled separately as zero-sum from sender.)
 */
export const REVENUE_BACKED_SOURCES: ReadonlySet<RewardSource> = new Set([
  'offerwall',
  'offerwall_video',
  'math_challenge',
  'alpha_captcha',
  'live_gift',
]);

/** TikReel / Pulse — 0 in no-loss mode (no Adsterra $ behind upload) */
export const POST_REWARD_COINS = 0;

/**
 * Math & Captcha open Adsterra Direct Link → 30% of click (same as Watch Ads).
 * Default 15 🪙 when ADSTERRA_CLICK_USD = $0.05.
 */
export const MATH_CHALLENGE_COINS = ADSTERRA_REWARD_COINS;
export const ALPHA_CAPTCHA_COINS = ADSTERRA_REWARD_COINS;

/** Unbacked live / games / install activity — always 0 (no-loss) */
export const ACTIVITY_REWARD_COINS = 0;

export { REFERRAL_BONUS_COINS, ADSTERRA_REWARD_COINS, NO_LOSS_ECONOMY };

/** @deprecated Use ADSTERRA_REWARD_COINS */
export const REWARDED_VIDEO_COINS = ADSTERRA_REWARD_COINS;

/** Public map for UI — exact coins credited per action */
export const REWARD_COIN_AMOUNTS = {
  watch_ads: ADSTERRA_REWARD_COINS,
  math_challenge: MATH_CHALLENGE_COINS,
  alpha_captcha: ALPHA_CAPTCHA_COINS,
  tiktok_post: POST_REWARD_COINS,
  pulse_post: POST_REWARD_COINS,
  referral: REFERRAL_BONUS_COINS,
  activity: ACTIVITY_REWARD_COINS,
  ai_bot_sync: 0,
} as const;
