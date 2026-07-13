"use client";
import React, { useState, useEffect } from 'react';
import { auth, db, googleProvider } from '../firebaseConfig'; 
import { signInWithPopup, onAuthStateChanged, signOut, setPersistence, browserLocalPersistence } from 'firebase/auth';
import { doc, setDoc, onSnapshot, updateDoc, increment, collection, addDoc, getDoc } from 'firebase/firestore';
import { MessageCircle, Trophy, Zap, Wallet, Bot, LogOut, Globe, ChevronRight, Send, CreditCard, ArrowUpRight, ShieldCheck, Crown, Activity, TrendingUp, X } from 'lucide-react';

export default function AJSuperPortal() {
  const [screen, setScreen] = useState('splash');
  const [walletTab, setWalletTab] = useState('main'); 
  const [user, setUser] = useState<any>(null);
  const [balance, setBalance] = useState(0);
  const [botTier, setBotTier] = useState('none');
  const [invested, setInvested] = useState(0);
  const [loading, setLoading] = useState(0);
  const [selectedGame, setSelectedGame] = useState<string | null>(null);

  const [purchaseAmount, setPurchaseAmount] = useState(20); 
  const [transferId, setTransferId] = useState('');
  const [transferAmount, setTransferAmount] = useState(0);
  const [payoutMethod, setPayoutMethod] = useState('Binance Pay (USDT)');
  const [payoutId, setPayoutId] = useState('');
  const [cardName, setCardName] = useState('');
  const [cardNumber, setCardNumber] = useState('');

  const usdtValue = (balance / 100).toFixed(2);

  // --- SDK MESSAGE LISTENER ---
  useEffect(() => {
    const handleSDKMessages = async (event: any) => {
      if (!user) return;
      const data = event.detail || event.data;
      if (!data) return;
      const { type, amount, coins } = data;
      if (type === 'EARNED' || type === "ADD_AD_REVENUE") {
        const reward = amount || coins;
        await updateDoc(doc(db, "users", user.uid), { balance: increment(reward) });
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
        onSnapshot(doc(db, "users", currentUser.uid), (docSnap) => {
          if (docSnap.exists()) {
            setBalance(docSnap.data().balance || 0);
            setBotTier(docSnap.data().botTier || 'none');
          } else {
            setDoc(doc(db, "users", currentUser.uid), { name: currentUser.displayName, email: currentUser.email, balance: 500, uid: currentUser.uid });
          }
        });
        setScreen('hub');
      } else { setUser(null); setScreen('auth'); }
    });
    return () => unsubscribe();
  }, []);

  // --- FIX 1: DYNAMIC PAYMENT LINK (No "Partially Paid" Error) ---
  const handlePurchase = async () => {
    try {
      const res = await fetch('https://api.nowpayments.io/v1/invoice', {
        method: 'POST',
        headers: { 'x-api-key': '3THXNSZ-AYVMTP6-HQ9KGKK-9J6CQD7', 'Content-Type': 'application/json' },
        body: JSON.stringify({ price_amount: purchaseAmount, price_currency: "usd", pay_currency: "usdttrc20" })
      });
      const data = await res.json();
      if (data.invoice_url) window.open(data.invoice_url, '_blank');
      else alert("Check Amount (Min $20)");
    } catch (e) { alert("API Error"); }
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
    await addDoc(collection(db, "withdraw_requests"), { uid: user.uid, amount: balance, method: payoutMethod, details, status: "pending", date: new Date() });
    alert("✅ Request Sent!"); setWalletTab('main');
  };

  const activateBot = async (tier: string, cost: number) => {
    if (balance < cost) return alert(`⚠️ Need ${cost} Coins!`);
    await updateDoc(doc(db, "users", user.uid), { balance: increment(-cost), botTier: tier });
    alert("🚀 BOT ACTIVE!");
  };

  if (screen === 'splash') return <div className="h-screen bg-black flex flex-col items-center justify-center text-white"><h1 className="text-3xl font-black animate-pulse uppercase">AJ PORTAL</h1></div>;
  if (screen === 'auth' && !user) return <div className="h-screen bg-black flex items-center justify-center"><button onClick={() => signInWithPopup(auth, googleProvider)} className="py-5 px-10 bg-white text-black font-black rounded-2xl">CONTINUE WITH GOOGLE</button></div>;

  return (
    <main className="min-h-screen bg-[#020617] text-white">
      <header className="fixed top-0 w-full p-4 flex justify-between items-center z-[100] bg-black/80 border-b border-white/5">
        <div className="text-xl font-black italic text-cyan-400">AJ STUDIO</div>
        <div onClick={() => {setScreen('wallet'); setWalletTab('main')}} className="flex items-center gap-3 bg-white/5 px-4 py-2 rounded-full border border-white/10 cursor-pointer">
          <span className="text-xs font-black text-yellow-500">{balance} 🪙</span>
        </div>
      </header>

      <section className="min-h-screen flex flex-col items-center justify-center p-4 pt-24">
        <div className="grid grid-cols-2 gap-4 w-full max-w-4xl">
          <div onClick={() => setScreen('arcade')} className="bg-white/5 border border-white/10 rounded-3xl h-48 flex flex-col items-center justify-center cursor-pointer">
             <Trophy className="text-cyan-400 w-10 h-10 mb-2" />
             <span className="font-black text-xs uppercase">Gaming</span>
          </div>
          <div onClick={() => setScreen('social')} className="bg-white/5 border border-white/10 rounded-3xl h-48 flex flex-col items-center justify-center cursor-pointer">
             <Zap className="text-pink-500 w-10 h-10 mb-2" />
             <span className="font-black text-xs uppercase">Social</span>
          </div>
          <div onClick={() => {setScreen('wallet'); setWalletTab('main')}} className="bg-white/5 border border-yellow-500/30 rounded-3xl h-48 flex flex-col items-center justify-center cursor-pointer">
             <Wallet className="text-yellow-500 w-10 h-10 mb-2" />
             <span className="font-black text-xs uppercase">Wallet</span>
          </div>
          <div onClick={() => setScreen('ai')} className="bg-white/5 border border-white/10 rounded-3xl h-48 flex flex-col items-center justify-center cursor-pointer">
             <Bot className="text-green-400 w-10 h-10 mb-2" />
             <span className="font-black text-xs uppercase">AJ AI</span>
          </div>
        </div>
      </section>

      {screen === 'arcade' && (
        <div className="fixed inset-0 z-[300] bg-black p-8 overflow-y-auto">
            <button onClick={() => {setScreen('hub'); setSelectedGame(null)}} className="text-cyan-400 font-bold mb-10 uppercase">← BACK</button>
            {!selectedGame ? (
              <div className="grid grid-cols-2 gap-6">
                {['Rider King', 'Pulse Racer', 'Subsea Surge', 'Neon Strike'].map((game) => (
                  <div key={game} onClick={() => setSelectedGame(game)} className="bg-white/5 border border-white/10 p-4 rounded-3xl text-center cursor-pointer">
                    {/* FIX 2: POSTER PATH FIX */}
                    <img src={`/posters/${game.toLowerCase().replace(' ', '-')}.jpg`} className="w-full aspect-video rounded-xl mb-4 object-cover" onError={(e:any)=>e.target.src='https://placehold.co/400x200/000/cyan?text='+game} />
                    <h3 className="font-black text-xs uppercase">{game}</h3>
                  </div>
                ))}
              </div>
            ) : (
              <div className="w-full h-[80vh] border-2 border-cyan-500 rounded-3xl overflow-hidden">
                 <iframe src={`/games/${selectedGame.toLowerCase().replace(' ', '-')}/index.html`} className="w-full h-full" />
              </div>
            )}
        </div>
      )}

      {screen === 'wallet' && (
        <div className="fixed inset-0 z-[300] bg-black/98 flex flex-col items-center p-8 overflow-y-auto">
           <button onClick={() => setScreen('hub')} className="self-start text-cyan-400 mb-8 font-bold">← BACK</button>
           <div className="w-full max-w-md bg-[#111] border border-white/10 p-10 rounded-3xl text-center">
              <h2 className="text-5xl font-black text-yellow-500 mb-8">{balance} 🪙</h2>
              {walletTab === 'main' && (
                <div className="flex flex-col gap-4">
                   <button onClick={()=>setWalletTab('purchase')} className="bg-white text-black py-4 rounded-xl font-black uppercase">Purchase</button>
                   <button onClick={()=>setWalletTab('transfer')} className="bg-white/10 text-cyan-400 py-4 rounded-xl font-black border border-cyan-500/30 uppercase">Transfer</button>
                   <button onClick={()=>setWalletTab('withdraw')} className="bg-white/10 text-pink-500 py-4 rounded-xl font-black border border-pink-500/30 uppercase">Withdraw</button>
                </div>
              )}
              {walletTab === 'purchase' && (
                <div className="flex flex-col gap-5">
                  <input type="number" value={purchaseAmount} onChange={(e)=>setPurchaseAmount(Number(e.target.value))} className="w-full bg-black border p-4 rounded-xl text-center text-white" placeholder="USD Amount" />
                  <button onClick={handlePurchase} className="bg-cyan-500 py-4 rounded-xl font-black uppercase">Pay Now</button>
                  <button onClick={()=>setWalletTab('main')} className="text-gray-500 text-xs uppercase">Cancel</button>
                </div>
              )}
              {walletTab === 'transfer' && (
                <div className="flex flex-col gap-4">
                  <input type="text" placeholder="Recipient ID" onChange={(e)=>setTransferId(e.target.value)} className="bg-black border p-4 rounded-xl text-center" />
                  <input type="number" placeholder="Amount" onChange={(e)=>setTransferAmount(Number(e.target.value))} className="bg-black border p-4 rounded-xl text-center" />
                  <button onClick={handleTransfer} className="bg-cyan-600 py-4 rounded-xl font-black">SEND NOW</button>
                  <button onClick={()=>setWalletTab('main')} className="text-gray-500 text-xs">BACK</button>
                </div>
              )}
              {walletTab === 'withdraw' && (
                <div className="flex flex-col gap-4">
                  <select onChange={(e)=>setPayoutMethod(e.target.value)} className="bg-black border p-4 rounded-xl text-white">
                    <option>Binance Pay (USDT)</option>
                    <option>Visa Transfer</option>
                  </select>
                  <input type="text" placeholder="ID / Number" onChange={(e)=>setPayoutId(e.target.value)} className="bg-black border p-4 rounded-xl text-center" />
                  <button onClick={handleWithdraw} className="bg-pink-600 py-4 rounded-xl font-black">REQUEST PAYOUT</button>
                  <button onClick={()=>setWalletTab('main')} className="text-gray-500 text-xs">BACK</button>
                </div>
              )}
           </div>
        </div>
      )}
    </main>
  );
}