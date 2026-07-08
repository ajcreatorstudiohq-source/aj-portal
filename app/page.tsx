"use client";
import React, { useState, useEffect } from 'react';

export default function AJSuperPortal() {
  const [screen, setScreen] = useState('splash'); 
  const [loading, setLoading] = useState(0);

  // Splash Screen Timer Logic
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

  // --- 1. SPLASH SCREEN (3 SECONDS) ---
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
        <p className="mt-4 text-[10px] text-gray-500 font-mono italic tracking-widest text-center">
            ESTABLISHING SOVEREIGNTY...
        </p>
      </main>
    );
  }

  // --- 2. LOGIN / SIGNUP PAGE ---
  if (screen === 'auth') {
    return (
      <main className="min-h-screen bg-[#050505] flex flex-col items-center justify-center p-6 text-white">
        <div className="w-full max-w-md bg-white/5 border border-white/10 p-10 rounded-[2.5rem] backdrop-blur-xl shadow-2xl">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-black text-cyan-400 tracking-tighter">CREATE AJ ID</h2>
            <p className="text-gray-400 text-sm mt-2 font-medium">Join Oman's Next-Gen Digital Empire</p>
          </div>
          
          <div className="bg-cyan-500/10 border border-cyan-500/20 p-4 rounded-2xl mb-8 text-center">
            <span className="text-yellow-400 font-bold">🎁 NEW USER BONUS:</span>
            <p className="text-xs text-white/80">Get 500 AJ Coins on Signup</p>
          </div>

          <button 
            onClick={() => setScreen('hub')}
            className="w-full py-4 bg-white text-black font-black rounded-2xl flex items-center justify-center gap-3 hover:bg-cyan-400 transition-all active:scale-95"
          >
            CONTINUE WITH GOOGLE
          </button>

          <div className="mt-6 flex items-center gap-3">
             <input 
               type="text" 
               placeholder="Referral Code (Optional)" 
               className="w-full bg-black/50 border border-white/10 rounded-xl p-3 text-sm outline-none focus:border-cyan-500 text-center" 
             />
          </div>

          <p className="mt-8 text-center text-[10px] text-gray-600 leading-relaxed uppercase tracking-widest">
            By joining, you agree to the AJ Creator Studio Terms of Service.
          </p>
        </div>
      </main>
    );
  }

  // --- MAIN PORTAL VIEW (HUB + FOUNDER + FOOTER) ---
  return (
    <main className="min-h-screen bg-[#020617] text-white font-sans overflow-x-hidden">
      
      {/* 3. MAIN HUB SECTION */}
      <section className="min-h-screen flex flex-col items-center justify-center p-4 relative border-b border-white/5">
        {/* Background Ambient Glow */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-[120px] animate-pulse"></div>
        
        <h1 className="relative z-20 text-3xl md:text-6xl font-black tracking-[0.2em] text-center mb-16 uppercase">
          AJ SUPER <span className="text-cyan-400">PORTAL</span>
        </h1>

        <div className="relative z-10 grid grid-cols-2 gap-6 md:gap-12 w-full max-w-2xl px-4">
          
          {/* AJ Gaming */}
          <div className="group bg-white/5 border-2 border-cyan-500/30 rounded-2xl p-6 h-44 flex flex-col items-center justify-center hover:border-cyan-500 transition-all cursor-pointer backdrop-blur-md hover:-translate-y-1">
            <span className="text-4xl mb-2">🕹️</span>
            <h2 className="font-black text-sm md:text-lg uppercase">AJ Gaming</h2>
            <div className="h-1 w-0 group-hover:w-full bg-cyan-500 transition-all duration-300 mt-1"></div>
          </div>

          {/* AJ Social */}
          <div onClick={() => setScreen('social')} className="group bg-white/5 border-2 border-pink-500/30 rounded-2xl p-6 h-44 flex flex-col items-center justify-center hover:border-pink-400 transition-all cursor-pointer backdrop-blur-md hover:-translate-y-1">
            <span className="text-4xl text-pink-400 mb-2">📱</span>
            <h2 className="font-black text-sm md:text-lg uppercase">AJ Social</h2>
            <div className="h-1 w-0 group-hover:w-full bg-pink-500 transition-all duration-300 mt-1"></div>
          </div>

          {/* AJ Coin Module (Using gold.jpg) */}
          <div className="group bg-white/5 border-2 border-yellow-500/30 rounded-2xl p-6 h-44 flex flex-col items-center justify-center hover:border-yellow-400 transition-all cursor-pointer backdrop-blur-md hover:-translate-y-1">
            <img src="/gold.jpg" alt="AJ Coin" className="w-16 h-16 object-contain mb-2 drop-shadow-[0_0_10px_rgba(234,179,8,0.4)]" />
            <h2 className="font-black text-sm md:text-lg uppercase text-yellow-500">AJ Coin</h2>
            <div className="h-1 w-0 group-hover:w-full bg-yellow-500 transition-all duration-300 mt-1"></div>
          </div>

          {/* AJ AI */}
          <div className="group bg-white/5 border-2 border-green-500/30 rounded-2xl p-6 h-44 flex flex-col items-center justify-center hover:border-green-400 transition-all cursor-pointer backdrop-blur-md hover:-translate-y-1">
            <span className="text-4xl text-green-400 mb-2">🤖</span>
            <h2 className="font-black text-sm md:text-lg uppercase text-green-400">AJ AI</h2>
            <div className="h-1 w-0 group-hover:w-full bg-green-500 transition-all duration-300 mt-1"></div>
          </div>

          {/* Central Hub Decorative Element */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-24 h-24 bg-black border-2 border-cyan-500 rounded-full flex items-center justify-center shadow-[0_0_30px_rgba(6,182,212,0.3)] z-30">
              <span className="text-[8px] font-black text-cyan-400 tracking-widest animate-pulse">HUB</span>
            </div>
          </div>
        </div>

        {/* Play Earn Bar */}
        <div className="mt-16 bg-white/5 p-4 rounded-full flex gap-4 text-[10px] md:text-xs font-bold text-gray-400 uppercase tracking-[0.2em] backdrop-blur-md">
           <span>Play</span> ➔ <span>Engage</span> ➔ <span>Earn</span> ➔ <span>Spend</span>
        </div>
      </section>

      {/* 4. MEET THE FOUNDER SECTION (Using ali.jpg) */}
      <section className="py-24 bg-black/40 backdrop-blur-xl relative">
        <div className="max-w-5xl mx-auto px-6 flex flex-col md:flex-row items-center gap-16">
          <div className="relative group">
             <div className="absolute -inset-2 bg-gradient-to-r from-cyan-500 to-pink-500 rounded-3xl blur opacity-20 group-hover:opacity-40 transition duration-1000"></div>
             <div className="relative bg-[#050505] rounded-3xl p-2 border border-white/10 shadow-2xl">
                <img src="/ali.jpg" alt="Ali Asim" className="w-72 h-96 object-cover rounded-2xl" />
             </div>
          </div>
          <div className="flex-1 text-center md:text-left">
            <h2 className="text-cyan-500 font-mono text-xs tracking-[0.5em] mb-4 uppercase">Meet the Founder</h2>
            <h3 className="text-4xl md:text-6xl font-black text-white mb-8 tracking-tighter uppercase">ALI ASIM - <span className="text-cyan-400">FOUNDER & CEO</span></h3>
            <p className="text-gray-300 text-xl leading-relaxed italic border-l-4 border-cyan-500 pl-8 font-light">
              "I am Ali Asim. My mission is to put Oman on the global map of digital entertainment. AJ Portal is not just a platform; it's a Sovereign Tech Empire built for the future."
            </p>
          </div>
        </div>
      </section>

      {/* 5. SOCIAL SUB-MODULES OVERLAY (If Social Clicked) */}
      {screen === 'social' && (
        <div className="fixed inset-0 z-50 bg-[#050505] flex flex-col items-center p-8 overflow-y-auto animate-in fade-in duration-500">
           <button onClick={() => setScreen('hub')} className="self-start text-cyan-400 font-bold mb-10 flex items-center gap-2 hover:text-white transition-colors">
             <span>←</span> BACK TO HUB
           </button>
           <h2 className="text-4xl font-black mb-16 tracking-tighter uppercase">AJ SOCIAL <span className="text-pink-500 font-light">Modules</span></h2>
           <div className="flex flex-col gap-6 w-full max-w-md">
             {['AJ TikReels', 'AJ Pulse', 'AJ Live Chat'].map((module, i) => (
               <div key={module} className="flex items-center justify-between bg-white/5 border border-white/10 p-8 rounded-[2rem] hover:border-pink-500 transition-all cursor-pointer group">
                  <h3 className="text-2xl font-black group-hover:text-pink-400 transition-colors">{module}</h3>
                  <span className="text-3xl transform group-hover:scale-125 transition-transform">{i === 0 ? '🚀' : i === 1 ? '⚡' : '🔴'}</span>
               </div>
             ))}
           </div>
        </div>
      )}

      {/* 6. CYBERPUNK FOOTER (MUSCAT HQ) */}
      <footer className="bg-black pt-20 pb-10 px-8 border-t border-cyan-500/20">
        <div className="max-w-6xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-12 mb-20">
          <div>
            <h4 className="text-cyan-400 font-black mb-6 uppercase tracking-widest text-xs">Gaming</h4>
            <ul className="space-y-4 text-sm text-gray-500 font-medium">
              <li className="hover:text-white transition-colors cursor-pointer">AJ Arcade</li>
              <li className="hover:text-white transition-colors cursor-pointer">Platforms</li>
              <li className="hover:text-white transition-colors cursor-pointer">Studio News</li>
            </ul>
          </div>
          <div>
            <h4 className="text-pink-500 font-black mb-6 uppercase tracking-widest text-xs">Social</h4>
            <ul className="space-y-4 text-sm text-gray-500 font-medium">
              <li className="hover:text-white transition-colors cursor-pointer">Community</li>
              <li className="hover:text-white transition-colors cursor-pointer">Events</li>
              <li className="hover:text-white transition-colors cursor-pointer">Profiles</li>
            </ul>
          </div>
          <div>
            <h4 className="text-yellow-500 font-black mb-6 uppercase tracking-widest text-xs">Economy</h4>
            <ul className="space-y-4 text-sm text-gray-500 font-medium">
              <li className="hover:text-white transition-colors cursor-pointer">AJ Coins</li>
              <li className="hover:text-white transition-colors cursor-pointer">Market</li>
              <li className="hover:text-white transition-colors cursor-pointer">Rewards</li>
            </ul>
          </div>
          <div>
            <h4 className="text-green-500 font-black mb-6 uppercase tracking-widest text-xs">Support</h4>
            <ul className="space-y-4 text-sm text-gray-500 font-medium">
              <li className="hover:text-white transition-colors cursor-pointer">FAQ</li>
              <li className="hover:text-white transition-colors cursor-pointer">Help Center</li>
              <li className="hover:text-white transition-colors cursor-pointer">Contact</li>
            </ul>
          </div>
        </div>

        {/* Lower Footer Branding */}
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center border-t border-white/5 pt-12 gap-8">
          <div className="flex items-center gap-6">
             <div className="text-3xl font-black tracking-tighter italic">AJ <span className="text-gray-600 font-light">STUDIO</span></div>
             <div className="h-6 w-px bg-gray-800 hidden md:block"></div>
             <div className="flex flex-col">
                <span className="text-[10px] text-cyan-400 font-bold uppercase tracking-widest">Global HQ</span>
                <span className="text-[12px] text-gray-500 font-mono">Muscat, Sultanate of Oman</span>
             </div>
          </div>
          
          <div className="flex flex-col items-end gap-2">
            <span className="text-gray-400 text-sm font-medium">ajcreatorstudio.hq@gmail.com</span>
            <div className="flex gap-6 text-cyan-400 font-black text-xs tracking-widest">
               <span className="cursor-pointer hover:text-white transition-colors">TWITTER</span>
               <span className="cursor-pointer hover:text-white transition-colors">INSTAGRAM</span>
               <span className="cursor-pointer hover:text-white transition-colors">LINKEDIN</span>
            </div>
          </div>
        </div>
        
        <p className="text-center text-[9px] text-gray-700 mt-16 uppercase tracking-[1em] font-bold">
          © 2024 AJ Creator Studio LLC - Establishing Sovereignty
        </p>
      </footer>
    </main>
  );
}