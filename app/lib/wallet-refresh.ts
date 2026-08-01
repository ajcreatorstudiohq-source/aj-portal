/** Shared wallet refresh payload — safe for client components. */
export type WalletRefreshPatch = {
  /** Absolute balance from server claim response (preferred). */
  balance?: number;
  /** Coins just credited — used for optimistic bump when absolute balance missing. */
  creditedCoins?: number;
};

export type OnRefreshUser = (patch?: WalletRefreshPatch) => void | Promise<void>;

/** How long to protect optimistic claim balance from stale cache/onSnapshot. */
export const CLAIM_BALANCE_FLOOR_MS = 12_000;

/**
 * Next Hub balance after a claim — credits exactly once.
 *
 * Prefer absolute `balance` from the claim API when present (authoritative).
 * Only fall back to `prev + creditedCoins` when absolute balance is missing.
 * Never combine both — that double-counts when onSnapshot already applied
 * the new balance before onRefreshUser runs.
 */
export function computeClaimBalanceNext(
  prev: number,
  patch?: WalletRefreshPatch
): number | null {
  if (!patch) return null;
  const prevSafe = Math.max(0, Math.floor(Number(prev) || 0));

  if (typeof patch.balance === 'number' && Number.isFinite(patch.balance)) {
    // Absolute post-claim balance from API — do not also add creditedCoins.
    return Math.max(0, Math.floor(patch.balance));
  }

  if (
    typeof patch.creditedCoins === 'number' &&
    Number.isFinite(patch.creditedCoins) &&
    patch.creditedCoins > 0
  ) {
    return prevSafe + Math.floor(patch.creditedCoins);
  }

  return null;
}

/**
 * Build a safe refresh patch: if absolute balance exists, drop creditedCoins
 * so callers cannot accidentally double-apply.
 */
export function claimRefreshPatch(opts: {
  balance?: number | null;
  creditedCoins?: number | null;
  duplicate?: boolean;
}): WalletRefreshPatch | undefined {
  if (opts.duplicate) {
    if (typeof opts.balance === 'number' && Number.isFinite(opts.balance)) {
      return { balance: Math.max(0, Math.floor(opts.balance)) };
    }
    return undefined;
  }
  const hasAbs = typeof opts.balance === 'number' && Number.isFinite(opts.balance);
  const credited =
    typeof opts.creditedCoins === 'number' &&
    Number.isFinite(opts.creditedCoins) &&
    opts.creditedCoins > 0
      ? Math.floor(opts.creditedCoins)
      : 0;
  if (hasAbs) {
    return { balance: Math.max(0, Math.floor(opts.balance as number)) };
  }
  if (credited > 0) {
    return { creditedCoins: credited };
  }
  return undefined;
}
