export default {
  async fetch(request) {
    const SOURCE = "https://sub.datanode-internal.net/McjAzVPB2VRYcM6z";
    const UA = "INCY/3.6.5/android";

    const incomingUA = request.headers.get("User-Agent") || "";

    const isBrowser =
      /mozilla|chrome|safari|firefox|edg|opera|msie|trident/i.test(incomingUA);

    const isAllowed =
      /incy/i.test(incomingUA) ||
      /happ/i.test(incomingUA);

    // ============================================
    // ЗАПРОС К ИСТОЧНИКУ
    // ============================================

    let status = 0;
    let headers = {};
    let body = "";

    try {
      const first = await fetch(SOURCE, {
        headers: { "User-Agent": UA, "Accept": "*/*" },
        redirect: "manual",
        cf: { cacheTtl: 0 }
      });

      status = first.status;
      headers = Object.fromEntries(first.headers.entries());

      if (status >= 300 && status < 400) {
        const setCookie = first.headers.get("set-cookie") || "";
        const cookie = setCookie.split(";")[0];

        const second = await fetch(SOURCE, {
          headers: {
            "User-Agent": UA,
            "Accept": "*/*",
            ...(cookie ? { "Cookie": cookie } : {})
          },
          redirect: "manual",
          cf: { cacheTtl: 0 }
        });

        status = second.status;
        headers = Object.fromEntries(second.headers.entries());
        body = await second.text();
      } else {
        body = await first.text();
      }

    } catch (e) {
      body = "FETCH ERROR: " + e.message;
    }

    // ============================================
    // ДАТА ОКОНЧАНИЯ — 30 ОКТЯБРЯ
    // ============================================

    function getExpire() {
      const now = new Date();
      const y = now.getUTCFullYear();
      let d = Date.UTC(y, 9, 30, 0, 0, 0); // месяц 9 = октябрь
      if (d < now.getTime()) {
        d = Date.UTC(y + 1, 9, 30, 0, 0, 0);
      }
      return Math.floor(d / 1000);
    }

    const EXPIRE = getExpire();

    // ============================================
    // ПАРСИНГ TRAFFIC
    // ============================================

    function parseUserinfo(str) {
      const out = { upload: 0, download: 0, total: 0 };
      if (!str) return out;
      for (const p of str.split(";")) {
        const i = p.indexOf("=");
        if (i === -1) continue;
        const k = p.slice(0, i).trim().toLowerCase();
        const v = parseInt(p.slice(i + 1).trim()) || 0;
        if (k === "upload") out.upload = v;
        if (k === "download") out.download = v;
        if (k === "total") out.total = v;
      }
      return out;
    }

    const info = parseUserinfo(headers["subscription-userinfo"]);

    // ============================================
    // БРАУЗЕР — ВЕБ-ИНТЕРФЕЙС
    // ============================================

    if (isBrowser) {

      const fmt = (b) => {
        if (!b) return "0 B";
        const units = ["B", "KB", "MB", "GB", "TB"];
        let i = 0;
        while (b >= 1024 && i < units.length - 1) { b /= 1024; i++; }
        return b.toFixed(2) + " " + units[i];
      };

      const used = info.upload + info.download;
      const total = info.total || 0;
      const percent = total > 0 ? Math.min(100, (used / total) * 100) : 0;
      const expireDate = new Date(EXPIRE * 1000)
        .toISOString()
        .slice(0, 10)
        .split("-")
        .reverse()
        .join(".");

      const html = `<!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>wlvpn</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    background: #0b0f19;
    color: #e8ecf3;
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 24px;
    -webkit-font-smoothing: antialiased;
  }
  .card {
    width: 100%;
    max-width: 480px;
    background: linear-gradient(160deg, #151b2b 0%, #0f1420 100%);
    border: 1px solid #232b3d;
    border-radius: 24px;
    padding: 32px 28px;
    box-shadow: 0 20px 60px rgba(0,0,0,.5);
  }
  .logo {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 28px;
  }
  .logo-icon {
    width: 44px; height: 44px;
    border-radius: 12px;
    background: linear-gradient(135deg, #4f7cff, #8b5cf6);
    display: flex; align-items: center; justify-content: center;
    font-size: 22px;
  }
  .logo-text {
    font-size: 22px;
    font-weight: 700;
    letter-spacing: -.5px;
  }
  .status {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    background: rgba(74, 222, 128, .12);
    color: #4ade80;
    padding: 5px 12px;
    border-radius: 20px;
    font-size: 12px;
    font-weight: 600;
    margin-bottom: 24px;
  }
  .dot {
    width: 7px; height: 7px;
    border-radius: 50%;
    background: #4ade80;
    box-shadow: 0 0 8px #4ade80;
  }
  .section-label {
    font-size: 12px;
    color: #7a869e;
    text-transform: uppercase;
    letter-spacing: 1px;
    margin-bottom: 12px;
    font-weight: 600;
  }
  .traffic {
    background: #0e1320;
    border: 1px solid #1e2637;
    border-radius: 16px;
    padding: 20px;
    margin-bottom: 20px;
  }
  .traffic-main {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    margin-bottom: 14px;
  }
  .traffic-used {
    font-size: 24px;
    font-weight: 700;
  }
  .traffic-total {
    font-size: 13px;
    color: #7a869e;
  }
  .bar {
    height: 8px;
    background: #1a2133;
    border-radius: 100px;
    overflow: hidden;
    margin-bottom: 14px;
  }
  .bar-fill {
    height: 100%;
    background: linear-gradient(90deg, #4f7cff, #8b5cf6);
    border-radius: 100px;
    transition: width .4s ease;
  }
  .traffic-row {
    display: flex;
    justify-content: space-between;
    font-size: 13px;
    color: #8b95ab;
  }
  .traffic-row b { color: #c9d2e3; font-weight: 600; }
  .expire {
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: #0e1320;
    border: 1px solid #1e2637;
    border-radius: 16px;
    padding: 16px 20px;
    margin-bottom: 20px;
    font-size: 14px;
  }
  .expire-label { color: #7a869e; }
  .expire-value { color: #e8ecf3; font-weight: 600; }
  .notice {
    background: rgba(79, 124, 255, .08);
    border: 1px solid rgba(79, 124, 255, .25);
    border-radius: 16px;
    padding: 20px;
    margin-bottom: 20px;
  }
  .notice-title {
    font-weight: 700;
    font-size: 15px;
    margin-bottom: 8px;
    color: #a5b9ff;
  }
  .notice-text {
    font-size: 14px;
    line-height: 1.55;
    color: #b6c0d3;
  }
  .notice-text b { color: #e8ecf3; }
  .apps {
    display: flex;
    gap: 8px;
    margin-top: 14px;
  }
  .app {
    flex: 1;
    text-align: center;
    padding: 10px;
    background: #0e1320;
    border: 1px solid #232b3d;
    border-radius: 10px;
    font-size: 13px;
    font-weight: 600;
    color: #a5b9ff;
  }
  .footer {
    text-align: center;
    font-size: 12px;
    color: #55617a;
  }
</style>
</head>
<body>
  <div class="card">

    <div class="logo">
      <div class="logo-icon">🛡</div>
      <div class="logo-text">wlvpn</div>
    </div>

    <div class="status">
      <span class="dot"></span> Подписка активна
    </div>

    <div class="section-label">Трафик</div>
    <div class="traffic">
      <div class="traffic-main">
        <div class="traffic-used">${fmt(used)}</div>
        <div class="traffic-total">из ${fmt(total)}</div>
      </div>
      <div class="bar">
        <div class="bar-fill" style="width: ${percent.toFixed(1)}%"></div>
      </div>
      <div class="traffic-row">
        <span>↑ Загружено: <b>${fmt(info.upload)}</b></span>
        <span>↓ Скачано: <b>${fmt(info.download)}</b></span>
      </div>
    </div>

    <div class="expire">
      <span class="expire-label">Окончание подписки</span>
      <span class="expire-value">${expireDate}</span>
    </div>

    <div class="notice">
      <div class="notice-title">Как подключиться</div>
      <div class="notice-text">
        Вставьте эту ссылку в <b>Happ</b> или <b>Incy</b> как подписку.
        В браузере конфигурация не отображается.
      </div>
      <div class="apps">
        <div class="app">Happ</div>
        <div class="app">Incy</div>
      </div>
    </div>

    <div class="footer">
      © wlvpn · стабильный VPN сервис
    </div>

  </div>
</body>
</html>`;

      return new Response(html, {
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          "Cache-Control": "no-cache"
        }
      });
    }

    // ============================================
    // НЕ БРАУЗЕР И НЕ КЛИЕНТ — ЗАПРЕТ
    // ============================================

    if (!isAllowed) {
      return new Response(
        JSON.stringify({ servers: [], message: "Forbidden" }),
        {
          status: 403,
          headers: {
            "Content-Type": "application/json; charset=utf-8",
            "Access-Control-Allow-Origin": "*",
            "Cache-Control": "no-cache"
          }
        }
      );
    }

    // ============================================
    // ЗАГОЛОВКИ ОТВЕТА КЛИЕНТУ
    // ============================================

    const outHeaders = {
      "Content-Type": "application/json; charset=utf-8",
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "no-cache",
      "Profile-Title": "wlvpn",
      "Profile-Update-Interval": "6",
      "announce": "🏳 wlvpn - стабильный VPN сервис."
    };

    const PASSTHROUGH = [
      "profile-web-page-url",
      "support-url",
      "providerid",
      "hide-settings",
      "new-url"
    ];

    for (const name of PASSTHROUGH) {
      const v = headers[name];
      if (v) {
        const canon = name
          .split("-")
          .map(s => s[0].toUpperCase() + s.slice(1))
          .join("-");
        outHeaders[canon] = v;
      }
    }

    // ============================================
    // ПОДМЕНЯЕМ EXPIRE НА 30 ОКТЯБРЯ
    // ============================================

    const newUserinfo =
      `upload=${info.upload}; download=${info.download}; ` +
      `total=${info.total}; expire=${EXPIRE}`;

    outHeaders["Subscription-Userinfo"] = newUserinfo;

    if (!body || !body.trim()) {
      body = JSON.stringify({
        servers: [],
        message: "Источник недоступен"
      });
    }

    return new Response(body, { headers: outHeaders });
  }
};