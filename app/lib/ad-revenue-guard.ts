/**
 * Minimum real Adsterra CPC required to keep Watch Ads no-loss.
 * Override with ADSTERRA_REAL_CPC_USD / NEXT_PUBLIC_ADSTERRA_CLICK_USD.
 */
import {
  ADSTERRA_CLICK_USD,
  CASH_RATE,
  coinsToUsd,
  PLATFORM_EARN_SHARE,
  USER_EARN_SHARE,
} from './economy';
import { ADSTERRA_REWARD_COINS } from './ads-config';

/** Floor CPC that covers fixed Watch Ads coin liability */
export function minCpcForRewardCoins(coins: number = ADSTERRA_REWARD_COINS): number {
  return coinsToUsd(coins);
}

/**
 * Effective CPC used for server validation.
 * Prefer measured/real env; fall back to configured click estimate.
 */
export function getEffectiveAdCpcUsd(): number {
  const real = Number(
    process.env.ADSTERRA_REAL_CPC_USD ||
      process.env.NEXT_PUBLIC_ADSTERRA_REAL_CPC_USD ||
      ''
  );
  if (Number.isFinite(real) && real > 0) return real;
  return ADSTERRA_CLICK_USD;
}

export type CpcValidation = {
  ok: boolean;
  effectiveCpcUsd: number;
  minRequiredUsd: number;
  rewardCoins: number;
  userLiabilityUsd: number;
  platformMarginUsd: number;
  error?: string;
};

/** Reject Watch Ads credit when CPC cannot cover user withdraw liability. */
export function validateWatchAdsEconomics(
  rewardCoins: number = ADSTERRA_REWARD_COINS
): CpcValidation {
  const coins = Math.max(0, Math.floor(rewardCoins));
  const userLiabilityUsd = coinsToUsd(coins);
  const effectiveCpcUsd = getEffectiveAdCpcUsd();
  const minRequiredUsd = minCpcForRewardCoins(coins);
  const platformMarginUsd = Number((effectiveCpcUsd - userLiabilityUsd).toFixed(6));
  if (effectiveCpcUsd + 1e-9 < minRequiredUsd) {
    return {
      ok: false,
      effectiveCpcUsd,
      minRequiredUsd,
      rewardCoins: coins,
      userLiabilityUsd,
      platformMarginUsd,
      error: 'cpc_below_reward',
    };
  }
  return {
    ok: true,
    effectiveCpcUsd,
    minRequiredUsd,
    rewardCoins: coins,
    userLiabilityUsd,
    platformMarginUsd,
  };
}

export function revenueSplitLabel() {
  return {
    platformSharePct: PLATFORM_EARN_SHARE,
    userSharePct: USER_EARN_SHARE,
    cashRate: CASH_RATE,
    assumedClickUsd: ADSTERRA_CLICK_USD,
    effectiveCpcUsd: getEffectiveAdCpcUsd(),
  };
}
