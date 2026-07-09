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
            setTimeout(() => setScreen('auth'), 600);
            return 100;
          }
          return prev + 4;
        });
      }, 40);
    }
  }, [screen]);

  if (screen === 'splash') {
    return (
      <main className="min-h-screen bg-black flex flex-col items-center justify-center text-white relative overflow-hidden font-sans">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg h-96 bg-cyan-600/10 rounded-full blur-[120px]"></div>
        <div className="relative z-10 flex flex-col items-center">
          <div className="relative mb-12">
            <div className="w-32 h-32 border-4 border-cyan-500 rounded-full flex items-center justify-center animate-pulse shadow-[0_0_50px_#06b6d4]">
              <span className="text-6xl font-black italic">AJ</span>
            </div>
          </div>
          <h1 className="text-4xl md:text-6xl font-black tracking-[0.4em] text-white">WELCOME</h1>
          <div className="mt-12 w-64 h-1.5 bg-gray-900 rounded-full overflow-hidden border border-white/5">
            <div className="h-full bg-cyan-500 transition-all duration-300 shadow-[0_0_15px_#22d3ee]" style={{ width: `${loading}%` }}></div>
          </div>
        </div>
      </main>
    );
  }

  if (screen === 'auth') {
    return (
      <main className="min-h-screen bg-[#020617] flex flex-col items-center justify-center p-6 text-white relative font-sans overflow-hidden">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-cyan-500/5 rounded-full blur-[120px]"></div>
        <div className="w-full max-w-xl bg-white/[0.03] border border-white/10 p-12 md:p-16 rounded-[3rem] backdrop-blur-3xl shadow-2xl text-center z-10">
          <h2 className="text-6xl md:text-8xl font-black text-white tracking-tighter mb-4 uppercase">AJ <span className="text-cyan-400 font-thin">ID</span></h2>
          <p className="text-gray-400 text-lg md:text-xl font-bold tracking-widest mb-16 uppercase">Next-Gen Digital Empire</p>
          <button onClick={() => setScreen('hub')} className="w-full py-6 bg-white text-black font-black text-2xl rounded-2xl flex items-center justify-center gap-4 hover:bg-cyan-400 transition-all active:scale-95 shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
            LOGIN WITH GOOGLE
          </button>
          <div className="mt-10 text-yellow-500 font-black text-lg uppercase tracking-widest drop-shadow-[0_0_10px_#eab308]">+500 AJ COINS BONUS</div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#020617] text-white font-sans overflow-x-hidden">
      
      {/* HUB SECTION */}
      <section className="min-h-screen flex flex-col items-center justify-center p-4 relative">
        <div className="absolute top-1/4 left-1/4 w-full max-w-2xl h-[500px] bg-cyan-500/5 rounded-full blur-[150px]"></div>
        
        <h1 className="relative z-20 text-4xl md:text-9xl font-black tracking-[0.2em] text-center mb-16 md:mb-32 uppercase drop-shadow-[0_0_30px_#22d3ee]">
          AJ SUPER <span className="text-cyan-400 font-thin">PORTAL</span>
        </h1>

        <div className="relative z-10 grid grid-cols-2 gap-4 md:gap-24 w-full max-w-5xl px-2">
          {/* Gaming */}
          <div className="group bg-white/5 border-2 border-cyan-500/30 rounded-[2rem] p-6 md:p-12 h-52 md:h-80 flex flex-col items-center justify-center hover:border-cyan-500 transition-all cursor-pointer shadow-2xl relative">
            <Trophy className="mb-4 text-cyan-400 w-12 h-12 md:w-24 md:h-24 group-hover:scale-110 transition-transform" />
            <h2 className="font-black text-xs md:text-4xl uppercase">Gaming</h2>
          </div>

          {/* Social */}
          <div onClick={() => setScreen('social')} className="group bg-white/5 border-2 border-pink-500/30 rounded-[2rem] p-6 md:p-12 h-52 md:h-80 flex flex-col items-center justify-center hover:border-pink-500 transition-all cursor-pointer shadow-2xl relative">
            <Zap className="mb-4 text-pink-500 w-12 h-12 md:w-24 md:h-24 group-hover:scale-110 transition-transform" />
            <h2 className="font-black text-xs md:text-4xl uppercase">Social</h2>
          </div>

          {/* Wallet (Corrected Path) */}
          <div className="group bg-white/5 border-2 border-yellow-500/30 rounded-[2rem] p-6 md:p-12 h-52 md:h-80 flex flex-col items-center justify-center hover:border-yellow-400 transition-all cursor-pointer shadow-2xl relative">
            <img src="/gold.jpg" alt="Coin" className="w-16 h-16 md:w-48 md:h-48 object-contain mb-2 drop-shadow-[0_0_15px_#eab308]" />
            <h2 className="font-black text-xs md:text-4xl uppercase text-yellow-500">Wallet</h2>
          </div>

          {/* AI */}
          <div className="group bg-white/5 border-2 border-green-500/30 rounded-[2rem] p-6 md:p-12 h-52 md:h-80 flex flex-col items-center justify-center hover:border-green-500 transition-all cursor-pointer shadow-2xl relative">
            <Bot className="mb-4 text-green-400 w-12 h-12 md:w-24 md:h-24 group-hover:scale-110 transition-transform" />
            <h2 className="font-black text-xs md:text-4xl uppercase">AJ AI</h2>
          </div>

          {/* HUB Circle (Fixed Size for Mobile) */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-20 h-24 md:w-[26rem] md:h-[26rem] bg-black border-[3px] md:border-[12px] border-cyan-500 rounded-full flex items-center justify-center shadow-[0_0_100px_rgba(6,182,212,0.8)] z-30">
              <span className="text-[10px] md:text-8xl font-black text-white">HUB</span>
            </div>
          </div>
        </div>

        <div className="mt-12 md:mt-24 bg-white/5 px-6 py-4 rounded-full flex gap-4 md:gap-16 text-[8px] md:text-2xl font-black text-gray-500 uppercase tracking-widest backdrop-blur-md border border-white/5">
           <span>Play</span> <span className="text-cyan-500">➔</span> <span>Engage</span> <span className="text-cyan-500">➔</span> <span>Earn</span> <span className="text-cyan-500">➔</span> <span>Spend</span>
        </div>
      </section>

      {/* FOUNDER SECTION (Corrected Path) */}
      <section className="py-20 bg-black flex justify-center px-4 border-y border-white/5">
        <div className="max-w-6xl w-full">
           <img src="/founder_card.jpg" alt="Founder Card" className="w-full h-auto rounded-[2rem] shadow-2xl border border-white/10" />
        </div>
      </section>

      {/* FOOTER (Glowing & Functional) */}
      <footer className="bg-black pt-24 pb-12 px-8 border-t border-cyan-500/10">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-12">
          <div className="flex flex-col items-center md:items-start">
             <div className="text-6xl md:text-8xl font-black italic tracking-tighter text-white">
                AJ <span className="text-cyan-400 drop-shadow-[0_0_15px_#22d3ee]">STUDIO</span>
             </div>
             <p className="mt-4 text-xs text-gray-500 font-mono tracking-[0.5em] flex items-center gap-2 uppercase">
                <Globe size={12}/> Muscat, Sultanate of Oman
             </p>
          </div>
          <div className="flex flex-col items-center md:items-end gap-6">
            <span className="text-gray-500 text-sm font-bold border-b border-white/10 pb-1">ajcreatorstudio.hq@gmail.com</span>
            <div className="flex gap-10 items-center">
               <a href="https://wa.me/96878994093" target="_blank" className="text-green-500 hover:scale-125 transition-all"><MessageCircle size={50}/></a>
               <a href="https://www.instagram.com/innocent.a.jutt" target="_blank" className="text-pink-500 hover:scale-125 transition-all"><Instagram size={50}/></a>
               <a href="https://x.com/Ali20352061" target="_blank" className="text-white hover:scale-125 transition-all"><X size={50}/></a>
            </div>
          </div>
        </div>
        <p className="text-center text-[10px] text-gray-800 mt-24 uppercase tracking-[2em] font-black opacity-30">Establishing Sovereignty</p>
      </footer>

      {/* SOCIAL OVERLAY */}
      {screen === 'social' && (
        <div className="fixed inset-0 z-50 bg-black flex flex-col items-center p-8 overflow-y-auto animate-in fade-in duration-300">
           <button onClick={() => setScreen('hub')} className="self-start text-cyan-400 font-black text-lg mb-12 flex items-center gap-2">
             <ChevronRight className="rotate-180" /> BACK TO HUB
           </button>
           <h2 className="text-5xl font-black mb-16 tracking-tighter uppercase text-white">AJ Social</h2>
           <div className="flex flex-col gap-6 w-full max-w-md">
             {['AJ TikReels', 'AJ Pulse', 'AJ Live Chat'].map((module, i) => (
               <div key={module} className="flex items-center justify-between bg-white/5 border-2 border-white/10 p-8 rounded-[2rem] hover:border-pink-500 transition-all cursor-pointer group shadow-lg">
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