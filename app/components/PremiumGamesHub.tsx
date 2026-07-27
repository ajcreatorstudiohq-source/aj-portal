'use client';

import { ExternalLink, Gamepad2 } from 'lucide-react';
import { PREMIUM_CPA_GAMES } from '../lib/economy';
import { guardClick, startIntrusiveAdGuard } from '../lib/ad-guards';
import { trackAdEvent } from '../lib/ad-client';

type UserLike = { uid: string; getIdToken: () => Promise<string> } | null;

type Props = {
  user: UserLike;
  onAlert: (msg: string, icon?: string) => void;
};

/**
 * Premium Games Hub — CPAGrip unlock links (owner revenue only).
 * Unlock & Play never credits AJ Coins on the portal.
 */
export default function PremiumGamesHub({ user, onAlert }: Props) {
  const unlockGame = (
    e: { preventDefault?: () => void; stopPropagation?: () => void },
    game: (typeof PREMIUM_CPA_GAMES)[number]
  ) => {
    guardClick(e);
    startIntrusiveAdGuard();
    if (!user) return onAlert('Please sign in to unlock Premium Games', '🔒');

    trackAdEvent(
      {
        event: 'click',
        placement: 'games_interstitial',
        zoneId: 0,
        meta: {
          action: 'premium_game_unlock',
          provider: 'cpagrip',
          gameId: game.id,
          coinCredit: 0,
        },
      },
      user
    ).catch(() => {});

    try {
      const win = window.open(game.unlockUrl, '_blank', 'noopener,noreferrer');
      if (!win) window.location.assign(game.unlockUrl);
    } catch {
      onAlert('Could not open unlock link. Allow popups and try again.', '⚠️');
      return;
    }

    onAlert(
      `${game.emoji} ${game.name} unlock opened. Complete the CPA offer to play — 0 AJ Coins credited here. Owner earns via CPAGrip.`,
      '🎮'
    );
  };

  return (
    <div className="px-4 pt-5 space-y-3">
      <div>
        <p
          className="text-[11px] font-black uppercase tracking-[0.22em] text-transparent bg-clip-text"
          style={{
            backgroundImage: 'linear-gradient(90deg,#fbbf24,#f59e0b,#f97316)',
            fontFamily: 'var(--font-aj-display), sans-serif',
          }}
        >
          Premium Games
        </p>
        <p className="text-[10px] text-zinc-400 font-bold mt-0.5">
          Unlock & Play · CPA offers · 0 AJ Coins on portal 🪙
        </p>
      </div>

      <div className="grid grid-cols-3 gap-2.5">
        {PREMIUM_CPA_GAMES.map((game) => (
          <div
            key={game.id}
            className="relative overflow-hidden rounded-2xl border border-amber-500/30 bg-gradient-to-br from-[#1a1408] via-[#0f0c08] to-[#050505] p-3 flex flex-col min-h-[148px]"
          >
            <div className="absolute inset-0 pointer-events-none opacity-40 bg-[radial-gradient(ellipse_at_30%_0%,rgba(251,191,36,0.18),transparent_55%)]" />
            <div className="relative flex flex-col h-full gap-2">
              <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-400/35 flex items-center justify-center shadow-[0_0_18px_rgba(251,191,36,0.25)]">
                <span className="text-xl leading-none">{game.emoji}</span>
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-black text-white leading-tight truncate">{game.name}</p>
                <p className="text-[8px] text-amber-200/70 font-bold mt-1 uppercase tracking-wider">
                  CPA Unlock
                </p>
              </div>
              <button
                type="button"
                onClick={(e) => unlockGame(e, game)}
                className="mt-auto w-full py-2 rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 text-black text-[8px] font-black uppercase tracking-wide flex items-center justify-center gap-1 active:scale-[0.97] shadow-[0_0_16px_rgba(251,191,36,0.35)]"
              >
                <Gamepad2 size={11} />
                Unlock & Play
                <ExternalLink size={9} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
