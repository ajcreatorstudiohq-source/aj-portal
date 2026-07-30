/** Shared types for admin earnings — safe for type-only imports (no server-only). */
export type AdminEarningsTotals = {
  totalOwnerUsd: number;
  totalOwnerCoins: number;
  giftOwnerUsd: number;
  giftOwnerCoins: number;
  adOwnerUsd: number;
  /** TheoremReach / offerwall survey owner share (70%). */
  surveyOwnerUsd?: number;
  surveyOwnerCoins?: number;
  eventCount: number;
  updatedAt?: unknown;
};
