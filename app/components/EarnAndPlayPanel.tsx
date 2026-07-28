'use client';

import { Download, ExternalLink, Play } from 'lucide-react';
import { PREMIUM_DIRECT_GAMES } from '../lib/economy';
import { ADSTERRA_REWARDED_LINK, ADSTERRA_REWARD_COINS, ADSTERRA_VERIFY_SECONDS } from '../lib/ads-config';
import { handleEarnAndPlayGame } from '../lib/direct-download';
import { guardClick, startIntrusiveAdGuard } from '../lib/ad-guards';
import { trackAdEvent } from '../lib/ad-client';
import RewardedVideoOffer from './ads/RewardedVideoOffer';

type UserLike = { uid: string; getIdToken: () => Promise<string> } | null;

type Props = {
  user: UserLike;
  onAlert: (msg: string, icon?: string) => void;
  onRefreshUser?: () => void;
};

/**
 * Earn & Play — Netlify/local game cards + Watch Ads & Earn (Adsterra).
 * Games: Adsterra bridge + play link (tracked). Watch Ads: 30s in-ad verify then claim.
 */
export default function EarnAndPlayPanel({ user, onAlert, onRefreshUser }: Props) {
  const playGame = (
    e: { preventDefault?: () => void; stopPropagation?: () => void },
    game: (typeof PREMIUM_DIRECT_GAMES)[number]
  ) => {
    guardClick(e);
    startIntrusiveAdGuard();
    if (!user) return onAlert('Please sign in to Earn & Play', '🔒');

    trackAdEvent(
      {
        event: 'click',
        placement: 'games_interstitial',
        zoneId: 0,
        meta: {
          action: 'earn_and_play_game',
          provider: 'adsterra_bridge',
          gameId: game.id,
          gameUrl: game.downloadUrl,
          coinCredit: 0,
        },
      },
      user
    ).catch(() => {});

    const result = handleEarnAndPlayGame(game.downloadUrl);
    if (!result.ok) {
      onAlert(result.error || 'Could not open game. Try again.', '⚠️');
      return;
    }
    onAlert(
      `${game.emoji} ${game.name} opening… Adsterra + game linked for tracking.`,
      '🎮'
    );
  };

  const openAdsterraDirect = (
    e: { preventDefault?: () => void; stopPropagation?: () => void }
  ) => {
    guardClick(e);
    startIntrusiveAdGuard();
    if (!user) return onAlert('Please sign in first', '🔒');
    trackAdEvent(
      {
        event: 'click',
        placement: 'offerwall_rewarded_video',
        zoneId: 0,
        meta: {
          action: 'earn_and_play_adsterra_direct',
          provider: 'adsterra',
          link: ADSTERRA_REWARDED_LINK,
        },
      },
      user
    ).catch(() => {});
    try {
      const win = window.open(ADSTERRA_REWARDED_LINK, '_blank', 'noopener,noreferrer');
      if (!win) window.location.assign(ADSTERRA_REWARDED_LINK);
    } catch {
      onAlert('Could not open Adsterra. Allow popups and try again.', '⚠️');
    }
  };

  return (
    <div className="px-4 pt-5 space-y-4">
      <div>
        <p
          className="text-[11px] font-black uppercase tracking-[0.22em] text-transparent bg-clip-text"
          style={{
            backgroundImage: 'linear-gradient(90deg,#38bdf8,#818cf8,#c084fc)',
            fontFamily: 'var(--font-aj-display), sans-serif',
          }}
        >
          Earn & Play
        </p>
        <p className="text-[10px] text-zinc-400 font-bold mt-0.5">
          Play games · Watch Ads · Earn AJ Coins 🪙
        </p>
      </div>

      {/* Game cards — Netlify / local play links */}
      <div className="rounded-2xl border border-indigo-500/25 bg-gradient-to-br from-[#0c1224]/90 to-[#050505] p-3 space-y-3">
        <p className="text-[9px] font-black uppercase tracking-[0.18em] text-indigo-300">
          Games · Download & Play
        </p>
        <div className="grid grid-cols-3 gap-2.5">
          {PREMIUM_DIRECT_GAMES.map((game) => {
            const isNetlify = String(game.downloadUrl).includes('netlify');
            return (
              <div
                key={game.id}
                className="relative overflow-hidden rounded-2xl border border-indigo-500/35 bg-gradient-to-br from-[#0c1224] via-[#0a0e1a] to-[#050505] p-3 flex flex-col min-h-[158px]"
              >
                <div className="absolute inset-0 pointer-events-none opacity-50 bg-[radial-gradient(ellipse_at_30%_0%,rgba(99,102,241,0.22),transparent_55%)]" />
                <div className="relative flex flex-col h-full gap-2">
                  <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-sky-400/30 flex items-center justify-center shadow-[0_0_18px_rgba(99,102,241,0.3)]">
                    <span className="text-xl leading-none">{game.emoji}</span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] font-black text-white leading-tight truncate">
                      {game.name}
                    </p>
                    <p className="text-[8px] text-sky-200/70 font-bold mt-1 uppercase tracking-wider">
                      {isNetlify ? 'Netlify' : 'Direct Play'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => playGame(e, game)}
                    className="mt-auto w-full py-2.5 rounded-xl text-white text-[8px] font-black uppercase tracking-wide flex items-center justify-center gap-1.5 active:scale-[0.97] shadow-[0_0_18px_rgba(99,102,241,0.4)]"
                    style={{
                      background: 'linear-gradient(135deg,#2563eb 0%,#4f46e5 45%,#7c3aed 100%)',
                    }}
                  >
                    <Download size={12} strokeWidth={2.5} />
                    Play
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Watch Ads & Earn — Adsterra direct + 30s rewarded flow */}
      <div className="rounded-2xl border border-cyan-500/25 bg-gradient-to-br from-[#061820]/90 to-[#050505] p-3 space-y-3">
        <div>
          <p className="text-[9px] font-black uppercase tracking-[0.18em] text-cyan-300">
            Watch Ads & Earn
          </p>
          <p className="text-[10px] text-zinc-400 mt-1 leading-relaxed">
            Stay on the Adsterra page for {ADSTERRA_VERIFY_SECONDS}s, then come back to claim{' '}
            <span className="text-sky-300 font-bold">+{ADSTERRA_REWARD_COINS} AJ Coins 🪙</span>.
            Leaving early = no reward.
          </p>
        </div>

        <button
          type="button"
          onClick={openAdsterraDirect}
          className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white text-xs font-black flex items-center justify-center gap-2 active:scale-[0.98]"
        >
          <ExternalLink size={14} />
          Open Adsterra Direct Link
        </button>

        <div className="flex items-center gap-2 text-[9px] text-zinc-500 font-bold uppercase tracking-wider">
          <Play size={12} className="text-cyan-400" />
          Verified reward · {ADSTERRA_VERIFY_SECONDS}s in-ad required
        </div>

        <RewardedVideoOffer user={user} onAlert={onAlert} onRefreshUser={onRefreshUser} />
      </div>
    </div>
  );
}
