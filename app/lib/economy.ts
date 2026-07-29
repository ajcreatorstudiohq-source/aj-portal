/**
 * AJ Super Portal — economy & games catalog.
 * Wallet USD value uses withdraw rate: CASH_RATE (1000 🪙 = $1).
 */

/** Purchase rate: $1 buy → COIN_RATE AJ Coins (top-up only) */
export const COIN_RATE = 100;
/** Withdraw / wallet dollar value: CASH_RATE AJ Coins = $1.00 */
export const CASH_RATE = 1000;

/**
 * Exact withdraw USD (1000:1) — no early 2-dp rounding.
 * 5 🪙 → 0.005 · 1000 🪙 → 1 · 20_000 🪙 → 20
 */
export function coinsToUsd(coins: number): number {
  return Math.max(0, Number(coins) || 0) / CASH_RATE;
}

/** Alias — same as coinsToUsd (withdraw rate 1000:1). */
export function coinsToCashUsd(coins: number): number {
  return coinsToUsd(coins);
}

/**
 * Format USD for UI at withdraw precision.
 * 1000 🪙 = $1.000 · 5 🪙 = $0.005 (3 decimals — 1 coin = $0.001)
 */
export function formatUsd(usd: number): string {
  const n = Number(usd) || 0;
  const rounded = Math.round(n * 1000) / 1000;
  return `$${rounded.toLocaleString(undefined, {
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  })}`;
}

/** New-user wallet credit on first profile create — strictly zero (no signup bonus) */
export const SIGNUP_BONUS_COINS = 0;
/** Coins credited to the referrer per successful referral */
export const REFERRAL_BONUS_COINS = 25;

/**
 * Premium Games — direct HTML / Netlify / APK URLs (NO ridefiles lockers).
 * DOWNLOAD & PLAY opens Adsterra in a new tab, then loads `downloadUrl` here.
 * Portal credits ZERO coins on click — owner earns via Adsterra.
 */
export const PREMIUM_DIRECT_GAMES = [
  {
    id: 'neon',
    name: 'Neon Strike',
    emoji: '⚡',
    downloadUrl: '/games/neon-strike/index.html',
  },
  {
    id: 'rider',
    name: 'Rider King',
    emoji: '🏍️',
    downloadUrl: '/games/rider-king/index.html',
  },
  {
    id: 'racer',
    name: 'Pulse Racer',
    emoji: '🏎️',
    downloadUrl: '/games/pulse-racer/index.html',
  },
  {
    id: 'subsea',
    name: 'SubSea Surge',
    emoji: '🐠',
    downloadUrl: '/games/subsea-surge/index.html',
  },
  {
    id: 'volcano',
    name: 'Volcano Escape',
    emoji: '🌋',
    downloadUrl: '/games/volcano-escape/index.html',
  },
  {
    id: 'ludo',
    name: 'Ludo Elite Royal',
    emoji: '🎲',
    downloadUrl: 'https://ludoeliteroyal.netlify.app',
  },
] as const;

/** @deprecated use PREMIUM_DIRECT_GAMES */
export const PREMIUM_CPA_GAMES = PREMIUM_DIRECT_GAMES;

/**
 * Hard revenue split — every non-gift earn path must keep this ratio.
 * Owner / platform: 70% (USD ledger in AdminRevenue + real ad-network payouts).
 * User / creator: 30% (AJ Coins only — never shown as $ in UI).
 */
export const PLATFORM_EARN_SHARE = 0.7;
export const USER_EARN_SHARE = 0.3;

/**
 * Gifting split (separate from activity earn).
 * Example: 500 coin gift → admin 200 (40%) + creator 300 (60%).
 */
export const GIFT_ADMIN_SHARE = 0.4;
export const GIFT_CREATOR_SHARE = 0.6;

/** Internal activity pool band (server ledger only — not shown in UI). Always split 70/30. */
const PROVIDER_BAND_MIN = 5.0;
const PROVIDER_BAND_MAX = 7.0;

export type GameCatalogItem = {
  id: string;
  name: string;
  emoji: string;
  desc: string;
  url: string;
  /** Levels that unlock real wallet rewards after install */
  milestones: number[];
  comingSoon?: boolean;
};

export const GAME_CATALOG: GameCatalogItem[] = [
  {
    id: 'rider',
    name: 'Rider King',
    emoji: '🏍️',
    desc: 'Install → clear levels → earn at milestones',
    url: '/games/rider-king/index.html',
    milestones: [3, 5, 10],
  },
  {
    id: 'racer',
    name: 'Pulse Racer',
    emoji: '🏎️',
    desc: 'Install → clear levels → earn at milestones',
    url: '/games/pulse-racer/index.html',
    milestones: [3, 5, 10],
  },
  {
    id: 'subsea',
    name: 'Subsea Surge',
    emoji: '🐠',
    desc: 'Install → clear levels → earn at milestones',
    url: '/games/subsea-surge/index.html',
    milestones: [3, 5, 10],
  },
  {
    id: 'neon',
    name: 'Neon Strike',
    emoji: '⚡',
    desc: 'Install → clear levels → earn at milestones',
    url: '/games/neon-strike/index.html',
    milestones: [3, 5, 10],
  },
  {
    id: 'volcano',
    name: 'Volcano Escape',
    emoji: '🌋',
    desc: 'Install → clear levels → earn at milestones',
    url: '/games/volcano-escape/index.html',
    milestones: [3, 5, 10],
  },
  {
    id: 'ludo',
    name: 'Ludo Elite Royal',
    emoji: '🎲',
    desc: 'Install → win matches → earn at milestones',
    url: '/games/ludo-elite-royal/index.html',
    milestones: [1, 3, 5],
  },
  {
    id: 'puck',
    name: 'Puck Pulse Elite',
    emoji: '🏒',
    desc: 'Air hockey — COMING SOON',
    url: '',
    milestones: [],
    comingSoon: true,
  },
];

export type GameProgressDoc = {
  installed: boolean;
  installedAt?: unknown;
  level: number;
  claimedMilestones: number[];
  lastLevelAt?: unknown;
};

export type UserEconomyFields = {
  balance: number;
  unlockedGames: string[];
  gameProgress: Record<string, GameProgressDoc>;
};

export type RewardSplit = {
  totalUsd: number;
  userUsd: number;
  adminUsd: number;
  userCoins: number;
  adminCoins: number;
};

/** Stable 0–1 hash from a string (for deterministic reward bands per tx). */
export function hashUnit(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 10000) / 10000;
}

/**
 * Exact 70% platform / 30% user split on any USD pool.
 * Owner share is always `adminUsd` (dollars ledger) — never credited to user wallets.
 */
export function splitPoolUsd(totalUsd: number): RewardSplit {
  const total = Math.max(0, Number(Number(totalUsd).toFixed(4)));
  const userUsd = Number((total * USER_EARN_SHARE).toFixed(4));
  const adminUsd = Number((total - userUsd).toFixed(4));
  return {
    totalUsd: total,
    userUsd,
    adminUsd,
    userCoins: Math.floor(userUsd * COIN_RATE),
    adminCoins: Math.floor(adminUsd * COIN_RATE),
  };
}

/**
 * Exact 70/30 split on a generic coin pool (non-gift).
 * Sender pays `totalCoins`; user gets 30%; platform keeps 70%.
 */
export function splitCoinPool(totalCoins: number): RewardSplit {
  const total = Math.max(0, Math.floor(Number(totalCoins) || 0));
  const userCoins = Math.floor(total * USER_EARN_SHARE);
  const adminCoins = total - userCoins;
  return {
    totalUsd: Number((total / COIN_RATE).toFixed(4)),
    userUsd: Number((userCoins / COIN_RATE).toFixed(4)),
    adminUsd: Number((adminCoins / COIN_RATE).toFixed(4)),
    userCoins,
    adminCoins,
  };
}

/**
 * Gift split: admin 40% / creator 60% of gift cost coins.
 * Example: 500 → admin 200, creator 300.
 */
export function splitGiftCoins(totalCoins: number): RewardSplit {
  const total = Math.max(0, Math.floor(Number(totalCoins) || 0));
  const userCoins = Math.floor(total * GIFT_CREATOR_SHARE);
  const adminCoins = total - userCoins;
  return {
    totalUsd: Number((total / COIN_RATE).toFixed(4)),
    userUsd: Number((userCoins / COIN_RATE).toFixed(4)),
    adminUsd: Number((adminCoins / COIN_RATE).toFixed(4)),
    userCoins,
    adminCoins,
  };
}

/**
 * Compute user / admin ledger split for server rewards (AJ Coins only in UI).
 * Pool band $5–$7, but ratio is always exactly 70% owner / 30% user.
 * Deterministic when `seed` is provided (idempotent postbacks).
 */
export function computeRewardSplit(seed: string): RewardSplit {
  const u = hashUnit(seed);
  const totalUsd =
    PROVIDER_BAND_MIN + u * (PROVIDER_BAND_MAX - PROVIDER_BAND_MIN);
  return splitPoolUsd(Number(totalUsd.toFixed(4)));
}

export function getGameById(gameId: string): GameCatalogItem | undefined {
  return GAME_CATALOG.find((g) => g.id === gameId);
}

export function isValidMilestone(gameId: string, level: number): boolean {
  const game = getGameById(gameId);
  if (!game || game.comingSoon) return false;
  return game.milestones.includes(level);
}

/** Public offerwall config (safe for client bundles — NEXT_PUBLIC only) */
export const OFFERWALL_PUBLIC = {
  /** CPAGrip show.php wall — override via NEXT_PUBLIC_OFFERWALL_URL */
  wallUrl:
    process.env.NEXT_PUBLIC_OFFERWALL_URL ||
    'https://ridefiles.net/show.php?l=1&u=1906642&id=63969',
  wallId: '1906642',
  provider: 'CPAGrip' as const,
};

/** Minimum AJ Coins required to request a withdrawal */
export const MIN_WITHDRAW_COINS = 20000;

/**
 * Build partner offerwall URL with user id for postback attribution.
 * Opening this link alone never credits coins — CPAGrip /api/postback required.
 */
export function buildOfferwallUrl(uid?: string | null): string {
  const base = OFFERWALL_PUBLIC.wallUrl;
  try {
    const url = new URL(base);
    if (uid) {
      url.searchParams.set('tracking_id', uid);
    }
    return url.toString();
  } catch {
    if (!uid) return base;
    const sep = base.includes('?') ? '&' : '?';
    return `${base}${sep}tracking_id=${encodeURIComponent(uid)}`;
  }
}

/** Server-only offerwall config — import only from API routes / server code */
export function getOfferwallServerConfig() {
  return {
    wallUrl: OFFERWALL_PUBLIC.wallUrl,
    postbackSecret:
      process.env.OFFERWALL_POSTBACK_SECRET ||
      process.env.AJ_POSTBACK_SECRET ||
      'AJ_SUPER_SECURE_786_PORTAL',
    maxDailyCompletions: Number(process.env.OFFERWALL_MAX_DAILY || 5),
  };
}

/** @deprecated use OFFERWALL_PUBLIC or getOfferwallServerConfig() */
export const OFFERWALL_DEFAULTS = {
  get wallUrl() {
    return OFFERWALL_PUBLIC.wallUrl;
  },
  get postbackSecret() {
    return getOfferwallServerConfig().postbackSecret;
  },
  get maxDailyCompletions() {
    return getOfferwallServerConfig().maxDailyCompletions;
  },
};
