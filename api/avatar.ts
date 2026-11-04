import { avatarFromUrl } from './_avatar.js';

const COMMON_HEADERS = {
  'access-control-allow-origin': '*',
  'x-content-type-options': 'nosniff',
};

export function GET(request: Request): Response {
  const result = avatarFromUrl(new URL(request.url));
  if (!result.ok) {
    return new Response(`${result.message}\n`, {
      status: 400,
      headers: {
        ...COMMON_HEADERS,
        'content-type': 'text/plain; charset=utf-8',
        'cache-control': 'no-store',
      },
    });
  }
  return new Response(result.svg, {
    headers: {
      ...COMMON_HEADERS,
      'content-type': 'image/svg+xml; charset=utf-8',
      'cache-control': 'public, max-age=86400, s-maxage=31536000, stale-while-revalidate=604800',
    },
  });
}
