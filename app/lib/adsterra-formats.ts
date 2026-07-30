/**
 * Canonical Adsterra formats used across the portal.
 * Every format settles through the same 70/30 postback handler —
 * Direct Link, Banner, Video, Native Banner, Social Bar.
 */

import { PLATFORM_EARN_SHARE, USER_EARN_SHARE } from './economy';

export const ADSTERRA_FORMATS = [
  'direct_link',
  'banner',
  'video',
  'native_banner',
  'social_bar',
] as const;

export type AdsterraFormat = (typeof ADSTERRA_FORMATS)[number];

/** Strict portal split — never bypassed by any Adsterra format. */
export const ADSTERRA_ADMIN_SHARE = PLATFORM_EARN_SHARE; // 0.7
export const ADSTERRA_USER_SHARE = USER_EARN_SHARE; // 0.3

export const ADSTERRA_SETTLED_POSTBACK = '/api/ads/adsterra-postback';

const FORMAT_LABELS: Record<AdsterraFormat, string> = {
  direct_link: 'Watch Ads Reward',
  banner: 'Banner Ad Reward',
  video: 'Video Ad Reward',
  native_banner: 'In-Feed Ad Reward',
  social_bar: 'Social Bar Reward',
};

/** Map portal placement → Adsterra format for unified tracking. */
export function adsterraFormatFromPlacement(placement: string): AdsterraFormat {
  const p = String(placement || '').toLowerCase();
  if (p.includes('social')) return 'social_bar';
  if (p.includes('infeed') || p.includes('tikreel') || p.includes('pulse')) {
    return 'native_banner';
  }
  if (p.includes('banner') || p.includes('live_')) return 'banner';
  if (p.includes('rewarded') || p.includes('watch') || p.includes('video')) {
    return 'video';
  }
  if (p.includes('pk_') || p.includes('games') || p.includes('hub') || p.includes('interstitial')) {
    return 'direct_link';
  }
  return 'direct_link';
}

export function normalizeAdsterraFormat(raw: unknown): AdsterraFormat {
  const s = String(raw || '')
    .toLowerCase()
    .trim()
    .replace(/[\s-]+/g, '_');
  if ((ADSTERRA_FORMATS as readonly string[]).includes(s)) {
    return s as AdsterraFormat;
  }
  if (s.includes('social')) return 'social_bar';
  if (s.includes('native') || s.includes('infeed') || s.includes('in_feed')) {
    return 'native_banner';
  }
  if (s.includes('banner')) return 'banner';
  if (s.includes('video') || s.includes('rewarded') || s.includes('vast')) {
    return 'video';
  }
  if (s.includes('direct') || s.includes('smartlink') || s.includes('pop')) {
    return 'direct_link';
  }
  return 'direct_link';
}

export function adsterraDisplayLabel(format: AdsterraFormat): string {
  return FORMAT_LABELS[format] || FORMAT_LABELS.direct_link;
}

export function isAdsterraFormat(v: string): v is AdsterraFormat {
  return (ADSTERRA_FORMATS as readonly string[]).includes(v);
}
