/**
 * One-Click User Ban — shared helpers & schema notes
 *
 * Firestore `users/{uid}` ban fields (presence still uses `status: online|offline`):
 *   accountStatus: 'active' | 'banned'
 *   isBanned: boolean
 *   bannedAt: Timestamp | null
 *   bannedBy: string | null   (admin uid)
 *   banReason: string | null
 *   sessionTerminatedAt: number | null  (client forces sign-out when set)
 */

export const ACCOUNT_STATUS = {
  ACTIVE: 'active',
  BANNED: 'banned',
} as const;

export type AccountStatus = (typeof ACCOUNT_STATUS)[keyof typeof ACCOUNT_STATUS];

export const BAN_FORBIDDEN_MESSAGE = 'Your account has been banned';

export function isUserBanned(data: Record<string, unknown> | null | undefined): boolean {
  if (!data) return false;
  return data.accountStatus === ACCOUNT_STATUS.BANNED || data.isBanned === true;
}

/** Default fields for new user documents */
export const DEFAULT_ACCOUNT_BAN_FIELDS = {
  accountStatus: ACCOUNT_STATUS.ACTIVE,
  isBanned: false,
  bannedAt: null,
  bannedBy: null,
  banReason: null,
  sessionTerminatedAt: null,
} as const;

/** Payload written when an admin bans a user */
export function buildBanUpdate(adminUid: string, reason?: string) {
  return {
    accountStatus: ACCOUNT_STATUS.BANNED,
    isBanned: true,
    bannedAt: new Date().toISOString(),
    bannedBy: adminUid,
    banReason: reason || 'Banned by admin',
    // Forces active clients watching this doc to sign out immediately
    sessionTerminatedAt: Date.now(),
  };
}
