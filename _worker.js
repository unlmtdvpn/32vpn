// ============================================================
// WLVPN — Service Closed + Instant /sub (15-min Cache)
// ============================================================

const WIFI_URL = "https://newsub.chkav-vpn.space/q2k7Z1gtSjJ68LRM";
const LTE_URL  = "https://sub.chkav-vpn.space/?id=4874ba3740b54be89eae0f339a781480";
const HWID     = "1BEF4F22-1340-8D05-2641-3CC6D7CC1B27";

const CACHE_KEY = "sub_cache_v1";
const EXPIRE_MS = 15 * 60 * 1000; // 15 минут

function htmlResponse(content, status = 200) {
  return new Response(content, {
    status,
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" }
  });
}

function normalizeUserinfo(raw) {
  if (!raw) return "upload=0; download=0; total=0; expire=0";
  const up = (raw.match(/upload=(\d+)/i) || [])[1] || "0";
  const down = (raw.match(/download=(\d+)/i) || [])[1] || "0";
  const total = (raw.match(/total=(\d+)/i) || [])[1] || "0";
  return `upload=${up}; download=${down}; total=${total}; expire=0`;
}

async function fetchSingleSource(url) {
  const headersList = [
    { "User-Agent": "INCY/3.9.7/android", "Accept": "*/*", "X-Hwid": HWID },
    { "User-Agent": "Happ/1.6.0", "Accept": "*/*", "X-Hwid": HWID },
    { "User-Agent": "v2rayNG/1.9.16", "Accept": "*/*", "X-Hwid": HWID }
  ];

  for (const headers of headersList) {
    try {
      const res = await fetch(url, { headers, redirect: "follow", cf: { cacheTtl: 0 } });
      if (!res.ok) continue;
      const text = await res.text();
      if (!text) continue;
      
      try {
        const arr = JSON.parse(text);
        if (Array.isArray(arr)) {
          return { data: arr, userinfo: res.headers.get("Subscription-Userinfo") };
        }
      } catch (_) {
        return { raw: text, userinfo: res.headers.get("Subscription-Userinfo") };
      }
    } catch (_) {}
  }
  return null;
}

async function fetchAllSources() {
  const [wifi, lte] = await Promise.all([
    fetchSingleSource(WIFI_URL),
    fetchSingleSource(LTE_URL)
  ]);

  let combined = [];
  let userinfo = null;

  if (wifi && wifi.data) {
    combined.push(...wifi.data);
    if (wifi.userinfo) userinfo = wifi.userinfo;
  } else if (wifi && wifi.raw) {
    return { ok: true, body: wifi.raw, userinfo: wifi.userinfo || "upload=0; download=0; total=0; expire=0" };
  }

  if (lte && lte.data) {
    combined.push(...lte.data);
  }

  if (combined.length > 0) {
    return { 
      ok: true, 
      body: JSON.stringify(combined, null, 2), 
      userinfo: normalizeUserinfo(userinfo) 
    };
  }

  return { ok: false };
}

// Фоновая функция обновления кэша
async function updateCache(env) {
  try {
    const data = await fetchAllSources();
    if (data && data.ok) {
      const cacheObj = {
        body: data.body,
        userinfo: data.userinfo,
        updatedAt: Date.now()
      };
      await env.KV.put(CACHE_KEY, JSON.stringify(cacheObj));
      return cacheObj;
    }
  } catch (e) {
    console.error("Cache update failed", e);
  }
  return null;
}

// Получение кэша (если старый — отдаем сразу, а обновляем в фоне)
async function getCache(env, ctx) {
  const raw = await env.KV.get(CACHE_KEY);
  let cache = null;
  
  if (raw) {
    try { cache = JSON.parse(raw); } catch(e) {}
  }

  const now = Date.now();

  if (cache && cache.body) {
    // Если данные старше 15 минут — запускаем фоновое обновление
    if (!cache.updatedAt || (now - cache.updatedAt > EXPIRE_MS)) {
      if (ctx && ctx.waitUntil) {
        ctx.waitUntil(updateCache(env));
      } else {
        updateCache(env);
      }
    }
    return cache;
  }

  // Если кэша нет вообще (первый запуск), ждем загрузки
  return await updateCache(env);
}

async function serveSub(env, ctx) {
  // Если KV не привязан, делаем прямой запрос (на всякий случай)
  if (!env || !env.KV) {
    const src = await fetchAllSources();
    if (!src.ok) return new Response("Service unavailable", { status: 503 });
    return createSubResponse(src);
  }

  const src = await getCache(env, ctx);

  if (!src) {
    return new Response("Service unavailable", { status: 503, headers: { "Cache-Control": "no-cache" } });
  }

  return createSubResponse(src);
}

function createSubResponse(src) {
  return new Response(src.body, {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Profile-Title": "wlvpn",
      "Profile-Update-Interval": "6",
      "Subscription-Userinfo": src.userinfo,
      "announce": "wlvpn — бесплатный VPN сервис.",
      "Cache-Control": "no-cache",
      "Access-Control-Allow-Origin": "*"
    }
  });
}

function renderClosedPage() {
  return `<!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>WLVPN — Сервис закрылся</title>
<style>
:root{--bg:#000;--text:#fff;--muted:#888;--stroke:rgba(255,255,255,.12)}
*{margin:0;padding:0;box-sizing:border-box}
body{
  background:var(--bg);color:var(--text);
  font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;
  min-height:100vh;display:flex;align-items:center;justify-content:center;
  padding:24px;line-height:1.6;
}
.box{
  max-width:520px;width:100%;
  padding:48px 36px;
  border:1px solid var(--stroke);
  border-radius:24px;
  background:rgba(255,255,255,.02);
  text-align:center;
  backdrop-filter:blur(10px);
}
.icon{font-size:3rem;line-height:1;margin-bottom:24px}
h1{font-size:1.8rem;font-weight:800;letter-spacing:-.02em;margin-bottom:14px}
p{color:var(--muted);font-size:1rem;margin-bottom:10px}
.line{width:60px;height:2px;background:linear-gradient(90deg,transparent,#fff,transparent);margin:28px auto;}
small{color:#555;font-size:.8rem;display:block;margin-top:32px}
</style>
</head>
<body>
<div class="box">
  <div class="icon">⛔</div>
  <h1>Сервис закрылся</h1>
  <p>WLVPN больше не предоставляет доступ к VPN.</p>
  <p>Спасибо всем, кто был с нами.</p>
  <div class="line"></div>
  <small>© 2026 WLVPN · Проект остановлен</small>
</div>
</body>
</html>`;
}

async function handle(request, env, ctx) {
  const url = new URL(request.url);
  const path = url.pathname;

  if (path === "/sub" || path === "/sub/") {
    return serveSub(env, ctx);
  }

  return htmlResponse(renderClosedPage(), 410);
}

export default {
  async fetch(request, env, ctx) {
    try {
      return await handle(request, env, ctx);
    } catch (e) {
      return new Response("Internal Error", { status: 500 });
    }
  },
  
  // Этот блок срабатывает по крону (каждые 15 минут)
  async scheduled(event, env, ctx) {
    await updateCache(env);
  }
};