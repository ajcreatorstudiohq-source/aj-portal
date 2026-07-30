/**
 * User-facing earn history helpers.
 * Users always see their credited AJ Coins as a full standard reward —
 * never "30% of partner payout" language.
 */

import { SOURCE_LABELS, type RewardSource } from './reward-sources';
import { coinsToUsd, formatUsd } from './economy';

export type EarnHistoryItem = {
  id: string;
  uid: string;
  source: string;
  /** Coins credited to the user (their full displayed reward). */
  coins: number;
  coinsLabel: string;
  usdLabel: string;
  /** Friendly title for wallet UI — no share % */
  title: string;
  /** Optional subtitle (network name only, no economics). */
  subtitle?: string;
  provider?: string;
  createdAtMs: number;
  createdAtLabel: string;
};

function isTheoremReachMeta(meta: Record<string, unknown> | undefined, via?: string): boolean {
  const v = String(via || meta?.via || '').toLowerCase();
  const p = String(meta?.provider || '').toLowerCase();
  return (
    v.includes('theorem') ||
    p.includes('theorem') ||
    String(meta?.displayLabel || '')
      .toLowerCase()
      .includes('survey')
  );
}

/** Public title shown in user wallet — never includes 70/30 copy. */
export function earnDisplayTitle(
  source: string,
  meta?: Record<string, unknown>
): string {
  if (isTheoremReachMeta(meta, String(meta?.via || ''))) {
    return String(meta?.displayLabel || 'Survey Reward');
  }
  if (source === 'offerwall') {
    return String(meta?.displayLabel || 'Offer Task Reward');
  }
  if (source === 'offerwall_video' || String(meta?.provider || '').includes('adsterra')) {
    return String(meta?.displayLabel || 'Watch Ads Reward');
  }
  if (source === 'adsterra_watch') return 'Watch Ads Reward';
  if (source in SOURCE_LABELS) {
    return SOURCE_LABELS[source as RewardSource];
  }
  return 'Earn Reward';
}

export function earnDisplaySubtitle(
  source: string,
  meta?: Record<string, unknown>
): string | undefined {
  if (isTheoremReachMeta(meta)) return 'TheoremReach · Surveys';
  if (String(meta?.provider || '').includes('adsterra') || source.includes('adsterra')) {
    return 'Adsterra';
  }
  if (source === 'offerwall_video') return 'Rewarded video';
  if (source === 'math_challenge' || source === 'alpha_captcha') return 'Daily faucet';
  return undefined;
}

export function ledgerRowToEarnItem(
  id: string,
  data: Record<string, unknown>
): EarnHistoryItem | null {
  const uid = String(data.uid || '');
  const coins = Math.max(
    0,
    Math.floor(
      Number(
        data.flatCoins ??
          data.userCoins ??
          data.userNetCoins ??
          data.coins ??
          data.balanceCredited ??
          0
      ) || 0
    )
  );
  if (!uid || coins <= 0) return null;

  const meta = (data.meta && typeof data.meta === 'object'
    ? (data.meta as Record<string, unknown>)
    : {}) as Record<string, unknown>;
  const source = String(data.source || meta.source || 'earn');
  const createdAt = data.createdAt as { toMillis?: () => number; seconds?: number } | number | undefined;
  let createdAtMs = Date.now();
  if (typeof createdAt === 'number') createdAtMs = createdAt;
  else if (createdAt && typeof createdAt.toMillis === 'function') createdAtMs = createdAt.toMillis();
  else if (createdAt && typeof createdAt.seconds === 'number') createdAtMs = createdAt.seconds * 1000;

  const usd = coinsToUsd(coins);
  return {
    id,
    uid,
    source,
    coins,
    coinsLabel: `+${coins.toLocaleString()} 🪙`,
    usdLabel: formatUsd(usd),
    title: earnDisplayTitle(source, meta),
    subtitle: earnDisplaySubtitle(source, meta),
    provider: String(meta.provider || ''),
    createdAtMs,
    createdAtLabel: new Date(createdAtMs).toLocaleString(),
  };
}

/** Admin-only breakdown for a survey / offerwall credit. */
export type SurveySplitDetail = {
  providerPayoutUsd: number;
  adminUsd: number;
  userUsd: number;
  userCoins: number;
  adminSharePct: number;
  userSharePct: number;
};

export function surveySplitFromLedger(data: Record<string, unknown>): SurveySplitDetail {
  const meta = (data.meta && typeof data.meta === 'object'
    ? (data.meta as Record<string, unknown>)
    : {}) as Record<string, unknown>;
  const userCoins = Math.max(
    0,
    Math.floor(Number(data.flatCoins ?? data.userCoins ?? meta.userReward ?? 0) || 0)
  );
  const userUsd = Number(data.userUsd ?? meta.userUsd ?? coinsToUsd(userCoins)) || coinsToUsd(userCoins);
  const adminUsd = Number(data.adminUsd ?? meta.adminUsd ?? 0) || 0;
  const providerPayoutUsd =
    Number(meta.providerPayoutUsd ?? meta.providerPayout ?? data.totalUsd ?? 0) ||
    Number((userUsd + adminUsd).toFixed(6));
  return {
    providerPayoutUsd,
    adminUsd: adminUsd || Number((providerPayoutUsd - userUsd).toFixed(6)),
    userUsd,
    userCoins,
    adminSharePct: Number(meta.platformSharePct ?? 0.7),
    userSharePct: Number(meta.userSharePct ?? 0.3),
  };
}

export function isSurveyLedgerRow(data: Record<string, unknown>): boolean {
  const meta = (data.meta && typeof data.meta === 'object'
    ? (data.meta as Record<string, unknown>)
    : {}) as Record<string, unknown>;
  const source = String(data.source || '');
  return (
    isTheoremReachMeta(meta) ||
    (source === 'offerwall' && !String(meta.provider || '').includes('adsterra'))
  );
}
