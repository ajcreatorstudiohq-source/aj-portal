"use client";
import React, { useState, useEffect } from 'react';
import { auth, db, googleProvider } from '../firebaseConfig'; 
import { signInWithPopup, onAuthStateChanged, signOut, setPersistence, browserLocalPersistence } from 'firebase/auth';
import { doc, setDoc, onSnapshot, updateDoc, increment, getDoc, collection, addDoc } from 'firebase/firestore';
import { MessageCircle, Trophy, Zap, Wallet, Bot, LogOut, Globe, ChevronRight, Send, CreditCard, ArrowUpRight, ShieldCheck, Crown, Activity, TrendingUp, X, Mail } from 'lucide-react';

export default function AJSuperPortal() {
  const [screen, setScreen] = useState('splash');
  const [walletTab, setWalletTab] = useState('main'); // main, purchase, withdraw, transfer
  const [user, setUser] = useState<any>(null);
  const [balance, setBalance] = useState(0);
  const [earnedBalance, setEarnedBalance] = useState(0); 
  const [botTier, setBotTier] = useState('none');
  const [loading, setLoading] = useState(0);

  // Inputs for Transfer & Withdraw
  const [targetId, setTargetId] = useState('');
  const [transferAmt, setTransferAmount] = useState(0);
  const [payoutAddress, setPayoutAddress] = useState('');
  const [purchaseAmount, setPurchaseAmount] = useState(5);

  const usdtValue = (balance / 200 * 2.60).toFixed(2);
  const omrValue = (balance / 200).toFixed(2);

  useEffect(() => {
    if (screen === 'splash') {
      const interval = setInterval(() => { setLoading(prev => (prev >= 100 ? 100 : prev + 5)); }, 50);
      setTimeout(() => setScreen('auth'), 2500);
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
            setDoc(userRef, { name: currentUser.displayName, email: currentUser.email, balance: 500, earnedBalance: 0, botTier: 'none', uid: currentUser.uid });
          }
        });
        setScreen('hub');
      } else { setScreen('auth'); }
    });
    return () => unsubscribe();
  }, []);

  // --- 💸 PURCHASE LOGIC ---
  const handlePurchase = () => {
    const usdAmount = (purchaseAmount * 2.60).toFixed(2);
    window.open(`https://nowpayments.io/payment/?api_key=3THXNSZ-AYVMTP6-HQ9KGKK-9J6CQD7&amount=${usdAmount}&currency=usd&order_id=${user?.uid}_${Date.now()}`, '_blank');
  };

  // --- 📤 TRANSFER LOGIC ---
  const handleTransfer = async () => {
    if (transferAmt <= 0 || transferAmt > balance) return alert("Invalid Amount!");
    if (!targetId) return alert("Please enter User ID");

    const recipientRef = doc(db, "users", targetId);
    const recipientSnap = await getDoc(recipientRef);

    if (recipientSnap.exists()) {
      await updateDoc(doc(db, "users", user.uid), { balance: increment(-transferAmt) });
      await updateDoc(recipientRef, { balance: increment(transferAmt) });
      alert("Transfer Successful! Coins sent to: " + recipientSnap.data().name);
      setWalletTab('main');
    } else {
      alert("Error: Recipient ID not found in AJ Database.");
    }
  };

  // --- 📥 WITHDRAW LOGIC ---
  const handleWithdraw = async () => {
    if (balance < 2500) return alert("Minimum 2,500 Coins needed to Withdraw!");
    if (!payoutAddress) return alert("Enter Binance/EasyPaisa details");

    await addDoc(collection(db, "withdraw_requests"), {
      uid: user.uid,
      email: user.email,
      amount: balance,
      address: payoutAddress,
      status: "pending",
      date: new Date()
    });
    alert("Request Sent! CEO Ali will process your USDT/Cash in 24 hours.");
    setWalletTab('main');
  };

  if (screen === 'splash') return (
    <main className="min-h-screen bg-black flex flex-col items-center justify-center text-white">
      <div className="w-24 h-24 border-4 border-cyan-500 rounded-full animate-pulse mb-6 flex items-center justify-center shadow-[0_0_50px_#06b6d4]">
        <span className="text-5xl font-black italic">AJ</span>
      </div>
      <h1 className="text-2xl font-black tracking-widest">WELCOME</h1>
    </main>
  );

  if (screen === 'auth' && !user) return (
    <main className="min-h-screen bg-[#050505] flex flex-col items-center justify-center p-6 text-white text-center">
      <div className="w-full max-w-sm bg-white/[0.02] border border-white/10 p-12 rounded-[3rem] shadow-2xl">
        <h2 className="text-6xl font-black mb-10 italic text-cyan-400">AJ <span className="text-white">ID</span></h2>
        <button onClick={() => signInWithPopup(auth, googleProvider)} className="w-full py-5 bg-white text-black font-black text-xl rounded-2xl active:scale-95 shadow-xl transition-all">CONTINUE WITH GOOGLE</button>
        <p className="mt-8 text-yellow-500 font-bold text-xs animate-bounce uppercase">+500 COINS BONUS</p>
      </div>
    </main>
  );

  return (
    <main className="min-h-screen bg-[#020617] text-white font-sans overflow-x-hidden relative">
      
      {/* HEADER */}
      <header className="fixed top-0 w-full p-4 flex justify-between items-center z-[100] bg-black/60 backdrop-blur-xl border-b border-white/5">
        <div className="text-xl font-black italic text-cyan-400">AJ STUDIO</div>
        <div className="flex items-center gap-3">
          <div onClick={() => setScreen('wallet')} className="flex items-center gap-3 bg-white/5 px-4 py-2 rounded-full border border-white/10 shadow-lg cursor-pointer">
            <div className="text-right leading-none pr-2 border-r border-white/10">
               <p className="text-xs font-black text-yellow-500">{balance} 🪙</p>
               <p className="text-[10px] text-green-400 font-bold">${usdtValue} USDT</p>
            </div>
            <img src={user?.photoURL} className="w-8 h-8 rounded-full border-2 border-cyan-500" />
          </div>
          <button onClick={() => signOut(auth)} className="p-2 bg-red-500/10 rounded-full text-red-500"><LogOut size={18} /></button>
        </div>
      </header>

      {/* DASHBOARD */}
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
          <div onClick={() => { setScreen('wallet'); setWalletTab('main'); }} className="bg-white/5 border-2 border-yellow-500/30 rounded-[2rem] p-6 h-48 md:h-80 flex flex-col items-center justify-center active:scale-95 transition-all cursor-pointer shadow-xl relative z-30">
            <Wallet className="text-yellow-500 w-10 h-10 md:w-20 md:h-20 mb-2" />
            <h2 className="font-black text-xs md:text-3xl uppercase text-yellow-500">Wallet</h2>
          </div>
          <div onClick={() => setScreen('ai')} className="bg-white/5 border border-white/10 rounded-[2rem] p-6 h-48 md:h-80 flex flex-col items-center justify-center active:scale-95 transition-all cursor-pointer shadow-xl relative z-30">
            <Bot className="mb-2 text-green-400 w-10 h-10 md:w-20 md:h-20" />
            <h2 className="font-black text-xs md:text-3xl uppercase font-black">AJ AI</h2>
          </div>
        </div>
      </section>

      {/* --- MODAL: VVIP WALLET SYSTEM --- */}
      {screen === 'wallet' && (
        <div className="fixed inset-0 z-[200] bg-black/95 backdrop-blur-3xl flex flex-col items-center p-8 overflow-y-auto animate-in slide-in-from-bottom duration-300">
           <button onClick={() => setScreen('hub')} className="self-start text-yellow-500 font-bold text-sm mb-12 uppercase tracking-widest">← Back to Hub</button>
           
           <div className="w-full max-w-md bg-white/[0.03] border border-white/10 p-10 rounded-[3rem] text-center shadow-2xl">
              <h2 className="text-5xl font-black text-yellow-500 mb-2">{balance} <span className="text-lg">Coins</span></h2>
              <h3 className="text-2xl font-black text-green-400 mb-10">${usdtValue} USDT</h3>

              {walletTab === 'main' && (
                <div className="flex flex-col gap-4">
                   <button onClick={() => setWalletTab('purchase')} className="flex items-center justify-between bg-white text-black p-5 rounded-2xl font-black active:scale-95">
                      <div className="flex items-center gap-3"><CreditCard size={20}/> PURCHASE</div>
                      <ChevronRight size={16}/>
                   </button>
                   <button onClick={() => setWalletTab('transfer')} className="flex items-center justify-between bg-white/5 border border-white/10 p-5 rounded-2xl font-black text-cyan-400">
                      <div className="flex items-center gap-3"><Send size={20}/> TRANSFER</div>
                      <ChevronRight size={16}/>
                   </button>
                   <button onClick={() => setWalletTab('withdraw')} className="flex items-center justify-between bg-white/5 border border-white/10 p-5 rounded-2xl font-black text-pink-500">
                      <div className="flex items-center gap-3"><ArrowUpRight size={20}/> WITHDRAW</div>
                      <ChevronRight size={16}/>
                   </button>
                </div>
              )}

              {walletTab === 'purchase' && (
                <div className="flex flex-col gap-5 animate-in fade-in">
                   <p className="text-xs text-gray-500 uppercase">Start from 5 OMR</p>
                   <div className="relative">
                      <input type="number" value={purchaseAmount} onChange={(e)=>setPurchaseAmount(Number(e.target.value))} className="w-full bg-white/5 border-2 border-white/10 p-5 rounded-2xl text-4xl font-black text-center outline-none" />
                      <span className="absolute right-4 top-6 text-gray-600 font-bold">OMR</span>
                   </div>
                   <button onClick={handlePurchase} className="w-full py-5 bg-white text-black font-black text-xl rounded-2xl">BUY {purchaseAmount * 200} COINS</button>
                   <button onClick={()=>setWalletTab('main')} className="text-gray-600 text-xs">CANCEL</button>
                </div>
              )}

              {walletTab === 'transfer' && (
                <div className="flex flex-col gap-4 animate-in fade-in">
                   <input type="text" placeholder="Recipient ID" value={targetId} onChange={(e)=>setTargetId(e.target.value)} className="w-full bg-white/5 border border-white/10 p-4 rounded-xl text-center text-white outline-none" />
                   <input type="number" placeholder="Coins Amount" value={transferAmt} onChange={(e)=>setTransferAmount(Number(e.target.value))} className="w-full bg-white/5 border border-white/10 p-4 rounded-xl text-center text-white outline-none" />
                   <button onClick={handleTransfer} className="w-full py-4 bg-cyan-600 rounded-xl font-black uppercase">Transfer Now</button>
                   <button onClick={()=>setWalletTab('main')} className="text-gray-600 text-xs">BACK</button>
                   <p className="text-[10px] text-gray-500 italic mt-4">Your Unique ID: <br/> <span className="text-cyan-400 font-mono">{user?.uid}</span></p>
                </div>
              )}

              {walletTab === 'withdraw' && (
                <div className="flex flex-col gap-4 animate-in fade-in">
                   <select className="w-full bg-white/5 border border-white/10 p-4 rounded-xl text-white outline-none">
                      <option>Binance Pay (USDT)</option>
                      <option>EasyPaisa (PKR)</option>
                      <option>Oman Bank (OMR)</option>
                   </select>
                   <input type="text" placeholder="Wallet Address / Number" value={payoutAddress} onChange={(e)=>setPayoutAddress(e.target.value)} className="w-full bg-white/5 border border-white/10 p-4 rounded-xl text-center text-white outline-none" />
                   <div className="p-4 border-2 border-dashed border-white/10 rounded-2xl">
                      <p className="text-xs text-pink-500 font-bold italic uppercase">Min: 2,500 Earned Coins</p>
                   </div>
                   <button onClick={handleWithdraw} className="w-full py-5 bg-pink-600 rounded-2xl font-black uppercase">Request Cash-out</button>
                   <button onClick={()=>setWalletTab('main')} className="text-gray-600 text-xs">BACK</button>
                </div>
              )}
           </div>
        </div>
      )}

      {/* --- AI BOT OVERLAY --- */}
      {screen === 'ai' && (
        <div className="fixed inset-0 z-[200] bg-black flex flex-col items-center p-8 overflow-y-auto animate-in slide-in-from-right duration-500">
           <button onClick={() => setScreen('hub')} className="self-start text-green-400 font-bold text-sm mb-12 uppercase">← Back</button>
           <h2 className="text-5xl font-black mb-16 text-center uppercase text-white italic">AJ AI <span className="text-green-500">BOT</span></h2>
           <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-4xl">
              <div onClick={() => alert("BASIC BOT: Needs 2,500 Coins")} className="bg-white/5 border border-white/10 p-10 rounded-3xl text-center hover:border-cyan-500 transition-all cursor-pointer">
                 <ShieldCheck size={40} className="mx-auto mb-4 text-cyan-400" />
                 <h3 className="text-2xl font-black uppercase">Basic Bot</h3>
                 <p className="text-2xl font-black text-white my-6">2,500 Coins</p>
                 <button className="w-full py-4 bg-cyan-600 rounded-xl font-black uppercase">Activate</button>
              </div>
              <div onClick={() => alert("VVIP BOT: Needs 7,500 Coins")} className="bg-white/5 border-2 border-yellow-500/30 p-10 rounded-3xl text-center relative hover:border-yellow-500 transition-all cursor-pointer">
                 <Crown size={40} className="mx-auto mb-4 text-yellow-500" />
                 <h3 className="text-2xl font-black uppercase">VVIP Bot</h3>
                 <p className="text-2xl font-black text-white my-6">7,500 Coins</p>
                 <button className="w-full py-4 bg-yellow-600 rounded-xl font-black text-black uppercase">Activate</button>
              </div>
           </div>
        </div>
      )}

      {/* FOUNDER & FOOTER */}
      <section className="py-20 bg-black flex justify-center px-4 border-y border-white/5"><img src="/founder_card.jpg" alt="F" className="w-full max-w-4xl h-auto rounded-3xl shadow-2xl" /></section>
      <footer className="bg-black py-20 px-8 border-t border-cyan-500/10 text-center">
        <div className="max-w-7xl mx-auto flex flex-col items-center gap-12">
          <div className="text-6xl md:text-9xl font-black italic tracking-tighter text-white uppercase drop-shadow-[0_0_30px_rgba(6,182,212,0.8)]">AJ STUDIO</div>
          <div className="flex gap-14">
               <a href="https://wa.me/96878994093" target="_blank" className="text-green-500 hover:scale-125 transition-all"><MessageCircle size={55}/></a>
               <a href="https://x.com/Ali20352061" target="_blank" className="text-white text-5xl font-black hover:scale-125 transition-all">X</a>
               <a href="https://www.instagram.com/innocent.a.jutt" target="_blank" className="text-pink-500 text-5xl font-black italic">i</a>
          </div>
          <p className="text-gray-700 font-black tracking-[1em] text-[10px] uppercase">Muscat, Sultanate of Oman</p>
        </div>
      </footer>
    </main>
  );
}