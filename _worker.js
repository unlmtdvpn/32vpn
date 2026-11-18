export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (url.pathname !== '/sub') {
      return new Response('Not Found', { status: 404 });
    }

    // Стандартные инбаунды для одиночных нод
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

    // Функция для сборки отдельной ноды из VLESS-параметров
    function makeNode(remarks, address, port, uuid, flow, sniper, pubKey, shortId) {
      return {
        "remarks": remarks,
        "log": { "loglevel": "warning" },
        "inbounds": defaultInbounds,
        "outbounds": [
          {
            "tag": "proxy",
            "protocol": "vless",
            "settings": {
              "vnext": [
                {
                  "address": address,
                  "port": port,
                  "users": [
                    {
                      "id": uuid,
                      "encryption": "none",
                      ...(flow ? { "flow": flow } : {})
                    }
                  ]
                }
              ]
            },
            "streamSettings": {
              "network": "tcp",
              "security": "reality",
              "realitySettings": {
                "fingerprint": "firefox",
                "serverName": sniper,
                "publicKey": pubKey,
                "shortId": shortId,
                "spiderX": "/"
              }
            }
          },
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

    // 1. Твои исходные одиночные ноды с правильными названиями и флагами
    const nodes = [
      makeNode("🇩🇪 Германия", "217.60.80.39", 2083, "b8a0974b-7d22-4636-99c8-6d7b277ef2e2", "xtls-rprx-vision", "static.elbfiles.com", "mSKSj1Vh2gP46y7a7XgCa7pghof57XgaczmvdS7G3B0", "dee7296368479ee0"),
      makeNode("🇳🇱 Нидерланды", "217.60.82.35", 2083, "b8a0974b-7d22-4636-99c8-6d7b277ef2e2", "xtls-rprx-vision", "assets.grachtenhub.com", "vLtYoU12dFEcX2XeufESX-a4dRIPDD8I9HKkd4FtC0s", "c83312388adc77b5"),
      makeNode("🇺🇸 США", "191.217.243.101", 8443, "b8a0974b-7d22-1b59-99c8-6d7b277ef2e2", "xtls-rprx-vision", "www.farlinehub.com", "QfEH-lQ71mDj47vu3axYma_GfoJjogiZ3EWzZu2U0V8", "d994c2f49fdd1168"),
      makeNode("🇬🇧 Великобритания", "191.217.243.101", 8443, "b8a0974b-7d22-1b5d-99c8-6d7b277ef2e2", "xtls-rprx-vision", "www.farlinehub.com", "QfEH-lQ71mDj47vu3axYma_GfoJjogiZ3EWzZu2U0V8", "d994c2f49fdd1168"),
      makeNode("🇸🇪 Швеция", "31.56.16.89", 2083, "b8a0974b-7d22-4636-99c8-6d7b277ef2e2", "xtls-rprx-vision", "taunusfiles.com", "rk4ArdGU9zYrwrJntFGoZptT0Rc333S5BRO2fDjremo", "92132169ef33d72c")
    ];

    // 2. Твой JSON-балансировщик со всеми его outbounds
    const balancerConfig = {
      "remarks": "🇪🇺 Белый список (Балансировщик)",
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
        {
          "tag": "whitelist-1",
          "protocol": "vless",
          "settings": { "vnext": [{ "address": "217.60.80.39", "port": 2083, "users": [{ "id": "b8a0974b-7d22-4636-99c8-6d7b277ef2e2", "encryption": "none", "flow": "xtls-rprx-vision" }] }] },
          "streamSettings": { "network": "tcp", "security": "reality", "realitySettings": { "fingerprint": "firefox", "serverName": "static.elbfiles.com", "publicKey": "mSKSj1Vh2gP46y7a7XgCa7pghof57XgaczmvdS7G3B0", "shortId": "dee7296368479ee0", "spiderX": "/" } }
        },
        {
          "tag": "whitelist-2",
          "protocol": "vless",
          "settings": { "vnext": [{ "address": "217.60.82.35", "port": 2083, "users": [{ "id": "b8a0974b-7d22-4636-99c8-6d7b277ef2e2", "encryption": "none", "flow": "xtls-rprx-vision" }] }] },
          "streamSettings": { "network": "tcp", "security": "reality", "realitySettings": { "fingerprint": "firefox", "serverName": "assets.grachtenhub.com", "publicKey": "vLtYoU12dFEcX2XeufESX-a4dRIPDD8I9HKkd4FtC0s", "shortId": "c83312388adc77b5", "spiderX": "/" } }
        },
        {
          "tag": "whitelist-3",
          "protocol": "vless",
          "settings": { "vnext": [{ "address": "191.217.243.101", "port": 8443, "users": [{ "id": "b8a0974b-7d22-1b59-99c8-6d7b277ef2e2", "encryption": "none", "flow": "xtls-rprx-vision" }] }] },
          "streamSettings": { "network": "tcp", "security": "reality", "realitySettings": { "fingerprint": "firefox", "serverName": "www.farlinehub.com", "publicKey": "QfEH-lQ71mDj47vu3axYma_GfoJjogiZ3EWzZu2U0V8", "shortId": "d994c2f49fdd1168", "spiderX": "/" } }
        },
        {
          "tag": "whitelist-4",
          "protocol": "vless",
          "settings": { "vnext": [{ "address": "191.217.243.101", "port": 8443, "users": [{ "id": "b8a0974b-7d22-1b5d-99c8-6d7b277ef2e2", "encryption": "none", "flow": "xtls-rprx-vision" }] }] },
          "streamSettings": { "network": "tcp", "security": "reality", "realitySettings": { "fingerprint": "firefox", "serverName": "www.farlinehub.com", "publicKey": "QfEH-lQ71mDj47vu3axYma_GfoJjogiZ3EWzZu2U0V8", "shortId": "d994c2f49fdd1168", "spiderX": "/" } }
        },
        {
          "tag": "whitelist-5",
          "protocol": "vless",
          "settings": { "vnext": [{ "address": "31.56.16.89", "port": 2083, "users": [{ "id": "b8a0974b-7d22-4636-99c8-6d7b277ef2e2", "encryption": "none", "flow": "xtls-rprx-vision" }] }] },
          "streamSettings": { "network": "tcp", "security": "reality", "realitySettings": { "fingerprint": "firefox", "serverName": "taunusfiles.com", "publicKey": "rk4ArdGU9zYrwrJntFGoZptT0Rc333S5BRO2fDjremo", "shortId": "92132169ef33d72c", "spiderX": "/" } }
        },
        { "tag": "direct", "protocol": "freedom", "settings": {} },
        { "tag": "block", "protocol": "blackhole", "settings": {} }
      ]
    };

    // 3. Отдаем всё единым массивом: 5 отдельных нод + балансировщик
    const responseData = [
      ...nodes,
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