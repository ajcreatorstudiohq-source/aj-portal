/**
 * Portal presence — real online/offline for admin ban panel.
 * Clients write RTDB `presence/{uid}` + Firestore `users.status` / `lastSeenMs`.
 */

/** Consider online if lastSeen within this window (heartbeat every ~25s). */
export const PRESENCE_ONLINE_MS = 90_000;

export type PresenceSnapshot = {
  state?: string;
  uid?: string;
  username?: string;
  lastChanged?: number;
};

export function isRtdbPresenceOnline(entry: PresenceSnapshot | null | undefined): boolean {
  if (!entry || entry.state !== 'online') return false;
  const last = Number(entry.lastChanged || 0);
  if (!last) return true;
  return Date.now() - last < PRESENCE_ONLINE_MS * 2;
}

/** Merge RTDB presence + Firestore status/lastSeen into a boolean. */
export function isUserOnlineNow(opts: {
  rtdbOnline?: boolean;
  status?: string;
  lastSeenMs?: number;
}): boolean {
  if (opts.rtdbOnline) return true;
  const last = Number(opts.lastSeenMs || 0);
  if (opts.status === 'online' && last > 0 && Date.now() - last < PRESENCE_ONLINE_MS) {
    return true;
  }
  // Fresh lastSeen alone (status write may lag)
  if (last > 0 && Date.now() - last < PRESENCE_ONLINE_MS) return true;
  return false;
}
