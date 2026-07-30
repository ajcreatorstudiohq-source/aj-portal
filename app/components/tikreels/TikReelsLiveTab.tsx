'use client';

import { useEffect, useRef, useState } from 'react';
import { Eye, Radio, X } from 'lucide-react';
import {
  startAgoraAudience,
  startAgoraHost,
  stopAgoraSession,
  type AgoraLiveSession,
} from '../../lib/agora-live';

type LiveRoom = {
  id: string;
  hostName?: string;
  hostPhoto?: string;
  hostId?: string;
  liveViewers?: number;
  title?: string;
};

type UserLike = {
  uid: string;
  getIdToken: () => Promise<string>;
} | null;

type Props = {
  user: UserLike;
  rooms: LiveRoom[];
  onAlert: (msg: string, icon?: string) => void;
  onStartHost: () => Promise<string | null>; // returns channel/roomId
  onEndHost: () => Promise<void>;
  hostActive?: boolean;
  hostRoomId?: string;
};

/**
 * TikReels → Live tab: vertical snap reels of active Agora live streams.
 * Host can Go Live from this tab (no global Social Hub buttons).
 */
export default function TikReelsLiveTab({
  user,
  rooms,
  onAlert,
  onStartHost,
  onEndHost,
  hostActive = false,
  hostRoomId = '',
}: Props) {
  const [watchingId, setWatchingId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const hostSessionRef = useRef<AgoraLiveSession | null>(null);
  const audienceSessionRef = useRef<AgoraLiveSession | null>(null);
  const hostVideoRef = useRef<HTMLDivElement | null>(null);
  const audienceVideoRef = useRef<HTMLDivElement | null>(null);

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

      // Wait a tick for host video container mount
      await new Promise((r) => setTimeout(r, 80));
      const el = hostVideoRef.current;
      if (!el) throw new Error('video_container_missing');

      await stopAgoraSession(hostSessionRef.current);
      hostSessionRef.current = await startAgoraHost({
        channel: roomId,
        getIdToken: () => user.getIdToken(),
        videoContainer: el,
      });
      onAlert('You are live on TikReels · Agora', '🔴');
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

  const leaveWatch = async () => {
    await stopAgoraSession(audienceSessionRef.current);
    audienceSessionRef.current = null;
    setWatchingId(null);
  };

  if (hostActive) {
    return (
      <div className="relative flex-1 min-h-0 bg-black flex flex-col">
        <div ref={hostVideoRef} className="absolute inset-0 bg-black" />
        <div className="relative z-10 mt-auto p-4 flex items-center justify-between bg-gradient-to-t from-black via-black/70 to-transparent">
          <div>
            <p className="text-xs font-black text-red-400 uppercase tracking-widest flex items-center gap-1">
              <Radio size={12} className="animate-pulse" /> Live · Agora
            </p>
            <p className="text-[10px] text-gray-300 font-mono">{hostRoomId}</p>
          </div>
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
    );
  }

  if (watchingId) {
    const room = rooms.find((r) => r.id === watchingId);
    return (
      <div className="relative flex-1 min-h-0 bg-black flex flex-col">
        <div ref={audienceVideoRef} className="absolute inset-0 bg-black" />
        <div className="relative z-10 p-3 flex items-center justify-between">
          <div className="flex items-center gap-2 bg-black/50 backdrop-blur rounded-full px-3 py-1">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <span className="text-[10px] font-black text-white uppercase">
              @{room?.hostName || 'Live'}
            </span>
            <span className="text-[9px] text-gray-300 flex items-center gap-0.5">
              <Eye size={10} /> {room?.liveViewers || 0}
            </span>
          </div>
          <button
            type="button"
            onClick={() => void leaveWatch()}
            className="p-2 rounded-full bg-black/50 border border-white/20"
          >
            <X size={16} className="text-white" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 min-h-0 flex flex-col">
      <div className="px-4 py-3 flex items-center justify-between border-b border-white/5">
        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">
          Swipe live broadcasts · Agora
        </p>
        <button
          type="button"
          disabled={busy || !user}
          onClick={() => void beginHost()}
          className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-red-600 to-pink-600 text-[10px] font-black uppercase text-white active:scale-95"
        >
          Go Live
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
              Be the first — tap Go Live to broadcast inside TikReels.
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
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" /> LIVE
              </span>
              <p className="text-lg font-black text-white">@{room.hostName || 'Creator'}</p>
              <p className="text-[11px] text-gray-300 mt-1 flex items-center gap-1">
                <Eye size={12} /> {Number(room.liveViewers || 0)} watching · Tap to join
              </p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
