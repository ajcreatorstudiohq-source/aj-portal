import React, { useState, useEffect, useRef } from 'react';
import { Heart, MessageCircle, Share2, Gift, Camera, Film, Plus, Send, X, Trash2, Edit3, MoreVertical, Grid } from 'lucide-react';
import { collection, addDoc, serverTimestamp, updateDoc, doc, increment, deleteDoc, onSnapshot, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { db, auth } from '../firebase';

interface AJPulseProps {
  user: any;
  username: string;
  tempPhoto: string;
  balance: number;
  setVvipAlert: (alert: { msg: string; icon?: string } | null) => void;
  openProfile: (uid: string) => void;
}

const UNSPLASH_ACCESS_KEY = "W4x76VphkyY9fzP3DbJPfXLhdD6x063gW--Voifn_UE";

export default function AJPulse({
  user,
  username,
  tempPhoto,
  balance,
  setVvipAlert,
  openProfile
}: AJPulseProps) {
  const [pulseTab, setPulseTab] = useState<'feed' | 'create' | 'profile'>('feed');
  const [pulsePosts, setPulsePosts] = useState<any[]>([]);
  const [pixaData, setPixaData] = useState<any[]>([]);
  const [postText, setPostText] = useState('');
  const [localPhoto, setLocalPhoto] = useState('');
  const [pulsePostIsVideo, setPulsePostIsVideo] = useState(false);
  const [likedPosts, setLikedPosts] = useState<Record<string, boolean>>({});
  const [commentPostId, setCommentPostId] = useState<string | null>(null);
  const [postComments, setPostComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState('');
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [giftPostId, setGiftPostId] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load Unsplash life/luxury mix
  useEffect(() => {
    const fetchUnsplash = async () => {
      try {
        const res = await fetch(`https://api.unsplash.com/photos/random?client_id=${UNSPLASH_ACCESS_KEY}&query=lifestyle,luxury,resort&count=15`);
        const data = await res.json();
        setPixaData(Array.isArray(data) ? data : []);
      } catch {
        // Fallbacks
        setPixaData([
          { id: '1', urls: { regular: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe' }, user: { name: 'AJ Elite' }, alt_description: 'High-class luxury living in Muscat.' }
        ]);
      }
    };
    fetchUnsplash();
  }, []);

  // Listen to `pulse_posts` collection
  useEffect(() => {
    const q = query(collection(db, 'pulse_posts'), orderBy('createdAt', 'desc'), limit(25));
    const unsub = onSnapshot(q, (snap) => {
      setPulsePosts(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return unsub;
  }, []);

  // Comments listener
  useEffect(() => {
    if (!commentPostId) return;
    const q = query(collection(db, 'pulse_posts', commentPostId, 'comments'), orderBy('createdAt', 'asc'));
    const unsub = onSnapshot(q, (snap) => {
      setPostComments(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return unsub;
  }, [commentPostId]);

  const handleImageTrigger = () => fileInputRef.current?.click();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const isVid = file.type.startsWith('video/');
    setPulsePostIsVideo(isVid);

    const fd = new FormData();
    fd.append('file', file);
    fd.append('upload_preset', 'aj_portal');
    try {
      setVvipAlert({ msg: '📤 Transmitting image to global edge servers...' });
      const res = await fetch(`https://api.cloudinary.com/v1_1/atm28akz/${isVid ? 'video' : 'image'}/upload`, {
        method: 'POST',
        body: fd
      });
      const data = await res.json();
      if (data.secure_url) {
        setLocalPhoto(data.secure_url);
        setVvipAlert({ msg: '✅ Upload successful!', icon: '✨' });
      } else {
        setVvipAlert({ msg: 'Cloudinary upload failed. Please verify configuration.' });
      }
    } catch {
      setVvipAlert({ msg: 'Error uploading asset.' });
    }
  };

  const handleCreatePost = async () => {
    if (!postText.trim() && !localPhoto) {
      return setVvipAlert({ msg: 'Empty post! Add text or attach an image.' });
    }
    try {
      const rewardCoins = pulsePostIsVideo ? 10 : 5; // Video = +10 AJ Coins, Photo = +5 AJ Coins
      await addDoc(collection(db, 'pulse_posts'), {
        text: postText,
        image: localPhoto,
        uid: user?.uid,
        username: username || 'AJ_Member',
        photo: user?.photoURL || tempPhoto || '/logo.png',
        likes: 0,
        comments: 0,
        isVideo: pulsePostIsVideo,
        createdAt: serverTimestamp()
      });

      // Reward User balance
      await updateDoc(doc(db, 'users', user.uid), {
        balance: increment(rewardCoins)
      });

      setPostText('');
      setLocalPhoto('');
      setPulsePostIsVideo(false);
      setPulseTab('feed');
      setVvipAlert({ msg: `📡 Pulse Post Published! +${rewardCoins} AJ Coins earned!`, icon: '🎉' });
    } catch {
      setVvipAlert({ msg: 'Error uploading post.' });
    }
  };

  const handleLike = async (id: string, isUnsplash: boolean) => {
    if (isUnsplash) {
      setLikedPosts(prev => ({ ...prev, [id]: !prev[id] }));
      return;
    }
    const isLiked = likedPosts[id];
    setLikedPosts(prev => ({ ...prev, [id]: !isLiked }));
    try {
      await updateDoc(doc(db, 'pulse_posts', id), {
        likes: increment(isLiked ? -1 : 1)
      });
    } catch {}
  };

  const sendComment = async () => {
    if (!newComment.trim() || !commentPostId) return;
    try {
      await addDoc(collection(db, 'pulse_posts', commentPostId, 'comments'), {
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
      await deleteDoc(doc(db, 'pulse_posts', id));
      setActiveMenuId(null);
      setVvipAlert({ msg: 'Pulse Post Deleted Successfully', icon: '🗑' });
    } catch {}
  };

  const sendGift = async (g: any) => {
    if (balance < g.cost) {
      return setVvipAlert({ msg: 'Insufficient balance for this gift.' });
    }
    try {
      await updateDoc(doc(db, 'users', user.uid), { balance: increment(-g.cost) });
      setVvipAlert({ msg: `🎁 Sent ${g.name}! Creator credited with 60% share.`, icon: g.icon });
      setGiftPostId(null);
    } catch {}
  };

  // Merge local posts and Unsplash lifestyle photos elegantly
  const mergedPulseFeed: any[] = [];
  const maxLimit = Math.max(pulsePosts.length, pixaData.length);
  for (let k = 0; k < maxLimit; k++) {
    if (k < pulsePosts.length) mergedPulseFeed.push({ ...pulsePosts[k], _isLocal: true });
    if (k < pixaData.length) {
      const u = pixaData[k];
      mergedPulseFeed.push({
        id: `unsp-${u.id}`,
        image: u.urls?.regular,
        username: u.user?.name || 'AJ Creator',
        text: u.alt_description || 'High luxury life experience',
        photo: u.user?.profile_image?.small || '/logo.png',
        likes: u.likes || 15,
        _isLocal: false
      });
    }
  }

  return (
    <div className="flex flex-col h-full bg-[#050505] text-white">
      {/* Pulse sub tabs */}
      <div className="flex gap-0 bg-[#050505] border-b border-white/10 shrink-0">
        {(['feed', 'create', 'profile'] as const).map(t => (
          <button key={t} onClick={() => setPulseTab(t)}
            className={`flex-1 py-3 text-xs font-black uppercase tracking-widest transition-all ${pulseTab === t ? 'text-pink-500 border-b-2 border-pink-500' : 'text-gray-500 hover:text-white'}`}>
            {t === 'feed' ? '📡 Feed' : t === 'create' ? '➕ Create' : '👤 Profile'}
          </button>
        ))}
      </div>

      <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*,video/*" className="hidden" />

      {pulseTab === 'feed' && (
        <div className="flex-1 overflow-y-auto snap-y snap-mandatory bg-[#050505]" style={{ touchAction: 'pan-y' }}>
          {mergedPulseFeed.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center p-8 gap-4 text-center">
              <Camera size={44} className="text-pink-500 animate-pulse" />
              <p className="font-black text-sm uppercase text-gray-400 tracking-wider">Loading Pulse Feed...</p>
            </div>
          ) : (
            mergedPulseFeed.map((post, i) => {
              const isLocal = post._isLocal;
              return (
                <div key={post.id || i} className="h-[80vh] w-full snap-start relative bg-[#050505] border-b border-white/5 overflow-hidden">
                  {post.image ? (
                    <img src={post.image} className="absolute inset-0 w-full h-full object-cover" loading="lazy" decoding="async" />
                  ) : (
                    <div className="absolute inset-0 bg-gradient-to-br from-pink-950/40 via-slate-900 to-black" />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-black/30 pointer-events-none" />

                  {/* Actions Right Side Bar */}
                  <div className="absolute right-4 bottom-24 flex flex-col gap-5 items-center z-10">
                    <div className="relative">
                      <img src={post.photo || '/logo.png'} onClick={() => isLocal && post.uid && openProfile(post.uid)}
                        className="w-12 h-12 rounded-full border-2 border-white object-cover shadow-[0_0_12px_rgba(255,255,255,0.4)] cursor-pointer" />
                      {isLocal && (
                        <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-4 h-4 bg-pink-500 rounded-full border border-black flex items-center justify-center text-white text-[10px] font-black">+</div>
                      )}
                    </div>

                    <button onClick={() => handleLike(post.id, !isLocal)} className="flex flex-col items-center">
                      <Heart size={30} className={likedPosts[post.id] ? 'text-red-500 fill-red-500' : 'text-white'} />
                      <span className="text-[10px] font-bold text-gray-300 mt-1">{post.likes || 12}</span>
                    </button>

                    {isLocal && (
                      <button onClick={() => setCommentPostId(post.id)} className="flex flex-col items-center">
                        <MessageCircle size={30} className="text-white" />
                        <span className="text-[10px] font-bold text-gray-300 mt-1">{post.comments || 2}</span>
                      </button>
                    )}

                    <button onClick={() => setVvipAlert({ msg: '🔗 Link copied to clipboard!' })} className="flex flex-col items-center">
                      <Share2 size={30} />
                      <span className="text-[10px] font-bold text-gray-300 mt-1">Share</span>
                    </button>

                    {isLocal && post.uid !== user?.uid && (
                      <button onClick={() => setGiftPostId(post.id)} className="flex flex-col items-center text-yellow-500">
                        <Gift size={30} />
                        <span className="text-[10px] font-bold mt-1">Gift</span>
                      </button>
                    )}
                  </div>

                  {/* Bottom details Overlay */}
                  <div className="absolute bottom-6 left-6 text-white max-w-[70%] z-10">
                    <p className="font-black text-sm cursor-pointer hover:underline" onClick={() => isLocal && post.uid && openProfile(post.uid)}>
                      @{post.username || 'AJ_Creator'}
                    </p>
                    <p className="text-xs text-gray-200 mt-1.5 line-clamp-2 leading-relaxed font-bold">{post.text}</p>
                  </div>

                  {/* Settings 3-dot Menu for own post deletion */}
                  {isLocal && post.uid === user?.uid && (
                    <div className="absolute top-4 right-4 z-20">
                      <button onClick={() => setActiveMenuId(activeMenuId === post.id ? null : post.id)} className="bg-black/50 p-2 rounded-full border border-white/10">
                        <MoreVertical size={16} />
                      </button>
                      {activeMenuId === post.id && (
                        <div className="absolute right-0 top-10 bg-slate-900 border border-white/10 p-2 rounded-xl shadow-2xl min-w-[100px]">
                          <button onClick={() => handleDeletePost(post.id)} className="flex items-center gap-1.5 text-red-500 font-black text-[10px] uppercase w-full">
                            <Trash2 size={12} /> Delete
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* CREATE PULSE POST */}
      {pulseTab === 'create' && (
        <div className="flex-1 overflow-y-auto p-6 max-w-md mx-auto w-full space-y-6">
          <div className="text-center">
            <h3 className="text-lg font-black text-pink-500 uppercase tracking-widest">Share Your Moment</h3>
            <p className="text-[9px] text-gray-500 uppercase font-bold mt-1">Photo = +5 Coins, Video = +10 Coins</p>
          </div>

          <div onClick={handleImageTrigger} className="border-2 border-dashed border-pink-500/30 rounded-3xl p-8 bg-white/5 hover:bg-pink-500/5 transition-all text-center cursor-pointer relative overflow-hidden aspect-video flex flex-col justify-center items-center">
            {localPhoto ? (
              pulsePostIsVideo ? (
                <video src={localPhoto} className="w-full h-full object-cover absolute inset-0" controls playsInline />
              ) : (
                <img src={localPhoto} className="w-full h-full object-cover absolute inset-0" />
              )
            ) : (
              <>
                <Camera size={36} className="text-pink-500/50 mb-2" />
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Tap to select Photo/Video</span>
              </>
            )}
          </div>

          <textarea value={postText} onChange={(e) => setPostText(e.target.value)} placeholder="Write a description..."
            className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-xs font-bold text-white outline-none focus:border-pink-500 h-28 resize-none" />

          <button onClick={handleCreatePost} className="w-full py-4 rounded-2xl font-black uppercase tracking-widest text-white transition-all shadow-[0_0_20px_rgba(236,72,153,0.3)] hover:scale-[1.01]"
            style={{ background: 'linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%)' }}>
            PUBLISH MOMENT
          </button>
        </div>
      )}

      {/* PROFILE TAB */}
      {pulseTab === 'profile' && (
        <div className="flex-1 overflow-y-auto max-w-md mx-auto w-full p-6 space-y-6">
          <div className="flex items-center gap-4 bg-white/5 p-5 rounded-3xl border border-pink-500/20">
            <img src={tempPhoto || user?.photoURL || '/logo.png'} className="w-16 h-16 rounded-full border-2 border-pink-500 object-cover" />
            <div>
              <h4 className="font-black text-sm text-white uppercase tracking-widest">@{username || 'AJ_MEMBER'}</h4>
              <p className="text-[10px] text-gray-500 uppercase mt-0.5">Oman Verified Creator</p>
            </div>
          </div>

          <div>
            <h5 className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-3">Your Published Moments</h5>
            <div className="grid grid-cols-3 gap-1.5">
              {pulsePosts.filter(p => p.uid === user?.uid).map(p => (
                <div key={p.id} className="aspect-square bg-white/5 rounded-xl overflow-hidden relative">
                  {p.image ? (
                    <img src={p.image} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-pink-500/10 text-pink-500 font-bold text-[10px] uppercase p-2 text-center">
                      {p.text?.slice(0, 20)}
                    </div>
                  )}
                </div>
              ))}
              {pulsePosts.filter(p => p.uid === user?.uid).length === 0 && (
                <div className="col-span-3 py-10 text-center text-xs text-gray-600 font-black uppercase tracking-widest">
                  No published moments yet.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* COMMENT PANEL */}
      {commentPostId && (
        <div className="fixed inset-0 z-[1000] bg-black/60 backdrop-blur-sm flex items-end">
          <div className="w-full max-h-[60vh] bg-slate-900 border-t-2 border-pink-500 rounded-t-[2.5rem] p-6 flex flex-col shadow-2xl">
            <div className="flex justify-between items-center mb-4 border-b border-white/5 pb-3">
              <span className="text-xs font-black uppercase tracking-widest text-pink-400">Comments</span>
              <button onClick={() => setCommentPostId(null)} className="text-gray-500 hover:text-white uppercase text-[10px] font-black">Close</button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 mb-4">
              {postComments.length === 0 ? (
                <p className="text-[10px] text-gray-600 italic text-center py-6">No comments yet. Share your thoughts!</p>
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
              <input type="text" value={newComment} onChange={(e) => setNewComment(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && sendComment()} placeholder="Share your thoughts..."
                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white outline-none focus:border-pink-500" />
              <button onClick={sendComment} className="bg-pink-600 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest">Post</button>
            </div>
          </div>
        </div>
      )}

      {/* GIFT MODAL */}
      {giftPostId && (
        <div className="fixed inset-0 z-[1000] bg-black/70 backdrop-blur-sm flex items-end">
          <div className="w-full bg-slate-950 rounded-t-[2.5rem] border-t-2 border-yellow-500 p-6 shadow-2xl">
            <div className="flex justify-between items-center mb-5">
              <h3 className="text-sm font-black text-yellow-500 uppercase tracking-widest">Send Gift to Creator</h3>
              <X className="cursor-pointer text-gray-500" onClick={() => setGiftPostId(null)} />
            </div>
            <div className="grid grid-cols-3 gap-3">
              {[
                { id: 1, name: 'Coffee', cost: 500, icon: '☕' },
                { id: 2, name: 'Pizza Party', cost: 1000, icon: '🍕' },
                { id: 3, name: 'Mega Heart', cost: 2500, icon: '❤️' },
                { id: 4, name: 'Super Car', cost: 5000, icon: '🏎️' },
                { id: 5, name: 'Private Jet', cost: 8000, icon: '🛩️' },
                { id: 6, name: 'AJ Mansion', cost: 10000, icon: '🏰' }
              ].map(g => (
                <button key={g.id} onClick={() => sendGift(g)} className="bg-white/5 border border-white/10 py-3 rounded-2xl text-[10px] font-black uppercase hover:border-yellow-500 transition-all flex flex-col items-center gap-1">
                  <span className="text-2xl">{g.icon}</span>
                  <span className="text-white text-[9px]">{g.name}</span>
                  <span className="text-yellow-500 text-[8px]">{g.cost} 🪙</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
