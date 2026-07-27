'use client';

import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ExternalLink, Gift, Loader2 } from 'lucide-react';
import { getAuth, onAuthStateChanged, type User } from 'firebase/auth';
import { getApps, initializeApp } from 'firebase/app';
import { MONLIX_OFFERS_URL, openMonlixOffers } from '../lib/offer-hub';

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
    return q.get('uid') || q.get('userId') || q.get('tracking_id') || '';
  } catch {
    return '';
  }
}

function buildMonlixUrl(uid?: string | null): string {
  try {
    const url = new URL(MONLIX_OFFERS_URL);
    if (uid) url.searchParams.set('userid', uid);
    return url.toString();
  } catch {
    if (!uid) return MONLIX_OFFERS_URL;
    const sep = MONLIX_OFFERS_URL.includes('?') ? '&' : '?';
    return `${MONLIX_OFFERS_URL}${sep}userid=${encodeURIComponent(uid)}`;
  }
}

/**
 * Offer Partners bridge — opens Monlix / BitLabs-style CPA wall (NO ridefiles lockers).
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
  const wallUrl = useMemo(() => buildMonlixUrl(trackingUid || null), [trackingUid]);

  useEffect(() => {
    if (!trackingUid || opened) return;
    const result = openMonlixOffers(trackingUid);
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
          <p className="text-[10px] text-gray-400 truncate">Monlix · Earn More AJ Coins 🪙</p>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center gap-5 px-6 py-12 text-center">
        <Gift size={28} className="text-sky-300" />
        <h1
          className="text-xl font-black"
          style={{ fontFamily: 'var(--font-aj-display), sans-serif' }}
        >
          Opening Monlix…
        </h1>
        <p className="text-[12px] text-gray-400 max-w-sm leading-relaxed">
          Want more coins? Complete real app installs in our Offer Hub. AJ Coins 🪙 credit only after
          verified postback — never from opening the link.
        </p>
        {!trackingUid ? (
          <p className="text-[10px] text-sky-300">Sign in on the hub so credits bind to your wallet.</p>
        ) : (
          <p className="text-[10px] text-cyan-400/80 font-mono truncate max-w-xs">
            userid · {trackingUid}
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
