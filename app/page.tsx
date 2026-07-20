"use client";

export const dynamic = "force-dynamic";

import React, { useState, useEffect, useRef } from 'react';
import nextDynamic from 'next/dynamic';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth, GoogleAuthProvider, onAuthStateChanged, signOut, signInWithPopup } from 'firebase/auth';
import { doc, setDoc, onSnapshot, updateDoc, increment, collection, addDoc, getDoc, serverTimestamp, query, orderBy, limit, deleteDoc, getDocs } from 'firebase/firestore';
import { MessageCircle, Trophy, Zap, Bot, LogOut, ChevronRight, Send, X, Download, Video, Users, MessageSquare, Camera, Heart, Video as VideoIcon, Phone, Bell, ArrowLeft, Radio } from 'lucide-react';
import { ZegoService } from './components/ZegoService';

const Hub = nextDynamic(() => import('./components/Hub'), { ssr: false });
const TikReel = nextDynamic(() => import('./components/TikReel'), { ssr: false });
const AJPulse = nextDynamic(() => import('./components/AJPulse'), { ssr: false });
const Wallet = nextDynamic(() => import('./components/Wallet'), { ssr: false });

const firebaseConfig = {
  apiKey: "AIzaSyDp2od-lrfAhEHV5oAIqBW5rWjaRbnAdFM",
  authDomain: "aj-super-portal.firebaseapp.com",
  databaseURL: "https://aj-super-portal-default-rtdb.firebaseio.com",
  projectId: "aj-super-portal",
  storageBucket: "aj-super-portal.appspot.com",
  messagingSenderId: "288191292906",
  appId: "1:288191292906:web:bc31cb072948533f88fe93",
  measurementId: "G-8WYD1ZB96D"
};

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
const queryClient = new QueryClient();

export default function Page() {
  return (
    <QueryClientProvider client={queryClient}>
      <AJSuperPortal />
    </QueryClientProvider>
  );
}
export function AJSuperPortal() {
  // Navigation Screens
  const [screen, setScreen] = useState('splash');
  const [socialScreen, setSocialScreen] = useState('hub');
  const [selectedGame, setSelectedGame] = useState<string | null>(null);

  // Authenticated User & Economics
  const [user, setUser] = useState<any>(null);
  const [balance, setBalance] = useState(0);
  const [botTier, setBotTier] = useState('none');
  const [invested, setInvested] = useState(0);
  const [loading, setLoading] = useState(0);
  const [unauthorizedDomain, setUnauthorizedDomain] = useState<string | null>(null);

  // Profile data
  const [hasSocialProfile, setHasSocialProfile] = useState(false);
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [tempPhoto, setTempPhoto] = useState('');

  // AI Assistant states
  const [botOpen, setBotOpen] = useState(false);
  const [botMessages, setBotMessages] = useState<any[]>([
    {
      from: 'bot',
      text: "Hi! I am AJ AI Assistant 🤖. I'm here to provide A to Z details about AJ Super Portal — Coins, TikReels, Pulse, Live, Games, Wallet, Withdrawals & more. How can I assist you today?"
    }
  ]);
  const [botInput, setBotInput] = useState('');
  const isFirstBotMsg = useRef<boolean>(true);
  const lastBotTopicRef = useRef<string>('greeting');

  // Interactive Incoming Call state (WeChat calling invitation overlay)
  const [incomingCall, setIncomingCall] = useState<any | null>(null);

  // Live streamer & co-host link-up popup states
  const [joinRequests, setJoinRequests] = useState<any[]>([]);
  const [showRequestsPopup, setShowRequestsPopup] = useState(false);

  // Viewer live stream states
  const [joinRoomInput, setJoinRoomInput] = useState('');
  const [viewerRoom, setViewerRoom] = useState<any | null>(null);
  const [viewerRoomId, setViewerRoomId] = useState('');
  const [viewerChatMessages, setViewerChatMessages] = useState<any[]>([]);
  const [viewerChatInput, setViewerChatInput] = useState('');
  const viewerChatEndRef = useRef<HTMLDivElement>(null);

  // VVIP notifications list
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifPanel, setShowNotifPanel] = useState(false);

  // Global Alert Notification Overlay
  const [vvipAlert, setVvipAlert] = useState<{ msg: string; icon?: string } | null>(null);

  // WeChat contact lists
  const [wechatContacts, setWechatContacts] = useState<string[]>([]);
  const [addContactOpen, setAddContactOpen] = useState(false);
  const [newContact, setNewContact] = useState('');
  const [activeContact, setActiveContact] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');

  // Active Live state
  const [liveActive, setLiveActive] = useState(false);
  const [liveRoomId, setLiveRoomId] = useState('');
  const [cameraReady, setCameraReady] = useState(false);
  const liveVideoRef = useRef<HTMLVideoElement>(null);
  const liveStreamRef = useRef<MediaStream | null>(null);

  // Live Viewers counter state
  const [liveViewerCount, setLiveViewerCount] = useState(1);

  // PK State variables
  const [pkChallengeOpen, setPkChallengeOpen] = useState(false);
  const [pkTargetId, setPkTargetId] = useState('');
  const [pkActive, setPkActive] = useState(false);
  const [pkTimer, setPkTimer] = useState(300);
  const [pkScore, setPkScore] = useState({ me: 0, rival: 0 });
  const [pkWinner, setPkWinner] = useState<string | null>(null);
  const [pkRivalData, setPkRivalData] = useState<any | null>(null);

  // AI Passive Earning Ticker
  const [visualProfit, setVisualProfit] = useState(0);

  // HTML Game Bridge (0.010 coins rewarded per score)
  useEffect(() => {
    if (!user) return;
    const handleGameRewardMessage = async (e: MessageEvent) => {
      if (!e.data || e.data.type !== 'GAME_SCORE') return;
      const score = Number(e.data.score);
      if (isNaN(score) || score <= 0) return;

      const coinsEarned = score * 0.010;
      try {
        await updateDoc(doc(db, 'users', user.uid), {
          balance: increment(coinsEarned)
        });
        await addDoc(collection(db, 'notifications'), {
          title: '🎮 Gaming Reward!',
          message: `You earned +${coinsEarned.toFixed(2)} AJ Coins in Gaming Zone!`,
          createdAt: serverTimestamp()
        });
        setVvipAlert({ msg: `🎮 Gaming Reward: +${coinsEarned.toFixed(2)} AJ Coins added!`, icon: '🪙' });
      } catch (err) {
        console.error('Game Coin Bridge error:', err);
      }
    };
    window.addEventListener('message', handleGameRewardMessage);
    return () => window.removeEventListener('message', handleGameRewardMessage);
  }, [user]);

  // Auth synchronization listener
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (cu) => {
      if (cu) {
        setUser(cu);
        const userRef = doc(db, 'users', cu.uid);
        const snap = await getDoc(userRef);

        if (snap.exists()) {
          const d = snap.data();
          setHasSocialProfile(d.hasSocialProfile ?? true);
          setUsername(d.username || '');
          setBio(d.bio || '');
          setTempPhoto(d.photo || cu.photoURL || '');
        } else {
          // Initialize missing fields to Number 0 in Firestore (Self-Healing)
          await setDoc(userRef, {
            name: cu.displayName,
            email: cu.email,
            balance: 500, // +500 Coins welcome bonus
            botTier: 'none',
            invested: 0,
            uid: cu.uid,
            hasSocialProfile: true,
            photo: cu.photoURL || '',
            followersCount: 0,
            followingCount: 0,
            postsCount: 0,
            totalLikes: 0,
            status: 'online',
            createdAt: serverTimestamp()
          });
          setHasSocialProfile(true);
          setVvipAlert({ msg: '🎉 Welcome to AJ Super Portal! +500 AJ Coins added as Signup bonus!', icon: '🪙' });
        }

        // Live balance update listener
        onSnapshot(userRef, (s) => {
          if (s.exists()) {
            setBalance(s.data().balance || 0);
            setBotTier(s.data().botTier || 'none');
            setInvested(s.data().invested || 0);
          }
        });

         // Initialize Zego User ID mapping
if (typeof window !== 'undefined') {
  const zego = ZegoService.getInstance();
  await zego.initializeUser(cu.uid, cu.displayName || 'AJ Member');

  // Listen for WeChat Incoming calls
  zego.listenForIncomingCalls(cu.uid, (callData) => {
    setIncomingCall(callData);
    // Play a simulated call invitation tone if needed
    setVvipAlert({ msg: `📞 Incoming Call from ${callData.callerName || 'Anonymous'}!`, icon: '🔔' });
  });
}
        

        setScreen('hub');
      } else {
        setUser(null);
        setScreen('auth');
      }
    });
    return () => unsub();
  }, []);

  // AI Bots passive profits calculator ticker running 24/7
  useEffect(() => {
    if (!user || botTier === 'none' || invested <= 0) return;
    const yieldRate = botTier === 'vvip' ? 0.05 : 0.02; // Basic = 2%, VVIP = 5% daily passive returns
    const perSec = (invested * yieldRate) / 86400;

    const ticker = setInterval(() => {
      setVisualProfit(p => p + perSec);
    }, 1000);

    return () => clearInterval(ticker);
  }, [user, botTier, invested]);

  // Synchronize WeChat messages
  useEffect(() => {
    if (socialScreen === 'chat' && activeContact) {
      const q = query(collection(db, 'global_chat'), orderBy('createdAt', 'desc'), limit(45));
      const unsub = onSnapshot(q, (snap) => {
        setChatMessages(snap.docs.map(d => ({ id: d.id, ...d.data() })).reverse());
      });
      return unsub;
    }
    return () => {};
  }, [socialScreen, activeContact]);

  // Sync VVIP global notifications panel
  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'notifications'), orderBy('createdAt', 'desc'), limit(15));
    const unsub = onSnapshot(q, (snap) => {
      const items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setNotifications(items);
      setUnreadCount(items.length);
    });
    return unsub;
  }, [user]);

  // Sync WeChat Contact roster
  useEffect(() => {
    if (!user) return;
    const unsub = onSnapshot(collection(db, 'users', user.uid, 'wechat_contacts'), (snap) => {
      setWechatContacts(snap.docs.map(d => d.data().name as string));
    });
    return unsub;
  }, [user]);

  // Splash timeout
  useEffect(() => {
    if (screen === 'splash') {
      const loadingVal = setInterval(() => setLoading(p => Math.min(100, p + 10)), 70);
      const splashTm = setTimeout(() => {
        if (auth.currentUser) setScreen('hub'); else setScreen('auth');
      }, 1200);
      return () => { clearInterval(loadingVal); clearTimeout(splashTm); };
    }
  }, [screen]);

  // Live co-hosting Link requests listener
  useEffect(() => {
    if (!liveActive || !liveRoomId) return;
    const zego = ZegoService.getInstance();
    const unsub = zego.listenForJoinRequests(liveRoomId, (requests) => {
      const pending = requests.filter(r => r.status === 'pending');
      setJoinRequests(pending);
      if (pending.length > 0) {
        setShowRequestsPopup(true);
      }
    });
    return unsub;
  }, [liveActive, liveRoomId]);

  // GO LIVE capture & start stream
  const triggerGoLive = async () => {
    if (!user) return;
    const roomId = `room_${user.uid}_${Date.now()}`;
    setLiveRoomId(roomId);
    setLiveActive(true);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      liveStreamRef.current = stream;
      setCameraReady(true);
      if (liveVideoRef.current) {
        liveVideoRef.current.srcObject = stream;
        liveVideoRef.current.play();
      }

      // Initialize Zego Express Room
      const zego = ZegoService.getInstance();
      await zego.joinRoom(roomId, user.uid, username || 'AJ Streamer', true);

      // Listen for viewer updates
      zego.setViewerCountListener((count) => {
        setLiveViewerCount(count);
      });

      // Save live room directory
      await setDoc(doc(db, 'live_rooms', roomId), {
        uid: user.uid,
        username: username || 'AJ_Member',
        photo: tempPhoto || user.photoURL || '/logo.png',
        roomId,
        startedAt: serverTimestamp(),
        active: true,
        lastSeenMs: Date.now()
      });

      // Maintain active keep alive ping
      const heartbeat = setInterval(async () => {
        try {
          await updateDoc(doc(db, 'live_rooms', roomId), { lastSeenMs: Date.now() });
        } catch {}
      }, 10000);
      (liveStreamRef as any)._heartbeat = heartbeat;

    } catch {
      setVvipAlert({ msg: 'Camera/Mic permission is required to stream live.' });
      setCameraReady(false);
      setLiveActive(false);
    }
  };

  const endLiveStream = async () => {
    if ((liveStreamRef as any)._heartbeat) {
      clearInterval((liveStreamRef as any)._heartbeat);
    }
    if (liveStreamRef.current) {
      liveStreamRef.current.getTracks().forEach(t => t.stop());
    }
    const zego = ZegoService.getInstance();
    await zego.leaveRoom();

    setLiveActive(false);
    setCameraReady(false);
    if (liveRoomId) {
      try {
        await deleteDoc(doc(db, 'live_rooms', liveRoomId));
      } catch {}
    }
  };

  const joinLiveByRoomId = async (rid?: string) => {
    const targetRoomId = (rid || joinRoomInput).trim();
    if (!targetRoomId) return setVvipAlert({ msg: 'Please provide a valid Room ID to join.' });

    try {
      setVvipAlert({ msg: '📡 Synchronizing co-hosting parameters...' });
      const snap = await getDoc(doc(db, 'live_rooms', targetRoomId));
      if (!snap.exists()) {
        return setVvipAlert({ msg: 'Broadcasting room has ended or does not exist.' });
      }

      setViewerRoom(snap.data());
      setViewerRoomId(targetRoomId);
      setScreen('social');
      setSocialScreen('hub');

      // Join Zego Room as viewer
      const zego = ZegoService.getInstance();
      await zego.joinRoom(targetRoomId, user.uid, username || 'AJ Viewer', false);

      // Listen to real-time eye (👁️) viewer listener updates
      zego.setViewerCountListener((count) => {
        setLiveViewerCount(count);
      });

      // Synchronize stream comments
      onSnapshot(query(collection(db, 'live_rooms', targetRoomId, 'messages'), orderBy('createdAt', 'asc')), (snap) => {
        setViewerChatMessages(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        setTimeout(() => viewerChatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 60);
      });

    } catch {
      setVvipAlert({ msg: 'Streaming join handshaking error.' });
    }
  };

  const sendViewerChatMessage = async () => {
    if (!viewerChatInput.trim() || !viewerRoomId) return;
    try {
      await addDoc(collection(db, 'live_rooms', viewerRoomId, 'messages'), {
        uid: user.uid,
        username: username || 'AJ Member',
        photo: tempPhoto || user.photoURL || '/logo.png',
        text: viewerChatInput.trim(),
        createdAt: serverTimestamp()
      });
      setViewerChatInput('');
    } catch {}
  };

  const exitViewerRoom = async () => {
    const zego = ZegoService.getInstance();
    await zego.leaveRoom();
    setViewerRoom(null);
    setViewerRoomId('');
    setViewerChatMessages([]);
  };

  // Google Provider authentication
  const handleGoogleLogin = async () => {
    try {
      googleProvider.setCustomParameters({ prompt: 'select_account' });
      await signInWithPopup(auth, googleProvider);
    } catch (e: any) {
      console.error(e);
      const errMsg = e?.message || '';
      const errCode = e?.code || '';
      if (errCode === 'auth/unauthorized-domain' || errMsg.includes('unauthorized-domain')) {
        setUnauthorizedDomain(window.location.hostname);
      } else {
        setVvipAlert({ msg: 'Sign in failed. Ensure popups are allowed.' });
      }
    }
  };

  // WeChat contact adding
  const addWechatContact = async () => {
    if (!newContact.trim()) return;
    try {
      await addDoc(collection(db, 'users', user.uid, 'wechat_contacts'), {
        name: newContact.trim(),
        createdAt: serverTimestamp()
      });
      setNewContact('');
      setAddContactOpen(false);
      setVvipAlert({ msg: '✅ Contact successfully saved to list!', icon: '✨' });
    } catch {}
  };

  const sendChatMessage = async () => {
    if (!newMessage.trim()) return;
    try {
      await addDoc(collection(db, 'global_chat'), {
        text: newMessage.trim(),
        uid: user.uid,
        username: username || 'AJ_Member',
        photo: tempPhoto || user.photoURL || '/logo.png',
        createdAt: serverTimestamp()
      });
      setNewMessage('');
    } catch {}
  };

  // Self-Healing Profile initializer to auto-setup missing stats
  const openProfile = async (uid: string) => {
    setScreen('social');
    setSocialScreen('profile');
    try {
      const snap = await getDoc(doc(db, 'users', uid));
      if (!snap.exists()) {
        // Self-Healing: Instantly write safe default values if the user's document is somehow missing
        await setDoc(doc(db, 'users', uid), {
          username: 'AJ Member',
          bio: 'Verification active.',
          photo: '/logo.png',
          postsCount: 0,
          followersCount: 0,
          followingCount: 0,
          totalLikes: 0,
          status: 'online'
        });
      }
    } catch {}
  };

  // Language Detection & A to Z Bot response logic
  const handleBotSend = () => {
    if (!botInput.trim()) return;
    const input = botInput.trim();
    setBotMessages(prev => [...prev, { from: 'user', text: input }]);
    setBotInput('');

    // Detect if Arabic, Hinglish, Urdu, etc.
    const isArabic = /[\u0600-\u06FF]/.test(input);
    const isHinglish = /\b(bhai|dost|kaise|nikalu|paisa|coins|karo|batao|kamao)\b/i.test(input);

    setTimeout(() => {
      let reply = "I can guide you on Coins, TikTok, WeChat, Live co-hosting, and passive AI Bots. Ask me anything!";
      if (isArabic) {
        reply = "أهلاً بك! أنا المساعد الذكي لبوابة AJ. يمكنني إرشادك لكسب الكوينز، تفعيل روبوتات التداول، وسحب الأرباح بسهولة عبر بايننس أو التحويل البنكي العماني.";
      } else if (isHinglish) {
        reply = "Bhai, AJ Portal pe coins kamana bohot aasan hai! TikReel pe video daalne ka +10 Coins aur Pulse pe Photo ka +5 Coins milta hai. Withdraw karne ke liye Wallet pe jao, minimum 10,000 Coins ($20) chahiye.";
      } else {
        reply = "Our automated ecosystem rewards you with AJ Coins for interactions. Short Videos earn +10 Coins while Photos earn +5 Coins. Withdrawal minimum limit is 10,000 Coins ($20 USD) processed securely.";
      }
      setBotMessages(prev => [...prev, { from: 'bot', text: reply }]);
    }, 700);
  };

  // Zego Call invitation response handlers
  const handleAcceptCall = async () => {
    if (!incomingCall) return;
    const zego = ZegoService.getInstance();
    await zego.acceptCallInvitation(incomingCall.callId);
    setIncomingCall(null);
    setVvipAlert({ msg: '🎥 Connecting call over Agora/WebRTC infrastructure...', icon: '🚀' });
  };

  const handleDeclineCall = async () => {
    if (!incomingCall) return;
    const zego = ZegoService.getInstance();
    await zego.declineCallInvitation(incomingCall.callId);
    setIncomingCall(null);
    setVvipAlert({ msg: 'Call invitation declined.' });
  };

  if (screen === 'splash') {
    return (
      <main className="h-screen bg-[#050505] flex flex-col items-center justify-center text-white text-center">
        <div className="w-36 h-36 bg-[#050505] rounded-full border-4 border-cyan-500 shadow-[0_0_50px_#06b6d4] overflow-hidden mb-6 flex items-center justify-center">
          <span className="text-cyan-500 text-6xl font-black italic">AJ</span>
        </div>
        <h1 className="text-2xl font-black tracking-[0.25em] uppercase animate-pulse">AJ SUPER PORTAL</h1>
        <p className="text-[10px] text-gray-500 uppercase tracking-widest mt-2">Connecting Oman's Leading Earners</p>
      </main>
    );
  }

  if (screen === 'auth') {
    return (
      <main className="min-h-screen bg-[#050505] flex flex-col items-center justify-center p-6 text-white text-center">
        <div className="w-full max-w-sm bg-white/[0.02] border border-white/10 p-12 rounded-[2.5rem] shadow-2xl relative overflow-hidden">
          <div className="absolute -top-12 -left-12 w-44 h-44 bg-pink-500/10 rounded-full blur-3xl" />
          <div className="absolute -bottom-12 -right-12 w-44 h-44 bg-cyan-500/10 rounded-full blur-3xl" />

          <h2 className="text-5xl font-black mb-8 italic text-cyan-400 uppercase tracking-tighter">AJ <span className="text-white">ID</span></h2>
          <p className="text-xs text-gray-400 uppercase tracking-widest font-bold mb-10 leading-relaxed">
            One single decentralized credentials account. Security enabled.
          </p>

          <button onClick={handleGoogleLogin} className="w-full py-4 bg-white text-black font-black text-xs tracking-widest rounded-2xl transition-all shadow-xl hover:scale-105">
            LOG IN WITH GOOGLE ID
          </button>

          {unauthorizedDomain && (
            <div className="mt-6 p-4 bg-red-950/40 border border-red-500/30 rounded-2xl text-left space-y-2.5">
              <div className="flex items-center gap-2 text-red-400 font-bold text-[10px] uppercase tracking-wider">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                Domain Whitelist Required
              </div>
              <p className="text-[10px] text-gray-300 leading-relaxed">
                This environment runs on a preview domain that needs to be registered under your Firebase authorized domains list.
              </p>
              <div className="bg-black/50 p-2 rounded-lg font-mono text-[9px] text-cyan-400 break-all select-all border border-white/5">
                {unauthorizedDomain}
              </div>
              <p className="text-[9px] text-gray-400 leading-normal">
                <strong>Fix:</strong> Go to <strong>Firebase Console</strong> &rarr; <strong>Authentication</strong> &rarr; <strong>Settings</strong> &rarr; <strong>Authorized domains</strong>, then add the domain above.
              </p>
            </div>
          )}

          <p className="mt-8 text-yellow-500 font-black text-[10px] tracking-widest uppercase animate-pulse">
            +500 Coins welcome bonus applied on register!
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#020617] text-white font-sans overflow-x-hidden relative pb-16">
      {/* VVIP Neon Alert Modals */}
      {vvipAlert && (
        <div className="fixed inset-0 z-[9999] flex items-end justify-center pb-12 px-4 pointer-events-none">
          <div className="pointer-events-auto w-full max-w-sm rounded-3xl p-5 border border-pink-500/40 bg-slate-950/98 shadow-[0_0_50px_rgba(236,72,153,0.3)] text-center space-y-4">
            {vvipAlert.icon && <div className="text-4xl">{vvipAlert.icon}</div>}
            <p className="text-white font-black text-xs leading-relaxed uppercase tracking-wide">{vvipAlert.msg}</p>
            <button onClick={() => setVvipAlert(null)} className="px-6 py-2 bg-gradient-to-r from-pink-500 to-purple-500 text-white font-black text-[10px] uppercase rounded-full">OK</button>
          </div>
        </div>
      )}

      {/* WECHAT CALLING - INCOMING CALL OVERLAY */}
      {incomingCall && (
        <div className="fixed inset-0 z-[9999] bg-[#050505]/95 flex flex-col justify-center items-center text-center p-6">
          <div className="w-24 h-24 rounded-full bg-cyan-500/20 border-2 border-cyan-400 flex items-center justify-center mb-6 animate-pulse">
            {incomingCall.type === 'video' ? <VideoIcon size={44} className="text-cyan-400" /> : <Phone size={44} className="text-cyan-400" />}
          </div>
          <h2 className="text-2xl font-black uppercase text-white tracking-widest">Incoming {incomingCall.type} Call</h2>
          <p className="text-gray-400 text-xs font-bold uppercase mt-2">From: @{incomingCall.callerName || 'AJ Member'}</p>
          <p className="text-[10px] text-cyan-400 tracking-[0.25em] animate-pulse uppercase mt-8">Ringtone playing...</p>

          <div className="flex gap-4 mt-16 w-full max-w-xs">
            <button onClick={handleAcceptCall} className="flex-1 py-4 bg-green-500 text-black font-black text-xs uppercase tracking-widest rounded-2xl hover:scale-105 transition-transform shadow-lg">
              Accept Call
            </button>
            <button onClick={handleDeclineCall} className="flex-1 py-4 bg-red-600 text-white font-black text-xs uppercase tracking-widest rounded-2xl hover:scale-105 transition-transform shadow-lg">
              Decline
            </button>
          </div>
        </div>
      )}

      {/* CO-HOST LINK-UP HOST APPROVAL POPUP */}
      {showRequestsPopup && joinRequests.length > 0 && (
        <div className="fixed inset-0 z-[9998] bg-black/60 flex items-center justify-center p-6">
          <div className="bg-slate-900 border border-red-500/30 p-6 rounded-3xl text-center max-w-xs w-full space-y-4 shadow-2xl">
            <Radio className="text-red-500 mx-auto animate-pulse" size={32} />
            <h3 className="font-black text-xs text-white uppercase tracking-widest">Co-Host Request</h3>
            <p className="text-[10px] text-gray-400 leading-relaxed font-bold">
              @{joinRequests[0].username} is requesting to join your stream in a co-host split-screen window.
            </p>
            <div className="flex gap-2">
              <button
                onClick={async () => {
                  const zego = ZegoService.getInstance();
                  await zego.approveGuestRequest(liveRoomId, joinRequests[0].uid);
                  setShowRequestsPopup(false);
                  setVvipAlert({ msg: 'Approved! Rendering WebRTC Split Screen.' });
                }}
                className="flex-1 py-2.5 bg-green-500 text-black text-[10px] font-black uppercase rounded-xl"
              >
                Approve
              </button>
              <button
                onClick={async () => {
                  const zego = ZegoService.getInstance();
                  await zego.declineGuestRequest(liveRoomId, joinRequests[0].uid);
                  setShowRequestsPopup(false);
                }}
                className="flex-1 py-2.5 bg-white/5 border border-white/10 text-white text-[10px] font-black uppercase rounded-xl"
              >
                Decline
              </button>
            </div>
          </div>
        </div>
      )}

      {/* HEADER BANNER */}
      <header className="fixed top-0 w-full p-4 flex justify-between items-center z-[100] bg-[#050505]/85 backdrop-blur-xl border-b border-white/5">
        <span className="text-lg font-black italic tracking-wider text-cyan-400">AJ PORTAL</span>
        <div className="flex items-center gap-3">
          <div onClick={() => setShowNotifPanel(!showNotifPanel)} className="relative cursor-pointer">
            <Bell size={20} className="text-pink-400 hover:scale-115 transition-transform" />
            {unreadCount > 0 && <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[8px] rounded-full w-4 h-4 flex items-center justify-center font-black animate-pulse">!</span>}
          </div>

          <div onClick={() => setScreen('wallet')} className="flex items-center gap-2.5 bg-white/5 px-3 py-1.5 rounded-full border border-white/10 cursor-pointer">
            <span className="text-yellow-500 text-xs font-black">{balance.toFixed(1)} 🪙</span>
            {user && <img src={tempPhoto || user.photoURL || '/logo.png'} className="w-6 h-6 rounded-full border border-cyan-400 object-cover" />}
          </div>
        </div>
      </header>

      {/* NOTIFICATION OVERLAY */}
      {showNotifPanel && (
        <div className="fixed top-16 right-4 w-72 bg-slate-900 border border-white/10 rounded-2xl p-4 z-[200] max-h-96 overflow-y-auto shadow-2xl backdrop-blur-md">
          <div className="flex justify-between items-center mb-3">
            <span className="text-[10px] font-black uppercase text-pink-400 tracking-wider">Alert Logs</span>
            <X size={14} className="text-gray-500 cursor-pointer" onClick={() => setShowNotifPanel(false)} />
          </div>
          {notifications.map(n => (
            <div key={n.id} className="p-2.5 bg-white/5 rounded-xl border border-white/5 mb-2">
              <p className="text-[10px] font-black text-white">{n.title}</p>
              <p className="text-[9px] text-gray-400 mt-0.5">{n.message}</p>
            </div>
          ))}
          {notifications.length === 0 && <p className="text-[10px] text-gray-500 text-center py-4">No alert logs found.</p>}
        </div>
      )}

      {/* SCREEN ROUTING RENDERING */}
      {screen === 'hub' && (
        <Hub
          user={user}
          username={username}
          tempPhoto={tempPhoto}
          balance={balance}
          setVvipAlert={setVvipAlert}
          setScreen={setScreen}
          setSocialScreen={setSocialScreen}
          startLive={triggerGoLive}
          joinLiveByRoomId={joinLiveByRoomId}
          joinRoomInput={joinRoomInput}
          setJoinRoomInput={setJoinRoomInput}
          botOpen={botOpen}
          setBotOpen={setBotOpen}
          botMessages={botMessages}
          botInput={botInput}
          setBotInput={setBotInput}
          handleBotSend={handleBotSend}
        />
      )}

      {screen === 'social' && (
        <div className="flex flex-col h-[85vh] pt-14">
          <div className="sticky top-14 bg-slate-950 p-2 border-b border-white/10 shrink-0 z-40">
            <div className="flex gap-1.5 w-full">
              <button onClick={() => setSocialScreen('hub')} className={`flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${socialScreen === 'hub' ? 'bg-pink-600 text-white shadow-md' : 'text-gray-400 hover:text-white'}`}>🏠 Social</button>
              <button onClick={() => setSocialScreen('tikreels')} className={`flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${socialScreen === 'tikreels' ? 'bg-pink-600 text-white shadow-md' : 'text-gray-400 hover:text-white'}`}>🎬 Reels</button>
              <button onClick={() => setSocialScreen('pulse')} className={`flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${socialScreen === 'pulse' ? 'bg-pink-600 text-white shadow-md' : 'text-gray-400 hover:text-white'}`}>📡 Pulse</button>
              <button onClick={() => setSocialScreen('chatlist')} className={`flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${socialScreen === 'chatlist' ? 'bg-pink-600 text-white shadow-md' : 'text-gray-400 hover:text-white'}`}>💬 Chat</button>
            </div>
          </div>

          <div className="flex-1">
            {socialScreen === 'hub' && (
              <div className="p-6 space-y-6 max-w-sm mx-auto text-center">
                <div className="flex flex-col items-center p-6 bg-white/5 border border-pink-500/20 rounded-3xl shadow-xl">
                  <img src={tempPhoto || '/logo.png'} className="w-16 h-16 rounded-full border-2 border-pink-500 object-cover" />
                  <h3 className="font-black text-sm text-white uppercase tracking-widest mt-3">@{username || 'AJ_Member'}</h3>
                  <button onClick={() => setSocialScreen('setup')} className="mt-4 px-5 py-1.5 bg-pink-600 text-white text-[10px] font-black uppercase tracking-widest rounded-full">
                    Setup Identity Profile
                  </button>
                </div>

                <button onClick={triggerGoLive} className="w-full py-4 bg-red-600 text-white font-black text-xs uppercase tracking-widest rounded-2xl shadow-xl hover:scale-105 transition-all">
                  🔴 Broadcast Live Room
                </button>
              </div>
            )}

            {socialScreen === 'tikreels' && (
              <TikReel
                user={user}
                username={username}
                tempPhoto={tempPhoto}
                balance={balance}
                setVvipAlert={setVvipAlert}
                openProfile={openProfile}
                setScreen={setScreen}
                startLive={triggerGoLive}
                setSocialScreen={setSocialScreen}
              />
            )}

            {socialScreen === 'pulse' && (
              <AJPulse
                user={user}
                username={username}
                tempPhoto={tempPhoto}
                balance={balance}
                setVvipAlert={setVvipAlert}
                openProfile={openProfile}
              />
            )}

            {socialScreen === 'chatlist' && (
              <div className="max-w-md mx-auto p-4 space-y-4">
                <div className="flex justify-between items-center bg-white/5 p-4 rounded-2xl border border-white/10">
                  <span className="text-xs font-black uppercase text-cyan-400 tracking-wider">WeChat Messaging list</span>
                  <button onClick={() => setAddContactOpen(true)} className="text-[10px] font-black text-cyan-400 uppercase bg-cyan-500/10 px-3 py-1 rounded-xl">Add Contact</button>
                </div>

                {addContactOpen && (
                  <div className="p-4 bg-white/5 border border-white/10 rounded-2xl space-y-3">
                    <p className="text-[9px] font-black text-gray-400 uppercase">Save manual contact ID</p>
                    <input type="text" value={newContact} onChange={e => setNewContact(e.target.value)} placeholder="Type contact username"
                      className="w-full bg-black/60 p-3 rounded-xl border border-white/10 text-xs font-bold" />
                    <button onClick={addWechatContact} className="w-full py-2 bg-cyan-500 text-black font-black text-[10px] uppercase rounded-xl">Save</button>
                  </div>
                )}

                <div className="space-y-2">
                  {wechatContacts.map((c, i) => (
                    <div key={i} onClick={() => { setActiveContact(c); setSocialScreen('chat'); }}
                      className="p-4 bg-white/[0.02] border border-white/5 rounded-2xl cursor-pointer hover:border-cyan-500 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center font-black text-sm border border-cyan-500/40">
                        {c[0].toUpperCase()}
                      </div>
                      <span className="font-black text-xs uppercase tracking-wider text-[#e9edef]">{c}</span>
                    </div>
                  ))}
                  {wechatContacts.length === 0 && <p className="text-[10px] text-gray-500 text-center py-6">Your contact roster is currently empty.</p>}
                </div>
              </div>
            )}

            {socialScreen === 'chat' && (
              <div className="max-w-md mx-auto h-[70vh] flex flex-col bg-[#0b141a] rounded-[2.5rem] overflow-hidden border border-cyan-500/20">
                <div className="p-4 bg-[#1f2c33] flex justify-between items-center border-b border-white/5">
                  <button onClick={() => setSocialScreen('chatlist')} className="text-cyan-400 font-bold text-xs uppercase">Back</button>
                  <span className="font-black text-xs uppercase text-white tracking-widest">{activeContact}</span>
                  <div className="flex gap-3 text-gray-400">
                    <button onClick={() => setVvipAlert({ msg: '📹 Dialing WebRTC/Agora HD Video stream...' })}><VideoIcon size={16} /></button>
                    <button onClick={() => setVvipAlert({ msg: '📞 Initializing WebRTC invitation signal...' })}><Phone size={16} /></button>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {chatMessages.map(m => (
                    <div key={m.id} className={`flex ${m.uid === user?.uid ? 'justify-end' : 'justify-start'}`}>
                      <div className={`p-3 rounded-2xl max-w-[80%] border ${m.uid === user?.uid ? 'bg-cyan-700/80 border-cyan-500 rounded-tr-none' : 'bg-[#202c33]/90 border-white/5 rounded-tl-none'}`}>
                        <p className="text-[8px] font-black text-yellow-500 uppercase">@{m.username}</p>
                        <p className="text-xs text-white font-medium mt-0.5">{m.text}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="p-3 bg-[#1f2c33] flex gap-2">
                  <input type="text" value={newMessage} onChange={e => setNewMessage(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendChatMessage()}
                    placeholder="Type message securely..." className="flex-1 bg-[#2a3942] rounded-full px-4 py-2.5 text-xs text-white" />
                  <button onClick={sendChatMessage} className="bg-cyan-500 p-2.5 rounded-full text-black"><Send size={14} /></button>
                </div>
              </div>
            )}

            {socialScreen === 'setup' && (
              <div className="max-w-md mx-auto p-6 space-y-4">
                <h3 className="font-black text-xs uppercase text-pink-500 tracking-wider">Configure Profile details</h3>
                <input type="text" value={username} onChange={e => setUsername(e.target.value)} placeholder="Type visual username"
                  className="w-full bg-white/5 border border-white/10 p-3.5 rounded-xl text-xs font-bold text-white outline-none focus:border-pink-500" />
                <textarea value={bio} onChange={e => setBio(e.target.value)} placeholder="Type lifestyle bio details"
                  className="w-full bg-white/5 border border-white/10 p-3.5 rounded-xl text-xs font-bold text-white outline-none focus:border-pink-500 h-24" />
                <button
                  onClick={async () => {
                    await updateDoc(doc(db, 'users', user.uid), { username: username.toLowerCase().trim(), bio, hasSocialProfile: true });
                    setSocialScreen('hub');
                    setVvipAlert({ msg: 'Profile updated successfully!' });
                  }}
                  className="w-full py-4 bg-pink-600 rounded-xl font-black uppercase text-xs text-white"
                >
                  Save Profile Settings
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {screen === 'arcade' && (
        <div className="p-6 max-w-2xl mx-auto space-y-6 pt-20">
          <button onClick={() => setScreen('hub')} className="text-cyan-400 font-bold uppercase tracking-widest flex items-center gap-1 text-xs mb-4">
            <ArrowLeft size={14} /> Back
          </button>

          {!selectedGame ? (
            <div className="space-y-6">
              <h2 className="text-3xl font-black text-center uppercase bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent tracking-tight">Oman Play-to-Earn Arena</h2>
              <p className="text-center text-[10px] text-gray-500 uppercase font-black tracking-widest leading-relaxed">Play core HTML5 modules to multiply coins. Earn +0.010 coins per point.</p>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {['Rider King', 'Pulse Racer', 'Subsea Surge', 'Neon Strike', 'Volcano Escape'].map(g => (
                  <div key={g} onClick={() => setSelectedGame(g)}
                    className="p-4 bg-white/5 border border-white/10 rounded-2xl hover:border-cyan-400 cursor-pointer text-center space-y-3">
                    <div className="w-12 h-12 bg-cyan-500/20 rounded-full flex items-center justify-center mx-auto text-cyan-400">🎮</div>
                    <h4 className="font-black text-xs uppercase tracking-wide">{g}</h4>
                    <button className="w-full py-2 bg-cyan-500 text-black font-black text-[10px] uppercase rounded-xl">Play</button>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="h-[75vh] w-full bg-black rounded-3xl border border-cyan-500/30 overflow-hidden flex flex-col relative">
              <div className="p-3.5 bg-slate-900 flex justify-between items-center border-b border-white/10 shrink-0">
                <span className="font-black text-xs uppercase text-white tracking-wider">{selectedGame}</span>
                <button onClick={() => setSelectedGame(null)} className="text-cyan-400 font-black text-[10px] uppercase">Quit Game</button>
              </div>
              {/* Core IFrame bridge mapping */}
              <iframe src={`/games/${selectedGame.toLowerCase().replace(/ /g, '-')}/index.html`} className="flex-1 w-full border-none" />
            </div>
          )}
        </div>
      )}

      {screen === 'wallet' && (
        <div className="pt-20">
          <Wallet
            user={user}
            balance={balance}
            setVvipAlert={setVvipAlert}
            setScreen={setScreen}
          />
        </div>
      )}

      {screen === 'ai' && (
        <div className="p-6 max-w-2xl mx-auto space-y-6 pt-20">
          <button onClick={() => setScreen('hub')} className="text-green-400 font-bold uppercase tracking-widest flex items-center gap-1 text-xs mb-4">
            <ArrowLeft size={14} /> Back
          </button>

          <h2 className="text-3xl font-black text-center uppercase bg-gradient-to-r from-green-400 to-emerald-500 bg-clip-text text-transparent">AI TRADING BOT</h2>
          <p className="text-center text-[10px] text-gray-500 uppercase font-black tracking-widest leading-relaxed">24/7 Automated passive currency trading logs. Earn 2-5% daily returns.</p>

          {botTier !== 'none' && (
            <div className="p-6 bg-white/[0.02] border border-green-500/40 rounded-3xl text-left space-y-4 shadow-xl">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-black uppercase text-green-400">Total Accumulating Profit</span>
                <span className="text-white font-mono font-black text-lg">+{visualProfit.toFixed(5)} 🪙</span>
              </div>
              <div className="h-20 bg-black/60 p-3 rounded-xl border border-white/5 font-mono text-[9px] text-green-500/60 leading-relaxed overflow-hidden">
                - Establishing Neural network parameters...<br />
                - Scanning Muscat localized liquidity indexes...<br />
                - Core server synchronized. Auto passive reward ticker generating.
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { tier: 'basic', cost: 25000, rate: '2%', desc: 'Starter active trader. 2% daily yield.' },
              { tier: 'vvip', cost: 75000, rate: '5%', desc: 'Elite high-frequency trading. 5% daily yield.' }
            ].map(b => (
              <div key={b.tier} className="p-6 bg-white/5 border border-white/10 rounded-2xl space-y-4">
                <h4 className="font-black text-sm uppercase text-white">{b.tier} BOT ({b.cost.toLocaleString()} 🪙)</h4>
                <p className="text-[10px] text-gray-400 font-bold leading-relaxed">{b.desc}</p>
                <button
                  onClick={async () => {
                    if (balance < b.cost) {
                      return setVvipAlert({ msg: `Insufficient balance! You need ${b.cost.toLocaleString()} AJ Coins to activate.` });
                    }
                    await updateDoc(doc(db, 'users', user.uid), {
                      balance: increment(-b.cost),
                      botTier: b.tier,
                      invested: b.cost
                    });
                    setVvipAlert({ msg: `🚀 ${b.tier.toUpperCase()} Bot successfully activated! Passive yield starts generating immediately.`, icon: '✨' });
                  }}
                  className="w-full py-3 bg-green-500 text-black font-black text-xs uppercase tracking-widest rounded-xl"
                >
                  Activate
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* LIVE BROADCAST OVERLAY WINDOW */}
      {liveActive && (
        <div className="fixed inset-0 z-[600] bg-[#050505] flex flex-col">
          {/* Main camera view frame */}
          <div className="relative flex-1 bg-black">
            <video ref={liveVideoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
            <div className="absolute top-6 left-6 bg-red-600 px-4 py-2 rounded-full flex items-center gap-2 shadow-2xl">
              <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
              <span className="text-white font-black text-xs uppercase">LIVE</span>
            </div>

            {/* Real-time viewer count eye (👁️) display next to LIVE badge */}
            <div className="absolute top-6 left-28 bg-black/60 border border-white/15 px-3 py-1.5 rounded-full flex items-center gap-1.5 backdrop-blur-md">
              <span className="text-white text-xs">👁️</span>
              <span className="text-white font-black text-xs">{liveViewerCount}</span>
            </div>

            {/* Real-time split screen rendering info */}
            <div className="absolute bottom-6 left-6 bg-[#050505]/75 border border-cyan-500/30 p-3 rounded-2xl w-44 backdrop-blur-md text-left">
              <p className="text-[8px] text-cyan-400 font-black uppercase tracking-wider">Stream Connection</p>
              <p className="text-white font-black text-[10px] mt-1 font-mono tracking-wider truncate">ROOM: {liveRoomId.slice(-12)}</p>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(liveRoomId);
                  setVvipAlert({ msg: '🚀 Live Stream Room ID copied to clipboard!' });
                }}
                className="mt-2 w-full bg-cyan-600 text-black font-black text-[9px] uppercase rounded-lg py-1 hover:scale-[1.01]"
              >
                Copy Room ID
              </button>
            </div>

            <button onClick={endLiveStream} className="absolute top-6 right-6 bg-red-600 text-white font-black text-xs uppercase px-5 py-2.5 rounded-full shadow-2xl">
              ⏹ End Stream
            </button>
          </div>
        </div>
      )}

      {/* VIEWER LIVE WATCH SCREEN */}
      {viewerRoom && (
        <div className="fixed inset-0 z-[600] bg-black flex flex-col">
          <div className="p-4 bg-slate-900 border-b border-white/10 flex justify-between items-center">
            <div className="flex items-center gap-3">
              <img src={viewerRoom.photo || '/logo.png'} className="w-9 h-9 rounded-full border border-red-500 object-cover" />
              <div>
                <p className="font-black text-xs text-white uppercase truncate">@{viewerRoom.username}</p>
                <div className="flex items-center gap-1 mt-0.5">
                  <div className="w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse" />
                  <span className="text-[8px] font-black text-red-400 uppercase">Watching Live</span>
                </div>
              </div>
            </div>

            <button onClick={exitViewerRoom} className="bg-red-600 px-4 py-1.5 rounded-full text-[10px] font-black uppercase">Leave</button>
          </div>

          <div className="flex-1 bg-gradient-to-br from-slate-950 to-black flex items-center justify-center relative">
            <div className="text-center space-y-4 opacity-40">
              <Radio size={56} className="text-red-500 animate-pulse mx-auto" />
              <p className="text-white font-black text-xs uppercase tracking-widest">Live Feed active</p>
              <p className="text-gray-500 text-[10px] font-bold">HD quality WebRTC broadcast</p>
            </div>

            {/* Viewer Count display */}
            <div className="absolute top-4 right-4 bg-black/60 border border-white/10 px-3 py-1 rounded-full flex items-center gap-1.5">
              <span className="text-white text-xs">👁️</span>
              <span className="text-white font-black text-xs">{liveViewerCount}</span>
            </div>

            {/* In-stream messages list overlay */}
            <div className="absolute left-3 bottom-24 w-[60%] max-h-40 overflow-y-auto flex flex-col gap-1 pointer-events-none">
              {viewerChatMessages.slice(-10).map(m => (
                <div key={m.id} className="flex items-start gap-1">
                  <p className="text-[9px] text-white font-bold leading-tight bg-black/50 rounded-xl px-2.5 py-1.5">
                    <span className="text-yellow-500">@{m.username}: </span>{m.text}
                  </p>
                </div>
              ))}
              <div ref={viewerChatEndRef} />
            </div>

            {/* Request to Join live Split screen co-hosting invitation trigger */}
            <div className="absolute right-4 bottom-24 flex flex-col items-center gap-1.5">
              <button
                onClick={async () => {
                  const zego = ZegoService.getInstance();
                  await zego.requestToJoinLive(viewerRoomId, user.uid, username || 'AJ Guest');
                  setVvipAlert({ msg: '🚀 Co-Hosting Request submitted to Streamer! Waiting for approval...' });
                }}
                className="bg-cyan-600 text-black font-black text-[10px] uppercase p-3 rounded-full shadow-xl"
              >
                Join Stream
              </button>
            </div>
          </div>

          <div className="p-3 bg-[#1f2c33] flex gap-2">
            <input type="text" value={viewerChatInput} onChange={e => setViewerChatInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendViewerChatMessage()}
              placeholder="Send message to broadcaster..." className="flex-1 bg-[#2a3942] rounded-full px-4 py-2.5 text-xs text-white" />
            <button onClick={sendViewerChatMessage} className="bg-cyan-500 p-2.5 rounded-full text-black"><Send size={14} /></button>
          </div>
        </div>
      )}

      {/* FOOTER CO-FOUNDER */}
      <footer className="bg-[#050505] py-20 px-8 border-t border-white/5 text-center flex flex-col items-center">
        <h2 className="text-6xl font-black italic text-cyan-400 drop-shadow-[0_0_20px_rgba(6,182,212,0.4)] mb-8 uppercase tracking-tighter">AJ STUDIO</h2>
        <div className="flex gap-4 mb-10 flex-wrap justify-center">
          <a href="https://wa.me/96878994093" target="_blank" className="text-green-500 border border-green-500 px-6 py-2 rounded-full font-black uppercase text-[10px] tracking-widest">WhatsApp</a>
          <a href="mailto:ajcreatorstudio.hq@gmail.com" className="text-red-400 border border-red-400 px-6 py-2 rounded-full font-black uppercase text-[10px] tracking-widest">Email CEO</a>
        </div>
        <p className="text-[10px] text-gray-500 uppercase font-bold tracking-[0.2em] leading-relaxed max-w-md mx-auto">
          © 2026 AJ CREATOR STUDIO. ALL RIGHTS RESERVED.<br />
          Oman's Certified Digital Social Rewards Ecosystem.
        </p>
      </footer>
    </main>
  );
}