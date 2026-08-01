/**
 * CPAGrip Offer Wall — public ridefiles show.php link (mobile-safe).
 * Coins credit ONLY via /api/postback (never on link open).
 */

export const CPAGRIP_WALL_ID = '1906642';
export const CPAGRIP_OFFER_ID = '63969';

/** Production CPAGrip offerwall URL (tracking_id = Firebase uid) */
export const CPAGRIP_SHOW_BASE =
  `https://ridefiles.net/show.php?l=1&u=${CPAGRIP_WALL_ID}&id=${CPAGRIP_OFFER_ID}`;

/**
 * Direct wall URL:
 * https://ridefiles.net/show.php?l=1&u=1906642&id=63969&tracking_id=${userUid}
 */
export function buildCpaGripWallUrl(uid?: string | null): string {
  const base = process.env.NEXT_PUBLIC_OFFERWALL_URL || CPAGRIP_SHOW_BASE;
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

export type CpaGripOpenResult = { ok: boolean; url?: string; error?: string };

/**
 * Open CPAGrip partners wall in a new tab with Firebase uid as tracking_id.
 * Opening alone never credits coins — CPAGrip /api/postback required.
 */
export function openCpaGripOfferWall(uid?: string | null): CpaGripOpenResult {
  if (typeof window === 'undefined') {
    return { ok: false, error: 'client_only' };
  }
  if (!uid) {
    return { ok: false, error: 'Sign in to open offer partners.' };
  }

  const url = buildCpaGripWallUrl(uid);
  try {
    const win = window.open(url, '_blank', 'noopener,noreferrer');
    if (win) return { ok: true, url };
    window.location.assign(url);
    return { ok: true, url };
  } catch {
    return { ok: false, error: 'Could not open offer partners (popup blocked).' };
  }
}
