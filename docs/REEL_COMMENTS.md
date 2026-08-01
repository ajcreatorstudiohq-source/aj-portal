# Permanent TikTok-style comments (`reel_comments`)

Comments are stored in a **top-level** Firestore collection so every viewer can read them and every signed-in user can write them.

## Doc shape

```
reel_comments/{id} = {
  postId,          // canonical parent id
  postIds,         // all aliases (user_posts id + videos id, etc.)
  postType,        // user_posts | videos | pulse_posts | yt_posts
  text, uid, username, photo,
  createdAt, createdAtMs
}
```

## Why the badge showed 4–5 but the sheet was empty

1. Comment listener lived inside the TikReels/Pulse feed `useEffect`. Those branches **return early**, so on the feed the sheet never subscribed / fetched — only `commentCount` on the post doc was visible.
2. Dual-write posts (`user_posts` + `videos`) could store comments under one id while the UI opened the other.

## Fix in the app

1. **Dedicated** comment `useEffect` (not inside feed listeners).
2. Resolve **post id aliases** and query `postId in [...]` + `postIds array-contains`.
3. Load from `reel_comments` + nested `*/comments` + `GET /api/comments`.
4. Pending local rows merged so snapshots never wipe a just-posted comment.
5. Sheet UI: `min-h` list above the keyboard so prior comments stay visible.

## Console setup

1. Publish `firestore.rules` including `match /reel_comments/{commentId}` (public **read**).
2. Set `FIREBASE_SERVICE_ACCOUNT_JSON` on Vercel for reliable API writes.
3. If `postIds array-contains` queries fail, create the single-field index Firebase suggests in the console error link.
