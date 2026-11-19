// ============================================================
// WLVPN — Static JSON Sub + Userinfo from Source
// ============================================================

// ВСТАВЛЯЙ ССЫЛКИ СЮДА:
const VLESS_LINKS = [
  "vless://4aada363-d023-4477-8639-6cdb77c0cad2@6b83b0x.fi8.h1clayd.click:443?encryption=none&pbk=X91DOditRACMv59RWubXujk3CgDjaoZ-XXIPWcBcA0w&sid=a343ae230b063834&security=reality&sni=6b83b0x.fi8.h1clayd.click&fp=firefox&type=xhttp&path=%2F6800998ad1f5&mode=auto#%F0%9F%87%AB%F0%9F%87%AE%20%D0%A4%D0%B8%D0%BD%D0%BB%D1%8F%D0%BD%D0%B4%D0%B8%D1%8F",
  "vless://b8a0974b-7d22-4636-99c8-6d7b277ef2e2@217.60.82.35:2083?flow=xtls-rprx-vision&type=tcp&security=reality&fp=firefox&sni=assets.grachtenhub.com&pbk=vLtYoU12dFEcX2XeufESX-a4dRIPDD8I9HKkd4FtC0s&sid=c83312388adc77b5#%F0%9F%87%B3%F0%9F%87%B1+%D0%9D%D0%B8%D0%B4%D0%B5%D1%80%D0%BB%D0%B0%D0%BD%D0%B4%D1%8B",
  "vless://b8a0974b-7d22-1b59-99c8-6d7b277ef2e2@191.217.243.101:8443?flow=xtls-rprx-vision&type=tcp&security=reality&fp=firefox&sni=www.farlinehub.com&pbk=QfEH-lQ71mDj47vu3axYma_GfoJjogiZ3EWzZu2U0V8&sid=d994c2f49fdd1168#%F0%9F%87%BA%F0%9F%87%B8+%D0%A1%D0%A8%D0%90",
  "vless://b8a0974b-7d22-1b5d-99c8-6d7b277ef2e2@191.217.243.101:8443?flow=xtls-rprx-vision&type=tcp&security=reality&fp=firefox&sni=www.farlinehub.com&pbk=QfEH-lQ71mDj47vu3axYma_GfoJjogiZ3EWzZu2U0V8&sid=d994c2f49fdd1168#%F0%9F%87%AC%F0%9F%87%A7+%D0%92%D0%B5%D0%BB%D0%B8%D0%BA%D0%BE%D0%B1%D1%80%D0%B8%D1%82%D0%B0%D0%BD%D0%B8%D1%8F",
  "vless://b8a0974b-7d22-4636-99c8-6d7b277ef2e2@31.56.16.89:2083?flow=xtls-rprx-vision&type=tcp&security=reality&fp=firefox&sni=taunusfiles.com&pbk=rk4ArdGU9zYrwrJntFGoZptT0Rc333S5BRO2fDjremo&sid=92132169ef33d72c#%F0%9F%87%B8%F0%9F%87%AA+%D0%A8%D0%B2%D0%B5%D1%86%D0%B8%D1%8F"
];

// ТВОЙ КАСТОМНЫЙ JSON-СЕРВЕР
const CUSTOM_JSON_SERVER = {
  "remarks": "🇪🇺 Белый список",
  "log": { "loglevel": "warning" },
  "inbounds": [
    { "tag": "socks-in", "port": 10808, "listen": "127.0.0.1", "protocol": "socks", "settings": { "auth": "noauth", "udp": true }, "sniffing": { "enabled": true, "destOverride": ["http", "tls", "quic"] } },
    { "tag": "http-in", "port": 10809, "listen": "127.0.0.1", "protocol": "http", "settings": {}, "sniffing": { "enabled": true, "destOverride": ["http", "tls", "quic"] } }
  ],
  "observatory": { "subjectSelector": ["whitelist-"], "probeURL": "https://www.gstatic.com/generate_204", "probeInterval": "1m", "enableConcurrency": true },
  "routing": {
    "domainStrategy": "AsIs",
    "balancers": [{ "tag": "balancer-whitelist", "selector": ["whitelist-"], "strategy": { "type": "leastPing" } }],
    "rules": [
      { "type": "field", "ip": ["geoip:private"], "outboundTag": "direct" },
      { "type": "field", "network": "tcp,udp", "balancerTag": "balancer-whitelist" }
    ]
  },
  "outbounds": [
    { "tag": "whitelist-1", "protocol": "vless", "settings": { "vnext": [{ "address": "178.248.236.236", "port": 443, "users": [{ "id": "b8a0974b-7d22-4636-99c8-6d7b277ef2e2", "encryption": "none" }] }] }, "streamSettings": { "network": "tcp", "security": "reality", "realitySettings": { "fingerprint": "firefox", "serverName": "dune.4ch.pro", "publicKey": "VSPUhEWTrbOypXn-YmjkdMqgtUrNeE5tCUOIo2lftCw", "shortId": "5324abeeeefc38d4", "spiderX": "/" } } },
    { "tag": "whitelist-2", "protocol": "vless", "settings": { "vnext": [{ "address": "194.55.239.251", "port": 8443, "users": [{ "id": "b8a0974b-7d22-4636-99c8-6d7b277ef2e2", "encryption": "none" }] }] }, "streamSettings": { "network": "grpc", "security": "reality", "realitySettings": { "fingerprint": "qq", "serverName": "wl16.4ch.pro", "publicKey": "h2vIM44s19FA-k0no8itsUoHRePcpbOg8cn5Mz7tqxw", "shortId": "6fefe0d395a8d22a", "spiderX": "/" }, "grpcSettings": { "serviceName": "x5.lk.v1.AccountService" } } },
    { "tag": "whitelist-3", "protocol": "vless", "settings": { "vnext": [{ "address": "194.55.239.109", "port": 443, "users": [{ "id": "b8a0974b-7d22-f243-99c8-6d7b277ef2e2", "encryption": "none" }] }] }, "streamSettings": { "network": "grpc", "security": "reality", "realitySettings": { "fingerprint": "firefox", "serverName": "cloud.4ch.pro", "publicKey": "zpG3tgdseNoxANrk4Ec0TLRrnJ_8KU2DVu1a3hqDeyg", "shortId": "3b78ffb4514cfc4b", "spiderX": "/" }, "grpcSettings": { "serviceName": "x5.lk.v1.AccountService" } } },
    { "tag": "whitelist-4", "protocol": "vless", "settings": { "vnext": [{ "address": "46.243.233.19", "port": 2096, "users": [{ "id": "b8a0974b-7d22-1bbe-99c8-6d7b277ef2e2", "encryption": "none", "flow": "xtls-rprx-vision" }] }] }, "streamSettings": { "network": "tcp", "security": "reality", "realitySettings": { "fingerprint": "firefox", "serverName": "inkwell.4ch.pro", "publicKey": "DggZ5FLY91EcoGTdw_3kssW6V424nnacm2ZN1UDi5So", "shortId": "cac9c3372b2051ef", "spiderX": "/" } } },
    { "tag": "whitelist-5", "protocol": "vless", "settings": { "vnext": [{ "address": "assets57.mega-play.app", "port": 443, "users": [{ "id": "b8a0974b-7d22-4636-99c8-6d7b277ef2e2", "encryption": "none", "flow": "xtls-rprx-vision" }] }] }, "streamSettings": { "network": "tcp", "security": "reality", "realitySettings": { "fingerprint": "firefox", "serverName": "assets57.mega-play.app", "publicKey": "6RW54R1rJu0oqvh_Ag5WAYYnyDiclypogyU79nCBMUo", "shortId": "eef4ec246e2defa8", "spiderX": "/" } } },
    { "tag": "whitelist-6", "protocol": "vless", "settings": { "vnext": [{ "address": "185.178.208.167", "port": 443, "users": [{ "id": "b8a0974b-7d22-4636-99c8-6d7b277ef2e2", "encryption": "none" }] }] }, "streamSettings": { "network": "ws", "security": "tls", "tlsSettings": { "serverName": "upload.4ch.pro", "fingerprint": "firefox", "alpn": ["http/1.1"] }, "wsSettings": { "path": "/v1/sync/16a0156e37cf5cb781a41f10", "headers": { "Host": "upload.4ch.pro" } } } },
    { "tag": "whitelist-7", "protocol": "vless", "settings": { "vnext": [{ "address": "188.225.47.178", "port": 443, "users": [{ "id": "b8a0974b-7d22-4636-99c8-6d7b277ef2e2", "encryption": "none", "flow": "xtls-rprx-vision" }] }] }, "streamSettings": { "network": "tcp", "security": "reality", "realitySettings": { "fingerprint": "firefox", "serverName": "wl26.4ch.pro", "publicKey": "LpDKpTXSH5wZAfkSYoINlFAYzGI2AiEfdpFbiUAekQo", "shortId": "439a6bd97870c88a", "spiderX": "/" } } },
    { "tag": "direct", "protocol": "freedom", "settings": {} },
    { "tag": "block", "protocol": "blackhole", "settings": {} }
  ]
};

const SOURCE_URL = "https://subs.tgflow.me/a21BGxU1fug3Bg4C";
const HWID = "1BEF4F22-1340-8D05-2641-3CC6D7CC1B27";

async function fetchWithTimeout(url, options, timeout = 5000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(id);
    return res;
  } catch (e) {
    clearTimeout(id);
    return null;
  }
}

async function fetchUserInfo() {
  const headersList = [
    { "User-Agent": "INCY/3.9.7/android", "Accept": "*/*", "X-Hwid": HWID },
    { "User-Agent": "Happ/1.6.0", "Accept": "*/*", "X-Hwid": HWID }
  ];

  for (const headers of headersList) {
    const res = await fetchWithTimeout(SOURCE_URL, { headers, cf: { cacheTtl: 0 } });
    if (res && res.ok) {
      const ui = res.headers.get("Subscription-Userinfo");
      if (ui) return ui;
    }
  }
  return "upload=0; download=0; total=0; expire=0";
}

function parseVlessToJson(urlStr) {
  try {
    const url = new URL(urlStr);
    const params = url.searchParams;
    
    let remarkName = "⚡ Сервер";
    if (url.hash) remarkName = decodeURIComponent(url.hash.slice(1)).replace(/\+/g, ' ');

    const ob = {
      "tag": "proxy",
      "protocol": "vless",
      "settings": {
        "vnext": [{
          "address": url.hostname,
          "port": parseInt(url.port) || 443,
          "users": [{ "id": url.username, "encryption": "none", "flow": params.get("flow") || "" }]
        }]
      },
      "streamSettings": {
        "network": params.get("type") || "tcp",
        "security": params.get("security") || "reality",
        "realitySettings": {
          "serverName": params.get("sni") || url.hostname,
          "publicKey": params.get("pbk") || "",
          "shortId": params.get("sid") || "",
          "fingerprint": params.get("fp") || "chrome"
        }
      }
    };

    const type = params.get("type") || "tcp";
    if (type === "xhttp") ob.streamSettings.xhttpSettings = { "mode": "auto", "path": params.get("path") || "/" };
    else if (type === "grpc") ob.streamSettings.grpcSettings = { "serviceName": params.get("serviceName") || "", "authority": "", "multiMode": false };

    return {
      "dns": { "servers": ["1.1.1.1", "1.0.0.1"], "queryStrategy": "UseIP" },
      "routing": { "domainStrategy": "AsIs" },
      "inbounds": [{ "tag": "socks", "port": 10808, "listen": "127.0.0.1", "protocol": "socks", "settings": { "udp": true, "auth": "noauth" } }],
      "outbounds": [ob],
      "remarks": remarkName
    };
  } catch (_) {
    return null;
  }
}

export default {
  async fetch(request) {
    const url = new URL(request.url);
    
    if (url.pathname !== "/sub" && url.pathname !== "/sub/") {
      return new Response("Not Found", { status: 404 });
    }

    const userinfoPromise = fetchUserInfo();
    const finalServers = [];

    VLESS_LINKS.forEach((link) => {
      const srv = parseVlessToJson(link);
      if (srv) finalServers.push(srv);
    });

    if (CUSTOM_JSON_SERVER) {
      finalServers.push(CUSTOM_JSON_SERVER);
    }

    const userinfo = await userinfoPromise;

    return new Response(JSON.stringify(finalServers, null, 2), {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Profile-Title": "wlvpn",
        "Profile-Update-Interval": "6",
        "Subscription-Userinfo": userinfo,
        "announce": "wlvpn — бесплатный VPN сервис.",
        "Cache-Control": "no-cache",
        "Access-Control-Allow-Origin": "*"
      }
    });
  }
};