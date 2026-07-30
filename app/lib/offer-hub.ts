/**
 * Offer Hub — TheoremReach rewarded surveys.
 * Coins credit ONLY via /api/postback (never on click / iframe open).
 *
 * Web entry (iframe / new tab):
 * https://theoremreach.com/respondent_entry/direct?api_key=…&user_id=…&transaction_id=…
 * @see https://theoremreach.com/docs/web
 */

/** Public TheoremReach API key (iframe / direct entry) */
export const THEOREMREACH_API_KEY =
  process.env.NEXT_PUBLIC_THEOREMREACH_API_KEY || 'f31fa650772c961832f9b620e978';

/** Direct / iframe entry base */
export const THEOREMREACH_ENTRY_BASE =
  process.env.NEXT_PUBLIC_THEOREMREACH_URL ||
  'https://theoremreach.com/respondent_entry/direct';

/**
 * Dashboard postback (configure in TheoremReach app settings):
 * https://YOUR_DOMAIN/api/postback?user_id={user_id}&payout={currency}&txid={transaction_id}&secret=YOUR_SECRET
 *
 * TheoremReach also sends currency (USD), reward (virtual coins), hash, debug.
 * Secret: set OFFERWALL_POSTBACK_SECRET or THEOREMREACH_SECRET on the server
 * (dashboard token — store in env, not client).
 */
export const THEOREMREACH_POSTBACK_URL =
  process.env.NEXT_PUBLIC_THEOREMREACH_POSTBACK_URL ||
  'https://aj-portal-one.vercel.app/api/postback?user_id={user_id}&payout={currency}&txid={transaction_id}&secret=YOUR_SECRET';

function newTransactionId(uid: string): string {
  const stamp = Date.now().toString(36);
  const rand =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID().slice(0, 8)
      : Math.random().toString(36).slice(2, 10);
  return `tr_${String(uid || 'guest').slice(0, 12)}_${stamp}_${rand}`;
}

/**
 * Build TheoremReach survey wall URL.
 * https://theoremreach.com/respondent_entry/direct?api_key=…&user_id=…&transaction_id=…
 */
export function buildTheoremReachUrl(
  uid: string,
  opts?: { transactionId?: string }
): string {
  const userId = String(uid || '').trim() || 'guest';
  const transactionId = opts?.transactionId || newTransactionId(userId);
  try {
    const url = new URL(THEOREMREACH_ENTRY_BASE);
    url.searchParams.set('api_key', THEOREMREACH_API_KEY);
    url.searchParams.set('user_id', userId);
    url.searchParams.set('transaction_id', transactionId);
    return url.toString();
  } catch {
    const q = new URLSearchParams({
      api_key: THEOREMREACH_API_KEY,
      user_id: userId,
      transaction_id: transactionId,
    });
    return `${THEOREMREACH_ENTRY_BASE}?${q.toString()}`;
  }
}

export function openTheoremReach(uid: string): {
  ok: boolean;
  url?: string;
  error?: string;
} {
  if (typeof window === 'undefined') return { ok: false, error: 'client_only' };
  if (!uid) return { ok: false, error: 'Please sign in first' };
  try {
    const href = buildTheoremReachUrl(uid);
    const win = window.open(href, '_blank', 'noopener,noreferrer');
    if (win) return { ok: true, url: href };
    window.location.assign(href);
    return { ok: true, url: href };
  } catch {
    return { ok: false, error: 'Could not open TheoremReach (popup blocked).' };
  }
}
