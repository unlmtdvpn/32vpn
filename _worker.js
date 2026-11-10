// ============================================================
// WLVPN — Free VPN Service (Cloudflare Worker)
// ============================================================

const FALLBACK_SERVER = {
  "dns": { "servers": ["1.1.1.1", "1.0.0.1"], "queryStrategy": "UseIP" },
  "routing": { "domainStrategy": "AsIs" },
  "inbounds": [{ "tag": "socks", "port": 10808, "listen": "127.0.0.1", "protocol": "socks", "settings": { "udp": true, "auth": "noauth" } }],
  "outbounds": [{ "tag": "block", "protocol": "blackhole" }],
  "remarks": "🛠 Ведутся технические работы",
  "meta": { "serverDescription": "WLVPN · Скоро вернёмся" }
};

const LOCATIONS = {
  "fi8": { flag: "🇫🇮", name: "Финляндия", tag: "WLVPN · Нейросети", selector: "proxy-fi-" },
  "de21": { flag: "🇩🇪", name: "Германия", tag: "WLVPN · Скоростной", selector: "proxy-de-" },
  "nl4": { flag: "🇳🇱", name: "Нидерланды", tag: "WLVPN · Скоростной", selector: "proxy-nl-" },
  "pl6": { flag: "🇵🇱", name: "Польша", tag: "WLVPN · YouTube", selector: "proxy-pl-" },
  "es7": { flag: "🇪🇸", name: "Испания", tag: "WLVPN · Нейросети", selector: "proxy-es-" }
};

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

const CHKAV_URL = "https://newsub.chkav-vpn.space/9zfbEsqma0tkNfc2";
const WLVPN_HWID = "1BEF4F22-1340-8D05-2641-3CC6D7CC1B27";
const MOBILE_SUB_URL = "https://sub.chkav-vpn.space/?id=90f7c8dd85644850aa0e629cfb0e877c";

function normalizeUserinfo(raw) {
  if (!raw) return null;
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

async function fetchChkav() {
  const variants = [
    { "User-Agent": "INCY/3.9.7/android", "Accept": "*/*", "X-Hwid": WLVPN_HWID },
    { "User-Agent": "Happ/1.6.0", "Accept": "*/*", "X-Hwid": WLVPN_HWID },
    { "User-Agent": "v2rayNG/1.9.16", "Accept": "*/*", "X-Hwid": WLVPN_HWID }
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

async function fetchMobileBalancer() {
  try {
    const res = await fetch(MOBILE_SUB_URL, { headers: { "User-Agent": "INCY/3.9.7/android", "Accept": "*/*" }, cf: { cacheTtl: 0 } });
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
      "remarks": "🇷🇺 📱 Обход глушилок",
      "meta": { "serverDescription": "WLVPN · Работает при белых списках" },
      "burstObservatory": { "subjectSelector": ["mobile-"], "pingConfig": { "destination": "https://connectivitycheck.gstatic.com/generate_204", "interval": "1m", "sampling": 10, "timeout": "5s", "httpMethod": "HEAD" } }
    };
  } catch (_) { return null; }
}

function buildLocationBalancers(chkavServers) {
  const locOutbounds = { fi8: [], de21: [], nl4: [], pl6: [], es7: [] };
  const otherServers = [];

  chkavServers.forEach(s => {
    let host = "";
    if (s.outbounds) {
      const proxy = s.outbounds.find(o => o.tag === "proxy" || o.tag.startsWith("proxy-"));
      if (proxy && proxy.settings?.vnext?.[0]) host = proxy.settings.vnext[0].address;
    }
    let found = false;
    for (const loc in LOCATIONS) {
      if (host.includes(`.${loc}.`)) {
        s.outbounds.forEach(ob => {
          if (["vless", "vmess", "trojan"].includes(ob.protocol)) {
            ob.tag = `loc-${loc}-${locOutbounds[loc].length + 1}`;
            locOutbounds[loc].push(ob);
          }
        });
        found = true;
        break;
      }
    }
    if (!found && !s.routing?.balancers?.length) {
      otherServers.push(s);
    }
  });

  const result = [];
  for (const loc in LOCATIONS) {
    if (locOutbounds[loc].length === 0) continue;
    const info = LOCATIONS[loc];
    result.push({
      "dns": { "servers": ["1.1.1.1", "1.0.0.1"], "queryStrategy": "UseIP" },
      "routing": { "rules": [{ "type": "field", "network": "tcp,udp", "balancerTag": `balancer-${loc}` }], "balancers": [{ "tag": `balancer-${loc}`, "selector": [`loc-${loc}-`], "strategy": { "type": "leastLoad", "settings": { "maxRTT": "1s", "expected": 1, "tolerance": 0.15 } }, "fallbackTag": locOutbounds[loc][0].tag }], "domainStrategy": "AsIs" },
      "inbounds": [{ "tag": "socks", "port": 10808, "listen": "127.0.0.1", "protocol": "socks", "settings": { "udp": true, "auth": "noauth" }, "sniffing": { "enabled": true, "routeOnly": false, "destOverride": ["http", "tls", "quic"] } }, { "tag": "http", "port": 10809, "listen": "127.0.0.1", "protocol": "http", "settings": { "allowTransparent": false }, "sniffing": { "enabled": true, "routeOnly": false, "destOverride": ["http", "tls", "quic"] } }],
      "outbounds": locOutbounds[loc],
      "remarks": `${info.flag} ${info.name}`,
      "meta": { "serverDescription": info.tag },
      "burstObservatory": { "subjectSelector": [`loc-${loc}-`], "pingConfig": { "destination": "https://connectivitycheck.gstatic.com/generate_204", "interval": "1m", "sampling": 10, "timeout": "5s", "httpMethod": "HEAD" } }
    });
  }

  return result.concat(otherServers);
}

async function serveSubscription() {
  const chkav = await fetchChkav();
  const userInfo = chkav.userInfo || "upload=0; download=0; total=0; expire=0";
  let finalServers = [];
  let allOutbounds = [];

  if (chkav.format === "json" && Array.isArray(chkav.data) && chkav.data.length > 0) {
    finalServers = buildLocationBalancers(chkav.data);
    
    finalServers.forEach(s => {
      if (s.outbounds) {
        s.outbounds.forEach(ob => {
          if (["vless", "vmess", "trojan"].includes(ob.protocol)) {
            allOutbounds.push(ob);
          }
        });
      }
    });
  }

  const mobileBalancer = await fetchMobileBalancer();
  if (mobileBalancer) {
    finalServers.push(mobileBalancer);
    if (mobileBalancer.outbounds) {
      mobileBalancer.outbounds.forEach(ob => {
        if (["vless", "vmess", "trojan"].includes(ob.protocol)) {
          allOutbounds.push(ob);
        }
      });
    }
  }

  if (allOutbounds.length > 0) {
    allOutbounds.forEach((ob, idx) => {
      ob.tag = `all-${idx + 1}`;
    });

    const autoServer = {
      "dns": { "servers": ["1.1.1.1", "1.0.0.1"], "queryStrategy": "UseIP" },
      "routing": { 
        "rules": [{ "type": "field", "network": "tcp,udp", "balancerTag": "Super_Balancer" }], 
        "balancers": [{ 
          "tag": "Super_Balancer", 
          "selector": ["all-"], 
          "strategy": { "type": "leastLoad", "settings": { "maxRTT": "1s", "expected": 1, "tolerance": 0.15 } }, 
          "fallbackTag": "all-1" 
        }], 
        "domainStrategy": "AsIs" 
      },
      "inbounds": [{ "tag": "socks", "port": 10808, "listen": "127.0.0.1", "protocol": "socks", "settings": { "udp": true, "auth": "noauth" }, "sniffing": { "enabled": true, "routeOnly": false, "destOverride": ["http", "tls"] } }, { "tag": "http", "port": 10809, "listen": "127.0.0.1", "protocol": "http", "settings": { "allowTransparent": false }, "sniffing": { "enabled": true, "routeOnly": false, "destOverride": ["http", "tls"] } }],
      "outbounds": allOutbounds,
      "remarks": "🔁 Авто - самый быстрый",
      "meta": { "serverDescription": "WLVPN · Лучше выбрать его" },
      "burstObservatory": { "subjectSelector": ["all-"], "pingConfig": { "destination": "https://connectivitycheck.gstatic.com/generate_204", "interval": "1m", "sampling": 10, "timeout": "5s", "httpMethod": "HEAD" } }
    };

    finalServers.unshift(autoServer);
  } else {
    finalServers = [JSON.parse(JSON.stringify(FALLBACK_SERVER))];
  }

  return new Response(JSON.stringify(finalServers, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Profile-Title": "wlvpn",
      "Profile-Update-Interval": "6",
      "Subscription-Userinfo": userInfo,
      "announce": "wlvpn — бесплатный VPN сервис.",
      "Cache-Control": "no-cache",
      "Access-Control-Allow-Origin": "*"
    }
  });
}

// ============================================================
// LANDING PAGE CSS & HTML
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
.cursor{
  width:36px;height:36px;border:1px solid rgba(0,224,255,.8);
  background:transparent;
  transition:width .25s,height .25s,background .25s,border-color .25s;
}
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
  border:none;cursor:pointer;font-family:inherit;
}
.nav-cta:hover{box-shadow:0 8px 30px -6px rgba(0,255,163,.8);transform:translateY(-2px)}
@media(max-width:880px){.nav-links{display:none}}

.btn{
  display:inline-flex;align-items:center;justify-content:center;gap:8px;
  padding:12px 24px;border-radius:100px;font-size:.92rem;font-weight:600;
  cursor:pointer;border:none;text-decoration:none;font-family:inherit;
  transition:transform .2s,box-shadow .3s;
  pointer-events:auto;position:relative;z-index:1;
}
.btn-primary{
  background:linear-gradient(120deg,var(--mint),var(--cyan));color:#031018;
  box-shadow:0 10px 34px -10px rgba(0,255,163,.85);
}
.btn-primary:hover{transform:translateY(-2px);box-shadow:0 16px 40px -10px rgba(0,224,255,.9)}
.btn-ghost{background:var(--glass);color:var(--text);border:1px solid var(--stroke)}
.btn-ghost:hover{border-color:rgba(0,224,255,.5)}

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
  max-width:620px;font-size:1.06rem;line-height:1.75;color:var(--muted);
  margin-bottom:8px;opacity:0;
  animation:fadeUp .9s .5s cubic-bezier(.16,1,.3,1) forwards;
}
@keyframes fadeUp{from{opacity:0;transform:translateY(24px)}to{opacity:1;transform:translateY(0)}}

.link-box{
  margin:36px 0 44px;padding:26px 28px;border-radius:22px;
  background:linear-gradient(160deg,rgba(0,224,255,.09),rgba(0,255,163,.03));
  border:1px solid rgba(0,224,255,.25);
  backdrop-filter:blur(16px);
  box-shadow:0 24px 60px -24px rgba(0,224,255,.4);
  max-width:720px;
  animation:fadeUp .9s .65s cubic-bezier(.16,1,.3,1) both;
}
.link-box-header{
  display:flex;justify-content:space-between;align-items:center;
  gap:16px;margin-bottom:20px;flex-wrap:wrap;
}
.link-box-title{font-weight:700;font-size:1.05rem;letter-spacing:-.01em}
.link-box-badge{
  padding:4px 12px;border-radius:100px;font-size:.7rem;font-weight:700;
  letter-spacing:.08em;text-transform:uppercase;color:#031018;
  background:linear-gradient(120deg,var(--mint),var(--cyan));
}
.link-box-content{
  display:grid;grid-template-columns:auto 1fr;gap:24px;align-items:center;
}
@media (max-width:640px){.link-box-content{grid-template-columns:1fr}}
.qr-mini{
  padding:10px;background:#fff;border-radius:14px;
  width:140px;height:140px;display:grid;place-items:center;
  font-size:2rem;flex-shrink:0;
}
.qr-mini svg{display:block;max-width:100%;height:auto}
.link-box-hint{color:var(--muted);font-size:.88rem;line-height:1.6;margin-top:12px}
.link-box-hint b{color:var(--cyan);font-weight:600}

.sub-url{display:flex;gap:8px}
.sub-url input{
  flex:1;min-width:0;padding:12px 14px;border-radius:10px;
  border:1px solid var(--stroke);background:rgba(0,0,0,.45);
  color:var(--text);font-family:monospace;font-size:.88rem;
}
.copy-btn{
  padding:0 18px;border-radius:10px;border:1px solid rgba(0,224,255,.35);
  background:rgba(0,224,255,.12);color:var(--cyan);cursor:pointer;
  font-weight:600;font-size:.85rem;transition:background .2s,color .2s;
  font-family:inherit;pointer-events:auto;white-space:nowrap;
}
.copy-btn:hover{background:rgba(0,224,255,.22)}

.trust{
  display:flex;gap:34px;flex-wrap:wrap;margin-top:56px;
  opacity:0;animation:fadeUp .9s .85s cubic-bezier(.16,1,.3,1) forwards;
}
.trust-item{display:flex;align-items:center;gap:10px;color:var(--muted);font-size:.86rem}
.trust-item svg{width:18px;height:18px;flex-shrink:0;color:var(--mint)}

section{padding:120px 0;position:relative}
.sec-head{margin-bottom:64px;max-width:680px}
.sec-tag{
  font-size:.76rem;letter-spacing:.28em;text-transform:uppercase;
  color:var(--mint);margin-bottom:16px;display:block;
}
h2.sec{font-weight:800;font-size:clamp(2rem,4.6vw,3.4rem);line-height:1.05;letter-spacing:-.025em}
.sec-head p{color:var(--muted);margin-top:20px;line-height:1.75;font-size:1rem;max-width:560px}

.reveal{opacity:0;transform:translateY(44px);transition:opacity .9s cubic-bezier(.16,1,.3,1),transform .9s cubic-bezier(.16,1,.3,1)}
.reveal.in{opacity:1;transform:none}

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
.server-name{font-weight:700;font-size:1.35rem;margin-bottom:24px;letter-spacing:-.01em;display:flex;align-items:center;flex-wrap:wrap;gap:10px}
.server-tag{
  display:inline-block;padding:3px 10px;
  font-size:.66rem;font-weight:700;letter-spacing:.06em;
  border-radius:100px;vertical-align:middle;
  color:var(--mint);background:rgba(0,255,163,.1);
  border:1px solid rgba(0,255,163,.28);
}
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

.faq{max-width:820px;margin:0 auto;display:grid;gap:12px}
.faq-item{
  border-radius:16px;background:var(--glass);border:1px solid var(--stroke);
  overflow:hidden;transition:border-color .3s,background .3s;
}
.faq-item.open{border-color:rgba(0,224,255,.4);background:rgba(0,224,255,.04)}
.faq-q{
  padding:22px 26px;cursor:pointer;display:flex;justify-content:space-between;
  align-items:center;gap:20px;font-weight:500;font-size:.98rem;transition:color .3s;
  pointer-events:auto;
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

function renderLanding(url) {
  const subUrl = url.origin;
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
    <p class="hero-sub">Бесплатный VPN без лимитов, регистрации и карт. Скопируй ссылку ниже и добавь её в свой VPN-клиент.</p>
    <div class="link-box">
      <div class="link-box-header">
        <span class="link-box-title">Твоя ссылка-подписка</span>
        <span class="link-box-badge">Бесплатно · Бессрочно</span>
      </div>
      <div class="link-box-content">
        <div class="qr-mini" id="qr-box">🔗</div>
        <div>
          <div class="sub-url">
            <input type="text" id="sub-url" readonly value="${subUrl}">
            <button type="button" class="copy-btn" onclick="copySub(event)">Копировать</button>
          </div>
          <p class="link-box-hint">Добавь ссылку в любой VLESS-клиент: <b>Happ</b>, <b>Incy</b>, <b>v2rayNG</b> и др.</p>
        </div>
      </div>
    </div>
  </div>
</header>
<script src="https://cdn.jsdelivr.net/npm/qrcode-generator@1.4.4/qrcode.min.js"></script>
<script>
function copySub(e) {
  const input = document.getElementById('sub-url');
  if (!input) return;
  const url = input.value;
  input.select();
  navigator.clipboard.writeText(url);
  const btn = e.currentTarget;
  const orig = btn.textContent;
  btn.textContent = '✓ Скопировано';
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
  } catch (err) {}
})();
</script>
</body>
</html>`;
}

async function handle(request) {
  const url = new URL(request.url);
  const path = url.pathname;
  const ua = request.headers.get("User-Agent") || "";

  if (path === "/" || path === "") {
    if (isBrowser(ua)) return htmlResponse(renderLanding(url));
    return serveSubscription();
  }
  if (path === "/sub" || path === "/sub/") {
    if (isBrowser(ua)) return Response.redirect(url.origin + "/", 302);
    return serveSubscription();
  }
  return new Response("Not Found", { status: 404 });
}

export default {
  async fetch(request) {
    try {
      return await handle(request);
    } catch (e) {
      return new Response("Internal Error: " + (e.message || e), { status: 500 });
    }
  }
};