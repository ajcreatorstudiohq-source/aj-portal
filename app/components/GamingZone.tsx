'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ChevronRight, Lock, Download, Gift, Trophy } from 'lucide-react';
import {
  GAME_CATALOG,
  type GameProgressDoc,
} from '../lib/economy';
import { openCpaGripOfferWall } from '../lib/cpagrip';
import BannerAdSlot from './ads/BannerAdSlot';
import RewardedVideoOffer from './ads/RewardedVideoOffer';
import { trackAdEvent } from '../lib/ad-client';
import { MONETAG_INTERSTITIAL_ZONE } from '../lib/ads-config';
import type { OnRefreshUser } from '../lib/wallet-refresh';

type Props = {
  user: { uid: string; getIdToken: () => Promise<string> } | null;
  unlockedGames: string[];
  gameProgress: Record<string, GameProgressDoc>;
  onBack: () => void;
  onAlert: (msg: string, icon?: string) => void;
  onRefreshUser?: OnRefreshUser;
  /** Optional interstitial before opening Ludo */
  onOpenWithAd?: (open: () => void) => void;
  cleanupAds?: () => void;
};

async function authFetch(path: string, user: Props['user'], init?: RequestInit) {
  if (!user) throw new Error('not_signed_in');
  const token = await user.getIdToken();
  const res = await fetch(path, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(init?.headers || {}),
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || `http_${res.status}`);
    (err as Error & { data?: unknown }).data = data;
    throw err;
  }
  return data;
}

export default function GamingZone({
  user,
  unlockedGames,
  gameProgress,
  onBack,
  onAlert,
  onRefreshUser,
  onOpenWithAd,
  cleanupAds,
}: Props) {
  const [tab, setTab] = useState<'games' | 'offerwall'>('games');
  const [selectedGameUrl, setSelectedGameUrl] = useState<string | null>(null);
  const [selectedGameId, setSelectedGameId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [downloadPct, setDownloadPct] = useState<Record<string, number>>({});
  const catalog = useMemo(() => GAME_CATALOG, []);

  const isInstalled = useCallback(
    (gameId: string) => {
      if (gameProgress?.[gameId]?.installed) return true;
      return unlockedGames.includes(gameId);
    },
    [gameProgress, unlockedGames]
  );

  const installGame = async (gameId: string) => {
    if (!user) return onAlert('Please sign in first', '🔒');
    setBusyId(gameId);
    setDownloadPct((p) => ({ ...p, [gameId]: 5 }));
    // Simulated download progress for local game package install UX
    let pct = 5;
    const tick = setInterval(() => {
      pct = Math.min(92, pct + 8 + Math.floor(Math.random() * 10));
      setDownloadPct((p) => ({ ...p, [gameId]: pct }));
    }, 180);
    try {
      const game = catalog.find((g) => g.id === gameId);
      // Prefetch game shell so "download" is real network work
      if (game?.url) {
        try { await fetch(game.url, { cache: 'force-cache' }); } catch {}
      }
      const data = await authFetch('/api/games/install', user, {
        method: 'POST',
        body: JSON.stringify({ gameId }),
      });
      clearInterval(tick);
      setDownloadPct((p) => ({ ...p, [gameId]: 100 }));
      onAlert(
        data.message ||
          'Game unlocked — Pending Verification. AJ Coins 🪙 only after verified postback.',
        '⏳'
      );
      onRefreshUser?.();
    } catch (e: unknown) {
      clearInterval(tick);
      const msg = e instanceof Error ? e.message : 'install_failed';
      onAlert(`Download failed: ${msg}`, '⚠️');
      setDownloadPct((p) => ({ ...p, [gameId]: 0 }));
    } finally {
      setBusyId(null);
    }
  };

  const claimMilestone = async (gameId: string, level: number) => {
    if (!user) return;
    try {
      const data = await authFetch('/api/games/milestone', user, {
        method: 'POST',
        body: JSON.stringify({ gameId, level, reportedLevel: level }),
      });
      const credited = Number(data.creditedCoins || 0);
      await onRefreshUser?.(
        !data.duplicate && credited > 0
          ? {
              ...(typeof data.balance === 'number' ? { balance: data.balance } : {}),
              creditedCoins: credited,
            }
          : typeof data.balance === 'number'
            ? { balance: data.balance }
            : undefined
      );
      if (data.duplicate) {
        onAlert('Milestone already claimed', 'ℹ️');
      } else {
        onAlert(data.message || `+${data.creditedCoins} AJ Coins`, '💰');
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'claim_failed';
      if (msg !== 'level_not_reached') {
        onAlert(`Reward: ${msg}`, '⚠️');
      }
    }
  };

  const reportLevel = async (gameId: string, level: number) => {
    if (!user || !gameId || level < 1) return;
    try {
      await authFetch('/api/games/milestone', user, {
        method: 'PATCH',
        body: JSON.stringify({ gameId, level }),
      });
      const game = catalog.find((g) => g.id === gameId);
      const progress = gameProgress?.[gameId];
      const claimed = progress?.claimedMilestones || [];
      if (game?.milestones.includes(level) && !claimed.includes(level)) {
        await claimMilestone(gameId, level);
      } else {
        onRefreshUser?.();
      }
    } catch {
      // non-fatal during gameplay
    }
  };

  // Listen for in-game level milestone + Adsterra show requests
  useEffect(() => {
    if (!user) return;
    const handler = (e: MessageEvent) => {
      if (!e.data || typeof e.data !== 'object') return;
      const type = e.data.type;
      if (type === 'GAME_SHOW_AD') {
        try {
          window.open(
            'https://www.effectivecpmnetwork.com/b8jtkn6i4?key=77409a0e0aa4602b6d03798ff53516b3',
            '_blank',
            'noopener,noreferrer'
          );
        } catch {
          /* ignore */
        }
        return;
      }
      if (
        type === 'GAME_LEVEL_REACHED' ||
        type === 'GAME_MILESTONE' ||
        type === 'game_level'
      ) {
        const gameId = String(e.data.gameId || selectedGameId || '');
        const level = Math.floor(Number(e.data.level) || 0);
        if (gameId && level > 0) reportLevel(gameId, level);
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, selectedGameId, gameProgress]);

  const openGame = (gameId: string, url: string) => {
    if (!isInstalled(gameId)) {
      return onAlert('Install this game first to unlock play & milestone earnings.', '🔒');
    }
    const open = () => {
      setSelectedGameId(gameId);
      setSelectedGameUrl(url);
      trackAdEvent(
        {
          event: 'impression',
          placement: 'games_interstitial',
          zoneId: MONETAG_INTERSTITIAL_ZONE,
          meta: { gameId },
        },
        user
      ).catch(() => {});
    };
    if (gameId === 'ludo' && onOpenWithAd) onOpenWithAd(open);
    else open();
  };

  const openPartnerOffer = (offerId: string) => {
    if (!user) return onAlert('Please sign in first', '🔒');
    trackAdEvent(
      {
        event: 'click',
        placement: 'offerwall_rewarded_video',
        zoneId: MONETAG_INTERSTITIAL_ZONE,
        meta: { action: 'open_partner_offer', offerId, provider: 'cpagrip' },
      },
      user
    ).catch(() => {});
    const result = openCpaGripOfferWall(user.uid);
    if (result.ok) {
      onAlert(
        'CPAGrip wall opened. Finish a real lead — AJ Coins credit only after verified postback.',
        '🔗'
      );
    } else {
      onAlert(result.error || 'Could not open offer partners.', '⚠️');
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#050505]">
      <div className="sticky top-0 z-40 bg-[#050505]/95 backdrop-blur-xl border-b border-white/5 px-4 py-3 flex items-center gap-3">
        <button
          onClick={() => {
            if (selectedGameUrl) {
              cleanupAds?.();
              setSelectedGameUrl(null);
              setSelectedGameId(null);
              return;
            }
            onBack();
          }}
          className="p-1.5 rounded-xl bg-white/5 border border-white/10 active:scale-90 transition-all"
        >
          <ArrowLeft size={14} className="text-gray-400" />
        </button>
        <img src="/logo.png" alt="AJ" className="w-8 h-8 rounded-xl shadow-[0_0_14px_rgba(236,72,153,0.5)]" />
        <h1 className="text-sm font-black bg-gradient-to-r from-pink-500 to-cyan-400 bg-clip-text text-transparent uppercase tracking-widest">
          Gaming Zone
        </h1>
        {!selectedGameUrl && (
          <div className="ml-auto flex gap-1 bg-white/5 rounded-xl p-0.5 border border-white/10">
            <button
              onClick={() => setTab('games')}
              className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase ${tab === 'games' ? 'bg-pink-600 text-white' : 'text-gray-400'}`}
            >
              Games
            </button>
            <button
              onClick={() => setTab('offerwall')}
              className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase ${tab === 'offerwall' ? 'bg-amber-500 text-black' : 'text-gray-400'}`}
            >
              Offerwall
            </button>
          </div>
        )}
      </div>

      {selectedGameUrl ? (
        <div className="flex-1 flex flex-col">
          <div className="px-4 py-2 flex items-center justify-between gap-3">
            <p className="text-[10px] text-gray-400 font-bold">
              Playing · milestones auto-claim at L
              {catalog.find((g) => g.id === selectedGameId)?.milestones.join('/') || '—'}
            </p>
            <button
              onClick={() => {
                cleanupAds?.();
                setSelectedGameUrl(null);
                setSelectedGameId(null);
              }}
              className="text-[10px] text-gray-400 font-black active:scale-90"
            >
              ← Back
            </button>
          </div>
          <iframe
            key={selectedGameUrl}
            src={(() => {
              const base = selectedGameUrl || '';
              const params = new URLSearchParams();
              params.set('ajGameId', selectedGameId || '');
              if (user?.uid) params.set('uid', user.uid);
              if (typeof window !== 'undefined') {
                try {
                  const room = new URLSearchParams(window.location.search).get('room');
                  if (room) params.set('room', room);
                } catch {
                  /* ignore */
                }
              }
              return `${base}${base.includes('?') ? '&' : '?'}${params.toString()}`;
            })()}
            className="flex-1 w-full border-0 bg-black"
            allow="autoplay; fullscreen; gyroscope; accelerometer; clipboard-write; encrypted-media; picture-in-picture"
            allowFullScreen
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox allow-pointer-lock allow-top-navigation-by-user-activation allow-downloads allow-presentation"
            title="Game"
            style={{ minHeight: 'calc(100vh - 120px)', display: 'block' }}
            onError={() => onAlert('Game failed to load. Try another game.', '⚠️')}
          />
        </div>
      ) : tab === 'offerwall' ? (
        <div className="px-4 py-4 space-y-4">
          <div className="rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-900/30 to-orange-950/40 p-4">
            <div className="flex items-center gap-2 mb-2">
              <Gift size={16} className="text-amber-400" />
              <p className="text-sm font-black text-white">Offerwall Rewards</p>
            </div>
            <p className="text-[11px] text-gray-300 leading-relaxed">
              Complete verified partner offers or watch a full rewarded video to earn{' '}
              <span className="text-amber-300 font-bold">AJ Coins</span>. No credit without real task
              completion.
            </p>
          </div>

          <RewardedVideoOffer
            user={user}
            onAlert={onAlert}
            onRefreshUser={onRefreshUser}
          />

          <BannerAdSlot placement="games_banner" user={user} label="Offerwall" />

          <button
            type="button"
            onClick={() => {
              if (!user) return onAlert('Please sign in first', '🔒');
              trackAdEvent(
                {
                  event: 'click',
                  placement: 'offerwall_rewarded_video',
                  zoneId: MONETAG_INTERSTITIAL_ZONE,
                  meta: { action: 'open_partners', provider: 'cpagrip' },
                },
                user
              ).catch(() => {});
              const result = openCpaGripOfferWall(user.uid);
              if (result.ok) {
                onAlert(
                  'CPAGrip offer wall opened. AJ Coins credit only after lead/success postback.',
                  '🔗'
                );
              } else {
                onAlert(result.error || 'Could not open offer partners.', '⚠️');
              }
            }}
            className="block w-full text-center bg-white/5 border border-white/10 rounded-2xl p-4 text-sm font-black text-cyan-300 active:scale-95"
          >
            Open Offer Partners ↗
          </button>

          {[
            { id: 'survey_starter', title: 'Starter Survey', note: 'Complete a short partner survey' },
            { id: 'app_trial', title: 'App Trial Offer', note: 'Install & open a partner app' },
          ].map((offer) => (
            <button
              key={offer.id}
              type="button"
              onClick={() => openPartnerOffer(offer.id)}
              className="w-full flex items-center gap-3 bg-white/5 border border-white/10 rounded-2xl p-4 active:scale-95 text-left"
            >
              <Trophy size={18} className="text-amber-400" />
              <div className="flex-1">
                <p className="text-sm font-black text-white">{offer.title}</p>
                <p className="text-[10px] text-gray-400">{offer.note} · verified completion only</p>
              </div>
              <ChevronRight size={16} className="text-gray-500" />
            </button>
          ))}

          <p className="text-[9px] text-gray-500 text-center px-2">
            Video ads credit via <code className="text-gray-400">/api/ads/rewarded</code>.
            CPAGrip postbacks: <code className="text-gray-400">/api/postback</code>.
          </p>
        </div>
      ) : (
        <div className="px-4 py-4 space-y-3">
          <BannerAdSlot placement="games_banner" user={user} label="Games" />
          <div className="rounded-2xl border border-pink-500/20 bg-pink-950/20 p-3">
            <p className="text-[11px] text-gray-300 leading-relaxed">
              <span className="text-pink-300 font-black">Download & Level Unlock:</span> No free game dumps.
              Download/install unlocks play only (Pending Verification). AJ Coins 🪙 credit via
              verified CPAGrip postback or milestone clears — never from a click alone.
            </p>
          </div>

          {catalog.map((game) => {
            const installed = isInstalled(game.id);
            const progress = gameProgress?.[game.id];
            const level = progress?.level || 0;
            const claimed = progress?.claimedMilestones || [];
            return (
              <div
                key={game.id}
                className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 hover:border-pink-500/30"
              >
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{game.emoji}</span>
                  <div className="text-left flex-1 min-w-0">
                    <p className="text-sm font-black text-white flex items-center gap-1.5">
                      {game.name}
                      {!installed && !game.comingSoon && (
                        <Lock size={12} className="text-amber-400" />
                      )}
                    </p>
                    <p className="text-[10px] text-gray-400">{game.desc}</p>
                    {!game.comingSoon && installed && (
                      <p className="text-[9px] text-cyan-400/90 mt-1 font-bold">
                        Level {level} · Milestones{' '}
                        {game.milestones
                          .map((m) => (claimed.includes(m) ? `L${m}✓` : `L${m}`))
                          .join(' · ')}
                      </p>
                    )}
                  </div>
                </div>

                <div className="mt-3 flex gap-2">
                  {game.comingSoon ? (
                    <button
                      onClick={() => onAlert(`${game.name} coming soon! 🔜`)}
                      className="flex-1 py-2 rounded-xl bg-white/5 border border-white/10 text-[10px] font-black text-gray-400"
                    >
                      COMING SOON
                    </button>
                  ) : !installed ? (
                    <div className="flex-1 space-y-1.5">
                      <button
                        disabled={busyId === game.id}
                        onClick={() => installGame(game.id)}
                        className="w-full py-2 rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 text-black text-[10px] font-black flex items-center justify-center gap-1.5 disabled:opacity-50"
                      >
                        <Download size={12} />
                        {busyId === game.id
                          ? `Downloading ${downloadPct[game.id] || 0}%…`
                          : 'Download & Install'}
                      </button>
                      {(downloadPct[game.id] || 0) > 0 && (downloadPct[game.id] || 0) < 100 && (
                        <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-amber-400 to-orange-500 transition-all"
                            style={{ width: `${downloadPct[game.id]}%` }}
                          />
                        </div>
                      )}
                    </div>
                  ) : (
                    <>
                      <button
                        onClick={() => openGame(game.id, game.url)}
                        className="flex-1 py-2 rounded-xl bg-gradient-to-r from-pink-600 to-fuchsia-600 text-white text-[10px] font-black"
                      >
                        Play
                      </button>
                      {game.milestones
                        .filter((m) => level >= m && !claimed.includes(m))
                        .slice(0, 1)
                        .map((m) => (
                          <button
                            key={m}
                            onClick={() => claimMilestone(game.id, m)}
                            className="px-3 py-2 rounded-xl bg-gradient-to-r from-yellow-400 to-orange-500 text-black text-[10px] font-black"
                          >
                            Claim L{m}
                          </button>
                        ))}
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
