/**
 * Tilawa — static preview server.
 * -----------------------------------------------------------------------------
 * Serves `out/` the way a static host does, so what you check locally is what
 * readers will get.
 *
 * `next start` cannot do this: with `output: 'export'` there is no server build
 * for it to run. And a naive file server is not good enough either, because the
 * export writes `out/surah/1.html` while the application links to `/surah/1` —
 * every deep link would 404 locally and work in production, which is the wrong
 * way round for a bug to hide.
 *
 * So this replicates the two behaviours real hosts provide: extension-less HTML
 * resolution, and the header rules from `public/_headers`. Without the second,
 * a local Lighthouse or axe run would be measuring a site with no CSP.
 *
 * Written against `node:http` with no dependencies, because a preview server
 * is not worth a package — and because this repository is meant to stay
 * buildable years from now by someone who runs `npm ci` and nothing else.
 *
 * Usage:
 *   npm run build && npm run start          # http://127.0.0.1:3000
 *   PORT=4000 npm run start
 */

import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import { extname, join, normalize, sep } from 'node:path';
import { pathHeaders, securityHeaders } from '../config/security-headers.mjs';

const ROOT = join(new URL('..', import.meta.url).pathname, 'out');
const PORT = Number(process.env.PORT ?? 3000);
const HOST = process.env.HOST ?? '127.0.0.1';

const CONTENT_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.ico': 'image/x-icon',
};

/** Turns a `_headers` glob into a predicate. Only the trailing `*` is used. */
function matcher(source) {
  if (source.endsWith('/*')) {
    const prefix = source.slice(0, -1);
    return (pathname) => pathname.startsWith(prefix);
  }
  return (pathname) => pathname === source;
}

const PATH_RULES = pathHeaders.map(({ source, headers }) => ({
  matches: matcher(source),
  headers,
}));

/** Applies the global headers, then any path rule that matches. */
function applyHeaders(response, pathname) {
  for (const { key, value } of securityHeaders) response.setHeader(key, value);
  for (const rule of PATH_RULES) {
    if (!rule.matches(pathname)) continue;
    for (const { key, value } of rule.headers) response.setHeader(key, value);
  }
}

/**
 * Resolves a request path to a file on disk.
 *
 * Tries the path itself, then `.html`, then `index.html` — the same order
 * Cloudflare Pages, Netlify and the documented Nginx config use.
 */
async function resolveFile(pathname) {
  const candidates = [pathname, `${pathname}.html`, join(pathname, 'index.html')];

  for (const candidate of candidates) {
    // Normalise *after* joining so `..` cannot escape the output directory.
    const resolved = normalize(join(ROOT, candidate));
    if (resolved !== ROOT && !resolved.startsWith(ROOT + sep)) continue;

    try {
      const info = await stat(resolved);
      if (info.isFile()) return resolved;
    } catch {
      // Try the next candidate.
    }
  }

  return null;
}

const server = createServer((request, response) => {
  void (async () => {
    const pathname = decodeURIComponent(new URL(request.url ?? '/', 'http://localhost').pathname);
    const file = await resolveFile(pathname === '/' ? '/index.html' : pathname);

    applyHeaders(response, pathname);

    if (!file) {
      const notFound = await resolveFile('/404.html');
      response.writeHead(404, { 'Content-Type': CONTENT_TYPES['.html'] });
      if (notFound) createReadStream(notFound).pipe(response);
      else response.end('Not found');
      return;
    }

    response.writeHead(200, {
      'Content-Type': CONTENT_TYPES[extname(file)] ?? 'application/octet-stream',
    });
    createReadStream(file).pipe(response);
  })();
});

server.listen(PORT, HOST, () => {
  console.log(`▸ Serving out/ at http://${HOST}:${PORT}`);
});
