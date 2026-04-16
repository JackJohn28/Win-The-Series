// js/game-logic.js
// ──────────────────────────────────────────────────────────────────────────
// All game logic: series state, week calculation, check-in data.
// ──────────────────────────────────────────────────────────────────────────

// Week starts on Saturday (day 6 in JS getDay())
// SCHEDULE: Sat=G1, Sun=G2, Mon=G3, Tue=G4, Wed=G5, Thu=G6, Fri=G7
export const SCHEDULE = [
  { day: 6, label: "SAT", name: "Saturday",  game: 1, venue: "home" },
  { day: 0, label: "SUN", name: "Sunday",    game: 2, venue: "home" },
  { day: 1, label: "MON", name: "Monday",    game: 3, venue: "away" },
  { day: 2, label: "TUE", name: "Tuesday",   game: 4, venue: "away" },
  { day: 3, label: "WED", name: "Wednesday", game: 5, venue: "away" },
  { day: 4, label: "THU", name: "Thursday",  game: 6, venue: "home" },
  { day: 5, label: "FRI", name: "Friday",    game: 7, venue: "home" },
];

export const WIN_FACTORS = [
  "Morning routine",
  "Exercise / Workout",
  "Healthy eating",
  "Deep work block",
  "No social media",
  "Cold shower",
  "Meditation",
  "Early to bed",
  "Read 30+ min",
  "Journaling",
  "No alcohol",
  "Hydration goal",
];

export const LOSS_FACTORS = [
  "Overslept",
  "Skipped workout",
  "Poor diet",
  "Too much screen time",
  "Procrastinated",
  "No focus time",
  "Stayed up late",
  "Skipped reading",
  "Alcohol / junk food",
  "Missed journaling",
  "Reactive day",
  "Low energy",
];

/**
 * Get the Saturday that starts the current week (or the most recent one).
 * Returns a Date at midnight local time.
 */
export function getWeekStart(now = new Date()) {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay(); // 0=Sun … 6=Sat
  // Days since last Saturday
  const daysSinceSat = (day + 1) % 7; // Sun→1, Mon→2, …, Sat→0
  d.setDate(d.getDate() - daysSinceSat);
  return d;
}

/**
 * Return a YYYY-MM-DD string for a Date (used as Firestore doc IDs).
 */
export function toDateKey(date) {
  return date.toISOString().slice(0, 10);
}

/**
 * Return a week key like "2025-W27" for grouping.
 */
export function toWeekKey(weekStart) {
  return `week-${toDateKey(weekStart)}`;
}

/**
 * Get today's game index (0–6) within the series, and which slot it is.
 */
export function getTodaySlot(now = new Date()) {
  const day = now.getDay();
  return SCHEDULE.findIndex(s => s.day === day);
}

/**
 * Compute the series summary from an array of game results.
 * Each result: { result: "win"|"loss"|"forfeit" }
 */
export function computeSeries(games) {
  let wins = 0, losses = 0, clinched = false, eliminated = false, sweep = false;

  for (const g of games) {
    if (g.result === "win")    wins++;
    if (g.result === "loss" || g.result === "forfeit") losses++;
  }

  if (wins >= 4)   { clinched = true; if (losses === 0) sweep = true; }
  if (losses >= 4) { eliminated = true; }

  return { wins, losses, clinched, eliminated, sweep };
}

/**
 * Check if yesterday's game was skipped (grace period logic).
 */
export function isGracePeriodActive(loggedDates, now = new Date()) {
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  yesterday.setHours(0, 0, 0, 0);

  const weekStart = getWeekStart(now);
  if (yesterday < weekStart) return false; // Yesterday was last week

  const yesterdaySlot = SCHEDULE.findIndex(s => s.day === yesterday.getDay());
  if (yesterdaySlot === -1) return false;

  const yKey = toDateKey(yesterday);
  return !loggedDates.has(yKey);
}
