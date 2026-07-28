'use client';

import { useEffect, useMemo, useState, type MouseEvent } from 'react';
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
import { buildCpxResearchUrl, openMonlixOffers } from '../lib/offer-hub';
import { trackAdEvent } from '../lib/ad-client';
import { guardClick, startIntrusiveAdGuard } from '../lib/ad-guards';

type UserLike = { uid: string; getIdToken: () => Promise<string>; email?: string | null } | null;

type Props = {
  user: UserLike;
  onAlert: (msg: string, icon?: string) => void;
  onRefreshUser?: () => void;
};

type HubPanel = 'none' | 'faucet' | 'videos' | 'cpx';

/**
 * Offer Hub — Earn More (CPX Research + Monlix) · Math/Captcha · Watch Ads.
 */
export default function HubEarnPanel({ user, onAlert, onRefreshUser }: Props) {
  const [panel, setPanel] = useState<HubPanel>('none');

  useEffect(() => {
    startIntrusiveAdGuard();
  }, []);

  const cpxSrc = useMemo(() => {
    if (!user?.uid) return '';
    return buildCpxResearchUrl(user.uid);
  }, [user?.uid]);

  const openCpx = (e: MouseEvent) => {
    guardClick(e);
    if (!user) return onAlert('Please sign in first', '🔒');
    trackAdEvent(
      {
        event: 'click',
        placement: 'offerwall_rewarded_video',
        zoneId: 0,
        meta: { action: 'open_cpx_research', provider: 'cpx_research', appId: '34869' },
      },
      user
    ).catch(() => {});
    setPanel((cur) => (cur === 'cpx' ? 'none' : 'cpx'));
  };

  const openMonlix = (e: MouseEvent) => {
    guardClick(e);
    if (!user) return onAlert('Please sign in first', '🔒');
    trackAdEvent(
      {
        event: 'click',
        placement: 'offerwall_rewarded_video',
        zoneId: 0,
        meta: { action: 'open_monlix_hub', provider: 'monlix' },
      },
      user
    ).catch(() => {});
    const result = openMonlixOffers(user.uid);
    if (result.ok) {
      onAlert(
        'Monlix opened. Complete real app installs for big AJ Coins 🪙 rewards.',
        '📱'
      );
    } else {
      onAlert(result.error || 'Could not open Monlix.', '⚠️');
    }
  };

  const togglePanel = (e: MouseEvent, next: HubPanel) => {
    guardClick(e);
    if (!user) return onAlert('Please sign in first', '🔒');
    setPanel((cur) => (cur === next ? 'none' : next));
  };

  return (
    <div className="px-4 pt-5 space-y-3">
      <div>
        <p
          className="text-[11px] font-black uppercase tracking-[0.22em] text-transparent bg-clip-text"
          style={{
            backgroundImage: 'linear-gradient(90deg,#22d3ee,#818cf8,#a78bfa)',
            fontFamily: 'var(--font-aj-display), sans-serif',
          }}
        >
          Offer Hub
        </p>
        <p className="text-[10px] text-zinc-400 font-bold mt-0.5">
          Want more coins? Complete real app installs in our Offer Hub.
        </p>
      </div>

      <div className="rounded-2xl border border-indigo-500/25 bg-gradient-to-br from-[#0c1224]/80 to-[#050505] p-3 space-y-2">
        <p className="text-[9px] font-black uppercase tracking-[0.18em] text-indigo-300">
          Earn More · Official CPA
        </p>
        <p className="text-[10px] text-zinc-400 leading-relaxed">
          High-value installs & surveys · big AJ Coins 🪙 after verified completion.
        </p>
        <div className="grid grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={openCpx}
            className={`relative overflow-hidden rounded-2xl border p-3.5 text-left active:scale-[0.98] min-h-[108px] ${
              panel === 'cpx'
                ? 'border-violet-400/55 bg-gradient-to-br from-[#221038] to-[#0a0a0a]'
                : 'border-violet-500/35 bg-gradient-to-br from-[#1a1028] via-[#120a1c] to-[#0a0a0a]'
            }`}
          >
            <div className="relative flex flex-col h-full gap-2">
              <div className="w-9 h-9 rounded-xl bg-violet-500/20 border border-violet-400/30 flex items-center justify-center">
                <ClipboardCheck size={16} className="text-violet-300" />
              </div>
              <div>
                <p className="text-[12px] font-black text-white leading-tight">CPX Research</p>
                <p className="text-[9px] font-black uppercase tracking-wider text-violet-300 mt-1">
                  Surveys
                </p>
              </div>
              <span className="mt-auto inline-flex items-center gap-1 text-[8px] font-bold text-zinc-500">
                Earn AJ Coins 🪙 <ExternalLink size={9} />
              </span>
            </div>
          </button>

          <button
            type="button"
            onClick={openMonlix}
            className="relative overflow-hidden rounded-2xl border border-sky-500/35 bg-gradient-to-br from-[#0a1a2a] via-[#081018] to-[#0a0a0a] p-3.5 text-left active:scale-[0.98] min-h-[108px]"
          >
            <div className="relative flex flex-col h-full gap-2">
              <div className="w-9 h-9 rounded-xl bg-sky-500/20 border border-sky-400/30 flex items-center justify-center">
                <Gift size={16} className="text-sky-300" />
              </div>
              <div>
                <p className="text-[12px] font-black text-white leading-tight">Monlix</p>
                <p className="text-[9px] font-black uppercase tracking-wider text-sky-300 mt-1">
                  App Installs
                </p>
              </div>
              <span className="mt-auto inline-flex items-center gap-1 text-[8px] font-bold text-zinc-500">
                Earn AJ Coins 🪙 <ExternalLink size={9} />
              </span>
            </div>
          </button>
        </div>
      </div>

      {panel === 'cpx' && user?.uid && cpxSrc ? (
        <div className="rounded-2xl border border-violet-500/25 bg-black/40 overflow-hidden">
          <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-white/5">
            <p className="text-[9px] font-black uppercase tracking-widest text-violet-300">
              CPX Research · Surveys
            </p>
            <a
              href={cpxSrc}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[8px] font-bold text-zinc-400 hover:text-violet-300"
            >
              Open full <ExternalLink size={9} />
            </a>
          </div>
          <iframe
            title="CPX Research"
            width="100%"
            height={2000}
            frameBorder={0}
            src={cpxSrc}
            className="w-full bg-[#0a0a0a] min-h-[480px]"
            allow="clipboard-write; payment"
            referrerPolicy="no-referrer-when-downgrade"
          />
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-2.5">
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
              <p className="text-[12px] font-black text-white leading-tight">Watch Ads</p>
              <p className="text-[9px] font-black uppercase tracking-wider text-rose-300 mt-1">
                30s Verify · +5 🪙
              </p>
            </div>
            <span className="mt-auto text-[8px] font-bold text-zinc-500">+5 AJ Coins 🪙</span>
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
            Watch & Earn · Adsterra · 30s timer
          </p>
          <RewardedVideoOffer user={user} onAlert={onAlert} onRefreshUser={onRefreshUser} />
        </div>
      ) : null}
    </div>
  );
}
