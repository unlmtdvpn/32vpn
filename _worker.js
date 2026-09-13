export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const TRAFFIC_SOURCE_URL = "https://sub.datanode-internal.net/McjAzVPB2VRYcM6z";
    const FAKE_UA = 'INCY/3.6.5/android';

    let sourceStatus = 0;
    let rawHeaders = {};
    let decodedBody = "";

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
          if (k.toLowerCase() === 'set-cookie') { cookie = v.split(';')[0]; break; }
        }
        const second = await fetch(TRAFFIC_SOURCE_URL, {
          headers: { 'User-Agent': FAKE_UA, 'Accept': '*/*', 'Cookie': cookie },
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

      // Декодируем base64
      try {
        const trimmed = body.trim();
        const padded = trimmed + "=".repeat((4 - trimmed.length % 4) % 4);
        const binary = atob(padded);
        const bytes = Uint8Array.from(binary, c => c.charCodeAt(0));
        decodedBody = new TextDecoder("utf-8").decode(bytes);
      } catch (e) {
        decodedBody = body;
      }

      // ---- МОДИФИКАЦИЯ СПИСКА ----
      let lines = decodedBody.split('\n').filter(l => l.trim().startsWith('vless://'));

      // Убрать Финляндию и Турцию
      lines = lines.filter(line =>
        !line.includes('fi.datanode-internal.net') &&
        !line.includes('tr.datanode-internal.net')
      );

      // Разделить обычные и мобильные
      const nonMobile = lines.filter(l => !l.includes('hole-nn.datanode-internal.net'));
      const mobileLines = lines.filter(l => l.includes('hole-nn.datanode-internal.net'));

      // Три уникальные копии мобильной
      if (mobileLines.length > 0) {
        const base = mobileLines[0].split('#')[0];

        const variants = [
          { remark: '🇫🇷 Мобильная связь #1', fp: 'chrome'  },
          { remark: '🇷🇺 Мобильная связь #2', fp: 'firefox' },
          { remark: '🇧🇾 Мобильная связь #3', fp: 'safari'  },
        ];

        const newMobile = variants.map(v => {
          let u = base;
          if (/[?&]fp=/.test(u)) {
            u = u.replace(/([?&])fp=[^&]*/, `$1fp=${v.fp}`);
          } else {
            u += (u.includes('?') ? '&' : '?') + `fp=${v.fp}`;
          }
          return u + '#' + encodeURIComponent(v.remark);
        });

        lines = [...nonMobile, ...newMobile];
      } else {
        lines = nonMobile;
      }

      decodedBody = lines.join('\n');
      // ---- /МОДИФИКАЦИЯ ----
    } catch (e) {
      decodedBody = "FETCH ERROR: " + e.message;
    }

    // /debug
    if (url.pathname === "/debug" || url.searchParams.get("debug") === "1") {
      return new Response(JSON.stringify({
        sourceStatus,
        rawHeaders,
        decodedBodyPreview: decodedBody
      }, null, 2), {
        headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-cache" }
      });
    }

    const outHeaders = {
      "Content-Type": "text/plain; charset=utf-8",
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
        const canon = name.split('-').map(s => s[0].toUpperCase() + s.slice(1)).join('-');
        outHeaders[canon] = v;
      }
    }

    return new Response(decodedBody, { headers: outHeaders });
  }
};