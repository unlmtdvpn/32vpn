// =====================================================
// WLVPN — Subscription Server + Admin Panel
// =====================================================

const SERVERS = [
  "vless://31dac09f-78ee-49ca-9566-d20aea578fdc@de-new.datanode-internal.net:443?flow=xtls-rprx-vision&type=tcp&security=reality&fp=qq&sni=openwrt.lan&pbk=r6lN34m1nN-xQZ458j5NPD5xJ3_QBF2bGzY4KJEo4ic&sid=abbcd128#%F0%9F%87%A9%F0%9F%87%AA+%D0%93%D0%B5%D1%80%D0%BC%D0%B0%D0%BD%D0%B8%D1%8F",
  "vless://31dac09f-78ee-49ca-9566-d20aea578fdc@se-new.datanode-internal.net:443?flow=xtls-rprx-vision&type=tcp&security=reality&fp=qq&sni=openwrt.lan&pbk=r6lN34m1nN-xQZ458j5NPD5xJ3_QBF2bGzY4KJEo4ic&sid=abbcd128#%F0%9F%87%B8%F0%9F%87%AA+%D0%A8%D0%B2%D0%B5%D1%86%D0%B8%D1%8F",
  "vless://31dac09f-78ee-49ca-9566-d20aea578fdc@pl.datanode-internal.net:443?flow=xtls-rprx-vision&type=tcp&security=reality&fp=qq&sni=openwrt.lan&pbk=r6lN34m1nN-xQZ458j5NPD5xJ3_QBF2bGzY4KJEo4ic&sid=abbcd128#%F0%9F%87%B5%F0%9F%87%B1+%D0%9F%D0%BE%D0%BB%D1%8C%D1%88%D0%B0",
  "vless://31dac09f-78ee-49ca-9566-d20aea578fdc@ru.datanode-internal.net:443?flow=xtls-rprx-vision&type=tcp&security=reality&fp=qq&sni=openwrt.lan&pbk=r6lN34m1nN-xQZ458j5NPD5xJ3_QBF2bGzY4KJEo4ic&sid=abbcd128#%F0%9F%87%B7%F0%9F%87%BA+%D0%A0%D0%BE%D1%81%D1%81%D0%B8%D1%8F",
  "vless://4054fdc2-ee80-4419-8a8e-d937df4719e2@qq.utiltools.site:443?flow=xtls-rprx-vision&type=tcp&headerType=none&security=reality&fp=qq&sni=qq.utiltools.site&pbk=drY21DHNOr6ezJLA2B10mzTExeJ9-gVBfTBNLwVBtWI#%F0%9F%87%AA%F0%9F%87%BA+Telegram+Proxy",
  "vless://31dac09f-78ee-49ca-9566-d20aea578fdc@hole-nn.datanode-internal.net:443?type=grpc&security=reality&fp=qq&sni=river-2-611.rtbcdn.ru&pbk=r6lN34m1nN-xQZ458j5NPD5xJ3_QBF2bGzY4KJEo4ic&sid=abbcd128&serviceName=ads.x5.ru&mode=gun#%F0%9F%87%A9%F0%9F%87%AA+%D0%91%D0%B5%D0%BB%D1%8B%D0%B9+%D1%81%D0%BF%D0%B8%D1%81%D0%BE%D0%BA+%231+%7C+TCP",
  "hysteria2://56ff50da-a238-4646-95ab-dd159634bd87@ru03.arpanet-cdn.com:17701?obfs=salamander&obfs-password=588c76723192f87cfe6d6786816177cd2bd9773acdc545928d7d1d5e8338d4ce&sni=ru03.arpanet-cdn.com#%F0%9F%87%AA%F0%9F%87%BA+%D0%91%D0%B5%D0%BB%D1%8B%D0%B9+%D1%81%D0%BF%D0%B8%D1%81%D0%BE%D0%BA+%232+%7C+UDP",
  "hysteria2://56ff50da-a238-4646-95ab-dd159634bd87@37.9.4.112:17701?obfs=salamander&obfs-password=588c76723192f87cfe6d6786816177cd2bd9773acdc545928d7d1d5e8338d4ce&sni=ru03.arpanet-cdn.com#%F0%9F%87%AA%F0%9F%87%BA+%D0%91%D0%B5%D0%BB%D1%8B%D0%B9+%D1%81%D0%BF%D0%B8%D1%81%D0%BE%D0%BA+%233+%7C+UDP",
  "vless://95a608b6-bff1-4e10-bb61-0a39f221bb7d@78.159.246.179:2053?type=xhttp&security=tls&fp=random&sni=randomquaint.net&path=%2Fapi%2Fv1%2Fupload&host=randomquaint.net&mode=auto#%F0%9F%87%AA%F0%9F%87%BA+%D0%91%D0%B5%D0%BB%D1%8B%D0%B9+%D1%81%D0%BF%D0%B8%D1%81%D0%BE%D0%BA+%234+%7C+TCP"
];

const CONFIG = {
  trialDays: 7,
  trialTrafficGB: 50,
  trialRateLimit: 3,       // триал-запросов на IP в сутки
  sessionTTL: 24 * 60 * 60 * 1000,
  infiniteExpire: 4102444800 // 01.01.2100 — «бесконечно»
};

// =====================================================
// ENTRY
// =====================================================
export default {
  async fetch(request, env, ctx) {
    try {
      return await handle(request, env);
    } catch (e) {
      console.error(e.stack || e);
      return new Response("Internal Error: " + (e.message || e), { status: 500 });
    }
  }
};

async function handle(request, env) {
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;
  const ua = request.headers.get("User-Agent") || "";

  if (path === "/admin" || path.startsWith("/admin/")) return handleAdmin(request, env, url);
  if (path === "/api/trial" && method === "POST") return apiTrial(request, env, url);
  if (path === "/api/report-traffic" && method === "POST") return apiReportTraffic(request, env);
  if (path.startsWith("/sub/")) return handleSubAccess(request, env, url, ua);

  if (path === "/") {
    if (isBrowser(ua)) return htmlResponse(renderLanding(url));
    return serveSubscription(null);
  }

  return new Response("Not Found", { status: 404 });
}

// =====================================================
// UTILS
// =====================================================
function randomToken(len = 20) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  const bytes = new Uint8Array(len);
  crypto.getRandomValues(bytes);
  let out = "";
  for (let i = 0; i < len; i++) out += chars[bytes[i] % chars.length];
  return out;
}

function b64(str) {
  return btoa(unescape(encodeURIComponent(str)));
}

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

function jsonResponse(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "Access-Control-Allow-Origin": "*",
      ...extraHeaders
    }
  });
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[c]));
}

function formatBytes(b) {
  if (!b) return "0 B";
  const u = ["B", "KB", "MB", "GB", "TB"];
  let i = 0;
  while (b >= 1024 && i < u.length - 1) { b /= 1024; i++; }
  return b.toFixed(2) + " " + u[i];
}

function formatDate(ts) {
  if (!ts) return "∞";
  return new Date(ts).toLocaleString("ru-RU", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit"
  });
}

function timingSafeEqual(a, b) {
  a = String(a || ""); b = String(b || "");
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

// =====================================================
// SUBSCRIPTION
// =====================================================
function serveSubscription(subData, mode = "infinite") {
  const body = b64(SERVERS.join("\n"));

  let userinfo;
  if (mode === "infinite" || !subData) {
    userinfo = `upload=0; download=0; total=0; expire=${CONFIG.infiniteExpire}`;
  } else {
    const used = subData.trafficUsed || 0;
    const total = subData.trafficTotal || 0;
    const expireSec = Math.floor(subData.expiresAt / 1000);
    userinfo = `upload=0; download=${used}; total=${total}; expire=${expireSec}`;
  }

  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Profile-Title": "wlvpn",
      "Profile-Update-Interval": "6",
      "Subscription-Userinfo": userinfo,
      "announce": "🏳 wlvpn — стабильный VPN сервис.",
      "Cache-Control": "no-cache",
      "Access-Control-Allow-Origin": "*"
    }
  });
}

async function handleSubAccess(request, env, url, ua) {
  const token = url.pathname.slice(5).split("/")[0];
  const raw = await env.KV.get(`sub:${token}`);

  if (isBrowser(ua)) {
    const sub = raw ? JSON.parse(raw) : null;
    return htmlResponse(renderSubInfoPage(sub, token));
  }

  if (!raw) return textErr("# Invalid token", 403);
  const sub = JSON.parse(raw);

  if (!sub.active) return textErr("# Subscription revoked", 403);
  if (sub.expiresAt && sub.expiresAt < Date.now()) return textErr("# Subscription expired", 403);
  if (sub.trafficTotal > 0 && sub.trafficUsed >= sub.trafficTotal) return textErr("# Traffic limit reached", 403);

  return serveSubscription(sub);
}

function textErr(msg, status) {
  return new Response(msg, {
    status,
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" }
  });
}

// =====================================================
// PUBLIC API — trial
// =====================================================
async function apiTrial(request, env, url) {
  const ip = request.headers.get("CF-Connecting-IP") || "unknown";
  const day = new Date().toISOString().slice(0, 10);
  const rlKey = `rl:${ip}:${day}`;

  const rlRaw = await env.KV.get(rlKey);
  const rl = rlRaw ? parseInt(rlRaw) : 0;

  if (rl >= CONFIG.trialRateLimit) {
    return jsonResponse({ error: "Слишком много запросов за сегодня. Попробуйте завтра." }, 429);
  }
  await env.KV.put(rlKey, String(rl + 1), { expirationTtl: 86400 });

  const token = randomToken(20);
  const now = Date.now();
  const sub = {
    createdAt: now,
    expiresAt: now + CONFIG.trialDays * 86400000,
    trafficTotal: CONFIG.trialTrafficGB * 1024 ** 3,
    trafficUsed: 0,
    note: "trial",
    active: true,
    type: "trial"
  };

  await env.KV.put(`sub:${token}`, JSON.stringify(sub));

  return jsonResponse({
    token,
    url: `${url.origin}/sub/${token}`,
    expiresAt: sub.expiresAt,
    days: CONFIG.trialDays,
    trafficGB: CONFIG.trialTrafficGB
  });
}

// =====================================================
// TRAFFIC REPORTING (для интеграции с backend VPN)
// =====================================================
async function apiReportTraffic(request, env) {
  const apiKey = request.headers.get("X-API-Key") || "";
  if (!timingSafeEqual(apiKey, env.TRAFFIC_API_KEY || "")) {
    return jsonResponse({ error: "Unauthorized" }, 401);
  }

  let body;
  try { body = await request.json(); } catch { return jsonResponse({ error: "Bad JSON" }, 400); }

  // Поддерживает { token, upload, download } или { reports: [...] }
  const reports = body.reports || [body];
  let updated = 0;

  for (const r of reports) {
    if (!r.token) continue;
    const raw = await env.KV.get(`sub:${r.token}`);
    if (!raw) continue;

    const sub = JSON.parse(raw);
    sub.trafficUsed = (sub.trafficUsed || 0) + (r.upload || 0) + (r.download || 0);
    await env.KV.put(`sub:${r.token}`, JSON.stringify(sub));
    updated++;
  }

  return jsonResponse({ updated });
}

// =====================================================
// SESSIONS
// =====================================================
async function getSession(request, env) {
  const cookie = request.headers.get("Cookie") || "";
  const m = cookie.match(/wlvpn_session=([A-Za-z0-9]+)/);
  if (!m) return null;

  const sid = m[1];
  const raw = await env.KV.get(`session:${sid}`);
  if (!raw) return null;

  const session = JSON.parse(raw);
  if (session.expiresAt < Date.now()) {
    await env.KV.delete(`session:${sid}`);
    return null;
  }
  return { id: sid, ...session };
}

// =====================================================
// ADMIN
// =====================================================
async function handleAdmin(request, env, url) {
  const path = url.pathname;
  const method = request.method;

  if (path === "/admin/login" && method === "POST") return adminLogin(request, env);
  if (path === "/admin/logout" && method === "POST") return adminLogout(request, env);

  const session = await getSession(request, env);

  if (path === "/admin" && method === "GET") {
    if (!session) return htmlResponse(renderAdminLogin(url.searchParams.get("error")));
    return htmlResponse(renderAdminDashboard());
  }

  if (path.startsWith("/admin/api/")) {
    if (!session) return jsonResponse({ error: "Unauthorized" }, 401);
    return adminAPI(request, env, url, method);
  }

  return new Response("Not Found", { status: 404 });
}

async function adminLogin(request, env) {
  const form = await request.formData();
  const password = String(form.get("password") || "");

  if (!timingSafeEqual(password, env.ADMIN_PASSWORD || "")) {
    return Response.redirect(new URL("/admin?error=1", request.url).toString(), 302);
  }

  const sid = randomToken(32);
  const expiresAt = Date.now() + CONFIG.sessionTTL;

  await env.KV.put(`session:${sid}`, JSON.stringify({ createdAt: Date.now(), expiresAt }), {
    expirationTtl: Math.floor(CONFIG.sessionTTL / 1000)
  });

  return new Response(null, {
    status: 302,
    headers: {
      "Location": "/admin",
      "Set-Cookie": `wlvpn_session=${sid}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${Math.floor(CONFIG.sessionTTL / 1000)}`
    }
  });
}

async function adminLogout(request, env) {
  const session = await getSession(request, env);
  if (session) await env.KV.delete(`session:${session.id}`);

  return new Response(null, {
    status: 302,
    headers: {
      "Location": "/admin",
      "Set-Cookie": "wlvpn_session=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0"
    }
  });
}

async function adminAPI(request, env, url, method) {
  const path = url.pathname;

  if (path === "/admin/api/list" && method === "GET") return adminList(env);
  if (path === "/admin/api/stats" && method === "GET") return adminStats(env);
  if (path === "/admin/api/create" && method === "POST") return adminCreate(request, env, url);

  const actionMatch = path.match(/^\/admin\/api\/([A-Za-z0-9]+)\/(extend|revoke|activate|delete)$/);
  if (actionMatch) {
    const [, token, action] = actionMatch;
    return adminAction(request, env, token, action);
  }

  return new Response("Not Found", { status: 404 });
}

async function adminList(env) {
  const list = await env.KV.list({ prefix: "sub:" });
  const subs = [];

  for (const k of list.keys) {
    const raw = await env.KV.get(k.name);
    if (!raw) continue;
    const data = JSON.parse(raw);
    subs.push({
      token: k.name.slice(4),
      ...data,
      status: !data.active ? "revoked"
        : (data.expiresAt && data.expiresAt < Date.now()) ? "expired"
        : (data.trafficTotal > 0 && data.trafficUsed >= data.trafficTotal) ? "limit"
        : "active"
    });
  }

  subs.sort((a, b) => b.createdAt - a.createdAt);
  return jsonResponse({ subs });
}

async function adminStats(env) {
  const list = await env.KV.list({ prefix: "sub:" });
  let active = 0, expired = 0, revoked = 0, totalUsed = 0, totalAllocated = 0;

  for (const k of list.keys) {
    const raw = await env.KV.get(k.name);
    if (!raw) continue;
    const d = JSON.parse(raw);
    totalUsed += d.trafficUsed || 0;
    totalAllocated += d.trafficTotal || 0;
    if (!d.active) revoked++;
    else if (d.expiresAt && d.expiresAt < Date.now()) expired++;
    else active++;
  }

  return jsonResponse({
    total: list.keys.length,
    active, expired, revoked,
    totalUsed, totalAllocated
  });
}

async function adminCreate(request, env, url) {
  let body;
  try { body = await request.json(); } catch { return jsonResponse({ error: "Bad JSON" }, 400); }

  const days = parseInt(body.days) || 30;
  const gb = parseInt(body.gb) || 0; // 0 = безлимит
  const note = String(body.note || "").slice(0, 100);
  const infinite = !!body.infinite;

  const token = randomToken(20);
  const now = Date.now();

  const sub = {
    createdAt: now,
    expiresAt: infinite ? 0 : now + days * 86400000,
    trafficTotal: gb > 0 ? gb * 1024 ** 3 : 0,
    trafficUsed: 0,
    note: note || (infinite ? "infinite" : "custom"),
    active: true,
    type: infinite ? "infinite" : "custom"
  };

  await env.KV.put(`sub:${token}`, JSON.stringify(sub));

  return jsonResponse({
    token,
    url: `${url.origin}/sub/${token}`,
    expiresAt: sub.expiresAt,
    infinite
  });
}

async function adminAction(request, env, token, action) {
  const raw = await env.KV.get(`sub:${token}`);
  if (!raw) return jsonResponse({ error: "Not found" }, 404);
  const sub = JSON.parse(raw);

  if (action === "extend") {
    let body = {};
    try { body = await request.json(); } catch {}
    const days = parseInt(body.days) || 30;
    const base = Math.max(Date.now(), sub.expiresAt || Date.now());
    sub.expiresAt = base + days * 86400000;
    if (sub.active === false) sub.active = true;
    await env.KV.put(`sub:${token}`, JSON.stringify(sub));
    return jsonResponse({ ok: true, expiresAt: sub.expiresAt });
  }

  if (action === "revoke") {
    sub.active = false;
    await env.KV.put(`sub:${token}`, JSON.stringify(sub));
    return jsonResponse({ ok: true });
  }

  if (action === "activate") {
    sub.active = true;
    // если истёк — продлеваем на 30 дней от сейчас
    if (sub.expiresAt && sub.expiresAt < Date.now()) {
      sub.expiresAt = Date.now() + 30 * 86400000;
    }
    await env.KV.put(`sub:${token}`, JSON.stringify(sub));
    return jsonResponse({ ok: true, expiresAt: sub.expiresAt });
  }

  if (action === "delete") {
    await env.KV.delete(`sub:${token}`);
    return jsonResponse({ ok: true });
  }

  return jsonResponse({ error: "Unknown action" }, 400);
}
