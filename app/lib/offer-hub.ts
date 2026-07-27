/**
 * FireFaucet-style Offer Hub destinations.
 * Coins from external walls credit ONLY via /api/postback (never on click).
 * No CPAGrip / ridefiles lockers in the Offer Hub UI.
 */

/** BitLabs surveys dashboard */
export const BITLABS_SURVEYS_URL =
  process.env.NEXT_PUBLIC_BITLABS_URL || 'https://dashboard.bitlabs.ai/';

/** Monlix offerwall — high-value app installs (Official CPA) */
export const MONLIX_OFFERS_URL =
  process.env.NEXT_PUBLIC_MONLIX_URL || 'https://offers.monlix.com/';

export function openBitLabsSurveys(): { ok: boolean; url?: string; error?: string } {
  if (typeof window === 'undefined') return { ok: false, error: 'client_only' };
  try {
    const win = window.open(BITLABS_SURVEYS_URL, '_blank', 'noopener,noreferrer');
    if (win) return { ok: true, url: BITLABS_SURVEYS_URL };
    window.location.assign(BITLABS_SURVEYS_URL);
    return { ok: true, url: BITLABS_SURVEYS_URL };
  } catch {
    return { ok: false, error: 'Could not open BitLabs (popup blocked).' };
  }
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
