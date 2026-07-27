'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Play, Loader2 } from 'lucide-react';
import {
  MONETAG_INTERSTITIAL_ZONE,
  OFFERWALL_VIDEO_MAX_DAILY,
  REWARDED_VIDEO_COOLDOWN_MS,
} from '../../lib/ads-config';
import {
  completeRewardedVideo,
  prepareRewardedVideo,
  trackAdEvent,
} from '../../lib/ad-client';
import {
  cleanupMonetagDom,
  ensureMonetagSdkLoaded,
  SDK_TRIGGER_TIMEOUT_MS,
} from '../../lib/monetag-client';
import { REWARDED_VIDEO_COINS } from '../../lib/reward-sources';
import { guardClick, startIntrusiveAdGuard } from '../../lib/ad-guards';

type Props = {
  user: { uid: string; getIdToken: () => Promise<string> } | null;
  onAlert: (msg: string, icon?: string) => void;
  onRefreshUser?: () => void;
};

type ShowFn = (opts?: Record<string, unknown> | string) => unknown;

/**
 * Official Monetag Rewarded Interstitial for Zone 11377822.
 * ONLY uses show_11377822({ type: 'end' }) — never pop / inApp / push.
 * Credits +20 AJ Coins ONLY when SDK status is 'completed'.
 */
export default function RewardedVideoOffer({ user, onAlert, onRefreshUser }: Props) {
  const [busy, setBusy] = useState(false);
  const [phase, setPhase] = useState<'idle' | 'loading' | 'watching'>('idle');
  const [sdkReady, setSdkReady] = useState(false);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [lastWatchAt, setLastWatchAt] = useState(0);
  const watchingRef = useRef(false);

  useEffect(() => {
    startIntrusiveAdGuard();
    let cancelled = false;
    ensureMonetagSdkLoaded(MONETAG_INTERSTITIAL_ZONE)
      .then((ok) => {
        if (!cancelled) setSdkReady(ok);
      })
      .catch(() => {
        if (!cancelled) setSdkReady(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  /**
   * handleWatchAd — official Monetag SDK only.
   * 1) stopPropagation so popunders cannot steal the click
   * 2) show_11377822({ type: 'end' })
   * 3) credit 20 AJ Coins only when status === 'completed'
   */
  const handleWatchAd = useCallback(
    async (e?: { preventDefault?: () => void; stopPropagation?: () => void }) => {
      guardClick(e);
      if (!user) return onAlert('Please sign in to earn from video ads', '🔒');
      if (busy || watchingRef.current) return;

      const now = Date.now();
      if (now - lastWatchAt < REWARDED_VIDEO_COOLDOWN_MS) {
        const wait = Math.ceil((REWARDED_VIDEO_COOLDOWN_MS - (now - lastWatchAt)) / 1000);
        return onAlert(`Please wait ${wait}s before another video`, '⏱️');
      }

      setBusy(true);
      setPhase('loading');
      watchingRef.current = false;

      const hardStop = window.setTimeout(() => {
        if (!watchingRef.current) {
          setBusy(false);
          setPhase('idle');
          cleanupMonetagDom();
          onAlert('Ad timed out (5s). No AJ Coins — try again.', '⏱️');
        }
      }, SDK_TRIGGER_TIMEOUT_MS);

      try {
        const prep = await prepareRewardedVideo(user, 'offerwall_rewarded_video');
        if (!prep.ok || !prep.sessionId) {
          onAlert(
            prep.error === 'daily_limit'
              ? `Daily video limit reached (${OFFERWALL_VIDEO_MAX_DAILY}).`
              : prep.error || 'Could not start video session',
            '⚠️'
          );
          return;
        }
        if (typeof prep.remainingToday === 'number') setRemaining(prep.remainingToday);

        const sdkOk = await ensureMonetagSdkLoaded(MONETAG_INTERSTITIAL_ZONE);
        if (!sdkOk) {
          onAlert('Monetag SDK failed to load. Try again.', '⚠️');
          return;
        }

        const fnName = `show_${MONETAG_INTERSTITIAL_ZONE}`;
        const showFn = (window as unknown as Record<string, unknown>)[fnName] as ShowFn | undefined;
        if (typeof showFn !== 'function') {
          onAlert(`Official Monetag SDK show_${MONETAG_INTERSTITIAL_ZONE} unavailable.`, '⚠️');
          return;
        }

        await trackAdEvent(
          {
            event: 'impression',
            placement: 'offerwall_rewarded_video',
            zoneId: MONETAG_INTERSTITIAL_ZONE,
            meta: { sessionId: prep.sessionId, phase: 'prepare', sdk: fnName },
          },
          user
        );

        const ymid = `${user.uid}_${prep.sessionId}`;
        const requestVar = 'offerwall_rewarded';

        // Optional preload (never shows popunder)
        try {
          const preload = showFn({ type: 'preload', timeout: 5, requestVar, ymid });
          if (preload && typeof (preload as Promise<unknown>).then === 'function') {
            await Promise.race([
              (preload as Promise<unknown>).catch(() => null),
              new Promise((r) => setTimeout(r, 2500)),
            ]);
          }
        } catch {
          /* preload optional */
        }

        // Official Rewarded Interstitial — type:'end' ONLY (never 'pop' / 'inApp')
        let adPromise: Promise<unknown>;
        try {
          const raw = showFn({
            type: 'end',
            requestVar,
            ymid,
          });
          if (!raw || typeof (raw as Promise<unknown>).then !== 'function') {
            cleanupMonetagDom();
            onAlert('Monetag did not return a Promise. No AJ Coins credited.', '⚠️');
            return;
          }
          adPromise = raw as Promise<unknown>;
        } catch {
          cleanupMonetagDom();
          onAlert('Monetag failed to open the rewarded video.', '⚠️');
          return;
        }

        watchingRef.current = true;
        window.clearTimeout(hardStop);
        setPhase('watching');
        setBusy(false);

        // Strict callback: completed ONLY when Promise resolves (ad shown + closed)
        let status: 'completed' | 'failed' = 'failed';
        let sdkResult: Record<string, unknown> | null = null;
        try {
          const resolved = await Promise.race([
            adPromise.then((result) => {
              sdkResult = (result && typeof result === 'object'
                ? (result as Record<string, unknown>)
                : {}) as Record<string, unknown>;
              return 'completed' as const;
            }),
            new Promise<'failed'>((resolve) => {
              window.setTimeout(() => resolve('failed'), 120000);
            }),
          ]);
          status = resolved === 'completed' ? 'completed' : 'failed';
        } catch {
          status = 'failed';
        }

        await trackAdEvent(
          {
            event: status === 'completed' ? 'complete' : 'fail',
            placement: 'offerwall_rewarded_video',
            zoneId: MONETAG_INTERSTITIAL_ZONE,
            meta: {
              sessionId: prep.sessionId,
              status,
              reward_event_type: sdkResult?.reward_event_type ?? null,
            },
          },
          user
        );

        if (status !== 'completed') {
          cleanupMonetagDom();
          setLastWatchAt(Date.now());
          onAlert(
            'Video was not completed. Watch the full ad to earn AJ Coins 🪙 — opening alone = 0 coins.',
            '📺'
          );
          return;
        }

        // Credit ONLY when status is 'completed' — server uses Firestore increment(20)
        const credit = await completeRewardedVideo(user, prep.sessionId, {
          placement: 'offerwall_rewarded_video',
          networkShown: true,
          status: 'completed',
          meta: {
            zoneId: MONETAG_INTERSTITIAL_ZONE,
            verified: true,
            status: 'completed',
            reward_event_type: sdkResult?.reward_event_type ?? 'valued',
            via: 'handleWatchAd_show_11377822_type_end',
          },
        });

        cleanupMonetagDom();
        setLastWatchAt(Date.now());

        if (!credit.ok) {
          onAlert(
            credit.error === 'ad_not_verified' || credit.error === 'status_required'
              ? 'Ad was not verified as completed. No coins credited.'
              : credit.error || 'Reward failed',
            '⚠️'
          );
          return;
        }
        if (typeof credit.remainingToday === 'number') setRemaining(credit.remainingToday);
        onAlert(
          credit.message ||
            `+${credit.creditedCoins || REWARDED_VIDEO_COINS} AJ Coins 🪙 for completing the video!`,
          credit.duplicate ? 'ℹ️' : '💰'
        );
        onRefreshUser?.();
      } catch (err: unknown) {
        cleanupMonetagDom();
        onAlert(err instanceof Error ? err.message : 'Video ad failed', '⚠️');
      } finally {
        window.clearTimeout(hardStop);
        watchingRef.current = false;
        setBusy(false);
        setPhase('idle');
      }
    },
    [user, busy, lastWatchAt, onAlert, onRefreshUser]
  );

  return (
    <div className="rounded-2xl border border-cyan-500/30 bg-gradient-to-br from-cyan-950/40 to-blue-950/40 p-4 space-y-3">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-400/30 flex items-center justify-center shrink-0">
          <Play size={18} className="text-cyan-300" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-black text-white">Watch Rewarded Video</p>
          <p className="text-[11px] text-gray-300 leading-relaxed mt-0.5">
            Official Monetag zone {MONETAG_INTERSTITIAL_ZONE}. Earn{' '}
            <span className="text-amber-300 font-bold">+{REWARDED_VIDEO_COINS} AJ Coins 🪙</span>{' '}
            only when status is <span className="text-cyan-300 font-bold">completed</span>.
          </p>
          <p className="text-[9px] text-gray-500 mt-1">
            show_{MONETAG_INTERSTITIAL_ZONE} · type:end · up to {OFFERWALL_VIDEO_MAX_DAILY}/day
            {remaining != null ? ` · ${remaining} left today` : ''}
            {!sdkReady ? ' · loading SDK…' : phase === 'watching' ? ' · watching…' : ' · ready'}
          </p>
        </div>
      </div>
      <button
        type="button"
        disabled={busy || !user || phase === 'watching'}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          void handleWatchAd(e);
        }}
        className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-400 to-blue-500 text-black text-xs font-black flex items-center justify-center gap-2 disabled:opacity-50 active:scale-[0.98]"
      >
        {busy || phase === 'loading' ? (
          <>
            <Loader2 size={14} className="animate-spin" /> Opening video…
          </>
        ) : phase === 'watching' ? (
          <>
            <Loader2 size={14} className="animate-spin" /> Finish video to earn…
          </>
        ) : (
          <>
            <Play size={14} /> Watch & Earn
          </>
        )}
      </button>
    </div>
  );
}
