export default {
  async fetch(request, env, ctx) {
    // ---- КОНФИГУРАЦИЯ ----
    // URL вашего источника данных о трафике
    const TRAFFIC_SOURCE_URL = "https://sub.datanode-internal.net/McjAzVPB2VRYcM6z";

    // Значения по умолчанию (если запрос не удастся)
    let subscriptionUserInfo = "upload=0; download=0; total=1606343895040; expire=1899589200"; // total = 1496 GB
    let trafficDisplay = "1496 GB"; // Человекочитаемое значение для заголовка Subscription-Traffic

    // ---- ПОПЫТКА ПОЛУЧИТЬ ДАННЫЕ О ТРАФИКЕ ----
    try {
      const trafficResponse = await fetch(TRAFFIC_SOURCE_URL, {
        method: 'GET',
        headers: {
          'User-Agent': 'Cloudflare-Worker-Subscription-Proxy/1.0'
        }
      });

      if (trafficResponse.ok) {
        // 1. Пытаемся получить данные из заголовка 'subscription-userinfo'
        const userInfoHeader = trafficResponse.headers.get('subscription-userinfo');
        if (userInfoHeader) {
          subscriptionUserInfo = userInfoHeader;
          
          // Парсим total для человекочитаемого отображения
          const totalMatch = userInfoHeader.match(/total=(\d+)/);
          if (totalMatch && totalMatch[1]) {
            const totalBytes = parseInt(totalMatch[1], 10);
            if (totalBytes > 0) {
              trafficDisplay = (totalBytes / (1024 ** 3)).toFixed(2) + ' GB';
            }
          }
        } else {
          // 2. Если заголовка нет, пробуем прочитать тело как JSON (на случай, если API отдаёт JSON)
          const contentType = trafficResponse.headers.get('content-type') || '';
          if (contentType.includes('application/json')) {
            const data = await trafficResponse.json();
            if (data && typeof data.total === 'number') {
              subscriptionUserInfo = `upload=${data.upload || 0}; download=${data.download || 0}; total=${data.total}; expire=${data.expire || 0}`;
              trafficDisplay = (data.total / (1024 ** 3)).toFixed(2) + ' GB';
            }
          }
        }
      } else {
        console.warn(`Traffic source returned status ${trafficResponse.status}`);
      }
    } catch (err) {
      // В случае ошибки используем значения по умолчанию
      console.error("Failed to fetch traffic data:", err);
    }

    // ---- СЕРВЕРЫ ----
    const realNodes = [
      { tag: "de-1",     address: "de-new.datanode-internal.net",  port: 443, id: "31dac09f-78ee-49ca-9566-d20aea578fdc", serverName: "openwrt.lan", publicKey: "r6lN34m1nN-xQZ458j5NPD5xJ3_QBF2bGzY4KJEo4ic", shortId: "abbcd128", fingerprint: "qq", remarks: "🇩🇪 Германия",           network: "tcp",  flow: "xtls-rprx-vision" },
      { tag: "se-1",     address: "se-new.datanode-internal.net",  port: 443, id: "31dac09f-78ee-49ca-9566-d20aea578fdc", serverName: "openwrt.lan", publicKey: "r6lN34m1nN-xQZ458j5NPD5xJ3_QBF2bGzY4KJEo4ic", shortId: "abbcd128", fingerprint: "qq", remarks: "🇸🇪 Швеция",             network: "tcp",  flow: "xtls-rprx-vision" },
      { tag: "pl-1",     address: "pl.datanode-internal.net",      port: 443, id: "31dac09f-78ee-49ca-9566-d20aea578fdc", serverName: "openwrt.lan", publicKey: "r6lN34m1nN-xQZ458j5NPD5xJ3_QBF2bGzY4KJEo4ic", shortId: "abbcd128", fingerprint: "qq", remarks: "🇵🇱 Польша",             network: "tcp",  flow: "xtls-rprx-vision" },
      { tag: "fi-1",     address: "fi.datanode-internal.net",      port: 443, id: "31dac09f-78ee-49ca-9566-d20aea578fdc", serverName: "openwrt.lan", publicKey: "r6lN34m1nN-xQZ458j5NPD5xJ3_QBF2bGzY4KJEo4ic", shortId: "abbcd128", fingerprint: "qq", remarks: "🇫🇮 Финляндия",          network: "tcp",  flow: "xtls-rprx-vision" },
      { tag: "ru-1",     address: "ru.datanode-internal.net",      port: 443, id: "31dac09f-78ee-49ca-9566-d20aea578fdc", serverName: "openwrt.lan", publicKey: "r6lN34m1nN-xQZ458j5NPD5xJ3_QBF2bGzY4KJEo4ic", shortId: "abbcd128", fingerprint: "qq", remarks: "🇷🇺 Россия",             network: "tcp",  flow: "xtls-rprx-vision" },
      { tag: "mobile-1", address: "hole-nn.datanode-internal.net", port: 443, id: "31dac09f-78ee-49ca-9566-d20aea578fdc", serverName: "ads.x5.ru",   publicKey: "r6lN34m1nN-xQZ458j5NPD5xJ3_QBF2bGzY4KJEo4ic", shortId: "abbcd128", fingerprint: "qq", remarks: "🇩🇪 Мобильная связь #1", network: "grpc", flow: "",                   serviceName: "ads.x5.ru", mode: "gun" }
    ];

    // ---- ФУНКЦИЯ: собрать VLESS-ссылку ----
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

    // ---- ОТДАЁМ ОТВЕТ С ОБНОВЛЁННЫМИ ЗАГОЛОВКАМИ ----
    return new Response(body, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "no-cache",
        "Profile-Title": "wlvpn",
        "Profile-Update-Interval": "1",
        "Subscription-Status": "active",
        "Subscription-Traffic": trafficDisplay,          // ← теперь динамический
        "Subscription-Expire": "1899589200",
        "subscription-userinfo": subscriptionUserInfo,   // ← теперь динамический
        "announce": "🏳 wlvpn - стабильный VPN сервис."
      }
    });
  }
};