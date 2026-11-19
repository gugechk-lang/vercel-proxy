// netlify/edge-functions/relay.js
export default async function handler(request, context) {
  const url = new URL(request.url);
  // Netlify 的路径匹配规则不同，这里直接转发到 Google 的对应路径
  // 例如：请求 /v1beta/models/... 会被转发到 Google 的 /v1beta/models/...
  const targetUrl = `https://generativelanguage.googleapis.com${url.pathname}${url.search}`;

  const headers = new Headers();
  const apiKey = request.headers.get('x-goog-api-key');
  if (apiKey) headers.set('x-goog-api-key', apiKey);
  const contentType = request.headers.get('content-type');
  if (contentType) headers.set('content-type', contentType);
  // 对于流式请求，显式声明接受 SSE
  if (url.pathname.includes('stream') || url.searchParams.get('alt') === 'sse') {
    headers.set('accept', 'text/event-stream');
  }

  const upstreamResp = await fetch(targetUrl, {
    method: request.method,
    headers,
    body: request.method !== 'GET' && request.method !== 'HEAD' ? request.body : undefined,
  });

  const respHeaders = new Headers(upstreamResp.headers);
  respHeaders.set('cache-control', 'no-cache');
  
  return new Response(upstreamResp.body, {
    status: upstreamResp.status,
    headers: respHeaders,
  });
}

// 配置此函数拦截所有以 /v1beta/ 开头的请求
export const config = { path: "/v1beta/*" };
