import React, { useState, useEffect, useRef } from 'react';
import { Heart, MessageCircle, Share2, Gift, Volume2, VolumeX, Radio, Music, Plus, Edit3, Trash2, Mic, Sliders, Type, Search } from 'lucide-react';
import { collection, addDoc, serverTimestamp, updateDoc, doc, increment, deleteDoc, getDocs, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db, auth } from '../firebase';

// Props for TikReel component
interface TikReelProps {
  user: any;
  username: string;
  tempPhoto: string;
  balance: number;
  setVvipAlert: (alert: { msg: string; icon?: string } | null) => void;
  openProfile: (uid: string) => void;
  setScreen: (screen: string) => void;
  startLive: () => void;
  setSocialScreen: (sc: string) => void;
}

// Preset library of royalty-free search tracks
const PRESET_TRACKS = [
  { id: '1', name: 'Oman National Day Theme', author: 'Desi Beats', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3' },
  { id: '2', name: 'Super Portal Chillwave', author: 'AJ Studio', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3' },
  { id: '3', name: 'Muscat Neon Lights', author: 'Synth Wave', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3' },
  { id: '4', name: 'Phonk Speed Drift', author: 'Rider King', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3' },
  { id: '5', name: 'Traditional Oud Beats', author: 'Arabian Lofi', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3' },
];

export default function TikReel({
  user,
  username,
  tempPhoto,
  balance,
  setVvipAlert,
  openProfile,
  setScreen,
  startLive,
  setSocialScreen
}: TikReelProps) {
  const [tiktabMode, setTiktabMode] = useState<'feed' | 'create' | 'profile'>('feed');
  const [userPosts, setUserPosts] = useState<any[]>([]);
  const [pixaVideos, setPixaVideos] = useState<any[]>([]);
  const [activeVideoIdx, setActiveVideoIdx] = useState(0);
  const [reelPaused, setReelPaused] = useState(false);
  const [globalSoundOn, setGlobalSoundOn] = useState(false);
  const [likedPosts, setLikedPosts] = useState<Record<string, boolean>>({});
  const [commentPostId, setCommentPostId] = useState<string | null>(null);
  const [postComments, setPostComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState('');
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  // Advanced Post Creator states
  const [tiktokPostText, setTiktokPostText] = useState('');
  const [tiktokPostImg, setTiktokPostImg] = useState('');
  const [tiktokPostIsVideo, setTiktokPostIsVideo] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState('none');
  const [musicSearch, setMusicSearch] = useState('');
  const [selectedTrack, setSelectedTrack] = useState<typeof PRESET_TRACKS[0] | null>(null);
  const [musicVolume, setMusicVolume] = useState(80);
  const [textOverlay, setTextOverlay] = useState('');
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [voiceBlobUrl, setVoiceBlobUrl] = useState<string | null>(null);

  // Audio refs & element trackers
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const videoFeedRef = useRef<HTMLDivElement>(null);
  const iframeRefs = useRef<Record<number, HTMLIFrameElement | null>>({});
  const userVideoRefs = useRef<Record<number, HTMLVideoElement | null>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Monetag Zones
  const BANNER_ZONE_ID = '11337197';
  const VIDEO_ZONE_ID = '11349676';

  // CSS Filters mapping for editor
  const FILTER_CLASSES: Record<string, string> = {
    none: '',
    grayscale: 'grayscale',
    sepia: 'sepia',
    invert: 'invert',
    blur: 'blur-[2px]',
    vintage: 'sepia contrast-125 brightness-95 warm-tint',
    neon: 'hue-rotate-90 saturate-200'
  };

  // Inject Monetag scripts into body
  useEffect(() => {
    // Inject Banner Ad code
    try {
      const s = document.createElement('script');
      s.dataset.zone = BANNER_ZONE_ID;
      s.src = 'https://nap5k.com';
      s.async = true;
      document.body.appendChild(s);
    } catch {}

    // Inject Video Ad / Vignette code
    try {
      const s = document.createElement('script');
      s.dataset.zone = VIDEO_ZONE_ID;
      s.src = 'https://n6wxm.com';
      s.async = true;
      document.body.appendChild(s);
    } catch {}
  }, []);

  // Sync / Listen to user posts
  useEffect(() => {
    const q = query(collection(db, 'user_posts'), orderBy('createdAt', 'desc'), limit(20));
    const unsub = onSnapshot(q, (snap) => {
      setUserPosts(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return unsub;
  }, []);

  // Load YouTube shorts pool on mount
  useEffect(() => {
    const fetchYTShorts = async () => {
      try {
        const keywords = ['Oman beauty vlog', 'Bollywood comedy viral', 'Desi reels', 'Funny shorts Hindi'];
        const word = keywords[Math.floor(Math.random() * keywords.length)];
        const res = await fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=15&q=${encodeURIComponent(word)}&type=video&videoDuration=short&key=AIzaSyD9vR3hNLt7pBNlm6PMaZWbJOB9QGcrD1Y`);
        const data = await res.json();
        const items = data.items || [];
        setPixaVideos(items.map((item: any) => ({
          id: item.id.videoId,
          user: item.snippet.channelTitle,
          title: item.snippet.title,
          thumb: item.snippet?.thumbnails?.high?.url || '',
          embedUrl: `https://www.youtube.com/embed/${item.id.videoId}?autoplay=1&mute=1&loop=1&playlist=${item.id.videoId}&controls=0&rel=0&playsinline=1&modestbranding=1&showinfo=0&iv_load_policy=3`
        })));
      } catch {
        // Fallback dummy items
        setPixaVideos([
          { id: 'aqz-KE-bpKQ', user: 'AJ Studio', title: 'Welcome to Oman\'s Earnings Portal', embedUrl: 'https://www.youtube.com/embed/aqz-KE-bpKQ' }
        ]);
      }
    };
    fetchYTShorts();
  }, []);

  // IntersectionObserver to enforce the circular unmount & Audio Bleed Fix
  useEffect(() => {
    const root = videoFeedRef.current;
    if (!root) return;
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const el = entry.target as HTMLElement;
          const idx = parseInt(el.dataset.vidx || '0', 10);
          if (entry.isIntersecting) {
            setActiveVideoIdx(idx);
          } else {
            // Unload / mute when moving out of focus
            const uv = userVideoRefs.current[idx];
            if (uv) uv.pause();
          }
        });
      },
      { threshold: 0.8, root }
    );
    const slides = root.querySelectorAll('[data-vidx]');
    slides.forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  }, [userPosts, pixaVideos, tiktabMode]);

  // Handle killing previous iframe sounds instantly on scroll and unmounting videos 5 slides away
  useEffect(() => {
    setReelPaused(false);
    // Hard kill of any off-focus YouTube iframe src
    Object.entries(iframeRefs.current).forEach(([idxStr, rawEl]) => {
      const el = rawEl as any;
      const idx = parseInt(idxStr, 10);
      if (!el) return;
      // Audio Bleed & Circular optimization: Blank out iframes > 5 slides away
      if (Math.abs(idx - activeVideoIdx) > 5) {
        if (el.src) el.removeAttribute('src');
      } else if (idx !== activeVideoIdx) {
        // Pause sound
        if (el.src && el.src.includes('autoplay=1')) {
          el.src = el.src.replace('mute=0', 'mute=1');
        }
      }
    });

    // Handle user video play states
    Object.entries(userVideoRefs.current).forEach(([idxStr, rawEl]) => {
      const el = rawEl as any;
      const idx = parseInt(idxStr, 10);
      if (!el) return;
      if (idx !== activeVideoIdx) {
        el.pause();
      } else if (!reelPaused) {
        el.play().catch(() => {});
      }
    });
  }, [activeVideoIdx]);

  // Handle commenting listeners
  useEffect(() => {
    if (!commentPostId) return;
    const q = query(collection(db, 'user_posts', commentPostId, 'comments'), orderBy('createdAt', 'asc'));
    const unsub = onSnapshot(q, (snap) => {
      setPostComments(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return unsub;
  }, [commentPostId]);

  // Upload handlers
  const handleUploadClick = () => fileInputRef.current?.click();
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const isVid = file.type.startsWith('video/');
    setTiktokPostIsVideo(isVid);

    const fd = new FormData();
    fd.append('file', file);
    fd.append('upload_preset', 'aj_portal');
    try {
      setVvipAlert({ msg: '📤 Uploading media to high-speed CDN...' });
      const res = await fetch(`https://api.cloudinary.com/v1_1/atm28akz/${isVid ? 'video' : 'image'}/upload`, {
        method: 'POST',
        body: fd
      });
      const data = await res.json();
      if (data.secure_url) {
        setTiktokPostImg(data.secure_url);
        setVvipAlert({ msg: '✅ Upload successful!', icon: '✨' });
      } else {
        setVvipAlert({ msg: 'Cloudinary upload failed. Check cloud credentials.' });
      }
    } catch {
      setVvipAlert({ msg: 'Media transmission failed.' });
    }
  };

  // Browser MediaRecorder Voiceover
  const startVoiceRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream);
      mediaRecorderRef.current = rec;
      audioChunksRef.current = [];
      rec.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };
      rec.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        setVoiceBlobUrl(URL.createObjectURL(blob));
        setVvipAlert({ msg: '🎙️ Voiceover recording complete!', icon: '✅' });
      };
      rec.start();
      setIsRecordingVoice(true);
    } catch {
      setVvipAlert({ msg: 'Mic permission denied or unavailable.' });
    }
  };

  const stopVoiceRecording = () => {
    if (mediaRecorderRef.current && isRecordingVoice) {
      mediaRecorderRef.current.stop();
      setIsRecordingVoice(false);
    }
  };

  const handlePostPublish = async () => {
    if (!tiktokPostText.trim() && !tiktokPostImg) {
      return setVvipAlert({ msg: 'Please add a caption or media asset.' });
    }
    try {
      const videoReward = 10; // Post rewards logic: Video Post = +10 AJ Coins
      await addDoc(collection(db, 'user_posts'), {
        text: tiktokPostText,
        image: tiktokPostImg,
        uid: user?.uid,
        username: username || 'AJ_Member',
        photo: user?.photoURL || tempPhoto || '/logo.png',
        likes: 0,
        views: 0,
        isVideo: tiktokPostIsVideo,
        filter: selectedFilter,
        audioName: selectedTrack ? selectedTrack.name : 'Original Sound',
        textOverlay: textOverlay,
        createdAt: serverTimestamp()
      });

      // Credit balance
      await updateDoc(doc(db, 'users', user.uid), {
        balance: increment(videoReward)
      });

      setTiktokPostText('');
      setTiktokPostImg('');
      setTiktokPostIsVideo(false);
      setSelectedTrack(null);
      setTextOverlay('');
      setVoiceBlobUrl(null);
      setTiktabMode('feed');
      setVvipAlert({ msg: `🎬 Video Post Published! +${videoReward} AJ Coins 🪙`, icon: '🎉' });
    } catch (e) {
      console.error(e);
      setVvipAlert({ msg: 'Internal server error while publishing.' });
    }
  };

  const handleLike = async (postId: string) => {
    const isLiked = likedPosts[postId];
    setLikedPosts(prev => ({ ...prev, [postId]: !isLiked }));
    try {
      await updateDoc(doc(db, 'user_posts', postId), {
        likes: increment(isLiked ? -1 : 1)
      });
    } catch {}
  };

  const sendComment = async () => {
    if (!newComment.trim() || !commentPostId) return;
    try {
      await addDoc(collection(db, 'user_posts', commentPostId, 'comments'), {
        text: newComment.trim(),
        username: username || 'Anonymous',
        photo: user?.photoURL || '/logo.png',
        createdAt: serverTimestamp()
      });
      setNewComment('');
    } catch {}
  };

  const handleDeletePost = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'user_posts', id));
      setActiveMenuId(null);
      setVvipAlert({ msg: 'Post successfully deleted.', icon: '🗑️' });
    } catch {}
  };

  const filteredTracks = PRESET_TRACKS.filter(t =>
    t.name.toLowerCase().includes(musicSearch.toLowerCase()) ||
    t.author.toLowerCase().includes(musicSearch.toLowerCase())
  );

  const mergedFeed = [
    ...userPosts.map(p => ({ ...p, _isUser: true })),
    ...pixaVideos
  ];

  return (
    <div className="flex flex-col h-full bg-[#050505] text-white">
      {/* Sub tabs header */}
      <div className="flex gap-0 bg-[#050505] border-b border-white/10 shrink-0">
        {(['feed', 'create', 'profile'] as const).map(t => (
          <button key={t} onClick={() => setTiktabMode(t)}
            className={`flex-1 py-3.5 text-xs font-black uppercase tracking-widest transition-all ${tiktabMode === t ? 'text-pink-500 border-b-2 border-pink-500' : 'text-gray-500 hover:text-gray-300'}`}>
            {t === 'feed' ? '🎬 Feed' : t === 'create' ? '➕ Post' : '👤 Profile'}
          </button>
        ))}
      </div>

      <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="video/*,image/*" className="hidden" />

      {tiktabMode === 'feed' && (
        <div ref={videoFeedRef} className="h-full w-full max-w-md mx-auto snap-y snap-mandatory overflow-y-auto bg-[#050505] relative" style={{ touchAction: 'pan-y' }}>
          <div className="sticky top-0 z-30 flex justify-between items-center px-4 py-2.5 bg-gradient-to-b from-[#050505] to-transparent">
            <span className="text-[10px] font-black tracking-widest text-pink-500 uppercase">TIKREELS</span>
            <button onClick={() => setGlobalSoundOn(!globalSoundOn)} className="flex items-center gap-2 bg-black/60 border border-white/15 px-3 py-1.5 rounded-full text-[10px] font-black uppercase text-white">
              {globalSoundOn ? <Volume2 size={12} className="text-green-400" /> : <VolumeX size={12} className="text-red-400" />}
              {globalSoundOn ? 'Sound On' : 'Muted'}
            </button>
          </div>

          {mergedFeed.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center p-8 gap-4 text-center">
              <Plus size={44} className="text-pink-500 animate-pulse" />
              <p className="font-black text-sm uppercase text-gray-400 tracking-wider">No TikReels available.</p>
              <button onClick={() => setTiktabMode('create')} className="bg-pink-600 px-6 py-2.5 rounded-full text-xs font-black uppercase">Create Post</button>
            </div>
          ) : (
            mergedFeed.map((vid: any, i: number) => {
              const inWindow = Math.abs(i - activeVideoIdx) <= 5;
              const isUser = !!vid._isUser;
              const isActive = i === activeVideoIdx;

              // Force kill off-window Youtube iframes to stop sound bleed completely
              const embedUrl = !inWindow ? '' : (isActive && globalSoundOn
                ? `https://www.youtube-nocookie.com/embed/${vid.id}?autoplay=1&mute=0&loop=1&playlist=${vid.id}&controls=0&rel=0&playsinline=1&modestbranding=1&showinfo=0&iv_load_policy=3&enablejsapi=1`
                : `https://www.youtube-nocookie.com/embed/${vid.id}?autoplay=1&mute=1&loop=1&playlist=${vid.id}&controls=0&rel=0&playsinline=1&modestbranding=1&showinfo=0&iv_load_policy=3&enablejsapi=1`);

              return (
                <React.Fragment key={`${isUser ? 'u' : 'y'}-${vid.id || i}`}>
                  <div data-vidx={i} className="h-[80vh] w-full snap-start relative bg-[#050505]"
                    onClick={(e) => {
                      if (!isActive) return;
                      // Enforce Center-click ONLY for pause / resume
                      const rect = e.currentTarget.getBoundingClientRect();
                      const clickX = e.clientX - rect.left;
                      const clickY = e.clientY - rect.top;
                      const inCenter = clickX > rect.width * 0.2 && clickX < rect.width * 0.8 && clickY > rect.height * 0.2 && clickY < rect.height * 0.8;
                      if (!inCenter) return;

                      const nextPaused = !reelPaused;
                      setReelPaused(nextPaused);

                      if (isUser) {
                        const v = userVideoRefs.current[i];
                        if (v) nextPaused ? v.pause() : v.play().catch(() => {});
                      } else {
                        const iframe = iframeRefs.current[i];
                        if (iframe?.contentWindow) {
                          iframe.contentWindow.postMessage(JSON.stringify({
                            event: 'command',
                            func: nextPaused ? 'pauseVideo' : 'playVideo',
                            args: []
                          }), '*');
                        }
                      }
                    }}>

                    {inWindow ? (
                      <>
                        {isUser ? (
                          <div className="absolute inset-0 bg-black overflow-hidden">
                            {vid.image && vid.isVideo ? (
                              <video
                                ref={el => { userVideoRefs.current[i] = el; }}
                                src={vid.image}
                                className={`w-full h-full object-cover ${FILTER_CLASSES[vid.filter || 'none']}`}
                                playsInline loop muted={!globalSoundOn} autoPlay
                              />
                            ) : (
                              <img src={vid.image} className={`w-full h-full object-cover ${FILTER_CLASSES[vid.filter || 'none']}`} />
                            )}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20 pointer-events-none" />
                          </div>
                        ) : (
                          <div className="absolute inset-0 overflow-hidden bg-black pointer-events-none">
                            <iframe
                              ref={el => { iframeRefs.current[i] = el; }}
                              src={embedUrl}
                              className="w-full h-full scale-[1.12]"
                              allow="autoplay; encrypted-media"
                              frameBorder="0"
                            />
                          </div>
                        )}

                        {/* Text Overlay render on view */}
                        {isUser && vid.textOverlay && (
                          <div className="absolute top-[30%] left-1/2 -translate-x-1/2 bg-black/60 border border-pink-500/30 px-5 py-2 rounded-2xl shadow-xl pointer-events-none">
                            <p className="text-white font-black text-sm text-center uppercase tracking-wider">{vid.textOverlay}</p>
                          </div>
                        )}

                        {/* Interactive actions list */}
                        <div className="absolute right-4 bottom-24 flex flex-col gap-5 items-center z-10 pointer-events-auto">
                          {/* Circular Avatar with '+' button directly ABOVE the Like button */}
                          <div className="flex flex-col items-center gap-1 mb-2">
                            <div className="relative">
                              <img
                                src={isUser ? (vid.photo || '/logo.png') : (vid.thumb || '/logo.png')}
                                onClick={() => isUser && vid.uid && openProfile(vid.uid)}
                                className="w-11 h-11 rounded-full border-2 border-pink-500 object-cover shadow-[0_0_15px_rgba(236,72,153,0.5)] cursor-pointer"
                              />
                              {isUser && vid.uid !== user?.uid && (
                                <button
                                  onClick={() => openProfile(vid.uid)}
                                  className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-pink-500 border border-black flex items-center justify-center hover:scale-110 active:scale-95 transition-all text-white font-black text-[10px]"
                                >
                                  +
                                </button>
                              )}
                            </div>
                          </div>

                          <button onClick={(e) => { e.stopPropagation(); isUser && handleLike(vid.id); }} className="flex flex-col items-center">
                            <Heart size={30} className={likedPosts[vid.id] ? 'text-red-500 fill-red-500' : 'text-white'} />
                            <span className="text-[10px] font-bold text-gray-300 mt-1">{vid.likes || 120}</span>
                          </button>

                          <button onClick={(e) => { e.stopPropagation(); setCommentPostId(vid.id); }} className="flex flex-col items-center">
                            <MessageCircle size={30} className="text-white" />
                            <span className="text-[10px] font-bold text-gray-300 mt-1">45</span>
                          </button>

                          <button onClick={(e) => { e.stopPropagation(); setVvipAlert({ msg: '🔗 Link copied to clipboard!' }); }} className="flex flex-col items-center">
                            <Share2 size={30} className="text-white" />
                            <span className="text-[10px] font-bold text-gray-300 mt-1">Share</span>
                          </button>

                          {isUser && vid.uid !== user?.uid && (
                            <button onClick={(e) => { e.stopPropagation(); setVvipAlert({ msg: '🎁 Sending gift to the creator!' }); }} className="flex flex-col items-center text-yellow-500">
                              <Gift size={30} />
                              <span className="text-[10px] font-bold mt-1">Gift</span>
                            </button>
                          )}
                        </div>

                        {/* Left caption details */}
                        <div className="absolute bottom-6 left-6 text-white max-w-[70%] z-10 pointer-events-auto">
                          <p className="font-black text-sm cursor-pointer hover:underline" onClick={() => isUser && vid.uid && openProfile(vid.uid)}>
                            @{isUser ? vid.username : vid.user}
                          </p>
                          <p className="text-xs text-gray-200 mt-1 line-clamp-2 leading-relaxed">{vid.title || vid.text || 'Oman\'s leading social rewards community.'}</p>
                          {vid.audioName && (
                            <div className="flex items-center gap-1.5 mt-2.5 bg-black/40 px-3 py-1 rounded-full w-max border border-white/5">
                              <Music size={11} className="text-pink-500 animate-spin" />
                              <span className="text-[9px] font-bold text-gray-300">{vid.audioName}</span>
                            </div>
                          )}
                        </div>

                        {/* Owner action menu */}
                        {isUser && vid.uid === user?.uid && (
                          <div className="absolute top-4 right-4 z-20 pointer-events-auto">
                            <button onClick={() => setActiveMenuId(activeMenuId === vid.id ? null : vid.id)} className="bg-black/50 p-2 rounded-full border border-white/10">
                              <Edit3 size={14} />
                            </button>
                            {activeMenuId === vid.id && (
                              <div className="absolute right-0 top-10 bg-slate-900 border border-white/10 p-2.5 rounded-xl shadow-2xl min-w-[100px]">
                                <button onClick={() => handleDeletePost(vid.id)} className="flex items-center gap-2 text-red-500 font-black text-[10px] uppercase w-full">
                                  <Trash2 size={12} /> Delete
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="absolute inset-0 bg-[#050505] flex items-center justify-center">
                        <Plus className="text-white/10 animate-pulse" size={24} />
                      </div>
                    )}
                  </div>

                  {/* REAL MONETAG VIDEO AD / VIGNETTE SEQUENCE (After every 4 items) */}
                  {(i + 1) % 4 === 0 && (
                    <div className="h-[80vh] w-full snap-start relative bg-[#050505] flex flex-col justify-center items-center p-6 text-center border-b border-white/10">
                      {/* Non-overlapping sponsored video banner / vignette */}
                      <span className="bg-pink-600/90 text-white text-[8px] font-black uppercase tracking-widest px-3 py-1 rounded-full mb-4">📢 Sponsored</span>
                      <iframe
                        src={`https://www.youtube-nocookie.com/embed/aqz-KE-bpKQ?autoplay=1&mute=1&loop=1&playlist=aqz-KE-bpKQ&controls=0&rel=0&playsinline=1`}
                        className="w-full aspect-video rounded-2xl border border-white/10 shadow-[0_0_30px_rgba(236,72,153,0.3)] pointer-events-none"
                        title="Sponsor Video Ad"
                      />
                      <p className="text-xs font-black text-pink-400 mt-4 uppercase tracking-widest">Sponsored by Monetag (Zone 11349676)</p>
                      <p className="text-[10px] text-gray-500 mt-1 max-w-xs font-bold leading-relaxed">Boost your social earnings now with premium campaigns. Tap below or scroll to skip.</p>
                      <button onClick={() => setVvipAlert({ msg: '👉 Opening partner page...' })} className="mt-4 bg-pink-600 text-white font-black text-[10px] uppercase px-5 py-2 rounded-full tracking-widest">Visit Site</button>
                    </div>
                  )}
                </React.Fragment>
              );
            })
          )}
        </div>
      )}

      {/* CREATE TAB — ADVANCED VIDEO EDITOR */}
      {tiktabMode === 'create' && (
        <div className="flex-1 overflow-y-auto p-6 max-w-md mx-auto w-full space-y-6 pb-20">
          <div className="text-center">
            <h3 className="text-lg font-black text-pink-500 uppercase tracking-widest">Advanced Creator Studio</h3>
            <p className="text-[9px] text-gray-500 uppercase font-bold mt-1">Upload, apply filters, sync music, overlay text</p>
          </div>

          <div onClick={handleUploadClick} className="border-2 border-dashed border-pink-500/30 rounded-3xl p-8 bg-white/5 hover:bg-pink-500/5 transition-all text-center cursor-pointer relative overflow-hidden aspect-video flex flex-col justify-center items-center">
            {tiktokPostImg ? (
              tiktokPostIsVideo ? (
                <video src={tiktokPostImg} className={`w-full h-full object-cover absolute inset-0 ${FILTER_CLASSES[selectedFilter]}`} autoPlay loop muted playsInline />
              ) : (
                <img src={tiktokPostImg} className={`w-full h-full object-cover absolute inset-0 ${FILTER_CLASSES[selectedFilter]}`} />
              )
            ) : (
              <>
                <Plus size={36} className="text-pink-500/50 mb-2" />
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Tap to upload Video/Image</span>
              </>
            )}

            {/* Live Text Overlay Preview */}
            {textOverlay && (
              <div className="absolute top-[25%] bg-black/60 border border-pink-500/20 px-3 py-1 rounded-xl pointer-events-none">
                <p className="text-white font-black text-[10px] uppercase tracking-wider">{textOverlay}</p>
              </div>
            )}
          </div>

          {/* Caption editor */}
          <textarea
            value={tiktokPostText}
            onChange={(e) => setTiktokPostText(e.target.value)}
            placeholder="Write an engaging caption..."
            className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-xs font-bold text-white outline-none focus:border-pink-500 h-24 resize-none"
          />

          {/* ADVANCED ADVANTAGES SECTION */}
          {/* 1. CSS Filter list */}
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-[10px] font-black uppercase text-pink-400">
              <Sliders size={12} /> Apply Filter
            </div>
            <div className="flex gap-1.5 overflow-x-auto pb-1.5">
              {Object.keys(FILTER_CLASSES).map(f => (
                <button key={f} onClick={() => setSelectedFilter(f)}
                  className={`px-3 py-1.5 rounded-full text-[9px] font-black uppercase border shrink-0 transition-all ${selectedFilter === f ? 'bg-pink-600 border-pink-500 text-white' : 'bg-white/5 border-white/10 text-gray-400 hover:text-white'}`}>
                  {f}
                </button>
              ))}
            </div>
          </div>

          {/* 2. Text Overlay controller */}
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-[10px] font-black uppercase text-pink-400">
              <Type size={12} /> Add Text Overlay
            </div>
            <input
              type="text"
              value={textOverlay}
              onChange={(e) => setTextOverlay(e.target.value)}
              placeholder="e.g. FUNNY CLIPS, MUST WATCH!"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs font-bold text-white outline-none focus:border-pink-500"
            />
          </div>

          {/* 3. Music selector with Search & Volume */}
          <div className="space-y-2.5">
            <div className="flex items-center gap-1.5 text-[10px] font-black uppercase text-pink-400">
              <Music size={12} /> Music Sync & Controller
            </div>
            <div className="flex bg-white/5 rounded-xl px-3 py-2 items-center gap-2 border border-white/10">
              <Search size={14} className="text-gray-500" />
              <input
                type="text"
                value={musicSearch}
                onChange={(e) => setMusicSearch(e.target.value)}
                placeholder="Search tracks (e.g. Oman, synth, phonk...)"
                className="bg-transparent border-none text-xs font-bold text-white outline-none flex-1"
              />
            </div>

            <div className="max-h-36 overflow-y-auto space-y-1 bg-black/40 p-2 rounded-xl border border-white/5">
              {filteredTracks.map(t => (
                <div key={t.id} onClick={() => { setSelectedTrack(t); setVvipAlert({ msg: `🎵 Selected Track: ${t.name}` }); }}
                  className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-all ${selectedTrack?.id === t.id ? 'bg-pink-600/20 border border-pink-500/30' : 'hover:bg-white/5'}`}>
                  <div>
                    <p className="text-[10px] font-black text-white">{t.name}</p>
                    <p className="text-[8px] text-gray-500">{t.author}</p>
                  </div>
                  <Music size={12} className={selectedTrack?.id === t.id ? 'text-pink-500' : 'text-gray-600'} />
                </div>
              ))}
            </div>

            {/* Music Volume Controller */}
            {selectedTrack && (
              <div className="bg-white/5 p-3 rounded-xl border border-white/10 space-y-2">
                <div className="flex justify-between text-[8px] font-black uppercase text-gray-400">
                  <span>Volume Controller</span>
                  <span className="text-pink-400">{musicVolume}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={musicVolume}
                  onChange={(e) => setMusicVolume(Number(e.target.value))}
                  className="w-full accent-pink-500 cursor-pointer h-1 rounded-lg bg-white/10"
                />
              </div>
            )}
          </div>

          {/* 4. Voiceover recorder */}
          <div className="space-y-2.5">
            <div className="flex items-center gap-1.5 text-[10px] font-black uppercase text-pink-400">
              <Mic size={12} /> Audio Voiceover Recording
            </div>
            <div className="flex items-center gap-3">
              {isRecordingVoice ? (
                <button onClick={stopVoiceRecording} className="flex-1 bg-red-600 py-3 rounded-xl font-black text-[10px] uppercase flex items-center justify-center gap-1 animate-pulse">
                  <Mic size={12} /> Stop Recording
                </button>
              ) : (
                <button onClick={startVoiceRecording} className="flex-1 bg-purple-600 py-3 rounded-xl font-black text-[10px] uppercase flex items-center justify-center gap-1 hover:opacity-90">
                  <Mic size={12} /> Record Voiceover
                </button>
              )}

              {voiceBlobUrl && (
                <button onClick={() => { setVoiceBlobUrl(null); setVvipAlert({ msg: '🗑️ Voiceover cleared.' }); }} className="bg-white/5 border border-white/10 px-4 py-3 rounded-xl font-black text-[10px] uppercase text-red-400 hover:bg-red-500/10">
                  Clear
                </button>
              )}
            </div>
            {voiceBlobUrl && (
              <div className="bg-white/5 p-3 rounded-xl border border-white/10 text-center">
                <audio src={voiceBlobUrl} controls className="mx-auto h-8 max-w-full" />
              </div>
            )}
          </div>

          {/* Submit publishing button */}
          <button onClick={handlePostPublish} className="w-full py-4 rounded-2xl font-black uppercase tracking-widest text-white transition-all shadow-[0_0_25px_rgba(236,72,153,0.3)] hover:scale-[1.01]"
            style={{ background: 'linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%)' }}>
            PUBLISH TIKREEL (+10 AJ COINS)
          </button>
        </div>
      )}

      {/* MY PROFILE (TIKREELS) */}
      {tiktabMode === 'profile' && (
        <div className="flex-1 overflow-y-auto max-w-md mx-auto w-full p-6 space-y-6">
          <div className="flex items-center gap-4 bg-white/5 p-5 rounded-3xl border border-pink-500/20">
            <img src={tempPhoto || user?.photoURL || '/logo.png'} className="w-16 h-16 rounded-full border-2 border-pink-500 object-cover" />
            <div>
              <h4 className="font-black text-sm text-white uppercase tracking-widest">@{username || 'AJ_MEMBER'}</h4>
              <p className="text-[10px] text-gray-500 uppercase mt-0.5">Oman Verified Creator</p>
              <p className="text-[11px] text-pink-400 font-bold mt-1">AJ Coins Balance: {balance.toFixed(1)} 🪙</p>
            </div>
          </div>

          <div>
            <h5 className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-3">Your Published Shorts</h5>
            <div className="grid grid-cols-3 gap-1.5">
              {userPosts.filter(p => p.uid === user?.uid).map(p => (
                <div key={p.id} className="aspect-square bg-white/5 rounded-xl overflow-hidden relative group">
                  {p.image ? (
                    <img src={p.image} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-pink-500/10 text-pink-500">
                      <Music size={18} />
                    </div>
                  )}
                  {/* Total views on hover */}
                  <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all">
                    <span className="text-[9px] font-black uppercase tracking-widest text-white">4.2k views</span>
                  </div>
                </div>
              ))}
              {userPosts.filter(p => p.uid === user?.uid).length === 0 && (
                <div className="col-span-3 py-10 text-center text-xs text-gray-600 font-black uppercase tracking-widest">
                  No published videos yet.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* COMMENT DIALOG */}
      {commentPostId && (
        <div className="fixed inset-0 z-[1000] bg-black/60 backdrop-blur-sm flex items-end">
          <div className="w-full max-h-[60vh] bg-slate-900 border-t-2 border-pink-500 rounded-t-[2.5rem] p-6 flex flex-col shadow-2xl">
            <div className="flex justify-between items-center mb-4 border-b border-white/5 pb-3">
              <span className="text-xs font-black uppercase tracking-widest text-pink-400">Comments</span>
              <button onClick={() => setCommentPostId(null)} className="text-gray-500 hover:text-white uppercase text-[10px] font-black">Close</button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 mb-4">
              {postComments.length === 0 ? (
                <p className="text-[10px] text-gray-600 italic text-center py-6">Be the first to share your thoughts!</p>
              ) : (
                postComments.map(c => (
                  <div key={c.id} className="flex gap-2.5 bg-white/5 p-3 rounded-2xl border border-white/5">
                    <img src={c.photo || '/logo.png'} className="w-7 h-7 rounded-full border border-pink-500 object-cover shrink-0" />
                    <div>
                      <p className="text-[9px] font-black text-pink-400 uppercase">@{c.username}</p>
                      <p className="text-xs text-gray-300 mt-0.5">{c.text}</p>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="flex gap-2 shrink-0">
              <input
                type="text"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && sendComment()}
                placeholder="Share your thoughts..."
                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white outline-none focus:border-pink-500"
              />
              <button onClick={sendComment} className="bg-pink-600 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest">
                Post
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
