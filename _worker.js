const TRAFFIC_SOURCE_URL =
  "https://sub.datanode-internal.net/McjAzVPB2VRYcM6z";

const FAKE_UA = "INCY/3.6.5/android";


// ========================================
// HELPERS
// ========================================

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

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function isVpnClient(request) {
  const ua =
    (request.headers.get("User-Agent") || "")
      .toLowerCase();

  const vpnClients = [
    "incy",
    "happ",
    "happ-proxy",
    "v2raytun",
    "v2rayng",
    "v2rayn",
    "sing-box",
    "singbox",
    "clash",
    "clashmeta",
    "nekobox",
    "shadowrocket",
    "stash",
    "loon",
    "quantumult",
    "surge",
    "mihomo"
  ];

  return vpnClients.some(
    client => ua.includes(client)
  );
}


// ========================================
// KV
// ========================================

async function getSubscriptions(env) {
  if (!env.KV) {
    throw new Error(
      "KV binding не подключен. Проверь binding KV."
    );
  }

  const data =
    await env.KV.get("subscriptions");

  if (!data) {
    return [];
  }

  try {
    return JSON.parse(data);
  } catch {
    return [];
  }
}

async function saveSubscriptions(env, subscriptions) {
  await env.KV.put(
    "subscriptions",
    JSON.stringify(subscriptions)
  );
}


// ========================================
// STATUS
// ========================================

function getSubscriptionStatus(sub) {

  if (!sub.enabled) {
    return "disabled";
  }

  if (
    sub.expiresAt &&
    Date.now() > sub.expiresAt
  ) {
    return "expired";
  }

  return "active";
}

function getDaysLeft(expiresAt) {

  if (!expiresAt) {
    return null;
  }

  const diff =
    expiresAt - Date.now();

  if (diff <= 0) {
    return 0;
  }

  return Math.ceil(
    diff / (1000 * 60 * 60 * 24)
  );
}

function formatDate(timestamp) {

  if (!timestamp) {
    return "Без срока";
  }

  return new Date(timestamp)
    .toLocaleString(
      "ru-RU",
      {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit"
      }
    );
}


// ========================================
// GET SOURCE
// ========================================

async function getSourceSubscription() {

  let sourceStatus = 500;
  let rawHeaders = {};
  let rawBody = "";

  try {

    const response =
      await fetch(
        TRAFFIC_SOURCE_URL,
        {
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
// BASE64
// ========================================

function decodeBase64(text) {

  try {

    let value =
      text
        .trim()
        .replace(/-/g, "+")
        .replace(/_/g, "/");

    while (value.length % 4) {
      value += "=";
    }

    return atob(value);

  } catch {

    return null;

  }

}

function encodeBase64(text) {

  try {
    return btoa(text);
  } catch {
    return text;
  }

}


// ========================================
// DETECT SUB FORMAT
// ========================================

function decodeSubscription(body) {

  const trimmed =
    body.trim();

  // Already plain links

  if (
    trimmed.includes("vless://") ||
    trimmed.includes("vmess://") ||
    trimmed.includes("trojan://") ||
    trimmed.includes("ss://")
  ) {

    return {
      content: trimmed,
      encoded: false
    };

  }


  // Try Base64

  const decoded =
    decodeBase64(trimmed);

  if (
    decoded &&
    (
      decoded.includes("vless://") ||
      decoded.includes("vmess://") ||
      decoded.includes("trojan://") ||
      decoded.includes("ss://")
    )
  ) {

    return {
      content: decoded,
      encoded: true
    };

  }


  // Unknown format

  return {
    content: trimmed,
    encoded: false
  };

}


// ========================================
// FILTER NORMAL
// Germany + Sweden
// ========================================

function isNormalServer(line) {

  const value =
    line.toLowerCase();

  const germany = [
    "germany",
    "deutschland",
    "германия",
    "🇩🇪",
    "#de",
    " de "
  ];

  const sweden = [
    "sweden",
    "sverige",
    "швеция",
    "🇸🇪",
    "#se",
    " se "
  ];

  return (
    germany.some(
      item => value.includes(item)
    ) ||
    sweden.some(
      item => value.includes(item)
    )
  );

}

function filterNormalSubscription(body) {

  const decoded =
    decodeSubscription(body);

  const lines =
    decoded.content
      .split(/\r?\n/)
      .map(line => line.trim())
      .filter(Boolean);

  const allowed =
    lines.filter(
      line => isNormalServer(line)
    );

  // Если серверы не удалось определить,
  // возвращаем первые 2 сервера

  let result = allowed;

  if (result.length === 0) {

    result =
      lines
        .filter(
          line =>
            line.startsWith("vless://") ||
            line.startsWith("vmess://") ||
            line.startsWith("trojan://") ||
            line.startsWith("ss://")
        )
        .slice(0, 2);

  }

  const output =
    result.join("\n");

  if (decoded.encoded) {
    return encodeBase64(output);
  }

  return output;
}


// ========================================
// PLACEHOLDER SERVER
// ========================================

function getPlaceholderSubscription(name) {

  /*
    Валидная структура VLESS.
    Адрес documentation.invalid специально
    не существует.

    Клиент сможет обновить подписку
    и увидеть название.
  */

  const uuid =
    "00000000-0000-0000-0000-000000000000";

  const server =
    "vless://" +
    uuid +
    "@documentation.invalid:443" +
    "?type=ws" +
    "&security=none" +
    "&encryption=none" +
    "#" +
    encodeURIComponent(name);

  return server;
}


// ========================================
// BROWSER SUB PAGE
// ========================================

function getSubscriptionPage(sub) {

  const status =
    getSubscriptionStatus(sub);

  let statusText =
    "🟢 Активна";

  let statusClass =
    "active";

  if (status === "disabled") {
    statusText =
      "🔴 Подписка отключена 🚫";

    statusClass =
      "disabled";
  }

  if (status === "expired") {
    statusText =
      "⏰ Подписка истекла 🚫";

    statusClass =
      "expired";
  }

  const days =
    getDaysLeft(
      sub.expiresAt
    );

  let left =
    "♾️ Без срока";

  if (days !== null) {

    if (days === 0) {
      left =
        "Срок истёк";
    } else {
      left =
        days + " дней";
    }

  }

  const typeText =
    sub.plan === "premium"
      ? "⭐ PREMIUM — все серверы"
      : "🟢 NORMAL — Германия и Швеция";


  return `<!DOCTYPE html>
<html lang="ru">

<head>

<meta charset="UTF-8">

<meta
name="viewport"
content="width=device-width,initial-scale=1.0"
>

<title>${escapeHtml(sub.name)} — WLVPN</title>

<style>

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  min-height: 100vh;
  font-family: Arial, sans-serif;
  background: #090d18;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.card {
  width: 100%;
  max-width: 500px;
  background: #141b2d;
  border-radius: 24px;
  padding: 30px;
  box-shadow: 0 20px 70px rgba(0,0,0,.4);
}

.logo {
  color: #8da2ff;
  font-weight: bold;
  margin-bottom: 25px;
}

h1 {
  margin: 0 0 10px;
  word-break: break-word;
}

.plan {
  margin-top: 10px;
  color: #9ea9c5;
}

.status {
  margin: 25px 0;
  padding: 15px;
  border-radius: 14px;
}

.active {
  background: rgba(40,180,100,.12);
}

.disabled {
  background: rgba(255,80,80,.12);
}

.expired {
  background: rgba(255,170,50,.12);
}

.row {
  padding: 15px 0;
  border-bottom: 1px solid #252d40;
}

.label {
  color: #8490aa;
  font-size: 13px;
}

.value {
  margin-top: 5px;
  font-size: 16px;
}

.protect {
  margin-top: 25px;
  padding: 16px;
  background: #0e1423;
  border-radius: 14px;
  color: #aab4ca;
  text-align: center;
}

.telegram {
  display: block;
  margin-top: 20px;
  padding: 14px;
  text-align: center;
  background: #5b7cff;
  color: white;
  text-decoration: none;
  border-radius: 12px;
}

</style>

</head>

<body>

<div class="card">

<div class="logo">
🏳 WLVPN
</div>

<h1>
${escapeHtml(sub.name)}
</h1>

<div class="plan">
${typeText}
</div>

<div class="status ${statusClass}">
${statusText}
</div>

<div class="row">

<div class="label">
Создана
</div>

<div class="value">
${formatDate(sub.createdAt)}
</div>

</div>


<div class="row">

<div class="label">
Истекает
</div>

<div class="value">
${formatDate(sub.expiresAt)}
</div>

</div>


<div class="row">

<div class="label">
Осталось
</div>

<div class="value">
${left}
</div>

</div>


<div class="protect">
🔒 Конфигурации серверов защищены<br>
Содержимое подписки не отображается в браузере.
</div>


<a
class="telegram"
href="https://t.me/snokuy"
target="_blank"
>
Поддержка в Telegram
</a>

</div>

</body>

</html>`;

}


// ========================================
// MAIN WEBSITE
// ========================================

function getWebsite() {

  return `<!DOCTYPE html>
<html lang="ru">

<head>

<meta charset="UTF-8">

<meta
name="viewport"
content="width=device-width,initial-scale=1.0"
>

<title>WLVPN</title>

<style>

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  min-height: 100vh;
  background: #090d18;
  color: white;
  font-family: Arial, sans-serif;
  display: flex;
  flex-direction: column;
}

header {
  padding: 22px 7%;
  display: flex;
  justify-content: space-between;
}

.logo {
  font-size: 24px;
  font-weight: bold;
}

.admin {
  text-decoration: none;
  color: white;
  background: #1c253a;
  padding: 10px 16px;
  border-radius: 10px;
}

main {
  flex: 1;
  text-align: center;
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 30px;
}

h1 {
  font-size: 55px;
  margin: 0;
}

p {
  color: #9ca8c3;
  font-size: 18px;
}

.telegram {
  margin: 20px auto;
  padding: 15px 25px;
  background: #5b7cff;
  color: white;
  text-decoration: none;
  border-radius: 12px;
}

footer {
  text-align: center;
  padding: 25px;
  color: #64708a;
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

<h1>WLVPN</h1>

<p>
Быстрый и стабильный VPN сервис
</p>

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
// ADMIN
// ========================================

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
  background: #090d18;
  color: white;
  font-family: Arial, sans-serif;
  padding: 20px;
}

.container {
  max-width: 950px;
  margin: auto;
}

h1 {
  margin-bottom: 25px;
}

.create,
.actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.create {
  background: #141b2d;
  padding: 20px;
  border-radius: 18px;
  margin-bottom: 25px;
}

input,
select {
  padding: 13px;
  background: #202940;
  border: 0;
  border-radius: 10px;
  color: white;
}

input {
  flex: 1;
  min-width: 180px;
}

button {
  padding: 12px 16px;
  border: 0;
  border-radius: 10px;
  background: #5b7cff;
  color: white;
  cursor: pointer;
}

.item {
  background: #141b2d;
  padding: 20px;
  border-radius: 18px;
  margin-bottom: 15px;
}

.name {
  font-size: 20px;
  font-weight: bold;
}

.info {
  color: #a2acc4;
  margin-top: 8px;
}

.link {
  margin-top: 12px;
  color: #8197ff;
  word-break: break-all;
}

.actions {
  margin-top: 15px;
}

.disabled {
  opacity: .55;
}

.expired {
  border: 1px solid #8b6024;
}

.error {
  color: #ff7777;
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
>


<select id="plan">

<option value="normal">
🟢 NORMAL
</option>

<option value="premium">
⭐ PREMIUM
</option>

</select>


<select
id="duration"
onchange="durationChanged()"
>

<option value="0">
♾️ Без срока
</option>

<option value="1">
1 день
</option>

<option value="7">
7 дней
</option>

<option value="30">
30 дней
</option>

<option value="90">
90 дней
</option>

<option value="custom">
Своя дата
</option>

</select>


<input
type="datetime-local"
id="customDate"
style="display:none"
>


<button onclick="createSub()">
Создать
</button>

</div>


<div id="list">
Загрузка...
</div>


</div>


<script>

function escapeHtml(text) {

  var div =
    document.createElement("div");

  div.textContent =
    String(text);

  return div.innerHTML;

}


async function api(path, options) {

  var response =
    await fetch(
      path,
      options || {}
    );

  var text =
    await response.text();

  var data;

  try {
    data =
      JSON.parse(text);
  } catch {
    data =
      { error: text };
  }

  if (!response.ok) {
    throw new Error(
      data.error || "Ошибка"
    );
  }

  return data;

}


function durationChanged() {

  var duration =
    document.getElementById("duration")
      .value;

  document.getElementById("customDate")
    .style.display =
      duration === "custom"
        ? "block"
        : "none";

}


function formatDate(value) {

  if (!value) {
    return "Без срока";
  }

  return new Date(value)
    .toLocaleString("ru-RU");

}


function getStatus(sub) {

  if (!sub.enabled) {
    return {
      text: "🔴 Отключена",
      className: "disabled"
    };
  }

  if (
    sub.expiresAt &&
    Date.now() > sub.expiresAt
  ) {
    return {
      text: "⏰ Истекла",
      className: "expired"
    };
  }

  return {
    text: "🟢 Активна",
    className: ""
  };

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

      var status =
        getStatus(sub);

      var div =
        document.createElement("div");

      div.className =
        "item " +
        status.className;

      var link =
        location.origin +
        "/sub/" +
        sub.token;

      var days =
        sub.expiresAt
          ? Math.max(
              0,
              Math.ceil(
                (
                  sub.expiresAt -
                  Date.now()
                ) /
                86400000
              )
            )
          : null;

      div.innerHTML =

        '<div class="name">' +
        escapeHtml(sub.name) +
        '</div>' +

        '<div class="info">' +
        status.text +
        '</div>' +

        '<div class="info">' +
        (
          sub.plan === "premium"
            ? "⭐ PREMIUM — все серверы"
            : "🟢 NORMAL — Германия + Швеция"
        ) +
        '</div>' +

        '<div class="info">' +
        'Создана: ' +
        formatDate(sub.createdAt) +
        '</div>' +

        '<div class="info">' +
        'Истекает: ' +
        formatDate(sub.expiresAt) +
        (
          days !== null
            ? ' · Осталось: ' + days + ' дн.'
            : ''
        ) +
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
        (
          sub.enabled
            ? "Отключить"
            : "Включить"
        ) +
        '</button>' +

        '<button onclick="extendSub(\\'' +
        sub.id +
        '\\')">Продлить</button>' +

        '<button onclick="deleteSub(\\'' +
        sub.id +
        '\\')">Удалить</button>' +

        '</div>';

      list.appendChild(div);

    });

  } catch(error) {

    list.innerHTML =
      '<p class="error">' +
      escapeHtml(error.message) +
      '</p>';

  }

}


async function createSub() {

  var name =
    document.getElementById("name")
      .value
      .trim();

  var plan =
    document.getElementById("plan")
      .value;

  var duration =
    document.getElementById("duration")
      .value;

  var customDate =
    document.getElementById("customDate")
      .value;

  if (!name) {
    alert("Введите название");
    return;
  }

  var payload = {
    name: name,
    plan: plan,
    duration: duration,
    customDate: customDate
  };

  try {

    await api(
      "/api/subscriptions",
      {
        method: "POST",

        headers: {
          "Content-Type":
            "application/json"
        },

        body:
          JSON.stringify(payload)
      }
    );

    document.getElementById("name")
      .value = "";

    load();

  } catch(error) {

    alert(error.message);

  }

}


async function copyLink(token) {

  var link =
    location.origin +
    "/sub/" +
    token;

  try {

    await navigator.clipboard
      .writeText(link);

    alert("Ссылка скопирована");

  } catch {

    prompt(
      "Скопируй:",
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

        body:
          JSON.stringify({
            name: name
          })
      }
    );

    load();

  } catch(error) {

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

  } catch(error) {

    alert(error.message);

  }

}


async function extendSub(id) {

  var days =
    prompt(
      "На сколько дней продлить?",
      "30"
    );

  if (!days) return;

  try {

    await api(
      "/api/subscriptions/" +
      id +
      "/extend",
      {
        method: "POST",

        headers: {
          "Content-Type":
            "application/json"
        },

        body:
          JSON.stringify({
            days: Number(days)
          })
      }
    );

    load();

  } catch(error) {

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

  } catch(error) {

    alert(error.message);

  }

}


load();

</script>

</body>

</html>`;

}


// ========================================
// MAIN WORKER
// ========================================

export default {

  async fetch(request, env) {

    const url =
      new URL(request.url);


    // ====================================
    // ADMIN PAGE
    // ====================================

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


    // ====================================
    // API GET
    // ====================================

    if (
      url.pathname ===
        "/api/subscriptions" &&
      request.method === "GET"
    ) {

      try {

        const subs =
          await getSubscriptions(env);

        return Response.json(subs);

      } catch(error) {

        return Response.json(
          {
            error:
              error.message
          },
          {
            status: 500
          }
        );

      }

    }


    // ====================================
    // API CREATE
    // ====================================

    if (
      url.pathname ===
        "/api/subscriptions" &&
      request.method === "POST"
    ) {

      try {

        const data =
          await request.json();

        const name =
          String(
            data.name || "WLVPN"
          ).trim();

        const plan =
          data.plan === "premium"
            ? "premium"
            : "normal";

        let expiresAt =
          null;

        if (
          data.duration === "custom"
        ) {

          if (!data.customDate) {

            return Response.json(
              {
                error:
                  "Выбери дату"
              },
              {
                status: 400
              }
            );

          }

          expiresAt =
            new Date(
              data.customDate
            ).getTime();

        }

        else {

          const days =
            Number(
              data.duration
            );

          if (
            days > 0
          ) {

            expiresAt =
              Date.now() +
              days *
              86400000;

          }

        }


        const subs =
          await getSubscriptions(env);

        const sub = {

          id:
            generateId(),

          token:
            generateToken(),

          name:
            name,

          plan:
            plan,

          enabled:
            true,

          createdAt:
            Date.now(),

          expiresAt:
            expiresAt

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

      } catch(error) {

        return Response.json(
          {
            error:
              error.message
          },
          {
            status: 500
          }
        );

      }

    }


    // ====================================
    // API SUB ID
    // ====================================

    const subApiMatch =
      url.pathname.match(
        /^\/api\/subscriptions\/([^/]+)$/
      );


    // RENAME

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
              error:
                "Подписка не найдена"
            },
            {
              status: 404
            }
          );

        }

        sub.name =
          String(
            data.name || sub.name
          ).trim();

        await saveSubscriptions(
          env,
          subs
        );

        return Response.json({
          success: true
        });

      } catch(error) {

        return Response.json(
          {
            error:
              error.message
          },
          {
            status: 500
          }
        );

      }

    }


    // DELETE

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

      } catch(error) {

        return Response.json(
          {
            error:
              error.message
          },
          {
            status: 500
          }
        );

      }

    }


    // ====================================
    // TOGGLE
    // ====================================

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
              error:
                "Подписка не найдена"
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

      } catch(error) {

        return Response.json(
          {
            error:
              error.message
          },
          {
            status: 500
          }
        );

      }

    }


    // ====================================
    // EXTEND
    // ====================================

    const extendMatch =
      url.pathname.match(
        /^\/api\/subscriptions\/([^/]+)\/extend$/
      );


    if (
      extendMatch &&
      request.method === "POST"
    ) {

      try {

        const id =
          extendMatch[1];

        const data =
          await request.json();

        const days =
          Number(data.days);

        if (
          !Number.isFinite(days) ||
          days <= 0
        ) {

          return Response.json(
            {
              error:
                "Неверное количество дней"
            },
            {
              status: 400
            }
          );

        }

        const subs =
          await getSubscriptions(env);

        const sub =
          subs.find(
            s => s.id === id
          );

        if (!sub) {

          return Response.json(
            {
              error:
                "Подписка не найдена"
            },
            {
              status: 404
            }
          );

        }

        const base =
          (
            sub.expiresAt &&
            sub.expiresAt > Date.now()
          )
            ? sub.expiresAt
            : Date.now();

        sub.expiresAt =
          base +
          days *
          86400000;

        await saveSubscriptions(
          env,
          subs
        );

        return Response.json({
          success: true
        });

      } catch(error) {

        return Response.json(
          {
            error:
              error.message
          },
          {
            status: 500
          }
        );

      }

    }


    // ====================================
    // SUBSCRIPTION LINK
    // ====================================

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

          if (isVpnClient(request)) {

            return new Response(
              "Subscription not found",
              {
                status: 404
              }
            );

          }

          return new Response(
            "<h1>Подписка не найдена</h1>",
            {
              status: 404,

              headers: {
                "Content-Type":
                  "text/html; charset=utf-8"
              }
            }
          );

        }


        // ==================================
        // BROWSER
        // ==================================

        if (!isVpnClient(request)) {

          return new Response(
            getSubscriptionPage(sub),
            {
              headers: {
                "Content-Type":
                  "text/html; charset=utf-8",

                "Cache-Control":
                  "no-store"
              }
            }
          );

        }


        // ==================================
        // VPN CLIENT STATUS
        // ==================================

        const status =
          getSubscriptionStatus(sub);


        if (status === "disabled") {

          return new Response(
            getPlaceholderSubscription(
              "Подписка отключена 🚫"
            ),
            {
              headers: {
                "Content-Type":
                  "text/plain; charset=utf-8",

                "Profile-Title":
                  "Подписка отключена 🚫",

                "Profile-Update-Interval":
                  "6",

                "Cache-Control":
                  "no-cache"
              }
            }
          );

        }


        if (status === "expired") {

          return new Response(
            getPlaceholderSubscription(
              "Подписка истекла 🚫"
            ),
            {
              headers: {
                "Content-Type":
                  "text/plain; charset=utf-8",

                "Profile-Title":
                  "Подписка истекла 🚫",

                "Profile-Update-Interval":
                  "6",

                "Cache-Control":
                  "no-cache"
              }
            }
          );

        }


        // ==================================
        // ACTIVE SOURCE
        // ==================================

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
              status: 502
            }
          );

        }


        let output =
          source.rawBody;


        // ==================================
        // NORMAL
        // ==================================

        if (
          sub.plan === "normal"
        ) {

          output =
            filterNormalSubscription(
              source.rawBody
            );

        }


        const outHeaders = {

          "Content-Type":
            "text/plain; charset=utf-8",

          "Access-Control-Allow-Origin":
            "*",

          "Cache-Control":
            "no-cache",

          "Profile-Title":
            sub.name,

          "Profile-Update-Interval":
            "6"

        };


        // Передаём полезные headers
        // от исходной подписки

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
          output,
          {
            status: 200,
            headers: outHeaders
          }
        );

      } catch(error) {

        return new Response(
          "Worker error: " +
          error.message,
          {
            status: 500
          }
        );

      }

    }


    // ====================================
    // DEBUG
    // ====================================

    if (
      url.pathname === "/debug"
    ) {

      return Response.json({

        worker:
          "WLVPN",

        status:
          "OK",

        kvAvailable:
          !!env.KV

      });

    }


    // ====================================
    // WEBSITE
    // ====================================

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