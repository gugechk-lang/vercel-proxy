export const config = { runtime: 'edge' };

export default async function handler(req) {
  const url = new URL(req.url);
  const targetPath = url.pathname.replace(/^\/api\/relay/, '');
  const targetUrl = `https://generativelanguage.googleapis.com${targetPath}${url.search}`;

  const headers = new Headers();
  const apiKey = req.headers.get('x-goog-api-key');
  if (apiKey) headers.set('x-goog-api-key', apiKey);
  const contentType = req.headers.get('content-type');
  if (contentType) headers.set('content-type', contentType);
  if (url.pathname.includes('stream') || url.searchParams.get('alt') === 'sse') {
    headers.set('accept', 'text/event-stream');
  }

  const upstreamResp = await fetch(targetUrl, {
    method: req.method,
    headers,
    body: req.method !== 'GET' && req.method !== 'HEAD' ? req.body : undefined,
  });

  const respHeaders = new Headers(upstreamResp.headers);
  respHeaders.set('cache-control', 'no-cache');
  respHeaders.set('connection', 'keep-alive');
  
  return new Response(upstreamResp.body, {
    status: upstreamResp.status,
    headers: respHeaders,
  });
}
