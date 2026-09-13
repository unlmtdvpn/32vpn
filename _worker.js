const APP_NAME = "WLVPN";

const DEFAULT_SOURCE_URL =
  "https://sub.datanode-internal.net/McjAzVPB2VRYcM6z";

const DEFAULT_UA =
  "INCY/3.6.5/android";

const SESSION_TTL =
  60 * 60 * 24 * 7;


// =====================================================
// WORKER
// =====================================================

export default {

  async fetch(request, env, ctx) {

    const url =
      new URL(request.url);


    // CORS

    if (
      request.method === "OPTIONS"
    ) {

      return new Response(
        null,
        {
          headers: corsHeaders()
        }
      );

    }


    // API

    if (
      url.pathname.startsWith("/api/")
    ) {

      return apiRouter(
        request,
        env,
        ctx,
        url
      );

    }


    // SUBSCRIPTION

    if (
      url.pathname.startsWith("/sub/")
    ) {

      return subscriptionRouter(
        request,
        env,
        url
      );

    }


    // ADMIN

    if (
      url.pathname === "/admin"
    ) {

      return adminPage();

    }


    // HOME

    return homePage();

  },


  async scheduled(event, env, ctx) {

    // Source update

    if (
      event.cron ===
      "*/30 * * * *"
    ) {

      ctx.waitUntil(
        updateSourceCache(env)
      );

    }


    // Daily traffic

    if (
      event.cron ===
      "0 0 * * *"
    ) {

      ctx.waitUntil(
        addDailyTraffic(env)
      );

    }

  }

};


// =====================================================
// CORS
// =====================================================

function corsHeaders() {

  return {

    "Access-Control-Allow-Origin":
      "*",

    "Access-Control-Allow-Methods":
      "GET,POST,PATCH,DELETE,OPTIONS",

    "Access-Control-Allow-Headers":
      "Content-Type"

  };

}


// =====================================================
// API ROUTER
// =====================================================

async function apiRouter(
  request,
  env,
  ctx,
  url
) {

  const path =
    url.pathname;


  // PUBLIC STATUS

  if (
    path === "/api/status"
  ) {

    return publicStatus(
      env
    );

  }


  // LOGIN

  if (
    path === "/api/login" &&
    request.method === "POST"
  ) {

    return login(
      request,
      env
    );

  }


  // LOGOUT

  if (
    path === "/api/logout" &&
    request.method === "POST"
  ) {

    return logout(
      request,
      env
    );

  }


  // AUTH CHECK

  if (
    path === "/api/admin/check"
  ) {

    const ok =
      await isAdmin(
        request,
        env
      );


    return json({

      authorized: ok

    });

  }


  // ALL BELOW ADMIN ONLY

  if (
    !await isAdmin(
      request,
      env
    )
  ) {

    return error(
      "Unauthorized",
      401
    );

  }


  // DASHBOARD

  if (
    path ===
    "/api/admin/dashboard"
  ) {

    return dashboard(
      env
    );

  }


  // ==============================
  // SOURCE
  // ==============================


  if (
    path ===
    "/api/admin/source"
  ) {

    if (
      request.method === "GET"
    ) {

      return sourceInfo(
        env
      );

    }


    if (
      request.method === "POST"
    ) {

      return updateSourceSettings(
        request,
        env
      );

    }

  }


  if (
    path ===
    "/api/admin/source/update" &&
    request.method === "POST"
  ) {

    const result =
      await updateSourceCache(
        env
      );


    return json(
      result
    );

  }


  if (
    path ===
    "/api/admin/source/preview"
  ) {

    return sourcePreview(
      env
    );

  }


  // ==============================
  // SUBSCRIPTIONS
  // ==============================


  if (
    path ===
    "/api/admin/subscriptions"
  ) {

    if (
      request.method === "GET"
    ) {

      return getSubscriptions(
        env
      );

    }


    if (
      request.method === "POST"
    ) {

      return createSubscription(
        request,
        env
      );

    }

  }


  const subMatch =
    path.match(
      /^\/api\/admin\/subscriptions\/([^/]+)$/
    );


  if (subMatch) {

    const id =
      subMatch[1];


    if (
      request.method === "GET"
    ) {

      return getSubscription(
        env,
        id
      );

    }


    if (
      request.method === "PATCH"
    ) {

      return updateSubscription(
        request,
        env,
        id
      );

    }


    if (
      request.method === "DELETE"
    ) {

      return deleteSubscription(
        env,
        id
      );

    }

  }


  // SUB TRAFFIC

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


  // SUB REGENERATE TOKEN

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


  // SUB SERVERS

  const subServersMatch =
    path.match(
      /^\/api\/admin\/subscriptions\/([^/]+)\/servers$/
    );


  if (subServersMatch) {

    if (
      request.method === "GET"
    ) {

      return getSubscriptionServers(
        env,
        subServersMatch[1]
      );

    }


    if (
      request.method === "POST"
    ) {

      return setSubscriptionServers(
        request,
        env,
        subServersMatch[1]
      );

    }

  }


  // ==============================
  // SERVERS
  // ==============================


  if (
    path ===
    "/api/admin/servers"
  ) {

    if (
      request.method === "GET"
    ) {

      return getServers(
        env
      );

    }


    if (
      request.method === "POST"
    ) {

      return createServer(
        request,
        env
      );

    }

  }


  const serverMatch =
    path.match(
      /^\/api\/admin\/servers\/([^/]+)$/
    );


  if (serverMatch) {

    if (
      request.method === "PATCH"
    ) {

      return updateServer(
        request,
        env,
        serverMatch[1]
      );

    }


    if (
      request.method === "DELETE"
    ) {

      return deleteServer(
        env,
        serverMatch[1]
      );

    }

  }


  // IMPORT

  if (
    path ===
    "/api/admin/servers/import" &&
    request.method === "POST"
  ) {

    return importServers(
      request,
      env
    );

  }


  return error(
    "Not found",
    404
  );

}


// =====================================================
// AUTH
// =====================================================

async function login(
  request,
  env
) {

  const data =
    await safeJson(
      request
    );


  if (
    !env.ADMIN_PASSWORD
  ) {

    return error(
      "ADMIN_PASSWORD secret not configured",
      500
    );

  }


  if (
    data.password !==
    env.ADMIN_PASSWORD
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


  await adminLog(

    env,

    "LOGIN",

    "Admin login"

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

        "SameSite=Strict; " +

        "Path=/; " +

        `Max-Age=${SESSION_TTL}`

    }

  );

}


async function logout(
  request,
  env
) {

  const id =
    getSessionId(
      request
    );


  if (id) {

    await env.KV.delete(
      "session:" + id
    );

  }


  return json({

    success: true

  });

}


async function isAdmin(
  request,
  env
) {

  const id =
    getSessionId(
      request
    );


  if (!id) {

    return false;

  }


  const session =
    await env.KV.get(
      "session:" + id
    );


  return !!session;

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


// =====================================================
// SOURCE SETTINGS
// =====================================================

async function getSourceUrl(
  env
) {

  const result =
    await env.DB.prepare(

      `
      SELECT value
      FROM settings
      WHERE key='source_url'
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
      WHERE key='source_ua'
      `

    )
    .first();


  return result?.value ||
    DEFAULT_UA;

}


// =====================================================
// UPDATE SOURCE CACHE
// =====================================================

async function updateSourceCache(
  env
) {

  const sourceUrl =
    await getSourceUrl(
      env
    );


  const ua =
    await getSourceUA(
      env
    );


  try {

    const response =
      await fetch(
        sourceUrl,
        {

          headers: {

            "User-Agent":
              ua,

            "Accept":
              "*/*"

          },

          cf: {

            cacheTtl: 0

          }

        }
      );


    const text =
      await response.text();


    if (
      !response.ok
    ) {

      return {

        success: false,

        status:
          response.status

      };

    }


    await env.KV.put(

      "source:configs",

      text

    );


    await env.KV.put(

      "source:meta",

      JSON.stringify({

        status:
          response.status,

        updated_at:

          new Date()
          .toISOString(),

        size:
          text.length,

        configs:
          countConfigs(text)

      })

    );


    await adminLog(

      env,

      "SOURCE_UPDATE",

      `Configs: ${countConfigs(text)}`

    );


    return {

      success: true,

      status:
        response.status,

      configs:
        countConfigs(text)

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


// =====================================================
// SOURCE INFO
// =====================================================

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

    meta:

      meta
        ? JSON.parse(meta)
        : null

  });

}


// =====================================================
// UPDATE SOURCE SETTINGS
// =====================================================

async function updateSourceSettings(
  request,
  env
) {

  const data =
    await safeJson(
      request
    );


  if (
    data.url
  ) {

    await setSetting(

      env,

      "source_url",

      data.url

    );

  }


  if (
    data.user_agent
  ) {

    await setSetting(

      env,

      "source_ua",

      data.user_agent

    );

  }


  return json({

    success: true

  });

}


// =====================================================
// SOURCE PREVIEW
// =====================================================

async function sourcePreview(
  env
) {

  const text =
    await env.KV.get(
      "source:configs"
    );


  return json({

    exists:
      !!text,

    configs:
      text
        ? countConfigs(text)
        : 0,

    preview:
      text
        ? text.slice(0, 3000)
        : ""

  });

}


// =====================================================
// SETTINGS
// =====================================================

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

    value=excluded.value
    `

  )
  .bind(
    key,
    value
  )
  .run();

}


// =====================================================
// SUBSCRIPTIONS
// =====================================================

async function getSubscriptions(
  env
) {

  const result =
    await env.DB.prepare(

      `
      SELECT *

      FROM subscriptions

      ORDER BY

      created_at DESC
      `

    )
    .all();


  return json(
    result.results
  );

}


async function getSubscription(
  env,
  id
) {

  const result =
    await getSub(
      env,
      id
    );


  if (!result) {

    return error(
      "Not found",
      404
    );

  }


  return json(
    result
  );

}


async function createSubscription(
  request,
  env
) {

  const data =
    await safeJson(
      request
    );


  const id =
    crypto.randomUUID();


  const token =
    generateToken();


  const name =
    String(
      data.name ||
      "WLVPN User"
    );


  const limit =
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

      traffic_limit_gb,

      expires_at,

      use_source

    )

    VALUES (

      ?,?,?,?,?,?

    )
    `

  )
  .bind(

    id,

    token,

    name,

    limit,

    data.expires_at || null,

    useSource

  )
  .run();


  await adminLog(

    env,

    "SUB_CREATE",

    name

  );


  return json({

    success: true,

    id,

    token,

    url:
      `/sub/${token}`

  });

}


async function updateSubscription(
  request,
  env,
  id
) {

  const data =
    await safeJson(
      request
    );


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

      name=?,

      status=?,

      traffic_limit_gb=?,

      expires_at=?,

      use_source=?,

      updated_at=CURRENT_TIMESTAMP

    WHERE id=?
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


  await adminLog(

    env,

    "SUB_UPDATE",

    name

  );


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
      WHERE subscription_id=?
      `

    )
    .bind(id),


    env.DB.prepare(

      `
      DELETE FROM traffic_history
      WHERE subscription_id=?
      `

    )
    .bind(id),


    env.DB.prepare(

      `
      DELETE FROM subscriptions
      WHERE id=?
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

      token=?,

      updated_at=CURRENT_TIMESTAMP

    WHERE id=?
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


// =====================================================
// TRAFFIC
// =====================================================

async function addTraffic(
  request,
  env,
  id
) {

  const data =
    await safeJson(
      request
    );


  const amount =
    Number(
      data.amount_gb
    );


  if (
    !Number.isFinite(amount)
  ) {

    return error(
      "Invalid amount"
    );

  }


  await env.DB.batch([

    env.DB.prepare(

      `
      UPDATE subscriptions

      SET

      traffic_bonus_gb =
      traffic_bonus_gb + ?

      WHERE id=?
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

      data.type || "manual"

    )

  ]);


  return json({

    success: true

  });

}


// =====================================================
// DAILY TRAFFIC
// =====================================================

async function addDailyTraffic(
  env
) {

  const result =
    await env.DB.prepare(

      `
      SELECT *

      FROM subscriptions

      WHERE status='active'
      `

    )
    .all();


  const queries = [];


  for (
    const sub
    of result.results
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

        WHERE id=?
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


  if (
    queries.length
  ) {

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


// =====================================================
// SERVERS
// =====================================================

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
    result.results
  );

}


async function createServer(
  request,
  env
) {

  const data =
    await safeJson(
      request
    );


  const vless =
    String(
      data.vless_url || ""
    )
    .trim();


  if (
    !vless.startsWith(
      "vless://"
    )
  ) {

    return error(
      "Only vless:// supported"
    );

  }


  const id =
    crypto.randomUUID();


  const name =

    data.name ||

    getVlessName(vless) ||

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
    await safeJson(
      request
    );


  const old =
    await env.DB.prepare(

      `
      SELECT *

      FROM servers

      WHERE id=?
      `

    )
    .bind(id)
    .first();


  if (!old) {

    return error(
      "Not found",
      404
    );

  }


  await env.DB.prepare(

    `
    UPDATE servers

    SET

      name=?,

      vless_url=?,

      enabled=?,

      priority=?

    WHERE id=?
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
      WHERE server_id=?
      `

    )
    .bind(id),


    env.DB.prepare(

      `
      DELETE FROM servers
      WHERE id=?
      `

    )
    .bind(id)

  ]);


  return json({

    success: true

  });

}


// =====================================================
// IMPORT SERVERS
// =====================================================

async function importServers(
  request,
  env
) {

  const data =
    await safeJson(
      request
    );


  const text =
    String(
      data.text || ""
    );


  const configs =
    extractVless(
      text
    );


  const queries = [];


  for (
    const vless
    of configs
  ) {

    queries.push(

      env.DB.prepare(

        `
        INSERT INTO servers (

          id,

          name,

          vless_url

        )

        VALUES (?, ?, ?)
        `

      )
      .bind(

        crypto.randomUUID(),

        getVlessName(vless) ||
          "Imported Server",

        vless

      )

    );

  }


  if (
    queries.length
  ) {

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


// =====================================================
// SUB SERVERS
// =====================================================

async function getSubscriptionServers(
  env,
  id
) {

  const result =
    await env.DB.prepare(

      `
      SELECT server_id

      FROM subscription_servers

      WHERE subscription_id=?
      `

    )
    .bind(id)
    .all();


  return json(
    result.results
  );

}


async function setSubscriptionServers(
  request,
  env,
  id
) {

  const data =
    await safeJson(
      request
    );


  const ids =
    Array.isArray(
      data.server_ids
    )

      ? data.server_ids

      : [];


  const queries = [

    env.DB.prepare(

      `
      DELETE FROM subscription_servers

      WHERE subscription_id=?
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


// =====================================================
// SUB ROUTER
// =====================================================

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
    parts[2] || "vless";


  const sub =
    await env.DB.prepare(

      `
      SELECT *

      FROM subscriptions

      WHERE token=?
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
            "text/plain"

        }

      }

    );

  }


  // DISABLED

  if (
    sub.status !==
    "active"
  ) {

    return disabledSubscription();

  }


  // EXPIRED

  if (
    sub.expires_at
  ) {

    const expires =
      new Date(
        sub.expires_at
      );


    if (
      expires <
      new Date()
    ) {

      return simpleSubscriptionResponse(

        "🔴 Subscription expired"

      );

    }

  }


  // CONFIGS

  const configs =
    await buildSubscriptionConfigs(
      env,
      sub
    );


  // BASE64

  if (
    format === "base64"
  ) {

    return new Response(

      base64(
        configs.join("\n")
      ),

      {

        headers:

          subscriptionHeaders(
            sub
          )

      }

    );

  }


  // JSON

  if (
    format === "json"
  ) {

    return json({

      name:
        sub.name,

      configs

    });

  }


  // INFO

  if (
    format === "info"
  ) {

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

      expires_at:
        sub.expires_at,

      configs:
        configs.length

    });

  }


  // SINGBOX

  if (
    format === "singbox"
  ) {

    return singboxResponse(
      configs,
      sub
    );

  }


  // DEFAULT

  return new Response(

    configs.join("\n"),

    {

      headers:

        subscriptionHeaders(
          sub
        )

    }

  );

}


// =====================================================
// BUILD CONFIGS
// =====================================================

async function buildSubscriptionConfigs(
  env,
  sub
) {

  let configs = [];


  // SOURCE

  if (
    Number(sub.use_source) === 1
  ) {

    const source =
      await env.KV.get(
        "source:configs"
      );


    if (source) {

      configs.push(

        ...extractVless(
          source
        )

      );

    }

  }


  // PERSONAL SERVERS

  const result =
    await env.DB.prepare(

      `
      SELECT

        s.*

      FROM servers s

      INNER JOIN
      subscription_servers ss

      ON

        ss.server_id=s.id

      WHERE

        ss.subscription_id=?

      AND

        s.enabled=1

      ORDER BY

        s.priority ASC
      `

    )
    .bind(sub.id)
    .all();


  for (
    const server
    of result.results
  ) {

    configs.push(
      server.vless_url
    );

  }


  // Remove duplicates

  configs =
    [...new Set(configs)];


  return configs;

}


// =====================================================
// DISABLED SUB
// =====================================================

function disabledSubscription() {

  return new Response(

    "# 🔴 Подписка отключена",

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


// =====================================================
// SUB HEADERS
// =====================================================

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
      "no-store"

  };

}


// =====================================================
// SINGBOX
// =====================================================

function singboxResponse(
  configs,
  sub
) {

  const outbounds = [];


  for (
    const config
    of configs
  ) {

    const outbound =
      parseVlessForSingbox(
        config
      );


    if (outbound) {

      outbounds.push(
        outbound
      );

    }

  }


  return json({

    log: {

      level:
        "info"

    },

    outbounds,

    route: {

      auto_detect_interface:
        true

    }

  });

}


// =====================================================
// SIMPLE VLESS -> SINGBOX
// =====================================================

function parseVlessForSingbox(
  text
) {

  try {

    const url =
      new URL(text);


    if (
      url.protocol !==
      "vless:"
    ) {

      return null;

    }


    const uuid =
      url.username;


    const tag =
      decodeURIComponent(

        url.hash
          .replace("#", "")

      ) || "WLVPN";


    const outbound = {

      type:
        "vless",

      tag,

      server:
        url.hostname,

      server_port:
        Number(url.port),

      uuid,

      encryption:

        url.searchParams.get(
          "encryption"
        ) || "none"

    };


    const flow =
      url.searchParams.get(
        "flow"
      );


    if (flow) {

      outbound.flow =
        flow;

    }


    const security =
      url.searchParams.get(
        "security"
      );


    if (
      security === "reality"
    ) {

      outbound.tls = {

        enabled:
          true,

        server_name:

          url.searchParams.get(
            "sni"
          ) || "",


        reality: {

          enabled:
            true,

          public_key:

            url.searchParams.get(
              "pbk"
            ) || "",


          short_id:

            url.searchParams.get(
              "sid"
            ) || ""

        },


        utls: {

          enabled:
            true,

          fingerprint:

            url.searchParams.get(
              "fp"
            ) || "chrome"

        }

      };

    }


    if (
      security === "tls"
    ) {

      outbound.tls = {

        enabled:
          true,

        server_name:

          url.searchParams.get(
            "sni"
          ) || ""

      };

    }


    const type =
      url.searchParams.get(
        "type"
      );


    if (
      type === "ws"
    ) {

      outbound.transport = {

        type:
          "ws",

        path:

          url.searchParams.get(
            "path"
          ) || "/",


        headers: {}

      };


      const host =
        url.searchParams.get(
          "host"
        );


      if (host) {

        outbound.transport
          .headers
          .Host = host;

      }

    }


    if (
      type === "grpc"
    ) {

      outbound.transport = {

        type:
          "grpc",

        service_name:

          url.searchParams.get(
            "serviceName"
          ) || ""

      };

    }


    return outbound;

  }

  catch {

    return null;

  }

}


// =====================================================
// DASHBOARD
// =====================================================

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

      WHERE status='active'
      `

    )
    .first();


  const servers =
    await env.DB.prepare(

      `
      SELECT COUNT(*) AS count

      FROM servers

      WHERE enabled=1
      `

    )
    .first();


  const source =
    await env.KV.get(
      "source:configs"
    );


  return json({

    subscriptions:
      total.count,


    active:
      active.count,


    servers:
      servers.count,


    source_configs:

      source
        ? countConfigs(source)
        : 0

  });

}


// =====================================================
// PUBLIC STATUS
// =====================================================

async function publicStatus(
  env
) {

  const own =
    await env.DB.prepare(

      `
      SELECT

        id,

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
      own.results.map(
        x => ({

          name:
            x.name,

          status:

            x.enabled
              ? "online"
              : "disabled"

        })
      ),

    source_configs:

      source
        ? countConfigs(source)
        : 0

  });

}


// =====================================================
// HOME PAGE
// =====================================================

function homePage() {

  const html = `
<!DOCTYPE html>

<html lang="ru">

<head>

<meta charset="UTF-8">

<meta
name="viewport"
content="width=device-width, initial-scale=1">

<title>WLVPN — VPN сервис</title>

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
    #080b12;

  color:
    #ffffff;

}

header {

  padding:
    22px 8%;

  display:
    flex;

  justify-content:
    space-between;

  align-items:
    center;

  border-bottom:
    1px solid #1e2635;

}

.logo {

  font-size:
    24px;

  font-weight:
    bold;

}

.badge {

  padding:
    8px 14px;

  background:
    #14261b;

  border:
    1px solid #234b30;

  border-radius:
    30px;

}

.hero {

  text-align:
    center;

  padding:
    100px 20px;

}

.hero h1 {

  font-size:
    72px;

  margin:
    0;

}

.hero p {

  color:
    #a7b0c0;

  font-size:
    20px;

}

.stats {

  display:
    flex;

  justify-content:
    center;

  gap:
    20px;

  flex-wrap:
    wrap;

  padding:
    30px;

}

.card {

  width:
    220px;

  background:
    #101620;

  border:
    1px solid #1f2a3a;

  border-radius:
    18px;

  padding:
    25px;

}

.number {

  font-size:
    32px;

  font-weight:
    bold;

}

.servers {

  max-width:
    900px;

  margin:
    auto;

  padding:
    40px 20px;

}

.server {

  background:
    #101620;

  padding:
    18px;

  margin:
    10px 0;

  border-radius:
    14px;

  display:
    flex;

  justify-content:
    space-between;

}

footer {

  text-align:
    center;

  padding:
    50px;

  color:
    #718096;

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

<div class="badge">

🟢 Online

</div>

</header>


<section class="hero">

<h1>

WLVPN

</h1>

<p>

Быстрый и стабильный VPN

</p>

</section>


<div class="stats">

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

Source Configs

</div>

<div
class="number"
id="configs">

—

</div>

</div>


<div class="card">

<div>

Network

</div>

<div
class="number">

🟢

</div>

</div>

</div>


<section class="servers">

<h2>

VPN Серверы

</h2>

<div id="serverList">

Загрузка...

</div>

</section>


<footer>

© WLVPN

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


    root.innerHTML =
      "";


    if (
      data.own_servers.length === 0
    ) {

      root.innerHTML =

        "<p>Серверы скоро появятся</p>";

    }


    data.own_servers.forEach(

      server => {

        root.innerHTML +=

        '<div class="server">' +

        '<span>' +

        server.name +

        '</span>' +

        '<span>' +

        (
          server.status === "online"

            ? "🟢 Online"

            : "🔴 Disabled"

        ) +

        '</span>' +

        '</div>';

      }

    );

  }

  catch (e) {

    console.error(e);

  }

}


loadStatus();

setInterval(
  loadStatus,
  30000
);

</script>

</body>

</html>
`;


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


// =====================================================
// ADMIN PAGE
// =====================================================

function adminPage() {

  const html = `
<!DOCTYPE html>

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

  margin:
    0;

  background:
    #080b12;

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
    #101620;

  border:
    1px solid #202b3b;

  border-radius:
    16px;

  padding:
    20px;

  margin:
    15px 0;

}

input,
textarea,
select {

  width:
    100%;

  padding:
    12px;

  margin:
    6px 0;

  border:
    1px solid #29364a;

  border-radius:
    10px;

  background:
    #0b1018;

  color:
    white;

}

textarea {

  min-height:
    140px;

}

button {

  padding:
    11px 16px;

  margin:
    5px;

  border:
    0;

  border-radius:
    10px;

  cursor:
    pointer;

  background:
    #2563eb;

  color:
    white;

}

.danger {

  background:
    #dc2626;

}

.green {

  background:
    #16a34a;

}

.hidden {

  display:
    none;

}

.row {

  display:
    flex;

  gap:
    10px;

  flex-wrap:
    wrap;

}

.stat {

  flex:
    1;

  min-width:
    140px;

  background:
    #0b1018;

  padding:
    20px;

  border-radius:
    12px;

}

.sub {

  background:
    #0b1018;

  padding:
    15px;

  margin:
    10px 0;

  border-radius:
    12px;

}

code {

  word-break:
    break-all;

  color:
    #60a5fa;

}

</style>

</head>

<body>

<div class="container">


<div id="loginBox">

<div class="box">

<h1>

🏳 WLVPN Admin

</h1>

<input
id="password"
type="password"
placeholder="Пароль">

<button
onclick="login()">

Войти

</button>

</div>

</div>


<div
id="panel"
class="hidden">


<h1>

🏳 WLVPN Dashboard

</h1>


<div
class="row"
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
placeholder="Название">


<input
id="subLimit"
type="number"
placeholder="Лимит GB (0 = безлимит)">


<label>

<input
id="useSource"
type="checkbox"
checked>

Использовать исходные серверы

</label>


<br>


<button
onclick="createSub()">

Создать

</button>

</div>


<!-- SUBS -->

<div class="box">

<h2>

👤 Подписки

</h2>

<div
id="subs">

Загрузка...

</div>

</div>


<!-- IMPORT -->

<div class="box">

<h2>

📡 Импорт VLESS

</h2>

<textarea
id="vlessImport"
placeholder="vless://...
vless://...
vless://...">

</textarea>


<button
onclick="importServers()">

Импортировать

</button>

</div>


<!-- SERVERS -->

<div class="box">

<h2>

🖥 Мои серверы

</h2>

<div
id="servers">

Загрузка...

</div>

</div>


<button
class="danger"
onclick="logout()">

Выйти

</button>

</div>

</div>


<script>

async function api(
  url,
  options = {}
) {

  const headers =
    options.body

      ? {
          "Content-Type":
            "application/json"
        }

      : {};


  return fetch(

    url,

    {

      ...options,

      headers

    }

  );

}


async function checkAuth() {

  const r =
    await api(
      "/api/admin/check"
    );


  const d =
    await r.json();


  if (
    d.authorized
  ) {

    showPanel();

  }

}


async function login() {

  const password =
    document
      .getElementById(
        "password"
      )
      .value;


  const r =
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


  if (!r.ok) {

    alert(
      "Неверный пароль"
    );

    return;

  }


  showPanel();

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


async function loadAll() {

  await Promise.all([

    loadDashboard(),

    loadSource(),

    loadSubs(),

    loadServers()

  ]);

}


// DASHBOARD

async function loadDashboard() {

  const r =
    await api(
      "/api/admin/dashboard"
    );


  const d =
    await r.json();


  document
    .getElementById(
      "stats"
    )
    .innerHTML =

    '<div class="stat">Подписок<br><b>' +

    d.subscriptions +

    '</b></div>' +

    '<div class="stat">Активных<br><b>' +

    d.active +

    '</b></div>' +

    '<div class="stat">Моих серверов<br><b>' +

    d.servers +

    '</b></div>' +

    '<div class="stat">Source configs<br><b>' +

    d.source_configs +

    '</b></div>';

}


// SOURCE

async function loadSource() {

  const r =
    await api(
      "/api/admin/source"
    );


  const d =
    await r.json();


  document
    .getElementById(
      "sourceUrl"
    )
    .value = d.url || "";


  document
    .getElementById(
      "sourceInfo"
    )
    .textContent =

    d.meta

      ? (
          "Configs: " +

          d.meta.configs +

          " | Updated: " +

          d.meta.updated_at
        )

      : "Кеш пока пуст";

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


  alert(
    "Сохранено"
  );

}


async function updateSource() {

  const r =
    await api(

      "/api/admin/source/update",

      {
        method:
          "POST"
      }

    );


  const d =
    await r.json();


  alert(

    d.success

      ? "Обновлено. Configs: " +
        d.configs

      : "Ошибка: " +
        d.error

  );


  loadAll();

}


// CREATE SUB

async function createSub() {

  const name =
    document
      .getElementById(
        "subName"
      )
      .value;


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


  const r =
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


  const d =
    await r.json();


  if (d.success) {

    alert(

      "Подписка создана\\n\\n" +

      location.origin +

      d.url

    );


    loadSubs();

  }

}


// SUBS

async function loadSubs() {

  const r =
    await api(
      "/api/admin/subscriptions"
    );


  const data =
    await r.json();


  const root =
    document
      .getElementById(
        "subs"
      );


  root.innerHTML =
    "";


  data.forEach(

    s => {

      const url =
        location.origin +
        "/sub/" +
        s.token;


      root.innerHTML +=

      '<div class="sub">' +

      '<h3>' +

      escapeHtml(
        s.name
      ) +

      '</h3>' +


      '<div>' +

      (
        s.status === "active"

          ? "🟢 Active"

          : "🔴 Disabled"

      ) +

      '</div>' +


      '<p>' +

      'Traffic bonus: ' +

      s.traffic_bonus_gb +

      ' GB'

      +

      '</p>' +


      '<code>' +

      url +

      '</code>' +


      '<br>' +


      '<button onclick="copyText(' +

      JSON.stringify(url)

      +

      ')">📋 Copy</button>' +


      '<button onclick="toggleSub(' +

      JSON.stringify(
        s.id
      )

      +

      ',' +

      JSON.stringify(
        s.status
      )

      +

      ')">' +

      (
        s.status === "active"

          ? "🔴 Disable"

          : "🟢 Enable"

      ) +

      '</button>' +


      '<button onclick="addBonus(' +

      JSON.stringify(
        s.id
      )

      +

      ')">➕ Traffic</button>' +


      '<button class="danger" onclick="deleteSub(' +

      JSON.stringify(
        s.id
      )

      +

      ')">Delete</button>' +


      '</div>';

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


  loadSubs();

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

    "/api/admin/subscriptions/" +
    id,

    {

      method:
        "DELETE"

    }

  );


  loadSubs();

}


async function addBonus(
  id
) {

  const amount =
    prompt(
      "Сколько GB добавить?"
    );


  if (!amount) {

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
              Number(amount)

          })

    }

  );


  loadSubs();

}


// IMPORT

async function importServers() {

  const text =
    document
      .getElementById(
        "vlessImport"
      )
      .value;


  const r =
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


  const d =
    await r.json();


  alert(

    "Импортировано: " +

    d.imported

  );


  document
    .getElementById(
      "vlessImport"
    )
    .value = "";


  loadServers();

}


// SERVERS

async function loadServers() {

  const r =
    await api(
      "/api/admin/servers"
    );


  const data =
    await r.json();


  const root =
    document
      .getElementById(
        "servers"
      );


  root.innerHTML =
    "";


  data.forEach(

    s => {

      root.innerHTML +=

      '<div class="sub">' +

      '<b>' +

      escapeHtml(
        s.name
      ) +

      '</b>' +


      '<br>' +


      (
        s.enabled

          ? "🟢 Enabled"

          : "🔴 Disabled"

      ) +


      '<br>' +


      '<button onclick="toggleServer(' +

      JSON.stringify(
        s.id
      )

      +

      ',' +

      Number(
        s.enabled
      )

      +

      ')">Toggle</button>' +


      '<button class="danger" onclick="deleteServer(' +

      JSON.stringify(
        s.id
      )

      +

      ')">Delete</button>' +


      '</div>';

    }

  );

}


async function toggleServer(
  id,
  enabled
) {

  await api(

    "/api/admin/servers/" +
    id,

    {

      method:
        "PATCH",

        body:

          JSON.stringify({

            enabled:
              !enabled

          })

    }

  );


  loadServers();

}


async function deleteServer(
  id
) {

  if (
    !confirm(
      "Удалить сервер?"
    )
  ) {

    return;

  }


  await api(

    "/api/admin/servers/" +
    id,

    {

      method:
        "DELETE"

    }

  );


  loadServers();

}


// COPY

function copyText(
  text
) {

  navigator
    .clipboard
    .writeText(
      text
    );


  alert(
    "Скопировано"
  );

}


// ESCAPE

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


checkAuth();

</script>

</body>

</html>
`;


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


// =====================================================
// HELPERS
// =====================================================

async function getSub(
  env,
  id
) {

  return env.DB.prepare(

    `
    SELECT *

    FROM subscriptions

    WHERE id=?
    `

  )
  .bind(id)
  .first();

}


async function adminLog(
  env,
  action,
  details
) {

  try {

    await env.DB.prepare(

      `
      INSERT INTO admin_logs (

        id,

        action,

        details

      )

      VALUES (?, ?, ?)
      `

    )
    .bind(

      crypto.randomUUID(),

      action,

      details

    )
    .run();

  }

  catch {}

}


function generateToken() {

  const bytes =
    new Uint8Array(24);


  crypto.getRandomValues(
    bytes
  );


  return Array.from(bytes)

    .map(

      x =>

        x
          .toString(16)
          .padStart(2, "0")

    )
    .join("");

}


function extractVless(
  text
) {

  return String(text)

    .match(
      /vless:\/\/[^\s"'<>]+/g
    )

    ?.map(
      x => x.trim()
    )

    || [];

}


function countConfigs(
  text
) {

  return extractVless(
    text
  ).length;

}


function getVlessName(
  vless
) {

  try {

    const url =
      new URL(vless);


    return decodeURIComponent(

      url.hash
        .replace("#", "")

    );

  }

  catch {

    return "";

  }

}


function base64(
  text
) {

  const bytes =
    new TextEncoder()
      .encode(text);


  let binary =
    "";


  for (
    const byte
    of bytes
  ) {

    binary +=
      String.fromCharCode(
        byte
      );

  }


  return btoa(
    binary
  );

}


function simpleSubscriptionResponse(
  text
) {

  return new Response(

    "# " + text,

    {

      headers: {

        "Content-Type":
          "text/plain; charset=utf-8"

      }

    }

  );

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

      success:
        false,

      error:
        message

    },

    status

  );

}