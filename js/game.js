/* 11-0 — The All-Time Cricket XI Challenge
 * Faithful to the 82-0 format:
 *  - Each spin locks a random nation + decade (not a position).
 *  - You pick a player, then PLACE them at a slot they actually play.
 *  - One nation skip + one era skip per draft.
 *  - No overall ratings shown anywhere; Classic shows scouting reports only.
 *  - Result: final record, letter grade, best pick, biggest weakness.
 *  - Daily Challenge: same spins for everyone, one attempt per day.
 */

(function () {
  "use strict";

  // ---------- XI slots ----------
  const SLOTS = [
    { label: "Opener",       short: "OPN", role: "opener" },
    { label: "Opener",       short: "OPN", role: "opener" },
    { label: "No. 3",        short: "NO3", role: "batter" },
    { label: "Middle Order", short: "MID", role: "batter" },
    { label: "Middle Order", short: "MID", role: "batter" },
    { label: "Wicketkeeper", short: "WK",  role: "keeper" },
    { label: "All-Rounder",  short: "AR",  role: "allrounder" },
    { label: "Spinner",      short: "SPN", role: "spinner" },
    { label: "Fast Bowler",  short: "FB",  role: "pacer" },
    { label: "Fast Bowler",  short: "FB",  role: "pacer" },
    { label: "Fast Bowler",  short: "FB",  role: "pacer" },
  ];

  const ROLE_LABELS = {
    opener: "Opener", batter: "Batter", keeper: "Keeper",
    allrounder: "All-Rounder", spinner: "Spinner", pacer: "Fast Bowler",
  };

  // ---------- World Cup fixtures (9 league + semi + final) ----------
  const FIXTURES = [
    { stage: "League 1", name: "Sri Lanka '96",     strength: 88 },
    { stage: "League 2", name: "Pakistan '92",      strength: 89 },
    { stage: "League 3", name: "New Zealand '15",   strength: 89 },
    { stage: "League 4", name: "South Africa '99",  strength: 90 },
    { stage: "League 5", name: "England '19",       strength: 90 },
    { stage: "League 6", name: "India '83",         strength: 91 },
    { stage: "League 7", name: "India '11",         strength: 93 },
    { stage: "League 8", name: "West Indies '79",   strength: 94 },
    { stage: "League 9", name: "Australia '03",     strength: 95 },
    { stage: "Semi-Final", name: "Australia '07",   strength: 95 },
    { stage: "FINAL",    name: "All-Time World XI", strength: 97 },
  ];

  const QUALIFY_WINS = 6;

  const WIN_LINES = [
    "{p} ne kya khela bhai! Crowd on its feet.",
    "{p} takes it home with overs to spare. Easy peasy.",
    "DLS not needed — {p} finished it in style.",
    "Stadium erupts! {p} stands tall when it matters.",
    "{p} ka din tha aaj. Clinical from start to finish.",
    "A masterclass from {p}. Commentators out of superlatives.",
    "{p} drags your XI over the line. Heart attack delayed.",
  ];
  const LOSS_LINES = [
    "Middle-order collapse. From 80/1 to 130/7. Classic.",
    "Last-over heartbreak. Six needed, dot ball. Silence.",
    "Dropped catches, missed run-out — fielding coach sacked.",
    "Chased 290, fell 9 short. {p} ran out of partners.",
    "Top order blown away with the new ball. Never recovered.",
    "Spin choke in the middle overs. 40 dot balls. Game gone.",
    "{p} fought alone. Nobody stayed with them. Painful.",
  ];

  const WEAKNESS_LINES = {
    openers: "Your openers won't survive the new ball.",
    middle:  "That middle order is a house of cards.",
    keeper:  "The gloves are leaking byes — and runs.",
    allrounder: "No balance. Your all-rounder is a passenger.",
    spin:    "The spin department turns nothing but yarns.",
    pace:    "Your pace attack has no teeth.",
  };

  // ---------- State ----------
  let mode = "classic";            // classic | criciq | daily
  let picksBySlot = [];            // length 11, player or null
  let currentCombo = null;         // { team, decade }
  let skips = { team: 1, era: 1 };
  let rng = Math.random;
  let simResult = null;
  let spinTimer = null;

  // ---------- Utils ----------
  const $ = (id) => document.getElementById(id);
  const pick = (arr, r) => arr[Math.floor((r || rng)() * arr.length)];

  function mulberry32(seed) {
    return function () {
      seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function dailySeed() {
    const d = new Date();
    return d.getUTCFullYear() * 10000 + (d.getUTCMonth() + 1) * 100 + d.getUTCDate();
  }
  function dailyLabel() {
    return new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  }
  const DAILY_KEY = () => "eleven0-daily-" + dailySeed();

  function picks() {
    return picksBySlot
      .map((player, i) => (player ? { slot: SLOTS[i], player } : null))
      .filter(Boolean);
  }
  function pickedNames() {
    return new Set(picks().map((p) => p.player.name));
  }
  function filledCount() {
    return picksBySlot.filter(Boolean).length;
  }
  function openSlotIndices() {
    return SLOTS.map((_, i) => i).filter((i) => !picksBySlot[i]);
  }
  function openRoles() {
    return new Set(openSlotIndices().map((i) => SLOTS[i].role));
  }
  function fitsOpenSlot(player) {
    const roles = openRoles();
    return player.roles.some((r) => roles.has(r));
  }

  // Players from a combo who can fill at least one open slot.
  function candidates(team, decade) {
    const taken = pickedNames();
    return PLAYERS.filter(
      (p) => p.team === team && p.decades.includes(decade) && !taken.has(p.name) && fitsOpenSlot(p)
    ).sort((a, b) => a.name.localeCompare(b.name));
  }

  // All (team, decade) combos with at least one pickable player.
  function validCombos(filter) {
    const taken = pickedNames();
    const roles = openRoles();
    const map = new Map();
    for (const p of PLAYERS) {
      if (taken.has(p.name) || !p.roles.some((r) => roles.has(r))) continue;
      for (const dec of p.decades) {
        const key = p.team + "|" + dec;
        map.set(key, (map.get(key) || 0) + 1);
      }
    }
    const combos = [];
    for (const [key, count] of map) {
      const [team, decade] = key.split("|");
      if (filter && !filter(team, decade)) continue;
      const weight = (count >= 2 ? 2 : 1) * (team === "IND" ? 2 : 1);
      for (let i = 0; i < weight; i++) combos.push({ team, decade });
    }
    return combos;
  }

  // ---------- Screens ----------
  function show(screenId) {
    document.querySelectorAll(".screen").forEach((s) => s.classList.remove("active"));
    $(screenId).classList.add("active");
    window.scrollTo(0, 0);
  }

  // ---------- Home ----------
  function startGame(selectedMode) {
    if (selectedMode === "daily") {
      const stored = localStorage.getItem(DAILY_KEY());
      if (stored) {
        restoreDaily(JSON.parse(stored));
        return;
      }
    }
    mode = selectedMode;
    picksBySlot = new Array(SLOTS.length).fill(null);
    skips = { team: 1, era: 1 };
    simResult = null;
    rng = mode === "daily" ? mulberry32(dailySeed()) : Math.random;
    show("screen-draft");
    renderTracker();
    nextSpin();
  }

  // ---------- Draft / spin ----------
  function renderTracker() {
    const tr = $("xi-tracker");
    tr.innerHTML = "";
    SLOTS.forEach((slot, i) => {
      const chip = document.createElement("span");
      const player = picksBySlot[i];
      chip.className = "xi-chip" + (player ? " filled" : "");
      chip.textContent = player ? player.name.split(" ").pop() : slot.short;
      chip.title = slot.label;
      tr.appendChild(chip);
    });
  }

  function renderSkips() {
    $("btn-skip-team").textContent = `↻ Skip Nation (${skips.team})`;
    $("btn-skip-era").textContent = `↻ Skip Era (${skips.era})`;
    $("btn-skip-team").disabled = skips.team < 1;
    $("btn-skip-era").disabled = skips.era < 1;
  }

  function nextSpin(filter) {
    if (filledCount() === SLOTS.length) {
      showReview();
      return;
    }
    $("draft-progress").textContent = `Pick ${filledCount() + 1} of 11`;
    $("player-list").innerHTML = "";
    $("player-list").classList.add("hidden");
    $("skip-row").classList.add("hidden");
    $("spin-box").classList.remove("hidden");
    $("spin-result").classList.add("hidden");

    let combos = validCombos(filter);
    if (!combos.length) combos = validCombos(); // skip filter found nothing — full reroll
    currentCombo = pick(combos);

    const reel = $("spin-reel");
    let ticks = 0;
    clearInterval(spinTimer);
    spinTimer = setInterval(() => {
      const t = pick(Object.keys(TEAMS), Math.random);
      const d = pick(DECADES, Math.random);
      reel.textContent = `${TEAMS[t].flag} ${TEAMS[t].name} · ${d}`;
      ticks++;
      if (ticks >= 14) {
        clearInterval(spinTimer);
        revealCombo();
      }
    }, 90);
  }

  function revealCombo() {
    const { team, decade } = currentCombo;
    $("spin-box").classList.add("hidden");
    $("spin-result").classList.remove("hidden");
    $("spin-result").innerHTML =
      `<span class="combo-flag">${TEAMS[team].flag}</span>` +
      `<span class="combo-text">${TEAMS[team].name} · ${decade}</span>` +
      `<span class="combo-sub">Pick one player, then place them in your XI</span>`;
    $("skip-row").classList.remove("hidden");
    renderSkips();

    const list = $("player-list");
    list.innerHTML = "";
    list.classList.remove("hidden");

    for (const p of candidates(team, decade)) {
      const card = document.createElement("button");
      card.className = "player-card";
      const roleTags = p.roles.map((r) => `<span class="pc-role">${ROLE_LABELS[r]}</span>`).join("");
      card.innerHTML =
        `<span class="pc-name">${p.name}</span>` +
        `<span class="pc-roles">${roleTags}</span>` +
        (mode !== "criciq"
          ? `<span class="pc-cred">${p.cred}</span>`
          : "");
      card.addEventListener("click", () => choosePlayer(p));
      list.appendChild(card);
    }
  }

  function skipTeam() {
    if (skips.team < 1) return;
    skips.team--;
    const { team, decade } = currentCombo;
    nextSpin((t, d) => d === decade && t !== team);
  }

  function skipEra() {
    if (skips.era < 1) return;
    skips.era--;
    const { team, decade } = currentCombo;
    nextSpin((t, d) => t === team && d !== decade);
  }

  // ---------- Placement ----------
  function choosePlayer(player) {
    const roles = openRoles();
    // One open slot index per distinct label the player can fill.
    const options = [];
    const seenLabels = new Set();
    for (const i of openSlotIndices()) {
      const slot = SLOTS[i];
      if (player.roles.includes(slot.role) && roles.has(slot.role) && !seenLabels.has(slot.label)) {
        seenLabels.add(slot.label);
        options.push(i);
      }
    }
    if (options.length === 1) {
      placePlayer(player, options[0]);
      return;
    }
    const ov = $("place-overlay");
    $("place-title").textContent = `Place ${player.name} at:`;
    const btns = $("place-options");
    btns.innerHTML = "";
    for (const i of options) {
      const b = document.createElement("button");
      b.className = "share-btn";
      b.textContent = SLOTS[i].label;
      b.addEventListener("click", () => {
        ov.classList.add("hidden");
        placePlayer(player, i);
      });
      btns.appendChild(b);
    }
    ov.classList.remove("hidden");
  }

  function placePlayer(player, slotIdx) {
    picksBySlot[slotIdx] = player;
    renderTracker();
    nextSpin();
  }

  // ---------- Review ----------
  function renderXiList(el) {
    el.innerHTML = "";
    picks().forEach((pk, i) => {
      const row = document.createElement("div");
      row.className = "review-row";
      row.innerHTML =
        `<span class="rv-num">${i + 1}</span>` +
        `<span class="rv-name">${pk.player.name}</span>` +
        `<span class="rv-meta">${TEAMS[pk.player.team].flag} ${pk.slot.label}</span>`;
      el.appendChild(row);
    });
  }

  function showReview() {
    show("screen-review");
    renderXiList($("review-list"));
  }

  // ---------- Simulation ----------
  function unitAverages() {
    const r = (idx) => idx.map((i) => picksBySlot[i].rating);
    const avg = (a) => a.reduce((x, y) => x + y, 0) / a.length;
    return {
      openers: avg(r([0, 1])),
      middle: avg(r([2, 3, 4])),
      keeper: avg(r([5])),
      allrounder: avg(r([6])),
      spin: avg(r([7])),
      pace: avg(r([8, 9, 10])),
    };
  }

  function teamStrength() {
    let total = 0, weight = 0;
    picks().forEach((pk) => {
      const w = pk.slot.role === "allrounder" ? 1.15 : pk.slot.role === "keeper" ? 0.95 : 1;
      total += pk.player.rating * w;
      weight += w;
    });
    let s = total / weight;
    const u = unitAverages();
    if (u.pace >= 90) s += 1.2;
    if (u.openers >= 90) s += 0.8;
    if (Math.min(...picks().map((p) => p.player.rating)) >= 85) s += 1.0;
    // Category gates: a genuinely weak unit drags the whole campaign.
    const gates = Object.values(u).filter((v) => v < 80).length;
    s -= Math.min(gates, 2) * 1.0;
    return s;
  }

  function winProb(team, opp) {
    return 1 / (1 + Math.exp((opp - team - 4.5) / 4));
  }

  function starName() {
    const sorted = picks().sort((a, b) => b.player.rating - a.player.rating);
    return pick(sorted.slice(0, 3), Math.random).player.name.split(" ").pop();
  }

  function grade(wins) {
    return wins === 11 ? "S" : wins === 10 ? "A+" : wins === 9 ? "A" :
           wins === 8 ? "B+" : wins === 7 ? "B" : wins === 6 ? "C+" :
           wins === 5 ? "C" : wins === 4 ? "D" : "F";
  }

  function bestPick() {
    return picks().reduce((a, b) => (b.player.rating > a.player.rating ? b : a)).player.name;
  }

  function biggestWeakness() {
    const u = unitAverages();
    const worst = Object.entries(u).sort((a, b) => a[1] - b[1])[0][0];
    return WEAKNESS_LINES[worst];
  }

  function runSimulation() {
    const strength = teamStrength();
    const matches = [];
    let wins = 0, losses = 0, alive = true;

    for (let i = 0; i < FIXTURES.length; i++) {
      const fx = FIXTURES[i];
      if (i >= 9) {
        const leagueWins = matches.filter((m) => m.played && m.won).length;
        if (i === 9) {
          let qualified = leagueWins >= QUALIFY_WINS;
          if (leagueWins === QUALIFY_WINS - 1) qualified = Math.random() < 0.5; // NRR coin flip
          if (!qualified) alive = false;
        }
        if (!alive || (i === 10 && !matches[9].won)) {
          matches.push({ fx, played: false });
          continue;
        }
      }
      const won = Math.random() < winProb(strength, fx.strength);
      const line = pick(won ? WIN_LINES : LOSS_LINES, Math.random).replace("{p}", starName());
      matches.push({ fx, played: true, won, line });
      if (won) wins++; else losses++;
    }

    const finalMatch = matches[10], semiMatch = matches[9];
    let verdict, verdictClass;
    if (wins === 11) {
      verdict = "🏆 11-0. IMMORTAL. Undefeated World Champions. Frame this XI.";
      verdictClass = "v-gold";
    } else if (finalMatch.played && finalMatch.won) {
      verdict = "🏆 World Champions! Not perfect — but the trophy doesn't care.";
      verdictClass = "v-gold";
    } else if (finalMatch.played && !finalMatch.won) {
      verdict = "💔 Lost the final. We know exactly how this feels.";
      verdictClass = "v-heartbreak";
    } else if (semiMatch.played && !semiMatch.won) {
      verdict = "😤 Semi-final exit. So close, so far.";
      verdictClass = "v-heartbreak";
    } else {
      verdict = "📉 Group-stage exit. Selectors (you) sacked.";
      verdictClass = "v-flop";
    }

    return {
      matches, wins, losses, verdict, verdictClass,
      perfect: wins === 11,
      grade: grade(wins),
      best: bestPick(),
      weak: biggestWeakness(),
    };
  }

  function showSimulation() {
    show("screen-sim");
    simResult = runSimulation();
    const feed = $("sim-feed");
    feed.innerHTML = "";

    simResult.matches.forEach((m, i) => {
      setTimeout(() => {
        const row = document.createElement("div");
        if (!m.played) {
          row.className = "match-row m-dnp";
          row.innerHTML =
            `<span class="m-stage">${m.fx.stage}</span>` +
            `<span class="m-opp">vs ${m.fx.name}</span>` +
            `<span class="m-result">— DNQ</span>`;
        } else {
          row.className = "match-row " + (m.won ? "m-win" : "m-loss");
          row.innerHTML =
            `<span class="m-stage">${m.fx.stage}</span>` +
            `<span class="m-opp">vs ${m.fx.name}</span>` +
            `<span class="m-result">${m.won ? "WON ✅" : "LOST ❌"}</span>` +
            `<span class="m-line">${m.line}</span>`;
        }
        feed.appendChild(row);
        row.scrollIntoView({ behavior: "smooth", block: "end" });
        if (i === simResult.matches.length - 1) setTimeout(showResult, 900);
      }, 750 * (i + 1));
    });
  }

  // ---------- Result + sharing ----------
  function emojiGrid() {
    return simResult.matches.map((m) => (!m.played ? "⬜" : m.won ? "🟢" : "🔴")).join("");
  }

  function shareText() {
    const tag = mode === "daily" ? `Daily Challenge ${dailyLabel()}` :
                mode === "criciq" ? "CricIQ mode (no scouting reports!)" : "Classic mode";
    const head = simResult.perfect
      ? `I went 11-0 in the All-Time Cricket XI Challenge! 🏆🇮🇳`
      : `My all-time XI went ${simResult.wins}-${simResult.losses} (Grade ${simResult.grade}) in the 11-0 Challenge.`;
    return `${head}\n${simResult.grid || emojiGrid()}\n${tag} — can your XI go 11-0?\nPlay: ${location.href.split("#")[0]}`;
  }

  function showResult() {
    show("screen-result");
    const v = $("result-verdict");
    v.textContent = simResult.verdict;
    v.className = "verdict " + simResult.verdictClass;

    $("result-record").textContent = `${simResult.wins}-${simResult.losses}`;
    $("result-grade").textContent = simResult.grade;
    $("result-grade").className = "grade-badge g-" + simResult.grade.replace("+", "p");
    $("result-grid").textContent = simResult.grid || emojiGrid();
    $("result-best").textContent = simResult.best;
    $("result-weak").textContent = simResult.weak;
    $("daily-note").classList.toggle("hidden", mode !== "daily");

    renderXiList($("result-xi"));

    if (mode === "daily" && !localStorage.getItem(DAILY_KEY())) {
      localStorage.setItem(DAILY_KEY(), JSON.stringify({
        picks: picks().map((pk) => ({ n: pk.player.name, t: pk.player.team, s: pk.slot.label })),
        wins: simResult.wins, losses: simResult.losses,
        verdict: simResult.verdict, verdictClass: simResult.verdictClass,
        grid: emojiGrid(), grade: simResult.grade,
        best: simResult.best, weak: simResult.weak, perfect: simResult.perfect,
      }));
    }
  }

  function restoreDaily(saved) {
    mode = "daily";
    const byName = new Map(PLAYERS.map((p) => [p.name, p]));
    picksBySlot = new Array(SLOTS.length).fill(null);
    saved.picks.forEach((sp, i) => { picksBySlot[i] = byName.get(sp.n) || { name: sp.n, team: sp.t, rating: 80, roles: [] }; });
    // Re-map saved slot labels so the XI list shows what was actually drafted.
    simResult = {
      matches: [], wins: saved.wins, losses: saved.losses,
      verdict: saved.verdict, verdictClass: saved.verdictClass,
      grid: saved.grid, grade: saved.grade, best: saved.best,
      weak: saved.weak, perfect: saved.perfect,
    };
    showResult();
  }

  function shareWhatsApp() {
    window.open("https://wa.me/?text=" + encodeURIComponent(shareText()), "_blank");
  }

  async function copyResult() {
    try {
      await navigator.clipboard.writeText(shareText());
      $("btn-copy").textContent = "Copied! ✅";
      setTimeout(() => ($("btn-copy").textContent = "📋 Copy Result"), 1500);
    } catch {
      prompt("Copy your result:", shareText());
    }
  }

  // ---------- Team poster (canvas → PNG) ----------
  function downloadPoster() {
    const W = 1080, H = 1350;
    const c = document.createElement("canvas");
    c.width = W; c.height = H;
    const ctx = c.getContext("2d");

    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, "#0b1f3a");
    grad.addColorStop(1, "#071426");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    ctx.fillStyle = "#ff9933"; ctx.fillRect(0, 0, W, 14);
    ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 14, W, 6);
    ctx.fillStyle = "#138808"; ctx.fillRect(0, 20, W, 14);

    ctx.textAlign = "center";
    ctx.fillStyle = "#ff9933";
    ctx.font = "bold 110px Georgia, serif";
    ctx.fillText("11-0", W / 2, 170);
    ctx.fillStyle = "#e8eef7";
    ctx.font = "bold 44px Arial, sans-serif";
    ctx.fillText("MY ALL-TIME XI", W / 2, 235);

    ctx.font = "bold 38px Arial, sans-serif";
    ctx.fillStyle = simResult && simResult.perfect ? "#ffd700" : "#9fb3cc";
    const rec = simResult
      ? `${simResult.wins}-${simResult.losses} · Grade ${simResult.grade}` + (simResult.perfect ? "  🏆 PERFECT" : "")
      : "";
    ctx.fillText(rec, W / 2, 300);

    ctx.textAlign = "left";
    picks().forEach((pk, i) => {
      const y = 390 + i * 82;
      ctx.fillStyle = "rgba(255,255,255,0.06)";
      ctx.fillRect(70, y - 50, W - 140, 66);
      ctx.fillStyle = "#ff9933";
      ctx.font = "bold 34px Arial, sans-serif";
      ctx.fillText(String(i + 1).padStart(2, " "), 95, y);
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 38px Arial, sans-serif";
      ctx.fillText(pk.player.name, 170, y);
      ctx.fillStyle = "#9fb3cc";
      ctx.font = "30px Arial, sans-serif";
      ctx.textAlign = "right";
      ctx.fillText(`${TEAMS[pk.player.team].name} · ${pk.slot.label}`, W - 95, y);
      ctx.textAlign = "left";
    });

    ctx.textAlign = "center";
    ctx.fillStyle = "#5d7290";
    ctx.font = "30px Arial, sans-serif";
    ctx.fillText("Can your XI go 11-0? Play the All-Time Cricket XI Challenge", W / 2, H - 60);

    const a = document.createElement("a");
    a.download = "my-all-time-xi.png";
    a.href = c.toDataURL("image/png");
    a.click();
  }

  // ---------- Wire up ----------
  document.addEventListener("DOMContentLoaded", () => {
    $("btn-classic").addEventListener("click", () => startGame("classic"));
    $("btn-criciq").addEventListener("click", () => startGame("criciq"));
    $("btn-daily").addEventListener("click", () => startGame("daily"));
    $("daily-date").textContent = dailyLabel();
    $("btn-skip-team").addEventListener("click", skipTeam);
    $("btn-skip-era").addEventListener("click", skipEra);
    $("place-cancel").addEventListener("click", () => $("place-overlay").classList.add("hidden"));
    $("btn-simulate").addEventListener("click", showSimulation);
    $("btn-whatsapp").addEventListener("click", shareWhatsApp);
    $("btn-copy").addEventListener("click", copyResult);
    $("btn-poster").addEventListener("click", downloadPoster);
    $("btn-again").addEventListener("click", () => show("screen-home"));
  });
})();
