'use client';

import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ExternalLink, Gift, Loader2 } from 'lucide-react';
import { getAuth, onAuthStateChanged, type User } from 'firebase/auth';
import { getApps, initializeApp } from 'firebase/app';
import { ADGEM_APP_ID, buildAdGemUrl, openAdGem } from '../lib/offer-hub';

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
 * Offer Partners bridge — opens ADGem wall (app 33088).
 * Credits only via /api/postback.
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
  const wallUrl = useMemo(() => buildAdGemUrl(trackingUid || 'guest'), [trackingUid]);

  useEffect(() => {
    if (!trackingUid || opened) return;
    const result = openAdGem(trackingUid);
    setOpened(true);
    if (!result.ok && wallUrl) {
      try {
        window.location.replace(wallUrl);
      } catch {
        /* ignore */
      }
    }
  }, [trackingUid, opened, wallUrl]);

  return (
    <div className="min-h-screen bg-[#050505] text-white flex flex-col">
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10"
        style={{
          background:
            'radial-gradient(ellipse at 20% 0%, rgba(99,102,241,0.2), transparent 50%), radial-gradient(ellipse at 90% 20%, rgba(34,211,238,0.12), transparent 45%), #050505',
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
          <p
            className="text-sm font-black truncate"
            style={{ fontFamily: 'var(--font-aj-display), sans-serif' }}
          >
            AJ · Offer Hub
          </p>
          <p className="text-[10px] text-gray-400 truncate">
            ADGem · app {ADGEM_APP_ID} · Earn AJ Coins 🪙
          </p>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center gap-5 px-6 py-12 text-center">
        <Gift size={28} className="text-violet-300" />
        <h1
          className="text-xl font-black"
          style={{ fontFamily: 'var(--font-aj-display), sans-serif' }}
        >
          Opening ADGem…
        </h1>
        <p className="text-[12px] text-gray-400 max-w-sm leading-relaxed">
          Complete offers to earn AJ Coins 🪙. Credits only after verified postback — never from
          opening the link alone.
        </p>
        {!trackingUid ? (
          <p className="text-[10px] text-sky-300">Sign in on the hub so credits bind to your wallet.</p>
        ) : (
          <p className="text-[10px] text-cyan-400/80 font-mono truncate max-w-xs">
            playerid · {trackingUid}
          </p>
        )}
        <a
          href={wallUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-blue-500 to-violet-600 text-white text-xs font-black"
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
