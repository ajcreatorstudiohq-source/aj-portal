'use client';

import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ExternalLink, Gift, Loader2 } from 'lucide-react';
import { getAuth, onAuthStateChanged, type User } from 'firebase/auth';
import { getApps, initializeApp } from 'firebase/app';
import { buildCpaGripWallUrl, CPAGRIP_WALL_ID, openCpaGripOfferWall } from '../lib/cpagrip';

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

/**
 * Offer Partners bridge — opens CPAGrip ridefiles show.php with Firebase uid as tracking_id.
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
  const wallUrl = useMemo(() => buildCpaGripWallUrl(trackingUid || null), [trackingUid]);

  useEffect(() => {
    if (!trackingUid || opened) return;
    const result = openCpaGripOfferWall(trackingUid);
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
          <p
            className="text-sm font-black truncate"
            style={{ fontFamily: 'var(--font-aj-display), sans-serif' }}
          >
            AJ · Offer Partners
          </p>
          <p className="text-[10px] text-gray-400 truncate">CPAGrip · wall {CPAGRIP_WALL_ID}</p>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center gap-5 px-6 py-12 text-center">
        <Gift size={28} className="text-pink-300" />
        <h1
          className="text-xl font-black"
          style={{ fontFamily: 'var(--font-aj-display), sans-serif' }}
        >
          Opening CPAGrip…
        </h1>
        <p className="text-[12px] text-gray-400 max-w-sm leading-relaxed">
          Direct offer wall opens in a new tab. AJ Coins 🪙 credit only after a verified{' '}
          <code className="text-amber-200">lead</code>/<code className="text-amber-200">success</code>{' '}
          postback — never from opening the link.
        </p>
        {!trackingUid ? (
          <p className="text-[10px] text-amber-300">Sign in on the hub so credits bind to your wallet.</p>
        ) : (
          <p className="text-[10px] text-cyan-400/80 font-mono truncate max-w-xs">
            tracking_id · {trackingUid}
          </p>
        )}
        <a
          href={wallUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-cyan-400 to-blue-500 text-black text-xs font-black"
        >
          {opened ? (
            <>
              Open again <ExternalLink size={14} />
            </>
          ) : (
            <>
              <Loader2 size={14} className="animate-spin" /> Launching…
            </>
          )}
        </a>
      </main>
    </div>
  );
}
