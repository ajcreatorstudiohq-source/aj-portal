import { NextResponse } from 'next/server';
import { applySplitReward, applyFlatCoins } from '../../../lib/reward-engine';
import {
  isRewardSource,
  SOURCE_LABELS,
  POST_REWARD_COINS,
  GAME_REWARD_COINS,
  REWARD_COIN_AMOUNTS,
  type RewardSource,
} from '../../../lib/reward-sources';
import {
  bearerFromRequest,
  verifyFirebaseIdToken,
} from '../../../lib/verify-id-token';
import {
  REFERRAL_BONUS_COINS,
} from '../../../lib/economy';
import { FieldValue, getAdminDb } from '../../../lib/firebase-admin';

const BOT_CLAIM_LOCK_MS = 24 * 60 * 60 * 1000;

/**
 * POST /api/rewards/earn
 * Posts / referral / games / AI bot restored with modest ad-backed amounts.
 * Math/Captcha/Watch Ads use their dedicated routes.
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
    let meta: Record<string, unknown> =
      body.meta && typeof body.meta === 'object'
        ? { ...(body.meta as Record<string, unknown>) }
        : {};

    // Gifts must debit sender via /api/wallet/gift — never credit-only via earn
    if (source === 'live_gift') {
      return NextResponse.json(
        {
          ok: false,
          error: 'use_wallet_gift',
          message: 'Gifts must go through /api/wallet/gift (Admin debit + credit).',
        },
        { status: 403 }
      );
    }
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
    if (
      (source === 'tiktok_post' || source === 'pulse_post') &&
      meta.uploadVerified !== true
    ) {
      return NextResponse.json(
        {
          ok: false,
          error: 'verification_required',
          message: 'Upload must succeed in Storage before coins are awarded.',
        },
        { status: 403 }
      );
    }

    let creditUid = actor.uid;
    const beneficiary = String(body.beneficiaryUid || '').trim();
    if (beneficiary && source === 'referral') {
      creditUid = beneficiary;
    }

    // AI bot — 24h server-time lock; invested/botTier from Firestore (Admin), never client meta
    if (source === 'ai_bot_sync') {
      const adminDb = getAdminDb();
      if (!adminDb) {
        return NextResponse.json(
          {
            ok: false,
            error: 'admin_sdk_missing',
            message: 'Server wallet unavailable. Configure FIREBASE_SERVICE_ACCOUNT_JSON.',
          },
          { status: 503 }
        );
      }
      const userSnap = await adminDb.collection('users').doc(actor.uid).get();
      if (!userSnap.exists) {
        return NextResponse.json({ ok: false, error: 'user_not_found' }, { status: 404 });
      }
      const ud = userSnap.data() as {
        lastBotClaimAt?: { toMillis?: () => number; _seconds?: number; seconds?: number };
        botTier?: string;
        invested?: number;
      };
      if (!ud.botTier || ud.botTier === 'none' || !(Number(ud.invested) > 0)) {
        return NextResponse.json(
          { ok: false, error: 'bot_inactive', message: 'Activate an AI Trading Bot first.' },
          { status: 400 }
        );
      }
      // Stash server truth for credit step
      meta.botTier = ud.botTier;
      meta.invested = Number(ud.invested) || 0;
      meta.serverInvested = true;

      const last = ud.lastBotClaimAt;
      let lastMs = 0;
      if (last && typeof last.toMillis === 'function') {
        lastMs = last.toMillis();
      } else if (last && typeof (last as { _seconds?: number })._seconds === 'number') {
        lastMs = Number((last as { _seconds: number })._seconds) * 1000;
      } else if (last && typeof (last as { seconds?: number }).seconds === 'number') {
        lastMs = Number((last as { seconds: number }).seconds) * 1000;
      }
      if (lastMs > 0 && Date.now() - lastMs < BOT_CLAIM_LOCK_MS) {
        const waitH = Math.ceil((BOT_CLAIM_LOCK_MS - (Date.now() - lastMs)) / 3600000);
        return NextResponse.json(
          {
            ok: false,
            error: 'claim_locked',
            message: `Next bot claim available in ~${waitH}h (server clock).`,
          },
          { status: 429 }
        );
      }
    }

    const idem =
      String(body.idempotencyKey || '').trim() ||
      `${source}_${creditUid}_${Date.now()}`;
    const txId = `earn_${source}_${idem}`.replace(/[^a-zA-Z0-9_\-]/g, '_').slice(0, 180);

    let result;
    if (source === 'tiktok_post' || source === 'pulse_post') {
      if (POST_REWARD_COINS <= 0) {
        return NextResponse.json({
          ok: true,
          duplicate: false,
          source,
          creditedCoins: 0,
          message: `${SOURCE_LABELS[source]} published. No coin reward (ads-only earn).`,
        });
      }
      result = await applyFlatCoins({
        uid: creditUid,
        txId,
        source,
        coins: POST_REWARD_COINS,
        meta: { ...meta, actorUid: actor.uid, label: SOURCE_LABELS[source] },
        enforceDailyCap: true,
      });
    } else if (source === 'ai_bot_sync') {
      // ONLY server-stored invested (set above) — ignore client meta.invested
      const invested = Math.max(0, Math.floor(Number(meta.invested) || 0));
      const tier = String(meta.botTier || 'basic');
      if (!(invested > 0) || meta.serverInvested !== true) {
        return NextResponse.json(
          {
            ok: false,
            error: 'bot_inactive',
            message: 'Activate an AI Trading Bot first (server verification failed).',
          },
          { status: 400 }
        );
      }
      const botCoins = Math.max(
        1,
        Math.min(500, Math.floor(invested * (tier === 'vvip' ? 0.05 : 0.025)))
      );
      result = await applyFlatCoins({
        uid: creditUid,
        txId,
        source,
        coins: botCoins,
        meta: {
          botTier: tier,
          invested,
          serverInvested: true,
          actorUid: actor.uid,
          label: SOURCE_LABELS[source],
        },
        enforceDailyCap: true,
        userPatch: { lastBotClaimAt: FieldValue.serverTimestamp() },
      });
    } else if (source === 'referral') {
      if (REFERRAL_BONUS_COINS <= 0) {
        return NextResponse.json({
          ok: true,
          duplicate: false,
          source,
          creditedCoins: 0,
          message: 'Referral saved. No coin bonus.',
        });
      }
      result = await applyFlatCoins({
        uid: creditUid,
        txId,
        source,
        coins: REFERRAL_BONUS_COINS,
        meta: { ...meta, actorUid: actor.uid, label: SOURCE_LABELS[source] },
        enforceDailyCap: true,
      });
    } else if (source === 'game_install' || source === 'game_milestone') {
      result = await applyFlatCoins({
        uid: creditUid,
        txId,
        source,
        coins: GAME_REWARD_COINS,
        meta: { ...meta, actorUid: actor.uid, label: SOURCE_LABELS[source] },
        enforceDailyCap: true,
      });
    } else if (
      source === 'live_view' ||
      source === 'live_host' ||
      source === 'pk_match' ||
      source === 'app_download'
    ) {
      // Live view/host free earn stays off — PK entry fees + ads monetize live.
      return NextResponse.json({
        ok: true,
        duplicate: false,
        source,
        creditedCoins: 0,
        message: `${SOURCE_LABELS[source]}: earn via Watch Ads / Offerwall / Games.`,
      });
    } else {
      result = await applySplitReward({
        uid: creditUid,
        txId,
        source,
        seed: txId,
        meta: {
          ...meta,
          actorUid: actor.uid,
          label: SOURCE_LABELS[source],
        },
        ledgerCollection: 'reward_ledger',
        enforceDailyCap: true,
      });
    }

    if (!result.ok) {
      const status =
        result.error === 'daily_limit' || result.error === 'claim_locked' ? 429 : 500;
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
      ownerUsd: result.split?.adminUsd,
      totalPoolUsd: result.split?.totalUsd,
      platformSharePct: 0.7,
      userSharePct: 0.3,
      message: result.duplicate
        ? 'Already credited'
        : `${SOURCE_LABELS[source]}: +${result.balanceCredited} AJ Coins 🪙`,
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
    postRewardCoins: POST_REWARD_COINS,
    amounts: REWARD_COIN_AMOUNTS,
  });
}
