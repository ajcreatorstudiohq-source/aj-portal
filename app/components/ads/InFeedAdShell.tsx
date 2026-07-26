'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { MONETAG_INTERSTITIAL_ZONE, type AdPlacement } from '../../lib/ads-config';
import { trackAdEvent } from '../../lib/ad-client';
import { ensureMonetagSdkLoaded } from '../../lib/monetag-client';

type Props = {
  placement: AdPlacement;
  user?: { getIdToken: () => Promise<string> } | null;
  children: ReactNode;
};

/**
 * Wraps an existing in-feed ad surface (TikReel / Pulse) to soft-load the SDK
 * and record impression events without firing fullscreen interstitials.
 */
export default function InFeedAdShell({ placement, user, children }: Props) {
  const tracked = useRef(false);

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
        meta: { format: 'infeed' },
      },
      user
    ).catch(() => {});
  }, [placement, user]);

  return <>{children}</>;
}
