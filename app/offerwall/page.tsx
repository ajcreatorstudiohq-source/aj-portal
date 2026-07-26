'use client';

import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ExternalLink, Gift } from 'lucide-react';
import { getAuth, onAuthStateChanged, type User } from 'firebase/auth';
import { getApps, initializeApp } from 'firebase/app';
import { buildOfferwallUrl, OFFERWALL_PUBLIC } from '../lib/economy';

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
 * External Offer Partners page — embeds / opens real partner offerwall
 * (surveys, trials, CPI). Coins credit only via verified postback.
 */
export default function OfferwallPage() {
  const [user, setUser] = useState<User | null>(null);
  const [iframeBlocked, setIframeBlocked] = useState(false);

  useEffect(() => {
    const auth = getClientAuth();
    return onAuthStateChanged(auth, setUser);
  }, []);

  const wallUrl = useMemo(
    () => buildOfferwallUrl(user?.uid || null),
    [user?.uid]
  );

  useEffect(() => {
    // If partner blocks iframe embedding, fall back after a short wait check
    const t = window.setTimeout(() => {
      try {
        const frame = document.getElementById('aj-offerwall-frame') as HTMLIFrameElement | null;
        if (frame && !frame.contentWindow) setIframeBlocked(true);
      } catch {
        setIframeBlocked(true);
      }
    }, 4000);
    return () => window.clearTimeout(t);
  }, [wallUrl]);

  return (
    <div className="min-h-screen bg-[#050505] text-white flex flex-col">
      <header className="sticky top-0 z-20 border-b border-white/10 bg-black/80 backdrop-blur-xl px-4 py-3 flex items-center gap-3">
        <a
          href="/"
          className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center active:scale-90"
        >
          <ArrowLeft size={16} />
        </a>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-black truncate">Offer Partners</p>
          <p className="text-[10px] text-gray-400 truncate">
            Surveys · app trials · verified tasks
          </p>
        </div>
        <a
          href={wallUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gradient-to-r from-pink-500 to-orange-400 text-black text-[10px] font-black"
        >
          Open external <ExternalLink size={12} />
        </a>
      </header>

      <div className="px-4 py-3 border-b border-white/5">
        <div className="flex items-start gap-3 rounded-2xl border border-amber-500/20 bg-amber-950/20 p-3">
          <Gift size={16} className="text-amber-300 shrink-0 mt-0.5" />
          <p className="text-[11px] text-gray-300 leading-relaxed">
            Complete a real partner offer below. AJ Coins credit only after verified partner
            postback — opening this page or link alone never adds coins.
          </p>
        </div>
      </div>

      <div className="flex-1 relative min-h-[70vh]">
        {!iframeBlocked ? (
          <iframe
            id="aj-offerwall-frame"
            title="AJ Offer Partners"
            src={wallUrl}
            className="absolute inset-0 w-full h-full border-0 bg-black"
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox allow-top-navigation-by-user-activation"
            referrerPolicy="no-referrer-when-downgrade"
            onError={() => setIframeBlocked(true)}
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 px-6 text-center">
            <p className="text-sm font-black">Partner wall opens externally</p>
            <p className="text-[11px] text-gray-400 max-w-sm">
              This offer network blocks in-app embedding. Continue in your browser to finish
              surveys and trials.
            </p>
            <a
              href={wallUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-5 py-3 rounded-2xl bg-gradient-to-r from-cyan-400 to-blue-500 text-black text-xs font-black"
            >
              Continue to {OFFERWALL_PUBLIC.wallUrl.replace(/^https?:\/\//, '').split('/')[0]}
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
