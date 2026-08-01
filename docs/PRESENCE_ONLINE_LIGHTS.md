# Admin online / offline lights

Ban panel (`AdminUsersPanel` + `/aj-admin`) shows a **green** light when a user is in the portal, **red** when offline.

## How it works

1. Every signed-in client writes RTDB `presence/{uid}` = `{ state: 'online', … }` and registers `onDisconnect` → `offline`.
2. Heartbeat every **25s** also writes Firestore `users/{uid}.status = 'online'` + `lastSeenMs`.
3. Admin UI listens to RTDB `presence` in real time and merges with `lastSeenMs` (90s window).

## Console setup (required once)

Firebase Console → **Realtime Database** → **Rules** → paste repo `database.rules.json` → **Publish**.

Must include:

```
"presence": {
  ".read": "auth != null",
  "$uid": {
    ".write": "auth != null && auth.uid == $uid"
  }
}
```

Without this, presence writes fail and lights fall back to Firestore `lastSeenMs` only (still works if heartbeat succeeds).
