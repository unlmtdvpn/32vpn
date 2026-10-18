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
    // ДАТА ОКОНЧАНИЯ — 1 ЯНВАРЯ 2028 ГОДА
    // ============================================

    function getExpire() {
      const d = Date.UTC(2028, 0, 1, 0, 0, 0);
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
    // БРАУЗЕР — УЛУЧШЕННЫЙ ВЕБ-ИНТЕРФЕЙС
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
      
      const expireDate = "01.01.2028";

      const html = `<!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>wlvpn · Управление подпиской</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    background: radial-gradient(circle at top, #111827 0%, #030712 100%);
    color: #f3f4f6;
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
    -webkit-font-smoothing: antialiased;
  }
  .card {
    width: 100%;
    max-width: 440px;
    background: rgba(17, 24, 39, 0.75);
    backdrop-filter: blur(16px);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 28px;
    padding: 32px 26px;
    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.7);
  }
  .header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 24px;
  }
  .logo-area {
    display: flex;
    align-items: center;
    gap: 12px;
  }
  .logo-icon {
    width: 42px; height: 42px;
    border-radius: 14px;
    background: linear-gradient(135deg, #3b82f6, #8b5cf6);
    display: flex; align-items: center; justify-content: center;
    font-size: 20px;
    box-shadow: 0 8px 20px rgba(59, 130, 246, 0.3);
  }
  .logo-text {
    font-size: 20px;
    font-weight: 700;
    letter-spacing: -0.4px;
  }
  .status {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    background: rgba(16, 185, 129, 0.1);
    color: #34d399;
    padding: 6px 12px;
    border-radius: 50px;
    font-size: 11px;
    font-weight: 600;
    border: 1px solid rgba(16, 185, 129, 0.2);
  }
  .dot {
    width: 6px; height: 6px;
    border-radius: 50%;
    background: #34d399;
    box-shadow: 0 0 10px #34d399;
  }
  .section-title {
    font-size: 11px;
    color: #9ca3af;
    text-transform: uppercase;
    letter-spacing: 1.2px;
    margin-bottom: 10px;
    font-weight: 600;
  }
  .traffic-card {
    background: rgba(3, 7, 18, 0.5);
    border: 1px solid rgba(255, 255, 255, 0.05);
    border-radius: 20px;
    padding: 20px;
    margin-bottom: 16px;
  }
  .traffic-header {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    margin-bottom: 12px;
  }
  .traffic-used {
    font-size: 22px;
    font-weight: 700;
  }
  .traffic-total {
    font-size: 13px;
    color: #9ca3af;
  }
  .progress-bar {
    height: 8px;
    background: rgba(255, 255, 255, 0.05);
    border-radius: 100px;
    overflow: hidden;
    margin-bottom: 14px;
  }
  .progress-fill {
    height: 100%;
    background: linear-gradient(90deg, #3b82f6, #8b5cf6);
    border-radius: 100px;
    transition: width 0.5s cubic-bezier(0.4, 0, 0.2, 1);
  }
  .traffic-details {
    display: flex;
    justify-content: space-between;
    font-size: 12px;
    color: #9ca3af;
  }
  .traffic-details b { color: #e5e7eb; font-weight: 500; }
  .info-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: rgba(3, 7, 18, 0.5);
    border: 1px solid rgba(255, 255, 255, 0.05);
    border-radius: 20px;
    padding: 16px 20px;
    margin-bottom: 16px;
    font-size: 14px;
  }
  .info-label { color: #9ca3af; }
  .info-val { font-weight: 600; color: #f9fafb; }
  .hint-box {
    background: rgba(59, 130, 246, 0.06);
    border: 1px solid rgba(59, 130, 246, 0.15);
    border-radius: 20px;
    padding: 18px;
    margin-bottom: 24px;
  }
  .hint-title {
    font-weight: 600;
    font-size: 14px;
    margin-bottom: 6px;
    color: #93c5fd;
  }
  .hint-desc {
    font-size: 13px;
    line-height: 1.5;
    color: #9ca3af;
  }
  .footer {
    text-align: center;
    font-size: 12px;
    color: #4b5563;
  }
</style>
</head>
<body>
  <div class="card">

    <div class="header">
      <div class="logo-area">
        <div class="logo-icon">🛡</div>
        <div class="logo-text">wlvpn</div>
      </div>
      <div class="status">
        <span class="dot"></span> Активно
      </div>
    </div>

    <div class="section-title">Использование трафика</div>
    <div class="traffic-card">
      <div class="traffic-header">
        <div class="traffic-used">${fmt(used)}</div>
        <div class="traffic-total">из ${fmt(total)}</div>
      </div>
      <div class="progress-bar">
        <div class="progress-fill" style="width: ${percent.toFixed(1)}%"></div>
      </div>
      <div class="traffic-details">
        <span>↑ Отдача: <b>${fmt(info.upload)}</b></span>
        <span>↓ Загрузка: <b>${fmt(info.download)}</b></span>
      </div>
    </div>

    <div class="info-row">
      <span class="info-label">Срок действия</span>
      <span class="info-val">${expireDate}</span>
    </div>

    <div class="hint-box">
      <div class="hint-title">Использование подписки</div>
      <div class="hint-desc">
        Скопируйте эту ссылку и добавьте её в ваш любимый VPN-клиент. В браузере отображается только текущая статистика.
      </div>
    </div>

    <div class="footer">
      wlvpn · защищенное соединение
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
    // КАСТОМИЗАЦИЯ СЕРВЕРОВ
    // ============================================

    if (body && body.trim()) {
      let rawText = body;
      let isBase64 = false;

      // Проверяем, закодировано ли тело в Base64
      try {
        const decoded = atob(body.trim());
        if (decoded.includes("://")) {
          rawText = decoded;
          isBase64 = true;
        }
      } catch (e) {
        // Обычный текст
      }

      // Разбиваем на строки
      let remoteLines = rawText.split(/\r?\n/).map(l => l.trim()).filter(l => l);
      
      // 1. Переименовываем самую последнюю ноду из источника в "Белый список #1"
      if (remoteLines.length > 0) {
        let lastIdx = remoteLines.length - 1;
        let line = remoteLines[lastIdx];
        const hashIdx = line.indexOf("#");
        if (hashIdx !== -1) {
          line = line.substring(0, hashIdx);
        }
        remoteLines[lastIdx] = line + "#" + encodeURIComponent("🇩🇪 Белый список #1");
      }

      // 2. Нода Telegram для вставки В НАЧАЛО
      const telegramNode = "vless://4054fdc2-ee80-4419-8a8e-d937df4719e2@qq.utiltools.site:443?flow=xtls-rprx-vision&type=tcp&headerType=none&security=reality&fp=qq&sni=qq.utiltools.site&pbk=drY21DHNOr6ezJLA2B10mzTExeJ9-gVBfTBNLwVBtWI#" + encodeURIComponent("🇪🇺 Telegram");

      // 3. Нода Белый список #2 для вставки В КОНЕЦ
      const bs2Node = "vless://4054fdc2-ee80-4419-8a8e-d937df4719e2@qq.utiltools.site:443?flow=xtls-rprx-vision&type=tcp&headerType=none&security=reality&sni=qq.utiltools.site&pbk=drY21DHNOr6ezJLA2B10mzTExeJ9-gVBfTBNLwVBtWI#" + encodeURIComponent("🇸🇪 Белый список #2");

      // Сборка итогового массива: Telegram вначале + старые ноды из источника + Белый список #2 в конце
      let lines = [telegramNode, ...remoteLines, bs2Node];

      rawText = lines.join("\n");

      // Если исходник был в Base64, упаковываем обратно
      if (isBase64) {
        try {
          body = btoa(unescape(encodeURIComponent(rawText)));
        } catch (err) {
          body = rawText;
        }
      } else {
        body = rawText;
      }
    }

    // ============================================
    // ЗАГОЛОВКИ ОТВЕТА КЛИЕНТУ
    // ============================================

    const outHeaders = {
      "Content-Type": "text/plain; charset=utf-8",
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
    // ПОДМЕНЯЕМ EXPIRE НА 01.01.2028
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