// ================================================
// WLVPN CLOUDLFARE WORKER
// Browser = Website
// VPN Client = Subscription
// ================================================


// ================================================
// SETTINGS
// ================================================

const TRAFFIC_SOURCE_URL =
  "https://sub.datanode-internal.net/McjAzVPB2VRYcM6z";

const FAKE_UA =
  "INCY/3.6.5/android";


// ================================================
// VPN CLIENT DETECTION
// ================================================

function isVpnClient(userAgent) {

  const ua =
    (userAgent || "")
      .toLowerCase();

  const clients = [

    "incy",

    "happ",

    "v2raytun",

    "v2ray",

    "v2rayng",

    "sing-box",

    "singbox",

    "clash",

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
// FETCH SOURCE SUBSCRIPTION
// ================================================

async function getSourceSubscription() {

  let sourceStatus =
    0;

  let rawHeaders =
    {};

  let rawBody =
    "";


  try {

    // ============================================
    // FIRST REQUEST
    // ============================================

    const first =
      await fetch(
        TRAFFIC_SOURCE_URL,
        {
          method:
            "GET",

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


    // ============================================
    // HANDLE REDIRECT
    // ============================================

    if (
      status >= 300 &&
      status < 400
    ) {

      let cookie =
        "";


      const setCookie =
        first.headers.get(
          "set-cookie"
        );


      if (setCookie) {

        cookie =
          setCookie
            .split(";")[0];

      }


      const location =
        first.headers.get(
          "location"
        );


      // ==========================================
      // REDIRECT URL
      // ==========================================

      let nextUrl =
        TRAFFIC_SOURCE_URL;


      if (location) {

        nextUrl =
          new URL(
            location,
            TRAFFIC_SOURCE_URL
          ).toString();

      }


      // ==========================================
      // SECOND REQUEST
      // ==========================================

      const second =
        await fetch(
          nextUrl,
          {

            method:
              "GET",

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


    // ============================================
    // NORMAL RESPONSE
    // ============================================

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
// GET HEADER CASE INSENSITIVE
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
// GET SERVER COUNT
// Does NOT expose configs
// ================================================

function getServerCount(body) {

  if (!body) {
    return 0;
  }


  try {

    const data =
      JSON.parse(body);


    // JSON ARRAY

    if (
      Array.isArray(data)
    ) {

      return data.length;

    }


    // SERVERS

    if (
      Array.isArray(
        data.servers
      )
    ) {

      return data.servers.length;

    }


    // OUTBOUNDS

    if (
      Array.isArray(
        data.outbounds
      )
    ) {

      return data.outbounds.length;

    }

  }


  catch {

    // ============================================
    // VLESS / VMESS / TROJAN LINKS
    // ============================================

    const lines =
      body
        .split(/\r?\n/)
        .filter(
          line =>
            line.trim()
        );


    return lines.length;

  }


  return 0;

}


// ================================================
// GET SERVER NAMES ONLY
// NEVER RETURN CONFIGS
// ================================================

function getServerNames(body) {

  const names =
    [];


  if (!body) {

    return names;

  }


  try {

    const data =
      JSON.parse(body);


    if (
      Array.isArray(data)
    ) {

      for (
        const server
        of data
      ) {

        if (
          server &&
          typeof server ===
          "object"
        ) {

          names.push(
            server.name ||
            server.tag ||
            server.remarks ||
            "VPN Server"
          );

        }

      }

    }


    else if (
      Array.isArray(
        data.servers
      )
    ) {

      for (
        const server
        of data.servers
      ) {

        names.push(
          server.name ||
          server.tag ||
          server.remarks ||
          "VPN Server"
        );

      }

    }

  }


  catch {

    // ============================================
    // EXTRACT NAMES FROM URL FRAGMENTS
    // vless://...#Germany
    // ============================================

    const lines =
      body
        .split(/\r?\n/)
        .filter(
          line =>
            line.trim()
        );


    for (
      let i = 0;
      i < lines.length;
      i++
    ) {

      const line =
        lines[i]
          .trim();


      let name =
        "VPN Server " +
        (
          i + 1
        );


      try {

        const hashIndex =
          line.indexOf("#");


        if (
          hashIndex !== -1
        ) {

          name =
            decodeURIComponent(
              line.slice(
                hashIndex + 1
              )
            );

        }

      }


      catch {}


      // ==========================================
      // LIMIT NAME LENGTH
      // ==========================================

      name =
        name
          .replace(
            /[<>]/g,
            ""
          )
          .slice(
            0,
            80
          );


      names.push(name);

    }

  }


  return names;

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
// WEBSITE
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

<title>wlvpn — стабильный VPN</title>


<style>


/* ========================================
RESET
======================================== */

* {

margin: 0;
padding: 0;

box-sizing:
border-box;

}


/* ========================================
BODY
======================================== */

body {

min-height:
100vh;

font-family:
Arial,
sans-serif;

color:
#ffffff;

overflow-x:
hidden;

background:
#080808;

}


/* ========================================
LIQUID BACKGROUND
======================================== */

.blob {

position:
fixed;

border-radius:
50%;

filter:
blur(100px);

opacity:
0.25;

pointer-events:
none;

animation:
liquid
12s
infinite
ease-in-out;

}


.blob1 {

width:
450px;

height:
450px;

background:
#ffffff;

top:
-200px;

left:
-150px;

}


.blob2 {

width:
400px;

height:
400px;

background:
#777777;

top:
30%;

right:
-200px;

animation-delay:
-4s;

}


.blob3 {

width:
500px;

height:
500px;

background:
#444444;

bottom:
-300px;

left:
30%;

animation-delay:
-8s;

}


@keyframes liquid {

0%,
100% {

transform:
translate(0, 0)
scale(1);

}

50% {

transform:
translate(60px, -50px)
scale(1.15);

}

}


/* ========================================
CONTAINER
======================================== */

.container {

position:
relative;

z-index:
2;

width:
100%;

max-width:
1200px;

min-height:
100vh;

margin:
auto;

padding:
24px;

}


/* ========================================
NAVIGATION
======================================== */

nav {

display:
flex;

align-items:
center;

justify-content:
space-between;

padding:
16px 20px;

border-radius:
24px;

background:
rgba(
255,
255,
255,
0.07
);

border:
1px
solid
rgba(
255,
255,
255,
0.14
);

backdrop-filter:
blur(30px);

-webkit-backdrop-filter:
blur(30px);

}


.logo {

font-size:
22px;

font-weight:
700;

letter-spacing:
-0.5px;

}


.status {

display:
flex;

align-items:
center;

gap:
8px;

font-size:
14px;

color:
#b5b5b5;

}


.dot {

width:
8px;

height:
8px;

border-radius:
50%;

background:
#ffffff;

box-shadow:
0
0
12px
rgba(
255,
255,
255,
0.8
);

}


/* ========================================
HERO
======================================== */

.hero {

min-height:
75vh;

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

}


/* ========================================
GLASS
======================================== */

.glass {

width:
100%;

max-width:
900px;

padding:
70px
35px;

border-radius:
36px;

background:

linear-gradient(
135deg,

rgba(
255,
255,
255,
0.12
),

rgba(
255,
255,
255,
0.03
)

);

border:

1px
solid
rgba(
255,
255,
255,
0.18
);

backdrop-filter:

blur(35px)
saturate(150%);

-webkit-backdrop-filter:

blur(35px)
saturate(150%);

box-shadow:

inset
0
1px
0
rgba(
255,
255,
255,
0.12
),

0
30px
100px
rgba(
0,
0,
0,
0.6
);

}


/* ========================================
BADGE
======================================== */

.badge {

display:
inline-flex;

padding:
9px
16px;

border-radius:
50px;

background:
rgba(
255,
255,
255,
0.08
);

border:
1px
solid
rgba(
255,
255,
255,
0.12
);

color:
#bdbdbd;

font-size:
12px;

letter-spacing:
1px;

margin-bottom:
25px;

}


/* ========================================
TITLE
======================================== */

h1 {

font-size:
clamp(
64px,
12vw,
120px
);

letter-spacing:
-7px;

line-height:
0.9;

margin-bottom:
28px;

background:

linear-gradient(
180deg,

#ffffff,

#8c8c8c
);

-webkit-background-clip:
text;

background-clip:
text;

-webkit-text-fill-color:
transparent;

}


/* ========================================
DESCRIPTION
======================================== */

.description {

max-width:
580px;

margin:
auto;

color:
#a8a8a8;

font-size:
18px;

line-height:
1.7;

}


/* ========================================
BUTTONS
======================================== */

.buttons {

display:
flex;

justify-content:
center;

gap:
12px;

flex-wrap:
wrap;

margin-top:
38px;

}


.btn {

display:
inline-flex;

align-items:
center;

justify-content:
center;

min-width:
160px;

padding:
15px
25px;

border-radius:
16px;

text-decoration:
none;

font-size:
15px;

font-weight:
600;

transition:
all
0.25s
ease;

}


.primary {

background:
#ffffff;

color:
#000000;

}


.primary:hover {

transform:
translateY(-4px);

box-shadow:
0
15px
40px
rgba(
255,
255,
255,
0.15
);

}


.secondary {

color:
#ffffff;

background:
rgba(
255,
255,
255,
0.07
);

border:
1px
solid
rgba(
255,
255,
255,
0.14
);

}


.secondary:hover {

transform:
translateY(-4px);

background:
rgba(
255,
255,
255,
0.12
);

}


/* ========================================
STATS
======================================== */

.stats {

display:
flex;

justify-content:
center;

gap:
14px;

flex-wrap:
wrap;

margin-top:
45px;

}


.stat {

min-width:
165px;

padding:
20px;

border-radius:
22px;

background:
rgba(
255,
255,
255,
0.06
);

border:
1px
solid
rgba(
255,
255,
255,
0.10
);

backdrop-filter:
blur(20px);

}


.stat-value {

font-size:
18px;

font-weight:
700;

color:
#ffffff;

}


.stat-title {

margin-top:
7px;

font-size:
12px;

color:
#858585;

}


/* ========================================
SERVERS
======================================== */

.servers {

width:
100%;

max-width:
900px;

margin:
20px
auto
60px;

padding:
25px;

border-radius:
28px;

background:
rgba(
255,
255,
255,
0.05
);

border:
1px
solid
rgba(
255,
255,
255,
0.10
);

backdrop-filter:
blur(25px);

}


.servers-title {

font-size:
20px;

font-weight:
700;

margin-bottom:
18px;

text-align:
left;

}


.server-list {

display:
flex;

flex-direction:
column;

gap:
10px;

}


.server {

display:
flex;

align-items:
center;

justify-content:
space-between;

padding:
16px;

border-radius:
16px;

background:
rgba(
255,
255,
255,
0.05
);

border:
1px
solid
rgba(
255,
255,
255,
0.08
);

}


.server-name {

font-size:
15px;

font-weight:
600;

overflow:
hidden;

text-overflow:
ellipsis;

white-space:
nowrap;

max-width:
70%;

}


.server-ping {

font-size:
13px;

color:
#a8a8a8;

}


/* ========================================
FOOTER
======================================== */

footer {

text-align:
center;

padding:
30px
0
10px;

font-size:
13px;

color:
#666666;

}


/* ========================================
MOBILE
======================================== */

@media (
max-width:
600px
) {

.container {

padding:
14px;

}


nav {

padding:
14px
16px;

border-radius:
18px;

}


.status {

font-size:
12px;

}


.glass {

padding:
55px
20px;

border-radius:
28px;

}


h1 {

letter-spacing:
-4px;

}


.description {

font-size:
16px;

}


.stat {

min-width:
140px;

}


.server {

padding:
14px;

}

}


</style>

</head>


<body>


<!-- BACKGROUND -->

<div
class="blob blob1"
></div>

<div
class="blob blob2"
></div>

<div
class="blob blob3"
></div>


<div
class="container"
>


<!-- NAV -->

<nav>


<div
class="logo"
>

🏳 wlvpn

</div>


<div
class="status"
>

<div
class="dot"
></div>

Пинг:

<span
id="ping"
>

...

</span>

</div>


</nav>


<!-- HERO -->

<main
class="hero"
>


<div
class="glass"
>


<div
class="badge"
>

СТАБИЛЬНЫЙ VPN СЕРВИС

</div>


<h1>

wlvpn

</h1>


<div
class="description"
>

Быстрый, приватный и стабильный VPN.

Подключайся за секунды
и пользуйся интернетом
без лишних ограничений.

</div>


<div
class="buttons"
>


<a

class="btn primary"

href="https://t.me/snokuy"

target="_blank"

>

Telegram

</a>


<a

class="btn secondary"

href="#servers"

>

Серверы

</a>


</div>


<div
class="stats"
>


<div
class="stat"
>

<div
class="stat-value"
id="pingCard"
>

...

</div>

<div
class="stat-title"
>

Пинг сайта

</div>

</div>


<div
class="stat"
>

<div
class="stat-value"
id="serverCount"
>

...

</div>

<div
class="stat-title"
>

Серверов

</div>

</div>


<div
class="stat"
>

<div
class="stat-value"
>

Защищено

</div>

<div
class="stat-title"
>

Соединение

</div>

</div>


</div>


</div>


</main>


<!-- SERVERS -->

<section
class="servers"
id="servers"
>


<div
class="servers-title"
>

🌐 Серверы wlvpn

</div>


<div
class="server-list"
id="serverList"
>

<div
class="server"
>

<div
class="server-name"
>

Загрузка серверов...

</div>

</div>

</div>


</section>


<!-- FOOTER -->

<footer>

© 2026 wlvpn · стабильное подключение

</footer>


</div>


<script>


// ========================================
// WEBSITE PING
// ========================================

async function checkPing() {


const pingElement =
document.getElementById(
"ping"
);


const pingCard =
document.getElementById(
"pingCard"
);


const start =
performance.now();


try {


await fetch(

"/ping?t=" +
Date.now(),

{

method:
"GET",

cache:
"no-store"

}

);


const end =
performance.now();


const ping =
Math.round(
end - start
);


pingElement.textContent =
ping +
" ms";


pingCard.textContent =
ping +
" ms";


}


catch {


pingElement.textContent =
"Ошибка";


pingCard.textContent =
"Недоступен";


}


}


// ========================================
// LOAD SERVERS
// ========================================

async function loadServers() {


const list =
document.getElementById(
"serverList"
);


const count =
document.getElementById(
"serverCount"
);


try {


const response =
await fetch(
"/api/servers",
{
cache:
"no-store"
}
);


const data =
await response.json();


count.textContent =
data.count ||
0;


list.innerHTML =
"";


if (

!data.servers ||

!data.servers.length

) {


list.innerHTML =

'<div class="server">' +

'<div class="server-name">' +

'Серверы временно недоступны' +

'</div>' +

'</div>';


return;

}


data.servers.forEach(
(
server,
index
) => {


const item =
document.createElement(
"div"
);


item.className =
"server";


const name =
document.createElement(
"div"
);


name.className =
"server-name";


name.textContent =
server;


const ping =
document.createElement(
"div"
);


ping.className =
"server-ping";


ping.textContent =
"● VPN";


item.appendChild(
name
);


item.appendChild(
ping
);


list.appendChild(
item
);


}
);


}


catch {


count.textContent =
"?";


list.innerHTML =

'<div class="server">' +

'<div class="server-name">' +

'Не удалось загрузить серверы' +

'</div>' +

'</div>';


}


}


// ========================================
// START
// ========================================

checkPing();


loadServers();


// ========================================
// UPDATE PING
// ========================================

setInterval(
checkPing,
5000
);


// ========================================
// UPDATE SERVER LIST
// ========================================

setInterval(
loadServers,
30000
);


</script>


</body>

</html>`;

}


// ================================================
// MAIN WORKER
// ================================================

export default {


// ==============================================
// FETCH
// ==============================================

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


// ==============================================
// PING ENDPOINT
// ==============================================

if (
url.pathname ===
"/ping"
) {


return new Response(
"pong",
{
headers: {

"Content-Type":
"text/plain",

"Cache-Control":
"no-store"

}
}
);


}


// ==============================================
// SERVER API
// Names only
// NEVER configs
// ==============================================

if (
url.pathname ===
"/api/servers"
) {


const source =
await getSourceSubscription();


const names =
getServerNames(
source.rawBody
);


const count =
getServerCount(
source.rawBody
);


// ============================================
// REMOVE DUPLICATES
// ============================================

const uniqueNames =
[
...new Set(
names
)
].slice(
0,
50
);


return Response.json(
{

count:

count ||
uniqueNames.length,

servers:
uniqueNames

},
{

headers: {

"Cache-Control":
"no-store"

}

}
);


}


// ==============================================
// DEBUG
// ==============================================

if (

url.pathname ===
"/debug"

||

url.searchParams.get(
"debug"
) ===
"1"

) {


const source =
await getSourceSubscription();


return Response.json(
{

worker:
"WLVPN",

userAgent,

sourceStatus:
source.sourceStatus,

serverCount:
getServerCount(
source.rawBody
),

headers:
source.rawHeaders,

bodyPreview:
source.rawBody.slice(
0,
2000
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


// ==============================================
// VPN CLIENT
// ==============================================

if (
isVpnClient(
userAgent
)
) {


const source =
await getSourceSubscription();


// ============================================
// SOURCE ERROR
// ============================================

if (

source.sourceStatus < 200

||

source.sourceStatus >= 400

) {


return new Response(
source.rawBody ||
"Subscription source error",
{

status:
502,

headers: {

"Content-Type":
"text/plain; charset=utf-8",

"Cache-Control":
"no-store"

}

}
);

}


// ============================================
// OUTPUT HEADERS
// ============================================

const outHeaders =
{

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
"wlvpn",


"Profile-Update-Interval":
"6",


"announce":
"🏳 wlvpn | Стабильный VPN Сервис 🚀"

};


// ============================================
// PASSTHROUGH HEADERS
// ============================================

const PASSTHROUGH =
[

"profile-web-page-url",

"support-url",

"providerid",

"subscription-userinfo",

"hide-settings",

"new-url"

];


// ============================================
// COPY HEADERS
// ============================================

for (
const name
of PASSTHROUGH
) {


const value =
getHeader(
source.rawHeaders,
name
);


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


// ============================================
// RETURN SUBSCRIPTION
// ============================================

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


// ==============================================
// BROWSER
// ==============================================

return new Response(
getWebsite(),
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


};