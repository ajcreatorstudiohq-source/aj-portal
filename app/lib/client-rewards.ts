/**
 * Client helper — call unified /api/rewards/earn with Firebase ID token.
 */

export type EarnResult = {
  ok: boolean;
  duplicate?: boolean;
  creditedCoins?: number;
  userUsd?: number;
  adminUsd?: number;
  totalPoolUsd?: number;
  message?: string;
  error?: string;
};

export async function earnReward(
  user: { getIdToken: () => Promise<string> } | null | undefined,
  source: string,
  opts?: { idempotencyKey?: string; meta?: Record<string, unknown>; beneficiaryUid?: string }
): Promise<EarnResult> {
  if (!user) return { ok: false, error: 'not_signed_in' };
  try {
    const token = await user.getIdToken();
    const res = await fetch('/api/rewards/earn', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        source,
        idempotencyKey: opts?.idempotencyKey,
        meta: opts?.meta || {},
        beneficiaryUid: opts?.beneficiaryUid,
      }),
    });
    const data = (await res.json().catch(() => ({}))) as EarnResult;
    if (!res.ok) {
      return { ok: false, error: data.error || `http_${res.status}`, ...data };
    }
    return data;
  } catch (e: unknown) {
    return { ok: false, error: e instanceof Error ? e.message : 'earn_failed' };
  }
}
