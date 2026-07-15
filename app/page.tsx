"use client";
import React, { useState, useEffect } from 'react';
import { auth, db, googleProvider } from '../firebaseConfig';
import { signInWithPopup, onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, setDoc, onSnapshot, updateDoc, increment, collection, addDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { Trophy, Zap, Bot, Download, Activity, Send, MessageCircle, Copy, CheckCircle2, CreditCard, Wallet, Mail, Smartphone } from 'lucide-react';
import emailjs from 'emailjs-com';

// --- CONFIGURATIONS ---
const EMAILJS_CONFIG = {
  Service_ID: "service_6w1sols",
  Template_ID: "template_o1c40nv",
  Public_Key: "6JCPm9fo38ovnA5LG"
};

const NOWPAYMENTS_API_KEY = "3THXNSZ-AYVMTP6-HQ9KGKK-9J6CQD7";

export default function AJSuperPortal() {
  const [screen, setScreen] = useState('splash');
  const [walletTab, setWalletTab] = useState('main');
  const [user, setUser] = useState(null);
  const [balance, setBalance] = useState(0);
  const [botTier, setBotTier] = useState('none');
  const [invested, setInvested] = useState(0);
  const [selectedGame, setSelectedGame] = useState(null);
  const [copied, setCopied] = useState(false);

  // AI STATES
  const [visualProfit, setVisualProfit] = useState(0);
  const [tradeLogs, setTradeLogs] = useState(["Initialising Neural Link...", "Analysing Market Volatility..."]);

  // INPUT STATES
  const [purchaseAmount, setPurchaseAmount] = useState(20);
  const [purchaseMethod, setPurchaseMethod] = useState('Binance (TRC20)');
  const [purchaseTxId, setPurchaseTxId] = useState('');
  const [transferId, setTransferId] = useState('');
  const [transferAmount, setTransferAmount] = useState(0);
  const [payoutMethod, setPayoutMethod] = useState('Binance Pay (USDT)');
  const [payoutId, setPayoutId] = useState(''); 
  const [cardName, setCardName] = useState('');
  const [cardNumber, setCardNumber] = useState('');

  const displayBalance = (balance + visualProfit).toFixed(2);
  const displayUsdt = ((balance + visualProfit) / 100).toFixed(2);

  const copyToClipboard = (id: string) => {
    navigator.clipboard.writeText(id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // --- REVENUE SPLIT (NO LOSS MATH 70/30) ---
  useEffect(() => {
    const handleSDKMessages = async (event) => {
      if (!user) return;
      const data = event.detail || event.data;
      if (!data || !data.type) return;

      const userRef = doc(db, "users", user.uid);
      const adminRef = doc(db, "admin_ledger", "platform_stats");
      const rawPoints = data.amount || data.coins || 0;
      const safeTotalValue = rawPoints / 1000; 

      if (data.type === 'EARNED' || data.type === "ADD_AD_REVENUE" || data.type === "SYNC_GAME_COINS") {
        await updateDoc(userRef, { balance: increment(safeTotalValue * 0.30) });
        await updateDoc(adminRef, { total_revenue: increment(safeTotalValue * 0.70) });
      }
    };
    window.addEventListener("message", handleSDKMessages);
    return () => window.removeEventListener("message", handleSDKMessages);
  }, [user]);

  // --- AI BOT OFFLINE SYNC ---
  useEffect(() => {
    let logInt, visualInt, dbSyncInt;
    if (user && botTier !== 'none' && invested > 0) {
      logInt = setInterval(() => {
        const acts = ["Scalping BTC", "Neural Execution", "Hedging Risks"];
        setTradeLogs(prev => [`[${new Date().toLocaleTimeString()}] ${acts[Math.floor(Math.random()*3)]}...`, ...prev.slice(0, 3)]);
      }, 7000);
      const dailyRate = botTier === 'vvip' ? 0.05 : 0.02;
      const profitPerSec = (invested * dailyRate) / 86400;
      visualInt = setInterval(() => setVisualProfit(prev => prev + profitPerSec), 1000);
      dbSyncInt = setInterval(async () => {
        setVisualProfit(curr => {
          if (curr >= 1) {
            const sync = Math.floor(curr);
            updateDoc(doc(db, "users", user.uid), { balance: increment(sync), lastSync: serverTimestamp() });
            return curr - sync;
          } return curr;
        });
      }, 900000);
    }
    return () => { clearInterval(logInt); clearInterval(visualInt); clearInterval(dbSyncInt); };
  }, [user, botTier, invested]);

  // --- AUTH ---
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        const userRef = doc(db, "users", currentUser.uid);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          const userData = userSnap.data();
          if (userData.botTier !== 'none' && userData.lastSync) {
            const sec = (new Date().getTime() - userData.lastSync.toDate().getTime()) / 1000;
            const offProfit = (userData.invested * (userData.botTier === 'vvip' ? 0.05 : 0.02) * sec) / 86400;
            if (offProfit > 0.1) await updateDoc(userRef, { balance: increment(offProfit), lastSync: serverTimestamp() });
          }
        } else {
          await setDoc(userRef, { name: currentUser.displayName, email: currentUser.email, balance: 500, botTier: 'none', invested: 0, uid: currentUser.uid, lastSync: serverTimestamp() });
        }
        onSnapshot(userRef, (snap) => { if (snap.exists()) { setBalance(snap.data().balance); setBotTier(snap.data().botTier); setInvested(snap.data().invested); } });
        setScreen('hub');
      } else setScreen('auth');
    });
    return () => unsubscribe();
  }, []);

  const handleLogin = () => signInWithPopup(auth, googleProvider);

  // --- PURCHASE LOGIC (Airtm + Binance) ---
  const handlePurchase = async () => {
    if (purchaseMethod === 'Binance (TRC20)') {
        try {
          const res = await fetch('https://api.nowpayments.io/v1/invoice', {
            method: 'POST',
            headers: { 'x-api-key': NOWPAYMENTS_API_KEY, 'Content-Type': 'application/json' },
            body: JSON.stringify({ price_amount: purchaseAmount, price_currency: "usd", pay_currency: "usdttrc20", order_id: `AJ_${Date.now()}` })
          });
          const data = await res.json();
          if (data.invoice_url) window.open(data.invoice_url, '_blank');
        } catch (e) { alert("Gateway Error"); }
    } else {
        if(!purchaseTxId) return alert("Enter Airtm TX ID after sending.");
        await addDoc(collection(db, "manual_deposits"), { uid: user.uid, email: user.email, amount: purchaseAmount, method: "Airtm", txId: purchaseTxId, status: "pending", date: serverTimestamp() });
        alert("✅ Airtm Request Sent to Gmail: aliassim339@gmail.com");
        setWalletTab('main');
    }
  };

  // --- WITHDRAW LOGIC (All Options Intact) ---
  const handleWithdraw = async () => {
    if (balance < 2500) return alert("Min 2,500 Coins!");
    let finalDetails = payoutId;
    if (payoutMethod.includes('Visa')) finalDetails = `Name: ${cardName} | Card: ${cardNumber}`;
    
    await addDoc(collection(db, "withdraw_requests"), { 
        uid: user.uid, 
        email: user.email, 
        amount: balance, 
        method: payoutMethod, 
        details: finalDetails, 
        status: "pending", 
        date: serverTimestamp() 
    });
    alert("✅ Payout Request Sent!"); 
    setWalletTab('main');
  };

  const activateBot = async (tier, cost) => {
    if (balance < cost) return alert("Insufficient Balance!");
    await updateDoc(doc(db, "users", user.uid), { balance: increment(-cost), botTier: tier, invested: cost, lastSync: serverTimestamp() });
    setVisualProfit(0);
    alert("🚀 BOT ACTIVATED!");
  };

  // --- RENDERING ---
  if (screen === 'splash') return (
    <main className="h-screen bg-black flex flex-col items-center justify-center text-white">
      <div className="w-44 h-44 bg-black rounded-full border-4 border-cyan-500 shadow-[0_0_60px_#06b6d4] overflow-hidden mb-8 animate-pulse"><img src="/logo.png" className="w-full h-full object-cover" /></div>
      <h1 className="text-4xl font-black text-cyan-400 tracking-widest uppercase">AJ PORTAL</h1>
    </main>
  );

  if (screen === 'auth') return (
    <main className="min-h-screen bg-black flex flex-col items-center justify-center p-6 text-white text-center">
      <div className="w-full max-w-sm bg-white/5 border border-white/10 p-12 rounded-[3rem] shadow-2xl">
        <h2 className="text-6xl font-black mb-10 text-cyan-400 italic font-orbitron">AJ ID</h2>
        <button onClick={handleLogin} className="w-full py-5 bg-white text-black font-black text-xl rounded-2xl">CONTINUE WITH GOOGLE</button>
        <p className="mt-8 text-yellow-500 font-bold">+500 BONUS</p>
      </div>
    </main>
  );

  return (
    <main className="min-h-screen bg-[#020617] text-white font-sans overflow-x-hidden relative">
      <header className="fixed top-0 w-full p-4 flex justify-between items-center z-[100] bg-black/80 backdrop-blur-xl border-b border-white/5">
        <div className="text-xl font-black text-cyan-400 italic">AJ STUDIO</div>
        <div className="flex items-center gap-3">
          <div onClick={() => {setScreen('wallet'); setWalletTab('main')}} className="flex items-center gap-3 bg-white/5 px-4 py-2 rounded-full border border-white/10 cursor-pointer">
            <span className="text-xs font-black text-yellow-500">{displayBalance} 🪙</span>
            <span className="text-[10px] text-green-400 font-bold">${displayUsdt}</span>
            {user && <img src={user.photoURL} className="w-8 h-8 rounded-full border border-cyan-500" />}
          </div>
          <button onClick={() => signOut(auth)} className="p-2 bg-red-500/10 text-red-500 font-bold text-[8px] rounded-full uppercase">Exit</button>
        </div>
      </header>

      {/* HUB SECTION */}
      <section className="min-h-screen flex flex-col items-center justify-center p-4 pt-24 relative">
        <h1 className="text-4xl md:text-8xl font-black text-center mb-12 uppercase drop-shadow-[0_0_20px_#22d3ee]">AJ SUPER PORTAL</h1>
        <div className="grid grid-cols-2 gap-4 md:gap-16 w-full max-w-4xl relative z-30">
          <div onClick={() => setScreen('arcade')} className="bg-white/5 border border-white/10 rounded-3xl h-48 md:h-80 flex flex-col items-center justify-center cursor-pointer shadow-xl active:scale-95 transition-all hover:border-cyan-400">
            <Trophy className="text-cyan-400 w-10 h-10 md:w-20 md:h-20 mb-2" />
            <span className="font-black text-xs md:text-3xl uppercase">Gaming</span>
          </div>
          <div onClick={() => setScreen('social')} className="bg-white/5 border border-white/10 rounded-3xl h-48 md:h-80 flex flex-col items-center justify-center cursor-pointer shadow-xl active:scale-95 transition-all relative z-50 hover:border-pink-500">
            <Zap className="text-pink-500 w-10 h-10 md:w-20 md:h-20 mb-2" />
            <span className="font-black text-xs md:text-3xl uppercase">Social</span>
          </div>
          <div onClick={() => {setScreen('wallet'); setWalletTab('main')}} className="bg-white/5 border-2 border-yellow-500/30 rounded-3xl h-48 md:h-80 flex flex-col items-center justify-center cursor-pointer shadow-xl active:scale-95 transition-all hover:border-yellow-500">
            <img src="/gold.jpg" className="w-14 h-14 mb-2" /><h2 className="font-black text-xs md:text-3xl uppercase text-yellow-500">Wallet</h2>
          </div>
          <div onClick={() => setScreen('ai')} className="bg-white/5 border border-white/10 rounded-3xl h-48 md:h-80 flex flex-col items-center justify-center cursor-pointer shadow-xl active:scale-95 transition-all hover:border-green-500">
            <Bot className="text-green-400 w-10 h-10 md:w-20 md:h-20 mb-2" />
            <span className="font-black text-xs md:text-3xl uppercase">AJ AI</span>
          </div>
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0">
            <div className="w-24 h-24 md:w-96 md:h-96 bg-black border-[15px] border-cyan-500 rounded-full flex items-center justify-center shadow-[0_0_100px_#06b6d4] overflow-hidden">
               <img src="/logo.png" className="w-full h-full object-cover opacity-60 animate-pulse" />
            </div>
          </div>
        </div>
      </section>

      {/* WALLET MODAL */}
      {screen === 'wallet' && (
        <div className="fixed inset-0 z-[300] bg-black/98 flex flex-col items-center p-8 overflow-y-auto">
          <button onClick={() => {setScreen('hub'); setWalletTab('main')}} className="self-start text-cyan-400 mb-8 font-bold uppercase tracking-widest transition-all hover:brightness-125">← BACK</button>
          <div className="w-full max-w-md bg-[#111] border border-white/10 p-10 rounded-3xl text-center shadow-2xl">
            <h2 className="text-5xl font-black text-yellow-500 mb-8">{displayBalance} 🪙</h2>
            
            {walletTab === 'main' && (
              <div className="flex flex-col gap-4">
                <button onClick={()=>setWalletTab('purchase')} className="bg-white text-black py-4 rounded-xl font-black uppercase shadow-lg transition-all hover:scale-105">Purchase</button>
                <button onClick={()=>setWalletTab('transfer')} className="bg-white/10 text-cyan-400 py-4 rounded-xl font-black border border-cyan-500/30 uppercase transition-all hover:bg-cyan-500/10">Transfer</button>
                <button onClick={()=>setWalletTab('withdraw')} className="bg-white/10 text-pink-500 py-4 rounded-xl font-black border border-pink-500/30 uppercase transition-all hover:bg-pink-500/10">Withdraw</button>
              </div>
            )}

            {/* PURCHASE OPTIONS (Binance + Airtm) */}
            {walletTab === 'purchase' && (
              <div className="flex flex-col gap-5 text-left">
                <label className="text-[10px] font-black text-cyan-400 uppercase tracking-widest ml-1">Choose Method</label>
                <select value={purchaseMethod} onChange={(e)=>setPurchaseMethod(e.target.value)} className="w-full bg-gray-900 border border-white/10 p-4 rounded-xl text-white font-bold outline-none">
                  <option>Binance (TRC20)</option>
                  <option>Airtm (Gmail Account)</option>
                </select>

                <div className="bg-black border-2 border-white/10 p-6 rounded-3xl text-center">
                  <p className="text-yellow-500 text-4xl font-black mb-1">{(purchaseAmount * 100)} 🪙</p>
                  <input type="number" value={purchaseAmount} onChange={(e)=>setPurchaseAmount(Number(e.target.value))} className="w-full bg-transparent text-white text-2xl text-center outline-none font-bold" />
                </div>

                {purchaseMethod === 'Airtm (Gmail Account)' && (
                  <div className="p-4 bg-slate-900 rounded-2xl border border-dashed border-cyan-500/50">
                    <p className="text-[10px] text-gray-400 mb-2 uppercase">Step 1: Send funds to Airtm Gmail:</p>
                    <p className="text-cyan-400 font-bold mb-3 select-all bg-white/5 p-2 rounded">aliassim339@gmail.com</p>
                    <p className="text-[10px] text-gray-400 mb-1 uppercase">Step 2: Enter Transaction ID:</p>
                    <input type="text" placeholder="TX ID from Airtm" value={purchaseTxId} onChange={(e)=>setPurchaseTxId(e.target.value)} className="bg-black border p-3 rounded-xl text-white outline-none border-white/10 w-full" />
                  </div>
                )}

                <button onClick={handlePurchase} className="bg-cyan-500 py-4 rounded-xl font-black uppercase shadow-lg active:scale-95 transition-all">Confirm Purchase</button>
                <button onClick={()=>setWalletTab('main')} className="text-gray-500 text-xs uppercase text-center mt-2">Cancel</button>
              </div>
            )}

            {walletTab === 'transfer' && (
              <div className="flex flex-col gap-4">
                 <div className="bg-cyan-500/10 border border-cyan-500/30 p-5 rounded-2xl mb-2 relative group cursor-pointer" onClick={() => copyToClipboard(user?.uid || "")}>
                    <p className="text-[10px] text-gray-500 uppercase font-black mb-1 tracking-[0.2em]">My Referral ID</p>
                    <p className="text-xl md:text-2xl font-black text-cyan-400 break-all uppercase">{user?.uid}</p>
                    <div className="absolute right-4 top-1/2 -translate-y-1/2">{copied ? <CheckCircle2 size={20} className="text-green-500" /> : <Copy size={20} className="text-cyan-400 opacity-50" />}</div>
                 </div>
                <input type="text" placeholder="RECIPIENT ID" value={transferId} onChange={(e)=>setTransferId(e.target.value)} className="bg-black border p-4 rounded-xl text-white text-center font-bold outline-none border-white/10 focus:border-cyan-500" />
                <input type="number" placeholder="AMOUNT" value={transferAmount} onChange={(e)=>setTransferAmount(Number(e.target.value))} className="bg-black border p-4 rounded-xl text-white text-center font-bold outline-none border-white/10 focus:border-cyan-500" />
                <button onClick={handleTransfer} className="bg-cyan-600 py-4 rounded-xl font-black uppercase shadow-lg active:scale-95 transition-all">SEND COINS</button>
                <button onClick={()=>setWalletTab('main')} className="text-gray-500 text-xs uppercase mt-2">Back</button>
              </div>
            )}

            {/* WITHDRAW OPTIONS (All Original + Airtm) */}
            {walletTab === 'withdraw' && (
              <div className="flex flex-col gap-4 text-left">
                <label className="text-[10px] font-black text-pink-500 uppercase tracking-widest ml-1">Payout Method</label>
                <select value={payoutMethod} onChange={(e)=>setPayoutMethod(e.target.value)} className="w-full bg-gray-900 border border-white/10 p-4 rounded-xl text-white font-bold outline-none focus:border-pink-500">
                  <option>Binance Pay (USDT)</option>
                  <option>Airtm (Gmail Account)</option>
                  <option>EasyPaisa (PKR)</option>
                  <option>JazzCash (PKR)</option>
                  <option>Visa Transfer (Master/Visa)</option>
                </select>

                {payoutMethod.includes('Visa') ? (
                  <div className="flex flex-col gap-3">
                    <input type="text" placeholder="NAME ON CARD" value={cardName} onChange={(e)=>setCardName(e.target.value)} className="bg-black border p-4 rounded-xl text-white font-bold outline-none border-white/10" />
                    <input type="text" placeholder="CARD NUMBER" value={cardNumber} onChange={(e)=>setCardNumber(e.target.value)} className="bg-black border p-4 rounded-xl text-white font-bold outline-none border-white/10" />
                  </div>
                ) : (
                  <input 
                    type="text" 
                    placeholder={payoutMethod.includes('Airtm') ? "ENTER AIRTM GMAIL" : payoutMethod.includes('Binance') ? "ENTER BINANCE ID" : "ENTER MOBILE NUMBER"} 
                    value={payoutId} 
                    onChange={(e)=>setPayoutId(e.target.value)} 
                    className="bg-black border p-4 rounded-xl text-white text-center font-bold outline-none border-white/10" 
                  />
                )}

                <button onClick={handleWithdraw} className="bg-pink-600 py-4 rounded-xl font-black uppercase shadow-lg active:scale-95 transition-all">REQUEST PAYOUT</button>
                <button onClick={()=>setWalletTab('main')} className="text-gray-500 text-xs uppercase text-center mt-2">Back</button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* FOOTER & APK INSTALL BUTTON (AS ORIGINAL) */}
      <footer className="bg-black py-24 px-10 text-center flex flex-col items-center">
        <div className="text-7xl md:text-[10rem] font-black italic text-cyan-400 drop-shadow-[0_0_30px_#06b6d4] mb-12 uppercase">AJ STUDIO</div>
        <button onClick={handleInstallApp} className="group relative px-12 py-4 bg-cyan-500 text-black font-black uppercase rounded-full shadow-[0_0_40px_#06b6d4] animate-pulse transition-all hover:scale-105 active:scale-95">
          <span className="relative z-10 flex items-center gap-2"><Download size={22} /> Install AJ App</span>
          <div className="absolute inset-0 bg-white/20 group-hover:translate-x-full transition-transform duration-500 -skew-x-12"></div>
        </button>
      </footer>
    </main>
  );
}