/** Shared wallet refresh payload — safe for client components. */
export type WalletRefreshPatch = {
  /** Absolute balance from server claim response (preferred). */
  balance?: number;
  /** Coins just credited — used for optimistic bump when absolute balance missing. */
  creditedCoins?: number;
};

export type OnRefreshUser = (patch?: WalletRefreshPatch) => void | Promise<void>;
