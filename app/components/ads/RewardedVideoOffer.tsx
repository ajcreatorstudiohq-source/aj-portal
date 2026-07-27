'use client';

import { useCallback, useState } from 'react';
import { ExternalLink, Gift, Loader2, Play } from 'lucide-react';
import {
  ADSTERRA_REWARD_COINS,
  ADSTERRA_REWARDED_LINK,
  OFFERWALL_VIDEO_MAX_DAILY,
  REWARDED_VIDEO_COOLDOWN_MS,
} from '../../lib/ads-config';
import { guardClick, startIntrusiveAdGuard } from '../../lib/ad-guards';
import { doc, increment, runTransaction, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase';

type Props = {
  user: { uid: string; getIdToken: () => Promise<string> } | null;
  onAlert: (msg: string, icon?: string) => void;
  onRefreshUser?: () => void;
};

/**
 * Watch Ads — Adsterra direct link (new tab) + Claim 20 AJ Coins.
 * Monetag completely removed.
 */
export default function RewardedVideoOffer({ user, onAlert, onRefreshUser }: Props) {
  const [busy, setBusy] = useState(false);
  const [claimReady, setClaimReady] = useState(false);
  const [lastWatchAt, setLastWatchAt] = useState(0);
  const [remaining, setRemaining] = useState<number | null>(null);

  const openAdsterra = useCallback(
    (e?: { preventDefault?: () => void; stopPropagation?: () => void }) => {
      guardClick(e);
      startIntrusiveAdGuard();
      if (!user) return onAlert('Please sign in to earn AJ Coins 🪙', '🔒');

      const now = Date.now();
      if (now - lastWatchAt < REWARDED_VIDEO_COOLDOWN_MS) {
        const wait = Math.ceil((REWARDED_VIDEO_COOLDOWN_MS - (now - lastWatchAt)) / 1000);
        return onAlert(`Please wait ${wait}s before another ad`, '⏱️');
      }

      try {
        const win = window.open(ADSTERRA_REWARDED_LINK, '_blank', 'noopener,noreferrer');
        if (!win) {
          // Popup blocked — navigate as fallback in same tab is worse; try location assign in new context
          window.location.assign(ADSTERRA_REWARDED_LINK);
        }
      } catch {
        onAlert('Could not open ad link. Allow popups and try again.', '⚠️');
        return;
      }

      setClaimReady(true);
      setLastWatchAt(Date.now());
      onAlert('Ad opened in a new tab. Return here and tap Claim 20 Coins.', '📺');
    },
    [user, lastWatchAt, onAlert]
  );

  const claimCoins = useCallback(
    async (e?: { preventDefault?: () => void; stopPropagation?: () => void }) => {
      guardClick(e);
      if (!user) return onAlert('Please sign in first', '🔒');
      if (!claimReady) return onAlert('Open the ad first, then claim.', '📺');
      if (busy) return;

      setBusy(true);
      try {
        // Prefer authenticated API (rate limits + ledger). Falls back to client increment.
        let credited = false;
        try {
          const token = await user.getIdToken();
          const res = await fetch('/api/ads/rewarded', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              action: 'claim_adsterra',
              status: 'completed',
              networkShown: true,
              meta: { provider: 'adsterra', link: ADSTERRA_REWARDED_LINK },
            }),
          });
          const data = await res.json().catch(() => ({}));
          if (res.ok && data.ok) {
            credited = true;
            if (typeof data.remainingToday === 'number') setRemaining(data.remainingToday);
            onAlert(
              data.message || `+${data.creditedCoins || ADSTERRA_REWARD_COINS} AJ Coins 🪙`,
              data.duplicate ? 'ℹ️' : '💰'
            );
            setClaimReady(false);
            onRefreshUser?.();
          } else if (data.error === 'daily_limit') {
            onAlert(`Daily ad claim limit (${OFFERWALL_VIDEO_MAX_DAILY}) reached.`, '⚠️');
            setClaimReady(false);
            return;
          }
        } catch {
          /* fall through */
        }

        if (!credited) {
          // Client Firestore runTransaction — atomic increment(5)
          await runTransaction(db, async (tx) => {
            const uref = doc(db, 'users', user.uid);
            const snap = await tx.get(uref);
            if (!snap.exists()) throw new Error('user_not_found');
            tx.update(uref, {
              balance: increment(ADSTERRA_REWARD_COINS),
              lastAdsterraClaimAt: serverTimestamp(),
              lastRewardAt: serverTimestamp(),
              lastRewardSource: 'adsterra_watch',
            });
          });
          onAlert(`+${ADSTERRA_REWARD_COINS} AJ Coins 🪙 claimed!`, '💰');
          setClaimReady(false);
          onRefreshUser?.();
        }
      } catch (err: unknown) {
        onAlert(err instanceof Error ? err.message : 'Claim failed', '⚠️');
      } finally {
        setBusy(false);
      }
    },
    [user, claimReady, busy, onAlert, onRefreshUser]
  );

  return (
    <div className="rounded-2xl border border-cyan-500/30 bg-gradient-to-br from-cyan-950/40 to-blue-950/40 p-4 space-y-3">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-400/30 flex items-center justify-center shrink-0">
          <Play size={18} className="text-cyan-300" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-black text-white">Watch Rewarded Video</p>
          <p className="text-[11px] text-gray-300 leading-relaxed mt-0.5">
            Open the Adsterra offer in a new tab, then claim{' '}
            <span className="text-amber-300 font-bold">+{ADSTERRA_REWARD_COINS} AJ Coins 🪙</span>.
          </p>
          <p className="text-[9px] text-gray-500 mt-1">
            Adsterra · up to {OFFERWALL_VIDEO_MAX_DAILY}/day
            {remaining != null ? ` · ${remaining} left today` : ''}
          </p>
        </div>
      </div>

      <button
        type="button"
        disabled={!user || busy}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          openAdsterra(e);
        }}
        className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-400 to-blue-500 text-black text-xs font-black flex items-center justify-center gap-2 disabled:opacity-50 active:scale-[0.98]"
      >
        <ExternalLink size={14} /> Watch Ad (New Tab)
      </button>

      {claimReady ? (
        <button
          type="button"
          disabled={busy || !user}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            void claimCoins(e);
          }}
          className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 text-black text-xs font-black flex items-center justify-center gap-2 disabled:opacity-50 active:scale-[0.98]"
        >
          {busy ? (
            <>
              <Loader2 size={14} className="animate-spin" /> Claiming…
            </>
          ) : (
            <>
              <Gift size={14} /> Claim {ADSTERRA_REWARD_COINS} Coins 🪙
            </>
          )}
        </button>
      ) : null}
    </div>
  );
}
