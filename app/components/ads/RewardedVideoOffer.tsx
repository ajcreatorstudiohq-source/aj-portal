'use client';

import { useCallback, useEffect, useState } from 'react';
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
  showRewardedVideoAd,
} from '../../lib/monetag-client';
import { startIntrusiveAdGuard } from '../../lib/ad-guards';

type Props = {
  user: { uid: string; getIdToken: () => Promise<string> } | null;
  onAlert: (msg: string, icon?: string) => void;
  onRefreshUser?: () => void;
};

/**
 * Offerwall rewarded video — Monetag zone 11377822.
 * Coins credit ONLY after SDK success callback (networkShown).
 * Button spinner always clears (hard timeout).
 */
export default function RewardedVideoOffer({ user, onAlert, onRefreshUser }: Props) {
  const [busy, setBusy] = useState(false);
  const [sdkReady, setSdkReady] = useState(false);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [lastWatchAt, setLastWatchAt] = useState(0);

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

  const watch = useCallback(async () => {
    if (!user) return onAlert('Please sign in to earn from video ads', '🔒');
    if (busy) return;
    const now = Date.now();
    if (now - lastWatchAt < REWARDED_VIDEO_COOLDOWN_MS) {
      const wait = Math.ceil((REWARDED_VIDEO_COOLDOWN_MS - (now - lastWatchAt)) / 1000);
      return onAlert(`Please wait ${wait}s before another video`, '⏱️');
    }

    setBusy(true);
    const hardStop = window.setTimeout(() => {
      setBusy(false);
      cleanupMonetagDom();
      onAlert('Ad timed out (5s). Try again — no coins without a completed video.', '⏱️');
    }, 5000);

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

      await trackAdEvent(
        {
          event: 'impression',
          placement: 'offerwall_rewarded_video',
          zoneId: MONETAG_INTERSTITIAL_ZONE,
          meta: { sessionId: prep.sessionId, phase: 'prepare' },
        },
        user
      );

      const shown = await showRewardedVideoAd({
        zoneId: MONETAG_INTERSTITIAL_ZONE,
        requestVar: 'offerwall_rewarded',
        ymid: `${user.uid}_${prep.sessionId}`,
      });

      await trackAdEvent(
        {
          event: shown ? 'complete' : 'fail',
          placement: 'offerwall_rewarded_video',
          zoneId: MONETAG_INTERSTITIAL_ZONE,
          meta: { sessionId: prep.sessionId, networkShown: shown },
        },
        user
      );

      if (!shown) {
        cleanupMonetagDom();
        setLastWatchAt(Date.now());
        onAlert(
          'Video ad did not complete. Watch the full ad to earn coins — no free credit.',
          '📺'
        );
        return;
      }

      const result = await completeRewardedVideo(user, prep.sessionId, {
        placement: 'offerwall_rewarded_video',
        networkShown: true,
        meta: { zoneId: MONETAG_INTERSTITIAL_ZONE, verified: true },
      });

      cleanupMonetagDom();
      setLastWatchAt(Date.now());

      if (!result.ok) {
        onAlert(
          result.error === 'ad_not_verified'
            ? 'Ad was not verified. No coins credited.'
            : result.error || 'Reward failed',
          '⚠️'
        );
        return;
      }
      if (typeof result.remainingToday === 'number') setRemaining(result.remainingToday);
      onAlert(
        result.message || `+${result.creditedCoins || 0} AJ Coins for watching the video!`,
        result.duplicate ? 'ℹ️' : '💰'
      );
      onRefreshUser?.();
    } catch (e: unknown) {
      cleanupMonetagDom();
      onAlert(e instanceof Error ? e.message : 'Video ad failed', '⚠️');
    } finally {
      window.clearTimeout(hardStop);
      setBusy(false);
    }
  }, [user, busy, lastWatchAt, onAlert, onRefreshUser]);

  return (
    <div className="rounded-2xl border border-cyan-500/30 bg-gradient-to-br from-cyan-950/40 to-blue-950/40 p-4 space-y-3">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-400/30 flex items-center justify-center shrink-0">
          <Play size={18} className="text-cyan-300" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-black text-white">Watch Rewarded Video</p>
          <p className="text-[11px] text-gray-300 leading-relaxed mt-0.5">
            Watch a full verified video ad to earn{' '}
            <span className="text-amber-300 font-bold">AJ Coins</span>. No credit until the ad
            finishes.
          </p>
          <p className="text-[9px] text-gray-500 mt-1">
            Zone {MONETAG_INTERSTITIAL_ZONE} · up to {OFFERWALL_VIDEO_MAX_DAILY}/day
            {remaining != null ? ` · ${remaining} left today` : ''}
            {!sdkReady ? ' · loading ad SDK…' : ' · ready'}
          </p>
        </div>
      </div>
      <button
        type="button"
        disabled={busy || !user}
        onClick={watch}
        className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-400 to-blue-500 text-black text-xs font-black flex items-center justify-center gap-2 disabled:opacity-50 active:scale-[0.98]"
      >
        {busy ? (
          <>
            <Loader2 size={14} className="animate-spin" /> Showing video…
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
