'use client';

import { useEffect, useId, useRef } from 'react';
import {
  ADSTERRA_NATIVE_BANNER_ID,
  ADSTERRA_NATIVE_BANNER_SRC,
} from '../../lib/ads-config';

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

/**
 * TikReel / Pulse in-feed Adsterra Native Banner.
 * Dark sponsored card with gradient atmosphere — never a blank black screen.
 * Official container id is moved into the visible slot (Adsterra requires exact id).
 */
export default function AdsterraNativeBanner({ slotKey = 'feed' }: { slotKey?: string }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const reactId = useId().replace(/:/g, '');
  const slotId = `aj-native-slot-${slotKey}-${reactId}`;

  useEffect(() => {
    const host = hostRef.current;
    if (!host || typeof document === 'undefined') return;

    document.querySelectorAll(`#${ADSTERRA_NATIVE_BANNER_ID}`).forEach((el) => {
      if (!host.contains(el)) {
        try {
          el.removeAttribute('id');
        } catch {
          /* ignore */
        }
      }
    });

    const activate = () => {
      let box = host.querySelector(`#${ADSTERRA_NATIVE_BANNER_ID}`) as HTMLElement | null;
      if (!box) {
        const existing = document.getElementById(ADSTERRA_NATIVE_BANNER_ID);
        if (existing && existing !== box) {
          try {
            existing.removeAttribute('id');
          } catch {
            /* ignore */
          }
        }
        box = document.createElement('div');
        box.id = ADSTERRA_NATIVE_BANNER_ID;
        box.className =
          'w-full max-w-md min-h-[220px] flex items-center justify-center rounded-xl border border-amber-500/20 bg-[#12121a]';
        const mount = host.querySelector('[data-adsterra-mount]') as HTMLElement | null;
        (mount || host).appendChild(box);
      }
      reinvokeNativeBanner();
    };

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting && entry.intersectionRatio > 0.25) {
            activate();
          }
        }
      },
      { threshold: [0.25, 0.5] }
    );
    io.observe(host);

    const t = window.setTimeout(activate, 350);
    return () => {
      io.disconnect();
      window.clearTimeout(t);
    };
  }, [slotKey, slotId]);

  return (
    <div
      id={slotId}
      ref={hostRef}
      className="absolute inset-0 w-full h-full min-h-screen flex flex-col items-center justify-center gap-4 px-5"
      style={{
        background:
          'radial-gradient(ellipse at 50% 28%, #1c1a28 0%, #121018 40%, #0a0a10 70%, #08080c 100%)',
      }}
    >
      {/* Atmosphere layer — prevents pure black void while ad loads */}
      <div
        className="pointer-events-none absolute inset-0 opacity-60"
        style={{
          background:
            'linear-gradient(160deg, rgba(251,191,36,0.08) 0%, transparent 35%, rgba(34,211,238,0.06) 100%)',
        }}
      />

      <div className="relative z-10 inline-flex items-center gap-2 rounded-full border border-amber-400/25 bg-black/35 backdrop-blur-md px-3 py-1">
        <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
        <span className="text-[9px] font-black uppercase tracking-[0.22em] text-amber-100/90">
          Sponsored
        </span>
      </div>

      <div
        data-adsterra-mount
        className="relative z-10 w-full max-w-md min-h-[220px] flex items-center justify-center rounded-2xl border border-white/15 bg-gradient-to-b from-[#16161f] to-[#0c0c12] shadow-[0_0_48px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.06)] overflow-hidden"
      >
        <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center gap-2 px-6">
          <div className="w-10 h-10 rounded-xl border border-amber-400/30 bg-amber-500/10 flex items-center justify-center">
            <span className="text-lg">✨</span>
          </div>
          <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest text-center">
            Loading partner offer…
          </p>
        </div>
      </div>

      <p className="relative z-10 text-[10px] text-zinc-400 font-medium text-center max-w-xs">
        Partner placement · Earn AJ Coins 🪙 on verified tasks
      </p>
    </div>
  );
}
