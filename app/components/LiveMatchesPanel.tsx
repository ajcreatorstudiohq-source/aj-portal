'use client';

import { useEffect, useState } from 'react';
import { Radio, RefreshCw, ExternalLink } from 'lucide-react';

type MatchItem = {
  id: string;
  title: string;
  channel: string;
  thumb: string;
  live: boolean;
};

type Props = {
  youtubeApiKey: string;
  onAlert: (msg: string, icon?: string) => void;
  onWatchEarn?: () => void;
};

/** Playable embed IDs used when the live API is empty / quota-blocked */
const FALLBACK_MATCHES: MatchItem[] = [
  {
    id: 'aqz-KE-bpKQ',
    title: 'Match Stream — Smooth Playback Check',
    channel: 'AJ Live Sports',
    thumb: 'https://i.ytimg.com/vi/aqz-KE-bpKQ/hqdefault.jpg',
    live: false,
  },
  {
    id: 'jNQXAC9IVRw',
    title: 'Embed Playback Fallback',
    channel: 'AJ Super Portal',
    thumb: 'https://i.ytimg.com/vi/jNQXAC9IVRw/hqdefault.jpg',
    live: false,
  },
];

function mapYtItems(items: any[], live: boolean): MatchItem[] {
  return (items || [])
    .map((it: any) => ({
      id: it.id?.videoId || '',
      title: it.snippet?.title || 'Live Match',
      channel: it.snippet?.channelTitle || 'Live',
      thumb:
        it.snippet?.thumbnails?.medium?.url ||
        it.snippet?.thumbnails?.default?.url ||
        '',
      live,
    }))
    .filter((m: MatchItem) => !!m.id);
}

/**
 * Live Matches panel — loads Pakistan / cricket live streams via YouTube Data API
 * with resilient fallbacks so playback never hard-fails.
 */
export default function LiveMatchesPanel({ youtubeApiKey, onAlert, onWatchEarn }: Props) {
  const [matches, setMatches] = useState<MatchItem[]>(FALLBACK_MATCHES);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [watchedMs, setWatchedMs] = useState(0);

  const loadMatches = async () => {
    setLoading(true);
    try {
      if (!youtubeApiKey) {
        setMatches(FALLBACK_MATCHES);
        return;
      }
      const qLive = encodeURIComponent('Pakistan cricket live');
      const liveUrl =
        `https://www.googleapis.com/youtube/v3/search?part=snippet&eventType=live&type=video&maxResults=6&q=${qLive}&key=${youtubeApiKey}`;
      const liveRes = await fetch(liveUrl);
      if (liveRes.ok) {
        const liveData = await liveRes.json();
        const liveItems = mapYtItems(liveData.items || [], true);
        if (liveItems.length) {
          setMatches(liveItems);
          return;
        }
      }
      // No live events — fall back to recent Pakistan cricket videos (still playable)
      const qRecent = encodeURIComponent('Pakistan cricket match highlights');
      const recentUrl =
        `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&videoEmbeddable=true&maxResults=6&order=date&q=${qRecent}&key=${youtubeApiKey}`;
      const recentRes = await fetch(recentUrl);
      if (!recentRes.ok) throw new Error('yt_search_failed');
      const recentData = await recentRes.json();
      const recentItems = mapYtItems(recentData.items || [], false);
      setMatches(recentItems.length ? recentItems : FALLBACK_MATCHES);
    } catch {
      setMatches(FALLBACK_MATCHES);
      onAlert('Using offline match list — stream list refresh failed.', '📡');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMatches();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [youtubeApiKey]);

  // Watch-time tracker for live_view earn (fires once after ~60s)
  useEffect(() => {
    if (!activeId) return;
    setWatchedMs(0);
    const iv = setInterval(() => {
      setWatchedMs((m) => {
        const next = m + 5000;
        if (next >= 60000 && m < 60000) {
          onWatchEarn?.();
        }
        return next;
      });
    }, 5000);
    return () => clearInterval(iv);
  }, [activeId, onWatchEarn]);

  const playable = !!activeId;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Radio size={14} className="text-red-400" />
          <p className="text-xs font-black text-white uppercase tracking-wider">Live Matches</p>
        </div>
        <button
          onClick={loadMatches}
          disabled={loading}
          className="flex items-center gap-1 text-[9px] font-black text-cyan-300 bg-white/5 border border-white/10 px-2 py-1 rounded-lg"
        >
          <RefreshCw size={10} className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      <p className="text-[10px] text-gray-400">
        Pakistan cricket & live match streams. Watch 60s+ to unlock viewing rewards ($1–$1.50 split).
      </p>

      {playable && (
        <div className="rounded-2xl overflow-hidden border border-red-500/30 bg-black aspect-video">
          <iframe
            key={activeId}
            src={`https://www.youtube-nocookie.com/embed/${activeId}?autoplay=1&playsinline=1&rel=0&modestbranding=1&enablejsapi=1`}
            title="Live Match"
            className="w-full h-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
          />
        </div>
      )}

      {!playable && (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-950/30 p-4 text-[11px] text-amber-100">
          Tap a match below to start playback. Prefer AJ Live rooms / PK Battle for interactive streaming.
          <a
            className="mt-2 flex items-center gap-1 text-cyan-300 font-bold"
            href="https://www.youtube.com/results?search_query=Pakistan+cricket+live"
            target="_blank"
            rel="noopener noreferrer"
          >
            Open YouTube Pakistan Live <ExternalLink size={12} />
          </a>
        </div>
      )}

      <div className="space-y-2">
        {matches.map((m) => (
          <button
            key={m.id}
            onClick={() => setActiveId(m.id)}
            className={`w-full flex gap-3 p-2 rounded-xl border text-left active:scale-[0.99] ${
              activeId === m.id ? 'border-red-500/50 bg-red-950/30' : 'border-white/10 bg-white/5'
            }`}
          >
            <div className="w-20 h-12 rounded-lg overflow-hidden bg-black/40 shrink-0">
              {m.thumb ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={m.thumb} alt="" className="w-full h-full object-cover" />
              ) : null}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-black text-white line-clamp-2">{m.title}</p>
              <p className="text-[9px] text-gray-400 mt-0.5">
                {m.live && <span className="text-red-400 font-black mr-1">● LIVE</span>}
                {m.channel}
              </p>
            </div>
          </button>
        ))}
      </div>

      {watchedMs > 0 && playable && (
        <p className="text-[9px] text-center text-gray-500">
          Watching… {Math.min(60, Math.floor(watchedMs / 1000))}s / 60s for reward
        </p>
      )}
    </div>
  );
}
