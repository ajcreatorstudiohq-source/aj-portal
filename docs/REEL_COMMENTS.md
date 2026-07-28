# Permanent TikTok-style comments (`reel_comments`)

Comments are stored in a **top-level** Firestore collection so every signed-in user can read/write them (not nested under posts — those rules often aren’t published).

## Collection

`reel_comments/{id}`

| Field | Type |
|---|---|
| `postId` | string (user_posts / pulse_posts / yt id) |
| `postType` | `user_posts` \| `pulse_posts` \| `yt_posts` |
| `text` | string |
| `uid` | string |
| `username` | string |
| `photo` | string |
| `createdAt` | timestamp |
| `createdAtMs` | number |

## Console setup (required once)

1. Firebase Console → **Firestore → Rules** → merge `firestore.rules` (includes `match /reel_comments/{commentId}`) → **Publish**
2. Optional: set `FIREBASE_SERVICE_ACCOUNT_JSON` on Vercel so `/api/comments` can save if client rules lag

No composite index needed (query is `where postId == …` only; client sorts by `createdAtMs`).
