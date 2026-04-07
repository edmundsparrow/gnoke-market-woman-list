# 🔥 Gnoke Market Woman List

A simple offline shopping list to track what you’ve bought and what’s left.

> **Portable. Private. Persistent.**

---

## Live Demo

**https://edmundsparrow.github.io/gnoke-market-woman-list**

---

## What It Does

- Add items to your shopping list quickly
- Check off items as you buy them
- Track what’s left at a glance
- Works completely offline
- No account. No server. No tracking.

---

## Run Locally

```bash
git clone https://github.com/edmundsparrow/gnoke-market-woman-list.git
cd gnoke-market-woman-list
python -m http.server 8080
```

Open: **http://localhost:8080**

> ⚠️ Always run through a local server. Do not open HTML files directly in the browser — sql.js WASM will not load via `file://`.

---

## Project Structure

```
gnoke-market-woman-list/
├── index.html          ← Splash / intro screen
├── main/
│   └── index.html      ← Main app shell (clean URL: /main/)
├── js/
│   ├── state.js        ← App state (single source of truth)
│   ├── theme.js        ← Dark / light toggle
│   ├── ui.js           ← Toast, modal, status chip
│   ├── db-core.js      ← SQLite engine + IndexedDB (omit if unused)
│   ├── update.js       ← Version checker
│   └── app.js          ← Bootstrap + event wiring
├── style.css           ← Gnoke design system
├── sw.js               ← Service worker (offline / PWA)
├── manifest.json       ← PWA manifest
├── global.png          ← App icon (192×192 and 512×512)
└── LICENSE
```

---

## Privacy & Tech

- **Stack:** SQLite (WASM), IndexedDB, Vanilla JS — zero dependencies.
- **Privacy:** No tracking, no telemetry, no ads. Your data stays on your device.
- **License:** MIT License

---

## Support

If this app saves you time, consider buying me a coffee:
https://selar.com/showlove/edmundsparrow

---

© 2026 Edmund Sparrow — Gnoke Suite
