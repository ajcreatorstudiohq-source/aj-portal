'use client';

import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ExternalLink, Gift, Loader2 } from 'lucide-react';
import { getAuth, onAuthStateChanged, type User } from 'firebase/auth';
import { getApps, initializeApp } from 'firebase/app';
import {
  THEOREMREACH_API_KEY,
  buildTheoremReachUrl,
  openTheoremReach,
} from '../lib/offer-hub';
import { openAdsterraDirectLink } from '../lib/ads-config';

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

function readQueryUid(): string {
  if (typeof window === 'undefined') return '';
  try {
    const q = new URLSearchParams(window.location.search);
    return q.get('uid') || q.get('userId') || q.get('playerid') || q.get('tracking_id') || '';
  } catch {
    return '';
  }
}

/**
 * Offer Partners bridge — TheoremReach surveys.
 * Credits only via /api/postback. Adsterra Direct Link on open.
 */
export default function OfferwallPage() {
  const [user, setUser] = useState<User | null>(null);
  const [queryUid, setQueryUid] = useState('');
  const [opened, setOpened] = useState(false);

  useEffect(() => {
    setQueryUid(readQueryUid());
    const auth = getClientAuth();
    return onAuthStateChanged(auth, setUser);
  }, []);

  const trackingUid = useMemo(() => user?.uid || queryUid || '', [user?.uid, queryUid]);
  const wallUrl = useMemo(
    () => buildTheoremReachUrl(trackingUid || 'guest'),
    [trackingUid]
  );

  useEffect(() => {
    if (!trackingUid || opened) return;
    openAdsterraDirectLink();
    const result = openTheoremReach(trackingUid);
    setOpened(true);
    if (!result.ok && wallUrl) {
      try {
        window.location.replace(wallUrl);
      } catch {
        /* ignore */
      }
    }
  }, [trackingUid, opened, wallUrl]);

  // Adsterra Direct Link again when leaving the bridge (survey end / close)
  useEffect(() => {
    const onLeave = () => {
      try {
        openAdsterraDirectLink();
      } catch {
        /* ignore */
      }
    };
    window.addEventListener('pagehide', onLeave);
    return () => window.removeEventListener('pagehide', onLeave);
  }, []);

  return (
    <div className="min-h-screen bg-[#050505] text-white flex flex-col">
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10"
        style={{
          background:
            'radial-gradient(ellipse at 20% 0%, rgba(232,121,249,0.22), transparent 50%), radial-gradient(ellipse at 90% 20%, rgba(34,211,238,0.12), transparent 45%), #050505',
        }}
      />

      <header className="sticky top-0 z-20 border-b border-fuchsia-500/25 bg-black/80 backdrop-blur-xl px-4 py-3 flex items-center gap-3">
        <a
          href="/"
          className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center active:scale-90"
        >
          <ArrowLeft size={16} />
        </a>
        <div className="flex-1 min-w-0">
          <p
            className="text-sm font-black truncate"
            style={{ fontFamily: 'var(--font-aj-display), sans-serif' }}
          >
            AJ · Offer Hub
          </p>
          <p className="text-[10px] text-fuchsia-300/80 truncate">
            TheoremReach · {THEOREMREACH_API_KEY.slice(0, 8)}… · Earn AJ Coins 🪙
          </p>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center gap-5 px-6 py-12 text-center">
        <Gift size={28} className="text-fuchsia-300" />
        <h1
          className="text-xl font-black"
          style={{ fontFamily: 'var(--font-aj-display), sans-serif' }}
        >
          Opening TheoremReach…
        </h1>
        <p className="text-[12px] text-gray-400 max-w-sm leading-relaxed">
          Complete surveys to earn AJ Coins 🪙. Credits only after verified postback — never from
          opening the link alone. Adsterra opens at start for publisher revenue.
        </p>
        {!trackingUid ? (
          <p className="text-[10px] text-sky-300">Sign in on the hub so credits bind to your wallet.</p>
        ) : (
          <p className="text-[10px] text-cyan-400/80 font-mono truncate max-w-xs">
            user_id · {trackingUid}
          </p>
        )}
        <a
          href={wallUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl text-white text-xs font-black"
          style={{
            background: 'linear-gradient(135deg,#c026d3 0%,#7c3aed 50%,#2563eb 100%)',
            boxShadow: '0 0 22px rgba(232,121,249,0.35)',
          }}
          onClick={() => openAdsterraDirectLink()}
        >
          {opened ? (
            <>
              Open again <ExternalLink size={14} />
            </>
          ) : (
            <>
              <Loader2 size={14} className="animate-spin" /> Opening…
            </>
          )}
        </a>
      </main>
    </div>
  );
}
