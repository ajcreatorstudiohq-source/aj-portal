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
          return prev + 4;
        });
      }, 40);
    }
  }, [screen]);

  // --- 1. VVIP NEON SPLASH SCREEN ---
  if (screen === 'splash') {
    return (
      <main className="min-h-screen bg-[#000] flex flex-col items-center justify-center text-white relative overflow-hidden">
        {/* Deep Neon Background Orbs */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-cyan-600/10 rounded-full blur-[160px]"></div>
        
        <div className="relative z-10 flex flex-col items-center">
          <div className="relative mb-12">
            <div className="w-40 h-40 border-2 border-cyan-500/30 rounded-full animate-ping opacity-20"></div>
            <div className="absolute inset-0 flex items-center justify-center text-7xl font-black text-white tracking-tighter drop-shadow-[0_0_30px_rgba(34,211,238,0.8)]">
              AJ
            </div>
          </div>
          
          <h1 className="text-4xl md:text-6xl font-black tracking-[0.6em] text-white drop-shadow-2xl">
            WELCOME
          </h1>
          
          <div className="mt-16 w-80 h-1.5 bg-gray-900 rounded-full overflow-hidden border border-white/5 shadow-inner">
            <div className="h-full bg-gradient-to-r from-cyan-600 to-cyan-400 transition-all duration-300 shadow-[0_0_20px_#22d3ee]" style={{ width: `${loading}%` }}></div>
          </div>
          <p className="mt-8 text-xs text-cyan-500/50 font-mono tracking-[0.5em] uppercase animate-pulse">Establishing Sovereignty</p>
        </div>
      </main>
    );
  }

  // --- 2. PROFESSIONAL AUTH / LOGIN ---
  if (screen === 'auth') {
    return (
      <main className="min-h-screen bg-[#020617] flex flex-col items-center justify-center p-6 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-cyan-500/5 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-pink-500/5 rounded-full blur-[120px]"></div>

        <div className="w-full max-w-xl bg-white/[0.03] border border-white/10 p-16 rounded-[3.5rem] backdrop-blur-3xl shadow-[0_0_100px_rgba(0,0,0,1)] relative z-10">
          <div className="text-center mb-16">
            <h2 className="text-6xl md:text-7xl font-black text-white tracking-tighter uppercase mb-4 drop-shadow-lg">
              AJ <span className="text-cyan-400">ID</span>
            </h2>
            <p className="text-gray-500 text-xl font-light tracking-widest">NEXT-GEN DIGITAL ECOSYSTEM</p>
          </div>
          
          <div className="bg-gradient-to-b from-cyan-500/10 to-transparent border-t border-cyan-500/20 p-8 rounded-3xl mb-12 text-center">
            <span className="text-yellow-400 font-black text-2xl tracking-tight">BONUS: 500 AJ COINS</span>
            <p className="text-gray-400 text-xs mt-2 uppercase tracking-[0.2em]">Available for new citizens only</p>
          </div>

          <button 
            onClick={() => setScreen('hub')}
            className="w-full py-6 bg-white text-black font-black text-2xl rounded-2xl flex items-center justify-center gap-4 hover:bg-cyan-400 transition-all duration-300 transform active:scale-95 shadow-[0_30px_60px_rgba(0,0,0,0.5)]"
          >
            CONTINUE WITH GOOGLE
          </button>

          <div className="mt-10">
             <input type="text" placeholder="ENTER REFERRAL CODE" className="w-full bg-transparent border-b-2 border-white/10 p-4 text-xl outline-none focus:border-cyan-400 text-center text-white font-bold placeholder:text-gray-700 transition-all" />
          </div>

          <p className="mt-12 text-center text-[10px] text-gray-700 font-bold uppercase tracking-[0.3em]">
            Muscat • Barka • Islamabad
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#020617] text-white font-sans overflow-x-hidden">
      
      {/* 3. MAIN HUB SECTION (ENLARGED) */}
      <section className="min-h-screen flex flex-col items-center justify-center p-4 relative border-b border-white/5">
        <div className="absolute top-1/4 left-1/4 w-[600px] h-[600px] bg-cyan-500/10 rounded-full blur-[150px] animate-pulse"></div>
        <h1 className="relative z-20 text-5xl md:text-9xl font-black tracking-[0.3em] text-center mb-24 uppercase drop-shadow-[0_0_30px_rgba(34,211,238,0.4)]">
          AJ SUPER <span className="text-cyan-400 font-thin">PORTAL</span>
        </h1>

        <div className="relative z-10 grid grid-cols-2 gap-8 md:gap-24 w-full max-w-5xl px-4">
          {/* AJ Gaming */}
          <div className="group bg-white/5 border-2 border-cyan-500/30 rounded-[2.5rem] p-10 h-64 md:h-80 flex flex-col items-center justify-center hover:border-cyan-500 transition-all cursor-pointer backdrop-blur-xl hover:-translate-y-2 shadow-2xl relative">
            <Trophy size={80} className="mb-6 text-cyan-400 group-hover:scale-125 transition-transform duration-500" />
            <h2 className="font-black text-xl md:text-4xl uppercase tracking-tighter">AJ Gaming</h2>
          </div>

          {/* AJ Social */}
          <div onClick={() => setScreen('social')} className="group bg-white/5 border-2 border-pink-500/30 rounded-[2.5rem] p-10 h-64 md:h-80 flex flex-col items-center justify-center hover:border-pink-400 transition-all cursor-pointer backdrop-blur-xl hover:-translate-y-2 shadow-2xl relative">
            <Zap size={80} className="mb-6 text-pink-500 group-hover:scale-125 transition-transform duration-500" />
            <h2 className="font-black text-xl md:text-4xl uppercase tracking-tighter">AJ Social</h2>
          </div>

          {/* AJ Coin */}
          <div className="group bg-white/5 border-2 border-yellow-500/30 rounded-[2.5rem] p-10 h-64 md:h-80 flex flex-col items-center justify-center hover:border-yellow-400 transition-all cursor-pointer backdrop-blur-xl hover:-translate-y-2 shadow-2xl relative">
            <img src="/coin.jpg" alt="AJ Coin" className="w-32 h-32 md:w-48 md:h-40 object-contain mb-4 drop-shadow-[0_0_30px_rgba(234,179,8,0.6)] group-hover:rotate-12 transition-transform duration-500" />
            <h2 className="font-black text-xl md:text-4xl uppercase tracking-tighter text-yellow-500">AJ Coin</h2>
          </div>

          {/* AJ AI */}
          <div className="group bg-white/5 border-2 border-green-500/30 rounded-[2.5rem] p-10 h-64 md:h-80 flex flex-col items-center justify-center hover:border-green-400 transition-all cursor-pointer backdrop-blur-xl hover:-translate-y-2 shadow-2xl relative">
            <Bot size={80} className="mb-6 text-green-400 group-hover:scale-125 transition-transform duration-500" />
            <h2 className="font-black text-xl md:text-4xl uppercase tracking-tighter">AJ AI</h2>
          </div>

          {/* CENTRAL HUB */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-48 h-48 md:w-72 md:h-72 bg-black border-[6px] border-cyan-500 rounded-full flex items-center justify-center shadow-[0_0_120px_rgba(6,182,212,0.7)] z-30">
              <div className="text-center">
                <div className="text-[10px] md:text-sm text-cyan-400 font-black tracking-[0.5em] mb-2">MAIN</div>
                <div className="text-5xl md:text-8xl text-white font-black tracking-tighter">HUB</div>
              </div>
            </div>
            <div className="absolute w-60 h-60 md:w-[22rem] md:h-[22rem] border-2 border-dashed border-cyan-500/20 rounded-full animate-[spin_30s_linear_infinite]"></div>
          </div>
        </div>

        <div className="mt-28 bg-white/5 px-12 py-6 rounded-full flex gap-8 md:gap-16 text-xs md:text-2xl font-black text-gray-500 uppercase tracking-[0.5em] backdrop-blur-md border border-white/10 shadow-2xl">
           <span>Play</span> <span className="text-cyan-500">➔</span> <span>Engage</span> <span className="text-cyan-500">➔</span> <span>Earn</span> <span className="text-cyan-500">➔</span> <span>Spend</span>
        </div>
      </section>

      {/* 4. MEET THE FOUNDER (CLEAN VERSION) */}
      <section className="py-40 bg-black relative border-y border-white/5">
        <div className="max-w-6xl mx-auto px-10 flex flex-col md:flex-row items-center gap-24">
          <div className="relative group scale-125">
             <div className="absolute -inset-2 bg-gradient-to-r from-cyan-500 to-pink-500 rounded-3xl blur opacity-30 group-hover:opacity-60 transition duration-1000"></div>
             <div className="relative bg-[#050505] rounded-3xl p-2 border border-white/10 shadow-2xl overflow-hidden">
                <img src="/ali.jpg" alt="Ali Asim" className="w-80 h-[480px] object-cover rounded-2xl" />
             </div>
          </div>
          <div className="flex-1 text-center md:text-left">
            <h2 className="text-cyan-500 font-mono text-sm tracking-[1em] mb-8 uppercase font-black">Founder Identity</h2>
            <h3 className="text-6xl md:text-[7rem] font-black text-white mb-6 tracking-tighter uppercase leading-none">ALI ASIM</h3>
            <h4 className="text-3xl md:text-5xl font-thin text-cyan-400 uppercase tracking-[0.2em]">Chief Executive Officer</h4>
            <div className="h-2 w-48 bg-cyan-500 mt-12 mx-auto md:mx-0"></div>
          </div>
        </div>
      </section>

      {/* 5. SOCIAL SUB-MODULES */}
      {screen === 'social' && (
        <div className="fixed inset-0 z-50 bg-black flex flex-col items-center p-12 overflow-y-auto animate-in fade-in zoom-in duration-500">
           <button onClick={() => setScreen('hub')} className="self-start text-cyan-400 font-black text-xl mb-16 flex items-center gap-4 hover:text-white transition-colors">
             <ChevronRight className="rotate-180" size={32}/> BACK TO HUB
           </button>
           <h2 className="text-7xl font-black mb-24 tracking-tighter uppercase text-white">AJ SOCIAL <span className="text-pink-500 font-thin italic text-5xl">Network</span></h2>
           <div className="flex flex-col gap-8 w-full max-w-2xl">
             {[
               { name: 'AJ TikReels', icon: '🚀', desc: 'Watch, Scroll, and Go Live' },
               { name: 'AJ Pulse', icon: '⚡', desc: 'Posts, Stories & Global Friends' },
               { name: 'AJ Live Chat', icon: '🔴', desc: 'Real-time Gifting & Streaming' }
             ].map((module) => (
               <div key={module.name} className="flex items-center justify-between bg-white/[0.03] border-2 border-white/5 p-12 rounded-[2.5rem] hover:border-pink-500 transition-all cursor-pointer group shadow-2xl">
                  <div>
                    <h3 className="text-4xl font-black group-hover:text-pink-400 transition-colors uppercase tracking-tighter">{module.name}</h3>
                    <p className="text-gray-500 text-sm mt-2 uppercase tracking-[0.3em] font-bold">{module.desc}</p>
                  </div>
                  <span className="text-7xl transform group-hover:scale-125 transition-transform duration-500">{module.icon}</span>
               </div>
             ))}
           </div>
        </div>
      )}

      {/* 6. VVIP CYBERPUNK FOOTER */}
      <footer className="bg-black pt-32 pb-16 px-10 border-t border-cyan-500/20">
        <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-20 mb-32 text-white">
          <div>
            <h4 className="text-cyan-400 font-black mb-10 uppercase tracking-widest text-sm flex items-center gap-3"><LayoutGrid size={20}/> Gaming</h4>
            <ul className="space-y-6 text-xl text-gray-600 font-bold">
              <li className="hover:text-white transition-colors cursor-pointer">AJ Arcade</li>
              <li className="hover:text-white transition-colors cursor-pointer">Platforms</li>
              <li className="hover:text-white transition-colors cursor-pointer">Studio News</li>
            </ul>
          </div>
          <div>
            <h4 className="text-pink-500 font-black mb-10 uppercase tracking-widest text-sm flex items-center gap-3"><MessageCircle size={20}/> Social</h4>
            <ul className="space-y-6 text-xl text-gray-600 font-bold">
              <li className="hover:text-white transition-colors cursor-pointer">Community Hub</li>
              <li className="hover:text-white transition-colors cursor-pointer">Upcoming Events</li>
              <li className="hover:text-white transition-colors cursor-pointer">Creator Profiles</li>
            </ul>
          </div>
          <div>
            <h4 className="text-yellow-500 font-black mb-10 uppercase tracking-widest text-sm flex items-center gap-3"><Wallet size={20}/> Economy</h4>
            <ul className="space-y-6 text-xl text-gray-600 font-bold">
              <li className="hover:text-white transition-colors cursor-pointer">AJ Coins Wallet</li>
              <li className="hover:text-white transition-colors cursor-pointer">Digital Market</li>
              <li className="hover:text-white transition-colors cursor-pointer">Rewards</li>
            </ul>
          </div>
          <div>
            <h4 className="text-green-500 font-black mb-10 uppercase tracking-widest text-sm flex items-center gap-3"><Bot size={20}/> Support</h4>
            <ul className="space-y-6 text-xl text-gray-600 font-bold">
              <li className="hover:text-white transition-colors cursor-pointer">AI Help</li>
              <li className="hover:text-white transition-colors cursor-pointer">Privacy</li>
              <li className="hover:text-white transition-colors cursor-pointer">Contact</li>
            </ul>
          </div>
        </div>

        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center border-t border-white/5 pt-20 gap-12">
          <div className="flex items-center gap-10">
             <div className="text-5xl font-black tracking-tighter italic">AJ <span className="text-gray-800 font-thin uppercase tracking-[0.2em]">Studio</span></div>
             <div className="h-16 w-px bg-gray-900 hidden md:block"></div>
             <div className="flex flex-col">
                <span className="text-[10px] text-cyan-400 font-black uppercase tracking-[1em] mb-2 animate-pulse">Global Headquarters</span>
                <span className="text-xl text-gray-500 font-mono font-black">Muscat, Sultanate of Oman</span>
             </div>
          </div>
          
          <div className="flex flex-col items-center md:items-end gap-8">
            <span className="text-gray-500 text-lg font-black tracking-tighter">ajcreatorstudio.hq@gmail.com</span>
            <div className="flex gap-14 items-center">
               <a href="https://wa.me/96878994093" target="_blank" className="text-green-500 hover:scale-150 transition-all duration-500 drop-shadow-[0_0_20px_rgba(34,197,94,0.6)]"><MessageCircle size={45}/></a>
               <a href="https://www.instagram.com/innocent.a.jutt?igsh=MXV5dWwwZzUxNjlmNA==" target="_blank" className="text-pink-500 hover:scale-150 transition-all duration-500 drop-shadow-[0_0_20px_rgba(236,72,153,0.6)]"><Instagram size={45}/></a>
               <a href="https://x.com/Ali20352061" target="_blank" className="text-white hover:scale-150 transition-all duration-300 drop-shadow-[0_0_20px_rgba(255,255,255,0.6)]"><Twitter size={45}/></a>
               <a href="#" className="text-blue-500 hover:scale-150 transition-all duration-500 drop-shadow-[0_0_20px_rgba(59,130,246,0.6)]"><Linkedin size={45}/></a>
            </div>
          </div>
        </div>
        
        <p className="text-center text-[10px] text-gray-800 mt-32 uppercase tracking-[2em] font-black opacity-30">
          Establishing Sovereignty
        </p>
      </footer>
    </main>
  );
}