const APP_NAME = "WLVPN";

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
          headers: cors()
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


  // CRON

  async scheduled(
    event,
    env,
    ctx
  ) {

    if (
      event.cron ===
      "0 0 * * *"
    ) {

      ctx.waitUntil(
        addDailyTraffic(env)
      );

    }


    if (
      event.cron ===
      "*/5 * * * *"
    ) {

      ctx.waitUntil(
        checkServers(env)
      );

    }


    if (
      event.cron ===
      "0 * * * *"
    ) {

      ctx.waitUntil(
        cleanupSessions(env)
      );

    }

  }

};



// =====================================================
// CORS
// =====================================================

function cors() {

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


  // ===============================================
  // PUBLIC STATUS
  // ===============================================

  if (
    path === "/api/status"
  ) {

    return publicStatus(env);

  }


  // ===============================================
  // LOGIN
  // ===============================================

  if (
    path === "/api/login" &&
    request.method === "POST"
  ) {

    return login(
      request,
      env
    );

  }


  // ===============================================
  // LOGOUT
  // ===============================================

  if (
    path === "/api/logout" &&
    request.method === "POST"
  ) {

    return logout(
      request,
      env
    );

  }


  // ===============================================
  // AUTH CHECK
  // ===============================================

  if (
    path === "/api/admin/check"
  ) {

    const authorized =
      await auth(
        request,
        env
      );


    return Response.json({

      authorized

    });

  }


  // ===============================================
  // AUTH REQUIRED
  // ===============================================

  if (
    !await auth(
      request,
      env
    )
  ) {

    return error(
      "Unauthorized",
      401
    );

  }


  // ===============================================
  // DASHBOARD
  // ===============================================

  if (
    path ===
    "/api/admin/dashboard"
  ) {

    return dashboard(env);

  }


  // ===============================================
  // SUBSCRIPTIONS
  // ===============================================

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


  // ===============================================
  // SUBSCRIPTION ACTIONS
  // ===============================================

  const sub =
    path.match(

      /^\/api\/admin\/subscriptions\/([^/]+)$/

    );


  if (sub) {

    const id =
      sub[1];


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


  // ===============================================
  // SUBSCRIPTION TRAFFIC
  // ===============================================

  const traffic =
    path.match(

      /^\/api\/admin\/subscriptions\/([^/]+)\/traffic$/

    );


  if (
    traffic &&
    request.method === "POST"
  ) {

    return changeTraffic(
      request,
      env,
      traffic[1]
    );

  }


  // ===============================================
  // SUBSCRIPTION SERVERS
  // ===============================================

  const subServers =
    path.match(

      /^\/api\/admin\/subscriptions\/([^/]+)\/servers$/

    );


  if (subServers) {

    if (
      request.method === "GET"
    ) {

      return getSubscriptionServers(
        env,
        subServers[1]
      );

    }


    if (
      request.method === "POST"
    ) {

      return setSubscriptionServers(
        request,
        env,
        subServers[1]
      );

    }

  }


  // ===============================================
  // SERVERS
  // ===============================================

  if (
    path ===
    "/api/admin/servers"
  ) {

    if (
      request.method === "GET"
    ) {

      return getServers(env);

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


  // ===============================================
  // SINGLE SERVER
  // ===============================================

  const server =
    path.match(

      /^\/api\/admin\/servers\/([^/]+)$/

    );


  if (server) {

    if (
      request.method === "PATCH"
    ) {

      return updateServer(
        request,
        env,
        server[1]
      );

    }


    if (
      request.method === "DELETE"
    ) {

      return deleteServer(
        env,
        server[1]
      );

    }

  }


  // ===============================================
  // SERVER CHECK
  // ===============================================

  if (
    path ===
    "/api/admin/check-servers" &&
    request.method === "POST"
  ) {

    ctx.waitUntil(
      checkServers(env)
    );


    return Response.json({

      success: true

    });

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

  const body =
    await request.json();


  if (
    body.password !==
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

    `session:${session}`,

    "1",

    {

      expirationTtl:
        SESSION_TTL

    }

  );


  await log(

    env,

    "LOGIN",

    "Admin login"

  );


  return Response.json(

    {

      success: true

    },

    {

      headers: {

        "Set-Cookie":

          `session=${session}; ` +

          "HttpOnly; " +

          "Secure; " +

          "SameSite=Strict; " +

          "Path=/; " +

          `Max-Age=${SESSION_TTL}`

      }

    }

  );

}



async function logout(
  request,
  env
) {

  const session =
    sessionId(request);


  if (session) {

    await env.KV.delete(
      `session:${session}`
    );

  }


  return Response.json({

    success: true

  });

}



async function auth(
  request,
  env
) {

  const id =
    sessionId(request);


  if (!id)
    return false;


  const value =
    await env.KV.get(
      `session:${id}`
    );


  return !!value;

}



function sessionId(
  request
) {

  const cookie =
    request.headers.get("Cookie") || "";


  const match =
    cookie.match(
      /session=([^;]+)/
    );


  return match
    ? match[1]
    : null;

}



// =====================================================
// SUBSCRIPTION ROUTER
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
    parts[2] || "auto";


  const subscription =
    await env.DB.prepare(

      `
      SELECT *
      FROM subscriptions
      WHERE token=?
      `

    )
    .bind(token)
    .first();


  if (!subscription) {

    return new Response(

      "Subscription not found",

      {

        status: 404

      }

    );

  }


  // ===============================================
  // DISABLED
  // ===============================================

  if (
    subscription.status !==
    "active"
  ) {

    return disabledResponse(
      format
    );

  }


  // ===============================================
  // EXPIRED
  // ===============================================

  if (
    subscription.expires_at
  ) {

    const expire =
      new Date(
        subscription.expires_at
      );


    if (
      expire < new Date()
    ) {

      return expiredResponse(
        format
      );

    }

  }


  // ===============================================
  // TRAFFIC LIMIT
  // ===============================================

  if (

    subscription.traffic_limit_gb > 0 &&

    subscription.traffic_used_gb >=
    subscription.traffic_limit_gb

  ) {

    return limitResponse(
      format
    );

  }


  // ===============================================
  // GET SERVERS
  // ===============================================

  const servers =
    await getServersForSubscription(

      env,

      subscription.id

    );


  // ===============================================
  // SING-BOX
  // ===============================================

  if (
    format === "singbox"
  ) {

    return singboxResponse(

      subscription,

      servers

    );

  }


  // ===============================================
  // JSON
  // ===============================================

  if (
    format === "json"
  ) {

    return Response.json({

      subscription,

      servers,

      configs:

        servers.map(

          server =>

            buildVless(

              subscription,
              server

            )

        )

    });

  }


  // ===============================================
  // INFO
  // ===============================================

  if (
    format === "info"
  ) {

    return subscriptionInfo(
      subscription
    );

  }


  // ===============================================
  // VLESS
  // ===============================================

  const configs =
    servers.map(

      server =>

        buildVless(

          subscription,

          server

        )

    );


  const text =
    configs.join("\\n");


  // ===============================================
  // BASE64
  // ===============================================

  if (
    format === "base64"
  ) {

    return new Response(

      toBase64(text),

      {

        headers:

          subscriptionHeaders(
            subscription
          )

      }

    );

  }


  // ===============================================
  // NORMAL
  // ===============================================

  return new Response(

    text,

    {

      headers:

        subscriptionHeaders(
          subscription
        )

    }

  );

}



// =====================================================
// GET SERVERS FOR USER
// =====================================================

async function getServersForSubscription(
  env,
  subscriptionId
) {

  const assigned =
    await env.DB.prepare(

      `
      SELECT

        s.*

      FROM vpn_servers s

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
    .bind(subscriptionId)
    .all();


  // Если серверы не назначены
  // использовать все активные

  if (
    assigned.results.length > 0
  ) {

    return assigned.results;

  }


  const all =
    await env.DB.prepare(

      `
      SELECT *

      FROM vpn_servers

      WHERE enabled=1

      ORDER BY priority ASC
      `

    )
    .all();


  return all.results;

}



// =====================================================
// BUILD VLESS
// =====================================================

function buildVless(
  subscription,
  server
) {

  const uuid =
    subscription.user_uuid;


  const name =
    encodeURIComponent(

      `${server.country} ${server.name}`

    );


  const params =
    new URLSearchParams();


  params.set(

    "encryption",

    server.encryption || "none"

  );


  if (
    server.flow
  ) {

    params.set(
      "flow",
      server.flow
    );

  }


  params.set(

    "type",

    server.network || "tcp"

  );


  params.set(

    "security",

    server.security || "none"

  );


  // ===============================================
  // REALITY
  // ===============================================

  if (
    server.security ===
    "reality"
  ) {

    params.set(

      "pbk",

      server.public_key

    );


    if (
      server.short_id
    ) {

      params.set(

        "sid",

        server.short_id

      );

    }


    if (
      server.sni
    ) {

      params.set(

        "sni",

        server.sni

      );

    }


    params.set(

      "fp",

      server.fingerprint ||
      "chrome"

    );

  }


  // ===============================================
  // TLS
  // ===============================================

  if (

    server.security === "tls" &&

    server.sni

  ) {

    params.set(
      "sni",
      server.sni
    );

  }


  // ===============================================
  // WS
  // ===============================================

  if (
    server.network === "ws"
  ) {

    if (
      server.path
    ) {

      params.set(
        "path",
        server.path
      );

    }


    if (
      server.host
    ) {

      params.set(
        "host",
        server.host
      );

    }

  }


  // ===============================================
  // GRPC
  // ===============================================

  if (
    server.network === "grpc"
  ) {

    if (
      server.service_name
    ) {

      params.set(

        "serviceName",

        server.service_name

      );

    }

  }


  // ===============================================
  // ALPN
  // ===============================================

  if (
    server.alpn
  ) {

    params.set(
      "alpn",
      server.alpn
    );

  }


  return (

    `vless://` +

    `${uuid}@` +

    `${server.address}:` +

    `${server.port}` +

    `?${params.toString()}` +

    `#${name}`

  );

}



// =====================================================
// SING-BOX
// =====================================================

function singboxResponse(
  subscription,
  servers
) {

  const outbounds =
    servers.map(

      server =>

        buildSingboxOutbound(

          subscription,

          server

        )

    );


  const config = {

    log: {

      level:
        "info"

    },


    outbounds,


    route: {

      auto_detect_interface:
        true

    }

  };


  return Response.json(

    config,

    {

      headers: {

        "Content-Disposition":

          `attachment; filename="${safeName(subscription.name)}.json"`,

        "Cache-Control":
          "no-store"

      }

    }

  );

}



// =====================================================
// BUILD SINGBOX OUTBOUND
// =====================================================

function buildSingboxOutbound(
  subscription,
  server
) {

  const outbound = {

    type:
      "vless",


    tag:

      `${server.country} ${server.name}`,


    server:
      server.address,


    server_port:
      Number(server.port),


    uuid:
      subscription.user_uuid,


    flow:
      server.flow || ""


  };


  // ===============================================
  // TLS
  // ===============================================

  if (

    server.security === "tls" ||

    server.security === "reality"

  ) {

    outbound.tls = {

      enabled:
        true,

      server_name:
        server.sni || ""

    };


  }


  // ===============================================
  // REALITY
  // ===============================================

  if (
    server.security ===
    "reality"
  ) {

    outbound.tls.reality = {

      enabled:
        true,

      public_key:
        server.public_key,


      short_id:
        server.short_id

    };


    outbound.tls.utls = {

      enabled:
        true,

      fingerprint:

        server.fingerprint ||
        "chrome"

    };

  }


  // ===============================================
  // TRANSPORT
  // ===============================================

  if (
    server.network ===
    "ws"
  ) {

    outbound.transport = {

      type:
        "ws",

      path:
        server.path || "/",


      headers: {}

    };


    if (
      server.host
    ) {

      outbound.transport.headers.Host =
        server.host;

    }

  }


  if (
    server.network ===
    "grpc"
  ) {

    outbound.transport = {

      type:
        "grpc",

      service_name:
        server.service_name || ""

    };

  }


  return outbound;

}



// =====================================================
// SUBSCRIPTION HEADERS
// =====================================================

function subscriptionHeaders(
  subscription
) {

  const total =
    Math.round(

      subscription.traffic_limit_gb *

      1024 *

      1024 *

      1024

    );


  const used =
    Math.round(

      subscription.traffic_used_gb *

      1024 *

      1024 *

      1024

    );


  return {

    "Content-Type":

      "text/plain; charset=utf-8",


    "Profile-Title":

      subscription.name,


    "Subscription-Userinfo":

      `upload=0; ` +

      `download=${used}; ` +

      `total=${total}; ` +

      `expire=${subscription.expires_at ? Math.floor(new Date(subscription.expires_at).getTime()/1000) : 0}`,


    "Profile-Update-Interval":
      "24",


    "Cache-Control":
      "no-store"

  };

}



// =====================================================
// CREATE SUBSCRIPTION
// =====================================================

async function createSubscription(
  request,
  env
) {

  const data =
    await request.json();


  const id =
    crypto.randomUUID();


  const token =
    generateToken();


  const userUUID =
    crypto.randomUUID();


  const name =
    String(

      data.name ||
      "WLVPN User"

    );


  const trafficLimit =
    Number(

      data.traffic_limit_gb || 0

    );


  const deviceLimit =
    Number(

      data.device_limit || 1

    );


  const expires =
    data.expires_at || null;


  await env.DB.prepare(

    `
    INSERT INTO subscriptions (

      id,

      token,

      name,

      user_uuid,

      traffic_limit_gb,

      device_limit,

      expires_at,

      status

    )

    VALUES (?, ?, ?, ?, ?, ?, ?, 'active')
    `

  )
  .bind(

    id,

    token,

    name,

    userUUID,

    trafficLimit,

    deviceLimit,

    expires

  )
  .run();


  await log(

    env,

    "SUB_CREATED",

    name

  );


  return Response.json({

    success:
      true,


    subscription: {

      id,

      token,

      name,

      uuid:
        userUUID,


      url:

        `/sub/${token}`,


      singbox:

        `/sub/${token}/singbox`,


      base64:

        `/sub/${token}/base64`


    }

  });

}



// =====================================================
// GET SUBSCRIPTIONS
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


  return Response.json(
    result.results
  );

}



// =====================================================
// GET SUBSCRIPTION
// =====================================================

async function getSubscription(
  env,
  id
) {

  const result =
    await env.DB.prepare(

      `
      SELECT *

      FROM subscriptions

      WHERE id=?
      `

    )
    .bind(id)
    .first();


  if (!result) {

    return error(
      "Not found",
      404
    );

  }


  return Response.json(
    result
  );

}



// =====================================================
// UPDATE SUBSCRIPTION
// =====================================================

async function updateSubscription(
  request,
  env,
  id
) {

  const data =
    await request.json();


  const current =
    await getSub(
      env,
      id
    );


  if (!current) {

    return error(
      "Not found",
      404
    );

  }


  const name =
    data.name ??
    current.name;


  const status =
    data.status ??
    current.status;


  const limit =
    data.traffic_limit_gb ??
    current.traffic_limit_gb;


  const deviceLimit =
    data.device_limit ??
    current.device_limit;


  const expires =
    data.expires_at ??
    current.expires_at;


  await env.DB.prepare(

    `
    UPDATE subscriptions

    SET

      name=?,

      status=?,

      traffic_limit_gb=?,

      device_limit=?,

      expires_at=?,

      updated_at=CURRENT_TIMESTAMP

    WHERE id=?
    `

  )
  .bind(

    name,

    status,

    limit,

    deviceLimit,

    expires,

    id

  )
  .run();


  await log(

    env,

    "SUB_UPDATED",

    name

  );


  return Response.json({

    success: true

  });

}



// =====================================================
// DELETE SUB
// =====================================================

async function deleteSubscription(
  env,
  id
) {

  await env.DB.batch([

    env.DB.prepare(

      `
      DELETE FROM
      subscription_servers

      WHERE subscription_id=?
      `

    )
    .bind(id),


    env.DB.prepare(

      `
      DELETE FROM
      traffic_history

      WHERE subscription_id=?
      `

    )
    .bind(id),


    env.DB.prepare(

      `
      DELETE FROM
      subscriptions

      WHERE id=?
      `

    )
    .bind(id)

  ]);


  return Response.json({

    success: true

  });

}



// =====================================================
// CHANGE TRAFFIC
// =====================================================

async function changeTraffic(
  request,
  env,
  id
) {

  const data =
    await request.json();


  const amount =
    Number(
      data.amount_gb
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


  const newTraffic =
    Math.max(

      0,

      Number(
        sub.traffic_used_gb
      ) +

      amount

    );


  await env.DB.batch([


    env.DB.prepare(

      `
      UPDATE subscriptions

      SET

        traffic_used_gb=?

      WHERE id=?
      `

    )
    .bind(

      newTraffic,

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


  return Response.json({

    success: true,

    traffic_used_gb:
      newTraffic

  });

}



// =====================================================
// GET SUB SERVERS
// =====================================================

async function getSubscriptionServers(
  env,
  id
) {

  const result =
    await env.DB.prepare(

      `
      SELECT

        server_id

      FROM

        subscription_servers

      WHERE

        subscription_id=?
      `

    )
    .bind(id)
    .all();


  return Response.json(
    result.results
  );

}



// =====================================================
// SET SUB SERVERS
// =====================================================

async function setSubscriptionServers(
  request,
  env,
  id
) {

  const data =
    await request.json();


  const serverIds =
    Array.isArray(
      data.server_ids
    )

      ? data.server_ids

      : [];


  const queries = [

    env.DB.prepare(

      `
      DELETE FROM
      subscription_servers

      WHERE subscription_id=?
      `

    )
    .bind(id)

  ];


  for (
    const serverId
    of serverIds
  ) {

    queries.push(

      env.DB.prepare(

        `
        INSERT INTO
        subscription_servers (

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


  return Response.json({

    success: true

  });

}



// =====================================================
// CREATE SERVER
// =====================================================

async function createServer(
  request,
  env
) {

  const d =
    await request.json();


  const id =
    crypto.randomUUID();


  await env.DB.prepare(

    `
    INSERT INTO vpn_servers (

      id,

      name,

      country,

      city,

      address,

      port,

      flow,

      network,

      security,

      encryption,

      sni,

      public_key,

      short_id,

      fingerprint,

      path,

      host,

      service_name,

      alpn,

      check_url,

      priority

    )

    VALUES (

      ?,?,?,?,?,?,?,?,?,?,
      ?,?,?,?,?,?,?,?,?,?

    )
    `

  )
  .bind(

    id,

    d.name || "Server",

    d.country || "",

    d.city || "",

    d.address,

    Number(d.port),

    d.flow || "",

    d.network || "tcp",

    d.security || "reality",

    d.encryption || "none",

    d.sni || "",

    d.public_key || "",

    d.short_id || "",

    d.fingerprint || "chrome",

    d.path || "",

    d.host || "",

    d.service_name || "",

    d.alpn || "",

    d.check_url || "",

    Number(d.priority || 1)

  )
  .run();


  return Response.json({

    success: true,

    id

  });

}



// =====================================================
// GET SERVERS
// =====================================================

async function getServers(
  env
) {

  const result =
    await env.DB.prepare(

      `
      SELECT *

      FROM vpn_servers

      ORDER BY priority ASC
      `

    )
    .all();


  return Response.json(
    result.results
  );

}



// =====================================================
// UPDATE SERVER
// =====================================================

async function updateServer(
  request,
  env,
  id
) {

  const data =
    await request.json();


  const old =
    await env.DB.prepare(

      `
      SELECT *

      FROM vpn_servers

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


  const fields = [

    "name",

    "country",

    "city",

    "enabled",

    "priority",

    "address",

    "port",

    "flow",

    "network",

    "security",

    "encryption",

    "sni",

    "public_key",

    "short_id",

    "fingerprint",

    "path",

    "host",

    "service_name",

    "alpn",

    "check_url"

  ];


  const values =
    fields.map(

      key =>

        data[key] ??
        old[key]

    );


  await env.DB.prepare(

    `
    UPDATE vpn_servers

    SET

      name=?,
      country=?,
      city=?,
      enabled=?,
      priority=?,
      address=?,
      port=?,
      flow=?,
      network=?,
      security=?,
      encryption=?,
      sni=?,
      public_key=?,
      short_id=?,
      fingerprint=?,
      path=?,
      host=?,
      service_name=?,
      alpn=?,
      check_url=?

    WHERE id=?
    `

  )
  .bind(

    ...values,

    id

  )
  .run();


  return Response.json({

    success: true

  });

}



// =====================================================
// DELETE SERVER
// =====================================================

async function deleteServer(
  env,
  id
) {

  await env.DB.batch([

    env.DB.prepare(

      `
      DELETE FROM
      subscription_servers

      WHERE server_id=?
      `

    )
    .bind(id),


    env.DB.prepare(

      `
      DELETE FROM
      vpn_servers

      WHERE id=?
      `

    )
    .bind(id)

  ]);


  return Response.json({

    success: true

  });

}



// =====================================================
// SERVER CHECK
// =====================================================

async function checkServers(
  env
) {

  const result =
    await env.DB.prepare(

      `
      SELECT *

      FROM vpn_servers

      WHERE enabled=1
      `

    )
    .all();


  for (
    const server
    of result.results
  ) {

    await checkServer(
      env,
      server
    );

  }

}



async function checkServer(
  env,
  server
) {

  const target =

    server.check_url ||

    `https://${server.address}`;


  const start =
    Date.now();


  let ping = 0;

  let status =
    "offline";


  try {

    const controller =
      new AbortController();


    const timer =
      setTimeout(

        () =>
          controller.abort(),

        5000

      );


    const response =
      await fetch(

        target,

        {

          method:
            "HEAD",

          signal:
            controller.signal

        }

      );


    clearTimeout(timer);


    if (
      response.ok
    ) {

      ping =
        Date.now() -
        start;


      status =
        "online";

    }

  }

  catch {}


  await env.DB.prepare(

    `
    UPDATE vpn_servers

    SET

      last_ping=?,

      last_status=?,

      last_check=CURRENT_TIMESTAMP

    WHERE id=?
    `

  )
  .bind(

    ping,

    status,

    server.id

  )
  .run();

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


  for (
    const sub
    of result.results
  ) {

    const amount =
      randomTraffic();


    await env.DB.batch([


      env.DB.prepare(

        `
        UPDATE subscriptions

        SET

          traffic_added_gb=
          traffic_added_gb + ?

        WHERE id=?
        `

      )
      .bind(

        amount,

        sub.id

      ),


      env.DB.prepare(

        `
        INSERT INTO traffic_history (

          id,

          subscription_id,

          amount_gb,

          type

        )

        VALUES (?, ?, ?, 'daily_bonus')
        `

      )
      .bind(

        crypto.randomUUID(),

        sub.id,

        amount

      )

    ]);

  }

}



// =====================================================
// RANDOM TRAFFIC
// =====================================================

function randomTraffic() {

  return (

    Math.floor(
      Math.random() * 99
    ) + 1

  ) / 10;

}



// =====================================================
// DASHBOARD
// =====================================================

async function dashboard(
  env
) {

  const subscriptions =
    await env.DB.prepare(

      `
      SELECT COUNT(*) count
      FROM subscriptions
      `

    )
    .first();


  const active =
    await env.DB.prepare(

      `
      SELECT COUNT(*) count
      FROM subscriptions
      WHERE status='active'
      `

    )
    .first();


  const servers =
    await env.DB.prepare(

      `
      SELECT COUNT(*) count
      FROM vpn_servers
      `

    )
    .first();


  const online =
    await env.DB.prepare(

      `
      SELECT COUNT(*) count
      FROM vpn_servers
      WHERE last_status='online'
      `

    )
    .first();


  return Response.json({

    subscriptions:
      subscriptions.count,


    active:
      active.count,


    servers:
      servers.count,


    online:
      online.count

  });

}



// =====================================================
// PUBLIC STATUS
// =====================================================

async function publicStatus(
  env
) {

  const result =
    await env.DB.prepare(

      `
      SELECT

        name,

        country,

        city,

        last_ping,

        last_status

      FROM vpn_servers

      WHERE enabled=1

      ORDER BY priority ASC
      `

    )
    .all();


  return Response.json({

    app:
      APP_NAME,


    status:
      "online",


    servers:
      result.results

  });

}



// =====================================================
// DAILY SUB HELPERS
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



// =====================================================
// SUB INFO
// =====================================================

function subscriptionInfo(
  sub
) {

  return Response.json({

    name:
      sub.name,


    status:
      sub.status,


    uuid:
      sub.user_uuid,


    traffic_used_gb:
      sub.traffic_used_gb,


    traffic_limit_gb:
      sub.traffic_limit_gb,


    device_limit:
      sub.device_limit,


    expires_at:
      sub.expires_at

  });

}



// =====================================================
// DISABLED
// =====================================================

function disabledResponse(
  format
) {

  if (
    format === "singbox"
  ) {

    return Response.json({

      outbounds: [

        {

          type:
            "block",

          tag:
            "🔴 Subscription Disabled"

        }

      ]

    });

  }


  return new Response(

    "# 🔴 Subscription Disabled",

    {

      headers: {

        "Content-Type":

          "text/plain; charset=utf-8",


        "Profile-Title":

          "🔴 Subscription Disabled"

      }

    }

  );

}



// =====================================================
// EXPIRED
// =====================================================

function expiredResponse(
  format
) {

  return new Response(

    "# ⏳ Subscription Expired",

    {

      headers: {

        "Content-Type":
          "text/plain",

        "Profile-Title":
          "⏳ Subscription Expired"

      }

    }

  );

}



// =====================================================
// TRAFFIC LIMIT
// =====================================================

function limitResponse(
  format
) {

  return new Response(

    "# 🚫 Traffic Limit Reached",

    {

      headers: {

        "Content-Type":
          "text/plain",

        "Profile-Title":
          "🚫 Traffic Limit Reached"

      }

    }

  );

}



// =====================================================
// LOG
// =====================================================

async function log(
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



// =====================================================
// TOKEN
// =====================================================

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



// =====================================================
// BASE64
// =====================================================

function toBase64(
  text
) {

  const bytes =
    new TextEncoder()
    .encode(text);


  let binary =
    "";


  bytes.forEach(

    byte =>

      binary +=
      String.fromCharCode(byte)

  );


  return btoa(binary);

}



// =====================================================
// SAFE NAME
// =====================================================

function safeName(
  name
) {

  return String(name)

    .replace(
      /[^a-z0-9_-]/gi,
      "_"
    )

    .slice(
      0,
      50
    );

}



// =====================================================
// ERROR
// =====================================================

function error(
  message,
  status = 400
) {

  return Response.json(

    {

      success:
        false,

      error:
        message

    },

    {

      status

    }

  );

}



// =====================================================
// CLEANUP
// =====================================================

async function cleanupSessions(
  env
) {

  // KV expiration происходит автоматически.
  // Функция оставлена для будущей очистки.

}



// =====================================================
// HOME PAGE
// =====================================================

function homePage() {

  return new Response(

    `

<!DOCTYPE html>

<html lang="ru">

<head>

<meta charset="UTF-8">

<meta
name="viewport"
content="width=device-width,initial-scale=1">

<title>WLVPN</title>

<style>

body{

margin:0;

background:#07090d;

color:white;

font-family:Arial;

}

header{

padding:25px 8%;

display:flex;

justify-content:space-between;

}

.hero{

padding:100px 20px;

text-align:center;

}

h1{

font-size:80px;

margin:0;

}

.grid{

display:grid;

grid-template-columns:

repeat(
auto-fit,
minmax(220px,1fr)
);

gap:20px;

padding:40px 8%;

}

.server{

background:#11151d;

padding:25px;

border-radius:18px;

border:1px solid #222b38;

}

.online{

color:#4ade80;

}

.offline{

color:#f87171;

}

</style>

</head>

<body>

<header>

<b>🏳 WLVPN</b>

<span>🟢 Network Online</span>

</header>


<section class="hero">

<h1>WLVPN</h1>

<p>

Secure VPN Infrastructure

</p>

</section>


<section
class="grid"
id="servers">

Loading...

</section>


<script>

async function load(){

const r=
await fetch(
"/api/status"
);

const d=
await r.json();

const root=
document.getElementById(
"servers"
);

root.innerHTML="";

d.servers.forEach(s=>{

root.innerHTML+=\`

<div class="server">

<h2>

\${s.country}
\${s.name}

</h2>

<div class="\${s.last_status}">

\${s.last_status==="online"

?"🟢 Online"

:"🔴 Offline"

}

</div>

<h3>

\${s.last_ping || "—"} ms

</h3>

</div>

\`;

});

}

load();

setInterval(
load,
15000
);

</script>

</body>

</html>

`

  );

}



// =====================================================
// ADMIN PAGE
// =====================================================

function adminPage() {

  return new Response(

    `
<!DOCTYPE html>

<html>

<head>

<meta charset="UTF-8">

<meta
name="viewport"
content="width=device-width,initial-scale=1">

<title>WLVPN Admin</title>

<style>

body{

background:#080a0f;

color:white;

font-family:Arial;

padding:20px;

}

input,
button,
select{

padding:12px;

margin:5px;

border-radius:8px;

border:0;

}

input,
select{

background:#161a22;

color:white;

}

button{

cursor:pointer;

}

.card{

background:#11151c;

padding:20px;

margin:10px 0;

border-radius:12px;

}

.hidden{

display:none;

}

</style>

</head>

<body>

<div id="login">

<h1>🏳 WLVPN Admin</h1>

<input
id="password"
type="password"
placeholder="Password">

<button onclick="login()">

Login

</button>

</div>


<div
id="panel"
class="hidden">

<h1>

Dashboard

</h1>

<div id="stats"></div>


<hr>


<h2>

Subscriptions

</h2>


<input
id="subName"
placeholder="Name">


<input
id="traffic"
type="number"
placeholder="Traffic GB">


<button
onclick="createSub()">

Create

</button>


<div id="subs"></div>


<hr>


<h2>

Servers

</h2>


<input
id="serverName"
placeholder="Name">


<input
id="address"
placeholder="IP or Domain">


<input
id="port"
placeholder="Port">


<input
id="publicKey"
placeholder="Reality Public Key">


<button
onclick="createServer()">

Add Server

</button>


<div id="servers"></div>

</div>


<script>

async function api(
url,
options={}
){

return fetch(

url,

{

...options,

headers:{

"Content-Type":
"application/json"

}

}

);

}


async function login(){

const password=

document
.getElementById(
"password"
)
.value;


const r=
await api(

"/api/login",

{

method:"POST",

body:
JSON.stringify({
password
})

}

);


if(r.ok){

document
.getElementById(
"login"
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


load();

}

}


async function load(){

loadDashboard();

loadSubs();

loadServers();

}


async function loadDashboard(){

const r=
await api(
"/api/admin/dashboard"
);

const d=
await r.json();

document
.getElementById(
"stats"
)
innerHTML=

\`

<div class="card">

Subscriptions:
\${d.subscriptions}

</div>

<div class="card">

Active:
\${d.active}

</div>

<div class="card">

Servers:
\${d.servers}

</div>

<div class="card">

Online:
\${d.online}

</div>

\`;

}


async function loadSubs(){

const r=
await api(
"/api/admin/subscriptions"
);

const data=
await r.json();

const root=
document
.getElementById(
"subs"
);

root.innerHTML="";

data.forEach(s=>{

root.innerHTML+=

\`

<div class="card">

<b>

\${s.name}

</b>

<br>

Status:
\${s.status}

<br>

UUID:

<code>

\${s.user_uuid}

</code>

<br>

<a

href="/sub/\${s.token}"

target="_blank"

>

Subscription

</a>

|

<a

href="/sub/\${s.token}/singbox"

target="_blank"

>

sing-box

</a>

</div>

\`;

});

}


async function createSub(){

await api(

"/api/admin/subscriptions",

{

method:"POST",

body:
JSON.stringify({

name:

document
.getElementById(
"subName"
)
.value,


traffic_limit_gb:

Number(

document
.getElementById(
"traffic"
)
.value

)

})

}

);

loadSubs();

}


async function loadServers(){

const r=
await api(
"/api/admin/servers"
);

const data=
await r.json();

const root=
document
.getElementById(
"servers"
);

root.innerHTML="";

data.forEach(s=>{

root.innerHTML+=

\`

<div class="card">

<b>

\${s.country}
\${s.name}

</b>

<br>

\${s.address}:
\${s.port}

<br>

Ping:
\${s.last_ping}

</div>

\`;

});

}


async function createServer(){

await api(

"/api/admin/servers",

{

method:"POST",

body:
JSON.stringify({

name:

document
.getElementById(
"serverName"
)
.value,


address:

document
.getElementById(
"address"
)
.value,


port:

Number(

document
.getElementById(
"port"
)
.value

),


public_key:

document
.getElementById(
"publicKey"
)
.value,


security:
"reality"

})

}

);

loadServers();

}

</script>

</body>

</html>

`

  );

}