// js/firebase-init.js
// ──────────────────────────────────────────────────────────────────────────
// SETUP: Replace the firebaseConfig object below with your own Firebase
// project credentials. You can find these in:
//   Firebase Console → Project Settings → Your Apps → SDK setup and config
// ──────────────────────────────────────────────────────────────────────────

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyAYXHb_gvX0PkWv0brwitQL9Lus8YgN8DE",
  authDomain: "win-the-series.firebaseapp.com",
  projectId: "win-the-series",
  storageBucket: "win-the-series.firebasestorage.app",
  messagingSenderId: "735196186938",
  appId: "1:735196186938:web:35be4c8e6f892a95e7a803",
  measurementId: "G-D84W4YNWH1",
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
