/**
 * FireFaucet-style Offer Hub destinations.
 * Coins from external walls credit ONLY via /api/postback (never on click).
 */

/** CPX Research surveys — embed iframe with Firebase uid as ext_user_id */
export const CPX_RESEARCH_APP_ID =
  process.env.NEXT_PUBLIC_CPX_RESEARCH_APP_ID || '34869';

export const CPX_RESEARCH_BASE =
  process.env.NEXT_PUBLIC_CPX_RESEARCH_URL ||
  'https://offers.cpx-research.com/index.php';

/** @deprecated BitLabs replaced by CPX Research */
export const BITLABS_SURVEYS_URL = CPX_RESEARCH_BASE;

/** Monlix offerwall — high-value app installs (Official CPA) */
export const MONLIX_OFFERS_URL =
  process.env.NEXT_PUBLIC_MONLIX_URL || 'https://offers.monlix.com/';

/**
 * Build CPX Research offer URL.
 * Template: https://offers.cpx-research.com/index.php?app_id=34869&ext_user_id=USER_ID
 */
export function buildCpxResearchUrl(uid: string): string {
  const userId = String(uid || '').trim();
  try {
    const url = new URL(CPX_RESEARCH_BASE);
    url.searchParams.set('app_id', CPX_RESEARCH_APP_ID);
    if (userId) url.searchParams.set('ext_user_id', userId);
    return url.toString();
  } catch {
    const q = new URLSearchParams({
      app_id: CPX_RESEARCH_APP_ID,
      ...(userId ? { ext_user_id: userId } : {}),
    });
    return `${CPX_RESEARCH_BASE}?${q.toString()}`;
  }
}

export function openCpxResearch(uid: string): { ok: boolean; url?: string; error?: string } {
  if (typeof window === 'undefined') return { ok: false, error: 'client_only' };
  if (!uid) return { ok: false, error: 'Please sign in first' };
  try {
    const href = buildCpxResearchUrl(uid);
    const win = window.open(href, '_blank', 'noopener,noreferrer');
    if (win) return { ok: true, url: href };
    window.location.assign(href);
    return { ok: true, url: href };
  } catch {
    return { ok: false, error: 'Could not open CPX Research (popup blocked).' };
  }
}

/** @deprecated use openCpxResearch */
export function openBitLabsSurveys(uid?: string | null): {
  ok: boolean;
  url?: string;
  error?: string;
} {
  if (!uid) return { ok: false, error: 'Please sign in first' };
  return openCpxResearch(uid);
}

export function openMonlixOffers(uid?: string | null): {
  ok: boolean;
  url?: string;
  error?: string;
} {
  if (typeof window === 'undefined') return { ok: false, error: 'client_only' };
  try {
    let href = MONLIX_OFFERS_URL;
    try {
      const url = new URL(MONLIX_OFFERS_URL);
      if (uid) url.searchParams.set('userid', uid);
      href = url.toString();
    } catch {
      if (uid) {
        const sep = MONLIX_OFFERS_URL.includes('?') ? '&' : '?';
        href = `${MONLIX_OFFERS_URL}${sep}userid=${encodeURIComponent(uid)}`;
      }
    }
    const win = window.open(href, '_blank', 'noopener,noreferrer');
    if (win) return { ok: true, url: href };
    window.location.assign(href);
    return { ok: true, url: href };
  } catch {
    return { ok: false, error: 'Could not open Monlix (popup blocked).' };
  }
}
