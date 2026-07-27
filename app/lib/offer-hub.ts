/**
 * FireFaucet-style Offer Hub destinations.
 * Coins from external walls credit ONLY via /api/postback (never on click).
 */

/** BitLabs surveys dashboard — placeholder until publisher wall URL is verified */
export const BITLABS_SURVEYS_URL =
  process.env.NEXT_PUBLIC_BITLABS_URL || 'https://dashboard.bitlabs.ai/';

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
