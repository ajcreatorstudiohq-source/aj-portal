'use client';

import { useCallback, useEffect, useState } from 'react';
import { collection, getDocs, limit, query } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { isPortalAdminUser, ADMIN_EMAIL } from '../lib/admin-auth';
import {
  CASH_RATE,
  COIN_RATE,
  coinsToUsd,
  formatUsd,
} from '../lib/economy';

export type EconomySummary = {
  totalUsers: number;
  totalUserBalanceCoins: number;
  totalUserBalanceUsd: number;
  totalUserBalanceUsdLabel?: string;
  totalGivenToUsersCoins: number;
  totalGivenToUsersUsd: number;
  totalGivenToUsersUsdLabel?: string;
  withdrawnPaidCoins: number;
  withdrawnPaidUsd: number;
  withdrawnPaidUsdLabel?: string;
  withdrawnPendingCoins: number;
  withdrawnPendingUsd: number;
  withdrawnPendingUsdLabel?: string;
  withdrawPaidCount: number;
  withdrawPendingCount: number;
  adminOwnerUsd: number;
  adminOwnerCoins: number;
  adminOwnerUsdLabel?: string;
  giftOwnerUsd: number;
  giftOwnerCoins: number;
  giftOwnerUsdLabel?: string;
  adOwnerUsd: number;
  adOwnerUsdLabel?: string;
  /** TheoremReach surveys — admin 70% */
  surveyOwnerUsd?: number;
  surveyOwnerUsdLabel?: string;
  surveyOwnerCoins?: number;
  /** User 30% credited as full standard reward */
  surveyUserCoins?: number;
  surveyUserUsd?: number;
  surveyUserUsdLabel?: string;
  surveyGrossUsd?: number;
  surveyGrossUsdLabel?: string;
  surveyEventCount?: number;
  pkOwnerCoins?: number;
  pkOwnerUsd?: number;
  pkOwnerUsdLabel?: string;
  eventCount: number;
  adminRemainingUsd: number;
  adminRemainingUsdLabel?: string;
  /** Full pool (users + admin ledger) — admin-only 100% view */
  totalGrossUsd?: number;
  totalGrossUsdLabel?: string;
  totalGrossCoins?: number;
};

type Props = {
  adminUser?: { uid?: string | null; email?: string | null } | null;
  refreshKey?: number;
};

function emptySummary(): EconomySummary {
  return {
    totalUsers: 0,
    totalUserBalanceCoins: 0,
    totalUserBalanceUsd: 0,
    totalGivenToUsersCoins: 0,
    totalGivenToUsersUsd: 0,
    withdrawnPaidCoins: 0,
    withdrawnPaidUsd: 0,
    withdrawnPendingCoins: 0,
    withdrawnPendingUsd: 0,
    withdrawPaidCount: 0,
    withdrawPendingCount: 0,
    adminOwnerUsd: 0,
    adminOwnerCoins: 0,
    giftOwnerUsd: 0,
    giftOwnerCoins: 0,
    adOwnerUsd: 0,
    surveyOwnerUsd: 0,
    surveyOwnerCoins: 0,
    surveyUserCoins: 0,
    surveyGrossUsd: 0,
    surveyEventCount: 0,
    pkOwnerCoins: 0,
    pkOwnerUsd: 0,
    eventCount: 0,
    adminRemainingUsd: 0,
    totalGrossUsd: 0,
    totalGrossCoins: 0,
  };
}

function withGross(partial: EconomySummary): EconomySummary {
  const userUsd = Number(partial.totalGivenToUsersUsd || 0);
  const adminUsd = Number(partial.adminOwnerUsd || 0);
  const grossUsd = Number((userUsd + adminUsd).toFixed(4));
  const grossCoins =
    Number(partial.totalGivenToUsersCoins || 0) +
    Number(partial.adminOwnerCoins || 0) ||
    Math.floor(grossUsd * COIN_RATE);
  return {
    ...partial,
    totalGrossUsd: grossUsd,
    totalGrossUsdLabel: formatUsd(grossUsd),
    totalGrossCoins: grossCoins,
  };
}

/**
 * Full admin hisaab (CEO only).
 * Shows 100% total pool; users only ever see their own wallet (no % labels in app UI).
 */
export default function AdminEconomyHisaab({ adminUser, refreshKey = 0 }: Props) {
  const [economy, setEconomy] = useState<EconomySummary | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const current = auth.currentUser;
    if (!current || !isPortalAdminUser(adminUser || { uid: current.uid, email: current.email })) {
      return;
    }
    setLoading(true);
    try {
      const token = await current.getIdToken();
      const res = await fetch('/api/admin/economy-summary', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = (await res.json().catch(() => ({}))) as EconomySummary & { ok?: boolean };
      if (res.ok && data.ok !== false) {
        setEconomy(withGross({ ...emptySummary(), ...data }));
        return;
      }

      // Client fallback
      const usersSnap = await getDocs(collection(db, 'users'));
      let bal = 0;
      usersSnap.forEach((d) => {
        bal += Number((d.data() as { balance?: number }).balance || 0);
      });
      let ownerUsd = 0;
      let ownerCoins = 0;
      let giftsUsd = 0;
      let giftsCoins = 0;
      let adsUsd = 0;
      let events = 0;
      try {
        const rev = await getDocs(query(collection(db, 'AdminRevenue'), limit(500)));
        events = rev.size;
        rev.forEach((r) => {
          const d = r.data() as Record<string, unknown>;
          const rowUsd = Number(d.ownerUsd ?? d.adminShare ?? 0) || 0;
          const rowCoins = Number(d.adminShareCoins ?? 0) || 0;
          ownerUsd += rowUsd;
          ownerCoins += rowCoins;
          const type = String(d.type || '');
          if (type === 'live_gift' || type.includes('gift')) {
            giftsUsd += rowUsd;
            giftsCoins += rowCoins;
          }
          if (type.startsWith('ad_')) adsUsd += rowUsd;
        });
      } catch {
        /* ignore */
      }
      let paid = 0;
      let pending = 0;
      let paidN = 0;
      let pendingN = 0;
      try {
        const w = await getDocs(query(collection(db, 'manual_withdrawals'), limit(500)));
        w.forEach((r) => {
          const d = r.data() as { coins?: number; status?: string };
          const c = Number(d.coins || 0);
          const s = String(d.status || 'pending').toLowerCase();
          if (['approved', 'paid', 'completed', 'success', 'done'].includes(s)) {
            paid += c;
            paidN += 1;
          } else {
            pending += c;
            pendingN += 1;
          }
        });
      } catch {
        /* ignore */
      }
      const given = bal + paid;
      setEconomy(
        withGross({
          totalUsers: usersSnap.size,
          totalUserBalanceCoins: bal,
          totalUserBalanceUsd: coinsToUsd(bal),
          totalUserBalanceUsdLabel: formatUsd(coinsToUsd(bal)),
          totalGivenToUsersCoins: given,
          totalGivenToUsersUsd: coinsToUsd(given),
          totalGivenToUsersUsdLabel: formatUsd(coinsToUsd(given)),
          withdrawnPaidCoins: paid,
          withdrawnPaidUsd: coinsToUsd(paid),
          withdrawnPaidUsdLabel: formatUsd(coinsToUsd(paid)),
          withdrawnPendingCoins: pending,
          withdrawnPendingUsd: coinsToUsd(pending),
          withdrawnPendingUsdLabel: formatUsd(coinsToUsd(pending)),
          withdrawPaidCount: paidN,
          withdrawPendingCount: pendingN,
          adminOwnerUsd: ownerUsd,
          adminOwnerCoins: ownerCoins,
          adminOwnerUsdLabel: formatUsd(ownerUsd),
          giftOwnerUsd: giftsUsd,
          giftOwnerCoins: giftsCoins,
          giftOwnerUsdLabel: formatUsd(giftsUsd),
          adOwnerUsd: adsUsd,
          adOwnerUsdLabel: formatUsd(adsUsd),
          eventCount: events,
          adminRemainingUsd: Math.max(0, ownerUsd - coinsToUsd(paid)),
          adminRemainingUsdLabel: formatUsd(Math.max(0, ownerUsd - coinsToUsd(paid))),
        })
      );
    } catch (e) {
      console.error('AdminEconomyHisaab', e);
      setEconomy(emptySummary());
    } finally {
      setLoading(false);
    }
  }, [adminUser]);

  useEffect(() => {
    void load();
  }, [load, refreshKey]);

  const e = economy || emptySummary();
  const grossUsd =
    e.totalGrossUsd ?? Number((e.adminOwnerUsd + e.totalGivenToUsersUsd).toFixed(4));
  const grossCoins =
    e.totalGrossCoins != null && e.totalGrossCoins > 0
      ? e.totalGrossCoins
      : (e.totalGivenToUsersCoins + e.adminOwnerCoins || Math.floor(grossUsd * COIN_RATE));

  return (
    <div
      className="rounded-3xl overflow-hidden border border-emerald-500/25"
      style={{ background: 'linear-gradient(135deg,#052e1a,#0a0a1a,#0d1a2e)' }}
    >
      <div className="h-[2px] w-full bg-gradient-to-r from-emerald-400 via-yellow-400 to-cyan-400" />
      <div className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-[10px] text-emerald-400/80 uppercase tracking-widest font-black">
              Full Hisaab · Admin Portal
            </p>
            <p className="text-[9px] text-gray-500 mt-0.5">
              {loading
                ? 'Loading…'
                : `${CASH_RATE} 🪙 = $1.000 · User 30% · Your 70% → ${ADMIN_EMAIL} wallet`}
            </p>
          </div>
          <button
            type="button"
            onClick={() => void load()}
            className="text-[9px] font-black text-cyan-400 uppercase tracking-widest px-2 py-1 rounded-lg bg-cyan-500/10 border border-cyan-500/20"
          >
            Refresh
          </button>
        </div>

        <div className="rounded-2xl border border-yellow-500/30 bg-yellow-500/10 p-3 space-y-1">
          <p className="text-[9px] text-yellow-300 font-black uppercase tracking-widest">
            Total · 100%
          </p>
          <p className="text-3xl font-black text-yellow-300">
            {grossCoins.toLocaleString()} 🪙
          </p>
          <p className="text-lg font-black text-emerald-400">
            {e.totalGrossUsdLabel || formatUsd(grossUsd)}
          </p>
          <p className="text-[8px] text-gray-500 font-bold">
            Users + admin ledger · {e.totalUsers.toLocaleString()} users · {e.eventCount} events
          </p>
        </div>

        <div className="rounded-2xl border border-cyan-500/20 bg-cyan-500/5 p-3 space-y-1.5">
          <p className="text-[9px] text-cyan-300 font-black uppercase tracking-widest">
            Users · wallets
          </p>
          <p className="text-yellow-300 text-sm font-black">
            Wallets now: {e.totalUserBalanceCoins.toLocaleString()} 🪙
          </p>
          <p className="text-emerald-400 text-xs font-black">
            {e.totalUserBalanceUsdLabel || formatUsd(e.totalUserBalanceUsd)}
          </p>
          <p className="text-[9px] text-gray-400 font-bold">
            Total given (wallets + paid withdraw):{' '}
            {e.totalGivenToUsersCoins.toLocaleString()} 🪙 ·{' '}
            {e.totalGivenToUsersUsdLabel || formatUsd(e.totalGivenToUsersUsd)}
          </p>
        </div>

        <div className="rounded-2xl border border-orange-500/20 bg-orange-500/5 p-3 space-y-1.5">
          <p className="text-[9px] text-orange-300 font-black uppercase tracking-widest">
            Withdraws
          </p>
          <p className="text-white text-xs font-black">
            Paid: {e.withdrawnPaidCoins.toLocaleString()} 🪙 ·{' '}
            {e.withdrawnPaidUsdLabel || formatUsd(e.withdrawnPaidUsd)}
            <span className="text-gray-500 font-bold"> ({e.withdrawPaidCount})</span>
          </p>
          <p className="text-white text-xs font-black">
            Pending: {e.withdrawnPendingCoins.toLocaleString()} 🪙 ·{' '}
            {e.withdrawnPendingUsdLabel || formatUsd(e.withdrawnPendingUsd)}
            <span className="text-gray-500 font-bold"> ({e.withdrawPendingCount})</span>
          </p>
        </div>

        <div className="rounded-2xl border border-emerald-500/25 bg-emerald-500/10 p-3 space-y-1.5">
          <p className="text-[9px] text-emerald-300 font-black uppercase tracking-widest">
            Your share · Hub wallet + ledger
          </p>
          <p className="text-2xl font-black text-yellow-300">
            {(e.adminOwnerCoins || 0).toLocaleString()} 🪙
          </p>
          <p className="text-sm font-black text-emerald-400">
            {e.adminOwnerUsdLabel || formatUsd(e.adminOwnerUsd)}
          </p>
          <p className="text-[8px] text-emerald-200/70 font-bold">
            New earns credit this amount to your admin ID Hub wallet (70% ads / 40% gifts / 100% PK).
            User withdraws only pay their 30% — your share stays profit.
          </p>
          <p className="text-[9px] text-orange-300/90 font-bold">
            PK entries saved: {(e.pkOwnerCoins || 0).toLocaleString()} 🪙
            {e.pkOwnerUsdLabel ? ` · ${e.pkOwnerUsdLabel}` : ''}
          </p>
          <p className="text-[8px] text-gray-500 font-bold">
            Gifts {e.giftOwnerCoins.toLocaleString()} 🪙 · Ads {formatUsd(e.adOwnerUsd)} · Surveys{' '}
            {formatUsd(e.surveyOwnerUsd || 0)} · Events {e.eventCount}
          </p>
          <p className="text-[9px] text-gray-400 font-bold">
            After paid withdraws, remaining ≈{' '}
            <span className="text-emerald-300">
              {e.adminRemainingUsdLabel || formatUsd(e.adminRemainingUsd)}
            </span>
          </p>
          <div className="grid grid-cols-2 gap-2 pt-1">
            <div className="bg-black/20 rounded-xl p-2">
              <p className="text-[8px] text-gray-500 font-black uppercase">Gifts</p>
              <p className="text-white text-[11px] font-black">
                {(e.giftOwnerCoins || 0).toLocaleString()} 🪙
              </p>
              <p className="text-emerald-400 text-[10px] font-bold">
                {e.giftOwnerUsdLabel || formatUsd(e.giftOwnerUsd)}
              </p>
            </div>
            <div className="bg-black/20 rounded-xl p-2">
              <p className="text-[8px] text-gray-500 font-black uppercase">Ads estimate</p>
              <p className="text-emerald-400 text-[10px] font-bold">
                {e.adOwnerUsdLabel || formatUsd(e.adOwnerUsd)}
              </p>
              <p className="text-gray-500 text-[8px]">Adsterra = real $</p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-fuchsia-500/30 bg-fuchsia-500/10 p-3 space-y-2">
          <p className="text-[9px] text-fuchsia-300 font-black uppercase tracking-widest">
            TheoremReach · Surveys
          </p>
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-black/25 rounded-xl p-2">
              <p className="text-[8px] text-gray-500 font-black uppercase">Partner · 100%</p>
              <p className="text-white text-[11px] font-black">
                {e.surveyGrossUsdLabel || formatUsd(e.surveyGrossUsd || 0)}
              </p>
              <p className="text-[8px] text-gray-500 font-bold">
                {(e.surveyEventCount || 0).toLocaleString()} completions
              </p>
            </div>
            <div className="bg-black/25 rounded-xl p-2">
              <p className="text-[8px] text-emerald-400/80 font-black uppercase">You · 70%</p>
              <p className="text-emerald-300 text-[11px] font-black">
                {e.surveyOwnerUsdLabel || formatUsd(e.surveyOwnerUsd || 0)}
              </p>
              <p className="text-[8px] text-gray-500 font-bold">
                {(e.surveyOwnerCoins || 0).toLocaleString()} 🪙 ledger
              </p>
            </div>
            <div className="bg-black/25 rounded-xl p-2">
              <p className="text-[8px] text-amber-300/80 font-black uppercase">Users · 30%</p>
              <p className="text-amber-300 text-[11px] font-black">
                {(e.surveyUserCoins || 0).toLocaleString()} 🪙
              </p>
              <p className="text-[8px] text-gray-500 font-bold">
                {e.surveyUserUsdLabel || formatUsd(e.surveyUserUsd || 0)} · shown as full reward
              </p>
            </div>
          </div>
          <p className="text-[8px] text-fuchsia-200/70 font-bold leading-relaxed">
            Postback credits users only their 30% as a normal wallet reward (no % label in app). Your
            70% lands on Hub wallet + this ledger. Real $ settles in TheoremReach publisher dashboard.
          </p>
        </div>
      </div>
    </div>
  );
}
