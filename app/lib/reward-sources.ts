/**
 * Canonical multi-source earning channels for AJ Super Portal.
 *
 * Coin amounts (ad-backed social + games):
 * - Watch Ads (rewarded) → 10
 * - Math / Captcha → 5 each (open Adsterra)
 * - TikReel / Pulse post → 2 each (in-feed ads)
 * - Referral → 5
 * - Games install/milestone → GAME_REWARD_COINS (ads in games)
 * - AI bot → % of invested (users buy/earn coins; bot is a feature)
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

/** TikReel video / Pulse photo — in-feed ads run on social */
export const POST_REWARD_COINS = 2;

/** Math & Captcha — open Adsterra, smaller faucet than Watch Ads */
export const MATH_CHALLENGE_COINS = 5;
export const ALPHA_CAPTCHA_COINS = 5;

/** Games have Adsterra bridges — modest free coins per install/milestone */
export const GAME_REWARD_COINS = 5;
/** @deprecated alias */
export const ACTIVITY_REWARD_COINS = GAME_REWARD_COINS;

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
  activity: GAME_REWARD_COINS,
  game_install: GAME_REWARD_COINS,
  game_milestone: GAME_REWARD_COINS,
} as const;
