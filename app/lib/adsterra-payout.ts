/**
 * Unified Adsterra settled-payout applicator.
 * Direct Link · Banner · Video · Native Banner · Social Bar
 * all credit through this exact 70% admin / 30% user path.
 */
import 'server-only';
import { applyFlatCoins, type ApplyRewardResult } from './reward-engine';
import {
  CASH_RATE,
  PLATFORM_EARN_SHARE,
  USER_EARN_SHARE,
  coinsToUsd,
  splitPayoutUsd,
} from './economy';
import {
  type AdsterraFormat,
  adsterraDisplayLabel,
  normalizeAdsterraFormat,
} from './adsterra-formats';
import { FieldValue, getAdminDb } from './firebase-admin';

export type ApplyAdsterraPayoutInput = {
  uid: string;
  /** Exact Adsterra payout USD — never an estimate */
  payoutUsd: number;
  txId?: string | null;
  format?: string | null;
  placement?: string | null;
  psid?: string | null;
  extraMeta?: Record<string, unknown>;
};

export type ApplyAdsterraPayoutResult = ApplyRewardResult & {
  format: AdsterraFormat;
  payoutUsd: number;
  userVisibleReward: number;
  adminUsd: number;
  displayLabel: string;
  txId: string;
};

function userCoinsFromPayoutUsd(payoutUsd: number): number {
  return Math.floor(Math.max(0, payoutUsd) * USER_EARN_SHARE * CASH_RATE);
}

/**
 * Credit real Adsterra revenue with the canonical 70/30 split.
 * User sees 30% as a normal wallet reward; 70% books to Admin Hub.
 */
export async function applyAdsterraSettledPayout(
  input: ApplyAdsterraPayoutInput
): Promise<ApplyAdsterraPayoutResult> {
  const uid = String(input.uid || '').trim();
  const payoutUsd = Number(Number(input.payoutUsd).toFixed(6));
  const format = normalizeAdsterraFormat(input.format);
  const displayLabel = adsterraDisplayLabel(format);
  const placement = String(input.placement || '').slice(0, 64) || undefined;

  if (!uid) {
    return {
      ok: false,
      error: 'missing_userId',
      format,
      payoutUsd: 0,
      userVisibleReward: 0,
      adminUsd: 0,
      displayLabel,
      txId: '',
    };
  }
  if (!(payoutUsd > 0)) {
    return {
      ok: false,
      error: 'missing_payout',
      format,
      payoutUsd: 0,
      userVisibleReward: 0,
      adminUsd: 0,
      displayLabel,
      txId: '',
    };
  }

  const split = splitPayoutUsd(payoutUsd);
  const userReward = userCoinsFromPayoutUsd(payoutUsd);
  if (userReward <= 0) {
    return {
      ok: false,
      error: 'payout_too_small',
      format,
      payoutUsd,
      userVisibleReward: 0,
      adminUsd: split.adminUsd,
      displayLabel,
      txId: '',
    };
  }

  const txRaw =
    String(input.txId || '').trim() ||
    `adsterra_${format}_${uid}_${payoutUsd}_${Date.now()}`;
  const txId = `adsterra_${txRaw}`.replace(/[^a-zA-Z0-9_\-]/g, '_').slice(0, 180);
  const userUsd = coinsToUsd(userReward);
  const adminUsd = Number((payoutUsd - userUsd).toFixed(6));

  const result = await applyFlatCoins({
    uid,
    txId,
    source: 'offerwall_video',
    coins: userReward,
    settledPayoutUsd: payoutUsd,
    bookAdminEarnings: true,
    meta: {
      provider: 'adsterra',
      adsterraFormat: format,
      format,
      placement: placement || null,
      providerPayoutUsd: payoutUsd,
      providerPayout: payoutUsd,
      userSharePct: USER_EARN_SHARE,
      platformSharePct: PLATFORM_EARN_SHARE,
      adminSharePct: PLATFORM_EARN_SHARE,
      cashRate: CASH_RATE,
      userReward,
      userUsd,
      adminUsd,
      split: {
        userPct: USER_EARN_SHARE,
        adminPct: PLATFORM_EARN_SHARE,
      },
      displayLabel,
      userVisibleReward: userReward,
      via: 'adsterra_real_postback',
      unifiedHandler: 'applyAdsterraSettledPayout',
      fromPostback: true,
      settled: true,
      estimated: false,
      ...(input.psid ? { psid: input.psid } : {}),
      ...(input.extraMeta || {}),
    },
    ledgerCollection: 'offerwall_ledger',
    enforceDailyCap: false,
  });

  if (result.ok && !result.duplicate) {
    try {
      const db = getAdminDb();
      if (db) {
        const snap = await db
          .collection('ad_reward_sessions')
          .where('uid', '==', uid)
          .where('verified', '==', true)
          .where('consumed', '==', false)
          .limit(5)
          .get();
        if (!snap.empty) {
          const batch = db.batch();
          snap.docs.forEach((d) => {
            batch.set(
              d.ref,
              {
                consumed: true,
                settledTxId: txId,
                settledPayoutUsd: payoutUsd,
                creditedCoins: result.balanceCredited,
                adsterraFormat: format,
                settledAt: FieldValue.serverTimestamp(),
              },
              { merge: true }
            );
          });
          await batch.commit();
        }
      }
    } catch {
      /* non-fatal */
    }
  }

  return {
    ...result,
    format,
    payoutUsd,
    userVisibleReward: result.balanceCredited ?? (result.ok && !result.duplicate ? userReward : 0),
    adminUsd: result.split?.adminUsd ?? adminUsd,
    displayLabel,
    txId,
  };
}
