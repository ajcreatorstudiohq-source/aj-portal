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
 * Next Hub balance after a claim.
 * Never regresses below `prev` when a claim patch is present (Admin SDK + client
 * cache races often return a lagging absolute balance briefly).
 */
export function computeClaimBalanceNext(
  prev: number,
  patch?: WalletRefreshPatch
): number | null {
  if (!patch) return null;
  const prevSafe = Math.max(0, Math.floor(Number(prev) || 0));
  const credited =
    typeof patch.creditedCoins === 'number' &&
    Number.isFinite(patch.creditedCoins) &&
    patch.creditedCoins > 0
      ? Math.floor(patch.creditedCoins)
      : 0;
  const fromCredit = credited > 0 ? prevSafe + credited : null;
  const fromAbs =
    typeof patch.balance === 'number' && Number.isFinite(patch.balance)
      ? Math.max(0, Math.floor(patch.balance))
      : null;

  if (fromAbs == null && fromCredit == null) return null;
  return Math.max(prevSafe, fromAbs ?? 0, fromCredit ?? 0);
}
