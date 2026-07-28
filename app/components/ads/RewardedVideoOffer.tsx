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

type PersistedWatch = {
  sessionId: string;
  uid: string;
  preparedAt: number;
  /** First time portal went to background after Watch Ads */
  enteredAdAt: number | null;
  /** Accumulated ms spent away from portal */
  totalAwayMs: number;
  /** Timestamp when current away chunk started (portal hidden) */
  awayStartedAt: number | null;
  claimReady: boolean;
};

const STORAGE_KEY = 'aj_watch_ad_session_v2';
const NEED_MS = ADSTERRA_VERIFY_SECONDS * 1000;
/** Ignore tiny visibility blips (< 400ms) so we don't false-fail */
const MIN_AWAY_MS_TO_JUDGE = 400;

function readPersisted(uid: string): PersistedWatch | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as PersistedWatch;
    if (!data?.sessionId || data.uid !== uid) return null;
    // Sessions older than 10 minutes are dead
    if (Date.now() - Number(data.preparedAt || 0) > 10 * 60 * 1000) {
      sessionStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return data;
  } catch {
    return null;
  }
}

function writePersisted(data: PersistedWatch | null) {
  try {
    if (!data) sessionStorage.removeItem(STORAGE_KEY);
    else sessionStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    /* private mode */
  }
}

function currentAwayMs(p: {
  totalAwayMs: number;
  awayStartedAt: number | null;
}): number {
  let ms = p.totalAwayMs;
  if (p.awayStartedAt != null) ms += Date.now() - p.awayStartedAt;
  return ms;
}

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
 * Watch Ads — reliable 30s tracking via Page Visibility + sessionStorage.
 * - Counts time only while portal tab is hidden (user on Adsterra)
 * - Unlocks Claim as soon as 30s away is reached (even before return)
 * - Early return (< 30s) → English popup, no claim
 * - No window blur/focus (those false-cancel on mobile/desktop)
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
  const [timingLabel, setTimingLabel] = useState('');
  const [popup, setPopup] = useState<{
    title: string;
    message: string;
    icon: string;
    variant: 'warn' | 'ok';
  } | null>(null);

  const verifyingRef = useRef(false);
  const claimReadyRef = useRef(false);
  const sessionIdRef = useRef<string | null>(null);
  const totalAwayMsRef = useRef(0);
  const awayStartedAtRef = useRef<number | null>(null);
  const enteredAdAtRef = useRef<number | null>(null);
  const leftAdAtRef = useRef<number | null>(null);
  const preparedAtRef = useRef(0);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const uidRef = useRef<string | null>(null);
  const verifiedPopupShownRef = useRef(false);

  uidRef.current = user?.uid ?? null;

  const clearTick = useCallback(() => {
    if (tickRef.current) {
      clearInterval(tickRef.current);
      tickRef.current = null;
    }
  }, []);

  const persist = useCallback(() => {
    const uid = uidRef.current;
    const sid = sessionIdRef.current;
    if (!uid || !sid || (!verifyingRef.current && !claimReadyRef.current)) {
      return;
    }
    writePersisted({
      sessionId: sid,
      uid,
      preparedAt: preparedAtRef.current || Date.now(),
      enteredAdAt: enteredAdAtRef.current,
      totalAwayMs: totalAwayMsRef.current,
      awayStartedAt: awayStartedAtRef.current,
      claimReady: claimReadyRef.current,
    });
  }, []);

  const showWarnPopup = useCallback((title: string, message: string) => {
    setPopup({ title, message, icon: '⏱️', variant: 'warn' });
  }, []);

  const showOkPopup = useCallback((title: string, message: string) => {
    setPopup({ title, message, icon: '✅', variant: 'ok' });
  }, []);

  const resetVerification = useCallback(
    (opts?: { popupTitle?: string; popupMessage?: string }) => {
      clearTick();
      verifyingRef.current = false;
      claimReadyRef.current = false;
      totalAwayMsRef.current = 0;
      awayStartedAtRef.current = null;
      enteredAdAtRef.current = null;
      leftAdAtRef.current = null;
      preparedAtRef.current = 0;
      sessionIdRef.current = null;
      writePersisted(null);
      verifiedPopupShownRef.current = false;
      setVerifying(false);
      setClaimReady(false);
      setSecondsLeft(0);
      setSessionId(null);
      setTimingLabel('');
      setPortalHidden(false);
      if (opts?.popupTitle && opts?.popupMessage) {
        showWarnPopup(opts.popupTitle, opts.popupMessage);
      }
    },
    [clearTick, showWarnPopup]
  );

  const unlockClaim = useCallback(
    (elapsedMs: number, opts?: { silent?: boolean }) => {
      clearTick();
      verifyingRef.current = false;
      claimReadyRef.current = true;
      awayStartedAtRef.current = null;
      leftAdAtRef.current = Date.now();
      totalAwayMsRef.current = Math.max(totalAwayMsRef.current, elapsedMs);
      setVerifying(false);
      setClaimReady(true);
      setSecondsLeft(0);
      const sec = Math.floor(elapsedMs / 1000);
      setTimingLabel(`Completed ${sec}s in ad · Claim ready`);
      persist();
      if (!opts?.silent && !verifiedPopupShownRef.current) {
        verifiedPopupShownRef.current = true;
        showOkPopup(
          'Ad Verified',
          `You completed ${ADSTERRA_VERIFY_SECONDS} seconds on the ad.\n\nTap Claim to receive +${ADSTERRA_REWARD_COINS} AJ Coins 🪙.`
        );
      }
    },
    [clearTick, persist, showOkPopup]
  );

  const syncUiFromAway = useCallback(() => {
    const elapsed = currentAwayMs({
      totalAwayMs: totalAwayMsRef.current,
      awayStartedAt: awayStartedAtRef.current,
    });
    const left = Math.max(0, ADSTERRA_VERIFY_SECONDS - Math.floor(elapsed / 1000));
    setSecondsLeft(left);
    setTimingLabel(
      `In ad: ${Math.floor(elapsed / 1000)}s · Need: ${ADSTERRA_VERIFY_SECONDS}s`
    );

    // Unlock as soon as 30s is reached while still on the ad tab
    if (verifyingRef.current && !claimReadyRef.current && elapsed >= NEED_MS) {
      unlockClaim(elapsed, { silent: true });
    }
    return elapsed;
  }, [unlockClaim]);

  const flushAwayChunk = useCallback(() => {
    if (awayStartedAtRef.current != null) {
      totalAwayMsRef.current += Date.now() - awayStartedAtRef.current;
      awayStartedAtRef.current = null;
    }
  }, []);

  const onPortalHidden = useCallback(() => {
    setPortalHidden(true);
    if (!verifyingRef.current || claimReadyRef.current) return;
    if (awayStartedAtRef.current == null) {
      awayStartedAtRef.current = Date.now();
      if (!enteredAdAtRef.current) enteredAdAtRef.current = Date.now();
      persist();
    }
  }, [persist]);

  const onPortalVisible = useCallback(() => {
    setPortalHidden(false);
    if (claimReadyRef.current) {
      flushAwayChunk();
      persist();
      if (!verifiedPopupShownRef.current) {
        verifiedPopupShownRef.current = true;
        showOkPopup(
          'Ad Verified',
          `You completed ${ADSTERRA_VERIFY_SECONDS} seconds on the ad.\n\nTap Claim to receive +${ADSTERRA_REWARD_COINS} AJ Coins 🪙.`
        );
      }
      return;
    }
    if (!verifyingRef.current) return;

    const hadAway =
      awayStartedAtRef.current != null || totalAwayMsRef.current > 0;
    if (!hadAway) return;

    flushAwayChunk();
    const elapsed = totalAwayMsRef.current;
    persist();

    // Tiny blip — keep waiting, do not cancel
    if (elapsed < MIN_AWAY_MS_TO_JUDGE) {
      setTimingLabel('Switch to the Adsterra tab and stay for 30s…');
      return;
    }

    leftAdAtRef.current = Date.now();

    if (elapsed >= NEED_MS) {
      unlockClaim(elapsed);
      return;
    }

    // Real early return — fail this attempt
    const secondsDone = Math.floor(elapsed / 1000);
    resetVerification({
      popupTitle: '30 Seconds Not Completed',
      popupMessage: `You did not complete ${ADSTERRA_VERIFY_SECONDS} seconds on the ad.\n\nYou stayed about ${secondsDone}s. Stay on the Adsterra page for the full ${ADSTERRA_VERIFY_SECONDS} seconds, then return here to unlock your coin claim.\n\nNo AJ Coins were credited.`,
    });
  }, [
    flushAwayChunk,
    persist,
    unlockClaim,
    resetVerification,
    showOkPopup,
  ]);

  // Restore session after remount / same-tab back
  useEffect(() => {
    if (!user?.uid) return;
    const saved = readPersisted(user.uid);
    if (!saved) return;

    sessionIdRef.current = saved.sessionId;
    setSessionId(saved.sessionId);
    preparedAtRef.current = saved.preparedAt;
    enteredAdAtRef.current = saved.enteredAdAt;
    totalAwayMsRef.current = saved.totalAwayMs || 0;
    awayStartedAtRef.current = saved.awayStartedAt;
    leftAdAtRef.current = null;

    // If tab was hidden when we persisted, continue the away chunk from then
    if (typeof document !== 'undefined' && document.hidden) {
      if (awayStartedAtRef.current == null) {
        awayStartedAtRef.current = Date.now();
      }
      setPortalHidden(true);
    } else if (awayStartedAtRef.current != null) {
      // Was away, now visible — fold chunk in
      totalAwayMsRef.current += Date.now() - awayStartedAtRef.current;
      awayStartedAtRef.current = null;
    }

    const elapsed = currentAwayMs({
      totalAwayMs: totalAwayMsRef.current,
      awayStartedAt: awayStartedAtRef.current,
    });

    if (saved.claimReady || elapsed >= NEED_MS) {
      claimReadyRef.current = true;
      verifyingRef.current = false;
      setClaimReady(true);
      setVerifying(false);
      setSecondsLeft(0);
      setTimingLabel(`Completed ${Math.floor(elapsed / 1000)}s in ad · Claim ready`);
      writePersisted({
        ...saved,
        totalAwayMs: totalAwayMsRef.current,
        awayStartedAt: null,
        claimReady: true,
      });
      return;
    }

    verifyingRef.current = true;
    claimReadyRef.current = false;
    setVerifying(true);
    setClaimReady(false);
    setSecondsLeft(
      Math.max(0, ADSTERRA_VERIFY_SECONDS - Math.floor(elapsed / 1000))
    );
    setTimingLabel(
      `In ad: ${Math.floor(elapsed / 1000)}s · Need: ${ADSTERRA_VERIFY_SECONDS}s`
    );
  }, [user?.uid]);

  // Visibility-only tracking (blur/focus caused false early fails)
  useEffect(() => {
    const onVisibility = () => {
      if (document.hidden) onPortalHidden();
      else onPortalVisible();
    };
    const onPageShow = () => {
      if (!document.hidden) onPortalVisible();
    };
    const onPageHide = () => {
      // Persist before mobile unloads / freezes the tab
      if (document.hidden || verifyingRef.current) {
        onPortalHidden();
        persist();
      }
    };

    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pageshow', onPageShow);
    window.addEventListener('pagehide', onPageHide);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pageshow', onPageShow);
      window.removeEventListener('pagehide', onPageHide);
    };
  }, [onPortalHidden, onPortalVisible, persist]);

  useEffect(() => () => clearTick(), [clearTick]);

  // Live progress while verifying
  useEffect(() => {
    if (!verifying || claimReady) {
      clearTick();
      return;
    }
    clearTick();
    tickRef.current = setInterval(() => {
      if (!verifyingRef.current) return;
      syncUiFromAway();
      persist();
    }, 250);
    return () => clearTick();
  }, [verifying, claimReady, clearTick, syncUiFromAway, persist]);

  const openAdsterra = useCallback(
    async (e?: { preventDefault?: () => void; stopPropagation?: () => void }) => {
      guardClick(e);
      startIntrusiveAdGuard();
      if (!user) return onAlert('Please sign in to earn AJ Coins 🪙', '🔒');
      if (verifyingRef.current) return;
      if (claimReadyRef.current) {
        return onAlert('Claim your coins first, then start another ad.', '🎁');
      }

      const now = Date.now();
      if (now - lastWatchAt < REWARDED_VIDEO_COOLDOWN_MS) {
        const wait = Math.ceil(
          (REWARDED_VIDEO_COOLDOWN_MS - (now - lastWatchAt)) / 1000
        );
        return onAlert(`Please wait ${wait}s before another ad`, '⏱️');
      }

      let sid: string | null = null;
      let preparedAt = Date.now();
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
          preparedAt = Number(data.createdAtMs) || Date.now();
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

      sessionIdRef.current = sid;
      preparedAtRef.current = preparedAt;
      claimReadyRef.current = false;
      verifyingRef.current = true;
      totalAwayMsRef.current = 0;
      enteredAdAtRef.current = null;
      leftAdAtRef.current = null;
      awayStartedAtRef.current = null;
      setSessionId(sid);
      setClaimReady(false);
      setVerifying(true);
      setSecondsLeft(ADSTERRA_VERIFY_SECONDS);
      setLastWatchAt(Date.now());
      setTimingLabel('Opening Adsterra… switch to that tab and stay 30s');
      setPopup(null);
      verifiedPopupShownRef.current = false;

      writePersisted({
        sessionId: sid,
        uid: user.uid,
        preparedAt,
        enteredAdAt: null,
        totalAwayMs: 0,
        awayStartedAt: null,
        claimReady: false,
      });

      let opened = false;
      try {
        const win = window.open(ADSTERRA_REWARDED_LINK, '_blank');
        if (win) {
          opened = true;
          try {
            win.opener = null;
          } catch {
            /* ignore */
          }
        }
      } catch {
        opened = false;
      }

      // If popup blocked: same-tab open — session is persisted for back-navigation
      if (!opened) {
        onAlert(
          'Popup blocked. Opening ad in this tab — stay 30s, then press Back to claim.',
          'ℹ️'
        );
        window.location.assign(ADSTERRA_REWARDED_LINK);
        return;
      }

      // If browser already hid this tab, start counting immediately
      if (typeof document !== 'undefined' && document.hidden) {
        awayStartedAtRef.current = Date.now();
        enteredAdAtRef.current = Date.now();
        setPortalHidden(true);
        persist();
      }
    },
    [user, lastWatchAt, onAlert, persist]
  );

  const claimCoins = useCallback(
    async (e?: { preventDefault?: () => void; stopPropagation?: () => void }) => {
      guardClick(e);
      if (!user) return onAlert('Please sign in first', '🔒');
      if (verifyingRef.current && !claimReadyRef.current) {
        showWarnPopup(
          'Still Verifying',
          `Stay on the Adsterra page for the full ${ADSTERRA_VERIFY_SECONDS} seconds, then return here to claim.`
        );
        return;
      }
      if (!claimReadyRef.current && !claimReady) {
        showWarnPopup(
          'Claim Locked',
          `You must complete ${ADSTERRA_VERIFY_SECONDS} seconds on the ad first.`
        );
        return;
      }
      const sid = sessionIdRef.current || sessionId;
      if (!sid) {
        showWarnPopup(
          'Session Expired',
          'Start Watch Ads again so the portal can track your 30s ad time.'
        );
        resetVerification();
        return;
      }
      if (busy) return;

      const awayMs = Math.max(
        totalAwayMsRef.current,
        currentAwayMs({
          totalAwayMs: totalAwayMsRef.current,
          awayStartedAt: awayStartedAtRef.current,
        })
      );

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
              enteredAdAt: enteredAdAtRef.current,
              leftAdAt: leftAdAtRef.current,
              totalAwayMs: awayMs,
            },
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok && data.ok) {
          if (typeof data.remainingToday === 'number') setRemaining(data.remainingToday);
          writePersisted(null);
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
          resetVerification();
          return;
        }
        if (
          data.error === 'verify_too_fast' ||
          data.error === 'session_too_soon' ||
          data.error === 'away_too_short'
        ) {
          showWarnPopup(
            '30 Seconds Not Completed',
            data.message ||
              `You did not complete ${ADSTERRA_VERIFY_SECONDS} seconds on the ad. No AJ Coins were credited.`
          );
          // Keep claim UI if server clock is wrong-side; user can retry after waiting
          return;
        }
        onAlert(data.message || data.error || 'Claim failed. Try again.', '⚠️');
      } catch (err: unknown) {
        onAlert(err instanceof Error ? err.message : 'Claim failed', '⚠️');
      } finally {
        setBusy(false);
      }
    },
    [
      user,
      claimReady,
      busy,
      onAlert,
      onRefreshUser,
      sessionId,
      showWarnPopup,
      showOkPopup,
      resetVerification,
    ]
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
            Open Adsterra and stay on that tab for {ADSTERRA_VERIFY_SECONDS}s. Come back after
            the timer finishes to claim{' '}
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
              : `Switch to the Adsterra tab now. Stay there ${ADSTERRA_VERIFY_SECONDS}s — leaving early cancels.`}
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
