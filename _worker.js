const SOURCE = "https://sub.datanode-internal.net/McjAzVPB2VRYcM6z";

const UA = "Happ/4.3.0/Android";

export default {

  async fetch(request) {

    const url = new URL(request.url);

    let status = 0;
    let body = "";
    let headers = {};
    let error = "";

    try {

      const res = await fetch(SOURCE, {
        headers: { "User-Agent": UA },
        redirect: "manual"
      });

      status = res.status;

      for (const [k, v] of res.headers.entries()) {
        headers[k] = v;
      }

      // Если редирект — один раз пробуем перейти по Location
      if (res.status >= 300 && res.status < 400) {

        const location = res.headers.get("location");

        if (location) {

          const target = new URL(location, SOURCE).toString();

          // Если ведёт на тот же URL — цикл, не идём
          if (target !== SOURCE) {

            const res2 = await fetch(target, {
              headers: { "User-Agent": UA },
              redirect: "manual"
            });

            status = res2.status;
            headers = {};

            for (const [k, v] of res2.headers.entries()) {
              headers[k] = v;
            }

            body = await res2.text();

          } else {

            error = "Redirect to same URL: " + target;

          }

        } else {

          error = "Redirect without location";

        }

      } else {

        body = await res.text();

      }

    } catch (e) {

      error = e.message || String(e);

    }

    // ============================================
    // DEBUG
    // ============================================

    if (url.pathname === "/debug") {

      return new Response(
        JSON.stringify({ status, headers, body, error }, null, 2),
        { headers: { "Content-Type": "application/json; charset=utf-8" } }
      );

    }

    // ============================================
    // ОТВЕТ
    // ============================================

    return new Response(body || JSON.stringify({
      servers: [],
      message: error || "Источник недоступен"
    }), {
      status: 200,
      headers: {
        "Content-Type": headers["content-type"] || "application/json; charset=utf-8",
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "no-store",
        "Subscription-Userinfo": headers["subscription-userinfo"] || "",
        "Profile-Title": "wlvpn",
        "Profile-Update-Interval": "6"
      }
    });

  }

};