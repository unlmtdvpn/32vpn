export default {
  async fetch(request, env, ctx) {

    const url = new URL(request.url);

    // ========================================
    // ИСХОДНАЯ ПОДПИСКА
    // ========================================

    const TRAFFIC_SOURCE_URL =
      "https://sub.datanode-internal.net/McjAzVPB2VRYcM6z";

    const FAKE_UA =
      "INCY/3.6.5/android";


    // ========================================
    // СРОК ДЕЙСТВИЯ
    // До 7 октября 2026
    // ========================================

    const EXPIRES_AT =
      new Date(
        "2026-10-07T23:59:59Z"
      ).getTime();


    // ========================================
    // ПРОВЕРКА СРОКА
    // ========================================

    if (Date.now() > EXPIRES_AT) {

      return new Response(
        JSON.stringify({
          message: "Подписка истекла 🚫"
        }),
        {
          status: 200,

          headers: {
            "Content-Type":
              "application/json; charset=utf-8",

            "Cache-Control":
              "no-cache",

            "Profile-Title":
              "Подписка истекла 🚫"
          }
        }
      );

    }


    // ========================================
    // ПОЛУЧЕНИЕ ИСХОДНОЙ ПОДПИСКИ
    // ========================================

    let sourceStatus = 0;

    let rawHeaders = {};

    let rawBody = "";


    try {

      // ========================================
      // ПЕРВЫЙ ЗАПРОС
      // ========================================

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
      // REDIRECT
      // ========================================

      if (
        status >= 300 &&
        status < 400
      ) {

        let cookie =
          "";


        for (
          const [key, value]
          of Object.entries(headers)
        ) {

          if (
            key.toLowerCase() ===
            "set-cookie"
          ) {

            cookie =
              value
                .split(";")[0];

            break;

          }

        }


        // ========================================
        // ВТОРОЙ ЗАПРОС
        // ========================================

        const second =
          await fetch(
            TRAFFIC_SOURCE_URL,
            {

              headers: {

                "User-Agent":
                  FAKE_UA,

                "Accept":
                  "*/*",

                "Cookie":
                  cookie

              },

              redirect:
                "manual",

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


      // ========================================
      // БЕЗ REDIRECT
      // ========================================

      else {

        body =
          await first.text();

      }


      // ========================================
      // СОХРАНЕНИЕ
      // ========================================

      sourceStatus =
        status;


      rawHeaders =
        headers;


      rawBody =
        body;

    }


    // ========================================
    // ОШИБКА FETCH
    // ========================================

    catch (error) {

      rawBody =
        "FETCH ERROR: " +
        error.message;

    }


    // ========================================
    // DEBUG
    // ========================================

    if (
      url.pathname === "/debug" ||
      url.searchParams.get("debug") === "1"
    ) {

      return new Response(
        JSON.stringify(
          {

            worker:
              "WLVPN",

            expiresAt:
              new Date(
                EXPIRES_AT
              ).toISOString(),

            expired:
              Date.now() > EXPIRES_AT,

            sourceStatus:
              sourceStatus,

            rawHeaders:
              rawHeaders,

            bodyPreview:
              rawBody.slice(
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
    // RESPONSE HEADERS
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

      "announce":
        "🏳 WLVPN - стабильный VPN сервис."

    };


    // ========================================
    // ПЕРЕДАВАЕМЫЕ HEADERS
    // ========================================

    const PASSTHROUGH = [

      "profile-update-interval",

      "profile-web-page-url",

      "support-url",

      "providerid",

      "subscription-userinfo",

      "hide-settings",

      "new-url"

    ];


    // ========================================
    // КОПИРОВАНИЕ HEADERS
    // ========================================

    for (
      const name
      of PASSTHROUGH
    ) {

      const value =
        rawHeaders[name];


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
    // ОТВЕТ ПОДПИСКИ
    // ========================================

    return new Response(
      rawBody,
      {

        status:
          sourceStatus || 200,

        headers:
          outHeaders

      }
    );

  }
};