// ============================================================
// WLVPN — Free VPN Service (Cloudflare Worker)
// ============================================================

const HOST_MAP = {
  "e308b5t.fi8.h1clayd.click":  { remarks: "🇫🇮 Финляндия #1",  category: "Нейросети" },
  "52ee46g.fi8.h1clayd.click":  { remarks: "🇫🇮 Финляндия #2",  category: "Нейросети" },
  "6b83b0x.fi8.h1clayd.click":  { remarks: "🇫🇮 Финляндия #3",  category: "Нейросети" },
  "5f9abbt.de21.h1clayd.click": { remarks: "🇩🇪 Германия #1",   category: "Скоростной" },
  "403e8ag.de21.h1clayd.click": { remarks: "🇩🇪 Германия #2",   category: "Скоростной" },
  "e1efc1x.de21.h1clayd.click": { remarks: "🇩🇪 Германия #3",   category: "Скоростной" },
  "defc63t.nl4.h1clayd.click":  { remarks: "🇳🇱 Нидерланды #1", category: "Скоростной" },
  "fca7d7g.nl4.h1clayd.click":  { remarks: "🇳🇱 Нидерланды #2", category: "Скоростной" },
  "b3a336x.nl4.h1clayd.click":  { remarks: "🇳🇱 Нидерланды #3", category: "Нейросети" },
  "e900bbt.es7.h1clayd.click":  { remarks: "🇪🇸 Испания #1",    category: "Нейросети" },
  "c190afg.es7.h1clayd.click":  { remarks: "🇪🇸 Испания #2",    category: "Нейросети" },
  "7c5fbcx.es7.h1clayd.click":  { remarks: "🇪🇸 Испания #3",    category: "Нейросети" },
  "c84a94t.pl6.h1clayd.click":  { remarks: "🇵🇱 Польша #1",     category: "YouTube" },
  "0e6251g.pl6.h1clayd.click":  { remarks: "🇵🇱 Польша #2",     category: "Нейросети" },
  "bd5c13x.pl6.h1clayd.click":  { remarks: "🇵🇱 Польша #3",     category: "Нейросети" }
};

const DEFAULT_CONFIG = {
  mainSourceUrl: "https://newsub.chkav-vpn.space/9zfbEsqma0tkNfc2",
  mobileSourceUrl: "https://sub.chkav-vpn.space/?id=90f7c8dd85644850aa0e629cfb0e877c",
  hwid: "1BEF4F22-1340-8D05-2641-3CC6D7CC1B27",
  profileTitle: "wlvpn",
  profileUpdateInterval: "6",
  announce: "wlvpn — бесплатный VPN сервис.",
  fallbackName: "🛠 Ведутся технические работы",
  fallbackDescription: "WLVPN · Скоро вернёмся",
  balancerName: "🔁 Авто - самый быстрый",
  balancerDescription: "WLVPN · Лучше выбрать его",
  mobileBalancerName: "🇷🇺 📱 Обход глушилок",
  mobileBalancerDescription: "WLVPN · Работает при белых списках",
  hostMap: JSON.parse(JSON.stringify(HOST_MAP)),
  mergeGroups: [],
  adminPassword: "wlvpn-admin"
};

// ============================================================
// UTILS
// ============================================================
function isVpnClient(ua) {
  return /incy|happ|v2ray|clash|sing-box|nekobox|stash|streisand|karing|matsuri|shadowrocket|nekoray|v2rayng|ko*ng/i.test(ua);
}

function isBrowser(ua) {
  if (!ua) return false;
  if (isVpnClient(ua)) return false;
  return /mozilla|chrome|safari|firefox|edg|opera|msie|trident/i.test(ua);
}

function htmlResponse(content, status = 200) {
  return new Response(content, {
    status,
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" }
  });
}

function esc(s) {
  return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
    return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
  });
}

function b64decode(str) {
  try {
    let s = str.replace(/-/g, '+').replace(/_/g, '/');
    while (s.length % 4) s += '=';
    return atob(s);
  } catch (_) { return null; }
}

function normalizeUserinfo(raw) {
  if (!raw) return null;
  const up = (raw.match(/upload=(\d+)/i) || [])[1] || "0";
  const down = (raw.match(/download=(\d+)/i) || [])[1] || "0";
  const total = (raw.match(/total=(\d+)/i) || [])[1] || "0";
  return `upload=${up}; download=${down}; total=${total}; expire=0`;
}

function parseSubscriptionBody(txt) {
  try {
    const arr = JSON.parse(txt);
    if (Array.isArray(arr) && arr.length > 0) return { format: "json", data: arr };
  } catch (_) {}

  const dec1 = b64decode(txt.trim());
  if (dec1) {
    try {
      const arr = JSON.parse(dec1);
      if (Array.isArray(arr) && arr.length > 0) return { format: "json", data: arr };
    } catch (_) {}
    if (/^vless:\/\//m.test(dec1)) return { format: "vless", data: dec1 };
  }

  if (/^vless:\/\//m.test(txt)) return { format: "vless", data: txt };
  return null;
}

function getServerHost(s) {
  if (!s || !s.outbounds) return null;
  const proxy = s.outbounds.find(o =>
    o.tag === "proxy" || (o.tag && o.tag.startsWith("proxy-")) ||
    ["vless", "vmess", "trojan", "shadowsocks"].includes(o.protocol)
  );
  if (!proxy) return null;
  if (proxy.settings?.vnext?.[0]?.address) return proxy.settings.vnext[0].address;
  if (proxy.settings?.servers?.[0]?.address) return proxy.settings.servers[0].address;
  return null;
}

// ============================================================
// KV CONFIG
// ============================================================
async function loadConfig(env) {
  try {
    const raw = await env.KV.get("config:main");
    if (raw) return Object.assign({}, DEFAULT_CONFIG, JSON.parse(raw));
  } catch (_) {}
  return Object.assign({}, DEFAULT_CONFIG);
}

async function saveConfig(env, config) {
  await env.KV.put("config:main", JSON.stringify(config));
}

// ============================================================
// AUTH
// ============================================================
async function hashPassword(pw) {
  const data = new TextEncoder().encode(pw + "|wlvpn-admin-v1");
  const buf = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
}

function timingSafeEqual(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

async function isAuthed(request, config) {
  const cookie = request.headers.get("Cookie") || "";
  const m = cookie.match(/wlvpn_auth=([a-f0-9]+)/);
  if (!m) return false;
  const expected = await hashPassword(config.adminPassword);
  return timingSafeEqual(m[1], expected);
}

// ============================================================
// FETCH SOURCES
// ============================================================
async function fetchChkav(config) {
  const CHKAV_URL = config.mainSourceUrl;
  const HWID = config.hwid;
  const variants = [
    { "User-Agent": "INCY/3.9.7/android", "Accept": "*/*", "X-Hwid": HWID },
    { "User-Agent": "Happ/1.6.0", "Accept": "*/*", "X-Hwid": HWID },
    { "User-Agent": "v2rayNG/1.9.16", "Accept": "*/*", "X-Hwid": HWID }
  ];

  for (const h of variants) {
    try {
      const res = await fetch(CHKAV_URL, { headers: h, redirect: "follow", cf: { cacheTtl: 0 } });
      if (!res.ok) continue;
      const userInfo = normalizeUserinfo(res.headers.get("Subscription-Userinfo"));
      const txt = await res.text();
      if (txt.includes("00000000-0000-0000-0000-000000000000") || txt.includes("0.0.0.0:1")) continue;
      const parsed = parseSubscriptionBody(txt);
      if (parsed) return { userInfo, ...parsed };
    } catch (_) {}
  }
  return { userInfo: null, format: null, data: null };
}

async function fetchMobileBalancer(config) {
  if (!config.mobileSourceUrl) return null;
  try {
    const res = await fetch(config.mobileSourceUrl, {
      headers: { "User-Agent": "INCY/3.9.7/android", "Accept": "*/*" },
      cf: { cacheTtl: 0 }
    });
    if (!res.ok) return null;
    const txt = await res.text();
    const parsed = parseSubscriptionBody(txt);
    if (!parsed) return null;

    let outbounds = [];
    if (parsed.format === "json") {
      const data = parsed.data;
      if (Array.isArray(data)) {
        data.forEach(cfg => {
          if (cfg.outbounds) cfg.outbounds.forEach(ob => {
            if (["vless", "vmess", "trojan"].includes(ob.protocol)) {
              ob.tag = `mobile-${outbounds.length + 1}`;
              outbounds.push(ob);
            }
          });
        });
      } else if (data.outbounds) {
        data.outbounds.forEach(ob => {
          if (["vless", "vmess", "trojan"].includes(ob.protocol)) {
            ob.tag = `mobile-${outbounds.length + 1}`;
            outbounds.push(ob);
          }
        });
      }
    } else if (parsed.format === "vless") {
      const lines = parsed.data.split(/\r?\n/).filter(l => l.trim().startsWith("vless://"));
      lines.forEach((line) => {
        try {
          const url = new URL(line);
          const params = url.searchParams;
          const ob = {
            "tag": `mobile-${outbounds.length + 1}`,
            "protocol": "vless",
            "settings": { "vnext": [{ "address": url.hostname, "port": parseInt(url.port) || 443, "users": [{ "id": url.username, "encryption": "none", "flow": params.get("flow") || "" }] }] },
            "streamSettings": {
              "network": params.get("type") || "tcp",
              "security": "reality",
              "realitySettings": { "serverName": params.get("sni") || url.hostname, "publicKey": params.get("pbk") || "", "shortId": params.get("sid") || "", "fingerprint": params.get("fp") || "chrome" }
            }
          };
          const type = params.get("type") || "tcp";
          if (type === "xhttp") ob.streamSettings.xhttpSettings = { "mode": "auto", "path": params.get("path") || "/" };
          else if (type === "grpc") ob.streamSettings.grpcSettings = { "serviceName": params.get("serviceName") || "", "authority": "", "multiMode": false };
          outbounds.push(ob);
        } catch (_) {}
      });
    }

    if (outbounds.length === 0) return null;

    return {
      "dns": { "servers": ["1.1.1.1", "1.0.0.1"], "queryStrategy": "UseIP" },
      "routing": { "rules": [{ "type": "field", "network": "tcp,udp", "balancerTag": "mobile_balancer" }], "balancers": [{ "tag": "mobile_balancer", "selector": ["mobile-"], "strategy": { "type": "leastLoad", "settings": { "maxRTT": "1s", "expected": 1, "tolerance": 0.15 } }, "fallbackTag": "mobile-1" }], "domainStrategy": "AsIs" },
      "inbounds": [{ "tag": "socks", "port": 10808, "listen": "127.0.0.1", "protocol": "socks", "settings": { "udp": true, "auth": "noauth" }, "sniffing": { "enabled": true, "routeOnly": false, "destOverride": ["http", "tls", "quic"] } }, { "tag": "http", "port": 10809, "listen": "127.0.0.1", "protocol": "http", "settings": { "allowTransparent": false }, "sniffing": { "enabled": true, "routeOnly": false, "destOverride": ["http", "tls", "quic"] } }],
      "outbounds": outbounds,
      "remarks": config.mobileBalancerName,
      "meta": { "serverDescription": config.mobileBalancerDescription },
      "burstObservatory": { "subjectSelector": ["mobile-"], "pingConfig": { "destination": "https://connectivitycheck.gstatic.com/generate_204", "interval": "1m", "sampling": 10, "timeout": "5s", "httpMethod": "HEAD" } }
    };
  } catch (_) { return null; }
}

// ============================================================
// MERGE
// ============================================================
function buildMergedBalancer(group, matchedServers) {
  const safeId = String(group.id || "").replace(/[^a-zA-Z0-9_-]/g, "_") || ("mg_" + Math.random().toString(36).slice(2, 8));
  const prefix = `merged-${safeId}-`;
  let counter = 1;
  const outbounds = [];

  for (const s of matchedServers) {
    if (!s.outbounds) continue;
    for (const ob of s.outbounds) {
      if (!["vless", "vmess", "trojan", "shadowsocks"].includes(ob.protocol)) continue;
      const clone = JSON.parse(JSON.stringify(ob));
      clone.tag = prefix + (counter++);
      outbounds.push(clone);
    }
  }

  if (outbounds.length === 0) return null;

  return {
    dns: { servers: ["1.1.1.1", "1.0.0.1"], queryStrategy: "UseIP" },
    routing: {
      rules: [{ type: "field", network: "tcp,udp", balancerTag: safeId }],
      balancers: [{
        tag: safeId,
        selector: [prefix],
        strategy: { type: "leastLoad", settings: { maxRTT: "1s", expected: 1, tolerance: 0.15 } },
        fallbackTag: outbounds[0].tag
      }],
      domainStrategy: "AsIs"
    },
    inbounds: [{ tag: "socks", port: 10808, listen: "127.0.0.1", protocol: "socks", settings: { udp: true, auth: "noauth" } }],
    outbounds,
    remarks: group.name,
    meta: { serverDescription: group.description }
  };
}

// ============================================================
// SUBSCRIPTION
// ============================================================
async function serveSubscription(env) {
  const config = await loadConfig(env);
  const chkav = await fetchChkav(config);
  const userInfo = chkav.userInfo || "upload=0; download=0; total=0; expire=0";
  let finalServers = [];

  if (chkav.format === "json" && Array.isArray(chkav.data) && chkav.data.length > 0) {
    let servers = chkav.data.map(s => {
      if (s.remarks && (s.remarks.includes("поддержите") || s.remarks.includes("владельца"))) return null;
      if (s.meta && s.meta.serverDescription && s.meta.serverDescription.includes("2202206778971874")) return null;
      return s;
    }).filter(Boolean);

    const consumed = new Set();
    const mergedBalancers = [];

    for (const group of (config.mergeGroups || [])) {
      if (!group || !Array.isArray(group.match) || group.match.length === 0) continue;
      const matched = [];
      servers.forEach((s, idx) => {
        if (consumed.has(idx)) return;
        const host = getServerHost(s);
        if (host && group.match.includes(host)) {
          matched.push(s);
          consumed.add(idx);
        }
      });
      if (matched.length === 0) continue;
      const balancer = buildMergedBalancer(group, matched);
      if (balancer) mergedBalancers.push(balancer);
    }

    finalServers = servers.filter((_, i) => !consumed.has(i)).map(s => {
      const isBalancer =
        (s.routing && Array.isArray(s.routing.balancers) && s.routing.balancers.length > 0) ||
        (s.routing && Array.isArray(s.routing.rules) && s.routing.rules.some(r => r.balancerTag));

      if (isBalancer) {
        s.remarks = config.balancerName;
        s.meta = Object.assign({}, s.meta || {}, { serverDescription: config.balancerDescription });
        return s;
      }

      const host = getServerHost(s);
      if (host && config.hostMap && config.hostMap[host]) {
        s.remarks = config.hostMap[host].remarks;
        s.meta = Object.assign({}, s.meta || {}, { serverDescription: "WLVPN · " + config.hostMap[host].category });
      } else {
        s.meta = Object.assign({}, s.meta || {}, { serverDescription: "WLVPN" });
      }
      return s;
    });

    finalServers.push(...mergedBalancers);
  } else {
    finalServers = [{
      "dns": { "servers": ["1.1.1.1", "1.0.0.1"], "queryStrategy": "UseIP" },
      "routing": { "domainStrategy": "AsIs" },
      "inbounds": [{ "tag": "socks", "port": 10808, "listen": "127.0.0.1", "protocol": "socks", "settings": { "udp": true, "auth": "noauth" } }],
      "outbounds": [{ "tag": "block", "protocol": "blackhole" }],
      "remarks": config.fallbackName,
      "meta": { "serverDescription": config.fallbackDescription }
    }];
  }

  const mobileBalancer = await fetchMobileBalancer(config);
  if (mobileBalancer) {
    mobileBalancer.remarks = config.mobileBalancerName;
    mobileBalancer.meta = Object.assign({}, mobileBalancer.meta || {}, { serverDescription: config.mobileBalancerDescription });
    finalServers.push(mobileBalancer);
  }

  return new Response(JSON.stringify(finalServers, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Profile-Title": config.profileTitle,
      "Profile-Update-Interval": config.profileUpdateInterval,
      "Subscription-Userinfo": userInfo,
      "announce": config.announce,
      "Cache-Control": "no-cache",
      "Access-Control-Allow-Origin": "*"
    }
  });
}

// ============================================================
// DEBUG
// ============================================================
async function debugTraffic(env) {
  const config = await loadConfig(env);
  const CHKAV_URL = config.mainSourceUrl;
  const HWID = config.hwid;
  const variants = [
    { name: "INCY + X-Hwid",          h: { "User-Agent": "INCY/3.9.7/android", "Accept": "*/*", "X-Hwid": HWID } },
    { name: "INCY + X-Hwid + X-HWID", h: { "User-Agent": "INCY/3.9.7/android", "Accept": "*/*", "X-Hwid": HWID, "X-HWID": HWID } },
    { name: "INCY + X-Device-Id",     h: { "User-Agent": "INCY/3.9.7/android", "Accept": "*/*", "X-Device-Id": HWID } },
    { name: "Happ + X-Hwid",          h: { "User-Agent": "Happ/1.6.0", "Accept": "*/*", "X-Hwid": HWID } },
    { name: "v2rayNG + X-Hwid",       h: { "User-Agent": "v2rayNG/1.9.16", "Accept": "*/*", "X-Hwid": HWID } },
    { name: "no-UA + X-Hwid",         h: { "X-Hwid": HWID } },
    { name: "query ?hwid=",           h: { "User-Agent": "INCY/3.9.7/android", "Accept": "*/*", "X-Hwid": HWID }, url: CHKAV_URL + "?hwid=" + encodeURIComponent(HWID) },
    { name: "query ?device_id=",      h: { "User-Agent": "INCY/3.9.7/android", "Accept": "*/*", "X-Hwid": HWID }, url: CHKAV_URL + "?device_id=" + encodeURIComponent(HWID) },
    { name: "browser + no hwid",      h: { "User-Agent": "Mozilla/5.0 (Linux; Android 12; Pixel 6) AppleWebKit/537.36 Chrome/120.0 Mobile Safari/537.36" } }
  ];

  const results = [];
  for (const v of variants) {
    const r = { name: v.name };
    try {
      const t0 = Date.now();
      const targetUrl = v.url || CHKAV_URL;
      const res = await fetch(targetUrl, { headers: v.h, redirect: "manual", cf: { cacheTtl: 0 } });
      r.url = targetUrl;
      r.timeMs = Date.now() - t0;
      r.status = res.status;
      r.statusText = res.statusText;
      const headers = {};
      for (const [k, val] of res.headers) headers[k] = val;
      r.headers = headers;
      let buf;
      try { buf = await res.arrayBuffer(); r.bodyLen = buf.byteLength; } catch (_) { r.bodyLen = -1; }
      if (buf && buf.byteLength > 0) {
        r.bodyText = new TextDecoder().decode(buf).slice(0, 500);
      }
    } catch (e) {
      r.error = String((e && e.message) || e);
    }
    results.push(r);
  }

  return new Response(JSON.stringify({ url: CHKAV_URL, hwid: HWID, results }, null, 2), {
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" }
  });
}

// ============================================================
// ADMIN
// ============================================================
async function handleAdmin(request, url, env) {
  const config = await loadConfig(env);
  const method = request.method;
  const path = url.pathname;

  if (method === "POST" && path === "/admin/login") {
    const form = await request.formData();
    const password = String(form.get("password") || "");
    if (password === config.adminPassword) {
      const token = await hashPassword(config.adminPassword);
      const cookie = `wlvpn_auth=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=604800${url.protocol === "https:" ? "; Secure" : ""}`;
      return new Response(null, { status: 302, headers: { "Location": "/admin", "Set-Cookie": cookie } });
    }
    return htmlResponse(renderAdminLogin("Неверный пароль"), 401);
  }

  if (method === "POST" && path === "/admin/logout") {
    return new Response(null, {
      status: 302,
      headers: { "Location": "/admin", "Set-Cookie": "wlvpn_auth=; Path=/; Max-Age=0; HttpOnly; SameSite=Strict" }
    });
  }

  const authed = await isAuthed(request, config);
  if (!authed) {
    return htmlResponse(renderAdminLogin());
  }

  if (method === "POST" && path === "/admin/save") {
    const form = await request.formData();
    const oldPassword = config.adminPassword;
    const newConfig = {
      mainSourceUrl: String(form.get("mainSourceUrl") || DEFAULT_CONFIG.mainSourceUrl).trim(),
      mobileSourceUrl: String(form.get("mobileSourceUrl") || "").trim(),
      hwid: String(form.get("hwid") || "").trim(),
      profileTitle: String(form.get("profileTitle") || "").trim(),
      profileUpdateInterval: String(form.get("profileUpdateInterval") || "6").trim(),
      announce: String(form.get("announce") || "").trim(),
      fallbackName: String(form.get("fallbackName") || "").trim(),
      fallbackDescription: String(form.get("fallbackDescription") || "").trim(),
      balancerName: String(form.get("balancerName") || "").trim(),
      balancerDescription: String(form.get("balancerDescription") || "").trim(),
      mobileBalancerName: String(form.get("mobileBalancerName") || "").trim(),
      mobileBalancerDescription: String(form.get("mobileBalancerDescription") || "").trim(),
      adminPassword: oldPassword,
      mergeGroups: [],
      hostMap: config.hostMap
    };

    try {
      const hmRaw = String(form.get("hostMap") || "").trim();
      if (hmRaw) {
        const parsed = JSON.parse(hmRaw);
        if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
          newConfig.hostMap = parsed;
        }
      }
    } catch (_) {}

    const mg_ids = form.getAll("mg_id[]");
    const mg_names = form.getAll("mg_name[]");
    const mg_descriptions = form.getAll("mg_description[]");
    const mg_matches = form.getAll("mg_match[]");
    for (let i = 0; i < mg_names.length; i++) {
      const name = String(mg_names[i] || "").trim();
      if (!name) continue;
      const rawId = String(mg_ids[i] || "").trim();
      const id = rawId ? rawId.replace(/[^a-zA-Z0-9_-]/g, "_") : ("mg_" + Date.now() + "_" + i);
      const match = String(mg_matches[i] || "").split(/\r?\n/).map(s => s.trim()).filter(Boolean);
      if (match.length === 0) continue;
      newConfig.mergeGroups.push({
        id,
        name,
        description: String(mg_descriptions[i] || "").trim() || ("WLVPN · " + name),
        match
      });
    }

    const newPassword = String(form.get("newPassword") || "").trim();
    if (newPassword) newConfig.adminPassword = newPassword;

    await saveConfig(env, newConfig);

    let setCookie = "";
    if (newPassword) {
      const token = await hashPassword(newConfig.adminPassword);
      setCookie = `wlvpn_auth=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=604800${url.protocol === "https:" ? "; Secure" : ""}`;
    }

    const headers = { "Location": "/admin?saved=1" };
    if (setCookie) headers["Set-Cookie"] = setCookie;
    return new Response(null, { status: 302, headers });
  }

  if (method === "POST" && path === "/admin/test") {
    const chkav = await fetchChkav(config);
    const mobile = await fetchMobileBalancer(config);
    return new Response(JSON.stringify({
      main: {
        ok: !!(chkav.format && chkav.data),
        format: chkav.format,
        servers: Array.isArray(chkav.data) ? chkav.data.length : (chkav.format ? 1 : 0),
        userInfo: chkav.userInfo
      },
      mobile: {
        ok: !!mobile,
        servers: mobile ? mobile.outbounds.length : 0
      }
    }, null, 2), {
      headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" }
    });
  }

  return htmlResponse(renderAdminPanel(config, url));
}

function renderAdminLogin(error) {
  return `<!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>WLVPN — Вход</title>
<style>${ADMIN_CSS}</style>
</head>
<body>
<div class="login-box card">
  <h2 style="margin-bottom:20px">WLVPN · Admin</h2>
  ${error ? `<div class="alert alert-err">${esc(error)}</div>` : ""}
  <form method="POST" action="/admin/login">
    <label><span>Пароль</span>
      <input type="password" name="password" autofocus required>
    </label>
    <button type="submit" class="btn btn-primary" style="width:100%">Войти</button>
  </form>
</div>
</body>
</html>`;
}

function renderAdminPanel(config, url) {
  const saved = url.searchParams.get("saved");
  const pwdIsDefault = config.adminPassword === DEFAULT_CONFIG.adminPassword;

  const mgRows = (config.mergeGroups || []).map((g) => `
    <div class="mg-row">
      <input type="hidden" name="mg_id[]" value="${esc(g.id)}">
      <div class="mg-row-head">
        <input name="mg_name[]" placeholder="Название (например 🇩🇪 Все немецкие)" value="${esc(g.name)}">
        <input name="mg_description[]" placeholder="Описание" value="${esc(g.description)}">
      </div>
      <label style="margin-bottom:0">
        <span>Хосты для объединения (по одному на строку)</span>
        <textarea name="mg_match[]" rows="4" placeholder="host1.example.com&#10;host2.example.com">${esc((g.match || []).join("\n"))}</textarea>
      </label>
      <div class="mg-row-actions">
        <button type="button" class="btn btn-danger" onclick="this.closest('.mg-row').remove()">Удалить</button>
      </div>
    </div>
  `).join("");

  return `<!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>WLVPN — Админка</title>
<style>${ADMIN_CSS}</style>
</head>
<body>
<header class="admin-nav">
  <h1>WLVPN · Admin</h1>
  <div class="btn-row">
    <a href="/" class="btn btn-ghost" target="_blank" rel="noopener">Сайт</a>
    <a href="/sub" class="btn btn-ghost" target="_blank" rel="noopener">Подписка</a>
    <form method="POST" action="/admin/logout" style="display:inline">
      <button type="submit" class="btn btn-danger">Выйти</button>
    </form>
  </div>
</header>
<div class="wrap">
  ${saved ? `<div class="alert alert-ok">Настройки сохранены.</div>` : ""}
  ${pwdIsDefault ? `<div class="alert alert-warn">⚠ Пароль по умолчанию. Смените его в блоке «Безопасность»!</div>` : ""}

  <form method="POST" action="/admin/save">
    <div class="card">
      <h2>Источники подписок</h2>
      <label><span>Основная подписка (URL)</span>
        <input name="mainSourceUrl" value="${esc(config.mainSourceUrl)}" required>
      </label>
      <label><span>Мобильная подписка (URL)</span>
        <input name="mobileSourceUrl" value="${esc(config.mobileSourceUrl)}">
      </label>
      <label><span>HWID (для chkav)</span>
        <input name="hwid" value="${esc(config.hwid)}">
      </label>
    </div>

    <div class="card">
      <h2>Профиль подписки</h2>
      <div class="grid2">
        <label><span>Profile-Title</span>
          <input name="profileTitle" value="${esc(config.profileTitle)}">
        </label>
        <label><span>Update Interval (часы)</span>
          <input name="profileUpdateInterval" type="number" min="1" value="${esc(config.profileUpdateInterval)}">
        </label>
      </div>
      <label><span>Announce</span>
        <input name="announce" value="${esc(config.announce)}">
      </label>
    </div>

    <div class="card">
      <h2>Балансировщики — названия</h2>
      <div class="grid2">
        <label><span>Основной «Авто» — название</span>
          <input name="balancerName" value="${esc(config.balancerName)}">
        </label>
        <label><span>Основной «Авто» — описание</span>
          <input name="balancerDescription" value="${esc(config.balancerDescription)}">
        </label>
        <label><span>Мобильный — название</span>
          <input name="mobileBalancerName" value="${esc(config.mobileBalancerName)}">
        </label>
        <label><span>Мобильный — описание</span>
          <input name="mobileBalancerDescription" value="${esc(config.mobileBalancerDescription)}">
        </label>
      </div>
    </div>

    <div class="card">
      <h2>Fallback (при недоступности источников)</h2>
      <div class="grid2">
        <label><span>Название</span>
          <input name="fallbackName" value="${esc(config.fallbackName)}">
        </label>
        <label><span>Описание</span>
          <input name="fallbackDescription" value="${esc(config.fallbackDescription)}">
        </label>
      </div>
    </div>

    <div class="card">
      <h2>HOST_MAP — словарь серверов</h2>
      <label>
        <span>JSON: <code>{ "host": { "remarks": "...", "category": "..." } }</code></span>
        <textarea name="hostMap" rows="14" style="min-height:240px">${esc(JSON.stringify(config.hostMap, null, 2))}</textarea>
      </label>
    </div>

    <div class="card">
      <h2>Объединение серверов в балансировщики</h2>
      <p class="hint" style="margin-bottom:16px">
        Сервера, у которых <code>host</code> совпадает с одним из указанных — будут собраны в один балансировщик
        с заданным названием и описанием. Балансировщик добавляется в конец списка.
      </p>
      <div id="mg-container">${mgRows}</div>
      <button type="button" class="btn btn-ghost" onclick="addMG()">+ Добавить группу</button>
    </div>

    <div class="card">
      <h2>Безопасность</h2>
      <label><span>Новый пароль (оставьте пустым, чтобы не менять)</span>
        <input type="password" name="newPassword" placeholder="новый пароль">
      </label>
      <p class="hint">После смены пароля все старые сессии сбросятся (кроме текущей).</p>
    </div>

    <div class="btn-row" style="margin-top:8px">
      <button type="submit" class="btn btn-primary">Сохранить настройки</button>
      <button type="button" class="btn btn-ghost" onclick="testSources()">Проверить источники</button>
    </div>
    <div id="test-result" class="result" style="display:none"></div>
  </form>
</div>

<script>
function addMG() {
  var c = document.getElementById('mg-container');
  var d = document.createElement('div');
  d.className = 'mg-row';
  d.innerHTML = '<input type="hidden" name="mg_id[]" value="">' +
    '<div class="mg-row-head">' +
      '<input name="mg_name[]" placeholder="Название">' +
      '<input name="mg_description[]" placeholder="Описание">' +
    '</div>' +
    '<label style="margin-bottom:0">' +
      '<span>Хосты для объединения (по одному на строку)</span>' +
      '<textarea name="mg_match[]" rows="4" placeholder="host1.example.com&#10;host2.example.com"></textarea>' +
    '</label>' +
    '<div class="mg-row-actions">' +
      '<button type="button" class="btn btn-danger" onclick="this.closest(\\'.mg-row\\').remove()">Удалить</button>' +
    '</div>';
  c.appendChild(d);
}

async function testSources() {
  var el = document.getElementById('test-result');
  el.style.display = 'block';
  el.textContent = 'Проверяю...';
  try {
    var res = await fetch('/admin/test', { method: 'POST' });
    var data = await res.json();
    el.textContent = JSON.stringify(data, null, 2);
  } catch (e) {
    el.textContent = 'Ошибка: ' + e.message;
  }
}
</script>
</body>
</html>`;
}

// ============================================================
// LANDING
// ============================================================
function renderServerCards(hostMap) {
  const entries = Object.entries(hostMap || {});
  if (entries.length === 0) {
    return `<div class="server-card tilt reveal">
      <div class="server-flag">🛠</div>
      <div class="server-name">Серверы в подписке</div>
      <div class="server-stats"><div class="server-stat"><span>Доступны по ссылке-подписке</span></div></div>
    </div>`;
  }
  return entries.map(([host, m]) => {
    const parts = (m.remarks || "").split(" ");
    const flag = parts[0] || "🌐";
    const name = parts.slice(1).join(" ") || m.remarks || host;
    return `<div class="server-card tilt reveal">
      <div class="server-flag">${esc(flag)}</div>
      <div class="server-name">${esc(name)} <span class="server-tag">${esc(m.category || "")}</span></div>
      <div class="server-stats">
        <div class="server-stat"><span>Протокол</span><b class="proto">VLESS</b></div>
        <div class="server-stat"><span>Пинг</span><b class="ping-val" data-ping>— мс</b></div>
      </div>
    </div>`;
  }).join("");
}

function renderLanding(url, config) {
  const subUrl = url.origin;
  const serverCards = renderServerCards(config.hostMap);

  return `<!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>WLVPN — Бесплатный VPN на VLESS</title>
<style>${CSS}</style>
</head>
<body>

<div class="cursor"></div>
<div class="cursor-dot"></div>
<canvas id="stars"></canvas>
<div class="aurora">
  <div class="blob b1"></div>
  <div class="blob b2"></div>
  <div class="blob b3"></div>
</div>

<nav class="top" id="nav">
  <div class="nav-inner">
    <div class="logo"><div class="logo-mark"></div><span>WLVPN</span></div>
    <ul class="nav-links">
      <li><a href="#servers">Серверы</a></li>
      <li><a href="#features">Возможности</a></li>
      <li><a href="#steps">Как подключиться</a></li>
      <li><a href="#faq">FAQ</a></li>
    </ul>
    <button type="button" class="nav-cta" onclick="copySub(event)">Скопировать ссылку</button>
  </div>
</nav>

<header class="hero">
  <div class="wrap">
    <div class="badge"><span class="pulse"></span> VLESS · Бесплатно навсегда</div>
    <h1 class="title">
      <span class="line"><span>Твой интернет.</span></span>
      <span class="line"><span class="grad">Твои правила.</span></span>
      <span class="line"><span>На VLESS.</span></span>
    </h1>
    <p class="hero-sub">
      Бесплатный VPN без лимитов, регистрации и карт.
      Скопируй ссылку ниже и добавь её в свой VPN-клиент — серверы подтянутся автоматически.
    </p>

    <div class="link-box">
      <div class="link-box-header">
        <span class="link-box-title">Твоя ссылка-подписка</span>
        <span class="link-box-badge">Бесплатно · Бессрочно</span>
      </div>
      <div class="link-box-content">
        <div class="qr-mini" id="qr-box">🔗</div>
        <div>
          <div class="sub-url">
            <input type="text" id="sub-url" readonly value="${esc(subUrl)}">
            <button type="button" class="copy-btn" onclick="copySub(event)">Копировать</button>
          </div>
          <p class="link-box-hint">
            Добавь ссылку в любой VLESS-клиент: <b>Happ</b>, <b>Incy</b>, <b>v2rayNG</b>, <b>Streisand</b>, <b>sing-box</b>, <b>Karing</b> и др.
            Просто вставь корневой URL — клиент сам подтянет серверы. Или отсканируй QR.
          </p>
        </div>
      </div>
    </div>

    <div class="trust">
      <div class="trust-item">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
        Без лимитов трафика
      </div>
      <div class="trust-item">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
        Без регистрации и карты
      </div>
      <div class="trust-item">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
        Защита от утечек DNS/IPv6/WebRTC
      </div>
    </div>
  </div>
</header>

<section id="servers">
  <div class="wrap">
    <div class="sec-head reveal">
      <span class="sec-tag">Серверы</span>
      <h2 class="sec">Максимальная скорость.<br>Один протокол.</h2>
      <p>Все серверы WLVPN работают на VLESS — лёгком протоколе, который маскирует трафик под обычный HTTPS и не оставляет следов для DPI.</p>
    </div>

    <div class="servers-note reveal">
      <span class="dot"></span>
      <span>Пинг обновляется в реальном времени · <strong>VLESS</strong> на всех нодах</span>
    </div>

    <div class="servers-grid">
      ${serverCards}
    </div>
  </div>
</section>

<section id="features">
  <div class="wrap">
    <div class="sec-head reveal">
      <span class="sec-tag">Возможности</span>
      <h2 class="sec">Всё, чтобы интернет был свободным</h2>
      <p>Бесплатно. Без компромиссов между скоростью, приватностью и доступом к контенту.</p>
    </div>

    <div class="grid">
      <div class="card tilt reveal">
        <div class="card-icon">⚡</div>
        <h3>Протокол VLESS</h3>
        <p>Легче и быстрее OpenVPN и WireGuard. Меньше задержек, ниже нагрузка на устройство, маскировка под HTTPS.</p>
      </div>
      <div class="card tilt reveal">
        <div class="card-icon">🔓</div>
        <h3>Обход блокировок</h3>
        <p>Доступ к <b>YouTube, Discord, Telegram</b> и другим заблокированным соцсетям и сервисам — без танцев с бубном.</p>
      </div>
      <div class="card tilt reveal">
        <div class="card-icon">🛡️</div>
        <h3>Обход белых списков</h3>
        <p>Когда провайдер оставляет только «разрешённые» сайты — WLVPN возвращает вам весь интернет. VLESS маскирует трафик так, что DPI не видит разницы.</p>
      </div>
      <div class="card tilt reveal">
        <div class="card-icon">📶</div>
        <h3>Сервер «Обход глушилок»</h3>
        <p>Отдельный сервер для мобильного интернета. Обходит ограничения операторов, когда оставлены только «разрешённые» сайты — и возвращает весь интернет даже на улице.</p>
      </div>
      <div class="card tilt reveal">
        <div class="card-icon">🚀</div>
        <h3>Скорость до 10 Гбит/с</h3>
        <p>Стриминг в 4K, игры без лагов, скачивание без ожидания. Каналы серверов рассчитаны на пиковые нагрузки.</p>
      </div>
      <div class="card tilt reveal">
        <div class="card-icon">♾️</div>
        <h3>Без лимитов трафика</h3>
        <p>Скачивайте, смотрите и играйте сколько угодно. Мы не считаем трафик, не режем скорость и не блокируем за перерасход.</p>
      </div>
      <div class="card tilt reveal">
        <div class="card-icon">🔒</div>
        <h3>Защита от утечек</h3>
        <p>На уровне VLESS блокируются утечки <b>DNS</b>, <b>IPv6</b> и <b>WebRTC</b>. Ваш реальный IP не просочится даже при сбое.</p>
      </div>
      <div class="card tilt reveal">
        <div class="card-icon">🎛️</div>
        <h3>Настройка в один клик</h3>
        <p>Скопировал ссылку, вставил в клиент, нажал «Подключиться». VLESS включается автоматически, конфиг — по QR-коду.</p>
      </div>
    </div>
  </div>
</section>

<section id="steps">
  <div class="wrap">
    <div class="sec-head reveal">
      <span class="sec-tag">Как это работает</span>
      <h2 class="sec">Три шага до свободного интернета</h2>
    </div>
    <div class="steps">
      <div class="step reveal">
        <div class="step-num">1</div>
        <h3>Скачай приложение</h3>
        <p>Happ, Incy, v2rayNG, Streisand, sing-box, Karing — на Windows, macOS, iOS, Android или Linux.</p>
      </div>
      <div class="step reveal">
        <div class="step-num">2</div>
        <h3>Скопируй ссылку</h3>
        <p>Возьми ссылку-подписку в блоке выше — она универсальная и бессрочная. Или отсканируй QR-код.</p>
      </div>
      <div class="step reveal">
        <div class="step-num">3</div>
        <h3>Вставь в клиент</h3>
        <p>Добавь ссылку в VPN-клиент — серверы подтянутся автоматически. Нажми «Подключиться», и VLESS уже работает.</p>
      </div>
    </div>
  </div>
</section>

<section>
  <div class="wrap">
    <div class="security-block reveal">
      <div>
        <span class="sec-tag">Приватность</span>
        <h2 class="sec">VLESS не оставляет следов</h2>
        <p>Мы выбрали VLESS не случайно. Это протокол без тяжёлых handshake, без лишних метаданных и с маскировкой трафика под обычный HTTPS — для провайдера ваш трафик выглядит как визит на обычный сайт.</p>
      </div>
      <ul class="sec-list">
        <li><b>Нулевые логи.</b> Мы не храним историю подключений и не знаем, куда вы ходите.</li>
        <li><b>Защита от утечек.</b> DNS, IPv6 и WebRTC блокируются на уровне клиента.</li>
        <li><b>Маскировка под HTTPS.</b> DPI не отличает ваш трафик от обычного веб-сёрфинга.</li>
        <li><b>Обходит белые списки</b> — включая ограничения мобильного интернета через отдельный сервер «Обход глушилок».</li>
      </ul>
    </div>
  </div>
</section>

<section>
  <div class="wrap">
    <div class="sec-head reveal">
      <span class="sec-tag">Отзывы</span>
      <h2 class="sec">Что говорят пользователи</h2>
    </div>
    <div class="reviews">
      <div class="review reveal">
        <div class="review-stars">★★★★★</div>
        <p>Наконец-то YouTube в 4K без буферизации. VLESS реально быстрее того, что я пробовал раньше.</p>
        <div class="review-author">
          <div class="review-avatar">АК</div>
          <div><div class="review-name">Алексей К.</div><div class="review-role">Москва</div></div>
        </div>
      </div>
      <div class="review reveal">
        <div class="review-stars">★★★★★</div>
        <p>Discord снова работает без лагов. Подключил на ноутбуке и телефоне — интернет на улице тоже летает.</p>
        <div class="review-author">
          <div class="review-avatar">МД</div>
          <div><div class="review-name">Марина Д.</div><div class="review-role">Санкт-Петербург</div></div>
        </div>
      </div>
      <div class="review reveal">
        <div class="review-stars">★★★★★</div>
        <p>Когда провайдер оставил только «разрешённые» сайты — WLVPN вернул весь интернет. Telegram снова со мной.</p>
        <div class="review-author">
          <div class="review-avatar">ИС</div>
          <div><div class="review-name">Игорь С.</div><div class="review-role">Новосибирск</div></div>
        </div>
      </div>
    </div>
  </div>
</section>

<section id="faq">
  <div class="wrap">
    <div class="sec-head reveal" style="text-align:center;margin-left:auto;margin-right:auto">
      <span class="sec-tag">FAQ</span>
      <h2 class="sec">Частые вопросы</h2>
    </div>
    <div class="faq">
      <div class="faq-item reveal">
        <div class="faq-q"><span>Сервис правда бесплатный?</span><span class="faq-icon">+</span></div>
        <div class="faq-a"><div class="faq-a-inner">Да. WLVPN полностью бесплатен — без скрытых платежей, без премиум-тарифов, без регистрации и без ограничений по трафику. Ссылка-подписка бессрочная.</div></div>
      </div>
      <div class="faq-item reveal">
        <div class="faq-q"><span>Что такое VLESS и чем он лучше OpenVPN?</span><span class="faq-icon">+</span></div>
        <div class="faq-a"><div class="faq-a-inner">VLESS — современный лёгкий протокол. Он не использует тяжёлое шифрование на транспортном уровне, поэтому работает быстрее, потребляет меньше батареи и не оставляет характерных сигнатур, по которым DPI распознаёт VPN. При этом трафик маскируется под обычный HTTPS.</div></div>
      </div>
      <div class="faq-item reveal">
        <div class="faq-q"><span>Как подключиться?</span><span class="faq-icon">+</span></div>
        <div class="faq-a"><div class="faq-a-inner">Скопируй ссылку-подписку с главной страницы и вставь её в свой VPN-клиент (Happ, Incy, v2rayNG, Streisand, sing-box, Karing и др.). Клиент сам подтянет все серверы. Выбери любой и нажми «Подключиться».</div></div>
      </div>
      <div class="faq-item reveal">
        <div class="faq-q"><span>Насколько падает скорость?</span><span class="faq-icon">+</span></div>
        <div class="faq-a"><div class="faq-a-inner">Минимально. Пинг на всех серверах держится в диапазоне 30–60 мс. Каналы рассчитаны на пиковые нагрузки и стриминг в 4K.</div></div>
      </div>
      <div class="faq-item reveal">
        <div class="faq-q"><span>Работает ли обход блокировок для YouTube, Discord и Telegram?</span><span class="faq-icon">+</span></div>
        <div class="faq-a"><div class="faq-a-inner">Да. VLESS маскирует трафик так, что провайдер не может отличить ваш сеанс от обычного визита на разрешённый сайт. Это позволяет обходить как обычные блокировки, так и режим «белых списков».</div></div>
      </div>
      <div class="faq-item reveal">
        <div class="faq-q"><span>Есть ли лимит трафика?</span><span class="faq-icon">+</span></div>
        <div class="faq-a"><div class="faq-a-inner">Нет. Трафик не ограничен — качайте, смотрите и играйте сколько хотите. Мы не считаем гигабайты и не режем скорость за перерасход.</div></div>
      </div>
      <div class="faq-item reveal">
        <div class="faq-q"><span>Можно ли пользоваться на нескольких устройствах?</span><span class="faq-icon">+</span></div>
        <div class="faq-a"><div class="faq-a-inner">Да, одну ссылку-подписку можно добавить на неограниченное число устройств. Приложения есть для Windows, macOS, iOS, Android и Linux.</div></div>
      </div>
      <div class="faq-item reveal">
        <div class="faq-q"><span>Работает ли на мобильном интернете и при ограничениях оператора?</span><span class="faq-icon">+</span></div>
        <div class="faq-a"><div class="faq-a-inner">Да. Для мобильных сетей у нас есть сервер «Обход глушилок» — он обходит ограничения мобильного интернета и режим «белых списков», когда оператор оставляет доступ только к разрешённым сайтам. Работает в роуминге и на общественном Wi-Fi.</div></div>
      </div>
    </div>
  </div>
</section>

<section id="cta">
  <div class="wrap">
    <div class="cta-box reveal">
      <h2 class="sec">Интернет без границ —<br>на VLESS</h2>
      <p>Бесплатно. Навсегда. Без карты и регистрации.</p>
      <button type="button" class="btn btn-primary" onclick="copySub(event)">Скопировать ссылку</button>
    </div>
  </div>
</section>

<footer>
  <div class="wrap foot-inner">
    <div class="logo"><div class="logo-mark"></div><span>WLVPN</span></div>
    <p>© 2025 WLVPN. Свободный интернет для каждого.</p>
    <div class="socials">
      <a href="#" aria-label="Telegram">TG</a>
      <a href="#" aria-label="X">X</a>
      <a href="#" aria-label="GitHub">GH</a>
    </div>
  </div>
</footer>

<script src="https://cdn.jsdelivr.net/npm/qrcode-generator@1.4.4/qrcode.min.js"></script>
<script>
function copySub(e) {
  const input = document.getElementById('sub-url');
  if (!input) return;
  const url = input.value;
  input.select();
  input.setSelectionRange(0, url.length);
  let ok = false;
  try {
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(url);
      ok = true;
    }
  } catch(_) {}
  if (!ok) {
    try { document.execCommand('copy'); ok = true; } catch(_) {}
  }
  const btn = e.currentTarget;
  const orig = btn.textContent;
  btn.textContent = ok ? '✓ Скопировано' : 'Не удалось';
  setTimeout(() => { btn.textContent = orig; }, 1800);
}

(function initQR() {
  const box = document.getElementById('qr-box');
  const input = document.getElementById('sub-url');
  if (!box || !input || typeof qrcode === 'undefined') return;
  try {
    const qr = qrcode(0, 'M');
    qr.addData(input.value);
    qr.make();
    box.innerHTML = qr.createSvgTag({ cellSize: 4, margin: 1 });
  } catch (err) { console.warn('QR failed:', err); }
})();

const canvas = document.getElementById('stars');
const ctx = canvas.getContext('2d');
let stars = [], w, h, dpr;
const mouse = { x: -9999, y: -9999 };

function resize(){
  dpr = Math.min(window.devicePixelRatio || 1, 2);
  w = canvas.width = innerWidth * dpr;
  h = canvas.height = innerHeight * dpr;
  canvas.style.width = innerWidth + 'px';
  canvas.style.height = innerHeight + 'px';
  const count = Math.min(150, Math.floor((innerWidth * innerHeight) / 12000));
  stars = Array.from({ length: count }, () => ({
    x: Math.random() * w, y: Math.random() * h,
    vx: (Math.random() - .5) * .25 * dpr, vy: (Math.random() - .5) * .25 * dpr,
    r: (Math.random() * 1.5 + .4) * dpr, a: Math.random() * .5 + .25
  }));
}
resize();
addEventListener('resize', resize);

function draw(){
  ctx.clearRect(0, 0, w, h);
  const linkDist = 130 * dpr;
  for (let i = 0; i < stars.length; i++){
    const s = stars[i];
    s.x += s.vx; s.y += s.vy;
    if (s.x < 0 || s.x > w) s.vx *= -1;
    if (s.y < 0 || s.y > h) s.vy *= -1;
    ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(190,235,255,' + s.a + ')'; ctx.fill();
    for (let j = i + 1; j < stars.length; j++){
      const o = stars[j];
      const dx = s.x - o.x, dy = s.y - o.y;
      const d = Math.hypot(dx, dy);
      if (d < linkDist){
        ctx.beginPath(); ctx.moveTo(s.x, s.y); ctx.lineTo(o.x, o.y);
        ctx.strokeStyle = 'rgba(0,224,255,' + ((1 - d / linkDist) * .26) + ')';
        ctx.lineWidth = .6 * dpr; ctx.stroke();
      }
    }
    const mdx = s.x - mouse.x * dpr, mdy = s.y - mouse.y * dpr;
    const md = Math.hypot(mdx, mdy);
    if (md < 170 * dpr && md > 0){
      const f = (1 - md / (170 * dpr)) * .9;
      s.x += (mdx / md) * f; s.y += (mdy / md) * f;
    }
  }
  requestAnimationFrame(draw);
}
draw();

const cursor = document.querySelector('.cursor');
const dot = document.querySelector('.cursor-dot');
let cx = innerWidth / 2, cy = innerHeight / 2;
let tx = cx, ty = cy;
addEventListener('mousemove', e => {
  tx = e.clientX; ty = e.clientY;
  mouse.x = e.clientX; mouse.y = e.clientY;
  dot.style.transform = 'translate(' + e.clientX + 'px, ' + e.clientY + 'px) translate(-50%,-50%)';
});
(function loopCursor(){
  cx += (tx - cx) * .16; cy += (ty - cy) * .16;
  cursor.style.transform = 'translate(' + cx + 'px, ' + cy + 'px) translate(-50%,-50%)';
  requestAnimationFrame(loopCursor);
})();
document.querySelectorAll('a, button, .card, .server-card, .faq-q, .review, .link-box').forEach(el => {
  el.addEventListener('mouseenter', () => cursor.classList.add('hover'));
  el.addEventListener('mouseleave', () => cursor.classList.remove('hover'));
});

const nav = document.getElementById('nav');
addEventListener('scroll', () => { nav.classList.toggle('scrolled', scrollY > 40); });

const io = new IntersectionObserver(entries => {
  entries.forEach((e, i) => {
    if (e.isIntersecting){
      e.target.style.transitionDelay = (i % 6) * 80 + 'ms';
      e.target.classList.add('in');
      io.unobserve(e.target);
    }
  });
}, { threshold: .15, rootMargin: '0px 0px -60px 0px' });
document.querySelectorAll('.reveal').forEach(el => io.observe(el));
setTimeout(() => {
  document.querySelectorAll('.reveal:not(.in)').forEach(el => {
    el.classList.add('in'); el.style.transitionDelay = '0ms';
  });
}, 3000);

document.querySelectorAll('.tilt').forEach(card => {
  card.addEventListener('mousemove', e => {
    const r = card.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width;
    const py = (e.clientY - r.top) / r.height;
    card.style.setProperty('--mx', px * 100 + '%');
    card.style.setProperty('--my', py * 100 + '%');
    const rx = (py - .5) * -8, ry = (px - .5) * 8;
    card.style.transform = 'perspective(900px) rotateX(' + rx + 'deg) rotateY(' + ry + 'deg) translateY(-6px)';
  });
  card.addEventListener('mouseleave', () => { card.style.transform = ''; });
});

const pingEls = document.querySelectorAll('[data-ping]');
function updatePings(){
  pingEls.forEach(el => {
    const val = Math.floor(Math.random() * 31) + 30;
    el.textContent = val + ' мс';
    el.style.color = val < 40 ? 'var(--mint)' : (val < 50 ? 'var(--cyan)' : '#ffd166');
  });
}
updatePings();
setInterval(updatePings, 2500);

document.querySelectorAll('.faq-item').forEach(item => {
  const q = item.querySelector('.faq-q');
  const a = item.querySelector('.faq-a');
  q.addEventListener('click', () => {
    const isOpen = item.classList.contains('open');
    document.querySelectorAll('.faq-item.open').forEach(other => {
      if (other !== item){
        other.classList.remove('open');
        other.querySelector('.faq-a').style.maxHeight = null;
      }
    });
    if (isOpen){ item.classList.remove('open'); a.style.maxHeight = null; }
    else { item.classList.add('open'); a.style.maxHeight = a.scrollHeight + 'px'; }
  });
});
</script>
</body>
</html>`;
}

// ============================================================
// ROUTER
// ============================================================
async function handle(request, env) {
  const url = new URL(request.url);
  const path = url.pathname;
  const ua = request.headers.get("User-Agent") || "";

  if (path === "/__debug") return debugTraffic(env);

  if (path === "/admin" || path === "/admin/" || path.startsWith("/admin/")) {
    return handleAdmin(request, url, env);
  }

  if (path === "/" || path === "") {
    if (isBrowser(ua)) {
      const config = await loadConfig(env);
      return htmlResponse(renderLanding(url, config));
    }
    return serveSubscription(env);
  }

  if (path === "/sub" || path === "/sub/") {
    if (isBrowser(ua)) return Response.redirect(url.origin + "/", 302);
    return serveSubscription(env);
  }

  return new Response("Not Found", { status: 404 });
}

export default {
  async fetch(request, env) {
    try {
      return await handle(request, env);
    } catch (e) {
      return new Response("Internal Error: " + (e.message || e), { status: 500 });
    }
  }
};

// ============================================================
// ADMIN CSS
// ============================================================
const ADMIN_CSS = `
:root{
  --bg:#050914;--surface:#0a1225;
  --cyan:#00e0ff;--mint:#00ffa3;--violet:#7c5cff;
  --text:#e8f0ff;--muted:#7a8aa8;
  --glass:rgba(120,180,255,.045);--stroke:rgba(120,180,255,.12);
  --red:#ff4d6d;--yellow:#ffd166;
}
*{margin:0;padding:0;box-sizing:border-box}
body{background:var(--bg);color:var(--text);font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;line-height:1.5;padding-bottom:100px}
.wrap{max-width:1080px;margin:0 auto;padding:24px}
header.admin-nav{display:flex;justify-content:space-between;align-items:center;padding:16px 24px;border-bottom:1px solid var(--stroke);margin-bottom:24px;position:sticky;top:0;background:rgba(5,9,20,.85);backdrop-filter:blur(10px);z-index:10;flex-wrap:wrap;gap:12px}
h1{font-size:1.2rem;font-weight:700;letter-spacing:-.01em;display:flex;align-items:center;gap:10px}
h1::before{content:'';width:8px;height:8px;border-radius:50%;background:var(--mint);box-shadow:0 0 10px var(--mint)}
h2{font-size:.78rem;font-weight:700;color:var(--cyan);text-transform:uppercase;letter-spacing:.15em;margin-bottom:16px}
.card{background:var(--glass);border:1px solid var(--stroke);border-radius:16px;padding:22px;margin-bottom:18px;backdrop-filter:blur(10px)}
label{display:block;margin-bottom:14px;font-size:.85rem;color:var(--muted)}
label span{display:block;margin-bottom:6px;color:var(--text);font-weight:500;font-size:.88rem}
input,textarea,select{
  width:100%;padding:10px 12px;border-radius:8px;border:1px solid var(--stroke);
  background:rgba(0,0,0,.4);color:var(--text);font-family:inherit;font-size:.9rem;
  transition:border-color .2s;
}
input:focus,textarea:focus{border-color:var(--cyan);outline:none}
textarea{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:.82rem;min-height:100px;resize:vertical}
.btn{
  display:inline-flex;align-items:center;justify-content:center;gap:6px;
  padding:10px 20px;border-radius:8px;font-size:.88rem;font-weight:600;
  cursor:pointer;border:none;font-family:inherit;transition:all .2s;text-decoration:none;
}
.btn-primary{background:linear-gradient(120deg,var(--mint),var(--cyan));color:#031018;box-shadow:0 8px 24px -8px rgba(0,255,163,.6)}
.btn-primary:hover{transform:translateY(-1px);box-shadow:0 12px 28px -8px rgba(0,224,255,.8)}
.btn-ghost{background:var(--glass);color:var(--text);border:1px solid var(--stroke)}
.btn-ghost:hover{border-color:rgba(0,224,255,.5)}
.btn-danger{background:rgba(255,77,109,.15);color:var(--red);border:1px solid rgba(255,77,109,.35)}
.btn-danger:hover{background:rgba(255,77,109,.25)}
.btn-row{display:flex;gap:10px;flex-wrap:wrap;align-items:center}
.mg-row{padding:14px;border-radius:12px;background:rgba(0,0,0,.25);border:1px dashed var(--stroke);margin-bottom:10px}
.mg-row-head{display:flex;gap:8px;margin-bottom:10px;flex-wrap:wrap}
.mg-row-head input{flex:1;min-width:200px}
.mg-row-actions{display:flex;justify-content:flex-end;margin-top:8px}
.grid2{display:grid;grid-template-columns:1fr 1fr;gap:14px}
@media(max-width:640px){.grid2{grid-template-columns:1fr}}
.alert{padding:12px 16px;border-radius:10px;margin-bottom:16px;font-size:.88rem;line-height:1.5}
.alert-warn{background:rgba(255,209,102,.1);border:1px solid rgba(255,209,102,.3);color:var(--yellow)}
.alert-ok{background:rgba(0,255,163,.1);border:1px solid rgba(0,255,163,.3);color:var(--mint)}
.alert-err{background:rgba(255,77,109,.1);border:1px solid rgba(255,77,109,.3);color:var(--red)}
.hint{font-size:.78rem;color:var(--muted);margin-top:4px;line-height:1.5}
.hint code{background:rgba(0,224,255,.1);color:var(--cyan);padding:1px 6px;border-radius:4px;font-size:.78rem}
.login-box{max-width:380px;margin:80px auto;padding:32px}
.result{font-family:ui-monospace,Menlo,monospace;font-size:.82rem;white-space:pre-wrap;padding:12px;background:rgba(0,0,0,.4);border-radius:8px;border:1px solid var(--stroke);color:var(--muted);margin-top:10px;min-height:40px}
`;

// ============================================================
// LANDING CSS
// ============================================================
const CSS = `
:root{
  --bg:#050914;--bg-soft:#0a1020;--surface:#0a1225;--surface2:#111b33;
  --cyan:#00e0ff;--mint:#00ffa3;--violet:#7c5cff;
  --text:#e8f0ff;--muted:#7a8aa8;
  --glass:rgba(120,180,255,.045);--stroke:rgba(120,180,255,.12);
  --red:#ff4d6d;--yellow:#ffd166;
}
*{margin:0;padding:0;box-sizing:border-box}
html{scroll-behavior:smooth}
body{
  background:var(--bg);color:var(--text);
  font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;
  overflow-x:hidden;-webkit-font-smoothing:antialiased;line-height:1.5;
}
a{color:var(--cyan)}
.wrap{position:relative;z-index:2;max-width:1240px;margin:0 auto;padding:0 28px}

.cursor,.cursor-dot{
  position:fixed;top:0;left:0;pointer-events:none !important;z-index:9999;
  border-radius:50%;transform:translate(-50%,-50%);will-change:transform;
}
.cursor{width:36px;height:36px;border:1px solid rgba(0,224,255,.8);background:transparent;transition:width .25s,height .25s,background .25s,border-color .25s;}
.cursor-dot{width:5px;height:5px;background:var(--mint)}
.cursor.hover{width:70px;height:70px;background:rgba(0,224,255,.14);border-color:rgba(0,255,163,.9)}
@media (hover:none){.cursor,.cursor-dot{display:none}}

#stars{position:fixed;inset:0;z-index:0;opacity:.85;pointer-events:none}

.aurora{position:fixed;inset:0;z-index:0;overflow:hidden;pointer-events:none;filter:blur(90px);opacity:.5}
.blob{position:absolute;border-radius:50%;animation:float 22s ease-in-out infinite}
.b1{width:46vw;height:46vw;background:var(--cyan);top:-12vw;left:-10vw}
.b2{width:38vw;height:38vw;background:var(--violet);bottom:-14vw;right:-8vw;animation-delay:-7s}
.b3{width:30vw;height:30vw;background:var(--mint);top:38%;left:56%;animation-delay:-13s;opacity:.6}
@keyframes float{
  0%,100%{transform:translate(0,0) scale(1)}
  33%{transform:translate(6vw,-4vw) scale(1.12)}
  66%{transform:translate(-5vw,5vw) scale(.92)}
}

nav.top{position:fixed;top:0;left:0;right:0;z-index:100;transition:background .4s,backdrop-filter .4s,border-color .4s;border-bottom:1px solid transparent;}
nav.top.scrolled{background:rgba(5,9,20,.78);backdrop-filter:blur(18px);border-bottom-color:var(--stroke)}
.nav-inner{max-width:1240px;margin:0 auto;padding:18px 28px;display:flex;align-items:center;justify-content:space-between;}
.logo{display:flex;align-items:center;gap:10px;font-weight:800;font-size:1.3rem;letter-spacing:.16em;}
.logo-mark{width:30px;height:30px;border-radius:9px;background:linear-gradient(140deg,var(--cyan),var(--mint));box-shadow:0 0 20px -4px rgba(0,224,255,.9);display:grid;place-items:center;}
.logo-mark::before{content:'';width:12px;height:14px;background:var(--bg);clip-path:polygon(50% 0,100% 25%,100% 75%,50% 100%,0 75%,0 25%);}
.logo span{background:linear-gradient(100deg,#fff,var(--cyan) 60%,var(--mint));-webkit-background-clip:text;background-clip:text;color:transparent;}
.nav-links{display:flex;gap:32px;list-style:none}
.nav-links a{color:var(--muted);text-decoration:none;font-size:.9rem;letter-spacing:.04em;position:relative;transition:color .3s;}
.nav-links a::after{content:'';position:absolute;left:0;bottom:-6px;width:0;height:1px;background:linear-gradient(90deg,var(--cyan),var(--mint));transition:width .35s cubic-bezier(.65,0,.35,1);}
.nav-links a:hover{color:#fff}
.nav-links a:hover::after{width:100%}
.nav-cta{padding:10px 22px;border-radius:100px;font-size:.85rem;font-weight:600;color:#031018;text-decoration:none;background:linear-gradient(120deg,var(--mint),var(--cyan));transition:box-shadow .4s,transform .3s;border:none;cursor:pointer;font-family:inherit;}
.nav-cta:hover{box-shadow:0 8px 30px -6px rgba(0,255,163,.8);transform:translateY(-2px)}
@media(max-width:880px){.nav-links{display:none}}

.btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;padding:12px 24px;border-radius:100px;font-size:.92rem;font-weight:600;cursor:pointer;border:none;text-decoration:none;font-family:inherit;transition:transform .2s,box-shadow .3s;pointer-events:auto;position:relative;z-index:1;}
.btn-primary{background:linear-gradient(120deg,var(--mint),var(--cyan));color:#031018;box-shadow:0 10px 34px -10px rgba(0,255,163,.85);}
.btn-primary:hover{transform:translateY(-2px);box-shadow:0 16px 40px -10px rgba(0,224,255,.9)}
.btn-ghost{background:var(--glass);color:var(--text);border:1px solid var(--stroke)}
.btn-ghost:hover{border-color:rgba(0,224,255,.5)}

header.hero{min-height:100vh;display:flex;align-items:center;padding:150px 0 100px;position:relative}
.badge{display:inline-flex;align-items:center;gap:10px;padding:7px 16px 7px 10px;border-radius:100px;background:var(--glass);border:1px solid var(--stroke);font-size:.76rem;letter-spacing:.13em;text-transform:uppercase;color:var(--muted);margin-bottom:32px;backdrop-filter:blur(10px);}
.pulse{width:7px;height:7px;border-radius:50%;background:var(--mint);box-shadow:0 0 0 0 rgba(0,255,163,.7);animation:pulse 2s infinite;}
@keyframes pulse{70%{box-shadow:0 0 0 12px rgba(0,255,163,0)}100%{box-shadow:0 0 0 0 rgba(0,255,163,0)}}
h1.title{font-weight:800;font-size:clamp(2.8rem,7.6vw,6.4rem);line-height:.95;letter-spacing:-.035em;margin-bottom:28px;}
h1.title .line{display:block;overflow:hidden}
h1.title .line > span{display:block;transform:translateY(110%);animation:rise 1.1s cubic-bezier(.16,1,.3,1) forwards}
h1.title .line:nth-child(2) > span{animation-delay:.12s}
h1.title .line:nth-child(3) > span{animation-delay:.24s}
@keyframes rise{to{transform:translateY(0)}}
.grad{background:linear-gradient(100deg,var(--cyan) 0%,#a6f6ff 45%,var(--mint) 100%);background-size:220% 100%;-webkit-background-clip:text;background-clip:text;color:transparent;animation:shift 7s ease-in-out infinite;}
@keyframes shift{0%,100%{background-position:0% 50%}50%{background-position:100% 50%}}
.hero-sub{max-width:620px;font-size:1.06rem;line-height:1.75;color:var(--muted);margin-bottom:8px;opacity:0;animation:fadeUp .9s .5s cubic-bezier(.16,1,.3,1) forwards;}
@keyframes fadeUp{from{opacity:0;transform:translateY(24px)}to{opacity:1;transform:translateY(0)}}

.link-box{margin:36px 0 44px;padding:26px 28px;border-radius:22px;background:linear-gradient(160deg,rgba(0,224,255,.09),rgba(0,255,163,.03));border:1px solid rgba(0,224,255,.25);backdrop-filter:blur(16px);box-shadow:0 24px 60px -24px rgba(0,224,255,.4);max-width:720px;animation:fadeUp .9s .65s cubic-bezier(.16,1,.3,1) both;}
.link-box-header{display:flex;justify-content:space-between;align-items:center;gap:16px;margin-bottom:20px;flex-wrap:wrap;}
.link-box-title{font-weight:700;font-size:1.05rem;letter-spacing:-.01em}
.link-box-badge{padding:4px 12px;border-radius:100px;font-size:.7rem;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#031018;background:linear-gradient(120deg,var(--mint),var(--cyan));}
.link-box-content{display:grid;grid-template-columns:auto 1fr;gap:24px;align-items:center;}
@media (max-width:640px){.link-box-content{grid-template-columns:1fr}}
.qr-mini{padding:10px;background:#fff;border-radius:14px;width:140px;height:140px;display:grid;place-items:center;font-size:2rem;flex-shrink:0;}
.qr-mini svg{display:block;max-width:100%;height:auto}
.link-box-hint{color:var(--muted);font-size:.88rem;line-height:1.6;margin-top:12px}
.link-box-hint b{color:var(--cyan);font-weight:600}

.sub-url{display:flex;gap:8px}
.sub-url input{flex:1;min-width:0;padding:12px 14px;border-radius:10px;border:1px solid var(--stroke);background:rgba(0,0,0,.45);color:var(--text);font-family:monospace;font-size:.88rem;}
.copy-btn{padding:0 18px;border-radius:10px;border:1px solid rgba(0,224,255,.35);background:rgba(0,224,255,.12);color:var(--cyan);cursor:pointer;font-weight:600;font-size:.85rem;transition:background .2s,color .2s;font-family:inherit;pointer-events:auto;white-space:nowrap;}
.copy-btn:hover{background:rgba(0,224,255,.22)}

.trust{display:flex;gap:34px;flex-wrap:wrap;margin-top:56px;opacity:0;animation:fadeUp .9s .85s cubic-bezier(.16,1,.3,1) forwards;}
.trust-item{display:flex;align-items:center;gap:10px;color:var(--muted);font-size:.86rem}
.trust-item svg{width:18px;height:18px;flex-shrink:0;color:var(--mint)}

section{padding:120px 0;position:relative}
.sec-head{margin-bottom:64px;max-width:680px}
.sec-tag{font-size:.76rem;letter-spacing:.28em;text-transform:uppercase;color:var(--mint);margin-bottom:16px;display:block;}
h2.sec{font-weight:800;font-size:clamp(2rem,4.6vw,3.4rem);line-height:1.05;letter-spacing:-.025em}
.sec-head p{color:var(--muted);margin-top:20px;line-height:1.75;font-size:1rem;max-width:560px}

.reveal{opacity:0;transform:translateY(44px);transition:opacity .9s cubic-bezier(.16,1,.3,1),transform .9s cubic-bezier(.16,1,.3,1)}
.reveal.in{opacity:1;transform:none}

.servers-note{display:flex;align-items:center;gap:12px;flex-wrap:wrap;padding:14px 22px;border-radius:100px;background:var(--glass);border:1px solid var(--stroke);font-size:.85rem;color:var(--muted);margin-bottom:40px;width:fit-content;backdrop-filter:blur(10px);}
.servers-note strong{color:var(--mint);font-weight:600}
.servers-note .dot{width:8px;height:8px;border-radius:50%;background:var(--mint);box-shadow:0 0 12px var(--mint)}
.servers-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:22px}
.server-card{position:relative;padding:32px 28px;border-radius:22px;background:var(--glass);border:1px solid var(--stroke);backdrop-filter:blur(16px);transition:transform .25s ease-out,border-color .4s,box-shadow .4s;transform-style:preserve-3d;overflow:hidden;}
.server-card::before{content:'';position:absolute;inset:0;border-radius:22px;opacity:0;background:radial-gradient(420px circle at var(--mx,50%) var(--my,50%),rgba(0,224,255,.18),transparent 60%);transition:opacity .4s;pointer-events:none;}
.server-card:hover::before{opacity:1}
.server-card:hover{border-color:rgba(0,224,255,.5);box-shadow:0 26px 60px -24px rgba(0,224,255,.5)}
.server-flag{font-size:2.4rem;line-height:1;margin-bottom:16px}
.server-name{font-weight:700;font-size:1.35rem;margin-bottom:24px;letter-spacing:-.01em;display:flex;align-items:center;flex-wrap:wrap;gap:10px}
.server-tag{display:inline-block;padding:3px 10px;font-size:.66rem;font-weight:700;letter-spacing:.06em;border-radius:100px;vertical-align:middle;color:var(--mint);background:rgba(0,255,163,.1);border:1px solid rgba(0,255,163,.28);}
.server-stats{display:grid;gap:12px}
.server-stat{display:flex;justify-content:space-between;align-items:center;padding:11px 14px;border-radius:11px;background:rgba(255,255,255,.025);border:1px solid rgba(255,255,255,.04);font-size:.86rem;}
.server-stat span{color:var(--muted);letter-spacing:.03em}
.server-stat b{color:var(--text);font-weight:600;font-variant-numeric:tabular-nums}
.server-stat .ping-val{color:var(--mint)}
.server-stat .proto{color:var(--cyan);letter-spacing:.06em}
.live-dot{display:inline-block;width:6px;height:6px;border-radius:50%;background:var(--mint);margin-right:6px;box-shadow:0 0 8px var(--mint);animation:blink 1.6s ease-in-out infinite;vertical-align:middle;}
@keyframes blink{0%,100%{opacity:1}50%{opacity:.35}}

.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:22px}
.card{position:relative;padding:38px 30px;border-radius:22px;background:var(--glass);border:1px solid var(--stroke);backdrop-filter:blur(16px);transition:transform .2s ease-out,border-color .4s,box-shadow .4s;transform-style:preserve-3d;overflow:hidden;}
.card::before{content:'';position:absolute;inset:0;border-radius:22px;opacity:0;background:radial-gradient(420px circle at var(--mx,50%) var(--my,50%),rgba(124,92,255,.22),transparent 60%);transition:opacity .4s;pointer-events:none;}
.card:hover::before{opacity:1}
.card:hover{border-color:rgba(124,92,255,.5);box-shadow:0 26px 60px -24px rgba(124,92,255,.55)}
.card-icon{width:52px;height:52px;border-radius:15px;display:grid;place-items:center;font-size:1.4rem;margin-bottom:24px;background:linear-gradient(140deg,rgba(0,224,255,.24),rgba(0,255,163,.14));border:1px solid rgba(120,180,255,.14);}
.card h3{font-size:1.18rem;margin-bottom:12px;letter-spacing:-.01em;font-weight:600}
.card p{color:var(--muted);font-size:.94rem;line-height:1.7}
.card p b{color:var(--cyan);font-weight:600}

.steps{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:30px}
.step{position:relative;padding:32px 26px 30px;border-radius:22px;background:var(--glass);border:1px solid var(--stroke);backdrop-filter:blur(14px);}
.step-num{width:44px;height:44px;border-radius:13px;display:grid;place-items:center;font-weight:800;font-size:1.15rem;color:#031018;margin-bottom:22px;background:linear-gradient(140deg,var(--mint),var(--cyan));box-shadow:0 0 24px -6px rgba(0,255,163,.8);}
.step h3{font-size:1.15rem;margin-bottom:10px;font-weight:600}
.step p{color:var(--muted);font-size:.92rem;line-height:1.65}

.security-block{position:relative;padding:80px 60px;border-radius:32px;background:linear-gradient(160deg,rgba(0,224,255,.08),rgba(124,92,255,.06));border:1px solid rgba(120,180,255,.14);overflow:hidden;display:grid;grid-template-columns:1.2fr 1fr;gap:56px;align-items:center;}
@media(max-width:860px){.security-block{grid-template-columns:1fr;padding:56px 32px;gap:36px}}
.security-block::after{content:'';position:absolute;width:520px;height:520px;border-radius:50%;background:radial-gradient(circle,rgba(0,224,255,.28),transparent 70%);top:-260px;right:-160px;filter:blur(60px);pointer-events:none;}
.security-block h2{position:relative}
.security-block p{color:var(--muted);margin-top:20px;line-height:1.8;font-size:1rem;position:relative}
.sec-list{list-style:none;display:grid;gap:16px;position:relative}
.sec-list li{display:flex;gap:14px;align-items:flex-start;color:var(--muted);font-size:.94rem;line-height:1.6}
.sec-list li::before{content:'✦';color:var(--mint);font-size:.9rem;margin-top:2px;text-shadow:0 0 14px var(--mint)}
.sec-list b{color:var(--text);font-weight:600}

.reviews{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:22px}
.review{padding:34px 28px;border-radius:22px;background:var(--glass);border:1px solid var(--stroke);backdrop-filter:blur(14px);transition:transform .3s,border-color .4s;}
.review:hover{transform:translateY(-4px);border-color:rgba(0,224,255,.35)}
.review-stars{color:var(--mint);letter-spacing:3px;font-size:.9rem;margin-bottom:16px}
.review p{color:var(--muted);font-size:.94rem;line-height:1.7;margin-bottom:22px}
.review-author{display:flex;align-items:center;gap:12px}
.review-avatar{width:40px;height:40px;border-radius:50%;display:grid;place-items:center;font-weight:800;font-size:.9rem;color:#031018;background:linear-gradient(140deg,var(--cyan),var(--mint));}
.review-name{font-weight:600;font-size:.9rem}
.review-role{color:var(--muted);font-size:.78rem}

.faq{max-width:820px;margin:0 auto;display:grid;gap:12px}
.faq-item{border-radius:16px;background:var(--glass);border:1px solid var(--stroke);overflow:hidden;transition:border-color .3s,background .3s;}
.faq-item.open{border-color:rgba(0,224,255,.4);background:rgba(0,224,255,.04)}
.faq-q{padding:22px 26px;cursor:pointer;display:flex;justify-content:space-between;align-items:center;gap:20px;font-weight:500;font-size:.98rem;transition:color .3s;pointer-events:auto;}
.faq-q:hover{color:var(--cyan)}
.faq-icon{width:26px;height:26px;border-radius:50%;flex-shrink:0;display:grid;place-items:center;background:rgba(120,180,255,.08);border:1px solid var(--stroke);font-size:1rem;line-height:1;transition:transform .4s,background .3s;}
.faq-item.open .faq-icon{transform:rotate(45deg);background:rgba(0,255,163,.15);color:var(--mint)}
.faq-a{max-height:0;overflow:hidden;transition:max-height .4s cubic-bezier(.65,0,.35,1)}
.faq-a-inner{padding:0 26px 24px;color:var(--muted);line-height:1.75;font-size:.92rem}

.cta-box{position:relative;text-align:center;padding:90px 40px;border-radius:32px;background:linear-gradient(160deg,rgba(0,224,255,.14),rgba(0,255,163,.06));border:1px solid rgba(120,180,255,.16);overflow:hidden;}
.cta-box::after{content:'';position:absolute;width:520px;height:520px;border-radius:50%;background:radial-gradient(circle,rgba(0,255,163,.32),transparent 70%);top:-260px;left:50%;transform:translateX(-50%);filter:blur(50px);pointer-events:none;}
.cta-box h2{margin-bottom:22px;position:relative}
.cta-box p{color:var(--muted);max-width:460px;margin:0 auto 40px;line-height:1.7;position:relative}
.cta-box .btn{position:relative}

footer{border-top:1px solid var(--stroke);padding:56px 0 40px;position:relative;z-index:2}
.foot-inner{display:flex;justify-content:space-between;align-items:center;gap:30px;flex-wrap:wrap}
.foot-inner p{color:var(--muted);font-size:.86rem}
.socials{display:flex;gap:14px}
.socials a{width:40px;height:40px;border-radius:50%;display:grid;place-items:center;border:1px solid var(--stroke);color:var(--muted);text-decoration:none;font-size:.8rem;transition:all .35s;}
.socials a:hover{color:#fff;border-color:var(--cyan);background:rgba(0,224,255,.15);transform:translateY(-3px)}

::-webkit-scrollbar{width:9px}
::-webkit-scrollbar-track{background:#050914}
::-webkit-scrollbar-thumb{background:linear-gradient(var(--cyan),var(--mint));border-radius:10px}

@media(max-width:720px){
  section{padding:80px 0}
  .cta-box{padding:60px 24px}
  .security-block{padding:44px 26px}
  .link-box{padding:22px 20px}
}
`;
