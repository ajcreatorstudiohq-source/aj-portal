'use client';

import { useCallback, useState } from 'react';
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
  triggerMonetagInterstitialAd,
} from '../../lib/monetag-client';

type Props = {
  user: { uid: string; getIdToken: () => Promise<string> } | null;
  onAlert: (msg: string, icon?: string) => void;
  onRefreshUser?: () => void;
};

/**
 * Dedicated Offerwall rewarded-video option.
 * prepare → Monetag show → complete → $1–$1.50 split via offerwall_video.
 */
export default function RewardedVideoOffer({ user, onAlert, onRefreshUser }: Props) {
  const [busy, setBusy] = useState(false);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [lastWatchAt, setLastWatchAt] = useState(0);

  const watch = useCallback(async () => {
    if (!user) return onAlert('Please sign in to earn from video ads', '🔒');
    if (busy) return;
    const now = Date.now();
    if (now - lastWatchAt < REWARDED_VIDEO_COOLDOWN_MS) {
      const wait = Math.ceil((REWARDED_VIDEO_COOLDOWN_MS - (now - lastWatchAt)) / 1000);
      return onAlert(`Please wait ${wait}s before another video`, '⏱️');
    }

    setBusy(true);
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

      ensureMonetagSdkLoaded(MONETAG_INTERSTITIAL_ZONE);
      // force:true — rewarded path owns its own cooldown (not hub interstitial gate)
      const shown = await triggerMonetagInterstitialAd(MONETAG_INTERSTITIAL_ZONE, {
        force: true,
        requestVar: 'offerwall_rewarded',
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

      const result = await completeRewardedVideo(user, prep.sessionId, {
        placement: 'offerwall_rewarded_video',
        networkShown: shown,
        meta: { zoneId: MONETAG_INTERSTITIAL_ZONE },
      });

      cleanupMonetagDom();
      setLastWatchAt(Date.now());

      if (!result.ok) {
        onAlert(result.error || 'Reward failed', '⚠️');
        return;
      }
      if (typeof result.remainingToday === 'number') setRemaining(result.remainingToday);
      onAlert(
        result.message ||
          `+${result.creditedCoins || 0} AJ Coins ($${Number(result.userUsd || 0).toFixed(2)})`,
        result.duplicate ? 'ℹ️' : '💰'
      );
      onRefreshUser?.();
    } catch (e: unknown) {
      cleanupMonetagDom();
      onAlert(e instanceof Error ? e.message : 'Video ad failed', '⚠️');
    } finally {
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
            Complete a verified video ad to earn{' '}
            <span className="text-amber-300 font-bold">$1.00–$1.50</span> in AJ Coins.
            Of each <span className="text-white font-bold">$5–$7</span> pool, the rest is
            platform revenue.
          </p>
          <p className="text-[9px] text-gray-500 mt-1">
            Up to {OFFERWALL_VIDEO_MAX_DAILY}/day
            {remaining != null ? ` · ${remaining} left today` : ''}
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
