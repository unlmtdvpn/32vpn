const TRAFFIC_SOURCE_URL =
  "https://sub.datanode-internal.net/McjAzVPB2VRYcM6z";

const FAKE_UA = "INCY/3.6.5/android";

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


// =====================
// KV
// =====================

async function getSubscriptions(env) {
  if (!env.KV) {
    throw new Error("KV binding не подключен");
  }

  const data = await env.KV.get("subscriptions");

  if (!data) return [];

  try {
    return JSON.parse(data);
  } catch {
    return [];
  }
}

async function saveSubscriptions(env, subscriptions) {
  if (!env.KV) {
    throw new Error("KV binding не подключен");
  }

  await env.KV.put(
    "subscriptions",
    JSON.stringify(subscriptions)
  );
}


// =====================
// SOURCE SUBSCRIPTION
// =====================

async function getSourceSubscription() {
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

    if (status >= 300 && status < 400) {
      let cookie = "";

      const setCookie = first.headers.get("set-cookie");

      if (setCookie) {
        cookie = setCookie.split(";")[0];
      }

      const location = first.headers.get("location");

      const secondUrl = location
        ? new URL(location, TRAFFIC_SOURCE_URL).toString()
        : TRAFFIC_SOURCE_URL;

      const second = await fetch(secondUrl, {
        headers: {
          "User-Agent": FAKE_UA,
          "Accept": "*/*",
          ...(cookie ? { "Cookie": cookie } : {})
        },
        redirect: "follow",
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

  return {
    sourceStatus,
    rawHeaders,
    rawBody
  };
}


// =====================
// DISABLED
// =====================

function disabledSubscription() {
  return JSON.stringify({
    servers: [],
    message: "Подписка отключена"
  });
}


// =====================
// WEBSITE
// =====================

function getWebsite() {
  return `<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">

<title>WLVPN</title>

<style>
* {
  box-sizing: border-box;
}

body {
  margin: 0;
  min-height: 100vh;
  font-family: Arial, sans-serif;
  background: #0b1020;
  color: white;
  display: flex;
  flex-direction: column;
}

header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 7%;
}

.logo {
  font-size: 25px;
  font-weight: bold;
}

.admin {
  color: white;
  text-decoration: none;
  background: #252d45;
  padding: 10px 18px;
  border-radius: 10px;
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
  font-size: 50px;
  margin: 0;
}

p {
  color: #9ca6bd;
  font-size: 18px;
}

.button {
  margin-top: 20px;
  padding: 15px 30px;
  background: #5b7cff;
  color: white;
  border-radius: 12px;
  text-decoration: none;
  font-weight: bold;
}

footer {
  text-align: center;
  padding: 25px;
  color: #667085;
}
</style>

</head>

<body>

<header>
  <div class="logo">🏳 WLVPN</div>
  <a class="admin" href="/admin">Админ</a>
</header>

<main>
  <h1>WLVPN</h1>
  <p>Быстрый и стабильный VPN сервис.</p>

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


// =====================
// ADMIN
// =====================

function getAdminPage() {
  return `<!DOCTYPE html>
<html lang="ru">

<head>

<meta charset="UTF-8">

<meta
name="viewport"
content="width=device-width,initial-scale=1.0"
>

<title>WLVPN Admin</title>

<style>

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  padding: 20px;
  font-family: Arial, sans-serif;
  background: #0b1020;
  color: white;
}

.container {
  max-width: 900px;
  margin: auto;
}

h1 {
  margin-bottom: 30px;
}

.create {
  display: flex;
  gap: 10px;
  margin-bottom: 30px;
}

input {
  flex: 1;
  padding: 14px;
  border: none;
  border-radius: 10px;
  background: #20283d;
  color: white;
}

button {
  border: none;
  padding: 12px 18px;
  border-radius: 10px;
  background: #5b7cff;
  color: white;
  cursor: pointer;
}

.list {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.item {
  background: #151b2c;
  padding: 20px;
  border-radius: 15px;
}

.name {
  font-size: 20px;
  font-weight: bold;
}

.status {
  margin-top: 10px;
  color: #8490aa;
}

.link {
  margin-top: 10px;
  color: #7c9cff;
  word-break: break-all;
}

.actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 15px;
}

.disabled {
  opacity: 0.5;
}

.error {
  color: #ff7777;
}

@media (max-width: 600px) {
  .create {
    flex-direction: column;
  }
}

</style>

</head>

<body>

<div class="container">

<h1>🏳 WLVPN Admin</h1>

<div class="create">

<input
  id="name"
  placeholder="Название подписки"
>

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

async function api(path, options) {

  const response = await fetch(
    path,
    options || {}
  );

  const text = await response.text();

  let data;

  try {
    data = JSON.parse(text);
  } catch {
    data = {
      error: text
    };
  }

  if (!response.ok) {
    throw new Error(
      data.error || "Ошибка API"
    );
  }

  return data;
}


function escapeHtml(text) {

  var div =
    document.createElement("div");

  div.textContent = text;

  return div.innerHTML;
}


async function load() {

  var list =
    document.getElementById("list");

  try {

    var data =
      await api("/api/subscriptions");

    list.innerHTML = "";

    if (!data.length) {

      list.innerHTML =
        "<p>Подписок пока нет</p>";

      return;
    }

    data.forEach(function(sub) {

      var div =
        document.createElement("div");

      div.className =
        "item" +
        (sub.enabled ? "" : " disabled");

      var link =
        location.origin +
        "/sub/" +
        sub.token;

      div.innerHTML =
        '<div class="name">' +
        escapeHtml(sub.name) +
        '</div>' +

        '<div class="status">' +
        (sub.enabled
          ? "🟢 Активна"
          : "🔴 Отключена") +
        '</div>' +

        '<div class="link">' +
        escapeHtml(link) +
        '</div>' +

        '<div class="actions">' +

        '<button onclick="copyLink(\\'' +
        sub.token +
        '\\')">Копировать</button>' +

        '<button onclick="renameSub(\\'' +
        sub.id +
        '\\')">Переименовать</button>' +

        '<button onclick="toggleSub(\\'' +
        sub.id +
        '\\')">' +

        (sub.enabled
          ? "Отключить"
          : "Включить") +

        '</button>' +

        '<button onclick="deleteSub(\\'' +
        sub.id +
        '\\')">Удалить</button>' +

        '</div>';

      list.appendChild(div);

    });

  } catch (error) {

    list.innerHTML =
      '<p class="error">Ошибка: ' +
      escapeHtml(error.message) +
      '</p>';

  }

}


async function createSub() {

  var input =
    document.getElementById("name");

  var name =
    input.value.trim();

  if (!name) {
    alert("Введите название");
    return;
  }

  try {

    await api(
      "/api/subscriptions",
      {
        method: "POST",

        headers: {
          "Content-Type":
            "application/json"
        },

        body: JSON.stringify({
          name: name
        })
      }
    );

    input.value = "";

    load();

  } catch (error) {

    alert(
      "Ошибка: " +
      error.message
    );

  }

}


async function copyLink(token) {

  var link =
    location.origin +
    "/sub/" +
    token;

  try {

    await navigator.clipboard.writeText(link);

    alert("Ссылка скопирована");

  } catch {

    prompt(
      "Скопируй ссылку:",
      link
    );

  }

}


async function renameSub(id) {

  var name =
    prompt("Новое название");

  if (!name) return;

  try {

    await api(
      "/api/subscriptions/" + id,
      {
        method: "PUT",

        headers: {
          "Content-Type":
            "application/json"
        },

        body: JSON.stringify({
          name: name
        })
      }
    );

    load();

  } catch (error) {

    alert(error.message);

  }

}


async function toggleSub(id) {

  try {

    await api(
      "/api/subscriptions/" +
      id +
      "/toggle",
      {
        method: "POST"
      }
    );

    load();

  } catch (error) {

    alert(error.message);

  }

}


async function deleteSub(id) {

  if (
    !confirm("Удалить подписку?")
  ) {
    return;
  }

  try {

    await api(
      "/api/subscriptions/" + id,
      {
        method: "DELETE"
      }
    );

    load();

  } catch (error) {

    alert(error.message);

  }

}


load();

</script>

</body>
</html>`;
}


// =====================
// MAIN
// =====================

export default {

  async fetch(request, env) {

    const url =
      new URL(request.url);


    // ADMIN

    if (
      url.pathname === "/admin"
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


    // GET SUBSCRIPTIONS

    if (
      url.pathname ===
        "/api/subscriptions" &&
      request.method === "GET"
    ) {

      try {

        const subs =
          await getSubscriptions(env);

        return Response.json(subs);

      } catch (error) {

        return Response.json(
          {
            error: error.message
          },
          {
            status: 500
          }
        );

      }

    }


    // CREATE

    if (
      url.pathname ===
        "/api/subscriptions" &&
      request.method === "POST"
    ) {

      try {

        const data =
          await request.json();

        const subs =
          await getSubscriptions(env);

        const sub = {

          id:
            generateId(),

          token:
            generateToken(),

          name:
            data.name || "WLVPN",

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

        return Response.json({
          success: true,
          sub: sub
        });

      } catch (error) {

        return Response.json(
          {
            error: error.message
          },
          {
            status: 500
          }
        );

      }

    }


    // RENAME / DELETE

    const subApiMatch =
      url.pathname.match(
        /^\/api\/subscriptions\/([^/]+)$/
      );


    if (
      subApiMatch &&
      request.method === "PUT"
    ) {

      try {

        const id =
          subApiMatch[1];

        const data =
          await request.json();

        const subs =
          await getSubscriptions(env);

        const sub =
          subs.find(
            s => s.id === id
          );

        if (!sub) {

          return Response.json(
            {
              error: "Подписка не найдена"
            },
            {
              status: 404
            }
          );

        }

        sub.name =
          data.name || sub.name;

        await saveSubscriptions(
          env,
          subs
        );

        return Response.json({
          success: true
        });

      } catch (error) {

        return Response.json(
          {
            error: error.message
          },
          {
            status: 500
          }
        );

      }

    }


    if (
      subApiMatch &&
      request.method === "DELETE"
    ) {

      try {

        const id =
          subApiMatch[1];

        let subs =
          await getSubscriptions(env);

        subs =
          subs.filter(
            s => s.id !== id
          );

        await saveSubscriptions(
          env,
          subs
        );

        return Response.json({
          success: true
        });

      } catch (error) {

        return Response.json(
          {
            error: error.message
          },
          {
            status: 500
          }
        );

      }

    }


    // TOGGLE

    const toggleMatch =
      url.pathname.match(
        /^\/api\/subscriptions\/([^/]+)\/toggle$/
      );


    if (
      toggleMatch &&
      request.method === "POST"
    ) {

      try {

        const id =
          toggleMatch[1];

        const subs =
          await getSubscriptions(env);

        const sub =
          subs.find(
            s => s.id === id
          );

        if (!sub) {

          return Response.json(
            {
              error: "Подписка не найдена"
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

      } catch (error) {

        return Response.json(
          {
            error: error.message
          },
          {
            status: 500
          }
        );

      }

    }


    // SUBSCRIPTION

    const subMatch =
      url.pathname.match(
        /^\/sub\/([^/]+)$/
      );


    if (subMatch) {

      try {

        const token =
          subMatch[1];

        const subs =
          await getSubscriptions(env);

        const sub =
          subs.find(
            s => s.token === token
          );

        if (!sub) {

          return new Response(
            "Subscription not found",
            {
              status: 404
            }
          );

        }


        // DISABLED

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


        // SOURCE

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
          const name of passthrough
        ) {

          const value =
            source.rawHeaders[name];

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

            outHeaders[canon] =
              value;

          }

        }


        return new Response(
          source.rawBody,
          {
            status:
              source.sourceStatus || 200,

            headers:
              outHeaders
          }
        );

      } catch (error) {

        return new Response(
          "ERROR: " + error.message,
          {
            status: 500
          }
        );

      }

    }


    // DEBUG

    if (
      url.pathname === "/debug"
    ) {

      return Response.json({

        message:
          "WLVPN Worker OK",

        kvAvailable:
          !!env.KV

      });

    }


    // WEBSITE

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