'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  collection,
  getDocs,
  limit,
  orderBy,
  query,
  where,
} from 'firebase/firestore';
import { db } from '../firebase';
import { ledgerRowToEarnItem, type EarnHistoryItem } from '../lib/earn-display';
import { ClipboardList, Gift, Sparkles } from 'lucide-react';

type Props = {
  uid: string | null | undefined;
  /** Bump to reload after a claim / survey close */
  refreshKey?: number;
  maxItems?: number;
};

/**
 * User wallet earn history.
 * Shows credited AJ Coins as the full standard reward (no 70/30 labels).
 */
export default function UserEarningsHistory({
  uid,
  refreshKey = 0,
  maxItems = 40,
}: Props) {
  const [items, setItems] = useState<EarnHistoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!uid) {
      setItems([]);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const rows: EarnHistoryItem[] = [];
      const collect = async (colName: string) => {
        try {
          const q = query(
            collection(db, colName),
            where('uid', '==', uid),
            orderBy('createdAt', 'desc'),
            limit(maxItems)
          );
          const snap = await getDocs(q);
          snap.forEach((docSnap) => {
            const item = ledgerRowToEarnItem(
              docSnap.id,
              docSnap.data() as Record<string, unknown>
            );
            if (item) rows.push(item);
          });
        } catch (e) {
          // Fallback without orderBy if composite index missing
          try {
            const q2 = query(
              collection(db, colName),
              where('uid', '==', uid),
              limit(maxItems)
            );
            const snap = await getDocs(q2);
            snap.forEach((docSnap) => {
              const item = ledgerRowToEarnItem(
                docSnap.id,
                docSnap.data() as Record<string, unknown>
              );
              if (item) rows.push(item);
            });
          } catch (e2) {
            console.warn(`[UserEarningsHistory] ${colName}`, e2 || e);
          }
        }
      };

      await Promise.all([collect('offerwall_ledger'), collect('reward_ledger')]);
      rows.sort((a, b) => b.createdAtMs - a.createdAtMs);
      setItems(rows.slice(0, maxItems));
    } catch (e) {
      console.error('UserEarningsHistory', e);
      setError('Could not load earn history');
    } finally {
      setLoading(false);
    }
  }, [uid, maxItems]);

  useEffect(() => {
    void load();
  }, [load, refreshKey]);

  if (!uid) return null;

  return (
    <div
      className="rounded-2xl border border-fuchsia-500/25 overflow-hidden"
      style={{
        background:
          'linear-gradient(145deg, rgba(88,28,135,0.35), rgba(5,5,5,0.95) 45%, rgba(8,47,73,0.25))',
      }}
    >
      <div className="px-3.5 py-3 border-b border-white/5 flex items-center gap-2">
        <div className="w-8 h-8 rounded-xl bg-fuchsia-500/20 border border-fuchsia-400/35 flex items-center justify-center">
          <ClipboardList size={14} className="text-fuchsia-300" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-black text-white uppercase tracking-widest">
            Earn History
          </p>
          <p className="text-[9px] text-zinc-400 font-bold">
            Surveys · Watch Ads · Faucet · Games
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

      <div className="px-3 py-2 space-y-2 max-h-[320px] overflow-y-auto">
        {loading && items.length === 0 ? (
          <p className="text-[10px] text-zinc-500 font-bold py-4 text-center">Loading…</p>
        ) : error ? (
          <p className="text-[10px] text-rose-400 font-bold py-4 text-center">{error}</p>
        ) : items.length === 0 ? (
          <p className="text-[10px] text-zinc-500 font-bold py-4 text-center">
            No earnings yet — complete a survey or Watch Ads to earn AJ Coins 🪙
          </p>
        ) : (
          items.map((row) => (
            <div
              key={row.id}
              className="flex items-center gap-2.5 rounded-xl border border-white/8 bg-black/35 px-3 py-2.5"
            >
              <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                {row.title.toLowerCase().includes('survey') ? (
                  <ClipboardList size={13} className="text-fuchsia-300" />
                ) : row.title.toLowerCase().includes('watch') ? (
                  <Sparkles size={13} className="text-rose-300" />
                ) : (
                  <Gift size={13} className="text-amber-300" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-black text-white truncate">{row.title}</p>
                <p className="text-[8px] text-zinc-500 font-bold truncate">
                  {row.subtitle ? `${row.subtitle} · ` : ''}
                  {row.createdAtLabel}
                </p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-[12px] font-black text-amber-300 tabular-nums">
                  {row.coinsLabel}
                </p>
                <p className="text-[8px] text-emerald-400/80 font-bold">{row.usdLabel}</p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
