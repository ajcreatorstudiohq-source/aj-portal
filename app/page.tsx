"use client";
import React, { useState, useEffect } from 'react';
import { auth, db, googleProvider } from '../firebaseConfig';
import { signInWithPopup, onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, setDoc, onSnapshot, updateDoc, increment, collection, addDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { Trophy, Zap, Bot, Download, Activity, Send, MessageCircle } from 'lucide-react';
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
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showIosModal, setShowIosModal] = useState(false);

  // AI BOT STATES
  const [visualProfit, setVisualProfit] = useState(0);
  const [tradeLogs, setTradeLogs] = useState(["Neural Link Active...", "Scanning Market..."]);

  // INPUT STATES
  const [purchaseAmount, setPurchaseAmount] = useState(20);
  const [transferId, setTransferId] = useState('');
  const [transferAmount, setTransferAmount] = useState(0);
  const [payoutMethod, setPayoutMethod] = useState('Binance Pay (USDT)');
  const [payoutId, setPayoutId] = useState('');
  const [cardName, setCardName] = useState('');
  const [cardNumber, setCardNumber] = useState('');

  const displayBalance = (balance + visualProfit).toFixed(2);
  const displayUsdt = ((balance + visualProfit) / 100).toFixed(2);

  // --- 1. APK DOWNLOAD & iOS LOGIC ---
  useEffect(() => {
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch((err) => console.log(err));
    }
  }, []);

  const handleInstallApp = () => {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    if (isIOS) {
      setShowIosModal(true);
    } else {
      const link = document.createElement('a');
      link.href = '/aj-portal.apk';
      link.download = 'aj-portal.apk';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      alert("📥 AJ App download ho rahi hai... Install karke full screen enjoy karein.");
    }
  };

  // --- 2. REVENUE SPLITS ---
  useEffect(() => {
    const handleSDKMessages = async (event) => {
      if (!user) return;
      const data = event.detail || event.data;
      if (!data || !data.type) return;
      const rawReward = data.amount || data.coins || 0;
      const userRef = doc(db, "users", user.uid);
      const adminRef = doc(db, "admin_ledger", "platform_stats");
      if (data.type === 'EARNED' || data.type === "ADD_AD_REVENUE" || data.type === "SYNC_GAME_COINS") {
        await updateDoc(userRef, { balance: increment(rawReward * 0.30) });
        await updateDoc(adminRef, { total_revenue: increment(rawReward * 0.70) });
      }
      if (data.type === 'GIFT_RECEIVED') {
        await updateDoc(userRef, { balance: increment(rawReward * 0.60) });
        await updateDoc(adminRef, { total_gift_tax: increment(rawReward * 0.40) });
      }
    };
    window.addEventListener("message", handleSDKMessages);
    return () => window.removeEventListener("message", handleSDKMessages);
  }, [user]);

  // --- 3. AI BOT LOGIC ---
  useEffect(() => {
    let logInt, visualInt, dbSyncInt;
    if (user && botTier !== 'none' && invested > 0) {
      logInt = setInterval(() => {
        const actions = ["Scalping BTC", "Neural Execution", "Analyzing Volatility"];
        setTradeLogs(prev => [`[${new Date().toLocaleTimeString()}] ${actions[Math.floor(Math.random()*3)]}...`, ...prev.slice(0, 3)]);
      }, 5000);
      const dailyRate = botTier === 'vvip' ? 0.05 : 0.02;
      const profitPerSec = (invested * dailyRate) / 86400;
      visualInt = setInterval(() => setVisualProfit(prev => prev + profitPerSec), 1000);
      dbSyncInt = setInterval(async () => {
        setVisualProfit(currentProfit => {
          if (currentProfit >= 1) {
            const syncAmount = Math.floor(currentProfit);
            updateDoc(doc(db, "users", user.uid), { balance: increment(syncAmount), lastSync: serverTimestamp() });
            return currentProfit - syncAmount;
          }
          return currentProfit;
        });
      }, 900000);
    }
    return () => { clearInterval(logInt); clearInterval(visualInt); clearInterval(dbSyncInt); };
  }, [user, botTier, invested]);

  // --- 4. AUTH & SYNC ---
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        const userRef = doc(db, "users", currentUser.uid);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          const userData = userSnap.data();
          if (userData.botTier !== 'none' && userData.lastSync) {
            const lastSyncTime = userData.lastSync.toDate().getTime();
            const secPassed = (new Date().getTime() - lastSyncTime) / 1000;
            const offlineProfit = (userData.invested * (userData.botTier === 'vvip' ? 0.05 : 0.02) * secPassed) / 86400;
            if (offlineProfit > 1) await updateDoc(userRef, { balance: increment(offlineProfit), lastSync: serverTimestamp() });
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

  const handleLogin = () => { googleProvider.setCustomParameters({ prompt: 'select_account' }); signInWithPopup(auth, googleProvider); };
  
  const handlePurchase = async () => {
    try {
      const res = await fetch('https://api.nowpayments.io/v1/invoice', {
        method: 'POST',
        headers: { 'x-api-key': NOWPAYMENTS_API_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({ price_amount: purchaseAmount, price_currency: "usd", pay_currency: "usdttrc20", order_id: `AJ_${Date.now()}`, success_url: window.location.origin })
      });
      const data = await res.json();
      if (data.invoice_url) window.open(data.invoice_url, '_blank');
      else alert("Error: Min $20 for TRC20.");
    } catch (e) { alert("Payment Gateway Error."); }
  };

  const handleTransfer = async () => {
    if (!transferId || transferAmount <= 0 || transferAmount > balance) return alert("Invalid Data.");
    const recRef = doc(db, "users", transferId);
    const recSnap = await getDoc(recRef);
    if (recSnap.exists()) {
      await updateDoc(doc(db, "users", user.uid), { balance: increment(-transferAmount) });
      await updateDoc(recRef, { balance: increment(transferAmount) });
      alert("✅ Transfer Success!"); setWalletTab('main');
    } else alert("ID Not Found.");
  };

  const handleWithdraw = async () => {
    if (balance < 2500) return alert("Min 2,500 Coins!");
    
    // Collecting specific details based on method
    let finalDetails = "";
    if (payoutMethod.includes('Visa')) {
      if (!cardName || !cardNumber) return alert("Card details missing!");
      finalDetails = `Card Name: ${cardName} | Card Number: ${cardNumber}`;
    } else {
      if (!payoutId) return alert("Required ID/Phone missing!");
      finalDetails = `${payoutMethod} ID/Phone: ${payoutId}`;
    }

    await addDoc(collection(db, "withdraw_requests"), { 
      uid: user.uid, 
      email: user.email,
      amount: balance, 
      method: payoutMethod, 
      details: finalDetails, 
      status: "pending", 
      date: serverTimestamp() 
    });
    
    alert("✅ Withdraw Request Sent! Admin will process it soon.");
    setWalletTab('main');
  };

  const activateBot = async (tier, cost) => {
    if (balance < cost) return alert("Insufficient Balance!");
    await updateDoc(doc(db, "users", user.uid), { balance: increment(-cost), botTier: tier, invested: cost, lastSync: serverTimestamp() });
    setVisualProfit(0);
    alert("🚀 BOT ACTIVATED!");
  };

  if (screen === 'splash') return (
    <main className="h-screen bg-black flex flex-col items-center justify-center text-white">
      <div className="w-44 h-44 bg-black rounded-full border-4 border-cyan-500 shadow-[0_0_60px_#06b6d4] overflow-hidden mb-8 animate-pulse">
        <img src="/logo.png" className="w-full h-full object-cover" />
      </div>
      <h1 className="text-4xl font-black text-cyan-400 tracking-widest uppercase">AJ PORTAL</h1>
    </main>
  );

  if (screen === 'auth') return (
    <main className="min-h-screen bg-black flex flex-col items-center justify-center p-6 text-white text-center">
      <div className="w-full max-w-sm bg-white/5 border border-white/10 p-12 rounded-[3rem] shadow-2xl">
        <h2 className="text-6xl font-black mb-10 text-cyan-400 italic">AJ ID</h2>
        <button onClick={handleLogin} className="w-full py-5 bg-white text-black font-black text-xl rounded-2xl active:scale-95 transition-all">CONTINUE WITH GOOGLE</button>
        <p className="mt-8 text-yellow-500 font-bold tracking-widest">+500 BONUS</p>
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

      <section className="min-h-screen flex flex-col items-center justify-center p-4 pt-24 relative">
        <h1 className="text-4xl md:text-8xl font-black text-center mb-12 uppercase drop-shadow-[0_0_20px_#22d3ee]">AJ SUPER PORTAL</h1>
        <div className="grid grid-cols-2 gap-4 md:gap-16 w-full max-w-4xl relative z-30">
          <div onClick={() => setScreen('arcade')} className="bg-white/5 border border-white/10 rounded-3xl h-48 md:h-80 flex flex-col items-center justify-center cursor-pointer shadow-xl active:scale-95 transition-all">
            <Trophy className="text-cyan-400 w-10 h-10 md:w-20 md:h-20 mb-2" />
            <span className="font-black text-xs md:text-3xl uppercase">Gaming</span>
          </div>
          <div onClick={() => setScreen('social')} className="bg-white/5 border border-white/10 rounded-3xl h-48 md:h-80 flex flex-col items-center justify-center cursor-pointer shadow-xl active:scale-95 transition-all">
            <Zap className="text-pink-500 w-10 h-10 md:w-20 md:h-20 mb-2" />
            <span className="font-black text-xs md:text-3xl uppercase">Social</span>
          </div>
          <div onClick={() => {setScreen('wallet'); setWalletTab('main')}} className="bg-white/5 border-2 border-yellow-500/30 rounded-3xl h-48 md:h-80 flex flex-col items-center justify-center cursor-pointer shadow-xl active:scale-95 transition-all">
            <img src="/gold.jpg" className="w-14 h-14 mb-2" /><h2 className="font-black text-xs md:text-3xl uppercase text-yellow-500">Wallet</h2>
          </div>
          <div onClick={() => setScreen('ai')} className="bg-white/5 border border-white/10 rounded-3xl h-48 md:h-80 flex flex-col items-center justify-center cursor-pointer shadow-xl active:scale-95 transition-all">
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

      {/* MODALS */}
      {screen === 'arcade' && (
        <div className="fixed inset-0 z-[300] bg-black p-8 overflow-y-auto">
          <button onClick={() => {setScreen('hub'); setSelectedGame(null)}} className="text-cyan-400 font-bold mb-10 uppercase tracking-widest">← BACK</button>
          {!selectedGame ? (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-6 max-w-5xl mx-auto pb-20">
              {['Rider King', 'Pulse Racer', 'Subsea Surge', 'Neon Strike', 'Volcano Escape', 'Ludo Elite Royal', 'Puck Pulse Elite'].map((game) => {
                const isComingSoon = game === 'Ludo Elite Royal' || game === 'Puck Pulse Elite';
                const folderName = game.replace(' Elite Royal', '').replace(' Elite', '').toLowerCase().replace(/ /g, '-');
                return (
                  <div key={game} onClick={() => !isComingSoon && setSelectedGame(game)} className="bg-white/5 border border-white/10 p-4 rounded-3xl text-center cursor-pointer transition-all hover:border-cyan-400">
                    <img src={`/games/${folderName}/logo.png`} className="w-full aspect-square rounded-2xl mb-4 object-cover" onError={(e:any) => { e.target.src = "/logo.png"; }} />
                    <h3 className="font-black text-[10px] uppercase mb-3">{game}</h3>
                    <button className={`w-full py-2 rounded-full font-black text-[9px] uppercase ${isComingSoon ? 'bg-gray-800 text-gray-500' : 'bg-cyan-500 text-black shadow-[0_0_10px_#06b6d4]'}`}>
                      {isComingSoon ? 'Coming Soon' : 'Play Now'}
                    </button>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="w-full h-[80vh] bg-black rounded-3xl border-2 border-cyan-500 overflow-hidden relative shadow-2xl">
              <iframe src={`/games/${selectedGame.toLowerCase().replace(/ elite royal/g, '').replace(/ elite/g, '').replace(/ /g, '-')}/index.html`} className="w-full h-full border-none" />
            </div>
          )}
        </div>
      )}

      {screen === 'wallet' && (
        <div className="fixed inset-0 z-[300] bg-black/98 flex flex-col items-center p-8 overflow-y-auto">
          <button onClick={() => {setScreen('hub'); setWalletTab('main')}} className="self-start text-cyan-400 mb-8 font-bold uppercase tracking-widest">← BACK</button>
          <div className="w-full max-w-md bg-[#111] border border-white/10 p-10 rounded-3xl text-center shadow-2xl">
            <h2 className="text-5xl font-black text-yellow-500 mb-8">{displayBalance} 🪙</h2>
            {walletTab === 'main' && (
              <div className="flex flex-col gap-4">
                <button onClick={()=>setWalletTab('purchase')} className="bg-white text-black py-4 rounded-xl font-black uppercase">Purchase</button>
                <button onClick={()=>setWalletTab('transfer')} className="bg-white/10 text-cyan-400 py-4 rounded-xl font-black border border-cyan-500/30 uppercase">Transfer</button>
                <button onClick={()=>setWalletTab('withdraw')} className="bg-white/10 text-pink-500 py-4 rounded-xl font-black border border-pink-500/30 uppercase">Withdraw</button>
              </div>
            )}
            {walletTab === 'purchase' && (
              <div className="flex flex-col gap-5">
                <div className="bg-black border-2 border-white/10 p-6 rounded-3xl text-center">
                  <p className="text-yellow-500 text-4xl font-black mb-1">{(purchaseAmount * 100)} 🪙</p>
                  <input type="number" value={purchaseAmount} onChange={(e)=>setPurchaseAmount(Number(e.target.value))} className="w-full bg-transparent text-white text-2xl text-center outline-none font-bold" />
                </div>
                <button onClick={handlePurchase} className="bg-cyan-500 py-4 rounded-xl font-black uppercase shadow-[0_0_20px_#06b6d4]">PAY NOW (TRC20)</button>
                <button onClick={()=>setWalletTab('main')} className="text-gray-500 text-xs uppercase">Cancel</button>
              </div>
            )}
            {walletTab === 'transfer' && (
              <div className="flex flex-col gap-4">
                 <div className="bg-cyan-500/10 border border-cyan-500/30 p-5 rounded-2xl mb-2">
                    <p className="text-[10px] text-gray-500 uppercase font-black mb-1 tracking-[0.2em]">My Referral ID</p>
                    <p className="text-xl md:text-2xl font-black text-cyan-400 break-all drop-shadow-[0_0_10px_rgba(34,211,238,0.8)] animate-pulse uppercase">
                      {user?.uid}
                    </p>
                 </div>
                <input type="text" placeholder="RECIPIENT ID" value={transferId} onChange={(e)=>setTransferId(e.target.value)} className="bg-black border p-4 rounded-xl text-white text-center font-bold outline-none border-white/10 focus:border-cyan-500" />
                <input type="number" placeholder="AMOUNT" value={transferAmount} onChange={(e)=>setTransferAmount(Number(e.target.value))} className="bg-black border p-4 rounded-xl text-white text-center font-bold outline-none border-white/10 focus:border-cyan-500" />
                <button onClick={handleTransfer} className="bg-cyan-600 py-4 rounded-xl font-black uppercase shadow-lg active:scale-95 transition-all">SEND COINS</button>
                <button onClick={()=>setWalletTab('main')} className="text-gray-500 text-xs uppercase mt-2">Back</button>
              </div>
            )}
            {walletTab === 'withdraw' && (
              <div className="flex flex-col gap-4 text-left">
                <label className="text-[10px] font-black text-pink-500 uppercase tracking-widest ml-1">Payment Method</label>
                <select value={payoutMethod} onChange={(e)=>setPayoutMethod(e.target.value)} className="w-full bg-gray-900 border border-white/10 p-4 rounded-xl text-white font-bold outline-none focus:border-pink-500">
                  <option>Binance Pay (USDT)</option>
                  <option>EasyPaisa (PKR)</option>
                  <option>JazzCash (PKR)</option>
                  <option>Visa Transfer (Master/Visa)</option>
                </select>

                {payoutMethod.includes('Visa') ? (
                  <div className="flex flex-col gap-3">
                    <input type="text" placeholder="NAME ON CARD" value={cardName} onChange={(e)=>setCardName(e.target.value)} className="bg-black border p-4 rounded-xl text-white font-bold outline-none border-white/10" />
                    <input type="text" placeholder="CARD NUMBER (16 DIGITS)" value={cardNumber} onChange={(e)=>setCardNumber(e.target.value)} className="bg-black border p-4 rounded-xl text-white font-bold outline-none border-white/10" />
                  </div>
                ) : (
                  <input 
                    type="text" 
                    placeholder={payoutMethod.includes('Binance') ? "ENTER BINANCE ID" : "ENTER PHONE NUMBER"} 
                    value={payoutId} 
                    onChange={(e)=>setPayoutId(e.target.value)} 
                    className="bg-black border p-4 rounded-xl text-white font-bold outline-none border-white/10" 
                  />
                )}

                <button onClick={handleWithdraw} className="bg-pink-600 py-4 rounded-xl font-black uppercase shadow-lg active:scale-95 transition-all">REQUEST PAYOUT</button>
                <button onClick={()=>setWalletTab('main')} className="text-gray-500 text-xs uppercase text-center mt-2">Back</button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* AI BOT */}
      {screen === 'ai' && (
        <div className="fixed inset-0 z-[200] bg-black flex flex-col items-center p-8 overflow-y-auto pb-20">
          <button onClick={() => setScreen('hub')} className="self-start text-green-400 font-bold mb-12 uppercase tracking-widest">← Back</button>
          <h2 className="text-5xl font-black mb-12 text-center text-white italic">AJ AI BOT</h2>
          {botTier !== 'none' && (
            <div className="w-full max-w-2xl bg-white/5 border-2 border-green-500/40 p-8 rounded-[3rem] text-center mb-16 shadow-[0_0_30px_rgba(34,197,94,0.2)]">
              <Activity size={60} className="mx-auto mb-6 text-green-500 animate-pulse" />
              <h2 className="text-4xl font-black text-white mb-2 uppercase tracking-tighter">{botTier} BOT RUNNING</h2>
              <div className="w-full bg-black/50 border border-green-500/30 p-6 rounded-2xl font-mono text-left">
                <span className="text-white font-black text-lg">PROFIT: +{visualProfit.toFixed(4)} 🪙</span>
                <div className="h-20 overflow-hidden text-green-500/70 mt-2">{tradeLogs.map((log, i) => ( <div key={i}>{log}</div> ))}</div>
              </div>
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-4xl">
            <div className={`p-10 rounded-3xl text-center border-2 transition-all ${botTier === 'basic' ? 'border-green-500 bg-green-500/10' : 'border-white/10 bg-white/5'}`}>
              <h3 className="text-xl font-black text-cyan-400 uppercase">Basic (+2% Daily)</h3>
              <p className="text-3xl font-black text-white my-6">2,500 Coins</p>
              <button onClick={() => botTier !== 'basic' && activateBot('basic', 2500)} className={`w-full py-4 rounded-xl font-black uppercase ${botTier === 'basic' ? 'bg-green-500 text-black cursor-not-allowed' : 'bg-cyan-600'}`}>
                {botTier === 'basic' ? "RUNNING" : "ACTIVATE"}
              </button>
            </div>
            <div className={`p-10 rounded-3xl text-center border-2 transition-all ${botTier === 'vvip' ? 'border-yellow-500 bg-yellow-500/10' : 'border-white/10 bg-white/5'}`}>
              <h3 className="text-xl font-black text-yellow-500 uppercase">VVIP (+5% Daily)</h3>
              <p className="text-3xl font-black text-white my-6">7,500 Coins</p>
              <button onClick={() => botTier !== 'vvip' && activateBot('vvip', 7500)} className={`w-full py-4 rounded-xl font-black uppercase ${botTier === 'vvip' ? 'bg-yellow-500 text-black cursor-not-allowed' : 'bg-yellow-600'}`}>
                {botTier === 'vvip' ? "RUNNING" : "ACTIVATE"}
              </button>
            </div>
          </div>
        </div>
      )}

      {screen === 'social' && (
        <div className="fixed inset-0 z-[400] bg-[#020617] p-8 overflow-y-auto flex flex-col items-center">
            <button onClick={() => setScreen('hub')} className="self-start text-pink-500 font-bold mb-10 tracking-widest uppercase">← BACK</button>
            <h2 className="text-5xl font-black mb-12 uppercase text-white text-center italic tracking-widest">AJ SOCIAL HUB</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-4xl">
               {['AJ TikReels', 'AJ Pulse', 'AJ Live Chat', 'AJ Discover'].map((mod) => (
                 <div key={mod} onClick={() => alert(`${mod} arriving in Season 2!`)} className="p-12 bg-white/5 border border-white/10 rounded-[3rem] text-center group hover:border-pink-500 cursor-pointer transition-all">
                    <MessageCircle className="mx-auto mb-4 text-pink-500 group-hover:scale-110 transition-transform" size={40} />
                    <h3 className="text-2xl font-black text-white uppercase italic">{mod}</h3>
                    <p className="text-[10px] text-gray-500 mt-2 font-bold tracking-widest uppercase">Locked</p>
                 </div>
               ))}
            </div>
        </div>
      )}

      {showIosModal && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl">
          <div className="bg-slate-900 border-2 border-cyan-400 p-8 rounded-[2.5rem] max-w-sm w-full text-center shadow-[0_0_80px_rgba(34,211,238,0.3)]">
            <div className="w-20 h-20 bg-black rounded-3xl mx-auto mb-6 border-2 border-cyan-500 overflow-hidden shadow-lg">
                <img src="/logo.png" className="w-full h-full object-cover" />
            </div>
            <h2 className="text-2xl font-black text-cyan-400 mb-6 uppercase italic">Install AJ Portal</h2>
            <div className="space-y-6 text-left text-gray-300">
              <div className="flex items-center gap-4 bg-white/5 p-3 rounded-2xl">
                <span className="bg-cyan-400 text-black w-7 h-7 rounded-full flex items-center justify-center font-black">1</span>
                <p className="text-sm">Safari mein neechay <span className="text-white font-bold inline-flex items-center gap-1 underline underline-offset-4">Share Icon <Send size={14} className="-rotate-45" /></span> dabanayein.</p>
              </div>
              <div className="flex items-center gap-4 bg-white/5 p-3 rounded-2xl">
                <span className="bg-cyan-400 text-black w-7 h-7 rounded-full flex items-center justify-center font-black">2</span>
                <p className="text-sm"><span className="text-white font-bold italic text-cyan-400">"Add to Home Screen"</span> par click karein.</p>
              </div>
            </div>
            <button onClick={() => setShowIosModal(false)} className="mt-8 w-full py-4 bg-cyan-500 text-black font-black rounded-2xl uppercase shadow-md hover:scale-105 transition-all">DONE</button>
          </div>
        </div>
      )}

      <section className="py-20 bg-black flex justify-center px-4 border-y border-white/5">
        <img src="/founder_card.jpg" className="w-full max-w-4xl rounded-3xl shadow-2xl" />
      </section>

      <footer className="bg-black py-24 px-10 text-center flex flex-col items-center">
        <div className="text-7xl md:text-[10rem] font-black italic text-cyan-400 drop-shadow-[0_0_30px_#06b6d4] mb-12 uppercase">AJ STUDIO</div>
        <div className="flex justify-center gap-10 mb-16">
          <a href="https://wa.me/96878994093" target="_blank" className="text-green-500 border border-green-500 px-6 py-2 rounded-full font-bold uppercase hover:bg-green-500 hover:text-black transition-all">Whatsapp</a>
          <a href="https://x.com/Ali20352061" target="_blank" className="text-white border border-white px-6 py-2 rounded-full font-bold uppercase hover:bg-white hover:text-black transition-all">X (Twitter)</a>
        </div>
        <button onClick={handleInstallApp} className="group relative px-12 py-4 bg-cyan-500 text-black font-black uppercase rounded-full shadow-[0_0_40px_#06b6d4] animate-pulse transition-all hover:scale-105">
          <span className="relative z-10 flex items-center gap-2"><Download size={22} /> Install AJ App</span>
          <div className="absolute inset-0 bg-white/10 group-hover:translate-x-full transition-transform duration-500 -skew-x-12"></div>
        </button>
      </footer>
    </main>
  );
}