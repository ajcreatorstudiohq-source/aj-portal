'use client';

import { useEffect, useMemo, useState, type MouseEvent } from 'react';
import DailyMathChallenge from './DailyMathChallenge';
import AlphaCaptchaChallenge from './AlphaCaptchaChallenge';
import RewardedVideoOffer from './ads/RewardedVideoOffer';
import {
  THEOREMREACH_API_KEY,
  buildTheoremReachUrl,
} from '../lib/offer-hub';
import { PREMIUM_DIRECT_GAMES } from '../lib/economy';
import {
  MATH_CHALLENGE_COINS,
  ALPHA_CAPTCHA_COINS,
} from '../lib/reward-sources';
import { launchAdsterraUnit, trackAdEvent } from '../lib/ad-client';
import { handleEarnAndPlayGame } from '../lib/direct-download';
import { guardClick, startIntrusiveAdGuard } from '../lib/ad-guards';
import type { OnRefreshUser } from '../lib/wallet-refresh';
import {
  ClipboardCheck,
  Download,
  ExternalLink,
  Gamepad2,
  Play,
  Sparkles,
  X,
} from 'lucide-react';

type UserLike = { uid: string; getIdToken: () => Promise<string>; email?: string | null } | null;

type Props = {
  user: UserLike;
  onAlert: (msg: string, icon?: string) => void;
  onRefreshUser?: OnRefreshUser;
};

type HubPanel = 'none' | 'faucet' | 'earnplay' | 'surveys' | 'watchads';

/**
 * Offer Hub — TheoremReach Surveys · Earn & Play · Watch Ads · Math/Captcha.
 */
export default function HubEarnPanel({ user, onAlert, onRefreshUser }: Props) {
  const [panel, setPanel] = useState<HubPanel>('none');
  const [surveysOpen, setSurveysOpen] = useState(false);
  const [surveyTxId, setSurveyTxId] = useState('');

  useEffect(() => {
    startIntrusiveAdGuard();
  }, []);

  const theoremSrc = useMemo(() => {
    if (!user?.uid || !surveyTxId) return '';
    return buildTheoremReachUrl(user.uid, { transactionId: surveyTxId });
  }, [user?.uid, surveyTxId]);

  const fireSurveyAdsterra = (phase: 'start' | 'end') => {
    void launchAdsterraUnit(
      {
        event: 'click',
        placement: 'offerwall_rewarded_video',
        format: 'direct_link',
        sessionId: surveyTxId || undefined,
        meta: {
          action: phase === 'start' ? 'survey_start_adsterra' : 'survey_end_adsterra',
          provider: 'adsterra',
          surveyProvider: 'theoremreach',
          phase,
          format: 'direct_link',
        },
      },
      user
    );
  };

  const openSurveys = (e: MouseEvent) => {
    guardClick(e);
    if (!user) return onAlert('Please sign in first', '🔒');
    const tx =
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? `tr_${user.uid.slice(0, 8)}_${crypto.randomUUID().slice(0, 10)}`
        : `tr_${user.uid.slice(0, 8)}_${Date.now().toString(36)}`;
    setSurveyTxId(tx);
    trackAdEvent(
      {
        event: 'click',
        placement: 'offerwall_rewarded_video',
        zoneId: 0,
        meta: {
          action: 'open_theoremreach',
          provider: 'theoremreach',
          apiKey: THEOREMREACH_API_KEY,
          transactionId: tx,
        },
      },
      user
    ).catch(() => {});
    // Adsterra Direct Link at survey START
    fireSurveyAdsterra('start');
    setPanel('surveys');
    setSurveysOpen(true);
    onAlert('Surveys opening · complete tasks to earn AJ Coins 🪙', '📋');
  };

  const closeSurveys = () => {
    // Adsterra Direct Link at survey END / close
    fireSurveyAdsterra('end');
    setSurveysOpen(false);
    setSurveyTxId('');
    setPanel((cur) => (cur === 'surveys' ? 'none' : cur));
    onRefreshUser?.();
  };

  const togglePanel = (e: MouseEvent, next: HubPanel) => {
    guardClick(e);
    if (!user) return onAlert('Please sign in first', '🔒');
    setPanel((cur) => (cur === next ? 'none' : next));
  };

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
    onAlert(`${game.emoji} ${game.name} opening…`, '🎮');
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
          TheoremReach · Earn & Play · Watch Ads · AJ Coins 🪙
        </p>
      </div>

      <div className="rounded-2xl border border-indigo-500/25 bg-gradient-to-br from-[#0c1224]/80 to-[#050505] p-3 space-y-2">
        <p className="text-[9px] font-black uppercase tracking-[0.18em] text-indigo-300">
          Earn More
        </p>
        <div className="grid grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={openSurveys}
            className={`relative overflow-hidden rounded-2xl border p-3.5 text-left active:scale-[0.98] min-h-[108px] ${
              panel === 'surveys' || surveysOpen
                ? 'border-fuchsia-400/55 bg-gradient-to-br from-[#2a1038] to-[#0a0a0a]'
                : 'border-fuchsia-500/35 bg-gradient-to-br from-[#1a1028] via-[#120a1c] to-[#0a0a0a]'
            }`}
            style={{
              boxShadow:
                panel === 'surveys' || surveysOpen
                  ? '0 0 22px rgba(232,121,249,0.25)'
                  : '0 0 14px rgba(167,139,250,0.12)',
            }}
          >
            <div className="absolute inset-0 pointer-events-none opacity-60 bg-[radial-gradient(ellipse_at_20%_0%,rgba(232,121,249,0.28),transparent_55%)]" />
            <div className="relative flex flex-col h-full gap-2">
              <div className="w-9 h-9 rounded-xl bg-fuchsia-500/20 border border-fuchsia-400/35 flex items-center justify-center shadow-[0_0_12px_rgba(232,121,249,0.35)]">
                <ClipboardCheck size={16} className="text-fuchsia-300" />
              </div>
              <div>
                <p className="text-[12px] font-black text-white leading-tight">TheoremReach</p>
                <p className="text-[9px] font-black uppercase tracking-wider text-fuchsia-300 mt-1">
                  Surveys · Tasks
                </p>
              </div>
              <span className="mt-auto inline-flex items-center gap-1 text-[8px] font-bold text-zinc-500">
                Earn AJ Coins 🪙 <ExternalLink size={9} />
              </span>
            </div>
          </button>

          <button
            type="button"
            onClick={(e) => togglePanel(e, 'earnplay')}
            className={`relative overflow-hidden rounded-2xl border p-3.5 text-left active:scale-[0.98] min-h-[108px] ${
              panel === 'earnplay'
                ? 'border-sky-400/55 bg-gradient-to-br from-[#0a1a2a] to-[#0a0a0a]'
                : 'border-sky-500/35 bg-gradient-to-br from-[#0a1a2a] via-[#081018] to-[#0a0a0a]'
            }`}
          >
            <div className="relative flex flex-col h-full gap-2">
              <div className="w-9 h-9 rounded-xl bg-sky-500/20 border border-sky-400/30 flex items-center justify-center">
                <Gamepad2 size={16} className="text-sky-300" />
              </div>
              <div>
                <p className="text-[12px] font-black text-white leading-tight">Earn & Play</p>
                <p className="text-[9px] font-black uppercase tracking-wider text-sky-300 mt-1">
                  Games
                </p>
              </div>
              <span className="mt-auto inline-flex items-center gap-1 text-[8px] font-bold text-zinc-500">
                Download & Play <Download size={9} />
              </span>
            </div>
          </button>
        </div>
      </div>

      {panel === 'earnplay' ? (
        <div className="rounded-2xl border border-sky-500/25 bg-gradient-to-br from-[#061820]/90 to-[#050505] p-3.5 space-y-3.5">
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-sky-300">
            Earn & Play · Games
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {PREMIUM_DIRECT_GAMES.map((game) => {
              const isNetlify = String(game.downloadUrl).includes('netlify');
              return (
                <div
                  key={game.id}
                  className="relative overflow-hidden rounded-2xl border border-indigo-500/35 bg-gradient-to-br from-[#0c1224] via-[#0a0e1a] to-[#050505] p-3.5 flex flex-col min-h-[176px]"
                >
                  <div className="absolute inset-0 pointer-events-none opacity-50 bg-[radial-gradient(ellipse_at_30%_0%,rgba(99,102,241,0.22),transparent_55%)]" />
                  <div className="relative flex flex-col h-full gap-2.5">
                    <div className="w-16 h-16 rounded-2xl bg-indigo-500/15 border border-sky-400/35 overflow-hidden flex items-center justify-center shadow-[0_0_16px_rgba(56,189,248,0.2)]">
                      <img
                        src={game.logo}
                        alt={game.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[13px] font-black text-white leading-snug">
                        {game.name}
                      </p>
                      <p className="text-[10px] text-sky-200/80 font-bold mt-1 uppercase tracking-wider">
                        {isNetlify ? 'Netlify Play' : 'Direct Play'}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => playGame(e, game)}
                      className="mt-auto w-full py-3 rounded-xl text-white text-[11px] font-black uppercase tracking-wide flex items-center justify-center gap-1.5 active:scale-[0.97]"
                      style={{
                        background: 'linear-gradient(135deg,#2563eb 0%,#4f46e5 45%,#7c3aed 100%)',
                      }}
                    >
                      <Download size={14} strokeWidth={2.5} />
                      Play
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-2.5">
        <button
          type="button"
          onClick={(e) => togglePanel(e, 'faucet')}
          className={`relative overflow-hidden rounded-2xl border p-3.5 text-left active:scale-[0.98] min-h-[100px] ${
            panel === 'faucet'
              ? 'border-cyan-400/50 bg-gradient-to-br from-[#06252a] to-[#0a0a0a]'
              : 'border-cyan-500/30 bg-gradient-to-br from-[#0a1f24] via-[#071416] to-[#0a0a0a]'
          }`}
        >
          <div className="relative flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-cyan-500/20 border border-cyan-400/30 flex items-center justify-center shrink-0">
              <Sparkles size={16} className="text-cyan-300" />
            </div>
            <div className="min-w-0">
              <p className="text-[12px] font-black text-white leading-tight">Math & Captcha</p>
              <p className="text-[9px] font-black uppercase tracking-wider text-cyan-300 mt-1">
                Daily Faucet · +{MATH_CHALLENGE_COINS} / +{ALPHA_CAPTCHA_COINS} 🪙
              </p>
            </div>
          </div>
        </button>

        <button
          type="button"
          onClick={(e) => togglePanel(e, 'watchads')}
          className={`relative overflow-hidden rounded-2xl border p-3.5 text-left active:scale-[0.98] min-h-[100px] ${
            panel === 'watchads'
              ? 'border-rose-400/50 bg-gradient-to-br from-[#2a0a14] to-[#0a0a0a]'
              : 'border-rose-500/30 bg-gradient-to-br from-[#1f0a12] via-[#14060c] to-[#0a0a0a]'
          }`}
        >
          <div className="relative flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-rose-500/20 border border-rose-400/30 flex items-center justify-center shrink-0">
              <Play size={16} className="text-rose-300" />
            </div>
            <div className="min-w-0">
              <p className="text-[12px] font-black text-white leading-tight">Watch Ads</p>
              <p className="text-[9px] font-black uppercase tracking-wider text-rose-300 mt-1">
                30s verify · real payout coins · +2 AJ Coins expected
              </p>
            </div>
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

      {panel === 'watchads' ? (
        <div className="rounded-2xl border border-rose-500/20 bg-black/40 p-3 space-y-2">
          <p className="text-[9px] font-black uppercase tracking-widest text-rose-400">
            Watch Ads · 30s required · then claim
          </p>
          <RewardedVideoOffer user={user} onAlert={onAlert} onRefreshUser={onRefreshUser} />
        </div>
      ) : null}

      {surveysOpen && user?.uid && theoremSrc ? (
        <div
          className="fixed inset-0 z-[99999] bg-[#050505]"
          style={{ top: 0, left: 0, right: 0, bottom: 0 }}
        >
          <div
            className="absolute top-0 left-0 right-0 z-[100001] flex items-center gap-3 px-3 py-2.5 border-b border-fuchsia-500/30"
            style={{
              background:
                'linear-gradient(90deg, rgba(88,28,135,0.92), rgba(5,5,5,0.96), rgba(8,47,73,0.9))',
              boxShadow: '0 0 24px rgba(232,121,249,0.25)',
            }}
          >
            <div className="w-8 h-8 rounded-lg bg-fuchsia-500/25 border border-fuchsia-400/40 flex items-center justify-center shrink-0">
              <ClipboardCheck size={14} className="text-fuchsia-300" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-black text-white uppercase tracking-widest truncate">
                TheoremReach · Surveys
              </p>
              <p className="text-[9px] text-fuchsia-200/80 font-bold truncate">
                Complete tasks · AJ Coins via postback
              </p>
            </div>
            <button
              type="button"
              onClick={closeSurveys}
              className="w-10 h-10 rounded-full bg-black/70 border border-white/20 flex items-center justify-center active:scale-90 shrink-0"
              aria-label="Close surveys"
            >
              <X size={18} className="text-white" />
            </button>
          </div>
          <iframe
            title="TheoremReach Surveys"
            src={theoremSrc}
            className="absolute left-0 right-0 bottom-0 w-full border-0 bg-black"
            style={{ top: 52, height: 'calc(100% - 52px)', zIndex: 99999 }}
            allow="clipboard-write; payment; fullscreen"
            sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox allow-top-navigation allow-top-navigation-by-user-activation"
            referrerPolicy="no-referrer-when-downgrade"
          >
            Your browser doesn&apos;t support iframes
          </iframe>
        </div>
      ) : null}
    </div>
  );
}
