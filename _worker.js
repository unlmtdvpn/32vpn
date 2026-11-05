// ============================================================
// WLVPN — Free VPN Service (Cloudflare Worker)
// No admin, no tokens, no KV — just one open subscription link
// ============================================================

const SERVERS = [
  "vless://31dac09f-78ee-49ca-9566-d20aea578fdc@de-new.datanode-internal.net:443?flow=xtls-rprx-vision&type=tcp&security=reality&fp=qq&sni=openwrt.lan&pbk=r6lN34m1nN-xQZ458j5NPD5xJ3_QBF2bGzY4KJEo4ic&sid=abbcd128#%F0%9F%87%A9%F0%9F%87%AA+%D0%93%D0%B5%D1%80%D0%BC%D0%B0%D0%BD%D0%B8%D1%8F",
  "vless://31dac09f-78ee-49ca-9566-d20aea578fdc@se-new.datanode-internal.net:443?flow=xtls-rprx-vision&type=tcp&security=reality&fp=qq&sni=openwrt.lan&pbk=r6lN34m1nN-xQZ458j5NPD5xJ3_QBF2bGzY4KJEo4ic&sid=abbcd128#%F0%9F%87%B8%F0%9F%87%AA+%D0%A8%D0%B2%D0%B5%D1%86%D0%B8%D1%8F",
  "vless://5a5aaaeb-3be1-44c0-9494-450c61717629@cdn153.failusha.digital:9443?type=xhttp&security=reality&fp=firefox&sni=cdn153.failusha.digital&pbk=nkrotEHDrd0p1rgjpp1QyoJyaeBl5ABahjPXP22lhxE&sid=4822d3949af8e3ed&spx=%2Fc6e7a6d4bbb91b1d&path=%2Fx%2F8a62ac6fd830&mode=stream-up#%D0%9D%D0%B8%D0%B4%D0%B5%D1%80%D0%BB%D0%B0%D0%BD%D0%B4%D1%8B+%F0%9F%87%B3%F0%9F%87%B1",
  "vless://31dac09f-78ee-49ca-9566-d20aea578fdc@pl.datanode-internal.net:443?flow=xtls-rprx-vision&type=tcp&security=reality&fp=qq&sni=openwrt.lan&pbk=r6lN34m1nN-xQZ458j5NPD5xJ3_QBF2bGzY4KJEo4ic&sid=abbcd128#%F0%9F%87%B5%F0%9F%87%B1+%D0%9F%D0%BE%D0%BB%D1%8C%D1%88%D0%B0",
  "vless://31dac09f-78ee-49ca-9566-d20aea578fdc@ru.datanode-internal.net:443?flow=xtls-rprx-vision&type=tcp&security=reality&fp=qq&sni=openwrt.lan&pbk=r6lN34m1nN-xQZ458j5NPD5xJ3_QBF2bGzY4KJEo4ic&sid=abbcd128#%F0%9F%87%B7%F0%9F%87%BA+%D0%A0%D0%BE%D1%81%D1%81%D0%B8%D1%8F",
  "vless://31dac09f-78ee-49ca-9566-d20aea578fdc@fi.datanode-internal.net:443?flow=xtls-rprx-vision&type=tcp&security=reality&fp=qq&sni=openwrt.lan&pbk=r6lN34m1nN-xQZ458j5NPD5xJ3_QBF2bGzY4KJEo4ic&sid=abbcd128#%F0%9F%87%AB%F0%9F%87%AE+%D0%A4%D0%B8%D0%BD%D0%BB%D1%8F%D0%BD%D0%B4%D0%B8%D1%8F",
  "vless://31dac09f-78ee-49ca-9566-d20aea578fdc@tr-new.datanode-internal.net:443?type=grpc&security=reality&fp=edge&sni=openwrt.lan&pbk=r6lN34m1nN-xQZ458j5NPD5xJ3_QBF2bGzY4KJEo4ic&sid=abbcd128&serviceName=ads.x5.ru&mode=gun#%F0%9F%87%B9%F0%9F%87%B7+%D0%A2%D1%83%D1%80%D1%86%D0%B8%D1%8F",
  "vless://31dac09f-78ee-49ca-9566-d20aea578fdc@hole-nn.datanode-internal.net:443?type=grpc&security=reality&fp=qq&sni=river-2-611.rtbcdn.ru&pbk=r6lN34m1nN-xQZ458j5NPD5xJ3_QBF2bGzY4KJEo4ic&sid=abbcd128&serviceName=ads.x5.ru&mode=gun#%F0%9F%87%A9%F0%9F%87%AA+%D0%91%D0%B5%D0%BB%D1%8B%D0%B9+%D1%81%D0%BF%D0%B8%D1%81%D0%BE%D0%BA+%231"
];

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

function b64(str) {
  return btoa(unescape(encodeURIComponent(str)));
}

function htmlResponse(content, status = 200) {
  return new Response(content, {
    status,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store"
    }
  });
}

// ============================================================
// SUBSCRIPTION
// ============================================================
function serveSubscription() {
  const body = b64(SERVERS.join("\n"));
  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Profile-Title": "wlvpn",
      "Profile-Update-Interval": "6",
      "Subscription-Userinfo": "upload=0; download=0; total=0; expire=0",
      "announce": "🏳 wlvpn — бесплатный VPN сервис.",
      "Cache-Control": "no-cache",
      "Access-Control-Allow-Origin": "*"
    }
  });
}

// ============================================================
// HANDLER
// ============================================================
async function handle(request) {
  const url = new URL(request.url);
  const path = url.pathname;
  const ua = request.headers.get("User-Agent") || "";

  // Главная: браузеру — лендинг со ссылкой, VPN-клиенту — сразу подписка
  if (path === "/" || path === "") {
    if (isBrowser(ua)) return htmlResponse(renderLanding(url));
    return serveSubscription();
  }

  // /sub — каноничный адрес подписки
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

// ============================================================
// CSS
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

/* CANVAS */
#stars{position:fixed;inset:0;z-index:0;opacity:.85;pointer-events:none}

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
  border:none;cursor:pointer;font-family:inherit;
}
.nav-cta:hover{box-shadow:0 8px 30px -6px rgba(0,255,163,.8);transform:translateY(-2px)}
@media(max-width:880px){.nav-links{display:none}}

/* BUTTONS */
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
  max-width:620px;font-size:1.06rem;line-height:1.75;color:var(--muted);
  margin-bottom:8px;opacity:0;
  animation:fadeUp .9s .5s cubic-bezier(.16,1,.3,1) forwards;
}
@keyframes fadeUp{from{opacity:0;transform:translateY(24px)}to{opacity:1;transform:translateY(0)}}

/* LINK BOX */
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

/* SCROLLBAR */
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

// ============================================================
// LANDING PAGE
// ============================================================
function renderLanding(url) {
  const subUrl = url.origin + "/sub";
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
            <input type="text" id="sub-url" readonly value="${subUrl}">
            <button type="button" class="copy-btn" onclick="copySub(event)">Копировать</button>
          </div>
          <p class="link-box-hint">
            Добавь ссылку в любой VLESS-клиент: <b>Happ</b>, <b>Incy</b>, <b>v2rayNG</b>, <b>Streisand</b>, <b>sing-box</b>, <b>Karing</b> и др.
            Или отсканируй QR-код камерой телефона.
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

<!-- SERVERS -->
<section id="servers">
  <div class="wrap">
    <div class="sec-head reveal">
      <span class="sec-tag">Серверы</span>
      <h2 class="sec">Восемь локаций. Один протокол.<br>Максимальная скорость.</h2>
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
        <div class="server-flag">🇸🇪</div>
        <div class="server-name">Швеция</div>
        <div class="server-stats">
          <div class="server-stat"><span><span class="live-dot"></span>Пинг</span><b class="ping-val" data-ping>— мс</b></div>
          <div class="server-stat"><span>Скорость</span><b>до 5 Гбит/с</b></div>
          <div class="server-stat"><span>Протокол</span><b class="proto">VLESS</b></div>
        </div>
      </div>

      <div class="server-card tilt reveal">
        <div class="server-flag">🇳🇱</div>
        <div class="server-name">Нидерланды</div>
        <div class="server-stats">
          <div class="server-stat"><span><span class="live-dot"></span>Пинг</span><b class="ping-val" data-ping>— мс</b></div>
          <div class="server-stat"><span>Скорость</span><b>до 5 Гбит/с</b></div>
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
        <div class="server-flag">🇷🇺</div>
        <div class="server-name">Россия</div>
        <div class="server-stats">
          <div class="server-stat"><span><span class="live-dot"></span>Пинг</span><b class="ping-val" data-ping>— мс</b></div>
          <div class="server-stat"><span>Скорость</span><b>до 3 Гбит/с</b></div>
          <div class="server-stat"><span>Протокол</span><b class="proto">VLESS</b></div>
        </div>
      </div>

      <div class="server-card tilt reveal">
        <div class="server-flag">🇫🇮</div>
        <div class="server-name">Финляндия</div>
        <div class="server-stats">
          <div class="server-stat"><span><span class="live-dot"></span>Пинг</span><b class="ping-val" data-ping>— мс</b></div>
          <div class="server-stat"><span>Скорость</span><b>до 3 Гбит/с</b></div>
          <div class="server-stat"><span>Протокол</span><b class="proto">VLESS</b></div>
        </div>
      </div>

      <div class="server-card tilt reveal">
        <div class="server-flag">🇹🇷</div>
        <div class="server-name">Турция</div>
        <div class="server-stats">
          <div class="server-stat"><span><span class="live-dot"></span>Пинг</span><b class="ping-val" data-ping>— мс</b></div>
          <div class="server-stat"><span>Скорость</span><b>до 3 Гбит/с</b></div>
          <div class="server-stat"><span>Протокол</span><b class="proto">VLESS · gRPC</b></div>
        </div>
      </div>

      <div class="server-card tilt reveal">
        <div class="server-flag">🇩🇪</div>
        <div class="server-name">Белый список</div>
        <div class="server-stats">
          <div class="server-stat"><span><span class="live-dot"></span>Пинг</span><b class="ping-val" data-ping>— мс</b></div>
          <div class="server-stat"><span>Особенность</span><b>обход белых списков</b></div>
          <div class="server-stat"><span>Протокол</span><b class="proto">VLESS · gRPC</b></div>
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
        <h3>Сервер «Белый список»</h3>
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

<!-- STEPS -->
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
        <div class="faq-a"><div class="faq-a-inner">Минимально. Германия — до 10 Гбит/с, Швеция и Нидерланды — до 5, Польша, Россия, Финляндия и Турция — до 3. Пинг на всех серверах держится в диапазоне 30–60 мс.</div></div>
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
/* ============ COPY ============ */
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

/* ============ QR ============ */
(function initQR() {
  const box = document.getElementById('qr-box');
  const input = document.getElementById('sub-url');
  if (!box || !input || typeof qrcode === 'undefined') return;
  try {
    const qr = qrcode(0, 'M');
    qr.addData(input.value);
    qr.make();
    box.innerHTML = qr.createSvgTag({ cellSize: 4, margin: 1 });
  } catch (err) {
    console.warn('QR failed:', err);
  }
})();

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
document.querySelectorAll('a, button, .card, .server-card, .faq-q, .review, .link-box').forEach(el => {
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
setTimeout(() => {
  document.querySelectorAll('.reveal:not(.in)').forEach(el => {
    el.classList.add('in');
    el.style.transitionDelay = '0ms';
  });
}, 3000);

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
</script>
</body>
</html>`;
}