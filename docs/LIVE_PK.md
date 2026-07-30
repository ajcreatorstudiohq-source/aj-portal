# Live (TikReels · Agora)

ZegoCloud and standalone Go Live / Join Live screens are removed.

## Host
1. Social Hub → **AJ TikReels** → **Live** tab
2. Tap **Go Live** (Agora publishes camera + mic)
3. Room is listed for others in the Live reel feed

## Viewer
1. TikReels → **Live**
2. Swipe vertical reels of active streams · tap to join (Agora audience)

## Following
TikReels → **Following** shows videos only from accounts you follow.

## Config
- `NEXT_PUBLIC_AGORA_APP_ID`
- `AGORA_APP_CERTIFICATE` (server-only; used by `/api/agora/token`)

## Firestore
`live_rooms` — discovery, heartbeats, viewer counts (rules still required).
