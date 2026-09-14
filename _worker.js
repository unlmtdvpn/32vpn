// ========================================
// WLVPN SUBSCRIPTION WORKER
// ========================================


// ========================================
// НАСТРОЙКИ
// ========================================

const TRAFFIC_SOURCE_URL =
  "https://sub.datanode-internal.net/McjAzVPB2VRYcM6z";

const FAKE_UA =
  "INCY/3.6.5/android";


// ========================================
// ДАТА ОКОНЧАНИЯ
// 7 ОКТЯБРЯ 2026
// ========================================

const EXPIRE_TIMESTAMP =
  Math.floor(
    new Date(
      "2026-10-07T23:59:59Z"
    ).getTime() / 1000
  );


// ========================================
// ПРОВЕРКА VPN КЛИЕНТА
// ========================================

function isVpnClient(userAgent) {

  const ua =
    (userAgent || "")
      .toLowerCase();

  const clients = [

    "incy",

    "happ",

    "v2rayrun",

    "v2 ray run"

  ];

  return clients.some(
    client =>
      ua.includes(client)
  );

}


// ========================================
// ОБНОВЛЕНИЕ SUBSCRIPTION-USERINFO
// ========================================

function updateSubscriptionUserinfo(sourceUserinfo) {

  let upload = "0";

  let download = "0";

  let total = "0";


  if (sourceUserinfo) {

    const params =
      sourceUserinfo.split(";");


    for (
      const param
      of params
    ) {

      const parts =
        param
          .trim()
          .split("=");


      const key =
        parts[0]
          ?.trim()
          .toLowerCase();


      const value =
        parts
          .slice(1)
          .join("=")
          .trim();


      if (
        key === "upload"
      ) {

        upload =
          value || "0";

      }


      if (
        key === "download"
      ) {

        download =
          value || "0";

      }


      if (
        key === "total"
      ) {

        total =
          value || "0";

      }

    }

  }


  return (
    "upload=" +
    upload +

    "; download=" +
    download +

    "; total=" +
    total +

    "; expire=" +
    EXPIRE_TIMESTAMP
  );

}


// ========================================
// ПОЛУЧЕНИЕ ИСХОДНОЙ ПОДПИСКИ
// ========================================

async function getSourceSubscription() {

  let sourceStatus = 0;

  let rawHeaders = {};

  let rawBody = "";


  try {

    const first =
      await fetch(
        TRAFFIC_SOURCE_URL,
        {

          headers: {

            "User-Agent":
              FAKE_UA,

            "Accept":
              "*/*"

          },

          redirect:
            "manual",

          cf: {

            cacheTtl:
              0

          }

        }
      );


    let status =
      first.status;


    let headers =
      Object.fromEntries(
        first.headers.entries()
      );


    let body =
      "";


    // ========================================
    // ОБРАБОТКА REDIRECT
    // ========================================

    if (
      status >= 300 &&
      status < 400
    ) {

      const location =
        first.headers.get(
          "location"
        );


      let cookie =
        "";


      // Получаем cookie
      const setCookie =
        first.headers.get(
          "set-cookie"
        );


      if (setCookie) {

        cookie =
          setCookie
            .split(";")[0];

      }


      // Если есть Location — идём туда
      if (location) {

        const redirectUrl =
          new URL(
            location,
            TRAFFIC_SOURCE_URL
          ).toString();


        const second =
          await fetch(
            redirectUrl,
            {

              headers: {

                "User-Agent":
                  FAKE_UA,

                "Accept":
                  "*/*",

                ...(cookie
                  ? {
                      "Cookie":
                        cookie
                    }
                  : {})

              },

              redirect:
                "follow",

              cf: {

                cacheTtl:
                  0

              }

            }
          );


        status =
          second.status;


        headers =
          Object.fromEntries(
            second.headers.entries()
          );


        body =
          await second.text();

      }


      // Если Location нет
      else {

        const second =
          await fetch(
            TRAFFIC_SOURCE_URL,
            {

              headers: {

                "User-Agent":
                  FAKE_UA,

                "Accept":
                  "*/*",

                ...(cookie
                  ? {
                      "Cookie":
                        cookie
                    }
                  : {})

              },

              redirect:
                "follow",

              cf: {

                cacheTtl:
                  0

              }

            }
          );


        status =
          second.status;


        headers =
          Object.fromEntries(
            second.headers.entries()
          );


        body =
          await second.text();

      }

    }


    // ========================================
    // БЕЗ REDIRECT
    // ========================================

    else {

      body =
        await first.text();

    }


    sourceStatus =
      status;


    rawHeaders =
      headers;


    rawBody =
      body;

  }


  catch (error) {

    sourceStatus =
      502;


    rawBody =
      "FETCH ERROR: " +
      error.message;

  }


  return {

    sourceStatus,

    rawHeaders,

    rawBody

  };

}


// ========================================
// ВЕБ-СТРАНИЦА
// ========================================

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

<style>

* {
  box-sizing: border-box;
}

body {

  margin: 0;

  min-height: 100vh;

  font-family:
    Arial,
    sans-serif;

  background:
    linear-gradient(
      135deg,
      #090d18,
      #121a31
    );

  color:
    white;

}

header {

  padding:
    24px;

  display:
    flex;

  justify-content:
    center;

}

.logo {

  font-size:
    28px;

  font-weight:
    bold;

  letter-spacing:
    1px;

}

main {

  min-height:
    calc(100vh - 160px);

  display:
    flex;

  flex-direction:
    column;

  align-items:
    center;

  justify-content:
    center;

  text-align:
    center;

  padding:
    30px;

}

.badge {

  padding:
    8px 16px;

  border-radius:
    30px;

  background:
    rgba(
      91,
      124,
      255,
      .15
    );

  color:
    #9db0ff;

  margin-bottom:
    20px;

}

h1 {

  margin:
    0;

  font-size:
    clamp(
      42px,
      10vw,
      80px
    );

}

.description {

  max-width:
    600px;

  color:
    #9ca6bd;

  font-size:
    18px;

  line-height:
    1.6;

  margin-top:
    20px;

}

.info {

  margin-top:
    30px;

  display:
    flex;

  gap:
    15px;

  flex-wrap:
    wrap;

  justify-content:
    center;

}

.card {

  background:
    rgba(
      255,
      255,
      255,
      .05
    );

  border:
    1px solid
    rgba(
      255,
      255,
      255,
      .08
    );

  border-radius:
    16px;

  padding:
    20px;

  min-width:
    180px;

}

.card-title {

  color:
    #8490aa;

  font-size:
    14px;

}

.card-value {

  margin-top:
    8px;

  font-size:
    17px;

  font-weight:
    bold;

}

.telegram {

  margin-top:
    35px;

  padding:
    15px 28px;

  border-radius:
    12px;

  text-decoration:
    none;

  color:
    white;

  background:
    #5b7cff;

  font-weight:
    bold;

}

footer {

  text-align:
    center;

  padding:
    25px;

  color:
    #667085;

}

</style>

</head>

<body>

<header>

<div class="logo">

🏳 WLVPN

</div>

</header>


<main>

<div class="badge">

СТАБИЛЬНЫЙ VPN СЕРВИС

</div>


<h1>

WLVPN

</h1>


<div class="description">

Быстрый, удобный и стабильный VPN сервис.
Используйте официальное приложение для подключения к WLVPN.

</div>


<div class="info">


<div class="card">

<div class="card-title">

Сервис

</div>

<div class="card-value">

🟢 Онлайн

</div>

</div>


<div class="card">

<div class="card-title">

Подписка

</div>

<div class="card-value">

До 7 октября 2026

</div>

</div>


<div class="card">

<div class="card-title">

Обновление

</div>

<div class="card-value">

Автоматическое

</div>

</div>


</div>


<a
  class="telegram"
  href="https://t.me/snokuy"
  target="_blank"
>

Telegram @snokuy

</a>


</main>


<footer>

© WLVPN

</footer>


</body>

</html>`;

}


// ========================================
// MAIN WORKER
// ========================================

export default {

  async fetch(
    request,
    env,
    ctx
  ) {

    const url =
      new URL(
        request.url
      );


    const userAgent =
      request.headers.get(
        "User-Agent"
      ) || "";


    // ========================================
    // DEBUG
    // ========================================

    if (
      url.pathname ===
      "/debug"
    ) {

      const source =
        await getSourceSubscription();


      return new Response(
        JSON.stringify(
          {

            worker:
              "WLVPN",

            userAgent,

            isVpnClient:
              isVpnClient(
                userAgent
              ),

            sourceStatus:
              source.sourceStatus,

            rawHeaders:
              source.rawHeaders,

            subscriptionUserinfo:
              updateSubscriptionUserinfo(
                source.rawHeaders[
                  "subscription-userinfo"
                ]
              ),

            bodyPreview:
              source.rawBody.slice(
                0,
                3000
              )

          },
          null,
          2
        ),

        {

          headers: {

            "Content-Type":
              "application/json; charset=utf-8",

            "Cache-Control":
              "no-cache"

          }

        }
      );

    }


    // ========================================
    // ЕСЛИ НЕ VPN КЛИЕНТ
    // ========================================

    if (
      !isVpnClient(
        userAgent
      )
    ) {

      return new Response(
        getWebsite(),
        {

          headers: {

            "Content-Type":
              "text/html; charset=utf-8",

            "Cache-Control":
              "no-cache"

          }

        }
      );

    }


    // ========================================
    // ПОЛУЧАЕМ ПОДПИСКУ
    // ========================================

    const source =
      await getSourceSubscription();


    // ========================================
    // ЕСЛИ ИСТОЧНИК НЕ РАБОТАЕТ
    // ========================================

    if (
      !source.rawBody ||
      source.sourceStatus >= 400
    ) {

      return new Response(
        source.rawBody ||
        "Subscription source error",
        {

          status:
            source.sourceStatus ||
            502,

          headers: {

            "Content-Type":
              "text/plain; charset=utf-8",

            "Cache-Control":
              "no-cache"

          }

        }
      );

    }


    // ========================================
    // HEADERS ПОДПИСКИ
    // ========================================

    const outHeaders = {

      "Content-Type":
        "application/json; charset=utf-8",

      "Access-Control-Allow-Origin":
        "*",

      "Cache-Control":
        "no-cache",

      "Profile-Title":
        "wlvpn",

      "Profile-Update-Interval":
        "6",

      // ТРАФИК ИЗ ИСТОЧНИКА
      // ДАТА ДО 7 ОКТЯБРЯ 2026

      "Subscription-Userinfo":
        updateSubscriptionUserinfo(
          source.rawHeaders[
            "subscription-userinfo"
          ]
        ),

      "announce":
        "🏳 wlvpn | Стабильный VPN Сервис 🚀"

    };


    // ========================================
    // ДОПОЛНИТЕЛЬНЫЕ HEADERS ИЗ ИСТОЧНИКА
    // ========================================

    const PASSTHROUGH = [

      "profile-web-page-url",

      "support-url",

      "providerid",

      "hide-settings",

      "new-url"

    ];


    for (
      const name
      of PASSTHROUGH
    ) {

      const value =
        source.rawHeaders[
          name
        ];


      if (value) {

        const canonicalName =
          name
            .split("-")
            .map(
              part =>
                part.charAt(0)
                  .toUpperCase() +
                part.slice(1)
            )
            .join("-");


        outHeaders[
          canonicalName
        ] =
          value;

      }

    }


    // ========================================
    // ОТДАЁМ ПОДПИСКУ VPN КЛИЕНТУ
    // ========================================

    return new Response(
      source.rawBody,
      {

        status:
          source.sourceStatus,

        headers:
          outHeaders

      }
    );

  }

};