"use client";
import React, { useState, useEffect } from 'react';
import { auth, db, googleProvider } from '../firebaseConfig'; 
import { signInWithPopup, onAuthStateChanged, signOut, setPersistence, browserLocalPersistence } from 'firebase/auth';
import { doc, setDoc, onSnapshot, updateDoc, increment } from 'firebase/firestore';
import { MessageCircle, Trophy, Zap, Wallet, Bot, LogOut, Globe, ChevronRight, Send, CreditCard, ArrowUpRight, ShieldCheck, Crown, Activity, TrendingUp, Coins } from 'lucide-react';

export default function AJSuperPortal() {
  const [screen, setScreen] = useState('splash');
  const [walletTab, setWalletTab] = useState('main'); 
  const [user, setUser] = useState<any>(null);
  const [balance, setBalance] = useState(0);
  const [botTier, setBotTier] = useState('none');
  const [invested, setInvested] = useState(0);
  const [loading, setLoading] = useState(0);

  const usdtValue = (balance / 100).toFixed(2);

  useEffect(() => {
    if (screen === 'splash') {
      const interval = setInterval(() => {
        setLoading(prev => (prev >= 100 ? 100 : prev + 10));
      }, 50);
      setTimeout(() => setScreen('auth'), 2000);
      return () => clearInterval(interval);
    }
  }, [screen]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        const userRef = doc(db, "users", currentUser.uid);
        onSnapshot(userRef, (docSnap) => {
          if (docSnap.exists()) {
            setBalance(docSnap.data().balance || 0);
            setBotTier(docSnap.data().botTier || 'none');
            setInvested(docSnap.data().invested || 0);
          } else {
            setDoc(userRef, { name: currentUser.displayName, email: currentUser.email, balance: 500, botTier: 'none', invested: 0 });
          }
        });
        setScreen('hub');
      } else { setScreen('auth'); }
    });
    return () => unsubscribe();
  }, []);

  const handleLogin = async () => {
    googleProvider.setCustomParameters({ prompt: 'select_account' });
    await setPersistence(auth, browserLocalPersistence);
    await signInWithPopup(auth, googleProvider);
  };

  const handlePurchase = () => window.open("https://nowpayments.io/payment/?iid=6119249758&paymentId=4656497174", '_blank');

  const activateBot = async (tier: string, cost: number) => {
    if (balance < cost) {
      alert(`Oye Ali! You need ${cost} coins. Currently you have ${balance}. Please purchase coins first!`);
      return;
    }
    const userRef = doc(db, "users", user.uid);
    await updateDoc(userRef, { 
      balance: increment(-cost), 
      botTier: tier, 
      invested: cost
    });
    alert("BOT ACTIVATED!");
  };

  if (screen === 'splash') return (
    <main className="min-h-screen bg-black flex flex-col items-center justify-center text-white">
      <div className="w-24 h-24 border-4 border-cyan-500 rounded-full animate-pulse mb-6 flex items-center justify-center">
        <span className="text-5xl font-black italic">AJ</span>
      </div>
      <h1 className="text-2xl font-black tracking-widest">WELCOME</h1>
    </main>
  );

  if (screen === 'auth' && !user) return (
    <main className="min-h-screen bg-[#050505] flex flex-col items-center justify-center p-6 text-white text-center">
      <div className="w-full max-w-sm bg-white/[0.02] border border-white/10 p-12 rounded-[3rem] shadow-2xl">
        <h2 className="text-6xl font-black mb-10 italic">AJ <span className="text-cyan-400">ID</span></h2>
        <button onClick={handleLogin} className="w-full py-5 bg-white text-black font-black text-xl rounded-2xl">CONTINUE WITH GOOGLE</button>
        <p className="mt-8 text-yellow-500 font-bold text-xs">+500 COINS BONUS</p>
      </div>
    </main>
  );

  return (
    <main className="min-h-screen bg-[#020617] text-white font-sans overflow-x-hidden relative">
      
      {/* VVIP HEADER */}
      <header className="fixed top-0 w-full p-4 flex justify-between items-center z-[100] bg-black/80 backdrop-blur-md border-b border-white/5">
        <div className="text-xl font-black italic text-cyan-400">AJ STUDIO</div>
        <div className="flex items-center gap-3">
          <div onClick={() => setScreen('wallet')} className="flex items-center gap-3 bg-white/5 px-4 py-2 rounded-full border border-white/10 cursor-pointer hover:bg-white/10 transition-all">
            <div className="text-right leading-none">
               <p className="text-xs font-black text-yellow-500">{balance} 🪙</p>
               <p className="text-[10px] text-green-400 font-bold">${usdtValue}</p>
            </div>
            <img src={user?.photoURL} className="w-8 h-8 rounded-full border border-cyan-500" />
          </div>
          <button onClick={() => signOut(auth)} className="p-2 bg-red-500/20 rounded-full text-red-500"><LogOut size={18} /></button>
        </div>
      </header>

      {/* DASHBOARD */}
      <section className="min-h-screen flex flex-col items-center justify-center p-4 pt-24 relative">
        <h1 className="text-4xl md:text-8xl font-black text-center mb-12 uppercase drop-shadow-[0_0_20px_#22d3ee]">AJ SUPER PORTAL</h1>
        <div className="grid grid-cols-2 gap-4 md:gap-24 w-full max-w-4xl relative z-30">
          <div className="bg-white/5 border border-white/10 rounded-[2rem] p-6 h-52 md:h-80 flex flex-col items-center justify-center active:scale-95 transition-all cursor-pointer shadow-xl relative z-40">
            <Trophy className="mb-2 text-cyan-400 w-10 h-10 md:w-20 md:h-20" />
            <h2 className="font-black text-xs md:text-3xl uppercase">Gaming</h2>
          </div>
          <div onClick={() => setScreen('social')} className="bg-white/5 border border-white/10 rounded-[2rem] p-6 h-52 md:h-80 flex flex-col items-center justify-center active:scale-95 transition-all cursor-pointer shadow-xl relative z-40">
            <Zap className="mb-2 text-pink-500 w-10 h-10 md:w-20 md:h-20" />
            <h2 className="font-black text-xs md:text-3xl uppercase">Social</h2>
          </div>
          <div onClick={() => setScreen('wallet')} className="bg-white/5 border border-white/10 rounded-[2rem] p-6 h-52 md:h-80 flex flex-col items-center justify-center active:scale-95 transition-all cursor-pointer shadow-xl relative z-40">
            <Wallet className="mb-2 text-yellow-500 w-10 h-10 md:w-20 md:h-20" />
            <h2 className="font-black text-xs md:text-3xl uppercase">Wallet</h2>
          </div>
          <div onClick={() => setScreen('ai')} className="bg-white/5 border border-white/10 rounded-[2rem] p-6 h-52 md:h-80 flex flex-col items-center justify-center active:scale-95 transition-all cursor-pointer shadow-xl relative z-40">
            <Bot className="mb-2 text-green-400 w-10 h-10 md:w-20 md:h-20" />
            <h2 className="font-black text-xs md:text-3xl uppercase">AJ AI</h2>
          </div>
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0 opacity-20">
            <div className="w-24 h-24 md:w-96 md:h-96 border-2 border-cyan-500 rounded-full flex items-center justify-center">
               <span className="text-5xl font-black italic">HUB</span>
            </div>
          </div>
        </div>
      </section>

      {/* MODAL: WALLET */}
      {screen === 'wallet' && (
        <div className="fixed inset-0 z-[200] bg-black/95 flex flex-col items-center p-8 overflow-y-auto animate-in slide-in-from-bottom duration-300">
           <button onClick={() => setScreen('hub')} className="self-start text-cyan-400 font-bold text-sm mb-12">← BACK TO HUB</button>
           <div className="w-full max-w-md bg-white/[0.03] border border-white/10 p-12 rounded-[4rem] text-center shadow-2xl">
              <h2 className="text-6xl font-black text-yellow-500 mb-2">{balance} 🪙</h2>
              <h3 className="text-3xl font-black text-green-400 italic mb-12">${usdtValue} USDT</h3>
              <div className="flex flex-col gap-4">
                 <button onClick={handlePurchase} className="w-full py-5 bg-white text-black rounded-2xl font-black flex items-center justify-between px-8">PURCHASE <CreditCard size={20}/></button>
                 <button onClick={() => setWalletTab('transfer')} className="w-full py-5 bg-white/5 border border-white/10 rounded-2xl font-black flex items-center justify-between px-8 text-cyan-400">TRANSFER <Send size={20}/></button>
                 <button onClick={() => setWalletTab('withdraw')} className="w-full py-5 bg-white/5 border border-white/10 rounded-2xl font-black flex items-center justify-between px-8 text-pink-500">WITHDRAW <ArrowUpRight size={20}/></button>
              </div>
           </div>
        </div>
      )}

      {/* MODAL: AI BOT */}
      {screen === 'ai' && (
        <div className="fixed inset-0 z-[200] bg-black flex flex-col items-center p-8 overflow-y-auto animate-in slide-in-from-right duration-500">
           <button onClick={() => setScreen('hub')} className="self-start text-green-400 font-bold text-sm mb-12 uppercase">← Back</button>
           <h2 className="text-5xl font-black mb-16 text-center uppercase tracking-widest text-white italic">AJ AI <span className="text-green-500">BOT</span></h2>
           
           {botTier === 'none' ? (
             <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-4xl">
                <div className="bg-white/5 border border-white/10 p-10 rounded-[3rem] text-center">
                   <ShieldCheck size={50} className="mx-auto mb-6 text-cyan-400" />
                   <h3 className="text-3xl font-black uppercase">Basic Bot</h3>
                   <p className="text-4xl font-black text-white my-8">2,500 <span className="text-xs">Coins</span></p>
                   <button onClick={() => activateBot('basic', 2500)} className="w-full py-5 bg-cyan-600 rounded-2xl font-black">ACTIVATE</button>
                </div>
                <div className="bg-white/5 border-2 border-yellow-500/30 p-10 rounded-[3rem] text-center shadow-2xl">
                   <Crown size={50} className="mx-auto mb-6 text-yellow-500" />
                   <h3 className="text-3xl font-black uppercase">VVIP Bot</h3>
                   <p className="text-4xl font-black text-white my-8">7,500 <span className="text-xs">Coins</span></p>
                   <button onClick={() => activateBot('vvip', 7500)} className="w-full py-5 bg-yellow-600 text-black rounded-2xl font-black">ACTIVATE</button>
                </div>
             </div>
           ) : (
             <div className="w-full max-w-2xl bg-white/5 border-2 border-green-500/40 p-16 rounded-[4rem] text-center">
                <Activity size={80} className="mx-auto mb-8 text-green-500 animate-pulse" />
                <h2 className="text-5xl font-black uppercase text-white mb-8">{botTier} BOT ACTIVE</h2>
                <div className="grid grid-cols-2 gap-10 border-t border-white/5 pt-12">
                   <div className="text-left"><p className="text-xs text-gray-500 uppercase font-bold">Invested</p><p className="text-4xl font-black text-white">{invested} 🪙</p></div>
                   <div className="text-left"><p className="text-xs text-gray-500 uppercase font-bold">Daily Profit</p><p className="text-4xl font-black text-green-400">+{botTier === 'vvip' ? '12%' : '5%'}</p></div>
                </div>
                <div className="mt-12 bg-green-500/20 py-4 rounded-2xl flex items-center justify-center gap-3 border border-green-500/50">
                   <TrendingUp size={24} className="text-green-400" />
                   <span className="font-black text-xl">TRADING LIVE...</span>
                </div>
             </div>
           )}
        </div>
      )}

      {/* FOUNDER & FOOTER */}
      <section className="py-20 bg-black flex justify-center px-4"><img src="/founder_card.jpg" alt="F" className="w-full max-w-4xl h-auto rounded-3xl" /></section>
      <footer className="bg-black py-24 text-center border-t border-white/5">
        <h2 className="text-7xl font-black text-white/10 mb-8 italic uppercase">AJ STUDIO</h2>
        <div className="flex justify-center gap-14 mb-16">
            <a href="https://wa.me/96878994093" target="_blank" className="text-green-500 hover:scale-125 transition-all"><MessageCircle size={60}/></a>
            <a href="https://x.com/Ali20352061" target="_blank" className="text-white text-6xl font-black hover:scale-125 transition-all">X</a>
        </div>
      </footer>
    </main>
  );
}