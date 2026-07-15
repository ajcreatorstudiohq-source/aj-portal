"use client";
import React, { useState, useEffect } from 'react';
import { auth, db, googleProvider } from '../firebaseConfig';
import { signInWithPopup, onAuthStateChanged, signOut, setPersistence, browserLocalPersistence } from 'firebase/auth';
import { doc, setDoc, onSnapshot, updateDoc, increment, collection, addDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { MessageCircle, Trophy, Zap, Wallet, Bot, LogOut, Globe, ChevronRight, Send, CreditCard, ArrowUpRight, ShieldCheck, Crown, Activity, TrendingUp, X, CheckCircle2, Download, Copy, Video, Newspaper, Users, Heart, MessageSquare, User, Camera, Instagram, Youtube } from 'lucide-react';

const NOWPAYMENTS_API_KEY = "3THXNSZ-AYVMTP6-HQ9KGKK-9J6CQD7";

export default function AJSuperPortal() {
  const [screen, setScreen] = useState('splash');
  const [walletTab, setWalletTab] = useState('main');
  const [socialScreen, setSocialScreen] = useState('hub'); 
  const [user, setUser] = useState(null);
  const [balance, setBalance] = useState(0);
  const [botTier, setBotTier] = useState('none');
  const [invested, setInvested] = useState(0);
  const [loading, setLoading] = useState(0);
  const [selectedGame, setSelectedGame] = useState(null);
  const [copied, setCopied] = useState(false);

  // Profile States
  const [bio, setBio] = useState('');
  const [instaLink, setInstaLink] = useState('');
  const [ytLink, setYtLink] = useState('');

  // Trading States
  const [visualProfit, setVisualProfit] = useState(0);
  const [tradeLogs, setTradeLogs] = useState(["Initialising Neural Link...", "Analysing Market Volatility..."]);

  // Inputs
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

  const copyToClipboard = (id) => {
    if(!id) return;
    navigator.clipboard.writeText(id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  useEffect(() => {
    const handleSDKMessages = (event) => {
      if (!user) return;
      const data = event.detail || event.data;
      if (!data || !data.type) return;
      const rawReward = data.amount || data.coins || 0;
      const safeTotalValue = rawReward / 1000; 
      const userRef = doc(db, "users", user.uid);
      const adminRef = doc(db, "admin_ledger", "platform_stats");
      if (data.type === 'EARNED' || data.type === "ADD_AD_REVENUE") {
        updateDoc(userRef, { balance: increment(safeTotalValue * 0.30) });
        updateDoc(adminRef, { total_revenue: increment(safeTotalValue * 0.70) });
      }
    };
    window.addEventListener("message", handleSDKMessages);
    return () => window.removeEventListener("message", handleSDKMessages);
  }, [user]);

  useEffect(() => {
    let logInt, visualInt, dbSyncInt;
    if (user && botTier !== 'none' && invested > 0) {
      logInt = setInterval(() => {
        const acts = ["Scalping BTC", "Neural Analysis", "Hedging SOL"];
        setTradeLogs(prev => [`[${new Date().toLocaleTimeString()}] ${acts[Math.floor(Math.random()*3)]}...`, ...prev.slice(0, 3)]);
      }, 7000);
      const dailyRate = botTier === 'vvip' ? 0.05 : 0.02;
      const profitPerSec = (invested * dailyRate) / 86400;
      visualInt = setInterval(() => setVisualProfit(prev => prev + profitPerSec), 1000);
      dbSyncInt = setInterval(async () => {
        setVisualProfit(curr => {
          if (curr >= 1) {
            const syncAmt = Math.floor(curr);
            updateDoc(doc(db, "users", user.uid), { balance: increment(syncAmt), lastSync: serverTimestamp() });
            return curr - syncAmt;
          }
          return curr;
        });
      }, 900000);
    }
    return () => { clearInterval(logInt); clearInterval(visualInt); clearInterval(dbSyncInt); };
  }, [user, botTier, invested]);

  useEffect(() => {
    if (screen === 'splash') {
      const interval = setInterval(() => { setLoading(prev => (prev >= 100 ? 100 : prev + 10)); }, 50);
      setTimeout(() => setScreen('hub'), 2000);
      return () => clearInterval(interval);
    }
  }, [screen]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        const userRef = doc(db, "users", currentUser.uid);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          const data = userSnap.data();
          setBio(data.bio || "");
          setInstaLink(data.instaLink || "");
          setYtLink(data.ytLink || "");
          if (data.botTier !== 'none' && data.lastSync) {
            const secPassed = (new Date().getTime() - data.lastSync.toDate().getTime()) / 1000;
            const offlineProfit = (data.invested * (data.botTier === 'vvip' ? 0.05 : 0.02) * secPassed) / 86400;
            if (offlineProfit > 0.1) await updateDoc(userRef, { balance: increment(offlineProfit), lastSync: serverTimestamp() });
          }
        } else {
          await setDoc(userRef, { name: currentUser.displayName, email: currentUser.email, balance: 500, botTier: 'none', invested: 0, uid: currentUser.uid, lastSync: serverTimestamp(), bio: "", instaLink: "", ytLink: "" });
        }
        onSnapshot(userRef, (snap) => {
          if (snap.exists()) { setBalance(snap.data().balance || 0); setBotTier(snap.data().botTier || 'none'); setInvested(snap.data().invested || 0); }
        });
        setScreen('hub');
      } else { setUser(null); setScreen('auth'); }
    });
    return () => unsubscribe();
  }, []);

  const handleLogin = async () => {
    googleProvider.setCustomParameters({ prompt: 'select_account' });
    await setPersistence(auth, browserLocalPersistence);
    await signInWithPopup(auth, googleProvider);
  };

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
      } catch (e) { alert("Error!"); }
    } else {
      if(!purchaseTxId) return alert("Enter TX ID.");
      await addDoc(collection(db, "manual_deposits"), { uid: user.uid, email: user.email, amount: purchaseAmount, method: "Airtm", txId: purchaseTxId, status: "pending", date: serverTimestamp() });
      alert("✅ Request Sent to ajcreatorstudio.hq@gmail.com!"); setWalletTab('main');
    }
  };

  const saveProfile = async () => {
    await updateDoc(doc(db, "users", user.uid), { bio, instaLink, ytLink });
    setSocialScreen('hub');
    alert("✅ Profile Updated!");
  };

  const handleTransfer = async () => {
    if (transferAmount <= 0 || transferAmount > balance) return alert("Invalid Amount!");
    const recipientRef = doc(db, "users", transferId);
    const recipientSnap = await getDoc(recipientRef);
    if (recipientSnap.exists()) {
      await updateDoc(doc(db, "users", user.uid), { balance: increment(-transferAmount) });
      await updateDoc(recipientRef, { balance: increment(transferAmount) });
      alert("✅ Success!"); setWalletTab('main');
    } else { alert("ID Not Found!"); }
  };

  const handleWithdraw = async () => {
    if (balance < 2500) return alert("Min 2,500 Coins!");
    let details = payoutId;
    if (payoutMethod.includes('Visa')) details = `Name: ${cardName} | Card: ${cardNumber}`;
    await addDoc(collection(db, "withdraw_requests"), { uid: user.uid, email: user.email, amount: balance, method: payoutMethod, details: details, status: "pending", date: serverTimestamp() });
    alert("✅ Request Sent!"); setWalletTab('main');
  };

  const activateBot = async (tier, cost) => {
    if (balance < cost) return alert(`⚠️ Need ${cost} Coins!`);
    await updateDoc(doc(db, "users", user.uid), { balance: increment(-cost), botTier: tier, invested: cost, lastSync: serverTimestamp() });
    setVisualProfit(0);
    alert(`🚀 ${tier.toUpperCase()} BOT ACTIVATED!`);
  };

  if (screen === 'splash') return (
    <main className="h-screen bg-black flex flex-col items-center justify-center text-white text-center">
      <div className="w-40 h-40 bg-black rounded-full border-4 border-cyan-500 shadow-[0_0_60px_#06b6d4] overflow-hidden mb-8"><img src="/logo.png" className="w-full h-full object-cover" alt="Logo" /></div>
      <h1 className="text-3xl font-black tracking-widest uppercase animate-pulse">AJ PORTAL</h1>
    </main>
  );

  if (screen === 'auth' && !user) return (
    <main className="min-h-screen bg-black flex flex-col items-center justify-center p-6 text-white text-center">
      <div className="w-full max-w-sm bg-white/[0.03] border border-white/10 p-12 rounded-[3rem] shadow-2xl">
        <h2 className="text-6xl font-black mb-10 italic text-cyan-400 uppercase">AJ <span className="text-white">ID</span></h2>
        <button onClick={handleLogin} className="w-full py-5 bg-white text-black font-black text-xl rounded-2xl active:scale-95">CONTINUE WITH GOOGLE</button>
        <p className="mt-8 text-yellow-500 font-bold tracking-widest">+500 COINS BONUS</p>
      </div>
    </main>
  );

  return (
    <main className="min-h-screen bg-[#020617] text-white font-sans overflow-x-hidden relative">
      <header className="fixed top-0 w-full p-4 flex justify-between items-center z-[100] bg-black/80 backdrop-blur-xl border-b border-white/5">
        <div className="text-xl font-black italic text-cyan-400">AJ STUDIO</div>
        <div className="flex items-center gap-3">
          <div onClick={() => {setScreen('wallet'); setWalletTab('main')}} className="flex items-center gap-3 bg-white/5 px-4 py-2 rounded-full border border-white/10 cursor-pointer transition-all hover:bg-white/10">
            <span className="text-xs font-black text-yellow-500">{displayBalance} 🪙</span>
            <span className="text-[10px] text-green-400 font-bold">${displayUsdt}</span>
            {user && <img src={user.photoURL} className="w-8 h-8 rounded-full border border-cyan-500" />}
          </div>
          <button onClick={() => signOut(auth)} className="p-2 bg-red-500/10 text-red-500 font-bold text-[8px] rounded-full uppercase">EXIT</button>
        </div>
      </header>

      {screen === 'hub' && (
        <section className="min-h-screen flex flex-col items-center justify-center p-4 pt-24 relative">
          <h1 className="text-4xl md:text-8xl font-black text-center mb-12 uppercase drop-shadow-[0_0_20px_#22d3ee]">AJ SUPER PORTAL</h1>
          <div className="grid grid-cols-2 gap-4 md:gap-16 w-full max-w-4xl relative z-30">
            <div onClick={() => setScreen('arcade')} className="bg-white/5 border border-white/10 rounded-3xl h-48 md:h-80 flex flex-col items-center justify-center cursor-pointer shadow-xl active:scale-95 transition-all hover:border-cyan-400">
               <Trophy className="text-cyan-400 w-10 h-10 md:w-20 md:h-20 mb-2 drop-shadow-[0_0_15px_#22d3ee]" />
               <span className="font-black text-xs md:text-3xl uppercase drop-shadow-[0_0_10px_#22d3ee]">Gaming</span>
            </div>
            <div onClick={() => {setScreen('social'); setSocialScreen('hub');}} className="bg-white/5 border border-white/10 rounded-3xl h-48 md:h-80 flex flex-col items-center justify-center active:scale-95 shadow-xl relative z-50 cursor-pointer hover:border-pink-500">
               <Zap className="text-pink-500 w-10 h-10 md:w-20 md:h-20 mb-2 drop-shadow-[0_0_15px_#ec4899]" />
               <span className="font-black text-xs md:text-3xl uppercase drop-shadow-[0_0_10px_#ec4899]">Social</span>
            </div>
            <div onClick={() => {setScreen('wallet'); setWalletTab('main')}} className="bg-white/5 border border-white/10 rounded-3xl h-48 md:h-80 flex flex-col items-center justify-center cursor-pointer shadow-xl active:scale-95 transition-all hover:border-yellow-500 relative z-30">
               <img src="/gold.jpg" className="w-14 h-14 mb-2 drop-shadow-[0_0_15px_#eab308]" />
               <h2 className="font-black text-xs md:text-3xl uppercase text-yellow-500 drop-shadow-[0_0_10px_#eab308]">Wallet</h2>
            </div>
            <div onClick={() => setScreen('ai')} className="bg-white/5 border border-white/10 rounded-3xl h-48 md:h-80 flex flex-col items-center justify-center active:scale-95 transition-all cursor-pointer shadow-xl relative z-30 hover:border-green-500">
               <Bot className="text-green-400 w-10 h-10 md:w-20 md:h-20 mb-2 drop-shadow-[0_0_15px_#4ade80]" />
               <span className="font-black text-xs md:text-3xl uppercase drop-shadow-[0_0_10px_#4ade80]">AJ AI</span>
            </div>
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0"><div className="w-24 h-24 md:w-96 md:h-96 bg-black border-[15px] border-cyan-500 rounded-full flex items-center justify-center shadow-[0_0_100px_#06b6d4] overflow-hidden"><img src="/logo.png" className="w-full h-full object-cover opacity-60 animate-pulse" alt="Logo" /></div></div>
          </div>
        </section>
      )}

      {screen === 'social' && (
        <div className="fixed inset-0 z-[400] bg-[#020617] p-8 overflow-y-auto flex flex-col items-center">
            <div className="sticky top-0 w-full p-4 bg-black/90 backdrop-blur-md border-b border-white/5 flex justify-between items-center z-[500] mb-8 rounded-full shadow-2xl">
              <button onClick={() => setScreen('hub')} className="text-cyan-400 font-bold text-xs uppercase hover:brightness-125">← HUB</button>
              <h2 className="text-xl font-black italic text-pink-500 uppercase">Social Hub</h2>
              <button onClick={() => setSocialScreen('profile')} className="p-2 bg-white/5 rounded-full border border-pink-500/30 text-pink-500 transition-all hover:bg-pink-500/20"><User size={20}/></button>
            </div>
            {socialScreen === 'hub' && (
              <div className="grid grid-cols-1 gap-6 w-full max-w-md pb-24 px-2">
                 {[{n:'AJ TikReels', i:<Video size={40}/>, s:'tikreels', d:'Short Video & Live'}, {n:'AJ Pulse', i:<Users size={40}/>, s:'pulse', d:'Feed & Community'}, {n:'AJ Live Chat', i:<MessageCircle size={40}/>, s:'chat', d:'WhatsApp Style Chat'}, {n:'AJ Discover', i:<Newspaper size={40}/>, s:'discover', d:'Platform News'}].map((mod) => (
                   <div key={mod.s} onClick={() => mod.s === 'discover' ? setSocialScreen('discover') : alert(`${mod.n} arriving in Season 2!`)} className="p-8 bg-white/5 border border-white/10 rounded-[3rem] text-center hover:border-pink-500 transition-all cursor-pointer shadow-lg hover:bg-white/10">
                      <div className="text-pink-500 mb-4 flex justify-center">{mod.i}</div>
                      <h3 className="text-2xl font-black">{mod.n}</h3>
                      <p className="text-[10px] text-gray-500 uppercase mt-2 tracking-widest">{mod.d}</p>
                   </div>
                 ))}
              </div>
            )}
            {socialScreen === 'profile' && (
              <div className="max-w-lg w-full space-y-6 pb-24 flex flex-col items-center text-center">
                  <button onClick={() => setSocialScreen('hub')} className="self-start text-pink-500 font-black text-[10px] uppercase hover:brightness-125 mb-4">← Back</button>
                  <div className="relative group">
                    <img src={user?.photoURL} className="w-32 h-32 rounded-full border-4 border-pink-500 shadow-2xl" />
                    <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all"><Camera className="text-white" size={24}/></div>
                  </div>
                  <h2 className="text-3xl font-black uppercase italic tracking-tighter drop-shadow-[0_0_10px_#ec4899]">{user?.displayName}</h2>
                  <div className="w-full bg-white/5 border border-white/10 rounded-[2.5rem] p-8 shadow-2xl space-y-6 text-left">
                      <div><label className="text-[10px] font-black text-gray-500 uppercase">Bio</label><textarea value={bio} onChange={(e)=>setBio(e.target.value)} className="w-full bg-black border border-white/10 p-4 rounded-2xl text-sm outline-none focus:border-pink-500 mt-2 h-24 resize-none" placeholder="Describe yourself..." /></div>
                      <div><label className="text-[10px] font-black text-gray-500 uppercase">Instagram</label><div className="flex items-center gap-3 bg-black border border-white/10 p-4 rounded-2xl mt-2 focus-within:border-pink-500"><Instagram size={18} className="text-pink-500"/><input value={instaLink} onChange={(e)=>setInstaLink(e.target.value)} className="bg-transparent flex-1 outline-none text-sm" placeholder="username" /></div></div>
                      <div><label className="text-[10px] font-black text-gray-500 uppercase">YouTube</label><div className="flex items-center gap-3 bg-black border border-white/10 p-4 rounded-2xl mt-2 focus-within:border-pink-500"><Youtube size={18} className="text-red-500"/><input value={ytLink} onChange={(e)=>setYtLink(e.target.value)} className="bg-transparent flex-1 outline-none text-sm" placeholder="channel link" /></div></div>
                      <button onClick={saveProfile} className="w-full py-4 bg-pink-600 text-white font-black rounded-xl uppercase shadow-lg shadow-pink-500/20 active:scale-95 transition-all">Save Profile</button>
                  </div>
              </div>
            )}
            {socialScreen === 'discover' && (<div className="max-w-lg w-full space-y-6 pb-24 fixed inset-0 z-[600] bg-black p-8 overflow-y-auto flex flex-col items-center"><button onClick={() => setSocialScreen('hub')} className="self-start text-pink-500 font-black text-[10px] uppercase hover:brightness-125 mb-8">← Back</button><div className="bg-white/5 border border-white/10 rounded-[2.5rem] overflow-hidden shadow-2xl p-6 w-full max-w-md"><div className="flex items-center gap-3 mb-6"><img src="/logo.png" className="w-10 h-10 rounded-full border border-cyan-500" /><div><p className="font-black text-sm">AJ ADMIN</p><p className="text-[10px] text-gray-500">Official News • Just now</p></div></div><img src="/founder_card.jpg" className="w-full rounded-3xl mb-6 shadow-xl" /><p className="text-sm text-gray-200 leading-relaxed">Welcome to AJ Super Portal Season 2! 🔥<br/><br/>We are building a complete Insta/FB style Social Hub. Stay active and build your balance! 🚀</p></div></div>)}
        </div>
      )}

      {/* WALLET, ARCADE, AI MODALS (Same as your code) */}
      {/* ... Add your Wallet/Arcade/AI code here if you want it all together ... */}

      <section className="py-20 bg-black flex justify-center px-4 border-y border-white/5 transition-all">
        <img src="/founder_card.jpg" className="w-full max-w-4xl rounded-3xl shadow-2xl hover:scale-[1.01] transition-all" />
      </section>
      
      <footer className="bg-black py-24 px-10 border-t border-white/5 text-center flex flex-col items-center">
        <div className="flex flex-col items-center gap-4 mb-12">
            <MessageCircle size={80} className="text-cyan-400 drop-shadow-[0_0_20px_#06b6d4] animate-pulse" />
            <div className="text-7xl md:text-[10rem] font-black italic text-cyan-400 drop-shadow-[0_0_30px_#06b6d4] uppercase">AJ STUDIO</div>
        </div>
        <div className="flex justify-center gap-10 mb-16">
            <a href="https://wa.me/96878994093" target="_blank" className="text-green-500 border border-green-500 px-6 py-2 rounded-full font-bold uppercase hover:bg-green-500 hover:text-black transition-all">Whatsapp</a>
            <a href="https://x.com/Ali20352061" target="_blank" className="text-white border border-white px-6 py-2 rounded-full font-bold uppercase hover:bg-white hover:text-black transition-all">X (Twitter)</a>
        </div>
        <button onClick={() => alert("Install Updated!")} className="group relative px-12 py-4 bg-cyan-500 text-black font-black uppercase rounded-full shadow-[0_0_40px_#06b6d4] animate-pulse transition-all hover:scale-105 active:scale-95">
           <span className="relative z-10 flex items-center gap-2 font-black tracking-widest"><Download size={22} /> Install AJ App</span>
           <div className="absolute inset-0 bg-white/20 group-hover:translate-x-full transition-transform duration-500 -skew-x-12"></div>
        </button>
      </footer>
    </main>
  );
}