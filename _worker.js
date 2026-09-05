export default {
  async fetch(request, env, ctx) {
    // ---- ИСХОДНЫЕ ДАННЫЕ УЗЛОВ (7 ШТУК) ----
    const realNodes = [
  {
    "remarks": "🇩🇪 Германия",
    "id": "31dac09f-78ee-49ca-9566-d20aea578fdc",
    "publicKey": "r6lN34m1nN-xQZ458j5NPD5xJ3_QBF2bGzY4KJEo4ic",
    "shortId": "abbcd128",
    "servers": [
      {
        "tag": "tl-10-1-mmun7m626es",
        "address": "de-new.datanode-internal.net",
        "port": 443,
        "serverName": "openwrt.lan",
        "network": "tcp",
        "flow": "xtls-rprx-vision",
        "fingerprint": "qq"
      },
      {
        "tag": "tl-10-2-jaev4f0ivl",
        "address": "res.datanode-internal.net",
        "port": 443,
        "serverName": "ads.x5.ru",
        "network": "tcp",
        "flow": "xtls-rprx-vision",
        "fingerprint": "qq"
      }
    ],
    "balancer": {
      "tag": "bal_10",
      "selector": ["tl-10-1-mmun7m626es"],
      "fallbackTag": "tl-10-2-jaev4f0ivl",
      "strategy": {
        "type": "leastLoad",
        "settings": {
          "baselines": ["4s"],
          "costs": [
            { "match": "tl-10-1-mmun7m626es", "regexp": false, "value": 1 },
            { "match": "tl-10-2-jaev4f0ivl", "regexp": false, "value": 1000000 }
          ],
          "expected": 1,
          "maxRTT": "6s"
        }
      }
    }
  },
  {
    "remarks": "LTE АВТО",
    "id": "31dac09f-78ee-49ca-9566-d20aea578fdc",
    "publicKey": "r6lN34m1nN-xQZ458j5NPD5xJ3_QBF2bGzY4KJEo4ic",
    "shortId": "abbcd128",
    "servers": [
      {
        "tag": "tl-8-1-3993jb7obnk",
        "address": "res.datanode-internal.net",
        "port": 443,
        "serverName": "ads.x5.ru",
        "network": "tcp",
        "flow": "xtls-rprx-vision",
        "fingerprint": "qq"
      },
      {
        "tag": "tl-8-2-j0sn29k3pss",
        "address": "hole-nn.datanode-internal.net",
        "port": 443,
        "serverName": "ads.x5.ru",
        "network": "grpc",
        "flow": "",
        "fingerprint": "qq",
        "serviceName": "ads.x5.ru",
        "mode": false
      },
      {
        "tag": "tl-8-3-qtoghahk09g",
        "address": "de-new.datanode-internal.net",
        "port": 443,
        "serverName": "openwrt.lan",
        "network": "tcp",
        "flow": "xtls-rprx-vision",
        "fingerprint": "qq"
      }
    ],
    "balancer": {
      "tag": "bal_8",
      "selector": ["tl-8-1-3993jb7obnk", "tl-8-3-qtoghahk09g"],
      "fallbackTag": "tl-8-2-j0sn29k3pss",
      "strategy": {
        "type": "leastLoad",
        "settings": {
          "baselines": ["4s"],
          "costs": [
            { "match": "tl-8-1-3993jb7obnk", "regexp": false, "value": 10000 },
            { "match": "tl-8-2-j0sn29k3pss", "regexp": false, "value": 20000000 },
            { "match": "tl-8-3-qtoghahk09g", "regexp": false, "value": 1 }
          ],
          "expected": 1,
          "maxRTT": "6s"
        }
      }
    }
  },
  {
    "remarks": "🇸🇪 Швеция",
    "id": "31dac09f-78ee-49ca-9566-d20aea578fdc",
    "publicKey": "r6lN34m1nN-xQZ458j5NPD5xJ3_QBF2bGzY4KJEo4ic",
    "shortId": "abbcd128",
    "servers": [
      {
        "tag": "tl-12-1-rk2dnp28jdk",
        "address": "res.datanode-internal.net",
        "port": 443,
        "serverName": "ads.x5.ru",
        "network": "tcp",
        "flow": "xtls-rprx-vision",
        "fingerprint": "qq"
      },
      {
        "tag": "tl-12-2-24lalbb784c",
        "address": "se-new.datanode-internal.net",
        "port": 443,
        "serverName": "openwrt.lan",
        "network": "tcp",
        "flow": "xtls-rprx-vision",
        "fingerprint": "qq"
      }
    ],
    "balancer": {
      "tag": "bal_12",
      "selector": ["tl-12-2-24lalbb784c"],
      "fallbackTag": "tl-12-1-rk2dnp28jdk",
      "strategy": {
        "type": "leastLoad",
        "settings": {
          "baselines": ["4s"],
          "costs": [
            { "match": "tl-12-1-rk2dnp28jdk", "regexp": false, "value": 1000000 },
            { "match": "tl-12-2-24lalbb784c", "regexp": false, "value": 1 }
          ],
          "expected": 1,
          "maxRTT": "6s"
        }
      }
    }
  },
  {
    "remarks": "🇵🇱 Польша",
    "id": "31dac09f-78ee-49ca-9566-d20aea578fdc",
    "publicKey": "r6lN34m1nN-xQZ458j5NPD5xJ3_QBF2bGzY4KJEo4ic",
    "shortId": "abbcd128",
    "servers": [
      {
        "tag": "proxy",
        "address": "pl.datanode-internal.net",
        "port": 443,
        "serverName": "openwrt.lan",
        "network": "tcp",
        "flow": "xtls-rprx-vision",
        "fingerprint": "qq"
      }
    ]
  },
  {
    "remarks": "🇫🇮 Финляндия",
    "id": "31dac09f-78ee-49ca-9566-d20aea578fdc",
    "publicKey": "r6lN34m1nN-xQZ458j5NPD5xJ3_QBF2bGzY4KJEo4ic",
    "shortId": "abbcd128",
    "servers": [
      {
        "tag": "proxy",
        "address": "fi.datanode-internal.net",
        "port": 443,
        "serverName": "openwrt.lan",
        "network": "tcp",
        "flow": "xtls-rprx-vision",
        "fingerprint": "qq"
      }
    ]
  },
  {
    "remarks": "🇷🇺 Россия",
    "id": "31dac09f-78ee-49ca-9566-d20aea578fdc",
    "publicKey": "r6lN34m1nN-xQZ458j5NPD5xJ3_QBF2bGzY4KJEo4ic",
    "shortId": "abbcd128",
    "servers": [
      {
        "tag": "proxy",
        "address": "ru.datanode-internal.net",
        "port": 443,
        "serverName": "openwrt.lan",
        "network": "tcp",
        "flow": "xtls-rprx-vision",
        "fingerprint": "qq"
      }
    ]
  },
  {
    "remarks": "🇹🇷 Турция",
    "id": "31dac09f-78ee-49ca-9566-d20aea578fdc",
    "publicKey": "r6lN34m1nN-xQZ458j5NPD5xJ3_QBF2bGzY4KJEo4ic",
    "shortId": "abbcd128",
    "servers": [
      {
        "tag": "proxy",
        "address": "tr.datanode-internal.net",
        "port": 443,
        "serverName": "sun9-38.userapi.com",
        "network": "tcp",
        "flow": "xtls-rprx-vision",
        "fingerprint": ""
      }
    ]
  },
  {
    "remarks": "🇩🇪 Мобильная связь #1",
    "id": "31dac09f-78ee-49ca-9566-d20aea578fdc",
    "publicKey": "r6lN34m1nN-xQZ458j5NPD5xJ3_QBF2bGzY4KJEo4ic",
    "shortId": "abbcd128",
    "servers": [
      {
        "tag": "tl-13-1-p7lfh5gqob4",
        "address": "res.datanode-internal.net",
        "port": 443,
        "serverName": "ads.x5.ru",
        "network": "tcp",
        "flow": "xtls-rprx-vision",
        "fingerprint": "qq"
      },
      {
        "tag": "tl-13-2-d3qvnhsk0fs",
        "address": "de-new.datanode-internal.net",
        "port": 443,
        "serverName": "openwrt.lan",
        "network": "tcp",
        "flow": "xtls-rprx-vision",
        "fingerprint": "qq"
      },
      {
        "tag": "tl-13-3-64krq83drn4",
        "address": "hole-nn.datanode-internal.net",
        "port": 443,
        "serverName": "ads.x5.ru",
        "network": "grpc",
        "flow": "",
        "fingerprint": "qq",
        "serviceName": "ads.x5.ru",
        "mode": false
      }
    ],
    "balancer": {
      "tag": "bal_13",
      "selector": ["tl-13-1-p7lfh5gqob4", "tl-13-2-d3qvnhsk0fs"],
      "fallbackTag": "tl-13-3-64krq83drn4",
      "strategy": {
        "type": "leastLoad",
        "settings": {
          "baselines": ["4s"],
          "costs": [
            { "match": "tl-13-1-p7lfh5gqob4", "regexp": false, "value": 100000 },
            { "match": "tl-13-2-d3qvnhsk0fs", "regexp": false, "value": 1 },
            { "match": "tl-13-3-64krq83drn4", "regexp": false, "value": 1000000 }
          ],
          "expected": 1,
          "maxRTT": "6s"
        }
      }
    }
  }
]

    // ---- ФУНКЦИЯ ПОСТРОЕНИЯ ПОЛНОГО КОНФИГА ----
function buildConfig(node) {
  const outbound = {
    tag: "proxy",
    protocol: "vless",
    settings: {
      vnext: [{
        address: node.address,
        port: node.port,
        users: [{
          id: node.id,
          encryption: "none",
          level: 8,
          security: "auto"
        }]
      }]
    },
    streamSettings: {
      network: node.network
    },
    mux: {
      enabled: false,
      concurrency: -1,
      xudpConcurrency: 8,
      xudpProxyUDP443: ""
    }
  };

  if (node.flow) {
    outbound.settings.vnext[0].users[0].flow = node.flow;
  }

  // --- Настройка streamSettings в зависимости от network ---
  switch (node.network) {
    case "xhttp":
      outbound.streamSettings.security = "tls";
      outbound.streamSettings.tlsSettings = {
        alpn: ["h2", "http/1.1"],
        fingerprint: node.fingerprint || "firefox",
        serverName: node.serverName
      };
      outbound.streamSettings.xhttpSettings = {
        host: node.serverName,
        mode: "packet-up",       // можно параметризовать
        path: "/api/v2/feed"      // можно параметризовать
      };
      break;

    case "grpc":
      outbound.streamSettings.security = "tls"; // или "reality", если точно нужно
      outbound.streamSettings.tlsSettings = {
        fingerprint: node.fingerprint || "firefox",
        serverName: node.serverName
      };
      outbound.streamSettings.grpcSettings = {
        serviceName: node.serviceName || "",
        multiMode: false,
        idle_timeout: 60,
        health_check_timeout: 20,
        permit_without_stream: false,
        initial_windows_size: 0,
        authority: ""
      };
      break;

    default: // "tcp" и другие
      outbound.streamSettings.security = "reality";
      outbound.streamSettings.realitySettings = {
        serverName: node.serverName,
        show: false,
        publicKey: node.publicKey,
        shortId: node.shortId,
        fingerprint: node.fingerprint || "chrome",
        spiderX: "/",
        allowInsecure: false
      };
      outbound.streamSettings.tcpSettings = {
        header: { type: "none" }
      };
  }

  // --- Добавляем недостающий outbound metrics_out ---
  const outbounds = [
    outbound,
    {
      tag: "direct",
      protocol: "freedom",
      settings: { domainStrategy: "UseIP" }
    },
    {
      tag: "block",
      protocol: "blackhole",
      settings: { response: { type: "http" } }
    },
    {
      tag: "metrics_out",          // добавлен!
      protocol: "freedom",
      settings: {}
    }
  ];

  // --- Полный конфиг (inbounds, routing и т.д.) ---
  return {
    log: { loglevel: "warning" },
    dns: {
      hosts: { "domain:googleapis.cn": "googleapis.com" },
      queryStrategy: "UseIPv4",
      servers: [
        "1.1.1.1",
        { address: "1.1.1.1", port: 53, domains: [] },
        { address: "8.8.8.8", port: 53, domains: [] }
      ]
    },
    inbounds: [
      {
        tag: "socks",
        port: 10808,
        listen: "127.0.0.1",
        protocol: "socks",
        settings: { auth: "noauth", udp: true, userLevel: 8 },
        sniffing: { enabled: true, destOverride: ["http", "tls", "quic"] }
      },
      {
        tag: "http",
        port: 10809,
        listen: "127.0.0.1",
        protocol: "http",
        settings: { userLevel: 8, accounts: [] }, // ← добавил accounts
        sniffing: { enabled: true, destOverride: ["http", "tls", "quic"] }
      },
      {
        tag: "metrics_in",
        port: 11111,
        listen: "127.0.0.1",
        protocol: "dokodemo-door",
        settings: { address: "127.0.0.1" }
      }
    ],
    outbounds: outbounds, // ← используем массив с metrics_out
    routing: {
      domainStrategy: "IPIfNonMatch",
      rules: [
        { inboundTag: ["metrics_in"], outboundTag: "metrics_out" },
        { inboundTag: ["socks"], outboundTag: "proxy", port: "53" },
        { ip: ["1.1.1.1"], outboundTag: "proxy", port: "53" },
        { ip: ["8.8.8.8"], outboundTag: "direct", port: "53" }
      ]
    },
    policy: {
      levels: {
        "0": { statsUserDownlink: true, statsUserUplink: true },
        "8": { connIdle: 300, downlinkOnly: 1, handshake: 4, uplinkOnly: 1 }
      },
      system: {
        statsInboundDownlink: true,
        statsInboundUplink: true,
        statsOutboundDownlink: true,
        statsOutboundUplink: true
      }
    },
    metrics: { tag: "metrics_out" },
    stats: {},
    remarks: node.remarks,
    meta: null
  };
}
    // ---- ГЕНЕРИРУЕМ МАССИВ КОНФИГОВ ----
    const configs = realNodes.map(n => buildConfig(n));

    // ---- ОТВЕТ С ЗАГОЛОВКАМИ ПОДПИСКИ ----
    return new Response(JSON.stringify(configs, null, 2), {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Access-Control-Allow-Origin": "*",
        "Profile-Title": "wlvpn ",
        "Subscription-Status": "active",
        "Subscription-Traffic": "2141 GB / ∞",
        "Subscription-Expire": "1899589200",
        "subscription-userinfo": "upload=0; download=0; total=0; expire=1899589200",
        "announce": "🏳️ wlvpn - свободный интернет."
      }
    });
  }
};
