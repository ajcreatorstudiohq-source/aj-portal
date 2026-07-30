'use client';

import { useEffect, useRef, useState } from 'react';
import { Copy, Eye, Gift, Radio, Swords, X } from 'lucide-react';
import {
  startAgoraAudience,
  startAgoraHost,
  stopAgoraSession,
  type AgoraLiveSession,
} from '../../lib/agora-live';
import { normalizeJoinCode } from '../../lib/join-codes';

type LiveRoom = {
  id: string;
  hostName?: string;
  hostPhoto?: string;
  hostId?: string;
  liveViewers?: number;
  title?: string;
  joinCode?: string;
};

type GiftItem = {
  id: number;
  name: string;
  cost: number;
  icon: string;
  mediaUrl?: string;
};

type UserLike = {
  uid: string;
  getIdToken: () => Promise<string>;
} | null;

type Props = {
  user: UserLike;
  rooms: LiveRoom[];
  onAlert: (msg: string, icon?: string) => void;
  onStartHost: () => Promise<string | null>;
  onEndHost: () => Promise<void>;
  hostActive?: boolean;
  hostRoomId?: string;
  giftCatalog?: GiftItem[];
  onSendGift?: (toUid: string, gift: GiftItem, roomId: string) => void | Promise<void>;
  onOpenFreeMatch?: () => void;
  onWatchingChange?: (roomId: string | null) => void;
  /** Parent sets this after paste-join resolves to an Agora live room */
  externalWatchId?: string;
  /** Paste Live ID or PK Match ID → parent resolves (live watch or PK join) */
  onJoinByCode?: (code: string) => void | Promise<void>;
  onCopyCode?: (code: string) => void;
};

/**
 * TikReels → Live tab: Agora live reels + short Live/Match IDs + gifting.
 */
export default function TikReelsLiveTab({
  user,
  rooms,
  onAlert,
  onStartHost,
  onEndHost,
  hostActive = false,
  hostRoomId = '',
  giftCatalog = [],
  onSendGift,
  onOpenFreeMatch,
  onWatchingChange,
  externalWatchId = '',
  onJoinByCode,
  onCopyCode,
}: Props) {
  const [watchingId, setWatchingId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [giftOpen, setGiftOpen] = useState(false);
  const [joinInput, setJoinInput] = useState('');
  const hostSessionRef = useRef<AgoraLiveSession | null>(null);
  const audienceSessionRef = useRef<AgoraLiveSession | null>(null);
  const hostVideoRef = useRef<HTMLDivElement | null>(null);
  const audienceVideoRef = useRef<HTMLDivElement | null>(null);
  const lastExternalWatch = useRef('');

  useEffect(() => {
    return () => {
      void stopAgoraSession(hostSessionRef.current);
      void stopAgoraSession(audienceSessionRef.current);
      hostSessionRef.current = null;
      audienceSessionRef.current = null;
    };
  }, []);

  const beginHost = async () => {
    if (!user) return onAlert('Sign in to Go Live', '🔒');
    if (busy) return;
    setBusy(true);
    try {
      await stopAgoraSession(audienceSessionRef.current);
      audienceSessionRef.current = null;
      setWatchingId(null);

      const roomId = await onStartHost();
      if (!roomId) throw new Error('live_start_failed');

      await new Promise((r) => setTimeout(r, 80));
      const el = hostVideoRef.current;
      if (!el) throw new Error('video_container_missing');

      await stopAgoraSession(hostSessionRef.current);
      hostSessionRef.current = await startAgoraHost({
        channel: roomId,
        getIdToken: () => user.getIdToken(),
        videoContainer: el,
      });
      onAlert(`Live ID ${roomId} — copy & send to friends`, '🔴');
      onCopyCode?.(roomId);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Could not start live';
      onAlert(msg, '⚠️');
      try {
        await onEndHost();
      } catch {
        /* ignore */
      }
    } finally {
      setBusy(false);
    }
  };

  const endHost = async () => {
    setBusy(true);
    try {
      await stopAgoraSession(hostSessionRef.current);
      hostSessionRef.current = null;
      await onEndHost();
    } finally {
      setBusy(false);
      setGiftOpen(false);
    }
  };

  const watchRoom = async (room: LiveRoom) => {
    if (!user) return onAlert('Sign in to watch live', '🔒');
    if (busy || hostActive) return;
    setBusy(true);
    try {
      await stopAgoraSession(audienceSessionRef.current);
      audienceSessionRef.current = null;
      setWatchingId(room.id);
      onWatchingChange?.(room.id);
      await new Promise((r) => setTimeout(r, 60));
      const el = audienceVideoRef.current;
      if (!el) throw new Error('viewer_container_missing');
      audienceSessionRef.current = await startAgoraAudience({
        channel: room.id,
        getIdToken: () => user.getIdToken(),
        videoContainer: el,
      });
    } catch (e: unknown) {
      setWatchingId(null);
      onAlert(e instanceof Error ? e.message : 'Could not join live', '⚠️');
    } finally {
      setBusy(false);
    }
  };

  // External paste-join → start watching this Agora room
  useEffect(() => {
    const id = normalizeJoinCode(externalWatchId || '');
    if (!id || id === lastExternalWatch.current || hostActive) return;
    lastExternalWatch.current = id;
    const room =
      rooms.find(
        (r) =>
          normalizeJoinCode(r.id) === id ||
          normalizeJoinCode(String(r.joinCode || '')) === id
      ) || ({ id, hostName: 'Live', hostId: '' } as LiveRoom);
    void watchRoom(room);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [externalWatchId]);

  const leaveWatch = async () => {
    await stopAgoraSession(audienceSessionRef.current);
    audienceSessionRef.current = null;
    setWatchingId(null);
    onWatchingChange?.(null);
    setGiftOpen(false);
  };

  const submitJoinCode = async () => {
    const code = normalizeJoinCode(joinInput);
    if (!code) return onAlert('Enter Live ID or PK Match ID', '🔑');
    const local = rooms.find(
      (r) =>
        normalizeJoinCode(r.id) === code ||
        normalizeJoinCode(String(r.joinCode || '')) === code
    );
    if (local) {
      setJoinInput('');
      return void watchRoom(local);
    }
    if (onJoinByCode) {
      setJoinInput('');
      await onJoinByCode(code);
      return;
    }
    onAlert('Could not find that ID', '⚠️');
  };

  const giftPanel = (toUid: string, roomId: string) =>
    giftOpen && giftCatalog.length > 0 && onSendGift ? (
      <div className="absolute inset-x-0 bottom-0 z-30 bg-black/90 border-t border-white/10 p-4 pb-8 rounded-t-3xl">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-black text-white">Send a Gift 🎁</p>
          <button type="button" onClick={() => setGiftOpen(false)}>
            <X size={18} className="text-gray-400" />
          </button>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {giftCatalog.map((g) => (
            <button
              key={g.id}
              type="button"
              onClick={() => {
                void onSendGift(toUid, g, roomId);
                setGiftOpen(false);
              }}
              className="flex flex-col items-center gap-1.5 bg-white/5 border border-white/10 rounded-2xl p-3 active:scale-90 hover:border-yellow-500/40"
            >
              <span className="text-2xl">{g.icon}</span>
              <span className="text-[10px] font-black text-white">{g.name}</span>
              <span className="text-[9px] text-yellow-300 font-bold">{g.cost} 🪙</span>
            </button>
          ))}
        </div>
        <p className="text-[9px] text-gray-500 text-center mt-3">
          Creator gets 60% · Admin Hub 40%
        </p>
      </div>
    ) : null;

  if (hostActive) {
    return (
      <div className="relative flex-1 min-h-0 bg-black flex flex-col">
        <div ref={hostVideoRef} className="absolute inset-0 bg-black" />
        <div className="relative z-10 p-3">
          <div className="inline-flex items-center gap-2 bg-black/60 backdrop-blur rounded-2xl px-3 py-2 border border-white/10">
            <span className="text-[9px] text-gray-400 font-black uppercase">Live ID</span>
            <span className="text-white text-lg font-black font-mono tracking-[0.15em]">
              {hostRoomId || '······'}
            </span>
            {hostRoomId ? (
              <button
                type="button"
                onClick={() => {
                  onCopyCode?.(hostRoomId);
                  onAlert(`Live ID ${hostRoomId} copied`, '📋');
                }}
                className="p-1.5 rounded-lg bg-pink-500/20 border border-pink-500/40"
              >
                <Copy size={14} className="text-pink-300" />
              </button>
            ) : null}
          </div>
        </div>
        <div className="relative z-10 mt-auto p-4 flex items-center justify-between gap-2 bg-gradient-to-t from-black via-black/70 to-transparent">
          <div>
            <p className="text-xs font-black text-red-400 uppercase tracking-widest flex items-center gap-1">
              <Radio size={12} className="animate-pulse" /> Live · Free to join
            </p>
            <p className="text-[10px] text-gray-300">Share Live ID — friends join instantly</p>
          </div>
          <div className="flex items-center gap-2">
            {onOpenFreeMatch && (
              <button
                type="button"
                onClick={onOpenFreeMatch}
                className="px-3 py-2 rounded-xl bg-orange-500/20 border border-orange-500/40 text-orange-300 text-[10px] font-black uppercase flex items-center gap-1"
              >
                <Swords size={12} /> Match
              </button>
            )}
            <button
              type="button"
              disabled={busy}
              onClick={() => void endHost()}
              className="px-4 py-2 rounded-xl bg-red-600 text-white text-[11px] font-black uppercase"
            >
              End Live
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (watchingId) {
    const room = rooms.find((r) => r.id === watchingId);
    const hostUid = String(room?.hostId || '');
    return (
      <div className="relative flex-1 min-h-0 bg-black flex flex-col">
        <div ref={audienceVideoRef} className="absolute inset-0 bg-black" />
        <div className="relative z-10 p-3 flex items-center justify-between">
          <div className="flex items-center gap-2 bg-black/50 backdrop-blur rounded-full px-3 py-1">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <span className="text-[10px] font-black text-white uppercase">
              @{room?.hostName || 'Live'}
            </span>
            <span className="text-[9px] text-cyan-300 font-mono">{watchingId}</span>
            <span className="text-[9px] text-gray-300 flex items-center gap-0.5">
              <Eye size={10} /> {room?.liveViewers || 0}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {hostUid && onSendGift && (
              <button
                type="button"
                onClick={() => setGiftOpen(true)}
                className="p-2 rounded-full bg-yellow-500/20 border border-yellow-500/40"
              >
                <Gift size={16} className="text-yellow-300" />
              </button>
            )}
            <button
              type="button"
              onClick={() => void leaveWatch()}
              className="p-2 rounded-full bg-black/50 border border-white/20"
            >
              <X size={16} className="text-white" />
            </button>
          </div>
        </div>
        {hostUid ? giftPanel(hostUid, watchingId) : null}
      </div>
    );
  }

  return (
    <div className="flex-1 min-h-0 flex flex-col">
      <div className="px-4 py-3 flex items-center justify-between gap-2 border-b border-white/5">
        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">
          Free live · short ID · gift
        </p>
        <div className="flex items-center gap-2">
          {onOpenFreeMatch && (
            <button
              type="button"
              onClick={onOpenFreeMatch}
              className="px-3 py-1.5 rounded-xl border border-orange-500/40 text-orange-300 text-[10px] font-black uppercase flex items-center gap-1"
            >
              <Swords size={12} /> Free Match
            </button>
          )}
          <button
            type="button"
            disabled={busy || !user}
            onClick={() => void beginHost()}
            className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-red-600 to-pink-600 text-[10px] font-black uppercase text-white active:scale-95"
          >
            Go Live
          </button>
        </div>
      </div>

      {/* Ludo-style join by short ID */}
      <div className="px-4 py-3 border-b border-white/5 flex gap-2">
        <input
          value={joinInput}
          onChange={(e) => setJoinInput(e.target.value.toUpperCase())}
          placeholder="Live ID or Match ID"
          className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm font-mono tracking-widest text-center focus:outline-none focus:border-cyan-500/50"
          autoCapitalize="characters"
        />
        <button
          type="button"
          disabled={busy || !user}
          onClick={() => void submitJoinCode()}
          className="px-4 py-2 rounded-xl bg-cyan-600/80 text-white text-[10px] font-black uppercase active:scale-95"
        >
          Join
        </button>
      </div>

      <div
        className="flex-1 overflow-y-scroll snap-y snap-mandatory scrollbar-hide"
        style={{ scrollSnapType: 'y mandatory', WebkitOverflowScrolling: 'touch' }}
      >
        {rooms.length === 0 && (
          <div className="min-h-[70vh] snap-start flex flex-col items-center justify-center gap-3 px-6 text-center">
            <Radio size={36} className="text-pink-500/60" />
            <p className="text-sm font-black text-white">No live streams yet</p>
            <p className="text-[11px] text-gray-400">
              Go Live free — share your short Live ID. Or paste a friend&apos;s Match ID above.
            </p>
          </div>
        )}
        {rooms.map((room) => (
          <button
            key={room.id}
            type="button"
            onClick={() => void watchRoom(room)}
            className="relative w-full min-h-screen snap-start flex flex-col justify-end overflow-hidden text-left"
            style={{ scrollSnapAlign: 'start' }}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-pink-950 via-[#120810] to-cyan-950" />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-24 h-24 rounded-full border-2 border-red-500/50 bg-black/40 flex items-center justify-center">
                {room.hostPhoto ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={room.hostPhoto}
                    alt=""
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  <Radio size={32} className="text-red-400 animate-pulse" />
                )}
              </div>
            </div>
            <div className="relative z-10 p-5 pb-24 bg-gradient-to-t from-black via-black/80 to-transparent">
              <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-red-400 mb-2">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" /> LIVE · FREE
              </span>
              <p className="text-lg font-black text-white">@{room.hostName || 'Creator'}</p>
              <p className="text-[12px] text-cyan-300 font-mono tracking-widest mt-1">
                ID {room.joinCode || room.id}
              </p>
              <p className="text-[11px] text-gray-300 mt-1 flex items-center gap-1">
                <Eye size={12} /> {Number(room.liveViewers || 0)} watching · Tap to join · Gift inside
              </p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
