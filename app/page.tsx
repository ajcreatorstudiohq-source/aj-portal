"use client";
import React, { useState, useEffect } from 'react';
import { auth, db, googleProvider } from '../firebaseConfig';
import { signInWithPopup, onAuthStateChanged, signOut, setPersistence, browserLocalPersistence } from 'firebase/auth';
import { doc, setDoc, onSnapshot, updateDoc, increment, collection, addDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { Trophy, Zap, Bot, Activity, Download } from 'lucide-react';
import emailjs from 'emailjs-com';

// --- EMAILJS CONFIG ---
const EMAILJS_CONFIG = {
  Service_ID: "service_6w1sols",
  Template_ID: "template_o1c40nv",
  Public_Key: "6JCPm9fo38ovnA5LG"
};

export default function AJSuperPortal() {
  const [screen, setScreen] = useState('splash');
  const [walletTab, setWalletTab] = useState('main');
  const [user, setUser] = useState(null);
  const [balance, setBalance] = useState(0);
  const [botTier, setBotTier] = useState('none');
  const [invested, setInvested] = useState(0);
  const [loading, setLoading] = useState(0);
  const [selectedGame, setSelectedGame] = useState(null);
  const [deferredPrompt, setDeferredPrompt] = useState(null);

  // --- AI TRADING STATES ---
  const [visualProfit, setVisualProfit] = useState(0);
  const [tradeLogs, setTradeLogs] = useState(["Initialising Neural Link...", "Analysing Market Volatility..."]);

  // Input States
  const [purchaseAmount, setPurchaseAmount] = useState(20);
  const [transferId, setTransferId] = useState('');
  const [transferAmount, setTransferAmount] = useState(0);
  const [payoutMethod, setPayoutMethod] = useState('Binance Pay (USDT)');
  const [payoutId, setPayoutId] = useState('');
  const [cardName, setCardName] = useState('');
  const [cardNumber, setCardNumber] = useState('');

  const displayBalance = (balance + visualProfit).toFixed(2);
  const displayUsdt = ((balance + visualProfit) / 100).toFixed(2);

  // --- EMAILJS HELPER ---
  const sendEmailNotification = (type, details) => {
    const templateParams = {
      to_name: "AJ Admin",
      from_name: user?.displayName || "User",
      message: `${type}: ${details}`,
      user_email: user?.email || "No Email"
    };
    emailjs.send(EMAILJS_CONFIG.Service_ID, EMAILJS_CONFIG.Template_ID, templateParams, EMAILJS_CONFIG.Public_Key)
      .catch(err => console.error("Email Error:", err));
  };

  // --- PWA INSTALL LOGIC ---
  useEffect(() => {
    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallPWA = () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      deferredPrompt.userChoice.then(() => setDeferredPrompt(null));
    }
  };

  // --- SDK MESSAGE LISTENER (70/30 & 60/40 SPLITS) ---
  useEffect(() => {
    const handleSDKMessages = async (event) => {
      if (!user) return;
      const data = event.detail || event.data;
      if (!data || !data.type) return;

      const userRef = doc(db, "users", user.uid);
      const adminRef = doc(db, "admin_ledger", "platform_stats");

      if (data.type === 'EARNED' || data.type === "ADD_AD_REVENUE") {
        const rawReward = data.amount || data.coins || 0;
        if (rawReward > 0) {
          await updateDoc(userRef, { balance: increment(rawReward * 0.30) });
          await updateDoc(adminRef, { total_revenue: increment(rawReward * 0.70) });
        }
      }

      if (data.type === 'GIFT_RECEIVED') {
        const rawGift = data.amount || data.coins || 0;
        if (rawGift > 0) {
          await updateDoc(userRef, { balance: increment(rawGift * 0.60) });
          await updateDoc(adminRef, { total_gift_tax: increment(rawGift * 0.40) });
        }
      }
    };
    window.addEventListener("message", handleSDKMessages);
    return () => window.removeEventListener("message", handleSDKMessages);
  }, [user]);

  // --- AI TRADING & OFFLINE SYNC ---
  useEffect(() => {
    let logInt, visualInt, dbSyncInt;
    if (user && botTier !== 'none' && invested > 0) {
      logInt = setInterval(() => {
        const actions = ["Analysing BTC", "Scalping ETH", "Hedging SOL"];
        setTradeLogs(prev => [`[${new Date().toLocaleTimeString()}] ${actions[Math.floor(Math.random()*actions.length)]}...`, ...prev.slice(0, 3)]);
      }, 7000);

      const dailyRate = botTier === 'vvip' ? 0.05 : 0.02;
      const profitPerSec = (invested * dailyRate) / 86400;

      visualInt = setInterval(() => setVisualProfit(prev => prev + profitPerSec), 1000);

      dbSyncInt = setInterval(async () => {
        setVisualProfit(currentProfit => {
          if (currentProfit >= 1) {
            const amountToSync = Math.floor(currentProfit);
            updateDoc(doc(db, "users", user.uid), { balance: increment(amountToSync), lastSync: serverTimestamp() });
            return currentProfit - amountToSync;
          }
          return currentProfit;
        });
      }, 600000); // 10 Min Sync
    }
    return () => { clearInterval(logInt); clearInterval(visualInt); clearInterval(dbSyncInt); };
  }, [user, botTier, invested]);

  // --- AUTH & LOGIN ---
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        const userRef = doc(db, "users", currentUser.uid);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
          const userData = userSnap.data();
          if (userData.botTier !== 'none' && userData.lastSync) {
             const seconds = (new Date().getTime() - userData.lastSync.toDate().getTime()) / 1000;
             const offlineProfit = (userData.invested * (userData.botTier === 'vvip' ? 0.05 : 0.02) * seconds) / 86400;
             if (offlineProfit > 1) {
                await updateDoc(userRef, { balance: increment(offlineProfit), lastSync: serverTimestamp() });
             }
          }
        } else {
          await setDoc(userRef, { name: currentUser.displayName, email: currentUser.email, balance: 500, botTier: 'none', invested: 0, uid: currentUser.uid, lastSync: serverTimestamp() });
        }
        onSnapshot(userRef, (snap) => {
          if(snap.exists()){ setBalance(snap.data().balance); setBotTier(snap.data().botTier); setInvested(snap.data().invested); }
        });
        setScreen('hub');
      } else { setScreen('auth'); }
    });
    return () => unsubscribe();
  }, []);

  const handleLogin = async () => {
    await setPersistence(auth, browserLocalPersistence);
    await signInWithPopup(auth, googleProvider);
  };

  const handleWithdraw = async () => {
    if (balance < 2500) return alert("Min 2,500 Coins!");
    const details = payoutMethod.includes('Visa') ? `Card: ${cardNumber}` : payoutId;
    await addDoc(collection(db, "withdraw_requests"), { uid: user.uid, amount: balance, method: payoutMethod, details, status: "pending", date: new Date() });
    sendEmailNotification("WITHDRAWAL", `${user.email} requested ${balance} coins via ${payoutMethod}`);
    alert("✅ Sent!"); setWalletTab('main');
  };

  const activateBot = async (tier, cost) => {
    if (balance < cost) return alert("Insufficient Balance!");
    await updateDoc(doc(db, "users", user.uid), { balance: increment(-cost), botTier: tier, invested: cost, lastSync: serverTimestamp() });
    setVisualProfit(0);
    sendEmailNotification("BOT_BUY", `${user.email} activated ${tier}`);
    alert("🚀 BOT ACTIVE!");
  };

  if (screen === 'splash') return <div className="h-screen bg-black flex items-center justify-center text-cyan-400 font-black text-3xl animate-pulse">AJ PORTAL</div>;

  if (screen === 'auth') return (
    <div className="h-screen bg-black flex flex-col items-center justify-center p-6 text-center">
      <h2 className="text-6xl font-black mb-10 text-cyan-400 uppercase italic">AJ ID</h2>
      <button onClick={handleLogin} className="bg-white text-black px-10 py-4 rounded-2xl font-black">CONTINUE WITH GOOGLE</button>
    </div>
  );

  return (
    <main className="min-h-screen bg-[#020617] text-white overflow-x-hidden">
      <header className="fixed top-0 w-full p-4 flex justify-between items-center z-[100] bg-black/80 backdrop-blur-xl border-b border-white/5">
        <div className="text-xl font-black italic text-cyan-400">AJ STUDIO</div>
        <div onClick={() => {setScreen('wallet'); setWalletTab('main')}} className="bg-white/5 px-4 py-2 rounded-full border border-white/10 cursor-pointer flex items-center gap-2">
            <span className="text-yellow-500 font-bold">{displayBalance} 🪙</span>
            <span className="text-green-400 text-xs">${displayUsdt}</span>
        </div>
      </header>

      <section className="min-h-screen flex flex-col items-center justify-center p-4 pt-24">
        <h1 className="text-5xl md:text-8xl font-black text-center mb-12 uppercase">AJ SUPER PORTAL</h1>
        <div className="grid grid-cols-2 gap-4 md:gap-10 w-full max-w-4xl">
           <div onClick={() => setScreen('arcade')} className="bg-white/5 border border-white/10 rounded-3xl h-40 flex flex-col items-center justify-center cursor-pointer">
              <Trophy className="text-cyan-400 mb-2" size={40} /> <span className="font-bold">GAMING</span>
           </div>
           <div onClick={() => setScreen('social')} className="bg-white/5 border border-white/10 rounded-3xl h-40 flex flex-col items-center justify-center cursor-pointer">
              <Zap className="text-pink-500 mb-2" size={40} /> <span className="font-bold">SOCIAL</span>
           </div>
           <div onClick={() => setScreen('wallet')} className="bg-white/5 border border-yellow-500/50 rounded-3xl h-40 flex flex-col items-center justify-center cursor-pointer">
              <Bot className="text-yellow-500 mb-2" size={40} /> <span className="font-bold">WALLET</span>
           </div>
           <div onClick={() => setScreen('ai')} className="bg-white/5 border border-green-500/50 rounded-3xl h-40 flex flex-col items-center justify-center cursor-pointer">
              <Activity className="text-green-400 mb-2" size={40} /> <span className="font-bold">AJ AI</span>
           </div>
        </div>
      </section>

      {/* MODALS / SCREENS */}
      {screen === 'arcade' && (
        <div className="fixed inset-0 z-[300] bg-black p-6 overflow-y-auto">
          <button onClick={() => {setScreen('hub'); setSelectedGame(null)}} className="text-cyan-400 font-bold mb-6">← BACK</button>
          {!selectedGame ? (
            <div className="grid grid-cols-2 gap-4">
              {['Rider King', 'Pulse Racer', 'Ludo'].map(g => (
                <div key={g} onClick={() => setSelectedGame(g)} className="bg-white/5 p-4 rounded-xl text-center border border-white/10">
                  <p className="font-bold text-sm uppercase">{g}</p>
                </div>
              ))}
            </div>
          ) : (
            <iframe src={`/games/${selectedGame.toLowerCase().replace(/ /g, '-')}/index.html`} className="w-full h-[80vh] rounded-2xl border-2 border-cyan-500" />
          )}
        </div>
      )}

      {screen === 'wallet' && (
        <div className="fixed inset-0 z-[300] bg-black p-8 flex flex-col items-center">
            <button onClick={() => setScreen('hub')} className="self-start text-cyan-400 mb-6">← BACK</button>
            <div className="w-full max-w-md bg-white/5 p-8 rounded-3xl border border-white/10 text-center">
               <h2 className="text-4xl font-black text-yellow-500 mb-6">{displayBalance} 🪙</h2>
               {walletTab === 'main' && (
                 <div className="flex flex-col gap-3">
                   <button onClick={()=>setWalletTab('purchase')} className="bg-white text-black py-4 rounded-xl font-bold">PURCHASE</button>
                   <button onClick={()=>setWalletTab('withdraw')} className="bg-pink-600 text-white py-4 rounded-xl font-bold">WITHDRAW</button>
                 </div>
               )}
               {walletTab === 'withdraw' && (
                 <div className="flex flex-col gap-4">
                   <select className="bg-black p-4 rounded-xl border border-white/20" onChange={(e)=>setPayoutMethod(e.target.value)}>
                     <option>Binance Pay (USDT)</option>
                     <option>EasyPaisa (PKR)</option>
                   </select>
                   <input type="text" placeholder="ID/Number" className="bg-black p-4 rounded-xl border" onChange={(e)=>setPayoutId(e.target.value)} />
                   <button onClick={handleWithdraw} className="bg-green-600 py-4 rounded-xl font-bold">SUBMIT</button>
                 </div>
               )}
            </div>
        </div>
      )}

      {screen === 'ai' && (
        <div className="fixed inset-0 z-[300] bg-black p-8 flex flex-col items-center overflow-y-auto">
          <button onClick={() => setScreen('hub')} className="self-start text-green-400 mb-6">← BACK</button>
          <h2 className="text-4xl font-black text-white mb-8">AJ AI BOT</h2>
          {botTier !== 'none' && (
            <div className="w-full max-w-md bg-green-500/10 border border-green-500/50 p-6 rounded-3xl mb-10 text-center">
               <Activity className="mx-auto text-green-500 mb-2 animate-pulse" />
               <p className="font-bold text-green-400">PROFIT: +{visualProfit.toFixed(4)}</p>
               <div className="text-[10px] text-gray-500 mt-2 font-mono">{tradeLogs[0]}</div>
            </div>
          )}
          <div className="grid gap-4 w-full max-w-md">
            <div className="p-6 bg-white/5 rounded-2xl border border-white/10 text-center">
               <p className="font-bold text-cyan-400">BASIC (+2% Daily)</p>
               <p className="text-xl font-black my-2">2,500 Coins</p>
               <button onClick={()=>activateBot('basic', 2500)} className="bg-cyan-600 w-full py-3 rounded-lg font-bold">ACTIVATE</button>
            </div>
          </div>
        </div>
      )}

      <footer className="py-20 text-center border-t border-white/5">
         <h2 className="text-5xl font-black italic text-cyan-400 mb-8">AJ STUDIO</h2>
         {deferredPrompt && (
           <button onClick={handleInstallPWA} className="bg-cyan-500 text-black px-8 py-3 rounded-full font-bold flex items-center gap-2 mx-auto mb-6">
             <Download size={18}/> INSTALL APP
           </button>
         )}
      </footer>
    </main>
  );
}