// js/db.js
// ──────────────────────────────────────────────────────────────────────────
// Firestore data layer — all reads/writes go through here.
// Data model:
//   users/{uid}/games/{YYYY-MM-DD}  → single game log
//   users/{uid}/series/{week-YYYY-MM-DD} → series summary (denormalized)
// ──────────────────────────────────────────────────────────────────────────

import { db } from "./firebase-init.js";
import {
  doc, getDoc, getDocs, setDoc, updateDoc,
  collection, query, orderBy, limit, serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { toDateKey, toWeekKey, getWeekStart, computeSeries } from "./game-logic.js";

// ── GAME LOGS ─────────────────────────────────────────────────────────────

/**
 * Log (or overwrite) a single game result for a given date.
 */
export async function logGame(uid, date, { result, factors, note, gameNum, venue }) {
  const key = toDateKey(date);
  const ref = doc(db, "users", uid, "games", key);
  await setDoc(ref, {
    date: key,
    result,          // "win" | "loss"
    factors,         // string[]
    note: note || "",
    gameNum,
    venue,
    loggedAt: serverTimestamp(),
  });
}

/**
 * Fetch all game logs for the current week.
 */
export async function getWeekGames(uid, weekStart) {
  const games = [];
  // Build the 7 date keys for this week
  for (let i = 0; i < 7; i++) {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    const key = toDateKey(d);
    const snap = await getDoc(doc(db, "users", uid, "games", key));
    if (snap.exists()) games.push({ dateKey: key, ...snap.data() });
  }
  return games;
}

/**
 * Fetch a single day's game log (returns null if not found).
 */
export async function getDayGame(uid, date) {
  const key = toDateKey(date);
  const snap = await getDoc(doc(db, "users", uid, "games", key));
  return snap.exists() ? snap.data() : null;
}

// ── SERIES SUMMARIES ──────────────────────────────────────────────────────

/**
 * Write (or update) the series summary doc for the current week.
 */
export async function saveSeries(uid, weekStart, summary) {
  const key = toWeekKey(weekStart);
  const ref = doc(db, "users", uid, "series", key);
  await setDoc(ref, {
    weekKey: key,
    weekStart: toDateKey(weekStart),
    ...summary,
    updatedAt: serverTimestamp(),
  }, { merge: true });
}

/**
 * Fetch all historical series, ordered by weekStart descending.
 * Returns an array of series summary objects.
 */
export async function getAllSeries(uid, maxCount = 52) {
  const ref = collection(db, "users", uid, "series");
  const q = query(ref, orderBy("weekStart", "desc"), limit(maxCount));
  const snap = await getDocs(q);
  return snap.docs.map(d => d.data());
}

// ── SCOUTING / ANALYTICS ──────────────────────────────────────────────────

/**
 * Fetch all game logs and tally factor frequencies.
 * Returns { winFactors: Map<string, number>, lossFactors: Map<string, number> }
 */
export async function getFactorStats(uid) {
  const ref = collection(db, "users", uid, "games");
  const snap = await getDocs(ref);

  const winFactors  = new Map();
  const lossFactors = new Map();

  snap.forEach(d => {
    const { result, factors = [] } = d.data();
    const target = result === "win" ? winFactors : lossFactors;
    for (const f of factors) {
      target.set(f, (target.get(f) || 0) + 1);
    }
  });

  return { winFactors, lossFactors };
}

/**
 * Return a Set of date keys that have been logged (for grace period check).
 */
export async function getLoggedDateKeys(uid) {
  const ref = collection(db, "users", uid, "games");
  const snap = await getDocs(ref);
  return new Set(snap.docs.map(d => d.id));
}
