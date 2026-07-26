/**
 * Shared Monetag SDK loader + interstitial / rewarded show helpers.
 * Zone 11377822 only — rewarded interstitial (type:end).
 * Never uses push / pop / inApp / popunder formats.
 */
import {
  AD_COOLDOWN_MS,
  MONETAG_INTERSTITIAL_ZONE,
  MONETAG_TAG_URL,
  MONETAG_TAG_URLS,
} from './ads-config';
import { startIntrusiveAdGuard, stripIntrusiveAdNodes } from './ad-guards';

const monetagSdkLoadedZones: Set<number> = new Set();
const monetagSdkLoading: Map<number, Promise<boolean>> = new Map();

let lastAnyAdShownTime = 0;
let lastInterstitialAdTime = 0;
let lastFreeCoinAdTime = 0;
let lastInFeedPopupTime = 0;
let realAdFiredThisCycle = false;
let pendingNavAfterAd: (() => void) | null = null;

const SHOW_TIMEOUT_MS = 28000;
const PRELOAD_TIMEOUT_MS = 10000;
const SDK_WAIT_MS = 12000;

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
    stripIntrusiveAdNodes();
    document.documentElement.style.overflow = '';
    document.body.style.overflow = '';
    document.body.style.pointerEvents = '';
  } catch {
    /* ignore */
  }
}

type ShowFn = (opts?: Record<string, unknown> | string) => unknown;

function getShowFn(zoneId: number): ShowFn | null {
  if (typeof window === 'undefined') return null;
  const fnName = `show_${zoneId}`;
  const w = window as unknown as Record<string, unknown>;
  return typeof w[fnName] === 'function' ? (w[fnName] as ShowFn) : null;
}

function withTimeout<T>(promise: Promise<T>, ms: number, onTimeout: () => T): Promise<T> {
  return new Promise((resolve) => {
    let settled = false;
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      resolve(onTimeout());
    }, ms);
    promise
      .then((v) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        resolve(v);
      })
      .catch(() => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        resolve(onTimeout());
      });
  });
}

/**
 * Inject Monetag SDK for zone. Resolves true when show_{zoneId} is available.
 */
export function ensureMonetagSdkLoaded(
  zoneId: number = MONETAG_INTERSTITIAL_ZONE
): Promise<boolean> {
  if (typeof window === 'undefined') return Promise.resolve(false);

  // Keep push / IPP / popunder off while SDK loads
  try {
    startIntrusiveAdGuard();
  } catch {
    /* ignore */
  }

  if (getShowFn(zoneId)) {
    monetagSdkLoadedZones.add(zoneId);
    return Promise.resolve(true);
  }

  const inflight = monetagSdkLoading.get(zoneId);
  if (inflight) return inflight;

  const loadPromise = new Promise<boolean>((resolve) => {
    let settled = false;
    const finish = (ok: boolean) => {
      if (settled) return;
      settled = true;
      monetagSdkLoading.delete(zoneId);
      if (ok) monetagSdkLoadedZones.add(zoneId);
      resolve(ok);
    };

    try {
      let script = document.querySelector(
        `script[data-zone="${zoneId}"][data-sdk]`
      ) as HTMLScriptElement | null;

      if (!script) {
        script = document.createElement('script');
        script.async = true;
        script.setAttribute('data-zone', String(zoneId));
        script.setAttribute('data-sdk', `show_${zoneId}`);
        // data-sdk keeps MultiTag auto push/IPP from activating; only show_ZONE API
        script.src = MONETAG_TAG_URLS[zoneId] || MONETAG_TAG_URL;
        document.head.appendChild(script);
      }

      if (getShowFn(zoneId)) {
        finish(true);
        return;
      }

      script.addEventListener('load', () => {
        if (getShowFn(zoneId)) finish(true);
      });
      script.addEventListener('error', () => {
        console.warn(`[Monetag] SDK script failed to load for zone ${zoneId}`);
        finish(false);
      });

      let elapsed = 0;
      const intervalMs = 250;
      const timer = setInterval(() => {
        elapsed += intervalMs;
        if (getShowFn(zoneId)) {
          clearInterval(timer);
          finish(true);
        } else if (elapsed >= SDK_WAIT_MS) {
          clearInterval(timer);
          finish(false);
        }
      }, intervalMs);
    } catch (e) {
      console.warn('[Monetag] ensureMonetagSdkLoaded error:', e);
      finish(false);
    }
  });

  monetagSdkLoading.set(zoneId, loadPromise);
  return loadPromise;
}

export function waitForMonetagShowFn(
  zoneId: number,
  maxWaitMs = SDK_WAIT_MS
): Promise<ShowFn | null> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') {
      resolve(null);
      return;
    }
    const existing = getShowFn(zoneId);
    if (existing) {
      resolve(existing);
      return;
    }
    let elapsed = 0;
    const intervalMs = 250;
    const timer = setInterval(() => {
      elapsed += intervalMs;
      const fn = getShowFn(zoneId);
      if (fn) {
        clearInterval(timer);
        resolve(fn);
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
  /** User / session id for Monetag postback linking */
  ymid?: string;
};

function asPromise(result: unknown): Promise<unknown> {
  if (result && typeof (result as Promise<unknown>).then === 'function') {
    return result as Promise<unknown>;
  }
  return Promise.reject(new Error('monetag_no_promise'));
}

/**
 * Show Monetag rewarded interstitial. Resolves true ONLY when the SDK
 * Promise resolves after the ad is shown and closed. Always settles (timeout).
 */
export function triggerMonetagInterstitialAd(
  zoneId: number = MONETAG_INTERSTITIAL_ZONE,
  opts: MonetagShowOptions = {}
): Promise<boolean> {
  return withTimeout(
    new Promise<boolean>((resolve) => {
      (async () => {
        try {
          if (typeof window === 'undefined') {
            resolve(false);
            return;
          }

          const sdkOk = await ensureMonetagSdkLoaded(zoneId);
          if (!sdkOk) {
            resolve(false);
            return;
          }

          const nowGate = Date.now();
          if (!opts.force && nowGate - lastAnyAdShownTime < AD_COOLDOWN_MS) {
            resolve(false);
            return;
          }
          realAdFiredThisCycle = false;

          const showFn = await waitForMonetagShowFn(zoneId, SDK_WAIT_MS);
          if (typeof showFn !== 'function') {
            console.warn(`[Monetag] show_${zoneId} unavailable`);
            resolve(false);
            return;
          }

          const requestVar = opts.requestVar || 'rewarded_video';
          const ymid = opts.ymid || `aj_${Date.now()}`;
          // IMPORTANT: only type preload / end — never pop, inApp, or push
          const common = { requestVar, ymid };

          // Preload is best-effort; never hang the button spinner
          await withTimeout(
            asPromise(
              showFn({
                type: 'preload',
                timeout: 8,
                ...common,
              })
            )
              .then(() => true)
              .catch(() => false),
            PRELOAD_TIMEOUT_MS,
            () => false
          );

          if (!opts.force && Date.now() - lastAnyAdShownTime < AD_COOLDOWN_MS) {
            resolve(false);
            return;
          }

          const showResult = showFn({
            type: 'end',
            ...common,
          });
          const shown = await withTimeout(
            asPromise(showResult)
              .then(() => true)
              .catch(() => false),
            SHOW_TIMEOUT_MS - 2000,
            () => false
          );
          if (shown) {
            lastAnyAdShownTime = Date.now();
            lastInterstitialAdTime = lastAnyAdShownTime;
            realAdFiredThisCycle = true;
            stripIntrusiveAdNodes();
            resolve(true);
          } else {
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
    }),
    SHOW_TIMEOUT_MS + 4000,
    () => {
      cleanupMonetagDom();
      return false;
    }
  );
}

/** Dedicated rewarded-video helper (always force=true, zone 11377822 by default). */
export async function showRewardedVideoAd(opts: {
  zoneId?: number;
  requestVar?: string;
  ymid?: string;
} = {}): Promise<boolean> {
  const zoneId = opts.zoneId ?? MONETAG_INTERSTITIAL_ZONE;
  await ensureMonetagSdkLoaded(zoneId);
  return triggerMonetagInterstitialAd(zoneId, {
    force: true,
    requestVar: opts.requestVar || 'offerwall_rewarded',
    ymid: opts.ymid,
  });
}

export function triggerInterstitialAd(force = false) {
  try {
    if (typeof window === 'undefined') return;
    const now = Date.now();
    if (!force && now - lastInterstitialAdTime < AD_COOLDOWN_MS) return;
    if (!force && now - lastAnyAdShownTime < AD_COOLDOWN_MS) return;
    lastInterstitialAdTime = now;
    ensureMonetagSdkLoaded(MONETAG_INTERSTITIAL_ZONE).then(() => {
      triggerMonetagInterstitialAd(MONETAG_INTERSTITIAL_ZONE).catch(() => {});
    });
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
    ensureMonetagSdkLoaded(MONETAG_INTERSTITIAL_ZONE)
      .then(() => triggerMonetagInterstitialAd(MONETAG_INTERSTITIAL_ZONE))
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
