# Changelog

All notable changes to **تلاوة · Tilawa** are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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
