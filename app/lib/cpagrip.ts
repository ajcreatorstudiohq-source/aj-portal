/**
 * CPAGrip Offer Wall config + helpers.
 * Wall ID 1906642 — ridefiles.net script_include.
 * Coins credit ONLY via /api/postback (never on link open).
 */

export const CPAGRIP_WALL_ID = '1906642';
export const CPAGRIP_SCRIPT_URL = `https://ridefiles.net/script_include.php?id=${CPAGRIP_WALL_ID}`;
export const CPAGRIP_WALL_PAGE = '/offerwall';
export const CPAGRIP_DEFAULT_WALL_URL = CPAGRIP_SCRIPT_URL;

/** Direct wall URL with Firebase uid as tracking_id for postback attribution */
export function buildCpaGripWallUrl(uid?: string | null): string {
  const base =
    process.env.NEXT_PUBLIC_OFFERWALL_URL || CPAGRIP_DEFAULT_WALL_URL;
  try {
    const url = new URL(base);
    if (uid) {
      url.searchParams.set('tracking_id', uid);
      url.searchParams.set('user_id', uid);
      url.searchParams.set('userId', uid);
    }
    return url.toString();
  } catch {
    if (!uid) return base;
    const sep = base.includes('?') ? '&' : '?';
    return `${base}${sep}tracking_id=${encodeURIComponent(uid)}&userId=${encodeURIComponent(uid)}`;
  }
}

export type CpaGripOpenResult = { ok: boolean; mode?: 'portal' | 'direct'; error?: string };

/**
 * Open CPAGrip partners wall via /offerwall (script hosts there).
 * Opening alone never credits coins — postback required.
 */
export function openCpaGripOfferWall(uid?: string | null): CpaGripOpenResult {
  if (typeof window === 'undefined') {
    return { ok: false, error: 'client_only' };
  }
  if (!uid) {
    return { ok: false, error: 'Sign in to open offer partners.' };
  }

  const portal = `${CPAGRIP_WALL_PAGE}?uid=${encodeURIComponent(uid)}`;
  try {
    const win = window.open(portal, '_blank', 'noopener,noreferrer');
    if (win) return { ok: true, mode: 'portal' };
  } catch {
    /* fall through */
  }

  try {
    const direct = buildCpaGripWallUrl(uid);
    const win = window.open(direct, '_blank', 'noopener,noreferrer');
    if (win) return { ok: true, mode: 'direct' };
  } catch {
    /* fall through */
  }

  try {
    window.location.assign(portal);
    return { ok: true, mode: 'portal' };
  } catch {
    return { ok: false, error: 'Could not open offer partners (popup blocked).' };
  }
}
