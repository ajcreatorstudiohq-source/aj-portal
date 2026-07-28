# Permanent TikTok-style comments (`reel_comments`)

Comments are stored in a **top-level** Firestore collection so every signed-in user can read/write them.

## Why comments vanished after 2–3s

Client `addDoc` can resolve against the **local cache**, then the **server rejects** the write (rules). `onSnapshot` then replaces the list without that doc → comment disappears.

## Fix in the app

1. Pending local comments kept in a ref and **merged** into every snapshot (never wiped by an empty/partial server list).
2. Submit clears **only the input**, not the comment list.
3. Write prefers **`POST /api/comments`** (Admin SDK) so rules cannot roll back.
4. Client write is verified with `waitForPendingWrites` + `getDocFromServer`.

## Console setup

1. Publish `firestore.rules` including `match /reel_comments/{commentId}`.
2. Set `FIREBASE_SERVICE_ACCOUNT_JSON` on Vercel for reliable API writes.
