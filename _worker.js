// ============================================================
// WLVPN — Cloudflare Worker (полная версия)
// KV binding: KV
// ============================================================

// ⚠️ ПАРОЛЬ АДМИНКИ — прямо в коде
const ADMIN_PASSWORD = "wlvpn2025admin";
const TRAFFIC_API_KEY = "traffic-secret-2025";

const SERVERS = [
  "vless://31dac09f-78ee-49ca-9566-d20aea578fdc@de-new.datanode-internal.net:443?flow=xtls-rprx-vision&type=tcp&security=reality&fp=qq&sni=openwrt.lan&pbk=r6lN34m1nN-xQZ458j5NPD5xJ3_QBF2bGzY4KJEo4ic&sid=abbcd128#%F0%9F%87%A9%F0%9F%87%AA+%D0%93%D0%B5%D1%80%D0%BC%D0%B0%D0%BD%D0%B8%D1%8F",
  "vless://31dac09f-78ee-49ca-9566-d20aea578fdc@se-new.datanode-internal.net:443?flow=xtls-rprx-vision&type=tcp&security=reality&fp=qq&sni=openwrt.lan&pbk=r6lN34m1nN-xQZ458j5NPD5xJ3_QBF2bGzY4KJEo4ic&sid=abbcd128#%F0%9F%87%B8%F0%9F%87%AA+%D0%A8%D0%B2%D0%B5%D1%86%D0%B8%D1%8F",
  "vless://31dac09f-78ee-49ca-9566-d20aea578fdc@pl.datanode-internal.net:443?flow=xtls-rprx-vision&type=tcp&security=reality&fp=qq&sni=openwrt.lan&pbk=r6lN34m1nN-xQZ458j5NPD5xJ3_QBF2bGzY4KJEo4ic&sid=abbcd128#%F0%9F%87%B5%F0%9F%87%B1+%D0%9F%D0%BE%D0%BB%D1%8C%D1%88%D0%B0",
  "vless://31dac09f-78ee-49ca-9566-d20aea578fdc@ru.datanode-internal.net:443?flow=xtls-rprx-vision&type=tcp&security=reality&fp=qq&sni=openwrt.lan&pbk=r6lN34m1nN-xQZ458j5NPD5xJ3_QBF2bGzY4KJEo4ic&sid=abbcd128#%F0%9F%87%B7%F0%9F%87%BA+%D0%A0%D0%BE%D1%81%D1%81%D0%B8%D1%8F",
  "vless://4054fdc2-ee80-4419-8a8e-d937df4719e2@qq.utiltools.site:443?flow=xtls-rprx-vision&type=tcp&headerType=none&security=reality&fp=qq&sni=qq.utiltools.site&pbk=drY21DHNOr6ezJLA2B10mzTExeJ9-gVBfTBNLwVBtWI#%F0%9F%87%AA%F0%9F%87%BA+Telegram+Proxy",
  "vless://31dac09f-78ee-49ca-9566-d20aea578fdc@hole-nn.datanode-internal.net:443?type=grpc&security=reality&fp=qq&sni=river-2-611.rtbcdn.ru&pbk=r6lN34m1nN-xQZ458j5NPD5xJ3_QBF2bGzY4KJEo4ic&sid=abbcd128&serviceName=ads.x5.ru&mode=gun#%F0%9F%87%A9%F0%9F%87%AA+%D0%91%D0%B5%D0%BB%D1%8B%D0%B9+%D1%81%D0%BF%D0%B8%D1%81%D0%BE%D0%BA+%231+%7C+TCP",
];

const CONFIG = {
  trialDays: 7,
  trialTrafficGB: 50,
  trialRateLimit: 1,
  sessionTTL: 24 * 60 * 60 * 1000,
  infiniteExpire: 4102444800
};

// ============================================================
// ENTRY
// ============================================================
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

  if (path === "/" || path === "") {
    if (isBrowser(ua)) return htmlResponse(renderLanding(url));
    return serveSubscription(null);
  }

  return new Response("Not Found", { status: 404 });
}

// ============================================================
// UTILS
// ============================================================
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

// ============================================================
// SUBSCRIPTION
// ============================================================
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

// ============================================================
// TRIAL API
// ============================================================
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

// ============================================================
// TRAFFIC REPORTING
// ============================================================
async function apiReportTraffic(request, env) {
  const apiKey = request.headers.get("X-API-Key") || "";
  if (!timingSafeEqual(apiKey, TRAFFIC_API_KEY)) {
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

// ============================================================
// SESSIONS
// ============================================================
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

// ============================================================
// ADMIN
// ============================================================
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

  if (!timingSafeEqual(password, ADMIN_PASSWORD)) {
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

// ============================================================
// CSS — общий для лендинга, sub, admin
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

/* CURSOR */
.cursor,.cursor-dot{
  position:fixed;top:0;left:0;pointer-events:none;z-index:9999;
  border-radius:50%;transform:translate(-50%,-50%);mix-blend-mode:screen;
}
.cursor{
  width:36px;height:36px;border:1px solid rgba(0,224,255,.8);
  transition:width .25s,height .25s,background .25s,border-color .25s;
}
.cursor-dot{width:5px;height:5px;background:var(--mint)}
.cursor.hover{width:70px;height:70px;background:rgba(0,224,255,.14);border-color:rgba(0,255,163,.9)}
@media (hover:none){.cursor,.cursor-dot{display:none}}

/* CANVAS */
#stars{position:fixed;inset:0;z-index:0;opacity:.85}

/* AURORA */
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

/* NAV */
nav.top{
  position:fixed;top:0;left:0;right:0;z-index:100;
  transition:background .4s,backdrop-filter .4s,border-color .4s;
  border-bottom:1px solid transparent;
}
nav.top.scrolled{background:rgba(5,9,20,.78);backdrop-filter:blur(18px);border-bottom-color:var(--stroke)}
.nav-inner{
  max-width:1240px;margin:0 auto;padding:18px 28px;
  display:flex;align-items:center;justify-content:space-between;
}
.logo{
  display:flex;align-items:center;gap:10px;
  font-weight:800;font-size:1.3rem;letter-spacing:.16em;
}
.logo-mark{
  width:30px;height:30px;border-radius:9px;
  background:linear-gradient(140deg,var(--cyan),var(--mint));
  box-shadow:0 0 20px -4px rgba(0,224,255,.9);
  display:grid;place-items:center;
}
.logo-mark::before{
  content:'';width:12px;height:14px;background:var(--bg);
  clip-path:polygon(50% 0,100% 25%,100% 75%,50% 100%,0 75%,0 25%);
}
.logo span{
  background:linear-gradient(100deg,#fff,var(--cyan) 60%,var(--mint));
  -webkit-background-clip:text;background-clip:text;color:transparent;
}
.nav-links{display:flex;gap:32px;list-style:none}
.nav-links a{
  color:var(--muted);text-decoration:none;font-size:.9rem;
  letter-spacing:.04em;position:relative;transition:color .3s;
}
.nav-links a::after{
  content:'';position:absolute;left:0;bottom:-6px;width:0;height:1px;
  background:linear-gradient(90deg,var(--cyan),var(--mint));
  transition:width .35s cubic-bezier(.65,0,.35,1);
}
.nav-links a:hover{color:#fff}
.nav-links a:hover::after{width:100%}
.nav-cta{
  padding:10px 22px;border-radius:100px;font-size:.85rem;font-weight:600;
  color:#031018;text-decoration:none;
  background:linear-gradient(120deg,var(--mint),var(--cyan));
  transition:box-shadow .4s,transform .3s;
}
.nav-cta:hover{box-shadow:0 8px 30px -6px rgba(0,255,163,.8);transform:translateY(-2px)}
@media(max-width:880px){.nav-links{display:none}}

/* BUTTONS */
.btn{
  display:inline-flex;align-items:center;justify-content:center;gap:8px;
  padding:12px 24px;border-radius:100px;font-size:.92rem;font-weight:600;
  cursor:pointer;border:none;text-decoration:none;
  transition:transform .2s,box-shadow .3s;
}
.btn-primary{
  background:linear-gradient(120deg,var(--mint),var(--cyan));color:#031018;
  box-shadow:0 10px 34px -10px rgba(0,255,163,.85);
}
.btn-primary:hover{transform:translateY(-2px);box-shadow:0 16px 40px -10px rgba(0,224,255,.9)}
.btn-ghost{background:var(--glass);color:var(--text);border:1px solid var(--stroke)}
.btn-ghost:hover{border-color:rgba(0,224,255,.5)}
.btn-danger{background:rgba(255,77,109,.15);color:var(--red);border:1px solid rgba(255,77,109,.35)}
.btn-danger:hover{background:rgba(255,77,109,.25)}
.btn-small{padding:7px 14px;font-size:.8rem;border-radius:8px}

/* HERO */
header.hero{min-height:100vh;display:flex;align-items:center;padding:150px 0 100px;position:relative}
.badge{
  display:inline-flex;align-items:center;gap:10px;
  padding:7px 16px 7px 10px;border-radius:100px;
  background:var(--glass);border:1px solid var(--stroke);
  font-size:.76rem;letter-spacing:.13em;text-transform:uppercase;color:var(--muted);
  margin-bottom:32px;backdrop-filter:blur(10px);
}
.pulse{
  width:7px;height:7px;border-radius:50%;background:var(--mint);
  box-shadow:0 0 0 0 rgba(0,255,163,.7);animation:pulse 2s infinite;
}
@keyframes pulse{
  70%{box-shadow:0 0 0 12px rgba(0,255,163,0)}
  100%{box-shadow:0 0 0 0 rgba(0,255,163,0)}
}
h1.title{
  font-weight:800;font-size:clamp(2.8rem,7.6vw,6.4rem);
  line-height:.95;letter-spacing:-.035em;margin-bottom:28px;
}
h1.title .line{display:block;overflow:hidden}
h1.title .line > span{display:block;transform:translateY(110%);animation:rise 1.1s cubic-bezier(.16,1,.3,1) forwards}
h1.title .line:nth-child(2) > span{animation-delay:.12s}
h1.title .line:nth-child(3) > span{animation-delay:.24s}
@keyframes rise{to{transform:translateY(0)}}
.grad{
  background:linear-gradient(100deg,var(--cyan) 0%,#a6f6ff 45%,var(--mint) 100%);
  background-size:220% 100%;
  -webkit-background-clip:text;background-clip:text;color:transparent;
  animation:shift 7s ease-in-out infinite;
}
@keyframes shift{
  0%,100%{background-position:0% 50%}
  50%{background-position:100% 50%}
}
.hero-sub{
  max-width:600px;font-size:1.06rem;line-height:1.75;color:var(--muted);
  margin-bottom:44px;opacity:0;
  animation:fadeUp .9s .5s cubic-bezier(.16,1,.3,1) forwards;
}
@keyframes fadeUp{from{opacity:0;transform:translateY(24px)}to{opacity:1;transform:translateY(0)}}
.hero-actions{
  display:flex;gap:18px;flex-wrap:wrap;align-items:center;
  opacity:0;animation:fadeUp .9s .65s cubic-bezier(.16,1,.3,1) forwards;
}
.hero-actions .btn{padding:16px 36px;font-size:1rem}
.trust{
  display:flex;gap:34px;flex-wrap:wrap;margin-top:56px;
  opacity:0;animation:fadeUp .9s .85s cubic-bezier(.16,1,.3,1) forwards;
}
.trust-item{display:flex;align-items:center;gap:10px;color:var(--muted);font-size:.86rem}
.trust-item svg{width:18px;height:18px;flex-shrink:0;color:var(--mint)}

/* SECTIONS */
section{padding:120px 0;position:relative}
.sec-head{margin-bottom:64px;max-width:680px}
.sec-tag{
  font-size:.76rem;letter-spacing:.28em;text-transform:uppercase;
  color:var(--mint);margin-bottom:16px;display:block;
}
h2.sec{font-weight:800;font-size:clamp(2rem,4.6vw,3.4rem);line-height:1.05;letter-spacing:-.025em}
.sec-head p{color:var(--muted);margin-top:20px;line-height:1.75;font-size:1rem;max-width:560px}

/* REVEAL */
.reveal{opacity:0;transform:translateY(44px);transition:opacity .9s cubic-bezier(.16,1,.3,1),transform .9s cubic-bezier(.16,1,.3,1)}
.reveal.in{opacity:1;transform:none}

/* SERVERS */
.servers-note{
  display:flex;align-items:center;gap:12px;flex-wrap:wrap;
  padding:14px 22px;border-radius:100px;
  background:var(--glass);border:1px solid var(--stroke);
  font-size:.85rem;color:var(--muted);margin-bottom:40px;width:fit-content;
  backdrop-filter:blur(10px);
}
.servers-note strong{color:var(--mint);font-weight:600}
.servers-note .dot{width:8px;height:8px;border-radius:50%;background:var(--mint);box-shadow:0 0 12px var(--mint)}
.servers-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:22px}
.server-card{
  position:relative;padding:32px 28px;border-radius:22px;
  background:var(--glass);border:1px solid var(--stroke);
  backdrop-filter:blur(16px);
  transition:transform .25s ease-out,border-color .4s,box-shadow .4s;
  transform-style:preserve-3d;overflow:hidden;
}
.server-card::before{
  content:'';position:absolute;inset:0;border-radius:22px;opacity:0;
  background:radial-gradient(420px circle at var(--mx,50%) var(--my,50%),rgba(0,224,255,.18),transparent 60%);
  transition:opacity .4s;pointer-events:none;
}
.server-card:hover::before{opacity:1}
.server-card:hover{border-color:rgba(0,224,255,.5);box-shadow:0 26px 60px -24px rgba(0,224,255,.5)}
.server-flag{font-size:2.4rem;line-height:1;margin-bottom:16px}
.server-name{font-weight:700;font-size:1.35rem;margin-bottom:24px;letter-spacing:-.01em}
.server-stats{display:grid;gap:12px}
.server-stat{
  display:flex;justify-content:space-between;align-items:center;
  padding:11px 14px;border-radius:11px;
  background:rgba(255,255,255,.025);
  border:1px solid rgba(255,255,255,.04);
  font-size:.86rem;
}
.server-stat span{color:var(--muted);letter-spacing:.03em}
.server-stat b{color:var(--text);font-weight:600;font-variant-numeric:tabular-nums}
.server-stat .ping-val{color:var(--mint)}
.server-stat .proto{color:var(--cyan);letter-spacing:.06em}
.live-dot{
  display:inline-block;width:6px;height:6px;border-radius:50%;
  background:var(--mint);margin-right:6px;box-shadow:0 0 8px var(--mint);
  animation:blink 1.6s ease-in-out infinite;vertical-align:middle;
}
@keyframes blink{0%,100%{opacity:1}50%{opacity:.35}}

/* FEATURES */
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:22px}
.card{
  position:relative;padding:38px 30px;border-radius:22px;
  background:var(--glass);border:1px solid var(--stroke);
  backdrop-filter:blur(16px);
  transition:transform .2s ease-out,border-color .4s,box-shadow .4s;
  transform-style:preserve-3d;overflow:hidden;
}
.card::before{
  content:'';position:absolute;inset:0;border-radius:22px;opacity:0;
  background:radial-gradient(420px circle at var(--mx,50%) var(--my,50%),rgba(124,92,255,.22),transparent 60%);
  transition:opacity .4s;pointer-events:none;
}
.card:hover::before{opacity:1}
.card:hover{border-color:rgba(124,92,255,.5);box-shadow:0 26px 60px -24px rgba(124,92,255,.55)}
.card-icon{
  width:52px;height:52px;border-radius:15px;display:grid;place-items:center;
  font-size:1.4rem;margin-bottom:24px;
  background:linear-gradient(140deg,rgba(0,224,255,.24),rgba(0,255,163,.14));
  border:1px solid rgba(120,180,255,.14);
}
.card h3{font-size:1.18rem;margin-bottom:12px;letter-spacing:-.01em;font-weight:600}
.card p{color:var(--muted);font-size:.94rem;line-height:1.7}
.card p b{color:var(--cyan);font-weight:600}

/* STEPS */
.steps{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:30px}
.step{
  position:relative;padding:32px 26px 30px;border-radius:22px;
  background:var(--glass);border:1px solid var(--stroke);backdrop-filter:blur(14px);
}
.step-num{
  width:44px;height:44px;border-radius:13px;display:grid;place-items:center;
  font-weight:800;font-size:1.15rem;color:#031018;margin-bottom:22px;
  background:linear-gradient(140deg,var(--mint),var(--cyan));
  box-shadow:0 0 24px -6px rgba(0,255,163,.8);
}
.step h3{font-size:1.15rem;margin-bottom:10px;font-weight:600}
.step p{color:var(--muted);font-size:.92rem;line-height:1.65}

/* PRICING */
.pricing{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:22px;align-items:stretch}
.plan{
  position:relative;padding:38px 30px 34px;border-radius:22px;
  background:var(--glass);border:1px solid var(--stroke);
  backdrop-filter:blur(16px);display:flex;flex-direction:column;
  transition:transform .3s,border-color .4s,box-shadow .4s;
}
.plan:hover{transform:translateY(-6px);border-color:rgba(0,224,255,.4)}
.plan.popular{
  border-color:rgba(0,255,163,.45);
  background:linear-gradient(160deg,rgba(0,255,163,.08),rgba(0,224,255,.04));
  box-shadow:0 20px 60px -20px rgba(0,255,163,.35);
}
.plan-badge{
  position:absolute;top:-11px;left:50%;transform:translateX(-50%);
  padding:5px 14px;border-radius:100px;
  font-size:.7rem;letter-spacing:.18em;text-transform:uppercase;font-weight:700;
  color:#031018;background:linear-gradient(120deg,var(--mint),var(--cyan));
}
.plan-name{font-size:.8rem;letter-spacing:.22em;text-transform:uppercase;color:var(--muted);font-weight:600;margin-bottom:6px}
.plan-price{font-weight:800;font-size:2.4rem;letter-spacing:-.02em;margin-bottom:4px}
.plan-price small{font-size:.9rem;color:var(--muted);font-weight:400;letter-spacing:0}
.plan-per{color:var(--muted);font-size:.85rem;margin-bottom:26px}
.plan ul{list-style:none;margin:0 0 30px;display:grid;gap:12px;flex:1}
.plan li{display:flex;align-items:flex-start;gap:10px;font-size:.88rem;color:var(--muted);line-height:1.5}
.plan li::before{content:'✓';color:var(--mint);font-weight:700;flex-shrink:0}
.plan .btn{width:100%;justify-content:center}
.guarantee{
  text-align:center;margin-top:38px;color:var(--muted);font-size:.88rem;
  display:flex;align-items:center;justify-content:center;gap:10px;
}
.guarantee svg{width:16px;height:16px;color:var(--mint)}

/* SECURITY BLOCK */
.security-block{
  position:relative;padding:80px 60px;border-radius:32px;
  background:linear-gradient(160deg,rgba(0,224,255,.08),rgba(124,92,255,.06));
  border:1px solid rgba(120,180,255,.14);overflow:hidden;
  display:grid;grid-template-columns:1.2fr 1fr;gap:56px;align-items:center;
}
@media(max-width:860px){.security-block{grid-template-columns:1fr;padding:56px 32px;gap:36px}}
.security-block::after{
  content:'';position:absolute;width:520px;height:520px;border-radius:50%;
  background:radial-gradient(circle,rgba(0,224,255,.28),transparent 70%);
  top:-260px;right:-160px;filter:blur(60px);pointer-events:none;
}
.security-block h2{position:relative}
.security-block p{color:var(--muted);margin-top:20px;line-height:1.8;font-size:1rem;position:relative}
.sec-list{list-style:none;display:grid;gap:16px;position:relative}
.sec-list li{display:flex;gap:14px;align-items:flex-start;color:var(--muted);font-size:.94rem;line-height:1.6}
.sec-list li::before{content:'✦';color:var(--mint);font-size:.9rem;margin-top:2px;text-shadow:0 0 14px var(--mint)}
.sec-list b{color:var(--text);font-weight:600}

/* REVIEWS */
.reviews{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:22px}
.review{
  padding:34px 28px;border-radius:22px;
  background:var(--glass);border:1px solid var(--stroke);
  backdrop-filter:blur(14px);transition:transform .3s,border-color .4s;
}
.review:hover{transform:translateY(-4px);border-color:rgba(0,224,255,.35)}
.review-stars{color:var(--mint);letter-spacing:3px;font-size:.9rem;margin-bottom:16px}
.review p{color:var(--muted);font-size:.94rem;line-height:1.7;margin-bottom:22px}
.review-author{display:flex;align-items:center;gap:12px}
.review-avatar{
  width:40px;height:40px;border-radius:50%;display:grid;place-items:center;
  font-weight:800;font-size:.9rem;color:#031018;
  background:linear-gradient(140deg,var(--cyan),var(--mint));
}
.review-name{font-weight:600;font-size:.9rem}
.review-role{color:var(--muted);font-size:.78rem}

/* FAQ */
.faq{max-width:820px;margin:0 auto;display:grid;gap:12px}
.faq-item{
  border-radius:16px;background:var(--glass);border:1px solid var(--stroke);
  overflow:hidden;transition:border-color .3s,background .3s;
}
.faq-item.open{border-color:rgba(0,224,255,.4);background:rgba(0,224,255,.04)}
.faq-q{
  padding:22px 26px;cursor:pointer;display:flex;justify-content:space-between;
  align-items:center;gap:20px;font-weight:500;font-size:.98rem;transition:color .3s;
}
.faq-q:hover{color:var(--cyan)}
.faq-icon{
  width:26px;height:26px;border-radius:50%;flex-shrink:0;display:grid;place-items:center;
  background:rgba(120,180,255,.08);border:1px solid var(--stroke);
  font-size:1rem;line-height:1;transition:transform .4s,background .3s;
}
.faq-item.open .faq-icon{transform:rotate(45deg);background:rgba(0,255,163,.15);color:var(--mint)}
.faq-a{max-height:0;overflow:hidden;transition:max-height .4s cubic-bezier(.65,0,.35,1)}
.faq-a-inner{padding:0 26px 24px;color:var(--muted);line-height:1.75;font-size:.92rem}

/* CTA */
.cta-box{
  position:relative;text-align:center;padding:90px 40px;border-radius:32px;
  background:linear-gradient(160deg,rgba(0,224,255,.14),rgba(0,255,163,.06));
  border:1px solid rgba(120,180,255,.16);overflow:hidden;
}
.cta-box::after{
  content:'';position:absolute;width:520px;height:520px;border-radius:50%;
  background:radial-gradient(circle,rgba(0,255,163,.32),transparent 70%);
  top:-260px;left:50%;transform:translateX(-50%);filter:blur(50px);pointer-events:none;
}
.cta-box h2{margin-bottom:22px;position:relative}
.cta-box p{color:var(--muted);max-width:460px;margin:0 auto 40px;line-height:1.7;position:relative}
.cta-box .btn{position:relative}

/* FOOTER */
footer{border-top:1px solid var(--stroke);padding:56px 0 40px;position:relative;z-index:2}
.foot-inner{display:flex;justify-content:space-between;align-items:center;gap:30px;flex-wrap:wrap}
.foot-inner p{color:var(--muted);font-size:.86rem}
.socials{display:flex;gap:14px}
.socials a{
  width:40px;height:40px;border-radius:50%;display:grid;place-items:center;
  border:1px solid var(--stroke);color:var(--muted);text-decoration:none;
  font-size:.8rem;transition:all .35s;
}
.socials a:hover{color:#fff;border-color:var(--cyan);background:rgba(0,224,255,.15);transform:translateY(-3px)}

/* MODAL */
.modal-bg{
  position:fixed;inset:0;background:rgba(5,9,20,.85);backdrop-filter:blur(8px);
  z-index:1000;display:none;align-items:center;justify-content:center;padding:20px;
}
.modal-bg.show{display:flex}
.modal{
  max-width:480px;width:100%;background:var(--surface);border:1px solid var(--stroke);
  border-radius:22px;padding:32px 28px;position:relative;animation:pop .3s ease-out;
}
@keyframes pop{from{opacity:0;transform:scale(.95)}to{opacity:1;transform:scale(1)}}
.modal h2{font-size:1.4rem;margin-bottom:8px}
.modal p{color:var(--muted);font-size:.9rem;margin-bottom:22px;line-height:1.6}
.modal-close{
  position:absolute;top:16px;right:18px;background:none;border:none;
  color:var(--muted);font-size:1.6rem;cursor:pointer;line-height:1;
}
.qr-box{
  display:flex;justify-content:center;margin-bottom:22px;padding:16px;
  background:#fff;border-radius:14px;width:fit-content;margin-left:auto;margin-right:auto;
}
.sub-url{display:flex;gap:8px;margin-bottom:16px}
.sub-url input{
  flex:1;padding:12px 14px;border-radius:10px;border:1px solid var(--stroke);
  background:rgba(0,0,0,.4);color:var(--text);font-family:monospace;font-size:.85rem;
}
.copy-btn{
  padding:0 16px;border-radius:10px;border:1px solid var(--stroke);
  background:rgba(0,224,255,.1);color:var(--cyan);cursor:pointer;
  font-weight:600;font-size:.85rem;transition:background .2s;
}
.copy-btn:hover{background:rgba(0,224,255,.2)}
.info-row{
  display:flex;justify-content:space-between;padding:10px 0;
  border-top:1px solid var(--stroke);font-size:.88rem;
}
.info-row span:first-child{color:var(--muted)}
.info-row b{color:var(--text)}

/* SUB PAGE */
.sub-page{padding:120px 0 60px;max-width:520px;margin:0 auto}
.sub-card{
  background:var(--surface);border:1px solid var(--stroke);border-radius:22px;
  padding:32px 28px;box-shadow:0 20px 50px -20px rgba(0,0,0,.6);
}
.sub-card h1{font-size:1.5rem;margin-bottom:24px}
.status-pill{
  display:inline-flex;align-items:center;gap:6px;padding:5px 12px;
  border-radius:100px;font-size:.75rem;font-weight:600;margin-left:8px;vertical-align:middle;
}
.status-active{background:rgba(0,255,163,.12);color:var(--mint);border:1px solid rgba(0,255,163,.25)}
.status-expired{background:rgba(255,209,102,.12);color:var(--yellow);border:1px solid rgba(255,209,102,.25)}
.status-revoked{background:rgba(255,77,109,.12);color:var(--red);border:1px solid rgba(255,77,109,.25)}
.status-limit{background:rgba(255,209,102,.12);color:var(--yellow);border:1px solid rgba(255,209,102,.25)}
.bar{height:8px;background:rgba(255,255,255,.05);border-radius:100px;overflow:hidden;margin:12px 0}
.bar-fill{
  height:100%;background:linear-gradient(90deg,var(--cyan),var(--mint));
  border-radius:100px;transition:width .4s;
}

/* LOGIN */
.login-wrap{padding:140px 0 60px;max-width:400px;margin:0 auto}
.login-card{background:var(--surface);border:1px solid var(--stroke);border-radius:22px;padding:36px 30px}
.login-card h1{font-size:1.5rem;margin-bottom:8px;text-align:center}
.login-card p{color:var(--muted);font-size:.9rem;text-align:center;margin-bottom:24px}
.login-card input{
  width:100%;padding:13px 16px;border-radius:10px;border:1px solid var(--stroke);
  background:rgba(0,0,0,.35);color:var(--text);font-size:.95rem;margin-bottom:16px;
}
.login-card input:focus{outline:none;border-color:var(--cyan)}
.login-card .btn{width:100%}
.error{
  background:rgba(255,77,109,.1);border:1px solid rgba(255,77,109,.3);color:var(--red);
  padding:10px 14px;border-radius:10px;font-size:.85rem;margin-bottom:16px;text-align:center;
}

/* DASHBOARD */
.dash{padding:100px 0 60px}
.dash-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:32px;flex-wrap:wrap;gap:16px}
.dash-head h1{font-size:1.7rem}
.dash-head .actions{display:flex;gap:10px}
.stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:16px;margin-bottom:32px}
.stat{background:var(--surface);border:1px solid var(--stroke);border-radius:16px;padding:20px 22px}
.stat .label{color:var(--muted);font-size:.78rem;text-transform:uppercase;letter-spacing:.1em;margin-bottom:8px}
.stat .value{font-size:1.7rem;font-weight:700;letter-spacing:-.02em}
.stat .value.cyan{color:var(--cyan)}
.stat .value.mint{color:var(--mint)}
.stat .value.red{color:var(--red)}
.stat .value.yellow{color:var(--yellow)}
.create-form{
  background:var(--surface);border:1px solid var(--stroke);border-radius:16px;
  padding:22px;margin-bottom:28px;display:grid;
  grid-template-columns:2fr 1fr 1fr auto auto;gap:12px;align-items:center;
}
.create-form input{
  padding:10px 14px;border-radius:10px;border:1px solid var(--stroke);
  background:rgba(0,0,0,.35);color:var(--text);font-size:.9rem;
}
.create-form input:focus{outline:none;border-color:var(--cyan)}
.create-form label{
  display:flex;align-items:center;gap:6px;color:var(--muted);
  font-size:.85rem;white-space:nowrap;
}
.table-wrap{background:var(--surface);border:1px solid var(--stroke);border-radius:16px;overflow:hidden}
table{width:100%;border-collapse:collapse;font-size:.88rem}
thead{background:rgba(120,180,255,.04)}
th{
  padding:14px 16px;text-align:left;color:var(--muted);font-weight:600;
  font-size:.76rem;text-transform:uppercase;letter-spacing:.08em;
  border-bottom:1px solid var(--stroke);
}
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
.toast{
  position:fixed;bottom:24px;right:24px;padding:14px 22px;border-radius:12px;
  background:var(--surface2);border:1px solid var(--stroke);font-size:.9rem;
  box-shadow:0 10px 30px rgba(0,0,0,.4);animation:slideIn .3s ease-out;z-index:2000;
}
.toast.success{border-color:rgba(0,255,163,.4);color:var(--mint)}
.toast.error{border-color:rgba(255,77,109,.4);color:var(--red)}
@keyframes slideIn{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}

/* SCROLLBAR */
::-webkit-scrollbar{width:9px}
::-webkit-scrollbar-track{background:#050914}
::-webkit-scrollbar-thumb{background:linear-gradient(var(--cyan),var(--mint));border-radius:10px}

@media(max-width:720px){
  section{padding:80px 0}
  .hero-actions .btn{width:100%;text-align:center}
  .create-form{grid-template-columns:1fr}
  .dash{padding:80px 0 40px}
  table{font-size:.82rem}
  th,td{padding:10px 8px}
  .cta-box{padding:60px 24px}
  .security-block{padding:44px 26px}
}
`;

// ============================================================
// LANDING PAGE
// ============================================================
function renderLanding(url) {
  return `<!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>WLVPN — Интернет без границ на VLESS</title>
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
      <li><a href="#pricing">Тарифы</a></li>
      <li><a href="#faq">FAQ</a></li>
    </ul>
    <button class="nav-cta" onclick="startTrial(event)">Подключиться</button>
  </div>
</nav>

<header class="hero">
  <div class="wrap">
    <div class="badge"><span class="pulse"></span> VLESS · Скорость до 10 Гбит/с</div>
    <h1 class="title">
      <span class="line"><span>Твой интернет.</span></span>
      <span class="line"><span class="grad">Твои правила.</span></span>
      <span class="line"><span>На VLESS.</span></span>
    </h1>
    <p class="hero-sub">
      Протокол VLESS, серверы в Германии, Швеции, Польше и России.
      YouTube, Discord, Telegram — и весь интернет без белых списков,
      блокировок и ограничений мобильных операторов.
    </p>
    <div class="hero-actions">
      <button class="btn btn-primary" onclick="startTrial(event)">Попробовать 7 дней бесплатно</button>
      <a href="#servers" class="btn btn-ghost">Смотреть серверы</a>
    </div>
    <div class="trust">
      <div class="trust-item">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
        Обход белых списков
      </div>
      <div class="trust-item">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
        Интернет даже на улице
      </div>
      <div class="trust-item">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
        Защита от утечек DNS/IPv6/WebRTC
      </div>
    </div>
  </div>
</header>

<!-- SERVERS -->
<section id="servers">
  <div class="wrap">
    <div class="sec-head reveal">
      <span class="sec-tag">Серверы</span>
      <h2 class="sec">Четыре локации. Один протокол.<br>Максимальная скорость.</h2>
      <p>Все серверы WLVPN работают на VLESS — лёгком протоколе, который маскирует трафик под обычный HTTPS и не оставляет следов для DPI.</p>
    </div>

    <div class="servers-note reveal">
      <span class="dot"></span>
      <span>Пинг обновляется в реальном времени · <strong>VLESS</strong> на всех нодах</span>
    </div>

    <div class="servers-grid">
      <div class="server-card tilt reveal">
        <div class="server-flag">🇩🇪</div>
        <div class="server-name">Германия</div>
        <div class="server-stats">
          <div class="server-stat"><span><span class="live-dot"></span>Пинг</span><b class="ping-val" data-ping>— мс</b></div>
          <div class="server-stat"><span>Скорость</span><b>до 10 Гбит/с</b></div>
          <div class="server-stat"><span>Протокол</span><b class="proto">VLESS</b></div>
        </div>
      </div>

      <div class="server-card tilt reveal">
        <div class="server-flag">🇵🇱</div>
        <div class="server-name">Польша</div>
        <div class="server-stats">
          <div class="server-stat"><span><span class="live-dot"></span>Пинг</span><b class="ping-val" data-ping>— мс</b></div>
          <div class="server-stat"><span>Скорость</span><b>до 3 Гбит/с</b></div>
          <div class="server-stat"><span>Протокол</span><b class="proto">VLESS</b></div>
        </div>
      </div>

      <div class="server-card tilt reveal">
        <div class="server-flag">🇸🇪</div>
        <div class="server-name">Швеция</div>
        <div class="server-stats">
          <div class="server-stat"><span><span class="live-dot"></span>Пинг</span><b class="ping-val" data-ping>— мс</b></div>
          <div class="server-stat"><span>Скорость</span><b>до 5 Гбит/с</b></div>
          <div class="server-stat"><span>Протокол</span><b class="proto">VLESS</b></div>
        </div>
      </div>

      <div class="server-card tilt reveal">
        <div class="server-flag">🇷🇺</div>
        <div class="server-name">Россия</div>
        <div class="server-stats">
          <div class="server-stat"><span><span class="live-dot"></span>Пинг</span><b class="ping-val" data-ping>— мс</b></div>
          <div class="server-stat"><span>Скорость</span><b>до 3 Гбит/с</b></div>
          <div class="server-stat"><span>Протокол</span><b class="proto">VLESS</b></div>
        </div>
      </div>
    </div>
  </div>
</section>

<!-- FEATURES -->
<section id="features">
  <div class="wrap">
    <div class="sec-head reveal">
      <span class="sec-tag">Возможности</span>
      <h2 class="sec">Всё, чтобы интернет был свободным</h2>
      <p>Без компромиссов между скоростью, приватностью и доступом к контенту.</p>
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
        <h3>Сервер «Белый список»</h3>
        <p>Отдельный сервер для мобильного интернета. Обходит ограничения операторов, когда оставлены только «разрешённые» сайты — и возвращает весь интернет даже на улице.</p>
      </div>
      <div class="card tilt reveal">
        <div class="card-icon">🚀</div>
        <h3>Скорость до 10 Гбит/с</h3>
        <p>Стриминг в 4K, игры без лагов, скачивание без ожидания. Каналы серверов рассчитаны на пиковые нагрузки.</p>
      </div>
      <div class="card tilt reveal">
        <div class="card-icon">🔒</div>
        <h3>Защита от утечек</h3>
        <p>На уровне VLESS блокируются утечки <b>DNS</b>, <b>IPv6</b> и <b>WebRTC</b>. Ваш реальный IP не просочится даже при сбое.</p>
      </div>
      <div class="card tilt reveal">
        <div class="card-icon">📱</div>
        <h3>До 10 устройств</h3>
        <p>Один аккаунт — телефон, ноутбук, планшет и роутер. Windows, macOS, iOS, Android, Linux.</p>
      </div>
      <div class="card tilt reveal">
        <div class="card-icon">🎛️</div>
        <h3>Настройка в один клик</h3>
        <p>Скачал приложение, выбрал сервер, нажал «Подключиться». VLESS включается автоматически, конфиг — по QR-коду.</p>
      </div>
    </div>
  </div>
</section>

<!-- STEPS -->
<section>
  <div class="wrap">
    <div class="sec-head reveal">
      <span class="sec-tag">Как это работает</span>
      <h2 class="sec">Три шага до свободного интернета</h2>
    </div>
    <div class="steps">
      <div class="step reveal">
        <div class="step-num">1</div>
        <h3>Скачай приложение</h3>
        <p>Windows, macOS, iOS, Android или Linux. Установка занимает меньше минуты.</p>
      </div>
      <div class="step reveal">
        <div class="step-num">2</div>
        <h3>Выбери сервер</h3>
        <p>Германия, Польша, Швеция или Россия. Или доверься автовыбору по пингу.</p>
      </div>
      <div class="step reveal">
        <div class="step-num">3</div>
        <h3>Подключайся</h3>
        <p>Один клик — и VLESS уже работает. YouTube, Discord, Telegram открываются как обычно.</p>
      </div>
    </div>
  </div>
</section>

<!-- PRICING -->
<section id="pricing">
  <div class="wrap">
    <div class="sec-head reveal">
      <span class="sec-tag">Тарифы</span>
      <h2 class="sec">Один набор функций.<br>Разная цена за срок.</h2>
      <p>Все тарифы включают VLESS, все 4 сервера, обход блокировок и защиту от утечек.</p>
    </div>

    <div class="pricing">
      <div class="plan reveal">
        <div class="plan-name">1 месяц</div>
        <div class="plan-price">299 ₽</div>
        <div class="plan-per">в месяц</div>
        <ul>
          <li>Протокол VLESS на всех серверах</li>
          <li>Германия, Польша, Швеция, Россия</li>
          <li>До 10 устройств</li>
          <li>Обход блокировок и белых списков</li>
          <li>Защита от утечек DNS/IPv6/WebRTC</li>
        </ul>
        <button class="btn btn-ghost" onclick="startTrial(event)">Выбрать</button>
      </div>

      <div class="plan popular reveal">
        <div class="plan-badge">Выгодно</div>
        <div class="plan-name">1 год</div>
        <div class="plan-price">149 ₽</div>
        <div class="plan-per">в месяц · 1 790 ₽ в год</div>
        <ul>
          <li>Всё из тарифа «1 месяц»</li>
          <li>Экономия 50%</li>
          <li>Приоритетная поддержка</li>
          <li>Ранний доступ к новым серверам</li>
          <li>Гарантия возврата 30 дней</li>
        </ul>
        <button class="btn btn-primary" onclick="startTrial(event)">Выбрать</button>
      </div>

      <div class="plan reveal">
        <div class="plan-name">2 года</div>
        <div class="plan-price">99 ₽</div>
        <div class="plan-per">в месяц · 2 390 ₽ за 2 года</div>
        <ul>
          <li>Всё из тарифа «1 год»</li>
          <li>Максимальная скидка 67%</li>
          <li>Цена фиксируется на 2 года</li>
          <li>Гарантия возврата 30 дней</li>
        </ul>
        <button class="btn btn-ghost" onclick="startTrial(event)">Выбрать</button>
      </div>
    </div>

    <div class="guarantee reveal">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
      Гарантия возврата средств в течение 30 дней
    </div>
  </div>
</section>

<!-- SECURITY -->
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
        <li><b>Обходит белые списки</b> — включая ограничения мобильного интернета через отдельный сервер.</li>
      </ul>
    </div>
  </div>
</section>

<!-- REVIEWS -->
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
          <div>
            <div class="review-name">Алексей К.</div>
            <div class="review-role">Москва</div>
          </div>
        </div>
      </div>
      <div class="review reveal">
        <div class="review-stars">★★★★★</div>
        <p>Discord снова работает без лагов. Подключил на ноутбуке и телефоне — интернет на улице тоже летает.</p>
        <div class="review-author">
          <div class="review-avatar">МД</div>
          <div>
            <div class="review-name">Марина Д.</div>
            <div class="review-role">Санкт-Петербург</div>
          </div>
        </div>
      </div>
      <div class="review reveal">
        <div class="review-stars">★★★★★</div>
        <p>Когда провайдер оставил только «разрешённые» сайты — WLVPN вернул весь интернет. Telegram снова со мной.</p>
        <div class="review-author">
          <div class="review-avatar">ИС</div>
          <div>
            <div class="review-name">Игорь С.</div>
            <div class="review-role">Новосибирск</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</section>

<!-- FAQ -->
<section id="faq">
  <div class="wrap">
    <div class="sec-head reveal" style="text-align:center;margin-left:auto;margin-right:auto">
      <span class="sec-tag">FAQ</span>
      <h2 class="sec">Частые вопросы</h2>
    </div>
    <div class="faq">
      <div class="faq-item reveal">
        <div class="faq-q"><span>Что такое VLESS и чем он лучше OpenVPN?</span><span class="faq-icon">+</span></div>
        <div class="faq-a"><div class="faq-a-inner">VLESS — современный лёгкий протокол. Он не использует тяжёлое шифрование на транспортном уровне, поэтому работает быстрее, потребляет меньше батареи и не оставляет характерных сигнатур, по которым DPI распознаёт VPN. При этом трафик маскируется под обычный HTTPS.</div></div>
      </div>
      <div class="faq-item reveal">
        <div class="faq-q"><span>Насколько падает скорость?</span><span class="faq-icon">+</span></div>
        <div class="faq-a"><div class="faq-a-inner">Минимально. Германия — до 10 Гбит/с, Швеция — до 5, Польша и Россия — до 3. Пинг на всех серверах держится в диапазоне 30–60 мс, а на многих локациях ниже.</div></div>
      </div>
      <div class="faq-item reveal">
        <div class="faq-q"><span>Работает ли обход блокировок для YouTube, Discord и Telegram?</span><span class="faq-icon">+</span></div>
        <div class="faq-a"><div class="faq-a-inner">Да. VLESS маскирует трафик так, что провайдер не может отличить ваш сеанс от обычного визита на разрешённый сайт. Это позволяет обходить как обычные блокировки, так и режим «белых списков».</div></div>
      </div>
      <div class="faq-item reveal">
        <div class="faq-q"><span>Можно ли пользоваться на нескольких устройствах?</span><span class="faq-icon">+</span></div>
        <div class="faq-a"><div class="faq-a-inner">Да, до 10 устройств одновременно на одном аккаунте. Приложения есть для Windows, macOS, iOS, Android и Linux.</div></div>
      </div>
      <div class="faq-item reveal">
        <div class="faq-q"><span>Что с возвратом средств?</span><span class="faq-icon">+</span></div>
        <div class="faq-a"><div class="faq-a-inner">В течение 30 дней после оплаты вы можете запросить полный возврат без объяснения причин — через поддержку в личном кабинете.</div></div>
      </div>
      <div class="faq-item reveal">
        <div class="faq-q"><span>Работает ли на мобильном интернете и при ограничениях оператора?</span><span class="faq-icon">+</span></div>
        <div class="faq-a"><div class="faq-a-inner">Да. Для мобильных сетей у нас есть отдельный сервер «Белый список» — он обходит ограничения мобильного интернета и режим «белых списков», когда оператор оставляет доступ только к разрешённым сайтам. Работает в роуминге и на общественном Wi-Fi.</div></div>
      </div>
    </div>
  </div>
</section>

<!-- CTA -->
<section id="cta">
  <div class="wrap">
    <div class="cta-box reveal">
      <h2 class="sec">Интернет без границ —<br>на VLESS</h2>
      <p>14 дней бесплатно. Без карты. Без обязательств.</p>
      <button class="btn btn-primary" onclick="startTrial(event)">Попробовать бесплатно</button>
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
/* ============ STARS ============ */
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
    x: Math.random() * w,
    y: Math.random() * h,
    vx: (Math.random() - .5) * .25 * dpr,
    vy: (Math.random() - .5) * .25 * dpr,
    r: (Math.random() * 1.5 + .4) * dpr,
    a: Math.random() * .5 + .25
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
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(190,235,255,' + s.a + ')';
    ctx.fill();
    for (let j = i + 1; j < stars.length; j++){
      const o = stars[j];
      const dx = s.x - o.x, dy = s.y - o.y;
      const d = Math.hypot(dx, dy);
      if (d < linkDist){
        ctx.beginPath();
        ctx.moveTo(s.x, s.y);
        ctx.lineTo(o.x, o.y);
        ctx.strokeStyle = 'rgba(0,224,255,' + ((1 - d / linkDist) * .26) + ')';
        ctx.lineWidth = .6 * dpr;
        ctx.stroke();
      }
    }
    const mdx = s.x - mouse.x * dpr, mdy = s.y - mouse.y * dpr;
    const md = Math.hypot(mdx, mdy);
    if (md < 170 * dpr && md > 0){
      const f = (1 - md / (170 * dpr)) * .9;
      s.x += (mdx / md) * f;
      s.y += (mdy / md) * f;
    }
  }
  requestAnimationFrame(draw);
}
draw();

/* ============ CURSOR ============ */
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
  cx += (tx - cx) * .16;
  cy += (ty - cy) * .16;
  cursor.style.transform = 'translate(' + cx + 'px, ' + cy + 'px) translate(-50%,-50%)';
  requestAnimationFrame(loopCursor);
})();
document.querySelectorAll('a, button, .card, .server-card, .plan, .faq-q, .review').forEach(el => {
  el.addEventListener('mouseenter', () => cursor.classList.add('hover'));
  el.addEventListener('mouseleave', () => cursor.classList.remove('hover'));
});

/* ============ NAV ============ */
const nav = document.getElementById('nav');
addEventListener('scroll', () => {
  nav.classList.toggle('scrolled', scrollY > 40);
});

/* ============ REVEAL ============ */
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

/* ============ TILT ============ */
document.querySelectorAll('.tilt').forEach(card => {
  card.addEventListener('mousemove', e => {
    const r = card.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width;
    const py = (e.clientY - r.top) / r.height;
    card.style.setProperty('--mx', px * 100 + '%');
    card.style.setProperty('--my', py * 100 + '%');
    const rx = (py - .5) * -8;
    const ry = (px - .5) * 8;
    card.style.transform = 'perspective(900px) rotateX(' + rx + 'deg) rotateY(' + ry + 'deg) translateY(-6px)';
  });
  card.addEventListener('mouseleave', () => { card.style.transform = ''; });
});

/* ============ LIVE PING ============ */
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

/* ============ FAQ ============ */
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
    if (isOpen){
      item.classList.remove('open');
      a.style.maxHeight = null;
    } else {
      item.classList.add('open');
      a.style.maxHeight = a.scrollHeight + 'px';
    }
  });
});

/* ============ TRIAL ============ */
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
</body>
</html>`;
}

// ============================================================
// SUB INFO PAGE
// ============================================================
function renderSubInfoPage(sub, token) {
  if (!sub) {
    return `<!doctype html>
<html lang="ru"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>WLVPN — Подписка не найдена</title>
<style>${CSS}</style>
</head><body>
<div class="cursor"></div>
<div class="cursor-dot"></div>
<canvas id="stars"></canvas>
<div class="aurora"><div class="blob b1"></div><div class="blob b2"></div><div class="blob b3"></div></div>
<nav class="top"><div class="nav-inner">
  <div class="logo"><div class="logo-mark"></div><span>WLVPN</span></div>
  <a href="/" class="nav-cta">На главную</a>
</div></nav>
<div class="sub-page">
  <div class="sub-card" style="text-align:center">
    <h1>Подписка не найдена</h1>
    <p style="color:var(--muted);margin-bottom:24px;line-height:1.7">Токен <code style="color:var(--cyan);font-family:monospace">${escapeHtml(token)}</code> не существует или был удалён.</p>
    <a href="/" class="btn btn-primary">Получить новую</a>
  </div>
</div>
<script>
const canvas = document.getElementById('stars');
const ctx = canvas.getContext('2d');
let stars = [], w, h, dpr;
function resize(){
  dpr = Math.min(window.devicePixelRatio || 1, 2);
  w = canvas.width = innerWidth * dpr; h = canvas.height = innerHeight * dpr;
  canvas.style.width = innerWidth + 'px'; canvas.style.height = innerHeight + 'px';
  stars = Array.from({length:100}, () => ({ x: Math.random()*w, y: Math.random()*h, r:(Math.random()*1.5+.4)*dpr, a: Math.random()*.5+.25 }));
}
resize(); addEventListener('resize', resize);
function draw(){
  ctx.clearRect(0,0,w,h);
  for(const s of stars){
    ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI*2);
    ctx.fillStyle = 'rgba(190,235,255,' + s.a + ')'; ctx.fill();
  }
  requestAnimationFrame(draw);
}
draw();
</script>
</body></html>`;
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
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>WLVPN — Подписка</title>
<style>${CSS}</style>
</head><body>
<div class="cursor"></div>
<div class="cursor-dot"></div>
<canvas id="stars"></canvas>
<div class="aurora"><div class="blob b1"></div><div class="blob b2"></div><div class="blob b3"></div></div>
<nav class="top"><div class="nav-inner">
  <div class="logo"><div class="logo-mark"></div><span>WLVPN</span></div>
  <a href="/" class="nav-cta">На главную</a>
</div></nav>
<div class="sub-page">
  <div class="sub-card">
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

/* STARS */
const canvas = document.getElementById('stars');
const ctx = canvas.getContext('2d');
let stars = [], w, h, dpr;
function resize(){
  dpr = Math.min(window.devicePixelRatio || 1, 2);
  w = canvas.width = innerWidth * dpr; h = canvas.height = innerHeight * dpr;
  canvas.style.width = innerWidth + 'px'; canvas.style.height = innerHeight + 'px';
  stars = Array.from({length:100}, () => ({ x: Math.random()*w, y: Math.random()*h, r:(Math.random()*1.5+.4)*dpr, a: Math.random()*.5+.25 }));
}
resize(); addEventListener('resize', resize);
function draw(){
  ctx.clearRect(0,0,w,h);
  for(const s of stars){
    ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI*2);
    ctx.fillStyle = 'rgba(190,235,255,' + s.a + ')'; ctx.fill();
  }
  requestAnimationFrame(draw);
}
draw();

/* CURSOR */
const cursor = document.querySelector('.cursor');
const dot = document.querySelector('.cursor-dot');
let cx = innerWidth/2, cy = innerHeight/2, tx = cx, ty = cy;
addEventListener('mousemove', e => {
  tx = e.clientX; ty = e.clientY;
  dot.style.transform = 'translate(' + e.clientX + 'px, ' + e.clientY + 'px) translate(-50%,-50%)';
});
(function loop(){
  cx += (tx - cx) * .16; cy += (ty - cy) * .16;
  cursor.style.transform = 'translate(' + cx + 'px, ' + cy + 'px) translate(-50%,-50%)';
  requestAnimationFrame(loop);
})();
document.querySelectorAll('a, button').forEach(el => {
  el.addEventListener('mouseenter', () => cursor.classList.add('hover'));
  el.addEventListener('mouseleave', () => cursor.classList.remove('hover'));
});
</script>
</body></html>`;
}

// ============================================================
// ADMIN LOGIN
// ============================================================
function renderAdminLogin(error) {
  return `<!doctype html>
<html lang="ru"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>WLVPN — Админ</title>
<style>${CSS}</style>
</head><body>
<div class="cursor"></div>
<div class="cursor-dot"></div>
<canvas id="stars"></canvas>
<div class="aurora"><div class="blob b1"></div><div class="blob b2"></div><div class="blob b3"></div></div>
<nav class="top"><div class="nav-inner">
  <div class="logo"><div class="logo-mark"></div><span>WLVPN · Admin</span></div>
  <a href="/" class="nav-cta">На сайт</a>
</div></nav>
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
<script>
const canvas = document.getElementById('stars');
const ctx = canvas.getContext('2d');
let stars = [], w, h, dpr;
function resize(){
  dpr = Math.min(window.devicePixelRatio || 1, 2);
  w = canvas.width = innerWidth * dpr; h = canvas.height = innerHeight * dpr;
  canvas.style.width = innerWidth + 'px'; canvas.style.height = innerHeight + 'px';
  stars = Array.from({length:100}, () => ({ x: Math.random()*w, y: Math.random()*h, r:(Math.random()*1.5+.4)*dpr, a: Math.random()*.5+.25 }));
}
resize(); addEventListener('resize', resize);
function draw(){
  ctx.clearRect(0,0,w,h);
  for(const s of stars){
    ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI*2);
    ctx.fillStyle = 'rgba(190,235,255,' + s.a + ')'; ctx.fill();
  }
  requestAnimationFrame(draw);
}
draw();
const cursor = document.querySelector('.cursor');
const dot = document.querySelector('.cursor-dot');
let cx = innerWidth/2, cy = innerHeight/2, tx = cx, ty = cy;
addEventListener('mousemove', e => {
  tx = e.clientX; ty = e.clientY;
  dot.style.transform = 'translate(' + e.clientX + 'px, ' + e.clientY + 'px) translate(-50%,-50%)';
});
(function loop(){
  cx += (tx - cx) * .16; cy += (ty - cy) * .16;
  cursor.style.transform = 'translate(' + cx + 'px, ' + cy + 'px) translate(-50%,-50%)';
  requestAnimationFrame(loop);
})();
</script>
</body></html>`;
}

// ============================================================
// ADMIN DASHBOARD
// ============================================================
function renderAdminDashboard() {
  return `<!doctype html>
<html lang="ru"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>WLVPN — Панель управления</title>
<style>${CSS}</style>
</head><body>
<div class="cursor"></div>
<div class="cursor-dot"></div>
<canvas id="stars"></canvas>
<div class="aurora"><div class="blob b1"></div><div class="blob b2"></div><div class="blob b3"></div></div>

<nav class="top"><div class="nav-inner">
  <div class="logo"><div class="logo-mark"></div><span>WLVPN · Admin</span></div>
  <form method="POST" action="/admin/logout" style="margin:0">
    <button class="nav-cta" style="border:none;cursor:pointer;font-family:inherit">Выйти</button>
  </form>
</div></nav>

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

/* STARS */
const canvas = document.getElementById('stars');
const ctx = canvas.getContext('2d');
let stars = [], w, h, dpr;
function resize(){
  dpr = Math.min(window.devicePixelRatio || 1, 2);
  w = canvas.width = innerWidth * dpr; h = canvas.height = innerHeight * dpr;
  canvas.style.width = innerWidth + 'px'; canvas.style.height = innerHeight + 'px';
  stars = Array.from({length:100}, () => ({ x: Math.random()*w, y: Math.random()*h, r:(Math.random()*1.5+.4)*dpr, a: Math.random()*.5+.25 }));
}
resize(); addEventListener('resize', resize);
function draw(){
  ctx.clearRect(0,0,w,h);
  for(const s of stars){
    ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI*2);
    ctx.fillStyle = 'rgba(190,235,255,' + s.a + ')'; ctx.fill();
  }
  requestAnimationFrame(draw);
}
draw();

/* CURSOR */
const cursor = document.querySelector('.cursor');
const dot = document.querySelector('.cursor-dot');
let cx = innerWidth/2, cy = innerHeight/2, tx = cx, ty = cy;
addEventListener('mousemove', e => {
  tx = e.clientX; ty = e.clientY;
  dot.style.transform = 'translate(' + e.clientX + 'px, ' + e.clientY + 'px) translate(-50%,-50%)';
});
(function loop(){
  cx += (tx - cx) * .16; cy += (ty - cy) * .16;
  cursor.style.transform = 'translate(' + cx + 'px, ' + cy + 'px) translate(-50%,-50%)';
  requestAnimationFrame(loop);
})();
document.querySelectorAll('a, button, .stat, .table-wrap').forEach(el => {
  el.addEventListener('mouseenter', () => cursor.classList.add('hover'));
  el.addEventListener('mouseleave', () => cursor.classList.remove('hover'));
});
</script>
</body></html>`;
}
