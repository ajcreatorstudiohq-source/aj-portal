/**
 * Monetag client — permanently disabled.
 * Adsterra is the only ad network. These exports remain as no-ops
 * so legacy imports compile without loading nap5k / gozen / etc.
 */
import { AD_COOLDOWN_MS } from './ads-config';
import { stripIntrusiveAdNodes } from './ad-guards';

let pendingNavAfterAd: (() => void) | null = null;

export const SDK_TRIGGER_TIMEOUT_MS = 5000;

export function getLastAnyAdShownTime() {
  return 0;
}
export function setLastAnyAdShownTime(_ts: number) {
  /* no-op */
}
export function getLastInterstitialAdTime() {
  return 0;
}
export function setLastInterstitialAdTime(_ts: number) {
  /* no-op */
}
export function isAdCooldownActive(_now = Date.now()) {
  return false;
}
export function getPendingNavAfterAd() {
  return pendingNavAfterAd;
}
export function setPendingNavAfterAd(fn: (() => void) | null) {
  pendingNavAfterAd = fn;
}
export function consumePendingNavAfterAd() {
  const fn = pendingNavAfterAd;
  pendingNavAfterAd = null;
  return fn;
}

export function cleanupMonetagDom(): void {
  if (typeof document === 'undefined') return;
  try {
    document
      .querySelectorAll(
        'iframe[src*="nap5k"],iframe[src*="monetag"],iframe[src*="gozen"],iframe[src*="alwingulla"],iframe[src*="sunny-sprout"],script[src*="nap5k"],script[src*="monetag"],script[src*="gozen"]'
      )
      .forEach((node) => {
        try {
          node.remove();
        } catch {
          /* ignore */
        }
      });
    stripIntrusiveAdNodes();
    document.documentElement.style.overflow = '';
    document.body.style.overflow = '';
    document.body.style.pointerEvents = '';
  } catch {
    /* ignore */
  }
}

export function ensureMonetagSdkLoaded(_zoneId?: number): Promise<boolean> {
  return Promise.resolve(false);
}

export function waitForMonetagShowFn(
  _zoneId?: number,
  _maxWaitMs?: number
): Promise<null> {
  return Promise.resolve(null);
}

export type MonetagShowOptions = {
  ymid?: string;
  requestVar?: string;
  requestVar2?: string;
  timeoutMs?: number;
  onOpen?: () => void;
  onReward?: () => void;
  onClose?: () => void;
};

export type MonetagShowResult = {
  shown: boolean;
  rewarded: boolean;
};

export function triggerMonetagInterstitialAd(
  _zoneId?: number,
  _opts?: MonetagShowOptions
): Promise<boolean> {
  return Promise.resolve(false);
}

export function showMonetagRewarded(
  _zoneId?: number,
  _opts?: MonetagShowOptions
): Promise<MonetagShowResult> {
  return Promise.resolve({ shown: false, rewarded: false });
}

export async function preloadAndShowRewarded(
  _opts: MonetagShowOptions & { zoneId?: number } = {}
): Promise<MonetagShowResult> {
  return { shown: false, rewarded: false };
}

export function navigateWithAdOverlay(navFn: () => void) {
  try {
    pendingNavAfterAd = null;
    navFn();
  } catch {
    /* ignore */
  }
}

export function triggerFreeCoinAd() {
  return false;
}

export { AD_COOLDOWN_MS };
/** Legacy zone id stub — Monetag disabled */
export const MONETAG_INTERSTITIAL = 0;
