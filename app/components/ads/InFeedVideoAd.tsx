'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ADSTERRA_REWARDED_LINK,
  AD_FALLBACK_POSTERS,
  AD_FALLBACK_VIDEOS,
} from '../../lib/ads-config';
import { guardClick, startIntrusiveAdGuard } from '../../lib/ad-guards';

type Props = {
  slotKey?: string;
  active?: boolean;
};

/**
 * TikTok-style in-feed VIDEO ad for TikReel / Pulse.
 * Plays a real MP4 (Adsterra partner creative fallback) fullscreen,
 * with Sponsored label + tap-to-open Adsterra offer.
 */
export default function InFeedVideoAd({ slotKey = 'feed', active = true }: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const hostRef = useRef<HTMLDivElement | null>(null);
  const [visible, setVisible] = useState(false);
  const [muted, setMuted] = useState(true);
  const [canSkip, setCanSkip] = useState(false);
  const [failed, setFailed] = useState(false);

  const pick = useMemo(() => {
    const n = Math.abs(
      Array.from(slotKey).reduce((a, c) => a + c.charCodeAt(0), 0)
    );
    const video = AD_FALLBACK_VIDEOS[n % AD_FALLBACK_VIDEOS.length];
    const poster = AD_FALLBACK_POSTERS[n % AD_FALLBACK_POSTERS.length];
    return { video, poster };
  }, [slotKey]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          setVisible(entry.isIntersecting && entry.intersectionRatio > 0.55);
        }
      },
      { threshold: [0.55, 0.8] }
    );
    io.observe(host);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    setCanSkip(false);
    if (!visible || !active) return;
    const t = window.setTimeout(() => setCanSkip(true), 5000);
    return () => window.clearTimeout(t);
  }, [visible, active, slotKey]);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    if (visible && active && !failed) {
      el.muted = muted;
      const tryPlay = () => {
        const p = el.play();
        if (p && typeof p.then === 'function') {
          p.catch(() => {
            el.muted = true;
            setMuted(true);
            el.play().catch(() => setFailed(true));
          });
        }
      };
      tryPlay();
    } else {
      el.pause();
    }
  }, [visible, active, muted, failed, pick.video]);

  const openOffer = (e?: { preventDefault?: () => void; stopPropagation?: () => void }) => {
    guardClick(e);
    startIntrusiveAdGuard();
    try {
      const win = window.open(ADSTERRA_REWARDED_LINK, '_blank');
      if (!win) window.location.assign(ADSTERRA_REWARDED_LINK);
    } catch {
      window.location.assign(ADSTERRA_REWARDED_LINK);
    }
  };

  return (
    <div
      ref={hostRef}
      className="absolute inset-0 w-full h-full min-h-screen bg-[#050505] flex flex-col justify-end overflow-hidden"
      data-ad-slide="1"
    >
      {!failed ? (
        <video
          ref={videoRef}
          key={pick.video}
          src={pick.video}
          poster={pick.poster}
          className="absolute inset-0 w-full h-full object-cover"
          playsInline
          loop
          muted={muted}
          preload="auto"
          onError={() => setFailed(true)}
        />
      ) : (
        <div
          className="absolute inset-0 w-full h-full bg-cover bg-center"
          style={{ backgroundImage: `url(${pick.poster})` }}
        />
      )}

      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30 pointer-events-none" />

      <div className="absolute top-4 left-4 z-20 inline-flex items-center gap-2 rounded-full border border-amber-400/30 bg-black/50 backdrop-blur-md px-3 py-1">
        <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
        <span className="text-[9px] font-black uppercase tracking-[0.22em] text-amber-100">
          Sponsored · Video Ad
        </span>
      </div>

      <button
        type="button"
        onClick={() => setMuted((m) => !m)}
        className="absolute top-4 right-4 z-20 w-10 h-10 rounded-full bg-black/50 border border-white/15 flex items-center justify-center active:scale-90"
        aria-label={muted ? 'Unmute ad' : 'Mute ad'}
      >
        <span className="text-white text-sm">{muted ? '🔇' : '🔊'}</span>
      </button>

      <div className="relative z-20 px-4 pb-10 space-y-3">
        <p className="text-white font-black text-sm">AJ Partner Offer</p>
        <p className="text-zinc-300 text-[11px] leading-relaxed max-w-xs">
          Watch this video ad · tap below to open Adsterra and earn AJ Coins 🪙
        </p>
        <button
          type="button"
          onClick={openOffer}
          className="w-full max-w-sm py-3 rounded-xl text-black text-xs font-black uppercase tracking-widest active:scale-[0.98]"
          style={{
            background: 'linear-gradient(135deg,#22d3ee 0%,#818cf8 50%,#a78bfa 100%)',
          }}
        >
          Open Offer
        </button>
        {canSkip ? (
          <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest">
            Swipe up for next TikReel
          </p>
        ) : (
          <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest">
            Ad playing…
          </p>
        )}
      </div>
    </div>
  );
}
