import React, { useState } from 'react';
import { ArrowLeft, DollarSign, Send, Gift, Shield, HelpCircle, CheckCircle } from 'lucide-react';
import { collection, addDoc, serverTimestamp, updateDoc, doc, increment, getDoc } from 'firebase/firestore';
import { db, auth } from '../firebase';

interface WalletProps {
  user: any;
  balance: number;
  setVvipAlert: (alert: { msg: string; icon?: string } | null) => void;
  setScreen: (screen: string) => void;
}

const COIN_RATE = 100;
const CASH_RATE = 500;
const MIN_PURCHASE = 20;
const WITHDRAW_MIN = 10000;
const REFERRAL_COINS = 50;

const WITHDRAW_METHODS = [
  { label: 'EasyPaisa', field: 'Mobile Number', placeholder: '03XX-XXXXXXX' },
  { label: 'JazzCash', field: 'Mobile Number', placeholder: '03XX-XXXXXXX' },
  { label: 'Binance (USDT BSC)', field: 'USDT BSC Address', placeholder: '0x... BSC wallet address' },
  { label: 'AirTM', field: 'AirTM Email', placeholder: 'your@email.com' },
  { label: 'Oman Bank Transfer', field: 'Oman Bank IBAN', placeholder: 'OMXX XXXX XXXX XXXX XXXX' }
];

export default function Wallet({
  user,
  balance,
  setVvipAlert,
  setScreen
}: WalletProps) {
  const [walletTab, setWalletTab] = useState<'main' | 'purchase' | 'transfer' | 'withdraw' | 'referral'>('main');
  const [purchaseAmount, setPurchaseAmount] = useState(20);
  const [transferId, setTransferId] = useState('');
  const [transferAmount, setTransferAmount] = useState(0);
  const [payoutMethod, setPayoutMethod] = useState(WITHDRAW_METHODS[0].label);
  const [payoutId, setPayoutId] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [copied, setCopied] = useState(false);

  const displayBalance = balance.toFixed(1);
  const displayUsdt = (balance / CASH_RATE).toFixed(2);

  const currentWithdrawMethod = WITHDRAW_METHODS.find(m => m.label === payoutMethod) || WITHDRAW_METHODS[0];

  const copyToClipboard = (id: string) => {
    navigator.clipboard.writeText(id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePurchase = async () => {
    if (purchaseAmount < MIN_PURCHASE) {
      return setVvipAlert({ msg: `Minimum purchase is $${MIN_PURCHASE} (= ${MIN_PURCHASE * COIN_RATE} Coins)` });
    }
    if (!user?.uid) return;

    try {
      setVvipAlert({ msg: '🔄 Opening secure NOWPayments gateway...' });
      const baseBody = {
        price_amount: purchaseAmount,
        price_currency: 'usd',
        pay_currency: 'usdtbsc',
        order_id: user.uid,
        order_description: `AJ Coins — $${purchaseAmount} = ${purchaseAmount * COIN_RATE} Coins`,
        success_url: window.location.href,
        cancel_url: window.location.href,
        is_fiat: true,
        ipn_callback_url: `${window.location.origin}/api/callback`
      };
      const res = await fetch('https://api.nowpayments.io/v1/invoice', {
        method: 'POST',
        headers: {
          'x-api-key': '3THXNSZ-AYVMTP6-HQ9KGKK-9J6CQD7',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(baseBody)
      });
      const data = await res.json();
      if (data.invoice_url) {
        window.open(data.invoice_url, '_blank');
      } else {
        setVvipAlert({ msg: 'NOWPayments setup error. Directing to Support.' });
      }
    } catch {
      setVvipAlert({ msg: 'Crypto gateway error. Please try again.' });
    }
  };

  const handleTransfer = async () => {
    if (transferAmount <= 0 || !transferId.trim()) {
      return setVvipAlert({ msg: 'Please enter all required fields.' });
    }
    if (balance < transferAmount) {
      return setVvipAlert({ msg: 'Insufficient balance for transfer.' });
    }
    if (transferId === user?.uid) {
      return setVvipAlert({ msg: 'You cannot transfer coins to yourself.' });
    }
    try {
      const recipientSnap = await getDoc(doc(db, 'users', transferId.trim()));
      if (!recipientSnap.exists()) {
        return setVvipAlert({ msg: 'Recipient User ID not found.' });
      }

      await updateDoc(doc(db, 'users', user.uid), { balance: increment(-transferAmount) });
      await updateDoc(doc(db, 'users', transferId.trim()), { balance: increment(transferAmount) });

      setTransferAmount(0);
      setTransferId('');
      setWalletTab('main');
      setVvipAlert({ msg: `✅ Successfully transferred ${transferAmount} Coins!`, icon: '🎉' });
    } catch {
      setVvipAlert({ msg: 'Coin transfer failed.' });
    }
  };

  const handleWithdraw = async () => {
    if (balance < WITHDRAW_MIN) {
      return setVvipAlert({ msg: `Withdrawal button disabled. Minimum limit is ${WITHDRAW_MIN.toLocaleString()} Coins ($20).` });
    }
    if (!payoutId.trim()) {
      return setVvipAlert({ msg: `Please provide your ${currentWithdrawMethod.field}.` });
    }
    try {
      const usdVal = balance / CASH_RATE;
      await updateDoc(doc(db, 'users', user.uid), { balance: 0 });
      await addDoc(collection(db, 'manual_withdrawals'), {
        uid: user.uid,
        email: user.email,
        coins: balance,
        amountUsd: usdVal,
        method: payoutMethod,
        payoutAddress: payoutId,
        status: 'pending',
        createdAt: serverTimestamp()
      });

      setPayoutId('');
      setWalletTab('main');
      setVvipAlert({ msg: `🚀 Withdrawal request for $${usdVal.toFixed(2)} submitted successfully!`, icon: '✨' });
    } catch {
      setVvipAlert({ msg: 'Withdrawal processing error.' });
    }
  };

  const handleApplyReferral = async () => {
    if (!referralCode.trim()) return setVvipAlert({ msg: 'Please enter a valid referral code.' });
    try {
      const rSnap = await getDoc(doc(db, 'users', referralCode.trim()));
      if (!rSnap.exists()) return setVvipAlert({ msg: 'Invalid Referrer User ID.' });

      // Reward Referrer
      await updateDoc(doc(db, 'users', referralCode.trim()), { balance: increment(REFERRAL_COINS) });
      setReferralCode('');
      setVvipAlert({ msg: `🎉 Success! Referrer received +${REFERRAL_COINS} AJ Coins!`, icon: '🎁' });
    } catch {
      setVvipAlert({ msg: 'Error applying referral.' });
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] p-6 flex flex-col items-center">
      <div className="w-full max-w-md flex justify-between items-center mb-8">
        <button onClick={() => { if (walletTab === 'main') setScreen('hub'); else setWalletTab('main'); }}
          className="text-cyan-400 font-bold uppercase tracking-widest flex items-center gap-2 text-xs">
          <ArrowLeft size={16} /> Back
        </button>
        <span className="text-[10px] text-gray-500 font-black tracking-widest uppercase">AJ Secure Wallet</span>
      </div>

      <div className="w-full max-w-md backdrop-blur-3xl bg-white/[0.03] border border-white/10 p-8 rounded-[2.5rem] shadow-2xl relative overflow-hidden">
        {/* Oman Brand Logo on top of cards — z-index: 50 */}
        <div className="absolute top-4 right-4 z-50 w-8 h-8 rounded-full border border-yellow-500 flex items-center justify-center bg-black/60 shadow-lg animate-pulse">
          <span className="text-yellow-500 font-black text-[9px] tracking-tighter">Oman</span>
        </div>

        <h3 className="text-gray-500 text-[10px] font-black uppercase tracking-[0.25em] text-center">My Balance</h3>
        <h2 className="text-5xl font-black text-yellow-500 text-center mt-2 tracking-tight">{displayBalance} <span className="text-lg">🪙</span></h2>
        <p className="text-green-400 font-black text-lg text-center mt-1 tracking-widest">${displayUsdt} USD</p>

        {/* Copy Referral Code */}
        <div className="bg-white/5 p-4 rounded-2xl border border-white/10 my-6">
          <p className="text-[8px] text-gray-400 uppercase font-black tracking-widest mb-1.5">My Referral Code (User ID)</p>
          <div className="flex justify-between items-center bg-[#050505]/60 px-3.5 py-2.5 rounded-xl border border-white/5">
            <span className="text-[10px] font-mono text-cyan-400 truncate max-w-[200px]">{user?.uid}</span>
            <button onClick={() => copyToClipboard(user?.uid || '')} className="text-cyan-400 text-[9px] font-black uppercase tracking-wider">
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
        </div>

        {walletTab === 'main' && (
          <div className="flex flex-col gap-3 mt-4">
            <button onClick={() => setWalletTab('purchase')} className="w-full py-4 bg-white text-black font-black text-xs uppercase tracking-widest rounded-2xl shadow-xl hover:scale-105 active:scale-95 transition-all">
              💳 Purchase Coins
            </button>
            <button onClick={() => setWalletTab('transfer')} className="w-full py-4 bg-cyan-600/20 border border-cyan-500/30 text-cyan-400 font-black text-xs uppercase tracking-widest rounded-2xl hover:bg-cyan-600/30 transition-all">
              🔄 Peer Transfer
            </button>
            {/* Disable button if balance < 10,000 AJ Coins — Oman Economy mandate */}
            <button
              onClick={() => setWalletTab('withdraw')}
              disabled={balance < WITHDRAW_MIN}
              className={`w-full py-4 font-black text-xs uppercase tracking-widest rounded-2xl transition-all ${balance >= WITHDRAW_MIN ? 'bg-pink-600 text-white shadow-[0_0_15px_rgba(236,72,153,0.45)]' : 'bg-gray-800 text-gray-500 border border-white/5 cursor-not-allowed'}`}
            >
              💸 Withdraw Cashout {balance < WITHDRAW_MIN && `(Min 10k 🪙)`}
            </button>
            <button onClick={() => setWalletTab('referral')} className="w-full py-4 bg-yellow-500/20 border border-yellow-500/30 text-yellow-500 font-black text-xs uppercase tracking-widest rounded-2xl hover:bg-yellow-500/30 transition-all">
              🎁 Claim Referral Code
            </button>
          </div>
        )}

        {walletTab === 'purchase' && (
          <div className="space-y-5 text-left">
            <h4 className="font-black text-xs uppercase text-cyan-400 tracking-wider">Recharge Balance</h4>
            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex justify-between items-center">
              <span className="text-3xl">₿</span>
              <div className="flex-1 ml-3">
                <p className="font-black text-xs">Binance USDT (BSC)</p>
                <p className="text-[9px] text-gray-400 font-bold mt-0.5">Automated secure coin credit via NOWPayments</p>
              </div>
              <span className="text-[8px] font-black uppercase text-cyan-400 border border-cyan-500/30 px-2 py-0.5 rounded-full">Secure</span>
            </div>

            <div className="bg-black/60 border border-white/10 rounded-2xl p-5 text-center">
              <p className="text-[8px] text-gray-400 uppercase font-black tracking-widest">Deposit USD Amount</p>
              <div className="flex items-center justify-center gap-1.5 my-3">
                <DollarSign className="text-green-400" size={24} />
                <input
                  type="number"
                  min={MIN_PURCHASE}
                  value={purchaseAmount}
                  onChange={(e) => setPurchaseAmount(Number(e.target.value))}
                  className="bg-transparent text-white font-black text-3xl text-center w-28 outline-none"
                />
              </div>
              <p className="text-yellow-500 text-[10px] font-black uppercase tracking-widest mt-1">You will receive: {(purchaseAmount * COIN_RATE).toLocaleString()} 🪙</p>
            </div>

            <button onClick={handlePurchase} className="w-full py-4 bg-cyan-500 text-black font-black text-xs uppercase tracking-widest rounded-xl shadow-xl hover:scale-[1.01]">
              Generate Automated Invoice
            </button>
          </div>
        )}

        {walletTab === 'transfer' && (
          <div className="space-y-4 text-left">
            <h4 className="font-black text-xs uppercase text-cyan-400 tracking-wider">Instant Transfer</h4>
            <div>
              <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1 block">Recipient User ID</label>
              <input type="text" value={transferId} onChange={(e) => setTransferId(e.target.value)} placeholder="Paste recipient ID"
                className="w-full bg-black/60 border border-white/10 p-3.5 rounded-xl text-xs font-bold text-white outline-none focus:border-cyan-500" />
            </div>
            <div>
              <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1 block">Coins to Send</label>
              <input type="number" value={transferAmount || ''} onChange={(e) => setTransferAmount(Number(e.target.value))} placeholder="Amount of coins"
                className="w-full bg-black/60 border border-white/10 p-3.5 rounded-xl text-xs font-bold text-white outline-none focus:border-cyan-500" />
            </div>
            <button onClick={handleTransfer} className="w-full py-4 bg-cyan-500 text-black font-black text-xs uppercase tracking-widest rounded-xl">
              Authorize Peer Transfer
            </button>
          </div>
        )}

        {walletTab === 'withdraw' && (
          <div className="space-y-4 text-left">
            <h4 className="font-black text-xs uppercase text-pink-500 tracking-widest">Withdrawal Request</h4>
            <div className="bg-red-500/10 border border-red-500/20 p-3 rounded-xl">
              <p className="text-[9px] text-red-400 font-bold leading-relaxed uppercase">
                Oman localized earnings withdrawal has a strict minimum of {WITHDRAW_MIN.toLocaleString()} Coins (= $20 USD).
              </p>
            </div>

            <div>
              <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1 block">Payout Method</label>
              <select value={payoutMethod} onChange={(e) => setPayoutMethod(e.target.value)}
                className="w-full bg-black/60 border border-white/10 p-3.5 rounded-xl text-xs font-bold text-white outline-none">
                {WITHDRAW_METHODS.map(m => <option key={m.label}>{m.label}</option>)}
              </select>
            </div>

            <div>
              <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1 block">{currentWithdrawMethod.field}</label>
              <input type="text" value={payoutId} onChange={(e) => setPayoutId(e.target.value)} placeholder={currentWithdrawMethod.placeholder}
                className="w-full bg-black/60 border border-white/10 p-3.5 rounded-xl text-xs font-bold text-white outline-none focus:border-pink-500" />
            </div>

            <button onClick={handleWithdraw} className="w-full py-4 bg-pink-600 text-white font-black text-xs uppercase tracking-widest rounded-xl shadow-lg">
              Submit Withdrawal
            </button>
          </div>
        )}

        {walletTab === 'referral' && (
          <div className="space-y-4 text-left">
            <h4 className="font-black text-xs uppercase text-yellow-500 tracking-wider">Referral Reward System</h4>
            <div>
              <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1 block">Referrer User ID</label>
              <input type="text" value={referralCode} onChange={(e) => setReferralCode(e.target.value)} placeholder="Paste referrer ID here"
                className="w-full bg-black/60 border border-white/10 p-3.5 rounded-xl text-xs font-bold text-white outline-none focus:border-yellow-500" />
            </div>
            <p className="text-[9px] text-gray-500 leading-relaxed font-bold">Both you and your referrer will get verified bonus coins added automatically after review.</p>
            <button onClick={handleApplyReferral} className="w-full py-4 bg-yellow-500 text-black font-black text-xs uppercase tracking-widest rounded-xl">
              Claim Bonus
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
