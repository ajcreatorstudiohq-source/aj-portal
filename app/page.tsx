"use client";
import React, { useState, useEffect } from 'react';
import { auth, db, googleProvider } from '../firebaseConfig'; 
import { signInWithPopup, onAuthStateChanged, signOut, setPersistence, browserLocalPersistence } from 'firebase/auth';
import { doc, setDoc, onSnapshot, updateDoc, increment, collection, addDoc, getDoc } from 'firebase/firestore';
import { MessageCircle, Trophy, Zap, Wallet, Bot, LogOut, Globe, ChevronRight, Send, CreditCard, ArrowUpRight, ShieldCheck, Crown, Activity, TrendingUp, Twitter, Instagram, Mail } from 'lucide-react';

export default function AJSuperPortal() {
  const [screen, setScreen] = useState('splash'); // splash, auth, hub, social, wallet, ai
  const [walletTab, setWalletTab] = useState('main'); // main, purchase, withdraw, transfer
  const [user, setUser] = useState<any>(null);
  const [balance, setBalance] = useState(0);
  const [botTier, setBotTier] = useState('none');
  const [loading, setLoading] = useState(0);

  // Input States
  const [purchaseAmount, setPurchaseAmount] = useState(5);
  const [transferId, setTransferId] = useState('');
  const [transferAmount, setTransferAmount] = useState(0);
  const [payoutMethod, setPayoutMethod] = useState('Binance Pay (USDT)');
  const [payoutId, setPayoutId] = useState('');
  const [cardName, setCardName] = useState('');
  const [cardNumber, setCardNumber] = useState('');

  // 1 OMR = 200 Coins | 100 Coins = $1.00 USDT
  const usdtValue = (balance / 100).toFixed(2);
  const omrValue = (balance / 200).toFixed(2);

  // 1. Splash Timer
  useEffect(() => {
    if (screen === 'splash') {
      const interval = setInterval(() => { setLoading(prev => (prev >= 100 ? 100 : prev + 5)); }, 50);
      setTimeout(() => setScreen('auth'), 2500);
      return () => clearInterval(interval);
    }
  }, [screen]);

  // 2. Firebase Real-time Sync
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        const userRef = doc(db, "users", currentUser.uid);
        onSnapshot(userRef, (docSnap) => {
          if (docSnap.exists()) {
            setBalance(docSnap.data().balance || 0);
            setBotTier(docSnap.data().botTier || 'none');
          } else {
            setDoc(userRef, { name: currentUser.displayName, email: currentUser.email, balance: 500, botTier: 'none', uid: currentUser.uid });
          }
        });
        setScreen('hub');
      } else { setScreen('auth'); }
    });
    return () => unsubscribe();
  }, []);

  // --- HANDLERS ---
  const handleLogin = async () => {
    googleProvider.setCustomParameters({ prompt: 'select_account' });
    await setPersistence(auth, browserLocalPersistence);
    await signInWithPopup(auth, googleProvider);
  };

  const handlePurchase = () => {
    const usdAmount = (purchaseAmount * 2.60).toFixed(2); // OMR to USD conversion
    window.open(`https://nowpayments.io/payment/?api_key=3THXNSZ-AYVMTP6-HQ9KGKK-9J6CQD7&amount=${usdAmount}&currency=usd&order_id=${user?.uid}_${Date.now()}`, '_blank');
  };

  const handleTransfer = async () => {
    if (transferAmount <= 0 || transferAmount > balance) return alert("Invalid Amount!");
    const recipientRef = doc(db, "users", transferId);
    const recipientSnap = await getDoc(recipientRef);
    if (recipientSnap.exists()) {
      await updateDoc(doc(db, "users", user.uid), { balance: increment(-transferAmount) });
      await updateDoc(recipientRef, { balance: increment(transferAmount) });
      alert("Transfer Successful to: " + recipientSnap.data().name);
      setWalletTab('main');
    } else { alert("Recipient ID not found!"); }
  };

  const handleWithdraw = async () => {
    if (balance < 2500) return alert("Minimum 2,500 Coins required for Withdrawal!");
    let details = payoutMethod === 'Visa Transfer (Global)' ? `Card: ${cardNumber} | Name: ${cardName}` : payoutId;
    if (!details) return alert("Please enter payment details!");

    await addDoc(collection(db, "withdraw_requests"), {
      uid: user.uid, email: user.email, amount: balance, method: payoutMethod, details: details, status: "pending", date: new Date()
    });
    alert("✅ Request Sent! CEO Ali will process your payment soon.");
    setWalletTab('main');
  };

  const activateBot = async (tier: string, cost: number) => {
    if (balance < cost) return alert(`⚠️ Need ${cost} Coins. Your Balance: ${balance}`);
    await updateDoc(doc(db, "users", user.uid), { balance: increment(-cost), botTier: tier });
    alert(`🚀 ${tier.toUpperCase()} BOT ACTIVATED!`);
  };

  // --- RENDER VIEWS ---

  if (screen === 'splash') return (
    <main className="min-h-screen bg-black flex flex-col items-center justify-center text-white">
      <div className="w-32 h-32 border-4 border-cyan-500 rounded-full flex items-center justify-center animate-pulse shadow-[0_0_50px_#06b6d4] mb-8">
        <span className="text-6xl font-black italic">AJ</span>
      </div>
      <h1 className="text-3xl font-black tracking-widest uppercase">Welcome To AJ Portal</h1>
      <div className="mt-12 w-64 h-1 bg-gray-900 rounded-full overflow-hidden">
        <div className="h-full bg-cyan-500" style={{ width: `${loading}%` }}></div>
      </div>
    </main>
  );

  if (screen === 'auth' && !user) return (
    <main className="min-h-screen bg-[#050505] flex flex-col items-center justify-center p-6 text-white text-center font-sans">
      <div className="w-full max-w-sm bg-white/[0.02] border border-white/10 p-12 rounded-[3.5rem] shadow-2xl">
        <h2 className="text-7xl font-black mb-10 italic uppercase text-white">AJ <span className="text-cyan-400">ID</span></h2>
        <button onClick={handleLogin} className="w-full py-5 bg-white text-black font-black text-xl rounded-2xl active:scale-95 transition-all">CONTINUE WITH GOOGLE</button>
        <p className="mt-8 text-yellow-500 font-bold text-xs animate-bounce">+500 COINS BONUS</p>
      </div>
    </main>
  );

  return (
    <main className="min-h-screen bg-[#020617] text-white font-sans overflow-x-hidden relative">
      
      {/* HEADER */}
      <header className="fixed top-0 w-full p-4 flex justify-between items-center z-[100] bg-black/60 backdrop-blur-xl border-b border-white/5">
        <div className="text-xl font-black italic text-cyan-400 drop-shadow-[0_0_10px_#06b6d4]">AJ STUDIO</div>
        <div className="flex items-center gap-3">
          <div onClick={() => { setScreen('wallet'); setWalletTab('main'); }} className="flex items-center gap-3 bg-white/5 px-4 py-2 rounded-full border border-white/10 shadow-lg cursor-pointer">
            <div className="text-right leading-none pr-2 border-r border-white/10">
               <p className="text-xs font-black text-yellow-500">{balance} 🪙</p>
               <p className="text-[10px] text-green-400 font-bold">${usdtValue} USDT</p>
            </div>
            <img src={user?.photoURL} className="w-8 h-8 rounded-full border-2 border-cyan-500" />
          </div>
          <button onClick={() => signOut(auth)} className="p-2 bg-red-500/10 rounded-full text-red-500"><LogOut size={18} /></button>
        </div>
      </header>

      {/* DASHBOARD (2x2 GRID) */}
      <section className="min-h-screen flex flex-col items-center justify-center p-4 pt-24 relative">
        <h1 className="text-4xl md:text-8xl font-black text-center mb-12 uppercase drop-shadow-[0_0_20px_#22d3ee]">AJ SUPER PORTAL</h1>
        <div className="relative z-20 grid grid-cols-2 gap-4 md:gap-24 w-full max-w-4xl px-2">
          <div className="bg-white/5 border border-white/10 rounded-[2rem] p-6 h-48 md:h-80 flex flex-col items-center justify-center active:scale-95 transition-all cursor-pointer shadow-xl z-30">
            <Trophy className="mb-2 text-cyan-400 w-10 h-10 md:w-20 md:h-20" />
            <h2 className="font-black text-xs md:text-3xl uppercase">Gaming</h2>
          </div>
          <div onClick={() => setScreen('social')} className="bg-white/5 border border-white/10 rounded-[2rem] p-6 h-48 md:h-80 flex flex-col items-center justify-center active:scale-95 transition-all cursor-pointer shadow-xl z-30">
            <Zap className="mb-2 text-pink-500 w-10 h-10 md:w-20 md:h-20" />
            <h2 className="font-black text-xs md:text-3xl uppercase">Social</h2>
          </div>
          <div onClick={() => { setScreen('wallet'); setWalletTab('main'); }} className="bg-white/5 border-2 border-yellow-500/30 rounded-[2rem] p-6 h-48 md:h-80 flex flex-col items-center justify-center active:scale-95 transition-all cursor-pointer shadow-xl z-30">
            <Wallet className="text-yellow-500 w-10 h-10 md:w-20 md:h-20 mb-2" />
            <h2 className="font-black text-xs md:text-3xl uppercase text-yellow-500">Wallet</h2>
          </div>
          <div onClick={() => setScreen('ai')} className="bg-white/5 border border-white/10 rounded-[2rem] p-6 h-48 md:h-80 flex flex-col items-center justify-center active:scale-95 transition-all cursor-pointer shadow-xl z-30">
            <Bot className="mb-2 text-green-400 w-10 h-10 md:w-20 md:h-20" />
            <h2 className="font-black text-xs md:text-3xl uppercase font-black">AJ AI</h2>
          </div>
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0 opacity-40">
            <div className="w-24 h-24 md:w-96 md:h-96 bg-black border-4 md:border-[15px] border-cyan-500 rounded-full flex items-center justify-center shadow-[0_0_80px_#06b6d4]">
              <span className="text-8xl font-black text-white italic">HUB</span>
            </div>
          </div>
        </div>
      </section>

      {/* FOUNDER CARD */}
      <section className="py-20 bg-black flex justify-center px-4 border-y border-white/5">
        <img src="/founder_card.jpg" alt="Founder" className="w-full max-w-4xl h-auto rounded-3xl shadow-2xl border border-white/10" />
      </section>

      {/* FOOTER (WHATSAPP & X) */}
      <footer className="bg-black py-24 px-10 border-t border-cyan-500/10 text-center">
        <div className="max-w-7xl mx-auto flex flex-col items-center gap-12">
          <div className="text-7xl md:text-[10rem] font-black italic tracking-tighter text-white drop-shadow-[0_0_30px_rgba(6,182,212,0.8)]">AJ <span className="text-cyan-400">STUDIO</span></div>
          <div className="flex gap-14">
               <a href="https://wa.me/96878994093" target="_blank" className="text-green-500 hover:scale-125 transition-all"><MessageCircle size={65}/></a>
               <a href="https://x.com/Ali20352061" target="_blank" className="text-white hover:scale-125 transition-all italic text-5xl font-black">X</a>
               <a href="https://www.instagram.com/innocent.a.jutt" target="_blank" className="text-pink-500 hover:scale-125 transition-all italic text-5xl font-black"><Instagram size={60}/></a>
          </div>
          <p className="text-gray-700 font-bold uppercase tracking-[1em] text-[10px]">Muscat, Sultanate of Oman</p>
        </div>
      </footer>

      {/* MODAL: WALLET SYSTEM */}
      {screen === 'wallet' && (
        <div className="fixed inset-0 z-[200] bg-black/98 backdrop-blur-3xl flex flex-col items-center p-8 overflow-y-auto">
           <button onClick={() => {setScreen('hub'); setWalletTab('main')}} className="self-start text-cyan-400 font-bold text-sm mb-12 uppercase">← BACK</button>
           <div className="w-full max-w-md bg-white/[0.03] border border-white/10 p-10 rounded-[3rem] text-center shadow-2xl">
              <h2 className="text-6xl font-black text-yellow-500 mb-2">{balance} 🪙</h2>
              <h3 className="text-2xl font-black text-green-400 mb-10">${usdtValue} USDT</h3>

              {walletTab === 'main' && (
                <div className="flex flex-col gap-4">
                   <button onClick={() => setWalletTab('purchase')} className="flex items-center justify-between bg-white text-black p-5 rounded-2xl font-black active:scale-95"><div className="flex items-center gap-3"><CreditCard size={20}/> PURCHASE</div><ChevronRight size={18}/></button>
                   <button onClick={() => setWalletTab('transfer')} className="flex items-center justify-between bg-white/5 border border-white/10 p-5 rounded-2xl font-black text-cyan-400"><div className="flex items-center gap-3"><Send size={20}/> TRANSFER</div><ChevronRight size={18}/></button>
                   <button onClick={() => setWalletTab('withdraw')} className="flex items-center justify-between bg-white/5 border border-white/10 p-5 rounded-2xl font-black text-pink-500"><div className="flex items-center gap-3"><ArrowUpRight size={20}/> WITHDRAW</div><ChevronRight size={18}/></button>
                </div>
              )}

              {walletTab === 'purchase' && (
                <div className="flex flex-col gap-5 animate-in fade-in">
                   <div className="relative"><input type="number" value={purchaseAmount} onChange={(e)=>setPurchaseAmount(Number(e.target.value))} className="w-full bg-black border-2 border-white/10 p-5 rounded-2xl text-4xl font-black text-center text-white outline-none" /><span className="absolute right-4 top-6 text-gray-600 font-bold uppercase">OMR</span></div>
                   <button onClick={handlePurchase} className="w-full py-5 bg-white text-black font-black text-xl rounded-2xl hover:bg-cyan-400 transition-all">PAY NOW</button>
                   <button onClick={()=>setWalletTab('main')} className="text-gray-500 text-xs">CANCEL</button>
                </div>
              )}

              {walletTab === 'transfer' && (
                <div className="flex flex-col gap-4 animate-in fade-in">
                   <input type="text" placeholder="Recipient ID" value={transferId} onChange={(e)=>setTransferId(e.target.value)} className="w-full bg-black border border-white/10 p-4 rounded-xl text-center text-white outline-none" />
                   <input type="number" placeholder="Amount" value={transferAmount} onChange={(e)=>setTransferAmount(Number(e.target.value))} className="w-full bg-black border border-white/10 p-4 rounded-xl text-center text-white outline-none" />
                   <button onClick={handleTransfer} className="w-full py-4 bg-cyan-600 rounded-xl font-black uppercase">Send Now</button>
                   <button onClick={()=>setWalletTab('main')} className="text-gray-500 text-xs">BACK</button>
                </div>
              )}

              {walletTab === 'withdraw' && (
                <div className="flex flex-col gap-4 animate-in fade-in">
                   <select value={payoutMethod} onChange={(e)=>setPayoutMethod(e.target.value)} className="w-full bg-gray-900 border border-white/20 p-4 rounded-xl text-white font-bold outline-none"><option className="bg-black">Binance Pay (USDT)</option><option className="bg-black">EasyPaisa (PKR)</option><option className="bg-black">JazzCash (PKR)</option><option className="bg-black">Visa Transfer (Global)</option></select>
                   
                   {payoutMethod === 'Visa Transfer (Global)' ? (
                     <>
                       <input type="text" placeholder="Cardholder Name" value={cardName} onChange={(e)=>setCardName(e.target.value)} className="w-full bg-black border border-white/10 p-4 rounded-xl text-center text-white outline-none" />
                       <input type="text" placeholder="Card Number" value={cardNumber} onChange={(e)=>setCardNumber(e.target.value)} className="w-full bg-black border border-white/10 p-4 rounded-xl text-center text-white outline-none" />
                     </>
                   ) : (
                     <input type="text" placeholder="Wallet ID / Mobile Number" value={payoutId} onChange={(e)=>setPayoutId(e.target.value)} className="w-full bg-black border border-white/10 p-4 rounded-xl text-center text-white outline-none" />
                   )}
                   
                   <button onClick={handleWithdraw} className="w-full py-5 bg-pink-600 rounded-2xl font-black uppercase">Request Payout</button>
                   <button onClick={()=>setWalletTab('main')} className="text-gray-600 text-xs">BACK</button>
                </div>
              )}
           </div>
        </div>
      )}

      {/* --- MODAL: AI BOT DASHBOARD --- */}
      {screen === 'ai' && (
        <div className="fixed inset-0 z-[200] bg-black flex flex-col items-center p-8 overflow-y-auto animate-in slide-in-from-right duration-500">
           <button onClick={() => setScreen('hub')} className="self-start text-green-400 font-bold text-sm mb-12 uppercase">← Back</button>
           <h2 className="text-5xl font-black mb-12 text-center uppercase text-white italic tracking-tighter">AJ AI <span className="text-green-500 font-thin">BOT</span></h2>
           
           {botTier === 'none' ? (
             <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-4xl px-2">
                <div className="bg-white/5 border border-white/10 p-10 rounded-3xl text-center hover:border-cyan-500 transition-all">
                   <ShieldCheck size={40} className="mx-auto mb-4 text-cyan-400" />
                   <h3 className="text-xl font-black uppercase">Basic Bot (+2% Daily)</h3>
                   <p className="text-3xl font-black text-white my-6">2,500 Coins</p>
                   <button onClick={() => activateBot('basic', 2500)} className="w-full py-4 bg-cyan-600 rounded-xl font-black uppercase">Activate</button>
                </div>
                <div className="bg-white/5 border-2 border-yellow-500/30 p-10 rounded-3xl text-center relative hover:border-yellow-500 transition-all shadow-2xl">
                   <Crown size={40} className="mx-auto mb-4 text-yellow-500" />
                   <h3 className="text-xl font-black uppercase">VVIP Bot (+5% Daily)</h3>
                   <p className="text-3xl font-black text-white my-6">7,500 Coins</p>
                   <button onClick={() => activateBot('vvip', 7500)} className="w-full py-4 bg-yellow-600 rounded-xl font-black text-black uppercase">Activate</button>
                </div>
             </div>
           ) : (
             <div className="w-full max-w-2xl bg-white/5 border-2 border-green-500/40 p-16 rounded-[4rem] text-center">
                <Activity size={80} className="mx-auto mb-8 text-green-500 animate-pulse" />
                <h2 className="text-5xl font-black uppercase text-white mb-8">{botTier.toUpperCase()} BOT ACTIVE</h2>
                <div className="mt-12 bg-green-500/20 py-4 rounded-2xl flex items-center justify-center gap-3 border border-green-500/50"><TrendingUp size={24} className="text-green-400 mx-auto" /><span className="font-black text-xl text-green-400 uppercase">AI TRADING LIVE...</span></div>
             </div>
           )}
        </div>
      )}

      {/* --- MODAL: SOCIAL --- */}
      {screen === 'social' && (
        <div className="fixed inset-0 z-[200] bg-black flex flex-col items-center p-8 overflow-y-auto animate-in fade-in duration-300">
           <button onClick={() => setScreen('hub')} className="self-start text-cyan-400 font-bold text-sm mb-12 uppercase">← Back</button>
           <h2 className="text-5xl font-black mb-16 uppercase text-white tracking-widest text-center">AJ SOCIAL</h2>
           <div className="flex flex-col gap-6 w-full max-w-md">
             {['AJ TikReels', 'AJ Pulse', 'AJ Live Chat'].map((module, i) => (
               <div key={module} className="flex items-center justify-between bg-white/5 border border-white/10 p-10 rounded-3xl hover:border-pink-500 active:scale-95 cursor-pointer group transition-all">
                  <h3 className="text-2xl font-black text-white group-hover:text-pink-400 transition-colors uppercase tracking-tighter italic">{module}</h3>
                  <span className="text-4xl">{i === 0 ? '🚀' : i === 1 ? '⚡' : '🔴'}</span>
               </div>
             ))}
           </div>
        </div>
      )}
    </main>
  );
}