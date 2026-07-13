"use client";
import React, { useState, useEffect } from 'react';
import { auth, db, googleProvider } from '../firebaseConfig'; 
import { signInWithPopup, onAuthStateChanged, signOut, setPersistence, browserLocalPersistence } from 'firebase/auth';
import { doc, setDoc, onSnapshot, updateDoc, increment, collection, addDoc, getDoc } from 'firebase/firestore';
import { Trophy, Zap, Wallet, Bot, LogOut, Activity, TrendingUp, Copy, CheckCircle, ArrowRightCircle } from 'lucide-react';

export default function AJSuperPortal() {
  const [screen, setScreen] = useState('splash');
  const [walletTab, setWalletTab] = useState('main'); 
  const [user, setUser] = useState<any>(null);
  const [balance, setBalance] = useState(0);
  const [botTier, setBotTier] = useState('none');
  const [invested, setInvested] = useState(0);
  const [selectedGame, setSelectedGame] = useState<string | null>(null);

  // Input States
  const [purchaseAmount, setPurchaseAmount] = useState(20); 
  const [transferId, setTransferId] = useState('');
  const [transferAmount, setTransferAmount] = useState(0);
  const [payoutMethod, setPayoutMethod] = useState('Binance Pay (USDT)');
  const [payoutId, setPayoutId] = useState('');
  const [cardName, setCardName] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const usdtValue = (balance / 100).toFixed(2);

  // Posters Map
  const posters: any = {
    'Rider King': '/posters/rider-king.jpg',
    'Pulse Racer': '/posters/pulse-racer.jpg',
    'Subsea Surge': '/posters/subsea.jpg',
    'Neon Strike': '/posters/neon.jpg',
    'Volcano Escape': '/posters/volcano.jpg',
    'Ludo': '/posters/ludo.jpg',
    'Air Hockey': '/posters/hockey.jpg'
  };

  useEffect(() => {
    const handleSDKMessages = async (event: any) => {
      if (!user || !event.data) return;
      if (event.data.type === 'SHOW_AD') {
         if ((window as any).show_8924758) (window as any).show_8924758();
      }
      if (event.data.type === 'EARNED') {
        await updateDoc(doc(db, "users", user.uid), { balance: increment(event.data.amount) });
      }
    };
    window.addEventListener("message", handleSDKMessages);
    return () => window.removeEventListener("message", handleSDKMessages);
  }, [user]);

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

  // FIX: Fresh Payment Link Generator
  const handlePurchase = async () => {
    setIsProcessing(true);
    try {
        const res = await fetch('https://api.nowpayments.io/v1/invoice', {
            method: 'POST',
            headers: { 'x-api-key': '3THXNSZ-AYVMTP6-HQ9KGKK-9J6CQD7', 'Content-Type': 'application/json' },
            body: JSON.stringify({
                price_amount: purchaseAmount,
                price_currency: "usd",
                pay_currency: "usdttrc20",
                order_id: `AJ_${Date.now()}`,
                order_description: `Deposit for ${user.email}`
            })
        });
        const data = await res.json();
        if (data.invoice_url) { window.open(data.invoice_url, '_blank'); }
        else { alert("Min $20 Required!"); }
    } catch (e) { alert("API Error!"); }
    setIsProcessing(false);
  };

  const handleTransfer = async () => {
    if (transferAmount <= 0 || transferAmount > balance) return alert("Insufficient Balance!");
    const recipientSnap = await getDoc(doc(db, "users", transferId));
    if (recipientSnap.exists()) {
      await updateDoc(doc(db, "users", user.uid), { balance: increment(-transferAmount) });
      await updateDoc(doc(db, "users", transferId), { balance: increment(transferAmount) });
      alert("✅ Sent Successfully!"); setWalletTab('main');
    } else { alert("User ID Not Found!"); }
  };

  const handleWithdraw = async () => {
    if (balance < 2500) return alert("Min 2,500 Coins required!");
    let details = payoutMethod.includes('Visa') ? `Name: ${cardName} | Card: ${cardNumber}` : payoutId;
    await addDoc(collection(db, "withdraw_requests"), { uid: user.uid, amount: balance, method: payoutMethod, details, status: "pending", date: new Date() });
    alert("✅ Withdrawal Request Sent!"); setWalletTab('main');
  };

  if (screen === 'splash') return <div className="h-screen bg-black flex items-center justify-center text-cyan-400 text-4xl font-black italic">AJ PORTAL</div>;

  if (!user) return (
    <div className="h-screen bg-black flex flex-col items-center justify-center">
      <button onClick={() => signInWithPopup(auth, googleProvider)} className="px-10 py-4 bg-white text-black font-black rounded-2xl">LOGIN WITH GOOGLE</button>
    </div>
  );

  return (
    <main className="min-h-screen bg-[#020617] text-white">
      <header className="p-4 flex justify-between items-center border-b border-white/5 sticky top-0 bg-black/80 z-[100]">
        <div className="text-xl font-black italic text-cyan-400">AJ STUDIO</div>
        <div onClick={() => {setScreen('wallet'); setWalletTab('main')}} className="bg-white/5 px-4 py-2 rounded-full border border-white/10 cursor-pointer">
          <span className="text-yellow-500 font-bold">{balance} 🪙</span>
        </div>
      </header>

      {screen === 'hub' && (
        <div className="p-8 grid grid-cols-2 gap-4 max-w-4xl mx-auto pt-20">
          <div onClick={() => setScreen('arcade')} className="bg-white/5 p-10 rounded-3xl border border-white/10 flex flex-col items-center"><Trophy size={48} className="text-cyan-400 mb-2"/><span>Arcade</span></div>
          <div onClick={() => {setScreen('wallet'); setWalletTab('main')}} className="bg-white/5 p-10 rounded-3xl border border-white/10 flex flex-col items-center"><Wallet size={48} className="text-yellow-500 mb-2"/><span>Wallet</span></div>
          <div onClick={() => setScreen('ai')} className="bg-white/5 p-10 rounded-3xl border border-white/10 flex flex-col items-center"><Bot size={48} className="text-green-500 mb-2"/><span>AJ AI</span></div>
          <div onClick={() => setScreen('social')} className="bg-white/5 p-10 rounded-3xl border border-white/10 flex flex-col items-center"><Zap size={48} className="text-pink-500 mb-2"/><span>Social</span></div>
        </div>
      )}

      {screen === 'arcade' && (
        <div className="p-6">
          <button onClick={() => {setScreen('hub'); setSelectedGame(null)}} className="text-cyan-400 mb-6">← BACK</button>
          {!selectedGame ? (
            <div className="grid grid-cols-2 gap-4">
              {Object.keys(posters).map(game => (
                <div key={game} onClick={() => setSelectedGame(game)} className="bg-white/5 rounded-2xl overflow-hidden border border-white/10">
                  <img src={posters[game]} className="w-full aspect-video object-cover" onError={(e:any)=>e.target.src='https://placehold.co/600x400/000/cyan?text=Game+Poster'} />
                  <p className="p-3 text-center text-xs font-bold uppercase">{game}</p>
                </div>
              ))}
            </div>
          ) : (
            <iframe src={`/games/${selectedGame.toLowerCase().replace(/ /g, '-')}/index.html`} className="w-full h-[70vh] rounded-3xl border-2 border-cyan-500" />
          )}
        </div>
      )}

      {screen === 'wallet' && (
        <div className="p-6 max-w-md mx-auto">
          <button onClick={() => setScreen('hub')} className="text-cyan-400 mb-6">← BACK</button>
          <div className="bg-white/5 p-8 rounded-[2rem] border border-white/10 text-center">
            <h2 className="text-4xl font-black text-yellow-500 mb-6">{balance} 🪙</h2>
            
            {walletTab === 'main' && (
              <div className="flex flex-col gap-3">
                <button onClick={()=>setWalletTab('purchase')} className="bg-white text-black py-4 rounded-xl font-bold">PURCHASE</button>
                <button onClick={()=>setWalletTab('transfer')} className="bg-white/10 py-4 rounded-xl font-bold">TRANSFER</button>
                <button onClick={()=>setWalletTab('withdraw')} className="bg-white/10 py-4 rounded-xl font-bold">WITHDRAW</button>
              </div>
            )}

            {walletTab === 'purchase' && (
              <div className="flex flex-col gap-4">
                <input type="number" value={purchaseAmount} onChange={(e)=>setPurchaseAmount(Number(e.target.value))} className="bg-black border p-4 rounded-xl text-center" placeholder="USD Amount" />
                <button onClick={handlePurchase} disabled={isProcessing} className="bg-cyan-500 py-4 rounded-xl font-black uppercase">{isProcessing ? "Generating..." : "Pay Now"}</button>
                <button onClick={()=>setWalletTab('main')} className="text-xs text-gray-500 underline">Cancel</button>
              </div>
            )}

            {walletTab === 'transfer' && (
              <div className="flex flex-col gap-4">
                <input type="text" placeholder="Recipient UID" onChange={(e)=>setTransferId(e.target.value)} className="bg-black border p-4 rounded-xl text-center" />
                <input type="number" placeholder="Amount" onChange={(e)=>setTransferAmount(Number(e.target.value))} className="bg-black border p-4 rounded-xl text-center" />
                <button onClick={handleTransfer} className="bg-yellow-600 py-4 rounded-xl font-bold">SEND COINS</button>
                <button onClick={()=>setWalletTab('main')} className="text-xs text-gray-500 underline">Back</button>
              </div>
            )}

            {walletTab === 'withdraw' && (
              <div className="flex flex-col gap-4">
                <select onChange={(e)=>setPayoutMethod(e.target.value)} className="bg-black border p-4 rounded-xl">
                  <option>Binance Pay (USDT)</option>
                  <option>Visa Transfer</option>
                </select>
                <input type="text" placeholder="Wallet Address / ID" onChange={(e)=>setPayoutId(e.target.value)} className="bg-black border p-4 rounded-xl text-center" />
                <button onClick={handleWithdraw} className="bg-pink-600 py-4 rounded-xl font-bold">REQUEST PAYOUT</button>
                <button onClick={()=>setWalletTab('main')} className="text-xs text-gray-500 underline">Back</button>
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  );
}