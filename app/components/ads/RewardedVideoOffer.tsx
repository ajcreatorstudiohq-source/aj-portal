'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ExternalLink, Gift, Loader2, Play } from 'lucide-react';
import {
  ADSTERRA_REWARD_COINS,
  ADSTERRA_REWARDED_LINK,
  ADSTERRA_VERIFY_SECONDS,
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
 * Watch Ads — open Adsterra Direct Link, verify 30s on portal, then Claim 5 AJ Coins.
 */
export default function RewardedVideoOffer({ user, onAlert, onRefreshUser }: Props) {
  const [busy, setBusy] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [claimReady, setClaimReady] = useState(false);
  const [lastWatchAt, setLastWatchAt] = useState(0);
  const [remaining, setRemaining] = useState<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  useEffect(() => () => clearTimer(), [clearTimer]);

  const openAdsterra = useCallback(
    (e?: { preventDefault?: () => void; stopPropagation?: () => void }) => {
      guardClick(e);
      startIntrusiveAdGuard();
      if (!user) return onAlert('Please sign in to earn AJ Coins 🪙', '🔒');
      if (verifying) return;

      const now = Date.now();
      if (now - lastWatchAt < REWARDED_VIDEO_COOLDOWN_MS) {
        const wait = Math.ceil((REWARDED_VIDEO_COOLDOWN_MS - (now - lastWatchAt)) / 1000);
        return onAlert(`Please wait ${wait}s before another ad`, '⏱️');
      }

      try {
        const win = window.open(ADSTERRA_REWARDED_LINK, '_blank', 'noopener,noreferrer');
        if (!win) {
          window.location.assign(ADSTERRA_REWARDED_LINK);
        }
      } catch {
        onAlert('Could not open ad link. Allow popups and try again.', '⚠️');
        return;
      }

      setClaimReady(false);
      setVerifying(true);
      setSecondsLeft(ADSTERRA_VERIFY_SECONDS);
      setLastWatchAt(Date.now());
      clearTimer();

      timerRef.current = setInterval(() => {
        setSecondsLeft((s) => {
          if (s <= 1) {
            clearTimer();
            setVerifying(false);
            setClaimReady(true);
            return 0;
          }
          return s - 1;
        });
      }, 1000);

      onAlert(
        `Verifying Ad View... Stay on the ad page for ${ADSTERRA_VERIFY_SECONDS}s to earn coins.`,
        '📺'
      );
    },
    [user, lastWatchAt, onAlert, verifying, clearTimer]
  );

  const claimCoins = useCallback(
    async (e?: { preventDefault?: () => void; stopPropagation?: () => void }) => {
      guardClick(e);
      if (!user) return onAlert('Please sign in first', '🔒');
      if (verifying || secondsLeft > 0) {
        return onAlert(
          `Verifying Ad View... Stay on the ad page for ${secondsLeft || ADSTERRA_VERIFY_SECONDS}s to earn coins.`,
          '⏱️'
        );
      }
      if (!claimReady) return onAlert('Open the ad first and wait for verification.', '📺');
      if (busy) return;

      setBusy(true);
      try {
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
              meta: {
                provider: 'adsterra',
                link: ADSTERRA_REWARDED_LINK,
                verifySeconds: ADSTERRA_VERIFY_SECONDS,
              },
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
    [user, claimReady, busy, onAlert, onRefreshUser, verifying, secondsLeft]
  );

  return (
    <div className="rounded-2xl border border-cyan-500/30 bg-gradient-to-br from-cyan-950/40 to-blue-950/40 p-4 space-y-3">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-400/30 flex items-center justify-center shrink-0">
          <Play size={18} className="text-cyan-300" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-black text-white">Watch Ads</p>
          <p className="text-[11px] text-gray-300 leading-relaxed mt-0.5">
            Open Adsterra, wait {ADSTERRA_VERIFY_SECONDS}s for verification, then claim{' '}
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
        disabled={!user || busy || verifying}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          openAdsterra(e);
        }}
        className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-400 to-blue-500 text-black text-xs font-black flex items-center justify-center gap-2 disabled:opacity-50 active:scale-[0.98]"
      >
        <ExternalLink size={14} /> Watch Ads (New Tab)
      </button>

      {verifying ? (
        <div className="rounded-xl border border-amber-400/30 bg-amber-500/10 px-3 py-3 space-y-2">
          <p className="text-[11px] text-amber-100 font-bold text-center leading-relaxed">
            Verifying Ad View... Stay on the ad page for {secondsLeft}s to earn coins.
          </p>
          <div className="h-1.5 rounded-full bg-black/40 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-amber-400 to-orange-500 transition-all duration-1000 ease-linear"
              style={{
                width: `${Math.max(
                  0,
                  ((ADSTERRA_VERIFY_SECONDS - secondsLeft) / ADSTERRA_VERIFY_SECONDS) * 100
                )}%`,
              }}
            />
          </div>
        </div>
      ) : null}

      {claimReady && !verifying ? (
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
