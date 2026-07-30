/**
 * Adsterra Direct Link helpers — attribution + real-payout only.
 * Never invent CPC. Coins/admin share credit only from settled Adsterra payout USD.
 */

import { ADSTERRA_REWARDED_LINK } from './ads-config';

/** Build Direct Link with placement_sub_id for user attribution (Adsterra psid). */
export function buildAdsterraDirectLink(opts?: {
  uid?: string | null;
  sessionId?: string | null;
}): string {
  const base = ADSTERRA_REWARDED_LINK;
  if (!base) return '';
  try {
    const url = new URL(base);
    const uid = String(opts?.uid || '').trim();
    const sid = String(opts?.sessionId || '')
      .replace(/[^a-zA-Z0-9]/g, '')
      .slice(0, 16);
    if (uid) {
      // Firebase uids have no underscores — use __ to separate optional session tag
      const psid = sid ? `aj_${uid}__${sid}` : `aj_${uid}`;
      url.searchParams.set('psid', psid);
      url.searchParams.set('subid', uid);
    }
    return url.toString();
  } catch {
    return base;
  }
}

/** Parse Firebase uid from Adsterra psid / subid macros. */
export function uidFromAdsterraPsid(raw: string): string {
  const s = String(raw || '').trim();
  if (!s) return '';
  if (s.startsWith('aj_')) {
    const rest = s.slice(3);
    // aj_{uid} or aj_{uid}__{session}
    const sep = rest.indexOf('__');
    return (sep >= 0 ? rest.slice(0, sep) : rest).trim();
  }
  return s;
}
