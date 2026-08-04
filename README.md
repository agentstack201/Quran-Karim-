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

|                          |                                                                    |
| ------------------------ | ------------------------------------------------------------------ |
| 📖 **المصحف كاملاً**     | ١١٤ سورة · ٦٢٣٦ آية بالرسم العثماني                                |
| 🗂️ **تصفح متعدد**        | حسب السورة أو الجزء (٣٠) أو الحزب (٦٠)                             |
| 🔍 **بحث فوري**          | بحث في نص القرآن والترجمة أثناء الكتابة، مع تطبيع للحروف العربية   |
| 📝 **التفسير**           | التفسير الميسر + الترجمة الإنجليزية + معلومات الآية في نافذة أنيقة |
| 🔖 **العلامات المرجعية** | حفظ الآيات المفضلة ومتابعة آخر قراءة تلقائياً                      |
| 📋 **نسخ ومشاركة**       | نسخ الآية أو مشاركتها عبر واجهة المشاركة الأصلية للنظام            |

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

### Scripts

| Command                  | Description                              |
| ------------------------ | ---------------------------------------- |
| `npm run dev`            | Development server                       |
| `npm run build`          | Production build                         |
| `npm start`              | Serve the production build               |
| `npm run lint`           | ESLint (flat config)                     |
| `npm run typecheck`      | `tsc --noEmit`                           |
| `npm run format`         | Prettier write                           |
| `npm run verify`         | format → lint → typecheck → build        |
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

## ✦ الجودة · Quality Targets

| Metric                    | Target            |
| ------------------------- | ----------------- |
| Lighthouse Performance    | ≥ 95              |
| Lighthouse Accessibility  | 100               |
| Lighthouse Best Practices | 100               |
| Lighthouse SEO            | 100               |
| PWA                       | Fully installable |
| TypeScript errors         | 0                 |
| ESLint errors             | 0                 |

**Accessibility:** WCAG 2.2 AA — full keyboard navigation, visible focus rings,
ARIA labelling, focus trapping in dialogs, live regions for async state, respected
`prefers-reduced-motion` and `prefers-contrast`.

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
