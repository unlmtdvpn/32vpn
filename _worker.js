export default {
  async fetch(request) {
    const SOURCE = "https://sub.datanode-internal.net/McjAzVPB2VRYcM6z";
    const UA = "INCY/3.6.5/android";

    // ============================================
    // ПРОВЕРКА КЛИЕНТА
    // ============================================

    const incomingUA = request.headers.get("User-Agent") || "";

    const isAllowed =
      /incy/i.test(incomingUA) ||
      /happ/i.test(incomingUA);

    if (!isAllowed) {
      return new Response(
        JSON.stringify({
          servers: [],
          message: "Forbidden"
        }),
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
    // ЗАГОЛОВКИ ОТВЕТА
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
      "subscription-userinfo",
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

    if (!body || !body.trim()) {
      body = JSON.stringify({
        servers: [],
        message: "Источник недоступен"
      });
    }

    return new Response(body, { headers: outHeaders });
  }
};