'use client';

import { useCallback, useEffect, useState } from 'react';
import { Download, ExternalLink, Play, Loader2, Gift } from 'lucide-react';
import RewardedVideoOffer from './ads/RewardedVideoOffer';
import BannerAdSlot from './ads/BannerAdSlot';
import {
  GAME_CATALOG,
  OFFERWALL_PUBLIC,
  type GameCatalogItem,
  type GameProgressDoc,
} from '../lib/economy';
import {
  MONETAG_INTERSTITIAL_ZONE,
  AD_COOLDOWN_MS,
} from '../lib/ads-config';
import { trackAdEvent } from '../lib/ad-client';
import { earnReward } from '../lib/client-rewards';
import {
  cleanupMonetagDom,
  ensureMonetagSdkLoaded,
  isAdCooldownActive,
  triggerMonetagInterstitialAd,
} from '../lib/monetag-client';

type UserLike = { uid: string; getIdToken: () => Promise<string>; email?: string | null } | null;

type Props = {
  user: UserLike;
  unlockedGames: string[];
  gameProgress: Record<string, GameProgressDoc>;
  onAlert: (msg: string, icon?: string) => void;
  onRefreshUser?: () => void;
  onOpenGames?: () => void;
  /** Optional portal APK / PWA install URL */
  apkUrl?: string;
};

const PORTAL_APK_URL =
  typeof process !== 'undefined'
    ? process.env.NEXT_PUBLIC_APP_APK_URL || '/manifest.json'
    : '/manifest.json';

/**
 * Hub dashboard earn module — rewarded video, app downloads, Monetag interstitial, offerwall.
 * Balance updates flow through Firebase onSnapshot after /api/ads/rewarded or /api/games/install.
 */
export default function HubEarnPanel({
  user,
  unlockedGames,
  gameProgress,
  onAlert,
  onRefreshUser,
  onOpenGames,
  apkUrl = PORTAL_APK_URL,
}: Props) {
  const [installBusy, setInstallBusy] = useState<string | null>(null);
  const [apkBusy, setApkBusy] = useState(false);
  const [adBusy, setAdBusy] = useState(false);
  const [downloadPct, setDownloadPct] = useState<Record<string, number>>({});

  useEffect(() => {
    try {
      ensureMonetagSdkLoaded(MONETAG_INTERSTITIAL_ZONE);
    } catch {
      /* ignore */
    }
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
          `Downloaded! +${data.creditedCoins || 0} AJ Coins ($${Number(data.userUsd || 0).toFixed(2)})`,
        '💰'
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

  const downloadPortalApp = async () => {
    if (!user) return onAlert('Please sign in to track your download reward', '🔒');
    setApkBusy(true);
    try {
      await trackAdEvent(
        {
          event: 'click',
          placement: 'hub_nav_interstitial',
          zoneId: MONETAG_INTERSTITIAL_ZONE,
          meta: { action: 'portal_apk_download' },
        },
        user
      );

      // Open APK / PWA install target
      window.open(apkUrl, '_blank', 'noopener,noreferrer');

      const day = new Date().toISOString().slice(0, 10);
      const result = await earnReward(user, 'app_download', {
        idempotencyKey: `${user.uid}_apk_${day}`,
        meta: { channel: 'portal_apk', apkUrl },
      });

      if (!result.ok) {
        if (result.error === 'daily_limit' || result.error === 'invalid_source') {
          // invalid_source means older server — still opened download
          onAlert(
            result.error === 'invalid_source'
              ? 'App download started!'
              : 'Daily app-download reward already claimed. App link opened.',
            result.error === 'invalid_source' ? '📲' : 'ℹ️'
          );
        } else {
          onAlert(result.error || 'Download tracked', '📲');
        }
      } else {
        onAlert(
          result.message ||
            `App download tracked! +${result.creditedCoins || 0} AJ Coins`,
          result.duplicate ? 'ℹ️' : '💰'
        );
      }
      onRefreshUser?.();
    } catch (e: unknown) {
      onAlert(e instanceof Error ? e.message : 'Download failed', '⚠️');
    } finally {
      setApkBusy(false);
    }
  };

  const watchInterstitialAd = async () => {
    if (adBusy) return;
    if (isAdCooldownActive()) {
      return onAlert('Ad cooldown active — try again in a few minutes', '⏱️');
    }
    setAdBusy(true);
    try {
      ensureMonetagSdkLoaded(MONETAG_INTERSTITIAL_ZONE);
      await trackAdEvent(
        {
          event: 'impression',
          placement: 'hub_nav_interstitial',
          zoneId: MONETAG_INTERSTITIAL_ZONE,
          meta: { action: 'hub_watch_ad' },
        },
        user
      );
      const shown = await triggerMonetagInterstitialAd(MONETAG_INTERSTITIAL_ZONE, {
        force: false,
        requestVar: 'hub_interstitial',
      });
      await trackAdEvent(
        {
          event: shown ? 'complete' : 'fail',
          placement: 'hub_nav_interstitial',
          zoneId: MONETAG_INTERSTITIAL_ZONE,
          meta: { networkShown: shown },
        },
        user
      );
      if (!shown) cleanupMonetagDom();
      onAlert(
        shown
          ? 'Thanks for watching! More rewards via Watch & Earn below.'
          : 'No ad inventory right now — try Watch & Earn rewarded video.',
        shown ? '📺' : 'ℹ️'
      );
    } catch {
      cleanupMonetagDom();
      onAlert('Ad failed to load', '⚠️');
    } finally {
      setAdBusy(false);
    }
  };

  const downloadableGames = GAME_CATALOG.filter((g) => !g.comingSoon).slice(0, 4);

  return (
    <div className="px-4 pt-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-[10px] text-cyan-400 font-black uppercase tracking-widest">
          Earn · Ads · Downloads
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

      {/* 1) Rewarded video — primary earn CTA */}
      <RewardedVideoOffer
        user={user}
        onAlert={onAlert}
        onRefreshUser={onRefreshUser}
      />

      {/* Monetag interstitial (non-rewarded inventory) */}
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

      {/* 2) Portal APK / App download */}
      <div className="rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-950/40 to-orange-950/30 p-4 space-y-3">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-400/30 flex items-center justify-center shrink-0">
            <Download size={18} className="text-amber-300" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-black text-white">Download AJ Super Portal App</p>
            <p className="text-[11px] text-gray-300 mt-0.5 leading-relaxed">
              Install the app / PWA. Tracked download unlocks{' '}
              <span className="text-amber-300 font-bold">$1.00–$1.50</span> wallet credit once per day
              (same $5–$7 pool split).
            </p>
          </div>
        </div>
        <button
          type="button"
          disabled={apkBusy || !user}
          onClick={downloadPortalApp}
          className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 text-black text-xs font-black flex items-center justify-center gap-2 disabled:opacity-50 active:scale-[0.98]"
        >
          {apkBusy ? (
            <>
              <Loader2 size={14} className="animate-spin" /> Opening…
            </>
          ) : (
            <>
              <Download size={14} /> Download App & Earn
            </>
          )}
        </button>
      </div>

      {/* Partner offerwall */}
      <a
        href={OFFERWALL_PUBLIC.wallUrl}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => {
          trackAdEvent(
            {
              event: 'click',
              placement: 'offerwall_rewarded_video',
              zoneId: MONETAG_INTERSTITIAL_ZONE,
              meta: { action: 'open_offer_partners_hub' },
            },
            user
          ).catch(() => {});
        }}
        className="flex items-center gap-3 w-full rounded-2xl border border-white/10 bg-white/5 p-4 active:scale-[0.99]"
      >
        <div className="w-10 h-10 rounded-xl bg-pink-500/20 border border-pink-400/30 flex items-center justify-center shrink-0">
          <Gift size={18} className="text-pink-300" />
        </div>
        <div className="text-left flex-1 min-w-0">
          <p className="text-sm font-black text-white">Open Offer Partners</p>
          <p className="text-[10px] text-gray-400">Surveys · trials · external offerwall</p>
        </div>
        <ExternalLink size={14} className="text-gray-500 shrink-0" />
      </a>

      {/* 3) In-portal game APK / package downloads */}
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3 space-y-2">
        <p className="text-[10px] text-purple-300 font-black uppercase tracking-widest px-1">
          Download Games · Install & Earn
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
                    : 'Download → unlock $1–$1.50 install reward'}
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
