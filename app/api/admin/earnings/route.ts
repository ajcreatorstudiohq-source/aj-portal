import { NextResponse } from 'next/server';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
} from 'firebase/firestore';
import { db } from '../../../../firebaseConfig';
import { verifyAdminFromRequest } from '../../../lib/admin-auth';
import { COIN_RATE, formatUsd } from '../../../lib/economy';
import type { AdminEarningsTotals } from '../../../lib/admin-earnings-types';

/**
 * GET /api/admin/earnings
 * CEO-only — returns cumulative owner earnings (USD + coins) for the portal.
 */
export async function GET(request: Request) {
  try {
    const admin = await verifyAdminFromRequest(request);
    if (!admin) {
      return NextResponse.json({ ok: false, error: 'forbidden' }, { status: 403 });
    }

    const snap = await getDoc(doc(db, 'admin_stats', 'earnings'));
    let totals: AdminEarningsTotals = {
      totalOwnerUsd: 0,
      totalOwnerCoins: 0,
      giftOwnerUsd: 0,
      giftOwnerCoins: 0,
      adOwnerUsd: 0,
      eventCount: 0,
    };

    if (snap.exists()) {
      const d = snap.data() as Record<string, unknown>;
      totals = {
        totalOwnerUsd: Number(d.totalOwnerUsd || 0),
        totalOwnerCoins: Number(d.totalOwnerCoins || 0),
        giftOwnerUsd: Number(d.giftOwnerUsd || 0),
        giftOwnerCoins: Number(d.giftOwnerCoins || 0),
        adOwnerUsd: Number(d.adOwnerUsd || 0),
        eventCount: Number(d.eventCount || 0),
        updatedAt: d.updatedAt,
      };
    }

    // If running total is empty, rebuild from recent AdminRevenue rows
    if (totals.totalOwnerUsd <= 0 && totals.totalOwnerCoins <= 0) {
      try {
        const revSnap = await getDocs(
          query(collection(db, 'AdminRevenue'), orderBy('date', 'desc'), limit(500))
        );
        let usd = 0;
        let coins = 0;
        let giftsUsd = 0;
        let giftsCoins = 0;
        let adsUsd = 0;
        revSnap.forEach((r) => {
          const d = r.data() as Record<string, unknown>;
          const rowUsd = Number(d.ownerUsd ?? d.adminShare ?? 0) || 0;
          const rowCoins =
            Number(d.adminShareCoins ?? 0) || Math.floor(rowUsd * COIN_RATE);
          usd += rowUsd;
          coins += rowCoins;
          const type = String(d.type || '');
          if (type === 'live_gift' || type.includes('gift')) {
            giftsUsd += rowUsd;
            giftsCoins += rowCoins;
          }
          if (type.startsWith('ad_')) adsUsd += rowUsd;
        });
        totals = {
          totalOwnerUsd: Number(usd.toFixed(4)),
          totalOwnerCoins: coins,
          giftOwnerUsd: Number(giftsUsd.toFixed(4)),
          giftOwnerCoins: giftsCoins,
          adOwnerUsd: Number(adsUsd.toFixed(4)),
          eventCount: revSnap.size,
        };
      } catch {
        /* index / empty — keep zeros */
      }
    }

    return NextResponse.json({
      ok: true,
      ...totals,
      totalOwnerUsdLabel: formatUsd(totals.totalOwnerUsd),
      rate: { coinsPerUsd: COIN_RATE },
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'earnings_failed';
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
