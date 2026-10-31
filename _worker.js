// =====================================================
// WLVPN — Cloudflare Worker (полный файл)
// Bindings: KV
// Env: ADMIN_PASSWORD, TRAFFIC_API_KEY
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
  trialRateLimit: 3,
  sessionTTL: 24 * 60 * 60 * 1000,
  infiniteExpire: 4102444800 // 01.01.2100
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
function serveSubscription(subData) {
  const body = b64(SERVERS.join("\n"));

  let userinfo;
  if (!subData) {
    userinfo = `upload=0; download=0; total=0; expire=${CONFIG.infiniteExpire}`;
  } else {
    const used = subData.trafficUsed || 0;
    const total = subData.trafficTotal || 0;
    const expireSec = subData.expiresAt ? Math.floor(subData.expiresAt / 1000) : CONFIG.infiniteExpire;
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
  if (!env.KV) return jsonResponse({ error: "KV not bound" }, 500);

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
// TRAFFIC REPORTING
// =====================================================
async function apiReportTraffic(request, env) {
  if (!env.TRAFFIC_API_KEY) return jsonResponse({ error: "TRAFFIC_API_KEY not configured" }, 500);

  const apiKey = request.headers.get("X-API-Key") || "";
  if (!timingSafeEqual(apiKey, env.TRAFFIC_API_KEY)) {
    return jsonResponse({ error: "Unauthorized" }, 401);
  }

  let body;
  try { body = await request.json(); } catch { return jsonResponse({ error: "Bad JSON" }, 400); }

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
  if (!env.ADMIN_PASSWORD) {
    return new Response("ADMIN_PASSWORD not configured. Set it via wrangler secret put ADMIN_PASSWORD", { status: 500 });
  }

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
  const gb = parseInt(body.gb) || 0;
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

// =====================================================
// CSS
// =====================================================
const CSS = `
:root{
  --bg:#050914;--surface:#0a1225;--surface2:#111b33;
  --border:rgba(120,180,255,.12);--text:#e8f0ff;--muted:#7a8aa8;
  --cyan:#00e0ff;--mint:#00ffa3;--violet:#7c5cff;--red:#ff4d6d;--yellow:#ffd166;
}
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;
  background:radial-gradient(circle at 30% 0%,#0a1430 0%,var(--bg) 60%);
  color:var(--text);min-height:100vh;-webkit-font-smoothing:antialiased;line-height:1.5}
a{color:var(--cyan)}
.wrap{max-width:1100px;margin:0 auto;padding:0 24px}
nav.top{position:fixed;top:0;left:0;right:0;z-index:100;padding:16px 0;
  background:rgba(5,9,20,.72);backdrop-filter:blur(18px);border-bottom:1px solid var(--border)}
.nav-inner{max-width:1100px;margin:0 auto;padding:0 24px;display:flex;
  justify-content:space-between;align-items:center}
.logo{font-weight:800;letter-spacing:.16em;font-size:1.15rem;
  background:linear-gradient(100deg,#fff,var(--cyan) 60%,var(--mint));
  -webkit-background-clip:text;background-clip:text;color:transparent}
.logo::before{content:'🛡 ';background:none;-webkit-text-fill-color:initial}
.btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;
  padding:12px 24px;border-radius:100px;font-size:.92rem;font-weight:600;
  cursor:pointer;border:none;text-decoration:none;transition:transform .2s,box-shadow .3s}
.btn-primary{background:linear-gradient(120deg,var(--mint),var(--cyan));color:#031018;
  box-shadow:0 10px 34px -10px rgba(0,255,163,.85)}
.btn-primary:hover{transform:translateY(-2px);box-shadow:0 16px 40px -10px rgba(0,224,255,.9)}
.btn-ghost{background:rgba(120,180,255,.06);color:var(--text);border:1px solid var(--border)}
.btn-ghost:hover{border-color:rgba(0,224,255,.5)}
.btn-danger{background:rgba(255,77,109,.15);color:var(--red);border:1px solid rgba(255,77,109,.35)}
.btn-danger:hover{background:rgba(255,77,109,.25)}
.btn-small{padding:7px 14px;font-size:.8rem;border-radius:8px}

header.hero{padding:160px 0 80px;text-align:center}
.badge{display:inline-flex;align-items:center;gap:10px;padding:7px 16px;
  border-radius:100px;background:rgba(120,180,255,.05);border:1px solid var(--border);
  font-size:.74rem;letter-spacing:.13em;text-transform:uppercase;color:var(--muted);
  margin-bottom:32px}
.badge .dot{width:7px;height:7px;border-radius:50%;background:var(--mint);
  box-shadow:0 0 10px var(--mint);animation:blink 2s infinite}
@keyframes blink{0%,100%{opacity:1}50%{opacity:.4}}
h1{font-family:system-ui,sans-serif;font-weight:800;
  font-size:clamp(2.4rem,6vw,4.6rem);line-height:1;letter-spacing:-.03em;margin-bottom:24px}
.grad{background:linear-gradient(100deg,var(--cyan),var(--mint));
  -webkit-background-clip:text;background-clip:text;color:transparent}
.sub{max-width:600px;margin:0 auto 40px;color:var(--muted);font-size:1.05rem;line-height:1.75}
.hero-actions{display:flex;gap:14px;justify-content:center;flex-wrap:wrap;margin-bottom:56px}
.hero-actions .btn{padding:16px 34px;font-size:1rem}

.features{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));
  gap:20px;margin-top:60px;text-align:left}
.feature{padding:28px 24px;border-radius:18px;background:rgba(120,180,255,.04);
  border:1px solid var(--border);transition:border-color .3s,transform .3s}
.feature:hover{border-color:rgba(0,224,255,.35);transform:translateY(-3px)}
.feature-icon{font-size:1.6rem;margin-bottom:14px}
.feature h3{font-size:1.05rem;margin-bottom:8px}
.feature p{color:var(--muted);font-size:.9rem;line-height:1.6}

.modal-bg{position:fixed;inset:0;background:rgba(5,9,20,.85);backdrop-filter:blur(8px);
  z-index:1000;display:none;align-items:center;justify-content:center;padding:20px}
.modal-bg.show{display:flex}
.modal{max-width:480px;width:100%;background:var(--surface);border:1px solid var(--border);
  border-radius:22px;padding:32px 28px;position:relative;animation:pop .3s ease-out}
@keyframes pop{from{opacity:0;transform:scale(.95)}to{opacity:1;transform:scale(1)}}
.modal h2{font-size:1.4rem;margin-bottom:8px}
.modal p{color:var(--muted);font-size:.9rem;margin-bottom:22px}
.modal-close{position:absolute;top:16px;right:18px;background:none;border:none;
  color:var(--muted);font-size:1.6rem;cursor:pointer;line-height:1}
.qr-box{display:flex;justify-content:center;margin-bottom:22px;padding:16px;
  background:#fff;border-radius:14px;width:fit-content;margin-left:auto;margin-right:auto}
.sub-url{display:flex;gap:8px;margin-bottom:16px}
.sub-url input{flex:1;padding:12px 14px;border-radius:10px;border:1px solid var(--border);
  background:rgba(0,0,0,.4);color:var(--text);font-family:monospace;font-size:.85rem}
.copy-btn{padding:0 16px;border-radius:10px;border:1px solid var(--border);
  background:rgba(0,224,255,.1);color:var(--cyan);cursor:pointer;font-weight:600;font-size:.85rem}
.copy-btn:hover{background:rgba(0,224,255,.2)}
.info-row{display:flex;justify-content:space-between;padding:10px 0;
  border-top:1px solid var(--border);font-size:.88rem}
.info-row span:first-child{color:var(--muted)}
.info-row b{color:var(--text)}

.sub-page{padding:120px 0 60px;max-width:520px;margin:0 auto}
.card{background:var(--surface);border:1px solid var(--border);border-radius:22px;
  padding:32px 28px;box-shadow:0 20px 50px -20px rgba(0,0,0,.6)}
.card h1{font-size:1.5rem;margin-bottom:24px}
.card .status-pill{display:inline-flex;align-items:center;gap:6px;padding:5px 12px;
  border-radius:100px;font-size:.75rem;font-weight:600;margin-left:8px;vertical-align:middle}
.status-active{background:rgba(0,255,163,.12);color:var(--mint);border:1px solid rgba(0,255,163,.25)}
.status-expired{background:rgba(255,209,102,.12);color:var(--yellow);border:1px solid rgba(255,209,102,.25)}
.status-revoked{background:rgba(255,77,109,.12);color:var(--red);border:1px solid rgba(255,77,109,.25)}
.status-limit{background:rgba(255,209,102,.12);color:var(--yellow);border:1px solid rgba(255,209,102,.25)}
.bar{height:8px;background:rgba(255,255,255,.05);border-radius:100px;overflow:hidden;margin:12px 0}
.bar-fill{height:100%;background:linear-gradient(90deg,var(--cyan),var(--mint));border-radius:100px;transition:width .4s}

.login-wrap{padding:120px 0 60px;max-width:400px;margin:0 auto}
.login-card{background:var(--surface);border:1px solid var(--border);border-radius:22px;padding:36px 30px}
.login-card h1{font-size:1.5rem;margin-bottom:8px;text-align:center}
.login-card p{color:var(--muted);font-size:.9rem;text-align:center;margin-bottom:24px}
.login-card input{width:100%;padding:13px 16px;border-radius:10px;border:1px solid var(--border);
  background:rgba(0,0,0,.35);color:var(--text);font-size:.95rem;margin-bottom:16px}
.login-card input:focus{outline:none;border-color:var(--cyan)}
.login-card .btn{width:100%}
.error{background:rgba(255,77,109,.1);border:1px solid rgba(255,77,109,.3);color:var(--red);
  padding:10px 14px;border-radius:10px;font-size:.85rem;margin-bottom:16px;text-align:center}

.dash{padding:100px 0 60px}
.dash-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:32px;flex-wrap:wrap;gap:16px}
.dash-head h1{font-size:1.7rem}
.dash-head .actions{display:flex;gap:10px}
.stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:16px;margin-bottom:32px}
.stat{background:var(--surface);border:1px solid var(--border);border-radius:16px;padding:20px 22px}
.stat .label{color:var(--muted);font-size:.78rem;text-transform:uppercase;letter-spacing:.1em;margin-bottom:8px}
.stat .value{font-size:1.7rem;font-weight:700;letter-spacing:-.02em}
.stat .value.cyan{color:var(--cyan)}
.stat .value.mint{color:var(--mint)}
.stat .value.red{color:var(--red)}
.stat .value.yellow{color:var(--yellow)}

.create-form{background:var(--surface);border:1px solid var(--border);border-radius:16px;
  padding:22px;margin-bottom:28px;display:grid;grid-template-columns:2fr 1fr 1fr auto auto;
  gap:12px;align-items:center}
.create-form input{padding:10px 14px;border-radius:10px;border:1px solid var(--border);
  background:rgba(0,0,0,.35);color:var(--text);font-size:.9rem}
.create-form input:focus{outline:none;border-color:var(--cyan)}
.create-form label{display:flex;align-items:center;gap:6px;color:var(--muted);font-size:.85rem;white-space:nowrap}

.table-wrap{background:var(--surface);border:1px solid var(--border);border-radius:16px;overflow:hidden}
table{width:100%;border-collapse:collapse;font-size:.88rem}
thead{background:rgba(120,180,255,.04)}
th{padding:14px 16px;text-align:left;color:var(--muted);font-weight:600;
  font-size:.76rem;text-transform:uppercase;letter-spacing:.08em;border-bottom:1px solid var(--border)}
td{padding:14px 16px;border-bottom:1px solid rgba(120,180,255,.06);vertical-align:middle}
tr:last-child td{border-bottom:none}
tr:hover td{background:rgba(120,180,255,.03)}
.token-cell{font-family:monospace;font-size:.82rem;color:var(--cyan)}
.pill{display:inline-block;padding:3px 10px;border-radius:100px;font-size:.75rem;font-weight:600}
.pill-active{background:rgba(0,255,163,.12);color:var(--mint)}
.pill-expired{background:rgba(255,209,102,.12);color:var(--yellow)}
.pill-revoked{background:rgba(255,77,109,.12);color:var(--red)}
.pill-limit{background:rgba(255,209,102,.12);color:var(--yellow)}
.actions-cell{display:flex;gap:6px;flex-wrap:wrap}
.empty{padding:50px 20px;text-align:center;color:var(--muted)}
.toast{position:fixed;bottom:24px;right:24px;padding:14px 22px;border-radius:12px;
  background:var(--surface2);border:1px solid var(--border);font-size:.9rem;
  box-shadow:0 10px 30px rgba(0,0,0,.4);animation:slideIn .3s ease-out;z-index:2000}
.toast.success{border-color:rgba(0,255,163,.4);color:var(--mint)}
.toast.error{border-color:rgba(255,77,109,.4);color:var(--red)}
@keyframes slideIn{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
@media(max-width:720px){
  .create-form{grid-template-columns:1fr}
  .dash{padding:80px 0 40px}
  table{font-size:.82rem}
  th,td{padding:10px 8px}
}
`;

// =====================================================
// LANDING PAGE
// =====================================================
function renderLanding(url) {
  return `<!doctype html>
<html lang="ru"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>WLVPN — Свободный интернет на VLESS</title>
<style>${CSS}</style>
</head><body>

<nav class="top">
  <div class="nav-inner">
    <div class="logo">WLVPN</div>
    <button class="btn btn-ghost btn-small" onclick="startTrial(event)">Получить доступ</button>
  </div>
</nav>

<header class="hero wrap" id="trial">
  <div class="badge"><span class="dot"></span> VLESS · Скорость до 10 Гбит/с</div>
  <h1>Твой интернет.<br><span class="grad">Твои правила.</span></h1>
  <p class="sub">
    Протокол VLESS, серверы в Германии, Швеции, Польше и России.
    Обход блокировок, белых списков и ограничений мобильных операторов.
  </p>
  <div class="hero-actions">
    <button class="btn btn-primary" onclick="startTrial(event)">Попробовать 7 дней бесплатно</button>
  </div>

  <div class="features">
    <div class="feature"><div class="feature-icon">⚡</div><h3>VLESS</h3><p>Лёгкий протокол с маскировкой под HTTPS и минимальными задержками.</p></div>
    <div class="feature"><div class="feature-icon">🔓</div><h3>Обход блокировок</h3><p>YouTube, Discord, Telegram — без белых списков и DPI-фильтров.</p></div>
    <div class="feature"><div class="feature-icon">📶</div><h3>Белый список</h3><p>Отдельные серверы для мобильных операторов с ограничениями.</p></div>
    <div class="feature"><div class="feature-icon">🛡️</div><h3>Без утечек</h3><p>DNS, IPv6 и WebRTC заблокированы на уровне клиента.</p></div>
    <div class="feature"><div class="feature-icon">🚀</div><h3>До 10 Гбит/с</h3><p>Стриминг 4K, игры и загрузки без буферизации.</p></div>
    <div class="feature"><div class="feature-icon">🎛️</div><h3>Один клик</h3><p>Скопировал ссылку — подключился в любом VPN-клиенте.</p></div>
  </div>
</header>

<div class="modal-bg" id="modal">
  <div class="modal">
    <button class="modal-close" onclick="closeModal()">×</button>
    <h2>Твоя подписка готова!</h2>
    <p>Скопируй ссылку ниже и добавь её в свой VPN-клиент (Happ, Incy, v2rayNG, Streisand, sing-box и др.)</p>
    <div class="qr-box" id="qr-box"></div>
    <div class="sub-url">
      <input type="text" id="sub-url" readonly>
      <button class="copy-btn" onclick="copyUrl(event)">Копировать</button>
    </div>
    <div class="info-row"><span>Срок действия</span><b id="modal-expires">—</b></div>
    <div class="info-row"><span>Трафик</span><b id="modal-traffic">—</b></div>
  </div>
</div>

<script src="https://cdn.jsdelivr.net/npm/qrcode-generator@1.4.4/qrcode.min.js"></script>
<script>
async function startTrial(e){
  e.preventDefault();
  const btn = e.currentTarget;
  const original = btn.textContent;
  btn.textContent = 'Создаём...';
  btn.disabled = true;
  try{
    const res = await fetch('/api/trial', { method: 'POST' });
    const data = await res.json();
    if(!res.ok) throw new Error(data.error || 'Ошибка');
    showModal(data);
  }catch(err){
    alert(err.message);
  }finally{
    btn.textContent = original;
    btn.disabled = false;
  }
}

function showModal(data){
  document.getElementById('sub-url').value = data.url;
  document.getElementById('modal-expires').textContent =
    new Date(data.expiresAt).toLocaleDateString('ru-RU') + ' (' + data.days + ' дн.)';
  document.getElementById('modal-traffic').textContent = data.trafficGB + ' ГБ';
  try{
    const qr = qrcode(0, 'M');
    qr.addData(data.url);
    qr.make();
    document.getElementById('qr-box').innerHTML = qr.createSvgTag({ cellSize: 5, margin: 2 });
  }catch(err){ console.warn('QR failed', err); }
  document.getElementById('modal').classList.add('show');
}

function closeModal(){ document.getElementById('modal').classList.remove('show'); }
function copyUrl(e){
  const input = document.getElementById('sub-url');
  input.select();
  navigator.clipboard.writeText(input.value);
  const btn = e.currentTarget;
  const orig = btn.textContent;
  btn.textContent = '✓';
  setTimeout(() => btn.textContent = orig, 1500);
}
document.getElementById('modal').addEventListener('click', e => {
  if(e.target.id === 'modal') closeModal();
});
</script>
</body></html>`;
}

// =====================================================
// SUB INFO PAGE
// =====================================================
function renderSubInfoPage(sub, token) {
  if (!sub) {
    return `<!doctype html><html lang="ru"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>WLVPN — Подписка не найдена</title><style>${CSS}</style></head><body>
<nav class="top"><div class="nav-inner"><div class="logo">WLVPN</div>
<a href="/" class="btn btn-ghost btn-small">На главную</a></div></nav>
<div class="sub-page"><div class="card" style="text-align:center">
<h1>Подписка не найдена</h1>
<p style="color:var(--muted);margin-bottom:24px">Токен <code style="color:var(--cyan)">${escapeHtml(token)}</code> не существует или был удалён.</p>
<a href="/" class="btn btn-primary">Получить новую</a>
</div></div></body></html>`;
  }

  const isExpired = sub.expiresAt && sub.expiresAt < Date.now();
  const isRevoked = !sub.active;
  const isLimit = sub.trafficTotal > 0 && sub.trafficUsed >= sub.trafficTotal;

  let status = "active", label = "Активна";
  if (isRevoked) { status = "revoked"; label = "Отозвана"; }
  else if (isExpired) { status = "expired"; label = "Истекла"; }
  else if (isLimit) { status = "limit"; label = "Лимит трафика"; }

  const used = sub.trafficUsed || 0;
  const total = sub.trafficTotal || 0;
  const percent = total > 0 ? Math.min(100, used / total * 100) : 0;
  const relUrl = `/sub/${token}`;

  return `<!doctype html>
<html lang="ru"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>WLVPN — Подписка</title>
<style>${CSS}</style>
</head><body>
<nav class="top"><div class="nav-inner"><div class="logo">WLVPN</div>
<a href="/" class="btn btn-ghost btn-small">На главную</a></div></nav>
<div class="sub-page">
  <div class="card">
    <h1>Подписка <span class="status-pill status-${status}">${label}</span></h1>

    <div style="margin-bottom:18px">
      <div style="display:flex;justify-content:space-between;font-size:.88rem;margin-bottom:6px">
        <span style="color:var(--muted)">Трафик</span>
        <b>${formatBytes(used)} / ${total > 0 ? formatBytes(total) : '∞'}</b>
      </div>
      <div class="bar"><div class="bar-fill" style="width:${percent.toFixed(1)}%"></div></div>
    </div>

    <div class="info-row"><span>Срок действия</span><b>${formatDate(sub.expiresAt)}</b></div>
    <div class="info-row"><span>Создана</span><b>${formatDate(sub.createdAt)}</b></div>
    <div class="info-row"><span>Тип</span><b>${escapeHtml(sub.type || 'custom')}</b></div>

    <div style="margin-top:22px">
      <p style="color:var(--muted);font-size:.9rem;margin-bottom:10px">
        Ссылка для клиента (скопируйте и вставьте в VPN-клиент):
      </p>
      <div class="sub-url">
        <input type="text" id="sub-url" readonly value="${escapeHtml(relUrl)}">
        <button class="copy-btn" onclick="copyUrl(event)">Копировать</button>
      </div>
    </div>
  </div>
</div>
<script>
document.getElementById('sub-url').value = location.origin + ${JSON.stringify(relUrl)};
function copyUrl(e){
  const i = document.getElementById('sub-url');
  i.select();
  navigator.clipboard.writeText(i.value);
  const btn = e.currentTarget;
  const o = btn.textContent; btn.textContent = '✓';
  setTimeout(()=>btn.textContent=o, 1500);
}
</script>
</body></html>`;
}

// =====================================================
// ADMIN — LOGIN
// =====================================================
function renderAdminLogin(error) {
  return `<!doctype html>
<html lang="ru"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>WLVPN — Админ</title><style>${CSS}</style></head><body>
<div class="login-wrap">
  <div class="login-card">
    <h1>Админ-панель</h1>
    <p>WLVPN · управление подписками</p>
    ${error ? '<div class="error">Неверный пароль</div>' : ''}
    <form method="POST" action="/admin/login">
      <input type="password" name="password" placeholder="Пароль" required autofocus>
      <button type="submit" class="btn btn-primary">Войти</button>
    </form>
  </div>
</div>
</body></html>`;
}

// =====================================================
// ADMIN — DASHBOARD
// =====================================================
function renderAdminDashboard() {
  return `<!doctype html>
<html lang="ru"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>WLVPN — Панель управления</title><style>${CSS}</style></head><body>

<nav class="top">
  <div class="nav-inner">
    <div class="logo">WLVPN · Admin</div>
    <form method="POST" action="/admin/logout" style="margin:0">
      <button class="btn btn-ghost btn-small">Выйти</button>
    </form>
  </div>
</nav>

<div class="dash wrap">
  <div class="dash-head">
    <h1>Подписки</h1>
    <div class="actions">
      <a href="/" target="_blank" class="btn btn-ghost btn-small">Открыть сайт</a>
      <button class="btn btn-ghost btn-small" onclick="loadAll()">Обновить</button>
    </div>
  </div>

  <div class="stats" id="stats"></div>

  <div class="create-form">
    <input id="f-note" placeholder="Заметка (например: клиент @user)">
    <input id="f-days" type="number" placeholder="Дней" value="30" min="1">
    <input id="f-gb" type="number" placeholder="ГБ (0 = ∞)" value="0" min="0">
    <label><input id="f-infinite" type="checkbox"> Бессрочная</label>
    <button class="btn btn-primary" onclick="createSub()">Создать</button>
  </div>

  <div class="table-wrap">
    <table>
      <thead><tr>
        <th>Токен</th><th>Статус</th><th>Срок</th><th>Трафик</th><th>Заметка</th><th>Действия</th>
      </tr></thead>
      <tbody id="tbody"><tr><td colspan="6" class="empty">Загрузка…</td></tr></tbody>
    </table>
  </div>
</div>

<script>
async function loadAll(){
  await Promise.all([loadStats(), loadList()]);
}

async function loadStats(){
  try{
    const r = await fetch('/admin/api/stats');
    const d = await r.json();
    document.getElementById('stats').innerHTML = \`
      <div class="stat"><div class="label">Всего</div><div class="value">\${d.total}</div></div>
      <div class="stat"><div class="label">Активных</div><div class="value mint">\${d.active}</div></div>
      <div class="stat"><div class="label">Истекло</div><div class="value yellow">\${d.expired}</div></div>
      <div class="stat"><div class="label">Отозвано</div><div class="value red">\${d.revoked}</div></div>
      <div class="stat"><div class="label">Потрачено</div><div class="value cyan">\${fmt(d.totalUsed)}</div></div>
    \`;
  }catch(e){ console.error(e); }
}

async function loadList(){
  try{
    const r = await fetch('/admin/api/list');
    const d = await r.json();
    const tbody = document.getElementById('tbody');
    if(!d.subs.length){
      tbody.innerHTML = '<tr><td colspan="6" class="empty">Подписок пока нет. Создай первую выше.</td></tr>';
      return;
    }
    tbody.innerHTML = d.subs.map(s => {
      const expire = s.expiresAt ? new Date(s.expiresAt).toLocaleDateString('ru-RU') : '∞';
      const traffic = s.trafficTotal > 0 ? \`\${fmt(s.trafficUsed)} / \${fmt(s.trafficTotal)}\` : '∞ / ∞';
      return \`<tr>
        <td><span class="token-cell">\${s.token}</span></td>
        <td><span class="pill pill-\${s.status}">\${statusLabel(s.status)}</span></td>
        <td>\${expire}</td>
        <td style="font-size:.82rem;color:var(--muted)">\${traffic}</td>
        <td style="font-size:.85rem;color:var(--muted)">\${escape(s.note || '—')}</td>
        <td><div class="actions-cell">
          <button class="btn btn-ghost btn-small" onclick="act('\${s.token}','extend',30)">+30д</button>
          <button class="btn btn-ghost btn-small" onclick="copyLink('\${s.token}')">Ссылка</button>
          \${s.active ? \`<button class="btn btn-ghost btn-small" onclick="act('\${s.token}','revoke')">Отозвать</button>\` : \`<button class="btn btn-ghost btn-small" onclick="act('\${s.token}','activate')">Вернуть</button>\`}
          <button class="btn btn-danger btn-small" onclick="if(confirm('Удалить подписку \${s.token}?'))act('\${s.token}','delete')">Удалить</button>
        </div></td>
      </tr>\`;
    }).join('');
  }catch(e){ console.error(e); }
}

async function createSub(){
  const body = {
    note: document.getElementById('f-note').value.trim(),
    days: parseInt(document.getElementById('f-days').value) || 30,
    gb: parseInt(document.getElementById('f-gb').value) || 0,
    infinite: document.getElementById('f-infinite').checked
  };
  const r = await fetch('/admin/api/create', {
    method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body)
  });
  const d = await r.json();
  if(r.ok){
    toast('Подписка создана: ' + d.token, 'success');
    document.getElementById('f-note').value = '';
    loadAll();
  } else toast(d.error || 'Ошибка', 'error');
}

async function act(token, action, days){
  const r = await fetch('/admin/api/' + token + '/' + action, {
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body: JSON.stringify(days ? { days } : {})
  });
  const d = await r.json();
  if(r.ok){ toast('OK', 'success'); loadAll(); }
  else toast(d.error || 'Ошибка', 'error');
}

function copyLink(token){
  const url = location.origin + '/sub/' + token;
  navigator.clipboard.writeText(url);
  toast('Скопировано: ' + url, 'success');
}

function fmt(b){
  if(!b) return '0 B';
  const u = ['B','KB','MB','GB','TB']; let i=0;
  while(b >= 1024 && i < u.length-1){ b/=1024; i++; }
  return b.toFixed(2)+' '+u[i];
}

function statusLabel(s){
  return { active:'Активна', expired:'Истекла', revoked:'Отозвана', limit:'Лимит' }[s] || s;
}

function escape(s){ return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

function toast(msg, type='success'){
  const t = document.createElement('div');
  t.className = 'toast ' + type;
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 3000);
}

loadAll();
setInterval(loadAll, 30000);
</script>
</body></html>`;
}
