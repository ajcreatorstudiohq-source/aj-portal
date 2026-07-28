# Firebase Storage + Firestore rules for TikReels (all users)

Project: **`aj-super-portal`**. Repo files: `storage.rules`, `firestore.rules`.

## Public media hosting (no paid Firebase Storage)

Uploads no longer depend on Firebase Storage for TikReels.

Order in `app/lib/media-upload.ts`:

1. **Cloudinary** unsigned preset (`atm28akz` / `aj_portal`) — free CDN HTTPS
2. **Catbox.moe** — free anonymous public file URL
3. Firebase Storage — **skipped for videos** (403 / free-tier / locked rules)

New posts store public `https://…` URLs in `videoUrl` + `image`, so every user’s `<video src>` works without CORS/403.

**Note:** Old posts that already point at locked Firebase Storage URLs may still 403 until re-uploaded. New uploads are fixed.

---

## Why other users' videos look like photos / won't open

1. **Legacy Firebase Storage URLs** locked / free-tier 403 (fixed going forward via Cloudinary/Catbox)
2. **Firestore read locked to owner** on `user_posts` / `videos`
3. **Missing `isVideo`** on legacy docs
4. **Do not use `crossOrigin="anonymous"` on TikReel `<video>`**

Also publish Storage/Firestore rules below if you still want Firebase as a backup host.

## Storage rules (required)

Firebase Console → **Storage** → **Rules** → paste from `storage.rules` → **Publish**.

Minimum (public read on media folders):

```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /tikreels/{userId}/{allPaths=**} {
      allow read: if true;
      allow write: if request.auth != null && request.auth.uid == userId;
    }
    match /profile_photos/{userId}/{allPaths=**} {
      allow read: if true;
      allow write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

Upload path used by the app: `tikreels/{uid}/{timestamp}_{name}.mp4` (videos) and `profile_photos/{uid}/…` (images / legacy).

### CORS (only if canvas/WebGL reads frames; plain `<video src>` usually OK)

Create `cors.json`:

```json
[
  {
    "origin": ["*"],
    "method": ["GET", "HEAD"],
    "maxAgeSeconds": 3600,
    "responseHeader": ["Content-Type", "Content-Length", "Accept-Ranges", "Content-Range"]
  }
]
```

Then:

```bash
gsutil cors set cors.json gs://aj-super-portal.appspot.com
```

## Firestore rules (required for feed + profiles)

Firebase Console → **Firestore Database** → **Rules** → merge `firestore.rules` (do not wipe wallet/admin rules blindly).

Must allow **any signed-in user** to **read** list/get on:

| Collection | Read | Write |
|---|---|---|
| `user_posts` | all signed-in | owner create/update/delete |
| `videos` | all signed-in | owner create/update/delete |
| `pulse_posts` | all signed-in | owner create/update/delete |
| `users/{uid}/videos` | all signed-in | owner |

If `videos` is owner-read-only, other creators only appear via `user_posts` — keep `user_posts` world-readable (signed-in) and always set `videoUrl` + `isVideo: true` on upload (app already does).

### Indexes

Create single-field / composite indexes if Console prompts for:

- `user_posts`: `uid` Asc, `createdAt` Desc  
- `user_posts`: `userId` Asc, `createdAt` Desc  
- `videos`: `userId` Asc · `uid` Asc  
- `pulse_posts`: same as user_posts  

## Checklist after publishing rules

1. User A uploads a TikReel → confirm Storage object under `tikreels/{A}/…` and docs in `user_posts` + `videos` with `isVideo: true` and `videoUrl` HTTPS.
2. User B opens TikReel feed → A's clip uses `<video>`, not `<img>`.
3. User B opens A's profile → grid opens fullscreen player with the same `videoUrl`.
4. In DevTools Network, `firebasestorage.googleapis.com/.../tikreels%2F...` returns **200**, not 403.

## Watch Ads (Adsterra) — already pays coins

Offer Hub → **Watch Ads** (`RewardedVideoOffer`):

1. `POST /api/ads/rewarded` `action: prepare` → session in `ad_reward_sessions`
2. Opens `ADSTERRA_REWARDED_LINK` (paid Direct Link / smartlink)
3. Client requires **30s** away (visibility) → unlocks Claim
4. `action: claim_adsterra` credits **`ADSTERRA_REWARD_COINS` (5)** to `users.balance` (daily cap `OFFERWALL_VIDEO_MAX_DAILY`, default 8)

Strengthen: raise verify seconds / coins in `app/lib/ads-config.ts`, keep server `createdAtMs` gate, and ensure Adsterra Direct Link is the **paid** smartlink from your Adsterra dashboard (not a test URL).
