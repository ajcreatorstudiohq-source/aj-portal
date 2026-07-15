"use client";
import React, { useState, useEffect } from 'react';
import { auth, db, googleProvider } from '../firebaseConfig';
import { signInWithPopup, onAuthStateChanged, signOut, setPersistence, browserLocalPersistence } from 'firebase/auth';
import { doc, setDoc, onSnapshot, updateDoc, increment, collection, addDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { MessageCircle, Trophy, Zap, Wallet, Bot, Send, Activity, X, CheckCircle2, Download, Copy, Video, Newspaper, Users, Heart, Camera, Settings, Edit3 } from 'lucide-react';

const NOWPAYMENTS_API_KEY = "3THXNSZ-AYVMTP6-HQ9KGKK-9J6CQD7";

export default function AJSuperPortal() {
const [screen, setScreen] = useState('splash');
const [walletTab, setWalletTab] = useState('main');
const [socialScreen, setSocialScreen] = useState('hub'); // 'hub', 'setup', 'tikreels', etc.
const [user, setUser] = useState(null);
const [balance, setBalance] = useState(0);
const [botTier, setBotTier] = useState('none');
const [invested, setInvested] = useState(0);
const [selectedGame, setSelectedGame] = useState(null);
const [hasSocialProfile, setHasSocialProfile] = useState(false);

// --- SOCIAL DATA STATES ---
const [username, setUsername] = useState('');
const [bio, setBio] = useState('');
const [tempPhoto, setTempPhoto] = useState(''); // DP change ke liye
const [visualProfit, setVisualProfit] = useState(0);
const [tradeLogs, setTradeLogs] = useState(["Initialising Neural Link...", "Analysing Market Volatility..."]);

// Input States
const [purchaseAmount, setPurchaseAmount] = useState(20);
const [transferId, setTransferId] = useState('');
const [transferAmount, setTransferAmount] = useState(0);
const [payoutMethod, setPayoutMethod] = useState('Binance Pay (USDT)');
const [payoutId, setPayoutId] = useState('');

const displayBalance = (balance + visualProfit).toFixed(2);
const displayUsdt = ((balance + visualProfit) / 10000).toFixed(2);

// --- AUTH & INITIAL DATA ---
useEffect(() => {
const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
if (currentUser) {
setUser(currentUser);
const userRef = doc(db, "users", currentUser.uid);
const userSnap = await getDoc(userRef);

if (userSnap.exists()) {
  const data = userSnap.data();
  setHasSocialProfile(data.hasSocialProfile || false);
  setUsername(data.username || '');
  setBio(data.bio || '');
  setTempPhoto(data.photo || currentUser.photoURL);

  // AI Bot Offline Sync
  if (data.botTier !== 'none' && data.lastSync) {
    const secPassed = (new Date().getTime() - data.lastSync.toDate().getTime()) / 1000;
    const offlineProfit = (data.invested * (data.botTier === 'vvip' ? 0.05 : 0.02) * secPassed) / 86400;
    if (offlineProfit > 0.1) await updateDoc(userRef, { balance: increment(offlineProfit), lastSync: serverTimestamp() });
  }
} else {
  await setDoc(userRef, { name: currentUser.displayName, email: currentUser.email, balance: 500, botTier: 'none', invested: 0, uid: currentUser.uid, lastSync: serverTimestamp(), hasSocialProfile: false, photo: currentUser.photoURL });
}

onSnapshot(userRef, (snap) => {
if (snap.exists()) { 
    setBalance(snap.data().balance || 0); 
    setBotTier(snap.data().botTier || 'none'); 
    setInvested(snap.data().invested || 0);
    setHasSocialProfile(snap.data().hasSocialProfile || false);
}
});
setScreen('hub');
} else { setScreen('auth'); }
});
return () => unsubscribe();
}, []);

// --- HANDLERS ---
const handleSaveProfile = async () => {
    if(username.length < 3) return alert("Username too short!");
    try {
        await updateDoc(doc(db, "users", user.uid), {
            username: username.toLowerCase().trim(),
            bio: bio,
            photo: tempPhoto,
            hasSocialProfile: true
        });
        setHasSocialProfile(true);
        setSocialScreen('hub');
        alert("Profile Updated! 🚀");
    } catch (e) { alert("Error saving profile"); }
};

const enterSocialMode = (modeName) => {
    if(!hasSocialProfile) {
        setSocialScreen('setup'); // Force setup agar profile nahi hai
    } else {
        setSocialScreen(modeName);
    }
};

const handleInstallApp = () => {
    const link = document.createElement('a');
    link.href = '/aj-portal.apk';
    link.download = 'aj-portal.apk';
    link.click();
};

// AI BOT LOGIC (SAME)
useEffect(() => {
    let logInt, visualInt;
    if (user && botTier !== 'none' && invested > 0) {
      logInt = setInterval(() => {
        setTradeLogs(prev => [`[${new Date().toLocaleTimeString()}] Neural Executed...`, ...prev.slice(0, 2)]);
      }, 7000);
      const profitPerSec = (invested * (botTier === 'vvip' ? 0.05 : 0.02)) / 86400;
      visualInt = setInterval(() => setVisualProfit(prev => prev + profitPerSec), 1000);
    }
    return () => { clearInterval(logInt); clearInterval(visualInt); };
}, [user, botTier, invested]);

if (screen === 'splash') return (
<main className="h-screen bg-black flex flex-col items-center justify-center text-white"><div className="w-40 h-40 bg-black rounded-full border-4 border-cyan-500 shadow-[0_0_60px_#06b6d4] overflow-hidden mb-8"><img src="/logo.png" className="w-full h-full object-cover" /></div><h1 className="text-3xl font-black tracking-widest uppercase animate-pulse">AJ PORTAL</h1></main>
);

if (screen === 'auth') return (
<main className="min-h-screen bg-black flex flex-col items-center justify-center p-6 text-white"><div className="w-full max-w-sm bg-white/5 border border-white/10 p-12 rounded-[3rem] text-center"><h2 className="text-6xl font-black mb-10 text-cyan-400 italic">AJ ID</h2><button onClick={() => signInWithPopup(auth, googleProvider)} className="w-full py-5 bg-white text-black font-black text-xl rounded-2xl active:scale-95">CONTINUE WITH GOOGLE</button></div></main>
);

return (
<main className="min-h-screen bg-[#020617] text-white font-sans overflow-x-hidden relative">
    {/* HEADER */}
    <header className="fixed top-0 w-full p-4 flex justify-between items-center z-[100] bg-black/80 backdrop-blur-xl border-b border-white/5">
        <div className="text-xl font-black italic text-cyan-400">AJ STUDIO</div>
        <div className="flex items-center gap-3">
            <div onClick={() => setScreen('wallet')} className="flex items-center gap-3 bg-white/5 px-4 py-2 rounded-full border border-white/10 cursor-pointer">
                <span className="text-xs font-black text-yellow-500">{displayBalance} 🪙</span>
                {user && <img src={tempPhoto || user.photoURL} className="w-8 h-8 rounded-full border border-cyan-500" />}
            </div>
            <button onClick={() => signOut(auth)} className="p-2 bg-red-500/10 text-red-500 font-bold text-[8px] rounded-full uppercase">EXIT</button>
        </div>
    </header>

    {/* MAIN HUB */}
    <section className="min-h-screen flex flex-col items-center justify-center p-4 pt-24">
        <h1 className="text-4xl md:text-8xl font-black text-center mb-12 uppercase drop-shadow-[0_0_20px_#22d3ee]">AJ SUPER PORTAL</h1>
        <div className="grid grid-cols-2 gap-4 md:gap-16 w-full max-w-4xl relative z-30">
          <div onClick={() => setScreen('arcade')} className="bg-white/5 border border-white/10 rounded-3xl h-48 md:h-80 flex flex-col items-center justify-center cursor-pointer active:scale-95 shadow-xl hover:border-cyan-400 transition-all"><Trophy className="text-cyan-400 w-10 h-10 md:w-20 md:h-20 mb-2" /><span className="font-black text-xs md:text-3xl uppercase">Gaming</span></div>
          <div onClick={() => {setScreen('social'); setSocialScreen('hub');}} className="bg-white/5 border border-white/10 rounded-3xl h-48 md:h-80 flex flex-col items-center justify-center active:scale-95 shadow-xl cursor-pointer hover:border-pink-500 transition-all"><Zap className="text-pink-500 w-10 h-10 md:w-20 md:h-20 mb-2" /><span className="font-black text-xs md:text-3xl uppercase">Social</span></div>
          <div onClick={() => {setScreen('wallet'); setWalletTab('main')}} className="bg-white/5 border border-white/10 rounded-3xl h-48 md:h-80 flex flex-col items-center justify-center cursor-pointer shadow-xl active:scale-95 hover:border-yellow-500 transition-all"><img src="/gold.jpg" className="w-14 h-14 mb-2" /><h2 className="font-black text-xs md:text-3xl uppercase text-yellow-500">Wallet</h2></div>
          <div onClick={() => setScreen('ai')} className="bg-white/5 border border-white/10 rounded-3xl h-48 md:h-80 flex flex-col items-center justify-center active:scale-95 shadow-xl cursor-pointer hover:border-green-500 transition-all"><Bot className="text-green-400 w-10 h-10 md:w-20 md:h-20 mb-2" /><span className="font-black text-xs md:text-3xl uppercase">AJ AI</span></div>
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0"><div className="w-24 h-24 md:w-96 md:h-96 bg-black border-[15px] border-cyan-500 rounded-full flex items-center justify-center shadow-[0_0_100px_#06b6d4] overflow-hidden"><img src="/logo.png" className="w-full h-full object-cover opacity-60 animate-pulse" /></div></div>
        </div>
    </section>

    {/* SOCIAL HUB SCREEN */}
    {screen === 'social' && (
        <div className="fixed inset-0 z-[400] bg-slate-950 p-8 overflow-y-auto">
            <div className="sticky top-0 w-full p-4 bg-black/90 backdrop-blur-md border-b border-white/5 flex justify-between items-center z-[500] mb-8 rounded-full shadow-2xl">
                <button onClick={() => setScreen('hub')} className="text-pink-500 font-black text-xs uppercase">← HUB</button>
                <h2 className="text-xl font-black italic text-pink-500 uppercase">AJ Social</h2>
                <button onClick={() => setSocialScreen('setup')} className="bg-white/10 p-2 rounded-full text-pink-500"><Settings size={18}/></button>
            </div>

            {socialScreen === 'hub' ? (
                /* SOCIAL DASHBOARD (MODE BUTTONS) */
                <div className="max-w-md mx-auto grid grid-cols-1 gap-6 pb-24">
                    <div className="flex items-center gap-3 bg-white/5 p-4 rounded-3xl border border-pink-500/20 mb-4">
                        <img src={tempPhoto || user?.photoURL} className="w-12 h-12 rounded-full border-2 border-pink-500" />
                        <div>
                            <p className="font-black text-white text-sm uppercase">@{username || "user_" + user?.uid.substring(0,4)}</p>
                            <p className="text-[9px] text-gray-500 uppercase tracking-widest">{hasSocialProfile ? "Verified Member" : "Profile Incomplete"}</p>
                        </div>
                    </div>
                    {[{n:'AJ TikReels', i:<Video/>, s:'tikreels'}, {n:'AJ Pulse', i:<Users/>, s:'pulse'}, {n:'AJ Live Chat', i:<MessageCircle/>, s:'chat'}, {n:'AJ Discover', i:<Newspaper/>, s:'discover'}].map((m) => (
                        <div key={m.n} onClick={() => enterSocialMode(m.s)} className="p-8 bg-white/5 border border-white/10 rounded-[2.5rem] text-center hover:border-pink-500 transition-all cursor-pointer group">
                            <div className="text-pink-500 mb-3 flex justify-center scale-150">{m.i}</div>
                            <h3 className="text-2xl font-black uppercase italic">{m.n}</h3>
                            <p className="text-[9px] text-gray-500 mt-1 uppercase">Enter Season 2 Module</p>
                        </div>
                    ))}
                </div>
            ) : socialScreen === 'setup' ? (
                /* PROFILE EDITOR / SETUP SCREEN */
                <div className="max-w-md mx-auto bg-white/5 border border-white/10 p-10 rounded-[3rem] text-center mt-4">
                    <div className="relative w-24 h-24 mx-auto mb-6">
                        <img src={tempPhoto || user?.photoURL} className="w-full h-full rounded-full border-4 border-pink-500 p-1" />
                        <div className="absolute bottom-0 right-0 bg-pink-600 p-2 rounded-full border-2 border-black"><Camera size={14}/></div>
                    </div>
                    <h2 className="text-2xl font-black mb-6 uppercase italic">Profile Settings</h2>
                    <div className="space-y-4 text-left">
                        <div><label className="text-[10px] font-black text-pink-500 ml-2 uppercase">Avatar URL</label><input type="text" value={tempPhoto} onChange={(e)=>setTempPhoto(e.target.value)} placeholder="Paste Image Link" className="w-full bg-black border border-white/10 p-4 rounded-2xl text-xs outline-none focus:border-pink-500" /></div>
                        <div><label className="text-[10px] font-black text-pink-500 ml-2 uppercase">Username</label><input type="text" value={username} onChange={(e)=>setUsername(e.target.value)} placeholder="@yourname" className="w-full bg-black border border-white/10 p-4 rounded-2xl font-bold outline-none focus:border-pink-500" /></div>
                        <div><label className="text-[10px] font-black text-pink-500 ml-2 uppercase">Bio</label><textarea value={bio} onChange={(e)=>setBio(e.target.value)} placeholder="Tell your story..." className="w-full bg-black border border-white/10 p-4 rounded-2xl text-sm h-24 outline-none focus:border-pink-500" /></div>
                    </div>
                    <button onClick={handleSaveProfile} className="w-full mt-8 py-5 bg-pink-600 rounded-2xl font-black uppercase shadow-lg active:scale-95 transition-all">SAVE & CONTINUE</button>
                    <button onClick={()=>setSocialScreen('hub')} className="mt-4 text-gray-500 text-xs uppercase">Cancel</button>
                </div>
            ) : (
                /* ACTUAL MODES (TIKREELS, PULSE, ETC.) */
                <div className="flex flex-col items-center justify-center h-[60vh] text-center">
                    <h2 className="text-4xl font-black text-pink-500 uppercase italic mb-4">{socialScreen.toUpperCase()}</h2>
                    <p className="text-gray-400">Connecting to Pixabay API...<br/>Launching in next update! 🚀</p>
                    <button onClick={()=>setSocialScreen('hub')} className="mt-10 px-8 py-3 bg-white/5 border border-white/10 rounded-full text-xs font-black uppercase">Go Back</button>
                </div>
            )}
        </div>
    )}

    {/* BAAKI SCREENS (ARCADE, WALLET, AI) BILKUL SAME RAHENGI */}
    {/* ... code snippet remains as previous for balance, wallet, and footer ... */}

    <footer className="bg-black py-24 px-10 border-t border-white/5 text-center flex flex-col items-center">
        <div className="text-7xl md:text-[10rem] font-black italic text-cyan-400 mb-12 uppercase">AJ STUDIO</div>
        <button onClick={handleInstallApp} className="px-12 py-4 bg-cyan-500 text-black font-black uppercase rounded-full shadow-[0_0_40px_#06b6d4] animate-pulse">
            <span className="flex items-center gap-2 font-black"><Download size={22} /> Install AJ App</span>
        </button>
    </footer>
</main>
);
}