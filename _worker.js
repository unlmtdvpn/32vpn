// ========================================
// WLVPN WORKER v2.2
// ========================================

// ИСХОДНАЯ ПОДПИСКА

const TRAFFIC_SOURCE_URL =
  "https://sub.datanode-internal.net/McjAzVPB2VRYcM6z";

const FAKE_UA = "INCY/3.6.5/android";


// ========================================
// GENERATE ID
// ========================================

function generateId() {
  return crypto.randomUUID();
}


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


// ========================================
// ESCAPE HTML
// ========================================

function escapeHtml(text) {

  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

}


// ========================================
// VPN CLIENT DETECTION
// ========================================

function isVpnClient(request) {

  const userAgent =
    (
      request.headers.get("User-Agent") ||
      ""
    )
      .toLowerCase();


  const clients = [

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

    "quantumult"

  ];


  return clients.some(
    client =>
      userAgent.includes(client)
  );

}


// ========================================
// KV GET
// ========================================

async function getSubscriptions(env) {

  if (!env.KV) {

    throw new Error(
      "KV binding не подключен"
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

    return JSON.parse(data);

  }

  catch {

    return [];

  }

}


// ========================================
// KV SAVE
// ========================================

async function saveSubscriptions(
  env,
  subscriptions
) {

  if (!env.KV) {

    throw new Error(
      "KV binding не подключен"
    );

  }


  await env.KV.put(
    "subscriptions",
    JSON.stringify(
      subscriptions
    )
  );

}


// ========================================
// SUB STATUS
// ========================================

function getSubscriptionStatus(sub) {

  if (!sub.enabled) {

    return "disabled";

  }


  if (
    sub.expiresAt &&
    Date.now() >
    Number(sub.expiresAt)
  ) {

    return "expired";

  }


  return "active";

}


// ========================================
// DAYS LEFT
// ========================================

function getDaysLeft(expiresAt) {

  if (!expiresAt) {
    return null;
  }


  const difference =
    Number(expiresAt) -
    Date.now();


  if (difference <= 0) {
    return 0;
  }


  return Math.ceil(
    difference /
    86400000
  );

}


// ========================================
// FORMAT DATE
// ========================================

function formatDate(timestamp) {

  if (!timestamp) {
    return "Без срока";
  }


  try {

    return new Date(
      Number(timestamp)
    ).toLocaleString(
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

  catch {

    return "Неизвестно";

  }

}


// ========================================
// GET SOURCE SUBSCRIPTION
// ORIGINAL REDIRECT + COOKIE METHOD
// ========================================

async function getSourceSubscription() {

  let sourceStatus = 0;

  let rawHeaders = {};

  let rawBody = "";


  try {

    // ====================================
    // FIRST REQUEST
    // ====================================

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
            cacheTtl: 0
          }
        }
      );


    let status =
      first.status;


    let headers =
      Object.fromEntries(
        first.headers.entries()
      );


    let body = "";


    // ====================================
    // REDIRECT
    // ====================================

    if (
      status >= 300 &&
      status < 400
    ) {

      let cookie = "";


      // Ищем cookie

      for (
        const [key, value]
        of Object.entries(headers)
      ) {

        if (
          key
            .toLowerCase() ===
          "set-cookie"
        ) {

          cookie =
            value
              .split(";")[0];

          break;

        }

      }


      // ==================================
      // SECOND REQUEST
      // ==================================

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
                : {}
              )

            },

            redirect:
              "manual",

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


    // ====================================
    // NO REDIRECT
    // ====================================

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
      0;

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


// ========================================
// BASE64 DECODE
// ========================================

function decodeBase64(text) {

  try {

    let value =
      text
        .trim()
        .replace(/-/g, "+")
        .replace(/_/g, "/");


    while (
      value.length % 4
    ) {

      value += "=";

    }


    return atob(value);

  }

  catch {

    return null;

  }

}


// ========================================
// BASE64 ENCODE
// ========================================

function encodeBase64(text) {

  try {

    return btoa(text);

  }

  catch {

    return text;

  }

}


// ========================================
// DETECT SUB FORMAT
// ========================================

function decodeSubscription(body) {

  const text =
    String(body || "")
      .trim();


  // Обычный текст

  if (

    text.includes("vless://") ||

    text.includes("vmess://") ||

    text.includes("trojan://") ||

    text.includes("ss://")

  ) {

    return {

      content:
        text,

      encoded:
        false

    };

  }


  // Пробуем Base64

  const decoded =
    decodeBase64(text);


  if (

    decoded &&

    (

      decoded.includes(
        "vless://"
      ) ||

      decoded.includes(
        "vmess://"
      ) ||

      decoded.includes(
        "trojan://"
      ) ||

      decoded.includes(
        "ss://"
      )

    )

  ) {

    return {

      content:
        decoded,

      encoded:
        true

    };

  }


  // Неизвестный формат

  return {

    content:
      text,

    encoded:
      false

  };

}


// ========================================
// CHECK GERMANY / SWEDEN
// ========================================

function isNormalServer(line) {

  const value =
    String(line)
      .toLowerCase();


  const germany = [

    "germany",

    "deutschland",

    "германия",

    "🇩🇪",

    "frankfurt",

    "berlin",

    "nuremberg",

    "düsseldorf",

    "dusseldorf"

  ];


  const sweden = [

    "sweden",

    "sverige",

    "швеция",

    "🇸🇪",

    "stockholm",

    "gothenburg"

  ];


  return (

    germany.some(
      item =>
        value.includes(item)
    )

    ||

    sweden.some(
      item =>
        value.includes(item)
    )

  );

}


// ========================================
// NORMAL FILTER
// ========================================

function filterNormalSubscription(body) {

  const decoded =
    decodeSubscription(body);


  const lines =
    decoded.content
      .split(/\r?\n/)
      .map(
        line =>
          line.trim()
      )
      .filter(Boolean);


  // Ищем Германию и Швецию

  let allowed =
    lines.filter(
      line =>
        isNormalServer(line)
    );


  // Оставляем максимум 2

  allowed =
    allowed.slice(0, 2);


  // Если страны не найдены,
  // берём первые два сервера

  if (
    allowed.length === 0
  ) {

    allowed =
      lines
        .filter(
          line =>

            line.startsWith(
              "vless://"
            )

            ||

            line.startsWith(
              "vmess://"
            )

            ||

            line.startsWith(
              "trojan://"
            )

            ||

            line.startsWith(
              "ss://"
            )

        )
        .slice(0, 2);

  }


  const result =
    allowed.join("\n");


  // Если источник Base64

  if (
    decoded.encoded
  ) {

    return encodeBase64(
      result
    );

  }


  return result;

}


// ========================================
// PLACEHOLDER SERVER
// ========================================

function getPlaceholderSubscription(
  name
) {

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


// ========================================
// SUBSCRIPTION INFO PAGE
// BROWSER ONLY
// ========================================

function getSubscriptionPage(sub) {

  const status =
    getSubscriptionStatus(sub);


  let statusText =
    "🟢 Подписка активна";


  let statusClass =
    "active";


  if (
    status === "disabled"
  ) {

    statusText =
      "🔴 Подписка отключена 🚫";

    statusClass =
      "disabled";

  }


  if (
    status === "expired"
  ) {

    statusText =
      "⏰ Подписка истекла 🚫";

    statusClass =
      "expired";

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

    if (
      days <= 0
    ) {

      daysText =
        "Срок истёк";

    }

    else {

      daysText =
        days +
        " дней";

    }

  }


  const planText =
    sub.plan === "premium"

      ? "⭐ PREMIUM — Все серверы"

      : "🟢 NORMAL — Германия + Швеция";


  return `<!DOCTYPE html>

<html lang="ru">

<head>

<meta charset="UTF-8">

<meta
name="viewport"
content="width=device-width,initial-scale=1.0"
>

<title>
${escapeHtml(sub.name)} — WLVPN
</title>

<style>

* {
  box-sizing: border-box;
}

body {

  margin: 0;

  min-height: 100vh;

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
    #141b2d;

  padding:
    30px;

  border-radius:
    24px;

  box-shadow:
    0 20px 80px
    rgba(0,0,0,.4);

}

.logo {

  color:
    #8298ff;

  font-weight:
    bold;

  margin-bottom:
    25px;

}

h1 {

  margin:
    0;

  font-size:
    28px;

  word-break:
    break-word;

}

.plan {

  margin-top:
    10px;

  color:
    #a2acc4;

}

.status {

  margin:
    25px 0;

  padding:
    16px;

  border-radius:
    14px;

}

.active {

  background:
    rgba(
      30,
      180,
      100,
      .15
    );

}

.disabled {

  background:
    rgba(
      255,
      70,
      70,
      .15
    );

}

.expired {

  background:
    rgba(
      255,
      170,
      40,
      .15
    );

}

.row {

  padding:
    15px 0;

  border-bottom:
    1px solid
    #242d42;

}

.label {

  color:
    #8490aa;

  font-size:
    13px;

}

.value {

  margin-top:
    5px;

}

.protect {

  margin-top:
    25px;

  padding:
    18px;

  background:
    #0d1321;

  border-radius:
    14px;

  text-align:
    center;

  color:
    #a2acc4;

}

.telegram {

  display:
    block;

  margin-top:
    20px;

  padding:
    15px;

  background:
    #5b7cff;

  color:
    white;

  text-align:
    center;

  border-radius:
    12px;

  text-decoration:
    none;

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

${planText}

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

${daysText}

</div>

</div>


<div class="protect">

🔒 Конфигурации серверов защищены

<br><br>

Содержимое VPN подписки
не отображается в браузере.

</div>


<a
class="telegram"
href="https://t.me/snokuy"
target="_blank"
>

Поддержка

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

  background:
    #090d18;

  color:
    white;

  font-family:
    Arial,
    sans-serif;

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

}

.logo {

  font-size:
    25px;

  font-weight:
    bold;

}

.admin {

  background:
    #1d263b;

  color:
    white;

  padding:
    10px 17px;

  border-radius:
    10px;

  text-decoration:
    none;

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

h1 {

  font-size:
    55px;

  margin:
    0;

}

p {

  color:
    #9ca8c3;

  font-size:
    18px;

}

.telegram {

  margin-top:
    20px;

  padding:
    15px 28px;

  background:
    #5b7cff;

  border-radius:
    12px;

  color:
    white;

  text-decoration:
    none;

}

footer {

  padding:
    25px;

  text-align:
    center;

  color:
    #65708a;

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
// ADMIN PANEL
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

  box-sizing:
    border-box;

}

body {

  margin: 0;

  padding: 20px;

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

.create {

  background:
    #141b2d;

  padding:
    20px;

  border-radius:
    18px;

  display:
    flex;

  flex-wrap:
    wrap;

  gap:
    10px;

  margin-bottom:
    25px;

}

input,
select {

  padding:
    13px;

  border:
    none;

  border-radius:
    10px;

  background:
    #202940;

  color:
    white;

}

input {

  flex:
    1;

  min-width:
    170px;

}

button {

  padding:
    12px 16px;

  border:
    none;

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
    #141b2d;

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
    #a2acc4;

}

.link {

  margin-top:
    12px;

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
    10px;

  margin-top:
    15px;

}

.disabled {

  opacity:
    .55;

}

.expired {

  border:
    1px solid
    #9a6720;

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
id="customDate"
type="datetime-local"
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
    document.createElement(
      "div"
    );

  div.textContent =
    String(text);

  return div.innerHTML;

}


async function api(
  path,
  options
) {

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

  }

  catch {

    data = {
      error:
        text
    };

  }


  if (
    !response.ok
  ) {

    throw new Error(
      data.error ||
      "Ошибка"
    );

  }


  return data;

}


function durationChanged() {

  var duration =
    document
      .getElementById(
        "duration"
      )
      .value;


  document
    .getElementById(
      "customDate"
    )
    .style
    .display =

      duration === "custom"

        ? "block"

        : "none";

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

  if (
    !sub.enabled
  ) {

    return {

      text:
        "🔴 Отключена",

      className:
        "disabled"

    };

  }


  if (

    sub.expiresAt &&

    Date.now() >
    Number(sub.expiresAt)

  ) {

    return {

      text:
        "⏰ Истекла",

      className:
        "expired"

    };

  }


  return {

    text:
      "🟢 Активна",

    className:
      ""

  };

}


async function load() {

  var list =
    document.getElementById(
      "list"
    );


  try {

    var data =
      await api(
        "/api/subscriptions"
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


    data.forEach(
      function(sub) {

        var status =
          getStatus(sub);


        var div =
          document.createElement(
            "div"
          );


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
                    Number(
                      sub.expiresAt
                    ) -
                    Date.now()
                  ) /
                  86400000
                )

              )

            : null;


        div.innerHTML =

          '<div class="name">' +

          escapeHtml(
            sub.name
          ) +

          '</div>' +


          '<div class="info">' +

          status.text +

          '</div>' +


          '<div class="info">' +

          (
            sub.plan === "premium"

              ? "⭐ PREMIUM — Все серверы"

              : "🟢 NORMAL — Германия + Швеция"
          ) +

          '</div>' +


          '<div class="info">' +

          'Создана: ' +

          formatDate(
            sub.createdAt
          ) +

          '</div>' +


          '<div class="info">' +

          'Истекает: ' +

          formatDate(
            sub.expiresAt
          ) +

          (
            days !== null

              ? ' · Осталось: ' +
                days +
                ' дн.'

              : ''
          ) +

          '</div>' +


          '<div class="link">' +

          escapeHtml(
            link
          ) +

          '</div>' +


          '<div class="actions">' +


          '<button onclick="copyLink(\\'' +

          sub.token +

          '\\')">' +

          'Копировать' +

          '</button>' +


          '<button onclick="renameSub(\\'' +

          sub.id +

          '\\')">' +

          'Переименовать' +

          '</button>' +


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

          '\\')">' +

          'Продлить' +

          '</button>' +


          '<button onclick="deleteSub(\\'' +

          sub.id +

          '\\')">' +

          'Удалить' +

          '</button>' +


          '</div>';


        list.appendChild(
          div
        );

      }
    );

  }


  catch(error) {

    list.innerHTML =

      '<p class="error">' +

      escapeHtml(
        error.message
      ) +

      '</p>';

  }

}


// ======================================
// CREATE
// ======================================

async function createSub() {

  var name =
    document
      .getElementById(
        "name"
      )
      .value
      .trim();


  var plan =
    document
      .getElementById(
        "plan"
      )
      .value;


  var duration =
    document
      .getElementById(
        "duration"
      )
      .value;


  var customDate =
    document
      .getElementById(
        "customDate"
      )
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

        headers: {

          "Content-Type":
            "application/json"

        },

        body:

          JSON.stringify({

            name:
              name,

            plan:
              plan,

            duration:
              duration,

            customDate:
              customDate

          })

      }
    );


    document
      .getElementById(
        "name"
      )
      .value =
        "";


    load();

  }


  catch(error) {

    alert(
      error.message
    );

  }

}


// ======================================
// COPY
// ======================================

async function copyLink(token) {

  var link =
    location.origin +
    "/sub/" +
    token;


  try {

    await navigator
      .clipboard
      .writeText(
        link
      );


    alert(
      "Ссылка скопирована"
    );

  }


  catch {

    prompt(
      "Скопируй ссылку:",
      link
    );

  }

}


// ======================================
// RENAME
// ======================================

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

        headers: {

          "Content-Type":
            "application/json"

        },

        body:

          JSON.stringify({

            name:
              name

          })

      }
    );


    load();

  }


  catch(error) {

    alert(
      error.message
    );

  }

}


// ======================================
// TOGGLE
// ======================================

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


  catch(error) {

    alert(
      error.message
    );

  }

}


// ======================================
// EXTEND
// ======================================

async function extendSub(id) {

  var days =
    prompt(
      "На сколько дней продлить?",
      "30"
    );


  if (!days) {
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

        headers: {

          "Content-Type":
            "application/json"

        },

        body:

          JSON.stringify({

            days:
              Number(days)

          })

      }
    );


    load();

  }


  catch(error) {

    alert(
      error.message
    );

  }

}


// ======================================
// DELETE
// ======================================

async function deleteSub(id) {

  if (
    !confirm(
      "Удалить подписку?"
    )
  ) {

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


  catch(error) {

    alert(
      error.message
    );

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

  async fetch(
    request,
    env
  ) {

    const url =
      new URL(
        request.url
      );


    // ====================================
    // ADMIN PAGE
    // ====================================

    if (
      url.pathname ===
      "/admin"
    ) {

      return new Response(
        getAdminPage(),
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


    // ====================================
    // API GET
    // ====================================

    if (

      url.pathname ===
      "/api/subscriptions"

      &&

      request.method ===
      "GET"

    ) {

      try {

        const subs =
          await getSubscriptions(
            env
          );


        return Response.json(
          subs
        );

      }


      catch(error) {

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


    // ====================================
    // API CREATE
    // ====================================

    if (

      url.pathname ===
      "/api/subscriptions"

      &&

      request.method ===
      "POST"

    ) {

      try {

        const data =
          await request.json();


        const name =
          String(
            data.name ||
            "WLVPN"
          )
            .trim();


        const plan =
          data.plan === "premium"

            ? "premium"

            : "normal";


        let expiresAt =
          null;


        // CUSTOM DATE

        if (
          data.duration ===
          "custom"
        ) {

          if (
            !data.customDate
          ) {

            return Response.json(
              {

                error:
                  "Выбери дату"

              },
              {

                status:
                  400

              }
            );

          }


          expiresAt =
            new Date(
              data.customDate
            ).getTime();


          if (
            !Number.isFinite(
              expiresAt
            )
          ) {

            return Response.json(
              {

                error:
                  "Неверная дата"

              },
              {

                status:
                  400

              }
            );

          }

        }


        // DAYS

        else {

          const days =
            Number(
              data.duration
            );


          if (
            Number.isFinite(
              days
            )

            &&

            days > 0
          ) {

            expiresAt =

              Date.now() +

              (
                days *
                86400000
              );

          }

        }


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


        subs.push(
          sub
        );


        await saveSubscriptions(
          env,
          subs
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


      catch(error) {

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


    // ====================================
    // API ID
    // ====================================

    const subApiMatch =
      url.pathname.match(
        /^\\/api\\/subscriptions\\/([^/]+)$/
      );


    // ====================================
    // RENAME
    // ====================================

    if (

      subApiMatch

      &&

      request.method ===
      "PUT"

    ) {

      try {

        const id =
          subApiMatch[1];


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
                "Подписка не найдена"

            },
            {

              status:
                404

            }
          );

        }


        const newName =
          String(
            data.name ||
            ""
          )
            .trim();


        if (newName) {

          sub.name =
            newName;

        }


        await saveSubscriptions(
          env,
          subs
        );


        return Response.json(
          {

            success:
              true

          }
        );

      }


      catch(error) {

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


    // ====================================
    // DELETE
    // ====================================

    if (

      subApiMatch

      &&

      request.method ===
      "DELETE"

    ) {

      try {

        const id =
          subApiMatch[1];


        let subs =
          await getSubscriptions(
            env
          );


        const before =
          subs.length;


        subs =
          subs.filter(
            s =>
              s.id !== id
          );


        if (
          subs.length ===
          before
        ) {

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


        await saveSubscriptions(
          env,
          subs
        );


        return Response.json(
          {

            success:
              true

          }
        );

      }


      catch(error) {

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


    // ====================================
    // TOGGLE
    // ====================================

    const toggleMatch =
      url.pathname.match(
        /^\\/api\\/subscriptions\\/([^/]+)\\/toggle$/
      );


    if (

      toggleMatch

      &&

      request.method ===
      "POST"

    ) {

      try {

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
          subs
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


      catch(error) {

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


    // ====================================
    // EXTEND
    // ====================================

    const extendMatch =
      url.pathname.match(
        /^\\/api\\/subscriptions\\/([^/]+)\\/extend$/
      );


    if (

      extendMatch

      &&

      request.method ===
      "POST"

    ) {

      try {

        const id =
          extendMatch[1];


        const data =
          await request.json();


        const days =
          Number(
            data.days
          );


        if (

          !Number.isFinite(
            days
          )

          ||

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
                "Подписка не найдена"

            },
            {

              status:
                404

            }
          );

        }


        const base =

          sub.expiresAt

          &&

          Number(
            sub.expiresAt
          ) >
          Date.now()

            ? Number(
                sub.expiresAt
              )

            : Date.now();


        sub.expiresAt =

          base +

          (
            days *
            86400000
          );


        await saveSubscriptions(
          env,
          subs
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


      catch(error) {

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


    // ====================================
    // SUBSCRIPTION
    // ====================================

    const subMatch =
      url.pathname.match(
        /^\\/sub\\/([^/]+)$/
      );


    if (
      subMatch
    ) {

      try {

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


        // ================================
        // NOT FOUND
        // ================================

        if (!sub) {

          if (
            isVpnClient(
              request
            )
          ) {

            return new Response(
              "Subscription not found",
              {

                status:
                  404,

                headers: {

                  "Content-Type":
                    "text/plain; charset=utf-8"

                }

              }
            );

          }


          return new Response(
            "<h1>Подписка не найдена</h1>",
            {

              status:
                404,

              headers: {

                "Content-Type":
                  "text/html; charset=utf-8"

              }

            }
          );

        }


        // ================================
        // BROWSER
        // ================================

        if (
          !isVpnClient(
            request
          )
        ) {

          return new Response(
            getSubscriptionPage(
              sub
            ),
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


        // ================================
        // STATUS
        // ================================

        const status =
          getSubscriptionStatus(
            sub
          );


        // ================================
        // DISABLED
        // ================================

        if (
          status ===
          "disabled"
        ) {

          return new Response(
            getPlaceholderSubscription(
              "Подписка отключена 🚫"
            ),
            {

              status:
                200,

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


        // ================================
        // EXPIRED
        // ================================

        if (
          status ===
          "expired"
        ) {

          return new Response(
            getPlaceholderSubscription(
              "Подписка истекла 🚫"
            ),
            {

              status:
                200,

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


        // ================================
        // GET SOURCE
        // ================================

        const source =
          await getSourceSubscription();


        // ================================
        // SOURCE ERROR
        // НЕ ВОЗВРАЩАЕМ HTTP 502
        // ================================

        if (

          !source.rawBody

          ||

          source.rawBody.startsWith(
            "FETCH ERROR:"
          )

        ) {

          return new Response(
            getPlaceholderSubscription(
              "Ошибка обновления ⚠️"
            ),
            {

              status:
                200,

              headers: {

                "Content-Type":
                  "text/plain; charset=utf-8",

                "Profile-Title":
                  "Ошибка обновления ⚠️",

                "Profile-Update-Interval":
                  "6",

                "Cache-Control":
                  "no-cache"

              }

            }
          );

        }


        // ================================
        // PREMIUM
        // ALL SERVERS
        // ================================

        let output =
          source.rawBody;


        // ================================
        // NORMAL
        // GERMANY + SWEDEN
        // ================================

        if (
          sub.plan ===
          "normal"
        ) {

          const filtered =
            filterNormalSubscription(
              source.rawBody
            );


          if (
            filtered
          ) {

            output =
              filtered;

          }

        }


        // ================================
        // HEADERS
        // ================================

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


        // ================================
        // PASSTHROUGH HEADERS
        // ================================

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


          if (
            value
          ) {

            const canon =
              name
                .split("-")
                .map(
                  word =>
                    word
                      .charAt(0)
                      .toUpperCase() +

                    word.slice(1)
                )
                .join("-");


            outHeaders[
              canon
            ] =
              value;

          }

        }


        // ================================
        // RETURN SUBSCRIPTION
        // ================================

        return new Response(
          output,
          {

            status:
              200,

            headers:
              outHeaders

          }
        );

      }


      catch(error) {

        // Всегда отдаём 200 клиенту

        return new Response(
          getPlaceholderSubscription(
            "Ошибка Worker ⚠️"
          ),
          {

            status:
              200,

            headers: {

              "Content-Type":
                "text/plain; charset=utf-8",

              "Profile-Title":
                "Ошибка Worker ⚠️",

              "Profile-Update-Interval":
                "6"

            }

          }
        );

      }

    }


    // ====================================
    // DEBUG
    // ====================================

    if (
      url.pathname ===
      "/debug"
    ) {

      return Response.json(
        {

          worker:
            "WLVPN",

          status:
            "OK",

          kvAvailable:
            !!env.KV,

          userAgent:
            request.headers.get(
              "User-Agent"
            ),

          isVpnClient:
            isVpnClient(
              request
            )

        },
        {

          headers: {

            "Cache-Control":
              "no-store"

          }

        }
      );

    }


    // ====================================
    // DEBUG SOURCE
    // ====================================

    if (
      url.pathname ===
      "/debug/source"
    ) {

      const source =
        await getSourceSubscription();


      return Response.json(
        {

          sourceUrl:
            TRAFFIC_SOURCE_URL,

          sourceStatus:
            source.sourceStatus,

          headers:
            source.rawHeaders,

          bodyLength:
            source.rawBody.length,

          bodyPreview:
            source.rawBody
              .slice(
                0,
                3000
              )

        },
        {

          headers: {

            "Cache-Control":
              "no-store"

          }

        }
      );

    }


    // ====================================
    // MAIN WEBSITE
    // ====================================

    return new Response(
      getWebsite(),
      {

        status:
          200,

        headers: {

          "Content-Type":
            "text/html; charset=utf-8",

          "Cache-Control":
            "no-cache"

        }

      }
    );

  }

};