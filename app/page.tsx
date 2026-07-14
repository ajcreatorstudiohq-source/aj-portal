"use client";
import React, { useState, useEffect } from 'react';
import { auth, db, googleProvider } from '../firebaseConfig';
import { signInWithPopup, onAuthStateChanged, signOut, setPersistence, browserLocalPersistence } from 'firebase/auth';
import { doc, setDoc, onSnapshot, updateDoc, increment, collection, addDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { Trophy, Zap, Wallet, Bot, LogOut, Activity, TrendingUp, CheckCircle2, Download, Share2, Heart, MessageCircle } from 'lucide-react';
import emailjs from '@emailjs/browser';

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

  // --- AI TRADING & VISUAL SYNC STATES ---
  const [visualProfit, setVisualProfit] = useState(0);
  const [tradeLogs, setTradeLogs] = useState(["Initialising Neural Link...", "Analysing Market Volatility...", "Connecting to AJ liquidity pool..."]);

  // Input States
  const [purchaseAmount, setPurchaseAmount] = useState(20);
  const [transferId, setTransferId] = useState('');
  const [transferAmount, setTransferAmount] = useState(0);
  const [payoutMethod, setPayoutMethod] = useState('Binance Pay (USDT)');
  const [payoutId, setPayoutId] = useState('');
  const [cardName, setCardName] = useState('');
  const [cardNumber, setCardNumber] = useState('');

  // Total Visual Balance: Real DB Balance + Live AI Counter
  const displayBalance = (balance + visualProfit).toFixed(2);
  const displayUsdt = (Number(displayBalance) / 100).toFixed(2);

  // --- EMAILJS NOTIFICATION FUNCTION ---
  const notifyAdmin = (type, amount, details) => {
    const templateParams = {
      user_name: user?.displayName,
      user_email: user?.email,
      action_type: type,
      amount: amount,
      details: details,
    };
    
    // Hardcoded Official Keys provided by CEO
    emailjs.send('service_6w1sols', 'template_o1c40nv', templateParams, '6JCPm9fo38ovnA5LG')
      .then(() => console.log("CEO Notified!"))
      .catch((err) => console.error("Email Error:", err));
  };

  // --- PWA INSTALLATION LOGIC ---
  useEffect(() => {
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    });
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') setDeferredPrompt(null);
    }
  };

  // --- OFFLINE EARNING SYNC (Puri Raat Ka Profit) ---
  const syncOfflineProfit = async (u) => {
    const userRef = doc(db, "users", u.uid);
    const snap = await getDoc(userRef);
    if (snap.exists() && snap.data().botTier !== 'none') {
      const d = snap.data();
      const lastSync = d.lastSyncTime?.toMillis() || Date.now();
      const secondsPassed = Math.floor((Date.now() - lastSync) / 1000);
      
      const rate = d.botTier === 'vvip' ? 0.05 : 0.02;
      const totalEarned = ((d.invested * rate) / 86400) * secondsPassed;
      
      const userHissa = totalEarned * 0.30; // 30% User ko
      const adminHissa = totalEarned * 0.70; // 70% Admin ko

      if (userHissa > 0.01) {
        await updateDoc(userRef, { balance: increment(userHissa), lastSyncTime: serverTimestamp() });
        await updateDoc(doc(db, "admin_ledger", "platform_stats"), { total_locked_profit: increment(adminHissa) });
      }
    }
  };

  // --- SDK MESSAGE LISTENER (100:1 & Gifting Split) ---
  useEffect(() => {
    const handleMsg = async (e) => {
      if (!user || !e.data) return;
      
      if (e.data.type === 'SHOW_AD') { if (window.show_8924758) window.show_8924758(); }

      if (e.data.type === 'SYNC_GAME_COINS') {
        const totalAJ = e.data.coins / 100; // 100 Game Coins = 1 AJ Coin
        const userHissa = totalAJ * 0.30;   // 30% User
        const adminHissa = totalAJ * 0.70;  // 70% Admin
        await updateDoc(doc(db, "users", user.uid), { balance: increment(userHissa) });
        await updateDoc(doc(db, "admin_ledger", "platform_stats"), { total_locked_profit: increment(adminHissa) });
      }

      if (e.data.type === 'SEND_GIFT') {
        const giftVal = e.data.amount;
        const creatorHissa = giftVal * 0.60; // 60% Creator
        const adminHissa = giftVal * 0.40;  // 40% Admin
        await updateDoc(doc(db, "admin_ledger", "platform_stats"), { gifting_profit: increment(adminHissa) });
      }
    };
    window.addEventListener("message", handleMsg);
    return () => window.removeEventListener("message", handleMsg);
  }, [user]);

  // --- REAL-TIME AI ENGINE (Visual Only) ---
  useEffect(() => {
    if (user && botTier !== 'none') {
      const intv = setInterval(() => {
        const rate = botTier === 'vvip' ? 0.05 : 0.02;
        const perSecUser = ((invested * rate) / 86400) * 0.30;
        setVisualProfit(p => p + perSecUser);
      }, 1000);
      return () => clearInterval(intv);
    }
  }, [user, botTier, invested]);

  // --- FIREBASE AUTH & AUTO-SYNC ---
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (u) {
        setUser(u);
        await syncOfflineProfit(u);
        onSnapshot(doc(db, "users", u.uid), (s) => {
          if (s.exists()) {
            setBalance(s.data().balance || 0);
            setBotTier(s.data().botTier || 'none');
            setInvested(s.data().invested || 0);
          } else {
            setDoc(userRef, { name: u.displayName, email: u.email, balance: 500, botTier: 'none', invested: 0, lastSyncTime: serverTimestamp() });
          }
        });
        setScreen('hub');
      } else { setUser(null); setScreen('auth'); }
    });
    return () => unsub();
  }, []);

  const handlePurchase = () => {
    window.open(`https://nowpayments.io/payment/?iid=6119249758&paymentId=4656497174&amount=${purchaseAmount}`, '_blank');
  };

  const activateBot = async (t, c) => {
    if (balance < c) return alert("Low Balance!");
    await updateDoc(doc(db, "users", user.uid), { balance: increment(-c), botTier: t, invested: c, lastSyncTime: serverTimestamp() });
    notifyAdmin("BOT PURCHASE", c, t);
    setVisualProfit(0);
  };

  const handleWithdraw = async () => {
    if (balance < 2500) return alert("Min 2500 Coins!");
    await addDoc(collection(db, "withdraw_requests"), { uid: user.uid, amount: balance, method: payoutMethod, details: payoutId, status: "pending", date: new Date() });
    notifyAdmin("WITHDRAWAL", balance, payoutMethod);
    alert("Request Sent!");
  };

  if (screen === 'splash') return (
    <main className="h-screen bg-black flex flex-col items-center justify-center text-white">
      <div className="w-40 h-40 border-4 border-cyan-500 rounded-full overflow-hidden animate-pulse">
        <img src="/logo.jpg" className="w-full h-full object-cover" />
      </div>
      <h1 className="mt-8 text-4xl font-black text-cyan-400 italic">AJ PORTAL</h1>
    </main>
  );

  if (!user) return (
    <main className="h-screen bg-black flex flex-col items-center justify-center">
      <button onClick={() => signInWithPopup(auth, googleProvider)} className="bg-white text-black font-black py-4 px-12 rounded-2xl">LOGIN WITH GOOGLE</button>
    </main>
  );

  return (
    <main className="min-h-screen bg-[#020617] text-white font-sans overflow-x-hidden relative">
      <header className="fixed top-0 w-full p-4 flex justify-between items-center z-[100] bg-black/80 backdrop-blur-md border-b border-white/5">
        <div className="text-xl font-black italic text-cyan-400">AJ STUDIO</div>
        <div className="flex items-center gap-3">
          <div onClick={() => {setScreen('wallet'); setWalletTab('main')}} className="flex items-center gap-3 bg-white/5 px-4 py-2 rounded-full border border-white/10 shadow-lg cursor-pointer">
            <span className="text-sm font-black text-yellow-500">{displayBalance} 🪙</span>
            <span className="text-[10px] text-green-400 font-bold">${displayUsdt}</span>
            {user && <img src={user.photoURL} className="w-8 h-8 rounded-full border border-cyan-500" />}
          </div>
          <button onClick={() => signOut(auth)} className="p-2 bg-red-500/20 rounded-full text-red-500 font-bold text-[8px] px-2">EXIT</button>
        </div>
      </header>

      {screen === 'hub' && (
        <section className="min-h-screen flex flex-col items-center justify-center p-4 pt-24 relative">
          <h1 className="text-4xl md:text-8xl font-black text-center mb-12 uppercase drop-shadow-[0_0_20px_#22d3ee]">AJ SUPER PORTAL</h1>
          <div className="grid grid-cols-2 gap-6 max-w-4xl mx-auto relative z-30">
            <div onClick={() => setScreen('arcade')} className="bg-white/5 p-10 rounded-3xl border border-white/10 flex flex-col items-center hover:border-cyan-400 cursor-pointer">
              <Trophy size={50} className="text-cyan-400" /><span>Gaming</span>
            </div>
            <div onClick={() => setScreen('wallet')} className="bg-white/5 p-10 rounded-3xl border border-white/10 flex flex-col items-center hover:border-yellow-400 cursor-pointer">
              <Wallet size={50} className="text-yellow-500" /><span>Wallet</span>
            </div>
            <div onClick={() => setScreen('ai')} className="bg-white/5 p-10 rounded-3xl border border-white/10 flex flex-col items-center hover:border-green-400 cursor-pointer">
              <Bot size={50} className="text-green-400" /><span>AJ AI</span>
            </div>
            <div onClick={() => setScreen('social')} className="bg-white/5 p-10 rounded-3xl border border-white/10 flex flex-col items-center hover:border-pink-400 cursor-pointer">
              <Zap size={50} className="text-pink-500" /><span>Social</span>
            </div>
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0">
              <div className="w-24 h-24 md:w-80 md:h-80 bg-black border-4 md:border-[10px] border-cyan-500 rounded-full flex items-center justify-center shadow-[0_0_100px_#06b6d4] overflow-hidden">
                 <img src="/logo.jpg" className="w-full h-full object-cover opacity-60 animate-pulse" />
              </div>
            </div>
          </div>
        </section>
      )}

      {screen === 'arcade' && (
        <div className="fixed inset-0 z-[300] bg-black p-8 overflow-y-auto pt-24">
          <button onClick={() => setScreen('hub')} className="text-cyan-400 font-bold mb-8 uppercase">← BACK</button>
          {!selectedGame ? (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
              {['Rider King', 'Pulse Racer', 'Subsea Surge', 'Neon Strike', 'Volcano Escape'].map((game) => (
                <div key={game} onClick={() => setSelectedGame(game)} className="bg-white/5 border border-white/10 p-4 rounded-3xl text-center">
                  {/* POSTER FIX: ASPECT-SQUARE FOR 512x512 LOGOS */}
                  <img src={`/games/${game.toLowerCase().replace(/ /g, '-')}/logo.png`} className="w-full aspect-square rounded-xl object-cover mb-2" onError={(e) => e.target.src="/logo.jpg"} />
                  <h3 className="font-bold text-xs uppercase">{game}</h3>
                  <button className="mt-2 bg-cyan-500 text-black text-[10px] font-black px-4 py-1 rounded-full">PLAY</button>
                </div>
              ))}
            </div>
          ) : (
            <iframe src={`/games/${selectedGame.toLowerCase().replace(/ /g, '-')}/index.html`} className="w-full h-[80vh] border-none rounded-3xl" />
          )}
        </div>
      )}

      {screen === 'ai' && (
        <div className="fixed inset-0 z-[200] bg-black p-8 overflow-y-auto pt-24">
          <button onClick={() => setScreen('hub')} className="text-green-400 mb-12 font-bold">← BACK</button>
          {botTier !== 'none' && (
            <div className="bg-white/5 border-2 border-green-500/40 p-8 rounded-[3rem] text-center mb-10 shadow-2xl">
              <Activity size={60} className="mx-auto mb-6 text-green-500 animate-pulse" />
              <h2 className="text-3xl font-black uppercase">{botTier} BOT RUNNING</h2>
              <p className="text-yellow-500 text-3xl font-bold">+{visualProfit.toFixed(4)} 🪙</p>
              <div className="mt-6 h-20 overflow-hidden text-[10px] font-mono text-green-500/60 text-left">
                {tradeLogs.map((l, i) => <div key={i}>{l}</div>)}
              </div>
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-4xl">
            <div onClick={() => activateBot('basic', 2500)} className={`bg-white/5 border-2 p-10 rounded-3xl text-center cursor-pointer ${botTier === 'basic' ? 'border-green-500' : 'border-cyan-500/30'}`}>
              <h3 className="text-xl font-black text-cyan-400">BASIC (+2% Daily)</h3>
              <button className="mt-4 w-full py-3 bg-cyan-600 rounded-xl font-black uppercase">ACTIVATE (2500)</button>
            </div>
            <div onClick={() => activateBot('vvip', 7500)} className={`bg-white/5 border-2 p-10 rounded-3xl text-center cursor-pointer ${botTier === 'vvip' ? 'border-yellow-500' : 'border-yellow-500/30'}`}>
              <h3 className="text-yellow-500 font-black">VVIP (+5% Daily)</h3>
              <button className="mt-4 w-full py-3 bg-yellow-600 rounded-xl font-black text-black uppercase">ACTIVATE (7500)</button>
            </div>
          </div>
        </div>
      )}

      {/* --- SOCIAL PREMIUM FEED (ALPHA) --- */}
      {screen === 'social' && (
        <div className="fixed inset-0 z-[200] bg-black p-10 pt-24 flex flex-col items-center overflow-y-auto">
          <button onClick={() => setScreen('hub')} className="self-start text-pink-500 font-bold mb-10 text-xl uppercase">← Back</button>
          <div className="max-w-md mx-auto space-y-8">
            <div className="bg-white/5 backdrop-blur-2xl border border-white/10 rounded-[2.5rem] p-6 shadow-2xl relative">
              <div className="flex items-center gap-4 mb-6">
                 <div className="w-12 h-12 bg-cyan-500 rounded-2xl flex items-center justify-center font-black">AJ</div>
                 <div><h4 className="font-black text-sm uppercase">AJ_Pulse_Official</h4><span className="text-[10px] text-gray-500">Premium Feed Loading...</span></div>
              </div>
              <div className="rounded-3xl overflow-hidden border border-white/10 h-64 bg-gray-900 flex items-center justify-center italic text-gray-700 text-center">Multimedia Feed Loading... <br/> (Movies, Videos & Posts)</div>
              <div className="mt-6 grid grid-cols-3 gap-2">
                 <button className="bg-white/5 py-3 rounded-2xl flex items-center justify-center gap-1 text-[10px]"><Heart size={14}/> Like</button>
                 <button className="bg-white/5 py-3 rounded-2xl flex items-center justify-center gap-1 text-[10px]"><MessageCircle size={14}/> Comment</button>
                 <button className="bg-white/5 py-3 rounded-2xl flex items-center justify-center gap-1 text-[10px]"><Share2 size={14}/> Share</button>
              </div>
            </div>
          </div>
        </div>
      )}

      <footer className="bg-black py-24 px-10 border-t border-cyan-500/10 text-center relative">
        <div className="text-7xl md:text-[10rem] font-black italic text-cyan-400 drop-shadow-[0_0_30px_#06b6d4] mb-12 uppercase">AJ STUDIO</div>
        <div className="flex justify-center gap-10">
            <a href="https://wa.me/96878994093" target="_blank" className="text-green-500 border border-green-500 px-6 py-2 rounded-full font-bold uppercase tracking-widest">Whatsapp</a>
            <a href="https://x.com/Ali20352061" target="_blank" className="text-white border border-white px-6 py-2 rounded-full font-bold uppercase tracking-widest">X (Twitter)</a>
        </div>
        {deferredPrompt && (
            <button onClick={handleInstallClick} className="mt-12 bg-cyan-500 text-black py-4 px-10 rounded-2xl font-black flex items-center justify-center gap-2 mx-auto uppercase shadow-2xl">
              <Download /> INSTALL AJ APP
            </button>
        )}
      </footer>
    </main>
);
}