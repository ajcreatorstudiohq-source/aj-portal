# Firebase Authentication — Authorized Domains (Google OAuth)

AJ Super Portal uses Firebase Auth with **Continue with Google** (`signInWithPopup` + `GoogleAuthProvider`).

OAuth only works when the browser origin is listed under Firebase **Authorized domains**.

## Where to configure

1. Open [Firebase Console](https://console.firebase.google.com/) → project **`aj-super-portal`**
2. **Authentication** → **Settings** → **Authorized domains**
3. Add every host where the app is opened (no `https://` prefix)

## Domains to add

| Environment | Domain to authorize | Notes |
|---|---|---|
| Firebase hosted auth helper | `aj-super-portal.firebaseapp.com` | Usually present by default |
| Local development | `localhost` | Required for `next dev` / `http://localhost:3000` |
| Production custom domain | *your live domain* e.g. `ajsuperportal.com` | Apex + `www` if both are used |
| Preview / Vercel | `*.vercel.app` is **not** a wildcard — add each preview host, or use a stable preview domain | Add the exact hostname from the address bar |
| Cursor / cloud preview | Exact preview hostname shown in the browser | Copy host only (e.g. `xxxx.cursor.app`) |

Also ensure Google Cloud Console → **APIs & Services** → **Credentials** → your OAuth 2.0 Client:

- **Authorized JavaScript origins** include `http://localhost:3000` and your production origin
- **Authorized redirect URIs** include  
  `https://aj-super-portal.firebaseapp.com/__/auth/handler`

## App config

Client Firebase config uses:

```
authDomain: "aj-super-portal.firebaseapp.com"
```

Keep `authDomain` as the Firebase project domain (not your custom domain) unless you have set up a [custom auth domain](https://firebase.google.com/docs/auth/web/redirect-best-practices).

Optional env overrides (see `.env.example`):

- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- …

## Local checklist

1. `npm run dev` → open `http://localhost:3000`
2. Confirm `localhost` is authorized in Firebase
3. Click **Continue with Google** — popup should complete without `auth/unauthorized-domain`
4. New users get `users/{uid}` with `unlockedGames: []` and `gameProgress: {}`

## Production / preview checklist

1. Deploy
2. Copy the exact hostname from the live URL
3. Add it under Authorized domains
4. Wait 1–2 minutes, hard-refresh, retry Google sign-in
5. If popup is blocked on in-app browsers, fall back guidance: open in system browser

## Common errors

| Error | Fix |
|---|---|
| `auth/unauthorized-domain` | Add the current hostname to Authorized domains |
| `auth/popup-blocked` | Allow popups or use a top-level browser window |
| `auth/popup-closed-by-user` | User closed the Google window — retry |
| `auth/network-request-failed` | Check ad blockers / network allowing `googleapis.com` |
