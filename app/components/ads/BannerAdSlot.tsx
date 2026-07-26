'use client';

import { useEffect, useRef } from 'react';
import {
  AD_FALLBACK_POSTERS,
  MONETAG_INTERSTITIAL_ZONE,
  type AdPlacement,
} from '../../lib/ads-config';
import { trackAdEvent } from '../../lib/ad-client';
import { ensureMonetagSdkLoaded } from '../../lib/monetag-client';

type Props = {
  placement: AdPlacement;
  user?: { getIdToken: () => Promise<string> } | null;
  label?: string;
  className?: string;
};

/**
 * Non-intrusive banner strip — soft-loads Monetag SDK and logs impression revenue.
 * Does not fire fullscreen interstitials (those stay on hub / rewarded flows).
 */
export default function BannerAdSlot({
  placement,
  user,
  label = 'Sponsored',
  className = '',
}: Props) {
  const tracked = useRef(false);
  const poster =
    AD_FALLBACK_POSTERS[Math.abs(placement.length) % AD_FALLBACK_POSTERS.length];

  useEffect(() => {
    try {
      ensureMonetagSdkLoaded(MONETAG_INTERSTITIAL_ZONE);
    } catch {
      /* ignore */
    }
    if (tracked.current) return;
    tracked.current = true;
    trackAdEvent(
      {
        event: 'impression',
        placement,
        zoneId: MONETAG_INTERSTITIAL_ZONE,
        meta: { format: 'banner' },
      },
      user
    ).catch(() => {});
  }, [placement, user]);

  return (
    <button
      type="button"
      onClick={() => {
        trackAdEvent(
          {
            event: 'click',
            placement,
            zoneId: MONETAG_INTERSTITIAL_ZONE,
            meta: { format: 'banner' },
          },
          user
        ).catch(() => {});
      }}
      className={`w-full overflow-hidden rounded-2xl border border-white/10 bg-black/40 text-left active:scale-[0.99] ${className}`}
    >
      <div className="relative h-14 flex items-center gap-3 px-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={poster}
          alt=""
          className="w-12 h-10 rounded-lg object-cover shrink-0 opacity-90"
        />
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-black text-white truncate">AJ Super Portal · {label}</p>
          <p className="text-[9px] text-gray-400 truncate">
            Watch · Play · Earn · Partner placement
          </p>
        </div>
        <span className="text-[8px] font-bold uppercase tracking-wider text-gray-500 shrink-0">
          Ad
        </span>
      </div>
    </button>
  );
}
