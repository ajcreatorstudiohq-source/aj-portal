"use client";
import React, { useState, useEffect } from 'react';
import { auth, db, googleProvider } from '../firebaseConfig'; 
import { signInWithPopup, onAuthStateChanged, signOut, setPersistence, browserLocalPersistence } from 'firebase/auth';
import { doc, setDoc, onSnapshot, updateDoc, increment, collection, addDoc, getDoc } from 'firebase/firestore';
import { MessageCircle, Trophy, Zap, Wallet, Bot, LogOut, Globe, ChevronRight, Send, CreditCard, ArrowUpRight, ShieldCheck, Crown, Activity, TrendingUp } from 'lucide-react';

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

  // --- 🔥 FIXED PURCHASE LINK (NO DASHBOARD) ---
  const handlePurchase = () => {
    const paymentUrl = "https://nowpayments.io/payment/?iid=6119249758&paymentId=4656497174";
    window.open(paymentUrl, '_blank');
  };

  const handleTransfer = async () => {
    if (transferAmount <= 0 || transferAmount > balance) return alert("Invalid Amount!");
    const recipientRef = doc(db, "users", transferId);
    const recipientSnap = await getDoc(recipientRef);
    if (recipientSnap.exists()) {
      await updateDoc(doc(db, "users", user.uid), { balance: increment(-transferAmount) });
      await updateDoc(recipientRef, { balance: increment(transferAmount) });
      alert("Transfer Successful!");
      setWalletTab('main');
    } else { alert("User ID not found!"); }
  };

  const handleWithdraw = async () => {
    if (balance < 2500) return alert("Min 2,500 Coins required!");
    let details = payoutMethod.includes('Visa') ? `Card: ${cardNumber} | Name: ${cardName}` : payoutId;
    if (!details) return alert("Please fill details!");
    await addDoc(collection(db, "withdraw_requests"), { uid: user.uid, email: user.email, amount: balance, method: payoutMethod, details: details, status: "pending", date: new Date() });
    alert("✅ Payout Request Sent!");
    setWalletTab('main');
  };

  const activateBot = async (tier: string, cost: number) => {
    if (balance < cost) return alert(`⚠️ Need ${cost} Coins!`);
    await updateDoc(doc(db, "users", user.uid), { balance: increment(-cost), botTier: tier, invested: cost });
    alert("🚀 BOT ACTIVE!");
  };

  if (screen === 'splash') return <main className="h-screen bg-black flex flex-col items-center justify-center text-white text-5xl font-black italic animate-pulse">AJ PORTAL</main>;

  if (screen === 'auth' && !user) return (
    <main className="min-h-screen bg-black flex flex-col items-center justify-center p-6 text-white text-center">
      <div className="w-full max-w-sm bg-white/[0.03] border border-white/10 p-12 rounded-[3rem] shadow-2xl">
        <h2 className="text-7xl font-black mb-8 italic text-cyan-400 uppercase">AJ <span className="text-white">ID</span></h2>
        <button onClick={handleLogin} className="w-full py-5 bg-white text-black font-black text-xl rounded-2xl active:scale-95 transition-all">CONTINUE WITH GOOGLE</button>
        <p className="mt-8 text-yellow-500 font-bold tracking-widest">+500 COINS BONUS</p>
      </div>
    </main>
  );

  return (
    <main className="min-h-screen bg-[#020617] text-white font-sans overflow-x-hidden relative">
      
      {/* HEADER */}
      <header className="fixed top-0 w-full p-4 flex justify-between items-center z-[100] bg-black/80 backdrop-blur-xl border-b border-white/5">
        <div className="text-xl font-black italic text-cyan-400">AJ STUDIO</div>
        <div className="flex items-center gap-3">
          <div onClick={() => {setScreen('wallet'); setWalletTab('main')}} className="flex items-center gap-3 bg-white/5 px-4 py-2 rounded-full border border-white/10 cursor-pointer shadow-lg">
             <div className="text-right leading-none">
                <p className="text-xs font-black text-yellow-500">{balance} 🪙</p>
                <p className="text-[10px] text-green-400 font-bold">${usdtValue}</p>
             </div>
             {user && <img src={user.photoURL} className="w-8 h-8 rounded-full border border-cyan-500" />}
          </div>
          <button onClick={() => signOut(auth)} className="p-2 bg-red-500/20 rounded-full text-red-500 hover:bg-red-500 hover:text-white transition-all"><LogOut size={16} /></button>
        </div>
      </header>

      {/* DASHBOARD (REDUCED OVERLAP) */}
      <section className="min-h-screen flex flex-col items-center justify-center p-4 pt-24 relative">
        <h1 className="text-4xl md:text-8xl font-black text-center mb-12 uppercase drop-shadow-[0_0_20px_#22d3ee]">AJ SUPER PORTAL</h1>
        <div className="grid grid-cols-2 gap-4 md:gap-16 w-full max-w-4xl relative z-30">
          <div className="bg-white/5 border border-white/10 rounded-3xl h-48 md:h-80 flex flex-col items-center justify-center active:scale-95 shadow-xl">
             <Trophy className="text-cyan-400 w-10 h-10 md:w-20 md:h-20 mb-2" />
             <span className="font-black text-xs md:text-2xl uppercase">Gaming</span>
          </div>
          <div onClick={() => setScreen('social')} className="bg-white/5 border border-white/10 rounded-3xl h-48 md:h-80 flex flex-col items-center justify-center active:scale-95 shadow-xl cursor-pointer">
             <Zap className="text-pink-500 w-10 h-10 md:w-20 md:h-20 mb-2" />
             <span className="font-black text-xs md:text-2xl uppercase">Social</span>
          </div>
          <div onClick={() => {setScreen('wallet'); setWalletTab('main')}} className="bg-white/5 border-2 border-yellow-500/30 rounded-3xl h-48 md:h-80 flex flex-col items-center justify-center cursor-pointer shadow-xl">
             <img src="/gold.jpg" className="w-14 h-14 mb-2" />
             <span className="font-black text-xs md:text-2xl uppercase text-yellow-500">Wallet</span>
          </div>
          <div onClick={() => setScreen('ai')} className="bg-white/5 border border-white/10 rounded-3xl h-48 md:h-80 flex flex-col items-center justify-center active:scale-95 shadow-xl cursor-pointer">
             <Bot className="text-green-400 w-10 h-10 md:w-20 md:h-20 mb-2" />
             <span className="font-black text-xs md:text-2xl uppercase">AJ AI</span>
          </div>
          
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0 opacity-20">
            <div className="w-24 h-24 md:w-96 md:h-96 border-2 border-cyan-500 rounded-full flex items-center justify-center">
              <span className="text-6xl font-black italic">HUB</span>
            </div>
          </div>
        </div>
      </section>

      {/* FOUNDER */}
      <section className="py-20 bg-black flex justify-center px-4 border-y border-white/5">
        <img src="/founder_card.jpg" className="w-full max-w-4xl rounded-3xl shadow-2xl" />
      </section>

      {/* WALLET MODAL (FIXED) */}
      {screen === 'wallet' && (
        <div className="fixed inset-0 z-[200] bg-black/98 flex flex-col items-center p-8 overflow-y-auto">
           <button onClick={() => setScreen('hub')} className="self-start text-cyan-400 mb-8 font-bold">← BACK</button>
           <div className="w-full max-w-md bg-[#111] border border-white/10 p-10 rounded-[3rem] text-center shadow-2xl">
              <h2 className="text-5xl font-black text-yellow-500 mb-2">{balance} 🪙</h2>
              <p className="text-green-400 font-black text-xl mb-8">${usdtValue} USDT</p>

              {walletTab === 'main' && (
                <div className="flex flex-col gap-4">
                   <button onClick={()=>setWalletTab('purchase')} className="bg-white text-black py-4 rounded-xl font-black">PURCHASE</button>
                   <button onClick={()=>setWalletTab('withdraw')} className="bg-white/10 text-pink-500 py-4 rounded-xl font-black border border-pink-500/30">WITHDRAW</button>
                   <button onClick={()=>setWalletTab('transfer')} className="bg-white/10 text-cyan-400 py-4 rounded-xl font-black border border-cyan-500/30">TRANSFER</button>
                </div>
              )}

              {walletTab === 'purchase' && (
                <div className="flex flex-col gap-5 animate-in fade-in">
                   <p className="text-xs text-gray-500 font-black uppercase">1 OMR = 200 Coins</p>
                   <div className="relative"><input type="number" value={purchaseAmount} onChange={(e)=>setPurchaseAmount(Number(e.target.value))} className="w-full bg-black border-2 border-white/10 p-5 rounded-2xl text-4xl text-center text-white" /><span className="absolute right-4 top-6 text-gray-600 font-bold uppercase">OMR</span></div>
                   <button onClick={handlePurchase} className="bg-cyan-500 py-4 rounded-xl font-black">PAY NOW</button>
                   <button onClick={()=>setWalletTab('main')} className="text-gray-500 text-xs">BACK</button>
                </div>
              )}

              {walletTab === 'transfer' && (
                <div className="flex flex-col gap-4 animate-in fade-in">
                   <input type="text" placeholder="RECIPIENT ID" onChange={(e)=>setTransferId(e.target.value)} className="bg-black border p-4 rounded-xl text-center" />
                   <input type="number" placeholder="AMOUNT" onChange={(e)=>setTransferAmount(Number(e.target.value))} className="bg-black border p-4 rounded-xl text-center" />
                   <button onClick={handleTransfer} className="bg-cyan-600 py-4 rounded-xl font-black">SEND NOW</button>
                   <button onClick={()=>setWalletTab('main')} className="text-gray-600 text-xs">BACK</button>
                   <div className="mt-8 p-4 bg-white/5 rounded-2xl border border-white/10">
                      <p className="text-[10px] text-gray-500 uppercase font-black mb-1">Your Unique AJ ID (To Receive Coins):</p>
                      <p className="text-cyan-400 font-mono text-sm break-all font-bold">{user?.uid}</p>
                   </div>
                </div>
              )}

              {walletTab === 'withdraw' && (
                <div className="flex flex-col gap-4">
                   <select value={payoutMethod} onChange={(e)=>setPayoutMethod(e.target.value)} className="w-full bg-gray-900 border border-white/20 p-4 rounded-xl text-white font-bold">
                      <option>Binance Pay (USDT)</option><option>EasyPaisa (PKR)</option><option>JazzCash (PKR)</option><option>Visa Transfer (Global)</option>
                   </select>
                   <input type="text" placeholder="Address / Phone Number" onChange={(e)=>setPayoutId(e.target.value)} className="bg-black border p-4 rounded-xl text-center" />
                   <button onClick={handleWithdraw} className="bg-pink-600 py-4 rounded-xl font-black">REQUEST PAYOUT</button>
                   <button onClick={()=>setWalletTab('main')} className="text-gray-500 text-xs uppercase">Back</button>
                </div>
              )}
           </div>
        </div>
      )}

      {/* AI BOT (WITH PROFIT) */}
      {screen === 'ai' && (
        <div className="fixed inset-0 z-[200] bg-black flex flex-col items-center p-8 overflow-y-auto">
           <button onClick={() => setScreen('hub')} className="self-start text-green-400 mb-8 font-bold">← BACK</button>
           <h2 className="text-5xl font-black mb-12 text-center uppercase text-white italic">AJ AI <span className="text-green-500">BOT</span></h2>
           {botTier === 'none' ? (
             <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-4xl">
                <div className="bg-white/5 border border-white/10 p-10 rounded-3xl text-center"><ShieldCheck size={40} className="mx-auto mb-4 text-cyan-400" /><h3 className="text-xl font-black">Basic Bot (+2% Daily)</h3><p className="text-3xl font-black text-white my-6">2,500 Coins</p><button onClick={() => activateBot('basic', 2500)} className="w-full py-4 bg-cyan-600 rounded-xl font-black">ACTIVATE</button></div>
                <div className="bg-white/5 border-2 border-yellow-500/30 p-10 rounded-3xl text-center shadow-2xl"><Crown size={40} className="mx-auto mb-4 text-yellow-500" /><h3 className="text-xl font-black">VVIP Bot (+5% Daily)</h3><p className="text-3xl font-black text-white my-6">7,500 Coins</p><button onClick={() => activateBot('vvip', 7500)} className="w-full py-4 bg-yellow-600 rounded-xl font-black text-black">ACTIVATE</button></div>
             </div>
           ) : (
             <div className="w-full max-w-2xl bg-white/5 border-2 border-green-500/40 p-16 rounded-[4rem] text-center"><Activity size={80} className="mx-auto mb-10 text-green-500 animate-pulse" /><h2 className="text-5xl font-black uppercase text-white mb-8">{botTier.toUpperCase()} BOT ACTIVE</h2><div className="mt-12 bg-green-500/20 py-5 rounded-2xl border border-green-500/50"><span className="font-black text-2xl text-green-400 uppercase tracking-tighter">AI TRADING LIVE...</span></div></div>
           )}
        </div>
      )}

      {/* FOOTER */}
      <footer className="bg-black py-24 text-center border-t border-white/5">
        <div className="text-7xl md:text-9xl font-black italic text-white uppercase opacity-10 mb-10 tracking-tighter">AJ STUDIO</div>
        <div className="flex justify-center gap-10">
            <a href="https://wa.me/96878994093" target="_blank" className="text-green-500 border border-green-500 px-6 py-2 rounded-full font-bold">WHATSAPP</a>
            <a href="https://x.com/Ali20352061" target="_blank" className="text-white border border-white px-6 py-2 rounded-full font-bold">X (Twitter)</a>
        </div>
        <p className="mt-12 text-gray-700 font-black tracking-[1em] text-[10px] uppercase">Muscat, Sultanate of Oman</p>
      </footer>
    </main>
  );
}