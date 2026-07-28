# TikTok-style DMs (`chats` + `chat_partners`)

## Paths

| Path | Purpose |
|---|---|
| `chats/{uidA_uidB}` | Shared thread metadata (`participants`, `lastMessage`, `lastAt`) |
| `chats/{chatId}/messages/{id}` | Real-time messages both users see |
| `users/{uid}/chat_partners/{otherUid}` | Inbox list + saved friend ids |

`chatId` = `[uidA, uidB].sort().join('_')` so both users open the **same** thread.

## Profile UX

- **Other profile** → Message icon opens that 1:1 chat
- **Own profile** → Message icon opens inbox of everyone you’ve chatted with

## Console

Publish `firestore.rules` (includes `chats` + `chat_partners`). Without this, the catch-all deny blocks all DMs.
