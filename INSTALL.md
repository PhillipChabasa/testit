# TESTIT PWA — Installation & Deployment Guide

## What changed

| Before | After |
|--------|-------|
| Single HTML file, `file://` protocol | PWA: `index.html` + `sw.js` + `manifest.json` + `auth.html` |
| Android WebView with OAuth hacks | Standard browser — works in Chrome, Samsung Internet, Safari |
| Fragile WebView token flow | Industry-standard PKCE Authorization Code flow |
| No service worker | Full offline support with background sync |
| Not installable | Installable on Android, iOS, Windows, macOS, Linux |

---

## Files

```
testit-pwa/
├── index.html          ← Main app (all UI + logic)
├── auth.html           ← OAuth redirect handler
├── sw.js               ← Service worker (offline + caching)
├── manifest.json       ← PWA manifest (name, icons, shortcuts)
├── icons/
│   ├── icon-192.png
│   └── icon-512.png
├── 404.html            ← GitHub Pages SPA routing helper
├── _redirects          ← Netlify SPA routing
└── INSTALL.md          ← This file
```

---

## Step 1 — Google OAuth Setup (one-time)

1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Create a project (or select an existing one)
3. Enable the **Google Drive API**
4. Go to **APIs & Services → Credentials → Create Credentials → OAuth client ID**
5. Application type: **Web application**
6. Name: `TESTIT`
7. Under **Authorised JavaScript origins**, add:
   - `https://YOUR-USERNAME.github.io` (for GitHub Pages)
   - `https://YOUR-APP.netlify.app` (for Netlify, if using)
8. Under **Authorised redirect URIs**, add:
   - `https://YOUR-USERNAME.github.io/testit/auth.html`
   - `https://YOUR-APP.netlify.app/auth.html`
9. Click **Create** and copy the **Client ID** (ends in `.apps.googleusercontent.com`)
10. Open `index.html`, find `GOOGLE_CLIENT_ID:` and replace the placeholder with your Client ID

---

## Step 2A — Deploy to GitHub Pages (recommended)

```bash
# Create a new repository called "testit" on GitHub, then:
git init
git add .
git commit -m "TESTIT PWA v4"
git remote add origin https://github.com/YOUR-USERNAME/testit.git
git push -u origin main
```

Then in your repo:
- Go to **Settings → Pages**
- Source: **Deploy from a branch**
- Branch: `main` / `/ (root)`
- Click **Save**

Your app will be live at `https://YOUR-USERNAME.github.io/testit/`

---

## Step 2B — Deploy to Netlify (alternative)

```bash
# Option 1: Netlify CLI
npm install -g netlify-cli
netlify deploy --prod --dir .

# Option 2: Drag-and-drop
# Go to netlify.com → New site → Drag the testit-pwa/ folder
```

Your app will be at `https://RANDOM-NAME.netlify.app`

---

## Step 3 — Install as PWA on Android

1. Open Chrome on Android
2. Navigate to your GitHub Pages / Netlify URL
3. Tap the **three-dot menu → Add to Home Screen** (or the install banner that appears automatically)
4. Confirm install
5. The app now behaves like a native app: full-screen, offline, home screen icon

**First launch after install:**
- Open the app → go to **Settings → Sign In with Google**
- Complete sign-in in the browser popup
- Sync happens automatically

---

## Step 4 — Install on Desktop (Chrome / Edge)

1. Navigate to your URL
2. Click the **install icon** in the address bar (or menu → Install TESTIT)
3. TESTIT opens as a standalone window

---

## Step 5 — Install on iOS / Safari

1. Open Safari (iOS does not support PWA install from Chrome)
2. Navigate to your URL
3. Tap **Share → Add to Home Screen**
4. Confirm

Note: iOS Safari does not support the Background Sync API. Manual sync is available via Settings.

---

## How sync works (Anki-style)

| When | What happens |
|------|-------------|
| App opens | Checks stored token; silently syncs if signed in + online |
| Answer a question | Auto-saved locally (localStorage) immediately |
| Come back online | Automatic sync triggered |
| Background sync | Service worker triggers sync even when app isn't open |
| Manual sync | Settings → Sync Now |
| Offline | All study features work perfectly; sync queued |

**Conflict resolution:** newest-wins (by `lastModified` timestamp). Safe to sync from two devices — the one that synced last wins.

---

## Updating the app

When a new version is deployed, Chrome will detect the new service worker and prompt you to reload. The update banner reads: "TESTIT update available. Reload?" — click yes to get the latest version.

---

## Troubleshooting

**Sign-in popup is blocked:**
Chrome may block the popup on first use. Allow popups for your domain in Chrome settings, or use the redirect fallback (which works without popup permission).

**"Configure GOOGLE_CLIENT_ID first" error:**
You haven't added your Client ID yet. See Step 1.

**Sync fails with 401:**
Your access token expired. Go to Settings → Sign Out → Sign In again. Tokens last ~1 hour; re-auth is one click.

**App not working offline:**
Make sure you've visited the app at least once while online (so the service worker caches the shell). After that, full offline study works.

**"Origin not allowed" from Google:**
Your current domain isn't in the Authorised JavaScript Origins. Add it in Google Console → your OAuth client → Authorised JavaScript origins.

---

## Data migration from the old APK

Your quiz data lives in localStorage, keyed by `testit_quiz_*`. To migrate:

1. Open the old APK in a WebView browser
2. Go to Settings → Export Backup → save the JSON file
3. Open the new PWA in Chrome
4. Go to Settings → Import Backup → select the JSON file

All quizzes, progress, flags, and Anki cards are preserved.

---

## Security notes

- PKCE prevents authorization code interception (no client_secret needed for public clients)
- Access tokens are stored in localStorage (encrypted-at-rest on Android)
- Google Drive scope is `drive.appdata` only — TESTIT cannot read your other Drive files
- No server, no backend, no data leaves your device except to your own Google Drive

---

*TESTIT v4 — PWA Edition*
