import { NextResponse } from 'next/server';
import {
  collection,
  doc,
  getDoc,
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

    // Admin earnings ledger
    let ownerUsd = 0;
    let ownerCoins = 0;
    let giftOwnerUsd = 0;
    let giftOwnerCoins = 0;
    let adOwnerUsd = 0;
    let surveyOwnerUsd = 0;
    let surveyOwnerCoins = 0;
    let surveyUserCoins = 0;
    let surveyGrossUsd = 0;
    let surveyEventCount = 0;
    let pkOwnerCoins = 0;
    let pkOwnerUsd = 0;
    let eventCount = 0;

    if (adminDb) {
      const earnSnap = await adminDb.doc('admin_stats/earnings').get();
      if (earnSnap.exists) {
        const d = earnSnap.data() as Record<string, unknown>;
        ownerUsd = Number(d.totalOwnerUsd || 0);
        ownerCoins = Number(d.totalOwnerCoins || 0);
        giftOwnerUsd = Number(d.giftOwnerUsd || 0);
        giftOwnerCoins = Number(d.giftOwnerCoins || 0);
        adOwnerUsd = Number(d.adOwnerUsd || 0);
        surveyOwnerUsd = Number(d.surveyOwnerUsd || 0);
        surveyOwnerCoins = Number(d.surveyOwnerCoins || 0);
        pkOwnerCoins = Number(d.pkOwnerCoins || 0);
        pkOwnerUsd = Number(d.pkOwnerUsd || 0);
        eventCount = Number(d.eventCount || 0);
      }
    } else {
      const earnSnap = await getDoc(doc(db, 'admin_stats', 'earnings'));
      if (earnSnap.exists()) {
        const d = earnSnap.data() as Record<string, unknown>;
        ownerUsd = Number(d.totalOwnerUsd || 0);
        ownerCoins = Number(d.totalOwnerCoins || 0);
        giftOwnerUsd = Number(d.giftOwnerUsd || 0);
        giftOwnerCoins = Number(d.giftOwnerCoins || 0);
        adOwnerUsd = Number(d.adOwnerUsd || 0);
        surveyOwnerUsd = Number(d.surveyOwnerUsd || 0);
        surveyOwnerCoins = Number(d.surveyOwnerCoins || 0);
        pkOwnerCoins = Number(d.pkOwnerCoins || 0);
        pkOwnerUsd = Number(d.pkOwnerUsd || 0);
        eventCount = Number(d.eventCount || 0);
      }
    }

    // Rebuild survey breakdown from offerwall_ledger (TheoremReach + offer tasks)
    try {
      let ledgerSnap;
      if (adminDb) {
        ledgerSnap = await adminDb.collection('offerwall_ledger').limit(2000).get();
      } else {
        ledgerSnap = await getDocs(
          query(collection(db, 'offerwall_ledger'), limit(2000))
        );
      }
      let rebuiltSurveyUsd = 0;
      let rebuiltSurveyCoins = 0;
      let rebuiltUserCoins = 0;
      let rebuiltGross = 0;
      let rebuiltEvents = 0;
      ledgerSnap.forEach((r) => {
        const d = r.data() as Record<string, unknown>;
        const meta = (d.meta && typeof d.meta === 'object'
          ? (d.meta as Record<string, unknown>)
          : {}) as Record<string, unknown>;
        const via = String(meta.via || '').toLowerCase();
        const provider = String(meta.provider || '').toLowerCase();
        const source = String(d.source || '');
        const isSurvey =
          via.includes('theorem') ||
          provider.includes('theorem') ||
          (source === 'offerwall' && !provider.includes('adsterra'));
        if (!isSurvey) return;
        const userCoins = Math.max(
          0,
          Math.floor(Number(d.flatCoins ?? d.userCoins ?? meta.userReward ?? 0) || 0)
        );
        const adminUsdRow = Number(d.adminUsd ?? meta.adminUsd ?? 0);
        const grossFromMeta = Number(
          meta.providerPayoutUsd ?? meta.providerPayout ?? d.totalUsd ?? 0
        );
        const adminUsd =
          adminUsdRow > 0
            ? adminUsdRow
            : grossFromMeta > 0
              ? grossFromMeta * PLATFORM_EARN_SHARE
              : 0;
        const gross =
          grossFromMeta > 0
            ? grossFromMeta
            : USER_EARN_SHARE > 0
              ? Number((coinsToUsd(userCoins) / USER_EARN_SHARE).toFixed(6))
              : coinsToUsd(userCoins);
        rebuiltSurveyUsd += adminUsd || gross * PLATFORM_EARN_SHARE;
        rebuiltSurveyCoins +=
          Number(d.adminCoins ?? 0) || Math.floor((adminUsd || gross * PLATFORM_EARN_SHARE) * CASH_RATE);
        rebuiltUserCoins += userCoins;
        rebuiltGross += gross;
        rebuiltEvents += 1;
      });
      if (rebuiltEvents > 0) {
        surveyGrossUsd = rebuiltGross;
        surveyUserCoins = rebuiltUserCoins;
        surveyEventCount = rebuiltEvents;
        if (surveyOwnerUsd <= 0) surveyOwnerUsd = rebuiltSurveyUsd;
        if (surveyOwnerCoins <= 0) surveyOwnerCoins = rebuiltSurveyCoins;
      }
    } catch {
      /* ignore */
    }

    // Always rebuild from AdminRevenue when ledger totals look empty OR to backfill PK coins
    if (ownerUsd <= 0 && ownerCoins <= 0) {
      try {
        let revSnap;
        if (adminDb) {
          revSnap = await adminDb.collection('AdminRevenue').limit(800).get();
        } else {
          revSnap = await getDocs(
            query(collection(db, 'AdminRevenue'), limit(800))
          );
        }
        revSnap.forEach((r) => {
          const d = r.data() as Record<string, unknown>;
          const rowUsd = Number(d.ownerUsd ?? d.adminShare ?? 0) || 0;
          const rowCoins =
            Number(d.adminShareCoins ?? d.entryCoins ?? 0) ||
            Math.floor(rowUsd * CASH_RATE);
          ownerUsd += rowUsd;
          ownerCoins += rowCoins;
          const type = String(d.type || '');
          if (type === 'live_gift' || type.includes('gift')) {
            giftOwnerUsd += rowUsd;
            giftOwnerCoins += rowCoins;
          }
          if (type.startsWith('ad_')) adOwnerUsd += rowUsd;
          if (type === 'pk_match') {
            pkOwnerCoins += rowCoins;
            pkOwnerUsd += rowUsd;
          }
          eventCount += 1;
        });
      } catch {
        /* empty */
      }
    } else if (pkOwnerCoins <= 0) {
      // Ledger exists but older PK rows may not have been tagged on admin_stats
      try {
        let revSnap;
        if (adminDb) {
          revSnap = await adminDb
            .collection('AdminRevenue')
            .where('type', '==', 'pk_match')
            .limit(400)
            .get();
        } else {
          revSnap = await getDocs(
            query(
              collection(db, 'AdminRevenue'),
              // client query without composite index — filter in memory
              limit(800)
            )
          );
        }
        revSnap.forEach((r) => {
          const d = r.data() as Record<string, unknown>;
          if (String(d.type || '') !== 'pk_match') return;
          const rowUsd = Number(d.ownerUsd ?? d.adminShare ?? 0) || 0;
          const rowCoins =
            Number(d.adminShareCoins ?? d.entryCoins ?? 0) ||
            Math.floor(rowUsd * CASH_RATE);
          pkOwnerCoins += rowCoins;
          pkOwnerUsd += rowUsd;
        });
      } catch {
        /* ignore */
      }
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
    /** Total credited to users still in circulation + already paid out */
    const totalGivenToUsersCoins = totalUserBalanceCoins + withdrawnPaidCoins;
    const totalGivenToUsersUsd = coinsToUsd(totalGivenToUsersCoins);
    /** After paying approved withdraws, admin USD ledger remaining (approx) */
    const adminRemainingUsd = Math.max(0, ownerUsd - withdrawnPaidUsd);
    /** Admin-only 100% view = user given + admin ledger */
    const totalGrossUsd = Number((totalGivenToUsersUsd + ownerUsd).toFixed(4));
    const totalGrossCoins = totalGivenToUsersCoins + ownerCoins;

    return NextResponse.json({
      ok: true,
      cashRate: CASH_RATE,
      totalUsers,
      totalGrossUsd,
      totalGrossUsdLabel: formatUsd(totalGrossUsd),
      totalGrossCoins,
      // User wallets (what users see — no % in UI)
      totalUserBalanceCoins,
      totalUserBalanceUsd: userWalletUsd,
      totalUserBalanceUsdLabel: formatUsd(userWalletUsd),
      totalGivenToUsersCoins,
      totalGivenToUsersUsd,
      totalGivenToUsersUsdLabel: formatUsd(totalGivenToUsersUsd),
      // Withdraws
      withdrawnPaidCoins,
      withdrawnPaidUsd,
      withdrawnPaidUsdLabel: formatUsd(withdrawnPaidUsd),
      withdrawnPendingCoins,
      withdrawnPendingUsd,
      withdrawnPendingUsdLabel: formatUsd(withdrawnPendingUsd),
      withdrawPaidCount,
      withdrawPendingCount,
      // Admin ledger
      adminOwnerUsd: ownerUsd,
      adminOwnerCoins: ownerCoins,
      adminOwnerUsdLabel: formatUsd(ownerUsd),
      giftOwnerUsd,
      giftOwnerCoins,
      giftOwnerUsdLabel: formatUsd(giftOwnerUsd),
      adOwnerUsd,
      adOwnerUsdLabel: formatUsd(adOwnerUsd),
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
      // Kept for internal tooling only — not shown in user UI
      platformSharePct: PLATFORM_EARN_SHARE,
      userSharePct: USER_EARN_SHARE,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'summary_failed';
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
