// ================================================
// WLVPN
// Cloudflare Worker + KV
// ================================================


// ================================================
// НАСТРОЙКИ
// ================================================

const TRAFFIC_SOURCE_URL =
  "https://sub.datanode-internal.net/McjAzVPB2VRYcM6z";

const FAKE_UA =
  "INCY/3.6.5/android";


// ================================================
// ГЕНЕРАЦИЯ ID
// ================================================

function generateId() {

  return crypto.randomUUID();

}


// ================================================
// ГЕНЕРАЦИЯ TOKEN
// ================================================

function generateToken() {

  const bytes =
    new Uint8Array(32);

  crypto.getRandomValues(bytes);

  return Array.from(bytes)
    .map(
      byte =>
        byte
          .toString(16)
          .padStart(2, "0")
    )
    .join("");

}


// ================================================
// ПОЛУЧИТЬ ПОДПИСКИ ИЗ KV
// ================================================

async function getSubscriptions(env) {

  try {

    const data =
      await env.KV.get(
        "subscriptions"
      );

    if (!data) {

      return [];

    }

    return JSON.parse(data);

  } catch {

    return [];

  }

}


// ================================================
// СОХРАНИТЬ ПОДПИСКИ В KV
// ================================================

async function saveSubscriptions(
  env,
  subscriptions
) {

  await env.KV.put(
    "subscriptions",
    JSON.stringify(subscriptions)
  );

}


// ================================================
// ПОЛУЧИТЬ HEADER
// ================================================

function getHeader(
  headers,
  name
) {

  const target =
    name.toLowerCase();

  for (
    const [key, value]
    of Object.entries(headers)
  ) {

    if (
      key.toLowerCase() ===
      target
    ) {

      return value;

    }

  }

  return null;

}


// ================================================
// VPN CLIENT?
// ================================================

function isVpnClient(userAgent) {

  const ua =
    String(
      userAgent || ""
    ).toLowerCase();

  const clients = [

    "incy",

    "happ",

    "happ-proxy",

    "v2raytun",

    "v2rayng",

    "v2ray",

    "sing-box",

    "singbox",

    "clash",

    "mihomo",

    "nekobox",

    "nekoray",

    "shadowrocket",

    "streisand",

    "hiddify",

    "surfboard",

    "loon",

    "quantumult",

    "kitsunebi",

    "karing"

  ];

  return clients.some(
    client =>
      ua.includes(client)
  );

}


// ================================================
// ПОЛУЧИТЬ ИСТОЧНИК ПОДПИСКИ
// ================================================

async function getSourceSubscription() {

  const attempts = [

    {

      headers: {

        "User-Agent":
          FAKE_UA,

        "Accept":
          "application/json, text/plain, */*",

        "Accept-Language":
          "ru-RU,ru;q=0.9,en;q=0.8"

      }

    },

    {

      headers: {

        "User-Agent":
          FAKE_UA

      }

    }

  ];


  let lastError =
    "";


  for (
    const attempt
    of attempts
  ) {

    let currentUrl =
      TRAFFIC_SOURCE_URL;


    const visitedUrls =
      new Set();


    // ============================================
    // МАКСИМУМ 5 REDIRECT
    // ============================================

    for (
      let redirectCount = 0;
      redirectCount < 5;
      redirectCount++
    ) {

      try {

        // ==========================================
        // ЗАЩИТА ОТ ЦИКЛА
        // ==========================================

        if (
          visitedUrls.has(
            currentUrl
          )
        ) {

          lastError =
            "Обнаружен цикл редиректов";

          break;

        }


        visitedUrls.add(
          currentUrl
        );


        // ==========================================
        // FETCH
        // ==========================================

        const response =
          await fetch(
            currentUrl,
            {

              method:
                "GET",

              headers:
                attempt.headers,

              redirect:
                "manual"

            }
          );


        const rawHeaders =
          Object.fromEntries(
            response.headers.entries()
          );


        // ==========================================
        // REDIRECT
        // ==========================================

        if (
          response.status >= 300 &&
          response.status < 400
        ) {

          const location =
            response.headers.get(
              "Location"
            );


          if (!location) {

            lastError =
              "Redirect без Location";

            break;

          }


          try {

            currentUrl =
              new URL(
                location,
                currentUrl
              ).toString();

            continue;

          } catch {

            lastError =
              "Некорректный URL redirect";

            break;

          }

        }


        // ==========================================
        // ЧИТАЕМ BODY
        // ==========================================

        const rawBody =
          await response.text();


        // ==========================================
        // ЕСТЬ ТЕЛО
        // ==========================================

        if (
          rawBody &&
          rawBody.trim()
        ) {

          return {

            sourceStatus:
              response.status,

            rawHeaders,

            rawBody,

            errorMessage:
              ""

          };

        }


        // ==========================================
        // ПУСТОЙ ОТВЕТ
        // ==========================================

        lastError =
          "Источник вернул пустой ответ";

        break;


      } catch (error) {

        lastError =
          error.message ||
          String(error);

        break;

      }

    }

  }


  // ============================================
  // ВСЕ ПОПЫТКИ НЕУДАЧНЫ
  // ============================================

  return {

    sourceStatus:
      0,

    rawHeaders:
      {},

    rawBody:
      "",

    errorMessage:
      lastError ||
      "Не удалось получить подписку"

  };

}


// ================================================
// ПАРСИНГ JSON ПОДПИСКИ
// ================================================

function parseSubscription(body) {

  try {

    return JSON.parse(body);

  } catch {

    return null;

  }

}


// ================================================
// СОЗДАТЬ ОТКЛЮЧЕННУЮ ПОДПИСКУ
// ================================================

function createDisabledSubscription(
  sourceBody
) {

  const data =
    parseSubscription(
      sourceBody
    );


  if (
    data &&
    Array.isArray(data.servers) &&
    data.servers.length > 0
  ) {

    const server =
      JSON.parse(
        JSON.stringify(
          data.servers[0]
        )
      );


    server.name =
      "Subscription disabled";

    server.remark =
      "Subscription disabled";

    server.ps =
      "Subscription disabled";


    return JSON.stringify(
      {

        ...data,

        servers: [
          server
        ],

        message:
          "Subscription disabled"

      }
    );

  }


  return JSON.stringify(
    {

      servers: [],

      message:
        "Subscription disabled"

    }
  );

}


// ================================================
// TRAFFIC
// ================================================

function updateSubscriptionUserinfo(
  sourceUserinfo
) {

  let upload =
    "0";

  let download =
    "0";

  let total =
    "0";

  let expire =
    "";


  if (sourceUserinfo) {

    const params =
      sourceUserinfo.split(
        ";"
      );


    for (
      const param
      of params
    ) {

      const index =
        param.indexOf(
          "="
        );


      if (
        index === -1
      ) {

        continue;

      }


      const key =
        param
          .slice(
            0,
            index
          )
          .trim()
          .toLowerCase();


      const value =
        param
          .slice(
            index + 1
          )
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


      if (
        key === "expire"
      ) {

        expire =
          value || "";

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

    (
      expire
        ? "; expire=" +
          expire
        : ""
    )
  );

}


// ================================================
// ESCAPE HTML
// ================================================

function escapeHtml(text) {

  return String(
    text || ""
  )

    .replace(
      /&/g,
      "&amp;"
    )

    .replace(
      /</g,
      "&lt;"
    )

    .replace(
      />/g,
      "&gt;"
    )

    .replace(
      /"/g,
      "&quot;"
    )

    .replace(
      /'/g,
      "&#039;"
    );

}


// ================================================
// ГЛАВНАЯ СТРАНИЦА
// ================================================

function getWebsite() {

  return `<!DOCTYPE html>

<html lang="ru">

<head>

<meta charset="UTF-8">

<meta
name="viewport"
content="width=device-width, initial-scale=1.0"
>

<title>wlvpn</title>

<style>

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  min-height: 100vh;
  font-family: Arial, sans-serif;
  background: #090909;
  color: white;
}

header {
  display: flex;
  justify-content: space-between;
  padding: 24px 7%;
}

.logo {
  font-size: 21px;
  font-weight: bold;
}

.admin {
  color: white;
  text-decoration: none;
}

main {
  min-height: 75vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 40px 20px;
}

h1 {
  font-size: 90px;
  margin: 0;
}

.subtitle {
  color: #999;
  max-width: 600px;
}

.buttons {
  display: flex;
  gap: 12px;
  margin-top: 30px;
}

.button {
  padding: 15px 25px;
  border-radius: 15px;
  text-decoration: none;
}

.primary {
  background: white;
  color: black;
}

.secondary {
  color: white;
  border: 1px solid #444;
}

footer {
  display: flex;
  justify-content: space-between;
  padding: 25px 7%;
  color: #777;
}

</style>

</head>

<body>

<header>

<div class="logo">

wlvpn

</div>

<a
class="admin"
href="/admin"
>

Админ

</a>

</header>

<main>

<h1>

wlvpn

</h1>

<p class="subtitle">

Быстрый, простой и современный VPN.
Подключайся и оставайся онлайн.

</p>

<div class="buttons">

<a
class="button primary"
href="https://t.me/snokyu"
target="_blank"
>

Telegram

</a>

<a
class="button secondary"
href="https://t.me/snokyu"
target="_blank"
>

@snokyu

</a>

</div>

</main>

<footer>

<div>

© 2026 wlvpn

</div>

<a
href="https://t.me/snokyu"
target="_blank"
>

@snokyu

</a>

</footer>

</body>

</html>`;

}


// ================================================
// АДМИН ПАНЕЛЬ
// ================================================

function getAdminPage() {

  return `<!DOCTYPE html>

<html lang="ru">

<head>

<meta charset="UTF-8">

<meta
name="viewport"
content="width=device-width, initial-scale=1.0"
>

<title>wlvpn admin</title>

<style>

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  min-height: 100vh;
  background: #090909;
  color: white;
  font-family: Arial, sans-serif;
}

.container {
  max-width: 900px;
  margin: auto;
  padding: 30px 20px;
}

.header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 40px;
}

.back {
  color: #888;
  text-decoration: none;
}

.create {
  display: flex;
  gap: 10px;
  margin-bottom: 30px;
}

input {
  width: 100%;
  padding: 15px;
  background: #151515;
  color: white;
  border: 1px solid #292929;
  border-radius: 14px;
}

button {
  padding: 13px 18px;
  border: none;
  border-radius: 13px;
  background: white;
  color: black;
  cursor: pointer;
}

.list {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.item {
  padding: 22px;
  border: 1px solid #242424;
  border-radius: 20px;
  background: #111;
}

.name {
  font-size: 20px;
  font-weight: bold;
}

.status {
  margin-top: 10px;
  color: #999;
}

.link {
  margin-top: 14px;
  padding: 12px;
  background: #090909;
  border-radius: 10px;
  color: #777;
  word-break: break-all;
}

.actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 15px;
}

.disabled {
  opacity: .5;
}

</style>

</head>

<body>

<div class="container">

<div class="header">

<h1>wlvpn admin</h1>

<a
class="back"
href="/"
>

← Сайт

</a>

</div>

<div class="create">

<input
id="name"
placeholder="Название подписки"
>

<button
onclick="createSub()"
>

Создать

</button>

</div>

<div
id="list"
class="list"
>

Загрузка...

</div>

</div>

<script>

async function api(
  path,
  options = {}
) {

  const response =
    await fetch(
      path,
      options
    );

  return response.json();

}


async function load() {

  const data =
    await api(
      "/api/subscriptions"
    );


  const list =
    document.getElementById(
      "list"
    );


  list.innerHTML =
    "";


  if (!data.length) {

    list.innerHTML =
      "<p>Подписок пока нет</p>";

    return;

  }


  data.forEach(
    sub => {

      const div =
        document.createElement(
          "div"
        );


      div.className =
        "item " +
        (
          sub.enabled
            ? ""
            : "disabled"
        );


      const link =
        location.origin +
        "/sub/" +
        sub.token;


      div.innerHTML =

        '<div class="name">' +
        escapeHtml(sub.name) +
        '</div>' +

        '<div class="status">' +

        (
          sub.enabled
            ? "🟢 Активна"
            : "🔴 Отключена"
        ) +

        '</div>' +

        '<div class="link">' +
        link +
        '</div>' +

        '<div class="actions">' +

        '<button class="copy">Копировать</button>' +

        '<button class="rename">Название</button>' +

        '<button class="toggle">' +

        (
          sub.enabled
            ? "Отключить"
            : "Включить"
        ) +

        '</button>' +

        '<button class="delete">Удалить</button>' +

        '</div>';


      div
        .querySelector(".copy")
        .onclick =
          () =>
            copyLink(
              sub.token
            );


      div
        .querySelector(".rename")
        .onclick =
          () =>
            renameSub(
              sub.id
            );


      div
        .querySelector(".toggle")
        .onclick =
          () =>
            toggleSub(
              sub.id
            );


      div
        .querySelector(".delete")
        .onclick =
          () =>
            deleteSub(
              sub.id
            );


      list.appendChild(
        div
      );

    }
  );

}


async function createSub() {

  const input =
    document.getElementById(
      "name"
    );


  const name =
    input.value.trim();


  if (!name) {

    alert(
      "Введите название"
    );

    return;

  }


  await api(
    "/api/subscriptions",
    {

      method:
        "POST",

      headers: {

        "Content-Type":
          "application/json"

      },

      body:
        JSON.stringify(
          {
            name
          }
        )

    }
  );


  input.value =
    "";


  load();

}


async function copyLink(token) {

  const link =
    location.origin +
    "/sub/" +
    token;


  try {

    await navigator
      .clipboard
      .writeText(link);


    alert(
      "Ссылка скопирована"
    );

  } catch {

    prompt(
      "Скопируйте ссылку",
      link
    );

  }

}


async function renameSub(id) {

  const name =
    prompt(
      "Новое название"
    );


  if (!name) {

    return;

  }


  await api(
    "/api/subscriptions/" +
    id,
    {

      method:
        "PUT",

      headers: {

        "Content-Type":
          "application/json"

      },

      body:
        JSON.stringify(
          {
            name
          }
        )

    }
  );


  load();

}


async function toggleSub(id) {

  await api(
    "/api/subscriptions/" +
    id +
    "/toggle",
    {

      method:
        "POST"

    }
  );


  load();

}


async function deleteSub(id) {

  if (
    !confirm(
      "Удалить подписку?"
    )
  ) {

    return;

  }


  await api(
    "/api/subscriptions/" +
    id,
    {

      method:
        "DELETE"

    }
  );


  load();

}


function escapeHtml(text) {

  const div =
    document.createElement(
      "div"
    );

  div.textContent =
    text;

  return div.innerHTML;

}


load();

</script>

</body>

</html>`;

}


// ================================================
// СТРАНИЦА ПОДПИСКИ
// ================================================

function getSubscriptionPage(sub) {

  const status =
    sub.enabled
      ? "Активна"
      : "Отключена";


  const icon =
    sub.enabled
      ? "🟢"
      : "🔴";


  return `<!DOCTYPE html>

<html lang="ru">

<head>

<meta charset="UTF-8">

<meta
name="viewport"
content="width=device-width, initial-scale=1.0"
>

<title>wlvpn</title>

<style>

body {
  margin: 0;
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #090909;
  color: white;
  font-family: Arial, sans-serif;
}

.card {
  width: 90%;
  max-width: 500px;
  padding: 40px;
  text-align: center;
  border: 1px solid #222;
  border-radius: 25px;
  background: #111;
}

.name {
  margin-top: 30px;
  font-size: 25px;
}

.status {
  margin-top: 15px;
  color: #aaa;
}

</style>

</head>

<body>

<div class="card">

<h1>

wlvpn

</h1>

<div class="name">

${escapeHtml(sub.name)}

</div>

<div class="status">

${icon} ${status}

</div>

</div>

</body>

</html>`;

}


// ================================================
// MAIN WORKER
// ================================================

export default {

  async fetch(
    request,
    env
  ) {

    const url =
      new URL(
        request.url
      );


    const userAgent =
      request.headers.get(
        "User-Agent"
      ) || "";


    // ============================================
    // ADMIN
    // ============================================

    if (
      url.pathname ===
      "/admin"
    ) {

      return new Response(
        getAdminPage(),
        {

          headers: {

            "Content-Type":
              "text/html; charset=utf-8"

          }

        }
      );

    }


    // ============================================
    // API GET
    // ============================================

    if (
      url.pathname ===
      "/api/subscriptions" &&
      request.method ===
      "GET"
    ) {

      return Response.json(
        await getSubscriptions(env)
      );

    }


    // ============================================
    // API CREATE
    // ============================================

    if (
      url.pathname ===
      "/api/subscriptions" &&
      request.method ===
      "POST"
    ) {

      try {

        const data =
          await request.json();


        const subscriptions =
          await getSubscriptions(
            env
          );


        const sub = {

          id:
            generateId(),

          token:
            generateToken(),

          name:
            String(
              data.name ||
              "wlvpn"
            )
              .trim()
              .slice(
                0,
                100
              ),

          enabled:
            true,

          createdAt:
            Date.now()

        };


        subscriptions.push(
          sub
        );


        await saveSubscriptions(
          env,
          subscriptions
        );


        return Response.json(
          {

            success:
              true,

            sub

          }
        );

      } catch {

        return Response.json(
          {

            success:
              false,

            error:
              "Invalid request"

          },
          {

            status:
              400

          }
        );

      }

    }


    // ============================================
    // TOGGLE
    // ============================================

    const toggleMatch =
      url.pathname.match(
        /^\/api\/subscriptions\/([^/]+)\/toggle$/
      );


    if (
      toggleMatch &&
      request.method ===
      "POST"
    ) {

      const subscriptions =
        await getSubscriptions(
          env
        );


      const sub =
        subscriptions.find(
          item =>
            item.id ===
            toggleMatch[1]
        );


      if (!sub) {

        return Response.json(
          {

            success:
              false,

            error:
              "Not found"

          },
          {

            status:
              404

          }
        );

      }


      sub.enabled =
        !sub.enabled;


      await saveSubscriptions(
        env,
        subscriptions
      );


      return Response.json(
        {

          success:
            true,

          enabled:
            sub.enabled

        }
      );

    }


    // ============================================
    // ID MATCH
    // ============================================

    const idMatch =
      url.pathname.match(
        /^\/api\/subscriptions\/([^/]+)$/
      );


    // ============================================
    // RENAME
    // ============================================

    if (
      idMatch &&
      request.method ===
      "PUT"
    ) {

      try {

        const data =
          await request.json();


        const subscriptions =
          await getSubscriptions(
            env
          );


        const sub =
          subscriptions.find(
            item =>
              item.id ===
              idMatch[1]
          );


        if (!sub) {

          return Response.json(
            {

              success:
                false,

              error:
                "Not found"

            },
            {

              status:
                404

            }
          );

        }


        if (
          data.name &&
          String(
            data.name
          ).trim()
        ) {

          sub.name =
            String(
              data.name
            )
              .trim()
              .slice(
                0,
                100
              );

        }


        await saveSubscriptions(
          env,
          subscriptions
        );


        return Response.json(
          {

            success:
              true

          }
        );

      } catch {

        return Response.json(
          {

            success:
              false,

            error:
              "Invalid request"

          },
          {

            status:
              400

          }
        );

      }

    }


    // ============================================
    // DELETE
    // ============================================

    if (
      idMatch &&
      request.method ===
      "DELETE"
    ) {

      let subscriptions =
        await getSubscriptions(
          env
        );


      const exists =
        subscriptions.some(
          item =>
            item.id ===
            idMatch[1]
        );


      if (!exists) {

        return Response.json(
          {

            success:
              false,

            error:
              "Not found"

          },
          {

            status:
              404

          }
        );

      }


      subscriptions =
        subscriptions.filter(
          item =>
            item.id !==
            idMatch[1]
        );


      await saveSubscriptions(
        env,
        subscriptions
      );


      return Response.json(
        {

          success:
            true

        }
      );

    }


    // ============================================
    // SUBSCRIPTION
    // ============================================

    const subMatch =
      url.pathname.match(
        /^\/sub\/([^/]+)$/
      );


    if (subMatch) {

      const token =
        subMatch[1];


      const subscriptions =
        await getSubscriptions(
          env
        );


      const sub =
        subscriptions.find(
          item =>
            item.token ===
            token
        );


      if (!sub) {

        return new Response(
          "Subscription not found",
          {

            status:
              404

          }
        );

      }


      // ==========================================
      // БРАУЗЕР
      // ==========================================

      if (
        !isVpnClient(
          userAgent
        )
      ) {

        return new Response(
          getSubscriptionPage(
            sub
          ),
          {

            headers: {

              "Content-Type":
                "text/html; charset=utf-8"

            }

          }
        );

      }


      // ==========================================
      // ПОЛУЧАЕМ ИСТОЧНИК
      // ==========================================

      const source =
        await getSourceSubscription();


      const sourceUserinfo =
        getHeader(
          source.rawHeaders,
          "subscription-userinfo"
        );


      const outHeaders = {

        "Content-Type":
          getHeader(
            source.rawHeaders,
            "content-type"
          ) ||
          "application/json; charset=utf-8",

        "Access-Control-Allow-Origin":
          "*",

        "Cache-Control":
          "no-store",

        "Profile-Title":
          sub.name,

        "Profile-Update-Interval":
          "6",

        "Subscription-Userinfo":
          updateSubscriptionUserinfo(
            sourceUserinfo
          ),

        "announce":
          "wlvpn | Стабильный VPN"

      };


      // ==========================================
      // DISABLED
      // ==========================================

      if (!sub.enabled) {

        if (
          source.rawBody &&
          source.rawBody.trim()
        ) {

          return new Response(
            createDisabledSubscription(
              source.rawBody
            ),
            {

              status:
                200,

              headers: {

                ...outHeaders,

                "Profile-Title":
                  "Subscription disabled"

              }

            }
          );

        }


        return new Response(
          JSON.stringify(
            {

              servers: [],

              message:
                "Subscription disabled"

            }
          ),
          {

            status:
              200,

            headers: {

              ...outHeaders,

              "Profile-Title":
                "Subscription disabled"

            }

          }
        );

      }


      // ==========================================
      // ПУСТОЙ ИСТОЧНИК
      // ==========================================

      if (
        !source.rawBody ||
        !source.rawBody.trim()
      ) {

        return new Response(
          JSON.stringify(
            {

              servers: [],

              message:
                source.errorMessage ||
                "Источник подписки временно недоступен"

            }
          ),
          {

            status:
              200,

            headers:
              outHeaders

          }
        );

      }


      // ==========================================
      // PASSTHROUGH HEADERS
      // ==========================================

      const passthrough = [

        "profile-web-page-url",

        "support-url",

        "providerid",

        "hide-settings",

        "new-url"

      ];


      for (
        const name
        of passthrough
      ) {

        const value =
          getHeader(
            source.rawHeaders,
            name
          );


        if (value) {

          const canonical =
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
            canonical
          ] =
            value;

        }

      }


      // ==========================================
      // ВОЗВРАЩАЕМ ПОДПИСКУ
      // ==========================================

      return new Response(
        source.rawBody,
        {

          status:
            200,

          headers:
            outHeaders

        }
      );

    }


    // ============================================
    // DEBUG
    // ============================================

    if (
      url.pathname ===
      "/debug"
    ) {

      const source =
        await getSourceSubscription();


      return new Response(
        source.rawBody ||
        JSON.stringify(
          {

            servers: [],

            message:
              source.errorMessage

          }
        ),
        {

          status:
            200,

          headers: {

            "Content-Type":
              getHeader(
                source.rawHeaders,
                "content-type"
              ) ||
              "application/json; charset=utf-8",

            "Cache-Control":
              "no-store"

          }

        }
      );

    }


    // ============================================
    // ГЛАВНАЯ
    // ============================================

    return new Response(
      getWebsite(),
      {

        headers: {

          "Content-Type":
            "text/html; charset=utf-8"

        }

      }
    );

  }

};