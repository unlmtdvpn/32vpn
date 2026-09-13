const TRAFFIC_SOURCE_URL =
  "https://sub.datanode-internal.net/McjAzVPB2VRYcM6z";

const FAKE_UA = "INCY/3.6.5/android";

// ================================
// ГЕНЕРАЦИЯ ID
// ================================

function generateId() {
  return crypto.randomUUID();
}

function generateToken() {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);

  return Array.from(bytes)
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");
}


// ================================
// ПОЛУЧИТЬ ПОДПИСКИ ИЗ KV
// ================================

async function getSubscriptions(env) {
  const data = await env.KV.get("subscriptions");

  if (!data) {
    return [];
  }

  try {
    return JSON.parse(data);
  } catch {
    return [];
  }
}


// ================================
// СОХРАНИТЬ ПОДПИСКИ
// ================================

async function saveSubscriptions(env, subscriptions) {
  await env.KV.put(
    "subscriptions",
    JSON.stringify(subscriptions)
  );
}


// ================================
// ПОЛУЧИТЬ ИСХОДНУЮ ПОДПИСКУ
// ================================

async function getSourceSubscription() {

  let sourceStatus = 0;
  let rawHeaders = {};
  let rawBody = "";

  try {

    const first = await fetch(
      TRAFFIC_SOURCE_URL,
      {
        headers: {
          "User-Agent": FAKE_UA,
          "Accept": "*/*"
        },

        redirect: "manual",

        cf: {
          cacheTtl: 0
        }
      }
    );

    let status = first.status;

    let headers =
      Object.fromEntries(
        first.headers.entries()
      );

    let body = "";

    // ================================
    // REDIRECT
    // ================================

    if (
      status >= 300 &&
      status < 400
    ) {

      let cookie = "";

      for (
        const [key, value]
        of Object.entries(headers)
      ) {

        if (
          key.toLowerCase() ===
          "set-cookie"
        ) {

          cookie =
            value.split(";")[0];

          break;
        }
      }


      const second =
        await fetch(
          TRAFFIC_SOURCE_URL,
          {
            headers: {
              "User-Agent": FAKE_UA,
              "Accept": "*/*",
              "Cookie": cookie
            },

            redirect: "manual",

            cf: {
              cacheTtl: 0
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

    else {

      body =
        await first.text();

    }


    sourceStatus = status;

    rawHeaders = headers;

    rawBody = body;

  }

  catch (error) {

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


// ================================
// ОТКЛЮЧЕННАЯ ПОДПИСКА
// ================================

function disabledSubscription() {

  return JSON.stringify({
    servers: [],
    message: "Подписка отключена"
  });

}


// ================================
// WEB SITE
// ================================

function getWebsite() {

  return `<!DOCTYPE html>

<html lang="ru">

<head>

<meta charset="UTF-8">

<meta
name="viewport"
content="width=device-width, initial-scale=1.0"
>

<title>WLVPN</title>

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
    #0b1020;

  color:
    white;

  display:
    flex;

  flex-direction:
    column;

}


header {

  display:
    flex;

  justify-content:
    space-between;

  align-items:
    center;

  padding:
    20px 7%;

}


.logo {

  font-size:
    25px;

  font-weight:
    bold;

}


.admin {

  color:
    #ffffff;

  text-decoration:
    none;

  background:
    #252d45;

  padding:
    10px 18px;

  border-radius:
    10px;

}


main {

  flex:
    1;

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


h1 {

  font-size:
    50px;

  margin:
    0;

}


p {

  color:
    #9ca6bd;

  font-size:
    18px;

  max-width:
    600px;

  line-height:
    1.6;

}


.button {

  margin-top:
    20px;

  padding:
    15px 30px;

  background:
    #5b7cff;

  color:
    white;

  border-radius:
    12px;

  text-decoration:
    none;

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


<a
class="admin"
href="/admin"
>

Админ

</a>

</header>


<main>


<h1>

WLVPN

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

© WLVPN

</footer>


</body>

</html>`;

}


// ================================
// ADMIN PANEL
// ================================

function getAdminPage() {

  return `<!DOCTYPE html>

<html lang="ru">

<head>

<meta charset="UTF-8">

<meta
name="viewport"
content="width=device-width, initial-scale=1.0"
>

<title>WLVPN Admin</title>

<style>

* {
  box-sizing:
    border-box;
}

body {

  margin: 0;

  padding: 20px;

  font-family:
    Arial,
    sans-serif;

  background:
    #0b1020;

  color:
    white;

}


.container {

  max-width:
    900px;

  margin:
    auto;

}


h1 {

  margin-bottom:
    30px;

}


.create {

  display:
    flex;

  gap:
    10px;

  margin-bottom:
    30px;

}


input {

  flex:
    1;

  padding:
    14px;

  border:
    none;

  border-radius:
    10px;

  background:
    #20283d;

  color:
    white;

}


button {

  border:
    none;

  padding:
    12px 18px;

  border-radius:
    10px;

  background:
    #5b7cff;

  color:
    white;

  cursor:
    pointer;

}


.list {

  display:
    flex;

  flex-direction:
    column;

  gap:
    15px;

}


.item {

  background:
    #151b2c;

  padding:
    20px;

  border-radius:
    15px;

}


.name {

  font-size:
    20px;

  font-weight:
    bold;

}


.token {

  color:
    #8490aa;

  margin-top:
    10px;

  word-break:
    break-all;

}


.actions {

  display:
    flex;

  flex-wrap:
    wrap;

  gap:
    10px;

  margin-top:
    15px;

}


.link {

  margin-top:
    10px;

  color:
    #5b7cff;

  word-break:
    break-all;

}


.disabled {

  opacity:
    .5;
}

</style>

</head>


<body>


<div class="container">


<h1>

🏳 WLVPN Admin

</h1>


<div class="create">

<input
id="name"
placeholder="Название подписки"
/>


<button onclick="createSub()">

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


// ================================
// LOAD
// ================================

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


  if (
    !data.length
  ) {

    list.innerHTML =
      "<p>Подписок пока нет</p>";

    return;

  }


  data.forEach(sub => {

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


    div.innerHTML = `

<div class="name">

${escapeHtml(sub.name)}

</div>


<div class="token">

${sub.enabled
  ? "🟢 Активна"
  : "🔴 Отключена"}

</div>


<div class="link">

${link}

</div>


<div class="actions">


<button
onclick="copyLink('${sub.token}')"
>

Копировать

</button>


<button
onclick="renameSub('${sub.id}')"
>

Переименовать

</button>


<button
onclick="toggleSub('${sub.id}')"
>

${
  sub.enabled
    ? "Отключить"
    : "Включить"
}

</button>


<button
onclick="deleteSub('${sub.id}')"
>

Удалить

</button>


</div>

`;

    list.appendChild(div);

  });

}


// ================================
// CREATE
// ================================

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
        JSON.stringify({
          name
        })
    }
  );


  input.value =
    "";


  load();

}


// ================================
// COPY
// ================================

function copyLink(token) {

  const link =
    location.origin +
    "/sub/" +
    token;


  navigator.clipboard.writeText(
    link
  );


  alert(
    "Ссылка скопирована"
  );

}


// ================================
// RENAME
// ================================

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
        JSON.stringify({
          name
        })
    }
  );


  load();

}


// ================================
// TOGGLE
// ================================

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


// ================================
// DELETE
// ================================

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


// ================================
// ESCAPE
// ================================

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


// ================================
// MAIN WORKER
// ================================

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


    const ua =
      userAgent.toLowerCase();


    // ================================
    // ADMIN PAGE
    // ================================

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


    // ================================
    // API GET SUBSCRIPTIONS
    // ================================

    if (
      url.pathname ===
      "/api/subscriptions" &&

      request.method ===
      "GET"
    ) {

      const subs =
        await getSubscriptions(
          env
        );


      return Response.json(
        subs
      );

    }


    // ================================
    // API CREATE
    // ================================

    if (
      url.pathname ===
      "/api/subscriptions" &&

      request.method ===
      "POST"
    ) {

      const data =
        await request.json();


      const subs =
        await getSubscriptions(
          env
        );


      const sub = {

        id:
          generateId(),

        token:
          generateToken(),

        name:
          data.name ||
          "WLVPN",

        enabled:
          true,

        createdAt:
          Date.now()

      };


      subs.push(sub);


      await saveSubscriptions(
        env,
        subs
      );


      return Response.json(
        {
          success: true,
          sub
        }
      );

    }


    // ================================
    // API RENAME
    // ================================

    const renameMatch =
      url.pathname.match(
        /^\\/api\\/subscriptions\\/([^/]+)$/
      );


    if (
      renameMatch &&

      request.method ===
      "PUT"
    ) {

      const id =
        renameMatch[1];


      const data =
        await request.json();


      const subs =
        await getSubscriptions(
          env
        );


      const sub =
        subs.find(
          s =>
            s.id === id
        );


      if (!sub) {

        return Response.json(
          {
            error:
              "Not found"
          },
          {
            status: 404
          }
        );

      }


      sub.name =
        data.name ||
        sub.name;


      await saveSubscriptions(
        env,
        subs
      );


      return Response.json({
        success: true
      });

    }


    // ================================
    // API TOGGLE
    // ================================

    const toggleMatch =
      url.pathname.match(
        /^\\/api\\/subscriptions\\/([^/]+)\\/toggle$/
      );


    if (
      toggleMatch &&

      request.method ===
      "POST"
    ) {

      const id =
        toggleMatch[1];


      const subs =
        await getSubscriptions(
          env
        );


      const sub =
        subs.find(
          s =>
            s.id === id
        );


      if (!sub) {

        return Response.json(
          {
            error:
              "Not found"
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
        subs
      );


      return Response.json({
        success: true
      });

    }


    // ================================
    // API DELETE
    // ================================

    if (
      renameMatch &&

      request.method ===
      "DELETE"
    ) {

      const id =
        renameMatch[1];


      let subs =
        await getSubscriptions(
          env
        );


      subs =
        subs.filter(
          s =>
            s.id !== id
        );


      await saveSubscriptions(
        env,
        subs
      );


      return Response.json({
        success: true
      });

    }


    // ================================
    // SUBSCRIPTION LINK
    // ================================

    const subMatch =
      url.pathname.match(
        /^\\/sub\\/([^/]+)$/
      );


    if (subMatch) {

      const token =
        subMatch[1];


      const subs =
        await getSubscriptions(
          env
        );


      const sub =
        subs.find(
          s =>
            s.token === token
        );


      if (!sub) {

        return new Response(
          "Subscription not found",
          {
            status: 404
          }
        );

      }


      // ================================
      // DISABLED
      // ================================

      if (!sub.enabled) {

        return new Response(
          disabledSubscription(),
          {
            headers: {
              "Content-Type":
                "application/json; charset=utf-8",

              "Profile-Title":
                "Подписка отключена"
            }
          }
        );

      }


      // ================================
      // SOURCE
      // ================================

      const source =
        await getSourceSubscription();


      const outHeaders = {

        "Content-Type":
          "application/json; charset=utf-8",

        "Access-Control-Allow-Origin":
          "*",

        "Cache-Control":
          "no-cache",

        "Profile-Title":
          sub.name,

        "Profile-Update-Interval":
          "6"

      };


      const passthrough = [

        "profile-web-page-url",

        "support-url",

        "providerid",

        "subscription-userinfo",

        "hide-settings",

        "new-url"

      ];


      for (
        const name
        of passthrough
      ) {

        const value =
          source.rawHeaders[
            name
          ];


        if (value) {

          const canon =
            name
              .split("-")
              .map(
                word =>
                  word.charAt(0)
                    .toUpperCase() +
                  word.slice(1)
              )
              .join("-");


          outHeaders[
            canon
          ] = value;

        }

      }


      return new Response(
        source.rawBody,
        {
          status:
            source.sourceStatus ||
            200,

          headers:
            outHeaders
        }
      );

    }


    // ================================
    // DEBUG
    // ================================

    if (
      url.pathname ===
      "/debug"
    ) {

      return Response.json({

        userAgent,

        message:
          "WLVPN Worker OK",

        kvAvailable:
          !!env.KV

      });

    }


    // ================================
    // MAIN PAGE
    // ================================

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