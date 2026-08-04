import { NextResponse, type NextRequest } from 'next/server';
import { SEARCH_MIN_LENGTH, SEARCH_RESULT_LIMIT } from '@/constants';
import { searchVerses } from '@/services/search.server';

export const runtime = 'nodejs';
/** Results are a pure function of the query, so responses are fully cacheable. */
export const dynamic = 'force-dynamic';

/** Hard ceiling on query length — anything longer is abuse, not a search. */
const MAX_QUERY_LENGTH = 120;

/**
 * `GET /api/search?q=…&limit=…`
 *
 * Runs full-text search server-side so the 3 MB index never reaches the
 * browser. Responses carry a long `s-maxage` with `stale-while-revalidate`:
 * the corpus is immutable, so an identical query can always be served from the
 * edge, and the service worker reuses the same response offline.
 */
export function GET(request: NextRequest): NextResponse {
  const { searchParams } = request.nextUrl;

  const rawQuery = searchParams.get('q') ?? '';
  const query = rawQuery.slice(0, MAX_QUERY_LENGTH).trim();

  if (query.length < SEARCH_MIN_LENGTH) {
    return NextResponse.json(
      { query, total: 0, results: [], truncated: false },
      { headers: { 'Cache-Control': 'public, max-age=60' } },
    );
  }

  const requestedLimit = Number(searchParams.get('limit'));
  const limit =
    Number.isInteger(requestedLimit) && requestedLimit > 0
      ? Math.min(requestedLimit, SEARCH_RESULT_LIMIT)
      : SEARCH_RESULT_LIMIT;

  try {
    const response = searchVerses(query, limit);
    return NextResponse.json(response, {
      headers: {
        'Cache-Control': 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800',
      },
    });
  } catch (error) {
    console.error('[tilawa] Search failed', error);
    return NextResponse.json(
      { query, total: 0, results: [], truncated: false, error: 'تعذّر تنفيذ البحث' },
      { status: 500 },
    );
  }
}
