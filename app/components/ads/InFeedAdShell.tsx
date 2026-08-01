'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { type AdPlacement } from '../../lib/ads-config';
import { trackAdEvent } from '../../lib/ad-client';

type Props = {
  placement: AdPlacement;
  user?: { uid?: string; getIdToken: () => Promise<string> } | null;
  children: ReactNode;
};

/**
 * Wraps TikReel / Pulse in-feed Adsterra Native Banner slots.
 * Impressions use the unified tracker (format=native_banner → same 70/30 postback).
 */
export default function InFeedAdShell({ placement, user, children }: Props) {
  const tracked = useRef(false);

  useEffect(() => {
    if (tracked.current) return;
    tracked.current = true;
    trackAdEvent(
      {
        event: 'impression',
        placement,
        zoneId: 0,
        format: 'native_banner',
        meta: {
          format: 'native_banner',
          network: 'adsterra',
          surface: 'infeed',
        },
      },
      user
    ).catch(() => {});
  }, [placement, user]);

  return <>{children}</>;
}
