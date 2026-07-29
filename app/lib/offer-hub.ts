/**
 * Offer Hub destinations.
 * Coins from external walls credit ONLY via /api/postback (never on click).
 */

/** AdGem Offerwall — app / property id */
export const ADGEM_APP_ID = process.env.NEXT_PUBLIC_ADGEM_APP_ID || '33088';

/** AdGem wall base (Direct Link + IFrame) */
export const ADGEM_WALL_BASE =
  process.env.NEXT_PUBLIC_ADGEM_URL || 'https://adunits.adgem.com/wall';

/**
 * Production postback (configure in AdGem dashboard).
 * Macros: {amount} → payout, {state} → status, {player_id} → userId
 *
 * https://YOUR_DOMAIN/api/postback?payout={amount}&status={state}&userId={player_id}&secret=YOUR_SECRET
 */
export const ADGEM_POSTBACK_URL =
  process.env.NEXT_PUBLIC_ADGEM_POSTBACK_URL ||
  'https://aj-portal-one.vercel.app/api/postback?payout={amount}&status={state}&userId={player_id}';

/** @deprecated CPX Research replaced by AdGem */
export const CPX_RESEARCH_APP_ID = ADGEM_APP_ID;
/** @deprecated */
export const CPX_RESEARCH_BASE = ADGEM_WALL_BASE;
/** @deprecated BitLabs / CPX → AdGem */
export const BITLABS_SURVEYS_URL = ADGEM_WALL_BASE;
/** @deprecated Monlix removed from Offer Hub */
export const MONLIX_OFFERS_URL =
  process.env.NEXT_PUBLIC_MONLIX_URL || 'https://offers.monlix.com/';

/**
 * Build AdGem offerwall URL.
 * Template: https://adunits.adgem.com/wall?appid=33088&playerid=USER_ID
 */
export function buildAdGemUrl(uid: string): string {
  const playerId = String(uid || '').trim();
  try {
    const url = new URL(ADGEM_WALL_BASE);
    url.searchParams.set('appid', ADGEM_APP_ID);
    if (playerId) url.searchParams.set('playerid', playerId);
    return url.toString();
  } catch {
    const q = new URLSearchParams({
      appid: ADGEM_APP_ID,
      ...(playerId ? { playerid: playerId } : {}),
    });
    return `${ADGEM_WALL_BASE}?${q.toString()}`;
  }
}

/** @deprecated use buildAdGemUrl */
export function buildCpxResearchUrl(uid: string): string {
  return buildAdGemUrl(uid);
}

export function openAdGem(uid: string): { ok: boolean; url?: string; error?: string } {
  if (typeof window === 'undefined') return { ok: false, error: 'client_only' };
  if (!uid) return { ok: false, error: 'Please sign in first' };
  try {
    const href = buildAdGemUrl(uid);
    const win = window.open(href, '_blank', 'noopener,noreferrer');
    if (win) return { ok: true, url: href };
    window.location.assign(href);
    return { ok: true, url: href };
  } catch {
    return { ok: false, error: 'Could not open ADGem (popup blocked).' };
  }
}

/** @deprecated use openAdGem */
export function openCpxResearch(uid: string) {
  return openAdGem(uid);
}

/** @deprecated use openAdGem */
export function openBitLabsSurveys(uid?: string | null): {
  ok: boolean;
  url?: string;
  error?: string;
} {
  if (!uid) return { ok: false, error: 'Please sign in first' };
  return openAdGem(uid);
}

/** @deprecated Monlix removed — use openAdGem */
export function openMonlixOffers(uid?: string | null): {
  ok: boolean;
  url?: string;
  error?: string;
} {
  if (!uid) return { ok: false, error: 'Please sign in first' };
  return openAdGem(uid);
}
