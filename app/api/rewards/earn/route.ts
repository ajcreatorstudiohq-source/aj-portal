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
 * Unified multi-channel earning. Strict sources require verification meta flags.
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
    const meta =
      body.meta && typeof body.meta === 'object'
        ? (body.meta as Record<string, unknown>)
        : {};

    // No free coins: ad / offerwall / app-download must prove completion.
    if (source === 'offerwall_video' && meta.networkShown !== true) {
      return NextResponse.json(
        { ok: false, error: 'ad_not_verified', message: 'Rewarded video not verified.' },
        { status: 403 }
      );
    }
    if (source === 'offerwall' && meta.fromPostback !== true) {
      return NextResponse.json(
        {
          ok: false,
          error: 'verification_required',
          message: 'Complete the partner offerwall task. Coins credit via verified postback only.',
        },
        { status: 403 }
      );
    }
    if (source === 'app_download' && meta.installVerified !== true) {
      return NextResponse.json(
        {
          ok: false,
          error: 'verification_required',
          message: 'Install the app first. Click-only downloads do not earn coins.',
        },
        { status: 403 }
      );
    }

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
        ...meta,
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
        : `${SOURCE_LABELS[source]}: +${result.balanceCredited} AJ Coins`,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'earn_failed';
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    sources: Object.keys(SOURCE_LABELS),
    labels: SOURCE_LABELS,
  });
}
