/**
 * Adsterra Direct Link helpers — attribution + real-payout only.
 * Never invent CPC. Coins/admin share credit only from settled Adsterra payout USD
 * via the unified /api/ads/adsterra-postback handler (all formats).
 */

import { ADSTERRA_REWARDED_LINK } from './ads-config';
import {
  type AdsterraFormat,
  adsterraFormatFromPlacement,
  normalizeAdsterraFormat,
} from './adsterra-formats';

/** Build Direct Link with placement_sub_id for user attribution (Adsterra psid). */
export function buildAdsterraDirectLink(opts?: {
  uid?: string | null;
  sessionId?: string | null;
  format?: AdsterraFormat | string | null;
  placement?: string | null;
}): string {
  const base = ADSTERRA_REWARDED_LINK;
  if (!base) return '';
  try {
    const url = new URL(base);
    const uid = String(opts?.uid || '').trim();
    const sid = String(opts?.sessionId || '')
      .replace(/[^a-zA-Z0-9]/g, '')
      .slice(0, 16);
    const placement = String(opts?.placement || '').slice(0, 48);
    const format = normalizeAdsterraFormat(
      opts?.format || (placement ? adsterraFormatFromPlacement(placement) : 'direct_link')
    );
    if (uid) {
      // Firebase uids have no underscores — use __ to separate optional session tag
      const psid = sid ? `aj_${uid}__${sid}` : `aj_${uid}`;
      url.searchParams.set('psid', psid);
      url.searchParams.set('subid', uid);
      url.searchParams.set('subid1', uid);
      url.searchParams.set('user_id', uid);
      if (sid) url.searchParams.set('subid2', sid);
    }
    // Tracker macros — same postback credits every format 70/30
    url.searchParams.set('aj_fmt', format);
    if (placement) url.searchParams.set('aj_place', placement);
    return url.toString();
  } catch {
    return base;
  }
}

export function parseAdsterraPsid(raw: string): { uid: string; sessionId: string } {
  const s = String(raw || '').trim();
  if (!s) return { uid: '', sessionId: '' };
  if (!s.startsWith('aj_')) return { uid: s, sessionId: '' };
  const rest = s.slice(3);
  const sep = rest.indexOf('__');
  if (sep >= 0) {
    return { uid: rest.slice(0, sep).trim(), sessionId: rest.slice(sep + 2).trim() };
  }
  return { uid: rest.trim(), sessionId: '' };
}

/** Parse Firebase uid from Adsterra psid / subid macros. */
export function uidFromAdsterraPsid(raw: string): string {
  return parseAdsterraPsid(raw).uid;
}
