# Firebase Authentication — Authorized Domains (Google OAuth)

AJ Super Portal uses Firebase Auth with **Continue with Google** (`signInWithPopup` + `GoogleAuthProvider`).

OAuth only works when the browser origin is listed under Firebase **Authorized domains**.
Wildcards like `*.netlify.app` are **not** supported — each hostname must be listed.

## Automatic fix (preferred)

The app auto-registers allowed Netlify / Vercel preview hosts via:

`POST /api/auth/authorized-domains` → Identity Toolkit Admin API

Requires `FIREBASE_SERVICE_ACCOUNT_JSON` on the host (Vercel / Netlify) with permission to update Identity Toolkit project config.

Allowed auto-hosts include:

- `aj-studio-portal.netlify.app`
- `deploy-preview-N--aj-studio-portal.netlify.app` (e.g. PR #95)
- other `*--aj-studio-portal.netlify.app` branch deploys
- known `aj-portal*.vercel.app` preview hosts

On the auth screen (and before Google login), the client calls this API for the current hostname.

## Manual fallback (Firebase Console)

1. Open [Firebase Console](https://console.firebase.google.com/) → project **`aj-super-portal`**
2. **Authentication** → **Settings** → **Authorized domains**
3. Add (no `https://` prefix):

| Environment | Domain |
|---|---|
| Firebase auth helper | `aj-super-portal.firebaseapp.com` |
| Local | `localhost` |
| Netlify production | `aj-studio-portal.netlify.app` |
| Netlify PR #95 preview | `deploy-preview-95--aj-studio-portal.netlify.app` |
| Production custom domain | your live domain (+ `www` if used) |

Also Google Cloud Console → **APIs & Services** → **Credentials** → OAuth 2.0 Client:

- **Authorized JavaScript origins**: production + Netlify origins you use
- **Authorized redirect URIs**:  
  `https://aj-super-portal.firebaseapp.com/__/auth/handler`

## App config

```
authDomain: "aj-super-portal.firebaseapp.com"
```

Keep `authDomain` as the Firebase project domain unless you configured a custom auth domain.

Optional env:

- `FIREBASE_SERVICE_ACCOUNT_JSON` — required for auto domain sync
- `FIREBASE_EXTRA_AUTH_DOMAINS` — comma-separated extra hosts to always merge

## Checklist

1. Deploy with Admin SDK env set
2. Open preview → hard refresh → wait ~2s (auto-register)
3. **Continue with Google**
4. If still `auth/unauthorized-domain`, add the exact hostname in Console and retry after 1–2 minutes

## Common errors

| Error | Fix |
|---|---|
| `auth/unauthorized-domain` | Auto-register (retry login) or add host in Authorized domains |
| `admin_sdk_missing` on `/api/auth/authorized-domains` | Set `FIREBASE_SERVICE_ACCOUNT_JSON` on Netlify/Vercel |
| `auth/popup-blocked` | Allow popups |
| `auth/popup-closed-by-user` | User closed Google window — retry |
