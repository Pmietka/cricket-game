# 11-0 — The All-Time Cricket XI Challenge 🏏

A cricket take on the viral "82-0" team-builder format, built for Indian fans.

Spin the wheel 11 times — each spin locks a **nation + decade** (e.g. India · 1990s). Pick one player per spin to fill your all-time XI (two openers, three middle-order bats, keeper, all-rounder, spinner, three quicks). Then the simulation engine plays a full World Cup: 9 league matches, a semi-final, and a final. Win all 11 and your XI is immortal.

**Kya aapki XI 11-0 jaa sakti hai?**

## Modes

- **🏏 Classic** — player credentials and ratings visible while drafting.
- **🧠 CricIQ** — all stats hidden; draft from pure cricket knowledge.
- **📅 Daily Challenge** — everyone gets the same 11 spins each day (date-seeded), so you can compare records in your WhatsApp group.

## Features

- ~330 players across 11 nations, 1970s–2020s
- Match-by-match simulated campaign with commentary
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
