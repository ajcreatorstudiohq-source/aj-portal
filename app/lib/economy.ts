/**
 * AJ Super Portal — economy & games catalog.
 * User-facing currency is strictly AJ Coins 🪙 (never show $ / USD in UI).
 */

/** Purchase rate: 1 purchase unit → COIN_RATE AJ Coins */
export const COIN_RATE = 100;
/** Internal cash-out divisor (1,000 AJ Coins ≈ 1 cash unit) — never show $ in UI */
export const CASH_RATE = 1000;

/** New-user wallet credit on first profile create — strictly zero */
export const SIGNUP_BONUS_COINS = 0;
/** Coins credited to the referrer per successful referral */
export const REFERRAL_BONUS_COINS = 50;

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
] as const;

/** @deprecated use PREMIUM_DIRECT_GAMES */
export const PREMIUM_CPA_GAMES = PREMIUM_DIRECT_GAMES;

/** Internal reward band (server ledger only — not shown in UI) */
const USER_REWARD_BAND_MIN = 1.0;
const USER_REWARD_BAND_MAX = 1.5;
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
    name: 'Ludo Star Elite',
    emoji: '🎲',
    desc: 'Private rooms · live friends · win matches for milestones',
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

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

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
 * Compute user / admin ledger split for server rewards (AJ Coins only in UI).
 * Deterministic when `seed` is provided (idempotent postbacks).
 */
export function computeRewardSplit(seed: string): RewardSplit {
  const u = hashUnit(seed);
  const v = hashUnit(seed + ':admin');
  const totalUsd =
    PROVIDER_BAND_MIN + u * (PROVIDER_BAND_MAX - PROVIDER_BAND_MIN);
  let userUsd =
    USER_REWARD_BAND_MIN + v * (USER_REWARD_BAND_MAX - USER_REWARD_BAND_MIN);
  userUsd = clamp(userUsd, USER_REWARD_BAND_MIN, Math.min(USER_REWARD_BAND_MAX, totalUsd - 0.5));
  const adminUsd = Number((totalUsd - userUsd).toFixed(4));
  const userCoins = Math.floor(userUsd * COIN_RATE);
  const adminCoins = Math.floor(adminUsd * COIN_RATE);
  return {
    totalUsd: Number(totalUsd.toFixed(4)),
    userUsd: Number(userUsd.toFixed(4)),
    adminUsd,
    userCoins,
    adminCoins,
  };
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
