# 11-0 — The All-Time Cricket XI Challenge 🏏

A cricket take on the viral "82-0" team-builder format, built for Indian fans.

Spin the wheel — each spin locks a random **nation + decade** (e.g. India · 1990s). Pick one player from that side, then **place them** at a position they actually play, until your all-time XI is full (two openers, three middle-order bats, keeper, all-rounder, spinner, three quicks). You get **one nation skip and one era skip** per draft. Then the simulation engine plays a full World Cup — 9 league matches, semi-final, final — and hands you a record, a letter grade, your best pick, and your biggest weakness. Win all 11 and your XI is immortal.

**Kya aapki XI 11-0 jaa sakti hai?**

No overall ratings are ever shown — the engine judges silently, just like real selectors.

## Modes

- **🏏 Classic** — scouting reports visible while drafting; draft on the facts.
- **🧠 CricIQ** — everything hidden; draft from pure cricket knowledge.
- **📅 Daily Challenge** — everyone gets the same spins each day (date-seeded), **one attempt per day**, so you can compare records in your WhatsApp group.

## Features

- ~370 players across 11 nations, 1970s–2020s
- Pick-then-place drafting with nation/era skips
- Match-by-match simulated campaign with commentary
- Final record + letter grade + best pick + biggest weakness
- Wordle-style emoji scorecard + one-tap WhatsApp share
- Downloadable team poster (PNG, Instagram-story sized)
- Zero dependencies, no build step, no login, mobile-first, < 300KB

## Run locally

It's a static site — open `index.html` directly, or:

```bash
python3 -m http.server 8000
# then visit http://localhost:8000
```

## Go-to-market

See [GTM.md](GTM.md) for the full India launch strategy.

## Disclaimer

Player names and factual career references are used for fan/commentary purposes only. No photos, team logos, or endorsements. Not affiliated with any cricket board or the original 82-0 game.
