"use client";
import React, { useState, useEffect } from 'react';

export default function AJSuperPortal() {
  const [screen, setScreen] = useState('splash'); 
  const [loading, setLoading] = useState(0);

  useEffect(() => {
    if (screen === 'splash') {
      const interval = setInterval(() => {
        setLoading((prev) => {
          if (prev >= 100) {
            clearInterval(interval);
            setTimeout(() => setScreen('auth'), 500);
            return 100;
          }
          return prev + 5;
        });
      }, 50);
    }
  }, [screen]);

  if (screen === 'splash') {
    return (
      <main className="min-h-screen bg-black flex flex-col items-center justify-center text-white">
        <div className="relative">
          <div className="w-24 h-24 border-4 border-cyan-500 rounded-full animate-ping opacity-20"></div>
          <div className="absolute inset-0 flex items-center justify-center text-4xl font-black text-cyan-400">AJ</div>
        </div>
        <h1 className="mt-8 text-2xl font-black tracking-[0.5em] animate-pulse">WELCOME TO AJ PORTAL</h1>
        <div className="mt-10 w-48 h-1 bg-gray-900 rounded-full overflow-hidden">
          <div className="h-full bg-cyan-500 transition-all duration-300" style={{ width: `${loading}%` }}></div>
        </div>
        <p className="mt-4 text-[10px] text-gray-500 font-mono italic">ESTABLISHING SOVEREIGNTY...</p>
      </main>
    );
  }

  if (screen === 'auth') {
    return (
      <main className="min-h-screen bg-[#050505] flex flex-col items-center justify-center p-6 text-white">
        <div className="w-full max-w-md bg-white/5 border border-white/10 p-10 rounded-[2.5rem] backdrop-blur-xl shadow-2xl">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-black text-cyan-400 tracking-tighter">CREATE AJ ID</h2>
            <p className="text-gray-400 text-sm mt-2">Join Oman's Next-Gen Digital Empire</p>
          </div>
          <div className="bg-cyan-500/10 border border-cyan-500/20 p-4 rounded-2xl mb-8 text-center">
            <span className="text-yellow-400 font-bold">🎁 NEW USER BONUS:</span>
            <p className="text-xs text-white/80">Get 500 AJ Coins on Signup</p>
          </div>
          <button onClick={() => setScreen('hub')} className="w-full py-4 bg-white text-black font-black rounded-2xl flex items-center justify-center gap-3 hover:bg-cyan-400 transition-colors">
            CONTINUE WITH GOOGLE
          </button>
          <input type="text" placeholder="Referral Code (Optional)" className="mt-6 w-full bg-black/50 border border-white/10 rounded-xl p-3 text-sm outline-none focus:border-cyan-500 text-center" />
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#020617] text-white font-sans overflow-x-hidden">
      {/* 1. MAIN HUB SECTION */}
      <section className="min-h-screen flex flex-col items-center justify-center p-4 relative">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-[120px] animate-pulse"></div>
        <h1 className="relative z-20 text-3xl md:text-6xl font-black tracking-[0.2em] text-center mb-16">
          AJ SUPER <span className="text-cyan-400">PORTAL</span>
        </h1>

        <div className="relative z-10 grid grid-cols-2 gap-6 md:gap-12 w-full max-w-2xl px-4">
          <div className="group bg-white/5 border-2 border-cyan-500/30 rounded-2xl p-6 h-40 flex flex-col items-center justify-center hover:border-cyan-500 transition-all cursor-pointer backdrop-blur-md">
            <span className="text-4xl">🕹️</span>
            <h2 className="mt-2 font-black text-sm md:text-lg uppercase">AJ Gaming</h2>
          </div>
          <div className="group bg-white/5 border-2 border-pink-500/30 rounded-2xl p-6 h-40 flex flex-col items-center justify-center hover:border-pink-400 transition-all cursor-pointer backdrop-blur-md">
            <span className="text-4xl text-pink-400">📱</span>
            <h2 className="mt-2 font-black text-sm md:text-lg uppercase">AJ Social</h2>
          </div>
          <div className="group bg-white/5 border-2 border-yellow-500/30 rounded-2xl p-6 h-40 flex flex-col items-center justify-center hover:border-yellow-400 transition-all cursor-pointer backdrop-blur-md">
            <span className="text-4xl text-yellow-400">🪙</span>
            <h2 className="mt-2 font-black text-sm md:text-lg uppercase">AJ Coin</h2>
          </div>
          <div className="group bg-white/5 border-2 border-green-500/30 rounded-2xl p-6 h-40 flex flex-col items-center justify-center hover:border-green-400 transition-all cursor-pointer backdrop-blur-md">
            <span className="text-4xl text-green-400">🤖</span>
            <h2 className="mt-2 font-black text-sm md:text-lg uppercase">AJ AI</h2>
          </div>
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-24 h-24 bg-black border-2 border-cyan-500 rounded-full flex items-center justify-center shadow-[0_0_30px_rgba(6,182,212,0.3)] z-30">
              <span className="text-[8px] font-black text-cyan-400 tracking-widest">HUB</span>
            </div>
          </div>
        </div>

        <div className="mt-16 bg-white/5 p-4 rounded-full flex gap-4 text-[10px] md:text-xs font-bold text-gray-400 uppercase tracking-[0.2em] backdrop-blur-md">
           <span>Play</span> ➔ <span>Engage</span> ➔ <span>Earn</span> ➔ <span>Spend</span>
        </div>
      </section>

      {/* 2. MEET THE FOUNDER SECTION */}
      <section className="py-20 bg-black/50 backdrop-blur-lg border-y border-white/5">
        <div className="max-w-5xl mx-auto px-6 flex flex-col md:flex-row items-center gap-12">
          <div className="relative group">
             <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500 to-pink-500 rounded-2xl blur opacity-25 group-hover:opacity-50 transition duration-1000"></div>
             <div className="relative bg-[#050505] rounded-2xl p-2 overflow-hidden border border-white/10">
                {/* founder.png image will load here */}
                <img src="/founder.png" alt="Ali Asim" className="w-64 h-80 object-cover rounded-xl" />
             </div>
          </div>
          <div className="flex-1 text-center md:text-left">
            <h2 className="text-gray-500 font-mono text-sm tracking-widest mb-2 uppercase">Meet the Founder</h2>
            <h3 className="text-4xl md:text-5xl font-black text-white mb-6 tracking-tighter">ALI ASIM - <span className="text-cyan-400">FOUNDER & CEO</span></h3>
            <p className="text-gray-400 text-lg leading-relaxed italic border-l-4 border-cyan-500 pl-6">
              "I am Ali Asim. My mission is to put Oman on the global map of digital entertainment. AJ Portal is not just a platform; it's a Sovereign Tech Empire built for the future."
            </p>
          </div>
        </div>
      </section>

      {/* 3. CYBERPUNK FOOTER */}
      <footer className="bg-black pt-16 pb-8 px-6 border-t border-cyan-500/20">
        <div className="max-w-6xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-10 mb-16">
          <div>
            <h4 className="text-cyan-400 font-black mb-6 uppercase tracking-widest text-xs">Gaming</h4>
            <ul className="space-y-3 text-sm text-gray-500">
              <li className="hover:text-white cursor-pointer">AJ Arcade</li>
              <li className="hover:text-white cursor-pointer">Platforms</li>
              <li className="hover:text-white cursor-pointer">Studio News</li>
            </ul>
          </div>
          <div>
            <h4 className="text-pink-500 font-black mb-6 uppercase tracking-widest text-xs">Social</h4>
            <ul className="space-y-3 text-sm text-gray-500">
              <li className="hover:text-white cursor-pointer">Community</li>
              <li className="hover:text-white cursor-pointer">Events</li>
              <li className="hover:text-white cursor-pointer">Profiles</li>
            </ul>
          </div>
          <div>
            <h4 className="text-yellow-500 font-black mb-6 uppercase tracking-widest text-xs">Economy</h4>
            <ul className="space-y-3 text-sm text-gray-500">
              <li className="hover:text-white cursor-pointer">AJ Coins</li>
              <li className="hover:text-white cursor-pointer">Market</li>
              <li className="hover:text-white cursor-pointer">Rewards</li>
            </ul>
          </div>
          <div>
            <h4 className="text-green-500 font-black mb-6 uppercase tracking-widest text-xs">Support</h4>
            <ul className="space-y-3 text-sm text-gray-500">
              <li className="hover:text-white cursor-pointer">FAQ</li>
              <li className="hover:text-white cursor-pointer">Help Center</li>
              <li className="hover:text-white cursor-pointer">Contact</li>
            </ul>
          </div>
        </div>

        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center border-t border-white/5 pt-10">
          <div className="flex items-center gap-4 mb-6 md:mb-0">
             <div className="text-2xl font-black tracking-tighter italic">AJ <span className="text-gray-600 font-light">STUDIO</span></div>
             <div className="h-4 w-px bg-gray-800"></div>
             <div className="text-[10px] text-gray-500 font-mono">MUSCAT, OMAN HQ</div>
          </div>
          
          <div className="flex gap-6">
            <span className="text-gray-600 text-xs">ajcreatorstudio.hq@gmail.com</span>
            <div className="flex gap-4 text-cyan-400">
               <span className="cursor-pointer hover:text-white">TW</span>
               <span className="cursor-pointer hover:text-white">IG</span>
               <span className="cursor-pointer hover:text-white">LI</span>
            </div>
          </div>
        </div>
        <p className="text-center text-[9px] text-gray-700 mt-10 uppercase tracking-[0.5em]">
          © 2024 AJ Creator Studio LLC - Establishing Sovereignty
        </p>
      </footer>
    </main>
  );
}