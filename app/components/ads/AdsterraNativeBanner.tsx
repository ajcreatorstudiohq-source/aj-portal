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
  // Re-append invoke.js so Adsterra binds to the current official container id
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
 * Dark sponsored card — never a black video surface.
 * Official container id is moved into the visible slot (Adsterra requires exact id).
 */
export default function AdsterraNativeBanner({ slotKey = 'feed' }: { slotKey?: string }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const reactId = useId().replace(/:/g, '');
  const slotId = `aj-native-slot-${slotKey}-${reactId}`;

  useEffect(() => {
    const host = hostRef.current;
    if (!host || typeof document === 'undefined') return;

    // Remove layout/legacy duplicate hosts that steal the official id
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
        // Steal / create the official container inside this visible slot
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
          'w-full max-w-md min-h-[180px] flex items-center justify-center rounded-xl border border-white/10 bg-[#0a0a0f]';
        const mount = host.querySelector('[data-adsterra-mount]') as HTMLElement | null;
        (mount || host).appendChild(box);
      }
      reinvokeNativeBanner();
    };

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting && entry.intersectionRatio > 0.35) {
            activate();
          }
        }
      },
      { threshold: [0.35, 0.6] }
    );
    io.observe(host);

    // Soft activate once after mount so first slot is not empty
    const t = window.setTimeout(activate, 400);
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
          'radial-gradient(ellipse at 50% 30%, #14141f 0%, #08080c 45%, #050505 100%)',
      }}
    >
      <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1">
        <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
        <span className="text-[9px] font-black uppercase tracking-[0.22em] text-zinc-300">
          Sponsored
        </span>
      </div>

      <div
        data-adsterra-mount
        className="relative w-full max-w-md min-h-[180px] flex items-center justify-center rounded-2xl border border-white/10 bg-[#0a0a0f] shadow-[0_0_40px_rgba(0,0,0,0.55)] overflow-hidden"
      >
        {/* Official Adsterra container is injected here when slot is visible */}
        <p className="text-[10px] text-zinc-600 font-bold uppercase tracking-widest pointer-events-none">
          Loading offer…
        </p>
      </div>

      <p className="text-[10px] text-zinc-500 font-medium text-center max-w-xs">
        Partner placement · Earn AJ Coins 🪙 on verified tasks
      </p>
    </div>
  );
}
