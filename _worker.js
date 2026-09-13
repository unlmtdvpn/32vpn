export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const TRAFFIC_SOURCE_URL = "https://sub.datanode-internal.net/McjAzVPB2VRYcM6z";
    const FAKE_UA = 'INCY/3.6.5/android';

    let sourceStatus = 0;
    let rawHeaders = {};
    let decodedBody = "";

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

      try {
        const trimmed = body.trim();
        const padded = trimmed + "=".repeat((4 - trimmed.length % 4) % 4);
        const binary = atob(padded);
        const bytes = Uint8Array.from(binary, c => c.charCodeAt(0));
        decodedBody = new TextDecoder("utf-8").decode(bytes);
      } catch (e) {
        decodedBody = body;
      }
    } catch (e) {
      decodedBody = "FETCH ERROR: " + e.message;
    }

    if (url.pathname === "/debug" || url.searchParams.get("debug") === "1") {
      return new Response(JSON.stringify({
        sourceStatus,
        rawHeaders,
        decodedBodyPreview: decodedBody.slice(0, 1500)
      }, null, 2), {
        headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-cache" }
      });
    }

    // ---- Парсим vless ----
    let lines = decodedBody.split('\n').filter(l => l.trim().startsWith('vless://'));

    // Убираем Финляндию и Турцию
    lines = lines.filter(line =>
      !line.includes('fi.datanode-internal.net') &&
      !line.includes('tr.datanode-internal.net')
    );

    // Мобильной — французский флаг
    lines = lines.map(line => {
      if (line.includes('hole-nn.datanode-internal.net')) {
        const base = line.split('#')[0];
        return base + '#' + encodeURIComponent('🇫🇷 Мобильная связь #1');
      }
      return line;
    });

    // ---- Разбираем в outbound-объекты ----
    function lineToOutbound(line, overrideTag) {
      try {
        const u = new URL(line);
        const params = u.searchParams;
        const tag = overrideTag || decodeURIComponent(u.hash.replace(/^#/, ''));
        const isGrpc = params.get('type') === 'grpc';

        const out = {
          tag: tag,
          protocol: "vless",
          settings: {
            vnext: [{
              address: u.hostname,
              port: parseInt(u.port, 10),
              users: [{
                id: u.username,
                encryption: "none",
                flow: params.get('flow') || ""
              }]
            }]
          },
          streamSettings: {
            network: isGrpc ? "grpc" : "tcp",
            security: "reality",
            realitySettings: {
              serverName: params.get('sni') || "",
              publicKey: params.get('pbk') || "",
              shortId: params.get('sid') || "",
              fingerprint: params.get('fp') || "chrome"
            }
          }
        };

        if (isGrpc) {
          out.streamSettings.grpcSettings = {
            serviceName: params.get('serviceName') || "",
            mode: params.get('mode') || "gun"
          };
        } else {
          out.streamSettings.tcpSettings = {};
        }

        return out;
      } catch (e) {
        return null;
      }
    }

    // ---- Строим список: WiFi × 2 копии, Мобильная × 2 копии (разные флаги) ----
    const serverOutbounds = [];
    const serverTags = [];

    const wifiDuplicates = {
      "🇩🇪 Германия":     ["🇩🇪 Германия #1",     "🇩🇪 Германия #2"],
      "🇸🇪 Швеция":       ["🇸🇪 Швеция #1",       "🇸🇪 Швеция #2"],
      "🇵🇱 Польша":       ["🇵🇱 Польша #1",       "🇵🇱 Польша #2"],
      "🇷🇺 Россия":       ["🇷🇺 Россия #1",       "🇷🇺 Россия #2"],
    };

    // Мобильная — 2 копии с разными флагами
    const mobileDuplicates = ["🇫🇷 Мобильная связь #1", "🇧🇾 Мобильная связь #2"];

    for (const line of lines) {
      const rawTag = decodeURIComponent((line.split('#')[1] || '').replace(/^#/, ''));

      // Мобильная?
      if (line.includes('hole-nn.datanode-internal.net')) {
        for (const newTag of mobileDuplicates) {
          const out = lineToOutbound(line, newTag);
          if (out) { serverOutbounds.push(out); serverTags.push(newTag); }
        }
        continue;
      }

      // WiFi-серверы
      const copies = wifiDuplicates[rawTag];
      if (copies) {
        for (const newTag of copies) {
          const out = lineToOutbound(line, newTag);
          if (out) { serverOutbounds.push(out); serverTags.push(newTag); }
        }
      } else {
        // Если тег не из известного списка — оставляем как есть
        const out = lineToOutbound(line);
        if (out) { serverOutbounds.push(out); serverTags.push(out.tag); }
      }
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

    // ---- Конфиг Auto ----
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

    // ---- Конфиги по серверам ----
    const perServerConfigs = serverOutbounds.map(server => ({
      remarks: server.tag,
      dns: commonDns,
      inbounds: commonInbounds,
      outbounds: [
        server,
        { tag: "direct", protocol: "freedom" },
        { tag: "block", protocol: "blackhole" }
      ],
      routing: {
        domainMatcher: "hybrid",
        domainStrategy: "IPIfNonMatch",
        rules: [
          { type: "field", protocol: ["bittorrent"], outboundTag: "block" },
          { type: "field", inboundTag: ["socks", "http"], network: "tcp,udp", outboundTag: server.tag }
        ]
      }
    }));

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