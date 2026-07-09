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
      <main className="min-h-screen bg-black flex flex-col items-center justify-center text-white">
        <div className="relative mb-12">
          <div className="w-40 h-40 border-8 border-cyan-500 rounded-full animate-pulse shadow-[0_0_50px_#06b6d4]"></div>
          <div className="absolute inset-0 flex items-center justify-center text-8xl font-black italic">AJ</div>
        </div>
        <h1 className="text-5xl font-black tracking-[0.5em]">WELCOME</h1>
      </main>
    );
  }

  if (screen === 'auth') {
    return (
      <main className="min-h-screen bg-[#020617] flex flex-col items-center justify-center p-8 text-white text-center">
        <h2 className="text-8xl font-black mb-6 uppercase tracking-tighter">AJ <span className="text-cyan-400 font-thin">ID</span></h2>
        <p className="text-gray-500 mb-16 tracking-[0.3em] text-2xl font-bold">DIGITAL EMPIRE ACCESS</p>
        <button onClick={() => setScreen('hub')} className="w-full max-w-lg py-8 bg-white text-black font-black text-3xl rounded-3xl hover:bg-cyan-400 transition-all active:scale-95 shadow-2xl">
          LOGIN WITH GOOGLE
        </button>
        <div className="mt-12 text-yellow-500 font-black text-2xl uppercase tracking-widest">+500 AJ COINS BONUS</div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#020617] text-white font-sans overflow-x-hidden">
      
      {/* 3. MAIN HUB (EXTRA LARGE) */}
      <section className="min-h-screen flex flex-col items-center justify-center p-4 relative">
        <div className="absolute top-1/4 left-1/4 w-[600px] h-[600px] bg-cyan-500/5 rounded-full blur-[150px]"></div>
        
        <h1 className="relative z-20 text-6xl md:text-[11rem] font-black tracking-tighter text-center mb-24 md:mb-40 uppercase drop-shadow-[0_0_30px_#22d3ee]">
          AJ SUPER PORTAL
        </h1>

        <div className="relative z-10 grid grid-cols-2 gap-6 md:gap-32 w-full max-w-7xl px-4">
          <div className="group bg-white/5 border-4 border-cyan-500/30 rounded-[3rem] p-10 h-64 md:h-[32rem] flex flex-col items-center justify-center hover:border-cyan-500 transition-all cursor-pointer shadow-2xl relative">
            <Trophy size={120} className="mb-6 text-cyan-400" />
            <h2 className="font-black text-xl md:text-7xl uppercase">Gaming</h2>
          </div>

          <div onClick={() => setScreen('social')} className="group bg-white/5 border-4 border-pink-500/30 rounded-[3rem] p-10 h-64 md:h-[32rem] flex flex-col items-center justify-center hover:border-pink-500 transition-all cursor-pointer shadow-2xl relative">
            <Zap size={120} className="mb-6 text-pink-500" />
            <h2 className="font-black text-xl md:text-7xl uppercase">Social</h2>
          </div>

          <div className="group bg-white/5 border-4 border-yellow-500/30 rounded-[3rem] p-10 h-64 md:h-[32rem] flex flex-col items-center justify-center hover:border-yellow-400 transition-all cursor-pointer shadow-2xl relative">
            <img src="/gold.jpg" alt="Coin" className="w-28 h-28 md:w-64 md:h-64 object-contain mb-4" />
            <h2 className="font-black text-xl md:text-7xl uppercase text-yellow-500">Wallet</h2>
          </div>

          <div className="group bg-white/5 border-4 border-green-500/30 rounded-[3rem] p-10 h-64 md:h-[32rem] flex flex-col items-center justify-center hover:border-green-500 transition-all cursor-pointer shadow-2xl relative">
            <Bot size={120} className="mb-6 text-green-400" />
            <h2 className="font-black text-xl md:text-7xl uppercase">AJ AI</h2>
          </div>

          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-32 h-32 md:w-[32rem] md:h-[32rem] bg-black border-[4px] md:border-[16px] border-cyan-500 rounded-full flex items-center justify-center shadow-[0_0_150px_rgba(6,182,212,0.8)] z-30">
              <span className="text-xl md:text-[6rem] font-black text-white tracking-tighter">HUB</span>
            </div>
          </div>
        </div>
      </section>

      {/* 4. FOUNDER SECTION */}
      <section className="py-24 bg-black flex justify-center px-6 border-y-8 border-white/5">
        <div className="max-w-6xl w-full">
           <img src="/ali.jpg" alt="Founder" className="w-full h-auto rounded-[3rem] shadow-[0_0_80px_rgba(0,0,0,1)] border-4 border-white/5" />
        </div>
      </section>

      {/* 5. FOOTER */}
      <footer className="bg-black pt-32 pb-16 px-10 border-t-2 border-cyan-500/20 text-center md:text-left">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-16">
          <div className="flex flex-col items-center md:items-start text-white">
             <div className="text-7xl md:text-[10rem] font-black italic tracking-tighter">
                AJ <span className="text-cyan-400 drop-shadow-[0_0_20px_#06b6d4]">STUDIO</span>
             </div>
             <p className="mt-4 text-sm text-gray-600 font-mono tracking-[0.5em] flex items-center gap-4 uppercase">
                <Globe size={20}/> Muscat, Sultanate of Oman
             </p>
          </div>
          <div className="flex flex-col items-center md:items-end gap-10">
            <span className="text-gray-500 text-xl font-bold border-b-2 border-white/10 pb-2">ajcreatorstudio.hq@gmail.com</span>
            <div className="flex gap-14 items-center">
               <a href="https://wa.me/96878994093" target="_blank" className="text-green-500 hover:scale-150 transition-all"><MessageCircle size={70}/></a>
               <a href="https://www.instagram.com/innocent.a.jutt" target="_blank" className="text-pink-500 hover:scale-150 transition-all"><Instagram size={70}/></a>
               <a href="https://x.com/Ali20352061" target="_blank" className="text-white hover:scale-150 transition-all"><Twitter size={70}/></a>
            </div>
          </div>
        </div>
        <p className="text-center text-[10px] text-gray-800 mt-32 uppercase tracking-[2.5em] font-black opacity-30">Establishing Sovereignty</p>
      </footer>
    </main>
  );
}