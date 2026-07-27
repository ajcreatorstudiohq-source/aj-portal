'use client';

import { Download } from 'lucide-react';
import { PREMIUM_DIRECT_GAMES } from '../lib/economy';
import { handleDirectDownload } from '../lib/direct-download';
import { guardClick, startIntrusiveAdGuard } from '../lib/ad-guards';
import { trackAdEvent } from '../lib/ad-client';

type UserLike = { uid: string; getIdToken: () => Promise<string> } | null;

type Props = {
  user: UserLike;
  onAlert: (msg: string, icon?: string) => void;
};

/**
 * Premium Games Hub — Direct Download & Play (Adsterra bridge, NO lockers).
 * DOWNLOAD & PLAY → Adsterra new tab + game in current tab. 0 AJ Coins on click.
 */
export default function PremiumGamesHub({ user, onAlert }: Props) {
  const onDownloadPlay = (
    e: { preventDefault?: () => void; stopPropagation?: () => void },
    game: (typeof PREMIUM_DIRECT_GAMES)[number]
  ) => {
    guardClick(e);
    startIntrusiveAdGuard();
    if (!user) return onAlert('Please sign in to download & play', '🔒');

    trackAdEvent(
      {
        event: 'click',
        placement: 'games_interstitial',
        zoneId: 0,
        meta: {
          action: 'direct_download_play',
          provider: 'adsterra_bridge',
          gameId: game.id,
          gameUrl: game.downloadUrl,
          coinCredit: 0,
        },
      },
      user
    ).catch(() => {});

    const result = handleDirectDownload(game.downloadUrl);
    if (!result.ok) {
      onAlert(result.error || 'Could not start download. Try again.', '⚠️');
    }
  };

  return (
    <div className="px-4 pt-5 space-y-3">
      <div>
        <p
          className="text-[11px] font-black uppercase tracking-[0.22em] text-transparent bg-clip-text"
          style={{
            backgroundImage: 'linear-gradient(90deg,#38bdf8,#818cf8,#a78bfa)',
            fontFamily: 'var(--font-aj-display), sans-serif',
          }}
        >
          Premium Games
        </p>
        <p className="text-[10px] text-zinc-400 font-bold mt-0.5">
          Download & Play · Direct access · AJ Coins 🪙 via Offer Hub
        </p>
      </div>

      <div className="grid grid-cols-3 gap-2.5">
        {PREMIUM_DIRECT_GAMES.map((game) => (
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
                <p className="text-[11px] font-black text-white leading-tight truncate">{game.name}</p>
                <p className="text-[8px] text-sky-200/70 font-bold mt-1 uppercase tracking-wider">
                  Direct Play
                </p>
              </div>
              <button
                type="button"
                onClick={(e) => onDownloadPlay(e, game)}
                className="mt-auto w-full py-2.5 rounded-xl text-white text-[8px] font-black uppercase tracking-wide flex items-center justify-center gap-1.5 active:scale-[0.97] shadow-[0_0_18px_rgba(99,102,241,0.4)]"
                style={{
                  background: 'linear-gradient(135deg,#2563eb 0%,#4f46e5 45%,#7c3aed 100%)',
                }}
              >
                <Download size={12} strokeWidth={2.5} />
                Download & Play
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
