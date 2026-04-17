// js/app.js
// ──────────────────────────────────────────────────────────────────────────
// Main application controller.
// ──────────────────────────────────────────────────────────────────────────

import { auth } from "./firebase-init.js";
import {
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  SCHEDULE,
  WIN_FACTORS,
  LOSS_FACTORS,
  getWeekStart,
  toDateKey,
  toWeekKey,
  getTodaySlot,
  computeSeries,
  isGracePeriodActive,
} from "./game-logic.js";
import {
  logGame,
  getWeekGames,
  getDayGame,
  saveSeries,
  getAllSeries,
  getFactorStats,
  getLoggedDateKeys,
} from "./db.js";

// Handle redirect result on page load
getRedirectResult(auth)
  .then((result) => {
    console.log("Redirect result on load:", result);
  })
  .catch((e) => {
    console.log("Redirect error:", e);
  });

// ── State ─────────────────────────────────────────────────────────────────
let currentUser = null;
let weekGames = []; // array of logged game objects this week
let todayGame = null; // today's game log (or null)
let weekStart = getWeekStart();
let todaySlot = getTodaySlot();
let selectedResult = null;
let selectedFactors = new Set();

// ── Auth ──────────────────────────────────────────────────────────────────
document
  .getElementById("btn-google-signin")
  .addEventListener("click", async () => {
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: "select_account" });
      await signInWithRedirect(auth, provider);
    } catch (e) {
      console.log("Sign in error:", e);
      document.getElementById("auth-error").textContent = e.message;
    }
  });

document
  .getElementById("btn-signout")
  .addEventListener("click", () => signOut(auth));

onAuthStateChanged(auth, async (user) => {
  console.log("Auth state changed:", user);
  currentUser = user;
  if (user) {
    showApp();
    try {
      await loadAll();
    } catch (e) {
      console.log("loadAll error:", e);
    }
  } else {
    showAuth();
  }
});

function showAuth() {
  document.getElementById("screen-auth").style.display = "flex";
  document.getElementById("app").style.display = "none";
}

function showApp() {
  document.getElementById("screen-auth").style.display = "none";
  const appDiv = document.getElementById("app");
  appDiv.style.display = "flex";
  appDiv.style.flexDirection = "column";
  appDiv.style.height = "100dvh";
  appDiv.style.overflow = "hidden";
}

// ── Load all data ─────────────────────────────────────────────────────────
async function loadAll() {
  weekStart = getWeekStart();
  todaySlot = getTodaySlot();

  [weekGames, todayGame] = await Promise.all([
    getWeekGames(currentUser.uid, weekStart),
    getDayGame(currentUser.uid, new Date()),
  ]);

  renderVenue();
  renderHomeTab();
  renderCheckinTab();
}

// ── Venue logic ───────────────────────────────────────────────────────────
function renderVenue() {
  const slot = SCHEDULE[todaySlot];
  const venue = slot ? slot.venue : "home";
  document.body.classList.toggle("venue-away", venue === "away");

  const badge = document.getElementById("venue-badge");
  badge.textContent = venue === "home" ? "🏠 HOME" : "✈️ AWAY";
}

// ── HOME TAB ──────────────────────────────────────────────────────────────
function renderHomeTab() {
  const series = computeSeries(weekGames);
  const weekNum = getWeekNumber(weekStart);

  // Week label
  document.getElementById("series-week-label").textContent =
    `WEEK ${weekNum} — SERIES`;

  // Score
  document.getElementById("score-wins").textContent = series.wins;
  document.getElementById("score-losses").textContent = series.losses;

  // Clinch bar
  const fill = document.getElementById("clinch-fill");
  const pct = (series.wins / 7) * 100;
  fill.style.width = `${Math.min(pct, 100)}%`;
  fill.classList.toggle("losing", series.losses > series.wins);

  // Status text
  const status = document.getElementById("clinch-status");
  if (series.sweep) status.textContent = "🏆 SWEEP! Perfect Week!";
  else if (series.clinched) status.textContent = "✅ Week Clinched!";
  else if (series.eliminated) status.textContent = "Series Over — Eliminated";
  else {
    const winsNeeded = 4 - series.wins;
    status.textContent = `Win ${winsNeeded} more to clinch the week`;
  }

  // Championship banner
  document
    .getElementById("championship-banner")
    .classList.toggle("hidden", !series.clinched);

  // Schedule grid
  renderScheduleGrid(series);
}

function renderScheduleGrid(series) {
  const grid = document.getElementById("schedule-grid");
  grid.innerHTML = "";

  // Build map of dateKey → game result
  const resultMap = new Map();
  for (const g of weekGames) resultMap.set(g.dateKey, g.result);

  SCHEDULE.forEach((slot, idx) => {
    const gameDate = new Date(weekStart);
    gameDate.setDate(gameDate.getDate() + idx);
    const key = toDateKey(gameDate);
    const result = resultMap.get(key);
    const isToday = idx === todaySlot;

    const card = document.createElement("div");
    card.className = "game-card";
    if (isToday) card.classList.add("today");
    if (result === "win") card.classList.add("won");
    if (result === "loss" || result === "forfeit") card.classList.add("lost");

    card.innerHTML = `
      <span class="game-day">${slot.label}</span>
      <span class="game-num">G${slot.game}</span>
      <span class="game-venue-icon">${slot.venue === "home" ? "🏠" : "✈️"}</span>
      <span class="game-result">${
        result === "win"
          ? "W"
          : result === "loss"
            ? "L"
            : result === "forfeit"
              ? "F"
              : isToday
                ? "•"
                : "–"
      }</span>
    `;
    grid.appendChild(card);
  });
}

// ── CHECK-IN TAB ──────────────────────────────────────────────────────────
function renderCheckinTab() {
  const slot = SCHEDULE[todaySlot];
  const already = !!todayGame;

  document.getElementById("checkin-game-label").textContent = slot
    ? `TONIGHT — GAME ${slot.game}`
    : "NO GAME TODAY";

  document.getElementById("checkin-venue").textContent = slot
    ? slot.venue === "home"
      ? "🏠 HOME GAME"
      : "✈️ AWAY GAME"
    : "";

  document.getElementById("already-checked").style.display = already
    ? ""
    : "none";
  document.getElementById("result-buttons").style.display = already
    ? "none"
    : "";
  document.getElementById("win-factors").style.display = "none";
  document.getElementById("loss-factors").style.display = "none";
  document.getElementById("checkin-note-wrap").style.display = "none";

  if (already && todayGame) {
    document.getElementById("checked-result-text").textContent =
      `Result: ${todayGame.result.toUpperCase()} · ${todayGame.factors?.join(", ") || ""}`;
  }

  // Populate factor chips
  buildFactorChips("win-factor-grid", WIN_FACTORS, "win");
  buildFactorChips("loss-factor-grid", LOSS_FACTORS, "loss");

  // Grace period
  const loggedDates = new Set(weekGames.map((g) => g.dateKey));
  const grace = isGracePeriodActive(loggedDates);
  document.getElementById("grace-notice").style.display =
    !already && grace ? "" : "none";
}

function buildFactorChips(containerId, factors, type) {
  const container = document.getElementById(containerId);
  container.innerHTML = "";
  factors.forEach((f) => {
    const chip = document.createElement("button");
    chip.className = "factor-chip";
    chip.textContent = f;
    chip.addEventListener("click", () => {
      chip.classList.toggle(`selected-${type}`);
      if (chip.classList.contains(`selected-${type}`)) {
        selectedFactors.add(f);
      } else {
        selectedFactors.delete(f);
      }
    });
    container.appendChild(chip);
  });
}

// Result button clicks
document.getElementById("btn-win").addEventListener("click", () => {
  selectResult("win");
});
document.getElementById("btn-loss").addEventListener("click", () => {
  selectResult("loss");
});

function selectResult(result) {
  selectedResult = result;
  selectedFactors.clear();

  document
    .getElementById("btn-win")
    .classList.toggle("selected", result === "win");
  document
    .getElementById("btn-loss")
    .classList.toggle("selected", result === "loss");

  document.getElementById("win-factors").style.display =
    result === "win" ? "" : "none";
  document.getElementById("loss-factors").style.display =
    result === "loss" ? "" : "none";
  document.getElementById("checkin-note-wrap").style.display = "";

  // Reset chip selections
  document
    .querySelectorAll(".factor-chip")
    .forEach((c) => c.classList.remove("selected-win", "selected-loss"));
}

// Submit
document
  .getElementById("btn-submit-checkin")
  .addEventListener("click", async () => {
    if (!selectedResult) return;
    const slot = SCHEDULE[todaySlot];
    const today = new Date();

    try {
      await logGame(currentUser.uid, today, {
        result: selectedResult,
        factors: [...selectedFactors],
        note: document.getElementById("checkin-note").value.trim(),
        gameNum: slot ? slot.game : 0,
        venue: slot ? slot.venue : "home",
      });

      // Recompute series and save summary
      weekGames = await getWeekGames(currentUser.uid, weekStart);
      const series = computeSeries(weekGames);
      await saveSeries(currentUser.uid, weekStart, series);

      await loadAll();
      switchTab("home");
    } catch (e) {
      console.error("Check-in error:", e);
      alert("Failed to save. Please try again.");
    }
  });

// Grace period log
document.getElementById("btn-grace-log").addEventListener("click", () => {
  // Switch to check-in and prompt for yesterday
  switchTab("checkin");
  // TODO: implement retroactive logging for yesterday's date
});

// ── SCOUTING TAB ─────────────────────────────────────────────────────────
async function renderScoutingTab() {
  const [allSeries, { winFactors, lossFactors }] = await Promise.all([
    getAllSeries(currentUser.uid),
    getFactorStats(currentUser.uid),
  ]);

  // Aggregate stats
  const totalGames = allSeries.reduce(
    (a, s) => a + (s.wins || 0) + (s.losses || 0),
    0,
  );
  const totalWins = allSeries.reduce((a, s) => a + (s.wins || 0), 0);
  const clinches = allSeries.filter((s) => s.clinched).length;
  const sweeps = allSeries.filter((s) => s.sweep).length;

  document.getElementById("stat-total-series").textContent = allSeries.length;
  document.getElementById("stat-win-pct").textContent = totalGames
    ? `${Math.round((totalWins / totalGames) * 100)}%`
    : "—";
  document.getElementById("stat-clinches").textContent = clinches;
  document.getElementById("stat-sweeps").textContent = sweeps;

  // MVP habits
  renderFactorList("mvp-list", winFactors, "win");
  renderFactorList("turnover-list", lossFactors, "loss");

  // History
  renderHistory(allSeries);
}

function renderFactorList(containerId, factorMap, type) {
  const container = document.getElementById(containerId);
  if (!factorMap.size) {
    container.innerHTML = `<p class="empty-state">No data yet.</p>`;
    return;
  }

  const sorted = [...factorMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);
  const max = sorted[0][1];
  container.innerHTML = sorted
    .map(
      ([name, count]) => `
    <div class="mvp-item ${type === "loss" ? "turnover" : ""}">
      <div style="flex:1">
        <div class="mvp-item-name">${name}</div>
        <div class="mvp-bar" style="width:${(count / max) * 100}%"></div>
      </div>
      <span class="mvp-item-count">${count}x</span>
    </div>
  `,
    )
    .join("");
}

function renderHistory(series) {
  const container = document.getElementById("history-list");
  if (!series.length) {
    container.innerHTML = `<p class="empty-state">No completed series yet.</p>`;
    return;
  }

  container.innerHTML = series
    .slice(0, 16)
    .map((s) => {
      const badge = s.sweep
        ? `<span class="history-badge badge-sweep">SWEEP</span>`
        : s.clinched
          ? `<span class="history-badge badge-clinch">CLINCHED</span>`
          : `<span class="history-badge badge-loss">ELIMINATED</span>`;
      return `
      <div class="history-item">
        <span class="history-week">Week of ${s.weekStart}</span>
        <span class="history-record ${s.clinched ? "clinched" : "lost"}">${s.wins}–${s.losses}</span>
        ${badge}
      </div>
    `;
    })
    .join("");
}

// ── TAB NAVIGATION ────────────────────────────────────────────────────────
document.querySelectorAll(".nav-tab").forEach((btn) => {
  btn.addEventListener("click", () => switchTab(btn.dataset.tab));
});

function switchTab(tabName) {
  document
    .querySelectorAll(".nav-tab")
    .forEach((b) => b.classList.toggle("active", b.dataset.tab === tabName));
  document
    .querySelectorAll(".tab-content")
    .forEach((s) => s.classList.toggle("active", s.id === `tab-${tabName}`));
  document
    .querySelectorAll(".tab-content")
    .forEach((s) => s.classList.toggle("hidden", s.id !== `tab-${tabName}`));

  if (tabName === "scouting") renderScoutingTab();
  if (tabName === "checkin") renderCheckinTab();
}

// ── Helpers ───────────────────────────────────────────────────────────────
function getWeekNumber(date) {
  // Simple week-of-year for display
  const start = new Date(date.getFullYear(), 0, 1);
  const diff = date - start;
  return Math.ceil((diff / 86400000 + start.getDay() + 1) / 7);
}
