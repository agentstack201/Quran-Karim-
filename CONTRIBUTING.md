# Contributing to تلاوة · Tilawa

Thank you for taking the time to contribute. This document describes how to work
on the project so that changes land smoothly.

---

## ⚠️ A note on Quranic text

The Quranic text is sacred and must never be altered by hand. It is generated
from verified sources by `scripts/generate-quran-data.mjs`.

- **Never** edit files under `src/data/` or `public/data/` manually.
- If you believe there is an error in the text, open an issue with the exact
  surah:ayah reference and the expected reading. Text corrections are the
  highest-priority class of issue in this project.
- Changes to the generator must keep all structural assertions passing
  (6236 verses, contiguous juz/hizb coverage).

---

## Getting started

```bash
git clone <repository-url>
cd tilawa
npm install
npm run dev
```

Node.js `>= 20.9.0` is required.

---

## Development workflow

1. **Branch** from `main` using a descriptive name:
   `feat/audio-repeat-mode`, `fix/search-diacritics`, `docs/readme-arabic`.
2. **Implement** your change.
3. **Verify** before pushing:

   ```bash
   npm run verify   # format:check → lint → typecheck → build
   ```

4. **Commit** using Conventional Commits (see below).
5. **Open a pull request** describing the change, the reasoning, and any
   screenshots for visual work.

---

## Commit convention

This repository follows [Conventional Commits](https://www.conventionalcommits.org/).

```
<type>(<scope>): <subject>
```

**Types**

| Type       | Use for                                              |
| ---------- | ---------------------------------------------------- |
| `feat`     | A new user-facing capability                         |
| `fix`      | A bug fix                                            |
| `perf`     | A change that improves performance                   |
| `refactor` | A change that neither fixes a bug nor adds a feature |
| `style`    | Formatting only, no logic change                     |
| `docs`     | Documentation only                                   |
| `test`     | Adding or correcting tests                           |
| `build`    | Build system, dependencies, tooling                  |
| `ci`       | Continuous integration configuration                 |
| `chore`    | Housekeeping that does not fit above                 |

**Scopes** mirror the architecture: `quran`, `audio`, `search`, `bookmarks`,
`settings`, `ui`, `pwa`, `seo`, `a11y`, `data`, `config`.

**Examples**

```
feat(audio): add continuous playback across surah boundaries
fix(search): normalise hamza forms before matching
perf(reader): virtualise verse list for long surahs
docs(readme): document the offline data strategy
```

Breaking changes carry a `!` after the scope and a `BREAKING CHANGE:` footer.

---

## Code standards

### TypeScript

- `strict` mode is non-negotiable. `npm run typecheck` must pass with zero errors.
- **No `any`.** If a type is genuinely unknown, use `unknown` and narrow it.
- Prefer `type` for object shapes and unions; use `interface` only when
  declaration merging is required.
- All exported functions carry explicit return types.
- Use `import type` for type-only imports (enforced by ESLint).

### React

- Server Components by default. Add `'use client'` only where interactivity,
  browser APIs or hooks genuinely require it — and push it as far down the tree
  as possible.
- One component per file, named the same as the file.
- Components receive typed props; no prop drilling deeper than two levels
  (lift into a hook or context instead).
- Side effects belong in hooks under `src/hooks/`, not inline in components.

### Styling

- Tailwind utility classes only. **No inline `style` attributes** except for
  genuinely dynamic values (e.g. a computed progress width), and **no inline
  `<script>`** except the documented theme bootstrap.
- Colours, spacing, radii and shadows come from the design tokens in
  `src/styles/theme.css`. Never hard-code a hex value in a component.
- Compose class names with the `cn()` helper.

### Accessibility

Every contribution must maintain WCAG 2.2 AA:

- Interactive elements are real `<button>` / `<a>` elements.
- Every control has an accessible name.
- Focus is visible, ordered, and trapped inside dialogs.
- Colour is never the only carrier of meaning.
- Async state changes are announced through live regions.
- Animations respect `prefers-reduced-motion`.

### Performance

- Keep the client bundle lean; verify with `npm run build` output.
- Server-render whatever can be server-rendered.
- Lazy-load anything below the fold or behind an interaction.
- Never import `src/data/search-index.json` from a Client Component.

---

## Project structure

Place new code according to its nature:

| Location                | Contains                                       |
| ----------------------- | ---------------------------------------------- |
| `src/components/ui`     | Generic, domain-free presentational primitives |
| `src/components/layout` | Application shell pieces                       |
| `src/features/<slice>`  | Everything specific to one product area        |
| `src/hooks`             | Reusable stateful behaviour                    |
| `src/services`          | Data access and side-effectful integrations    |
| `src/utils`             | Pure functions, no React, no I/O               |
| `src/types`             | Shared domain types                            |
| `src/constants`         | Static configuration                           |

A feature slice may import from `ui`, `hooks`, `services`, `utils`, `types` and
`constants` — but never from another feature slice. Share through `src/` roots
instead.

---

## Reporting bugs

Open an issue including:

- What you expected and what happened instead
- Steps to reproduce
- Browser, OS and whether the app was installed as a PWA
- Console output, if any

## Proposing features

Open an issue describing the problem before the solution. Features that add a
runtime dependency need a strong justification — the project deliberately ships
with only three.

---

By contributing you agree that your contributions are licensed under the
[MIT License](LICENSE).
