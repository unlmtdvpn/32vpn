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

  // ============================================
  // ПЕРВАЯ ПОПЫТКА
  // ============================================

  try {

    const response =
      await fetch(
        TRAFFIC_SOURCE_URL,
        {
          method: "GET",

          headers: {
            "User-Agent": FAKE_UA,

            "Accept":
              "application/json, text/plain, */*",

            "Accept-Language":
              "ru-RU,ru;q=0.9,en;q=0.8"
          },

          redirect: "follow"
        }
      );


    const rawHeaders =
      Object.fromEntries(
        response.headers.entries()
      );


    const rawBody =
      await response.text();


    // ==========================================
    // НЕПУСТОЙ ОТВЕТ
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
    // ПЕРЕХОДИМ К RETRY
    // ==========================================

  } catch (_) {

    // Сетевая ошибка
    // Переходим ко второй попытке

  }


  // ============================================
  // ВТОРАЯ ПОПЫТКА
  // БЕЗ ДОПОЛНИТЕЛЬНЫХ HEADERS
  // ============================================

  try {

    const response =
      await fetch(
        TRAFFIC_SOURCE_URL,
        {
          headers: {

            "User-Agent":
              FAKE_UA

          },

          redirect:
            "follow"
        }
      );


    const rawHeaders =
      Object.fromEntries(
        response.headers.entries()
      );


    const rawBody =
      await response.text();


    return {

      sourceStatus:
        response.status,

      rawHeaders,

      rawBody,

      errorMessage:

        rawBody &&
        rawBody.trim()

          ? ""

          : "Источник вернул пустой ответ"

    };

  } catch (secondError) {

    return {

      sourceStatus:
        0,

      rawHeaders:
        {},

      rawBody:
        "",

      errorMessage:
        secondError.message ||
        String(secondError)

    };

  }

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
      sourceUserinfo.split(";");


    for (
      const param
      of params
    ) {

      const index =
        param.indexOf("=");


      if (
        index === -1
      ) {

        continue;

      }


      const key =
        param
          .slice(0, index)
          .trim()
          .toLowerCase();


      const value =
        param
          .slice(index + 1)
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
        ? "; expire=" + expire
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

<meta
name="theme-color"
content="#090909"
>

<title>wlvpn</title>


<style>

* {
  box-sizing:
    border-box;
}


html {

  min-height:
    100%;

}


body {

  margin:
    0;

  min-height:
    100vh;

  font-family:

    Inter,

    Arial,

    sans-serif;

  background:

    #090909;

  color:

    #ffffff;

  overflow-x:

    hidden;

}


body::before {

  content:

    "";

  position:

    fixed;

  width:

    600px;

  height:

    600px;

  top:

    -250px;

  left:

    50%;

  transform:

    translateX(-50%);

  background:

    radial-gradient(
      circle,
      rgba(255,255,255,.12),
      transparent 65%
    );

  pointer-events:

    none;

}


body::after {

  content:

    "";

  position:

    fixed;

  width:

    400px;

  height:

    400px;

  bottom:

    -200px;

  right:

    -100px;

  background:

    radial-gradient(
      circle,
      rgba(255,255,255,.06),
      transparent 70%
    );

  pointer-events:

    none;

}


header {

  position:

    relative;

  z-index:

    2;

  display:

    flex;

  justify-content:

    space-between;

  align-items:

    center;

  padding:

    24px 7%;

}


.logo {

  display:

    flex;

  align-items:

    center;

  gap:

    10px;

  font-size:

    21px;

  font-weight:

    700;

  letter-spacing:

    -.5px;

}


.logo-dot {

  width:

    10px;

  height:

    10px;

  border-radius:

    50%;

  background:

    #ffffff;

  box-shadow:

    0 0 20px
    rgba(255,255,255,.8);

}


.admin {

  color:

    #ffffff;

  text-decoration:

    none;

  font-size:

    14px;

  padding:

    11px 18px;

  border:

    1px solid
    rgba(255,255,255,.15);

  background:

    rgba(255,255,255,.05);

  backdrop-filter:

    blur(20px);

  border-radius:

    14px;

  transition:

    .2s;

}


.admin:hover {

  background:

    rgba(255,255,255,.12);

}


main {

  position:

    relative;

  z-index:

    1;

  min-height:

    calc(
      100vh - 160px
    );

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

    40px 20px;

}


.badge {

  display:

    flex;

  align-items:

    center;

  gap:

    8px;

  padding:

    9px 15px;

  border:

    1px solid
    rgba(255,255,255,.12);

  background:

    rgba(255,255,255,.05);

  backdrop-filter:

    blur(20px);

  border-radius:

    100px;

  font-size:

    13px;

  color:

    #bdbdbd;

  margin-bottom:

    28px;

}


.badge-dot {

  width:

    7px;

  height:

    7px;

  border-radius:

    50%;

  background:

    #ffffff;

}


h1 {

  margin:

    0;

  font-size:

    clamp(
      65px,
      14vw,
      150px
    );

  font-weight:

    800;

  letter-spacing:

    -8px;

  line-height:

    .9;

  background:

    linear-gradient(
      180deg,
      #ffffff,
      #777777
    );

  -webkit-background-clip:

    text;

  -webkit-text-fill-color:

    transparent;

}


.subtitle {

  max-width:

    600px;

  margin:

    30px auto 0;

  font-size:

    18px;

  line-height:

    1.7;

  color:

    #929292;

}


.buttons {

  display:

    flex;

  gap:

    12px;

  margin-top:

    35px;

  flex-wrap:

    wrap;

  justify-content:

    center;

}


.button {

  display:

    flex;

  align-items:

    center;

  justify-content:

    center;

  min-width:

    160px;

  padding:

    15px 24px;

  border-radius:

    16px;

  text-decoration:

    none;

  font-weight:

    600;

  transition:

    .2s;

}


.primary {

  background:

    #ffffff;

  color:

    #090909;

  box-shadow:

    0 10px 40px
    rgba(255,255,255,.12);

}


.primary:hover {

  transform:

    translateY(-2px);

  box-shadow:

    0 15px 50px
    rgba(255,255,255,.2);

}


.secondary {

  color:

    #ffffff;

  border:

    1px solid
    rgba(255,255,255,.14);

  background:

    rgba(255,255,255,.04);

  backdrop-filter:

    blur(20px);

}


.secondary:hover {

  background:

    rgba(255,255,255,.1);

}


.features {

  width:

    100%;

  max-width:

    850px;

  display:

    grid;

  grid-template-columns:

    repeat(
      3,
      1fr
    );

  gap:

    14px;

  margin-top:

    70px;

}


.feature {

  padding:

    25px;

  text-align:

    left;

  border-radius:

    22px;

  border:

    1px solid
    rgba(255,255,255,.09);

  background:

    linear-gradient(
      135deg,
      rgba(255,255,255,.07),
      rgba(255,255,255,.02)
    );

  backdrop-filter:

    blur(20px);

}


.feature-icon {

  font-size:

    25px;

  margin-bottom:

    15px;

}


.feature-title {

  font-weight:

    700;

  margin-bottom:

    8px;

}


.feature-text {

  font-size:

    14px;

  color:

    #8c8c8c;

  line-height:

    1.5;

}


footer {

  position:

    relative;

  z-index:

    2;

  display:

    flex;

  justify-content:

    space-between;

  padding:

    25px 7%;

  color:

    #555;

  font-size:

    13px;

}


footer a {

  color:

    #777;

  text-decoration:

    none;

}


@media (
  max-width: 700px
) {

  header {

    padding:

      20px;

  }


  h1 {

    letter-spacing:

      -4px;

  }


  .features {

    grid-template-columns:

      1fr;

    margin-top:

      50px;

  }


  footer {

    padding:

      20px;

  }

}

</style>

</head>


<body>


<header>

<div class="logo">

<div class="logo-dot"></div>

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


<div class="badge">

<div class="badge-dot"></div>

Стабильный VPN сервис

</div>


<h1>

wlvpn

</h1>


<p class="subtitle">

Быстрый, простой и современный VPN.
Подключайся и оставайся онлайн
без лишних ограничений.

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


<div class="features">


<div class="feature">

<div class="feature-icon">

⚡

</div>

<div class="feature-title">

Скорость

</div>

<div class="feature-text">

Быстрое подключение
и стабильная работа.

</div>

</div>


<div class="feature">

<div class="feature-icon">

◉

</div>

<div class="feature-title">

Пинг

</div>

<div class="feature-text">

Стабильное соединение
с низкой задержкой.

</div>

</div>


<div class="feature">

<div class="feature-icon">

◈

</div>

<div class="feature-title">

Защита

</div>

<div class="feature-text">

Современные технологии
для безопасного подключения.

</div>

</div>


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

  box-sizing:

    border-box;

}


body {

  margin:

    0;

  min-height:

    100vh;

  background:

    #090909;

  color:

    white;

  font-family:

    Arial,

    sans-serif;

}


.container {

  max-width:

    900px;

  margin:

    auto;

  padding:

    30px 20px;

}


.header {

  display:

    flex;

  justify-content:

    space-between;

  align-items:

    center;

  margin-bottom:

    40px;

}


.back {

  color:

    #888;

  text-decoration:

    none;

}


h1 {

  margin:

    0;

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

  width:

    100%;

  padding:

    15px;

  background:

    #151515;

  color:

    white;

  border:

    1px solid #292929;

  border-radius:

    14px;

  outline:

    none;

}


button {

  padding:

    13px 18px;

  border:

    none;

  border-radius:

    13px;

  background:

    white;

  color:

    black;

  font-weight:

    600;

  cursor:

    pointer;

}


.list {

  display:

    flex;

  flex-direction:

    column;

  gap:

    14px;

}


.item {

  padding:

    22px;

  border:

    1px solid #242424;

  border-radius:

    20px;

  background:

    #111111;

}


.name {

  font-size:

    20px;

  font-weight:

    bold;

}


.status {

  margin-top:

    10px;

  color:

    #999;

}


.link {

  margin-top:

    14px;

  padding:

    12px;

  background:

    #090909;

  border-radius:

    10px;

  color:

    #777;

  word-break:

    break-all;

  font-size:

    13px;

}


.actions {

  display:

    flex;

  flex-wrap:

    wrap;

  gap:

    8px;

  margin-top:

    15px;

}


.disabled {

  opacity:

    .5;

}


@media (
  max-width: 600px
) {

  .create {

    flex-direction:

      column;

  }

}

</style>

</head>


<body>


<div class="container">


<div class="header">

<h1>

wlvpn admin

</h1>


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


  if (
    !data.length
  ) {

    list.innerHTML =
      "<p style='color:#777'>Подписок пока нет</p>";

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
        .querySelector(
          ".copy"
        )
        .onclick =
          () =>
            copyLink(
              sub.token
            );


      div
        .querySelector(
          ".rename"
        )
        .onclick =
          () =>
            renameSub(
              sub.id
            );


      div
        .querySelector(
          ".toggle"
        )
        .onclick =
          () =>
            toggleSub(
              sub.id
            );


      div
        .querySelector(
          ".delete"
        )
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


async function copyLink(
  token
) {

  const link =
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

  } catch {

    prompt(
      "Скопируйте ссылку",
      link
    );

  }

}


async function renameSub(
  id
) {

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


async function toggleSub(
  id
) {

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


async function deleteSub(
  id
) {

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


function escapeHtml(
  text
) {

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
// СТРАНИЦА ПОДПИСКИ В БРАУЗЕРЕ
// ================================================

function getSubscriptionPage(sub) {

  const status =
    sub.enabled
      ? "Активна"
      : "Отключена";


  const statusIcon =
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

* {

  box-sizing:

    border-box;

}


body {

  margin:

    0;

  min-height:

    100vh;

  display:

    flex;

  align-items:

    center;

  justify-content:

    center;

  padding:

    20px;

  background:

    #090909;

  color:

    white;

  font-family:

    Arial,

    sans-serif;

}


.card {

  width:

    100%;

  max-width:

    500px;

  padding:

    40px;

  border-radius:

    25px;

  text-align:

    center;

  border:

    1px solid
    rgba(255,255,255,.1);

  background:

    rgba(255,255,255,.04);

}


.logo {

  font-size:

    28px;

  font-weight:

    bold;

}


.name {

  margin-top:

    35px;

  font-size:

    25px;

}


.status {

  margin-top:

    15px;

  color:

    #aaa;

}


.info {

  margin-top:

    30px;

  padding:

    18px;

  border-radius:

    15px;

  background:

    #111;

  color:

    #777;

  font-size:

    14px;

}


.telegram {

  display:

    inline-block;

  margin-top:

    25px;

  padding:

    13px 20px;

  border-radius:

    13px;

  background:

    white;

  color:

    black;

  text-decoration:

    none;

  font-weight:

    bold;

}

</style>

</head>


<body>


<div class="card">


<div class="logo">

🏳 wlvpn

</div>


<div class="name">

${escapeHtml(sub.name)}

</div>


<div class="status">

${statusIcon} ${status}

</div>


<div class="info">

Это VPN подписка wlvpn.
Для подключения откройте ссылку
в VPN клиенте.

</div>


<a
class="telegram"
href="https://t.me/snokyu"
target="_blank"
>

@snokyu

</a>


</div>


</body>

</html>`;

}


// ================================================
// СОЗДАТЬ ОТВЕТ ПОДПИСКИ
// ОБЩАЯ ЛОГИКА ДЛЯ VPN И DEBUG
// ================================================

async function buildSubscriptionResponse(
  env,
  token
) {

  const subscriptions =
    await getSubscriptions(
      env
    );


  const sub =
    subscriptions.find(
      item =>
        item.token === token
    );


  // ==========================================
  // NOT FOUND
  // ==========================================

  if (!sub) {

    return {

      found:
        false,

      sub:
        null,

      status:
        404,

      headers: {},

      body:
        "Subscription not found"

    };

  }


  // ==========================================
  // ПОЛУЧАЕМ ИСТОЧНИК
  // ==========================================

  const source =
    await getSourceSubscription();


  // ==========================================
  // USERINFO
  // ==========================================

  const sourceUserinfo =
    getHeader(
      source.rawHeaders,
      "subscription-userinfo"
    );


  // ==========================================
  // ОБЩИЕ HEADERS
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
      "🏳 wlvpn | Стабильный VPN"

  };


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
  // DISABLED
  // ==========================================

  if (
    !sub.enabled
  ) {

    outHeaders[
      "Profile-Title"
    ] =
      "Subscription disabled";


    // Если источник доступен
    // берём реальный сервер

    if (
      source.rawBody &&
      source.rawBody.trim()
    ) {

      return {

        found:
          true,

        sub,

        status:
          200,

        headers:
          outHeaders,

        body:
          createDisabledSubscription(
            source.rawBody
          )

      };

    }


    // Источник недоступен

    return {

      found:
        true,

      sub,

      status:
        200,

      headers:
        outHeaders,

      body:
        JSON.stringify(
          {

            servers: [],

            message:
              "Subscription disabled"

          }
        )

    };

  }


  // ==========================================
  // АКТИВНАЯ ПОДПИСКА
  // ИСТОЧНИК ПУСТОЙ
  // ==========================================

  if (
    !source.rawBody ||
    !source.rawBody.trim()
  ) {

    return {

      found:
        true,

      sub,

      status:
        200,

      headers:
        outHeaders,

      body:
        JSON.stringify(
          {

            servers: [],

            message:
              source.errorMessage ||
              "Источник подписки временно недоступен"

          }
        )

    };

  }


  // ==========================================
  // ВОЗВРАЩАЕМ СЕРВЕРЫ
  // ==========================================

  return {

    found:
      true,

    sub,

    status:
      200,

    headers:
      outHeaders,

    body:
      source.rawBody

  };

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

      const subscriptions =
        await getSubscriptions(
          env
        );


      return Response.json(
        subscriptions
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

      const id =
        toggleMatch[1];


      const subscriptions =
        await getSubscriptions(
          env
        );


      const sub =
        subscriptions.find(
          item =>
            item.id === id
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

        const id =
          idMatch[1];


        const data =
          await request.json();


        const subscriptions =
          await getSubscriptions(
            env
          );


        const sub =
          subscriptions.find(
            item =>
              item.id === id
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

      const id =
        idMatch[1];


      let subscriptions =
        await getSubscriptions(
          env
        );


      const exists =
        subscriptions.some(
          item =>
            item.id === id
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
            item.id !== id
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
    // DEBUG ПОДПИСКИ
    // ОТДАЁТ ТОЧНО ТО ЖЕ,
    // ЧТО ПОЛУЧАЕТ VPN КЛИЕНТ
    // ============================================

    const debugMatch =
      url.pathname.match(
        /^\/debug\/([^/]+)$/
      );


    if (debugMatch) {

      const token =
        debugMatch[1];


      const result =
        await buildSubscriptionResponse(
          env,
          token
        );


      // Debug показывает подписку
      // как обычный текст

      return new Response(
        result.body,
        {

          status:
            result.status,

          headers: {

            ...result.headers,

            "Content-Type":
              "text/plain; charset=utf-8",

            "Cache-Control":
              "no-store"

          }

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
            item.token === token
        );


      // ==========================================
      // NOT FOUND
      // ==========================================

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
      // VPN КЛИЕНТ
      // ==========================================

      const result =
        await buildSubscriptionResponse(
          env,
          token
        );


      return new Response(
        result.body,
        {

          status:
            result.status,

          headers:
            result.headers

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
        await getSubscriptions(
          env
        );


      return Response.json(
        {

          worker:
            "wlvpn",

          kvAvailable:
            !!env.KV,

          subscriptions:
            subscriptions.length,

          userAgent,

          usage:
            "/debug/ТОКЕН"

        }
      );

    }


    // ============================================
    // ГЛАВНАЯ СТРАНИЦА
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