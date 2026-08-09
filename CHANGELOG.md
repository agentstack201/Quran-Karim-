# Changelog

All notable changes to **تلاوة · Tilawa** are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed

- **The application no longer has a server.** It builds to a static export —
  817 prerendered pages and a folder of JSON — so it can be hosted for nothing,
  permanently, on infrastructure indifferent to how many people read on it.
  This is a product constraint as much as a technical one: any feature added
  from here must answer who pays for its running cost, and what happens to
  readers when nobody is left to pay it.
- **Search moved into the browser** and `/api/search` was deleted. The index is
  now split by script and stored columnar — position encodes the ayah id, so
  6236 records shed three numbers and four repeated keys each. An Arabic query
  downloads 550 kB gzipped once, then never again. **Search now works offline**,
  which for a Quran reader is not a nicety: the reader looking for an ayah on a
  plane is the same one who needed it at home.
- **Tafsir is fetched directly from the content API** and `/api/tafsir` was
  deleted. The upstream HTML is still stripped to plain text before it can reach
  the DOM — that sanitiser matters more now, not less, and the service worker
  caches the result so an ayah's tafsir survives going offline.
- Security headers moved to `config/security-headers.mjs`, the single source for
  both `next dev` and the generated `public/_headers` the CDN reads. A static
  export has nothing running to serve `headers()`, and a policy that looks
  enforced while being absent in production is worse than no policy.
- `npm start` now serves `out/` the way a static host does — extension-less HTML
  resolution and the real header rules — so a local audit measures the deployed
  site rather than a more permissive imitation.

### Fixed

- **The displayed data attribution was wrong.** The footer credited
  quranenc.com while `scripts/generate-quran-data.mjs` actually generates the
  text from `quran-json` (CC BY-SA 4.0) and `quran-meta` (MIT). CC BY-SA
  requires naming the source and the licence, so an incorrect credit was a live
  breach of its terms rather than a cosmetic slip. Both sources and both
  licences are now named.
- `Permissions-Policy` sent `microphone=()`, which would have refused
  `getUserMedia` at the header level before any consent prompt could appear. It
  is now `microphone=(self)`; camera and geolocation stay denied outright.
- The source links in the footer relied on colour alone to distinguish
  themselves from surrounding text — 1.87:1 in dark mode against the 3:1 WCAG
  requires. They are underlined now. Caught by the axe-core suite, which is the
  entire reason it runs on every appearance and dialog.

### Removed

- `html-version/`, a standalone static copy of the surah index. A second source
  of truth that would drift from the app and quietly rot.

### Performance

- **Fonts cut from 312 kB to 138 kB.** Declaring all nine vendored files as two
  families made Next preload every one of them. Amiri now ships Arabic regular
  only; Cairo's Latin cut loads on demand through the font fallback chain.
- **The first ten verses render on the server**, so the reader never shows a
  skeleton where text is about to appear.
- **`content-visibility` applies only below verse 15**, keeping its height
  correction out of the viewport where it counted as a layout shift.
- The ayah-of-the-day card waits for an idle callback instead of parsing a
  274 kB surah during first paint.
- Measured result: performance 59–86 → 81–93, and **cumulative layout shift
  0.19 → 0** on every reading page.

### Fixed

- The scroll-to-top button used `opacity-0` while hidden, so it still occupied
  space for hit-testing directly over the last ayah's action row — a WCAG 2.2 ·
  2.5.8 target-size failure. It is now `invisible`.

### Added

- `scripts/audit-accessibility.mjs` — the accessibility audit as a committed,
  repeatable script covering 13 routes, 4 appearances and 3 dialogs, failing on
  a single violation.
- GitHub Actions CI: verify, dataset integrity and accessibility as separate
  jobs, so a failure names the gate that broke.
- Repository governance: PR template, issue templates (including a dedicated
  highest-priority template for Quranic text corrections), SECURITY.md and
  .env.example.
- README now reports measured Lighthouse results instead of stated targets.

## [1.0.0] — 2026-08-04

First production release.

### Added

- Project scaffold: Next.js 16 App Router, React 19, TypeScript 5.9 in strict
  mode, Tailwind CSS 4, ESLint flat config and Prettier.
- Canonical Quran dataset generator (`scripts/generate-quran-data.mjs`) producing
  114 chapters, 30 juz, 60 hizb, 6236 verses with Uthmani text, transliteration,
  English translation and structural metadata, with built-in integrity assertions.
- Hardened security headers including a strict Content-Security-Policy.
- Project documentation: README, CONTRIBUTING, LICENSE with third-party
  attribution.

- Design system with warm-beige/emerald/gold tokens, dual theming axes
  (light/dark × paper/beige/white), and self-hosted Amiri and Cairo webfonts.
- Accessible UI primitives: Button, IconButton, Card, Badge, Icon, Modal, Toast,
  Skeleton, SegmentedControl, Select, Slider, Switch and state components.
- Domain layer: typed Quran model, bundled dataset services, server-only
  full-text search over all 6236 verses, and a sanitising Quran.com tafsir proxy.
- Reading experience: home page, surah/juz/hizb readers, full surah index with
  filtering and sorting, search page, bookmarks, about and offline pages.
- Recitation player with per-ayah playback, reciter selection, seeking, volume,
  playback rate, continuous playback and OS media-session integration.
- Ayah dialog with tafsir, English translation, transliteration and structural
  metadata, degrading gracefully when the tafsir source is unreachable.
- Progressive Web App: manifest with maskable icons and app shortcuts,
  hand-written service worker with per-asset-class cache strategies, custom
  install prompt and a dedicated offline page.
- Brand assets generated from a dependency-free renderer: favicon, PWA icons,
  maskable icons, Apple touch icon, shortcut icons and the social preview card.
- SEO: per-route metadata, Open Graph, Twitter cards, canonical URLs,
  `robots.txt`, a 209-URL `sitemap.xml`, and WebSite/WebApplication/Book/
  BreadcrumbList JSON-LD.
- Keyboard shortcuts across the app, with an in-app reference dialog generated
  from the same table the key handler reads.

### Performance

- Pre-sliced juz payloads reduce a juz or hizb page from up to 37 parallel
  requests to a single one, and stop juz 1 downloading all of Al-Baqarah to
  read the 141 verses it actually contains.
- Verse blocks use `content-visibility: auto`, so off-screen ayat in long surahs
  skip layout and paint.
- 214 pages prerendered at build time.

### Fixed

- **Search missed an entire family of words.** The Uthmani script writes
  الصلاة, الزكاة, الحياة, التوراة and مشكاة with a waw or alef maqsura carrying a
  superscript alef. Stripping that mark as an ordinary diacritic left "الصلوه",
  so a reader searching for "الصلاة" got no results at all. Both spellings now
  fold onto the same form, while عَلَىٰ and مُوسَىٰ keep their modern spelling.
- `excerpt()` no longer cuts mid-word when the last space sits exactly at the
  60% threshold.

### Testing

- 73 tests across Arabic normalisation, dataset integrity, search and
  formatting, run by Vitest as part of `npm run verify`.
- Dataset tests assert all 6236 verses, contiguous juz and hizb coverage, the
  hizb-inside-juz relationship the reader depends on, and the contents of every
  generated payload — the committed data's safety net.

### Accessibility

- Verified with axe-core across 11 routes, both themes, all three light
  surfaces, and every dialog: zero WCAG 2.2 AA violations.
- Raised `--ink-subtle` and `--accent` contrast to clear 4.5:1 on the darkest
  light surface, not merely the default one.
- Removed the resting opacity on the verse action row, which had dropped the
  ayah reference to 1.6:1.
- Replaced `<header>`/`<footer>` inside the dialog portal with plain elements,
  eliminating duplicate banner and contentinfo landmarks.
- Corrected heading order by making card heading levels caller-controlled.

[Unreleased]: https://github.com/agentstack201/quran-karim-/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/agentstack201/quran-karim-/releases/tag/v1.0.0
