import { NextResponse } from 'next/server';
import {
  collection,
  getDocs,
  limit,
  query,
} from 'firebase/firestore';
import { db } from '../../../../firebaseConfig';
import { verifyAdminFromRequest } from '../../../lib/admin-auth';
import {
  CASH_RATE,
  PLATFORM_EARN_SHARE,
  USER_EARN_SHARE,
  coinsToUsd,
  formatUsd,
} from '../../../lib/economy';
import { getAdminDb } from '../../../lib/firebase-admin';
import { persistPortalAdminUid } from '../../../lib/admin-earnings';
import {
  isSettledRevenueRow,
  isEstimatedRevenueRow,
  revenueRowOwnerUsd,
  revenueRowOwnerCoins,
} from '../../../lib/settled-revenue';

function isPaidStatus(status: string) {
  const s = status.toLowerCase();
  return (
    s === 'approved' ||
    s === 'paid' ||
    s === 'completed' ||
    s === 'success' ||
    s === 'done'
  );
}

function isPendingStatus(status: string) {
  const s = status.toLowerCase();
  return s === 'pending' || s === 'processing' || s === 'review' || s === '';
}

/**
 * GET /api/admin/economy-summary
 * CEO-only — full hisaab. Admin UI shows 100% gross (users + ledger).
 * Users never see split % in the app wallet UI.
 */
export async function GET(request: Request) {
  try {
    const admin = await verifyAdminFromRequest(request);
    if (!admin) {
      return NextResponse.json({ ok: false, error: 'forbidden' }, { status: 403 });
    }

    // Persist owner UID so earn paths can credit Hub wallet even without ADMIN_UIDS env
    if (admin.uid) {
      try {
        await persistPortalAdminUid(admin.uid, admin.email);
      } catch {
        /* non-fatal */
      }
    }

    const adminDb = getAdminDb();
    let totalUsers = 0;
    let totalUserBalanceCoins = 0;

    if (adminDb) {
      const usersSnap = await adminDb.collection('users').get();
      totalUsers = usersSnap.size;
      usersSnap.forEach((d) => {
        totalUserBalanceCoins += Number(
          (d.data() as { balance?: number }).balance || 0
        );
      });
    } else {
      const usersSnap = await getDocs(collection(db, 'users'));
      totalUsers = usersSnap.size;
      usersSnap.forEach((d) => {
        totalUserBalanceCoins += Number(
          (d.data() as { balance?: number }).balance || 0
        );
      });
    }

    // ── Settled owner revenue only (never invent Adsterra CPC estimates) ──
    let ownerUsd = 0;
    let ownerCoins = 0;
    let giftOwnerUsd = 0;
    let giftOwnerCoins = 0;
    let adOwnerUsd = 0;
    let estimatedAdOwnerUsd = 0;
    let surveyOwnerUsd = 0;
    let surveyOwnerCoins = 0;
    let surveyUserCoins = 0;
    let surveyGrossUsd = 0;
    let surveyEventCount = 0;
    let pkOwnerCoins = 0;
    let pkOwnerUsd = 0;
    let eventCount = 0;

    try {
      let revSnap;
      if (adminDb) {
        revSnap = await adminDb.collection('AdminRevenue').limit(2000).get();
      } else {
        revSnap = await getDocs(query(collection(db, 'AdminRevenue'), limit(2000)));
      }
      revSnap.forEach((r) => {
        const d = r.data() as Record<string, unknown>;
        const rowUsd = revenueRowOwnerUsd(d);
        const rowCoins = revenueRowOwnerCoins(d);
        const type = String(d.type || '');
        const meta =
          d.meta && typeof d.meta === 'object'
            ? (d.meta as Record<string, unknown>)
            : {};

        if (isEstimatedRevenueRow(d)) {
          estimatedAdOwnerUsd += rowUsd;
          return;
        }
        if (!isSettledRevenueRow(d)) return;

        ownerUsd += rowUsd;
        ownerCoins += rowCoins;
        eventCount += 1;

        if (type === 'live_gift' || type.includes('gift')) {
          giftOwnerUsd += rowUsd;
          giftOwnerCoins += rowCoins;
        } else if (type === 'pk_match') {
          pkOwnerCoins += rowCoins;
          pkOwnerUsd += rowUsd;
        } else if (
          type === 'offerwall' ||
          String(meta.via || '').includes('theorem') ||
          String(meta.provider || '').includes('theorem')
        ) {
          surveyOwnerUsd += rowUsd;
          surveyOwnerCoins += rowCoins;
        } else if (
          type.startsWith('ad_') ||
          type.includes('adsterra') ||
          type === 'offerwall_video'
        ) {
          // Only settled ad rows (rare) — estimates already filtered out
          adOwnerUsd += rowUsd;
        }
      });
    } catch {
      /* ignore */
    }

    // Survey user-side + partner gross from settled offerwall_ledger only
    try {
      let ledgerSnap;
      if (adminDb) {
        ledgerSnap = await adminDb.collection('offerwall_ledger').limit(2000).get();
      } else {
        ledgerSnap = await getDocs(
          query(collection(db, 'offerwall_ledger'), limit(2000))
        );
      }
      ledgerSnap.forEach((r) => {
        const d = r.data() as Record<string, unknown>;
        const meta =
          d.meta && typeof d.meta === 'object'
            ? (d.meta as Record<string, unknown>)
            : {};
        const via = String(meta.via || '').toLowerCase();
        const provider = String(meta.provider || '').toLowerCase();
        const source = String(d.source || '');
        const isSurvey =
          via.includes('theorem') ||
          provider.includes('theorem') ||
          (source === 'offerwall' && !provider.includes('adsterra'));
        if (!isSurvey) return;
        // Skip estimated / unsettleable rows (no real partner USD)
        if (d.settled === false || meta.settled === false || meta.estimated === true) {
          return;
        }
        const userCoins = Math.max(
          0,
          Math.floor(Number(d.flatCoins ?? d.userCoins ?? meta.userReward ?? 0) || 0)
        );
        const gross = Number(
          meta.providerPayoutUsd ?? meta.providerPayout ?? d.totalUsd ?? 0
        );
        if (!(gross > 0) && !(d.settled === true || meta.settled === true)) {
          // No partner USD → do not invent survey gross for Hisaab
          surveyUserCoins += userCoins;
          return;
        }
        surveyUserCoins += userCoins;
        surveyGrossUsd += gross > 0 ? gross : 0;
        surveyEventCount += 1;
        if (surveyOwnerUsd <= 0) {
          const adminUsdRow = Number(d.adminUsd ?? meta.adminUsd ?? 0);
          surveyOwnerUsd +=
            adminUsdRow > 0 ? adminUsdRow : gross > 0 ? gross * PLATFORM_EARN_SHARE : 0;
          surveyOwnerCoins +=
            Number(d.adminCoins ?? 0) ||
            Math.floor(
              (adminUsdRow > 0 ? adminUsdRow : gross * PLATFORM_EARN_SHARE) * CASH_RATE
            );
        }
      });
    } catch {
      /* ignore */
    }

    // Withdrawals
    let withdrawnPaidCoins = 0;
    let withdrawnPendingCoins = 0;
    let withdrawPaidCount = 0;
    let withdrawPendingCount = 0;
    try {
      let wSnap;
      if (adminDb) {
        wSnap = await adminDb.collection('manual_withdrawals').limit(500).get();
      } else {
        wSnap = await getDocs(
          query(collection(db, 'manual_withdrawals'), limit(500))
        );
      }
      wSnap.forEach((r) => {
        const d = r.data() as { coins?: number; status?: string };
        const coins = Number(d.coins || 0);
        const status = String(d.status || 'pending');
        if (isPaidStatus(status)) {
          withdrawnPaidCoins += coins;
          withdrawPaidCount += 1;
        } else if (isPendingStatus(status)) {
          withdrawnPendingCoins += coins;
          withdrawPendingCount += 1;
        }
      });
    } catch {
      /* rules / missing */
    }

    const userWalletUsd = coinsToUsd(totalUserBalanceCoins);
    const withdrawnPaidUsd = coinsToUsd(withdrawnPaidCoins);
    const withdrawnPendingUsd = coinsToUsd(withdrawnPendingCoins);
    const totalGivenToUsersCoins = totalUserBalanceCoins + withdrawnPaidCoins;
    const totalGivenToUsersUsd = coinsToUsd(totalGivenToUsersCoins);
    const adminRemainingUsd = Math.max(0, ownerUsd - withdrawnPaidUsd);
    /** Settled pool only — excludes inflated Adsterra CPC estimates */
    const totalGrossUsd = Number((totalGivenToUsersUsd + ownerUsd).toFixed(4));
    const totalGrossCoins = totalGivenToUsersCoins + ownerCoins;

    return NextResponse.json({
      ok: true,
      cashRate: CASH_RATE,
      totalUsers,
      totalGrossUsd,
      totalGrossUsdLabel: formatUsd(totalGrossUsd),
      totalGrossCoins,
      totalUserBalanceCoins,
      totalUserBalanceUsd: userWalletUsd,
      totalUserBalanceUsdLabel: formatUsd(userWalletUsd),
      totalGivenToUsersCoins,
      totalGivenToUsersUsd,
      totalGivenToUsersUsdLabel: formatUsd(totalGivenToUsersUsd),
      withdrawnPaidCoins,
      withdrawnPaidUsd,
      withdrawnPaidUsdLabel: formatUsd(withdrawnPaidUsd),
      withdrawnPendingCoins,
      withdrawnPendingUsd,
      withdrawnPendingUsdLabel: formatUsd(withdrawnPendingUsd),
      withdrawPaidCount,
      withdrawPendingCount,
      adminOwnerUsd: ownerUsd,
      adminOwnerCoins: ownerCoins,
      adminOwnerUsdLabel: formatUsd(ownerUsd),
      giftOwnerUsd,
      giftOwnerCoins,
      giftOwnerUsdLabel: formatUsd(giftOwnerUsd),
      adOwnerUsd,
      adOwnerUsdLabel: formatUsd(adOwnerUsd),
      /** Assumed CPC / track leftovers — NOT Adsterra dashboard cash */
      estimatedAdOwnerUsd,
      estimatedAdOwnerUsdLabel: formatUsd(estimatedAdOwnerUsd),
      surveyOwnerUsd,
      surveyOwnerUsdLabel: formatUsd(surveyOwnerUsd),
      surveyOwnerCoins,
      surveyUserCoins,
      surveyUserUsd: coinsToUsd(surveyUserCoins),
      surveyUserUsdLabel: formatUsd(coinsToUsd(surveyUserCoins)),
      surveyGrossUsd,
      surveyGrossUsdLabel: formatUsd(surveyGrossUsd),
      surveyEventCount,
      pkOwnerCoins,
      pkOwnerUsd,
      pkOwnerUsdLabel: formatUsd(pkOwnerUsd),
      eventCount,
      adminRemainingUsd,
      adminRemainingUsdLabel: formatUsd(adminRemainingUsd),
      platformSharePct: PLATFORM_EARN_SHARE,
      userSharePct: USER_EARN_SHARE,
      note: 'Hisaab totals use settled partner USD only. Adsterra real $ is in the Adsterra dashboard — estimates are excluded.',
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'summary_failed';
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
