export default {
  async fetch(request, env, ctx) {
    // ---- ИСХОДНЫЕ ДАННЫЕ УЗЛОВ (8 ГРУПП) ----
    const realNodes = [ /* ... ваш массив из 8 объектов с полями remarks, id, publicKey, shortId, servers, balancer ... */ ];

    // ---- РАЗВОРАЧИВАЕМ ГРУППЫ В ПЛОСКИЙ МАССИВ СЕРВЕРОВ ----
    const flatNodes = [];
    for (const group of realNodes) {
      for (const server of group.servers) {
        flatNodes.push({
          ...server,                 // address, port, serverName, network, flow, fingerprint, serviceName, mode и т.д.
          id: group.id,              // общее для группы
          publicKey: group.publicKey,
          shortId: group.shortId,
          remarks: group.remarks     // добавляем название группы
        });
      }
    }

    // ---- ФУНКЦИЯ ПОСТРОЕНИЯ ПОЛНОГО КОНФИГА ДЛЯ ОДНОГО СЕРВЕРА ----
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
            mode: "packet-up",
            path: "/api/v2/feed"
          };
          break;

        case "grpc":
          outbound.streamSettings.security = "tls";
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

      // --- Массив outbounds с добавленным metrics_out ---
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
          tag: "metrics_out",
          protocol: "freedom",
          settings: {}
        }
      ];

      // --- Полный конфиг ---
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
            settings: { userLevel: 8, accounts: [] },
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
        outbounds: outbounds,
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

    // ---- ГЕНЕРИРУЕМ МАССИВ КОНФИГОВ ДЛЯ КАЖДОГО СЕРВЕРА ----
    const configs = flatNodes.map(n => buildConfig(n));

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
