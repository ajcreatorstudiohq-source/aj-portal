/**
 * Separate purchased AJ Coins from earned coins.
 * AI Trading Bot may only open / invest with purchasedCoins.
 */

export type CoinPools = {
  balance: number;
  purchasedCoins: number;
};

/** Coins available from purchases (never exceed wallet balance). */
export function availablePurchasedCoins(pools: CoinPools): number {
  const bal = Math.max(0, Math.floor(Number(pools.balance) || 0));
  const purchased = Math.max(0, Math.floor(Number(pools.purchasedCoins) || 0));
  return Math.min(bal, purchased);
}

/** Earned portion currently in wallet. */
export function availableEarnedCoins(pools: CoinPools): number {
  const bal = Math.max(0, Math.floor(Number(pools.balance) || 0));
  return Math.max(0, bal - availablePurchasedCoins(pools));
}

/**
 * Spend `amount` from wallet: earned first, then purchased.
 * Keeps purchasedCoins accurate for bot eligibility.
 */
export function spendCoinPools(pools: CoinPools, amount: number): {
  ok: boolean;
  nextBalance: number;
  nextPurchasedCoins: number;
  fromEarned: number;
  fromPurchased: number;
  error?: string;
} {
  const spend = Math.max(0, Math.floor(Number(amount) || 0));
  const bal = Math.max(0, Math.floor(Number(pools.balance) || 0));
  const purchased = availablePurchasedCoins(pools);
  if (spend <= 0) {
    return {
      ok: true,
      nextBalance: bal,
      nextPurchasedCoins: purchased,
      fromEarned: 0,
      fromPurchased: 0,
    };
  }
  if (bal < spend) {
    return {
      ok: false,
      nextBalance: bal,
      nextPurchasedCoins: purchased,
      fromEarned: 0,
      fromPurchased: 0,
      error: 'insufficient_balance',
    };
  }
  const earned = Math.max(0, bal - purchased);
  const fromEarned = Math.min(spend, earned);
  const fromPurchased = spend - fromEarned;
  return {
    ok: true,
    nextBalance: bal - spend,
    nextPurchasedCoins: purchased - fromPurchased,
    fromEarned,
    fromPurchased,
  };
}

/** Credit purchase: increases both balance and purchasedCoins. */
export function creditPurchasePools(pools: CoinPools, coins: number): CoinPools {
  const add = Math.max(0, Math.floor(Number(coins) || 0));
  return {
    balance: Math.max(0, Math.floor(Number(pools.balance) || 0)) + add,
    purchasedCoins: Math.max(0, Math.floor(Number(pools.purchasedCoins) || 0)) + add,
  };
}
