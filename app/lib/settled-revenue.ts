/**
 * Settled vs estimated owner revenue.
 *
 * Settled / Hub-booked = 70% platform share that was credited to Admin Hub:
 * - Real partner postbacks (Adsterra / TheoremReach)
 * - Platform 70/30 reverse-split on user earn coins (math, captcha, games, …)
 * - Gifts / PK fees
 *
 * Estimated = invented CPC/eCPM from /api/ads/track or unsettled Adsterra
 * watch rows — NOT counted in Hisaab.
 */

export function isEstimatedRevenueRow(d: Record<string, unknown>): boolean {
  if (d.bookedToHub === true && d.settled === true) return false;
  if (d.settled === false || d.estimated === true) return true;
  const type = String(d.type || d.source || '').toLowerCase();
  // /api/ads/track used to book full assumed CPC per click/impression
  if (type.startsWith('ad_impression') || type.startsWith('ad_click')) return true;
  if (type === 'ad_complete' || type === 'ad_skip' || type === 'ad_fail') return true;
  // Watch Ads / Adsterra format — only real postback rows count
  if (
    type === 'adsterra_watch' ||
    type === 'offerwall_video' ||
    type.startsWith('adsterra_')
  ) {
    if (d.settled === true || d.bookedToHub === true) return false;
    return true;
  }
  const meta =
    d.meta && typeof d.meta === 'object'
      ? (d.meta as Record<string, unknown>)
      : {};
  if (meta.bookedToHub === true && meta.settled === true) return false;
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
