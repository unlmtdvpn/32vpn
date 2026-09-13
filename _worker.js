export default {
  async fetch(request, env, ctx) {
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

    return new Response(body, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "no-cache",
        "Profile-Title": "wlvpn",
        "Profile-Update-Interval": "1",
        "Subscription-Status": "active",
        "Subscription-Traffic": "1496 GB",
        "Subscription-Expire": "1899589200",
        "subscription-userinfo": "upload=0; download=0; total=1606343895040; expire=1899589200",
        "announce": "🏳 wlvpn - стабильный VPN сервис."
      }
    });
  }
};