/* 11-0 — The All-Time Cricket XI Challenge
 * Draft an all-time XI via 11 randomised (nation + decade) spins,
 * then simulate an 11-match World Cup. Win all 11 to go 11-0.
 */

(function () {
  "use strict";

  // ---------- Draft slots ----------
  const SLOTS = [
    { label: "Opener",        role: "opener",     icon: "🏏" },
    { label: "Opener",        role: "opener",     icon: "🏏" },
    { label: "No. 3",         role: "batter",     icon: "🎯" },
    { label: "Middle Order",  role: "batter",     icon: "🎯" },
    { label: "Middle Order",  role: "batter",     icon: "🎯" },
    { label: "Wicketkeeper",  role: "keeper",     icon: "🧤" },
    { label: "All-Rounder",   role: "allrounder", icon: "⚡" },
    { label: "Spinner",       role: "spinner",    icon: "🌀" },
    { label: "Fast Bowler",   role: "pacer",      icon: "🔥" },
    { label: "Fast Bowler",   role: "pacer",      icon: "🔥" },
    { label: "Fast Bowler",   role: "pacer",      icon: "🔥" },
  ];

  // ---------- World Cup fixtures (9 league + semi + final) ----------
  const FIXTURES = [
    { stage: "League 1", name: "Sri Lanka '96",     strength: 88, blurb: "Jayasuriya's pinch-hitting pirates" },
    { stage: "League 2", name: "Pakistan '92",      strength: 89, blurb: "Imran's cornered tigers" },
    { stage: "League 3", name: "New Zealand '15",   strength: 89, blurb: "McCullum charging in from ball one" },
    { stage: "League 4", name: "South Africa '99",  strength: 90, blurb: "Donald, Pollock and Klusener's long handle" },
    { stage: "League 5", name: "England '19",       strength: 90, blurb: "Champions by the barest of all margins" },
    { stage: "League 6", name: "India '83",         strength: 91, blurb: "Kapil's Devils — giant killers" },
    { stage: "League 7", name: "India '11",         strength: 93, blurb: "Dhoni finishes off in style" },
    { stage: "League 8", name: "West Indies '79",   strength: 94, blurb: "Four horsemen and King Viv" },
    { stage: "League 9", name: "Australia '03",     strength: 95, blurb: "Ponting's unbeaten juggernaut" },
    { stage: "Semi-Final", name: "Australia '07",   strength: 95, blurb: "Three World Cups in a row for a reason" },
    { stage: "FINAL",    name: "All-Time World XI", strength: 97, blurb: "Every legend you didn't pick" },
  ];

  const QUALIFY_WINS = 6; // league wins needed to reach the semi-final

  // ---------- Commentary ----------
  const WIN_LINES = [
    "{p} ne kya khela bhai! Crowd on its feet.",
    "{p} takes it home with overs to spare. Easy peasy.",
    "DLS not needed — {p} finished it in style.",
    "Stadium erupts! {p} stands tall when it matters.",
    "{p} ka din tha aaj. Clinical from start to finish.",
    "They came, they saw, {p} conquered.",
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
    "Rain, DLS, confusion — and a five-run defeat. Cruel game.",
    "{p} fought alone. Nobody stayed with them. Painful.",
  ];

  // ---------- State ----------
  let mode = "classic";        // classic | criciq | daily
  let slotIndex = 0;
  let picks = [];              // { slot, player }
  let currentCombo = null;     // { team, decade }
  let rng = Math.random;
  let simResult = null;
  let spinTimer = null;

  // ---------- Utils ----------
  const $ = (id) => document.getElementById(id);
  const pick = (arr, r) => arr[Math.floor((r || rng)() * arr.length)];

  // Deterministic RNG for Daily mode (mulberry32).
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
    const d = new Date();
    return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  }

  function pickedNames() {
    return new Set(picks.map((p) => p.player.name));
  }

  function candidates(role, team, decade) {
    const taken = pickedNames();
    return PLAYERS.filter(
      (p) =>
        p.team === team &&
        p.decades.includes(decade) &&
        p.roles.includes(role) &&
        !taken.has(p.name)
    );
  }

  // All (team, decade) combos with at least one available player for the role.
  // India combos are weighted heavier — this is a game for Indian fans, after all.
  function validCombos(role) {
    const taken = pickedNames();
    const map = new Map();
    for (const p of PLAYERS) {
      if (!p.roles.includes(role) || taken.has(p.name)) continue;
      for (const dec of p.decades) {
        const key = p.team + "|" + dec;
        map.set(key, (map.get(key) || 0) + 1);
      }
    }
    const combos = [];
    for (const [key, count] of map) {
      const [team, decade] = key.split("|");
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
    mode = selectedMode;
    slotIndex = 0;
    picks = [];
    simResult = null;
    rng = mode === "daily" ? mulberry32(dailySeed()) : Math.random;
    show("screen-draft");
    nextSpin();
  }

  // ---------- Draft / spin ----------
  function nextSpin() {
    const slot = SLOTS[slotIndex];
    $("draft-progress").textContent = `Pick ${slotIndex + 1} of 11`;
    $("draft-slot").textContent = `${slot.icon} ${slot.label}`;
    $("player-list").innerHTML = "";
    $("player-list").classList.add("hidden");
    $("spin-box").classList.remove("hidden");
    $("spin-result").classList.add("hidden");

    // Decide the combo up front (daily mode must be deterministic),
    // then run a purely cosmetic slot-machine animation.
    const combos = validCombos(slot.role);
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
    const slot = SLOTS[slotIndex];
    $("spin-box").classList.add("hidden");
    $("spin-result").classList.remove("hidden");
    $("spin-result").innerHTML =
      `<span class="combo-flag">${TEAMS[team].flag}</span>` +
      `<span class="combo-text">${TEAMS[team].name} · ${decade}</span>` +
      `<span class="combo-sub">Pick your ${slot.label.toLowerCase()}</span>`;

    const list = $("player-list");
    list.innerHTML = "";
    list.classList.remove("hidden");

    const pool = candidates(slot.role, team, decade);
    // Classic & Daily show credentials and rating; CricIQ tests pure memory.
    const showStats = mode !== "criciq";
    const sorted = showStats ? [...pool].sort((a, b) => b.rating - a.rating) : pool;

    for (const p of sorted) {
      const card = document.createElement("button");
      card.className = "player-card";
      card.innerHTML =
        `<span class="pc-name">${p.name}</span>` +
        (showStats
          ? `<span class="pc-cred">${p.cred}</span><span class="pc-ovr">OVR ${p.rating}</span>`
          : `<span class="pc-cred pc-mystery">Stats hidden — trust your cricket gyaan 🧠</span>`);
      card.addEventListener("click", () => choosePlayer(p));
      list.appendChild(card);
    }
  }

  function choosePlayer(player) {
    picks.push({ slot: SLOTS[slotIndex], player });
    slotIndex++;
    if (slotIndex < SLOTS.length) {
      nextSpin();
    } else {
      showReview();
    }
  }

  // ---------- Review ----------
  function showReview() {
    show("screen-review");
    const list = $("review-list");
    list.innerHTML = "";
    picks.forEach((pk, i) => {
      const row = document.createElement("div");
      row.className = "review-row";
      row.innerHTML =
        `<span class="rv-num">${i + 1}</span>` +
        `<span class="rv-name">${pk.player.name}</span>` +
        `<span class="rv-meta">${TEAMS[pk.player.team].flag} ${pk.slot.label}</span>`;
      list.appendChild(row);
    });
  }

  // ---------- Simulation ----------
  function teamStrength() {
    // Weighted average of ratings, plus small balance bonuses.
    let total = 0, weight = 0;
    for (const pk of picks) {
      const w = pk.slot.role === "allrounder" ? 1.15 : pk.slot.role === "keeper" ? 0.95 : 1;
      total += pk.player.rating * w;
      weight += w;
    }
    let s = total / weight;
    const ratings = (role) => picks.filter((p) => p.slot.role === role).map((p) => p.player.rating);
    const avg = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);
    if (avg(ratings("pacer")) >= 90) s += 1.2;       // elite pace attack
    if (avg(ratings("opener")) >= 90) s += 0.8;      // dominant new-ball batting
    if (Math.min(...picks.map((p) => p.player.rating)) >= 85) s += 1.0; // no weak link
    return s;
  }

  function winProb(team, opp) {
    return 1 / (1 + Math.exp((opp - team - 4.5) / 4));
  }

  function starName() {
    const sorted = [...picks].sort((a, b) => b.player.rating - a.player.rating);
    const top3 = sorted.slice(0, 3);
    return pick(top3, Math.random).player.name.split(" ").pop();
  }

  function runSimulation() {
    const strength = teamStrength();
    const matches = [];
    let wins = 0, losses = 0, alive = true;

    for (let i = 0; i < FIXTURES.length; i++) {
      const fx = FIXTURES[i];
      const isKnockout = i >= 9;

      if (isKnockout) {
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

    const finalMatch = matches[10];
    const semiMatch = matches[9];
    let verdict, verdictClass;
    if (wins === 11) {
      verdict = "🏆 11-0. IMMORTAL. Undefeated World Champions. Frame this XI.";
      verdictClass = "v-gold";
    } else if (finalMatch.played && finalMatch.won) {
      verdict = `🏆 World Champions at ${wins}-${losses}! Not perfect — but the trophy doesn't care.`;
      verdictClass = "v-gold";
    } else if (finalMatch.played && !finalMatch.won) {
      verdict = `💔 Lost the final. ${wins}-${losses}. We know exactly how this feels.`;
      verdictClass = "v-heartbreak";
    } else if (semiMatch.played && !semiMatch.won) {
      verdict = `😤 Semi-final exit at ${wins}-${losses}. So close, so far.`;
      verdictClass = "v-heartbreak";
    } else {
      verdict = `📉 Group-stage exit at ${wins}-${losses}. Selectors (you) sacked.`;
      verdictClass = "v-flop";
    }

    return { matches, wins, losses, verdict, verdictClass, perfect: wins === 11 };
  }

  function showSimulation() {
    show("screen-sim");
    simResult = runSimulation();
    const feed = $("sim-feed");
    feed.innerHTML = "";
    $("sim-done").classList.add("hidden");

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
        if (i === simResult.matches.length - 1) {
          setTimeout(showResult, 900);
        }
      }, 750 * (i + 1));
    });
  }

  // ---------- Result + sharing ----------
  function emojiGrid() {
    return simResult.matches
      .map((m) => (!m.played ? "⬜" : m.won ? "🟢" : "🔴"))
      .join("");
  }

  function shareText() {
    const tag = mode === "daily" ? `Daily Challenge ${dailyLabel()}` :
                mode === "criciq" ? "CricIQ mode (no stats!)" : "Classic mode";
    const head = simResult.perfect
      ? `I went 11-0 in the All-Time Cricket XI Challenge! 🏆🇮🇳`
      : `My all-time XI went ${simResult.wins}-${simResult.losses} in the 11-0 Challenge.`;
    return `${head}\n${emojiGrid()}\n${tag} — can your XI go 11-0?\nPlay: ${location.href.split("#")[0]}`;
  }

  function showResult() {
    show("screen-result");
    $("sim-done").classList.add("hidden");
    const v = $("result-verdict");
    v.textContent = simResult.verdict;
    v.className = "verdict " + simResult.verdictClass;
    $("result-grid").textContent = emojiGrid();
    $("result-record").textContent = `Final record: ${simResult.wins}-${simResult.losses}`;

    const xi = $("result-xi");
    xi.innerHTML = "";
    picks.forEach((pk, i) => {
      const row = document.createElement("div");
      row.className = "review-row";
      row.innerHTML =
        `<span class="rv-num">${i + 1}</span>` +
        `<span class="rv-name">${pk.player.name}</span>` +
        `<span class="rv-meta">${TEAMS[pk.player.team].flag} ${pk.slot.label}</span>`;
      xi.appendChild(row);
    });
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

    // Tricolour strip
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
    const rec = simResult ? `Record: ${simResult.wins}-${simResult.losses}` + (simResult.perfect ? "  🏆 PERFECT" : "") : "";
    ctx.fillText(rec, W / 2, 300);

    ctx.textAlign = "left";
    picks.forEach((pk, i) => {
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
    $("btn-simulate").addEventListener("click", showSimulation);
    $("btn-whatsapp").addEventListener("click", shareWhatsApp);
    $("btn-copy").addEventListener("click", copyResult);
    $("btn-poster").addEventListener("click", downloadPoster);
    $("btn-again").addEventListener("click", () => show("screen-home"));
  });
})();
