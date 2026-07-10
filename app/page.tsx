"use client";
import React, { useState, useEffect } from 'react';
import { MessageCircle, Trophy, Zap, Wallet, Bot, ChevronRight, Globe, Mail } from 'lucide-react';

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
          return prev + 10;
        });
      }, 50);
    }
  }, [screen]);

  if (screen === 'splash') {
    return (
      <main className="min-h-screen bg-black flex flex-col items-center justify-center text-white p-6">
        <div className="relative mb-6">
          <div className="w-20 h-20 border-4 border-cyan-500 rounded-full animate-pulse shadow-[0_0_20px_#06b6d4]"></div>
          <div className="absolute inset-0 flex items-center justify-center text-3xl font-black italic">AJ</div>
        </div>
        <h1 className="text-xl font-black tracking-[0.5em] opacity-80 uppercase">Welcome</h1>
      </main>
    );
  }

  if (screen === 'auth') {
    return (
      <main className="min-h-screen bg-[#050505] flex flex-col items-center justify-center p-6 text-white text-center">
        <div className="w-full max-w-sm bg-white/[0.03] border border-white/10 p-8 rounded-3xl backdrop-blur-xl shadow-2xl">
          <h2 className="text-4xl font-black mb-2 uppercase tracking-tighter">AJ <span className="text-cyan-400 font-light">ID</span></h2>
          <p className="text-gray-500 mb-10 text-xs tracking-widest font-bold">DIGITAL EMPIRE ACCESS</p>
          <button onClick={() => setScreen('hub')} className="w-full py-4 bg-white text-black font-black text-sm rounded-xl hover:bg-cyan-400 transition-all active:scale-95">
            CONTINUE WITH GOOGLE
          </button>
          <p className="mt-6 text-yellow-500 font-bold text-[10px] tracking-widest uppercase">+500 AJ COINS BONUS</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#020617] text-white font-sans overflow-x-hidden">
      
      {/* HUB SECTION */}
      <section className="min-h-screen flex flex-col items-center justify-center p-4 relative">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-64 h-64 bg-cyan-500/10 rounded-full blur-[100px]"></div>
        
        <h1 className="relative z-20 text-3xl md:text-6xl font-black tracking-tighter text-center mb-10 md:mb-20 uppercase drop-shadow-[0_0_15px_#22d3ee]">
          AJ SUPER PORTAL
        </h1>

        <div className="relative z-10 grid grid-cols-2 gap-3 md:gap-12 w-full max-w-3xl px-2">
          <div className="group bg-white/5 border border-white/10 rounded-2xl p-4 h-40 md:h-64 flex flex-col items-center justify-center hover:border-cyan-500 transition-all cursor-pointer relative">
            <Trophy className="mb-2 text-cyan-400 w-8 h-8 md:w-16 md:h-16" />
            <h2 className="font-black text-[10px] md:text-xl uppercase">Gaming</h2>
          </div>

          <div onClick={() => setScreen('social')} className="group bg-white/5 border border-white/10 rounded-2xl p-4 h-40 md:h-64 flex flex-col items-center justify-center hover:border-pink-500 transition-all cursor-pointer relative">
            <Zap className="mb-2 text-pink-500 w-8 h-8 md:w-16 md:h-16" />
            <h2 className="font-black text-[10px] md:text-xl uppercase">Social</h2>
          </div>

          <div className="group bg-white/5 border border-white/10 rounded-2xl p-4 h-40 md:h-64 flex flex-col items-center justify-center hover:border-yellow-500 transition-all cursor-pointer relative">
            <img src="/gold.jpg" alt="Coin" className="w-10 h-10 md:w-28 md:h-28 object-contain mb-2" />
            <h2 className="font-black text-[10px] md:text-xl uppercase text-yellow-500">Wallet</h2>
          </div>

          <div className="group bg-white/5 border border-white/10 rounded-2xl p-4 h-40 md:h-64 flex flex-col items-center justify-center hover:border-green-500 transition-all cursor-pointer relative">
            <Bot className="mb-2 text-green-400 w-8 h-8 md:w-16 md:h-16" />
            <h2 className="font-black text-[10px] md:text-xl uppercase">AJ AI</h2>
          </div>

          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-16 h-16 md:w-48 md:h-48 bg-black border-2 md:border-8 border-cyan-500 rounded-full flex items-center justify-center shadow-[0_0_40px_rgba(6,182,212,0.6)] z-30">
              <span className="text-[8px] md:text-4xl font-black text-white">HUB</span>
            </div>
          </div>
        </div>

        <div className="mt-12 bg-white/5 px-6 py-2 rounded-full flex gap-3 text-[7px] md:text-sm font-bold text-gray-500 uppercase tracking-widest border border-white/5">
           <span>Play</span> ➔ <span>Engage</span> ➔ <span>Earn</span> ➔ <span>Spend</span>
        </div>
      </section>

      {/* FOUNDER CARD */}
      <section className="py-16 bg-black flex justify-center px-4 border-y border-white/5 text-center">
        <div className="max-w-3xl w-full">
           <p className="text-cyan-500 font-mono text-[9px] tracking-widest mb-4 uppercase font-bold">Founder Identity</p>
           <img src="/founder_card.jpg" alt="Ali Asim" className="w-full h-auto rounded-2xl shadow-xl border border-white/10" />
        </div>
      </section>

      {/* FOOTER (WHATSAPP & GMAIL ONLY) */}
      <footer className="bg-black pt-16 pb-12 px-6 border-t border-cyan-500/10 text-center">
        <div className="max-w-4xl mx-auto flex flex-col items-center gap-10">
          <div className="text-4xl md:text-7xl font-black italic tracking-tighter text-white">
            AJ <span className="text-cyan-400">STUDIO</span>
          </div>
          
          <div className="flex flex-col items-center gap-4">
             <div className="flex items-center gap-2 text-gray-400 text-sm font-mono tracking-tighter">
                <Mail size={16} className="text-cyan-500" /> ajcreatorstudio.hq@gmail.com
             </div>
             {/* WHATSAPP ONLY */}
             <a href="https://wa.me/96878994093" target="_blank" className="flex items-center gap-3 bg-green-600/10 border border-green-500/50 px-6 py-3 rounded-full text-green-500 hover:bg-green-600 hover:text-white transition-all">
                <MessageCircle size={24}/>
                <span className="font-bold tracking-widest text-sm uppercase">Contact WhatsApp</span>
             </a>
          </div>

          <p className="text-gray-700 font-bold tracking-[0.8em] text-[8px] uppercase mt-4 flex items-center gap-2">
            <Globe size={10}/> Muscat, Sultanate of Oman
          </p>
        </div>
      </footer>

      {/* SOCIAL OVERLAY */}
      {screen === 'social' && (
        <div className="fixed inset-0 z-50 bg-[#050505] flex flex-col items-center p-8 overflow-y-auto">
           <button onClick={() => setScreen('hub')} className="self-start text-cyan-400 font-bold text-sm mb-10 flex items-center gap-2">
             <ChevronRight className="rotate-180" size={18} /> BACK TO HUB
           </button>
           <h2 className="text-3xl font-black mb-10 uppercase text-white tracking-tighter">AJ Social</h2>
           <div className="flex flex-col gap-4 w-full max-w-sm">
             {['AJ TikReels', 'AJ Pulse', 'AJ Live Chat'].map((module, i) => (
               <div key={module} className="flex items-center justify-between bg-white/5 border border-white/10 p-6 rounded-2xl hover:border-pink-500 transition-all cursor-pointer group">
                  <h3 className="text-lg font-black uppercase">{module}</h3>
                  <span className="text-2xl">{i === 0 ? '🚀' : i === 1 ? '⚡' : '🔴'}</span>
               </div>
             ))}
           </div>
        </div>
      )}
    </main>
  );
}