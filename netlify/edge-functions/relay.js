
// netlify/edge-functions/relay.js
export default async function handler(request, context) {
  const url = new URL(request.url);
  const targetUrl = `https://generativelanguage.googleapis.com${url.pathname}${url.search}`;

  // 关键：立即创建一个可读流，并马上返回 Response
  const body = new ReadableStream({
    async start(controller) {
      try {
        const headers = new Headers();
        const apiKey = request.headers.get('x-goog-api-key');
        if (apiKey) headers.set('x-goog-api-key', apiKey);
        const contentType = request.headers.get('content-type');
        if (contentType) headers.set('content-type', contentType);
        if (url.pathname.includes('stream') || url.searchParams.get('alt') === 'sse') {
          headers.set('accept', 'text/event-stream');
        }

        // 在流内部执行耗时较长的上游请求
        const upstreamResp = await fetch(targetUrl, {
          method: request.method,
          headers,
          body: request.method !== 'GET' && request.method !== 'HEAD' ? request.body : undefined,
        });

        if (!upstreamResp.ok) {
          const errText = await upstreamResp.text();
          controller.enqueue(new TextEncoder().encode(`data: {"error": ${JSON.stringify(errText)}}\n\n`));
          controller.close();
          return;
        }

        const reader = upstreamResp.body.getReader();
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          controller.enqueue(value);
        }
      } catch (e) {
        controller.enqueue(new TextEncoder().encode(`data: {"error": "${e.message}"}\n\n`));
      } finally {
        controller.close();
      }
    }
  });

  // 立刻返回，响应头会在毫秒级发出
  return new Response(body, {
    headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' },
  });
}

export const config = { path: "/v1beta/*" };
