const SOURCE = "https://sub.datanode-internal.net/McjAzVPB2VRYcM6z";

const UAS = {
  happ: "Happ/4.3.0/Android/17877369741321921609",
  v2rayng: "v2rayNG/1.9.16",
  streak: "Streisand/1.4.2",
  browser: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  empty: ""
};

async function tryFetch(ua) {

  const headers = {
    "Accept": "*/*",
    "Accept-Language": "ru-RU,ru;q=0.9,en;q=0.8"
  };

  if (ua) headers["User-Agent"] = ua;

  try {

    const res = await fetch(SOURCE, {
      headers,
      redirect: "manual"
    });

    const location = res.headers.get("location") || "";
    const body = res.status >= 300 && res.status < 400 ? "" : await res.text();

    return {
      ua,
      status: res.status,
      location,
      bodyPreview: body.slice(0, 300),
      bodyLen: body.length
    };

  } catch (e) {

    return { ua, error: e.message || String(e) };

  }

}

export default {

  async fetch(request) {

    const url = new URL(request.url);

    // /debug — все варианты сразу
    if (url.pathname === "/debug") {

      const results = [];

      for (const [name, ua] of Object.entries(UAS)) {
        const r = await tryFetch(ua);
        results.push({ name, ...r });
      }

      return new Response(
        JSON.stringify(results, null, 2),
        { headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" } }
      );

    }

    // /ua/happ, /ua/v2rayng, /ua/browser и т.д.
    const m = url.pathname.match(/^\/ua\/([a-z0-9]+)$/);

    if (m) {

      const key = m[1];
      const ua = UAS[key];

      if (ua === undefined) {
        return new Response("Unknown UA: " + key, { status: 400 });
      }

      const r = await tryFetch(ua);

      return new Response(
        JSON.stringify(r, null, 2),
        { headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" } }
      );

    }

    // Обычный ответ
    const r = await tryFetch(UAS.happ);

    const body = r.bodyPreview && r.bodyLen > 300 ? r.bodyPreview + "..." : (r.bodyPreview || "");

    return new Response(
      JSON.stringify({ servers: [], message: r.error || r.location || (r.bodyLen ? "OK" : "Empty") }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "Access-Control-Allow-Origin": "*",
          "Cache-Control": "no-store"
        }
      }
    );

  }

};