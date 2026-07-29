/**
 * Canonical multi-source earning channels for AJ Super Portal.
 * Every channel credits AJ Coins 🪙 via verified server paths only.
 *
 * Coin amounts (Adsterra click = $0.05 default → user 30% = 15 🪙):
 * - Watch Ads / Math / Captcha → ADSTERRA_REWARD_COINS (15)
 * - TikReel / Pulse post → POST_REWARD_COINS (5)
 * - Referral → REFERRAL_BONUS_COINS (25) from economy
 * - Live / games / other split earns → same Adsterra click 30% via computeRewardSplit
 */

import { ADSTERRA_REWARD_COINS } from './ads-config';
import { REFERRAL_BONUS_COINS, adsterraUserRewardCoins } from './economy';

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

/** TikReel / Pulse verified upload reward */
export const POST_REWARD_COINS = 5;

/**
 * Math & Captcha open Adsterra Direct Link → same 30% of click as Watch Ads.
 * Default 15 🪙 when ADSTERRA_CLICK_USD = $0.05.
 */
export const MATH_CHALLENGE_COINS = ADSTERRA_REWARD_COINS;
export const ALPHA_CAPTCHA_COINS = ADSTERRA_REWARD_COINS;

/** Activity earn (live / games / etc.) — same Adsterra click user share */
export const ACTIVITY_REWARD_COINS = adsterraUserRewardCoins();

export { REFERRAL_BONUS_COINS, ADSTERRA_REWARD_COINS };

/** @deprecated Use ADSTERRA_REWARD_COINS */
export const REWARDED_VIDEO_COINS = ADSTERRA_REWARD_COINS;

/** Public map for UI / GET helpers — exact coins credited per action */
export const REWARD_COIN_AMOUNTS = {
  watch_ads: ADSTERRA_REWARD_COINS,
  math_challenge: MATH_CHALLENGE_COINS,
  alpha_captcha: ALPHA_CAPTCHA_COINS,
  tiktok_post: POST_REWARD_COINS,
  pulse_post: POST_REWARD_COINS,
  referral: REFERRAL_BONUS_COINS,
  activity: ACTIVITY_REWARD_COINS,
} as const;
