// ============================================================
// WLVPN — Service Closed + Instant /sub (15-min Cache)
// ============================================================

const WIFI_URL = "https://newsub.chkav-vpn.space/q2k7Z1gtSjJ68LRM";
const LTE_URL  = "https://sub.chkav-vpn.space/?id=4874ba3740b54be89eae0f339a781480";
const HWID     = "1BEF4F22-1340-8D05-2641-3CC6D7CC1B27";

const CACHE_KEY = "sub_cache_v2";
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

function b64decode(str) {
  try {
    let s = str.replace(/-/g, '+').replace(/_/g, '/');
    while (s.length % 4) s += '=';
    return atob(s);
  } catch (_) { return null; }
}

// Таймаут для запросов к chkav
async function fetchWithTimeout(resource, options = {}, timeout = 7000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(resource, {
      ...options,
      signal: controller.signal
    });
    clearTimeout(id);
    return response;
  } catch (error) {
    clearTimeout(id);
    throw error;
  }
}

function parseLteRawToJson(rawText) {
  let txt = rawText.trim();
  
  const dec1 = b64decode(txt);
  if (dec1) {
    if (/^vless:\/\//m.test(dec1)) {
      txt = dec1;
    } else {
      try {
        const parsed = JSON.parse(dec1);
        if (Array.isArray(parsed)) return parsed;
      } catch(_) {}
    }
  }

  try {
    const parsed = JSON.parse(txt);
    if (Array.isArray(parsed)) return parsed;
  } catch(_) {}

  if (/^vless:\/\//m.test(txt)) {
    const lines = txt.split(/\r?\n/).filter(l => l.trim().startsWith("vless://"));
    const configs = [];
    
    lines.forEach((line) => {
      try {
        const url = new URL(line);
        const params = url.searchParams;
        const ob = {
          "tag": `mobile-${configs.length + 1}`,
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
        
        configs.push({
          "dns": { "servers": ["1.1.1.1", "1.0.0.1"], "queryStrategy": "UseIP" },
          "routing": { "domainStrategy": "AsIs" },
          "inbounds": [{ "tag": "socks", "port": 10808, "listen": "127.0.0.1", "protocol": "socks", "settings": { "udp": true, "auth": "noauth" } }],
          "outbounds": [ob],
          "remarks": url.hash ? decodeURIComponent(url.hash.slice(1)) : `LTE Server ${configs.length + 1}`,
          "meta": { "serverDescription": "WLVPN · LTE" }
        });
      } catch (_) {}
    });
    return configs;
  }

  return null;
}

async function fetchSingleSource(url) {
  const headersList = [
    { "User-Agent": "INCY/3.9.7/android", "Accept": "*/*", "X-Hwid": HWID },
    { "User-Agent": "Happ/1.6.0", "Accept": "*/*", "X-Hwid": HWID },
    { "User-Agent": "v2rayNG/1.9.16", "Accept": "*/*", "X-Hwid": HWID }
  ];

  // Запускаем все 3 запроса с разными User-Agent одновременно
  const fetchPromises = headersList.map(async (headers) => {
    const res = await fetchWithTimeout(url, { headers, redirect: "follow", cf: { cacheTtl: 0 } }, 7000);
    if (!res.ok) throw new Error("Not OK");
    
    const text = await res.text();
    if (!text) throw new Error("Empty");
    if (text.includes("00000000-0000-0000-0000-000000000000") || text.includes("0.0.0.0:1")) throw new Error("Dummy");

    try {
      const arr = JSON.parse(text);
      if (Array.isArray(arr)) return { data: arr, userinfo: res.headers.get("Subscription-Userinfo") };
      throw new Error("Not array");
    } catch (_) {
      return { raw: text, userinfo: res.headers.get("Subscription-Userinfo") };
    }
  });

  // Возвращаем результат того запроса, который ответил первым и без ошибок
  try {
    return await Promise.any(fetchPromises);
  } catch (_) {
    return null;
  }
}

async function fetchAllSources() {
  // allSettled чтобы если один источник упал по таймауту, второй все равно отработал
  const [wifiRes, lteRes] = await Promise.allSettled([
    fetchSingleSource(WIFI_URL),
    fetchSingleSource(LTE_URL)
  ]);

  const wifi = wifiRes.status === "fulfilled" ? wifiRes.value : null;
  const lte = lteRes.status === "fulfilled" ? lteRes.value : null;

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
  } else if (lte && lte.raw) {
    const parsedLte = parseLteRawToJson(lte.raw);
    if (parsedLte && parsedLte.length > 0) {
      combined.push(...parsedLte);
    }
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

async function getCache(env, ctx) {
  const raw = await env.KV.get(CACHE_KEY);
  let cache = null;
  
  if (raw) {
    try { cache = JSON.parse(raw); } catch(e) {}
  }

  const now = Date.now();

  if (cache && cache.body) {
    if (!cache.updatedAt || (now - cache.updatedAt > EXPIRE_MS)) {
      if (ctx && ctx.waitUntil) {
        ctx.waitUntil(updateCache(env));
      } else {
        updateCache(env);
      }
    }
    return cache;
  }

  return await updateCache(env);
}

async function serveSub(env, ctx) {
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
  
  async scheduled(event, env, ctx) {
    await updateCache(env);
  }
};