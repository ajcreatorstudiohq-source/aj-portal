/**
 * Direct download / Earn & Play — Adsterra bridge (NO CPAGrip lockers).
 *
 * STEP 1: Open Adsterra Direct Link in a NEW TAB (owner revenue).
 * STEP 2: Open / navigate to the game.
 */

import { ADSTERRA_REWARDED_LINK, openAdsterraDirectLink } from './ads-config';

export { ADSTERRA_REWARDED_LINK as ADSTERRA_DIRECT_LINK };

function openAdsterraNewTab(): void {
  openAdsterraDirectLink();
}

/**
 * Earn & Play: Adsterra new tab + game new tab (portal stays open for Watch Ads).
 * Credits 0 AJ Coins on click — tracking via ad-client.
 */
export function handleEarnAndPlayGame(gameUrl: string): { ok: boolean; error?: string } {
  if (typeof window === 'undefined') {
    return { ok: false, error: 'client_only' };
  }
  const target = String(gameUrl || '').trim();
  if (!target) return { ok: false, error: 'missing_game_url' };

  openAdsterraNewTab();

  try {
    const gameWin = window.open(target, '_blank', 'noopener,noreferrer');
    if (!gameWin) {
      window.location.assign(target);
    }
    return { ok: true };
  } catch {
    try {
      window.location.assign(target);
      return { ok: true };
    } catch {
      return { ok: false, error: 'download_failed' };
    }
  }
}

/**
 * Legacy: Adsterra new tab, then load game in CURRENT tab.
 */
export function handleDirectDownload(gameUrl: string): { ok: boolean; error?: string } {
  if (typeof window === 'undefined') {
    return { ok: false, error: 'client_only' };
  }

  const target = String(gameUrl || '').trim();
  if (!target) {
    return { ok: false, error: 'missing_game_url' };
  }

  openAdsterraNewTab();

  try {
    window.location.assign(target);
    return { ok: true };
  } catch {
    try {
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
