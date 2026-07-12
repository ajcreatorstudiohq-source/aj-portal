"use client";
import React, { useState, useEffect } from 'react';
import { auth, db, googleProvider } from '../firebaseConfig'; 
import { signInWithPopup, onAuthStateChanged, signOut, setPersistence, browserLocalPersistence } from 'firebase/auth';
import { doc, setDoc, onSnapshot, updateDoc, increment, collection, addDoc, getDoc } from 'firebase/firestore';
import { MessageCircle, Trophy, Zap, Wallet, Bot, LogOut, Globe, ChevronRight, Send, CreditCard, ArrowUpRight, ShieldCheck, Crown, Activity, TrendingUp, X } from 'lucide-react';

export default function AJSuperPortal() {
  const [screen, setScreen] = useState('splash');
  const [walletTab, setWalletTab] = useState('main'); 
  const [user, setUser] = useState<any>(null);
  const [balance, setBalance] = useState(0);
  const [botTier, setBotTier] = useState('none');
  const [invested, setInvested] = useState(0);
  const [loading, setLoading] = useState(0);

  // Input States
  const [purchaseAmount, setPurchaseAmount] = useState(5);
  const [transferId, setTransferId] = useState('');
  const [transferAmount, setTransferAmount] = useState(0);
  const [payoutMethod, setPayoutMethod] = useState('Binance Pay (USDT)');
  const [payoutId, setPayoutId] = useState('');
  const [cardName, setCardName] = useState('');
  const [cardNumber, setCardNumber] = useState('');

  const usdtValue = (balance / 100).toFixed(2);

  // 1. Splash Logic
  useEffect(() => {
    if (screen === 'splash') {
      const interval = setInterval(() => { setLoading(prev => (prev >= 100 ? 100 : prev + 10)); }, 50);
      setTimeout(() => setScreen('auth'), 2000);
      return () => clearInterval(interval);
    }
  }, [screen]);

  // 2. Firebase Sync
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
            setDoc(userRef, { name: currentUser.displayName, email: currentUser.email, balance: 500, botTier: 'none', invested: 0, uid: currentUser.uid });
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

  const handleTransfer = async () => {
    if (transferAmount <= 0 || transferAmount > balance) return alert("Invalid Amount!");
    const recipientRef = doc(db, "users", transferId);
    const recipientSnap = await getDoc(recipientRef);
    if (recipientSnap.exists()) {
      await updateDoc(doc(db, "users", user.uid), { balance: increment(-transferAmount) });
      await updateDoc(recipientRef, { balance: increment(transferAmount) });
      alert("Transfer Successful!"); setWalletTab('main');
    } else { alert("Recipient ID not found!"); }
  };

  const handleWithdraw = async () => {
    if (balance < 2500) return alert("Min 2,500 Coins required!");
    let details = payoutMethod.includes('Visa') ? `Card: ${cardNumber} | Name: ${cardName}` : payoutId;
    await addDoc(collection(db, "withdraw_requests"), { uid: user.uid, amount: balance, method: payoutMethod, details: details, status: "pending", date: new Date() });
    alert("✅ Payout Request Sent!"); setWalletTab('main');
  };

  if (screen === 'splash') return (
    <main className="h-screen bg-black flex flex-col items-center justify-center text-white">
      <div className="relative mb-12">
        <div className="w-32 h-32 md:w-56 md:h-56 border-4 border-cyan-500 rounded-full flex items-center justify-center shadow-[0_0_60px_#06b6d4] overflow-hidden">
          <img src="/logo.jpg" className="w-full h-full object-cover" alt="AJ Logo" />
        </div>
      </div>
      <h1 className="text-3xl font-black tracking-widest uppercase animate-pulse">AJ PORTAL</h1>
    </main>
  );

  if (screen === 'auth' && !user) return (
    <main className="min-h-screen bg-black flex flex-col items-center justify-center p-6 text-white text-center">
      <div className="w-full max-w-sm bg-white/[0.02] border border-white/10 p-12 rounded-[3rem] shadow-2xl">
        <h2 className="text-6xl font-black mb-10 italic text-cyan-400">AJ <span className="text-white">ID</span></h2>
        <button onClick={handleLogin} className="w-full py-5 bg-white text-black font-black text-xl rounded-2xl active:scale-95">CONTINUE WITH GOOGLE</button>
        <p className="mt-8 text-yellow-500 font-bold">+500 COINS BONUS</p>
      </div>
    </main>
  );

  return (
    <main className="min-h-screen bg-[#020617] text-white font-sans overflow-x-hidden relative">
      
      {/* HEADER */}
      <header className="fixed top-0 w-full p-4 flex justify-between items-center z-[100] bg-black/60 backdrop-blur-xl border-b border-white/5">
        <div className="text-xl font-black italic text-cyan-400 drop-shadow-[0_0_10px_#06b6d4]">AJ STUDIO</div>
        <div className="flex items-center gap-3">
          <div onClick={() => {setScreen('wallet'); setWalletTab('main')}} className="flex items-center gap-3 bg-white/5 px-4 py-2 rounded-full border border-white/10 shadow-lg cursor-pointer">
            <span className="text-xs font-black text-yellow-500">{balance} 🪙</span>
            <span className="text-[10px] text-green-400 font-bold">${usdtValue}</span>
            {user && <img src={user.photoURL} className="w-8 h-8 rounded-full border-2 border-cyan-500" />}
          </div>
          <button onClick={() => signOut(auth)} className="p-2 bg-red-500/20 rounded-full text-red-500"><LogOut size={18} /></button>
        </div>
      </header>

      {/* DASHBOARD */}
      <section className="min-h-screen flex flex-col items-center justify-center p-4 pt-24 relative">
        <h1 className="text-4xl md:text-8xl font-black text-center mb-12 uppercase drop-shadow-[0_0_20px_#22d3ee]">AJ SUPER PORTAL</h1>
        <div className="relative z-20 grid grid-cols-2 gap-4 md:gap-16 w-full max-w-4xl px-2">
          <div className="bg-white/5 border border-white/10 rounded-3xl h-48 md:h-80 flex flex-col items-center justify-center active:scale-95 transition-all shadow-xl z-30">
            <Trophy className="text-cyan-400 w-10 h-10 md:w-20 md:h-20 mb-2" />
            <span className="font-black text-xs md:text-3xl uppercase">Gaming</span>
          </div>

          <div onClick={() => setScreen('social')} className="bg-white/5 border border-white/10 rounded-3xl h-48 md:h-80 flex flex-col items-center justify-center active:scale-95 transition-all cursor-pointer shadow-xl relative z-50">
            <Zap className="text-pink-500 w-10 h-10 md:w-20 md:h-20 mb-2" />
            <span className="font-black text-xs md:text-3xl uppercase">Social</span>
          </div>

          <div onClick={() => {setScreen('wallet'); setWalletTab('main');}} className="bg-white/5 border border-white/10 rounded-3xl h-48 md:h-80 flex flex-col items-center justify-center active:scale-95 transition-all cursor-pointer shadow-xl relative z-30">
            <img src="/gold.jpg" className="w-14 h-14 mb-2" />
            <span className="font-black text-xs md:text-3xl uppercase text-yellow-500">Wallet</span>
          </div>

          <div onClick={() => setScreen('ai')} className="bg-white/5 border border-white/10 rounded-3xl h-48 md:h-80 flex flex-col items-center justify-center active:scale-95 transition-all cursor-pointer shadow-xl relative z-30">
            <Bot className="text-green-400 w-10 h-10 md:w-20 md:h-20 mb-2" />
            <span className="font-black text-xs md:text-3xl uppercase">AJ AI</span>
          </div>

          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0 opacity-40">
            <div className="w-20 h-20 md:w-80 md:h-80 bg-black border-2 md:border-8 border-cyan-500 rounded-full flex items-center justify-center shadow-[0_0_100px_#06b6d4]">
              <span className="text-8xl font-black italic text-white/50 uppercase">Hub</span>
            </div>
          </div>
        </div>
      </section>

      {/* FOUNDER */}
      <section className="py-20 bg-black flex justify-center px-4 border-y border-white/5"><img src="/founder_card.jpg" className="w-full max-w-4xl rounded-3xl shadow-2xl" /></section>

      {/* GLOWING FOOTER */}
      <footer className="bg-black py-24 px-10 border-t border-cyan-500/10 text-center">
        <div className="text-7xl md:text-[10rem] font-black italic text-cyan-400 drop-shadow-[0_0_30px_rgba(34,211,238,0.8)] mb-10">AJ STUDIO</div>
        <div className="flex justify-center gap-14">
            <a href="https://wa.me/96878994093" target="_blank" className="text-green-500 hover:scale-125 transition-all"><MessageCircle size={60}/></a>
            <a href="https://x.com/Ali20352061" target="_blank" className="text-white text-5xl font-black hover:scale-125 transition-all">X</a>
        </div>
        <p className="mt-12 text-gray-700 font-black tracking-[1em] text-[10px] uppercase">Muscat, Sultanate of Oman</p>
      </footer>

      {/* SOCIAL MODAL (Highest Z-index) */}
      {screen === 'social' && (
        <div className="fixed inset-0 z-[300] bg-black p-10 flex flex-col items-center overflow-y-auto">
            <button onClick={() => setScreen('hub')} className="self-start text-cyan-400 font-bold mb-10 text-xl uppercase">← Back</button>
            <h2 className="text-5xl font-black mb-12 uppercase text-white tracking-widest italic text-center drop-shadow-[0_0_20px_rgba(236,72,153,0.5)]">AJ SOCIAL</h2>
            <div className="flex flex-col gap-6 w-full max-w-md">
                {['AJ TikReels', 'AJ Pulse', 'AJ Live Chat'].map((module, i) => (
                   <div key={module} onClick={() => alert(`${module} starting in Month 2!`)} className="flex items-center justify-between bg-white/[0.03] border border-white/10 p-10 rounded-[2.5rem] hover:border-pink-500 active:scale-95 cursor-pointer group shadow-2xl">
                      <h3 className="text-3xl font-black text-white group-hover:text-pink-400 transition-colors uppercase tracking-tighter italic">{module}</h3>
                      <span className="text-4xl">{i === 0 ? '🚀' : i === 1 ? '⚡' : '🔴'}</span>
                   </div>
                ))}
            </div>
        </div>
      )}

      {/* WALLET MODAL */}
      {screen === 'wallet' && (
        <div className="fixed inset-0 z-[300] bg-black/98 flex flex-col items-center p-8 overflow-y-auto">
           <button onClick={() => {setScreen('hub'); setWalletTab('main')}} className="self-start text-cyan-400 mb-8 font-bold">← BACK</button>
           <div className="w-full max-w-md bg-[#111] border border-white/10 p-10 rounded-3xl text-center shadow-2xl">
              <h2 className="text-5xl font-black text-yellow-500 mb-2">{balance} 🪙</h2>
              <p className="text-green-400 font-black text-xl mb-8">${usdtValue} USDT</p>
              {walletTab === 'main' && (
                <div className="flex flex-col gap-4">
                   <button onClick={handlePurchase} className="bg-white text-black py-4 rounded-xl font-black uppercase">Purchase</button>
                   <button onClick={()=>setWalletTab('transfer')} className="bg-white/10 text-cyan-400 py-4 rounded-xl font-black border border-cyan-500/30">Transfer</button>
                   <button onClick={()=>setWalletTab('withdraw')} className="bg-white/10 text-pink-500 py-4 rounded-xl font-black border border-pink-500/30">Withdraw</button>
                </div>
              )}
              {walletTab === 'transfer' && (
                <div className="flex flex-col gap-4 text-left">
                   <input type="text" placeholder="Recipient ID" onChange={(e)=>setTransferId(e.target.value)} className="bg-black border border-white/10 p-4 rounded-xl text-center text-white" />
                   <input type="number" placeholder="Amount" onChange={(e)=>setTransferAmount(Number(e.target.value))} className="bg-black border border-white/10 p-4 rounded-xl text-center text-white" />
                   <button onClick={handleTransfer} className="bg-cyan-600 py-4 rounded-xl font-black uppercase">Send Now</button>
                   <button onClick={()=>setWalletTab('main')} className="text-gray-500 text-xs text-center uppercase mt-2">Back</button>
                   <p className="text-[10px] text-gray-500 mt-4 uppercase text-center">Your ID: <span className="text-cyan-400">{user?.uid}</span></p>
                </div>
              )}
              {walletTab === 'withdraw' && (
                <div className="flex flex-col gap-4">
                   <select value={payoutMethod} onChange={(e)=>setPayoutMethod(e.target.value)} className="w-full bg-gray-900 border border-white/20 p-4 rounded-xl text-white font-bold"><option>Binance Pay (USDT)</option><option>EasyPaisa (PKR)</option><option>JazzCash (PKR)</option><option>Visa Transfer (Global)</option></select>
                   {payoutMethod.includes('Visa') ? (
                     <><input type="text" placeholder="Cardholder Name" onChange={(e)=>setCardName(e.target.value)} className="bg-black border p-4 rounded-xl text-white text-center" /><input type="text" placeholder="16 Digit Card Number" onChange={(e)=>setCardNumber(e.target.value)} className="bg-black border p-4 rounded-xl text-white text-center" /></>
                   ) : <input type="text" placeholder="Wallet ID / Mobile Number" onChange={(e)=>setPayoutId(e.target.value)} className="bg-black border p-4 rounded-xl text-white text-center" />}
                   <button onClick={handleWithdraw} className="bg-pink-600 py-4 rounded-xl font-black uppercase">Request Payout</button>
                   <button onClick={()=>setWalletTab('main')} className="text-gray-500 text-xs text-center uppercase mt-2">Back</button>
                </div>
              )}
           </div>
        </div>
      )}
    </main>
  );
}