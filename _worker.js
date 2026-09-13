export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const TRAFFIC_SOURCE_URL = "https://sub.datanode-internal.net/McjAzVPB2VRYcM6z";

    // ---- ЗАПРОС К ИСТОЧНИКУ ТРАФИКА ----
    let sourceStatus = 0;
    let rawHeaders = {};
    let rawBody = "";
    let subscriptionUserInfo = null;
    let trafficDisplay = "1496 GB";

    try {
      const resp = await fetch(TRAFFIC_SOURCE_URL, {
        headers: {
          'User-Agent': 'INCY/3.6.5/android',
          'Accept': '*/*'
        },
        redirect: 'manual',   // не следовать редиректам автоматически
        cf: { cacheTtl: 0 }
      });

      sourceStatus = resp.status;
      rawHeaders = Object.fromEntries(resp.headers.entries());

      // Если редирект — читаем Location, тело не трогаем
      if (sourceStatus >= 300 && sourceStatus < 400) {
        const location = rawHeaders['location'] || '(нет Location)';
        rawBody = `REDIRECT ${sourceStatus} to: ${location}`;
      } else {
        rawBody = await resp.text();
      }

      // Ищем заголовок subscription-userinfo
      for (const [key, value] of Object.entries(rawHeaders)) {
        if (key.toLowerCase() === 'subscription-userinfo') {
          subscriptionUserInfo = value;
          break;
        }
      }

      // Парсим total → GB
      if (subscriptionUserInfo) {
        const m = subscriptionUserInfo.match(/total=(\d+)/);
        if (m) {
          const totalBytes = parseInt(m[1], 10);
          if (totalBytes > 0) trafficDisplay = (totalBytes / 1024 ** 3).toFixed(2) + " GB";
          else trafficDisplay = "∞";
        }
      }
    } catch (e) {
      rawBody = "FETCH ERROR: " + e.message;
    }

    // ==================== РЕЖИМ ОТЛАДКИ: /debug ====================
    if (url.pathname === "/debug" || url.searchParams.get("debug") === "1") {
      return new Response(JSON.stringify({
        sourceStatus,
        sourceUrl: TRAFFIC_SOURCE_URL,
        rawHeaders,
        subscriptionUserInfo,
        trafficDisplay,
        rawBodyPreview: rawBody.slice(0, 3000)
      }, null, 2), {
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "Cache-Control": "no-cache"
        }
      });
    }
    // ==============================================================

    // ---- СЕРВЕРЫ ----
    const realNodes = [
      { tag: "de-1",     address: "de-new.datanode-internal.net",  port: 443, id: "31dac09f-78ee-49ca-9566-d20aea578fdc", serverName: "openwrt.lan", publicKey: "r6lN34m1nN-xQZ458j5NPD5xJ3_QBF2bGzY4KJEo4ic", shortId: "abbcd128", fingerprint: "qq", remarks: "🇩🇪 Германия",           network: "tcp",  flow: "xtls-rprx-vision" },
      { tag: "se-1",     address: "se-new.datanode-internal.net",  port: 443, id: "31dac09f-78ee-49ca-9566-d20aea578fdc", serverName: "openwrt.lan", publicKey: "r6lN34m1nN-xQZ458j5NPD5xJ3_QBF2bGzY4KJEo4ic", shortId: "abbcd128", fingerprint: "qq", remarks: "🇸🇪 Швеция",             network: "tcp",  flow: "xtls-rprx-vision" },
      { tag: "pl-1",     address: "pl.datanode-internal.net",      port: 443, id: "31dac09f-78ee-49ca-9566-d20aea578fdc", serverName: "openwrt.lan", publicKey: "r6lN34m1nN-xQZ458j5NPD5xJ3_QBF2bGzY4KJEo4ic", shortId: "abbcd128", fingerprint: "qq", remarks: "🇵🇱 Польша",             network: "tcp",  flow: "xtls-rprx-vision" },
      { tag: "fi-1",     address: "fi.datanode-internal.net",      port: 443, id: "31dac09f-78ee-49ca-9566-d20aea578fdc", serverName: "openwrt.lan", publicKey: "r6lN34m1nN-xQZ458j5NPD5xJ3_QBF2bGzY4KJEo4ic", shortId: "abbcd128", fingerprint: "qq", remarks: "🇫🇮 Финляндия",          network: "tcp",  flow: "xtls-rprx-vision" },
      { tag: "ru-1",     address: "ru.datanode-internal.net",      port: 443, id: "31dac09f-78ee-49ca-9566-d20aea578fdc", serverName: "openwrt.lan", publicKey: "r6lN34m1nN-xQZ458j5NPD5xJ3_QBF2bGzY4KJEo4ic", shortId: "abbcd128", fingerprint: "qq", remarks: "🇷🇺 Россия",             network: "tcp",  flow: "xtls-rprx-vision" },
      { tag: "mobile-1", address: "hole-nn.datanode-internal.net", port: 443, id: "31dac09f-78ee-49ca-9566-d20aea578fdc", serverName: "ads.x5.ru",   publicKey: "r6lN34m1nN-xQZ458j5NPD5xJ3_QBF2bGzY4KJEo4ic", shortId: "abbcd128", fingerprint: "qq", remarks: "🇩🇪 Мобильная связь #1", network: "grpc", flow: "",                   serviceName: "ads.x5.ru", mode: "gun" }
    ];

    function makeVlessLink(n) {
      const params = new URLSearchParams();
      if (n.flow)        params.set("flow", n.flow);
      params.set("type", n.network);
      params.set("security", "reality");
      if (n.fingerprint) params.set("fp", n.fingerprint);
      params.set("sni", n.serverName);
      params.set("pbk", n.publicKey);
      params.set("sid", n.shortId);
      if (n.network === "grpc") {
        if (n.serviceName) params.set("serviceName", n.serviceName);
        if (n.mode)        params.set("mode", n.mode);
      }
      return `vless://${n.id}@${n.address}:${n.port}?${params.toString()}#${encodeURIComponent(n.remarks)}`;
    }

    const body = realNodes.map(makeVlessLink).join("\n");

    return new Response(body, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "no-cache",
        "Profile-Title": "wlvpn",
        "Profile-Update-Interval": "1",
        "Subscription-Status": "active",
        "Subscription-Traffic": trafficDisplay,
        "Subscription-Expire": "1899589200",
        "subscription-userinfo": subscriptionUserInfo || "upload=0; download=0; total=1606343895040; expire=1899589200",
        "announce": "🏳 wlvpn - стабильный VPN сервис."
      }
    });
  }
};