# Pulse = TikReel (photos)

Pulse uses the same full-screen snap feed, side actions (Gift / Like / Comment / Share / Delete), profile Edit + Message, and comments sheet as TikReels.

| | TikReels | Pulse |
|---|---|---|
| Media | Videos | Photos |
| Collection | `user_posts` / `videos` | `pulse_posts` |

## Chat (both sides)

`chats/{sortedUidA_uidB}/messages` is shared. Both users open the same `chatId`, so `onSnapshot` delivers every message to both devices. Partner rows under `users/{uid}/chat_partners` keep the inbox list in sync.
