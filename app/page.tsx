"use client";
import React, { useState, useEffect } from 'react';
import { auth, db, googleProvider } from '../firebaseConfig'; 
import { signInWithPopup, onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, setDoc, onSnapshot, updateDoc, increment, collection, addDoc } from 'firebase/firestore';
import { MessageCircle, Trophy, Zap, Wallet, Bot, LogOut, Globe, ChevronRight, Send, CreditCard, ArrowUpRight, ShieldCheck, Crown, Coins } from 'lucide-react';

export default function AJSuperPortal() {
  const [screen, setScreen] = useState('splash');
  const [walletTab, setWalletTab] = useState('main'); // main, purchase, withdraw, transfer
  const [user, setUser] = useState<any>(null);
  const [balance, setBalance] = useState(0);
  const [earnedBalance, setEarnedBalance] = useState(0); // Only this can be withdrawn
  const [botTier, setBotTier] = useState('none');
  const [purchaseAmount, setPurchaseAmount] = useState(5);
  const [transferId, setTransferId] = useState('');
  const [transferAmount, setTransferAmount] = useState(0);

  // --- 💰 GLOBAL CURRENCY LOGIC (1 OMR = 200 Coins = $2.60) ---
  const omrValue = (balance / 200).toFixed(3);
  const usdtValue = (balance / 200 * 2.60).toFixed(2);
  const pkrValue = (balance / 200 * 730).toLocaleString(); // Approx 1 OMR = 730 PKR

  useEffect(() => {
    if (screen === 'splash') setTimeout(() => setScreen('auth'), 2000);
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
            setDoc(userRef, { 
              name: currentUser.displayName, 
              email: currentUser.email, 
              balance: 500, // 500 Welcome Bonus
              earnedBalance: 0,
              botTier: 'none',
              uid: currentUser.uid 
            });
          }
        });
        setScreen('hub');
      } else { setScreen('auth'); }
    });
    return () => unsubscribe();
  }, []);

  // --- 💳 PURCHASE LOGIC (Dynamic OMR) ---
  const handlePurchase = () => {
    if (purchaseAmount < 5) return alert("Minimum purchase is 5 OMR");
    const usdAmount = (purchaseAmount * 2.60).toFixed(2);
    const paymentUrl = `https://nowpayments.io/payment/?api_key=3THXNSZ-AYVMTP6-HQ9KGKK-9J6CQD7&amount=${usdAmount}&currency=usd&order_id=${user?.uid}_${Date.now()}`;
    window.open(paymentUrl, '_blank');
  };

  // --- 💸 WITHDRAW LOGIC (Loss-Proof) ---
  const handleWithdraw = async (method: string, address: string) => {
    if (earnedBalance < 2500) return alert("You need at least 2,500 EARNED coins to withdraw. Bonus coins are not withdrawable.");
    await addDoc(collection(db, "withdraw_requests"), {
      uid: user.uid,
      email: user.email,
      amount: earnedBalance,
      method: method,
      address: address,
      status: "pending",
      date: new Date()
    });
    alert("Withdrawal Request Sent to CEO Ali! Approval takes 24-48h.");
    setWalletTab('main');
  };

  // --- 🤖 AI BOT LOGIC (Tiers) ---
  const startBot = async (tier: 'basic' | 'vvip', cost: number) => {
    if (balance < cost) return alert("Insufficient balance to start this Bot.");
    await updateDoc(doc(db, "users", user.uid), {
      balance: increment(-cost),
      botTier: tier,
      botStartedAt: new Date()
    });
    alert(`${tier.toUpperCase()} Bot Activated!`);
  };

  if (screen === 'splash') return (
    <main className="min-h-screen bg-black flex flex-col items-center justify-center text-white">
      <div className="w-24 h-24 border-4 border-cyan-500 rounded-full animate-pulse mb-6 shadow-[0_0_50px_#06b6d4]"></div>
      <h1 className="text-2xl font-black tracking-[0.5em]">AJ PORTAL</h1>
    </main>
  );

  if (screen === 'auth' && !user) return (
    <main className="min-h-screen bg-[#050505] flex flex-col items-center justify-center p-6 text-white text-center">
      <div className="w-full max-w-sm bg-white/[0.02] border border-white/10 p-12 rounded-[3rem] shadow-2xl">
        <h2 className="text-6xl font-black mb-10 italic">AJ <span className="text-cyan-400">ID</span></h2>
        <button onClick={() => signInWithPopup(auth, googleProvider)} className="w-full py-5 bg-white text-black font-black text-xl rounded-2xl active:scale-95 transition-all">CONTINUE WITH GOOGLE</button>
        <p className="mt-8 text-yellow-500 font-bold text-xs animate-bounce">+500 COINS SIGNUP BONUS</p>
      </div>
    </main>
  );

  return (
    <main className="min-h-screen bg-[#020617] text-white font-sans overflow-x-hidden relative">
      
      {/* HEADER WITH REAL-TIME MULTI-CURRENCY */}
      <header className="fixed top-0 w-full p-4 flex justify-between items-center z-[100] bg-black/80 backdrop-blur-xl border-b border-white/5">
        <div className="text-xl font-black italic text-cyan-400">AJ STUDIO</div>
        <div onClick={() => setScreen('wallet')} className="flex items-center gap-3 bg-white/5 px-4 py-2 rounded-full border border-white/10 cursor-pointer shadow-lg">
          <div className="text-right leading-none pr-2 border-r border-white/10">
             <p className="text-[10px] font-black text-yellow-500">{balance} 🪙</p>
             <p className="text-[10px] text-green-400 font-bold">${usdtValue} USDT</p>
          </div>
          <img src={user?.photoURL} className="w-8 h-8 rounded-full border border-cyan-500" />
        </div>
      </header>

      {/* HUB SECTION */}
      <section className="min-h-screen flex flex-col items-center justify-center p-4 pt-24">
        <h1 className="text-4xl md:text-8xl font-black text-center mb-12 uppercase drop-shadow-[0_0_20px_#22d3ee]">AJ SUPER PORTAL</h1>
        <div className="grid grid-cols-2 gap-4 md:gap-16 w-full max-w-4xl relative z-30">
          <div className="bg-white/5 border border-white/10 rounded-[2rem] p-6 h-48 md:h-80 flex flex-col items-center justify-center active:scale-95 transition-all cursor-pointer shadow-xl">
            <Trophy className="text-cyan-400 w-10 h-10 md:w-20 md:h-20 mb-2" />
            <span className="font-black text-xs uppercase">Gaming</span>
          </div>
          <div onClick={() => setScreen('social')} className="bg-white/5 border border-white/10 rounded-[2rem] p-6 h-48 md:h-80 flex flex-col items-center justify-center active:scale-95 transition-all cursor-pointer shadow-xl">
            <Zap className="text-pink-500 w-10 h-10 md:w-20 md:h-20 mb-2" />
            <span className="font-black text-xs uppercase">Social</span>
          </div>
          <div onClick={() => setScreen('wallet')} className="bg-white/5 border-2 border-yellow-500/30 rounded-[2rem] p-6 h-48 md:h-80 flex flex-col items-center justify-center active:scale-95 transition-all cursor-pointer shadow-xl">
            <Wallet className="text-yellow-500 w-10 h-10 md:w-20 md:h-20 mb-2" />
            <span className="font-black text-xs uppercase">Wallet</span>
          </div>
          <div onClick={() => setScreen('ai')} className="bg-white/5 border border-white/10 rounded-[2rem] p-6 h-48 md:h-80 flex flex-col items-center justify-center active:scale-95 transition-all cursor-pointer shadow-xl">
            <Bot className="text-green-400 w-10 h-10 md:w-20 md:h-20 mb-2" />
            <span className="font-black text-xs uppercase">AJ AI</span>
          </div>
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0 opacity-20">
            <div className="w-24 h-24 md:w-96 md:h-96 border-2 border-cyan-500 rounded-full flex items-center justify-center"><span className="text-8xl font-black italic">HUB</span></div>
          </div>
        </div>
      </section>

      {/* --- VVIP WALLET OVERLAY --- */}
      {screen === 'wallet' && (
        <div className="fixed inset-0 z-[200] bg-black/95 backdrop-blur-3xl flex flex-col items-center p-8 overflow-y-auto animate-in slide-in-from-bottom duration-300">
           <button onClick={() => {setScreen('hub'); setWalletTab('main')}} className="self-start text-cyan-400 font-bold text-sm mb-8">← BACK TO HUB</button>
           
           <div className="w-full max-w-md bg-white/[0.02] border border-white/10 p-10 rounded-[3rem] text-center shadow-2xl">
              <h2 className="text-5xl font-black text-yellow-500 mb-1">{balance} <span className="text-sm font-light">Coins</span></h2>
              <div className="flex justify-center gap-4 text-sm font-bold text-gray-500 mb-8 uppercase tracking-widest">
                 <span className="text-green-400">${usdtValue} USDT</span> • <span>{omrValue} OMR</span> • <span className="text-blue-400">Rs {pkrValue}</span>
              </div>

              {walletTab === 'main' && (
                <div className="flex flex-col gap-4">
                   <button onClick={() => setWalletTab('purchase')} className="flex items-center justify-between bg-white text-black p-5 rounded-2xl font-black active:scale-95 transition-all">
                      <div className="flex items-center gap-3"><CreditCard size={20}/> BUY COINS</div>
                      <ChevronRight size={18}/>
                   </button>
                   <button onClick={() => setWalletTab('transfer')} className="flex items-center justify-between bg-white/5 border border-white/10 p-5 rounded-2xl font-black hover:border-cyan-500 transition-all">
                      <div className="flex items-center gap-3"><Send size={20}/> SEND TO FRIEND</div>
                      <ChevronRight size={18}/>
                   </button>
                   <button onClick={() => setWalletTab('withdraw')} className="flex items-center justify-between bg-white/5 border border-white/10 p-5 rounded-2xl font-black hover:border-pink-500 transition-all">
                      <div className="flex items-center gap-3"><ArrowUpRight size={20}/> WITHDRAW CASH</div>
                      <ChevronRight size={18}/>
                   </button>
                </div>
              )}

              {walletTab === 'purchase' && (
                <div className="flex flex-col gap-6 animate-in fade-in">
                   <p className="text-xs text-gray-500 uppercase">Rate: 1 OMR = 200 AJ Coins</p>
                   <div className="relative">
                      <input type="number" value={purchaseAmount} onChange={(e)=>setPurchaseAmount(Number(e.target.value))} className="w-full bg-white/5 border-2 border-white/10 p-5 rounded-2xl text-4xl font-black text-center outline-none focus:border-cyan-500" />
                      <span className="absolute right-4 top-6 text-gray-600 font-bold">OMR</span>
                   </div>
                   <div className="p-4 bg-cyan-500/10 rounded-2xl border border-cyan-500/20">
                      <p className="text-gray-400 text-xs">Receive: <span className="text-yellow-500 font-black">{purchaseAmount * 200} Coins</span></p>
                   </div>
                   <button onClick={handlePurchase} className="w-full py-5 bg-white text-black font-black text-xl rounded-2xl hover:bg-cyan-400 transition-all">PAY NOW</button>
                   <button onClick={()=>setWalletTab('main')} className="text-gray-600 text-xs uppercase">Cancel</button>
                </div>
              )}

              {walletTab === 'withdraw' && (
                <div className="flex flex-col gap-4 animate-in fade-in text-left">
                   <p className="text-[10px] text-gray-500 font-bold uppercase mb-2 text-center">Earned Balance: {earnedBalance} Coins</p>
                   <select className="w-full bg-white/5 border border-white/10 p-4 rounded-xl text-white outline-none">
                      <option>Binance Pay (USDT)</option>
                      <option>EasyPaisa (PKR)</option>
                      <option>Bank Transfer (OMR)</option>
                   </select>
                   <input type="text" placeholder="Wallet Address / Phone Number" className="w-full bg-white/5 border border-white/10 p-4 rounded-xl outline-none focus:border-pink-500" />
                   <div className="p-4 border-2 border-dashed border-white/10 rounded-2xl text-center">
                      <p className="text-xs text-pink-500 font-bold italic">Min Withdrawal: 2,500 Earned Coins</p>
                   </div>
                   <button onClick={() => handleWithdraw('Binance', 'test')} disabled={earnedBalance < 2500} className="w-full py-5 bg-pink-600 disabled:opacity-30 rounded-2xl font-black">REQUEST WITHDRAWAL</button>
                   <button onClick={()=>setWalletTab('main')} className="w-full text-center text-gray-600 text-xs mt-2 uppercase">Back</button>
                </div>
              )}
           </div>
        </div>
      )}

      {/* --- AI BOT OVERLAY --- */}
      {screen === 'ai' && (
        <div className="fixed inset-0 z-[200] bg-black flex flex-col items-center p-8 overflow-y-auto animate-in slide-in-from-right duration-500">
           <button onClick={() => setScreen('hub')} className="self-start text-green-400 font-bold text-sm mb-12 uppercase">← Back</button>
           <h2 className="text-5xl font-black mb-12 text-center uppercase tracking-tighter italic">AJ AI <span className="text-green-500">BOT</span></h2>
           
           <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-4xl">
              <div className="bg-white/5 border border-white/10 p-10 rounded-[3rem] text-center hover:border-cyan-500 transition-all">
                 <ShieldCheck size={40} className="mx-auto mb-4 text-cyan-400" />
                 <h3 className="text-2xl font-black">BASIC BOT</h3>
                 <p className="text-xs text-gray-500 mt-2 mb-6 tracking-widest uppercase">Earned Coins Supported</p>
                 <div className="text-3xl font-black text-white mb-6">2,500 <span className="text-xs opacity-50">Coins</span></div>
                 <button onClick={() => startBot('basic', 2500)} className="w-full py-4 bg-cyan-600 rounded-xl font-black">ACTIVATE</button>
              </div>

              <div className="bg-white/5 border-2 border-yellow-500/30 p-10 rounded-[3rem] text-center relative overflow-hidden group">
                 <div className="absolute top-0 right-0 bg-yellow-500 text-black px-4 py-1 text-[10px] font-black uppercase">Premium</div>
                 <Crown size={40} className="mx-auto mb-4 text-yellow-500" />
                 <h3 className="text-2xl font-black">VVIP BOT</h3>
                 <p className="text-xs text-gray-500 mt-2 mb-6 tracking-widest uppercase">High Profit Strategy</p>
                 <div className="text-3xl font-black text-white mb-6">7,500 <span className="text-xs opacity-50">Coins</span></div>
                 <button onClick={() => startBot('vvip', 7500)} className="w-full py-4 bg-yellow-600 rounded-xl font-black text-black">ACTIVATE</button>
              </div>
           </div>
        </div>
      )}

      {/* FOUNDER & FOOTER */}
      <section className="py-20 bg-black flex justify-center px-4 border-y border-white/5"><img src="/founder_card.jpg" alt="F" className="w-full max-w-4xl h-auto rounded-3xl" /></section>
      <footer className="bg-black py-20 px-8 text-center border-t border-white/5">
        <div className="text-7xl md:text-9xl font-black italic text-white opacity-20 mb-10 tracking-tighter">AJ STUDIO</div>
        <a href="https://wa.me/96878994093" target="_blank" className="bg-green-600/20 text-green-500 px-10 py-5 rounded-full border border-green-500 font-black uppercase tracking-widest active:scale-95 transition-all">Support WhatsApp</a>
      </footer>
    </main>
  );
}