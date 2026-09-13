// ============================================================
// WLVPN WORKER V2.2
// ============================================================
// D1 Binding: DB
// KV Binding: KV
//
// ADMIN URL:
// /admin
//
// ADMIN PASSWORD:
// 18032014
//
// PUBLIC:
// /
//
// SUBSCRIPTION:
// /sub/TOKEN
// /sub/TOKEN/base64
// /sub/TOKEN/info
//
// ============================================================


// =====================
// CONFIG
// =====================

const APP_NAME = "WLVPN";

const ADMIN_PASSWORD = "18032014";

const SESSION_TTL = 60 * 60 * 24 * 7;

const DEFAULT_SOURCE_URL =
  "https://sub.datanode-internal.net/McjAzVPB2VRYcM6z";

const DEFAULT_UA =
  "INCY/3.6.5/android";


// ============================================================
// MAIN WORKER
// ============================================================

export default {

  async fetch(request, env, ctx) {

    const url = new URL(request.url);


    // CORS

    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: corsHeaders()
      });
    }


    // API

    if (url.pathname.startsWith("/api/")) {
      return apiRouter(
        request,
        env,
        url
      );
    }


    // SUBSCRIPTION

    if (url.pathname.startsWith("/sub/")) {
      return subscriptionRouter(
        request,
        env,
        url
      );
    }


    // ADMIN

    if (url.pathname === "/admin") {
      return adminPage();
    }


    // HOME

    return homePage();

  },


  async scheduled(event, env, ctx) {

    // Обновление исходника каждые 30 минут

    if (event.cron === "*/30 * * * *") {

      ctx.waitUntil(
        updateSourceCache(env)
      );

    }


    // Добавление виртуального трафика каждый день

    if (event.cron === "0 0 * * *") {

      ctx.waitUntil(
        addDailyTraffic(env)
      );

    }

  }

};


// ============================================================
// CORS
// ============================================================

function corsHeaders() {

  return {

    "Access-Control-Allow-Origin": "*",

    "Access-Control-Allow-Methods":
      "GET, POST, PATCH, DELETE, OPTIONS",

    "Access-Control-Allow-Headers":
      "Content-Type"

  };

}


// ============================================================
// API ROUTER
// ============================================================

async function apiRouter(
  request,
  env,
  url
) {

  const path = url.pathname;


  // =========================
  // PUBLIC STATUS
  // =========================

  if (
    path === "/api/status" &&
    request.method === "GET"
  ) {

    return publicStatus(env);

  }


  // =========================
  // LOGIN
  // =========================

  if (
    path === "/api/login" &&
    request.method === "POST"
  ) {

    return login(
      request,
      env
    );

  }


  // =========================
  // LOGOUT
  // =========================

  if (
    path === "/api/logout" &&
    request.method === "POST"
  ) {

    return logout(
      request,
      env
    );

  }


  // =========================
  // AUTH CHECK
  // =========================

  if (
    path === "/api/admin/check"
  ) {

    const authorized =
      await isAdmin(
        request,
        env
      );


    return json({
      authorized
    });

  }


  // =========================
  // ADMIN AUTH
  // =========================

  const authorized =
    await isAdmin(
      request,
      env
    );


  if (!authorized) {

    return error(
      "Unauthorized",
      401
    );

  }


  // =========================
  // DASHBOARD
  // =========================

  if (
    path === "/api/admin/dashboard"
  ) {

    return dashboard(env);

  }


  // =========================
  // SOURCE
  // =========================

  if (
    path === "/api/admin/source" &&
    request.method === "GET"
  ) {

    return sourceInfo(env);

  }


  if (
    path === "/api/admin/source" &&
    request.method === "POST"
  ) {

    return updateSourceSettings(
      request,
      env
    );

  }


  if (
    path === "/api/admin/source/update" &&
    request.method === "POST"
  ) {

    const result =
      await updateSourceCache(env);


    return json(result);

  }


  if (
    path === "/api/admin/source/preview"
  ) {

    return sourcePreview(env);

  }


  // =========================
  // SUBSCRIPTIONS
  // =========================

  if (
    path === "/api/admin/subscriptions" &&
    request.method === "GET"
  ) {

    return getSubscriptions(env);

  }


  if (
    path === "/api/admin/subscriptions" &&
    request.method === "POST"
  ) {

    return createSubscription(
      request,
      env
    );

  }


  // =========================
  // SERVERS
  // =========================

  if (
    path === "/api/admin/servers" &&
    request.method === "GET"
  ) {

    return getServers(env);

  }


  if (
    path === "/api/admin/servers" &&
    request.method === "POST"
  ) {

    return createServer(
      request,
      env
    );

  }


  // =========================
  // IMPORT SERVERS
  // =========================

  if (
    path === "/api/admin/servers/import" &&
    request.method === "POST"
  ) {

    return importServers(
      request,
      env
    );

  }


  // =========================
  // SUBSCRIPTION BY ID
  // =========================

  const subMatch =
    path.match(
      /^\/api\/admin\/subscriptions\/([^/]+)$/
    );


  if (subMatch) {

    const id = subMatch[1];


    if (request.method === "GET") {
      return getSubscription(env, id);
    }


    if (request.method === "PATCH") {
      return updateSubscription(
        request,
        env,
        id
      );
    }


    if (request.method === "DELETE") {
      return deleteSubscription(
        env,
        id
      );
    }

  }


  // =========================
  // ADD TRAFFIC
  // =========================

  const trafficMatch =
    path.match(
      /^\/api\/admin\/subscriptions\/([^/]+)\/traffic$/
    );


  if (
    trafficMatch &&
    request.method === "POST"
  ) {

    return addTraffic(
      request,
      env,
      trafficMatch[1]
    );

  }


  // =========================
  // REGENERATE TOKEN
  // =========================

  const regenerateMatch =
    path.match(
      /^\/api\/admin\/subscriptions\/([^/]+)\/regenerate$/
    );


  if (
    regenerateMatch &&
    request.method === "POST"
  ) {

    return regenerateToken(
      env,
      regenerateMatch[1]
    );

  }


  // =========================
  // SUB SERVERS
  // =========================

  const subServersMatch =
    path.match(
      /^\/api\/admin\/subscriptions\/([^/]+)\/servers$/
    );


  if (
    subServersMatch &&
    request.method === "GET"
  ) {

    return getSubscriptionServers(
      env,
      subServersMatch[1]
    );

  }


  if (
    subServersMatch &&
    request.method === "POST"
  ) {

    return setSubscriptionServers(
      request,
      env,
      subServersMatch[1]
    );

  }


  // =========================
  // SERVER BY ID
  // =========================

  const serverMatch =
    path.match(
      /^\/api\/admin\/servers\/([^/]+)$/
    );


  if (serverMatch) {

    const id = serverMatch[1];


    if (request.method === "PATCH") {

      return updateServer(
        request,
        env,
        id
      );

    }


    if (request.method === "DELETE") {

      return deleteServer(
        env,
        id
      );

    }

  }


  return error(
    "Not found",
    404
  );

}


// ============================================================
// AUTH
// ============================================================

async function login(
  request,
  env
) {

  const data =
    await safeJson(request);


  const password =
    String(
      data.password || ""
    );


  // ПАРОЛЬ ПРОВЕРЯЕТСЯ ПРЯМО В КОДЕ

  if (
    password !== ADMIN_PASSWORD
  ) {

    return error(
      "Wrong password",
      401
    );

  }


  const session =
    crypto.randomUUID();


  await env.KV.put(

    "session:" + session,

    "1",

    {

      expirationTtl:
        SESSION_TTL

    }

  );


  return json(

    {

      success: true

    },

    200,

    {

      "Set-Cookie":

        `session=${session}; ` +

        "HttpOnly; " +

        "Secure; " +

        "SameSite=Lax; " +

        "Path=/; " +

        `Max-Age=${SESSION_TTL}`

    }

  );

}


async function logout(
  request,
  env
) {

  const session =
    getSessionId(request);


  if (session) {

    await env.KV.delete(
      "session:" + session
    );

  }


  return json(

    {
      success: true
    },

    200,

    {

      "Set-Cookie":
        "session=; Path=/; Max-Age=0"

    }

  );

}


async function isAdmin(
  request,
  env
) {

  const session =
    getSessionId(request);


  if (!session) {
    return false;
  }


  const exists =
    await env.KV.get(
      "session:" + session
    );


  return exists === "1";

}


function getSessionId(
  request
) {

  const cookie =
    request.headers.get(
      "Cookie"
    ) || "";


  const match =
    cookie.match(
      /session=([^;]+)/
    );


  return match
    ? match[1]
    : null;

}


// ============================================================
// SOURCE SETTINGS
// ============================================================

async function getSourceUrl(
  env
) {

  const result =
    await env.DB.prepare(

      `
      SELECT value
      FROM settings
      WHERE key = 'source_url'
      `

    )
    .first();


  return result?.value ||
    DEFAULT_SOURCE_URL;

}


async function getSourceUA(
  env
) {

  const result =
    await env.DB.prepare(

      `
      SELECT value
      FROM settings
      WHERE key = 'source_ua'
      `

    )
    .first();


  return result?.value ||
    DEFAULT_UA;

}


async function setSetting(
  env,
  key,
  value
) {

  await env.DB.prepare(

    `
    INSERT INTO settings (
      key,
      value
    )

    VALUES (?, ?)

    ON CONFLICT(key)

    DO UPDATE SET

    value = excluded.value
    `

  )
  .bind(
    key,
    value
  )
  .run();

}


// ============================================================
// SOURCE CACHE
// ============================================================

async function updateSourceCache(
  env
) {

  const sourceUrl =
    await getSourceUrl(env);


  const ua =
    await getSourceUA(env);


  try {

    const response =
      await fetch(

        sourceUrl,

        {

          headers: {

            "User-Agent": ua,

            "Accept": "*/*"

          },

          redirect: "follow"

        }

      );


    const text =
      await response.text();


    if (!response.ok) {

      return {

        success: false,

        status:
          response.status,

        error:
          "Source returned error"

      };

    }


    const configs =
      extractConfigs(text);


    await env.KV.put(

      "source:configs",

      configs.join("\n")

    );


    await env.KV.put(

      "source:meta",

      JSON.stringify({

        updated_at:
          new Date().toISOString(),

        status:
          response.status,

        configs:
          configs.length,

        size:
          text.length

      })

    );


    return {

      success: true,

      status:
        response.status,

      configs:
        configs.length

    };

  }

  catch (e) {

    return {

      success: false,

      error:
        e.message

    };

  }

}


async function sourceInfo(
  env
) {

  const meta =
    await env.KV.get(
      "source:meta"
    );


  return json({

    url:
      await getSourceUrl(env),

    user_agent:
      await getSourceUA(env),

    meta:

      meta
        ? JSON.parse(meta)
        : null

  });

}


async function updateSourceSettings(
  request,
  env
) {

  const data =
    await safeJson(request);


  if (data.url) {

    await setSetting(
      env,
      "source_url",
      String(data.url)
    );

  }


  if (data.user_agent) {

    await setSetting(
      env,
      "source_ua",
      String(data.user_agent)
    );

  }


  return json({
    success: true
  });

}


async function sourcePreview(
  env
) {

  const source =
    await env.KV.get(
      "source:configs"
    );


  return json({

    exists:
      !!source,

    configs:
      source
        ? extractConfigs(source).length
        : 0,

    preview:
      source
        ? source.slice(0, 3000)
        : ""

  });

}


// ============================================================
// SUBSCRIPTIONS
// ============================================================

async function getSubscriptions(
  env
) {

  const result =
    await env.DB.prepare(

      `
      SELECT *
      FROM subscriptions
      ORDER BY created_at DESC
      `

    )
    .all();


  return json(
    result.results || []
  );

}


async function getSubscription(
  env,
  id
) {

  const sub =
    await getSub(
      env,
      id
    );


  if (!sub) {

    return error(
      "Subscription not found",
      404
    );

  }


  return json(sub);

}


async function createSubscription(
  request,
  env
) {

  const data =
    await safeJson(request);


  const id =
    crypto.randomUUID();


  const token =
    generateToken();


  const name =
    String(
      data.name ||
      "WLVPN Subscription"
    );


  const trafficLimit =
    Number(
      data.traffic_limit_gb || 0
    );


  const useSource =
    data.use_source === false
      ? 0
      : 1;


  await env.DB.prepare(

    `
    INSERT INTO subscriptions (

      id,
      token,
      name,
      status,
      traffic_used_gb,
      traffic_bonus_gb,
      traffic_limit_gb,
      expires_at,
      use_source

    )

    VALUES (?, ?, ?, 'active', 0, 0, ?, ?, ?)
    `

  )
  .bind(

    id,

    token,

    name,

    trafficLimit,

    data.expires_at || null,

    useSource

  )
  .run();


  return json({

    success: true,

    id,

    token,

    url:
      "/sub/" + token

  });

}


async function updateSubscription(
  request,
  env,
  id
) {

  const data =
    await safeJson(request);


  const sub =
    await getSub(
      env,
      id
    );


  if (!sub) {

    return error(
      "Not found",
      404
    );

  }


  const name =
    data.name ??
    sub.name;


  const status =
    data.status ??
    sub.status;


  const limit =
    data.traffic_limit_gb ??
    sub.traffic_limit_gb;


  const expires =
    data.expires_at ??
    sub.expires_at;


  const useSource =
    data.use_source !== undefined

      ? (
          data.use_source
            ? 1
            : 0
        )

      : sub.use_source;


  await env.DB.prepare(

    `
    UPDATE subscriptions

    SET

      name = ?,
      status = ?,
      traffic_limit_gb = ?,
      expires_at = ?,
      use_source = ?,
      updated_at = CURRENT_TIMESTAMP

    WHERE id = ?
    `

  )
  .bind(

    name,

    status,

    limit,

    expires,

    useSource,

    id

  )
  .run();


  return json({
    success: true
  });

}


async function deleteSubscription(
  env,
  id
) {

  await env.DB.batch([

    env.DB.prepare(

      `
      DELETE FROM subscription_servers
      WHERE subscription_id = ?
      `

    )
    .bind(id),


    env.DB.prepare(

      `
      DELETE FROM traffic_history
      WHERE subscription_id = ?
      `

    )
    .bind(id),


    env.DB.prepare(

      `
      DELETE FROM subscriptions
      WHERE id = ?
      `

    )
    .bind(id)

  ]);


  return json({
    success: true
  });

}


async function regenerateToken(
  env,
  id
) {

  const token =
    generateToken();


  await env.DB.prepare(

    `
    UPDATE subscriptions

    SET

      token = ?,
      updated_at = CURRENT_TIMESTAMP

    WHERE id = ?
    `

  )
  .bind(
    token,
    id
  )
  .run();


  return json({

    success: true,

    token

  });

}


// ============================================================
// TRAFFIC
// ============================================================

async function addTraffic(
  request,
  env,
  id
) {

  const data =
    await safeJson(request);


  const amount =
    Number(
      data.amount_gb
    );


  if (
    !Number.isFinite(amount) ||
    amount <= 0
  ) {

    return error(
      "Invalid traffic amount"
    );

  }


  await env.DB.batch([

    env.DB.prepare(

      `
      UPDATE subscriptions

      SET

      traffic_bonus_gb =
      traffic_bonus_gb + ?

      WHERE id = ?
      `

    )
    .bind(
      amount,
      id
    ),


    env.DB.prepare(

      `
      INSERT INTO traffic_history (

        id,
        subscription_id,
        amount_gb,
        type

      )

      VALUES (?, ?, ?, ?)
      `

    )
    .bind(

      crypto.randomUUID(),

      id,

      amount,

      "manual"

    )

  ]);


  return json({
    success: true
  });

}


async function addDailyTraffic(
  env
) {

  const result =
    await env.DB.prepare(

      `
      SELECT id
      FROM subscriptions
      WHERE status = 'active'
      `

    )
    .all();


  const queries = [];


  for (
    const sub
    of result.results || []
  ) {

    const amount =
      randomTraffic();


    queries.push(

      env.DB.prepare(

        `
        UPDATE subscriptions

        SET

        traffic_bonus_gb =
        traffic_bonus_gb + ?

        WHERE id = ?
        `

      )
      .bind(
        amount,
        sub.id
      )

    );


    queries.push(

      env.DB.prepare(

        `
        INSERT INTO traffic_history (

          id,
          subscription_id,
          amount_gb,
          type

        )

        VALUES (?, ?, ?, 'daily')
        `

      )
      .bind(

        crypto.randomUUID(),

        sub.id,

        amount

      )

    );

  }


  if (queries.length > 0) {

    await env.DB.batch(
      queries
    );

  }

}


function randomTraffic() {

  return (
    Math.floor(
      Math.random() * 99
    ) + 1
  ) / 10;

}


// ============================================================
// SERVERS
// ============================================================

async function getServers(
  env
) {

  const result =
    await env.DB.prepare(

      `
      SELECT *
      FROM servers

      ORDER BY
      priority ASC,
      created_at DESC
      `

    )
    .all();


  return json(
    result.results || []
  );

}


async function createServer(
  request,
  env
) {

  const data =
    await safeJson(request);


  const vless =
    String(
      data.vless_url || ""
    ).trim();


  if (
    !vless.startsWith("vless://")
  ) {

    return error(
      "Only vless:// is supported"
    );

  }


  const id =
    crypto.randomUUID();


  const name =
    data.name ||
    getConfigName(vless) ||
    "WLVPN Server";


  await env.DB.prepare(

    `
    INSERT INTO servers (

      id,
      name,
      vless_url,
      enabled,
      priority

    )

    VALUES (?, ?, ?, ?, ?)
    `

  )
  .bind(

    id,

    name,

    vless,

    data.enabled === false
      ? 0
      : 1,

    Number(
      data.priority || 100
    )

  )
  .run();


  return json({

    success: true,

    id

  });

}


async function updateServer(
  request,
  env,
  id
) {

  const data =
    await safeJson(request);


  const old =
    await env.DB.prepare(

      `
      SELECT *
      FROM servers
      WHERE id = ?
      `

    )
    .bind(id)
    .first();


  if (!old) {

    return error(
      "Server not found",
      404
    );

  }


  await env.DB.prepare(

    `
    UPDATE servers

    SET

      name = ?,
      vless_url = ?,
      enabled = ?,
      priority = ?

    WHERE id = ?
    `

  )
  .bind(

    data.name ??
      old.name,

    data.vless_url ??
      old.vless_url,

    data.enabled !== undefined
      ? (
          data.enabled
            ? 1
            : 0
        )
      : old.enabled,

    data.priority ??
      old.priority,

    id

  )
  .run();


  return json({
    success: true
  });

}


async function deleteServer(
  env,
  id
) {

  await env.DB.batch([

    env.DB.prepare(

      `
      DELETE FROM subscription_servers
      WHERE server_id = ?
      `

    )
    .bind(id),


    env.DB.prepare(

      `
      DELETE FROM servers
      WHERE id = ?
      `

    )
    .bind(id)

  ]);


  return json({
    success: true
  });

}


// ============================================================
// IMPORT VLESS
// ============================================================

async function importServers(
  request,
  env
) {

  const data =
    await safeJson(request);


  const text =
    String(
      data.text || ""
    );


  const configs =
    extractConfigs(text);


  const queries = [];


  for (
    const config
    of configs
  ) {

    queries.push(

      env.DB.prepare(

        `
        INSERT INTO servers (

          id,
          name,
          vless_url,
          enabled,
          priority

        )

        VALUES (?, ?, ?, 1, 100)
        `

      )
      .bind(

        crypto.randomUUID(),

        getConfigName(config) ||
          "Imported Server",

        config

      )

    );

  }


  if (queries.length > 0) {

    await env.DB.batch(
      queries
    );

  }


  return json({

    success: true,

    imported:
      configs.length

  });

}


// ============================================================
// SUBSCRIPTION SERVERS
// ============================================================

async function getSubscriptionServers(
  env,
  id
) {

  const result =
    await env.DB.prepare(

      `
      SELECT server_id

      FROM subscription_servers

      WHERE subscription_id = ?
      `

    )
    .bind(id)
    .all();


  return json(
    result.results || []
  );

}


async function setSubscriptionServers(
  request,
  env,
  id
) {

  const data =
    await safeJson(request);


  const ids =
    Array.isArray(data.server_ids)
      ? data.server_ids
      : [];


  const queries = [

    env.DB.prepare(

      `
      DELETE FROM subscription_servers
      WHERE subscription_id = ?
      `

    )
    .bind(id)

  ];


  for (
    const serverId
    of ids
  ) {

    queries.push(

      env.DB.prepare(

        `
        INSERT INTO subscription_servers (

          subscription_id,
          server_id

        )

        VALUES (?, ?)
        `

      )
      .bind(
        id,
        serverId
      )

    );

  }


  await env.DB.batch(
    queries
  );


  return json({
    success: true
  });

}


// ============================================================
// SUBSCRIPTION ROUTER
// ============================================================

async function subscriptionRouter(
  request,
  env,
  url
) {

  const parts =
    url.pathname
      .split("/")
      .filter(Boolean);


  const token =
    parts[1];


  const format =
    parts[2] || "default";


  if (!token) {

    return new Response(
      "Subscription token required",
      {
        status: 400
      }
    );

  }


  const sub =
    await env.DB.prepare(

      `
      SELECT *

      FROM subscriptions

      WHERE token = ?
      `

    )
    .bind(token)
    .first();


  if (!sub) {

    return new Response(

      "Subscription not found",

      {

        status: 404,

        headers: {

          "Content-Type":
            "text/plain; charset=utf-8"

        }

      }

    );

  }


  // ОТКЛЮЧЕНА

  if (
    sub.status !== "active"
  ) {

    return disabledSubscription();

  }


  // ПРОВЕРКА СРОКА

  if (sub.expires_at) {

    const expires =
      new Date(
        sub.expires_at
      );


    if (
      expires < new Date()
    ) {

      return new Response(

        "# 🔴 Подписка истекла",

        {

          headers: {

            "Content-Type":
              "text/plain; charset=utf-8"

          }

        }

      );

    }

  }


  const configs =
    await buildSubscriptionConfigs(
      env,
      sub
    );


  // INFO

  if (format === "info") {

    return json({

      name:
        sub.name,

      status:
        sub.status,

      traffic_used_gb:
        sub.traffic_used_gb,

      traffic_bonus_gb:
        sub.traffic_bonus_gb,

      traffic_limit_gb:
        sub.traffic_limit_gb,

      configs:
        configs.length,

      expires_at:
        sub.expires_at

    });

  }


  // BASE64

  if (format === "base64") {

    return new Response(

      base64Encode(
        configs.join("\n")
      ),

      {

        headers:
          subscriptionHeaders(sub)

      }

    );

  }


  // DEFAULT VLESS

  return new Response(

    configs.join("\n"),

    {

      headers:
        subscriptionHeaders(sub)

    }

  );

}


// ============================================================
// BUILD SUB CONFIGS
// ============================================================

async function buildSubscriptionConfigs(
  env,
  sub
) {

  let configs = [];


  // SOURCE CONFIGS

  if (
    Number(sub.use_source) === 1
  ) {

    const source =
      await env.KV.get(
        "source:configs"
      );


    if (source) {

      configs.push(
        ...extractConfigs(source)
      );

    }

  }


  // PERSONAL SERVERS

  const result =
    await env.DB.prepare(

      `
      SELECT s.*

      FROM servers s

      INNER JOIN subscription_servers ss

      ON ss.server_id = s.id

      WHERE

        ss.subscription_id = ?

        AND

        s.enabled = 1

      ORDER BY

        s.priority ASC
      `

    )
    .bind(sub.id)
    .all();


  for (
    const server
    of result.results || []
  ) {

    configs.push(
      server.vless_url
    );

  }


  // УБИРАЕМ ДУБЛИКАТЫ

  configs =
    [...new Set(configs)];


  return configs;

}


// ============================================================
// DISABLED SUB
// ============================================================

function disabledSubscription() {

  // ПУСТАЯ ПОДПИСКА С ОДНОЙ ЗАГЛУШКОЙ

  const text =
    "# 🔴 Подписка отключена";


  return new Response(

    text,

    {

      headers: {

        "Content-Type":
          "text/plain; charset=utf-8",

        "Profile-Title":
          "🔴 Подписка отключена",

        "Cache-Control":
          "no-store"

      }

    }

  );

}


// ============================================================
// SUBSCRIPTION HEADERS
// ============================================================

function subscriptionHeaders(
  sub
) {

  return {

    "Content-Type":
      "text/plain; charset=utf-8",

    "Profile-Title":
      sub.name,

    "Profile-Update-Interval":
      "24",

    "Cache-Control":
      "no-store",

    "Access-Control-Allow-Origin":
      "*"

  };

}


// ============================================================
// DASHBOARD
// ============================================================

async function dashboard(
  env
) {

  const total =
    await env.DB.prepare(

      `
      SELECT COUNT(*) AS count
      FROM subscriptions
      `

    )
    .first();


  const active =
    await env.DB.prepare(

      `
      SELECT COUNT(*) AS count
      FROM subscriptions
      WHERE status = 'active'
      `

    )
    .first();


  const servers =
    await env.DB.prepare(

      `
      SELECT COUNT(*) AS count
      FROM servers
      WHERE enabled = 1
      `

    )
    .first();


  const source =
    await env.KV.get(
      "source:configs"
    );


  return json({

    subscriptions:
      total?.count || 0,

    active:
      active?.count || 0,

    servers:
      servers?.count || 0,

    source_configs:
      source
        ? extractConfigs(source).length
        : 0

  });

}


// ============================================================
// PUBLIC STATUS
// ============================================================

async function publicStatus(
  env
) {

  const servers =
    await env.DB.prepare(

      `
      SELECT

        name,
        enabled

      FROM servers

      ORDER BY priority ASC
      `

    )
    .all();


  const source =
    await env.KV.get(
      "source:configs"
    );


  return json({

    name:
      APP_NAME,

    status:
      "online",

    own_servers:

      (servers.results || [])
        .map(

          server => ({

            name:
              server.name,

            status:

              server.enabled
                ? "online"
                : "disabled"

          })

        ),

    source_configs:

      source
        ? extractConfigs(source).length
        : 0

  });

}


// ============================================================
// HOME PAGE
// ============================================================

function homePage() {

  const html = `<!DOCTYPE html>

<html lang="ru">

<head>

<meta charset="UTF-8">

<meta
name="viewport"
content="width=device-width, initial-scale=1">

<title>WLVPN</title>

<style>

* {
  box-sizing: border-box;
}

body {

  margin: 0;

  font-family:
    Arial,
    sans-serif;

  background:
    #070b12;

  color:
    #ffffff;

}

header {

  display: flex;

  justify-content:
    space-between;

  align-items:
    center;

  padding:
    20px;

  max-width:
    1100px;

  margin:
    auto;

}

.logo {

  font-size:
    26px;

  font-weight:
    800;

}

.status {

  background:
    #10261a;

  border:
    1px solid #1c6336;

  padding:
    10px 16px;

  border-radius:
    30px;

}

.hero {

  text-align:
    center;

  padding:
    90px 20px;

}

.hero h1 {

  font-size:
    72px;

  margin:
    0;

}

.hero p {

  color:
    #a0aec0;

  font-size:
    20px;

}

.grid {

  max-width:
    1000px;

  margin:
    auto;

  display:
    grid;

  grid-template-columns:
    repeat(auto-fit,minmax(200px,1fr));

  gap:
    16px;

  padding:
    20px;

}

.card {

  background:
    #0d141f;

  border:
    1px solid #1d2a3b;

  border-radius:
    18px;

  padding:
    24px;

}

.number {

  font-size:
    36px;

  font-weight:
    bold;

  margin-top:
    10px;

}

.servers {

  max-width:
    800px;

  margin:
    40px auto;

  padding:
    20px;

}

.server {

  display:
    flex;

  justify-content:
    space-between;

  background:
    #0d141f;

  border:
    1px solid #1d2a3b;

  border-radius:
    14px;

  padding:
    18px;

  margin:
    10px 0;

}

footer {

  text-align:
    center;

  padding:
    60px 20px;

  color:
    #718096;

}

.admin-link {

  color:
    #718096;

  text-decoration:
    none;

}

@media(max-width:600px) {

  .hero h1 {

    font-size:
      48px;

  }

}

</style>

</head>

<body>

<header>

<div class="logo">
🏳 WLVPN
</div>

<div class="status">
🟢 Network Online
</div>

</header>


<section class="hero">

<h1>
WLVPN
</h1>

<p>
Быстрый и стабильный VPN сервис
</p>

</section>


<section class="grid">

<div class="card">

<div>
Серверов
</div>

<div
class="number"
id="servers">

—

</div>

</div>


<div class="card">

<div>
VPN Configs
</div>

<div
class="number"
id="configs">

—

</div>

</div>


<div class="card">

<div>
Статус
</div>

<div
class="number">

🟢

</div>

</div>

</section>


<section class="servers">

<h2>
📡 Серверы
</h2>

<div id="serverList">

Загрузка...

</div>

</section>


<footer>

<div>
© WLVPN
</div>

<br>

<a
class="admin-link"
href="/admin">

Admin

</a>

</footer>


<script>

async function loadStatus() {

  try {

    const response =
      await fetch(
        "/api/status"
      );


    const data =
      await response.json();


    document
      .getElementById(
        "servers"
      )
      .textContent =
        data.own_servers.length;


    document
      .getElementById(
        "configs"
      )
      .textContent =
        data.source_configs;


    const root =
      document
        .getElementById(
          "serverList"
        );


    root.innerHTML = "";


    if (
      data.own_servers.length === 0
    ) {

      root.innerHTML =
        "<p>Собственные серверы пока не добавлены</p>";

      return;

    }


    data.own_servers.forEach(

      server => {

        const div =
          document.createElement(
            "div"
          );


        div.className =
          "server";


        const left =
          document.createElement(
            "span"
          );


        left.textContent =
          server.name;


        const right =
          document.createElement(
            "span"
          );


        right.textContent =
          server.status === "online"
            ? "🟢 Online"
            : "🔴 Disabled";


        div.appendChild(left);

        div.appendChild(right);

        root.appendChild(div);

      }

    );

  }

  catch (error) {

    document
      .getElementById(
        "serverList"
      )
      .textContent =
        "Ошибка загрузки";

  }

}


loadStatus();

setInterval(
  loadStatus,
  30000
);

</script>

</body>

</html>`;


  return new Response(

    html,

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


// ============================================================
// ADMIN PAGE
// ============================================================

function adminPage() {

  const html = `<!DOCTYPE html>

<html lang="ru">

<head>

<meta charset="UTF-8">

<meta
name="viewport"
content="width=device-width,initial-scale=1">

<title>WLVPN Admin</title>

<style>

* {
  box-sizing:
    border-box;
}

body {

  margin: 0;

  background:
    #070b12;

  color:
    white;

  font-family:
    Arial,
    sans-serif;

}

.container {

  max-width:
    1100px;

  margin:
    auto;

  padding:
    20px;

}

.box {

  background:
    #0d141f;

  border:
    1px solid #1d2a3b;

  border-radius:
    18px;

  padding:
    20px;

  margin:
    15px 0;

}

input,
textarea {

  width:
    100%;

  padding:
    13px;

  margin:
    7px 0;

  border:
    1px solid #26364d;

  border-radius:
    10px;

  background:
    #080e17;

  color:
    white;

}

textarea {

  min-height:
    160px;

}

button {

  padding:
    12px 16px;

  margin:
    5px 2px;

  border:
    0;

  border-radius:
    10px;

  background:
    #2563eb;

  color:
    white;

  cursor:
    pointer;

}

button.green {

  background:
    #16a34a;

}

button.red {

  background:
    #dc2626;

}

.hidden {

  display:
    none !important;

}

.stats {

  display:
    grid;

  grid-template-columns:
    repeat(auto-fit,minmax(150px,1fr));

  gap:
    12px;

}

.stat {

  background:
    #080e17;

  padding:
    20px;

  border-radius:
    14px;

}

.stat b {

  display:
    block;

  font-size:
    28px;

  margin-top:
    8px;

}

.item {

  background:
    #080e17;

  border-radius:
    14px;

  padding:
    16px;

  margin:
    10px 0;

}

code {

  display:
    block;

  color:
    #60a5fa;

  word-break:
    break-all;

  margin:
    10px 0;

}

h1 {
  margin-top: 0;
}

.small {
  color: #94a3b8;
}

</style>

</head>

<body>

<div class="container">


<!-- LOGIN -->

<div id="loginBox">

<div class="box">

<h1>
🏳 WLVPN Admin
</h1>

<p class="small">
Введите пароль администратора
</p>

<input
id="password"
type="password"
placeholder="Пароль">

<button
onclick="login()">

Войти

</button>

<div
id="loginError"
style="color:#f87171">

</div>

</div>

</div>


<!-- PANEL -->

<div
id="panel"
class="hidden">


<h1>
🏳 WLVPN Dashboard
</h1>


<div
class="stats"
id="stats">

</div>


<!-- SOURCE -->

<div class="box">

<h2>
📥 Исходная подписка
</h2>

<input
id="sourceUrl"
placeholder="Source URL">


<input
id="sourceUA"
placeholder="User-Agent">


<button
onclick="saveSource()">

💾 Сохранить

</button>


<button
class="green"
onclick="updateSource()">

🔄 Обновить сейчас

</button>


<div
class="small"
id="sourceInfo">

</div>

</div>


<!-- CREATE SUB -->

<div class="box">

<h2>
➕ Создать подписку
</h2>

<input
id="subName"
placeholder="Название подписки">


<input
id="subLimit"
type="number"
placeholder="Лимит GB (0 = без лимита)">


<label>

<input
id="useSource"
type="checkbox"
checked>

Использовать исходную подписку

</label>


<br>


<button
class="green"
onclick="createSub()">

Создать подписку

</button>

</div>


<!-- SUBS -->

<div class="box">

<h2>
👤 Подписки
</h2>

<div id="subs">

Загрузка...

</div>

</div>


<!-- IMPORT -->

<div class="box">

<h2>
📡 Импорт VLESS серверов
</h2>

<textarea
id="vlessImport"
placeholder="vless://...
vless://...
vless://...">

</textarea>


<button
class="green"
onclick="importServers()">

Импортировать

</button>

</div>


<!-- SERVERS -->

<div class="box">

<h2>
🖥 Мои серверы
</h2>

<div id="servers">

Загрузка...

</div>

</div>


<div class="box">

<button
class="red"
onclick="logout()">

Выйти

</button>

</div>


</div>

</div>


<script>


async function api(
  url,
  options = {}
) {

  const headers =
    {
      ...(options.headers || {})
    };


  if (options.body) {

    headers[
      "Content-Type"
    ] =
      "application/json";

  }


  return fetch(

    url,

    {

      ...options,

      headers,

      credentials:
        "same-origin"

    }

  );

}


// =================================================
// AUTH
// =================================================

async function checkAuth() {

  try {

    const response =
      await api(
        "/api/admin/check"
      );


    const data =
      await response.json();


    if (data.authorized) {

      showPanel();

    }

  }

  catch (e) {

    console.error(e);

  }

}


async function login() {

  const password =
    document
      .getElementById(
        "password"
      )
      .value;


  const error =
    document
      .getElementById(
        "loginError"
      );


  error.textContent =
    "";


  try {

    const response =
      await api(

        "/api/login",

        {

          method:
            "POST",

          body:

            JSON.stringify({

              password

            })

        }

      );


    const data =
      await response.json();


    if (!response.ok) {

      error.textContent =
        data.error ||
        "Неверный пароль";

      return;

    }


    showPanel();

  }

  catch (e) {

    error.textContent =
      "Ошибка подключения";

  }

}


function showPanel() {

  document
    .getElementById(
      "loginBox"
    )
    .classList
    .add(
      "hidden"
    );


  document
    .getElementById(
      "panel"
    )
    .classList
    .remove(
      "hidden"
    );


  loadAll();

}


async function logout() {

  await api(

    "/api/logout",

    {
      method:
        "POST"
    }

  );


  location.reload();

}


// =================================================
// LOAD ALL
// =================================================

async function loadAll() {

  await loadDashboard();

  await loadSource();

  await loadSubs();

  await loadServers();

}


// =================================================
// DASHBOARD
// =================================================

async function loadDashboard() {

  const response =
    await api(
      "/api/admin/dashboard"
    );


  if (!response.ok) {
    return;
  }


  const data =
    await response.json();


  document
    .getElementById(
      "stats"
    )
    .innerHTML =

      '<div class="stat">Подписок<b>' +

      data.subscriptions +

      '</b></div>' +

      '<div class="stat">Активных<b>' +

      data.active +

      '</b></div>' +

      '<div class="stat">Серверов<b>' +

      data.servers +

      '</b></div>' +

      '<div class="stat">Source<b>' +

      data.source_configs +

      '</b></div>';

}


// =================================================
// SOURCE
// =================================================

async function loadSource() {

  const response =
    await api(
      "/api/admin/source"
    );


  if (!response.ok) {
    return;
  }


  const data =
    await response.json();


  document
    .getElementById(
      "sourceUrl"
    )
    .value =
      data.url || "";


  document
    .getElementById(
      "sourceUA"
    )
    .value =
      data.user_agent || "";


  document
    .getElementById(
      "sourceInfo"
    )
    .textContent =

      data.meta

        ? (
            "Конфигов: " +

            data.meta.configs +

            " | Последнее обновление: " +

            data.meta.updated_at
          )

        : "Исходник ещё не загружен";

}


async function saveSource() {

  const url =
    document
      .getElementById(
        "sourceUrl"
      )
      .value;


  const user_agent =
    document
      .getElementById(
        "sourceUA"
      )
      .value;


  const response =
    await api(

      "/api/admin/source",

      {

        method:
          "POST",

        body:

          JSON.stringify({

            url,

            user_agent

          })

      }

    );


  if (response.ok) {

    alert(
      "Настройки сохранены"
    );

  }

}


async function updateSource() {

  const response =
    await api(

      "/api/admin/source/update",

      {
        method:
          "POST"
      }

    );


  const data =
    await response.json();


  if (data.success) {

    alert(
      "Обновлено. Конфигов: " +
      data.configs
    );

  }

  else {

    alert(
      "Ошибка: " +
      (
        data.error ||
        "Unknown"
      )
    );

  }


  loadAll();

}


// =================================================
// CREATE SUB
// =================================================

async function createSub() {

  const name =
    document
      .getElementById(
        "subName"
      )
      .value;


  if (!name.trim()) {

    alert(
      "Введите название"
    );

    return;

  }


  const traffic_limit_gb =
    Number(

      document
        .getElementById(
          "subLimit"
        )
        .value || 0

    );


  const use_source =
    document
      .getElementById(
        "useSource"
      )
      .checked;


  const response =
    await api(

      "/api/admin/subscriptions",

      {

        method:
          "POST",

        body:

          JSON.stringify({

            name,

            traffic_limit_gb,

            use_source

          })

      }

    );


  const data =
    await response.json();


  if (!response.ok) {

    alert(
      data.error ||
      "Ошибка"
    );

    return;

  }


  const url =
    location.origin +
    data.url;


  alert(

    "Подписка создана!\\n\\n" +

    url

  );


  document
    .getElementById(
      "subName"
    )
    .value = "";


  document
    .getElementById(
      "subLimit"
    )
    .value = "";


  loadAll();

}


// =================================================
// SUBSCRIPTIONS
// =================================================

async function loadSubs() {

  const response =
    await api(
      "/api/admin/subscriptions"
    );


  if (!response.ok) {
    return;
  }


  const data =
    await response.json();


  const root =
    document
      .getElementById(
        "subs"
      );


  root.innerHTML = "";


  if (data.length === 0) {

    root.textContent =
      "Подписок пока нет";

    return;

  }


  data.forEach(
    sub => {

      const item =
        document.createElement(
          "div"
        );


      item.className =
        "item";


      const title =
        document.createElement(
          "h3"
        );


      title.textContent =
        sub.name;


      item.appendChild(title);


      const status =
        document.createElement(
          "div"
        );


      status.textContent =
        sub.status === "active"

          ? "🟢 Активна"

          : "🔴 Отключена";


      item.appendChild(status);


      const traffic =
        document.createElement(
          "p"
        );


      traffic.textContent =
        "Дополнительный трафик: " +
        sub.traffic_bonus_gb +
        " GB";


      item.appendChild(traffic);


      const code =
        document.createElement(
          "code"
        );


      const subUrl =
        location.origin +
        "/sub/" +
        sub.token;


      code.textContent =
        subUrl;


      item.appendChild(code);


      // COPY

      const copy =
        document.createElement(
          "button"
        );


      copy.textContent =
        "📋 Копировать";


      copy.onclick =
        () => copyText(subUrl);


      item.appendChild(copy);


      // DISABLE

      const toggle =
        document.createElement(
          "button"
        );


      toggle.textContent =
        sub.status === "active"

          ? "🔴 Отключить"

          : "🟢 Включить";


      toggle.onclick =
        () => toggleSub(
          sub.id,
          sub.status
        );


      item.appendChild(toggle);


      // TRAFFIC

      const trafficButton =
        document.createElement(
          "button"
        );


      trafficButton.textContent =
        "➕ Трафик";


      trafficButton.onclick =
        () => addBonus(
          sub.id
        );


      item.appendChild(
        trafficButton
      );


      // NEW TOKEN

      const regenerate =
        document.createElement(
          "button"
        );


      regenerate.textContent =
        "🔄 Новый токен";


      regenerate.onclick =
        () => regenerateToken(
          sub.id
        );


      item.appendChild(
        regenerate
      );


      // DELETE

      const del =
        document.createElement(
          "button"
        );


      del.textContent =
        "🗑 Удалить";


      del.className =
        "red";


      del.onclick =
        () => deleteSub(
          sub.id
        );


      item.appendChild(del);


      root.appendChild(item);

    }
  );

}


async function toggleSub(
  id,
  status
) {

  await api(

    "/api/admin/subscriptions/" +
    id,

    {

      method:
        "PATCH",

      body:

        JSON.stringify({

          status:

            status === "active"

              ? "disabled"

              : "active"

        })

    }

  );


  loadAll();

}


async function deleteSub(
  id
) {

  if (
    !confirm(
      "Точно удалить подписку?"
    )
  ) {
    return;
  }


  await api(

    "/api/admin/subscriptions/" +
    id,

    {

      method:
        "DELETE"

    }

  );


  loadAll();

}


async function addBonus(
  id
) {

  const value =
    prompt(
      "Сколько GB добавить?"
    );


  if (!value) {
    return;
  }


  const amount =
    Number(value);


  if (
    !Number.isFinite(amount) ||
    amount <= 0
  ) {

    alert(
      "Неверное число"
    );

    return;

  }


  await api(

    "/api/admin/subscriptions/" +
    id +
    "/traffic",

    {

      method:
        "POST",

      body:

        JSON.stringify({

          amount_gb:
            amount

        })

    }

  );


  loadAll();

}


async function regenerateToken(
  id
) {

  if (
    !confirm(
      "Старая ссылка перестанет работать. Продолжить?"
    )
  ) {
    return;
  }


  const response =
    await api(

      "/api/admin/subscriptions/" +
      id +
      "/regenerate",

      {

        method:
          "POST"

      }

    );


  const data =
    await response.json();


  if (data.success) {

    alert(

      "Новая ссылка:\\n\\n" +

      location.origin +

      "/sub/" +

      data.token

    );

  }


  loadAll();

}


// =================================================
// IMPORT SERVERS
// =================================================

async function importServers() {

  const text =
    document
      .getElementById(
        "vlessImport"
      )
      .value;


  if (!text.trim()) {

    alert(
      "Вставьте VLESS конфиги"
    );

    return;

  }


  const response =
    await api(

      "/api/admin/servers/import",

      {

        method:
          "POST",

        body:

          JSON.stringify({

            text

          })

      }

    );


  const data =
    await response.json();


  alert(

    "Импортировано: " +
    data.imported

  );


  document
    .getElementById(
      "vlessImport"
    )
    .value = "";


  loadAll();

}


// =================================================
// SERVERS
// =================================================

async function loadServers() {

  const response =
    await api(
      "/api/admin/servers"
    );


  if (!response.ok) {
    return;
  }


  const data =
    await response.json();


  const root =
    document
      .getElementById(
        "servers"
      );


  root.innerHTML = "";


  if (data.length === 0) {

    root.textContent =
      "Серверов пока нет";

    return;

  }


  data.forEach(
    server => {

      const item =
        document.createElement(
          "div"
        );


      item.className =
        "item";


      const title =
        document.createElement(
          "b"
        );


      title.textContent =
        server.name;


      item.appendChild(title);


      const status =
        document.createElement(
          "p"
        );


      status.textContent =
        server.enabled

          ? "🟢 Включён"

          : "🔴 Отключён";


      item.appendChild(status);


      // TOGGLE

      const toggle =
        document.createElement(
          "button"
        );


      toggle.textContent =
        server.enabled

          ? "Отключить"

          : "Включить";


      toggle.onclick =
        async () => {

          await api(

            "/api/admin/servers/" +
            server.id,

            {

              method:
                "PATCH",

              body:

                JSON.stringify({

                  enabled:
                    !server.enabled

                })

            }

          );


          loadAll();

        };


      item.appendChild(toggle);


      // DELETE

      const del =
        document.createElement(
          "button"
        );


      del.textContent =
        "🗑 Удалить";


      del.className =
        "red";


      del.onclick =
        async () => {

          if (
            !confirm(
              "Удалить сервер?"
            )
          ) {
            return;
          }


          await api(

            "/api/admin/servers/" +
            server.id,

            {

              method:
                "DELETE"

            }

          );


          loadAll();

        };


      item.appendChild(del);


      root.appendChild(item);

    }
  );

}


// =================================================
// COPY
// =================================================

async function copyText(
  text
) {

  try {

    await navigator
      .clipboard
      .writeText(text);


    alert(
      "Скопировано"
    );

  }

  catch {

    prompt(
      "Скопируйте ссылку:",
      text
    );

  }

}


checkAuth();

</script>

</body>

</html>`;


  return new Response(

    html,

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


// ============================================================
// HELPERS
// ============================================================

async function getSub(
  env,
  id
) {

  return env.DB.prepare(

    `
    SELECT *
    FROM subscriptions
    WHERE id = ?
    `

  )
  .bind(id)
  .first();

}


function generateToken() {

  const bytes =
    new Uint8Array(24);


  crypto.getRandomValues(
    bytes
  );


  return Array.from(bytes)

    .map(

      byte =>
        byte
          .toString(16)
          .padStart(2, "0")

    )
    .join("");

}


function extractConfigs(
  text
) {

  const input =
    String(text || "").trim();


  const direct =
    input.match(
      /vless:\/\/[^\s"'<>]+/g
    );


  if (
    direct &&
    direct.length > 0
  ) {

    return [...new Set(

      direct.map(
        config => config.trim()
      )

    )];

  }


  // Попытка декодировать Base64 подписку

  try {

    const decoded =
      decodeBase64(input);


    const configs =
      decoded.match(
        /vless:\/\/[^\s"'<>]+/g
      );


    if (configs) {

      return [...new Set(

        configs.map(
          config => config.trim()
        )

      )];

    }

  }

  catch {}


  return [];

}


function getConfigName(
  config
) {

  try {

    const url =
      new URL(config);


    return decodeURIComponent(

      url.hash
        .replace("#", "")

    );

  }

  catch {

    return "";

  }

}


function base64Encode(
  text
) {

  const bytes =
    new TextEncoder()
      .encode(text);


  let binary = "";


  for (
    const byte
    of bytes
  ) {

    binary +=
      String.fromCharCode(
        byte
      );

  }


  return btoa(binary);

}


function decodeBase64(
  value
) {

  let input =
    value
      .replace(/\s/g, "")
      .replace(/-/g, "+")
      .replace(/_/g, "/");


  while (
    input.length % 4
  ) {

    input += "=";

  }


  const binary =
    atob(input);


  const bytes =
    Uint8Array.from(

      binary,

      char =>
        char.charCodeAt(0)

    );


  return new TextDecoder()
    .decode(bytes);

}


async function safeJson(
  request
) {

  try {

    return await request.json();

  }

  catch {

    return {};

  }

}


function json(
  data,
  status = 200,
  extraHeaders = {}
) {

  return new Response(

    JSON.stringify(
      data
    ),

    {

      status,

      headers: {

        "Content-Type":
          "application/json; charset=utf-8",

        ...corsHeaders(),

        ...extraHeaders

      }

    }

  );

}


function error(
  message,
  status = 400
) {

  return json(

    {

      success: false,

      error: message

    },

    status

  );

}