'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ExternalLink, Play, Loader2, Gift } from 'lucide-react';
import RewardedVideoOffer from './ads/RewardedVideoOffer';
import BannerAdSlot from './ads/BannerAdSlot';
import {
  GAME_CATALOG,
  type GameCatalogItem,
  type GameProgressDoc,
} from '../lib/economy';
import { openCpaGripOfferWall } from '../lib/cpagrip';
import {
  MONETAG_INTERSTITIAL_ZONE,
  AD_COOLDOWN_MS,
} from '../lib/ads-config';
import { trackAdEvent } from '../lib/ad-client';
import {
  cleanupMonetagDom,
  ensureMonetagSdkLoaded,
  isAdCooldownActive,
  showMonetagRewarded,
  SDK_TRIGGER_TIMEOUT_MS,
} from '../lib/monetag-client';
import { startIntrusiveAdGuard } from '../lib/ad-guards';

type UserLike = { uid: string; getIdToken: () => Promise<string>; email?: string | null } | null;

type Props = {
  user: UserLike;
  unlockedGames: string[];
  gameProgress: Record<string, GameProgressDoc>;
  onAlert: (msg: string, icon?: string) => void;
  onRefreshUser?: () => void;
  onOpenGames?: () => void;
};

/**
 * Hub dashboard earn module — rewarded video, Monetag interstitial, offerwall, game unlocks.
 * Portal APK "Download App" section intentionally removed.
 */
export default function HubEarnPanel({
  user,
  unlockedGames,
  gameProgress,
  onAlert,
  onRefreshUser,
  onOpenGames,
}: Props) {
  const [installBusy, setInstallBusy] = useState<string | null>(null);
  const [adBusy, setAdBusy] = useState(false);
  const [downloadPct, setDownloadPct] = useState<Record<string, number>>({});
  const interstitialTriggeredRef = useRef(false);

  useEffect(() => {
    startIntrusiveAdGuard();
    ensureMonetagSdkLoaded(MONETAG_INTERSTITIAL_ZONE).catch(() => {});
    trackAdEvent(
      {
        event: 'impression',
        placement: 'hub_nav_interstitial',
        zoneId: MONETAG_INTERSTITIAL_ZONE,
        meta: { surface: 'hub_earn_panel' },
      },
      user
    ).catch(() => {});
  }, [user]);

  const isInstalled = useCallback(
    (gameId: string) => {
      if (gameProgress?.[gameId]?.installed) return true;
      return unlockedGames.includes(gameId);
    },
    [gameProgress, unlockedGames]
  );

  const installGame = async (game: GameCatalogItem) => {
    if (!user) return onAlert('Please sign in first', '🔒');
    if (game.comingSoon || !game.url) {
      return onAlert(`${game.name} coming soon!`, '🔜');
    }
    if (isInstalled(game.id)) {
      onOpenGames?.();
      return;
    }
    setInstallBusy(game.id);
    setDownloadPct((p) => ({ ...p, [game.id]: 8 }));
    let pct = 8;
    const tick = setInterval(() => {
      pct = Math.min(90, pct + 10);
      setDownloadPct((p) => ({ ...p, [game.id]: pct }));
    }, 160);
    try {
      try {
        await fetch(game.url, { cache: 'force-cache' });
      } catch {
        /* prefetch optional */
      }
      const token = await user.getIdToken();
      const res = await fetch('/api/games/install', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ gameId: game.id }),
      });
      const data = await res.json().catch(() => ({}));
      clearInterval(tick);
      setDownloadPct((p) => ({ ...p, [game.id]: 100 }));
      if (!res.ok) {
        onAlert(data.error || 'Install failed', '⚠️');
        return;
      }
      onAlert(
        data.message ||
          `${game.name} unlocked — AJ Coins 🪙 credit only after verified offer/postback.`,
        '⏳'
      );
      await trackAdEvent(
        {
          event: 'complete',
          placement: 'games_interstitial',
          zoneId: MONETAG_INTERSTITIAL_ZONE,
          meta: { gameId: game.id, action: 'hub_download_install' },
        },
        user
      );
      onRefreshUser?.();
    } catch (e: unknown) {
      clearInterval(tick);
      onAlert(e instanceof Error ? e.message : 'Download failed', '⚠️');
    } finally {
      setInstallBusy(null);
    }
  };

  const watchInterstitialAd = async () => {
    if (adBusy) return;
    if (isAdCooldownActive()) {
      return onAlert('Ad cooldown active — try again in a few minutes', '⏱️');
    }
    setAdBusy(true);
    interstitialTriggeredRef.current = false;
    const hardStop = window.setTimeout(() => {
      if (!interstitialTriggeredRef.current) {
        setAdBusy(false);
        cleanupMonetagDom();
        onAlert('Ad timed out (5s). Try again.', '⏱️');
      }
    }, SDK_TRIGGER_TIMEOUT_MS);
    try {
      const sdkOk = await ensureMonetagSdkLoaded(MONETAG_INTERSTITIAL_ZONE);
      if (!sdkOk) {
        onAlert('Ad SDK failed to load. Check connection and try again.', '⚠️');
        return;
      }
      await trackAdEvent(
        {
          event: 'impression',
          placement: 'hub_nav_interstitial',
          zoneId: MONETAG_INTERSTITIAL_ZONE,
          meta: { action: 'hub_watch_ad' },
        },
        user
      );
      const result = await showMonetagRewarded(MONETAG_INTERSTITIAL_ZONE, {
        force: true,
        requestVar: 'hub_interstitial',
        ymid: user?.uid ? `hub_${user.uid}_${Date.now()}` : undefined,
        onTriggered: () => {
          interstitialTriggeredRef.current = true;
          window.clearTimeout(hardStop);
          setAdBusy(false);
        },
      });
      window.clearTimeout(hardStop);
      await trackAdEvent(
        {
          event: result.rewarded ? 'complete' : 'fail',
          placement: 'hub_nav_interstitial',
          zoneId: MONETAG_INTERSTITIAL_ZONE,
          meta: { networkShown: result.rewarded, triggered: result.triggered },
        },
        user
      );
      if (!result.triggered) cleanupMonetagDom();
      onAlert(
        result.rewarded
          ? 'Thanks for watching! Earn AJ Coins 🪙 via Watch Rewarded Video.'
          : result.triggered
            ? 'Ad closed early — no coins (use Watch Rewarded Video and finish 100%).'
            : 'No ad inventory right now — try Watch Rewarded Video.',
        result.rewarded ? '📺' : 'ℹ️'
      );
    } catch {
      cleanupMonetagDom();
      onAlert('Ad failed to load', '⚠️');
    } finally {
      window.clearTimeout(hardStop);
      setAdBusy(false);
    }
  };

  const openOfferPartners = () => {
    if (!user) return onAlert('Please sign in first', '🔒');
    trackAdEvent(
      {
        event: 'click',
        placement: 'offerwall_rewarded_video',
        zoneId: MONETAG_INTERSTITIAL_ZONE,
        meta: { action: 'open_offer_partners_hub', provider: 'cpagrip' },
      },
      user
    ).catch(() => {});
    // Direct public wall: ridefiles show.php + Firebase uid (new tab)
    const result = openCpaGripOfferWall(user.uid);
    if (result.ok) {
      onAlert(
        'Offer Partners opened in a new tab. AJ Coins 🪙 credit only after verified postback.',
        '🔗'
      );
    } else {
      onAlert(result.error || 'Could not open offer partners.', '⚠️');
    }
  };

  const downloadableGames = GAME_CATALOG.filter((g) => !g.comingSoon).slice(0, 4);

  return (
    <div className="px-4 pt-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-[10px] text-cyan-400 font-black uppercase tracking-widest">
          Earn · Ads · Offers
        </p>
        <button
          type="button"
          onClick={onOpenGames}
          className="text-[9px] font-black text-pink-400 active:scale-90"
        >
          Open Gaming Zone →
        </button>
      </div>

      <BannerAdSlot placement="hub_nav_interstitial" user={user} label="Hub Sponsored" />

      <RewardedVideoOffer
        user={user}
        onAlert={onAlert}
        onRefreshUser={onRefreshUser}
      />

      <button
        type="button"
        disabled={adBusy}
        onClick={watchInterstitialAd}
        className="w-full flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 active:scale-[0.99] disabled:opacity-50"
      >
        <div className="w-10 h-10 rounded-xl bg-violet-500/20 border border-violet-400/30 flex items-center justify-center shrink-0">
          {adBusy ? (
            <Loader2 size={16} className="text-violet-300 animate-spin" />
          ) : (
            <Play size={16} className="text-violet-300" />
          )}
        </div>
        <div className="text-left flex-1 min-w-0">
          <p className="text-sm font-black text-white">Watch Interstitial Ad</p>
          <p className="text-[10px] text-gray-400">
            Monetag zone {MONETAG_INTERSTITIAL_ZONE} · cooldown {Math.round(AD_COOLDOWN_MS / 60000)}m
          </p>
        </div>
      </button>

      <button
        type="button"
        onClick={openOfferPartners}
        className="flex items-center gap-3 w-full rounded-2xl border border-white/10 bg-white/5 p-4 active:scale-[0.99] text-left"
      >
        <div className="w-10 h-10 rounded-xl bg-pink-500/20 border border-pink-400/30 flex items-center justify-center shrink-0">
          <Gift size={18} className="text-pink-300" />
        </div>
        <div className="text-left flex-1 min-w-0">
          <p className="text-sm font-black text-white">Open Offer Partners</p>
          <p className="text-[10px] text-gray-400">
            CPAGrip · surveys · app trials · AJ Coins 🪙 via postback only
          </p>
        </div>
        <ExternalLink size={14} className="text-gray-500 shrink-0" />
      </button>

      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3 space-y-2">
        <p className="text-[10px] text-purple-300 font-black uppercase tracking-widest px-1">
          Download Games · Unlock Play
        </p>
        {downloadableGames.map((game) => {
          const installed = isInstalled(game.id);
          const busy = installBusy === game.id;
          const pct = downloadPct[game.id] || 0;
          return (
            <button
              key={game.id}
              type="button"
              disabled={busy}
              onClick={() => installGame(game)}
              className="w-full flex items-center gap-3 rounded-xl border border-white/10 bg-black/30 p-3 text-left active:scale-[0.99] disabled:opacity-60"
            >
              <span className="text-2xl shrink-0">{game.emoji}</span>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-black text-white truncate">{game.name}</p>
                <p className="text-[9px] text-gray-400 truncate">
                  {installed
                    ? `Installed · Lv ${gameProgress[game.id]?.level || 0}`
                    : 'Unlock play (0 AJ Coins on click)'}
                </p>
                {busy && pct > 0 && pct < 100 && (
                  <div className="mt-1.5 h-1 rounded-full bg-white/10 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-purple-400 to-pink-500 transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                )}
              </div>
              <span className="text-[9px] font-black text-cyan-300 shrink-0">
                {busy ? `${pct}%` : installed ? 'PLAY' : 'GET'}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
