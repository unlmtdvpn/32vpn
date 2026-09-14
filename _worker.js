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
// СРОК В SUBSCRIPTION-USERINFO
// ================================================

const EXPIRE_DATE =
  "2026-10-07T23:59:59Z";


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
    new Uint8Array(24);

  crypto.getRandomValues(bytes);

  return Array.from(bytes)
    .map(
      b =>
        b
          .toString(16)
          .padStart(2, "0")
    )
    .join("");

}


// ================================================
// ПОЛУЧИТЬ ПОДПИСКИ ИЗ KV
// ================================================

async function getSubscriptions(env) {

  const data =
    await env.KV.get(
      "subscriptions"
    );

  if (!data) {
    return [];
  }

  try {
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
// БЕЗОПАСНЫЙ GET HEADER
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
// ОПРЕДЕЛЕНИЕ VPN КЛИЕНТА
// ================================================

function isVpnClient(userAgent) {

  const ua =
    (userAgent || "")
      .toLowerCase();

  const clients = [
    "incy",
    "happ",
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
    "quantumult"
  ];

  return clients.some(
    client =>
      ua.includes(client)
  );

}


// ================================================
// TRAFFIC + EXPIRE
// ================================================

function updateSubscriptionUserinfo(
  sourceUserinfo
) {

  const expire =
    Math.floor(
      new Date(
        EXPIRE_DATE
      ).getTime() / 1000
    );

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
        parts[0];

      const value =
        parts
          .slice(1)
          .join("=");

      if (key === "upload") {
        upload = value || "0";
      }

      if (key === "download") {
        download = value || "0";
      }

      if (key === "total") {
        total = value || "0";
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
    expire
  );

}


// ================================================
// ПОЛУЧИТЬ ИСТОЧНИК ПОДПИСКИ
// ================================================

async function getSourceSubscription() {

  let sourceStatus = 0;
  let rawHeaders = {};
  let rawBody = "";

  try {

    const response =
      await fetch(
        TRAFFIC_SOURCE_URL,
        {
          method: "GET",

          headers: {
            "User-Agent": FAKE_UA,
            "Accept": "*/*"
          },

          redirect: "follow",

          cf: {
            cacheTtl: 0
          }
        }
      );

    sourceStatus =
      response.status;

    rawHeaders =
      Object.fromEntries(
        response.headers.entries()
      );

    rawBody =
      await response.text();

  } catch (error) {

    sourceStatus = 502;

    rawBody =
      "FETCH ERROR: " +
      (
        error.message ||
        String(error)
      );

  }

  return {
    sourceStatus,
    rawHeaders,
    rawBody
  };

}


// ================================================
// ОТКЛЮЧЕННАЯ ПОДПИСКА
// ================================================

function disabledSubscription() {

  return JSON.stringify({
    servers: [
      {
        name:
          "Подписка отключена 🚫"
      }
    ]
  });

}


// ================================================
// ESCAPE HTML
// ================================================

function escapeHtml(text) {

  return String(text || "")
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
// ГЛАВНЫЙ САЙТ
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
  background: #090909;
  color: #ffffff;
  font-family: Arial, sans-serif;
  display: flex;
  flex-direction: column;
}

header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 22px 8%;
}

.logo {
  font-size: 24px;
  font-weight: bold;
}

.admin {
  color: white;
  text-decoration: none;
  padding: 10px 18px;
  border: 1px solid #444;
  border-radius: 12px;
}

main {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 30px;
}

h1 {
  font-size: 70px;
  margin: 0;
  letter-spacing: -4px;
}

p {
  color: #999;
  font-size: 18px;
}

.button {
  margin-top: 25px;
  padding: 15px 30px;
  background: white;
  color: black;
  text-decoration: none;
  border-radius: 14px;
  font-weight: bold;
}

footer {
  text-align: center;
  padding: 25px;
  color: #666;
}

</style>

</head>

<body>

<header>

<div class="logo">
🏳 wlvpn
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

<p>
Быстрый и стабильный VPN сервис.
</p>

<a
class="button"
href="https://t.me/snokuy"
target="_blank"
>
Telegram
</a>

</main>

<footer>
© 2026 wlvpn
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
  padding: 20px;
  background: #090909;
  color: white;
  font-family: Arial, sans-serif;
}

.container {
  max-width: 850px;
  margin: auto;
}

.back {
  color: #aaa;
  text-decoration: none;
  display: inline-block;
  margin-bottom: 20px;
}

.create {
  display: flex;
  gap: 10px;
  margin-bottom: 30px;
}

input {
  flex: 1;
  padding: 14px;
  border: 1px solid #333;
  border-radius: 12px;
  background: #151515;
  color: white;
}

button {
  border: none;
  padding: 13px 18px;
  border-radius: 12px;
  background: white;
  color: black;
  cursor: pointer;
  font-weight: bold;
}

.list {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.item {
  background: #151515;
  border: 1px solid #292929;
  padding: 20px;
  border-radius: 16px;
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
  margin-top: 12px;
  color: #aaa;
  word-break: break-all;
}

.actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 16px;
}

.disabled {
  opacity: .45;
}

</style>

</head>

<body>

<div class="container">

<a
class="back"
href="/"
>
← На сайт
</a>

<h1>
🏳 wlvpn admin
</h1>

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

  list.innerHTML = "";

  if (!data.length) {

    list.innerHTML =
      "<p>Подписок пока нет</p>";

    return;

  }

  data.forEach(
    sub => {

      const div =
        document.createElement("div");

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

      const name =
        escapeHtml(sub.name);

      const status =
        sub.enabled
          ? "🟢 Активна"
          : "🔴 Отключена";

      const toggleText =
        sub.enabled
          ? "Отключить"
          : "Включить";

      div.innerHTML =
        '<div class="name">' +
        name +
        '</div>' +

        '<div class="status">' +
        status +
        '</div>' +

        '<div class="link">' +
        link +
        '</div>' +

        '<div class="actions">' +

        '<button class="copy">Копировать</button>' +

        '<button class="rename">Переименовать</button>' +

        '<button class="toggle">' +
        toggleText +
        '</button>' +

        '<button class="delete">Удалить</button>' +

        '</div>';

      div
        .querySelector(".copy")
        .onclick =
          () => copyLink(sub.token);

      div
        .querySelector(".rename")
        .onclick =
          () => renameSub(sub.id);

      div
        .querySelector(".toggle")
        .onclick =
          () => toggleSub(sub.id);

      div
        .querySelector(".delete")
        .onclick =
          () => deleteSub(sub.id);

      list.appendChild(div);

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
      method: "POST",

      headers: {
        "Content-Type":
          "application/json"
      },

      body:
        JSON.stringify({
          name
        })
    }
  );

  input.value = "";

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
      "Скопируйте ссылку:",
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
      method: "PUT",

      headers: {
        "Content-Type":
          "application/json"
      },

      body:
        JSON.stringify({
          name
        })
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
      method: "POST"
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
      method: "DELETE"
    }
  );

  load();

}


function escapeHtml(text) {

  const div =
    document.createElement("div");

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
// СТРАНИЦА ИНФОРМАЦИИ О ПОДПИСКЕ
// БРАУЗЕР НЕ ПОЛУЧАЕТ СЕРВЕРЫ
// ================================================

function getSubscriptionPage(sub) {

  const status =
    sub.enabled
      ? "🟢 Активна"
      : "🔴 Отключена";

  return `<!DOCTYPE html>

<html lang="ru">

<head>

<meta charset="UTF-8">

<meta
name="viewport"
content="width=device-width, initial-scale=1.0"
>

<title>${escapeHtml(sub.name)}</title>

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
  padding: 35px;
  border-radius: 20px;
  background: #151515;
  border: 1px solid #292929;
  text-align: center;
}

h1 {
  margin: 0 0 20px;
}

p {
  color: #999;
}

.status {
  margin-top: 20px;
  font-size: 18px;
}

</style>

</head>

<body>

<div class="card">

<h1>
🏳 wlvpn
</h1>

<h2>
${escapeHtml(sub.name)}
</h2>

<p>
VPN подписка wlvpn
</p>

<div class="status">
${status}
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


    // ============================================
    // ADMIN PAGE
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
    // API GET SUBSCRIPTIONS
    // ============================================

    if (
      url.pathname ===
      "/api/subscriptions" &&
      request.method ===
      "GET"
    ) {

      const subscriptions =
        await getSubscriptions(env);

      return Response.json(
        subscriptions
      );

    }


    // ============================================
    // API CREATE SUBSCRIPTION
    // ============================================

    if (
      url.pathname ===
      "/api/subscriptions" &&
      request.method ===
      "POST"
    ) {

      const data =
        await request.json();

      const subscriptions =
        await getSubscriptions(env);

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
            .slice(0, 100),

        enabled:
          true,

        createdAt:
          Date.now()

      };

      subscriptions.push(sub);

      await saveSubscriptions(
        env,
        subscriptions
      );

      return Response.json({
        success: true,
        sub
      });

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

      const id =
        toggleMatch[1];

      const subscriptions =
        await getSubscriptions(env);

      const sub =
        subscriptions.find(
          item =>
            item.id === id
        );

      if (!sub) {

        return Response.json(
          {
            success: false,
            error: "Not found"
          },
          {
            status: 404
          }
        );

      }

      sub.enabled =
        !sub.enabled;

      await saveSubscriptions(
        env,
        subscriptions
      );

      return Response.json({
        success: true,
        enabled:
          sub.enabled
      });

    }


    // ============================================
    // RENAME / DELETE
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

      const id =
        idMatch[1];

      const data =
        await request.json();

      const subscriptions =
        await getSubscriptions(env);

      const sub =
        subscriptions.find(
          item =>
            item.id === id
        );

      if (!sub) {

        return Response.json(
          {
            success: false,
            error: "Not found"
          },
          {
            status: 404
          }
        );

      }

      if (
        data.name &&
        String(data.name).trim()
      ) {

        sub.name =
          String(data.name)
            .trim()
            .slice(0, 100);

      }

      await saveSubscriptions(
        env,
        subscriptions
      );

      return Response.json({
        success: true
      });

    }


    // ============================================
    // DELETE
    // ============================================

    if (
      idMatch &&
      request.method ===
      "DELETE"
    ) {

      const id =
        idMatch[1];

      let subscriptions =
        await getSubscriptions(env);

      const oldLength =
        subscriptions.length;

      subscriptions =
        subscriptions.filter(
          item =>
            item.id !== id
        );

      if (
        subscriptions.length ===
        oldLength
      ) {

        return Response.json(
          {
            success: false,
            error: "Not found"
          },
          {
            status: 404
          }
        );

      }

      await saveSubscriptions(
        env,
        subscriptions
      );

      return Response.json({
        success: true
      });

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
        await getSubscriptions(env);

      const sub =
        subscriptions.find(
          item =>
            item.token === token
        );

      if (!sub) {

        return new Response(
          "Subscription not found",
          {
            status: 404
          }
        );

      }


      // ==========================================
      // BROWSER
      // НЕ ПОКАЗЫВАЕМ СЕРВЕРЫ
      // ==========================================

      if (
        !isVpnClient(
          userAgent
        )
      ) {

        return new Response(
          getSubscriptionPage(sub),
          {
            headers: {
              "Content-Type":
                "text/html; charset=utf-8"
            }
          }
        );

      }


      // ==========================================
      // DISABLED
      // ==========================================

      if (
        !sub.enabled
      ) {

        return new Response(
          disabledSubscription(),
          {
            headers: {
              "Content-Type":
                "application/json; charset=utf-8",

              "Profile-Title":
                "Подписка отключена 🚫",

              "Profile-Update-Interval":
                "6",

              "Subscription-Userinfo":
                updateSubscriptionUserinfo(null)
            }
          }
        );

      }


      // ==========================================
      // SOURCE
      // ==========================================

      const source =
        await getSourceSubscription();


      if (
        source.sourceStatus < 200 ||
        source.sourceStatus >= 400
      ) {

        return new Response(
          source.rawBody ||
          "Source error",
          {
            status: 502,

            headers: {
              "Content-Type":
                "text/plain; charset=utf-8"
            }
          }
        );

      }


      // ==========================================
      // OUTPUT HEADERS
      // ==========================================

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
          "no-cache",

        "Profile-Title":
          sub.name,

        "Profile-Update-Interval":
          "6",

        "Subscription-Userinfo":
          updateSubscriptionUserinfo(
            getHeader(
              source.rawHeaders,
              "subscription-userinfo"
            )
          ),

        "announce":
          "🏳 wlvpn | Стабильный VPN Сервис 🚀"

      };


      // ==========================================
      // HEADERS ИЗ ИСТОЧНИКА
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
      // ОТДАЁМ VPN ПОДПИСКУ
      // ==========================================

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


    // ============================================
    // DEBUG
    // ============================================

    if (
      url.pathname ===
      "/debug"
    ) {

      const subscriptions =
        await getSubscriptions(env);

      return Response.json({
        worker:
          "wlvpn",

        kvAvailable:
          !!env.KV,

        subscriptions:
          subscriptions.length
      });

    }


    // ============================================
    // MAIN PAGE
    // / = ТОЛЬКО САЙТ
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