# Security Policy

## Reporting a vulnerability

Please report security issues privately through
[GitHub Security Advisories](../../security/advisories/new) rather than opening a
public issue.

Include what you can: the affected version or commit, steps to reproduce, and
what an attacker could achieve. A working proof of concept helps, but a clear
description is enough to start.

You can expect an acknowledgement within a few days, and an assessment shortly
after. Fixes for confirmed issues are released before the advisory is published.

## Scope

This is a static, client-side reading application. It has no accounts, no
server-side user data, and no database — so the usual authentication and
authorisation classes do not apply. What _is_ in scope:

| Area                    | Why it matters                                                                                                                                                                                                        |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Content injection**   | Tafsir is fetched from a third-party API directly by the browser. `htmlToPlainText` in `src/services/tafsir.ts` is the only thing between upstream markup and the DOM; a bypass of it would be a genuine XSS vector.  |
| **CSP weaknesses**      | The Content-Security-Policy lives in `config/security-headers.mjs` and is served from the generated `public/_headers`. A way around it is worth reporting — as is a deployment path where it silently fails to apply. |
| **Third-party origins** | Only `api.quran.com` and the recitation archives are allow-listed in `connect-src`/`media-src`. A way to reach any other origin from the page is in scope.                                                            |
| **Service worker**      | Cache poisoning, or serving one origin's content under another, would be serious.                                                                                                                                     |
| **Supply chain**        | The project ships three runtime dependencies precisely to keep this surface small. Issues in them are in scope.                                                                                                       |
| **Data integrity**      | Any way to make the application display altered Quranic text is treated as a security issue, not merely a bug.                                                                                                        |

Out of scope: findings that require a compromised device or browser, denial of
service against a self-hosted deployment, missing headers with no demonstrated
impact, and reports produced solely by automated scanners without a working
exploit.

## Supported versions

The latest release on the default branch is supported. Older versions do not
receive backported fixes.

## Hardening already in place

- Strict Content-Security-Policy with no `unsafe-eval` in production, and
  `frame-ancestors 'none'`
- HSTS with preload, `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`,
  a restrictive `Permissions-Policy`, and `strict-origin-when-cross-origin`
- Third-party tafsir HTML is stripped to plain text server-side; markup from an
  upstream source never reaches the DOM
- The browser talks only to this origin; upstream APIs are proxied
- No analytics, no trackers, no third-party scripts, no cookies
- All user data — bookmarks, settings, reading position — stays in
  LocalStorage on the device and is never transmitted
