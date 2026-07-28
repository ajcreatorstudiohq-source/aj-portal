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
 * Watch Ads — Adsterra Direct Link.
 * Reward ONLY after 30s spent away on the ad tab, then return to claim.
 * Coming back early cancels the reward.
 */
export default function RewardedVideoOffer({ user, onAlert, onRefreshUser }: Props) {
  const [busy, setBusy] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [claimReady, setClaimReady] = useState(false);
  const [lastWatchAt, setLastWatchAt] = useState(0);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [portalHidden, setPortalHidden] = useState(false);

  const verifyingRef = useRef(false);
  const claimReadyRef = useRef(false);
  const elapsedAwayMsRef = useRef(0);
  const awayStartedAtRef = useRef<number | null>(null);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const sessionIdRef = useRef<string | null>(null);

  const clearTick = useCallback(() => {
    if (tickRef.current) {
      clearInterval(tickRef.current);
      tickRef.current = null;
    }
  }, []);

  const resetVerification = useCallback(
    (reason?: string) => {
      clearTick();
      verifyingRef.current = false;
      claimReadyRef.current = false;
      elapsedAwayMsRef.current = 0;
      awayStartedAtRef.current = null;
      setVerifying(false);
      setClaimReady(false);
      setSecondsLeft(0);
      setSessionId(null);
      sessionIdRef.current = null;
      if (reason) onAlert(reason, '⏱️');
    },
    [clearTick, onAlert]
  );

  const flushAwayTime = useCallback(() => {
    if (awayStartedAtRef.current != null) {
      elapsedAwayMsRef.current += Date.now() - awayStartedAtRef.current;
      awayStartedAtRef.current = null;
    }
  }, []);

  const updateSecondsUi = useCallback(() => {
    let elapsed = elapsedAwayMsRef.current;
    if (awayStartedAtRef.current != null) {
      elapsed += Date.now() - awayStartedAtRef.current;
    }
    const left = Math.max(
      0,
      ADSTERRA_VERIFY_SECONDS - Math.floor(elapsed / 1000)
    );
    setSecondsLeft(left);
    return { elapsed, left };
  }, []);

  useEffect(() => () => clearTick(), [clearTick]);

  // Only count time while the portal tab is hidden (user is on the ad).
  useEffect(() => {
    const onVisibility = () => {
      setPortalHidden(!!document.hidden);
      if (!verifyingRef.current) return;

      if (document.hidden) {
        // User left portal → start counting ad time
        if (awayStartedAtRef.current == null) {
          awayStartedAtRef.current = Date.now();
        }
        return;
      }

      // User came back to portal
      flushAwayTime();
      const { elapsed, left } = updateSecondsUi();

      if (elapsed < ADSTERRA_VERIFY_SECONDS * 1000) {
        // Early return — no reward
        resetVerification(
          `Ad incomplete — stay on the ad for ${ADSTERRA_VERIFY_SECONDS}s. You came back too early (${Math.floor(elapsed / 1000)}s). No AJ Coins 🪙.`
        );
        return;
      }

      // Full 30s spent away — unlock claim after return
      clearTick();
      verifyingRef.current = false;
      claimReadyRef.current = true;
      setVerifying(false);
      setClaimReady(true);
      setSecondsLeft(0);
      onAlert(
        `Ad verified ✅ Claim your +${ADSTERRA_REWARD_COINS} AJ Coins 🪙 now.`,
        '💰'
      );
    };

    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, [flushAwayTime, updateSecondsUi, resetVerification, clearTick, onAlert]);

  const openAdsterra = useCallback(
    async (e?: { preventDefault?: () => void; stopPropagation?: () => void }) => {
      guardClick(e);
      startIntrusiveAdGuard();
      if (!user) return onAlert('Please sign in to earn AJ Coins 🪙', '🔒');
      if (verifyingRef.current) return;

      const now = Date.now();
      if (now - lastWatchAt < REWARDED_VIDEO_COOLDOWN_MS) {
        const wait = Math.ceil((REWARDED_VIDEO_COOLDOWN_MS - (now - lastWatchAt)) / 1000);
        return onAlert(`Please wait ${wait}s before another ad`, '⏱️');
      }

      // Server prepare session (enforces min 30s wall-clock on claim)
      let sid: string | null = null;
      try {
        const token = await user.getIdToken();
        const res = await fetch('/api/ads/rewarded', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            action: 'prepare',
            placement: 'offerwall_rewarded_video',
            meta: { verifySeconds: ADSTERRA_VERIFY_SECONDS, provider: 'adsterra' },
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok && data.ok && data.sessionId) {
          sid = String(data.sessionId);
          if (typeof data.remainingToday === 'number') setRemaining(data.remainingToday);
        } else if (data.error === 'daily_limit') {
          onAlert(`Daily ad claim limit (${OFFERWALL_VIDEO_MAX_DAILY}) reached.`, '⚠️');
          return;
        }
      } catch {
        /* claim will still try; prepare preferred */
      }

      try {
        const win = window.open(ADSTERRA_REWARDED_LINK, '_blank', 'noopener,noreferrer');
        if (!win) {
          window.location.assign(ADSTERRA_REWARDED_LINK);
          return;
        }
      } catch {
        onAlert('Could not open ad link. Allow popups and try again.', '⚠️');
        return;
      }

      sessionIdRef.current = sid;
      setSessionId(sid);
      claimReadyRef.current = false;
      verifyingRef.current = true;
      elapsedAwayMsRef.current = 0;
      awayStartedAtRef.current = document.hidden ? Date.now() : null;
      setClaimReady(false);
      setVerifying(true);
      setSecondsLeft(ADSTERRA_VERIFY_SECONDS);
      setLastWatchAt(Date.now());
      clearTick();

      tickRef.current = setInterval(() => {
        if (!verifyingRef.current) return;
        const { elapsed, left } = updateSecondsUi();
        if (elapsed >= ADSTERRA_VERIFY_SECONDS * 1000 && document.hidden) {
          // Completed while still on ad — wait until they return (visibility handler unlocks)
          setSecondsLeft(0);
        } else {
          setSecondsLeft(left);
        }
      }, 250);

      onAlert(
        `Stay on the Adsterra page for ${ADSTERRA_VERIFY_SECONDS}s. Coming back early = no coins.`,
        '📺'
      );
    },
    [user, lastWatchAt, onAlert, clearTick, updateSecondsUi]
  );

  const claimCoins = useCallback(
    async (e?: { preventDefault?: () => void; stopPropagation?: () => void }) => {
      guardClick(e);
      if (!user) return onAlert('Please sign in first', '🔒');
      if (verifyingRef.current || secondsLeft > 0) {
        return onAlert(
          `Stay on the ad for ${secondsLeft || ADSTERRA_VERIFY_SECONDS}s more, then come back to claim.`,
          '⏱️'
        );
      }
      if (!claimReadyRef.current && !claimReady) {
        return onAlert(
          `Open the ad and stay ${ADSTERRA_VERIFY_SECONDS}s. Early return = no reward.`,
          '📺'
        );
      }
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
              sessionId: sessionIdRef.current || sessionId,
              meta: {
                provider: 'adsterra',
                link: ADSTERRA_REWARDED_LINK,
                verifySeconds: ADSTERRA_VERIFY_SECONDS,
                requireAwaySeconds: ADSTERRA_VERIFY_SECONDS,
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
            claimReadyRef.current = false;
            setClaimReady(false);
            setSessionId(null);
            sessionIdRef.current = null;
            onRefreshUser?.();
          } else if (data.error === 'daily_limit') {
            onAlert(`Daily ad claim limit (${OFFERWALL_VIDEO_MAX_DAILY}) reached.`, '⚠️');
            setClaimReady(false);
            claimReadyRef.current = false;
            return;
          } else if (data.error === 'verify_too_fast' || data.error === 'session_too_soon') {
            onAlert(
              data.message ||
                `Wait full ${ADSTERRA_VERIFY_SECONDS}s on the ad before claiming.`,
              '⏱️'
            );
            return;
          }
        } catch {
          /* fall through */
        }

        if (!credited) {
          // Client fallback only if session already verified locally
          if (!claimReadyRef.current && !claimReady) {
            onAlert('Verification incomplete — no coins.', '⚠️');
            return;
          }
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
          claimReadyRef.current = false;
          setClaimReady(false);
          onRefreshUser?.();
        }
      } catch (err: unknown) {
        onAlert(err instanceof Error ? err.message : 'Claim failed', '⚠️');
      } finally {
        setBusy(false);
      }
    },
    [user, claimReady, busy, onAlert, onRefreshUser, secondsLeft, sessionId]
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
            Open Adsterra and stay on the ad for {ADSTERRA_VERIFY_SECONDS}s, then return to claim{' '}
            <span className="text-sky-300 font-bold">+{ADSTERRA_REWARD_COINS} AJ Coins 🪙</span>.
            Early back = no reward.
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
          void openAdsterra(e);
        }}
        className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-400 to-blue-500 text-black text-xs font-black flex items-center justify-center gap-2 disabled:opacity-50 active:scale-[0.98]"
      >
        <ExternalLink size={14} /> Watch Ads (New Tab)
      </button>

      {verifying ? (
        <div className="rounded-xl border border-sky-400/30 bg-sky-500/10 px-3 py-3 space-y-2">
          <p className="text-[11px] text-sky-100 font-bold text-center leading-relaxed">
            {portalHidden
              ? `Stay on the ad… ${secondsLeft}s left`
              : `Switch to the Adsterra tab and stay ${secondsLeft || ADSTERRA_VERIFY_SECONDS}s. Coming back early cancels reward.`}
          </p>
          <div className="h-1.5 rounded-full bg-black/40 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-violet-500 transition-all duration-200 ease-linear"
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
          className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-500 to-violet-600 text-white text-xs font-black flex items-center justify-center gap-2 disabled:opacity-50 active:scale-[0.98]"
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
