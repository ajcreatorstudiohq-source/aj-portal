'use client';

import { useCallback, useState } from 'react';
import { KeyRound, Loader2 } from 'lucide-react';
import { ALPHA_CAPTCHA_COINS } from '../lib/reward-sources';
import { guardClick } from '../lib/ad-guards';

type Props = {
  user: { uid: string; getIdToken: () => Promise<string> } | null;
  onAlert: (msg: string, icon?: string) => void;
  onRefreshUser?: () => void;
};

/**
 * Premium Alphanumeric Captcha — type 6-char code for +10 AJ Coins (max 5/day).
 */
export default function AlphaCaptchaChallenge({ user, onAlert, onRefreshUser }: Props) {
  const [busy, setBusy] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [typed, setTyped] = useState('');
  const [remaining, setRemaining] = useState<number | null>(null);

  const authFetch = useCallback(
    async (body: Record<string, unknown>) => {
      if (!user) throw new Error('not_signed_in');
      const token = await user.getIdToken();
      const res = await fetch('/api/rewards/alpha-captcha', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const err = new Error(data.error || `http_${res.status}`) as Error & {
          data?: Record<string, unknown>;
        };
        err.data = data;
        throw err;
      }
      return data as {
        sessionId?: string;
        code?: string;
        remainingToday?: number;
        creditedCoins?: number;
        message?: string;
        duplicate?: boolean;
      };
    },
    [user]
  );

  const start = async (e?: React.MouseEvent) => {
    guardClick(e);
    if (!user) return onAlert('Please sign in first', '🔒');
    if (busy) return;
    setBusy(true);
    setTyped('');
    try {
      const data = await authFetch({ action: 'prepare' });
      setSessionId(data.sessionId || null);
      setCode(data.code || '');
      if (typeof data.remainingToday === 'number') setRemaining(data.remainingToday);
    } catch (err: unknown) {
      const e2 = err as Error & { data?: { error?: string; message?: string } };
      onAlert(
        e2.data?.error === 'daily_limit'
          ? e2.data.message || 'Daily captcha limit reached (5/day).'
          : e2.message || 'Could not start captcha',
        '⚠️'
      );
      setSessionId(null);
      setCode('');
    } finally {
      setBusy(false);
    }
  };

  const submit = async (e?: React.MouseEvent) => {
    guardClick(e);
    if (!user || !sessionId) return;
    if (busy) return;
    setBusy(true);
    try {
      const data = await authFetch({
        action: 'complete',
        sessionId,
        code: typed,
      });
      if (typeof data.remainingToday === 'number') setRemaining(data.remainingToday);
      onAlert(
        data.message || `+${data.creditedCoins || ALPHA_CAPTCHA_COINS} AJ Coins 🪙`,
        data.duplicate ? 'ℹ️' : '🔑'
      );
      setSessionId(null);
      setCode('');
      setTyped('');
      onRefreshUser?.();
    } catch (err: unknown) {
      const e2 = err as Error & { data?: { error?: string; message?: string } };
      onAlert(e2.data?.message || e2.message || 'Verification failed', '⚠️');
      if (e2.data?.error === 'wrong_code' || e2.data?.error === 'session_expired') {
        setSessionId(null);
        setCode('');
        setTyped('');
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-2xl border border-violet-500/30 bg-gradient-to-br from-violet-950/40 to-indigo-950/30 p-4 space-y-3">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-violet-500/20 border border-violet-400/30 flex items-center justify-center shrink-0">
          <KeyRound size={18} className="text-violet-300" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-black text-white">Premium Alphanumeric Captcha</p>
          <p className="text-[11px] text-gray-300 leading-relaxed mt-0.5">
            Type the 6-character code for{' '}
            <span className="text-amber-300 font-bold">+{ALPHA_CAPTCHA_COINS} AJ Coins 🪙</span>. Max
            5/day.
          </p>
          {remaining != null ? (
            <p className="text-[9px] text-gray-500 mt-1">{remaining} left today</p>
          ) : null}
        </div>
      </div>

      {code ? (
        <div className="space-y-2">
          <p
            className="text-center text-2xl font-black tracking-[0.35em] text-white py-3 rounded-xl bg-black/50 border border-white/10 select-all"
            style={{ fontFamily: 'var(--font-aj-display), monospace' }}
          >
            {code}
          </p>
          <input
            value={typed}
            onChange={(ev) => setTyped(ev.target.value.toUpperCase())}
            placeholder="Type the code"
            maxLength={8}
            autoCapitalize="characters"
            className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white text-sm text-center font-bold tracking-widest focus:outline-none focus:border-violet-400/50"
          />
          <button
            type="button"
            disabled={busy || !user}
            onClick={(e) => void submit(e)}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-violet-400 to-indigo-500 text-black text-xs font-black flex items-center justify-center gap-2 disabled:opacity-50 active:scale-[0.98]"
          >
            {busy ? (
              <>
                <Loader2 size={14} className="animate-spin" /> Verifying…
              </>
            ) : (
              'Verify & Earn'
            )}
          </button>
        </div>
      ) : (
        <button
          type="button"
          disabled={busy || !user}
          onClick={(e) => void start(e)}
          className="w-full py-3 rounded-xl bg-gradient-to-r from-violet-400 to-indigo-500 text-black text-xs font-black flex items-center justify-center gap-2 disabled:opacity-50 active:scale-[0.98]"
        >
          {busy ? (
            <>
              <Loader2 size={14} className="animate-spin" /> Loading…
            </>
          ) : (
            <>
              <KeyRound size={14} /> Generate Captcha
            </>
          )}
        </button>
      )}
    </div>
  );
}
