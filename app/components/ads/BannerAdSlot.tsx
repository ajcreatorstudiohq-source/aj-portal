'use client';

import { useEffect, useRef } from 'react';
import { type AdPlacement } from '../../lib/ads-config';
import { trackAdEvent } from '../../lib/ad-client';

type Props = {
  placement: AdPlacement;
  user?: { getIdToken: () => Promise<string> } | null;
  label?: string;
  className?: string;
};

const BANNER_POSTERS = [
  'https://images.unsplash.com/photo-1550745165-9bc0b252726c?w=400&h=800&fit=crop',
  'https://images.unsplash.com/photo-1611162617474-5b21e879e872?w=400&h=800&fit=crop',
];

/**
 * Non-intrusive banner strip — impression tracking only (no Monetag).
 */
export default function BannerAdSlot({
  placement,
  user,
  label = 'Sponsored',
  className = '',
}: Props) {
  const tracked = useRef(false);
  const poster = BANNER_POSTERS[Math.abs(placement.length) % BANNER_POSTERS.length];

  useEffect(() => {
    if (tracked.current) return;
    tracked.current = true;
    trackAdEvent(
      {
        event: 'impression',
        placement,
        zoneId: 0,
        meta: { format: 'banner', network: 'adsterra' },
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
            zoneId: 0,
            meta: { format: 'banner', network: 'adsterra' },
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
          <p className="text-[9px] text-gray-400 truncate">Watch · Play · Earn AJ Coins 🪙</p>
        </div>
        <span className="text-[8px] font-bold uppercase tracking-wider text-gray-500 shrink-0">
          Ad
        </span>
      </div>
    </button>
  );
}
