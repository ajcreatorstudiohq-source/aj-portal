"use client";
import React, { useState, useEffect } from 'react';
import { auth, db, googleProvider } from '../firebaseConfig';
import { signInWithPopup, onAuthStateChanged, signOut, setPersistence, browserLocalPersistence } from 'firebase/auth';
import { doc, setDoc, onSnapshot, updateDoc, increment, collection, addDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { Trophy, Zap, Wallet, Bot, LogOut, Activity, TrendingUp, Download, Share2, Heart, MessageCircle, CheckCircle2 } from 'lucide-react';
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
  const [tradeLogs, setTradeLogs] = useState(["Initialising Neural Link...", "Analysing Market Volatility..."]);

  // Input States
  const [purchaseAmount, setPurchaseAmount] = useState(20);
  const [transferId, setTransferId] = useState('');
  const [transferAmount, setTransferAmount] = useState(0);
  const [payoutMethod, setPayoutMethod] = useState('Binance Pay (USDT)');
  const [payoutId, setPayoutId] = useState('');

  // Total Visual Balance: Real DB Balance + Live AI Counter (2 Decimal Places)
  const displayBalance = (balance + visualProfit).toFixed(2);
  const displayUsdt = (Number(displayBalance) / 100).toFixed(2);

  // --- EMAILJS NOTIFICATION ---
  const notifyAdmin = (type, amount, details) => {
    const params = { user_name: user?.displayName, action_type: type, amount, details };
    emailjs.send('service_6w1sols', 'template_o1c40nv', params, '6JCPm9fo38ovnA5LG');
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

  // --- OFFLINE EARNING SYNC ---
  const syncOfflineProfit = async (u) => {
    const userRef = doc(db, "users", u.uid);
    const snap = await getDoc(userRef);
    if (snap.exists() && snap.data().botTier !== 'none') {
      const d = snap.data();
      const lastSync = d.lastSyncTime?.toMillis() || Date.now();
      const secondsPassed = Math.floor((Date.now() - lastSync) / 1000);
      const rate = d.botTier === 'vvip' ? 0.05 : 0.02;
      const totalEarned = ((d.invested * rate) / 86400) * secondsPassed;
      if (totalEarned > 0.01) {
        await updateDoc(userRef, { balance: increment(totalEarned * 0.30), lastSyncTime: serverTimestamp() });
        await updateDoc(doc(db, "admin_ledger", "platform_stats"), { total_locked_profit: increment(totalEarned * 0.70) });
      }
    }
  };

  // --- SDK MESSAGE LISTENER (100:1 & Ads) ---
  useEffect(() => {
    const handleMsg = async (e) => {
      if (!user || !e.data) return;
      if (e.data.type === 'SHOW_AD') { if (window.show_8924758) window.show_8924758(); }
      if (e.data.type === 'SYNC_GAME_COINS') {
        const totalAJ = e.data.coins / 100;
        await updateDoc(doc(db, "users", user.uid), { balance: increment(totalAJ * 0.30) });
        await updateDoc(doc(db, "admin_ledger", "platform_stats"), { total_locked_profit: increment(totalAJ * 0.70) });
      }
    };
    window.addEventListener("message", handleMsg);
    return () => window.removeEventListener("message", handleMsg);
  }, [user]);

  // --- AI ENGINE ---
  useEffect(() => {
    if (user && botTier !== 'none') {
      const intv = setInterval(() => {
        const rate = botTier === 'vvip' ? 0.05 : 0.02;
        setVisualProfit(p => p + ((invested * rate) / 86400) * 0.30);
      }, 1000);
      return () => clearInterval(intv);
    }
  }, [user, botTier, invested]);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (u) {
        setUser(u); await syncOfflineProfit(u);
        const userRef = doc(db, "users", u.uid);
        onSnapshot(userRef, (s) => {
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

  const handlePurchase = () => window.open(`https://nowpayments.io/payment/?iid=6119249758&paymentId=4656497174&amount=${purchaseAmount}`, '_blank');

  const activateBot = async (t, c) => {
    if (balance < c) return alert("Low Balance!");
    await updateDoc(doc(db, "users", user.uid), { balance: increment(-c), botTier: t, invested: c, lastSyncTime: serverTimestamp() });
    notifyAdmin("BOT PURCHASE", c, t); setVisualProfit(0);
  };

  const handleWithdraw = async () => {
    if (balance < 2500) return alert("Min 2500 Coins!");
    await addDoc(collection(db, "withdraw_requests"), { uid: user.uid, amount: balance, method: payoutMethod, details: payoutId, status: "pending", date: new Date() });
    notifyAdmin("WITHDRAWAL", balance, payoutMethod); alert("Request Sent!");
  };

  if (screen === 'splash') return (
    <main className="h-screen bg-black flex flex-col items-center justify-center">
      <div className="w-40 h-40 border-4 border-cyan-500 rounded-full overflow-hidden animate-pulse"><img src="/logo.jpg" className="w-full h-full object-cover" /></div>
      <h1 className="mt-8 text-4xl font-black text-cyan-400 italic">AJ PORTAL</h1>
    </main>
  );

  if (!user) return (
    <main className="h-screen bg-black flex items-center justify-center">
      <button onClick={() => signInWithPopup(auth, googleProvider)} className="bg-white text-black font-black py-4 px-12 rounded-2xl">LOGIN WITH GOOGLE</button>
    </main>
  );

  return (
    <main className="min-h-screen bg-[#020617] text-white font-sans relative overflow-y-auto">
      <header className="fixed top-0 w-full p-4 flex justify-between items-center z-[100] bg-black/80 backdrop-blur-md border-b border-white/5">
        <div className="text-xl font-black italic text-cyan-400 uppercase">AJ STUDIO</div>
        <div className="flex items-center gap-2">
          {deferredPrompt && <button onClick={handleInstallClick} className="p-2 bg-cyan-500 rounded-full text-black"><Download size={16}/></button>}
          <div onClick={() => setScreen('wallet')} className="flex items-center gap-3 bg-white/5 px-4 py-2 rounded-full border border-white/10 cursor-pointer">
            <span className="text-sm font-black text-yellow-500">{displayBalance} 🪙</span>
          </div>
        </div>
      </header>

      {screen === 'hub' && (
        <section className="min-h-screen flex flex-col items-center justify-center p-4 pt-32 relative">
          <h1 className="text-4xl md:text-8xl font-black text-center mb-16 uppercase drop-shadow-[0_0_20px_#22d3ee]">AJ SUPER PORTAL</h1>
          <div className="grid grid-cols-2 gap-6 md:gap-16 w-full max-w-4xl relative z-30">
            {/* GAMING - Top Left */}
            <div onClick={() => setScreen('arcade')} className="bg-white/5 border border-white/10 rounded-3xl h-52 md:h-80 flex flex-col items-center justify-center active:scale-95 shadow-xl cursor-pointer">
               <Trophy size={60} className="text-cyan-400" />
               <span className="font-black text-2xl md:text-5xl uppercase mt-2">Gaming</span>
            </div>
            {/* SOCIAL - Top Right */}
            <div onClick={() => setScreen('social')} className="bg-white/5 border border-white/10 rounded-3xl h-52 md:h-80 flex flex-col items-center justify-center active:scale-95 shadow-xl cursor-pointer">
               <Zap size={60} className="text-pink-500" />
               <span className="font-black text-2xl md:text-5xl uppercase mt-2">Social</span>
            </div>
            {/* WALLET - Bottom Left */}
            <div onClick={() => setScreen('wallet')} className="bg-white/5 border-2 border-yellow-500/30 rounded-3xl h-52 md:h-80 flex flex-col items-center justify-center cursor-pointer shadow-xl">
               <Wallet size={60} className="text-yellow-500" />
               <span className="font-black text-2xl md:text-5xl uppercase text-yellow-500 mt-2">Wallet</span>
            </div>
            {/* AJ AI - Bottom Right */}
            <div onClick={() => setScreen('ai')} className="bg-white/5 border border-white/10 rounded-3xl h-52 md:h-80 flex flex-col items-center justify-center active:scale-95 transition-all cursor-pointer shadow-xl">
               <Bot size={60} className="text-green-400" />
               <span className="font-black text-2xl md:text-5xl uppercase mt-2">AJ AI</span>
            </div>
            {/* Central Logo */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0">
              <div className="w-24 h-24 md:w-80 md:h-80 bg-black border-4 md:border-[10px] border-cyan-500 rounded-full flex items-center justify-center shadow-[0_0_100px_#06b6d4] overflow-hidden">
                 <img src="/logo.jpg" className="w-full h-full object-cover opacity-60 animate-pulse" />
              </div>
            </div>
          </div>
          <button onClick={() => signOut(auth)} className="mt-20 text-red-500 font-bold border border-red-500/30 px-8 py-2 rounded-full">LOGOUT EXIT</button>
        </section>
      )}

      {screen === 'arcade' && (
        <div className="fixed inset-0 z-[300] bg-black p-8 overflow-y-auto pt-24">
          <button onClick={() => setScreen('hub')} className="text-cyan-400 font-bold mb-10 text-xl uppercase">← BACK</button>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {['Rider King', 'Pulse Racer', 'Subsea Surge', 'Neon Strike', 'Volcano Escape', 'Ludo', 'Puck Pulse Elite'].map((game) => (
              <div key={game} onClick={() => setSelectedGame(game)} className="bg-white/5 border border-white/10 p-4 rounded-3xl text-center cursor-pointer">
                <img src={`/games/${game.toLowerCase().replace(/ /g, '-')}/logo.png`} className="w-full aspect-square rounded-xl object-cover mb-2" onError={(e) => { e.target.src = "/logo.jpg"; }} />
                <h3 className="font-black text-sm uppercase">{game}</h3>
                <button className="mt-2 bg-cyan-500 text-black text-[10px] font-black px-4 py-1 rounded-full">PLAY</button>
              </div>
            ))}
          </div>
          {selectedGame && <div className="fixed inset-0 z-[400] bg-black"><button onClick={()=>setSelectedGame(null)} className="absolute top-6 left-6 text-white z-[500] font-black bg-red-600 px-4 py-2 rounded-xl">EXIT GAME X</button><iframe src={`/games/${selectedGame.toLowerCase().replace(/ /g, '-')}/index.html`} className="w-full h-full border-none" /></div>}
        </div>
      )}

      {screen === 'ai' && (
        <div className="fixed inset-0 z-[200] bg-black flex flex-col items-center p-8 overflow-y-auto pt-24 pb-20">
          <button onClick={() => setScreen('hub')} className="self-start text-green-400 font-bold text-xl uppercase mb-12">← BACK</button>
          {botTier !== 'none' && (
            <div className="w-full max-w-2xl bg-white/5 border-2 border-green-500/40 p-8 rounded-[3rem] text-center mb-16 shadow-2xl">
              <Activity size={60} className="mx-auto mb-6 text-green-500 animate-pulse" />
              <h2 className="text-4xl font-black uppercase text-white mb-2">{botTier.toUpperCase()} BOT RUNNING</h2>
              <p className="text-yellow-500 text-4xl font-bold">+{visualProfit.toFixed(4)} 🪙</p>
              <div className="mt-6 h-24 overflow-hidden text-[10px] font-mono text-green-500/70 text-left bg-black/40 p-4 rounded-xl">
                {tradeLogs.map((l, i) => <div key={i}>{l}</div>)}
              </div>
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-4xl">
            <div onClick={() => activateBot('basic', 2500)} className={`bg-white/5 border-2 p-10 rounded-3xl text-center hover:border-cyan-500 cursor-pointer ${botTier === 'basic' ? 'border-green-500' : 'border-cyan-500/30'}`}>
              <h3 className="text-2xl font-black text-cyan-400 uppercase">BASIC (+2% Daily)</h3>
              <p className="text-4xl font-black text-white my-6">2,500</p>
              <button className="w-full py-4 bg-cyan-600 rounded-xl font-black uppercase">ACTIVATE</button>
            </div>
            <div onClick={() => activateBot('vvip', 7500)} className={`bg-white/5 border-2 p-10 rounded-3xl text-center hover:border-yellow-500 cursor-pointer ${botTier === 'vvip' ? 'border-green-500' : 'border-yellow-500/30'}`}>
              <h3 className="text-2xl font-black text-yellow-500 uppercase">VVIP (+5% Daily)</h3>
              <p className="text-4xl font-black text-white my-6">7,500</p>
              <button className="w-full py-4 bg-yellow-600 rounded-xl font-black text-black uppercase">ACTIVATE</button>
            </div>
          </div>
        </div>
      )}

      {/* --- SOCIAL PREMIUM FEED (REAL CONTENT) --- */}
      {screen === 'social' && (
        <div className="fixed inset-0 z-[200] bg-black p-4 pt-24 overflow-y-auto">
          <button onClick={() => setScreen('hub')} className="text-pink-500 mb-8 font-black text-xl uppercase">← BACK</button>
          <div className="max-w-md mx-auto space-y-10 pb-20">
            <div className="bg-white/5 backdrop-blur-2xl border border-white/10 rounded-[2.5rem] p-6 shadow-2xl relative">
              <div className="flex items-center gap-4 mb-6">
                 <div className="w-14 h-14 bg-cyan-500 rounded-2xl flex items-center justify-center font-black text-xl shadow-[0_0_15px_rgba(6,182,212,0.5)]">AJ</div>
                 <div><h4 className="font-black text-lg uppercase tracking-tighter">AJ_Pulse_Official</h4><span className="text-[10px] text-gray-500">Luxury Content Active</span></div>
              </div>
              <div className="rounded-[2rem] overflow-hidden border border-white/10 mb-6 shadow-2xl">
                 <img src="https://images.pexels.com/photos/3764984/pexels-photo-3764984.jpeg?auto=compress&cs=tinysrgb&w=800" className="w-full h-80 object-cover" />
              </div>
              <div className="grid grid-cols-3 gap-3">
                 <button className="bg-white/5 py-4 rounded-2xl flex items-center justify-center gap-2 font-black text-xs hover:bg-pink-500/20"><Heart size={20} className="text-pink-500"/> LIKE</button>
                 <button className="bg-white/5 py-4 rounded-2xl flex items-center justify-center gap-2 font-black text-xs hover:bg-cyan-500/20"><MessageCircle size={20} className="text-cyan-400"/> CHAT</button>
                 <button className="bg-white/5 py-4 rounded-2xl flex items-center justify-center gap-2 font-black text-xs hover:bg-green-500/20"><Share2 size={20} className="text-green-500"/> SHARE</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* FOOTER */}
      <footer className="bg-black py-24 px-10 border-t border-cyan-500/10 text-center">
        <div className="text-7xl md:text-[12rem] font-black italic text-cyan-400 drop-shadow-[0_0_30px_#06b6d4] mb-12 uppercase leading-none">AJ STUDIO</div>
        <div className="flex justify-center gap-8 mb-12">
            <a href="https://wa.me/96878994093" target="_blank" className="text-green-500 border border-green-500 px-10 py-3 rounded-full font-black uppercase text-lg">Whatsapp</a>
            <a href="https://x.com/Ali20352061" target="_blank" className="text-white border border-white px-10 py-3 rounded-full font-black uppercase text-lg">X (Twitter)</a>
        </div>
        {deferredPrompt && (
            <button onClick={handleInstallClick} className="bg-cyan-500 text-black py-5 px-12 rounded-2xl font-black flex items-center justify-center gap-3 mx-auto uppercase shadow-[0_0_30px_rgba(6,182,212,0.5)] active:scale-95">
              <Download /> INSTALL AJ APP
            </button>
        )}
      </footer>
    </main>
);
}