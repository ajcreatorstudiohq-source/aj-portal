"use client";
import React, { useState, useEffect } from 'react';
import { MessageCircle, Trophy, Zap, Wallet, Bot, ChevronRight, X } from 'lucide-react';

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
        <div className="w-24 h-24 border-4 border-cyan-500 rounded-full flex items-center justify-center animate-pulse shadow-[0_0_40px_#06b6d4]">
          <span className="text-4xl font-black italic">AJ</span>
        </div>
        <h1 className="mt-8 text-3xl font-black tracking-[0.4em]">WELCOME</h1>
      </main>
    );
  }

  if (screen === 'auth') {
    return (
      <main className="min-h-screen bg-[#020617] flex flex-col items-center justify-center p-6 text-white text-center">
        <h2 className="text-7xl font-black mb-4 uppercase tracking-tighter">AJ <span className="text-cyan-400 font-thin">ID</span></h2>
        <p className="text-gray-500 mb-16 tracking-widest text-lg font-bold">DIGITAL EMPIRE ACCESS</p>
        <button onClick={() => setScreen('hub')} className="w-full max-w-sm py-6 bg-white text-black font-black text-2xl rounded-2xl hover:bg-cyan-400 transition-all active:scale-95 shadow-2xl">
          CONTINUE WITH GOOGLE
        </button>
        <div className="mt-10 text-yellow-500 font-black text-xl uppercase tracking-widest">+500 AJ COINS BONUS</div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#020617] text-white font-sans overflow-x-hidden">
      
      {/* 3. MAIN HUB (RESPONSIVE FIX) */}
      <section className="min-h-screen flex flex-col items-center justify-center p-4 relative">
        <div className="absolute top-1/4 left-1/4 w-full max-w-2xl h-[500px] bg-cyan-500/5 rounded-full blur-[150px]"></div>
        
        <h1 className="relative z-20 text-5xl md:text-9xl font-black tracking-tighter text-center mb-20 md:mb-32 uppercase drop-shadow-[0_0_20px_#22d3ee]">
          AJ SUPER PORTAL
        </h1>

        <div className="relative z-10 grid grid-cols-2 gap-4 md:gap-24 w-full max-w-5xl px-2">
          {/* Gaming */}
          <div className="group bg-white/5 border-2 border-cyan-500/30 rounded-[2rem] p-6 h-56 md:h-80 flex flex-col items-center justify-center hover:border-cyan-500 transition-all cursor-pointer shadow-2xl relative">
            <Trophy className="mb-4 text-cyan-400 w-12 h-12 md:w-32 md:h-32" />
            <h2 className="font-black text-sm md:text-5xl uppercase">Gaming</h2>
          </div>

          {/* Social */}
          <div onClick={() => setScreen('social')} className="group bg-white/5 border-2 border-pink-500/30 rounded-[2rem] p-6 h-56 md:h-80 flex flex-col items-center justify-center hover:border-pink-500 transition-all cursor-pointer shadow-2xl relative">
            <Zap className="mb-4 text-pink-500 w-12 h-12 md:w-32 md:h-32" />
            <h2 className="font-black text-sm md:text-5xl uppercase">Social</h2>
          </div>

          {/* Wallet (Image Path Fixed) */}
          <div className="group bg-white/5 border-2 border-yellow-500/30 rounded-[2rem] p-6 h-56 md:h-80 flex flex-col items-center justify-center hover:border-yellow-400 transition-all cursor-pointer shadow-2xl relative">
            <img src="/coin.jpg" alt="Coin" className="w-16 h-16 md:w-56 md:h-56 object-contain mb-4" />
            <h2 className="font-black text-sm md:text-5xl uppercase text-yellow-500">Wallet</h2>
          </div>

          {/* AI */}
          <div className="group bg-white/5 border-2 border-green-500/30 rounded-[2rem] p-6 h-56 md:h-80 flex flex-col items-center justify-center hover:border-green-500 transition-all cursor-pointer shadow-2xl relative">
            <Bot className="mb-4 text-green-400 w-12 h-12 md:w-32 md:h-32" />
            <h2 className="font-black text-sm md:text-5xl uppercase">AJ AI</h2>
          </div>

          {/* CENTRAL HUB (Fixed Size for Mobile) */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-20 h-20 md:w-[26rem] md:h-[26rem] bg-black border-[3px] md:border-[12px] border-cyan-500 rounded-full flex items-center justify-center shadow-[0_0_100px_rgba(6,182,212,0.8)] z-30">
              <span className="text-[10px] md:text-8xl font-black text-white">HUB</span>
            </div>
          </div>
        </div>
      </section>

      {/* 4. FOUNDER SECTION (Image Path Fixed) */}
      <section className="py-20 bg-black flex justify-center px-4 border-y border-white/5">
        <div className="max-w-6xl w-full">
           <img src="/founder.jpg" alt="Founder Card" className="w-full h-auto rounded-[2rem] shadow-2xl border border-white/10" />
        </div>
      </section>

      {/* 5. FOOTER */}
      <footer className="bg-black pt-24 pb-12 px-8 border-t border-cyan-500/10 text-center">
        <div className="text-6xl md:text-[10rem] font-black italic tracking-tighter text-white">
          AJ <span className="text-cyan-400 drop-shadow-[0_0_20px_#06b6d4]">STUDIO</span>
        </div>
        <div className="flex justify-center gap-12 mt-12">
            <a href="https://wa.me/96878994093" target="_blank" className="text-green-500 hover:scale-125 transition-all"><MessageCircle size={60}/></a>
            <a href="https://www.instagram.com/innocent.a.jutt" target="_blank" className="text-pink-500 hover:scale-125 transition-all"><Instagram size={60}/></a>
            <a href="https://x.com/Ali20352061" target="_blank" className="text-white hover:scale-125 transition-all"><X size={60}/></a>
        </div>
        <p className="mt-16 text-gray-800 font-black tracking-[1.5em] text-[10px]">ESTABLISHING SOVEREIGNTY</p>
      </footer>
    </main>
  );
}