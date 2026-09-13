export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const TRAFFIC_SOURCE_URL = "https://sub.datanode-internal.net/McjAzVPB2VRYcM6z";
    const FAKE_UA = 'INCY/3.6.5/android';

    let sourceStatus = 0;
    let rawHeaders = {};
    let decodedBody = "";
    let subscriptionUserInfo = null;
    let trafficDisplay = "0 GB / ∞";

    // ---- ЗАПРОС К ИСТОЧНИКУ ----
    try {
      const first = await fetch(TRAFFIC_SOURCE_URL, {
        headers: { 'User-Agent': FAKE_UA, 'Accept': '*/*' },
        redirect: 'manual',
        cf: { cacheTtl: 0 }
      });

      let status = first.status;
      let headers = Object.fromEntries(first.headers.entries());
      let body = '';

      // Cookie-challenge (307)
      if (status >= 300 && status < 400) {
        let cookie = '';
        for (const [k, v] of Object.entries(headers)) {
          if (k.toLowerCase() === 'set-cookie') { cookie = v.split(';')[0]; break; }
        }
        const second = await fetch(TRAFFIC_SOURCE_URL, {
          headers: { 'User-Agent': FAKE_UA, 'Accept': '*/*', 'Cookie': cookie },
          redirect: 'manual',
          cf: { cacheTtl: 0 }
        });
        status = second.status;
        headers = Object.fromEntries(second.headers.entries());
        body = await second.text();
      } else {
        body = await first.text();
      }

      sourceStatus = status;
      rawHeaders = headers;

      // ---- Декодируем base64 → текст со ссылками vless:// ----
      try {
        const trimmed = body.trim();
        // atob работает с base64; добавляем padding на всякий случай
        const padded = trimmed + "=".repeat((4 - trimmed.length % 4) % 4);
        const binary = atob(padded);
        // Корректно декодируем UTF-8 из бинарной строки
        const bytes = Uint8Array.from(binary, c => c.charCodeAt(0));
        decodedBody = new TextDecoder("utf-8").decode(bytes);
      } catch (e) {
        // Если не base64 — отдаём как есть
        decodedBody = body;
      }

      // ---- Ищем subscription-userinfo ----
      for (const [key, value] of Object.entries(rawHeaders)) {
        if (key.toLowerCase() === 'subscription-userinfo') {
          subscriptionUserInfo = value;
          break;
        }
      }

      // ---- Парсим трафик ----
      if (subscriptionUserInfo) {
        const get = (name) => {
          const m = subscriptionUserInfo.match(new RegExp(name + '=(\\d+)'));
          return m ? parseInt(m[1], 10) : 0;
        };
        const upload   = get('upload');
        const download = get('download');
        const total    = get('total');
        const usedGB   = ((upload + download) / 1024 ** 3).toFixed(2);

        if (total > 0) {
          const totalGB = (total / 1024 ** 3).toFixed(2);
          trafficDisplay = `${usedGB} GB / ${totalGB} GB`;
        } else {
          trafficDisplay = `${usedGB} GB / ∞`;
        }
      }
    } catch (e) {
      decodedBody = "FETCH ERROR: " + e.message;
    }

    // ---- /debug ----
    if (url.pathname === "/debug" || url.searchParams.get("debug") === "1") {
      return new Response(JSON.stringify({
        sourceStatus,
        sourceUrl: TRAFFIC_SOURCE_URL,
        rawHeaders,
        subscriptionUserInfo,
        trafficDisplay,
        decodedBodyPreview: decodedBody.slice(0, 1500)
      }, null, 2), {
        headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-cache" }
      });
    }

    // ---- ОТДАЁМ СЕРВЕРЫ ОТ ИСТОЧНИКА ----
    const sourceTitle   = rawHeaders['profile-title'] || "wlvpn";
    const sourceWebPage = rawHeaders['profile-web-page-url'] || "";
    const sourceSupport = rawHeaders['support-url'] || "";
    const sourceProvider = rawHeaders['providerid'] || "";
    const sourceExpire  = (subscriptionUserInfo && subscriptionUserInfo.match(/expire=(\d+)/)?.[1]) || "0";

    const respHeaders = {
      "Content-Type": "text/plain; charset=utf-8",
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "no-cache",
      "Profile-Title": sourceTitle,
      "Profile-Update-Interval": "1",
      "Subscription-Status": "active",
      "Subscription-Traffic": trafficDisplay,
      "Subscription-Expire": sourceExpire,
      "subscription-userinfo": subscriptionUserInfo || "upload=0; download=0; total=0; expire=0",
      "announce": "🏳 wlvpn - стабильный VPN сервис."
    };
    if (sourceWebPage)   respHeaders["Profile-Web-Page-URL"] = sourceWebPage;
    if (sourceSupport)   respHeaders["Support-URL"] = sourceSupport;
    if (sourceProvider)  respHeaders["Provider-ID"] = sourceProvider;

    return new Response(decodedBody, { headers: respHeaders });
  }
};