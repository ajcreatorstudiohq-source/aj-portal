'use client';

import React, { useState, useEffect, useRef } from 'react';

// ==========================================
// 🔑 CREDENTIALS & CONSTANTS
// ==========================================
const UNSPLASH_KEY = "W4x76VphkyY9fzP3DbJPfXLhdD6x063gW--Voifn_UE";
const YOUTUBE_SHORT_ID = "dQw4w9WgXcQ"; // Play dynamic viral Shorts
const GMAIL_ID = "ajcreatorstudio.hq@gmail.com";

interface Contact {
  id: string;
  name: string;
}

interface Message {
  id: string;
  sender: 'me' | 'them';
  text: string;
  timestamp: string;
}

interface AimMessage {
  sender: 'user' | 'bot';
  text: string;
}

export default function AJSuperPortal() {
  // Navigation & Coins States
  const [activeTab, setActiveTab] = useState<'tikreels' | 'pulse' | 'wechat' | 'wallet' | 'more'>('tikreels');
  const [userCoins, setUserCoins] = useState<number>(10000);

  // TikReels States
  const [isMuted, setIsMuted] = useState<boolean>(true);
  const playerRef = useRef<any>(null);

  // AJ Pulse States
  const [pulsePosts, setPulsePosts] = useState<any[]>([]);
  const [loadingPulse, setLoadingPulse] = useState<boolean>(false);

  // WeChat States
  const [activeRecipient, setActiveRecipient] = useState<Contact | null>(null);
  const [chatMessages, setChatMessages] = useState<Message[]>([]);
  const [messageInput, setMessageInput] = useState<string>('');
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Wallet Form States
  const [transferId, setTransferId] = useState<string>('');
  const [transferAmount, setTransferAmount] = useState<string>('');
  const [withdrawCoins, setWithdrawCoins] = useState<string>('');
  const [payoutMethod, setPayoutMethod] = useState<string>('');
  
  // Dynamic Wallet Inputs
  const [mobilePhone, setMobilePhone] = useState<string>('');
  const [mobileName, setMobileName] = useState<string>('');
  const [cardHolder, setCardHolder] = useState<string>('');
  const [cardNumber, setCardNumber] = useState<string>('');
  const [cardExpiry, setCardExpiry] = useState<string>('');
  const [cardCvv, setCardCvv] = useState<string>('');

  // AI Assistant States
  const [aiInput, setAiInput] = useState<string>('');
  const [aiChat, setAiChat] = useState<AimMessage[]>([
    { sender: 'bot', text: 'Hello Ali! I am your custom portal assistant. Ask me anything about coins, rates, or setups.' }
  ]);
  const aiChatEndRef = useRef<HTMLDivElement>(null);

  // Fallback Contacts list
  const fallbackContacts: Contact[] = [
    { id: "sys-01", name: "Ali Asim (Founder)" },
    { id: "sys-02", name: "Fatimah (Director)" },
    { id: "sys-03", name: "Mahnoor (Marketing)" },
    { id: "sys-04", name: "Anem (QA Engineer)" }
  ];

  // ==========================================
  // 🎬 YOUTUBE PLAYER SETUP (TikReels)
  // ==========================================
  useEffect(() => {
    // Load YouTube Player API SDK
    if (!window.YT) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);

      window.onYouTubeIframeAPIReady = () => {
        initPlayer();
      };
    } else {
      initPlayer();
    }

    function initPlayer() {
      playerRef.current = new window.YT.Player('tikreels-player-frame', {
        height: '100%',
        width: '100%',
        videoId: YOUTUBE_SHORT_ID,
        playerVars: {
          autoplay: 1,
          controls: 0,
          mute: 1,
          loop: 1,
          playlist: YOUTUBE_SHORT_ID,
          playsinline: 1,
        },
        events: {
          onReady: (e: any) => {
            e.target.playVideo();
          },
        },
      });
    }
  }, []);

  const toggleSound = () => {
    if (playerRef.current) {
      if (isMuted) {
        playerRef.current.unMute();
        playerRef.current.setVolume(100);
        setIsMuted(false);
      } else {
        playerRef.current.mute();
        setIsMuted(true);
      }
    }
  };

  // ==========================================
  // 📸 AJ PULSE CONTROLLER (Unsplash Feed)
  // ==========================================
  const fetchPulseImages = async () => {
    if (pulsePosts.length > 0) return; // Prevent double load
    setLoadingPulse(true);
    try {
      const res = await fetch(`https://api.unsplash.com/photos/random?count=10&client_id=${UNSPLASH_KEY}`);
      if (!res.ok) throw new Error("API Limit");
      const data = await res.json();
      setPulsePosts(data);
    } catch (err) {
      console.error("AJ Pulse Image System failed loading.", err);
    } finally {
      setLoadingPulse(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'pulse') {
      fetchPulseImages();
    }
  }, [activeTab]);

  // ==========================================
  // 💬 WECHAT MESSAGING SIMULATOR
  // ==========================================
  const selectContact = (contact: Contact) => {
    setActiveRecipient(contact);
    setChatMessages([
      {
        id: 'msg-init',
        sender: 'them',
        text: `Hey there, this is ${contact.name}! How can I help you regarding AJ Super Portal system setup?`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ]);
  };

  const handleSendMessage = () => {
    if (!messageInput.trim() || !activeRecipient) return;

    const newMsg: Message = {
      id: `user-msg-${Date.now()}`,
      sender: 'me',
      text: messageInput.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setChatMessages(prev => [...prev, newMsg]);
    setMessageInput('');
  };

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  // ==========================================
  // 💳 WALLET OPERATIONS (Transfer & Withdraw)
  // ==========================================
  const handleCoinsTransfer = () => {
    const amount = parseInt(transferAmount);
    if (!transferId.trim()) {
      alert("Please enter a valid Recipient ID.");
      return;
    }
    if (isNaN(amount) || amount <= 0) {
      alert("Please enter a valid amount of coins.");
      return;
    }
    if (amount > userCoins) {
      alert(`Insufficient Balance! You only have ${userCoins} coins.`);
      return;
    }

    setUserCoins(prev => prev - amount);
    alert(`✅ Coins Transferred Successfully!\n\nID: ${transferId}\nCoins Sent: ${amount} Coins\nRemaining Balance: ${userCoins - amount} Coins`);
    setTransferId('');
    setTransferAmount('');
  };

  const handleWithdrawRequest = () => {
    const amount = parseInt(withdrawCoins);
    if (isNaN(amount) || amount < 5000) {
      alert("Minimum withdrawal limit is 5,000 Coins!");
      return;
    }
    if (amount > userCoins) {
      alert(`Insufficient Balance! You only have ${userCoins} coins.`);
      return;
    }
    if (!payoutMethod) {
      alert("Please select your desired payment gateway.");
      return;
    }

    if (payoutMethod === 'easypaisa' || payoutMethod === 'jazzcash') {
      if (!mobilePhone || !mobileName) {
        alert("Please provide valid Mobile Number and Account Title.");
        return;
      }
    } else if (payoutMethod === 'visamaster') {
      if (!cardHolder || cardNumber.length < 16 || !cardExpiry || cardCvv.length < 3) {
        alert("Invalid Card Details. Please verify card fields.");
        return;
      }
    }

    const usdVal = (amount / 1000) * 2;
    setUserCoins(prev => prev - amount);
    
    alert(`Withdraw Request Submitted Successfully!\n---------------------------\nCoins Deducted: ${amount}\nUSD Equivalent: $${usdVal.toFixed(2)}\nGateway: ${payoutMethod.toUpperCase()}`);
    
    // Clear Form
    setWithdrawCoins('');
    setPayoutMethod('');
    setMobilePhone('');
    setMobileName('');
    setCardHolder('');
    setCardNumber('');
    setCardExpiry('');
    setCardCvv('');
  };

  // ==========================================
  // 🤖 AI ASSISTANT MODULE
  // ==========================================
  const handleAiQuery = () => {
    if (!aiInput.trim()) return;

    const userQuery = aiInput.trim();
    setAiChat(prev => [...prev, { sender: 'user', text: userQuery }]);
    setAiInput('');

    setTimeout(() => {
      let botResponse = "Understood, Ali! I am processing your development logs. Let me know if you want me to write new modules or test Firebase storage endpoints.";
      const lower = userQuery.toLowerCase();

      if (lower.includes('coin') || lower.includes('rate') || lower.includes('wallet') || lower.includes('withdraw')) {
        botResponse = "System Rates: 1000 Coins = $2. Minimum Withdrawal limit is 5000 Coins via EasyPaisa, JazzCash, or Visa/Mastercard.";
      } else if (lower.includes('support') || lower.includes('contact') || lower.includes('gmail') || lower.includes('mail')) {
        botResponse = `You can contact AJ Creator Studio via WhatsApp or write to our official mail: ${GMAIL_ID}.`;
      } else if (lower.includes('gift') || lower.includes('split')) {
        botResponse = "Gift rates are: Coffee (2,500), Pizza (5,000), Heart (10,000), SuperCar (25,000), and Private Jet (40,000). Split model is 60% Creator / 40% Admin.";
      } else if (lower.includes('news') || lower.includes('discover')) {
        botResponse = "AJ Discover News key is active, fetching content regarding: Artificial Intelligence, Future Tech, and Robotics.";
      }

      setAiChat(prev => [...prev, { sender: 'bot', text: botResponse }]);
    }, 750);
  };

  useEffect(() => {
    aiChatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [aiChat]);

  // ==========================================
  // 🎁 CREATOR GIFTING CONTROLLER (60/40 Split)
  // ==========================================
  const sendGift = (name: string, cost: number) => {
    if (userCoins < cost) {
      alert(`Insufficient Coins! You need ${cost} coins to send a ${name}.`);
      return;
    }

    setUserCoins(prev => prev - cost);
    const creatorShare = cost * 0.60;
    const adminShare = cost * 0.40;

    alert(`🎉 Gift Sent!\n\nYou gifted ${name} (${cost} Coins).\n\nSplit Allocation:\n👤 Creator (60%): +${creatorShare} Coins\n🛡️ Admin (Aap 40%): +${adminShare} Coins`);
  };

  return (
    <div className="bg-[#08080a] text-white min-h-screen pb-24 font-sans selection:bg-emerald-500 selection:text-black">
      
      {/* HEADER SECTION */}
      <header className="bg-[#0f0f15] border-b border-gray-900 sticky top-0 z-50 px-4 py-3 flex justify-between items-center">
        <span className="text-xl font-black tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-600">
          AJ SUPER PORTAL
        </span>
        <div className="bg-gray-950 border border-gray-800 rounded-full px-4 py-1 flex items-center gap-2">
          <span className="text-yellow-500 font-bold">🪙</span>
          <span className="font-bold text-yellow-400">{userCoins.toLocaleString()}</span>
          <span className="text-[10px] text-gray-400 uppercase tracking-wider">Coins</span>
        </div>
      </header>

      {/* MAIN CONTAINER */}
      <main className="max-w-md mx-auto px-4 mt-6">

        {/* ==================== TAB 1: TIKREELS ==================== */}
        {activeTab === 'tikreels' && (
          <section className="animate-fade-in">
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2 text-red-500">
              🎬 TikReels (Shorts)
            </h2>
            <div className="relative w-full aspect-[9/16] bg-black rounded-2xl overflow-hidden shadow-2xl border border-gray-900">
              <div id="tikreels-player-frame" className="w-full h-full"></div>
              
              {/* Sound Indicator Overlay */}
              <button 
                onClick={toggleSound} 
                className="absolute top-4 right-4 bg-black/60 p-3 rounded-full cursor-pointer z-10 hover:scale-105 transition active:scale-95"
              >
                {isMuted ? '🔇' : '🔊'}
              </button>
              
              <div className="absolute bottom-4 left-4 right-4 z-10 pointer-events-none">
                <p className="font-bold text-sm text-white drop-shadow-md">@viral_shorts_studio</p>
                <p className="text-xs text-gray-300 drop-shadow-md mt-1">Tap the speaker icon to toggle sound. Live video engine active.</p>
              </div>
            </div>
          </section>
        )}

        {/* ==================== TAB 2: AJ PULSE ==================== */}
        {activeTab === 'pulse' && (
          <section className="animate-fade-in">
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2 text-emerald-400">
              ✨ AJ Pulse (Lifestyle Feed)
            </h2>
            
            {loadingPulse ? (
              <div className="text-center py-20 text-gray-500">
                <div className="animate-spin text-2xl text-emerald-500 mb-2">🔄</div>
                <p>Loading curated lifestyle photos...</p>
              </div>
            ) : (
              <div className="space-y-6">
                {pulsePosts.map((post) => (
                  <div key={post.id} className="bg-[#0f0f15] border border-gray-900 rounded-2xl overflow-hidden shadow-lg hover:border-emerald-900/50 transition">
                    <div className="p-3 flex items-center gap-2 border-b border-gray-950">
                      <img src={post.user.profile_image.small} className="w-8 h-8 rounded-full border border-gray-800" alt="Avatar" />
                      <div>
                        <h4 className="text-xs font-bold text-gray-200">{post.user.name}</h4>
                        <p className="text-[10px] text-gray-500">{post.user.location || 'AJ Discover Network'}</p>
                      </div>
                    </div>
                    <img src={post.urls.regular} className="w-full aspect-[4/5] object-cover" alt="Post photo" />
                    <div className="p-3">
                      <p className="text-xs text-gray-400 leading-relaxed">
                        <span className="text-white font-semibold">Lifestyle Design:</span> {post.description || post.alt_description || 'Curated premium content for developer ecosystem.'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* ==================== TAB 3: WECHAT ==================== */}
        {activeTab === 'wechat' && (
          <section className="animate-fade-in">
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2 text-blue-400">
              💬 WeChat Messaging
            </h2>
            <div className="bg-[#0f0f15] border border-gray-900 rounded-2xl p-4 min-h-[450px] flex flex-col">
              
              {!activeRecipient ? (
                <div className="flex-1 flex flex-col">
                  <p className="text-xs text-gray-400 font-bold tracking-widest uppercase mb-3 border-b border-gray-900 pb-2">Active Contacts</p>
                  <div className="flex-1 space-y-2 overflow-y-auto max-h-[350px]">
                    {fallbackContacts.map(contact => (
                      <div 
                        key={contact.id} 
                        onClick={() => selectContact(contact)}
                        className="flex items-center gap-3 p-3 bg-gray-950 hover:bg-[#12121c] border border-gray-900 rounded-xl cursor-pointer transition"
                      >
                        <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-600 to-cyan-500 flex items-center justify-center font-bold text-sm text-white">
                          {contact.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 text-left">
                          <h4 className="text-xs font-bold text-white">{contact.name}</h4>
                          <p className="text-[10px] text-gray-500">Active - Tap to Chat</p>
                        </div>
                        <span className="text-gray-700 text-xs">➔</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex flex-col">
                  {/* Chatroom Header */}
                  <div className="flex justify-between items-center border-b border-gray-900 pb-3 mb-3">
                    <button onClick={() => setActiveRecipient(null)} className="text-gray-400 hover:text-white flex items-center gap-1 text-sm">
                      ⬅ Contacts
                    </button>
                    <span className="font-bold text-white text-sm">{activeRecipient.name}</span>
                    <div className="w-6"></div>
                  </div>

                  {/* Messages Feed */}
                  <div className="flex-1 space-y-3 overflow-y-auto max-h-[280px] min-h-[250px] p-2 bg-black/30 rounded-xl mb-3">
                    {chatMessages.map((msg) => (
                      <div key={msg.id} className={`flex items-start gap-2 ${msg.sender === 'me' ? 'justify-end' : 'justify-start'}`}>
                        {msg.sender === 'them' && (
                          <div className="w-6 h-6 rounded-full bg-blue-700 flex items-center justify-center font-bold text-[10px]">
                            {activeRecipient.name.charAt(0)}
                          </div>
                        )}
                        <div className={`px-3 py-1.5 rounded-xl text-xs max-w-[80%] ${
                          msg.sender === 'me' 
                            ? 'bg-blue-600 text-white rounded-tr-none' 
                            : 'bg-gray-900 border border-gray-850 text-gray-300 rounded-tl-none'
                        }`}>
                          {msg.text}
                        </div>
                      </div>
                    ))}
                    <div ref={chatEndRef} />
                  </div>

                  {/* Message Input Controls */}
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      value={messageInput}
                      onChange={(e) => setMessageInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                      placeholder="Type a message..." 
                      className="flex-1 bg-gray-950 border border-gray-800 text-sm text-white rounded-xl px-3 py-2 focus:outline-none focus:border-blue-500"
                    />
                    <button onClick={handleSendMessage} className="bg-blue-600 hover:bg-blue-500 px-4 py-2 rounded-xl transition text-sm font-bold">
                      Send
                    </button>
                  </div>
                </div>
              )}
            </div>
          </section>
        )}

        {/* ==================== TAB 4: WALLET ==================== */}
        {activeTab === 'wallet' && (
          <section className="animate-fade-in space-y-4">
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2 text-yellow-500">
              💳 Wallet & Earnings
            </h2>

            {/* Total Balance View */}
            <div className="bg-[#0f0f15] border border-gray-900 rounded-2xl p-5">
              <div className="bg-gradient-to-br from-gray-950 to-gray-900 p-4 rounded-xl border border-gray-800">
                <span className="text-xs text-gray-400 font-bold block uppercase tracking-wider">Your Balance</span>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-3xl font-extrabold text-yellow-400">{userCoins.toLocaleString()}</span>
                  <span className="text-sm font-semibold text-gray-300">Coins</span>
                </div>
                <div className="text-xs text-gray-500 mt-2 flex justify-between border-t border-gray-900 pt-2">
                  <span>Rate: 1000 Coins = $2</span>
                  <span>Min Withdrawal: 5000 Coins</span>
                </div>
              </div>
            </div>

            {/* SECTION 1: TRANSFER COINS TO ID */}
            <div className="bg-[#0f0f15] border border-gray-900 rounded-2xl p-5">
              <h3 className="text-sm font-bold text-gray-300 mb-3 uppercase tracking-wider flex items-center gap-2">
                ✉️ Transfer Coins to User
              </h3>
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-gray-400 block mb-1">Recipient User ID</label>
                  <input 
                    type="text" 
                    value={transferId}
                    onChange={(e) => setTransferId(e.target.value)}
                    placeholder="Enter Recipient's Unique ID" 
                    className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label class="text-xs text-gray-400 block mb-1">Amount to Transfer</label>
                  <input 
                    type="number" 
                    value={transferAmount}
                    onChange={(e) => setTransferAmount(e.target.value)}
                    placeholder="Coins Amount" 
                    className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
                <button onClick={handleCoinsTransfer} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs py-2.5 rounded-xl transition">
                  Send Transfer
                </button>
              </div>
            </div>

            {/* SECTION 2: WITHDRAWAL CONTROLS */}
            <div className="bg-[#0f0f15] border border-gray-900 rounded-2xl p-5">
              <h3 className="text-sm font-bold text-gray-300 mb-3 uppercase tracking-wider flex items-center gap-2">
                💸 Withdraw Cash
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="text-xs text-gray-400 block mb-1">Coins to withdraw</label>
                  <input 
                    type="number" 
                    value={withdrawCoins}
                    onChange={(e) => setWithdrawCoins(e.target.value)}
                    min="5000" 
                    placeholder="Minimum 5000" 
                    className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-yellow-500"
                  />
                </div>

                <div>
                  <label className="text-xs text-gray-400 block mb-1">Select Payout Channel</label>
                  <select 
                    value={payoutMethod}
                    onChange={(e) => setPayoutMethod(e.target.value)}
                    className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-yellow-500"
                  >
                    <option value="" disabled>-- Choose Gateway --</option>
                    <option value="easypaisa">EasyPaisa</option>
                    <option value="jazzcash">JazzCash</option>
                    <option value="visamaster">Visa / MasterCard</option>
                  </select>
                </div>

                {/* Dynamic input blocks based on payout channel selection */}
                {(payoutMethod === 'easypaisa' || payoutMethod === 'jazzcash') && (
                  <div className="bg-black/40 p-3 rounded-xl border border-gray-900 space-y-3">
                    <div>
                      <label className="text-[11px] text-gray-400 block mb-1">Mobile Account Number</label>
                      <input 
                        type="tel" 
                        value={mobilePhone}
                        onChange={(e) => setMobilePhone(e.target.value)}
                        placeholder="e.g. 03001234567" 
                        className="w-full bg-gray-950 border border-gray-850 rounded-lg px-3 py-2 text-xs text-white focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-gray-400 block mb-1">Account Holder Name (Title)</label>
                      <input 
                        type="text" 
                        value={mobileName}
                        onChange={(e) => setMobileName(e.target.value)}
                        placeholder="Full Account Name" 
                        className="w-full bg-gray-950 border border-gray-850 rounded-lg px-3 py-2 text-xs text-white focus:outline-none"
                      />
                    </div>
                  </div>
                )}

                {payoutMethod === 'visamaster' && (
                  <div className="bg-black/40 p-3 rounded-xl border border-gray-900 space-y-3">
                    <div>
                      <label className="text-[11px] text-gray-400 block mb-1">Cardholder Full Name</label>
                      <input 
                        type="text" 
                        value={cardHolder}
                        onChange={(e) => setCardHolder(e.target.value)}
                        placeholder="Name on card" 
                        className="w-full bg-gray-950 border border-gray-850 rounded-lg px-3 py-2 text-xs text-white focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-gray-400 block mb-1">Credit / Debit Card Number</label>
                      <input 
                        type="text" 
                        value={cardNumber}
                        onChange={(e) => setCardNumber(e.target.value)}
                        maxLength={16} 
                        placeholder="16-digit card number" 
                        className="w-full bg-gray-950 border border-gray-850 rounded-lg px-3 py-2 text-xs text-white focus:outline-none"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[11px] text-gray-400 block mb-1">Expiry Date</label>
                        <input 
                          type="text" 
                          value={cardExpiry}
                          onChange={(e) => setCardExpiry(e.target.value)}
                          maxLength={5} 
                          placeholder="MM/YY" 
                          className="w-full bg-gray-950 border border-gray-850 rounded-lg px-3 py-2 text-xs text-white focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] text-gray-400 block mb-1">CVV Code</label>
                        <input 
                          type="password" 
                          value={cardCvv}
                          onChange={(e) => setCardCvv(e.target.value)}
                          maxLength={3} 
                          placeholder="3 digits" 
                          className="w-full bg-gray-950 border border-gray-850 rounded-lg px-3 py-2 text-xs text-white focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>
                )}

                <button onClick={handleWithdrawRequest} className="w-full bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-400 hover:to-green-500 text-black font-extrabold text-sm py-3 rounded-xl shadow-lg transition">
                  SUBMIT CASH REQUEST
                </button>
              </div>
            </div>
          </section>
        )}

        {/* ==================== TAB 5: MORE OPTIONS & AI ==================== */}
        {activeTab === 'more' && (
          <section className="animate-fade-in space-y-4">
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2 text-gray-300">
              🛠️ Hub & Support Center
            </h2>

            {/* AI ASSISTANT MODULE */}
            <div className="bg-[#0f0f15] border border-gray-900 rounded-2xl p-5">
              <h3 className="text-sm font-bold text-gray-300 mb-2 uppercase tracking-widest flex items-center gap-2">
                🤖 AJ AI Assistant
              </h3>
              <p className="text-xs text-gray-500 mb-3">Ask questions about portal setups, keys, and rates.</p>
              
              <div className="bg-black/40 border border-gray-950 rounded-xl p-3 flex flex-col h-[220px]">
                <div className="flex-1 overflow-y-auto space-y-2 mb-2 p-1 text-xs">
                  {aiChat.map((chat, idx) => (
                    <div 
                      key={idx} 
                      className={`p-2 rounded-lg ${
                        chat.sender === 'bot' 
                          ? 'bg-gray-900/60 text-gray-300 border-l-2 border-teal-500' 
                          : 'bg-teal-950/40 text-white text-right border-r-2 border-teal-500'
                      }`}
                    >
                      <span className="font-bold">{chat.sender === 'bot' ? 'AJ Bot: ' : 'You: '}</span>
                      {chat.text}
                    </div>
                  ))}
                  <div ref={aiChatEndRef} />
                </div>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    value={aiInput}
                    onChange={(e) => setAiInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAiQuery()}
                    placeholder="Ask AJ Assistant..." 
                    className="flex-1 bg-gray-950 border border-gray-800 text-xs text-white rounded-lg px-2.5 py-2 focus:outline-none focus:border-teal-500"
                  />
                  <button onClick={handleAiQuery} className="bg-teal-600 hover:bg-teal-500 px-3 py-2 rounded-lg text-xs font-bold transition">
                    Ask
                  </button>
                </div>
              </div>
            </div>

            {/* GIFTS CORNER */}
            <div className="bg-[#0f0f15] border border-gray-900 rounded-2xl p-5">
              <h3 className="text-sm font-bold text-gray-300 mb-2 uppercase tracking-widest">
                🎁 Creator Gifts (60/40 Split)
              </h3>
              <p className="text-xs text-gray-500 mb-4">Send gifts to appreciated creators. 60% goes to the creator, 40% goes to AJ Admin (Aap).</p>
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => sendGift('Coffee', 2500)} className="bg-gray-950 hover:bg-gray-900 border border-gray-800 p-2.5 rounded-xl text-left transition flex justify-between items-center">
                  <div>
                    <p className="text-xs font-bold text-white">☕ Coffee</p>
                    <p className="text-[10px] text-yellow-500">2,500 Coins</p>
                  </div>
                </button>
                <button onClick={() => sendGift('Pizza', 5000)} className="bg-gray-950 hover:bg-gray-900 border border-gray-800 p-2.5 rounded-xl text-left transition flex justify-between items-center">
                  <div>
                    <p class="text-xs font-bold text-white">🍕 Pizza</p>
                    <p class="text-[10px] text-yellow-500">5,000 Coins</p>
                  </div>
                </button>
                <button onClick={() => sendGift('Heart', 10000)} className="bg-gray-950 hover:bg-gray-900 border border-gray-800 p-2.5 rounded-xl text-left transition flex justify-between items-center">
                  <div>
                    <p class="text-xs font-bold text-white">💖 Heart</p>
                    <p class="text-[10px] text-yellow-500">10,000 Coins</p>
                  </div>
                </button>
                <button onClick={() => sendGift('SuperCar', 25000)} className="bg-gray-950 hover:bg-gray-900 border border-gray-800 p-2.5 rounded-xl text-left transition flex justify-between items-center">
                  <div>
                    <p class="text-xs font-bold text-white">🏎️ SuperCar</p>
                    <p class="text-[10px] text-yellow-500">25,000 Coins</p>
                  </div>
                </button>
              </div>
            </div>

            {/* SUPPORT HANDLES */}
            <div className="bg-[#0f0f15] border border-gray-900 rounded-2xl p-5 space-y-3">
              <h3 className="text-sm font-bold text-gray-300 uppercase tracking-widest">
                📞 AJ Support & Contacts
              </h3>
              <p className="text-xs text-gray-400">If you experience any issues, contact our developer channels immediately:</p>
              
              <div className="space-y-2 pt-2 text-sm">
                {/* GMAIL HANDLER */}
                <a href={`mailto:${GMAIL_ID}`} className="flex items-center gap-3 p-3 bg-black/40 rounded-xl hover:bg-black/80 transition border border-gray-900">
                  <span className="text-red-500 text-lg">✉️</span>
                  <div className="flex flex-col text-left">
                    <span className="text-[10px] text-gray-500 font-bold uppercase">Official Gmail Support</span>
                    <span className="text-xs text-gray-200">{GMAIL_ID}</span>
                  </div>
                </a>

                {/* WHATSAPP */}
                <a href="https://wa.me/96878994093" target="_blank" rel="noreferrer" className="flex items-center gap-3 p-3 bg-black/40 rounded-xl hover:bg-black/80 transition border border-gray-900">
                  <span className="text-green-500 text-lg">💬</span>
                  <div className="flex flex-col text-left">
                    <span className="text-[10px] text-gray-500 font-bold uppercase">WhatsApp Link</span>
                    <span className="text-xs text-gray-200">Connect to Support Team</span>
                  </div>
                </a>

                {/* X */}
                <a href="https://x.com/Ali20352061" target="_blank" rel="noreferrer" className="flex items-center gap-3 p-3 bg-black/40 rounded-xl hover:bg-black/80 transition border border-gray-900">
                  <span className="text-white text-lg">🐦</span>
                  <div className="flex flex-col text-left">
                    <span className="text-[10px] text-gray-500 font-bold uppercase">X (Twitter Platform)</span>
                    <span className="text-xs text-gray-200">@Ali20352061</span>
                  </div>
                </a>
              </div>
            </div>
          </section>
        )}

      </main>

      {/* FOOTER NAVIGATION BAR */}
      <nav className="fixed bottom-0 left-0 right-0 bg-[#0c0c11] border-t border-gray-900 px-4 py-2 flex justify-around items-center z-50">
        <button 
          onClick={() => setActiveTab('tikreels')} 
          className={`flex flex-col items-center gap-1 transition ${activeTab === 'tikreels' ? 'text-[#00e676]' : 'text-gray-500 hover:text-white'}`}
        >
          <span>🎬</span>
          <span className="text-[10px]">TikReels</span>
        </button>
        <button 
          onClick={() => setActiveTab('pulse')} 
          className={`flex flex-col items-center gap-1 transition ${activeTab === 'pulse' ? 'text-[#00e676]' : 'text-gray-500 hover:text-white'}`}
        >
          <span>📸</span>
          <span className="text-[10px]">Pulse</span>
        </button>
        <button 
          onClick={() => setActiveTab('wechat')} 
          className={`flex flex-col items-center gap-1 transition ${activeTab === 'wechat' ? 'text-[#00e676]' : 'text-gray-500 hover:text-white'}`}
        >
          <span>💬</span>
          <span className="text-[10px]">WeChat</span>
        </button>
        <button 
          onClick={() => setActiveTab('wallet')} 
          className={`flex flex-col items-center gap-1 transition ${activeTab === 'wallet' ? 'text-[#00e676]' : 'text-gray-500 hover:text-white'}`}
        >
          <span>💳</span>
          <span className="text-[10px]">Wallet</span>
        </button>
        <button 
          onClick={() => setActiveTab('more')} 
          className={`flex flex-col items-center gap-1 transition ${activeTab === 'more' ? 'text-[#00e676]' : 'text-gray-500 hover:text-white'}`}
        >
          <span>⚙️</span>
          <span className="text-[10px]">Hub</span>
        </button>
      </nav>
    </div>
  );
}