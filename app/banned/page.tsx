'use client';

import { useEffect } from 'react';
import { ShieldBan } from 'lucide-react';

/**
 * Shown when a banned user is kicked from the portal.
 * Session is already signed out by the ban kick flow.
 */
export default function BannedPage() {
  useEffect(() => {
    try {
      sessionStorage.setItem('aj_banned', '1');
    } catch {
      /* ignore */
    }
  }, []);

  return (
    <div className="min-h-screen bg-[#050505] text-white flex flex-col items-center justify-center px-6 relative overflow-hidden">
      <div
        className="absolute inset-0 opacity-40 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse at 50% 20%, rgba(239,68,68,0.35), transparent 55%), radial-gradient(ellipse at 80% 80%, rgba(15,23,42,0.9), #050505)',
        }}
      />
      <div className="relative z-10 max-w-md w-full text-center space-y-5">
        <div className="mx-auto w-16 h-16 rounded-2xl bg-red-500/15 border border-red-500/40 flex items-center justify-center">
          <ShieldBan className="text-red-400" size={28} />
        </div>
        <h1 className="text-2xl font-black tracking-tight">Account Banned</h1>
        <p className="text-sm text-gray-300 leading-relaxed">
          Your AJ Super Portal account has been permanently restricted for policy violations.
          Access to earn, wallet, live, and social features is disabled.
        </p>
        <p className="text-[11px] text-gray-500">
          If you believe this is an error, contact support via WhatsApp from the official AJ
          Creator Studio channels.
        </p>
        <a
          href="/"
          className="inline-flex items-center justify-center w-full py-3 rounded-2xl bg-white/5 border border-white/10 text-xs font-black active:scale-[0.98]"
        >
          Return to login
        </a>
      </div>
    </div>
  );
}
