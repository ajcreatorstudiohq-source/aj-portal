'use client';

import { useEffect, useState, type MouseEvent } from 'react';
import {
  ClipboardCheck,
  ExternalLink,
  Gift,
  Play,
  Sparkles,
} from 'lucide-react';
import DailyMathChallenge from './DailyMathChallenge';
import AlphaCaptchaChallenge from './AlphaCaptchaChallenge';
import RewardedVideoOffer from './ads/RewardedVideoOffer';
import { type GameProgressDoc } from '../lib/economy';
import { openCpaGripOfferWall } from '../lib/cpagrip';
import { openBitLabsSurveys } from '../lib/offer-hub';
import { trackAdEvent } from '../lib/ad-client';
import { guardClick, startIntrusiveAdGuard } from '../lib/ad-guards';

type UserLike = { uid: string; getIdToken: () => Promise<string>; email?: string | null } | null;

type Props = {
  user: UserLike;
  unlockedGames: string[];
  gameProgress: Record<string, GameProgressDoc>;
  onAlert: (msg: string, icon?: string) => void;
  onRefreshUser?: () => void;
  onOpenGames?: () => void;
};

type HubPanel = 'none' | 'faucet' | 'videos';

/** FireFaucet Offer Hub — Adsterra Watch & Earn (Monetag removed). */
export default function HubEarnPanel({
  user,
  onAlert,
  onRefreshUser,
  onOpenGames,
}: Props) {
  const [panel, setPanel] = useState<HubPanel>('none');

  useEffect(() => {
    startIntrusiveAdGuard();
  }, []);

  const openBitLabs = (e: MouseEvent) => {
    guardClick(e);
    if (!user) return onAlert('Please sign in first', '🔒');
    trackAdEvent(
      {
        event: 'click',
        placement: 'offerwall_rewarded_video',
        zoneId: 0,
        meta: { action: 'open_bitlabs', provider: 'bitlabs' },
      },
      user
    ).catch(() => {});
    const result = openBitLabsSurveys();
    if (result.ok) {
      onAlert(
        'BitLabs opened. Highest-payout surveys — AJ Coins 🪙 credit after verified completion.',
        '🧠'
      );
    } else {
      onAlert(result.error || 'Could not open BitLabs.', '⚠️');
    }
  };

  const openCpaGrip = (e: MouseEvent) => {
    guardClick(e);
    if (!user) return onAlert('Please sign in first', '🔒');
    trackAdEvent(
      {
        event: 'click',
        placement: 'offerwall_rewarded_video',
        zoneId: 0,
        meta: { action: 'open_cpagrip_hub', provider: 'cpagrip' },
      },
      user
    ).catch(() => {});
    const result = openCpaGripOfferWall(user.uid);
    if (result.ok) {
      onAlert(
        'CPAGrip app installs opened. AJ Coins 🪙 credit automatically after verified install/completion.',
        '📱'
      );
    } else {
      onAlert(result.error || 'Could not open CPAGrip tasks.', '⚠️');
    }
  };

  const togglePanel = (e: MouseEvent, next: HubPanel) => {
    guardClick(e);
    if (!user) return onAlert('Please sign in first', '🔒');
    setPanel((cur) => (cur === next ? 'none' : next));
  };

  return (
    <div className="px-4 pt-4 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <p
            className="text-[11px] font-black uppercase tracking-[0.2em] text-transparent bg-clip-text"
            style={{
              backgroundImage: 'linear-gradient(90deg,#22d3ee,#a78bfa,#f59e0b)',
              fontFamily: 'var(--font-aj-display), sans-serif',
            }}
          >
            Offer Hub
          </p>
          <p className="text-[10px] text-zinc-400 font-bold mt-0.5">
            Earn AJ Coins 🪙 · FireFaucet style
          </p>
        </div>
        {onOpenGames ? (
          <button
            type="button"
            onClick={(e) => {
              guardClick(e);
              onOpenGames();
            }}
            className="text-[9px] font-black text-pink-400 active:scale-90"
          >
            Gaming Zone →
          </button>
        ) : null}
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        <button
          type="button"
          onClick={openBitLabs}
          className="relative overflow-hidden rounded-2xl border border-violet-500/35 bg-gradient-to-br from-[#1a1028] via-[#120a1c] to-[#0a0a0a] p-3.5 text-left active:scale-[0.98] min-h-[118px]"
        >
          <div className="relative flex flex-col h-full gap-2">
            <div className="w-9 h-9 rounded-xl bg-violet-500/20 border border-violet-400/30 flex items-center justify-center">
              <ClipboardCheck size={16} className="text-violet-300" />
            </div>
            <div>
              <p className="text-[12px] font-black text-white leading-tight">BitLabs Surveys</p>
              <p className="text-[9px] font-black uppercase tracking-wider text-violet-300 mt-1">
                Highest Payout
              </p>
            </div>
            <span className="mt-auto inline-flex items-center gap-1 text-[8px] font-bold text-zinc-500">
              Open <ExternalLink size={9} />
            </span>
          </div>
        </button>

        <button
          type="button"
          onClick={openCpaGrip}
          className="relative overflow-hidden rounded-2xl border border-amber-500/35 bg-gradient-to-br from-[#2a1a08] via-[#1a1006] to-[#0a0a0a] p-3.5 text-left active:scale-[0.98] min-h-[118px]"
        >
          <div className="relative flex flex-col h-full gap-2">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-400/30 flex items-center justify-center">
              <Gift size={16} className="text-amber-300" />
            </div>
            <div>
              <p className="text-[12px] font-black text-white leading-tight">CPAGrip Tasks</p>
              <p className="text-[9px] font-black uppercase tracking-wider text-amber-300 mt-1">
                App Installs
              </p>
            </div>
            <span className="mt-auto inline-flex items-center gap-1 text-[8px] font-bold text-zinc-500">
              200–1000+ 🪙 <ExternalLink size={9} />
            </span>
          </div>
        </button>

        <button
          type="button"
          onClick={(e) => togglePanel(e, 'faucet')}
          className={`relative overflow-hidden rounded-2xl border p-3.5 text-left active:scale-[0.98] min-h-[118px] ${
            panel === 'faucet'
              ? 'border-cyan-400/50 bg-gradient-to-br from-[#06252a] to-[#0a0a0a]'
              : 'border-cyan-500/30 bg-gradient-to-br from-[#0a1f24] via-[#071416] to-[#0a0a0a]'
          }`}
        >
          <div className="relative flex flex-col h-full gap-2">
            <div className="w-9 h-9 rounded-xl bg-cyan-500/20 border border-cyan-400/30 flex items-center justify-center">
              <Sparkles size={16} className="text-cyan-300" />
            </div>
            <div>
              <p className="text-[12px] font-black text-white leading-tight">Math & Captcha</p>
              <p className="text-[9px] font-black uppercase tracking-wider text-cyan-300 mt-1">
                Daily Faucet
              </p>
            </div>
            <span className="mt-auto text-[8px] font-bold text-zinc-500">
              +5 / +10 🪙 · 5/day each
            </span>
          </div>
        </button>

        <button
          type="button"
          onClick={(e) => togglePanel(e, 'videos')}
          className={`relative overflow-hidden rounded-2xl border p-3.5 text-left active:scale-[0.98] min-h-[118px] ${
            panel === 'videos'
              ? 'border-rose-400/50 bg-gradient-to-br from-[#2a0a14] to-[#0a0a0a]'
              : 'border-rose-500/30 bg-gradient-to-br from-[#1f0a12] via-[#14060c] to-[#0a0a0a]'
          }`}
        >
          <div className="relative flex flex-col h-full gap-2">
            <div className="w-9 h-9 rounded-xl bg-rose-500/20 border border-rose-400/30 flex items-center justify-center">
              <Play size={16} className="text-rose-300" />
            </div>
            <div>
              <p className="text-[12px] font-black text-white leading-tight">Premium Videos</p>
              <p className="text-[9px] font-black uppercase tracking-wider text-rose-300 mt-1">
                Watch & Earn
              </p>
            </div>
            <span className="mt-auto text-[8px] font-bold text-zinc-500">+20 AJ Coins 🪙</span>
          </div>
        </button>
      </div>

      {panel === 'faucet' ? (
        <div className="space-y-3 rounded-2xl border border-cyan-500/20 bg-black/40 p-3">
          <p className="text-[9px] font-black uppercase tracking-widest text-cyan-400">
            Daily Faucet · Math + Captcha
          </p>
          <DailyMathChallenge user={user} onAlert={onAlert} onRefreshUser={onRefreshUser} />
          <AlphaCaptchaChallenge user={user} onAlert={onAlert} onRefreshUser={onRefreshUser} />
        </div>
      ) : null}

      {panel === 'videos' ? (
        <div className="rounded-2xl border border-rose-500/20 bg-black/40 p-3 space-y-2">
          <p className="text-[9px] font-black uppercase tracking-widest text-rose-400">
            Watch & Earn · Adsterra
          </p>
          <RewardedVideoOffer user={user} onAlert={onAlert} onRefreshUser={onRefreshUser} />
        </div>
      ) : null}
    </div>
  );
}
