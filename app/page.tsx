"use client";
import React, { useState, useEffect, useRef } from 'react';
import { auth, db, googleProvider } from '../firebaseConfig';
import { signInWithPopup, onAuthStateChanged, signOut } from 'firebase/auth';
import {
  doc, setDoc, onSnapshot, updateDoc, increment, collection,
  addDoc, getDoc, serverTimestamp, query, orderBy, limit, deleteDoc, getDocs
} from 'firebase/firestore';
import {
  MessageCircle, Trophy, Zap, Bot, LogOut, Globe, ChevronRight,
  Send, X, Download, Video, Users, Heart, MessageSquare, Camera,
  Settings, Edit3, Mail, DollarSign, Share2, Music, PlusSquare,
  MoreVertical, Search, Phone, Video as VideoIcon, ArrowLeft, Trash2,
  Gift, Bell, Radio, UserPlus, UserCheck, Grid, Film
} from 'lucide-react';

// ============================================================
// API KEYS & CONFIG
// ============================================================
const UNSPLASH_ACCESS_KEY    = "W4x76VphkyY9fzP3DbJPfXLhdD6x063gW--Voifn_UE";
const YOUTUBE_API_KEY        = "AIzaSyD9vR3hNLt7pBNlm6PMaZWbJOB9QGcrD1Y";
const GNEWS_API_KEY          = "bb753f67e7f9f155dfc8675b2abc4b60";
const NOWPAYMENTS_API_KEY    = "3THXNSZ-AYVMTP6-HQ9KGKK-9J6CQD7";
const CLOUDINARY_CLOUD_NAME  = "atm28akz";
const CLOUDINARY_UPLOAD_PRESET = "aj_portal";
const CEO_EMAIL              = "ajcreatorstudio.hq@gmail.com";
const CEO_WHATSAPP           = "https://wa.me/96878994093";

// ============================================================
// ECONOMY RATES  ← CONFIRMED FINAL
//   $1  = 100 AJ Coins
//   Min purchase  = $20  (= 2,000 Coins)
//   Min withdraw  = 12,500 Coins  (= $125)
//   Referral earn = 50 Coins
//   Gift split    = 60 % creator | 40 % admin profit
// ============================================================
const COIN_RATE      = 100;    // AJ Coins per $1 (purchase rate)
const CASH_RATE      = 1000;   // Coins per $1  (cashout/display rate — 12500 coins = $12.5)
const MIN_PURCHASE   = 20;     // minimum purchase in USD
const WITHDRAW_MIN   = 12500;  // minimum coins to withdraw (= $12.5 at CASH_RATE)
const REFERRAL_COINS = 50;     // coins awarded to referrer

// ============================================================
// GIFT ITEMS (60 % creator / 40 % admin)
// ============================================================
const giftItems = [
  { id:1, name:'Coffee',      cost:500,   icon:'☕'  },
  { id:2, name:'Pizza Party', cost:1000,  icon:'🍕'  },
  { id:3, name:'Mega Heart',  cost:2500,  icon:'❤️'  },
  { id:4, name:'Super Car',   cost:5000,  icon:'🏎️'  },
  { id:5, name:'Private Jet', cost:8000,  icon:'🛩️'  },
  { id:6, name:'AJ Mansion',  cost:10000, icon:'🏰'  },
];

// ============================================================
// CLOUDINARY UPLOADER
// ============================================================
const uploadToCloudinary = async (file: File): Promise<string> => {
  const fd = new FormData();
  fd.append('file', file);
  fd.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
  try {
    const res  = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
      { method: 'POST', body: fd }
    );
    const data = await res.json();
    return data.secure_url || "";
  } catch { return ""; }
};

// ============================================================
// COMPONENT
// ============================================================
export default function AJSuperPortal() {

  // ── SCREENS ─────────────────────────────────────────────────
  const [screen,       setScreen]       = useState('splash');
  const [walletTab,    setWalletTab]    = useState('main');
  const [socialScreen, setSocialScreen] = useState('hub');
  const [selectedGame, setSelectedGame] = useState<string|null>(null);

  // ── AUTH ────────────────────────────────────────────────────
  const [user,     setUser]     = useState<any>(null);
  const [balance,  setBalance]  = useState(0);
  const [botTier,  setBotTier]  = useState('none');
  const [invested, setInvested] = useState(0);
  const [loading,  setLoading]  = useState(0);

  // ── SOCIAL PROFILE ──────────────────────────────────────────
  const [hasSocialProfile, setHasSocialProfile] = useState(false);
  const [username,   setUsername]   = useState('');
  const [bio,        setBio]        = useState('');
  const [tempPhoto,  setTempPhoto]  = useState('');
  const [pendingMode,setPendingMode]= useState('');

  // ── CONTENT ─────────────────────────────────────────────────
  const [pixaData,     setPixaData]     = useState<any[]>([]);
  const [pixaVideos,   setPixaVideos]   = useState<any[]>([]);
  const [newsData,     setNewsData]     = useState<any[]>([]);
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [userPosts,    setUserPosts]    = useState<any[]>([]);
  const [postText,     setPostText]     = useState('');
  const [newMessage,   setNewMessage]   = useState('');
  const [activeContact,setActiveContact]= useState<string|null>(null);

  // ── INTERACTIONS ────────────────────────────────────────────
  const [likedPosts,    setLikedPosts]    = useState<any>({});
  const [activeMenuId,  setActiveMenuId]  = useState<string|null>(null);
  const [commentPostId, setCommentPostId] = useState<string|null>(null);
  const [postComments,  setPostComments]  = useState<any[]>([]);
  const [newComment,    setNewComment]    = useState('');
  const [copied,        setCopied]        = useState(false);

  // ── AI ───────────────────────────────────────────────────────
  const [visualProfit, setVisualProfit] = useState(0);
  const [tradeLogs,    setTradeLogs]    = useState([
    "Initialising Neural Link...",
    "Analysing Market Volatility...",
    "Connecting to AJ liquidity pool..."
  ]);
  const [botOpen,     setBotOpen]     = useState(false);
  const [botMessages, setBotMessages] = useState([{
    from:'bot',
    text:`Hi! I am AJ AI Assistant 🤖\nAsk me about Coins, Referral, Withdrawal, or Go Live.`
  }]);
  const [botInput, setBotInput] = useState('');

  // ── WALLET INPUTS ───────────────────────────────────────────
  const [purchaseAmount, setPurchaseAmount] = useState(20);
  const [purchaseMethod, setPurchaseMethod] = useState('Binance (TRC20)');
  const [purchaseTxId,   setPurchaseTxId]   = useState('');
  const [transferId,     setTransferId]     = useState('');
  const [transferAmount, setTransferAmount] = useState(0);
  const [payoutMethod,   setPayoutMethod]   = useState('Binance Pay (USDT)');
  const [payoutId,       setPayoutId]       = useState('');
  const [referralCode,   setReferralCode]   = useState('');

  // ── NOTIFICATIONS ───────────────────────────────────────────
  const [notifications, setNotifications] = useState<any[]>([]);
  const [notifOpen,     setNotifOpen]     = useState(false);
  const [unreadCount,   setUnreadCount]   = useState(0);

  // ── GO LIVE (real camera) ───────────────────────────────────
  const [liveActive,  setLiveActive]  = useState(false);
  const [liveRoomId,  setLiveRoomId]  = useState('');
  const [cameraReady, setCameraReady] = useState(false);
  const liveVideoRef  = useRef<HTMLVideoElement>(null);
  const liveStreamRef = useRef<MediaStream|null>(null);

  // ── WECHAT CONTACTS ─────────────────────────────────────────
  const [wechatContacts, setWechatContacts] = useState<string[]>([
    'AJ Global Support','Family WeChat Hub','CEO VIP Elite','Crypto News Daily'
  ]);
  const [addContactOpen, setAddContactOpen] = useState(false);
  const [newContact,     setNewContact]     = useState('');

  // ── TIKREELS ────────────────────────────────────────────────
  const [tiktabMode,     setTiktabMode]     = useState<'feed'|'create'|'profile'>('feed');
  const [tiktokPostText, setTiktokPostText] = useState('');
  const [tiktokPostImg,  setTiktokPostImg]  = useState('');

  // ── USER PROFILE (viewer) ───────────────────────────────────
  const [viewingUid,    setViewingUid]    = useState<string|null>(null);
  const [viewProfile,   setViewProfile]   = useState<any>(null);
  const [profilePosts,  setProfilePosts]  = useState<any[]>([]);
  const [profileVideos, setProfileVideos] = useState<any[]>([]);
  const [followers,     setFollowers]     = useState(0);
  const [following,     setFollowing]     = useState(0);
  const [isFollowing,   setIsFollowing]   = useState(false);

  // ── REFS ─────────────────────────────────────────────────────
  const fileInputRef  = useRef<HTMLInputElement>(null);
  const tiktokFileRef = useRef<HTMLInputElement>(null);
  const searchRef     = useRef<HTMLInputElement>(null);

  // ── COMPUTED ─────────────────────────────────────────────────
  const totalCoins     = balance + visualProfit;
  const displayBalance = totalCoins.toFixed(2);
  const displayUsdt    = (totalCoins / CASH_RATE).toFixed(2);

  // ==========================================================
  // FETCH APIs
  // ==========================================================
  const fetchSocialAPIs = async () => {
    try {
      const pRes  = await fetch(`https://api.unsplash.com/photos/random?client_id=${UNSPLASH_ACCESS_KEY}&query=lifestyle,luxury&count=20`);
      const pData = await pRes.json();
      setPixaData(Array.isArray(pData) ? pData : []);

      const yRes  = await fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=15&q=shorts+viral&type=video&videoDuration=short&key=${YOUTUBE_API_KEY}`);
      const yData = await yRes.json();
      const items = yData.items || [];
      setPixaVideos(items.map((item:any) => ({
        id:       item.id.videoId,
        user:     item.snippet.channelTitle,
        title:    item.snippet.title,
        thumb:    item.snippet?.thumbnails?.high?.url || '',
        embedUrl: `https://www.youtube.com/embed/${item.id.videoId}?autoplay=1&mute=0&loop=1&playlist=${item.id.videoId}&controls=0&rel=0&playsinline=1`
      })));

      const nRes  = await fetch(`https://gnews.io/api/v4/search?q=AI+crypto+technology&token=${GNEWS_API_KEY}&lang=en&max=15`);
      const nData = await nRes.json();
      setNewsData(nData.articles?.slice(0,15) || []);
    } catch(e) { console.log("API Error", e); }
  };

  // ==========================================================
  // FIREBASE LISTENERS
  // ==========================================================
  useEffect(() => {
    if (socialScreen==='chat' && activeContact) {
      const q = query(collection(db,"global_chat"), orderBy("createdAt","desc"), limit(40));
      return onSnapshot(q, snap => setChatMessages(snap.docs.map(d=>({id:d.id,...d.data()})).reverse()));
    }
    if (socialScreen==='pulse' || socialScreen==='tikreels') {
      const q = query(collection(db,"user_posts"), orderBy("createdAt","desc"), limit(20));
      return onSnapshot(q, snap => setUserPosts(snap.docs.map(d=>({id:d.id,...d.data()}))));
    }
    if (commentPostId && !commentPostId.startsWith('gift_')) {
      const q = query(collection(db,"user_posts",commentPostId,"comments"), orderBy("createdAt","asc"));
      return onSnapshot(q, snap => setPostComments(snap.docs.map(d=>({id:d.id,...d.data()}))));
    }
  }, [socialScreen, activeContact, commentPostId]);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db,"notifications"), orderBy("date","desc"), limit(20));
    return onSnapshot(q, snap => {
      const items = snap.docs.map(d=>({id:d.id,...d.data()}));
      setNotifications(items);
      setUnreadCount(items.length);
    });
  }, [user]);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (cu) => {
      if (cu) {
        setUser(cu);
        const ref  = doc(db,"users",cu.uid);
        const snap = await getDoc(ref);
        if (snap.exists()) {
          const d = snap.data();
          setHasSocialProfile(d.hasSocialProfile||false);
          setUsername(d.username||'');
          setBio(d.bio||'');
          setTempPhoto(d.photo||cu.photoURL||'');
        } else {
          await setDoc(ref, {
            name:cu.displayName, email:cu.email,
            balance:500, botTier:'none', invested:0,
            uid:cu.uid, lastSync:serverTimestamp(),
            hasSocialProfile:false, photo:cu.photoURL||'',
            followers:0, following:0
          });
        }
        onSnapshot(ref, s => {
          if (s.exists()) {
            setBalance(s.data().balance||0);
            setBotTier(s.data().botTier||'none');
            setInvested(s.data().invested||0);
          }
        });
        setScreen('hub');
      } else { setUser(null); setScreen('auth'); }
    });
    return () => unsub();
  }, []);

  // AI profit ticker
  useEffect(() => {
    if (!user || botTier==='none' || invested<=0) return;
    const rate   = botTier==='vvip' ? 0.05 : 0.02;
    const perSec = (invested * rate) / 86400;
    const iv = setInterval(() => setVisualProfit(p => p+perSec), 1000);
    return () => clearInterval(iv);
  }, [user, botTier, invested]);

  // Splash timer
  useEffect(() => {
    if (screen==='splash') {
      const iv = setInterval(() => setLoading(p => Math.min(100,p+10)), 50);
      const tm = setTimeout(() => setScreen('hub'), 2000);
      return () => { clearInterval(iv); clearTimeout(tm); };
    }
  }, [screen]);

  // ==========================================================
  // GO LIVE — REAL CAMERA
  // ==========================================================
  const startLive = async () => {
    if (!user) return;
    const roomId = `live_${user.uid}_${Date.now()}`;
    setLiveRoomId(roomId);
    setLiveActive(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video:true, audio:true });
      liveStreamRef.current = stream;
      setCameraReady(true);
      if (liveVideoRef.current) {
        liveVideoRef.current.srcObject = stream;
        liveVideoRef.current.play();
      }
    } catch {
      alert("Camera permission denied. Please allow camera access.");
      setCameraReady(false);
    }
  };

  const stopLive = () => {
    liveStreamRef.current?.getTracks().forEach(t => t.stop());
    liveStreamRef.current = null;
    setCameraReady(false);
    setLiveActive(false);
  };

  // ==========================================================
  // GIFTING — 60 % creator | 40 % admin profit
  // ==========================================================
  const sendGift = async (creatorId:string, gift:{name:string,cost:number,icon:string}) => {
    if (!user) return;
    if (balance < gift.cost) {
      if (confirm(`Insufficient Balance! Need ${gift.cost} 🪙\nGo to Wallet → Purchase to recharge?`)) {
        setScreen('wallet'); setWalletTab('purchase');
      }
      return;
    }
    // Deduct sender
    await updateDoc(doc(db,"users",user.uid), { balance: increment(-gift.cost) });
    // 60 % to creator
    const creatorShare = gift.cost * 0.60;
    const adminShare   = gift.cost * 0.40;
    await updateDoc(doc(db,"users",creatorId), { balance: increment(creatorShare) });
    // 40 % logged to admin ledger
    await addDoc(collection(db,"admin_ledger"), {
      giftName:gift.name, totalCost:gift.cost, adminShare,
      senderUid:user.uid, creatorUid:creatorId, date:serverTimestamp()
    });
    // Notify creator
    await addDoc(collection(db,"notifications"), {
      title:`Gift Received! ${gift.icon}`,
      message:`You received ${gift.icon} ${gift.name} from @${username||'Anonymous'}. +${creatorShare} Coins (60% yours)`,
      date:serverTimestamp()
    });
    alert(`${gift.icon} ${gift.name} sent! Creator received ${creatorShare} Coins (60%).`);
  };

  // ==========================================================
  // FOLLOW SYSTEM
  // ==========================================================
  const handleFollow = async (targetUid:string) => {
    if (!user) return;
    const followRef   = doc(db,"users",user.uid,"following",targetUid);
    const followerRef = doc(db,"users",targetUid,"followers",user.uid);
    if (isFollowing) {
      await deleteDoc(followRef);
      await deleteDoc(followerRef);
      await updateDoc(doc(db,"users",user.uid),    { following: increment(-1) });
      await updateDoc(doc(db,"users",targetUid),   { followers: increment(-1) });
      setIsFollowing(false); setFollowers(f => f-1);
    } else {
      await setDoc(followRef,   { uid:targetUid, date:serverTimestamp() });
      await setDoc(followerRef, { uid:user.uid,  date:serverTimestamp() });
      await updateDoc(doc(db,"users",user.uid),    { following: increment(1) });
      await updateDoc(doc(db,"users",targetUid),   { followers: increment(1) });
      setIsFollowing(true); setFollowers(f => f+1);
    }
  };

  // Open someone's profile
  const openProfile = async (uid:string) => {
    setViewingUid(uid);
    const snap = await getDoc(doc(db,"users",uid));
    if (snap.exists()) setViewProfile(snap.data());
    const pq = query(collection(db,"user_posts"), orderBy("createdAt","desc"), limit(30));
    const ps = await getDocs(pq);
    const all = ps.docs.map(d => ({id:d.id,...d.data() as any}));
    setProfilePosts(all.filter((p:any)  => p.uid===uid && !p.isVideo));
    setProfileVideos(all.filter((p:any) => p.uid===uid && p.isVideo));
    const fSnap  = await getDocs(collection(db,"users",uid,"followers"));
    const foSnap = await getDocs(collection(db,"users",uid,"following"));
    setFollowers(fSnap.size); setFollowing(foSnap.size);
    if (user) {
      const myF = await getDoc(doc(db,"users",user.uid,"following",uid));
      setIsFollowing(myF.exists());
    }
    setSocialScreen('profile');
  };

  // ==========================================================
  // WECHAT CONTACTS
  // ==========================================================
  const handleContactsSync = async () => {
    if ((navigator as any).contacts) {
      try {
        const cts = await (navigator as any).contacts.select(['name','tel'], { multiple:true });
        if (cts.length>0) {
          const names = cts.map((c:any) => c.name?.[0]||'Unknown').filter(Boolean);
          setWechatContacts(prev => [...prev, ...names.filter((n:string) => !prev.includes(n))]);
          alert(`✅ ${cts.length} contact(s) synced!`);
        }
      } catch { setAddContactOpen(true); }
    } else { setAddContactOpen(true); }
  };

  const addManualContact = () => {
    if (!newContact.trim()) return;
    setWechatContacts(prev => [...prev, newContact.trim()]);
    setNewContact(''); setAddContactOpen(false);
  };

  // ==========================================================
  // TIKREELS POST
  // ==========================================================
  const handleTiktokPost = async () => {
    if (!tiktokPostText.trim() && !tiktokPostImg) return alert("Add caption or image!");
    await addDoc(collection(db,"user_posts"), {
      text:tiktokPostText, image:tiktokPostImg, uid:user!.uid,
      username:username||"AJ_Member", photo:user!.photoURL||'',
      likes:0, isVideo:true, createdAt:serverTimestamp()
    });
    await updateDoc(doc(db,"users",user!.uid), { balance: increment(2.5) });
    setTiktokPostText(''); setTiktokPostImg('');
    setTiktabMode('feed');
    alert("🎬 Video post published! +2.5 Coins");
  };

  // ==========================================================
  // GENERAL HANDLERS
  // ==========================================================
  const navigateWithAd = (to:string) => {
    if (typeof window!=='undefined' && (window as any).AJ_SDK) (window as any).AJ_SDK.showAd();
    if (to==='social')       { fetchSocialAPIs(); setScreen('social'); setSocialScreen('hub'); }
    else if (to==='wallet')  { setScreen('wallet'); setWalletTab('main'); }
    else                     setScreen(to);
  };

  const enterSocialMode = (mode:string) => {
    setPendingMode(mode);
    if (!user || !hasSocialProfile) setSocialScreen('setup');
    else setSocialScreen(mode);
  };

  const copyToClipboard = (id:string) => {
    navigator.clipboard.writeText(id);
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  };

  const handleImageClick  = () => fileInputRef.current?.click();
  const handleTiktokImage = () => tiktokFileRef.current?.click();

  const handleFileChange = async (e:any) => {
    const file = e.target.files?.[0]; if (!file) return;
    const url = await uploadToCloudinary(file);
    setTempPhoto(url || URL.createObjectURL(file));
  };

  const handleTiktokFileChange = async (e:any) => {
    const file = e.target.files?.[0]; if (!file) return;
    const url = await uploadToCloudinary(file);
    setTiktokPostImg(url || URL.createObjectURL(file));
  };

  const handleGoogleLogin = async () => {
    googleProvider.setCustomParameters({ prompt:'select_account' });
    await signInWithPopup(auth, googleProvider);
  };

  const handleSignOut = async () => {
    await signOut(auth); setSocialScreen('hub'); setScreen('auth');
  };

  const handleCreateProfile = async () => {
    if (username.length<3) return alert("Username too short!");
    await updateDoc(doc(db,"users",user!.uid), {
      username: username.toLowerCase().trim(), bio,
      photo: tempPhoto||user!.photoURL||"/logo.png", hasSocialProfile:true
    });
    setHasSocialProfile(true); setSocialScreen('hub'); alert("🚀 Profile Active!");
  };

  const sendChatMessage = async () => {
    if (!newMessage.trim() || !user) return;
    await addDoc(collection(db,"global_chat"), {
      text:newMessage, uid:user.uid,
      username:username||"AJ_Member", photo:tempPhoto||user.photoURL||'',
      createdAt:serverTimestamp()
    });
    setNewMessage('');
  };

  const handleCreatePost = async () => {
    if (!postText.trim() && !tempPhoto) return alert("Empty Post!");
    await addDoc(collection(db,"user_posts"), {
      text:postText, image:tempPhoto, uid:user!.uid,
      username:username||"AJ_Member", photo:user!.photoURL||'',
      likes:0, isVideo:false, createdAt:serverTimestamp()
    });
    await updateDoc(doc(db,"users",user!.uid), { balance: increment(2.5) });
    setPostText(''); setTempPhoto(''); alert("🚀 Post Published! +2.5 Coins");
  };

  const submitComment = async () => {
    if (!newComment.trim() || !commentPostId) return;
    await addDoc(collection(db,"user_posts",commentPostId,"comments"), {
      text:newComment, username:username||"AJ_Member",
      photo:user?.photoURL||'', createdAt:serverTimestamp()
    });
    setNewComment('');
  };

  const handleDeletePost = async (id:string) => {
    if (confirm("Delete permanently?")) {
      await deleteDoc(doc(db,"user_posts",id)); setActiveMenuId(null);
    }
  };

  const handleLike  = (id:string) => setLikedPosts((p:any) => ({...p,[id]:!p[id]}));
  const handleShare = (msg:string) => {
    if (navigator.share) navigator.share({ title:'AJ Portal', text:msg });
    else alert("Link Copied!");
  };

  const activateBot = async (tier:string, cost:number) => {
    if (balance<cost) return alert("Insufficient Balance!");
    await updateDoc(doc(db,"users",user!.uid), {
      balance: increment(-cost), botTier:tier, invested:cost, lastSync:serverTimestamp()
    });
    alert(`${tier.toUpperCase()} BOT ACTIVATED!`);
  };

  // ── WALLET ACTIONS ──────────────────────────────────────────
  const handlePurchase = async () => {
    if (purchaseAmount < MIN_PURCHASE)
      return alert(`Minimum purchase is $${MIN_PURCHASE} (= ${MIN_PURCHASE*COIN_RATE} Coins)`);
    if (purchaseMethod==='Binance (TRC20)') {
      try {
        const res  = await fetch('https://api.nowpayments.io/v1/invoice', {
          method:'POST',
          headers:{ 'x-api-key':NOWPAYMENTS_API_KEY, 'Content-Type':'application/json' },
          body: JSON.stringify({
            price_amount:purchaseAmount, price_currency:"usd",
            pay_currency:"usdttrc20", order_id:`AJ_${Date.now()}`
          })
        });
        const data = await res.json();
        if (data.invoice_url) window.open(data.invoice_url,'_blank');
      } catch { alert("Payment Error!"); }
    } else {
      if (!purchaseTxId) return alert("Enter Airtm TX ID.");
      await addDoc(collection(db,"manual_deposits"), {
        uid:user!.uid, email:user!.email, amount:purchaseAmount,
        method:"Airtm", txId:purchaseTxId, status:"pending", date:serverTimestamp()
      });
      await addDoc(collection(db,"notifications"), {
        title:"Deposit Pending",
        message:`$${purchaseAmount} deposit via Airtm awaiting approval.`,
        date:serverTimestamp()
      });
      alert("✅ Request Sent!"); setWalletTab('main');
    }
  };

  const handleTransfer = async () => {
    if (transferAmount<=0 || !transferId.trim()) return alert("Fill all fields!");
    if (balance<transferAmount) return alert("Insufficient balance!");
    if (transferId===user!.uid) return alert("Cannot transfer to yourself.");
    const rSnap = await getDoc(doc(db,"users",transferId.trim()));
    if (!rSnap.exists()) return alert("Recipient not found!");
    await updateDoc(doc(db,"users",user!.uid),       { balance: increment(-transferAmount) });
    await updateDoc(doc(db,"users",transferId.trim()),{ balance: increment(transferAmount) });
    await addDoc(collection(db,"notifications"), {
      title:"Transfer Sent",
      message:`Sent ${transferAmount} Coins to ID: ${transferId}`,
      date:serverTimestamp()
    });
    alert("✅ Transfer successful!"); setTransferAmount(0); setTransferId(''); setWalletTab('main');
  };

  const handleWithdraw = async () => {
    if (balance < WITHDRAW_MIN)
      return alert(`Minimum withdrawal is ${WITHDRAW_MIN} Coins (${WITHDRAW_MIN/CASH_RATE})`);
    if (!payoutId.trim()) return alert("Enter payout address.");
    const usdVal = balance / CASH_RATE;
    await updateDoc(doc(db,"users",user!.uid), { balance:0 });
    await addDoc(collection(db,"manual_withdrawals"), {
      uid:user!.uid, email:user!.email, coins:balance, amountUsd:usdVal,
      method:payoutMethod, payoutAddress:payoutId, status:"pending", date:serverTimestamp()
    });
    await addDoc(collection(db,"notifications"), {
      title:"Withdrawal Requested",
      message:`${balance} Coins ($${usdVal.toFixed(2)}) submitted for review.`,
      date:serverTimestamp()
    });
    alert("🚀 Withdrawal request submitted!"); setPayoutId(''); setWalletTab('main');
  };

  const handleApplyReferral = async () => {
    if (!referralCode.trim()) return alert("Enter referral code.");
    const rSnap = await getDoc(doc(db,"users",referralCode.trim()));
    if (!rSnap.exists()) return alert("Referral Code not found.");
    await updateDoc(doc(db,"users",referralCode.trim()), { balance: increment(REFERRAL_COINS) });
    await addDoc(collection(db,"notifications"), {
      title:"Referral Claimed",
      message:`+${REFERRAL_COINS} Coins reward applied!`,
      date:serverTimestamp()
    });
    alert(`Referral Applied! Referrer received ${REFERRAL_COINS} Coins.`);
    setReferralCode('');
  };

  // AI assistant
  const handleBotSend = () => {
    if (!botInput.trim()) return;
    const q = botInput.toLowerCase();
    let reply = '';
    if (q.includes('coin')||q.includes('balance'))
      reply = `🪙 Rate: $1 = ${COIN_RATE} AJ Coins.\nEarn by posting (+2.5), referrals (+${REFERRAL_COINS}), AI Bot profits.`;
    else if (q.includes('referral')||q.includes('refer'))
      reply = `👥 Refer & Earn: Share your User ID.\nWhen someone enters it → You get +${REFERRAL_COINS} Coins!`;
    else if (q.includes('withdraw')||q.includes('cashout'))
      reply = `💸 Min Withdrawal: ${WITHDRAW_MIN} Coins (${WITHDRAW_MIN/CASH_RATE}).\nWallet → Withdraw → Enter Binance Pay / Airtm address.`;
    else if (q.includes('purchase')||q.includes('buy'))
      reply = `💰 Min Purchase: $${MIN_PURCHASE} = ${MIN_PURCHASE*COIN_RATE} Coins.\nRate: $1 = ${COIN_RATE} AJ Coins.`;
    else if (q.includes('live'))
      reply = '📡 Go Live: Social Hub → GO LIVE button. Viewers send you gifts — you keep 60%!';
    else if (q.includes('gift'))
      reply = '🎁 Gifts:\n☕ Coffee 500🪙\n🍕 Pizza 1000🪙\n❤️ Heart 2500🪙\n🏎️ Car 5000🪙\n🛩️ Jet 8000🪙\n🏰 Mansion 10000🪙';
    else
      reply = `I'm not sure. Contact CEO directly:\n👇`;
    setBotMessages(m => [...m, {from:'user',text:botInput}, {from:'bot',text:reply}]);
    setBotInput('');
  };

  // ==========================================================
  // SPLASH
  // ==========================================================
  if (screen==='splash') return (
    <main className="h-screen bg-black flex flex-col items-center justify-center text-white text-center">
      <div className="w-40 h-40 bg-black rounded-full border-4 border-cyan-500 shadow-[0_0_60px_#06b6d4] overflow-hidden mb-8">
        <img src="/logo.png" className="w-full h-full object-cover" alt="AJ"/>
      </div>
      <h1 className="text-3xl font-black tracking-widest uppercase animate-pulse">AJ PORTAL</h1>
    </main>
  );

  // ==========================================================
  // AUTH
  // ==========================================================
  if (screen==='auth') return (
    <main className="min-h-screen bg-black flex flex-col items-center justify-center p-6 text-white text-center">
      <div className="w-full max-w-sm bg-white/[0.03] border border-white/10 p-12 rounded-[3rem] shadow-2xl">
        <h2 className="text-6xl font-black mb-10 italic text-cyan-400 uppercase">AJ <span className="text-white">ID</span></h2>
        <button onClick={handleGoogleLogin} className="w-full py-5 bg-white text-black font-black text-xl rounded-2xl active:scale-95 transition-all shadow-xl">
          CONTINUE WITH GOOGLE
        </button>
        <p className="mt-8 text-yellow-500 font-bold tracking-widest">+500 COINS WELCOME BONUS</p>
      </div>
    </main>
  );

  // ==========================================================
  // MAIN APP
  // ==========================================================
  return (
    <main className="min-h-screen bg-[#020617] text-white font-sans overflow-x-hidden relative">
      <input type="file" ref={fileInputRef}  onChange={handleFileChange}       accept="image/*"        className="hidden"/>
      <input type="file" ref={tiktokFileRef} onChange={handleTiktokFileChange} accept="image/*,video/*" className="hidden"/>

      {/* ── HEADER ──────────────────────────────────────────── */}
      <header className="fixed top-0 w-full p-4 flex justify-between items-center z-[100] bg-black/80 backdrop-blur-xl border-b border-white/5 shadow-2xl">
        <div className="text-xl font-black italic text-cyan-400">AJ STUDIO</div>
        <div className="flex items-center gap-3">
          {/* BELL */}
          <div className="relative cursor-pointer" onClick={() => { setNotifOpen(!notifOpen); setUnreadCount(0); }}>
            <Bell size={22} className="text-white hover:text-yellow-400 transition-all"/>
            {unreadCount>0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-[8px] font-black text-white flex items-center justify-center border border-black animate-pulse">
                {unreadCount>9?'9+':unreadCount}
              </span>
            )}
          </div>
          {/* BALANCE */}
          <div onClick={() => navigateWithAd('wallet')} className="flex items-center gap-3 bg-white/5 px-4 py-2 rounded-full border border-white/10 cursor-pointer hover:bg-white/10 transition-all">
            <span className="text-xs font-black text-yellow-500">{displayBalance} 🪙</span>
            <span className="text-[10px] text-green-400 font-black">${displayUsdt}</span>
            {user && <img src={tempPhoto||user.photoURL||'/logo.png'} className="w-8 h-8 rounded-full border border-cyan-500 shadow-[0_0_10px_#06b6d4]"/>}
          </div>
          <button onClick={() => signOut(auth)} className="p-2 bg-red-500/10 text-red-500 font-bold text-[8px] rounded-full uppercase">EXIT</button>
        </div>
      </header>

      {/* NOTIF PANEL */}
      {notifOpen && (
        <div className="fixed top-16 right-4 w-80 max-h-96 overflow-y-auto bg-slate-900 border border-white/10 rounded-3xl p-4 z-[200] shadow-2xl backdrop-blur-xl">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-black text-sm text-cyan-400 uppercase tracking-widest">Notifications</h3>
            <X size={16} className="text-gray-500 cursor-pointer" onClick={() => setNotifOpen(false)}/>
          </div>
          {notifications.length===0
            ? <p className="text-gray-500 text-xs text-center py-4">No notifications.</p>
            : notifications.map((n:any) => (
              <div key={n.id} className="bg-white/5 border border-white/10 p-3 rounded-2xl mb-3">
                <p className="text-[10px] font-black text-cyan-400 uppercase">{n.title}</p>
                <p className="text-[9px] text-gray-400 mt-1">{n.message}</p>
              </div>
            ))
          }
        </div>
      )}

      {/* ── HOME HUB ─────────────────────────────────────────── */}
      <section className="min-h-screen flex flex-col items-center justify-center p-4 pt-24 relative">
        <h1 className="text-4xl md:text-8xl font-black text-center mb-12 uppercase drop-shadow-[0_0_20px_#22d3ee]">AJ SUPER PORTAL</h1>
        <div className="grid grid-cols-2 gap-4 md:gap-16 w-full max-w-4xl relative z-30">
          {[
            { label:'Gaming', icon:<Trophy className="text-cyan-400 w-10 h-10 md:w-20 md:h-20 mb-2"/>, sc:'arcade', hover:'hover:border-cyan-400' },
            { label:'Social', icon:<Zap     className="text-pink-500 w-10 h-10 md:w-20 md:h-20 mb-2"/>, sc:'social', hover:'hover:border-pink-500' },
            { label:'Wallet', icon:<img src="/gold.jpg" className="w-14 h-14 mb-2 rounded-full border-2 border-yellow-500 shadow-md"/>, sc:'wallet', hover:'hover:border-yellow-500' },
            { label:'AJ AI',  icon:<Bot   className="text-green-400 w-10 h-10 md:w-20 md:h-20 mb-2"/>, sc:'ai',     hover:'hover:border-green-500' },
          ].map(m => (
            <div key={m.label} onClick={() => navigateWithAd(m.sc)}
              className={`bg-white/5 border border-white/10 rounded-3xl h-48 md:h-80 flex flex-col items-center justify-center cursor-pointer shadow-xl active:scale-95 transition-all ${m.hover} relative z-30`}>
              {m.icon}
              <span className="font-black text-xs md:text-3xl uppercase tracking-tighter">{m.label}</span>
            </div>
          ))}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0">
            <div className="w-24 h-24 md:w-96 md:h-96 bg-black border-[15px] border-cyan-500 rounded-full flex items-center justify-center shadow-[0_0_100px_#06b6d4] overflow-hidden">
              <img src="/logo.png" className="w-full h-full object-cover opacity-60 animate-pulse"/>
            </div>
          </div>
        </div>
      </section>

      {/* ── ARCADE ───────────────────────────────────────────── */}
      {screen==='arcade' && (
        <div className="fixed inset-0 z-[300] bg-black flex flex-col h-screen overflow-hidden">
          {!selectedGame ? (
            <div className="p-8 overflow-y-auto flex-1">
              <button onClick={() => { setScreen('hub'); setSelectedGame(null); }}
                className="text-cyan-400 font-bold mb-10 tracking-widest uppercase flex items-center gap-2">
                <ArrowLeft size={20}/> BACK
              </button>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-6 max-w-5xl mx-auto pb-20">
                {['Rider King','Pulse Racer','Subsea Surge','Neon Strike','Volcano Escape'].map(game => (
                  <div key={game} onClick={() => setSelectedGame(game)}
                    className="bg-white/5 border border-white/10 p-4 rounded-3xl text-center hover:border-cyan-400 cursor-pointer transition-all">
                    <img src={`/games/${game.toLowerCase().replace(/ /g,'-')}/logo.png`}
                      className="w-full aspect-square rounded-xl mb-4 object-cover" alt={game}
                      onError={(e:any) => { e.target.src="/logo.png"; }}/>
                    <h3 className="font-black text-sm uppercase">{game}</h3>
                    <button className="mt-4 w-full py-2 rounded-full font-black text-[10px] bg-cyan-500 text-black uppercase">PLAY NOW</button>
                  </div>
                ))}
                {['Ludo Elite Royal','Puck Pulse Elite'].map(game => (
                  <div key={game} className="bg-white/5 border border-yellow-500/30 p-4 rounded-3xl text-center relative opacity-80 cursor-not-allowed">
                    <span className="absolute top-3 right-3 bg-yellow-500 text-black text-[8px] font-black px-2 py-1 rounded-full uppercase z-10">Coming Soon</span>
                    <div className="w-full aspect-square rounded-xl mb-4 bg-gradient-to-br from-yellow-500/10 to-black flex items-center justify-center border border-yellow-500/20">
                      <Trophy size={50} className="text-yellow-500 opacity-40"/>
                    </div>
                    <h3 className="font-black text-sm uppercase text-yellow-400">{game}</h3>
                    <button disabled className="mt-4 w-full py-2 rounded-full font-black text-[10px] bg-yellow-500/20 text-yellow-400 uppercase cursor-not-allowed">Coming Soon</button>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col h-full">
              <div className="w-full bg-black h-12 flex items-center px-4 border-b border-white/10 shrink-0">
                <button onClick={() => setSelectedGame(null)} className="text-cyan-400 font-black text-[10px] uppercase tracking-widest">← BACK</button>
                <div className="flex-1 text-center font-black uppercase text-[10px] opacity-40">{selectedGame}</div>
              </div>
              <iframe src={`/games/${selectedGame.toLowerCase().replace(/ /g,'-')}/index.html`}
                className="w-full h-full border-none flex-1" title="Game"/>
            </div>
          )}
        </div>
      )}

      {/* ── SOCIAL ───────────────────────────────────────────── */}
      {screen==='social' && (
        <div className="fixed inset-0 z-[400] bg-slate-950 flex flex-col h-screen overflow-hidden">
          <header className="sticky top-0 w-full p-4 bg-black/90 backdrop-blur-md border-b border-white/10 flex justify-between items-center z-[500] rounded-b-3xl shrink-0">
            {socialScreen==='hub'
              ? <button onClick={() => setScreen('hub')} className="text-pink-500 font-black text-xs uppercase">← HUB</button>
              : <button onClick={() => setSocialScreen('hub')} className="text-pink-500 font-black text-xs uppercase">← BACK</button>
            }
            <h2 className="text-4xl font-black italic text-pink-500 uppercase text-center flex-1 tracking-tighter drop-shadow-[0_0_15px_#ec4899] animate-pulse">Dashboard</h2>
            <button onClick={() => setSocialScreen('settings_menu')} className="bg-white/10 p-2 rounded-full text-pink-500 hover:bg-white/20 shadow-lg">
              <Settings size={22}/>
            </button>
          </header>

          <div className="flex-1 overflow-y-auto">

            {/* SOCIAL HUB */}
            {socialScreen==='hub' && (
              <div className="max-w-md mx-auto grid grid-cols-1 gap-6 p-8 pb-24">
                {/* Profile card */}
                <div className="flex items-center gap-3 bg-white/5 p-4 rounded-3xl border border-pink-500/20 cursor-pointer"
                  onClick={() => user && openProfile(user.uid)}>
                  <div className="relative">
                    <img src={tempPhoto||user?.photoURL||'/logo.png'} className="w-14 h-14 rounded-full border-2 border-pink-500 shadow-xl"/>
                    <div className="absolute bottom-0 right-0 w-4 h-4 bg-green-500 rounded-full border-2 border-slate-950"/>
                  </div>
                  <div className="text-left">
                    <p className="font-black text-white text-xs uppercase tracking-wider">@{username||'AJ_MEMBER'}</p>
                    <p className="text-[8px] text-gray-500 uppercase font-bold tracking-widest">Tap to view your profile</p>
                  </div>
                </div>

                {/* Referral card */}
                <div className="bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border border-yellow-500/30 p-5 rounded-3xl text-left shadow-xl">
                  <p className="text-[10px] font-black text-yellow-400 uppercase tracking-widest mb-2">🎁 Refer & Earn — Your Referral Code</p>
                  <div className="flex items-center justify-between bg-black/40 px-3 py-2 rounded-xl">
                    <span className="text-xs font-mono text-yellow-300 truncate max-w-[200px]">{user?.uid}</span>
                    <button onClick={() => copyToClipboard(user?.uid||"")} className="text-yellow-400 text-[10px] font-black uppercase">
                      {copied?"Copied ✓":"Copy"}
                    </button>
                  </div>
                  <p className="text-[9px] text-gray-400 mt-2">Share ID → New user enters it → You get +{REFERRAL_COINS} Coins!</p>
                </div>

                {/* GO LIVE */}
                <button onClick={startLive}
                  className="w-full py-4 bg-red-600 rounded-[2rem] font-black uppercase text-white tracking-[0.2em] shadow-[0_0_30px_rgba(239,68,68,0.4)] hover:scale-105 transition-all flex items-center justify-center gap-3 active:scale-95">
                  <Radio size={22} className="animate-pulse"/> GO LIVE (Camera + Gifts)
                </button>

                {/* CREATE POST */}
                <button onClick={() => enterSocialMode('pulse')}
                  className="w-full py-4 bg-pink-600/20 border border-pink-500/40 rounded-[2rem] font-black uppercase text-pink-400 tracking-[0.2em] hover:bg-pink-600/30 transition-all flex items-center justify-center gap-3 active:scale-95">
                  <PlusSquare size={22}/> CREATE POST (+2.5 Coins)
                </button>

                {/* MODULE CARDS */}
                {[
                  { n:'AJ TikReels', i:Video,        d:'TikTok Style Videos', s:'tikreels'  },
                  { n:'AJ Pulse',    i:Users,         d:'Insta Style Feed',    s:'pulse'     },
                  { n:'AJ WeChat',   i:MessageSquare, d:'VVIP Messenger',      s:'chatlist'  },
                  { n:'AJ Discover', i:Globe,         d:'Crypto & Tech News',  s:'discover'  },
                ].map(mod => (
                  <div key={mod.n} onClick={() => enterSocialMode(mod.s)}
                    className="p-8 bg-white/5 border border-white/10 rounded-[3rem] text-center hover:border-pink-500 transition-all cursor-pointer group shadow-lg">
                    <div className="text-pink-500 mb-4 flex justify-center group-hover:scale-110 transition-transform"><mod.i size={36}/></div>
                    <h3 className="text-2xl font-black uppercase italic text-white tracking-widest">{mod.n}</h3>
                    <p className="text-[9px] text-gray-400 uppercase mt-2 font-bold tracking-widest">{mod.d}</p>
                  </div>
                ))}
              </div>
            )}

            {/* USER PROFILE */}
            {socialScreen==='profile' && viewProfile && (
              <div className="max-w-md mx-auto pb-24">
                <div className="relative h-44 bg-gradient-to-br from-pink-600/30 to-cyan-600/30 rounded-b-[3rem]">
                  <div className="absolute -bottom-12 left-1/2 -translate-x-1/2">
                    <img src={viewProfile.photo||'/logo.png'} className="w-24 h-24 rounded-full border-4 border-slate-950 shadow-2xl"/>
                  </div>
                </div>
                <div className="mt-16 text-center px-6">
                  <h2 className="text-2xl font-black text-white uppercase tracking-widest">@{viewProfile.username||'AJ_MEMBER'}</h2>
                  <p className="text-sm text-gray-400 mt-2 font-bold">{viewProfile.bio||'No bio yet.'}</p>
                  <div className="flex justify-center gap-8 mt-6">
                    {[{l:'Posts',v:profilePosts.length},{l:'Videos',v:profileVideos.length},{l:'Followers',v:followers},{l:'Following',v:following}].map(s => (
                      <div key={s.l} className="text-center">
                        <p className="text-xl font-black text-white">{s.v}</p>
                        <p className="text-[9px] text-gray-500 uppercase font-bold tracking-widest">{s.l}</p>
                      </div>
                    ))}
                  </div>
                  {viewingUid!==user?.uid && (
                    <button onClick={() => viewingUid && handleFollow(viewingUid)}
                      className={`mt-6 px-10 py-3 rounded-full font-black uppercase text-sm tracking-widest transition-all active:scale-95 flex items-center gap-2 mx-auto ${isFollowing?'bg-white/10 border border-white/20 text-white':'bg-pink-600 text-white shadow-lg'}`}>
                      {isFollowing ? <><UserCheck size={16}/> Following</> : <><UserPlus size={16}/> Follow</>}
                    </button>
                  )}
                  <div className="flex gap-4 mt-8 border-b border-white/10">
                    {[{t:'Posts',i:<Grid size={18}/>},{t:'Videos',i:<Film size={18}/>}].map(tab => (
                      <button key={tab.t} className="flex-1 flex items-center justify-center gap-2 py-3 font-black text-xs uppercase tracking-widest text-pink-400 border-b-2 border-pink-500">
                        {tab.i}{tab.t}
                      </button>
                    ))}
                  </div>
                  <div className="grid grid-cols-3 gap-1 mt-4">
                    {[...profilePosts,...profileVideos].map((p:any) => (
                      <div key={p.id} className="aspect-square bg-white/5 rounded-xl overflow-hidden">
                        {p.image
                          ? <img src={p.image} className="w-full h-full object-cover"/>
                          : <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-pink-600/20 to-cyan-600/20"><Film size={24} className="text-pink-400"/></div>
                        }
                      </div>
                    ))}
                    {[...profilePosts,...profileVideos].length===0 && (
                      <div className="col-span-3 py-12 text-gray-500 text-xs text-center">No posts yet.</div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* SETTINGS */}
            {socialScreen==='settings_menu' && (
              <div className="max-w-md mx-auto p-10 flex flex-col gap-6">
                <h2 className="text-3xl font-black text-cyan-400 italic mb-4 uppercase tracking-widest">Settings</h2>
                <button onClick={() => setSocialScreen('setup')}
                  className="bg-white/5 border border-white/10 p-6 rounded-3xl flex items-center gap-4 hover:bg-white/10 transition-all shadow-xl">
                  <Edit3 className="text-pink-500" size={24}/><span className="font-black text-sm uppercase tracking-widest">Edit Profile</span>
                </button>
                <button onClick={handleSignOut}
                  className="bg-red-500/10 border border-red-500/20 p-6 rounded-3xl flex items-center gap-4 hover:bg-red-500/20 transition-all shadow-xl">
                  <LogOut className="text-red-500" size={24}/><span className="font-black text-sm uppercase tracking-widest text-red-500">Sign Out</span>
                </button>
                <button onClick={() => setSocialScreen('hub')} className="text-gray-500 uppercase text-[10px] font-black mt-10">Back</button>
              </div>
            )}

            {/* TIKREELS */}
            {socialScreen==='tikreels' && (
              <div className="flex flex-col h-full">
                <div className="flex gap-0 bg-black border-b border-white/10 shrink-0">
                  {(['feed','create','profile'] as const).map(t => (
                    <button key={t} onClick={() => setTiktabMode(t)}
                      className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest transition-all ${tiktabMode===t?'text-pink-500 border-b-2 border-pink-500':'text-gray-500'}`}>
                      {t==='feed'?'🎬 Feed':t==='create'?'➕ Post':'👤 Profile'}
                    </button>
                  ))}
                </div>

                {/* FEED — autoplay, no click needed */}
                {tiktabMode==='feed' && (
                  <div className="h-full w-full max-w-md mx-auto snap-y snap-mandatory overflow-y-auto bg-black">
                    {pixaVideos.map((vid:any, i:number) => (
                      <React.Fragment key={i}>
                        <div className="h-[85vh] w-full snap-start relative border-b border-white/5">
                          <iframe
                            src={vid.embedUrl}
                            className="w-full h-full"
                            title={vid.title}
                            allow="autoplay; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                            frameBorder="0"
                          />
                          {/* RIGHT SIDEBAR ACTIONS */}
                          <div className="absolute right-4 bottom-32 flex flex-col gap-6 items-center z-10">
                            <div onClick={() => handleLike(vid.id)} className="flex flex-col items-center cursor-pointer active:scale-125 transition-all">
                              <Heart size={35} className={likedPosts[vid.id]?"text-red-500 fill-red-500":"text-white"}/>
                              <span className="text-[10px] font-bold text-white">12k</span>
                            </div>
                            <div className="flex flex-col items-center cursor-pointer" onClick={() => setCommentPostId(vid.id)}>
                              <MessageCircle size={35} className="text-white"/>
                              <span className="text-[10px] font-bold text-white">842</span>
                            </div>
                            <div onClick={() => handleShare('AJ TikReels')} className="flex flex-col items-center cursor-pointer text-white">
                              <Share2 size={35}/><span className="text-[10px] font-bold">Share</span>
                            </div>
                            {/* GIFT */}
                            <div className="flex flex-col items-center cursor-pointer text-yellow-400" onClick={() => setCommentPostId('gift_'+vid.id)}>
                              <Gift size={28}/><span className="text-[10px] font-bold">Gift</span>
                            </div>
                          </div>
                          <div className="absolute bottom-10 left-6 text-white max-w-[70%] z-10">
                            <p className="font-black text-sm">@{vid.user}</p>
                            <div className="flex items-center gap-2 mt-3 bg-black/30 w-max p-1.5 rounded-full backdrop-blur-md border border-white/10">
                              <Music size={12}/>
                              <marquee className="text-[10px] w-24 uppercase font-bold">Original Sound - AJ Studio</marquee>
                            </div>
                          </div>
                        </div>
                        {(i+1)%5===0 && (
                          <div onClick={() => (window as any).AJ_SDK?.showAd()}
                            className="h-[85vh] w-full snap-start flex items-center justify-center bg-gray-900 text-cyan-400 font-black flex-col gap-4 cursor-pointer border-y-2 border-cyan-500/20">
                            <VideoIcon size={70} className="animate-pulse"/>
                            <p className="uppercase tracking-[0.3em]">AJ VVIP AD</p>
                          </div>
                        )}
                      </React.Fragment>
                    ))}
                  </div>
                )}

                {/* CREATE (TikReels) */}
                {tiktabMode==='create' && (
                  <div className="max-w-md mx-auto p-6 space-y-6">
                    <h3 className="text-xl font-black text-pink-500 uppercase tracking-widest">📹 Create Video Post</h3>
                    <div className="border-2 border-dashed border-pink-500/40 rounded-3xl p-8 text-center cursor-pointer bg-white/5 hover:bg-white/10 transition-all" onClick={handleTiktokImage}>
                      {tiktokPostImg
                        ? <img src={tiktokPostImg} className="w-full max-h-48 object-cover rounded-2xl"/>
                        : <><Film size={48} className="text-pink-500/40 mx-auto mb-3"/><p className="text-[10px] text-gray-500 uppercase font-black">Tap to select Video / Image</p></>
                      }
                    </div>
                    <textarea value={tiktokPostText} onChange={e => setTiktokPostText(e.target.value)} placeholder="Add caption..."
                      className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-sm text-white outline-none focus:border-pink-500 h-24 font-bold"/>
                    <button onClick={handleTiktokPost} className="w-full py-4 bg-pink-600 rounded-2xl font-black uppercase text-white tracking-widest shadow-lg active:scale-95 transition-all">
                      PUBLISH (+2.5 🪙)
                    </button>
                  </div>
                )}

                {/* MY PROFILE (TikReels) */}
                {tiktabMode==='profile' && (
                  <div className="max-w-md mx-auto pb-24">
                    <div className="relative h-36 bg-gradient-to-br from-pink-600/30 to-cyan-600/30">
                      <div className="absolute -bottom-10 left-1/2 -translate-x-1/2">
                        <img src={tempPhoto||user?.photoURL||'/logo.png'} className="w-20 h-20 rounded-full border-4 border-slate-950 shadow-2xl"/>
                      </div>
                    </div>
                    <div className="mt-14 text-center px-6">
                      <h2 className="text-xl font-black text-white uppercase tracking-widest">@{username||'AJ_MEMBER'}</h2>
                      <p className="text-sm text-gray-400 mt-1 font-bold">{bio||'No bio yet.'}</p>
                      <div className="flex justify-center gap-8 mt-5">
                        {[{l:'Videos',v:profileVideos.length},{l:'Followers',v:followers},{l:'Following',v:following}].map(s => (
                          <div key={s.l} className="text-center">
                            <p className="text-xl font-black text-white">{s.v}</p>
                            <p className="text-[9px] text-gray-500 uppercase font-bold">{s.l}</p>
                          </div>
                        ))}
                      </div>
                      <div className="grid grid-cols-3 gap-1 mt-6">
                        {userPosts.filter((p:any) => p.uid===user?.uid).map((p:any) => (
                          <div key={p.id} className="aspect-square bg-white/5 rounded-xl overflow-hidden">
                            {p.image ? <img src={p.image} className="w-full h-full object-cover"/>
                              : <div className="w-full h-full flex items-center justify-center"><Film size={24} className="text-pink-400"/></div>}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* AJ PULSE */}
            {socialScreen==='pulse' && (
              <div className="max-w-md mx-auto space-y-6 p-4 pb-24">
                {/* Create box */}
                <div className="bg-white/10 backdrop-blur-xl p-5 rounded-3xl border border-pink-500/20 shadow-2xl">
                  <div className="flex gap-3">
                    <img src={user?.photoURL||'/logo.png'} className="w-10 h-10 rounded-full border-2 border-pink-500"/>
                    <textarea value={postText} onChange={e => setPostText(e.target.value)} placeholder="Share your CEO story..."
                      className="flex-1 bg-white/5 rounded-2xl p-4 text-xs outline-none border border-white/10 h-20 text-white font-bold"/>
                  </div>
                  <div className="flex justify-between mt-4 pt-3 border-t border-white/5">
                    <button onClick={handleImageClick} className="flex items-center gap-2 text-[10px] font-black text-gray-400 hover:text-pink-500 uppercase">
                      <Camera size={18}/> Media
                    </button>
                    <button onClick={handleCreatePost} className="bg-pink-600 px-6 py-2 rounded-full text-xs font-black shadow-lg hover:scale-105 transition-all text-white">
                      PUBLISH (+2.5🪙)
                    </button>
                  </div>
                </div>

                {/* Feed */}
                {userPosts.map((post:any) => (
                  <div key={post.id} className="bg-white/10 backdrop-blur-md border border-white/10 rounded-[2.5rem] overflow-hidden shadow-2xl relative">
                    <div className="flex items-center justify-between p-5">
                      <div className="flex items-center gap-3 cursor-pointer" onClick={() => openProfile(post.uid)}>
                        <img src={post.photo||'/logo.png'} className="w-10 h-10 rounded-full border-2 border-pink-500"/>
                        <p className="font-black text-xs text-white tracking-widest">@{post.username}</p>
                      </div>
                      <MoreVertical size={18} className="opacity-40 text-white cursor-pointer"
                        onClick={() => setActiveMenuId(activeMenuId===post.id?null:post.id)}/>
                    </div>
                    {activeMenuId===post.id && (
                      <div className="absolute right-6 top-16 bg-slate-900 border border-white/10 p-3 rounded-xl z-[1000] shadow-2xl">
                        <button onClick={() => handleDeletePost(post.id)} className="text-red-500 text-[10px] font-black flex items-center gap-2 uppercase">
                          <Trash2 size={14}/> Delete
                        </button>
                      </div>
                    )}
                    {post.image && <img src={post.image} className="w-full aspect-square object-cover"/>}
                    <div className="p-6">
                      <div className="flex gap-6 mb-4">
                        <Heart size={30} onClick={() => handleLike(post.id)} className={likedPosts[post.id]?"text-red-500 fill-red-500 cursor-pointer":"text-white cursor-pointer"}/>
                        <MessageSquare size={30} className="text-white cursor-pointer" onClick={() => setCommentPostId(post.id)}/>
                        <Share2 size={30} className="text-white cursor-pointer" onClick={() => handleShare(post.text)}/>
                      </div>
                      <p className="text-[12px] leading-relaxed text-gray-200 font-bold mb-4">{post.text}</p>
                      {/* GIFTING — only for other users' posts */}
                      {post.uid!==user?.uid && (
                        <div className="border-t border-white/5 pt-4 mt-4">
                          <p className="text-[10px] text-pink-400 font-black tracking-widest mb-3 uppercase flex items-center gap-1">
                            <Gift size={12}/> Send Gift (60% to creator | 40% admin profit)
                          </p>
                          <div className="grid grid-cols-3 gap-2">
                            {giftItems.map(g => (
                              <button key={g.id} onClick={() => sendGift(post.uid, g)}
                                className="bg-white/5 border border-white/10 py-2 rounded-xl text-[9px] font-black uppercase hover:border-pink-500 transition-all flex flex-col items-center gap-1 active:scale-95">
                                <span className="text-xl">{g.icon}</span>
                                <span>{g.name}</span>
                                <span className="text-yellow-500 text-[8px]">{g.cost.toLocaleString()} 🪙</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                {/* Unsplash trending grid */}
                {pixaData.length>0 && (
                  <div>
                    <p className="text-[9px] text-gray-500 uppercase font-black tracking-widest mb-3">✨ Trending Pulse</p>
                    <div className="grid grid-cols-2 gap-3">
                      {pixaData.map((photo:any) => (
                        <div key={photo.id} className="rounded-2xl overflow-hidden border border-white/10 shadow-lg">
                          <img src={photo.urls?.regular||photo.urls?.small||''} alt={photo.alt_description||'pulse'}
                            className="w-full aspect-square object-cover hover:scale-105 transition-transform"/>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* WECHAT CONTACT LIST */}
            {socialScreen==='chatlist' && (
              <div className="max-w-md mx-auto bg-[#111b21]/80 h-screen border-x border-white/10 overflow-y-auto">
                <div className="bg-[#1f2c33]/90 p-5 flex justify-between items-center border-b border-white/10">
                  <h2 className="text-2xl font-black text-[#e9edef] tracking-widest italic">WeChat</h2>
                  <div className="flex gap-3 items-center">
                    <button onClick={handleContactsSync}
                      className="flex items-center gap-1 text-cyan-400 text-[9px] font-black uppercase border border-cyan-500/30 px-2 py-1 rounded-full hover:bg-cyan-500/10 transition-all">
                      <Phone size={12}/> Sync
                    </button>
                    <button onClick={() => setAddContactOpen(true)}
                      className="flex items-center gap-1 text-green-400 text-[9px] font-black uppercase border border-green-500/30 px-2 py-1 rounded-full hover:bg-green-500/10 transition-all">
                      + Add
                    </button>
                    <Camera size={20} className="text-[#aebac1] cursor-pointer" onClick={handleImageClick}/>
                    <Search size={20} className="text-[#aebac1] cursor-pointer" onClick={() => searchRef.current?.focus()}/>
                  </div>
                </div>
                {addContactOpen && (
                  <div className="m-4 bg-slate-800 border border-cyan-500/30 p-5 rounded-3xl shadow-2xl">
                    <p className="text-[10px] font-black text-cyan-400 uppercase tracking-widest mb-3">Add Contact</p>
                    <input type="text" value={newContact} onChange={e => setNewContact(e.target.value)} placeholder="Contact name..."
                      className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-xs text-white outline-none focus:border-cyan-500 font-bold mb-3"/>
                    <div className="flex gap-3">
                      <button onClick={addManualContact} className="flex-1 bg-cyan-500 py-2 rounded-xl text-[10px] font-black text-black uppercase">Add</button>
                      <button onClick={() => setAddContactOpen(false)} className="flex-1 bg-white/10 py-2 rounded-xl text-[10px] font-black text-white uppercase">Cancel</button>
                    </div>
                  </div>
                )}
                <div className="p-4">
                  <div className="bg-[#202c33] flex items-center gap-4 px-5 py-3 rounded-2xl text-gray-400 border border-white/5">
                    <Search size={18}/>
                    <input ref={searchRef} type="text" placeholder="Search contacts" className="bg-transparent outline-none text-sm w-full text-white font-bold"/>
                  </div>
                </div>
                <div className="mt-2 space-y-1">
                  {wechatContacts.map((contact, i) => (
                    <div key={i} onClick={() => { setActiveContact(contact); setSocialScreen('chat'); }}
                      className="flex items-center gap-4 p-5 hover:bg-white/5 cursor-pointer border-b border-white/5 transition-all mx-2 rounded-[2rem]">
                      <div className="w-14 h-14 rounded-full bg-cyan-600/30 flex items-center justify-center font-black border border-cyan-500/50 text-cyan-400 shadow-2xl text-lg">
                        {contact[0].toUpperCase()}
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between items-center mb-1">
                          <p className="font-black text-[#e9edef] tracking-wider uppercase text-xs">{contact}</p>
                          <span className="text-[10px] text-[#8696a0]">Now</span>
                        </div>
                        <p className="text-[10px] text-[#8696a0] font-bold">VVIP encrypted chat active.</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* WECHAT CHAT */}
            {socialScreen==='chat' && (
              <div className="max-w-md mx-auto h-[88vh] flex flex-col bg-[#0b141a] overflow-hidden m-2 rounded-[2.5rem] shadow-2xl border border-cyan-500/20">
                <div className="bg-[#1f2c33]/95 p-4 flex items-center gap-3 border-b border-white/10">
                  <button onClick={() => setSocialScreen('chatlist')} className="text-cyan-500 p-2"><ChevronRight className="rotate-180"/></button>
                  <div className="w-11 h-11 rounded-full bg-cyan-600/30 flex items-center justify-center font-black border border-cyan-500/50 text-cyan-400 text-lg">
                    {activeContact?.[0]?.toUpperCase()||'A'}
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-sm text-white uppercase tracking-widest">{activeContact}</p>
                    <p className="text-[7px] text-green-500 font-black uppercase tracking-[0.3em] animate-pulse">Online • Encrypted</p>
                  </div>
                  <div className="flex gap-4 text-[#aebac1]">
                    <VideoIcon size={20} className="cursor-pointer hover:text-cyan-400"/>
                    <Phone size={20} className="cursor-pointer hover:text-green-400"/>
                    <Camera size={20} className="cursor-pointer hover:text-pink-400" onClick={handleImageClick}/>
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto p-5 space-y-4">
                  {chatMessages.map((m:any) => (
                    <div key={m.id} className={`flex ${m.uid===user?.uid?'justify-end':'justify-start'}`}>
                      <div className={`p-3 max-w-[85%] rounded-2xl shadow-xl border ${m.uid===user?.uid?'bg-cyan-700/80 border-cyan-400 rounded-tr-none':'bg-[#202c33]/90 border-white/5 rounded-tl-none'}`}>
                        <p className="font-black text-[9px] text-yellow-500 mb-1 opacity-70 uppercase">@{m.username}</p>
                        <p className="text-[12px] text-white font-medium">{m.text}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="p-4 bg-[#1f2c33]/95 flex gap-3 items-center">
                  <button onClick={handleImageClick} className="text-[#aebac1]"><PlusSquare size={26}/></button>
                  <input type="text" value={newMessage} onChange={e => setNewMessage(e.target.value)}
                    onKeyDown={e => e.key==='Enter'&&sendChatMessage()} placeholder="Type a message"
                    className="flex-1 bg-[#2a3942] p-4 rounded-full text-xs text-white outline-none focus:ring-1 focus:ring-cyan-500 font-bold border-none"/>
                  <button onClick={sendChatMessage} className="bg-cyan-600 p-4 rounded-full text-white shadow-2xl active:scale-90 transition-all">
                    <Send size={22}/>
                  </button>
                </div>
              </div>
            )}

            {/* PROFILE SETUP */}
            {socialScreen==='setup' && (
              <div className="max-w-md mx-auto bg-white/5 border border-white/10 p-10 rounded-[3.5rem] text-center mt-4 shadow-2xl">
                <div className="relative w-28 h-28 mx-auto mb-10 cursor-pointer group" onClick={handleImageClick}>
                  <img src={tempPhoto||user?.photoURL||'/logo.png'} className="w-full h-full rounded-full border-4 border-pink-500 p-1 object-cover shadow-2xl group-hover:brightness-50 transition-all"/>
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100"><Camera size={40} className="text-white"/></div>
                  <div className="absolute bottom-1 right-1 bg-pink-600 p-3 rounded-full border-2 border-black text-white"><Camera size={18}/></div>
                </div>
                <h2 className="text-2xl font-black text-white mb-8 uppercase tracking-widest italic">Identity Setup</h2>
                <div className="space-y-5 text-left">
                  <label className="text-[10px] font-black text-pink-500 ml-1 uppercase tracking-widest">Username</label>
                  <input type="text" placeholder="@unique_name" value={username} onChange={e => setUsername(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 p-4 rounded-2xl font-bold text-white outline-none focus:border-pink-500"/>
                  <label className="text-[10px] font-black text-pink-500 ml-1 uppercase tracking-widest">Bio</label>
                  <textarea placeholder="Tell the world about you..." value={bio} onChange={e => setBio(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 p-4 rounded-2xl text-xs text-white outline-none h-28 focus:border-pink-500"/>
                  <button onClick={handleCreateProfile}
                    className="w-full mt-8 py-5 bg-pink-600 rounded-[1.5rem] font-black uppercase shadow-[0_10px_30px_rgba(236,72,153,0.3)] active:scale-95 transition-all text-white border-b-4 border-pink-800 tracking-[0.2em]">
                    ACTIVATE PROFILE
                  </button>
                </div>
                <button onClick={() => setSocialScreen('hub')} className="mt-6 text-gray-500 uppercase text-[9px] font-black w-full">Back</button>
              </div>
            )}

            {/* DISCOVER */}
            {socialScreen==='discover' && (
              <div className="max-w-md mx-auto p-4 pb-24 space-y-6 overflow-y-auto h-[85vh]">
                <h3 className="text-3xl font-black italic uppercase text-cyan-400 border-b border-white/10 pb-4 tracking-widest">AJ Discover</h3>
                {newsData.length>0 ? newsData.map((article:any, idx:number) => (
                  <div key={idx} className="bg-white/5 border border-white/10 p-5 rounded-3xl space-y-3">
                    {(article.image||article.urlToImage) && (
                      <img src={article.image||article.urlToImage} className="w-full h-40 object-cover rounded-2xl" alt="news"/>
                    )}
                    <h4 className="font-black text-sm uppercase text-white leading-tight">{article.title}</h4>
                    <p className="text-[10px] text-gray-400 line-clamp-3">{article.description}</p>
                    <a href={article.url} target="_blank" className="inline-block text-cyan-400 text-[9px] font-black uppercase tracking-widest">Read More →</a>
                  </div>
                )) : <p className="text-center text-gray-500 text-xs mt-10">Loading AJ News...</p>}
              </div>
            )}
          </div>

          {/* COMMENT BOARD */}
          {commentPostId && !commentPostId.startsWith('gift_') && (
            <div className="fixed inset-0 z-[1000] bg-black/70 backdrop-blur-md flex items-end">
              <div className="w-full h-[65vh] bg-[#111b21] rounded-t-[3rem] border-t-2 border-pink-500 p-6 flex flex-col shadow-2xl">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-lg font-black text-pink-500 uppercase tracking-widest">Comments</h3>
                  <X className="cursor-pointer text-gray-500" onClick={() => setCommentPostId(null)}/>
                </div>
                <div className="flex-1 overflow-y-auto space-y-4">
                  {postComments.length>0 ? postComments.map((c:any) => (
                    <div key={c.id} className="flex gap-4 p-3 bg-white/5 rounded-2xl border border-white/5">
                      <img src={c.photo||'/logo.png'} className="w-8 h-8 rounded-full border border-pink-500"/>
                      <div>
                        <p className="font-black text-[10px] text-pink-400 uppercase">@{c.username}</p>
                        <p className="text-xs text-gray-300 mt-1">{c.text}</p>
                      </div>
                    </div>
                  )) : <p className="text-center text-gray-600 text-xs mt-10 italic">No comments yet.</p>}
                </div>
                <div className="mt-4 pt-4 border-t border-white/10 flex gap-3">
                  <input type="text" value={newComment} onChange={e => setNewComment(e.target.value)} placeholder="Write a comment..."
                    className="flex-1 bg-black/40 border border-white/10 rounded-xl p-4 text-xs outline-none focus:ring-1 focus:ring-pink-500 text-white font-bold"/>
                  <button onClick={submitComment} className="bg-pink-600 p-4 rounded-xl active:scale-90 transition-all text-white"><Send size={18}/></button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── GO LIVE (REAL CAMERA) ────────────────────────────── */}
      {liveActive && (
        <div className="fixed inset-0 z-[600] bg-black flex flex-col">
          <div className="relative flex-1 bg-black">
            <video ref={liveVideoRef} autoPlay playsInline muted className="w-full h-full object-cover"/>
            {!cameraReady && (
              <div className="absolute inset-0 flex items-center justify-center bg-black flex-col gap-4">
                <Radio size={60} className="text-red-500 animate-pulse"/>
                <p className="text-white font-black uppercase tracking-widest">Opening Camera...</p>
                <p className="text-gray-400 text-xs">Please allow camera access</p>
              </div>
            )}
            {cameraReady && (
              <div className="absolute top-6 left-6 bg-red-600 px-4 py-2 rounded-full flex items-center gap-2 shadow-2xl">
                <div className="w-2 h-2 bg-white rounded-full animate-pulse"/>
                <span className="text-white font-black text-xs uppercase">LIVE</span>
              </div>
            )}
            <div className="absolute top-6 right-6 bg-black/60 px-3 py-2 rounded-xl backdrop-blur-md">
              <p className="text-[9px] text-gray-400 font-mono">Room: {liveRoomId.slice(-8)}</p>
            </div>
            <button onClick={stopLive} className="absolute top-20 right-6 bg-red-600 px-4 py-2 rounded-full font-black text-white text-xs uppercase shadow-xl active:scale-95">
              END LIVE
            </button>
          </div>
          {/* GIFT PANEL */}
          <div className="bg-[#0d1117] border-t border-white/10 p-4">
            <p className="text-[10px] text-yellow-400 font-black uppercase tracking-widest mb-3 flex items-center gap-2">
              <Gift size={14}/> Viewers Send Gifts — 60% Goes to You | 40% Admin Profit
            </p>
            <div className="flex gap-3 overflow-x-auto pb-2">
              {giftItems.map(g => (
                <button key={g.id} onClick={() => sendGift(user!.uid, g)}
                  className="flex-shrink-0 bg-white/5 border border-white/10 px-4 py-3 rounded-2xl text-center hover:border-yellow-500 transition-all active:scale-95">
                  <div className="text-2xl mb-1">{g.icon}</div>
                  <p className="text-[9px] font-black uppercase text-white">{g.name}</p>
                  <p className="text-[8px] text-yellow-400">{g.cost.toLocaleString()} 🪙</p>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── WALLET ───────────────────────────────────────────── */}
      {screen==='wallet' && (
        <div className="fixed inset-0 z-[300] bg-black/98 flex flex-col items-center p-8 overflow-y-auto">
          <button onClick={() => { setScreen('hub'); setWalletTab('main'); }}
            className="self-start text-cyan-400 mb-8 font-bold uppercase tracking-widest flex items-center gap-2">
            <ArrowLeft size={18}/> BACK
          </button>
          <div className="w-full max-w-md bg-[#111] border border-white/10 p-10 rounded-3xl text-center shadow-2xl">
            <h2 className="text-5xl font-black text-yellow-500 mb-2 tracking-tighter">{displayBalance} 🪙</h2>
            <p className="text-green-400 font-black text-xl mb-2 tracking-[0.2em]">${displayUsdt}</p>
            <p className="text-[9px] text-gray-500 font-bold uppercase tracking-widest mb-6">
              Buy: $1 = {COIN_RATE} Coins | Min Purchase: ${MIN_PURCHASE} | Min Withdraw: {WITHDRAW_MIN.toLocaleString()} Coins = ${WITHDRAW_MIN/CASH_RATE}
            </p>

            {/* Referral */}
            <div className="bg-white/5 p-4 rounded-2xl border border-white/10 mb-6 text-left">
              <p className="text-[9px] text-gray-400 uppercase font-black tracking-widest mb-1">Your Referral Code (User ID)</p>
              <div className="flex justify-between items-center bg-black/40 px-3 py-2 rounded-xl">
                <span className="text-xs font-mono text-cyan-400 truncate max-w-[200px]">{user?.uid}</span>
                <button onClick={() => copyToClipboard(user?.uid||"")} className="text-cyan-400 text-[10px] font-black uppercase">
                  {copied?"Copied ✓":"Copy"}
                </button>
              </div>
            </div>

            {walletTab==='main' && (
              <div className="flex flex-col gap-4">
                <button onClick={() => setWalletTab('purchase')} className="bg-white text-black py-4 rounded-[1.5rem] font-black uppercase shadow-lg hover:scale-105 transition-all">Purchase</button>
                <button onClick={() => setWalletTab('transfer')} className="bg-white/10 text-cyan-400 py-4 rounded-[1.5rem] font-black border border-cyan-500/30 uppercase hover:bg-white/5 transition-all">Transfer</button>
                <button onClick={() => setWalletTab('withdraw')} className="bg-white/10 text-pink-500 py-4 rounded-[1.5rem] font-black border border-pink-500/30 uppercase hover:bg-white/5 transition-all">Withdraw</button>
                <button onClick={() => setWalletTab('referral')} className="bg-white/10 text-yellow-500 py-4 rounded-[1.5rem] font-black border border-yellow-500/30 uppercase hover:bg-white/5 transition-all">Enter Referral Code</button>
              </div>
            )}

            {walletTab==='purchase' && (
              <div className="flex flex-col gap-6 text-left">
                <label className="text-[10px] font-black text-cyan-400 uppercase tracking-[0.3em]">Payment Method</label>
                <select value={purchaseMethod} onChange={e => setPurchaseMethod(e.target.value)}
                  className="w-full bg-gray-900 border border-white/10 p-4 rounded-xl text-white font-bold outline-none">
                  <option>Binance (TRC20)</option>
                  <option>Airtm (Gmail Account)</option>
                </select>
                <div className="bg-black border-2 border-white/10 p-8 rounded-[2.5rem] text-center shadow-inner">
                  <p className="text-[10px] text-gray-500 uppercase font-black mb-4 tracking-[0.3em]">You will receive</p>
                  <p className="text-yellow-500 text-5xl font-black mb-6">{(purchaseAmount*COIN_RATE).toLocaleString()} 🪙</p>
                  <div className="flex items-center justify-center gap-3 bg-white/5 p-4 rounded-2xl border border-white/10">
                    <DollarSign className="text-green-400" size={30}/>
                    <input type="number" min={MIN_PURCHASE}
                      value={purchaseAmount===0?'':purchaseAmount}
                      onChange={e => setPurchaseAmount(e.target.value===''?0:Number(e.target.value))}
                      className="bg-transparent text-white text-3xl w-32 text-center font-black outline-none"/>
                  </div>
                  <p className="text-[9px] text-gray-600 mt-3 font-bold">$1 = {COIN_RATE} AJ Coins | Min ${MIN_PURCHASE}</p>
                </div>
                {purchaseMethod==='Airtm (Gmail Account)' && (
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-yellow-500 uppercase tracking-widest">Airtm Transaction ID</label>
                    <input type="text" placeholder="Enter TX ID" value={purchaseTxId} onChange={e => setPurchaseTxId(e.target.value)}
                      className="w-full bg-black border border-white/10 p-4 rounded-xl text-xs font-bold text-white outline-none focus:border-cyan-500"/>
                  </div>
                )}
                <button onClick={handlePurchase} className="bg-cyan-500 py-5 rounded-2xl font-black uppercase shadow-xl hover:scale-[1.02] active:scale-95 transition-all text-black">
                  Confirm Purchase
                </button>
                <button onClick={() => setWalletTab('main')} className="text-gray-500 text-xs text-center uppercase font-black">Cancel</button>
              </div>
            )}

            {walletTab==='transfer' && (
              <div className="flex flex-col gap-6 text-left">
                <h3 className="text-lg font-black text-cyan-400 uppercase tracking-widest">Secure Transfer</h3>
                <div className="space-y-4">
                  <div>
                    <label className="text-[9px] font-black text-cyan-400 uppercase tracking-widest block mb-1">Recipient User ID</label>
                    <input type="text" placeholder="Paste target user ID" value={transferId} onChange={e => setTransferId(e.target.value)}
                      className="w-full bg-black border border-white/10 p-4 rounded-xl text-xs font-bold text-white outline-none focus:border-cyan-500"/>
                  </div>
                  <div>
                    <label className="text-[9px] font-black text-cyan-400 uppercase tracking-widest block mb-1">Coins to Transfer</label>
                    <input type="number" placeholder="Amount" value={transferAmount||''}
                      onChange={e => setTransferAmount(Number(e.target.value))}
                      className="w-full bg-black border border-white/10 p-4 rounded-xl text-xs font-bold text-white outline-none focus:border-cyan-500"/>
                  </div>
                </div>
                <button onClick={handleTransfer} className="bg-cyan-500 py-4 rounded-2xl font-black uppercase tracking-wider text-black active:scale-95 transition-all">
                  Submit Transfer
                </button>
                <button onClick={() => setWalletTab('main')} className="text-gray-500 text-xs text-center uppercase font-black">Cancel</button>
              </div>
            )}

            {walletTab==='withdraw' && (
              <div className="flex flex-col gap-6 text-left">
                <h3 className="text-lg font-black text-pink-500 uppercase tracking-widest">Withdraw Coins</h3>
                <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-2xl">
                  <p className="text-[10px] text-red-400 font-bold uppercase leading-relaxed">
                    ⚠️ Minimum: {WITHDRAW_MIN.toLocaleString()} Coins = ${WITHDRAW_MIN/CASH_RATE}. Processed within 24 hrs.
                  </p>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="text-[9px] font-black text-pink-500 uppercase tracking-widest block mb-1">Payout Method</label>
                    <select value={payoutMethod} onChange={e => setPayoutMethod(e.target.value)}
                      className="w-full bg-gray-900 border border-white/10 p-4 rounded-xl text-white font-bold outline-none">
                      <option>Binance Pay (USDT)</option>
                      <option>Airtm Account</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[9px] font-black text-pink-500 uppercase tracking-widest block mb-1">Payment Address / Email</label>
                    <input type="text" placeholder="Binance ID or Airtm Email" value={payoutId} onChange={e => setPayoutId(e.target.value)}
                      className="w-full bg-black border border-white/10 p-4 rounded-xl text-xs font-bold text-white outline-none focus:border-pink-500"/>
                  </div>
                </div>
                <button onClick={handleWithdraw} className="bg-pink-600 py-4 rounded-2xl font-black uppercase tracking-wider text-white active:scale-95 transition-all">
                  Request Cashout
                </button>
                <button onClick={() => setWalletTab('main')} className="text-gray-500 text-xs text-center uppercase font-black">Cancel</button>
              </div>
            )}

            {walletTab==='referral' && (
              <div className="flex flex-col gap-6 text-left">
                <h3 className="text-lg font-black text-yellow-500 uppercase tracking-widest">Enter Referral Code</h3>
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-yellow-500 uppercase tracking-widest">Referrer's User ID</label>
                  <input type="text" placeholder="Paste referrer ID" value={referralCode} onChange={e => setReferralCode(e.target.value)}
                    className="w-full bg-black border border-white/10 p-4 rounded-xl text-xs font-bold text-white outline-none focus:border-yellow-500"/>
                </div>
                <p className="text-[9px] text-gray-500">Referrer gets +{REFERRAL_COINS} Coins when you submit their ID.</p>
                <button onClick={handleApplyReferral} className="bg-yellow-500 py-4 rounded-2xl font-black uppercase tracking-wider text-black active:scale-95 transition-all">
                  Submit Referral
                </button>
                <button onClick={() => setWalletTab('main')} className="text-gray-500 text-xs text-center uppercase font-black">Cancel</button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── AI BOT SCREEN ────────────────────────────────────── */}
      {screen==='ai' && (
        <div className="fixed inset-0 z-[600] bg-black flex flex-col items-center p-8 overflow-y-auto">
          <div className="w-full max-w-4xl pt-10">
            <button onClick={() => setScreen('hub')} className="text-green-400 font-bold text-sm mb-12 uppercase tracking-widest">← Back</button>
          </div>
          <h2 className="text-5xl font-black mb-12 text-center uppercase text-white italic tracking-tighter">AJ AI BOT</h2>
          {botTier!=='none' && (
            <div className="w-full max-w-2xl bg-white/5 border-2 border-green-500/40 p-8 rounded-[3.5rem] text-center mb-16 shadow-[0_0_50px_rgba(34,197,94,0.15)]">
              <div className="w-full bg-black/50 border border-green-500/30 p-8 rounded-3xl font-mono text-left shadow-inner">
                <div className="flex justify-between items-center mb-6">
                  <span className="text-green-400 font-black text-xs uppercase tracking-widest">Neural Profit:</span>
                  <span className="text-white font-black text-2xl">+{visualProfit.toFixed(4)} 🪙</span>
                </div>
                <div className="h-24 overflow-hidden text-green-500/60 text-[10px] leading-relaxed italic">
                  {tradeLogs.map((log,i) => <div key={i} className="mb-1">{log}</div>)}
                </div>
              </div>
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-4xl px-2 pb-20">
            {[
              { tier:'basic', cost:25000, rate:'2%', color:'cyan'   },
              { tier:'vvip',  cost:75000, rate:'5%', color:'yellow' },
            ].map(b => (
              <div key={b.tier} className={`p-10 rounded-[2.5rem] text-center border-2 transition-all ${botTier===b.tier?`border-${b.color}-500 bg-${b.color}-500/10`:'border-white/10 bg-white/5'}`}>
                <h3 className={`text-2xl font-black uppercase tracking-widest text-${b.color}-400`}>
                  {b.tier.toUpperCase()} ({b.cost/1000}k Coins)
                </h3>
                <p className="text-sm text-gray-400 mt-3 font-bold">Earn {b.rate} Daily Passive Income</p>
                <button onClick={() => activateBot(b.tier,b.cost)}
                  className={`mt-8 w-full py-5 rounded-2xl font-black uppercase tracking-widest transition-all shadow-xl hover:scale-105 ${botTier===b.tier?`bg-${b.color}-500 text-black cursor-not-allowed`:`bg-${b.color}-600 text-white`}`}>
                  {botTier===b.tier?"RUNNING":"ACTIVATE"}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* FOUNDER CARD */}
      <section className="py-20 bg-black flex justify-center px-4 border-y border-white/5">
        <img src="/founder_card.jpg" className="w-full max-w-4xl rounded-[3rem] shadow-[0_20px_60px_rgba(0,0,0,0.9)] hover:scale-[1.01] transition-all border border-white/5" alt="Founder"/>
      </section>

      {/* ── FOOTER ───────────────────────────────────────────── */}
      <footer className="bg-black py-24 px-10 border-t border-white/5 text-center flex flex-col items-center relative overflow-hidden">
        <div className="absolute inset-0 opacity-10 bg-[url('/logo.png')] bg-center bg-no-repeat bg-contain pointer-events-none scale-150"/>
        <div className="text-7xl md:text-[10rem] font-black italic text-cyan-400 drop-shadow-[0_0_50px_rgba(6,182,212,0.3)] mb-12 uppercase tracking-tighter relative z-10">AJ STUDIO</div>
        <div className="flex justify-center gap-4 md:gap-8 mb-12 relative z-10 flex-wrap">
          <a href={CEO_WHATSAPP} target="_blank" className="text-green-500 border-2 border-green-500 px-8 py-3 rounded-full font-black uppercase hover:bg-green-500 hover:text-black transition-all shadow-xl text-sm tracking-widest">WhatsApp</a>
          <a href="https://x.com/Ali20352061" target="_blank" className="text-white border-2 border-white px-8 py-3 rounded-full font-black uppercase hover:bg-white hover:text-black transition-all shadow-xl text-sm tracking-widest">X (Twitter)</a>
          <a href={`mailto:${CEO_EMAIL}`} className="flex items-center gap-2 text-red-400 border-2 border-red-400 px-8 py-3 rounded-full font-black uppercase hover:bg-red-400 hover:text-white transition-all shadow-xl text-sm tracking-widest">
            <Mail size={16}/> Email CEO
          </a>
        </div>
        <button onClick={() => { const l=document.createElement('a'); l.href='/aj-portal.apk'; l.download='aj-portal.apk'; l.click(); }}
          className="group relative px-16 py-6 bg-cyan-500 text-black font-black uppercase rounded-full shadow-[0_0_60px_#06b6d4] animate-pulse transition-all hover:scale-110 relative z-10 mb-16">
          <span className="relative z-20 flex items-center gap-3 font-black tracking-[0.4em] text-xl text-black">
            <Download size={28}/> Install AJ App
          </span>
          <div className="absolute inset-0 bg-white/30 group-hover:translate-x-full transition-transform duration-700 -skew-x-12 z-10"/>
        </button>
        <div className="mt-12 pt-12 border-t border-white/10 w-full relative z-10 text-center">
          <p className="text-[10px] md:text-xs text-cyan-400 font-black uppercase tracking-[0.4em] leading-relaxed max-w-3xl mx-auto drop-shadow-[0_0_8px_#06b6d4] animate-pulse">
            © 2026 AJ CREATOR STUDIO. All Rights Reserved.<br/>
            Unauthorized copying or distribution is strictly prohibited.
          </p>
        </div>
      </footer>

      {/* ── FLOATING AI ASSISTANT ────────────────────────────── */}
      <button onClick={() => setBotOpen(!botOpen)}
        className="fixed bottom-6 right-6 z-[900] w-16 h-16 bg-gradient-to-br from-cyan-500 to-green-500 rounded-full shadow-[0_0_30px_rgba(6,182,212,0.5)] flex items-center justify-center text-black hover:scale-110 transition-all active:scale-90 border-2 border-white/20">
        {botOpen?<X size={26}/>:<Bot size={26}/>}
      </button>
      {botOpen && (
        <div className="fixed bottom-24 right-6 z-[900] w-80 md:w-96 h-[480px] bg-[#0d1117] border border-cyan-500/30 rounded-[2.5rem] shadow-[0_0_50px_rgba(6,182,212,0.2)] flex flex-col overflow-hidden backdrop-blur-xl">
          <div className="bg-gradient-to-r from-cyan-600/30 to-green-600/30 p-5 border-b border-white/10 flex items-center gap-3">
            <div className="w-10 h-10 bg-cyan-500 rounded-full flex items-center justify-center border-2 border-cyan-300">
              <Bot size={22} className="text-black"/>
            </div>
            <div>
              <p className="font-black text-sm text-white uppercase tracking-widest">AJ AI Assistant</p>
              <p className="text-[8px] text-green-400 font-bold uppercase tracking-widest animate-pulse">CEO Representative • Online</p>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {botMessages.map((msg, i) => (
              <div key={i} className={`flex ${msg.from==='user'?'justify-end':'justify-start'}`}>
                <div className={`max-w-[85%] p-3 rounded-2xl text-[11px] leading-relaxed font-bold whitespace-pre-line ${msg.from==='user'?'bg-cyan-600 text-white rounded-tr-none':'bg-white/10 text-gray-200 rounded-tl-none border border-white/10'}`}>
                  {msg.text}
                  {msg.from==='bot' && msg.text.includes('CEO') && (
                    <a href={CEO_WHATSAPP} target="_blank" className="block mt-2 bg-green-500 text-black text-[10px] font-black uppercase px-3 py-2 rounded-xl text-center hover:bg-green-400 transition-all">
                      💬 Chat with CEO on WhatsApp
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
          <div className="p-4 border-t border-white/10 flex gap-3">
            <input type="text" value={botInput} onChange={e => setBotInput(e.target.value)}
              onKeyDown={e => e.key==='Enter'&&handleBotSend()} placeholder="Ask about Coins, Referral..."
              className="flex-1 bg-white/5 border border-white/10 rounded-full px-4 py-3 text-xs text-white outline-none focus:ring-1 focus:ring-cyan-500 font-bold"/>
            <button onClick={handleBotSend} className="bg-cyan-500 p-3 rounded-full text-black shadow-lg active:scale-90 transition-all">
              <Send size={16}/>
            </button>
          </div>
        </div>
      )}
    </main>
  );
}

// ============================================================
// MISSING LUCIDE IMPORT (Bell not in main import — added here)
// ============================================================
function Bell({ size, className }: { size:number; className?:string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24"
      fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      className={className}>
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
      <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
    </svg>
  );
}
