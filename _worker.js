// ============================================
// WLVPN WORKER
// Cloudflare Workers + KV
// ============================================


// ============================================
// НАСТРОЙКИ
// ============================================

const TRAFFIC_SOURCE_URL =
  "https://sub.datanode-internal.net/McjAzVPB2VRYcM6z";

const FAKE_UA =
  "INCY/3.6.5/android";


// ============================================
// ГЕНЕРАЦИЯ ID
// ============================================

function generateId() {
  return crypto.randomUUID();
}


// ============================================
// ГЕНЕРАЦИЯ TOKEN
// ============================================

function generateToken() {

  const bytes =
    new Uint8Array(32);

  crypto.getRandomValues(bytes);

  return Array.from(bytes)
    .map(function (byte) {
      return byte
        .toString(16)
        .padStart(2, "0");
    })
    .join("");

}


// ============================================
// ESCAPE HTML
// ============================================

function escapeHtml(value) {

  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

}


// ============================================
// ПРОВЕРКА VPN КЛИЕНТА
// ============================================

function isVpnClient(request) {

  const userAgent =
    (
      request.headers.get("User-Agent") ||
      ""
    ).toLowerCase();


  const vpnClients = [

    "incy",
    "happ",
    "v2raytun",
    "v2rayng",
    "v2rayn",
    "sing-box",
    "singbox",
    "clash",
    "mihomo",
    "nekobox",
    "shadowrocket",
    "stash",
    "loon",
    "surge",
    "quantumult",
    "outline"

  ];


  for (
    const client
    of vpnClients
  ) {

    if (
      userAgent.includes(client)
    ) {

      return true;

    }

  }


  return false;

}


// ============================================
// KV - ПОЛУЧИТЬ ПОДПИСКИ
// ============================================

async function getSubscriptions(env) {

  if (!env.KV) {

    throw new Error(
      "KV binding 'KV' не подключен"
    );

  }


  const data =
    await env.KV.get(
      "subscriptions"
    );


  if (!data) {

    return [];

  }


  try {

    const subscriptions =
      JSON.parse(data);


    if (
      Array.isArray(
        subscriptions
      )
    ) {

      return subscriptions;

    }


    return [];

  }

  catch (error) {

    return [];

  }

}


// ============================================
// KV - СОХРАНИТЬ ПОДПИСКИ
// ============================================

async function saveSubscriptions(
  env,
  subscriptions
) {

  if (!env.KV) {

    throw new Error(
      "KV binding 'KV' не подключен"
    );

  }


  await env.KV.put(
    "subscriptions",
    JSON.stringify(subscriptions)
  );

}


// ============================================
// СТАТУС ПОДПИСКИ
// ============================================

function getSubscriptionStatus(sub) {

  if (
    sub.enabled === false
  ) {

    return "disabled";

  }


  if (
    sub.expiresAt &&
    Number(sub.expiresAt) <=
      Date.now()
  ) {

    return "expired";

  }


  return "active";

}


// ============================================
// ФОРМАТ ДАТЫ
// ============================================

function formatDate(timestamp) {

  if (!timestamp) {

    return "Без срока";

  }


  try {

    return new Date(
      Number(timestamp)
    ).toLocaleString(
      "ru-RU"
    );

  }

  catch (error) {

    return "Неизвестно";

  }

}


// ============================================
// СКОЛЬКО ДНЕЙ ОСТАЛОСЬ
// ============================================

function getDaysLeft(expiresAt) {

  if (!expiresAt) {

    return null;

  }


  const difference =
    Number(expiresAt) -
    Date.now();


  if (
    difference <= 0
  ) {

    return 0;

  }


  return Math.ceil(
    difference /
    86400000
  );

}


// ============================================
// ПОЛУЧИТЬ ИСХОДНУЮ ПОДПИСКУ
// ============================================

async function getSourceSubscription() {

  try {

    const response =
      await fetch(
        TRAFFIC_SOURCE_URL,
        {

          method:
            "GET",

          headers:
            {

              "User-Agent":
                FAKE_UA,

              "Accept":
                "*/*"

            },

          redirect:
            "follow"

        }
      );


    const headers = {};


    response.headers.forEach(
      function (
        value,
        key
      ) {

        headers[
          key.toLowerCase()
        ] = value;

      }
    );


    const body =
      await response.text();


    return {

      success:
        response.ok,

      status:
        response.status,

      headers:
        headers,

      body:
        body,

      error:
        null

    };

  }

  catch (error) {

    return {

      success:
        false,

      status:
        0,

      headers:
        {},

      body:
        "",

      error:
        error.message ||
        String(error)

    };

  }

}


// ============================================
// BASE64 DECODE
// ============================================

function decodeBase64(value) {

  try {

    let text =
      String(value)
        .trim()
        .replace(/-/g, "+")
        .replace(/_/g, "/");


    while (
      text.length % 4 !== 0
    ) {

      text += "=";

    }


    return atob(text);

  }

  catch (error) {

    return null;

  }

}


// ============================================
// BASE64 ENCODE
// ============================================

function encodeBase64(value) {

  try {

    return btoa(value);

  }

  catch (error) {

    return value;

  }

}


// ============================================
// ПРОВЕРКА VPN ССЫЛКИ
// ============================================

function isVpnLine(line) {

  const value =
    String(line)
      .trim()
      .toLowerCase();


  return (

    value.startsWith(
      "vless://"
    )

    ||

    value.startsWith(
      "vmess://"
    )

    ||

    value.startsWith(
      "trojan://"
    )

    ||

    value.startsWith(
      "ss://"
    )

    ||

    value.startsWith(
      "hysteria2://"
    )

    ||

    value.startsWith(
      "hy2://"
    )

  );

}


// ============================================
// PARSE SUBSCRIPTION
// ============================================

function parseSubscription(body) {

  const original =
    String(body || "")
      .trim();


  const decoded =
    decodeBase64(original);


  if (
    decoded &&
    (
      decoded.includes("vless://") ||
      decoded.includes("vmess://") ||
      decoded.includes("trojan://") ||
      decoded.includes("ss://") ||
      decoded.includes("hysteria2://") ||
      decoded.includes("hy2://")
    )
  ) {

    return {

      content:
        decoded,

      base64:
        true

    };

  }


  return {

    content:
      original,

    base64:
      false

  };

}


// ============================================
// NORMAL ПОДПИСКА
// ГЕРМАНИЯ + ШВЕЦИЯ
// ============================================

function filterNormalSubscription(body) {

  const parsed =
    parseSubscription(body);


  const lines =
    parsed.content
      .split(/\r?\n/)
      .map(function (line) {

        return line.trim();

      })
      .filter(function (line) {

        return isVpnLine(line);

      });


  let germany =
    null;


  let sweden =
    null;


  // Поиск Германии

  for (
    const line
    of lines
  ) {

    const lower =
      line.toLowerCase();


    if (
      lower.includes("germany") ||
      lower.includes("deutschland") ||
      lower.includes("германия") ||
      lower.includes("frankfurt") ||
      lower.includes("berlin") ||
      lower.includes("%f0%9f%87%a9%f0%9f%87%aa")
    ) {

      germany =
        line;

      break;

    }

  }


  // Поиск Швеции

  for (
    const line
    of lines
  ) {

    const lower =
      line.toLowerCase();


    if (
      lower.includes("sweden") ||
      lower.includes("sverige") ||
      lower.includes("швеция") ||
      lower.includes("stockholm") ||
      lower.includes("%f0%9f%87%b8%f0%9f%87%aa")
    ) {

      sweden =
        line;

      break;

    }

  }


  const result =
    [];


  if (germany) {

    result.push(
      germany
    );

  }


  if (sweden) {

    result.push(
      sweden
    );

  }


  // Если не удалось найти
  // Германию и Швецию,
  // берем первые 2 сервера

  if (
    result.length === 0
  ) {

    for (
      let index = 0;
      index < lines.length &&
      index < 2;
      index++
    ) {

      result.push(
        lines[index]
      );

    }

  }


  const output =
    result.join("\n");


  if (
    parsed.base64
  ) {

    return encodeBase64(
      output
    );

  }


  return output;

}


// ============================================
// ОДИН СЕРВЕР ДЛЯ ОТКЛЮЧЕННОЙ ПОДПИСКИ
// ============================================

function getPlaceholderServer(name) {

  const uuid =
    "00000000-0000-0000-0000-000000000000";


  return (
    "vless://" +

    uuid +

    "@127.0.0.1:443" +

    "?encryption=none" +

    "&security=none" +

    "&type=tcp" +

    "#" +

    encodeURIComponent(name)
  );

}


// ============================================
// ГЛАВНЫЙ САЙТ
// ============================================

function getWebsite() {

  return `
<!DOCTYPE html>

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
  box-sizing:
    border-box;
}

body {

  margin:
    0;

  min-height:
    100vh;

  font-family:
    Arial,
    sans-serif;

  background:
    linear-gradient(
      135deg,
      #080b14,
      #111a32
    );

  color:
    white;

  display:
    flex;

  flex-direction:
    column;

}

header {

  padding:
    22px 7%;

  display:
    flex;

  justify-content:
    space-between;

  align-items:
    center;

}

.logo {

  font-size:
    25px;

  font-weight:
    bold;

}

.admin {

  color:
    white;

  text-decoration:
    none;

  background:
    rgba(
      255,
      255,
      255,
      0.08
    );

  padding:
    11px 18px;

  border-radius:
    12px;

}

main {

  flex:
    1;

  display:
    flex;

  flex-direction:
    column;

  justify-content:
    center;

  align-items:
    center;

  text-align:
    center;

  padding:
    30px;

}

.badge {

  color:
    #92a7ff;

  background:
    rgba(
      91,
      124,
      255,
      0.12
    );

  padding:
    10px 18px;

  border-radius:
    30px;

}

h1 {

  font-size:
    60px;

  margin:
    25px 0 10px;

}

p {

  color:
    #a8b1c8;

  font-size:
    18px;

}

.button {

  margin-top:
    25px;

  padding:
    16px 30px;

  border-radius:
    14px;

  background:
    #5b7cff;

  color:
    white;

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
    #68728a;

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

<div class="badge">

🟢 VPN сервис онлайн

</div>

<h1>

WLVPN

</h1>

<p>

Быстрый и стабильный VPN сервис

</p>

<a
class="button"
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

</html>
`;

}


// ============================================
// СТРАНИЦА ИНФОРМАЦИИ О ПОДПИСКЕ
// ============================================

function getSubscriptionPage(sub) {

  const status =
    getSubscriptionStatus(sub);


  let statusText =
    "🟢 Подписка активна";


  if (
    status === "disabled"
  ) {

    statusText =
      "🔴 Подписка отключена 🚫";

  }


  if (
    status === "expired"
  ) {

    statusText =
      "⏰ Подписка истекла 🚫";

  }


  const days =
    getDaysLeft(
      sub.expiresAt
    );


  let daysText =
    "♾️ Без срока";


  if (
    days !== null
  ) {

    daysText =
      String(days) +
      " дней";

  }


  let planText =
    "🟢 Normal — Германия и Швеция";


  if (
    sub.plan === "premium"
  ) {

    planText =
      "⭐ Premium — все серверы";

  }


  return `
<!DOCTYPE html>

<html lang="ru">

<head>

<meta charset="UTF-8">

<meta
name="viewport"
content="width=device-width,initial-scale=1"
>

<title>WLVPN Subscription</title>

<style>

* {

  box-sizing:
    border-box;

}

body {

  margin:
    0;

  min-height:
    100vh;

  background:
    #090d18;

  color:
    white;

  font-family:
    Arial,
    sans-serif;

  display:
    flex;

  align-items:
    center;

  justify-content:
    center;

  padding:
    20px;

}

.card {

  width:
    100%;

  max-width:
    520px;

  background:
    #151c2e;

  padding:
    30px;

  border-radius:
    24px;

}

.logo {

  color:
    #8499ff;

  font-weight:
    bold;

  margin-bottom:
    25px;

}

h1 {

  margin:
    0;

  font-size:
    27px;

}

.status {

  margin:
    25px 0;

  padding:
    16px;

  background:
    #202a42;

  border-radius:
    14px;

}

.row {

  padding:
    16px 0;

  border-bottom:
    1px solid #283148;

}

.label {

  color:
    #8c96ad;

  font-size:
    13px;

}

.value {

  margin-top:
    6px;

}

.protected {

  margin-top:
    25px;

  padding:
    18px;

  border-radius:
    14px;

  background:
    #0d1320;

  color:
    #9ba5bc;

  text-align:
    center;

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

<div class="status">

${statusText}

</div>

<div class="row">

<div class="label">

Тариф

</div>

<div class="value">

${planText}

</div>

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

Срок действия

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

${daysText}

</div>

</div>

<div class="protected">

🔒 Конфигурации серверов
защищены и не отображаются
в браузере

</div>

</div>

</body>

</html>
`;

}


// ============================================
// АДМИН ПАНЕЛЬ
// ============================================

function getAdminPage() {

  return `
<!DOCTYPE html>

<html lang="ru">

<head>

<meta charset="UTF-8">

<meta
name="viewport"
content="width=device-width,initial-scale=1"
>

<title>WLVPN Admin</title>

<style>

* {

  box-sizing:
    border-box;

}

body {

  margin:
    0;

  padding:
    20px;

  background:
    #090d18;

  color:
    white;

  font-family:
    Arial,
    sans-serif;

}

.container {

  max-width:
    950px;

  margin:
    auto;

}

.panel {

  background:
    #151c2e;

  padding:
    20px;

  border-radius:
    18px;

  margin-bottom:
    25px;

}

.create {

  display:
    flex;

  flex-wrap:
    wrap;

  gap:
    10px;

}

input,
select {

  padding:
    14px;

  border:
    none;

  border-radius:
    10px;

  background:
    #222c44;

  color:
    white;

}

input {

  flex:
    1;

  min-width:
    180px;

}

button {

  border:
    none;

  padding:
    13px 17px;

  border-radius:
    10px;

  background:
    #5b7cff;

  color:
    white;

  cursor:
    pointer;

}

.item {

  background:
    #151c2e;

  padding:
    20px;

  border-radius:
    18px;

  margin-bottom:
    15px;

}

.name {

  font-size:
    21px;

  font-weight:
    bold;

}

.info {

  margin-top:
    8px;

  color:
    #a4adc3;

}

.link {

  margin-top:
    14px;

  color:
    #8298ff;

  word-break:
    break-all;

}

.actions {

  display:
    flex;

  flex-wrap:
    wrap;

  gap:
    8px;

  margin-top:
    16px;

}

.error {

  color:
    #ff7777;

}

</style>

</head>

<body>

<div class="container">

<h1>

🏳 WLVPN Admin

</h1>

<div class="panel">

<div class="create">

<input
id="name"
placeholder="Название подписки"
>

<select id="plan">

<option value="normal">

🟢 Normal

</option>

<option value="premium">

⭐ Premium

</option>

</select>

<select id="days">

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

<option value="365">

365 дней

</option>

</select>

<button onclick="createSub()">

Создать

</button>

</div>

</div>

<div id="list">

Загрузка...

</div>

</div>

<script>

function esc(value) {

  var div =
    document.createElement("div");

  div.textContent =
    String(value);

  return div.innerHTML;

}


async function api(
  url,
  options
) {

  var response =
    await fetch(
      url,
      options || {}
    );


  var text =
    await response.text();


  var data;


  try {

    data =
      JSON.parse(text);

  }

  catch (error) {

    data =
      {
        error:
          text
      };

  }


  if (!response.ok) {

    throw new Error(
      data.error ||
      "Ошибка"
    );

  }


  return data;

}


function formatDate(value) {

  if (!value) {

    return "Без срока";

  }


  return new Date(
    Number(value)
  ).toLocaleString(
    "ru-RU"
  );

}


function getStatus(sub) {

  if (!sub.enabled) {

    return "🔴 Отключена";

  }


  if (
    sub.expiresAt &&
    Date.now() >=
    Number(sub.expiresAt)
  ) {

    return "⏰ Истекла";

  }


  return "🟢 Активна";

}


function getPlan(sub) {

  if (
    sub.plan === "premium"
  ) {

    return "⭐ Premium — все серверы";

  }


  return "🟢 Normal — 2 сервера";

}


async function load() {

  var list =
    document.getElementById(
      "list"
    );


  try {

    var subs =
      await api(
        "/api/subscriptions"
      );


    list.innerHTML =
      "";


    if (
      !subs.length
    ) {

      list.innerHTML =
        "<p>Подписок пока нет</p>";

      return;

    }


    subs.forEach(
      function (sub) {

        var link =
          location.origin +
          "/sub/" +
          sub.token;


        var div =
          document.createElement(
            "div"
          );


        div.className =
          "item";


        var html =
          "";

        html +=
          '<div class="name">' +
          esc(sub.name) +
          '</div>';

        html +=
          '<div class="info">' +
          getStatus(sub) +
          '</div>';

        html +=
          '<div class="info">' +
          getPlan(sub) +
          '</div>';

        html +=
          '<div class="info">Срок: ' +
          formatDate(sub.expiresAt) +
          '</div>';

        html +=
          '<div class="link">' +
          esc(link) +
          '</div>';

        html +=
          '<div class="actions">';

        html +=
          '<button data-action="copy">Копировать</button>';

        html +=
          '<button data-action="rename">Переименовать</button>';

        html +=
          '<button data-action="toggle">Вкл/Выкл</button>';

        html +=
          '<button data-action="extend">Продлить</button>';

        html +=
          '<button data-action="delete">Удалить</button>';

        html +=
          '</div>';


        div.innerHTML =
          html;


        var buttons =
          div.querySelectorAll(
            "button"
          );


        buttons[0].onclick =
          function () {
            copySub(
              sub.token
            );
          };


        buttons[1].onclick =
          function () {
            renameSub(
              sub.id
            );
          };


        buttons[2].onclick =
          function () {
            toggleSub(
              sub.id
            );
          };


        buttons[3].onclick =
          function () {
            extendSub(
              sub.id
            );
          };


        buttons[4].onclick =
          function () {
            deleteSub(
              sub.id
            );
          };


        list.appendChild(
          div
        );

      }
    );

  }

  catch (error) {

    list.innerHTML =
      '<p class="error">' +
      esc(error.message) +
      '</p>';

  }

}


async function createSub() {

  var name =
    document
      .getElementById("name")
      .value
      .trim();


  var plan =
    document
      .getElementById("plan")
      .value;


  var days =
    document
      .getElementById("days")
      .value;


  if (!name) {

    alert(
      "Введите название"
    );

    return;

  }


  try {

    await api(
      "/api/subscriptions",
      {

        method:
          "POST",

        headers:
          {

            "Content-Type":
              "application/json"

          },

        body:
          JSON.stringify(
            {

              name:
                name,

              plan:
                plan,

              days:
                Number(days)

            }
          )

      }
    );


    document
      .getElementById("name")
      .value =
      "";


    load();

  }

  catch (error) {

    alert(
      error.message
    );

  }

}


async function copySub(token) {

  var link =
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

  }

  catch (error) {

    prompt(
      "Скопируйте ссылку",
      link
    );

  }

}


async function renameSub(id) {

  var name =
    prompt(
      "Новое название"
    );


  if (!name) {

    return;

  }


  try {

    await api(
      "/api/subscriptions/" +
      id,
      {

        method:
          "PUT",

        headers:
          {

            "Content-Type":
              "application/json"

          },

        body:
          JSON.stringify(
            {

              name:
                name

            }
          )

      }
    );


    load();

  }

  catch (error) {

    alert(
      error.message
    );

  }

}


async function toggleSub(id) {

  try {

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

  catch (error) {

    alert(
      error.message
    );

  }

}


async function extendSub(id) {

  var days =
    prompt(
      "На сколько дней продлить?",
      "30"
    );


  if (!days) {

    return;

  }


  days =
    Number(days);


  if (
    !Number.isFinite(days) ||
    days <= 0
  ) {

    alert(
      "Введите правильное количество дней"
    );

    return;

  }


  try {

    await api(
      "/api/subscriptions/" +
      id +
      "/extend",
      {

        method:
          "POST",

        headers:
          {

            "Content-Type":
              "application/json"

          },

        body:
          JSON.stringify(
            {

              days:
                days

            }
          )

      }
    );


    load();

  }

  catch (error) {

    alert(
      error.message
    );

  }

}


async function deleteSub(id) {

  var result =
    confirm(
      "Удалить подписку?"
    );


  if (!result) {

    return;

  }


  try {

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

  catch (error) {

    alert(
      error.message
    );

  }

}


load();

</script>

</body>

</html>
`;

}


// ============================================
// ГЛАВНЫЙ WORKER
// ============================================

export default {

  async fetch(
    request,
    env
  ) {

    const url =
      new URL(
        request.url
      );


    // ========================================
    // ГЛАВНАЯ
    // ========================================

    if (
      url.pathname === "/"
    ) {

      return new Response(
        getWebsite(),
        {

          headers:
            {

              "Content-Type":
                "text/html; charset=utf-8"

            }

        }
      );

    }


    // ========================================
    // ADMIN
    // ========================================

    if (
      url.pathname === "/admin"
    ) {

      return new Response(
        getAdminPage(),
        {

          headers:
            {

              "Content-Type":
                "text/html; charset=utf-8",

              "Cache-Control":
                "no-store"

            }

        }
      );

    }


    // ========================================
    // API GET ALL
    // ========================================

    if (
      url.pathname ===
        "/api/subscriptions" &&
      request.method === "GET"
    ) {

      try {

        const subscriptions =
          await getSubscriptions(
            env
          );


        return Response.json(
          subscriptions
        );

      }

      catch (error) {

        return Response.json(
          {

            error:
              error.message

          },
          {

            status:
              500

          }
        );

      }

    }


    // ========================================
    // API CREATE
    // ========================================

    if (
      url.pathname ===
        "/api/subscriptions" &&
      request.method === "POST"
    ) {

      try {

        const data =
          await request.json();


        const subscriptions =
          await getSubscriptions(
            env
          );


        const name =
          String(
            data.name ||
            "WLVPN"
          )
            .trim()
            .slice(
              0,
              100
            );


        const plan =
          data.plan === "premium"

            ? "premium"

            : "normal";


        const days =
          Number(data.days) || 0;


        let expiresAt =
          null;


        if (
          days > 0
        ) {

          expiresAt =
            Date.now() +
            (
              days *
              86400000
            );

        }


        const sub =
          {

            id:
              generateId(),

            token:
              generateToken(),

            name:
              name ||

              "WLVPN",

            plan:
              plan,

            enabled:
              true,

            createdAt:
              Date.now(),

            expiresAt:
              expiresAt

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

            sub:
              sub

          }
        );

      }

      catch (error) {

        return Response.json(
          {

            error:
              error.message

          },
          {

            status:
              500

          }
        );

      }

    }


    // ========================================
    // API /subscriptions/:id
    // ========================================

    const apiSubMatch =
      url.pathname.match(
        /^\/api\/subscriptions\/([^/]+)$/
      );


    // ========================================
    // RENAME
    // ========================================

    if (
      apiSubMatch &&
      request.method === "PUT"
    ) {

      try {

        const id =
          apiSubMatch[1];


        const data =
          await request.json();


        const subscriptions =
          await getSubscriptions(
            env
          );


        const sub =
          subscriptions.find(
            function (item) {

              return (
                item.id === id
              );

            }
          );


        if (!sub) {

          return Response.json(
            {

              error:
                "Подписка не найдена"

            },
            {

              status:
                404

            }
          );

        }


        if (
          data.name
        ) {

          sub.name =
            String(data.name)
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

      }

      catch (error) {

        return Response.json(
          {

            error:
              error.message

          },
          {

            status:
              500

          }
        );

      }

    }


    // ========================================
    // DELETE
    // ========================================

    if (
      apiSubMatch &&
      request.method === "DELETE"
    ) {

      try {

        const id =
          apiSubMatch[1];


        const subscriptions =
          await getSubscriptions(
            env
          );


        const filtered =
          subscriptions.filter(
            function (item) {

              return (
                item.id !== id
              );

            }
          );


        await saveSubscriptions(
          env,
          filtered
        );


        return Response.json(
          {

            success:
              true

          }
        );

      }

      catch (error) {

        return Response.json(
          {

            error:
              error.message

          },
          {

            status:
              500

          }
        );

      }

    }


    // ========================================
    // TOGGLE
    // ========================================

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


        const subscriptions =
          await getSubscriptions(
            env
          );


        const sub =
          subscriptions.find(
            function (item) {

              return (
                item.id === id
              );

            }
          );


        if (!sub) {

          return Response.json(
            {

              error:
                "Подписка не найдена"

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

      catch (error) {

        return Response.json(
          {

            error:
              error.message

          },
          {

            status:
              500

          }
        );

      }

    }


    // ========================================
    // EXTEND
    // ========================================

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

              status:
                400

            }
          );

        }


        const subscriptions =
          await getSubscriptions(
            env
          );


        const sub =
          subscriptions.find(
            function (item) {

              return (
                item.id === id
              );

            }
          );


        if (!sub) {

          return Response.json(
            {

              error:
                "Подписка не найдена"

            },
            {

              status:
                404

            }
          );

        }


        let base =
          Date.now();


        if (
          sub.expiresAt &&
          Number(sub.expiresAt) >
            Date.now()
        ) {

          base =
            Number(
              sub.expiresAt
            );

        }


        sub.expiresAt =
          base +
          (
            days *
            86400000
          );


        await saveSubscriptions(
          env,
          subscriptions
        );


        return Response.json(
          {

            success:
              true,

            expiresAt:
              sub.expiresAt

          }
        );

      }

      catch (error) {

        return Response.json(
          {

            error:
              error.message

          },
          {

            status:
              500

          }
        );

      }

    }


    // ========================================
    // SUBSCRIPTION LINK
    // ========================================

    const subMatch =
      url.pathname.match(
        /^\/sub\/([^/]+)$/
      );


    if (subMatch) {

      try {

        const token =
          subMatch[1];


        const