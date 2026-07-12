"use client";
import React, { useState, useEffect } from 'react';
import { auth, db, googleProvider } from '../firebaseConfig'; 
import { signInWithPopup, onAuthStateChanged, signOut, setPersistence, browserLocalPersistence } from 'firebase/auth';
import { doc, setDoc, onSnapshot, updateDoc, increment, collection, addDoc } from 'firebase/firestore';
import { MessageCircle, Trophy, Zap, Wallet, Bot, LogOut, Globe, ChevronRight, Send, CreditCard, ArrowUpRight, ShieldCheck, Crown, Activity, TrendingUp } from 'lucide-react';

export default function AJSuperPortal() {
  const [screen, setScreen] = useState('splash');
  const [walletTab, setWalletTab] = useState('main'); 
  const [user, setUser] = useState<any>(null);
  const [balance, setBalance] = useState(0);
  const [earnedBalance, setEarnedBalance] = useState(0);
  const [botTier, setBotTier] = useState('none');
  const [loading, setLoading] = useState(0);

  // Inputs for Withdraw
  const [payoutMethod, setPayoutMethod] = useState('Binance Pay (USDT)');
  const [payoutAddress, setPayoutAddress] = useState('');

  const usdtValue = (balance / 100).toFixed(2);

  useEffect(() => {
    if (screen === 'splash') {
      const interval = setInterval(() => { setLoading(prev => (prev >= 100 ? 100 : prev + 10)); }, 50);
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
            setEarnedBalance(docSnap.data().earnedBalance || 0);
            setBotTier(docSnap.data().botTier || 'none');
          } else {
            setDoc(userRef, { name: currentUser.displayName, email: currentUser.email, balance: 500, earnedBalance: 0, botTier: 'none' });
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

  const handlePurchase = () => {
    window.open("https://nowpayments.io/payment/?iid=6119249758&paymentId=4656497174", '_blank');
  };

  const activateBot = async (tier: string, cost: number) => {
    if (balance < cost) {
      alert(`⚠️ Insufficient Balance!\n\nTo activate ${tier.toUpperCase()} Bot, you need ${cost} Coins.\nYour Current Balance: ${balance} Coins.\n\nPlease purchase coins first.`);
      return;
    }
    await updateDoc(doc(db, "users", user.uid), { balance: increment(-cost), botTier: tier, invested: cost });
    alert(`🚀 ${tier.toUpperCase()} BOT ACTIVATED!`);
  };

  const handleWithdrawRequest = async () => {
    if (balance < 2500) return alert("Min 2,500 Coins needed!");
    if (!payoutAddress) return alert("Please enter your account details.");
    await addDoc(collection(db, "withdraw_requests"), {
      uid: user.uid, email: user.email, amount: balance, method: payoutMethod, address: payoutAddress, status: "pending", date: new Date()
    });
    alert("✅ Payout Request Sent to CEO Ali!");
    setWalletTab('main');
  };

  if (screen === 'splash') return (
    <main className="min-h-screen bg-black flex flex-col items-center justify-center text-white">
      <div className="w-24 h-24 border-4 border-cyan-500 rounded-full animate-pulse mb-6 shadow-[0_0_50px_#06b6d4]"></div>
      <h1 className="text-3xl font-black tracking-widest italic uppercase">Welcome to AJ Portal</h1>
    </main>
  );

  if (screen === 'auth' && !user) return (
    <main className="min-h-screen bg-[#050505] flex flex-col items-center justify-center p-6 text-white text-center">
      <div className="w-full max-w-sm bg-white/[0.03] border border-white/10 p-12 rounded-[3rem] shadow-2xl">
        <h2 className="text-7xl font-black mb-10 italic text-cyan-400 uppercase">AJ <span className="text-white">ID</span></h2>
        <button onClick={handleLogin} className="w-full py-5 bg-white text-black font-black text-xl rounded-2xl active:scale-95 transition-all">CONTINUE WITH GOOGLE</button>
        <p className="mt-8 text-yellow-500 font-bold text-xs animate-bounce">+500 COINS BONUS</p>
      </div>
    </main>
  );

  return (
    <main className="min-h-screen bg-[#020617] text-white font-sans overflow-x-hidden relative">
      
      {/* HEADER */}
      <header className="fixed top-0 w-full p-4 flex justify-between items-center z-[100] bg-black/60 backdrop-blur-xl border-b border-white/5">
        <div className="text-xl font-black italic tracking-tighter text-cyan-400 drop-shadow-[0_0_10px_#06b6d4]">AJ STUDIO</div>
        <div className="flex items-center gap-3">
          <div onClick={() => setScreen('wallet')} className="flex items-center gap-3 bg-white/5 px-4 py-2 rounded-full border border-white/10 shadow-lg cursor-pointer">
            <div className="text-right leading-none pr-2 border-r border-white/10">
               <p className="text-xs font-black text-yellow-500">{balance} 🪙</p>
               <p className="text-[10px] text-green-400 font-bold">${usdtValue} USDT</p>
            </div>
            <img src={user?.photoURL} className="w-8 h-8 rounded-full border-2 border-cyan-500" />
          </div>
          <button onClick={() => signOut(auth)} className="p-2 bg-red-500/20 rounded-full text-red-500"><LogOut size={18} /></button>
        </div>
      </header>

      {/* HUB DASHBOARD */}
      <section className="min-h-screen flex flex-col items-center justify-center p-4 pt-24 relative">
        <h1 className="text-4xl md:text-8xl font-black text-center mb-12 uppercase drop-shadow-[0_0_20px_#22d3ee]">AJ SUPER PORTAL</h1>
        <div className="relative z-20 grid grid-cols-2 gap-4 md:gap-24 w-full max-w-4xl px-2">
          <div className="bg-white/5 border border-white/10 rounded-[2rem] p-6 h-48 md:h-80 flex flex-col items-center justify-center active:scale-95 transition-all cursor-pointer shadow-xl relative z-30">
            <Trophy className="mb-2 text-cyan-400 w-10 h-10 md:w-20 md:h-20" />
            <h2 className="font-black text-xs md:text-3xl uppercase">Gaming</h2>
          </div>
          <div onClick={() => setScreen('social')} className="bg-white/5 border border-white/10 rounded-[2rem] p-6 h-48 md:h-80 flex flex-col items-center justify-center active:scale-95 transition-all cursor-pointer shadow-xl relative z-30">
            <Zap className="mb-2 text-pink-500 w-10 h-10 md:w-20 md:h-20" />
            <h2 className="font-black text-xs md:text-3xl uppercase">Social</h2>
          </div>
          <div onClick={() => {setScreen('wallet'); setWalletTab('main')}} className="bg-white/5 border-2 border-yellow-500/30 rounded-[2rem] p-6 h-48 md:h-80 flex flex-col items-center justify-center active:scale-95 transition-all cursor-pointer shadow-xl relative z-30">
            <Wallet className="mb-2 text-yellow-500 w-10 h-10 md:w-20 md:h-20" />
            <h2 className="font-black text-xs md:text-3xl uppercase text-yellow-500">Wallet</h2>
          </div>
          <div onClick={() => setScreen('ai')} className="bg-white/5 border border-white/10 rounded-[2rem] p-6 h-48 md:h-80 flex flex-col items-center justify-center active:scale-95 transition-all cursor-pointer shadow-xl relative z-30">
            <Bot className="mb-2 text-green-400 w-10 h-10 md:w-20 md:h-20" />
            <h2 className="font-black text-xs md:text-3xl uppercase">AJ AI</h2>
          </div>
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0 opacity-40">
            <div className="w-24 h-24 md:w-96 md:h-96 bg-black border-4 md:border-[15px] border-cyan-500 rounded-full flex items-center justify-center shadow-[0_0_80px_#06b6d4]">
              <span className="text-8xl font-black text-white italic">HUB</span>
            </div>
          </div>
        </div>
      </section>

      {/* MODAL: WALLET (WITH FIXED LIST) */}
      {screen === 'wallet' && (
        <div className="fixed inset-0 z-[200] bg-black/95 backdrop-blur-3xl flex flex-col items-center p-8 overflow-y-auto">
           <button onClick={() => setScreen('hub')} className="self-start text-cyan-400 font-bold text-sm mb-12 uppercase">← BACK</button>
           <div className="w-full max-w-md bg-white/[0.03] border border-white/10 p-10 rounded-[3rem] text-center shadow-2xl">
              <h2 className="text-5xl font-black text-yellow-500 mb-1">{balance} 🪙</h2>
              <p className="text-green-400 font-black text-xl mb-8">${usdtValue} USDT</p>

              {walletTab === 'main' && (
                <div className="flex flex-col gap-4">
                   <button onClick={handlePurchase} className="w-full py-5 bg-white text-black font-black rounded-2xl hover:bg-cyan-400 transition-all">PURCHASE</button>
                   <button onClick={() => setWalletTab('withdraw')} className="w-full py-5 bg-white/5 border border-white/10 rounded-2xl font-black text-pink-500 hover:border-pink-500 transition-all">WITHDRAW</button>
                </div>
              )}

              {walletTab === 'withdraw' && (
                <div className="flex flex-col gap-4 animate-in fade-in">
                   {/* FIXED SELECT LIST: Explicitly styled for dark mode */}
                   <select 
                     value={payoutMethod} 
                     onChange={(e) => setPayoutMethod(e.target.value)}
                     className="w-full bg-gray-900 border border-white/20 p-4 rounded-xl text-white font-bold outline-none appearance-none cursor-pointer"
                   >
                      <option className="bg-gray-900 text-white">Binance Pay (USDT)</option>
                      <option className="bg-gray-900 text-white">EasyPaisa (PKR)</option>
                      <option className="bg-gray-900 text-white">JazzCash (PKR)</option>
                      <option className="bg-gray-900 text-white">Visa / MasterCard (Global)</option>
                   </select>
                   <input type="text" placeholder="Wallet ID / Account Number" value={payoutAddress} onChange={(e) => setPayoutAddress(e.target.value)} className="w-full bg-black border border-white/10 p-4 rounded-xl text-center text-white outline-none focus:border-cyan-400" />
                   <button onClick={handleWithdrawRequest} className="w-full py-4 bg-pink-600 rounded-xl font-black uppercase">Request Payout</button>
                   <button onClick={() => setWalletTab('main')} className="text-gray-500 text-xs mt-2 uppercase">Back</button>
                </div>
              )}
           </div>
        </div>
      )}

      {/* MODAL: AI BOTS (PROFIT SHOWN) */}
      {screen === 'ai' && (
        <div className="fixed inset-0 z-[200] bg-black flex flex-col items-center p-8 overflow-y-auto">
           <button onClick={() => setScreen('hub')} className="self-start text-green-400 font-bold text-sm mb-12 uppercase">← Back</button>
           <h2 className="text-5xl font-black mb-12 text-center uppercase text-white italic">AJ AI <span className="text-green-500 font-thin">BOT</span></h2>
           <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-4xl px-2">
              <div className="bg-white/5 border border-white/10 p-10 rounded-3xl text-center hover:border-cyan-500 transition-all">
                 <ShieldCheck size={40} className="mx-auto mb-4 text-cyan-400" />
                 <h3 className="text-xl font-black uppercase">Basic Bot</h3>
                 <p className="text-green-400 font-black text-lg mt-2 tracking-widest">+2% Daily Profit</p>
                 <p className="text-3xl font-black text-white my-6">2,500 Coins</p>
                 <button onClick={() => activateBot('basic', 2500)} className="w-full py-4 bg-cyan-600 rounded-xl font-black uppercase">Activate</button>
              </div>
              <div className="bg-white/5 border-2 border-yellow-500/30 p-10 rounded-3xl text-center relative hover:border-yellow-500 transition-all shadow-2xl">
                 <Crown size={40} className="mx-auto mb-4 text-yellow-500" />
                 <h3 className="text-xl font-black uppercase tracking-tighter">VVIP Bot</h3>
                 <p className="text-yellow-400 font-black text-lg mt-2 tracking-widest">+5% Daily Profit</p>
                 <p className="text-3xl font-black text-white my-6">7,500 Coins</p>
                 <button onClick={() => activateBot('vvip', 7500)} className="w-full py-4 bg-yellow-600 rounded-xl font-black text-black uppercase">Activate</button>
              </div>
           </div>
        </div>
      )}

      {/* FOUNDER & GLOWING FOOTER */}
      <section className="py-20 bg-black flex justify-center px-4 border-y border-white/5"><img src="/founder_card.jpg" alt="F" className="w-full max-w-4xl h-auto rounded-3xl shadow-2xl" /></section>
      <footer className="bg-black py-24 text-center border-t border-white/5">
        <div className="text-7xl md:text-[10rem] font-black italic text-white uppercase drop-shadow-[0_0_30px_rgba(6,182,212,0.8)] mb-10">
          AJ <span className="text-cyan-400 drop-shadow-[0_0_20px_#06b6d4]">STUDIO</span>
        </div>
        <div className="flex justify-center gap-14 mb-10">
            <a href="https://wa.me/96878994093" target="_blank" className="text-green-500 hover:scale-125 transition-all"><MessageCircle size={60}/></a>
            <a href="https://x.com/Ali20352061" target="_blank" className="text-white text-5xl font-black hover:scale-125 transition-all">X</a>
            <a href="https://www.instagram.com/innocent.a.jutt" target="_blank" className="text-pink-500 hover:scale-125 transition-all font-black text-5xl">i</a>
        </div>
        <p className="mt-12 text-gray-700 font-black tracking-[1em] text-[10px] uppercase">Muscat, Sultanate of Oman</p>
      </footer>
    </main>
  );
}