'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { type AdPlacement } from '../../lib/ads-config';
import { trackAdEvent } from '../../lib/ad-client';

type Props = {
  placement: AdPlacement;
  user?: { getIdToken: () => Promise<string> } | null;
  children: ReactNode;
};

/**
 * Wraps TikReel / Pulse in-feed Adsterra Native Banner slots and records impressions.
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
        meta: { format: 'adsterra_native_banner', network: 'adsterra' },
      },
      user
    ).catch(() => {});
  }, [placement, user]);

  return <>{children}</>;
}
