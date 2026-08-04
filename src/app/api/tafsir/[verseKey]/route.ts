import { NextResponse, type NextRequest } from 'next/server';
import { DEFAULT_TAFSIR_ID } from '@/constants';
import { fetchTafsir } from '@/services/tafsir.server';

export const runtime = 'nodejs';

/**
 * `GET /api/tafsir/{surah:ayah}?edition={id}`
 *
 * Proxies the Quran.com tafsir API. Keeping this behind our own origin means
 * the browser's CSP never has to trust a third party, upstream HTML is
 * sanitised before it can reach a client, and Next's data cache absorbs
 * repeated reads of the same ayah.
 *
 * Failures return a 200 with `{ ok: false, error }` rather than an HTTP error
 * status: an unavailable tafsir is an expected, recoverable condition that the
 * dialog renders inline, not an exception. The one exception is a malformed
 * verse key, which is a genuine client error.
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ verseKey: string }> },
): Promise<NextResponse> {
  const { verseKey } = await context.params;

  const editionParam = Number(request.nextUrl.searchParams.get('edition'));
  const editionId = Number.isInteger(editionParam) ? editionParam : DEFAULT_TAFSIR_ID;

  const result = await fetchTafsir(decodeURIComponent(verseKey), editionId);

  if (!result.ok) {
    return NextResponse.json(result, {
      status: 200,
      headers: { 'Cache-Control': 'public, max-age=300' },
    });
  }

  return NextResponse.json(result, {
    headers: {
      // Tafsir text does not change. Cache it hard at every layer.
      'Cache-Control': 'public, max-age=86400, s-maxage=2592000, stale-while-revalidate=2592000',
    },
  });
}
