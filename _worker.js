// EDtunnel - VLESS over WebSocket для Cloudflare Workers
export default {
  async fetch(request) {
    const url = new URL(request.url);
    if (url.pathname === '/') {
      return new Response('Worker is running', { status: 200 });
    }
    // Здесь ваш код прокси (можно взять готовый с GitHub)
    // Например: https://github.com/3Kmfi6HP/EDtunnel/blob/main/_worker.js
    return new Response('Hello World', { status: 200 });
  }
}
