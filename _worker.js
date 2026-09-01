export default {
  async fetch(request, env, ctx) {
    // ---- ИСХОДНЫЕ ДАННЫЕ УЗЛОВ (7 ШТУК) ----
    const realNodes = [
{
  tag: "proxy",
  address: "de-new.datanode-internal.net",
  port: 443,
  id: "31dac09f-78ee-49ca-9566-d20aea578fdc",
  serverName: "ads.x5.ru",
  publicKey: "r6lN34m1nN-xQZ458j5NPD5xJ3_QBF2bGzY4KJEo4ic",
  shortId: "abbcd128",
  fingerprint: "qq",
  remarks: "🇩🇪 Германия",
  network: "tcp",
  flow: "xtls-rprx-vision"
},
{
  tag: "se-1",
  address: "se-new.datanode-internal.net",
  port: 443,
  id: "31dac09f-78ee-49ca-9566-d20aea578fdc",
  serverName: "ads.x5.ru",
  publicKey: "r6lN34m1nN-xQZ458j5NPD5xJ3_QBF2bGzY4KJEo4ic",
  shortId: "abbcd128",
  fingerprint: "qq",
  remarks: "🇸🇪 Швеция",
  network: "tcp",
  flow: "xtls-rprx-vision"
},
{
  tag: "nl",
  address: "31.76.49.57",
  port: 8771,
  id: "0b0de525-4da4-44b4-a068-27583ccfa8e5",
  serverName: "www.booking.com",
  publicKey: "ARdBi_ODGv_zZHyU6dy3V3XQVyqDhMf5C_IIu_VeUlc",
  shortId: "40a3df2b06bc00a4",
  fingerprint: "firefox",
  remarks: "🇳🇱 Нидерланды",
  network: "tcp",
  flow: "xtls-rprx-vision"
},
      {
  tag: "ru-1",
  address: "gw-4d184c.vless.monster",
  port: 8790,
  id: "0b0de525-4da4-44b4-a068-27583ccfa8e5",
  serverName: "gw-4d184c.vless.monster",
  publicKey: "oDiqoKvCLhB5VGctDUsRwEAnuuZE8YBO5PlYBLh3Zw4",
  shortId: "4b498e2075eda029",
  fingerprint: "firefox",
  remarks: "🇷🇺 Россия",
  network: "tcp",
  flow: "xtls-rprx-vision"
},
{
  tag: "gr-1",
  address: "cdn-279d4a.vless.monster",
  port: 443,
  id: "0b0de525-4da4-44b4-a068-27583ccfa8e5",
  serverName: "cdn-279d4a.vless.monster",
  publicKey: "HUw_49W36g87SNkx7BomL8u7WoATpEwxauwlo84t5Bk",
  shortId: "b6344cc2ddb26812",
  fingerprint: "firefox",
  remarks: "🇬🇷 Греция",
  network: "tcp",
  flow: "xtls-rprx-vision"
},
{
  tag: "pl-2",
  address: "edge-f9d842.vless.monster",
  port: 443,
  id: "0b0de525-4da4-44b4-a068-27583ccfa8e5",
  serverName: "edge-f9d842.vless.monster",
  publicKey: "iccA0H08sCFQOgutajVfZJsIkJ37gHLqboO1mZwUzAA",
  shortId: "ccc23e223ba30f0d",
  fingerprint: "firefox",
  remarks: "🇵🇱 Польша",
  network: "tcp",
  flow: "xtls-rprx-vision"
},
{
  tag: "us-1",
  address: "45.91.138.170",
  port: 8765,
  id: "0b0de525-4da4-44b4-a068-27583ccfa8e5",
  serverName: "www.yahoo.com",
  publicKey: "CrAcf2VE4MoZnwgxyWb0iwik1YrG5VC0vPFv1AlxsTQ",
  shortId: "6a7c9d833bd2",
  fingerprint: "firefox",
  remarks: "🇺🇸 США",
  network: "tcp",
  flow: "xtls-rprx-vision"
},

{
  tag: "ru-mobile-1",
  address: "hole-nn.datanode-internal.net",
  port: 443,
  id: "31dac09f-78ee-49ca-9566-d20aea578fdc",
  serverName: "ads.x5.ru",
  publicKey: "r6lN34m1nN-xQZ458j5NPD5xJ3_QBF2bGzY4KJEo4ic",
  shortId: "abbcd128",
  fingerprint: "qq",
  remarks: "🇷🇺 Белый список 🏳️",
  network: "grpc",
  flow: "",               // можно оставить пустым или удалить
  serviceName: "ads.x5.ru", // добавить
  mode: "gun"              // добавить
}
      {
  tag: "de-2",
  address: "friendlynode.site",
  port: 443,
  id: "0b0de525-4da4-44b4-a068-27583ccfa8e5",
  serverName: "friendlynode.site",
  publicKey: "",
  shortId: "",
  fingerprint: "firefox",
  remarks: "de Белый список 🏳️",
  network: "xhttp",
  flow: ""
}
    ];

    // ---- ФУНКЦИЯ ПОСТРОЕНИЯ ПОЛНОГО КОНФИГА ----
    function buildConfig(node) {
      // Базовый outbound
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
          network: node.network,
          security: "reality",
          realitySettings: {
            serverName: node.serverName,
            show: false,
            publicKey: node.publicKey,
            shortId: node.shortId,
            fingerprint: node.fingerprint || "chrome", // если пусто, ставим chrome
            spiderX: "/",
            allowInsecure: false
          }
        },
        mux: {
          enabled: false,
          concurrency: -1,
          xudpConcurrency: 8,
          xudpProxyUDP443: ""
        }
      };

      // Добавляем flow, если есть
      if (node.flow) {
        outbound.settings.vnext[0].users[0].flow = node.flow;
      }

      // Настройки для конкретного network
      if (node.network === "grpc") {
        outbound.streamSettings.grpcSettings = {
          serviceName: node.serviceName || "",
          multiMode: false,
          idle_timeout: 60,
          health_check_timeout: 20,
          permit_without_stream: false,
          initial_windows_size: 0,
          authority: ""
        };
        // Для grpc не добавляем tcpSettings
      } else {
        // TCP
        outbound.streamSettings.tcpSettings = {
          header: { type: "none" }
        };
      }

      // Полный конфиг
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
            settings: { userLevel: 8 },
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
        outbounds: [
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
          }
        ],
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
        meta: null // добавляем для единообразия (как в примере мобильного)
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
