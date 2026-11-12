// ============================================================
// WLVPN — Free & VIP VPN Service (Cloudflare Worker)
// ============================================================

const DEFAULT_HOST_MAP = [
  { host: "e308b5t.fi8.h1clayd.click",  remarks: "🇫🇮 Финляндия #1",  category: "Нейросети",   desc: "ChatGPT, Claude, Midjourney", tier: "free", hidden: false },
  { host: "52ee46g.fi8.h1clayd.click",  remarks: "🇫🇮 Финляндия #2",  category: "Нейросети",   desc: "Для работы с ИИ и нейросетями", tier: "vip", hidden: false },
  { host: "6b83b0x.fi8.h1clayd.click",  remarks: "🇫🇮 Финляндия #3",  category: "Нейросети",   desc: "Быстрый доступ к AI-сервисам", tier: "vip", hidden: false },
  { host: "5f9abbt.de21.h1clayd.click", remarks: "🇩🇪 Германия #1",   category: "Скоростной",  desc: "YouTube 4K без буферизации", tier: "both", hidden: false },
  { host: "403e8ag.de21.h1clayd.click", remarks: "🇩🇪 Германия #2",   category: "Скоростной",  desc: "Для игр и голосовых чатов", tier: "vip", hidden: false },
  { host: "e1efc1x.de21.h1clayd.click", remarks: "🇩🇪 Германия #3",   category: "Скоростной",  desc: "Торренты и большие файлы", tier: "vip", hidden: false },
  { host: "defc63t.nl4.h1clayd.click",  remarks: "🇳🇱 Нидерланды #1", category: "Скоростной",  desc: "Универсальный — всё летает", tier: "both", hidden: false },
  { host: "fca7d7g.nl4.h1clayd.click",  remarks: "🇳🇱 Нидерланды #2", category: "Скоростной",  desc: "Отличный пинг для шутеров", tier: "vip", hidden: false },
  { host: "b3a336x.nl4.h1clayd.click",  remarks: "🇳🇱 Нидерланды #3", category: "Нейросети",   desc: "ChatGPT без преград", tier: "vip", hidden: false },
  { host: "e900bbt.es7.h1clayd.click",  remarks: "🇪🇸 Испания #1",    category: "Нейросети",   desc: "Gemini, Claude, Perplexity", tier: "vip", hidden: false },
  { host: "c190afg.es7.h1clayd.click",  remarks: "🇪🇸 Испания #2",    category: "Нейросети",   desc: "Стабильно для работы с ИИ", tier: "vip", hidden: false },
  { host: "7c5fbcx.es7.h1clayd.click",  remarks: "🇪🇸 Испания #3",    category: "Нейросети",   desc: "Доступ к зарубежным AI", tier: "vip", hidden: false },
  { host: "c84a94t.pl6.h1clayd.click",  remarks: "🇵🇱 Польша #1",     category: "YouTube",     desc: "Без рекламы и блокировок", tier: "both", hidden: false },
  { host: "0e6251g.pl6.h1clayd.click",  remarks: "🇵🇱 Польша #2",     category: "Нейросети",   desc: "Для соцсетей и нейросетей", tier: "vip", hidden: false },
  { host: "bd5c13x.pl6.h1clayd.click",  remarks: "🇵🇱 Польша #3",     category: "Нейросети",   desc: "Быстрый вход в AI-сервисы", tier: "vip", hidden: false }
];

const DEFAULT_CONFIG = {
  mainSourceUrl: "https://newsub.chkav-vpn.space/9zfbEsqma0tkNfc2",
  mobileSourceUrl: "https://sub.chkav-vpn.space/?id=90f7c8dd85644850aa0e629cfb0e877c",
  hwid: "1BEF4F22-1340-8D05-2641-3CC6D7CC1B27",
  vipToken: "secret123",
  profileTitle: "wlvpn",
  profileUpdateInterval: "6",
  announce: "wlvpn — бесплатный VPN сервис.",
  fallbackName: "🛠 Ведутся технические работы",
  fallbackDescription: "WLVPN · Скоро вернёмся",
  balancerName: "🎯 Авто - самый быстрый",
  balancerDescription: "WLVPN · Лучше выбрать его",
  balancerHidden: false,
  mobileBalancerName: "🪖 Обход глушилок",
  mobileBalancerDescription: "WLVPN · Работает при белых списках",
  mobileHidden: false,
  hostMap: JSON.parse(JSON.stringify(DEFAULT_HOST_MAP)),
  mergeGroups: [],
  serverOrder: [],
  presets: [],
  adminPassword: "wlvpn-admin"
};

// ============================================================
// UTILS & VIP TRAFFIC GENERATOR
// ============================================================
function isVpnClient(ua) { return /incy|happ|v2ray|clash|sing-box|nekobox|stash|streisand|karing|matsuri|shadowrocket|nekoray|v2rayng|ko*ng/i.test(ua); }
function isBrowser(ua) { if (!ua) return false; if (isVpnClient(ua)) return false; return /mozilla|chrome|safari|firefox|edg|opera|msie|trident/i.test(ua); }
function htmlResponse(content, status = 200) { return new Response(content, { status, headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" } }); }
function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
function b64decode(str) { try { let s = str.replace(/-/g, '+').replace(/_/g, '/'); while (s.length % 4) s += '='; return atob(s); } catch (_) { return null; } }
function normalizeUserinfo(raw) {
  if (!raw) return null;
  const up = (raw.match(/upload=(\d+)/i) || [])[1] || "0";
  const down = (raw.match(/download=(\d+)/i) || [])[1] || "0";
  const total = (raw.match(/total=(\d+)/i) || [])[1] || "0";
  return `upload=${up}; download=${down}; total=${total}; expire=0`;
}
function parseSubscriptionBody(txt) {
  try { const arr = JSON.parse(txt); if (Array.isArray(arr) && arr.length > 0) return { format: "json", data: arr }; } catch (_) {}
  const dec1 = b64decode(txt.trim());
  if (dec1) {
    try { const arr = JSON.parse(dec1); if (Array.isArray(arr) && arr.length > 0) return { format: "json", data: arr }; } catch (_) {}
    if (/^vless:\/\//m.test(dec1)) return { format: "vless", data: dec1 };
  }
  if (/^vless:\/\//m.test(txt)) return { format: "vless", data: txt };
  return null;
}
function getServerHost(s) {
  if (!s || !s.outbounds) return null;
  const proxy = s.outbounds.find(o => o.tag === "proxy" || (o.tag && o.tag.startsWith("proxy-")) || ["vless", "vmess", "trojan", "shadowsocks"].includes(o.protocol));
  if (!proxy) return null;
  if (proxy.settings?.vnext?.[0]?.address) return proxy.settings.vnext[0].address;
  if (proxy.settings?.servers?.[0]?.address) return proxy.settings.servers[0].address;
  return null;
}

// Генератор фейкового трафика для VIP
function getVipUserinfo() {
  const now = new Date();
  const dayOfYear = Math.floor((now - new Date(now.getFullYear(), 0, 0)) / 86400000);
  
  // Псевдослучайный прирост в день (от 0.1 до 2 ГБ)
  let totalGb = 0;
  for (let i = 0; i < dayOfYear; i++) {
    // Синусоида для красивого графика потребления
    totalGb += 0.1 + (Math.abs(Math.sin(i * 137.5)) * 1.9); 
  }
  
  const totalLimitGb = 1024; // 1 ТБ лимит
  const downloadBytes = Math.floor(totalGb * 1024 * 1024 * 1024);
  const uploadBytes = Math.floor(downloadBytes * 0.15); // аплоад 15% от скачивания
  const totalBytes = totalLimitGb * 1024 * 1024 * 1024;
  
  // Срок действия: 1 января 2027 года
  const expireTs = Math.floor(new Date("2027-01-01T23:59:59Z").getTime() / 1000);
  
  return `upload=${uploadBytes}; download=${downloadBytes}; total=${totalBytes}; expire=${expireTs}`;
}

// ============================================================
// KV CONFIG
// ============================================================
async function loadConfig(env) {
  try {
    const raw = await env.KV.get("config:main");
    if (raw) {
      const config = JSON.parse(raw);
      if (!Array.isArray(config.hostMap)) config.hostMap = Object.entries(config.hostMap || {}).map(([h, d]) => ({ host: h, tier: 'free', hidden: false, ...d }));
      config.hostMap.forEach(s => { if (!s.tier) s.tier = 'free'; });
      if (!Array.isArray(config.presets)) config.presets = [];
      if (!Array.isArray(config.serverOrder)) config.serverOrder = [];
      return Object.assign({}, DEFAULT_CONFIG, config);
    }
  } catch (_) {}
  return Object.assign({}, DEFAULT_CONFIG);
}
async function saveConfig(env, config) { await env.KV.put("config:main", JSON.stringify(config)); }

// ============================================================
// AUTH
// ============================================================
async function hashPassword(pw) {
  const data = new TextEncoder().encode(pw + "|wlvpn-admin-v1");
  const buf = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
}
function timingSafeEqual(a, b) { if (a.length !== b.length) return false; let diff = 0; for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i); return diff === 0; }
async function isAuthed(request, config) {
  const cookie = request.headers.get("Cookie") || "";
  const m = cookie.match(/wlvpn_auth=([a-f0-9]+)/);
  if (!m) return false;
  return timingSafeEqual(m[1], await hashPassword(config.adminPassword));
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
    const res = await fetch(config.mobileSourceUrl, { headers: { "User-Agent": "INCY/3.9.7/android", "Accept": "*/*" }, cf: { cacheTtl: 0 } });
    if (!res.ok) return null;
    const txt = await res.text();
    const parsed = parseSubscriptionBody(txt);
    if (!parsed) return null;
    let outbounds = [];
    if (parsed.format === "json") {
      const data = parsed.data;
      if (Array.isArray(data)) {
        data.forEach(cfg => { if (cfg.outbounds) cfg.outbounds.forEach(ob => { if (["vless", "vmess", "trojan"].includes(ob.protocol)) { ob.tag = `mobile-${outbounds.length + 1}`; outbounds.push(ob); } }); });
      } else if (data.outbounds) {
        data.outbounds.forEach(ob => { if (["vless", "vmess", "trojan"].includes(ob.protocol)) { ob.tag = `mobile-${outbounds.length + 1}`; outbounds.push(ob); } });
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
            "streamSettings": { "network": params.get("type") || "tcp", "security": "reality", "realitySettings": { "serverName": params.get("sni") || url.hostname, "publicKey": params.get("pbk") || "", "shortId": params.get("sid") || "", "fingerprint": params.get("fp") || "chrome" } }
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
// MERGE & SUBSCRIPTION
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
    routing: { rules: [{ type: "field", network: "tcp,udp", balancerTag: safeId }], balancers: [{ tag: safeId, selector: [prefix], strategy: { type: "leastLoad", settings: { maxRTT: "1s", expected: 1, tolerance: 0.15 } }, fallbackTag: outbounds[0].tag }], domainStrategy: "AsIs" },
    inbounds: [{ tag: "socks", port: 10808, listen: "127.0.0.1", protocol: "socks", settings: { udp: true, auth: "noauth" } }],
    outbounds,
    remarks: group.name,
    meta: { serverDescription: group.description },
    burstObservatory: { subjectSelector: [prefix], pingConfig: { destination: "https://connectivitycheck.gstatic.com/generate_204", interval: "1m", sampling: 10, timeout: "5s", httpMethod: "HEAD" } }
  };
}

async function serveSubscription(env, url) {
  const config = await loadConfig(env);
  const isVip = url.pathname.includes("/vip");
  const token = url.searchParams.get("token");

  if (isVip && token !== config.vipToken) {
    return new Response("Unauthorized: Invalid VIP token", { status: 401 });
  }

  const chkav = await fetchChkav(config);
  
  // Подставляем трафик: либо от chkav (FREE), либо фейковый (VIP)
  const userInfo = isVip ? getVipUserinfo() : (chkav.userInfo || "upload=0; download=0; total=0; expire=0");
  
  let finalServers = [];

  if (chkav.format === "json" && Array.isArray(chkav.data) && chkav.data.length > 0) {
    const hostMapObj = {};
    for (const item of (config.hostMap || [])) { if (item.host) hostMapObj[item.host] = item; }

    let allServers = chkav.data.map(s => {
      if (s.remarks && (s.remarks.includes("поддержите") || s.remarks.includes("владельца"))) return null;
      if (s.meta && s.meta.serverDescription && s.meta.serverDescription.includes("2202206778971874")) return null;
      return s;
    }).filter(Boolean);

    allServers = allServers.map(s => {
      const isBalancer = (s.routing && Array.isArray(s.routing.balancers) && s.routing.balancers.length > 0) || (s.routing && Array.isArray(s.routing.rules) && s.routing.rules.some(r => r.balancerTag));
      
      if (isBalancer) {
        if (config.balancerHidden) return null;
        s.remarks = config.balancerName;
        s.meta = Object.assign({}, s.meta || {}, { serverDescription: config.balancerDescription });
        s.__token = '__balancer__';
        return s;
      }

      const host = getServerHost(s);
      if (host && hostMapObj[host]) {
        const h = hostMapObj[host];
        if (h.hidden) return null;
        
        const sTier = h.tier || 'free';
        const allowed = isVip ? (sTier === 'vip' || sTier === 'both') : (sTier === 'free' || sTier === 'both');
        if (!allowed) return null;

        s.remarks = h.remarks;
        s.meta = Object.assign({}, s.meta || {}, { serverDescription: "WLVPN · " + h.category });
        s.__token = host;
      } else {
        s.meta = Object.assign({}, s.meta || {}, { serverDescription: "WLVPN" });
        s.__token = host ? 'host_' + host : 'unknown_' + Math.random().toString(36).slice(2);
      }
      return s;
    }).filter(Boolean);

    const consumed = new Set();
    const mergedBalancers = [];

    for (const group of (config.mergeGroups || [])) {
      if (!group || !Array.isArray(group.matchNames) || group.matchNames.length === 0) continue;
      const matched = [];
      allServers.forEach((s, idx) => {
        if (consumed.has(idx)) return;
        if (s.remarks && group.matchNames.includes(s.remarks)) { matched.push(s); consumed.add(idx); }
      });
      if (matched.length === 0) continue;
      const balancer = buildMergedBalancer(group, matched);
      if (balancer) { balancer.__token = '__merge__' + group.id; mergedBalancers.push(balancer); }
    }

    finalServers = allServers.filter((_, i) => !consumed.has(i));
    finalServers.push(...mergedBalancers);

  } else {
    finalServers = [{ "dns": { "servers": ["1.1.1.1"] }, "routing": { "domainStrategy": "AsIs" }, "inbounds": [{ "tag": "socks", "port": 10808, "protocol": "socks" }], "outbounds": [{ "tag": "block", "protocol": "blackhole" }], "remarks": config.fallbackName, "meta": { "serverDescription": config.fallbackDescription }, "__token": "fallback" }];
  }

  if (!config.mobileHidden) {
    const mobileBalancer = await fetchMobileBalancer(config);
    if (mobileBalancer) {
      mobileBalancer.remarks = config.mobileBalancerName;
      mobileBalancer.meta = Object.assign({}, mobileBalancer.meta || {}, { serverDescription: config.mobileBalancerDescription });
      mobileBalancer.__token = "__mobile__";
      finalServers.push(mobileBalancer);
    }
  }

  const order = config.serverOrder || [];
  finalServers.forEach((s, i) => { s.__origIndex = i; });
  finalServers.sort((a, b) => {
    let ia = order.indexOf(a.__token), ib = order.indexOf(b.__token);
    if (ia === -1) ia = 100000 + a.__origIndex;
    if (ib === -1) ib = 100000 + b.__origIndex;
    return ia - ib;
  });
  finalServers.forEach(s => { delete s.__token; delete s.__origIndex; delete s.__hidden; });

  const title = isVip ? "WLVPN · VIP" : config.profileTitle;

  return new Response(JSON.stringify(finalServers, null, 2), {
    headers: { 
      "Content-Type": "application/json; charset=utf-8", 
      "Profile-Title": title, 
      "Profile-Update-Interval": config.profileUpdateInterval, 
      "Subscription-Userinfo": userInfo, 
      "announce": config.announce, 
      "Cache-Control": "no-cache", 
      "Access-Control-Allow-Origin": "*" 
    }
  });
}

// ============================================================
// ADMIN
// ============================================================
async function handleAdmin(request, url, env) {
  const config = await loadConfig(env);
  const method = request.method, path = url.pathname;

  if (method === "POST" && path === "/admin/login") {
    const form = await request.formData();
    if (String(form.get("password") || "") === config.adminPassword) {
      const token = await hashPassword(config.adminPassword);
      return new Response(null, { status: 302, headers: { "Location": "/admin", "Set-Cookie": `wlvpn_auth=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=604800` } });
    }
    return htmlResponse(renderAdminLogin("Неверный пароль"), 401);
  }
  if (method === "POST" && path === "/admin/logout") return new Response(null, { status: 302, headers: { "Location": "/admin", "Set-Cookie": "wlvpn_auth=; Path=/; Max-Age=0" } });

  if (!(await isAuthed(request, config))) return htmlResponse(renderAdminLogin());

  if (method === "POST" && path === "/admin/save") {
    const form = await request.formData();
    const newConfig = { ...config, hostMap: [], mergeGroups: [] };
    
    ["mainSourceUrl", "mobileSourceUrl", "hwid", "vipToken", "profileTitle", "profileUpdateInterval", "announce", "fallbackName", "fallbackDescription", "balancerName", "balancerDescription", "mobileBalancerName", "mobileBalancerDescription"].forEach(k => {
      if (form.has(k)) newConfig[k] = String(form.get(k)).trim();
    });
    newConfig.balancerHidden = form.get("balancerHidden") === "on";
    newConfig.mobileHidden = form.get("mobileHidden") === "on";

    const hm_hosts = form.getAll("hm_host[]"), hm_remarks = form.getAll("hm_remarks[]"), hm_categories = form.getAll("hm_category[]"), hm_descs = form.getAll("hm_desc[]"), hm_tiers = form.getAll("hm_tier[]");
    const hiddenHostsSet = new Set(String(form.get("hiddenHosts") || "").split(",").map(s => s.trim()).filter(Boolean));
    for (let i = 0; i < hm_hosts.length; i++) {
      if (!hm_hosts[i].trim()) continue;
      newConfig.hostMap.push({ host: hm_hosts[i].trim(), remarks: hm_remarks[i].trim(), category: hm_categories[i].trim(), desc: (hm_descs[i]||"").trim(), tier: hm_tiers[i] || 'free', hidden: hiddenHostsSet.has(hm_hosts[i].trim()) });
    }

    const mg_ids = form.getAll("mg_id[]"), mg_names = form.getAll("mg_name[]"), mg_descriptions = form.getAll("mg_description[]");
    for (let i = 0; i < mg_names.length; i++) {
      if (!mg_names[i].trim()) continue;
      const id = mg_ids[i].trim(), matchNames = form.getAll(`mg_match_${id}[]`);
      if (matchNames.length > 0) newConfig.mergeGroups.push({ id, name: mg_names[i].trim(), description: mg_descriptions[i].trim() || ("WLVPN · " + mg_names[i].trim()), matchNames });
    }

    const orderTokens = String(form.get("serverOrder") || "").split(",").map(s => s.trim()).filter(Boolean);
    const validTokens = new Set(['__balancer__', '__mobile__', ...newConfig.hostMap.map(i => i.host), ...newConfig.mergeGroups.map(g => '__merge__' + g.id)]);
    newConfig.serverOrder = orderTokens.filter(t => validTokens.has(t));

    if (form.get("newPassword")) newConfig.adminPassword = String(form.get("newPassword")).trim();
    const presetsRaw = form.get("presetsRaw");
    if (presetsRaw) { try { newConfig.presets = JSON.parse(presetsRaw); } catch(_) {} }

    await saveConfig(env, newConfig);
    const headers = { "Location": "/admin?saved=1" };
    if (newConfig.adminPassword !== config.adminPassword) headers["Set-Cookie"] = `wlvpn_auth=${await hashPassword(newConfig.adminPassword)}; Path=/; HttpOnly; SameSite=Strict; Max-Age=604800`;
    return new Response(null, { status: 302, headers });
  }

  return htmlResponse(renderAdminPanel(config, url));
}

function renderAdminLogin(error) {
  return `<!doctype html><html><head><style>${ADMIN_CSS}</style></head><body><div class="login-box card"><h2>WLVPN Admin</h2>${error ? `<div class="alert alert-err">${esc(error)}</div>` : ""}<form method="POST" action="/admin/login"><label><span>Пароль</span><input type="password" name="password" autofocus required></label><button type="submit" class="btn btn-primary" style="width:100%">Войти</button></form></div></body></html>`;
}

function renderAdminPanel(config, url) {
  const saved = url.searchParams.get("saved");
  const pwdIsDefault = config.adminPassword === "wlvpn-admin";

  const hmRows = (config.hostMap || []).map(s => `
    <div class="host-row" style="display:flex; gap:8px; margin-bottom:8px; align-items:center; ${s.hidden ? 'opacity:0.55' : ''}">
      <input name="hm_host[]" value="${esc(s.host)}" placeholder="host" style="flex:1.5">
      <input name="hm_remarks[]" value="${esc(s.remarks)}" placeholder="Название" style="flex:1.5">
      <input name="hm_category[]" value="${esc(s.category)}" placeholder="Категория" style="flex:1">
      <input name="hm_desc[]" value="${esc(s.desc)}" placeholder="Описание (1 строка)" style="flex:2">
      <select name="hm_tier[]" style="width:100px; padding:8px; border-radius:8px; background:rgba(0,0,0,0.5); color:#fff; border:1px solid var(--stroke);">
        <option value="free" ${s.tier === 'free' ? 'selected' : ''}>Free</option>
        <option value="vip" ${s.tier === 'vip' ? 'selected' : ''}>VIP</option>
        <option value="both" ${s.tier === 'both' ? 'selected' : ''}>Оба</option>
      </select>
      <label class="hm-hide-toggle" title="Скрыть"><input type="checkbox" name="hm_hidden_cb" ${s.hidden ? 'checked' : ''}><span>✕</span></label>
      <button type="button" class="btn btn-danger" style="padding:8px 12px" onclick="this.closest('.host-row').remove()">Удалить</button>
    </div>
  `).join('');

  const mgRows = (config.mergeGroups || []).map(g => {
    const checks = (config.hostMap || []).map(s => s.remarks).filter(Boolean).map(r => `
      <label style="display:inline-flex; align-items:center; gap:6px; margin-right:16px; font-size:0.85rem; color:var(--text); margin-bottom:6px;">
        <input type="checkbox" name="mg_match_${g.id}[]" value="${esc(r)}" ${g.matchNames.includes(r) ? 'checked' : ''}> ${esc(r)}
      </label>
    `).join('');
    return `
      <details class="mg-row" data-id="${esc(g.id)}">
        <summary><span>${esc(g.name)}</span><button type="button" class="btn btn-danger btn-sm" onclick="event.preventDefault(); this.closest('.mg-row').remove()">✕</button></summary>
        <div class="mg-row-content">
          <input type="hidden" name="mg_id[]" value="${esc(g.id)}">
          <div class="mg-row-head"><input name="mg_name[]" placeholder="Название" value="${esc(g.name)}"><input name="mg_description[]" placeholder="Описание" value="${esc(g.description)}"></div>
          <div style="margin:10px 0;"><span style="display:block; font-size:0.8rem; color:var(--muted); margin-bottom:6px;">Сервера:</span><div class="checkbox-group">${checks}</div></div>
        </div>
      </details>`;
  }).join('');

  const allTokens = [], tokenLabels = {};
  if (!config.balancerHidden) { allTokens.push('__balancer__'); tokenLabels['__balancer__'] = config.balancerName; }
  if (!config.mobileHidden) { allTokens.push('__mobile__'); tokenLabels['__mobile__'] = config.mobileBalancerName; }
  (config.hostMap || []).forEach(item => { if (item.host && !item.hidden) { allTokens.push(item.host); tokenLabels[item.host] = item.remarks || item.host; } });
  (config.mergeGroups || []).forEach(g => { allTokens.push('__merge__' + g.id); tokenLabels['__merge__' + g.id] = g.name; });

  let order = (config.serverOrder || []).filter(t => allTokens.includes(t));
  allTokens.forEach(t => { if (!order.includes(t)) order.push(t); });

  const orderRows = order.map(token => `
    <div class="order-row" draggable="true" data-token="${esc(token)}">
      <span class="order-handle">☰</span><span class="order-label">${esc(tokenLabels[token] || token)}</span>
      <div class="order-actions"><button type="button" class="btn btn-ghost" style="padding:6px 10px" onclick="moveOrder(this,-1)">↑</button><button type="button" class="btn btn-ghost" style="padding:6px 10px" onclick="moveOrder(this,1)">↓</button></div>
    </div>
  `).join('');

  return `<!doctype html><html lang="ru"><head><meta charset="utf-8"><title>WLVPN Admin</title><style>${ADMIN_CSS}</style></head><body>
<header class="admin-nav"><h1>WLVPN Admin</h1><div class="btn-row"><button type="button" class="btn btn-ghost" onclick="toggleAllDetails()">Развернуть/Свернуть</button><a href="/" class="btn btn-ghost" target="_blank">Сайт</a><a href="/sub" class="btn btn-ghost" target="_blank">Подписка Free</a><a href="/vip?token=${esc(config.vipToken)}" class="btn btn-ghost" target="_blank">Подписка VIP</a><form method="POST" action="/admin/logout"><button type="submit" class="btn btn-danger">Выйти</button></form></div></header>
<div class="wrap">
  ${saved ? `<div class="alert alert-ok">Сохранено.</div>` : ""}
  ${pwdIsDefault ? `<div class="alert alert-warn">⚠ Смените пароль!</div>` : ""}
  
  <form method="POST" action="/admin/save" id="admin-form">
    <input type="hidden" name="hiddenHosts" id="hiddenHostsInput" value="">
    <input type="hidden" name="serverOrder" id="serverOrderInput" value="${esc(order.join(','))}">
    <input type="hidden" name="presetsRaw" id="presetsInput" value="">

    <div class="card">
      <h2>Настройки подписки (VIP & Free)</h2>
      <label><span>VIP Токен (ссылка: /vip?token=...)</span><input name="vipToken" value="${esc(config.vipToken)}"></label>
      <div class="grid2">
        <label><span>Основная подписка</span><input name="mainSourceUrl" value="${esc(config.mainSourceUrl)}"></label>
        <label><span>Мобильная подписка</span><input name="mobileSourceUrl" value="${esc(config.mobileSourceUrl)}"></label>
      </div>
      <label><span>HWID (chkav)</span><input name="hwid" value="${esc(config.hwid)}"></label>
      <div class="grid2">
        <label><span>Profile-Title</span><input name="profileTitle" value="${esc(config.profileTitle)}"></label>
        <label><span>Interval (часы)</span><input name="profileUpdateInterval" value="${esc(config.profileUpdateInterval)}"></label>
      </div>
      <label><span>Announce</span><input name="announce" value="${esc(config.announce)}"></label>
    </div>

    <div class="card">
      <h2>Балансировщики</h2>
      <div class="grid2">
        <label><span>Авто</span><input name="balancerName" value="${esc(config.balancerName)}"></label>
        <label><span>Описание</span><input name="balancerDescription" value="${esc(config.balancerDescription)}"></label>
        <label><span>Мобильный</span><input name="mobileBalancerName" value="${esc(config.mobileBalancerName)}"></label>
        <label><span>Описание</span><input name="mobileBalancerDescription" value="${esc(config.mobileBalancerDescription)}"></label>
      </div>
      <div class="toggle-row">
        <label class="toggle-item"><input type="checkbox" name="balancerHidden" ${config.balancerHidden ? 'checked' : ''}> Скрыть Авто</label>
        <label class="toggle-item"><input type="checkbox" name="mobileHidden" ${config.mobileHidden ? 'checked' : ''}> Скрыть Мобильный</label>
      </div>
    </div>

    <div class="card">
      <h2>Fallback</h2>
      <div class="grid2"><label><span>Название</span><input name="fallbackName" value="${esc(config.fallbackName)}"></label><label><span>Описание</span><input name="fallbackDescription" value="${esc(config.fallbackDescription)}"></label></div>
    </div>

    <details class="card" open>
      <summary><h2>HOST_MAP — Сервера (Free / VIP)</h2></summary>
      <div class="details-content">
        <div id="hostmap-container">${hmRows}</div>
        <button type="button" class="btn btn-ghost" onclick="addHostRow()">+ Сервер</button>
      </div>
    </details>

    <div class="card">
      <h2>Объединение (Мерж-группы)</h2>
      <div id="mg-container">${mgRows}</div>
      <button type="button" class="btn btn-ghost" onclick="addMG()">+ Группа</button>
    </div>

    <div class="card">
      <h2>Порядок в подписке</h2>
      <div id="order-container">${orderRows}</div>
    </div>

    <div class="card" style="border-color:var(--mint);">
      <h2>Макросы (Пресеты конфигов)</h2>
      <p class="hint" style="margin-bottom:12px;">Сохраните текущий набор серверов и групп в пресет, чтобы быстро загрузить его обратно.</p>
      <div id="presets-list" style="margin-bottom:12px;"></div>
      <div style="display:flex; gap:8px;">
        <input type="text" id="new-preset-name" placeholder="Название пресета (например: НГ скидки)" style="flex:1;">
        <button type="button" class="btn btn-primary" onclick="savePreset()">Сохранить текущие настройки в пресет</button>
      </div>
    </div>

    <div class="card">
      <h2>Безопасность</h2>
      <label><span>Новый пароль</span><input type="password" name="newPassword" placeholder="оставьте пустым"></label>
    </div>

    <div class="btn-row" style="margin-top:8px;">
      <button type="submit" class="btn btn-primary" style="flex:1;">Сохранить настройки</button>
      <button type="button" class="btn btn-danger" onclick="resetSettings()">Сбросить</button>
    </div>
  </form>
</div>

<script>
var presets = ${JSON.stringify(config.presets || [])};

function renderPresets() {
  var list = document.getElementById('presets-list');
  if (presets.length === 0) { list.innerHTML = '<span style="color:var(--muted);font-size:0.85rem;">Нет сохраненных пресетов.</span>'; return; }
  list.innerHTML = presets.map(function(p, idx) {
    return '<div style="display:flex; justify-content:space-between; align-items:center; background:rgba(255,255,255,0.05); padding:10px; border-radius:8px; margin-bottom:6px;">' +
      '<span>' + p.name + '</span>' +
      '<div><button type="button" class="btn btn-ghost btn-sm" onclick="applyPreset(' + idx + ')">Загрузить</button>' +
      '<button type="button" class="btn btn-danger btn-sm" onclick="deletePreset(' + idx + ')" style="margin-left:8px;">✕</button></div>' +
    '</div>';
  }).join('');
}

function savePreset() {
  var name = document.getElementById('new-preset-name').value.trim();
  if (!name) return alert('Введите название');
  
  var state = getCurrentFormState();
  presets.push({ name: name, state: state });
  renderPresets();
  document.getElementById('new-preset-name').value = '';
  alert('Пресет сохранен в память. Нажмите "Сохранить настройки" внизу, чтобы записать в KV.');
}

function deletePreset(idx) {
  if (!confirm('Удалить пресет?')) return;
  presets.splice(idx, 1);
  renderPresets();
}

function applyPreset(idx) {
  if (!confirm('Загрузить пресет? Текущие несохраненные изменения будут потеряны.')) return;
  var state = presets[idx].state;
  
  var hmContainer = document.getElementById('hostmap-container');
  hmContainer.innerHTML = '';
  state.hostMap.forEach(function(s) {
    var d = document.createElement('div');
    d.className = 'host-row';
    d.style.cssText = 'display:flex; gap:8px; margin-bottom:8px; align-items:center;' + (s.hidden ? 'opacity:0.55' : '');
    d.innerHTML = '<input name="hm_host[]" value="' + s.host + '" style="flex:1.5">' +
      '<input name="hm_remarks[]" value="' + s.remarks + '" style="flex:1.5">' +
      '<input name="hm_category[]" value="' + s.category + '" style="flex:1">' +
      '<input name="hm_desc[]" value="' + (s.desc||'') + '" style="flex:2">' +
      '<select name="hm_tier[]" style="width:100px; padding:8px; border-radius:8px; background:rgba(0,0,0,0.5); color:#fff; border:1px solid var(--stroke);">' +
        '<option value="free" ' + (s.tier==='free'?'selected':'') + '>Free</option>' +
        '<option value="vip" ' + (s.tier==='vip'?'selected':'') + '>VIP</option>' +
        '<option value="both" ' + (s.tier==='both'?'selected':'') + '>Оба</option>' +
      '</select>' +
      '<label class="hm-hide-toggle"><input type="checkbox" name="hm_hidden_cb" ' + (s.hidden?'checked':'') + '><span>✕</span></label>' +
      '<button type="button" class="btn btn-danger" onclick="this.closest(\\'.host-row\\').remove()">Удалить</button>';
    hmContainer.appendChild(d);
  });

  var mgContainer = document.getElementById('mg-container');
  mgContainer.innerHTML = '';
  state.mergeGroups.forEach(function(g) {
    var d = document.createElement('details');
    d.className = 'mg-row'; d.setAttribute('data-id', g.id);
    var checks = state.hostMap.map(function(s) { return s.remarks; }).filter(Boolean).map(function(r) {
      return '<label style="display:inline-flex; align-items:center; gap:6px; margin-right:16px; font-size:0.85rem;"><input type="checkbox" name="mg_match_' + g.id + '[]" value="' + r + '" ' + (g.matchNames.includes(r)?'checked':'') + '> ' + r + '</label>';
    }).join('');
    d.innerHTML = '<summary><span>' + g.name + '</span><button type="button" class="btn btn-danger btn-sm" onclick="event.preventDefault(); this.closest(\\'.mg-row\\').remove()">✕</button></summary>' +
      '<div class="mg-row-content"><input type="hidden" name="mg_id[]" value="' + g.id + '">' +
      '<div class="mg-row-head"><input name="mg_name[]" value="' + g.name + '"><input name="mg_description[]" value="' + g.description + '"></div>' +
      '<div style="margin:10px 0;"><div class="checkbox-group">' + checks + '</div></div></div>';
    mgContainer.appendChild(d);
  });

  var orderContainer = document.getElementById('order-container');
  orderContainer.innerHTML = '';
  state.serverOrder.forEach(function(token) {
    var d = document.createElement('div');
    d.className = 'order-row'; d.draggable = true; d.setAttribute('data-token', token);
    var label = token;
    if (token === '__balancer__') label = 'Авто';
    else if (token === '__mobile__') label = 'Мобильный';
    else if (token.startsWith('__merge__')) {
      var gid = token.replace('__merge__', '');
      var grp = state.mergeGroups.find(function(x){return x.id===gid;});
      if (grp) label = grp.name;
    } else {
      var hs = state.hostMap.find(function(x){return x.host===token;});
      if (hs) label = hs.remarks;
    }
    d.innerHTML = '<span class="order-handle">☰</span><span class="order-label">' + label + '</span>' +
      '<div class="order-actions"><button type="button" class="btn btn-ghost" style="padding:6px 10px" onclick="moveOrder(this,-1)">↑</button><button type="button" class="btn btn-ghost" style="padding:6px 10px" onclick="moveOrder(this,1)">↓</button></div>';
    orderContainer.appendChild(d);
  });
  initDragAndDrop();
  alert('Пресет загружен в форму. Нажмите "Сохранить настройки" для применения.');
}

function getCurrentFormState() {
  var hostMap = [];
  document.querySelectorAll('#hostmap-container .host-row').forEach(function(row) {
    var h = row.querySelector('input[name="hm_host[]"]').value.trim();
    if (!h) return;
    hostMap.push({
      host: h,
      remarks: row.querySelector('input[name="hm_remarks[]"]').value.trim(),
      category: row.querySelector('input[name="hm_category[]"]').value.trim(),
      desc: row.querySelector('input[name="hm_desc[]"]').value.trim(),
      tier: row.querySelector('select[name="hm_tier[]"]').value,
      hidden: row.querySelector('input[name="hm_hidden_cb"]').checked
    });
  });
  
  var mergeGroups = [];
  document.querySelectorAll('#mg-container .mg-row').forEach(function(row) {
    var id = row.querySelector('input[name="mg_id[]"]').value;
    var matchNames = [];
    row.querySelectorAll('input[name^="mg_match_"]:checked').forEach(function(cb) {
      matchNames.push(cb.value);
    });
    if (matchNames.length > 0) {
      mergeGroups.push({
        id: id,
        name: row.querySelector('input[name="mg_name[]"]').value.trim(),
        description: row.querySelector('input[name="mg_description[]"]').value.trim(),
        matchNames: matchNames
      });
    }
  });

  var serverOrder = [];
  document.querySelectorAll('#order-container .order-row').forEach(function(row) {
    serverOrder.push(row.getAttribute('data-token'));
  });

  return { hostMap: hostMap, mergeGroups: mergeGroups, serverOrder: serverOrder };
}

function toggleAllDetails() {
  var details = document.querySelectorAll('details.card, details.mg-row');
  var anyOpen = Array.from(details).some(function(d) { return d.open; });
  details.forEach(function(d) { d.open = !anyOpen; });
}

function moveOrder(btn, dir) {
  var row = btn.closest('.order-row');
  if (dir === -1 && row.previousElementSibling) row.parentNode.insertBefore(row, row.previousElementSibling);
  else if (dir === 1 && row.nextElementSibling) row.parentNode.insertBefore(row.nextElementSibling, row);
}

function initDragAndDrop() {
  var dragOrderEl = null;
  document.querySelectorAll('#order-container .order-row').forEach(function(row) {
    row.addEventListener('dragstart', function() { dragOrderEl = this; this.style.opacity = '0.4'; });
    row.addEventListener('dragend', function() { this.style.opacity = '1'; dragOrderEl = null; });
    row.addEventListener('dragover', function(e) {
      e.preventDefault();
      if (dragOrderEl && dragOrderEl !== this) {
        var rect = this.getBoundingClientRect();
        var midpoint = rect.top + rect.height / 2;
        if (e.clientY < midpoint) this.parentNode.insertBefore(dragOrderEl, this);
        else this.parentNode.insertBefore(dragOrderEl, this.nextSibling);
      }
    });
  });
}
initDragAndDrop();

function addHostRow() {
  var c = document.getElementById('hostmap-container');
  var d = document.createElement('div');
  d.className = 'host-row';
  d.style.cssText = 'display:flex; gap:8px; margin-bottom:8px; align-items:center;';
  d.innerHTML = '<input name="hm_host[]" placeholder="host" style="flex:1.5">' +
    '<input name="hm_remarks[]" placeholder="Название" style="flex:1.5">' +
    '<input name="hm_category[]" placeholder="Категория" style="flex:1">' +
    '<input name="hm_desc[]" placeholder="Описание" style="flex:2">' +
    '<select name="hm_tier[]" style="width:100px; padding:8px; border-radius:8px; background:rgba(0,0,0,0.5); color:#fff; border:1px solid var(--stroke);">' +
      '<option value="free">Free</option><option value="vip">VIP</option><option value="both">Оба</option>' +
    '</select>' +
    '<label class="hm-hide-toggle"><input type="checkbox" name="hm_hidden_cb"><span>✕</span></label>' +
    '<button type="button" class="btn btn-danger" onclick="this.closest(\\'.host-row\\').remove()">Удалить</button>';
  c.appendChild(d);
}

function addMG() {
  var c = document.getElementById('mg-container');
  var d = document.createElement('details');
  var id = 'mg_' + Date.now();
  d.className = 'mg-row'; d.setAttribute('data-id', id);
  var checks = Array.from(document.querySelectorAll('input[name="hm_remarks[]"]')).map(function(inp){ return inp.value.trim(); }).filter(Boolean).map(function(r) {
    return '<label style="display:inline-flex; align-items:center; gap:6px; margin-right:16px; font-size:0.85rem;"><input type="checkbox" name="mg_match_' + id + '[]" value="' + r + '"> ' + r + '</label>';
  }).join('');
  d.innerHTML = '<summary><span>Новая группа</span><button type="button" class="btn btn-danger btn-sm" onclick="event.preventDefault(); this.closest(\\'.mg-row\\').remove()">✕</button></summary>' +
    '<div class="mg-row-content"><input type="hidden" name="mg_id[]" value="' + id + '">' +
    '<div class="mg-row-head"><input name="mg_name[]" placeholder="Название"><input name="mg_description[]" placeholder="Описание"></div>' +
    '<div style="margin:10px 0;"><div class="checkbox-group">' + (checks || 'Нет серверов') + '</div></div></div>';
  c.appendChild(d); d.open = true;
}

document.getElementById('admin-form').addEventListener('submit', function() {
  var tokens = [];
  document.querySelectorAll('#order-container .order-row').forEach(function(row) { tokens.push(row.getAttribute('data-token')); });
  document.getElementById('serverOrderInput').value = tokens.join(',');

  var hidden = [];
  document.querySelectorAll('#hostmap-container .host-row').forEach(function(row) {
    var cb = row.querySelector('input[name="hm_hidden_cb"]');
    var hostInp = row.querySelector('input[name="hm_host[]"]');
    if (cb && cb.checked && hostInp && hostInp.value.trim()) hidden.push(hostInp.value.trim());
  });
  document.getElementById('hiddenHostsInput').value = hidden.join(',');
  
  document.getElementById('presetsInput').value = JSON.stringify(presets);
});

function resetSettings() {
  if (confirm('⚠ Сбросить все настройки?')) {
    var form = document.createElement('form');
    form.method = 'POST'; form.action = '/admin/reset';
    document.body.appendChild(form); form.submit();
  }
}
</script>
</body></html>`;
}

// ============================================================
// ROUTER & LANDING
// ============================================================
async function handle(request, env) {
  const url = new URL(request.url);
  const path = url.pathname;
  const ua = request.headers.get("User-Agent") || "";

  if (path === "/admin" || path.startsWith("/admin/")) return handleAdmin(request, url, env);

  if (path === "/" || path === "") {
    if (isBrowser(ua)) return htmlResponse(renderLanding(url, await loadConfig(env)));
    return serveSubscription(env, url);
  }

  if (path === "/sub" || path === "/sub/" || path === "/vip") {
    if (isBrowser(ua) && path !== "/vip") return Response.redirect(url.origin + "/", 302);
    return serveSubscription(env, url);
  }
  return new Response("Not Found", { status: 404 });
}

export default {
  async fetch(request, env) {
    try { return await handle(request, env); }
    catch (e) { return new Response("Internal Error: " + (e.message || e), { status: 500 }); }
  }
};

function renderLanding(url, config) {
  const subUrl = url.origin;
  const serverCards = (config.hostMap || []).filter(s => !s.hidden).map(m => {
    const parts = (m.remarks || "").split(" ");
    const flag = parts[0] || "🌐";
    const name = parts.slice(1).join(" ") || m.remarks || m.host;
    return `<div class="server-card tilt reveal">
      <div class="server-flag">${esc(flag)}</div>
      <div class="server-name">${esc(name)} <span class="server-tag">${esc(m.category || "")}</span></div>
      ${m.desc ? `<div class="server-desc">${esc(m.desc)}</div>` : ""}
      <div class="server-stats"><div class="server-stat"><span>Протокол</span><b class="proto">VLESS</b></div></div>
    </div>`;
  }).join("");

  return `<!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>WLVPN — Бесплатный VPN на VLESS</title>
<style>${CSS}</style>
</head>
<body>
<div class="cursor"></div><div class="cursor-dot"></div><canvas id="stars"></canvas>
<div class="aurora"><div class="blob b1"></div><div class="blob b2"></div><div class="blob b3"></div></div>
<nav class="top" id="nav">
  <div class="nav-inner">
    <div class="logo"><div class="logo-mark"></div><span>WLVPN</span></div>
    <ul class="nav-links"><li><a href="#servers">Серверы</a></li><li><a href="#features">Возможности</a></li><li><a href="#faq">FAQ</a></li></ul>
    <button type="button" class="nav-cta" onclick="copySub(event)">Скопировать ссылку</button>
  </div>
</nav>
<header class="hero">
  <div class="wrap">
    <div class="badge"><span class="pulse"></span> VLESS · Бесплатно навсегда</div>
    <h1 class="title"><span class="line"><span>Твой интернет.</span></span><span class="line"><span class="grad">Твои правила.</span></span><span class="line"><span>На VLESS.</span></span></h1>
    <p class="hero-sub">Бесплатный VPN без лимитов. Скопируй ссылку ниже и добавь в клиент.</p>
    <div class="link-box">
      <div class="link-box-header"><span class="link-box-title">Ссылка-подписка</span><span class="link-box-badge">Free</span></div>
      <div class="link-box-content">
        <div class="qr-mini" id="qr-box">🔗</div>
        <div>
          <div class="sub-url"><input type="text" id="sub-url" readonly value="${esc(subUrl)}"><button type="button" class="copy-btn" onclick="copySub(event)">Копировать</button></div>
          <p class="link-box-hint">Добавь в <b>Happ</b>, <b>Incy</b>, <b>v2rayNG</b> и др.</p>
        </div>
      </div>
    </div>
  </div>
</header>
<section id="servers"><div class="wrap"><div class="sec-head reveal"><span class="sec-tag">Серверы</span><h2 class="sec">Максимальная скорость.</h2></div><div class="servers-grid">${serverCards}</div></div></section>
<footer><div class="wrap foot-inner"><div class="logo"><div class="logo-mark"></div><span>WLVPN</span></div><p>© 2026 WLVPN.</p></div></footer>
<script>
function copySub(e) {
  const input = document.getElementById('sub-url');
  input.select(); input.setSelectionRange(0, 99999);
  try { document.execCommand('copy'); e.currentTarget.textContent = '✓ Скопировано'; } catch(_) {}
  setTimeout(() => e.currentTarget.textContent = 'Копировать', 1800);
}
(function initQR() {
  const box = document.getElementById('qr-box'), input = document.getElementById('sub-url');
  if (!box || !input || typeof qrcode === 'undefined') return;
  try { const qr = qrcode(0, 'M'); qr.addData(input.value); qr.make(); box.innerHTML = qr.createSvgTag({ cellSize: 4, margin: 1 }); } catch (err) {}
})();
const canvas = document.getElementById('stars'), ctx = canvas.getContext('2d');
let stars = [], w, h, dpr;
function resize(){ dpr = Math.min(devicePixelRatio || 1, 2); w = canvas.width = innerWidth * dpr; h = canvas.height = innerHeight * dpr; canvas.style.width = innerWidth + 'px'; canvas.style.height = innerHeight + 'px'; stars = Array.from({ length: 100 }, () => ({ x: Math.random() * w, y: Math.random() * h, vx: (Math.random() - .5) * .25 * dpr, vy: (Math.random() - .5) * .25 * dpr, r: (Math.random() * 1.5 + .4) * dpr, a: Math.random() * .5 + .25 })); }
resize(); addEventListener('resize', resize);
function draw(){ ctx.clearRect(0, 0, w, h); stars.forEach(s => { s.x += s.vx; s.y += s.vy; if (s.x < 0 || s.x > w) s.vx *= -1; if (s.y < 0 || s.y > h) s.vy *= -1; ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2); ctx.fillStyle = 'rgba(255,255,255,' + s.a + ')'; ctx.fill(); }); requestAnimationFrame(draw); }
draw();
const io = new IntersectionObserver(entries => { entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }); });
document.querySelectorAll('.reveal').forEach(el => io.observe(el));
</script>
<script src="https://cdn.jsdelivr.net/npm/qrcode-generator@1.4.4/qrcode.min.js"></script>
</body></html>`;
}

// ============================================================
// ADMIN CSS
// ============================================================
const ADMIN_CSS = `
:root{--bg:#000;--surface:#0a0a0a;--mint:#fff;--text:#fff;--muted:#999;--glass:rgba(255,255,255,.04);--stroke:rgba(255,255,255,.12);--red:#ff4d6d;--yellow:#ffd166;}
*{margin:0;padding:0;box-sizing:border-box}
body{background:var(--bg);color:var(--text);font-family:system-ui,sans-serif;line-height:1.5;padding-bottom:100px}
.wrap{max-width:1080px;margin:0 auto;padding:24px}
header.admin-nav{display:flex;justify-content:space-between;align-items:center;padding:16px 24px;border-bottom:1px solid var(--stroke);margin-bottom:24px;position:sticky;top:0;background:rgba(0,0,0,.85);backdrop-filter:blur(10px);z-index:10;flex-wrap:wrap;gap:12px}
h1{font-size:1.2rem;font-weight:700;display:flex;align-items:center;gap:10px}
h1::before{content:'';width:8px;height:8px;border-radius:50%;background:#fff;box-shadow:0 0 10px #fff}
h2{font-size:.78rem;font-weight:700;color:#fff;text-transform:uppercase;letter-spacing:.15em;margin-bottom:16px}
.card{background:var(--glass);border:1px solid var(--stroke);border-radius:16px;padding:22px;margin-bottom:18px}
details.card{padding:0}details.card summary{padding:22px;cursor:pointer;display:flex;align-items:center;list-style:none}details.card summary::-webkit-details-marker{display:none}details.card summary h2{margin-bottom:0}details.card summary::before{content:'▶';margin-right:12px;font-size:0.75em;color:#fff;transition:transform .3s}details.card[open] summary::before{transform:rotate(90deg)}details.card .details-content{padding:0 22px 22px}
label{display:block;margin-bottom:14px;font-size:.85rem;color:var(--muted)}
label span{display:block;margin-bottom:6px;color:var(--text);font-weight:500;font-size:.88rem}
input,textarea,select{width:100%;padding:10px 12px;border-radius:8px;border:1px solid var(--stroke);background:rgba(255,255,255,.05);color:var(--text);font-family:inherit;font-size:.9rem}
input:focus,textarea:focus,select:focus{border-color:#fff;outline:none}
.btn{display:inline-flex;align-items:center;justify-content:center;gap:6px;padding:10px 20px;border-radius:8px;font-size:.88rem;font-weight:600;cursor:pointer;border:none;font-family:inherit;transition:all .2s;text-decoration:none}
.btn-primary{background:linear-gradient(120deg,#fff,#ccc);color:#000;box-shadow:0 8px 24px -8px rgba(255,255,255,.4)}
.btn-primary:hover{transform:translateY(-1px);box-shadow:0 12px 28px -8px rgba(255,255,255,.6)}
.btn-ghost{background:var(--glass);color:var(--text);border:1px solid var(--stroke)}
.btn-ghost:hover{border-color:#fff}
.btn-danger{background:rgba(255,77,109,.15);color:var(--red);border:1px solid rgba(255,77,109,.35)}
.btn-danger:hover{background:rgba(255,77,109,.25)}
.btn-sm{padding:4px 8px !important; font-size:0.75rem !important;}
.btn-row{display:flex;gap:10px;flex-wrap:wrap;align-items:center}
.mg-row{background:rgba(255,255,255,.03);border:1px solid var(--stroke);border-radius:12px;margin-bottom:10px;overflow:hidden}
.mg-row summary{display:flex;justify-content:space-between;align-items:center;padding:14px;cursor:pointer;background:rgba(255,255,255,.05);font-weight:600;color:var(--text);list-style:none}
.mg-row summary::-webkit-details-marker{display:none}
.mg-row summary::before{content:'▶';margin-right:10px;font-size:0.8em;color:#fff;transition:transform .3s}
.mg-row[open] summary::before{transform:rotate(90deg)}
.mg-row summary span{flex:1}
.mg-row-content{padding:14px;border-top:1px dashed var(--stroke)}
.mg-row-head{display:flex;gap:8px;margin-bottom:10px;flex-wrap:wrap}
.mg-row-head input{flex:1;min-width:200px}
.grid2{display:grid;grid-template-columns:1fr 1fr;gap:14px}
@media(max-width:640px){.grid2{grid-template-columns:1fr}}
.alert{padding:12px 16px;border-radius:10px;margin-bottom:16px;font-size:.88rem}
.alert-warn{background:rgba(255,209,102,.1);border:1px solid rgba(255,209,102,.3);color:var(--yellow)}
.alert-ok{background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.3);color:#fff}
.alert-err{background:rgba(255,77,109,.1);border:1px solid rgba(255,77,109,.3);color:var(--red)}
.hint{font-size:.78rem;color:var(--muted);margin-top:4px;line-height:1.5}
.login-box{max-width:380px;margin:80px auto;padding:32px}
.order-row{display:flex;align-items:center;gap:12px;padding:10px 14px;background:rgba(255,255,255,.03);border:1px solid var(--stroke);border-radius:8px;margin-bottom:6px;cursor:grab}
.order-row:hover{background:rgba(255,255,255,.08)}
.order-handle{color:var(--muted);font-size:1rem}
.order-label{flex:1;font-size:0.9rem;color:var(--text)}
.order-actions{display:flex;gap:4px}
.hm-hide-toggle{display:flex;flex-direction:column;align-items:center;gap:2px;margin:0;padding:6px 10px;border:1px solid var(--stroke);border-radius:8px;cursor:pointer;font-size:0.7rem;color:var(--muted);min-width:70px;background:rgba(255,255,255,.03)}
.hm-hide-toggle:hover{border-color:#fff}
.hm-hide-toggle input[type="checkbox"]{width:auto;margin:0;cursor:pointer;accent-color:#fff}
.hm-hide-toggle input[type="checkbox"]:checked ~ span{color:#fff}
.toggle-row{display:flex;flex-direction:column;gap:8px;margin-top:16px;padding-top:16px;border-top:1px dashed var(--stroke)}
.toggle-item{display:flex;align-items:center;gap:10px;margin:0;padding:10px 14px;background:rgba(255,255,255,.03);border:1px solid var(--stroke);border-radius:8px;cursor:pointer;font-size:0.9rem;color:var(--text)}
.toggle-item:hover{border-color:#fff}
.toggle-item input[type="checkbox"]{width:auto;margin:0;cursor:pointer;accent-color:#fff}
`;

// ============================================================
// LANDING CSS
// ============================================================
const CSS = `
:root{--bg:#000;--text:#fff;--muted:#999;--glass:rgba(255,255,255,.03);--stroke:rgba(255,255,255,.1);}
*{margin:0;padding:0;box-sizing:border-box}
body{background:var(--bg);color:var(--text);font-family:system-ui,sans-serif;overflow-x:hidden;line-height:1.5}
a{color:#fff}
.wrap{position:relative;z-index:2;max-width:1240px;margin:0 auto;padding:0 28px}
.cursor,.cursor-dot{position:fixed;top:0;left:0;pointer-events:none;z-index:9999;border-radius:50%;transform:translate(-50%,-50%);will-change:transform}
.cursor{width:36px;height:36px;border:1px solid rgba(255,255,255,.8);background:transparent;transition:width .25s,height .25s,background .25s}
.cursor-dot{width:5px;height:5px;background:#fff}
.cursor.hover{width:70px;height:70px;background:rgba(255,255,255,.15);border-color:rgba(255,255,255,.9)}
@media (hover:none){.cursor,.cursor-dot{display:none}}
#stars{position:fixed;inset:0;z-index:0;opacity:.7;pointer-events:none}
.aurora{position:fixed;inset:0;z-index:0;overflow:hidden;pointer-events:none;filter:blur(90px);opacity:.25}
.blob{position:absolute;border-radius:50%;animation:float 22s ease-in-out infinite}
.b1{width:46vw;height:46vw;background:#fff;top:-12vw;left:-10vw}
.b2{width:38vw;height:38vw;background:#666;bottom:-14vw;right:-8vw;animation-delay:-7s}
.b3{width:30vw;height:30vw;background:#aaa;top:38%;left:56%;animation-delay:-13s}
@keyframes float{0%,100%{transform:translate(0,0) scale(1)}33%{transform:translate(6vw,-4vw) scale(1.12)}66%{transform:translate(-5vw,5vw) scale(.92)}}
nav.top{position:fixed;top:0;left:0;right:0;z-index:100;transition:all .4s;border-bottom:1px solid transparent}
nav.top.scrolled{background:rgba(0,0,0,.8);backdrop-filter:blur(18px);border-bottom-color:var(--stroke)}
.nav-inner{max-width:1240px;margin:0 auto;padding:18px 28px;display:flex;align-items:center;justify-content:space-between}
.logo{display:flex;align-items:center;gap:10px;font-weight:800;font-size:1.3rem;letter-spacing:.16em}
.logo-mark{width:30px;height:30px;border-radius:9px;background:linear-gradient(140deg,#fff,#888);box-shadow:0 0 20px -4px rgba(255,255,255,.9);display:grid;place-items:center}
.logo-mark::before{content:'';width:12px;height:14px;background:var(--bg);clip-path:polygon(50% 0,100% 25%,100% 75%,50% 100%,0 75%,0 25%)}
.logo span{background:linear-gradient(100deg,#fff,#ccc 60%,#aaa);-webkit-background-clip:text;background-clip:text;color:transparent}
.nav-links{display:flex;gap:32px;list-style:none}
.nav-links a{color:var(--muted);text-decoration:none;font-size:.9rem;transition:color .3s}
.nav-links a:hover{color:#fff}
.nav-cta{padding:10px 22px;border-radius:100px;font-size:.85rem;font-weight:600;color:#000;text-decoration:none;background:linear-gradient(120deg,#fff,#ccc);transition:all .4s;border:none;cursor:pointer;font-family:inherit}
.nav-cta:hover{box-shadow:0 8px 30px -6px rgba(255,255,255,.6);transform:translateY(-2px)}
@media(max-width:880px){.nav-links{display:none}}
.btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;padding:12px 24px;border-radius:100px;font-size:.92rem;font-weight:600;cursor:pointer;border:none;text-decoration:none;font-family:inherit;transition:all .2s;position:relative;z-index:1}
.btn-primary{background:linear-gradient(120deg,#fff,#ccc);color:#000;box-shadow:0 10px 34px -10px rgba(255,255,255,.6)}
.btn-primary:hover{transform:translateY(-2px);box-shadow:0 16px 40px -10px rgba(255,255,255,.8)}
header.hero{min-height:100vh;display:flex;align-items:center;padding:150px 0 100px}
.badge{display:inline-flex;align-items:center;gap:10px;padding:7px 16px;border-radius:100px;background:var(--glass);border:1px solid var(--stroke);font-size:.76rem;letter-spacing:.13em;text-transform:uppercase;color:var(--muted);margin-bottom:32px;backdrop-filter:blur(10px)}
.pulse{width:7px;height:7px;border-radius:50%;background:#fff;box-shadow:0 0 0 0 rgba(255,255,255,.7);animation:pulse 2s infinite}
@keyframes pulse{70%{box-shadow:0 0 0 12px rgba(255,255,255,0)}100%{box-shadow:0 0 0 0 rgba(255,255,255,0)}}
h1.title{font-weight:800;font-size:clamp(2.8rem,7.6vw,6.4rem);line-height:.95;letter-spacing:-.035em;margin-bottom:28px}
h1.title .line{display:block;overflow:hidden}
h1.title .line > span{display:block;transform:translateY(110%);animation:rise 1.1s cubic-bezier(.16,1,.3,1) forwards}
@keyframes rise{to{transform:translateY(0)}}
.grad{background:linear-gradient(100deg,#fff 0%,#ddd 45%,#888 100%);background-size:220% 100%;-webkit-background-clip:text;background-clip:text;color:transparent;animation:shift 7s ease-in-out infinite}
@keyframes shift{0%,100%{background-position:0% 50%}50%{background-position:100% 50%}}
.hero-sub{max-width:620px;font-size:1.06rem;line-height:1.75;color:var(--muted);margin-bottom:8px}
.link-box{margin:36px 0 44px;padding:26px 28px;border-radius:22px;background:linear-gradient(160deg,rgba(255,255,255,.1),rgba(255,255,255,.02));border:1px solid rgba(255,255,255,.2);backdrop-filter:blur(16px);max-width:720px}
.link-box-header{display:flex;justify-content:space-between;align-items:center;gap:16px;margin-bottom:20px}
.link-box-title{font-weight:700;font-size:1.05rem}
.link-box-badge{padding:4px 12px;border-radius:100px;font-size:.7rem;font-weight:700;color:#000;background:linear-gradient(120deg,#fff,#ccc)}
.link-box-content{display:grid;grid-template-columns:auto 1fr;gap:24px;align-items:center}
@media (max-width:640px){.link-box-content{grid-template-columns:1fr}}
.qr-mini{padding:10px;background:#fff;border-radius:14px;width:140px;height:140px;display:grid;place-items:center}
.qr-mini svg{display:block;max-width:100%;height:auto}
.link-box-hint{color:var(--muted);font-size:.88rem;margin-top:12px}
.link-box-hint b{color:#fff}
.sub-url{display:flex;gap:8px}
.sub-url input{flex:1;min-width:0;padding:12px 14px;border-radius:10px;border:1px solid var(--stroke);background:rgba(255,255,255,.05);color:var(--text);font-family:monospace}
.copy-btn{padding:0 18px;border-radius:10px;border:1px solid rgba(255,255,255,.3);background:rgba(255,255,255,.1);color:#fff;cursor:pointer;font-weight:600;transition:all .2s;font-family:inherit;white-space:nowrap}
.copy-btn:hover{background:rgba(255,255,255,.2)}
section{padding:120px 0;position:relative}
.sec-head{margin-bottom:64px;max-width:680px}
.sec-tag{font-size:.76rem;letter-spacing:.28em;text-transform:uppercase;color:#fff;margin-bottom:16px;display:block}
h2.sec{font-weight:800;font-size:clamp(2rem,4.6vw,3.4rem);line-height:1.05}
.reveal{opacity:0;transform:translateY(44px);transition:all .9s cubic-bezier(.16,1,.3,1)}
.reveal.in{opacity:1;transform:none}
.servers-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:22px}
.server-card{position:relative;padding:32px 28px;border-radius:22px;background:var(--glass);border:1px solid var(--stroke);backdrop-filter:blur(16px);transition:all .25s}
.server-card:hover{border-color:rgba(255,255,255,.5);transform:translateY(-4px)}
.server-flag{font-size:2.4rem;margin-bottom:16px}
.server-name{font-weight:700;font-size:1.35rem;margin-bottom:8px;display:flex;align-items:center;flex-wrap:wrap;gap:10px}
.server-tag{display:inline-block;padding:3px 10px;font-size:.66rem;font-weight:700;border-radius:100px;color:#fff;background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.25)}
.server-desc{font-size:0.85rem;color:var(--muted);margin-bottom:16px;line-height:1.4}
.server-stats{display:grid;gap:12px}
.server-stat{display:flex;justify-content:space-between;align-items:center;padding:11px 14px;border-radius:11px;background:rgba(255,255,255,.02);border:1px solid rgba(255,255,255,.05);font-size:.86rem}
.server-stat span{color:var(--muted)}
.server-stat b{color:var(--text)}
footer{border-top:1px solid var(--stroke);padding:56px 0 40px;position:relative;z-index:2}
.foot-inner{display:flex;justify-content:space-between;align-items:center;gap:30px;flex-wrap:wrap}
.foot-inner p{color:var(--muted);font-size:.86rem}
::-webkit-scrollbar{width:9px}::-webkit-scrollbar-track{background:#000}::-webkit-scrollbar-thumb{background:linear-gradient(#fff,#888);border-radius:10px}
`;
