export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const TRAFFIC_SOURCE_URL = "https://sub.datanode-internal.net/McjAzVPB2VRYcM6z";
    const FAKE_UA = 'INCY/3.6.5/android';

    let sourceStatus = 0;
    let rawHeaders = {};
    let rawBody = "";

    try {
      const first = await fetch(TRAFFIC_SOURCE_URL, {
        headers: { 'User-Agent': FAKE_UA, 'Accept': '*/*' },
        redirect: 'manual',
        cf: { cacheTtl: 0 }
      });

      let status = first.status;
      let headers = Object.fromEntries(first.headers.entries());
      let body = '';

      if (status >= 300 && status < 400) {
        let cookie = '';
        for (const [k, v] of Object.entries(headers)) {
          if (k.toLowerCase() === 'set-cookie') {
            cookie = v.split(';')[0];
            break;
          }
        }

        const second = await fetch(TRAFFIC_SOURCE_URL, {
          headers: {
            'User-Agent': FAKE_UA,
            'Accept': '*/*',
            'Cookie': cookie
          },
          redirect: 'manual',
          cf: { cacheTtl: 0 }
        });

        status = second.status;
        headers = Object.fromEntries(second.headers.entries());
        body = await second.text();
      } else {
        body = await first.text();
      }

      sourceStatus = status;
      rawHeaders = headers;
      rawBody = body;

    } catch (e) {
      rawBody = "FETCH ERROR: " + e.message;
    }

    if (url.pathname === "/debug" || url.searchParams.get("debug") === "1") {
      return new Response(JSON.stringify({
        sourceStatus,
        rawHeaders,
        bodyPreview: rawBody.slice(0, 3000)
      }, null, 2), {
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "Cache-Control": "no-cache"
        }
      });
    }

    const outHeaders = {
      "Content-Type": "application/json; charset=utf-8",
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "no-cache",
      "Profile-Title": "wlvpn",
      "announce": "🏳 wlvpn - стабильный VPN сервис."
    };

    const PASSTHROUGH = [
      "profile-update-interval",
      "profile-web-page-url",
      "support-url",
      "providerid",
      "subscription-userinfo",
      "hide-settings",
      "new-url"
    ];

    for (const name of PASSTHROUGH) {
      const v = rawHeaders[name];

      if (v) {
        const canon = name
          .split('-')
          .map(s => s[0].toUpperCase() + s.slice(1))
          .join('-');

        outHeaders[canon] = v;
      }
    }

    return new Response(rawBody, {
      headers: outHeaders
    });
  }
};