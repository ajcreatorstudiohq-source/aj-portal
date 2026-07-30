'use client';

import { useEffect, useRef } from 'react';
import { trackAdEvent } from '../../lib/ad-client';

type UserLike = { uid?: string; getIdToken: () => Promise<string> } | null | undefined;

/**
 * Fires a unified Social Bar impression into /api/ads/track.
 * Social Bar revenue settles via the same Adsterra 70/30 postback when
 * payout is registered with format=social_bar.
 */
export default function AdsterraSocialBarBeacon({ user }: { user?: UserLike }) {
  const tracked = useRef(false);

  useEffect(() => {
    if (tracked.current) return;
    tracked.current = true;
    const t = window.setTimeout(() => {
      trackAdEvent(
        {
          event: 'impression',
          placement: 'hub_nav_interstitial',
          zoneId: 0,
          format: 'social_bar',
          meta: {
            format: 'social_bar',
            network: 'adsterra',
            surface: 'layout_social_bar',
          },
        },
        user || null
      ).catch(() => {});
    }, 1200);
    return () => window.clearTimeout(t);
  }, [user]);

  return null;
}
