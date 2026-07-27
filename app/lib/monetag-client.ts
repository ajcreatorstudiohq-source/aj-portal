/**
 * Shared Monetag SDK loader + interstitial / rewarded show helpers.
 * Zone 11377822 only — rewarded interstitial (type:end).
 * Never uses push / pop / inApp / popunder / gozen formats.
 *
 * Reward rule: coins ONLY when the SDK Promise resolves (onReward).
 * Opening / starting an ad alone = 0 coins.
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

/** If SDK does not open an ad within this window, UI must reset loading */
export const SDK_TRIGGER_TIMEOUT_MS = 5000;
const PRELOAD_TIMEOUT_MS = 2500;
const SDK_WAIT_MS = 5000;
/** Max wait for onReward after ad has opened (user finishes video) */
const REWARD_WAIT_MS = 120000;

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
        'iframe[src*="nap5k"],iframe[src*="monetag"],iframe[src*="mdn201"],iframe[src*="gozen"],iframe[id*="google_ads"],div[id*="ad_iframe"]'
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
 * Uses data-sdk so MultiTag does not auto-fire push / IPP.
 */
export function ensureMonetagSdkLoaded(
  zoneId: number = MONETAG_INTERSTITIAL_ZONE
): Promise<boolean> {
  if (typeof window === 'undefined') return Promise.resolve(false);

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
  /** Called when SDK opens the ad unit (before onReward) */
  onTriggered?: () => void;
  /** Called when user finishes the video (Monetag Promise resolve = onReward) */
  onReward?: () => void;
};

function asPromise(result: unknown): Promise<unknown> {
  if (result && typeof (result as Promise<unknown>).then === 'function') {
    return result as Promise<unknown>;
  }
  return Promise.reject(new Error('monetag_no_promise'));
}

export type MonetagShowResult = {
  /** SDK opened an ad unit within the trigger window */
  triggered: boolean;
  /** User completed the video — Monetag onReward / Promise resolve */
  rewarded: boolean;
};

/**
 * Show Monetag rewarded interstitial.
 * - Trigger must happen within SDK_TRIGGER_TIMEOUT_MS (5s) or returns not triggered.
 * - `rewarded: true` ONLY when SDK Promise resolves (onReward / video finished).
 * - Opening the ad alone never implies rewarded.
 */
export function triggerMonetagInterstitialAd(
  zoneId: number = MONETAG_INTERSTITIAL_ZONE,
  opts: MonetagShowOptions = {}
): Promise<boolean> {
  return showMonetagRewarded(zoneId, opts).then((r) => r.rewarded);
}

export function showMonetagRewarded(
  zoneId: number = MONETAG_INTERSTITIAL_ZONE,
  opts: MonetagShowOptions = {}
): Promise<MonetagShowResult> {
  return withTimeout(
    new Promise<MonetagShowResult>((resolve) => {
      (async () => {
        try {
          if (typeof window === 'undefined') {
            resolve({ triggered: false, rewarded: false });
            return;
          }

          const sdkOk = await ensureMonetagSdkLoaded(zoneId);
          if (!sdkOk) {
            resolve({ triggered: false, rewarded: false });
            return;
          }

          const nowGate = Date.now();
          if (!opts.force && nowGate - lastAnyAdShownTime < AD_COOLDOWN_MS) {
            resolve({ triggered: false, rewarded: false });
            return;
          }
          realAdFiredThisCycle = false;

          const showFn = await waitForMonetagShowFn(zoneId, SDK_WAIT_MS);
          if (typeof showFn !== 'function') {
            console.warn(`[Monetag] show_${zoneId} unavailable`);
            resolve({ triggered: false, rewarded: false });
            return;
          }

          const requestVar = opts.requestVar || 'rewarded_video';
          const ymid = opts.ymid || `aj_${Date.now()}`;
          const common = { requestVar, ymid };

          // Best-effort preload — never hang UI
          await withTimeout(
            asPromise(
              showFn({
                type: 'preload',
                timeout: 5,
                ...common,
              })
            )
              .then(() => true)
              .catch(() => false),
            PRELOAD_TIMEOUT_MS,
            () => false
          );

          if (!opts.force && Date.now() - lastAnyAdShownTime < AD_COOLDOWN_MS) {
            resolve({ triggered: false, rewarded: false });
            return;
          }

          let settled = false;
          let triggered = false;
          const finish = (result: MonetagShowResult) => {
            if (settled) return;
            settled = true;
            resolve(result);
          };

          const triggerWatch = window.setTimeout(() => {
            if (!triggered) {
              cleanupMonetagDom();
              finish({ triggered: false, rewarded: false });
            }
          }, SDK_TRIGGER_TIMEOUT_MS);

          let showResult: unknown;
          try {
            showResult = showFn({
              type: 'end',
              ...common,
            });
            // Calling showFn without throw = SDK accepted the request (triggered)
            triggered = true;
            window.clearTimeout(triggerWatch);
            try {
              opts.onTriggered?.();
            } catch {
              /* ignore */
            }
          } catch {
            window.clearTimeout(triggerWatch);
            cleanupMonetagDom();
            finish({ triggered: false, rewarded: false });
            return;
          }

          if (settled) return;

          // onReward = Monetag Promise resolve after full video
          const rewarded = await withTimeout(
            asPromise(showResult)
              .then(() => {
                try {
                  opts.onReward?.();
                } catch {
                  /* ignore */
                }
                return true;
              })
              .catch(() => false),
            REWARD_WAIT_MS,
            () => false
          );

          if (settled) return;

          if (rewarded) {
            lastAnyAdShownTime = Date.now();
            lastInterstitialAdTime = lastAnyAdShownTime;
            realAdFiredThisCycle = true;
            stripIntrusiveAdNodes();
            finish({ triggered: true, rewarded: true });
          } else {
            // Soft cooldown so user can retry soon without spam
            lastAnyAdShownTime = Date.now() - (AD_COOLDOWN_MS - 30000);
            cleanupMonetagDom();
            finish({ triggered: true, rewarded: false });
          }
        } catch (e) {
          console.warn('[Monetag] showMonetagRewarded error:', e);
          cleanupMonetagDom();
          resolve({ triggered: false, rewarded: false });
        }
      })();
    }),
    SDK_TRIGGER_TIMEOUT_MS + REWARD_WAIT_MS + 2000,
    () => {
      cleanupMonetagDom();
      return { triggered: false, rewarded: false };
    }
  );
}

/** Dedicated rewarded-video helper (always force=true, zone 11377822 by default). */
export async function showRewardedVideoAd(opts: {
  zoneId?: number;
  requestVar?: string;
  ymid?: string;
  onTriggered?: () => void;
  onReward?: () => void;
} = {}): Promise<boolean> {
  const zoneId = opts.zoneId ?? MONETAG_INTERSTITIAL_ZONE;
  await ensureMonetagSdkLoaded(zoneId);
  const result = await showMonetagRewarded(zoneId, {
    force: true,
    requestVar: opts.requestVar || 'offerwall_rewarded',
    ymid: opts.ymid,
    onTriggered: opts.onTriggered,
    onReward: opts.onReward,
  });
  return result.rewarded;
}

export function triggerInterstitialAd(force = false) {
  try {
    if (typeof window === 'undefined') return;
    const now = Date.now();
    if (!force && now - lastInterstitialAdTime < AD_COOLDOWN_MS) return;
    if (!force && now - lastAnyAdShownTime < AD_COOLDOWN_MS) return;
    lastInterstitialAdTime = now;
    ensureMonetagSdkLoaded(MONETAG_INTERSTITIAL_ZONE).then(() => {
      showMonetagRewarded(MONETAG_INTERSTITIAL_ZONE, { force }).catch(() => {});
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
      .then(() => showMonetagRewarded(MONETAG_INTERSTITIAL_ZONE, { force: true }))
      .then((r) => {
        if (!r.rewarded) cleanupMonetagDom();
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
