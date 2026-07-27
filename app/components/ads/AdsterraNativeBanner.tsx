'use client';

import { useEffect } from 'react';
import {
  ADSTERRA_NATIVE_BANNER_ID,
  ADSTERRA_NATIVE_BANNER_SRC,
} from '../../lib/ads-config';

/**
 * Adsterra Native Banner for TikReels / Pulse (every 4th post).
 * Markup matches Adsterra panel: container id + invoke.js
 */
export default function AdsterraNativeBanner({ slotKey = 'feed' }: { slotKey?: string }) {
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const marker = `data-adsterra-native-${slotKey}`;
    if (document.querySelector(`script[${marker}]`)) return;

    const s = document.createElement('script');
    s.async = true;
    s.src = ADSTERRA_NATIVE_BANNER_SRC;
    s.setAttribute(marker, '1');
    s.setAttribute('data-adsterra', 'native-banner');
    document.body.appendChild(s);
  }, [slotKey]);

  return (
    <div className="absolute inset-0 w-full h-full min-h-screen flex flex-col items-center justify-center gap-3 px-4 bg-gradient-to-b from-[#0c0c12] via-[#050505] to-[#0a0a0a]">
      <p className="text-[9px] font-black uppercase tracking-[0.25em] text-zinc-500">
        Sponsored · AJ Coins 🪙
      </p>
      <div
        id={ADSTERRA_NATIVE_BANNER_ID}
        className="w-full max-w-md min-h-[160px] flex items-center justify-center rounded-xl border border-white/10 bg-black/50"
      />
    </div>
  );
}
