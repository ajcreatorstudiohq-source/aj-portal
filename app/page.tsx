"use client";
import React, { useState, useEffect } from 'react';
import { MessageCircle, Trophy, Zap, Wallet, Bot, ChevronRight } from 'lucide-react';

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
      }, 30);
    }
  }, [screen]);

  // 1. NEON SPLASH
  if (screen === 'splash') {
    return (
      <main className="min-h-screen bg-black flex flex-col items-center justify-center text-white">
        <div className="relative mb-12">
          <div className="w-48 h-48 border-[10px] border-cyan-500 rounded-full animate-ping opacity-10"></div>
          <div className="absolute inset-0 flex items-center justify-center text-9xl font-black text-white drop-shadow-[0_0_40px_#22d3ee]">AJ</div>
        </div>
        <h1 className="text-5xl font-black tracking-[0.5em] animate-pulse">WELCOME</h1>
      </main>
    );
  }

  // 2. PRO LOGIN
  if (screen === 'auth') {
    return (
      <main className="min-h-screen bg-[#020617] flex flex-col items-center justify-center p-8 text-white relative">
        <div className="w-full max-w-2xl bg-white/[0.02] border border-white/10 p-20 rounded-[4rem] backdrop-blur-3xl shadow-2xl text-center">
          <h2 className="text-8xl font-black mb-4 tracking-tighter">AJ <span className="text-cyan-400">ID</span></h2>
          <p className="text-gray-500 text-2xl tracking-[0.4em] mb-20 uppercase">Digital Empire Access</p>
          <button onClick={() => setScreen('hub')} className="w-full py-8 bg-white text-black font-black text-3xl rounded-3xl hover:bg-cyan-400 transition-all active:scale-95 shadow-2xl">
            CONTINUE WITH GOOGLE
          </button>
          <div className="mt-12 text-yellow-500 font-bold text-xl uppercase tracking-widest">+500 AJ COINS BONUS UNLOCKED</div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#020617] text-white font-sans overflow-x-hidden">
      
      {/* 3. MAIN HUB (EXTRA LARGE) */}
      <section className="min-h-screen flex flex-col items-center justify-center p-6 relative">
        <h1 className="relative z-20 text-7xl md:text-[11rem] font-black tracking-tighter text-center mb-32 leading-none uppercase">
          AJ SUPER <span className="text-cyan-400">PORTAL</span>
        </h1>

        <div className="relative z-10 grid grid-cols-2 gap-10 md:gap-28 w-full max-w-7xl">
          <div className="group bg-white/5 border-4 border-cyan-500/30 rounded-[3rem] p-12 h-80 md:h-[32rem] flex flex-col items-center justify-center hover:border-cyan-500 transition-all cursor-pointer shadow-2xl">
            <Trophy size={140} className="mb-8 text-cyan-400" />
            <h2 className="font-black text-4xl md:text-7xl uppercase">GAMING</h2>
          </div>

          <div onClick={() => setScreen('social')} className="group bg-white/5 border-4 border-pink-500/30 rounded-[3rem] p-12 h-80 md:h-[32rem] flex flex-col items-center justify-center hover:border-pink-500 transition-all cursor-pointer shadow-2xl">
            <Zap size={140} className="mb-8 text-pink-500" />
            <h2 className="font-black text-4xl md:text-7xl uppercase">SOCIAL</h2>
          </div>

          <div className="group bg-white/5 border-4 border-yellow-500/30 rounded-[3rem] p-12 h-80 md:h-[32rem] flex flex-col items-center justify-center hover:border-yellow-500 transition-all cursor-pointer shadow-2xl text-center">
            <img src="/coin.jpg" alt="Coin" className="w-48 h-48 object-contain mb-8" />
            <h2 className="font-black text-4xl md:text-7xl uppercase text-yellow-500">WALLET</h2>
          </div>

          <div className="group bg-white/5 border-4 border-green-500/30 rounded-[3rem] p-12 h-80 md:h-[32rem] flex flex-col items-center justify-center hover:border-green-500 transition-all cursor-pointer shadow-2xl">
            <Bot size={140} className="mb-8 text-green-400" />
            <h2 className="font-black text-4xl md:text-7xl uppercase tracking-tighter">AJ AI</h2>
          </div>

          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-64 h-64 md:w-[28rem] md:h-[28rem] bg-black border-[12px] border-cyan-500 rounded-full flex items-center justify-center shadow-[0_0_180px_rgba(6,182,212,0.9)] z-30">
              <span className="text-4xl md:text-8xl font-black text-white">HUB</span>
            </div>
          </div>
        </div>
      </section>

      {/* 4. THE FOUNDER (USING YOUR NEW IMAGE) */}
      <section className="py-32 bg-black flex justify-center px-6">
        <div className="max-w-6xl w-full">
           {/* Is image ke andar frame pehle se hai */}
           <img src="/founder_card.jpg" alt="Founder Card" className="w-full h-auto rounded-[2rem] border-2 border-white/10 shadow-[0_0_50px_rgba(34,211,238,0.2)]" />
        </div>
      </section>

      {/* 5. FOOTER */}
      <footer className="bg-black py-20 px-10 border-t border-white/5 text-center">
        <div className="flex flex-col items-center gap-12">
            <div className="text-7xl md:text-9xl font-black italic tracking-tighter opacity-20">AJ STUDIO</div>
            <div className="flex gap-16">
               <a href="https://wa.me/96878994093" target="_blank" className="text-green-500 hover:scale-125 transition-all"><MessageCircle size={60}/></a>
               <a href="https://x.com/Ali20352061" target="_blank" className="text-white hover:scale-125 transition-all"><Zap size={60}/></a>
            </div>
            <p className="text-gray-600 font-mono tracking-[1em] uppercase text-xs">Muscat, Sultanate of Oman</p>
        </div>
      </footer>
    </main>
  );
}