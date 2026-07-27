/**
 * Direct download earning — Adsterra bridge (NO CPAGrip lockers).
 *
 * STEP 1: Open Adsterra Direct Link in a NEW TAB (owner revenue).
 * STEP 2: Navigate / download the game in the CURRENT TAB immediately.
 */

import { ADSTERRA_REWARDED_LINK } from './ads-config';

export { ADSTERRA_REWARDED_LINK as ADSTERRA_DIRECT_LINK };

/**
 * Open Adsterra in a new tab, then load `gameUrl` in the current tab.
 * Never opens ridefiles / locker pages. Credits 0 AJ Coins on click.
 */
export function handleDirectDownload(gameUrl: string): { ok: boolean; error?: string } {
  if (typeof window === 'undefined') {
    return { ok: false, error: 'client_only' };
  }

  const target = String(gameUrl || '').trim();
  if (!target) {
    return { ok: false, error: 'missing_game_url' };
  }

  // STEP 1 — Adsterra Direct Link (new tab)
  try {
    const adWin = window.open(ADSTERRA_REWARDED_LINK, '_blank', 'noopener,noreferrer');
    if (!adWin) {
      // Popup blocked — still proceed with game so UX isn't stuck
      console.warn('[AJ] Adsterra popup blocked — continuing with game download');
    }
  } catch (e) {
    console.warn('[AJ] Adsterra open failed', e);
  }

  // STEP 2 — Game / APK in current tab (immediate)
  try {
    // Prefer same-tab navigation for HTML games / Netlify URLs
    window.location.assign(target);
    return { ok: true };
  } catch {
    try {
      // Fallback: hidden anchor (works for same-origin APK / file URLs)
      const a = document.createElement('a');
      a.href = target;
      a.rel = 'noopener noreferrer';
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      a.remove();
      return { ok: true };
    } catch {
      return { ok: false, error: 'download_failed' };
    }
  }
}
