'use client';

import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ExternalLink, Gift, Loader2 } from 'lucide-react';
import { getAuth, onAuthStateChanged, type User } from 'firebase/auth';
import { getApps, initializeApp } from 'firebase/app';
import { useSearchParams } from 'next/navigation';
import { OFFERWALL_PUBLIC } from '../lib/economy';
import { buildCpaGripWallUrl, CPAGRIP_WALL_ID } from '../lib/cpagrip';

const firebaseConfig = {
  apiKey: 'AIzaSyDp2od-lrfAhEHV5oAIqBW5rWjaRbnAdFM',
  authDomain: 'aj-super-portal.firebaseapp.com',
  projectId: 'aj-super-portal',
  appId: '1:288191292906:web:bc31cb072948533f88fe93',
};

function getClientAuth() {
  const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
  return getAuth(app);
}

/**
 * CPAGrip Offer Partners host page.
 * Layout loads script_include.php?id=1906642; scrubber is skipped on /offerwall
 * so the wall can mount here. Coins credit only via /api/postback.
 */
export default function OfferwallPage() {
  const searchParams = useSearchParams();
  const [user, setUser] = useState<User | null>(null);
  const [launching, setLaunching] = useState(false);

  useEffect(() => {
    const auth = getClientAuth();
    return onAuthStateChanged(auth, setUser);
  }, []);

  const trackingUid = useMemo(() => {
    const q = searchParams?.get('uid') || searchParams?.get('userId') || '';
    return user?.uid || q || '';
  }, [user?.uid, searchParams]);

  const wallUrl = useMemo(() => buildCpaGripWallUrl(trackingUid || null), [trackingUid]);

  useEffect(() => {
    if (!trackingUid || typeof window === 'undefined') return;
    try {
      window.sessionStorage.setItem('aj_cpagrip_uid', trackingUid);
    } catch {
      /* ignore */
    }
  }, [trackingUid]);

  function launchWall() {
    setLaunching(true);
    try {
      // Prefer in-page CPAGrip locker if already injected by layout script
      const grip = document.getElementById('grip_wall');
      if (grip) {
        grip.style.display = 'block';
        setLaunching(false);
        return;
      }
      const win = window.open(wallUrl, '_blank', 'noopener,noreferrer');
      if (!win) {
        window.location.assign(wallUrl);
      }
    } finally {
      window.setTimeout(() => setLaunching(false), 800);
    }
  }

  return (
    <div className="min-h-screen bg-[#050505] text-white flex flex-col">
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10"
        style={{
          background:
            'radial-gradient(ellipse at 20% 0%, rgba(236,72,153,0.18), transparent 50%), radial-gradient(ellipse at 90% 20%, rgba(34,211,238,0.12), transparent 45%), #050505',
        }}
      />

      <header className="sticky top-0 z-20 border-b border-white/10 bg-black/80 backdrop-blur-xl px-4 py-3 flex items-center gap-3">
        <a
          href="/"
          className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center active:scale-90"
        >
          <ArrowLeft size={16} />
        </a>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-black truncate" style={{ fontFamily: 'var(--font-aj-display), sans-serif' }}>
            AJ · Offer Partners
          </p>
          <p className="text-[10px] text-gray-400 truncate">CPAGrip wall · id {CPAGRIP_WALL_ID}</p>
        </div>
        <a
          href={wallUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gradient-to-r from-pink-500 to-orange-400 text-black text-[10px] font-black"
        >
          Direct link <ExternalLink size={12} />
        </a>
      </header>

      <div className="px-4 py-3 border-b border-white/5">
        <div className="flex items-start gap-3 rounded-2xl border border-amber-500/20 bg-amber-950/20 p-3">
          <Gift size={16} className="text-amber-300 shrink-0 mt-0.5" />
          <p className="text-[11px] text-gray-300 leading-relaxed">
            Complete a real CPAGrip offer. AJ Coins 🪙 credit only after a verified{' '}
            <code className="text-amber-200">lead</code>/<code className="text-amber-200">success</code>{' '}
            postback to <code className="text-cyan-300">/api/postback</code> — opening this page never
            adds coins.
          </p>
        </div>
      </div>

      <main className="flex-1 flex flex-col items-center justify-center gap-6 px-6 py-12 text-center">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-pink-500/30 to-cyan-400/20 border border-white/10 flex items-center justify-center">
          <Gift size={28} className="text-pink-300" />
        </div>
        <div className="space-y-2 max-w-sm">
          <h1
            className="text-2xl font-black tracking-tight"
            style={{ fontFamily: 'var(--font-aj-display), sans-serif' }}
          >
            CPAGrip Offer Wall
          </h1>
          <p className="text-[12px] text-gray-400 leading-relaxed">
            Surveys, app trials, and partner tasks. Your Firebase uid is sent as{' '}
            <code className="text-gray-300">tracking_id</code> for secure attribution.
          </p>
          {trackingUid ? (
            <p className="text-[10px] text-cyan-400/80 font-mono truncate">uid · {trackingUid}</p>
          ) : (
            <p className="text-[10px] text-amber-300">Sign in on the hub so credits bind to your wallet.</p>
          )}
        </div>

        <button
          type="button"
          onClick={launchWall}
          disabled={launching}
          className="w-full max-w-xs py-3.5 rounded-2xl bg-gradient-to-r from-cyan-400 to-blue-500 text-black text-sm font-black active:scale-[0.98] disabled:opacity-60 flex items-center justify-center gap-2"
        >
          {launching ? (
            <>
              <Loader2 size={16} className="animate-spin" /> Opening…
            </>
          ) : (
            'Launch Offer Partners'
          )}
        </button>

        <p className="text-[9px] text-gray-600 max-w-xs">
          Provider · {OFFERWALL_PUBLIC.provider} · wall {OFFERWALL_PUBLIC.wallId}
        </p>
      </main>
    </div>
  );
}
