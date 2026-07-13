"use client";
import React, { useState, useEffect } from 'react';
import { auth, db, googleProvider } from '../firebaseConfig'; 
import { signInWithPopup, onAuthStateChanged, signOut, setPersistence, browserLocalPersistence } from 'firebase/auth';
import { doc, setDoc, onSnapshot, updateDoc, increment, collection, addDoc, getDoc } from 'firebase/firestore';
import { MessageCircle, Trophy, Zap, Wallet, Bot, LogOut, Globe, ChevronRight, Send, CreditCard, ArrowUpRight, ShieldCheck, Crown, Activity, TrendingUp, X, Copy, CheckCircle } from 'lucide-react';

// Game Poster Mapping
const GAME_POSTERS: {[key: string]: string} = {
  'Rider King': '/posters/rider-king.jpg', 
  'Pulse Racer': '/posters/pulse-racer.jpg',
  'Subsea Surge': '/posters/subsea.jpg',
  'Neon Strike': '/posters/neon.jpg',
  'Volcano Escape': '/posters/volcano.jpg',
  'Ludo': '/posters/ludo.jpg',
  'Air Hockey': '/posters/hockey.jpg'
};

export default function AJSuperPortal() {
  const [screen, setScreen] = useState('splash');
  const [walletTab, setWalletTab] = useState('main'); 
  const [user, setUser] = useState<any>(null);
  const [balance, setBalance] = useState(0);
  const [botTier, setBotTier] = useState('none');
  const [invested, setInvested] = useState(0);
  const [loading, setLoading] = useState(0);
  const [selectedGame, setSelectedGame] = useState<string | null>(null);

  // Payment States
  const [purchaseAmount, setPurchaseAmount] = useState(20); 
  const [payAddress, setPayAddress] = useState('');
  const [isGeneratingPay, setIsGeneratingPay] = useState(false);
  
  const [transferId, setTransferId] = useState('');
  const [transferAmount, setTransferAmount] = useState(0);
  const [payoutMethod, setPayoutMethod] = useState('Binance Pay (USDT)');
  const [payoutId, setPayoutId] = useState('');
  const [cardName, setCardName] = useState('');
  const [cardNumber, setCardNumber] = useState('');

  const usdtValue = (balance / 100).toFixed(2);

  // --- FIX 1: ADS & REWARD LISTENER ---
  useEffect(() => {
    const handleSDKMessages = async (event: any) => {
      if (!user) return;
      const data = event.data; 
      
      // Monetag Ad Trigger from Game
      if (data.type === 'SHOW_AD') {
         if ((window as any).show_8924758) {
             (window as any).show_8924758();
         }
      }

      if (data.type === 'EARNED' || data.type === "ADD_AD_REVENUE") {
        const reward = data.amount || data.coins;
        const userRef = doc(db, "users", user.uid);
        await updateDoc(userRef, { balance: increment(reward) });
      }
    };
    window.addEventListener("message", handleSDKMessages);
    return () => window.removeEventListener("message", handleSDKMessages);
  }, [user]);

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
      } else { setUser(null); setScreen('auth'); }
    });
    return () => unsubscribe();
  }, []);

  const handleLogin = async () => {
    googleProvider.setCustomParameters({ prompt: 'select_account' });
    await setPersistence(auth, browserLocalPersistence);
    await signInWithPopup(auth, googleProvider);
  };

  // --- FIX 2: NOWPAYMENTS REAL-TIME ADDRESS ---
  const handlePurchase = async () => {
    setIsGeneratingPay(true);
    try {
        const res = await fetch('https://api.nowpayments.io/v1/payment', {
            method: 'POST',
            headers: {
                'x-api-key': '3THXNSZ-AYVMTP6-HQ9KGKK-9J6CQD7',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                price_amount: purchaseAmount,
                price_currency: "usd",
                pay_currency: "usdttrc20",
                order_id: `AJ_${Date.now()}`,
                order_description: `Deposit for ${user.email}`
            })
        });
        const data = await res.json();
        if(data.pay_address) {
            setPayAddress(data.pay_address);
        } else {
            alert("Error generating address. Check API Key.");
        }
    } catch (e) {
        alert("Network Error!");
    }
    setIsGeneratingPay(false);
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
    let details = payoutMethod.includes('Visa') ? `Name: ${cardName} | Card: ${cardNumber}` : payoutId;
    await addDoc(collection(db, "withdraw_requests"), { uid: user.uid, amount: balance, method: payoutMethod, details: details, status: "pending", date: new Date() });
    alert("✅ Request Sent!"); setWalletTab('main');
  };

  const activateBot = async (tier: string, cost: number) => {
    if (balance < cost) return alert(`⚠️ Need ${cost} Coins!`);
    await updateDoc(doc(db, "users", user.uid), { balance: increment(-cost), botTier: tier, invested: cost });
    alert("🚀 BOT ACTIVE!");
  };

  if (screen === 'splash') return (
    <main className="h-screen bg-black flex flex-col items-center justify-center text-white">
      <div className="w-32 h-32 md:w-56 md:h-56 bg-black rounded-full border-4 border-cyan-500 shadow-[0_0_60px_#06b6d4] overflow-hidden mb-8">
        <img src="/logo.jpg" className="w-full h-full object-cover" alt="Logo" />
      </div>
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
          <div onClick={() => {setScreen('wallet'); setWalletTab('main')}} className="flex items-center gap-3 bg-white/5 px-4 py-2 rounded-full border border-white/10 shadow-lg cursor-pointer">
            <span className="text-xs font-black text-yellow-500">{balance} 🪙</span>
            <span className="text-[10px] text-green-400 font-bold">${usdtValue}</span>
            {user && <img src={user.photoURL} className="w-8 h-8 rounded-full border border-cyan-500" />}
          </div>
          <button onClick={() => signOut(auth)} className="p-2 bg-red-500/20 rounded-full text-red-500 font-bold text-[8px] px-2">EXIT</button>
        </div>
      </header>

      <section className="min-h-screen flex flex-col items-center justify-center p-4 pt-24 relative">
        <h1 className="text-4xl md:text-8xl font-black text-center mb-12 uppercase drop-shadow-[0_0_20px_#22d3ee]">AJ SUPER PORTAL</h1>
        <div className="grid grid-cols-2 gap-4 md:gap-16 w-full max-w-4xl relative z-30">
          <div onClick={() => setScreen('arcade')} className="bg-white/5 border border-white/10 rounded-3xl h-48 md:h-80 flex flex-col items-center justify-center active:scale-95 shadow-xl cursor-pointer">
             <Trophy className="text-cyan-400 w-10 h-10 md:w-20 md:h-20 mb-2" />
             <span className="font-black text-xs md:text-3xl uppercase">Gaming</span>
          </div>
          <div onClick={() => setScreen('social')} className="bg-white/5 border border-white/10 rounded-3xl h-48 md:h-80 flex flex-col items-center justify-center active:scale-95 shadow-xl relative z-50 cursor-pointer">
             <Zap className="text-pink-500 w-10 h-10 md:w-20 md:h-20 mb-2" />
             <span className="font-black text-xs md:text-3xl uppercase">Social</span>
          </div>
          <div onClick={() => {setScreen('wallet'); setWalletTab('main')}} className="bg-white/5 border-2 border-yellow-500/30 rounded-3xl h-48 md:h-80 flex flex-col items-center justify-center cursor-pointer shadow-xl relative z-30">
             <img src="/gold.jpg" className="w-14 h-14 mb-2" /><h2 className="font-black text-xs md:text-3xl uppercase text-yellow-500">Wallet</h2>
          </div>
          <div onClick={() => setScreen('ai')} className="bg-white/5 border border-white/10 rounded-3xl h-48 md:h-80 flex flex-col items-center justify-center active:scale-95 transition-all cursor-pointer shadow-xl relative z-30">
             <Bot className="text-green-400 w-10 h-10 md:w-20 md:h-20 mb-2" />
             <span className="font-black text-xs md:text-3xl uppercase">AJ AI</span>
          </div>
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0">
            <div className="w-24 h-24 md:w-96 md:h-96 bg-black border-4 md:border-[15px] border-cyan-500 rounded-full flex items-center justify-center shadow-[0_0_100px_#06b6d4] overflow-hidden">
               <img src="/logo.jpg" className="w-full h-full object-cover opacity-60 animate-pulse" alt="Logo" />
            </div>
          </div>
        </div>
      </section>

      {screen === 'arcade' && (
        <div className="fixed inset-0 z-[300] bg-black p-8 overflow-y-auto">
            <button onClick={() => {setScreen('hub'); setSelectedGame(null)}} className="text-cyan-400 font-bold mb-10 tracking-widest uppercase">← BACK TO HUB</button>
            {!selectedGame ? (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-6 max-w-5xl mx-auto pb-20">
                {Object.keys(GAME_POSTERS).map((game) => (
                  <div key={game} onClick={() => setSelectedGame(game)} className="bg-white/5 border border-white/10 p-6 rounded-3xl text-center hover:border-cyan-400 cursor-pointer transition-all">
                    {/* FIX 3: REAL POSTER IMAGE */}
                    <img src={GAME_POSTERS[game]} className="w-full aspect-video object-cover rounded-xl mb-4" alt={game} />
                    <h3 className="font-black text-sm uppercase">{game}</h3>
                    <button className="mt-4 bg-cyan-500 text-black text-[10px] font-black px-4 py-2 rounded-full">PLAY NOW</button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="w-full h-[80vh] bg-black rounded-3xl border-2 border-cyan-500 overflow-hidden relative shadow-[0_0_50px_rgba(6,182,212,0.3)]">
                 <iframe src={`/games/${selectedGame.toLowerCase().replace(' ', '-')}/index.html`} className="w-full h-full border-none" title="Game" />
              </div>
            )}
        </div>
      )}

      {screen === 'wallet' && (
        <div className="fixed inset-0 z-[300] bg-black/98 flex flex-col items-center p-8 overflow-y-auto">
           <button onClick={() => {setScreen('hub'); setWalletTab('main')}} className="self-start text-cyan-400 mb-8 font-bold">← BACK</button>
           <div className="w-full max-w-md bg-[#111] border border-white/10 p-10 rounded-3xl text-center shadow-2xl">
              <h2 className="text-5xl font-black text-yellow-500 mb-8">{balance} 🪙</h2>
              {walletTab === 'main' && (
                <div className="flex flex-col gap-4">
                   <button onClick={()=>setWalletTab('purchase')} className="bg-white text-black py-4 rounded-xl font-black uppercase">Purchase</button>
                   <button onClick={()=>setWalletTab('transfer')} className="bg-white/10 text-cyan-400 py-4 rounded-xl font-black border border-cyan-500/30 uppercase">Transfer</button>
                   <button onClick={()=>setWalletTab('withdraw')} className="bg-white/10 text-pink-500 py-4 rounded-xl font-black border border-pink-500/30 uppercase">Withdraw</button>
                </div>
              )}
              {walletTab === 'purchase' && (
                <div className="flex flex-col gap-5 text-left">
                  {!payAddress ? (
                    <>
                        <div className="bg-black border-2 border-white/10 p-6 rounded-3xl text-center">
                            <p className="text-yellow-500 text-4xl font-black mb-1">{purchaseAmount * 100} 🪙</p>
                            <input type="number" value={purchaseAmount} onChange={(e)=>setPurchaseAmount(Number(e.target.value))} className="w-full bg-transparent text-white text-2xl text-center outline-none font-bold" />
                            <p className="text-gray-500 text-[10px] mt-2 font-black uppercase">Enter USD (Min $20)</p>
                        </div>
                        <button disabled={isGeneratingPay} onClick={handlePurchase} className="bg-cyan-500 py-4 rounded-xl font-black uppercase shadow-[0_0_20px_rgba(6,182,212,0.4)]">
                            {isGeneratingPay ? "GENERATING..." : "Get Payment Address"}
                        </button>
                    </>
                  ) : (
                    <div className="bg-white/5 border border-cyan-500/30 p-6 rounded-3xl text-center animate-in zoom-in">
                        <CheckCircle className="mx-auto text-green-400 mb-4" />
                        <p className="text-xs text-gray-400 uppercase font-black mb-2">Send USDT (TRC-20) To:</p>
                        <div className="bg-black p-4 rounded-xl border border-white/10 flex items-center justify-between gap-2 overflow-hidden">
                            <code className="text-[10px] text-cyan-400 break-all">{payAddress}</code>
                            <button onClick={() => {navigator.clipboard.writeText(payAddress); alert("Copied!")}} className="p-2 bg-white/10 rounded-lg"><Copy size={16}/></button>
                        </div>
                        <p className="mt-4 text-[10px] text-yellow-500 font-bold">⚠️ Send exact amount or it will fail!</p>
                        <button onClick={()=>setPayAddress('')} className="mt-6 text-gray-500 text-[10px] uppercase underline">Reset Payment</button>
                    </div>
                  )}
                  <button onClick={()=>setWalletTab('main')} className="text-gray-500 text-xs text-center uppercase">Cancel</button>
                </div>
              )}
              {/* Rest of the UI remains the same... */}
           </div>
        </div>
      )}
      {/* Social, AI and Footer sections same as before */}
    </main>
  );
}