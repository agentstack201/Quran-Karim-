import type { NextConfig } from 'next';
// @ts-expect-error — plain ESM module, shared with scripts/generate-headers.mjs
// so the policy served in production and the one applied in `next dev` are
// literally the same object. It has no types of its own by design: adding a
// build step to a config file's dependency would be worse than this comment.
import { pathHeaders, securityHeaders } from './config/security-headers.mjs';

/**
 * The application builds to a fully static site.
 *
 * There are no route handlers, no server components that read a request, and no
 * revalidation — search runs against an index in the browser, tafsir is fetched
 * from its upstream API by the client, and every verse payload is an immutable
 * file. What is left is 700-odd prerendered pages and a folder of JSON.
 *
 * That is a deliberate product constraint rather than a technical accident: a
 * static site can be hosted for nothing, forever, on infrastructure that does
 * not care how many people read the Quran on it. Every feature added from here
 * is measured against it — anything that needs a server to run needs a
 * justification for the running cost, and for what happens to readers when
 * nobody is left to pay it.
 *
 * Security headers cannot be served by `headers()` in this mode, because
 * nothing is running to serve them. They are written to `public/_headers` for
 * the CDN instead; the block below only affects `next dev`.
 *
 * @see config/security-headers.mjs
 * @see scripts/generate-headers.mjs
 */
const nextConfig: NextConfig = {
  output: 'export',

  reactStrictMode: true,
  poweredByHeader: false,
  compress: true,

  experimental: {
    optimizePackageImports: ['@/components/ui'],
  },

  turbopack: {
    root: import.meta.dirname,
  },

  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? { exclude: ['error', 'warn'] } : false,
  },

  /**
   * Development only — a static export has no server to run this.
   *
   * Kept so that what a developer browses locally behaves like production
   * rather than being quietly more permissive, which is how a CSP violation
   * reaches a deploy unnoticed.
   */
  async headers() {
    return [
      { source: '/:path*', headers: securityHeaders },
      ...pathHeaders.map(({ source, headers }: { source: string; headers: unknown[] }) => ({
        // `_headers` globs with `*`; Next matches with `:path*`.
        source: source.replace(/\/\*$/, '/:path*'),
        headers,
      })),
    ];
  },
};

export default nextConfig;
