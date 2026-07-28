# Live + PK match

## Live
- Host: Social Hub → Go Live → Start Live (Room ID copy)
- Viewers: Join Live → tap room or paste **Live Room ID**
- Real-time `liveViewers` on host + watcher headers
- Video via RTDB `live_frames/{roomId}/current`; audio via `live_audio`

## PK (TikTok-style)
1. Host starts Live → **PK Battle** → enter rival **User ID**
2. Rival gets accept modal **or** pastes **PK Match ID** on Join Live
3. Split-screen + shared scores; gifts boost your side in real time
4. Copy **PK Match ID** during battle to share

## Firestore rules (publish required)
`live_rooms`, `pk_sessions` (+ `gifts`), `notifications` — without these, catch-all deny blocks live/PK.
