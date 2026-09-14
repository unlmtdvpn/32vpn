const SOURCE = "https://sub.datanode-internal.net/McjAzVPB2VRYcM6z";

const UA = "Happ/4.3.0/Android/17877369741321921609";

export default {

  async fetch(request) {

    const url = new URL(request.url);

    const res = await fetch(SOURCE, {
      headers: { "User-Agent": UA },
      redirect: "follow"
    });

    const body = await res.text();

    if (url.pathname === "/debug") {
      return new Response(
        JSON.stringify({
          status: res.status,
          headers: Object.fromEntries(res.headers.entries()),
          body
        }, null, 2),
        { headers: { "Content-Type": "application/json; charset=utf-8" } }
      );
    }

    return new Response(body, {
      status: 200,
      headers: {
        "Content-Type": res.headers.get("content-type") || "text/plain; charset=utf-8",
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "no-store",
        "Subscription-Userinfo": res.headers.get("subscription-userinfo") || "",
        "Profile-Title": "wlvpn",
        "Profile-Update-Interval": "6"
      }
    });

  }

};