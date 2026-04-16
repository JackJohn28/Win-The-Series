# Win The Day: The Series — Setup Guide

## Project Structure
```
win-the-day/
├── index.html              ← Main app shell
├── manifest.json           ← PWA manifest
├── sw.js                   ← Service worker (offline support)
├── firebase.json           ← Firebase Hosting + Firestore config
├── firestore.rules         ← Security rules (users own their data)
├── firestore.indexes.json  ← Firestore query indexes
├── css/
│   ├── base.css            ← Theme, layout, shared styles
│   ├── home.css            ← Series + schedule grid
│   ├── checkin.css         ← Nightly check-in UI
│   └── scouting.css        ← Stats + history tab
└── js/
    ├── firebase-init.js    ← ⚠️  YOUR CREDENTIALS GO HERE
    ├── game-logic.js       ← Pure logic (schedule, series calc)
    ├── db.js               ← Firestore read/write layer
    └── app.js              ← UI controller + event handlers
```

---

## Step 1 — Create a Firebase Project

1. Go to https://console.firebase.google.com
2. Click **Add project** → give it a name (e.g. `win-the-day`)
3. Disable Google Analytics if you don't need it → **Create project**

---

## Step 2 — Enable Authentication

1. In the Firebase Console sidebar: **Authentication → Get Started**
2. Under **Sign-in method**, enable **Google**
3. Set a support email → **Save**

---

## Step 3 — Create a Firestore Database

1. Sidebar: **Firestore Database → Create database**
2. Choose **Start in production mode** (rules will be deployed separately)
3. Pick your region (e.g. `us-central`) → **Enable**

---

## Step 4 — Register a Web App & Get Credentials

1. Project overview → click the **</>** (Web) icon
2. Register app with a nickname (e.g. `win-the-day-web`)
3. **Do NOT** check "Firebase Hosting" here (you'll configure it via CLI)
4. Copy the `firebaseConfig` object shown — it looks like:
   ```js
   const firebaseConfig = {
     apiKey: "AIza...",
     authDomain: "win-the-day-xxxxx.firebaseapp.com",
     projectId: "win-the-day-xxxxx",
     storageBucket: "win-the-day-xxxxx.appspot.com",
     messagingSenderId: "123456789",
     appId: "1:123456789:web:abcdef"
   };
   ```
5. **Paste this into `js/firebase-init.js`** replacing the placeholder values.

---

## Step 5 — Add Your Domain to Authorized Domains

1. **Authentication → Settings → Authorized domains**
2. Your Firebase Hosting domain is auto-added.
3. If testing locally, `localhost` should already be there.

---

## Step 6 — Install Firebase CLI & Deploy

```bash
# Install Firebase CLI globally (needs Node.js)
npm install -g firebase-tools

# Log in
firebase login

# From the project folder, initialize (choose Hosting + Firestore)
firebase init

# When prompted:
#  ✅ Firestore: Configure security rules and indexes
#  ✅ Hosting: Configure files for Firebase Hosting
#  → Use existing project → select your project
#  → Firestore rules file: firestore.rules (press Enter for default)
#  → Firestore indexes file: firestore.indexes.json
#  → Public directory: . (just a dot)
#  → Single-page app: Yes
#  → Don't overwrite index.html

# Deploy everything
firebase deploy
```

Your app will be live at `https://YOUR-PROJECT-ID.web.app` 🎉

---

## Step 7 — Test Locally

```bash
# Serve locally without deploying
firebase serve

# Or just open index.html in a browser (Google Sign-In won't work without
# the Firebase Hosting URL or localhost in Authorized Domains)
```

---

## Firestore Data Model

```
users/
  {uid}/
    games/
      {YYYY-MM-DD}/          ← One doc per day
        date: "2025-07-12"
        result: "win" | "loss"
        factors: ["Morning routine", "Exercise"]
        note: "Crushed it today"
        gameNum: 1
        venue: "home"
        loggedAt: Timestamp

    series/
      {week-YYYY-MM-DD}/     ← One doc per week
        weekKey: "week-2025-07-12"
        weekStart: "2025-07-12"
        wins: 4
        losses: 1
        clinched: true
        eliminated: false
        sweep: false
        updatedAt: Timestamp
```

---

## Adding App Icons (for PWA install)

The `manifest.json` references `icons/icon-192.png` and `icons/icon-512.png`.
Create an `icons/` folder and add square PNG files at those sizes.
You can use https://realfavicongenerator.net to generate them from any image.

---

## Customizing Habits

Edit the `WIN_FACTORS` and `LOSS_FACTORS` arrays in `js/game-logic.js`
to match your personal habits. Future roadmap item: custom playbooks via UI.

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| "Sign in with Google" does nothing | Check Authorized Domains in Firebase Auth settings |
| "Missing credentials" error | Double-check your `firebaseConfig` in `firebase-init.js` |
| Data not loading | Check Firestore rules are deployed (`firebase deploy --only firestore:rules`) |
| App not installable as PWA | Must be served over HTTPS (Firebase Hosting handles this) |
