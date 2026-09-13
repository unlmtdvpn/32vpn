export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const TRAFFIC_SOURCE_URL = "https://sub.datanode-internal.net/McjAzVPB2VRYcM6z";
    const FAKE_UA = 'Happ/4.3.0/Android';

    // ======================================================
    //  АДРЕС → ЧЕЛОВЕЧЕСКОЕ ИМЯ.  Если адреса нет — пропуск.
    // ======================================================
    const COUNTRY_MAP = {
      'de-new.datanode-internal.net':  '🇩🇪 Германия',
      'se-new.datanode-internal.net':  '🇸🇪 Швеция',
      'pl.datanode-internal.net':      '🇵🇱 Польша',
      'ru.datanode-internal.net':      '🇷🇺 Россия',
      'hole-nn.datanode-internal.net': '🇫🇷 Мобильная связь #1',
      'res.datanode-internal.net':     '🌍 Резервный',
    };

    // ======================================================
    //  ДУБЛИКАТЫ: ключ — оригинальное имя, значение — копия
    // ======================================================
    const DUPLICATES = {
      "🇩🇪 Германия":          "🇳🇱 Нидерланды",
      "🇸🇪 Швеция":            "🇳🇴 Норвегия",
      "🇵🇱 Польша":            "🇨🇿 Чехия",
      "🇷🇺 Россия":            "🇰🇿 Казахстан",
      "🇫🇷 Мобильная связь #1": "🇧🇾 Мобильная связь #2",
      "🌍 Резервный":          "🇬🇧 Британия",
    };
    // ======================================================

    let sourceStatus = 0;
    let rawHeaders = {};
    let sourceJson = null;
    let debugBody = "";

    try {
      const first = await fetch(TRAFFIC_SOURCE_URL, {
        headers: { 'User-Agent': FAKE_UA, 'Accept': '*/*' },
        redirect: 'manual',
        cf: { cacheTtl: 0 }
      });

      let status = first.status;
      let headers = Object.fromEntries(first.headers.entries());
      let body = '';

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
      debugBody = body.slice(0, 2500);

      // Декодируем если base64, иначе используем как есть
      let jsonText = body.trim();
      if (!jsonText.startsWith('[') && !jsonText.startsWith('{')) {
        try {
          const padded = jsonText + "=".repeat((4 - jsonText.length % 4) % 4);
          const binary = atob(padded);
          const bytes = Uint8Array.from(binary, c => c.charCodeAt(0));
          jsonText = new TextDecoder("utf-8").decode(bytes);
        } catch (e) {}
      }
      sourceJson = JSON.parse(jsonText);
    } catch (e) {
      debugBody = "FETCH/PARSE ERROR: " + e.message;
    }

    if (url.pathname === "/debug" || url.searchParams.get("debug") === "1") {
      return new Response(JSON.stringify({
        sourceStatus,
        rawHeaders,
        bodyPreview: debugBody
      }, null, 2), {
        headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-cache" }
      });
    }

    // ---- Общие части ----
    const commonDns = { servers: ["1.1.1.1", "1.0.0.1"], queryStrategy: "UseIP" };
    const commonInbounds = [
      {
        tag: "socks", port: 10808, listen: "127.0.0.1", protocol: "socks",
        settings: { udp: true, auth: "noauth" },
        sniffing: { enabled: true, routeOnly: false, destOverride: ["http", "tls", "quic"] }
      },
      {
        tag: "http", port: 10809, listen: "127.0.0.1", protocol: "http",
        settings: { allowTransparent: false },
        sniffing: { enabled: true, routeOnly: false, destOverride: ["http", "tls", "quic"] }
      }
    ];

    // ---- Извлекаем ВСЕ vless-серверы из одного конфига ----
    function extractServers(cfg) {
      const result = [];
      if (!cfg || !Array.isArray(cfg.outbounds)) return result;

      for (const ob of cfg.outbounds) {
        if (ob.protocol !== 'vless') continue;
        if (!ob.settings || !ob.settings.vnext) continue;
        const vnext = ob.settings.vnext[0];
        if (!vnext) continue;
        const user = (vnext.users && vnext.users[0]) || {};
        const ss = ob.streamSettings || {};
        const rs = ss.realitySettings || {};
        const gs = ss.grpcSettings || {};

        result.push({
          address: vnext.address,
          port: vnext.port,
          id: user.id,
          flow: user.flow || '',
          network: ss.network || 'tcp',
          sni: rs.serverName || '',
          pbk: rs.publicKey || '',
          sid: rs.shortId || '',
          fp: rs.fingerprint || 'chrome',
          serviceName: gs.serviceName || '',
          mode: gs.mode || 'gun'
        });
      }
      return result;
    }

    // ---- outbound с нашим тегом ----
    function buildOutbound(s, tag) {
      const out = {
        tag: tag,
        protocol: "vless",
        settings: {
          vnext: [{
            address: s.address,
            port: s.port,
            users: [{ id: s.id, encryption: "none", flow: s.flow }]
          }]
        },
        streamSettings: {
          network: s.network,
          security: "reality",
          realitySettings: {
            serverName: s.sni,
            publicKey: s.pbk,
            shortId: s.sid,
            fingerprint: s.fp
          }
        }
      };
      if (s.network === 'grpc') {
        out.streamSettings.grpcSettings = { serviceName: s.serviceName, mode: s.mode };
      } else {
        out.streamSettings.tcpSettings = {};
      }
      return out;
    }

    // ---- одиночный конфиг ----
    function buildConfig(s, tag) {
      return {
        remarks: tag,
        dns: commonDns,
        inbounds: commonInbounds,
        outbounds: [
          buildOutbound(s, tag),
          { tag: "direct", protocol: "freedom" },
          { tag: "block", protocol: "blackhole" }
        ],
        routing: {
          domainMatcher: "hybrid",
          domainStrategy: "IPIfNonMatch",
          rules: [
            { type: "field", protocol: ["bittorrent"], outboundTag: "block" },
            { type: "field", inboundTag: ["socks", "http"], network: "tcp,udp", outboundTag: tag }
          ]
        }
      };
    }

    // ======================================================
    //  СОБИРАЕМ ВСЕ СЕРВЕРЫ ИЗ ВСЕХ КОНФИГОВ ИСТОЧНИКА
    //  (включая встроенный "LTE Авто") и дедуплицируем
    // ======================================================
    const sourceConfigs = Array.isArray(sourceJson) ? sourceJson : (sourceJson ? [sourceJson] : []);
    const seen = new Set();
    const uniqueServers = []; // { server, name }

    for (const cfg of sourceConfigs) {
      const list = extractServers(cfg);
      for (const s of list) {
        const key = `${s.address}|${s.port}|${s.id}|${s.flow}`;
        if (seen.has(key)) continue;
        seen.add(key);

        const name = COUNTRY_MAP[s.address];
        if (!name) continue; // пропускаем незнакомые адреса (fi, tr и т.п.)

        uniqueServers.push({ server: s, name });
      }
    }

    // ======================================================
    //  СТРОИМ НАШ ЕДИНЫЙ AUTO + ОТДЕЛЬНЫЕ ПРОФИЛИ
    // ======================================================
    const serverOutbounds = [];
    const serverTags = [];
    const perServerConfigs = [];

    for (const { server, name } of uniqueServers) {
      // оригинал
      serverOutbounds.push(buildOutbound(server, name));
      serverTags.push(name);
      perServerConfigs.push(buildConfig(server, name));

      // дубликат с другим флагом
      const dupTag = DUPLICATES[name];
      if (dupTag) {
        serverOutbounds.push(buildOutbound(server, dupTag));
        serverTags.push(dupTag);
        perServerConfigs.push(buildConfig(server, dupTag));
      }
    }

    // ---- Единый Auto ----
    const autoConfig = {
      remarks: "♻️ Авто-выбор",
      dns: commonDns,
      inbounds: commonInbounds,
      observatory: {
        enableConcurrency: true,
        probeInterval: "15s",
        probeUrl: "http://www.gstatic.com/generate_204",
        subjectSelector: serverTags
      },
      outbounds: [
        ...serverOutbounds,
        { tag: "direct", protocol: "freedom" },
        { tag: "block", protocol: "blackhole" }
      ],
      routing: {
        domainMatcher: "hybrid",
        domainStrategy: "IPIfNonMatch",
        balancers: [{
          tag: "balancer-auto",
          selector: serverTags,
          fallbackTag: "direct",
          strategy: { type: "leastPing", settings: {} }
        }],
        rules: [
          { type: "field", protocol: ["bittorrent"], outboundTag: "block" },
          { domain: ["domain:mtalk.google.com", "domain:push.apple.com", "domain:api.push.apple.com"], outboundTag: "direct", type: "field" },
          { ip: ["17.0.0.0/8"], outboundTag: "direct", type: "field" },
          { type: "field", inboundTag: ["socks", "http"], network: "tcp,udp", balancerTag: "balancer-auto" }
        ]
      }
    };

    // Auto первым, потом все серверы с дубликатами
    const subscription = [autoConfig, ...perServerConfigs];

    const outHeaders = {
      "Content-Type": "application/json; charset=utf-8",
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "no-cache",
      "Profile-Title": "wlvpn",
      "announce": "🏳 wlvpn - стабильный VPN сервис."
    };

    const PASSTHROUGH = [
      "profile-update-interval",
      "profile-web-page-url",
      "support-url",
      "providerid",
      "subscription-userinfo",
      "hide-settings",
      "new-url"
    ];
    for (const name of PASSTHROUGH) {
      const v = rawHeaders[name];
      if (v) {
        const canon = name.split('-').map(s => s[0].toUpperCase() + s.slice(1)).join('-');
        outHeaders[canon] = v;
      }
    }

    return new Response(JSON.stringify(subscription), { headers: outHeaders });
  }
};