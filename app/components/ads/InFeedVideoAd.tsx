'use client';

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Eye, Gift, Heart, MessageSquare, Share2 } from 'lucide-react';
import {
  ADSTERRA_NATIVE_BANNER_ID,
  ADSTERRA_NATIVE_BANNER_SRC,
  AD_FALLBACK_POSTERS,
  AD_FALLBACK_VIDEOS,
  openAdsterraDirectLink,
} from '../../lib/ads-config';
import { guardClick, startIntrusiveAdGuard } from '../../lib/ad-guards';

let nativeScriptLoading = false;

function ensureNativeInvokeScript() {
  if (typeof document === 'undefined') return;
  if (document.querySelector('script[data-adsterra="native-banner-invoke"]')) return;
  if (nativeScriptLoading) return;
  nativeScriptLoading = true;
  const s = document.createElement('script');
  s.async = true;
  s.src = ADSTERRA_NATIVE_BANNER_SRC;
  s.setAttribute('data-adsterra', 'native-banner-invoke');
  s.onload = () => {
    nativeScriptLoading = false;
  };
  s.onerror = () => {
    nativeScriptLoading = false;
  };
  document.body.appendChild(s);
}

function reinvokeNativeBanner() {
  if (typeof document === 'undefined') return;
  document
    .querySelectorAll('script[data-adsterra="native-banner-invoke"]')
    .forEach((n) => {
      try {
        n.remove();
      } catch {
        /* ignore */
      }
    });
  nativeScriptLoading = false;
  ensureNativeInvokeScript();
}

type Props = {
  slotKey?: string;
  /** When false, pause background video */
  active?: boolean;
};

/**
 * TikTok-style in-feed ad slide:
 * - Looks like a normal reel (video + right actions + caption)
 * - Real Adsterra Native Banner mounts full-bleed (paid impressions)
 * - Tap / Open Offer → Adsterra Direct Link (paid clicks)
 */
export default function InFeedVideoAd({ slotKey = 'feed', active = true }: Props) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const reactId = useId().replace(/:/g, '');
  const slotId = `aj-tiktok-ad-${slotKey}-${reactId}`;
  const [visible, setVisible] = useState(false);
  const [muted, setMuted] = useState(true);
  const [adReady, setAdReady] = useState(false);

  const pick = useMemo(() => {
    const n = Math.abs(Array.from(slotKey).reduce((a, c) => a + c.charCodeAt(0), 0));
    return {
      video: AD_FALLBACK_VIDEOS[n % AD_FALLBACK_VIDEOS.length],
      poster: AD_FALLBACK_POSTERS[n % AD_FALLBACK_POSTERS.length],
      likes: 1200 + (n % 8000),
      views: 9000 + (n % 90000),
    };
  }, [slotKey]);

  // Visibility → play bg video + (re)load Adsterra when on screen
  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const activateAd = () => {
      // Only one official container id in the document (Adsterra requirement)
      document.querySelectorAll(`#${ADSTERRA_NATIVE_BANNER_ID}`).forEach((el) => {
        if (!host.contains(el)) {
          try {
            el.removeAttribute('id');
          } catch {
            /* ignore */
          }
        }
      });

      const mount = host.querySelector('[data-adsterra-mount]') as HTMLElement | null;
      if (!mount) return;

      let box = host.querySelector(`#${ADSTERRA_NATIVE_BANNER_ID}`) as HTMLElement | null;
      if (!box) {
        const existing = document.getElementById(ADSTERRA_NATIVE_BANNER_ID);
        if (existing && !host.contains(existing)) {
          try {
            existing.removeAttribute('id');
          } catch {
            /* ignore */
          }
        }
        box = document.createElement('div');
        box.id = ADSTERRA_NATIVE_BANNER_ID;
        box.setAttribute('data-aj-native', '1');
        // Full-bleed — no card chrome so it feels like a reel surface
        box.style.cssText =
          'width:100%;height:100%;min-height:100%;display:flex;align-items:center;justify-content:center;overflow:hidden;background:transparent;';
        mount.innerHTML = '';
        mount.appendChild(box);
      }
      reinvokeNativeBanner();
      window.setTimeout(() => setAdReady(true), 800);
    };

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const on = entry.isIntersecting && entry.intersectionRatio > 0.45;
          setVisible(on);
          if (on) activateAd();
        }
      },
      { threshold: [0.45, 0.7] }
    );
    io.observe(host);

    const t = window.setTimeout(activateAd, 400);
    return () => {
      io.disconnect();
      window.clearTimeout(t);
    };
  }, [slotKey, slotId]);

  // Background video — TikTok feel while / under the Adsterra creative
  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    if (visible && active) {
      el.muted = muted;
      const p = el.play();
      if (p && typeof p.then === 'function') {
        p.catch(() => {
          el.muted = true;
          setMuted(true);
          el.play().catch(() => {});
        });
      }
    } else {
      el.pause();
    }
  }, [visible, active, muted, pick.video]);

  const openOffer = (e?: { preventDefault?: () => void; stopPropagation?: () => void }) => {
    guardClick(e);
    startIntrusiveAdGuard();
    if (!openAdsterraDirectLink()) {
      /* popup blocked — openAdsterraDirectLink already logs */
    }
  };

  return (
    <div
      id={slotId}
      ref={hostRef}
      data-ad-slide="1"
      className="absolute inset-0 w-full h-full min-h-screen bg-[#050505] flex flex-col justify-end overflow-hidden"
      onClick={openOffer}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') openOffer(e);
      }}
    >
      {/* Layer 1 — ambient video (same language as TikReels) */}
      <video
        ref={videoRef}
        key={pick.video}
        src={pick.video}
        poster={pick.poster}
        className="absolute inset-0 w-full h-full object-cover"
        style={{ opacity: adReady ? 0.35 : 0.85, transition: 'opacity 0.6s ease' }}
        playsInline
        loop
        muted={muted}
        preload="auto"
      />

      {/* Layer 2 — real Adsterra Native Banner (monetized) */}
      <div
        data-adsterra-mount
        className="absolute inset-0 z-[5] w-full h-full flex items-center justify-center pointer-events-auto"
        onClick={(e) => e.stopPropagation()}
      />

      {/* Soft vignette like TikReel */}
      <div className="absolute inset-0 z-[6] pointer-events-none bg-gradient-to-t from-black/75 via-transparent to-black/25" />

      {/* Tiny TikTok-like sponsored mark (easy to miss) */}
      <div className="absolute top-4 left-4 z-20 pointer-events-none">
        <span className="text-[8px] font-bold uppercase tracking-[0.14em] text-white/45">
          Sponsored
        </span>
      </div>

      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setMuted((m) => !m);
        }}
        className="absolute top-3 right-3 z-20 w-9 h-9 rounded-full bg-black/35 border border-white/10 flex items-center justify-center active:scale-90"
        aria-label={muted ? 'Unmute' : 'Mute'}
      >
        <span className="text-white text-xs">{muted ? '🔇' : '🔊'}</span>
      </button>

      {/* Right actions — identical language to TikReel */}
      <div
        className="absolute right-3 bottom-32 flex flex-col items-center gap-5 z-[110]"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={openOffer}
          className="flex flex-col items-center gap-1 active:scale-90 transition-all"
        >
          <div className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center">
            <Gift size={18} className="text-yellow-400" />
          </div>
          <span className="text-white text-[9px] font-black">Gift</span>
        </button>
        <button
          type="button"
          onClick={openOffer}
          className="flex flex-col items-center gap-1 active:scale-90 transition-all"
        >
          <div className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center">
            <Heart size={18} className="text-white" />
          </div>
          <span className="text-white text-[9px] font-black">{pick.likes}</span>
        </button>
        <button
          type="button"
          onClick={openOffer}
          className="flex flex-col items-center gap-1 active:scale-90 transition-all"
        >
          <div className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center">
            <MessageSquare size={18} className="text-white" />
          </div>
          <span className="text-white text-[9px] font-black">Ad</span>
        </button>
        <button
          type="button"
          onClick={openOffer}
          className="flex flex-col items-center gap-1 active:scale-90 transition-all"
        >
          <div className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center">
            <Share2 size={18} className="text-white" />
          </div>
          <span className="text-white text-[9px] font-black">Share</span>
        </button>
      </div>

      {/* Bottom caption — same as TikReel */}
      <div
        className="absolute bottom-6 left-4 right-16 z-20"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="inline-flex items-center gap-1.5 bg-gradient-to-r from-pink-500/70 to-purple-500/70 backdrop-blur-sm rounded-full px-3 py-1 mb-2">
          <span className="text-white text-[8px] font-black uppercase tracking-widest animate-pulse">
            🔥 Trending Now
          </span>
        </div>
        <div className="flex items-center gap-2 mb-1">
          <img
            src="/logo.png"
            alt=""
            className="w-7 h-7 rounded-full border border-white/30 object-cover"
          />
          <span className="text-white font-black text-xs">@AJ_Offers</span>
        </div>
        <p className="text-gray-300 text-[10px] line-clamp-2">
          Partner offer · tap to open · earn AJ Coins 🪙
        </p>
        <div className="flex items-center gap-1.5 mt-1">
          <Eye size={11} className="text-white/80" />
          <span className="text-white/90 text-[9px] font-black">{pick.views} views</span>
        </div>
        <button
          type="button"
          onClick={openOffer}
          className="mt-3 w-full max-w-[220px] py-2.5 rounded-xl text-black text-[10px] font-black uppercase tracking-widest active:scale-[0.98]"
          style={{
            background: 'linear-gradient(135deg,#22d3ee 0%,#818cf8 55%,#ec4899 100%)',
          }}
        >
          Open Offer
        </button>
      </div>
    </div>
  );
}
