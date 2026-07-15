"use client";
import React, { useState, useEffect } from 'react';
import { auth, db, googleProvider } from '../firebaseConfig';
import { signInWithPopup, onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, setDoc, onSnapshot, updateDoc, increment, collection, addDoc, getDoc, serverTimestamp, query, orderBy, limit } from 'firebase/firestore';
import { Trophy, Zap, Bot, Download, Activity, Send, MessageCircle, Copy, CheckCircle2, Video, Newspaper, Users, Heart, MessageSquare } from 'lucide-react';

// ... (Baaki configurations same rahengi) ...

export default function AJSuperPortal() {
  const [screen, setScreen] = useState('splash');
  const [socialScreen, setSocialScreen] = useState('hub'); // 'hub', 'tikreels', 'pulse', 'chat', 'discover'
  const [user, setUser] = useState(null);
  const [balance, setBalance] = useState(0);
  const [botTier, setBotTier] = useState('none');
  const [invested, setInvested] = useState(0);
  const [visualProfit, setVisualProfit] = useState(0);

  // 100 Coins = $1 Logic
  const displayBalance = (balance + visualProfit).toFixed(2);
  const displayUsdt = ((balance + visualProfit) / 100).toFixed(2);

  // ... (Baaki useEffects aur AI Bot logic same rahengi) ...

  return (
    <main className="min-h-screen bg-[#020617] text-white font-sans overflow-x-hidden relative">
      {/* HEADER (Same as original) */}
      <header className="fixed top-0 w-full p-4 flex justify-between items-center z-[100] bg-black/80 backdrop-blur-xl border-b border-white/5">
        <div className="text-xl font-black text-cyan-400 italic">AJ STUDIO</div>
        <div className="flex items-center gap-3">
          <div onClick={() => setScreen('wallet')} className="flex items-center gap-3 bg-white/5 px-4 py-2 rounded-full border border-white/10 cursor-pointer">
            <span className="text-xs font-black text-yellow-500">{displayBalance} 🪙</span>
            <span className="text-[10px] text-green-400 font-bold">${displayUsdt}</span>
          </div>
          <button onClick={() => signOut(auth)} className="p-2 bg-red-500/10 text-red-500 font-bold text-[8px] rounded-full uppercase">Exit</button>
        </div>
      </header>

      {/* HUB SECTION (Main Screen) */}
      {screen === 'hub' && (
          <section className="min-h-screen flex flex-col items-center justify-center p-4 pt-24">
            <h1 className="text-4xl md:text-8xl font-black text-center mb-12 uppercase drop-shadow-[0_0_20px_#22d3ee]">AJ SUPER PORTAL</h1>
            <div className="grid grid-cols-2 gap-4 md:gap-16 w-full max-w-4xl">
              <div onClick={() => setScreen('arcade')} className="bg-white/5 border border-white/10 rounded-3xl h-48 flex flex-col items-center justify-center cursor-pointer shadow-xl active:scale-95 transition-all"><Trophy className="text-cyan-400 w-10 h-10 mb-2" /><span className="font-black text-xs md:text-3xl uppercase">Gaming</span></div>
              <div onClick={() => {setScreen('social'); setSocialScreen('hub');}} className="bg-white/5 border border-white/10 rounded-3xl h-48 flex flex-col items-center justify-center cursor-pointer shadow-xl active:scale-95 transition-all hover:border-pink-500"><Zap className="text-pink-500 w-10 h-10 mb-2" /><span className="font-black text-xs md:text-3xl uppercase">Social</span></div>
              <div onClick={() => setScreen('wallet')} className="bg-white/5 border-2 border-yellow-500/30 rounded-3xl h-48 flex flex-col items-center justify-center cursor-pointer shadow-xl active:scale-95 transition-all"><img src="/gold.jpg" className="w-14 h-14 mb-2" /><h2 className="font-black text-xs md:text-3xl uppercase text-yellow-500">Wallet</h2></div>
              <div onClick={() => setScreen('ai')} className="bg-white/5 border border-white/10 rounded-3xl h-48 flex flex-col items-center justify-center cursor-pointer shadow-xl active:scale-95 transition-all hover:border-green-500"><Bot className="text-green-400 w-10 h-10 mb-2" /><span className="font-black text-xs md:text-3xl uppercase">AJ AI</span></div>
            </div>
          </section>
      )}

      {/* --- PHASE 2: SOCIAL HUB SECTION --- */}
      {screen === 'social' && (
        <div className="fixed inset-0 z-[400] bg-[#020617] overflow-y-auto">
          {/* Social Top Bar */}
          <div className="sticky top-0 w-full p-4 bg-black/90 backdrop-blur-md border-b border-white/5 flex justify-between items-center z-[500]">
            <button onClick={() => setScreen('hub')} className="text-cyan-400 font-bold text-xs">← HUB</button>
            <h2 className="text-xl font-black italic text-pink-500">SOCIAL HUB</h2>
            <div className="w-10"></div>
          </div>

          {/* Social Sub-Screens */}
          {socialScreen === 'hub' && (
            <div className="p-6 grid grid-cols-1 gap-6 max-w-lg mx-auto pb-24">
                <div onClick={() => setSocialScreen('tikreels')} className="p-8 bg-gradient-to-br from-pink-600/20 to-purple-600/20 border border-white/10 rounded-[2.5rem] text-center cursor-pointer active:scale-95 transition-all">
                    <Video className="mx-auto text-pink-500 mb-4" size={40} />
                    <h3 className="text-2xl font-black">AJ TIKREELS</h3>
                    <p className="text-[10px] text-gray-400 uppercase tracking-widest mt-2">Short Video & Live</p>
                </div>
                <div onClick={() => setSocialScreen('pulse')} className="p-8 bg-gradient-to-br from-cyan-600/20 to-blue-600/20 border border-white/10 rounded-[2.5rem] text-center cursor-pointer active:scale-95 transition-all">
                    <Users className="mx-auto text-cyan-400 mb-4" size={40} />
                    <h3 className="text-2xl font-black">AJ PULSE</h3>
                    <p className="text-[10px] text-gray-400 uppercase tracking-widest mt-2">Community Feed & Pics</p>
                </div>
                <div onClick={() => setSocialScreen('chat')} className="p-8 bg-gradient-to-br from-green-600/20 to-emerald-600/20 border border-white/10 rounded-[2.5rem] text-center cursor-pointer active:scale-95 transition-all">
                    <MessageCircle className="mx-auto text-green-500 mb-4" size={40} />
                    <h3 className="text-2xl font-black">AJ LIVE CHAT</h3>
                    <p className="text-[10px] text-gray-400 uppercase tracking-widest mt-2">WhatsApp Style Messaging</p>
                </div>
                <div onClick={() => setSocialScreen('discover')} className="p-8 bg-gradient-to-br from-yellow-600/20 to-orange-600/20 border border-white/10 rounded-[2.5rem] text-center cursor-pointer active:scale-95 transition-all">
                    <Newspaper className="mx-auto text-yellow-500 mb-4" size={40} />
                    <h3 className="text-2xl font-black">AJ DISCOVER</h3>
                    <p className="text-[10px] text-gray-400 uppercase tracking-widest mt-2">Platform News & Top Earners</p>
                </div>
            </div>
          )}

          {/* AJ PULSE (INSTA STYLE FEED) - Placeholder logic */}
          {socialScreen === 'pulse' && (
            <div className="max-w-lg mx-auto p-4 space-y-6 pb-24">
                <button onClick={() => setSocialScreen('hub')} className="text-pink-500 font-black text-[10px] mb-4 uppercase">← Back to Social</button>
                {/* Create Post Button */}
                <div className="bg-white/5 border border-white/10 p-4 rounded-3xl flex items-center gap-4 shadow-lg">
                    <img src={user?.photoURL} className="w-10 h-10 rounded-full border border-cyan-500" />
                    <button className="flex-1 bg-white/10 text-left px-4 py-2 rounded-full text-gray-400 text-sm">What's on your mind?</button>
                </div>
                
                {/* Post Item */}
                <div className="bg-white/5 border border-white/10 rounded-[2rem] overflow-hidden shadow-2xl">
                    <div className="p-4 flex items-center gap-3">
                        <div className="w-10 h-10 bg-cyan-500 rounded-full"></div>
                        <div>
                            <p className="font-black text-sm">AJ ADMIN</p>
                            <p className="text-[10px] text-gray-500">Official News • Just now</p>
                        </div>
                    </div>
                    <img src="/founder_card.jpg" className="w-full object-cover" />
                    <div className="p-5">
                        <p className="text-sm leading-relaxed text-gray-200">Welcome to AJ Social Hub! Yahan aap apni pics upload kar sakein ge aur live chats enjoy karein ge. Stay Tuned!</p>
                        <div className="flex gap-6 mt-6 border-t border-white/5 pt-4">
                            <button className="flex items-center gap-2 text-gray-400"><Heart size={20} /> <span className="text-xs">0</span></button>
                            <button className="flex items-center gap-2 text-gray-400"><MessageSquare size={20} /> <span className="text-xs">0</span></button>
                        </div>
                    </div>
                </div>
            </div>
          )}

          {/* AJ LIVE CHAT (WHATSAPP STYLE) */}
          {socialScreen === 'chat' && (
            <div className="max-w-lg mx-auto h-[80vh] flex flex-col p-4">
                <button onClick={() => setSocialScreen('hub')} className="text-green-500 font-black text-[10px] mb-4 uppercase">← Back to Social</button>
                <div className="flex-1 bg-black/30 border border-white/10 rounded-[2rem] p-4 overflow-y-auto mb-4 space-y-4">
                    <div className="bg-green-500/20 p-3 rounded-2xl rounded-tl-none max-w-[80%] text-sm self-start">
                        <p className="text-[10px] font-black text-green-400 mb-1">Global System</p>
                        <p>Welcome to AJ Global Chat! Aap sab se batain kar saktay hain.</p>
                    </div>
                </div>
                <div className="flex gap-3">
                    <input type="text" placeholder="Type a message..." className="flex-1 bg-white/5 border border-white/10 p-4 rounded-full outline-none focus:border-green-500 text-sm" />
                    <button className="bg-green-600 p-4 rounded-full shadow-lg"><Send size={20} /></button>
                </div>
            </div>
          )}
        </div>
      )}
      
      {/* ... (Baaki Modals Arcade, Wallet, AI Bot etc.) ... */}

    </main>
  );
}