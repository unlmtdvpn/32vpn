export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    const TRAFFIC_SOURCE_URL = "https://sub.datanode-internal.net/McjAzVPB2VRYcM6z";
    const FAKE_UA = "INCY/3.6.5/android";

    const userAgent = request.headers.get("User-Agent") || "";
    const ua = userAgent.toLowerCase();

    // =========================
    // ОПРЕДЕЛЕНИЕ VPN КЛИЕНТОВ
    // =========================

    const VPN_CLIENTS = [
      "incy",
      "happ",
      "happ proxy",
      "v2raytun",
      "v2rayng",
      "v2rayn",
      "nekobox",
      "nekoray",
      "sing-box",
      "singbox",
      "shadowrocket",
      "streisand",
      "clash",
      "clashmeta",
      "clash verge",
      "surfboard",
      "karing"
    ];

    const isVpnClient = VPN_CLIENTS.some(client => ua.includes(client));

    // =========================
    // ЗАГРУЗКА ПОДПИСКИ
    // =========================

    let sourceStatus = 0;
    let rawHeaders = {};
    let rawBody = "";

    try {
      const first = await fetch(TRAFFIC_SOURCE_URL, {
        headers: {
          "User-Agent": FAKE_UA,
          "Accept": "*/*"
        },
        redirect: "manual",
        cf: {
          cacheTtl: 0
        }
      });

      let status = first.status;
      let headers = Object.fromEntries(first.headers.entries());
      let body = "";

      // =========================
      // ОБРАБОТКА REDIRECT
      // =========================

      if (status >= 300 && status < 400) {
        let cookie = "";

        for (const [key, value] of Object.entries(headers)) {
          if (key.toLowerCase() === "set-cookie") {
            cookie = value.split(";")[0];
            break;
          }
        }

        const second = await fetch(TRAFFIC_SOURCE_URL, {
          headers: {
            "User-Agent": FAKE_UA,
            "Accept": "*/*",
            "Cookie": cookie
          },
          redirect: "manual",
          cf: {
            cacheTtl: 0
          }
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

    } catch (error) {
      rawBody = "FETCH ERROR: " + error.message;
    }

    // =========================
    // DEBUG
    // =========================

    if (
      url.pathname === "/debug" ||
      url.searchParams.get("debug") === "1"
    ) {
      return new Response(
        JSON.stringify({
          sourceStatus,
          userAgent,
          isVpnClient,
          rawHeaders,
          bodyPreview: rawBody.slice(0, 3000)
        }, null, 2),
        {
          headers: {
            "Content-Type": "application/json; charset=utf-8",
            "Cache-Control": "no-cache"
          }
        }
      );
    }

    // =========================
    // ЕСЛИ ЭТО ОБЫЧНЫЙ БРАУЗЕР
    // =========================

    if (!isVpnClient) {
      return new Response(getWebsite(), {
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          "Cache-Control": "no-cache"
        }
      });
    }

    // =========================
    // VPN ПОДПИСКА
    // =========================

    const outHeaders = {
      "Content-Type": "application/json; charset=utf-8",
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "no-cache",

      "Profile-Title": "wlvpn",
      "announce": "🏳 WLVPN - стабильный VPN сервис.",

      "Profile-Update-Interval": "6"
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
      const value = rawHeaders[name];

      if (value) {
        const canon = name
          .split("-")
          .map(word =>
            word.charAt(0).toUpperCase() + word.slice(1)
          )
          .join("-");

        outHeaders[canon] = value;
      }
    }

    return new Response(rawBody, {
      status: sourceStatus || 200,
      headers: outHeaders
    });
  }
};


// =========================
// WEB INTERFACE
// =========================

function getWebsite() {

  return `<!DOCTYPE html>

<html lang="ru">

<head>

<meta charset="UTF-8">

<meta
name="viewport"
content="width=device-width, initial-scale=1.0"
>

<title>WLVPN — Стабильный VPN</title>

<meta
name="description"
content="WLVPN — быстрый и стабильный VPN сервис"
/>

<style>

* {
  box-sizing: border-box;
}

body {

  margin: 0;

  min-height: 100vh;

  font-family:
    Arial,
    Helvetica,
    sans-serif;

  background:

    radial-gradient(
      circle at top,
      #182b4d,
      #080d18 60%
    );

  color: white;

}


/* HEADER */

header {

  width: 100%;

  padding:

    25px
    7%;

  display: flex;

  align-items: center;

  justify-content: space-between;

}


.logo {

  font-size: 24px;

  font-weight: bold;

  letter-spacing: 1px;

}


.status {

  display: flex;

  align-items: center;

  gap: 8px;

  color: #a8b3c7;

  font-size: 14px;

}


.dot {

  width: 10px;

  height: 10px;

  border-radius: 50%;

  background: #35e67b;

  box-shadow:

    0 0 10px
    #35e67b;

}


/* MAIN */

main {

  max-width: 1000px;

  margin: auto;

  padding:

    60px
    20px;

  text-align: center;

}


h1 {

  font-size: 55px;

  margin-bottom: 15px;

}


.subtitle {

  color: #aab5c8;

  font-size: 19px;

  line-height: 1.6;

  max-width: 650px;

  margin:

    auto
    auto
    45px;

}


/* CARDS */

.cards {

  display: grid;

  grid-template-columns:

    repeat(
      auto-fit,
      minmax(220px, 1fr)
    );

  gap: 20px;

  margin-top: 30px;

}


.card {

  background:

    rgba(
      255,
      255,
      255,
      0.06
    );

  border:

    1px solid
    rgba(
      255,
      255,
      255,
      0.1
    );

  border-radius: 18px;

  padding: 30px;

  backdrop-filter:

    blur(10px);

}


.card h2 {

  margin-top: 0;

}


.card p {

  color: #aab5c8;

  line-height: 1.5;

}


/* BUTTON */

.button {

  display: inline-block;

  margin-top: 35px;

  padding:

    16px
    35px;

  border-radius: 12px;

  background:

    linear-gradient(
      135deg,
      #4f8cff,
      #6c5cff
    );

  color: white;

  text-decoration: none;

  font-weight: bold;

  transition: .2s;

}


.button:hover {

  transform:

    translateY(-2px);

  box-shadow:

    0 10px 30px
    rgba(
      79,
      140,
      255,
      .35
    );

}


/* PING */

.ping {

  margin-top: 45px;

  padding: 20px;

  border-radius: 15px;

  background:

    rgba(
      0,
      0,
      0,
      .25
    );

}


.ping-value {

  font-size: 32px;

  font-weight: bold;

  color: #35e67b;

}


/* FOOTER */

footer {

  text-align: center;

  padding: 30px;

  color: #6f7b8d;

}


@media
(max-width: 600px) {

  h1 {

    font-size: 38px;

  }

  main {

    padding-top: 30px;

  }

}

</style>

</head>


<body>


<header>

<div class="logo">

🏳 WLVPN

</div>


<div class="status">

<div class="dot"></div>

Сервисы онлайн

</div>

</header>


<main>


<h1>

Быстрый VPN<br>

без лишнего

</h1>


<div class="subtitle">

WLVPN — стабильное подключение,
быстрые серверы и современная
инфраструктура.

</div>


<a
class="button"
href="https://t.me/snokuy"
target="_blank"
>

Написать в Telegram

</a>


<div class="cards">


<div class="card">

<h2>

⚡ Быстро

</h2>

<p>

Высокая скорость подключения
и оптимизированные серверы.

</p>

</div>


<div class="card">

<h2>

🛡 Безопасно

</h2>

<p>

Современные VPN протоколы
для безопасного подключения.

</p>

</div>


<div class="card">

<h2>

🌍 Доступно

</h2>

<p>

Работает на Android,
iOS, Windows и других устройствах.

</p>

</div>


</div>


<div class="ping">

<div>

Статус серверов

</div>

<br>

<div
class="ping-value"
id="ping"
>

Проверка...

</div>

</div>


</main>


<footer>

© WLVPN

</footer>


<script>

async function checkStatus() {

  const ping =
    document.getElementById("ping");

  const start =
    performance.now();

  try {

    await fetch(
      "/?status=" +
      Date.now(),
      {
        method: "HEAD"
      }
    );

    const time =
      Math.round(
        performance.now() -
        start
      );

    ping.innerText =
      time + " ms";

  }

  catch {

    ping.innerText =
      "Ошибка";

  }

}


checkStatus();


setInterval(
  checkStatus,
  10000
);

</script>


</body>

</html>`;
}