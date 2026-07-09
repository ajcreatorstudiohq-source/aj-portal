"use client";
import React, { useState, useEffect } from 'react';
import { MessageCircle, Trophy, Zap, Wallet, Bot, ChevronRight, Globe, Twitter, Instagram } from 'lucide-react';

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
      <main className="min-h-screen bg-black flex flex-col items-center justify-center text-white font-sans">
        <div className="relative mb-8">
          <div className="w-24 h-24 border-4 border-cyan-500 rounded-full animate-pulse shadow-[0_0_30px_#06b6d4]"></div>
          <div className="absolute inset-0 flex items-center justify-center text-5xl font-black italic">AJ</div>
        </div>
        <h1 className="text-3xl font-black tracking-[0.4em]">WELCOME</h1>
      </main>
    );
  }

  if (screen === 'auth') {
    return (
      <main className="min-h-screen bg-[#020617] flex flex-col items-center justify-center p-6 text-white text-center">
        <h2 className="text-6xl font-black mb-4 uppercase tracking-tighter">AJ <span className="text-cyan-400">ID</span></h2>
        <p className="text-gray-500 mb-12 tracking-widest text-sm font-bold uppercase">Digital Empire Access</p>
        <button onClick={() => setScreen('hub')} className="w-full max-w-sm py-5 bg-white text-black font-black text-xl rounded-2xl hover:bg-cyan-400 transition-all active:scale-95 shadow-2xl">
          CONTINUE WITH GOOGLE
        </button>
        <div className="mt-8 text-yellow-500 font-bold text-sm uppercase tracking-widest">+500 AJ COINS BONUS</div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#020617] text-white font-sans overflow-x-hidden">
      
      {/* HUB SECTION */}
      <section className="min-h-[100vh] flex flex-col items-center justify-center p-4 relative">
        <div className="absolute top-1/4 left-1/4 w-full max-w-2xl h-[500px] bg-cyan-500/5 rounded-full blur-[150px]"></div>
        
        <h1 className="relative z-20 text-4xl md:text-9xl font-black tracking-tighter text-center mb-16 md:mb-32 uppercase drop-shadow-[0_0_20px_#22d3ee]">
          AJ SUPER PORTAL
        </h1>

        <div className="relative z-10 grid grid-cols-2 gap-4 md:gap-24 w-full max-w-5xl px-2">
          {/* Gaming */}
          <div className="group bg-white/5 border border-white/10 rounded-[1.5rem] p-6 h-44 md:h-80 flex flex-col items-center justify-center hover:border-cyan-500 transition-all cursor-pointer shadow-xl">
            <Trophy className="mb-2 text-cyan-400 w-10 h-10 md:w-24 md:h-24" />
            <h2 className="font-black text-[10px] md:text-4xl uppercase">Gaming</h2>
          </div>

          {/* Social */}
          <div onClick={() => setScreen('social')} className="group bg-white/5 border border-white/10 rounded-[1.5rem] p-6 h-44 md:h-80 flex flex-col items-center justify-center hover:border-pink-500 transition-all cursor-pointer shadow-xl">
            <Zap className="mb-2 text-pink-500 w-10 h-10 md:w-24 md:h-24" />
            <h2 className="font-black text-[10px] md:text-4xl uppercase">Social</h2>
          </div>

          {/* Wallet */}
          <div className="group bg-white/5 border border-white/10 rounded-[1.5rem] p-6 h-44 md:h-80 flex flex-col items-center justify-center hover:border-yellow-500 transition-all cursor-pointer shadow-xl">
            <img src="/gold.jpg" alt="Coin" className="w-12 h-12 md:w-48 md:h-48 object-contain mb-2" />
            <h2 className="font-black text-[10px] md:text-4xl uppercase text-yellow-500">Wallet</h2>
          </div>

          {/* AI */}
          <div className="group bg-white/5 border border-white/10 rounded-[1.5rem] p-6 h-44 md:h-80 flex flex-col items-center justify-center hover:border-green-500 transition-all cursor-pointer shadow-xl">
            <Bot className="mb-2 text-green-400 w-10 h-10 md:w-24 md:h-24" />
            <h2 className="font-black text-[10px] md:text-4xl uppercase">AJ AI</h2>
          </div>

          {/* CENTRAL HUB (Fixed for Mobile Overlap) */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-16 h-16 md:w-72 md:h-72 bg-black border-2 md:border-8 border-cyan-500 rounded-full flex items-center justify-center shadow-[0_0_50px_rgba(6,182,212,0.6)] z-30">
              <span className="text-[8px] md:text-6xl font-black text-white">HUB</span>
            </div>
          </div>
        </div>
      </section>

      {/* FOUNDER SECTION */}
      <section className="py-20 bg-black flex justify-center px-4 border-y border-white/5 text-center">
        <div className="max-w-4xl w-full">
           <p className="text-cyan-500 font-mono text-xs tracking-widest mb-6">FOUNDER IDENTITY</p>
           <img src="/founder_card.jpg" alt="Ali Asim" className="w-full h-auto rounded-3xl shadow-2xl border border-white/10" />
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-black pt-24 pb-12 px-8 border-t border-cyan-500/10 text-center">
        <div className="max-w-7xl mx-auto flex flex-col items-center gap-12">
          <div className="text-6xl md:text-9xl font-black italic tracking-tighter text-white uppercase">
            AJ STUDIO
          </div>
          <div className="flex gap-12">
               <a href="https://wa.me/96878994093" target="_blank" className="text-green-500 hover:scale-125 transition-all"><MessageCircle size={40}/></a>
               <a href="https://www.instagram.com/innocent.a.jutt" target="_blank" className="text-pink-500 hover:scale-125 transition-all"><Instagram size={40}/></a>
               <a href="https://x.com/Ali20352061" target="_blank" className="text-white hover:scale-125 transition-all"><Twitter size={40}/></a>
          </div>
          <p className="text-gray-700 font-black tracking-[1.5em] text-[10px] uppercase">Establishing Sovereignty</p>
        </div>
      </footer>

      {/* SOCIAL SUB-MODULES */}
      {screen === 'social' && (
        <div className="fixed inset-0 z-50 bg-black flex flex-col items-center p-8 overflow-y-auto">
           <button onClick={() => setScreen('hub')} className="self-start text-cyan-400 font-bold mb-12 flex items-center gap-2">
             <ChevronRight className="rotate-180" /> BACK TO HUB
           </button>
           <h2 className="text-5xl font-black mb-16 uppercase text-white">AJ SOCIAL</h2>
           <div className="flex flex-col gap-6 w-full max-w-md">
             {['AJ TikReels', 'AJ Pulse', 'AJ Live Chat'].map((module, i) => (
               <div key={module} className="flex items-center justify-between bg-white/5 border border-white/10 p-8 rounded-[2rem] hover:border-pink-500 transition-all cursor-pointer group shadow-lg">
                  <h3 className="text-2xl font-black group-hover:text-pink-400 transition-colors uppercase">{module}</h3>
                  <span className="text-4xl">{i === 0 ? '🚀' : i === 1 ? '⚡' : '🔴'}</span>
               </div>
             ))}
           </div>
        </div>
      )}
    </main>
  );
}