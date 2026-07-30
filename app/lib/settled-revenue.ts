/**
 * Settled vs estimated owner revenue.
 *
 * Settled = real partner USD (TheoremReach / Adsterra postback payout, gifts, PK fees).
 * Estimated = invented from ADSTERRA_CLICK_USD / eCPM / reverse coin math —
 * NOT Adsterra dashboard cash. Never treat estimates as withdrawable profit.
 *
 * All Adsterra formats (direct_link · banner · video · native_banner · social_bar)
 * settle only when meta.via === adsterra_real_postback / settled === true.
 */

export function isEstimatedRevenueRow(d: Record<string, unknown>): boolean {
  if (d.settled === false || d.estimated === true) return true;
  const type = String(d.type || d.source || '').toLowerCase();
  // /api/ads/track used to book full assumed CPC per click/impression
  if (type.startsWith('ad_impression') || type.startsWith('ad_click')) return true;
  if (type === 'ad_complete' || type === 'ad_skip' || type === 'ad_fail') return true;
  // Watch Ads / any Adsterra format owner share — settled only via real postback
  if (
    type === 'adsterra_watch' ||
    type === 'offerwall_video' ||
    type.startsWith('adsterra_')
  ) {
    if (d.settled === true) return false;
    return true;
  }
  const meta =
    d.meta && typeof d.meta === 'object'
      ? (d.meta as Record<string, unknown>)
      : {};
  if (meta.estimated === true || meta.settled === false) return true;
  if (meta.via === 'adsterra_real_postback' && meta.settled === true) return false;
  return false;
}

/** Rows that count toward Admin Hisaab "Your share" / Hub profit. */
export function isSettledRevenueRow(d: Record<string, unknown>): boolean {
  return !isEstimatedRevenueRow(d);
}

export function revenueRowOwnerUsd(d: Record<string, unknown>): number {
  return Number(d.ownerUsd ?? d.adminShare ?? d.adminUsd ?? 0) || 0;
}

export function revenueRowOwnerCoins(d: Record<string, unknown>): number {
  const usd = revenueRowOwnerUsd(d);
  return (
    Number(d.adminShareCoins ?? d.entryCoins ?? d.adminCoins ?? 0) ||
    Math.floor(usd * 1000)
  );
}
