'use client';

import { useCallback, useState } from 'react';
import { Calculator, ExternalLink, Gift, Loader2 } from 'lucide-react';
import { MATH_CHALLENGE_COINS } from '../lib/reward-sources';
import { buildAdsterraDirectLink } from '../lib/adsterra-link';
import { launchAdsterraUnit } from '../lib/ad-client';
import { guardClick, startIntrusiveAdGuard } from '../lib/ad-guards';
import type { OnRefreshUser } from '../lib/wallet-refresh';
import { claimRefreshPatch } from '../lib/wallet-refresh';
import { publicClaimErrorMessage } from '../lib/claim-errors';

type Props = {
  user: { uid: string; getIdToken: () => Promise<string> } | null;
  onAlert: (msg: string, icon?: string) => void;
  onRefreshUser?: OnRefreshUser;
};
export default function DailyMathChallenge({ user, onAlert, onRefreshUser }: Props) {
  const [busy, setBusy] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [prompt, setPrompt] = useState('');
  const [answer, setAnswer] = useState('');
  const [remaining, setRemaining] = useState<number | null>(null);
  const [claimReady, setClaimReady] = useState(false);

  const openAdsterra = () => {
    startIntrusiveAdGuard();
    void launchAdsterraUnit(
      {
        event: 'click',
        placement: 'offerwall_rewarded_video',
        format: 'direct_link',
        sessionId,
        meta: { surface: 'math_challenge', format: 'direct_link' },
      },
      user
    );
  };

  const authFetch = useCallback(
    async (body: Record<string, unknown>) => {
      if (!user) throw new Error('not_signed_in');
      const token = await user.getIdToken();
      const res = await fetch('/api/rewards/math-challenge', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const err = new Error(
          (data as { message?: string; error?: string }).message ||
            (data as { error?: string }).error ||
            `http_${res.status}`
        ) as Error & {
          data?: Record<string, unknown>;
        };
        err.data = data;
        throw err;
      }
      return data as {
        ok: boolean;
        sessionId?: string;
        prompt?: string;
        remainingToday?: number;
        creditedCoins?: number;
        balance?: number;
        message?: string;
        duplicate?: boolean;
        error?: string;
      };
    },
    [user]
  );

  const startChallenge = async (e?: { preventDefault?: () => void; stopPropagation?: () => void }) => {
    guardClick(e);
    if (!user) return onAlert('Please sign in first', '🔒');
    if (busy) return;
    setBusy(true);
    setAnswer('');
    setClaimReady(false);
    try {
      const data = await authFetch({ action: 'prepare' });
      setSessionId(data.sessionId || null);
      setPrompt(data.prompt || '');
      if (typeof data.remainingToday === 'number') setRemaining(data.remainingToday);
    } catch (e: unknown) {
      const err = e as Error & { data?: { error?: string; message?: string } };
      onAlert(
        err.data?.error === 'daily_limit'
          ? err.data.message || 'Daily Math Challenge limit reached (5/day).'
          : err.message || 'Could not start challenge',
        '⚠️'
      );
      setSessionId(null);
      setPrompt('');
    } finally {
      setBusy(false);
    }
  };

  /** Submit Answer → open Adsterra first; claim happens on Verify & Claim */
  const submitAnswer = async (e?: { preventDefault?: () => void; stopPropagation?: () => void }) => {
    guardClick(e);
    if (!user || !sessionId) return;
    if (busy) return;
    const n = Math.floor(Number(answer));
    if (!Number.isFinite(n)) return onAlert('Enter a number answer', '⚠️');
    openAdsterra();
    setClaimReady(true);
    onAlert('Ad opened in a new tab. Return here and tap Verify & Claim.', '📺');
  };

  const verifyAndClaim = async (e?: { preventDefault?: () => void; stopPropagation?: () => void }) => {
    guardClick(e);
    if (!user || !sessionId) return;
    if (!claimReady) return onAlert('Submit first to open the ad, then claim.', '📺');
    if (busy) return;
    const n = Math.floor(Number(answer));
    if (!Number.isFinite(n)) return onAlert('Enter a number answer', '⚠️');
    setBusy(true);
    try {
      const data = await authFetch({
        action: 'complete',
        sessionId,
        answer: n,
        adViewed: true,
        meta: {
          provider: 'adsterra',
          link: buildAdsterraDirectLink({ uid: user.uid, sessionId }),
        },
      });
      if (typeof data.remainingToday === 'number') setRemaining(data.remainingToday);
      const credited = Number(data.creditedCoins || 0);
      const creditForUi =
        !data.duplicate ? (credited > 0 ? credited : MATH_CHALLENGE_COINS) : 0;
      // Hub balance MUST update before the success popup (first claim).
      // Prefer absolute server balance only — never balance+credited together.
      await onRefreshUser?.(
        claimRefreshPatch({
          balance: typeof data.balance === 'number' ? data.balance : null,
          creditedCoins: creditForUi,
          duplicate: !!data.duplicate,
        })
      );
      onAlert(
        data.message || `+${creditForUi || MATH_CHALLENGE_COINS} AJ Coins 🪙`,
        data.duplicate ? 'ℹ️' : '🧮'
      );
      setSessionId(null);
      setPrompt('');
      setAnswer('');
      setClaimReady(false);
    } catch (e: unknown) {
      const err = e as Error & { data?: { error?: string; message?: string } };
      onAlert(
        publicClaimErrorMessage(
          {
            error: err.data?.error || err.message,
            message: err.data?.message,
          },
          'Math claim failed. Start a new challenge and try again.'
        ),
        '⚠️'
      );
      if (err.data?.error === 'wrong_answer' || err.data?.error === 'session_expired') {
        setSessionId(null);
        setPrompt('');
        setAnswer('');
        setClaimReady(false);
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-emerald-950/40 to-teal-950/30 p-4 space-y-3">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center shrink-0">
          <Calculator size={18} className="text-emerald-300" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-black text-white">Daily Math Challenge</p>
          <p className="text-[11px] text-gray-300 leading-relaxed mt-0.5">
            Solve, watch Adsterra, then claim{' '}
            <span className="text-amber-300 font-bold">+{MATH_CHALLENGE_COINS} AJ Coins 🪙</span>.
            Max 5 correct / day.
          </p>
          {remaining != null ? (
            <p className="text-[9px] text-gray-500 mt-1">{remaining} left today</p>
          ) : null}
        </div>
      </div>

      {prompt ? (
        <div className="space-y-2">
          <p className="text-center text-2xl font-black text-white tracking-wide py-2">
            {prompt} = ?
          </p>
          <input
            type="number"
            inputMode="numeric"
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            placeholder="Your answer"
            disabled={claimReady}
            className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white text-sm text-center font-bold focus:outline-none focus:border-emerald-400/50 disabled:opacity-60"
          />
          {!claimReady ? (
            <button
              type="button"
              disabled={busy || !user}
              onClick={(e) => void submitAnswer(e)}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-400 to-teal-500 text-black text-xs font-black flex items-center justify-center gap-2 disabled:opacity-50 active:scale-[0.98]"
            >
              <ExternalLink size={14} /> Submit Answer (Watch Ad)
            </button>
          ) : (
            <button
              type="button"
              disabled={busy || !user}
              onClick={(e) => void verifyAndClaim(e)}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-500 to-violet-600 text-white text-xs font-black flex items-center justify-center gap-2 disabled:opacity-50 active:scale-[0.98]"
            >
              {busy ? (
                <>
                  <Loader2 size={14} className="animate-spin" /> Claiming…
                </>
              ) : (
                <>
                  <Gift size={14} /> Verify & Claim {MATH_CHALLENGE_COINS} Coins 🪙
                </>
              )}
            </button>
          )}
        </div>
      ) : (
        <button
          type="button"
          disabled={busy || !user}
          onClick={(e) => void startChallenge(e)}
          className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-400 to-teal-500 text-black text-xs font-black flex items-center justify-center gap-2 disabled:opacity-50 active:scale-[0.98]"
        >
          {busy ? (
            <>
              <Loader2 size={14} className="animate-spin" /> Loading…
            </>
          ) : (
            <>
              <Calculator size={14} /> Start Challenge
            </>
          )}
        </button>
      )}
    </div>
  );
}
