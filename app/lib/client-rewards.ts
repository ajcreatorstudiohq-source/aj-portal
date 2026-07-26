/**
 * Client helper — call unified /api/rewards/earn with Firebase ID token.
 * Strict sources require proof flags so free / unverified credits cannot slip through.
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

/** Sources that must never credit without an explicit verification flag in meta. */
const STRICT_SOURCES: Record<string, string> = {
  offerwall_video: 'networkShown',
  offerwall: 'fromPostback',
  app_download: 'installVerified',
};

export async function earnReward(
  user: { getIdToken: () => Promise<string> } | null | undefined,
  source: string,
  opts?: { idempotencyKey?: string; meta?: Record<string, unknown>; beneficiaryUid?: string }
): Promise<EarnResult> {
  if (!user) return { ok: false, error: 'not_signed_in' };

  const proofKey = STRICT_SOURCES[source];
  if (proofKey) {
    const meta = opts?.meta || {};
    if (meta[proofKey] !== true) {
      return {
        ok: false,
        error: 'verification_required',
        message: `Complete the real task before earning (${source}).`,
      };
    }
  }

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
      return { ...data, ok: false, error: data.error || `http_${res.status}` };
    }
    return data;
  } catch (e: unknown) {
    return { ok: false, error: e instanceof Error ? e.message : 'earn_failed' };
  }
}
