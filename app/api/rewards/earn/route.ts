import { NextResponse } from 'next/server';
import { applySplitReward } from '../../../lib/reward-engine';
import {
  isRewardSource,
  SOURCE_LABELS,
  type RewardSource,
} from '../../../lib/reward-sources';
import {
  bearerFromRequest,
  verifyFirebaseIdToken,
} from '../../../lib/verify-id-token';

/**
 * POST /api/rewards/earn
 * Auth: Bearer <Firebase ID token>
 * Body: {
 *   source: RewardSource,
 *   idempotencyKey?: string,
 *   beneficiaryUid?: string,  // for live_gift — credit recipient
 *   meta?: object
 * }
 *
 * Unified multi-channel earning: $5–$7 pool → user $1–$1.50, rest AdminRevenue.
 */
export async function POST(request: Request) {
  try {
    const token = bearerFromRequest(request);
    if (!token) {
      return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
    }
    const actor = await verifyFirebaseIdToken(token);
    if (!actor) {
      return NextResponse.json({ ok: false, error: 'invalid_token' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const sourceRaw = String(body.source || '');
    if (!isRewardSource(sourceRaw)) {
      return NextResponse.json({ ok: false, error: 'invalid_source' }, { status: 400 });
    }
    const source = sourceRaw as RewardSource;

    // Optional beneficiary (gifts → creator, referrals → referrer)
    let creditUid = actor.uid;
    const beneficiary = String(body.beneficiaryUid || '').trim();
    if (beneficiary) {
      if (source === 'live_gift' || source === 'referral') {
        if (beneficiary === actor.uid && source === 'live_gift') {
          return NextResponse.json({ ok: false, error: 'invalid_beneficiary' }, { status: 400 });
        }
        creditUid = beneficiary;
      }
    }

    const idem =
      String(body.idempotencyKey || '').trim() ||
      `${source}_${creditUid}_${Date.now()}`;
    const txId = `earn_${source}_${idem}`.replace(/[^a-zA-Z0-9_\-]/g, '_').slice(0, 180);
    const seed = txId;

    const result = await applySplitReward({
      uid: creditUid,
      txId,
      source,
      seed,
      meta: {
        ...(body.meta && typeof body.meta === 'object' ? body.meta : {}),
        actorUid: actor.uid,
        label: SOURCE_LABELS[source],
      },
      ledgerCollection: 'reward_ledger',
      enforceDailyCap: true,
    });

    if (!result.ok) {
      const status = result.error === 'daily_limit' ? 429 : 500;
      return NextResponse.json(
        {
          ok: false,
          error: result.error,
          dailyCapHit: !!result.dailyCapHit,
          message:
            result.error === 'daily_limit'
              ? 'Daily reward limit reached for this activity. Try again tomorrow.'
              : result.error,
        },
        { status }
      );
    }

    return NextResponse.json({
      ok: true,
      duplicate: !!result.duplicate,
      source,
      creditedCoins: result.balanceCredited ?? 0,
      userUsd: result.split?.userUsd,
      adminUsd: result.split?.adminUsd,
      totalPoolUsd: result.split?.totalUsd,
      message: result.duplicate
        ? 'Already credited'
        : `${SOURCE_LABELS[source]}: +${result.balanceCredited} AJ Coins ($${Number(result.split?.userUsd).toFixed(2)}). Platform kept $${Number(result.split?.adminUsd).toFixed(2)} of $${Number(result.split?.totalUsd).toFixed(2)} pool.`,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'earn_failed';
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    userRewardUsd: { min: 1.0, max: 1.5 },
    providerPoolUsd: { min: 5.0, max: 7.0 },
    sources: Object.keys(SOURCE_LABELS),
    labels: SOURCE_LABELS,
  });
}
