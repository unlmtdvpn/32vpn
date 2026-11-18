export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (url.pathname !== '/sub') {
      return new Response('Not Found', { status: 404 });
    }

    const defaultInbounds = [
      {
        "tag": "socks-in",
        "port": 10808,
        "listen": "127.0.0.1",
        "protocol": "socks",
        "settings": { "auth": "noauth", "udp": true },
        "sniffing": { "enabled": true, "destOverride": ["http", "tls", "quic"] }
      },
      {
        "tag": "http-in",
        "port": 10809,
        "listen": "127.0.0.1",
        "protocol": "http",
        "settings": {},
        "sniffing": { "enabled": true, "destOverride": ["http", "tls", "quic"] }
      }
    ];

    function makeSingleNode(remarks, outboundConfig) {
      return {
        "remarks": remarks,
        "log": { "loglevel": "warning" },
        "inbounds": defaultInbounds,
        "outbounds": [
          { ...outboundConfig, "tag": "proxy" },
          { "tag": "direct", "protocol": "freedom", "settings": {} },
          { "tag": "block", "protocol": "blackhole", "settings": {} }
        ],
        "routing": {
          "domainStrategy": "AsIs",
          "rules": [
            { "type": "field", "ip": ["geoip:private"], "outboundTag": "direct" },
            { "type": "field", "network": "tcp,udp", "outboundTag": "proxy" }
          ]
        }
      };
    }

    // 7 серверов из твоего рабочего JSON
    const s1 = {
      "tag": "whitelist-1",
      "protocol": "vless",
      "settings": { "vnext": [{ "address": "178.248.236.236", "port": 443, "users": [{ "id": "b8a0974b-7d22-4636-99c8-6d7b277ef2e2", "encryption": "none" }] }] },
      "streamSettings": { "network": "tcp", "security": "reality", "realitySettings": { "fingerprint": "firefox", "serverName": "dune.4ch.pro", "publicKey": "VSPUhEWTrbOypXn-YmjkdMqgtUrNeE5tCUOIo2lftCw", "shortId": "5324abeeeefc38d4", "spiderX": "/" } }
    };

    const s2 = {
      "tag": "whitelist-2",
      "protocol": "vless",
      "settings": { "vnext": [{ "address": "194.55.239.251", "port": 8443, "users": [{ "id": "b8a0974b-7d22-4636-99c8-6d7b277ef2e2", "encryption": "none" }] }] },
      "streamSettings": { "network": "grpc", "security": "reality", "realitySettings": { "fingerprint": "qq", "serverName": "wl16.4ch.pro", "publicKey": "h2vIM44s19FA-k0no8itsUoHRePcpbOg8cn5Mz7tqxw", "shortId": "6fefe0d395a8d22a", "spiderX": "/" }, "grpcSettings": { "serviceName": "x5.lk.v1.AccountService" } }
    };

    const s3 = {
      "tag": "whitelist-3",
      "protocol": "vless",
      "settings": { "vnext": [{ "address": "194.55.239.109", "port": 443, "users": [{ "id": "b8a0974b-7d22-f243-99c8-6d7b277ef2e2", "encryption": "none" }] }] },
      "streamSettings": { "network": "grpc", "security": "reality", "realitySettings": { "fingerprint": "firefox", "serverName": "cloud.4ch.pro", "publicKey": "zpG3tgdseNoxANrk4Ec0TLRrnJ_8KU2DVu1a3hqDeyg", "shortId": "3b78ffb4514cfc4b", "spiderX": "/" }, "grpcSettings": { "serviceName": "x5.lk.v1.AccountService" } }
    };

    const s4 = {
      "tag": "whitelist-4",
      "protocol": "vless",
      "settings": { "vnext": [{ "address": "46.243.233.19", "port": 2096, "users": [{ "id": "b8a0974b-7d22-1bbe-99c8-6d7b277ef2e2", "encryption": "none", "flow": "xtls-rprx-vision" }] }] },
      "streamSettings": { "network": "tcp", "security": "reality", "realitySettings": { "fingerprint": "firefox", "serverName": "inkwell.4ch.pro", "publicKey": "DggZ5FLY91EcoGTdw_3kssW6V424nnacm2ZN1UDi5So", "shortId": "cac9c3372b2051ef", "spiderX": "/" } }
    };

    const s5 = {
      "tag": "whitelist-5",
      "protocol": "vless",
      "settings": { "vnext": [{ "address": "assets57.mega-play.app", "port": 443, "users": [{ "id": "b8a0974b-7d22-4636-99c8-6d7b277ef2e2", "encryption": "none", "flow": "xtls-rprx-vision" }] }] },
      "streamSettings": { "network": "tcp", "security": "reality", "realitySettings": { "fingerprint": "firefox", "serverName": "assets57.mega-play.app", "publicKey": "6RW54R1rJu0oqvh_Ag5WAYYnyDiclypogyU79nCBMUo", "shortId": "eef4ec246e2defa8", "spiderX": "/" } }
    };

    const s6 = {
      "tag": "whitelist-6",
      "protocol": "vless",
      "settings": { "vnext": [{ "address": "185.178.208.167", "port": 443, "users": [{ "id": "b8a0974b-7d22-4636-99c8-6d7b277ef2e2", "encryption": "none" }] }] },
      "streamSettings": { "network": "ws", "security": "tls", "tlsSettings": { "serverName": "upload.4ch.pro", "fingerprint": "firefox", "alpn": ["http/1.1"] }, "wsSettings": { "path": "/v1/sync/16a0156e37cf5cb781a41f10", "headers": { "Host": "upload.4ch.pro" } } }
    };

    const s7 = {
      "tag": "whitelist-7",
      "protocol": "vless",
      "settings": { "vnext": [{ "address": "188.225.47.178", "port": 443, "users": [{ "id": "b8a0974b-7d22-4636-99c8-6d7b277ef2e2", "encryption": "none", "flow": "xtls-rprx-vision" }] }] },
      "streamSettings": { "network": "tcp", "security": "reality", "realitySettings": { "fingerprint": "firefox", "serverName": "wl26.4ch.pro", "publicKey": "LpDKpTXSH5wZAfkSYoINlFAYzGI2AiEfdpFbiUAekQo", "shortId": "439a6bd97870c88a", "spiderX": "/" } }
    };

    // Балансировщик с твоим оригинальным названием
    const balancerConfig = {
      "remarks": "🇪🇺 Белый список",
      "log": { "loglevel": "warning" },
      "inbounds": defaultInbounds,
      "observatory": {
        "subjectSelector": ["whitelist-"],
        "probeURL": "https://www.gstatic.com/generate_204",
        "probeInterval": "1m",
        "enableConcurrency": true
      },
      "routing": {
        "domainStrategy": "AsIs",
        "balancers": [
          {
            "tag": "balancer-whitelist",
            "selector": ["whitelist-"],
            "strategy": { "type": "leastPing" }
          }
        ],
        "rules": [
          { "type": "field", "ip": ["geoip:private"], "outboundTag": "direct" },
          { "type": "field", "network": "tcp,udp", "balancerTag": "balancer-whitelist" }
        ]
      },
      "outbounds": [
        s1, s2, s3, s4, s5, s6, s7,
        { "tag": "direct", "protocol": "freedom", "settings": {} },
        { "tag": "block", "protocol": "blackhole", "settings": {} }
      ]
    };

    // Массив: 7 отдельных нод с нормальными названиями + балансировщик
    const responseData = [
      makeSingleNode("🇩🇪 Германия", s1),
      makeSingleNode("🇳🇱 Нидерланды", s2),
      makeSingleNode("🇪🇺 Сервер (gRPC Cloud)", s3),
      makeSingleNode("🇺🇸 США", s4),
      makeSingleNode("🇪🇺 Сервер (Mega-Play)", s5),
      makeSingleNode("🇬🇧 Великобритания", s6),
      makeSingleNode("🇸🇪 Швеция", s7),
      balancerConfig
    ];

    return new Response(JSON.stringify(responseData, null, 2), {
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    });
  },
};