# TimeTab ⏱

> **Premium Offline Student Timetable PWA — Brutalist UI**

A fast, offline-first Progressive Web App for college students. Live period countdown, bell reminders, weekly timetable — all from a single JSON file. No backend. No login. No internet after install.

[![PWA](https://img.shields.io/badge/PWA-Installable-2563EB?style=flat-square)](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps)
[![Offline](https://img.shields.io/badge/Offline-100%25-059669?style=flat-square)](#)
[![No Backend](https://img.shields.io/badge/Backend-None-111111?style=flat-square)](#)
[![License](https://img.shields.io/badge/License-MIT-F59E0B?style=flat-square)](./LICENSE)

---

## Screenshots

| Landing Page | Home — Live Countdown | Weekly Timetable | Settings |
|:---:|:---:|:---:|:---:|
| Full-screen brutalist hero with install button | Current period card with live countdown | Mon–Fri color-coded schedule | Dark mode, bell notifications |

---

## Features

| Feature | Details |
|---------|---------|
| ⏱ **Live Countdown** | Second-by-second timer for the current period |
| 🔔 **Bell Notifications** | 5-min warning + period-start alerts (lazy permission) |
| 📡 **100% Offline** | Works with zero internet after first load |
| 📅 **Weekly Timetable** | Color-coded Mon–Fri schedule from a JSON file |
| 🌙 **Dark Mode** | Persisted across sessions via LocalStorage |
| 📱 **Installable PWA** | Add to home screen on iOS, Android, and Desktop |
| ⚡ **Instant Launch** | No build step, no login, no loading screens |

---

## Tech Stack

- **HTML5** — Semantic markup, PWA meta tags
- **CSS3** — Brutalist design system (no Tailwind, no frameworks)
- **Vanilla JavaScript** — ES Modules, zero dependencies
- **Web APIs** — Notification API, Service Worker, LocalStorage, Cache API
- **Fonts** — Space Grotesk · IBM Plex Mono · Inter (Google Fonts)

---

## Project Structure

```
TimeTab/
│
├── index.html          # Landing page (hero, install button, features)
├── app.html            # Main PWA app (Home, Timetable, Settings)
│
├── css/
│   ├── brutal.css      # Brutalist design system (tokens, cards, buttons, toggles)
│   ├── style.css       # Shared base (reset, layout, toast, modal, utilities)
│   └── landing.css     # Landing-page-only styles
│
├── js/
│   ├── app.js          # Bootstrap — SW registration, view router, theme, settings
│   ├── timer.js        # Live countdown + current/next period detection (every second)
│   ├── timetable.js    # Loads timetable.json + renders weekly grid
│   ├── notification.js # Bell notification logic (lazy permission, deduplication)
│   ├── install.js      # PWA install prompt + platform-aware manual modal
│   └── storage.js      # LocalStorage read/write (typed defaults, namespaced keys)
│
├── assets/
│   ├── logo.svg        # Brutalist TT monogram logo
│   └── icons/
│       ├── icon-192.svg
│       └── icon-512.svg
│
├── manifest.json       # PWA manifest (standalone, icons, theme)
├── sw.js               # Service worker (cache-first, offline fallback)
└── timetable.json      # ← YOUR SCHEDULE DATA (edit this!)
```

---

## Getting Started

### 1. Clone the repo

```bash
git clone https://github.com/ismailkkaaa/timetab.git
cd timetab
```

### 2. Serve locally

You need a local server (service workers require HTTP, not `file://`).

**Option A — Python (built-in):**
```bash
python -m http.server 5500
```

**Option B — Node.js:**
```bash
npx serve .
```

Then open **http://localhost:5500** in Chrome or Edge.

### 3. Customise your timetable

Edit [`timetable.json`](./timetable.json) — that's the only file you need to change.

```json
{
  "schedule": {
    "monday": [
      {
        "id": "m1",
        "subject": "Mathematics",
        "teacher": "Dr. Sharma",
        "start": "08:00",
        "end": "08:50",
        "color": "#2563EB",
        "room": "A101"
      }
    ]
  }
}
```

#### Period fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | ✅ | Unique ID (used for notification deduplication) |
| `subject` | string | ✅ | Subject name |
| `teacher` | string | ✅ | Teacher name |
| `start` | string | ✅ | Start time `"HH:MM"` (24-hour) |
| `end` | string | ✅ | End time `"HH:MM"` (24-hour) |
| `color` | string | ✅ | Hex color for the period card |
| `room` | string | ❌ | Room number or lab name |
| `type` | string | ❌ | `"break"` or `"lunch"` — marks non-class slots |

#### Days supported

`monday` · `tuesday` · `wednesday` · `thursday` · `friday`

---

## Installing as a PWA

### Android / Desktop (Chrome, Edge)
1. Open the site in Chrome or Edge
2. Click the **Install App** button on the landing page
3. Or tap the install icon (⊕) in the address bar

### iPhone / iPad (Safari only)
1. Open the site in **Safari** (required)
2. Tap **Share** → **Add to Home Screen**
3. Tap **Add**

---

## Deployment

TimeTab is a static site — deploy anywhere:

| Platform | Steps |
|----------|-------|
| **GitHub Pages** | Push to `main` → Settings → Pages → Deploy from branch |
| **Netlify** | Drag & drop the `TimeTab/` folder into [netlify.com/drop](https://netlify.com/drop) |
| **Vercel** | `npx vercel` in the project folder |
| **Cloudflare Pages** | Connect repo → build command: _(none)_ → output: `/` |

> **HTTPS required** for service workers and PWA install. All platforms above provide HTTPS automatically.

---

## Design System

TimeTab uses a **Brutalist UI** — thick borders, stark contrast, bold typography, no gradients.

| Token | Value |
|-------|-------|
| Primary | `#2563EB` |
| Background | `#F5F5F5` (light) · `#111111` (dark) |
| Border | `3px solid #000` |
| Font Display | Space Grotesk (800–900 weight) |
| Font Mono | IBM Plex Mono |
| Font Body | Inter |

All design tokens live in [`css/brutal.css`](./css/brutal.css).

---

## Architecture

```
                         TimeTab
                            │
            ┌───────────────┴───────────────┐
            │                               │
     index.html (Landing)             app.html (PWA)
            │                               │
      install.js                    ┌───────┴───────┐
  (PWA prompt / modal)              │               │
                                  Home          Timetable
                                    │               │
                              timer.js        timetable.js
                           (live countdown)  (timetable.json)
                                    │
                               Settings
                                    │
                       notification.js + storage.js
                                    │
                          Browser Notifications
                                    │
                                  sw.js
                                    │
                             100% Offline ✓
```

---

## Roadmap

V1 is intentionally minimal. Future versions may include:

- [ ] Multiple timetable profiles (e.g. Odd/Even week)
- [ ] Custom period duration
- [ ] Theme colour picker
- [ ] Import from CSV / Google Sheets
- [ ] Widget (Android)

---

## What's NOT in V1

By design — no feature creep:

- ❌ Attendance tracking
- ❌ Assignments / homework
- ❌ Events / calendar
- ❌ Notes
- ❌ Backend / API
- ❌ Login / accounts
- ❌ Cloud sync
- ❌ Analytics

---

## License

[MIT](./LICENSE) — free to use, modify, and distribute.

---

<div align="center">
  <strong>Time<span style="color:#2563EB">Tab</span></strong> · V1.0 · 2026<br>
  Built with HTML, CSS, and Vanilla JS · No framework · No backend · No internet required
</div>
