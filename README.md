<div align="center">

# تلاوة · Tilawa

**مصحف رقمي أنيق للقراءة والاستماع والتدبر**
_An elegant, offline-first Quran Progressive Web App_

[![Next.js](https://img.shields.io/badge/Next.js-16-000000?logo=next.js&logoColor=white)](https://nextjs.org)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![PWA](https://img.shields.io/badge/PWA-installable-5A0FC8?logo=pwa&logoColor=white)](#-progressive-web-app)
[![License](https://img.shields.io/badge/License-MIT-0F6B4F)](LICENSE)
[![CI](https://github.com/agentstack201/quran-karim-/actions/workflows/ci.yml/badge.svg)](https://github.com/agentstack201/quran-karim-/actions/workflows/ci.yml)

</div>

---

## ✦ نبذة · Overview

**تلاوة** هو تطبيق ويب تقدمي (PWA) لقراءة القرآن الكريم، مبني بمعايير إنتاجية حقيقية:
واجهة عربية أصيلة من اليمين إلى اليسار، رسم عثماني بخط أميري، تلاوات صوتية، تفسير،
وضع ليلي، وعمل كامل بدون اتصال بالإنترنت.

**Tilawa** is a production-grade Quran reader delivered as an installable Progressive Web
App. It is built around a bundled, verified Quran dataset — which means the entire
Mus'haf, its translations and its structural metadata are available instantly and
completely offline, with live services layered on top for tafsir and recitation audio.

---

## ✦ المزايا · Features

### القراءة · Reading

|                          |                                                                     |
| ------------------------ | ------------------------------------------------------------------- |
| 📖 **المصحف كاملاً**     | ١١٤ سورة · ٦٢٣٦ آية بالرسم العثماني                                 |
| 🗂️ **تصفح متعدد**        | حسب السورة أو الجزء (٣٠) أو الحزب (٦٠)                              |
| 🔍 **بحث فوري**          | بحث في نص القرآن والترجمة أثناء الكتابة، يتجاهل التشكيل ورسم الهمزة |
| 📝 **التفسير**           | التفسير الميسر + الترجمة الإنجليزية + معلومات الآية في نافذة أنيقة  |
| 🔖 **العلامات المرجعية** | حفظ الآيات المفضلة ومتابعة آخر قراءة تلقائياً                       |
| 📋 **نسخ ومشاركة**       | نسخ الآية أو مشاركتها عبر واجهة المشاركة الأصلية للنظام             |

### التخصيص · Personalisation

|                     |                                                    |
| ------------------- | -------------------------------------------------- |
| 🌙 **الوضع الليلي** | فاتح · داكن · تلقائي حسب النظام — يُحفظ محلياً     |
| 🔠 **حجم الخط**     | تكبير وتصغير وإعادة ضبط لنص المصحف بشكل مستقل      |
| 🎨 **الخلفيات**     | ورقي · بيج · أبيض · داكن                           |
| 🎧 **التلاوة**      | مشغّل صوتي كامل مع اختيار القارئ والتشغيل المتتابع |

### التجربة · Experience

Skeleton loading · Toast notifications · Smooth scroll · Scroll-to-top ·
Keyboard shortcuts · Offline support · Graceful error, loading and empty states ·
Lazy loading · Micro-animations · Reduced-motion aware

---

## ✦ التقنيات · Tech Stack

| Layer     | Choice                                                    | Why                                                          |
| --------- | --------------------------------------------------------- | ------------------------------------------------------------ |
| Framework | **Next.js 16** (App Router, RSC)                          | Streaming, route handlers, first-class metadata & SEO        |
| UI        | **React 19**                                              | Server Components + concurrent client interactivity          |
| Language  | **TypeScript 5.9** (`strict`, `noUncheckedIndexedAccess`) | Zero `any`, exhaustive domain modelling                      |
| Styling   | **Tailwind CSS 4**                                        | CSS-first design tokens, no runtime cost, no CSS-in-JS       |
| State     | **React hooks + LocalStorage**                            | No state library needed; the domain is small and local-first |
| Data      | Bundled dataset + **Quran.com API v4**                    | Instant & offline by default, enriched when online           |
| Offline   | **Hand-written Service Worker**                           | Precise cache strategies, no unmaintained plugin             |
| Fonts     | **Amiri** (Quran) · **Cairo** (UI)                        | Self-hosted, subset, `font-display: swap`                    |

> **No** Bootstrap, jQuery, Material UI, Chakra, inline CSS, or inline JavaScript.
> Only three runtime dependencies: `next`, `react`, `react-dom`.

---

## ✦ البدء السريع · Quick Start

```bash
# 1. Install
npm install

# 2. Develop
npm run dev          # → http://localhost:3000

# 3. Ship
npm run build && npm start
```

**Requirements:** Node.js `>= 20.9.0`.

No environment variables are required — the app runs fully out of the box.
For deploying to your own domain, see **[DEPLOYMENT.md](DEPLOYMENT.md)**.

### Scripts

| Command                  | Description                              |
| ------------------------ | ---------------------------------------- |
| `npm run dev`            | Development server                       |
| `npm run build`          | Production build                         |
| `npm start`              | Serve the production build               |
| `npm run lint`           | ESLint (flat config)                     |
| `npm run typecheck`      | `tsc --noEmit`                           |
| `npm test`               | Run the test suite once                  |
| `npm run test:watch`     | Test suite in watch mode                 |
| `npm run test:coverage`  | Test suite with a coverage summary       |
| `npm run audit:a11y`     | axe-core audit against a running build   |
| `npm run format`         | Prettier write                           |
| `npm run verify`         | format → lint → typecheck → test → build |
| `npm run data:generate`  | Regenerate the Quran datasets            |
| `npm run icons:generate` | Regenerate PWA icons from the brand mark |

---

## ✦ البنية · Architecture

```
src/
├── app/                    # App Router: routes, layouts, metadata, route handlers
│   ├── (reader)/           #   reading routes sharing the reader chrome
│   ├── api/                #   BFF route handlers (search, tafsir, audio)
│   ├── layout.tsx          #   root layout: fonts, theme bootstrap, providers
│   ├── manifest.ts         #   web app manifest
│   ├── robots.ts           #   robots.txt
│   └── sitemap.ts          #   sitemap.xml
├── components/
│   ├── ui/                 # Presentational primitives (Button, Modal, Toast…)
│   └── layout/             # Shell: header, footer, navigation, command palette
├── features/               # Vertical slices: quran, audio, search, bookmarks, settings
├── hooks/                  # Reusable behaviour (storage, media query, shortcuts…)
├── services/               # Data access: dataset reader, Quran.com client, storage
├── utils/                  # Pure helpers (arabic, format, cn, share…)
├── types/                  # Domain types — the single source of truth
├── constants/              # Reciters, tafsirs, routes, shortcuts, config
├── data/                   # Generated canonical datasets (chapters, juz, hizb, index)
└── styles/                 # Design tokens + global stylesheet
```

### Data strategy

Reading data is **bundled, not fetched**. The full Uthmani text, transliteration,
English translation and structural metadata are generated once by
`scripts/generate-quran-data.mjs` and committed:

- `src/data/chapters.json` · `juz.json` · `hizb.json` — small, imported directly
- `public/data/surah/{n}.json` — per-surah payloads, fetched on demand and cached by the SW
- `src/data/search-index.json` — server-only, powers `/api/search`

Live services (**tafsir**, **recitation audio**) are layered on top through
`/api/*` route handlers, so the browser only ever talks to our own origin, upstream
failures degrade gracefully, and responses become offline-available once visited.

This is a deliberate trade-off: it costs ~6 MB in the repository and buys instant
first paint, zero rate-limit exposure, and a Mus'haf that genuinely works on a plane.

---

## ✦ الهوية البصرية · Design Language

Calm, Islamic, minimal, premium. Inspired by the restraint of Apple, Linear and
Notion — not imitating any of them.

| Token             | Light     | Dark      | Role                                |
| ----------------- | --------- | --------- | ----------------------------------- |
| `--color-emerald` | `#0F6B4F` | `#34C79A` | Primary action, active state        |
| `--color-forest`  | `#0B3D2E` | `#062018` | Deep green — headings, chrome       |
| `--color-gold`    | `#B8892B` | `#D9AF54` | Accent — ayah medallions, ornaments |
| `--color-sand`    | `#F5EFE4` | —         | Warm beige surface                  |
| `--color-paper`   | `#FAF6EE` | —         | Paper reading background            |
| `--color-ink`     | `#12211C` | `#E8EFEA` | Body text                           |

Typography: **Amiri** for Quranic text (`font-feature-settings` tuned for Uthmani
diacritics) and **Cairo** for the interface. Both self-hosted and subset.

---

## ✦ Progressive Web App

Installable on **Android, iOS, Windows and macOS**.

- ✅ Web App Manifest with maskable + Apple touch icons
- ✅ Standalone display mode, themed splash screens
- ✅ Custom install prompt (respects user dismissal)
- ✅ Service Worker with per-asset-class cache strategies
  - App shell → _stale-while-revalidate_
  - Surah data & fonts → _cache-first, immutable_
  - Tafsir API → _network-first with cache fallback_
  - Audio → _range-aware passthrough_
- ✅ Dedicated offline page and offline-aware UI
- ✅ App shortcuts (continue reading, search, bookmarks)

---

## ✦ الجودة · Measured Quality

These are Lighthouse results, not targets. Measured against the production
build under Lighthouse's mobile profile — slow 4G and a 4× CPU slowdown — which
is deliberately harsher than most real devices and connections.

| Route                 | Performance | Accessibility | Best Practices | SEO | LCP   | CLS   | TBT    |
| --------------------- | ----------- | ------------- | -------------- | --- | ----- | ----- | ------ |
| `/`                   | 91          | 100           | 100            | 100 | 3.5 s | 0.012 | 60 ms  |
| `/surah/1`            | 92          | 100           | 100            | 100 | 3.4 s | 0     | 90 ms  |
| `/surah/2` (286 ayat) | 84          | 100           | 100            | 100 | 3.7 s | 0     | 260 ms |
| `/surah`              | 93          | 100           | 100            | 100 | 3.2 s | 0     | 50 ms  |
| `/juz/30` (564 ayat)  | 81          | 100           | 100            | 100 | 3.4 s | 0     | 440 ms |

**Accessibility, Best Practices and SEO are 100 on every route**, and cumulative
layout shift is zero on every reading page. Performance dips on the two longest
ranges in the Mus'haf — Al-Baqarah and juz 30 — where several hundred verse
components render in one pass; that is the honest cost of showing a complete
juz on one page rather than paginating it.

<details>
<summary>How these numbers were reached</summary>

The first measurement scored 59–86 with a 0.19 layout shift. Four changes fixed it:

1. **Fonts cut from 312 kB to 138 kB.** Declaring all nine vendored files as two
   families made Next preload every one of them. Amiri now ships Arabic regular
   only — Naskh is not set in bold — and Cairo's Latin cut loads on demand
   through the ordinary font fallback chain.
2. **The first ten verses render on the server**, inside the same static HTML as
   the page shell, so the reader never shows a skeleton where text is about to
   appear.
3. **`content-visibility` applies only below the fold.** It reserves an estimated
   height and corrects it on first render; inside the viewport that correction
   _is_ the layout shift. Below verse 15 the same correction is invisible and
   free — which is where the 0.19 → 0 came from.
4. **The ayah-of-the-day card waits for an idle callback**, instead of parsing a
   274 kB surah while the page is still painting.

</details>

**Accessibility:** WCAG 2.2 AA, verified with `axe-core` rather than assumed —
11 routes × both themes × all three light surfaces × every dialog, at **zero
violations**. Full keyboard navigation, visible focus rings, ARIA labelling,
focus trapping in dialogs, live regions for async state, and respected
`prefers-reduced-motion` and `prefers-contrast`.

**Tests:** 73 tests covering Arabic normalisation, dataset integrity (all 6236
verses and every juz/hizb boundary), search behaviour and formatting. The dataset
suite is the important one: the generated files are committed, so these tests are
what catch a corrupted or hand-edited Mus'haf before a reader ever sees it.

**SEO:** per-route metadata, Open Graph, Twitter cards, canonical URLs,
`robots.txt`, `sitemap.xml`, and `Book` / `WebSite` / `BreadcrumbList` JSON-LD.

---

## ✦ اختصارات لوحة المفاتيح · Keyboard Shortcuts

| Key                                          | Action                      |
| -------------------------------------------- | --------------------------- |
| <kbd>/</kbd> or <kbd>Ctrl</kbd>+<kbd>K</kbd> | Focus search                |
| <kbd>Space</kbd>                             | Play / pause recitation     |
| <kbd>←</kbd> / <kbd>→</kbd>                  | Previous / next ayah        |
| <kbd>T</kbd>                                 | Toggle theme                |
| <kbd>+</kbd> / <kbd>-</kbd> / <kbd>0</kbd>   | Font size up / down / reset |
| <kbd>B</kbd>                                 | Bookmark current ayah       |
| <kbd>?</kbd>                                 | Show shortcuts              |
| <kbd>Esc</kbd>                               | Close dialog                |

---

## ✦ المصادر · Data Sources & Attribution

| Source                                                                                | Used for                                    | Licence            |
| ------------------------------------------------------------------------------------- | ------------------------------------------- | ------------------ |
| [quran-json](https://github.com/risan/quran-json) (Noble Qur'an Encyclopedia, Tanzil) | Uthmani text, transliteration, translations | CC BY-SA 4.0       |
| [quran-meta](https://github.com/quran-center/quran-meta)                              | Juz, hizb, page, ruku, sajdah metadata      | MIT                |
| [Quran.com API v4](https://api-docs.quran.com)                                        | Tafsir                                      | See upstream terms |
| [EveryAyah](https://everyayah.com)                                                    | Per-ayah recitation audio                   | See upstream terms |

The Quranic text is reproduced with care and verified against the Hafs riwaya.
If you find any discrepancy, please [open an issue](../../issues) immediately —
it will be treated as the highest priority.

---

## ✦ المساهمة · Contributing

Contributions are welcome. Please read [CONTRIBUTING.md](CONTRIBUTING.md) first.

## ✦ الترخيص · License

Source code is released under the [MIT License](LICENSE).
Quranic text and translations remain under their original licences (see above).

---

<div align="center">
<sub>﴿ وَرَتِّلِ الْقُرْآنَ تَرْتِيلًا ﴾</sub>
</div>
