/**
 * Shared Monetag SDK loader + interstitial trigger with global cooldowns.
 * Used by hub overlays, offerwall rewarded video, and game transitions.
 */
import {
  AD_COOLDOWN_MS,
  MONETAG_INTERSTITIAL_ZONE,
  MONETAG_TAG_URL,
  MONETAG_TAG_URLS,
} from './ads-config';

const monetagSdkLoadedZones: Set<number> = new Set();

let lastAnyAdShownTime = 0;
let lastInterstitialAdTime = 0;
let lastFreeCoinAdTime = 0;
let lastInFeedPopupTime = 0;
let realAdFiredThisCycle = false;
let pendingNavAfterAd: (() => void) | null = null;

export function getLastAnyAdShownTime() {
  return lastAnyAdShownTime;
}
export function setLastAnyAdShownTime(ts: number) {
  lastAnyAdShownTime = ts;
}
export function getLastInterstitialAdTime() {
  return lastInterstitialAdTime;
}
export function setLastInterstitialAdTime(ts: number) {
  lastInterstitialAdTime = ts;
}
export function isAdCooldownActive(now = Date.now()) {
  return now - lastAnyAdShownTime < AD_COOLDOWN_MS;
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
        'iframe[src*="nap5k"],iframe[src*="monetag"],iframe[src*="mdn201"],iframe[id*="google_ads"],div[id*="ad_iframe"]'
      )
      .forEach((node) => {
        try {
          node.remove();
        } catch {
          /* ignore */
        }
      });
    document.documentElement.style.overflow = '';
    document.body.style.overflow = '';
    document.body.style.pointerEvents = '';
  } catch {
    /* ignore */
  }
}

export function ensureMonetagSdkLoaded(zoneId: number = MONETAG_INTERSTITIAL_ZONE): void {
  if (typeof window === 'undefined') return;
  if (monetagSdkLoadedZones.has(zoneId)) return;

  const existing = document.querySelector(`script[data-zone="${zoneId}"][data-sdk]`);
  if (existing) {
    monetagSdkLoadedZones.add(zoneId);
    return;
  }

  try {
    const sdkScript = document.createElement('script');
    sdkScript.async = true;
    sdkScript.setAttribute('data-zone', String(zoneId));
    sdkScript.setAttribute('data-sdk', `show_${zoneId}`);
    sdkScript.src = MONETAG_TAG_URLS[zoneId] || MONETAG_TAG_URL;
    sdkScript.onerror = () => {
      console.warn(`[Monetag] SDK script failed to load for zone ${zoneId}`);
    };
    document.head.appendChild(sdkScript);
    monetagSdkLoadedZones.add(zoneId);
  } catch (e) {
    console.warn('[Monetag] ensureMonetagSdkLoaded error:', e);
  }
}

export function waitForMonetagShowFn(
  zoneId: number,
  maxWaitMs = 15000
): Promise<((opts?: Record<string, unknown>) => unknown) | null> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') {
      resolve(null);
      return;
    }
    const fnName = `show_${zoneId}`;
    const w = window as unknown as Record<string, unknown>;
    if (typeof w[fnName] === 'function') {
      resolve(w[fnName] as (opts?: Record<string, unknown>) => unknown);
      return;
    }
    let elapsed = 0;
    const intervalMs = 300;
    const timer = setInterval(() => {
      elapsed += intervalMs;
      if (typeof w[fnName] === 'function') {
        clearInterval(timer);
        resolve(w[fnName] as (opts?: Record<string, unknown>) => unknown);
      } else if (elapsed >= maxWaitMs) {
        clearInterval(timer);
        resolve(null);
      }
    }, intervalMs);
  });
}

export type MonetagShowOptions = {
  /** When true, bypass global cooldown (offerwall rewarded video only). */
  force?: boolean;
  requestVar?: string;
};

/**
 * Show Monetag rewarded interstitial. Resolves true when the SDK reports a show.
 */
export function triggerMonetagInterstitialAd(
  zoneId: number = MONETAG_INTERSTITIAL_ZONE,
  opts: MonetagShowOptions = {}
): Promise<boolean> {
  return new Promise((resolve) => {
    (async () => {
      try {
        if (typeof window === 'undefined') {
          resolve(false);
          return;
        }

        ensureMonetagSdkLoaded(zoneId);

        const nowGate = Date.now();
        if (!opts.force && nowGate - lastAnyAdShownTime < AD_COOLDOWN_MS) {
          resolve(false);
          return;
        }
        realAdFiredThisCycle = false;

        const showFn = await waitForMonetagShowFn(zoneId, 15000);
        if (typeof showFn !== 'function') {
          const legacy = (window as unknown as Record<string, unknown>).show_9087571;
          if (typeof legacy === 'function') {
            try {
              const result = (legacy as () => unknown)();
              if (result && typeof (result as Promise<unknown>).then === 'function') {
                (result as Promise<unknown>)
                  .then(() => resolve(true))
                  .catch(() => resolve(false));
              } else {
                resolve(true);
              }
              return;
            } catch {
              resolve(false);
              return;
            }
          }
          resolve(false);
          return;
        }

        try {
          await showFn({
            type: 'preload',
            requestVar: opts.requestVar || 'infeed_ad',
            catchIfNoFeed: true,
          });
        } catch {
          /* preload optional */
        }

        if (!opts.force && Date.now() - lastAnyAdShownTime < AD_COOLDOWN_MS) {
          resolve(false);
          return;
        }

        lastAnyAdShownTime = Date.now();
        lastInterstitialAdTime = lastAnyAdShownTime;
        try {
          const showResult = showFn({
            type: 'end',
            requestVar: opts.requestVar || 'rewarded_video',
            catchIfNoFeed: true,
          });
          if (showResult && typeof (showResult as Promise<unknown>).then === 'function') {
            (showResult as Promise<unknown>)
              .then(() => {
                lastAnyAdShownTime = Date.now();
                realAdFiredThisCycle = true;
                resolve(true);
              })
              .catch(() => {
                lastAnyAdShownTime = Date.now() - (AD_COOLDOWN_MS - 30000);
                cleanupMonetagDom();
                resolve(false);
              });
          } else {
            lastAnyAdShownTime = Date.now();
            realAdFiredThisCycle = true;
            resolve(true);
          }
        } catch {
          lastAnyAdShownTime = Date.now() - (AD_COOLDOWN_MS - 30000);
          cleanupMonetagDom();
          resolve(false);
        }
      } catch (e) {
        console.warn('[Monetag] triggerMonetagInterstitialAd error:', e);
        cleanupMonetagDom();
        resolve(false);
      }
    })();
  });
}

export function triggerInterstitialAd(force = false) {
  try {
    if (typeof window === 'undefined') return;
    const now = Date.now();
    if (!force && now - lastInterstitialAdTime < AD_COOLDOWN_MS) return;
    if (!force && now - lastAnyAdShownTime < AD_COOLDOWN_MS) return;
    lastInterstitialAdTime = now;
    ensureMonetagSdkLoaded(MONETAG_INTERSTITIAL_ZONE);
    triggerMonetagInterstitialAd(MONETAG_INTERSTITIAL_ZONE).catch(() => {});
  } catch {
    /* ignore */
  }
}

export function navigateWithAdOverlay(navFn: () => void) {
  const now = Date.now();
  const inCooldown = now - lastInterstitialAdTime < AD_COOLDOWN_MS;
  const globalGate = now - lastAnyAdShownTime < AD_COOLDOWN_MS;
  if (inCooldown || globalGate) {
    navFn();
    return;
  }
  pendingNavAfterAd = navFn;
  lastInterstitialAdTime = now;
  ensureMonetagSdkLoaded(MONETAG_INTERSTITIAL_ZONE);
  if (typeof window !== 'undefined') {
    try {
      (window as unknown as { __AJ_SHOW_INTERSTITIAL?: boolean }).__AJ_SHOW_INTERSTITIAL = true;
      window.dispatchEvent(new Event('aj-show-interstitial'));
    } catch {
      /* ignore */
    }
  }
}

/** @deprecated alias kept for Games "Watch Ad" — no wallet credit */
export function triggerFreeCoinAd() {
  try {
    if (typeof window === 'undefined') return false;
    const now = Date.now();
    if (now - lastFreeCoinAdTime < AD_COOLDOWN_MS) return false;
    if (now - lastAnyAdShownTime < AD_COOLDOWN_MS) return false;
    lastFreeCoinAdTime = now;
    ensureMonetagSdkLoaded(MONETAG_INTERSTITIAL_ZONE);
    triggerMonetagInterstitialAd(MONETAG_INTERSTITIAL_ZONE)
      .then((shown) => {
        if (!shown) cleanupMonetagDom();
      })
      .catch(() => cleanupMonetagDom());
    return true;
  } catch {
    return false;
  }
}

export { AD_COOLDOWN_MS, MONETAG_INTERSTITIAL_ZONE as MONETAG_INTERSTITIAL };

export function markInFeedPopupShown() {
  lastInFeedPopupTime = Date.now();
}
export function getRealAdFiredThisCycle() {
  return realAdFiredThisCycle;
}
