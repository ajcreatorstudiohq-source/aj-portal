'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ExternalLink, Gift, Loader2, Play, X } from 'lucide-react';
import {
  ADSTERRA_REWARD_COINS,
  ADSTERRA_REWARDED_LINK,
  ADSTERRA_VERIFY_SECONDS,
  OFFERWALL_VIDEO_MAX_DAILY,
  REWARDED_VIDEO_COOLDOWN_MS,
} from '../../lib/ads-config';
import { guardClick, startIntrusiveAdGuard } from '../../lib/ad-guards';

type Props = {
  user: { uid: string; getIdToken: () => Promise<string> } | null;
  onAlert: (msg: string, icon?: string) => void;
  onRefreshUser?: () => void;
};

type SessionTiming = {
  enteredAdAt: number | null;
  leftAdAt: number | null;
  totalAwayMs: number;
};

/** Ignore blur/focus flicker right after window.open (not a real ad visit). */
const MIN_AWAY_MS_TO_JUDGE = 1200;

/**
 * Stylish glass popup — early exit / status messages (English).
 */
function AdWatchPopup({
  title,
  message,
  icon,
  onClose,
  variant = 'warn',
}: {
  title: string;
  message: string;
  icon: string;
  onClose: () => void;
  variant?: 'warn' | 'ok';
}) {
  const border =
    variant === 'ok' ? 'rgba(34,211,238,0.55)' : 'rgba(251,191,36,0.55)';
  const glow =
    variant === 'ok'
      ? '0 0 50px rgba(34,211,238,0.25)'
      : '0 0 50px rgba(251,191,36,0.28)';

  return (
    <div
      className="fixed inset-0 z-[99999] flex items-center justify-center px-4"
      style={{
        background: 'rgba(0,0,0,0.68)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
      }}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="w-full max-w-sm rounded-3xl overflow-hidden pointer-events-auto"
        style={{
          background:
            'linear-gradient(160deg, rgba(18,16,28,0.94) 0%, rgba(8,8,14,0.96) 100%)',
          border: `1px solid ${border}`,
          boxShadow: glow,
          backdropFilter: 'blur(16px)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="h-[2px] w-full"
          style={{
            background:
              variant === 'ok'
                ? 'linear-gradient(90deg,#22d3ee,#818cf8,#a78bfa)'
                : 'linear-gradient(90deg,#fbbf24,#f59e0b,#ef4444)',
          }}
        />
        <div className="p-6 flex flex-col items-center gap-3 text-center relative">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center"
            aria-label="Close"
          >
            <X size={14} className="text-zinc-400" />
          </button>
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center border"
            style={{
              borderColor: border,
              background:
                variant === 'ok' ? 'rgba(34,211,238,0.12)' : 'rgba(251,191,36,0.12)',
              boxShadow: glow,
            }}
          >
            <span className="text-4xl leading-none">{icon}</span>
          </div>
          <p className="text-white font-black text-base tracking-wide">{title}</p>
          <p className="text-zinc-300 text-[13px] leading-relaxed font-medium whitespace-pre-wrap">
            {message}
          </p>
          <button
            type="button"
            onClick={onClose}
            className="mt-2 px-8 py-2.5 rounded-full text-[11px] font-black uppercase tracking-[0.18em] text-black active:scale-95"
            style={{
              background:
                variant === 'ok'
                  ? 'linear-gradient(135deg,#22d3ee,#818cf8)'
                  : 'linear-gradient(135deg,#fbbf24,#f59e0b)',
            }}
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Watch Ads — portal tracks when user enters/leaves the Adsterra tab.
 * - Leave early (< 30s) → stylish English popup, no claim
 * - Stay 30s+ then return → Claim AJ Coins unlocks
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
  const [popup, setPopup] = useState<{
    title: string;
    message: string;
    icon: string;
    variant: 'warn' | 'ok';
  } | null>(null);
  const [timingLabel, setTimingLabel] = useState('');

  const verifyingRef = useRef(false);
  const claimReadyRef = useRef(false);
  const elapsedAwayMsRef = useRef(0);
  const awayStartedAtRef = useRef<number | null>(null);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const sessionIdRef = useRef<string | null>(null);
  const timingRef = useRef<SessionTiming>({
    enteredAdAt: null,
    leftAdAt: null,
    totalAwayMs: 0,
  });

  const clearTick = useCallback(() => {
    if (tickRef.current) {
      clearInterval(tickRef.current);
      tickRef.current = null;
    }
  }, []);

  const showWarnPopup = useCallback((title: string, message: string) => {
    setPopup({ title, message, icon: '⏱️', variant: 'warn' });
  }, []);

  const showOkPopup = useCallback((title: string, message: string) => {
    setPopup({ title, message, icon: '✅', variant: 'ok' });
  }, []);

  const resetVerification = useCallback(
    (opts?: { popupTitle?: string; popupMessage?: string; alertAlso?: boolean }) => {
      clearTick();
      verifyingRef.current = false;
      claimReadyRef.current = false;
      elapsedAwayMsRef.current = 0;
      awayStartedAtRef.current = null;
      timingRef.current = { enteredAdAt: null, leftAdAt: null, totalAwayMs: 0 };
      setVerifying(false);
      setClaimReady(false);
      setSecondsLeft(0);
      setSessionId(null);
      sessionIdRef.current = null;
      setTimingLabel('');
      if (opts?.popupTitle && opts?.popupMessage) {
        showWarnPopup(opts.popupTitle, opts.popupMessage);
      }
      if (opts?.alertAlso && opts.popupMessage) {
        onAlert(opts.popupMessage, '⏱️');
      }
    },
    [clearTick, onAlert, showWarnPopup]
  );

  const flushAwayTime = useCallback(() => {
    if (awayStartedAtRef.current != null) {
      const chunk = Date.now() - awayStartedAtRef.current;
      elapsedAwayMsRef.current += chunk;
      timingRef.current.totalAwayMs = elapsedAwayMsRef.current;
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
    setTimingLabel(
      `In ad: ${Math.floor(elapsed / 1000)}s · Need: ${ADSTERRA_VERIFY_SECONDS}s`
    );
    return { elapsed, left };
  }, []);

  useEffect(() => () => clearTick(), [clearTick]);

  /**
   * Track enter/exit of ad tab via Page Visibility + window blur/focus.
   * Timer only advances while the portal is in the background (user on Adsterra).
   * Brief blur/focus after opening the ad is ignored so we don't false-fail.
   */
  useEffect(() => {
    const onLeavePortal = () => {
      setPortalHidden(true);
      if (!verifyingRef.current) return;
      if (awayStartedAtRef.current == null) {
        awayStartedAtRef.current = Date.now();
        if (!timingRef.current.enteredAdAt) {
          timingRef.current.enteredAdAt = Date.now();
        }
      }
    };

    const onReturnToPortal = () => {
      setPortalHidden(false);
      if (!verifyingRef.current) return;

      // Never left for real yet (still waiting for user to switch to Adsterra)
      const hadStartedAway =
        awayStartedAtRef.current != null || elapsedAwayMsRef.current > 0;
      if (!hadStartedAway) return;

      flushAwayTime();
      const { elapsed } = updateSecondsUi();

      // Accidental focus flicker right after window.open — keep waiting
      if (elapsed < MIN_AWAY_MS_TO_JUDGE) {
        setTimingLabel('Switch to the Adsterra tab and stay for 30s…');
        return;
      }

      timingRef.current.leftAdAt = Date.now();
      const secondsDone = Math.floor(elapsed / 1000);

      if (elapsed < ADSTERRA_VERIFY_SECONDS * 1000) {
        resetVerification({
          popupTitle: '30 Seconds Not Completed',
          popupMessage: `You did not complete ${ADSTERRA_VERIFY_SECONDS} seconds on the ad.\n\nYou stayed about ${secondsDone}s. Stay on the Adsterra page for the full ${ADSTERRA_VERIFY_SECONDS} seconds, then return here to unlock your coin claim.\n\nNo AJ Coins were credited.`,
        });
        return;
      }

      // Full 30s in ad → unlock claim
      clearTick();
      verifyingRef.current = false;
      claimReadyRef.current = true;
      setVerifying(false);
      setClaimReady(true);
      setSecondsLeft(0);
      setTimingLabel(`Completed ${secondsDone}s in ad · Claim ready`);
      showOkPopup(
        'Ad Verified',
        `You completed ${ADSTERRA_VERIFY_SECONDS} seconds on the ad.\n\nTap Claim to receive +${ADSTERRA_REWARD_COINS} AJ Coins 🪙.`
      );
    };

    const onVisibility = () => {
      if (document.hidden) onLeavePortal();
      else onReturnToPortal();
    };

    const onBlur = () => onLeavePortal();
    const onFocus = () => {
      if (!document.hidden) onReturnToPortal();
    };

    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('blur', onBlur);
    window.addEventListener('focus', onFocus);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('blur', onBlur);
      window.removeEventListener('focus', onFocus);
    };
  }, [flushAwayTime, updateSecondsUi, resetVerification, clearTick, showOkPopup]);

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
        } else {
          onAlert(data.message || 'Could not start ad session. Try again.', '⚠️');
          return;
        }
      } catch {
        onAlert('Could not start ad session. Check your connection and try again.', '⚠️');
        return;
      }

      if (!sid) {
        onAlert('Could not start ad session. Try again.', '⚠️');
        return;
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
      timingRef.current = {
        enteredAdAt: document.hidden ? Date.now() : null,
        leftAdAt: null,
        totalAwayMs: 0,
      };
      awayStartedAtRef.current = document.hidden ? Date.now() : null;
      setClaimReady(false);
      setVerifying(true);
      setSecondsLeft(ADSTERRA_VERIFY_SECONDS);
      setLastWatchAt(Date.now());
      setTimingLabel(`Waiting for you to open the ad…`);
      setPopup(null);
      clearTick();

      tickRef.current = setInterval(() => {
        if (!verifyingRef.current) return;
        updateSecondsUi();
      }, 250);
    },
    [user, lastWatchAt, onAlert, clearTick, updateSecondsUi]
  );

  const claimCoins = useCallback(
    async (e?: { preventDefault?: () => void; stopPropagation?: () => void }) => {
      guardClick(e);
      if (!user) return onAlert('Please sign in first', '🔒');
      if (verifyingRef.current) {
        showWarnPopup(
          'Still Verifying',
          `Stay on the Adsterra page for the full ${ADSTERRA_VERIFY_SECONDS} seconds, then return here to claim.`
        );
        return;
      }
      if (!claimReadyRef.current && !claimReady) {
        showWarnPopup(
          'Claim Locked',
          `You must complete ${ADSTERRA_VERIFY_SECONDS} seconds on the ad first. Open Watch Ads, stay on Adsterra for ${ADSTERRA_VERIFY_SECONDS}s, then come back.`
        );
        return;
      }
      const sid = sessionIdRef.current || sessionId;
      if (!sid) {
        showWarnPopup(
          'Session Expired',
          'Start Watch Ads again so the portal can track your 30s ad time.'
        );
        setClaimReady(false);
        claimReadyRef.current = false;
        return;
      }
      if (busy) return;

      setBusy(true);
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
            sessionId: sid,
            meta: {
              provider: 'adsterra',
              link: ADSTERRA_REWARDED_LINK,
              verifySeconds: ADSTERRA_VERIFY_SECONDS,
              enteredAdAt: timingRef.current.enteredAdAt,
              leftAdAt: timingRef.current.leftAdAt,
              totalAwayMs: timingRef.current.totalAwayMs,
            },
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok && data.ok) {
          if (typeof data.remainingToday === 'number') setRemaining(data.remainingToday);
          claimReadyRef.current = false;
          setClaimReady(false);
          setSessionId(null);
          sessionIdRef.current = null;
          showOkPopup(
            'Coins Claimed',
            data.message ||
              `+${data.creditedCoins || ADSTERRA_REWARD_COINS} AJ Coins 🪙 added to your wallet.`
          );
          onRefreshUser?.();
          return;
        }
        if (data.error === 'daily_limit') {
          onAlert(`Daily ad claim limit (${OFFERWALL_VIDEO_MAX_DAILY}) reached.`, '⚠️');
          setClaimReady(false);
          claimReadyRef.current = false;
          return;
        }
        if (
          data.error === 'verify_too_fast' ||
          data.error === 'session_too_soon' ||
          data.error === 'away_too_short'
        ) {
          claimReadyRef.current = false;
          setClaimReady(false);
          showWarnPopup(
            '30 Seconds Not Completed',
            data.message ||
              `You did not complete ${ADSTERRA_VERIFY_SECONDS} seconds on the ad. No AJ Coins were credited.`
          );
          return;
        }
        onAlert(data.message || data.error || 'Claim failed. Try Watch Ads again.', '⚠️');
      } catch (err: unknown) {
        onAlert(err instanceof Error ? err.message : 'Claim failed', '⚠️');
      } finally {
        setBusy(false);
      }
    },
    [user, claimReady, busy, onAlert, onRefreshUser, sessionId, showWarnPopup, showOkPopup]
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
            Open Adsterra and stay on the ad for {ADSTERRA_VERIFY_SECONDS}s. Return only after that
            to unlock{' '}
            <span className="text-sky-300 font-bold">+{ADSTERRA_REWARD_COINS} AJ Coins 🪙</span>.
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
              ? `You are on the ad… ${secondsLeft}s left`
              : `Switch to the Adsterra tab now. Leaving early cancels your reward.`}
          </p>
          {timingLabel ? (
            <p className="text-[9px] text-sky-200/70 font-bold text-center">{timingLabel}</p>
          ) : null}
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

      {popup ? (
        <AdWatchPopup
          title={popup.title}
          message={popup.message}
          icon={popup.icon}
          variant={popup.variant}
          onClose={() => setPopup(null)}
        />
      ) : null}
    </div>
  );
}
