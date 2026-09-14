// ================================================
// WLVPN SIMPLE
// Cloudflare Worker
// ================================================


// ================================================
// НАСТРОЙКИ
// ================================================

const TRAFFIC_SOURCE_URL =
  "https://sub.datanode-internal.net/McjAzVPB2VRYcM6z";


const FAKE_UA =
  "Happ/4.3.0/Android/17877369741321921609";


// ================================================
// ПОЛУЧИТЬ HEADER
// ================================================

function getHeader(headers, name) {

  const target = name.toLowerCase();

  for (const [key, value] of Object.entries(headers)) {

    if (key.toLowerCase() === target) {
      return value;
    }

  }

  return null;
}


// // ================================================
// FETCH С ЗАЩИТОЙ ОТ РЕДИРЕКТ-ЦИКЛА + COOKIE JAR
// ================================================

async function fetchWithRedirectGuard(
  url,
  extraHeaders,
  maxRedirects = 6
) {

  const visited = new Set();

  let currentUrl = url;

  let cookies = "";

  let response = null;

  let sameUrlRetries = 0;

  for (let i = 0; i <= maxRedirects; i++) {

    // ------------------------------------------
    // Собираем заголовки запроса
    // ------------------------------------------

    const headers = { ...extraHeaders };

    if (cookies) {
      headers["Cookie"] = cookies;
    }

    // ------------------------------------------
    // Запрос с manual-редиректом
    // ------------------------------------------

    response = await fetch(currentUrl, {
      method: "GET",
      headers,
      redirect: "manual"
    });

    // ------------------------------------------
    // Сохраняем полученные cookies
    // ------------------------------------------

    const setCookies =
      typeof response.headers.getSetCookie === "function"
        ? response.headers.getSetCookie()
        : (response.headers.get("set-cookie")
            ? [response.headers.get("set-cookie")]
            : []);

    for (const raw of setCookies) {

      const pair = raw.split(";")[0].trim();

      if (!pair) continue;

      const name = pair.split("=")[0];

      // Убираем старую cookie с тем же именем
      const kept = cookies
        .split(";")
        .map(c => c.trim())
        .filter(c => c && !c.startsWith(name + "="));

      kept.push(pair);

      cookies = kept.join("; ");

    }

    // ------------------------------------------
    // Не редирект — выходим
    // ------------------------------------------

    if (response.status < 300 || response.status >= 400) {
      break;
    }

    const location = response.headers.get("location");

    if (!location) {
      break;
    }

    const next = new URL(location, currentUrl).toString();

    // ------------------------------------------
    // Редирект на тот же URL
    // ------------------------------------------

    if (next === currentUrl) {

      // Если пришла новая cookie — делаем повтор
      if (setCookies.length > 0 && sameUrlRetries < 3) {
        sameUrlRetries++;
        continue;
      }

      throw new Error(
        "Redirect loop detected (same URL, no new cookie): " +
        currentUrl
      );

    }

    // ------------------------------------------
    // Редирект на уже посещённый URL — цикл
    // ------------------------------------------

    if (visited.has(next)) {
      throw new Error(
        "Redirect loop detected: " +
        currentUrl + " -> " + next
      );
    }

    visited.add(currentUrl);

    currentUrl = next;

  }

  return { response, finalUrl: currentUrl };

}

// ================================================
// ПОЛУЧИТЬ ИСТОЧНИК ПОДПИСКИ
// ================================================

async function getSourceSubscription() {


  // ============================================
  // ПЕРВАЯ ПОПЫТКА
  // ============================================

  try {

    const { response } = await fetchWithRedirectGuard(
      TRAFFIC_SOURCE_URL,
      {
        "User-Agent": FAKE_UA,
        "Accept": "application/json, text/plain, */*",
        "Accept-Language": "ru-RU,ru;q=0.9,en;q=0.8"
      }
    );

    const rawHeaders = Object.fromEntries(
      response.headers.entries()
    );

    const rawBody = await response.text();

    // ==========================================
    // НЕПУСТОЙ ОТВЕТ
    // ==========================================

    if (rawBody && rawBody.trim()) {

      return {

        sourceStatus: response.status,

        rawHeaders,

        rawBody,

        errorMessage: ""

      };

    }

    // Если тело пустое —
    // идём на вторую попытку

  } catch (_) {

    // Сетевая ошибка или цикл —
    // идём на вторую попытку

  }


  // ============================================
  // ВТОРАЯ ПОПЫТКА
  // ============================================

  try {

    const { response } = await fetchWithRedirectGuard(
      TRAFFIC_SOURCE_URL,
      {
        "User-Agent": FAKE_UA
      }
    );

    const rawHeaders = Object.fromEntries(
      response.headers.entries()
    );

    const rawBody = await response.text();

    // ==========================================
    // ПРОВЕРКА ПУСТОГО ОТВЕТА
    // ==========================================

    if (!rawBody || !rawBody.trim()) {

      return {

        sourceStatus: response.status,

        rawHeaders,

        rawBody: "",

        errorMessage: "Источник вернул пустой ответ"

      };

    }

    return {

      sourceStatus: response.status,

      rawHeaders,

      rawBody,

      errorMessage: ""

    };

  } catch (error) {

    return {

      sourceStatus: 0,

      rawHeaders: {},

      rawBody: "",

      errorMessage: error.message || String(error)

    };

  }

}


// ================================================
// TRAFFIC
// ================================================

function updateSubscriptionUserinfo(sourceUserinfo) {

  let upload = "0";

  let download = "0";

  let total = "0";

  let expire = "";

  if (sourceUserinfo) {

    const params = sourceUserinfo.split(";");

    for (const param of params) {

      const index = param.indexOf("=");

      if (index === -1) {
        continue;
      }

      const key = param
        .slice(0, index)
        .trim()
        .toLowerCase();

      const value = param
        .slice(index + 1)
        .trim();

      if (key === "upload") {
        upload = value || "0";
      }

      if (key === "download") {
        download = value || "0";
      }

      if (key === "total") {
        total = value || "0";
      }

      if (key === "expire") {
        expire = value || "";
      }

    }

  }

  let result =
    "upload=" + upload +
    "; download=" + download +
    "; total=" + total;

  if (expire) {
    result += "; expire=" + expire;
  }

  return result;

}


// ================================================
// СОЗДАТЬ ОШИБКУ
// ================================================

function createErrorResponse(message) {

  return JSON.stringify({

    servers: [],

    message:
      message ||
      "Источник подписки временно недоступен"

  });

}


// ================================================
// MAIN WORKER
// ================================================

export default {

  async fetch(request) {

    const url = new URL(request.url);

    // ============================================
    // ПОЛУЧАЕМ ИСТОЧНИК
    // ============================================

    const source = await getSourceSubscription();

    // ============================================
    // DEBUG
    // ============================================

    if (url.pathname === "/debug") {

      return new Response(
        JSON.stringify(
          {

            sourceUrl: TRAFFIC_SOURCE_URL,

            sourceStatus: source.sourceStatus,

            error: source.errorMessage,

            headers: source.rawHeaders,

            body: source.rawBody

          },
          null,
          2
        ),
        {

          status: 200,

          headers: {

            "Content-Type": "application/json; charset=utf-8",

            "Cache-Control": "no-store"

          }

        }
      );

    }

    // ============================================
    // ОБЩИЕ HEADERS
    // ============================================

    const sourceUserinfo = getHeader(
      source.rawHeaders,
      "subscription-userinfo"
    );

    const outHeaders = {

      "Content-Type":

        getHeader(source.rawHeaders, "content-type") ||

        "application/json; charset=utf-8",

      "Access-Control-Allow-Origin": "*",

      "Cache-Control": "no-store",

      "Profile-Title": "wlvpn",

      "Profile-Update-Interval": "6",

      "Subscription-Userinfo":

        updateSubscriptionUserinfo(sourceUserinfo),

      "announce": "wlvpn"

    };

    // ============================================
    // ЕСЛИ ИСТОЧНИК НЕ ВЕРНУЛ ДАННЫЕ
    // ============================================

    if (!source.rawBody || !source.rawBody.trim()) {

      return new Response(
        createErrorResponse(
          source.errorMessage ||
          "Источник подписки временно недоступен"
        ),
        {

          status: 200,

          headers: outHeaders

        }
      );

    }

    // ============================================
    // ПРОПУСКАЕМ ВАЖНЫЕ HEADERS
    // ============================================

    const passthrough = [

      "profile-web-page-url",

      "support-url",

      "providerid",

      "hide-settings",

      "new-url"

    ];

    for (const name of passthrough) {

      const value = getHeader(source.rawHeaders, name);

      if (value) {

        const canonical = name
          .split("-")
          .map(
            part =>
              part.charAt(0).toUpperCase() +
              part.slice(1)
          )
          .join("-");

        outHeaders[canonical] = value;

      }

    }

    // ============================================
    // ОТДАЁМ КОНФИГ
    // ============================================

    return new Response(
      source.rawBody,
      {

        status: 200,

        headers: outHeaders

      }
    );

  }

};