"use client";
import React, { useState, useEffect } from 'react';
import { Instagram, Twitter, Linkedin, MessageCircle, ChevronRight, Globe, Zap, LayoutGrid, Trophy, Wallet, Bot } from 'lucide-react';

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
          return prev + 5;
        });
      }, 40);
    }
  }, [screen]);

  if (screen === 'splash') {
    return (
      <main className="min-h-screen bg-black flex flex-col items-center justify-center text-white p-4">
        <div className="relative mb-10">
          <div className="w-48 h-48 border-8 border-cyan-500 rounded-full animate-ping opacity-20"></div>
          <div className="absolute inset-0 flex items-center justify-center text-8xl font-black text-white drop-shadow-[0_0_30px_#22d3ee]">AJ</div>
        </div>
        <h1 className="text-5xl md:text-7xl font-black tracking-[0.4em] text-white text-center">WELCOME</h1>
        <div className="mt-20 w-full max-w-md h-3 bg-gray-900 rounded-full overflow-hidden border-2 border-white/10">
          <div className="h-full bg-gradient-to-r from-cyan-600 to-cyan-400" style={{ width: `${loading}%` }}></div>
        </div>
      </main>
    );
  }

  if (screen === 'auth') {
    return (
      <main className="min-h-screen bg-[#020617] flex flex-col items-center justify-center p-8 text-white">
        <div className="w-full max-w-2xl bg-white/[0.03] border-2 border-white/10 p-20 rounded-[4rem] backdrop-blur-3xl shadow-2xl text-center">
          <h2 className="text-7xl md:text-9xl font-black text-white tracking-tighter mb-6">AJ <span className="text-cyan-400">ID</span></h2>
          <p className="text-gray-400 text-2xl font-bold tracking-[0.3em] mb-16">GLOBAL ACCESS</p>
          
          <button onClick={() => setScreen('hub')} className="w-full py-8 bg-white text-black font-black text-3xl rounded-3xl hover:bg-cyan-400 transition-all active:scale-95 shadow-2xl">
            LOGIN WITH GOOGLE
          </button>
          
          <div className="mt-12 bg-yellow-500/10 p-6 rounded-2xl border border-yellow-500/20">
            <p className="text-yellow-400 font-black text-2xl">+500 AJ COINS BONUS</p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#020617] text-white font-sans overflow-x-hidden">
      
      {/* HUB SECTION (EXTRA LARGE) */}
      <section className="min-h-screen flex flex-col items-center justify-center p-6 relative">
        <h1 className="relative z-20 text-6xl md:text-[10rem] font-black tracking-tighter text-center mb-28 leading-none">
          AJ SUPER <br/> <span className="text-cyan-400">PORTAL</span>
        </h1>

        <div className="relative z-10 grid grid-cols-2 gap-10 md:gap-24 w-full max-w-6xl">
          <div className="group bg-white/5 border-4 border-cyan-500/30 rounded-[3rem] p-12 h-80 md:h-[28rem] flex flex-col items-center justify-center hover:border-cyan-500 transition-all cursor-pointer shadow-2xl">
            <Trophy size={120} className="mb-6 text-cyan-400" />
            <h2 className="font-black text-3xl md:text-6xl uppercase">GAMING</h2>
          </div>

          <div onClick={() => setScreen('social')} className="group bg-white/5 border-4 border-pink-500/30 rounded-[3rem] p-12 h-80 md:h-[28rem] flex flex-col items-center justify-center hover:border-pink-500 transition-all cursor-pointer shadow-2xl">
            <Zap size={120} className="mb-6 text-pink-500" />
            <h2 className="font-black text-3xl md:text-6xl uppercase">SOCIAL</h2>
          </div>

          <div className="group bg-white/5 border-4 border-yellow-500/30 rounded-[3rem] p-12 h-80 md:h-[28rem] flex flex-col items-center justify-center hover:border-yellow-500 transition-all cursor-pointer shadow-2xl">
            <img src="/gold.jpg" alt="Coin" className="w-40 h-40 object-contain mb-6" />
            <h2 className="font-black text-3xl md:text-6xl uppercase text-yellow-500">COIN</h2>
          </div>

          <div className="group bg-white/5 border-4 border-green-500/30 rounded-[3rem] p-12 h-80 md:h-[28rem] flex flex-col items-center justify-center hover:border-green-500 transition-all cursor-pointer shadow-2xl">
            <Bot size={120} className="mb-6 text-green-400" />
            <h2 className="font-black text-3xl md:text-6xl uppercase">AI</h2>
          </div>

          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-56 h-56 md:w-96 md:h-96 bg-black border-[10px] border-cyan-500 rounded-full flex items-center justify-center shadow-[0_0_150px_rgba(6,182,212,0.8)] z-30">
              <span className="text-3xl md:text-6xl font-black text-white">HUB</span>
            </div>
          </div>
        </div>
      </section>

      {/* FOUNDER SECTION (MESSAGE REMOVED) */}
      <section className="py-40 bg-black border-y-8 border-white/5">
        <div className="max-w-7xl mx-auto px-10 flex flex-col md:flex-row items-center gap-24">
          <div className="relative group scale-125">
             <div className="absolute -inset-4 bg-gradient-to-r from-cyan-500 to-pink-500 rounded-[3rem] blur-2xl opacity-40"></div>
             <img src="/ali.jpg" alt="Ali" className="relative w-[400px] h-[550px] object-cover rounded-[3rem] border-4 border-white/10 shadow-2xl" />
          </div>
          <div className="flex-1 text-center md:text-left">
            <h2 className="text-cyan-500 font-mono text-xl tracking-[1em] mb-6 uppercase font-black">Founder</h2>
            <h3 className="text-7xl md:text-[10rem] font-black text-white leading-none tracking-tighter uppercase mb-4">ALI ASIM</h3>
            <h4 className="text-4xl md:text-6xl font-thin text-cyan-400 uppercase tracking-widest">Chief Executive Officer</h4>
          </div>
        </div>
      </section>

      {/* FOOTER (VVIP) */}
      <footer className="bg-black pt-40 pb-20 px-10 border-t-2 border-cyan-500/20">
         <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-20">
            <div className="text-8xl font-black italic tracking-tighter">AJ <span className="text-gray-800">STUDIO</span></div>
            <div className="flex gap-20">
               <a href="https://wa.me/96878994093" target="_blank" className="text-green-500 hover:scale-150 transition-all"><MessageCircle size={80}/></a>
               <a href="https://www.instagram.com/innocent.a.jutt" target="_blank" className="text-pink-500 hover:scale-150 transition-all"><Instagram size={80}/></a>
               <a href="https://x.com/Ali20352061" target="_blank" className="text-white hover:scale-150 transition-all"><Twitter size={80}/></a>
            </div>
         </div>
      </footer>
    </main>
  );
}