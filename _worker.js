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
    // 1. ЗАПРОС К ИСТОЧНИКУ ТОЛЬКО ДЛЯ ТРАФИКА
    // ============================================

    let headers = {};

    try {
      const first = await fetch(SOURCE, {
        headers: { "User-Agent": UA, "Accept": "*/*" },
        redirect: "manual",
        cf: { cacheTtl: 0 }
      });

      headers = Object.fromEntries(first.headers.entries());

      if (first.status >= 300 && first.status < 400) {
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

        headers = Object.fromEntries(second.headers.entries());
      }
    } catch (e) {
      // Игнорируем ошибки — трафик останется нулевым
    }

    // ============================================
    // 2. СЕРВЕРЫ — ЧИСТАЯ ВЫДАЧА VLESS
    // ============================================

    const rawServers = [
      "vless://31dac09f-78ee-49ca-9566-d20aea578fdc@de-new.datanode-internal.net:443?flow=xtls-rprx-vision&type=tcp&security=reality&fp=qq&sni=openwrt.lan&pbk=r6lN34m1nN-xQZ458j5NPD5xJ3_QBF2bGzY4KJEo4ic&sid=abbcd128#%F0%9F%87%A9%F0%9F%87%AA+%D0%93%D0%B5%D1%80%D0%BC%D0%B0%D0%BD%D0%B8%D1%8F",
      "vless://31dac09f-78ee-49ca-9566-d20aea578fdc@se-new.datanode-internal.net:443?flow=xtls-rprx-vision&type=tcp&security=reality&fp=qq&sni=openwrt.lan&pbk=r6lN34m1nN-xQZ458j5NPD5xJ3_QBF2bGzY4KJEo4ic&sid=abbcd128#%F0%9F%87%B8%F0%9F%87%AA+%D0%A8%D0%B2%D0%B5%D1%86%D0%B8%D1%8F",
      "vless://31dac09f-78ee-49ca-9566-d20aea578fdc@pl.datanode-internal.net:443?flow=xtls-rprx-vision&type=tcp&security=reality&fp=qq&sni=openwrt.lan&pbk=r6lN34m1nN-xQZ458j5NPD5xJ3_QBF2bGzY4KJEo4ic&sid=abbcd128#%F0%9F%87%B5%F0%9F%87%B1+%D0%9F%D0%BE%D0%BB%D1%8C%D1%88%D0%B0",
      "vless://4054fdc2-ee80-4419-8a8e-d937df4719e2@78.159.250.214:443?flow=xtls-rprx-vision&type=tcp&headerType=none&security=reality&fp=chrome&sni=qq.utiltools.site&pbk=drY21DHNOr6ezJLA2B10mzTExeJ9-gVBfTBNLwVBtWI&sid=00000000#%F0%9F%87%B3%F0%9F%87%B1+%D0%9D%D0%B8%D0%B4%D0%B5%D1%80%D0%BB%D0%B0%D0%BD%D0%B4%D1%8B",
      "vless://4054fdc2-ee80-4419-8a8e-d937df4719e2@qq.utiltools.site:443?flow=xtls-rprx-vision&type=tcp&headerType=none&security=reality&fp=random&sni=qq.utiltools.site&pbk=drY21DHNOr6ezJLA2B10mzTExeJ9-gVBfTBNLwVBtWI#%F0%9F%87%AB%F0%9F%87%B7+%D0%A4%D1%80%D0%B0%D0%BD%D1%86%D0%B8%D1%8F",
      "vless://31dac09f-78ee-49ca-9566-d20aea578fdc@ru.datanode-internal.net:443?flow=xtls-rprx-vision&type=tcp&security=reality&fp=qq&sni=openwrt.lan&pbk=r6lN34m1nN-xQZ458j5NPD5xJ3_QBF2bGzY4KJEo4ic&sid=abbcd128#%F0%9F%87%B7%F0%9F%87%BA+%D0%A0%D0%BE%D1%81%D1%81%D0%B8%D1%8F",
      "vless://4054fdc2-ee80-4419-8a8e-d937df4719e2@qq.utiltools.site:443?flow=xtls-rprx-vision&type=tcp&headerType=none&security=reality&fp=qq&sni=qq.utiltools.site&pbk=drY21DHNOr6ezJLA2B10mzTExeJ9-gVBfTBNLwVBtWI#%F0%9F%87%AA%F0%9F%87%BA+Telegram+Proxy+%7C+Wi-Fi%2FLTE",
      "vless://31dac09f-78ee-49ca-9566-d20aea578fdc@hole-nn.datanode-internal.net:443?type=grpc&security=reality&fp=qq&sni=river-2-611.rtbcdn.ru&pbk=r6lN34m1nN-xQZ458j5NPD5xJ3_QBF2bGzY4KJEo4ic&sid=abbcd128&serviceName=ads.x5.ru&mode=gun#%F0%9F%87%A9%F0%9F%87%AA+%D0%91%D0%B5%D0%BB%D1%8B%D0%B9+%D1%81%D0%BF%D0%B8%D1%81%D0%BE%D0%BA+%231",
      "vless://4054fdc2-ee80-4419-8a8e-d937df4719e2@78.159.250.214:443?flow=xtls-rprx-vision&type=tcp&headerType=none&security=reality&fp=random&sni=qq.utiltools.site&pbk=drY21DHNOr6ezJLA2B10mzTExeJ9-gVBfTBNLwVBtWI&sid=00000000#%F0%9F%87%AE%F0%9F%87%B9+%D0%91%D0%B5%D0%BB%D1%8B%D0%B9+%D1%81%D0%BF%D0%B8%D1%81%D0%BE%D0%BA+%232",
      "vless://4054fdc2-ee80-4419-8a8e-d937df4719e2@qq.utiltools.site:443?flow=xtls-rprx-vision&type=tcp&headerType=none&security=reality&fp=qq&sni=qq.utiltools.site&pbk=drY21DHNOr6ezJLA2B10mzTExeJ9-gVBfTBNLwVBtWI#%F0%9F%87%B7%F0%9F%87%B8+%D0%91%D0%B5%D0%BB%D1%8B%D0%B9+%D1%81%D0%BF%D0%B8%D1%81%D0%BE%D0%BA+%233"
    ];

    let body = btoa(unescape(encodeURIComponent(rawServers.join("\n"))));

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
    margin-bottom: 16px;
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
  .support-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    width: 100%;
    padding: 16px 20px;
    background: linear-gradient(135deg, #229ED9, #1c8ac0);
    color: #fff;
    text-decoration: none;
    border-radius: 20px;
    font-size: 15px;
    font-weight: 600;
    margin-bottom: 24px;
    box-shadow: 0 8px 24px rgba(34, 158, 217, 0.3);
    transition: transform 0.15s ease, box-shadow 0.15s ease;
  }
  .support-btn:hover {
    transform: translateY(-1px);
    box-shadow: 0 12px 28px rgba(34, 158, 217, 0.4);
  }
  .support-btn:active {
    transform: translateY(0);
  }
  .tg-icon {
    width: 22px; height: 22px;
    flex-shrink: 0;
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
    <a class="support-btn" href="https://t.me/snokyu" target="_blank" rel="noopener noreferrer">
      <svg class="tg-icon" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
        <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
      </svg>
      Поддержка в Telegram
    </a>
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

    // ============================================
    // ПОДМЕНЯЕМ EXPIRE НА 01.01.2028
    // ============================================

    const newUserinfo =
      `upload=${info.upload}; download=${info.download}; ` +
      `total=${info.total}; expire=${EXPIRE}`;

    outHeaders["Subscription-Userinfo"] = newUserinfo;

    return new Response(body, { headers: outHeaders });
  }
};
