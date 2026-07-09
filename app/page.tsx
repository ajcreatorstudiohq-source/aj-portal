"use client";
import React, { useState, useEffect } from 'react';
import { Instagram, Twitter, MessageCircle, Trophy, Zap, Wallet, Bot, ChevronRight, Globe, X } from 'lucide-react';

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

  // 1. NEON SPLASH
  if (screen === 'splash') {
    return (
      <main className="min-h-screen bg-black flex flex-col items-center justify-center text-white font-sans p-6">
        <div className="relative mb-10">
          <div className="w-32 h-32 md:w-48 md:h-48 border-4 border-cyan-500 rounded-full animate-pulse shadow-[0_0_50px_#06b6d4]"></div>
          <div className="absolute inset-0 flex items-center justify-center text-6xl md:text-8xl font-black italic">AJ</div>
        </div>
        <h1 className="text-4xl md:text-6xl font-black tracking-[0.4em]">WELCOME</h1>
      </main>
    );
  }

  // 2. PRO LOGIN
  if (screen === 'auth') {
    return (
      <main className="min-h-screen bg-[#020617] flex flex-col items-center justify-center p-6 text-white text-center font-sans">
        <h2 className="text-7xl md:text-9xl font-black mb-4 uppercase tracking-tighter">AJ <span className="text-cyan-400 font-thin">ID</span></h2>
        <p className="text-gray-500 mb-16 tracking-[0.3em] text-lg font-bold">DIGITAL EMPIRE ACCESS</p>
        <button onClick={() => setScreen('hub')} className="w-full max-w-md py-6 bg-white text-black font-black text-2xl rounded-3xl hover:bg-cyan-400 transition-all active:scale-95 shadow-2xl">
          CONTINUE WITH GOOGLE
        </button>
        <div className="mt-12 text-yellow-500 font-black text-xl uppercase tracking-widest">+500 AJ COINS BONUS UNLOCKED</div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#020617] text-white font-sans overflow-x-hidden">
      
      {/* 3. MAIN HUB SECTION */}
      <section className="min-h-screen flex flex-col items-center justify-center p-4 relative">
        <div className="absolute top-1/4 left-1/4 w-full max-w-2xl h-[500px] bg-cyan-500/5 rounded-full blur-[150px]"></div>
        
        <h1 className="relative z-20 text-4xl md:text-[10rem] font-black tracking-tighter text-center mb-16 md:mb-32 uppercase drop-shadow-[0_0_20px_#22d3ee] leading-none">
          AJ SUPER PORTAL
        </h1>

        {/* Responsive Grid Container */}
        <div className="relative z-10 w-full max-w-6xl px-4 flex items-center justify-center">
          
          <div className="grid grid-cols-2 gap-4 md:gap-24 w-full">
            {/* Gaming */}
            <div className="group bg-white/5 border-2 border-cyan-500/30 rounded-[2rem] p-6 h-56 md:h-[28rem] flex flex-col items-center justify-center hover:border-cyan-500 transition-all cursor-pointer shadow-2xl relative">
              <Trophy className="mb-4 text-cyan-400 w-12 h-12 md:w-32 md:h-32" />
              <h2 className="font-black text-sm md:text-5xl uppercase">Gaming</h2>
            </div>

            {/* Social */}
            <div onClick={() => setScreen('social')} className="group bg-white/5 border-2 border-pink-500/30 rounded-[2rem] p-6 h-56 md:h-[28rem] flex flex-col items-center justify-center hover:border-pink-500 transition-all cursor-pointer shadow-2xl relative">
              <Zap className="mb-4 text-pink-500 w-12 h-12 md:w-32 md:h-32" />
              <h2 className="font-black text-sm md:text-5xl uppercase">Social</h2>
            </div>

            {/* Wallet */}
            <div className="group bg-white/5 border-2 border-yellow-500/30 rounded-[2rem] p-6 h-56 md:h-[28rem] flex flex-col items-center justify-center hover:border-yellow-400 transition-all cursor-pointer shadow-2xl relative">
              <img src="/coin.jpg" alt="Coin" className="w-16 h-16 md:w-56 md:h-56 object-contain mb-4" />
              <h2 className="font-black text-sm md:text-5xl uppercase text-yellow-500 tracking-tighter">Wallet</h2>
            </div>

            {/* AI */}
            <div className="group bg-white/5 border-2 border-green-500/30 rounded-[2rem] p-6 h-56 md:h-[28rem] flex flex-col items-center justify-center hover:border-green-500 transition-all cursor-pointer shadow-2xl relative">
              <Bot className="mb-4 text-green-400 w-12 h-12 md:w-32 md:h-32" />
              <h2 className="font-black text-sm md:text-5xl uppercase">AJ AI</h2>
            </div>
          </div>

          {/* CENTRAL HUB (Scaled for Mobile) */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-20 h-20 md:w-[24rem] md:h-[24rem] bg-black border-[3px] md:border-[15px] border-cyan-500 rounded-full flex items-center justify-center shadow-[0_0_80px_rgba(6,182,212,0.8)] z-30">
              <span className="text-[10px] md:text-8xl font-black text-white">HUB</span>
            </div>
            <div className="absolute w-28 h-28 md:w-[30rem] md:h-[30rem] border-2 border-dashed border-cyan-500/20 rounded-full animate-[spin_20s_linear_infinite]"></div>
          </div>
        </div>
      </section>

      {/* 4. FOUNDER SECTION (USING YOUR IMAGE) */}
      <section className="py-20 bg-black flex flex-col items-center justify-center px-4 border-y-4 border-white/5">
        <p className="text-cyan-500 font-mono text-sm tracking-[1em] mb-10 font-bold">MEET THE FOUNDER</p>
        <div className="max-w-6xl w-full">
           <img src="/founder.jpg" alt="Founder Card" className="w-full h-auto rounded-[3rem] shadow-[0_0_100px_rgba(0,0,0,1)] border-2 border-white/10" />
        </div>
      </section>

      {/* 5. FOOTER */}
      <footer className="bg-black pt-32 pb-16 px-10 border-t border-cyan-500/10 text-center md:text-left">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-16">
          <div className="flex flex-col items-center md:items-start">
            <div className="text-7xl md:text-[10rem] font-black italic tracking-tighter text-white drop-shadow-[0_0_30px_rgba(255,255,255,0.1)]">
              AJ <span className="text-cyan-400 drop-shadow-[0_0_20px_#06b6d4]">STUDIO</span>
            </div>
            <p className="mt-6 text-xs text-gray-600 font-mono tracking-[0.5em] uppercase">Muscat, Sultanate of Oman</p>
          </div>
          
          <div className="flex flex-col items-center md:items-end gap-10">
            <span className="text-gray-500 text-xl font-bold border-b border-white/10 pb-2">ajcreatorstudio.hq@gmail.com</span>
            <div className="flex gap-12">
               <a href="https://wa.me/96878994093" target="_blank" className="text-green-500 hover:scale-125 transition-all"><MessageCircle size={70}/></a>
               <a href="https://www.instagram.com/innocent.a.jutt" target="_blank" className="text-pink-500 hover:scale-125 transition-all"><Instagram size={70}/></a>
               <a href="https://x.com/Ali20352061" target="_blank" className="text-white hover:scale-125 transition-all"><X size={70}/></a>
            </div>
          </div>
        </div>
        <p className="text-center text-[10px] text-gray-800 mt-32 uppercase tracking-[2em] font-black opacity-20">Establishing Sovereignty</p>
      </footer>

      {/* 6. SOCIAL OVERLAY */}
      {screen === 'social' && (
        <div className="fixed inset-0 z-50 bg-[#050505] flex flex-col items-center p-12 overflow-y-auto animate-in fade-in duration-300">
           <button onClick={() => setScreen('hub')} className="self-start text-cyan-400 font-black text-2xl mb-16 flex items-center gap-4 hover:text-white">
             <ChevronRight className="rotate-180" size={40} /> BACK TO HUB
           </button>
           <h2 className="text-6xl md:text-8xl font-black mb-20 tracking-tighter uppercase text-white">AJ SOCIAL</h2>
           <div className="flex flex-col gap-10 w-full max-w-2xl">
             {['AJ TikReels', 'AJ Pulse', 'AJ Live Chat'].map((module, i) => (
               <div key={module} className="flex items-center justify-between bg-white/[0.03] border-2 border-white/5 p-12 rounded-[3rem] hover:border-pink-500 transition-all cursor-pointer group shadow-2xl">
                  <h3 className="text-4xl font-black group-hover:text-pink-400 transition-colors uppercase">{module}</h3>
                  <span className="text-6xl">{i === 0 ? '🚀' : i === 1 ? '⚡' : '🔴'}</span>
               </div>
             ))}
           </div>
        </div>
      )}
    </main>
  );
}