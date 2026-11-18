export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // Массив всех твоих нод (сконвертированные vless:// ссылки + твой JSON-конфиг)
    const subscriptionList = [
      {
        "tag": "🇩🇪+Германия",
        "protocol": "vless",
        "settings": {
          "vnext": [{
            "address": "217.60.80.39",
            "port": 2083,
            "users": [{
              "id": "b8a0974b-7d22-4636-99c8-6d7b277ef2e2",
              "encryption": "none",
              "flow": "xtls-rprx-vision"
            }]
          }]
        },
        "streamSettings": {
          "network": "tcp",
          "security": "reality",
          "realitySettings": {
            "fingerprint": "firefox",
            "serverName": "static.elbfiles.com",
            "publicKey": "mSKSj1Vh2gP46y7a7XgCa7pghof57XgaczmvdS7G3B0",
            "shortId": "dee7296368479ee0",
            "spiderX": "/"
          }
        }
      },
      {
        "tag": "🇳🇱+Нидерланды",
        "protocol": "vless",
        "settings": {
          "vnext": [{
            "address": "217.60.82.35",
            "port": 2083,
            "users": [{
              "id": "b8a0974b-7d22-4636-99c8-6d7b277ef2e2",
              "encryption": "none",
              "flow": "xtls-rprx-vision"
            }]
          }]
        },
        "streamSettings": {
          "network": "tcp",
          "security": "reality",
          "realitySettings": {
            "fingerprint": "firefox",
            "serverName": "assets.grachtenhub.com",
            "publicKey": "vLtYoU12dFEcX2XeufESX-a4dRIPDD8I9HKkd4FtC0s",
            "shortId": "c83312388adc77b5",
            "spiderX": "/"
          }
        }
      },
      {
        "tag": "🇺🇸+США",
        "protocol": "vless",
        "settings": {
          "vnext": [{
            "address": "191.217.243.101",
            "port": 8443,
            "users": [{
              "id": "b8a0974b-7d22-1b59-99c8-6d7b277ef2e2",
              "encryption": "none",
              "flow": "xtls-rprx-vision"
            }]
          }]
        },
        "streamSettings": {
          "network": "tcp",
          "security": "reality",
          "realitySettings": {
            "fingerprint": "firefox",
            "serverName": "www.farlinehub.com",
            "publicKey": "QfEH-lQ71mDj47vu3axYma_GfoJjogiZ3EWzZu2U0V8",
            "shortId": "d994c2f49fdd1168",
            "spiderX": "/"
          }
        }
      },
      {
        "tag": "🇬🇧+Великобритания",
        "protocol": "vless",
        "settings": {
          "vnext": [{
            "address": "191.217.243.101",
            "port": 8443,
            "users": [{
              "id": "b8a0974b-7d22-1b5d-99c8-6d7b277ef2e2",
              "encryption": "none",
              "flow": "xtls-rprx-vision"
            }]
          }]
        },
        "streamSettings": {
          "network": "tcp",
          "security": "reality",
          "realitySettings": {
            "fingerprint": "firefox",
            "serverName": "www.farlinehub.com",
            "publicKey": "QfEH-lQ71mDj47vu3axYma_GfoJjogiZ3EWzZu2U0V8",
            "shortId": "d994c2f49fdd1168",
            "spiderX": "/"
          }
        }
      },
      {
        "tag": "🇸🇪+Швеция",
        "protocol": "vless",
        "settings": {
          "vnext": [{
            "address": "31.56.16.89",
            "port": 2083,
            "users": [{
              "id": "b8a0974b-7d22-4636-99c8-6d7b277ef2e2",
              "encryption": "none",
              "flow": "xtls-rprx-vision"
            }]
          }]
        },
        "streamSettings": {
          "network": "tcp",
          "security": "reality",
          "realitySettings": {
            "fingerprint": "firefox",
            "serverName": "taunusfiles.com",
            "publicKey": "rk4ArdGU9zYrwrJntFGoZptT0Rc333S5BRO2fDjremo",
            "shortId": "92132169ef33d72c",
            "spiderX": "/"
          }
        }
      },
      // Добавлены outbounds из твоего полного JSON-конфига (исключая direct/block)
      {
        "tag": "whitelist-1",
        "protocol": "vless",
        "settings": {
          "vnext": [{
            "address": "178.248.236.236",
            "port": 443,
            "users": [{ "id": "b8a0974b-7d22-4636-99c8-6d7b277ef2e2", "encryption": "none" }]
          }]
        },
        "streamSettings": {
          "network": "tcp",
          "security": "reality",
          "realitySettings": {
            "fingerprint": "firefox",
            "serverName": "dune.4ch.pro",
            "publicKey": "VSPUhEWTrbOypXn-YmjkdMqgtUrNeE5tCUOIo2lftCw",
            "shortId": "5324abeeeefc38d4",
            "spiderX": "/"
          }
        }
      },
      {
        "tag": "whitelist-2",
        "protocol": "vless",
        "settings": {
          "vnext": [{
            "address": "194.55.239.251",
            "port": 8443,
            "users": [{ "id": "b8a0974b-7d22-4636-99c8-6d7b277ef2e2", "encryption": "none" }]
          }]
        },
        "streamSettings": {
          "network": "grpc",
          "security": "reality",
          "realitySettings": {
            "fingerprint": "qq",
            "serverName": "wl16.4ch.pro",
            "publicKey": "h2vIM44s19FA-k0no8itsUoHRePcpbOg8cn5Mz7tqxw",
            "shortId": "6fefe0d395a8d22a",
            "spiderX": "/"
          },
          "grpcSettings": { "serviceName": "x5.lk.v1.AccountService" }
        }
      },
      {
        "tag": "whitelist-3",
        "protocol": "vless",
        "settings": {
          "vnext": [{
            "address": "194.55.239.109",
            "port": 443,
            "users": [{ "id": "b8a0974b-7d22-f243-99c8-6d7b277ef2e2", "encryption": "none" }]
          }]
        },
        "streamSettings": {
          "network": "grpc",
          "security": "reality",
          "realitySettings": {
            "fingerprint": "firefox",
            "serverName": "cloud.4ch.pro",
            "publicKey": "zpG3tgdseNoxANrk4Ec0TLRrnJ_8KU2DVu1a3hqDeyg",
            "shortId": "3b78ffb4514cfc4b",
            "spiderX": "/"
          },
          "grpcSettings": { "serviceName": "x5.lk.v1.AccountService" }
        }
      },
      {
        "tag": "whitelist-4",
        "protocol": "vless",
        "settings": {
          "vnext": [{
            "address": "46.243.233.19",
            "port": 2096,
            "users": [{ "id": "b8a0974b-7d22-1bbe-99c8-6d7b277ef2e2", "encryption": "none", "flow": "xtls-rprx-vision" }]
          }]
        },
        "streamSettings": {
          "network": "tcp",
          "security": "reality",
          "realitySettings": {
            "fingerprint": "firefox",
            "serverName": "inkwell.4ch.pro",
            "publicKey": "DggZ5FLY91EcoGTdw_3kssW6V424nnacm2ZN1UDi5So",
            "shortId": "cac9c3372b2051ef",
            "spiderX": "/"
          }
        }
      },
      {
        "tag": "whitelist-5",
        "protocol": "vless",
        "settings": {
          "vnext": [{
            "address": "assets57.mega-play.app",
            "port": 443,
            "users": [{ "id": "b8a0974b-7d22-4636-99c8-6d7b277ef2e2", "encryption": "none", "flow": "xtls-rprx-vision" }]
          }]
        },
        "streamSettings": {
          "network": "tcp",
          "security": "reality",
          "realitySettings": {
            "fingerprint": "firefox",
            "serverName": "assets57.mega-play.app",
            "publicKey": "6RW54R1rJu0oqvh_Ag5WAYYnyDiclypogyU79nCBMUo",
            "shortId": "eef4ec246e2defa8",
            "spiderX": "/"
          }
        }
      },
      {
        "tag": "whitelist-6",
        "protocol": "vless",
        "settings": {
          "vnext": [{
            "address": "185.178.208.167",
            "port": 443,
            "users": [{ "id": "b8a0974b-7d22-4636-99c8-6d7b277ef2e2", "encryption": "none" }]
          }]
        },
        "streamSettings": {
          "network": "ws",
          "security": "tls",
          "tlsSettings": {
            "serverName": "upload.4ch.pro",
            "fingerprint": "firefox",
            "alpn": ["http/1.1"]
          },
          "wsSettings": {
            "path": "/v1/sync/16a0156e37cf5cb781a41f10",
            "headers": { "Host": "upload.4ch.pro" }
          }
        }
      },
      {
        "tag": "whitelist-7",
        "protocol": "vless",
        "settings": {
          "vnext": [{
            "address": "188.225.47.178",
            "port": 443,
            "users": [{ "id": "b8a0974b-7d22-4636-99c8-6d7b277ef2e2", "encryption": "none", "flow": "xtls-rprx-vision" }]
          }]
        },
        "streamSettings": {
          "network": "tcp",
          "security": "reality",
          "realitySettings": {
            "fingerprint": "firefox",
            "serverName": "wl26.4ch.pro",
            "publicKey": "LpDKpTXSH5wZAfkSYoINlFAYzGI2AiEfdpFbiUAekQo",
            "shortId": "439a6bd97870c88a",
            "spiderX": "/"
          }
        }
      }
    ];

    // Отдача массива по пути /sub
    if (url.pathname === "/sub") {
      return new Response(JSON.stringify(subscriptionList, null, 2), {
        status: 200,
        headers: { 
          "Content-Type": "application/json;charset=UTF-8", 
          "Access-Control-Allow-Origin": "*" 
        }
      });
    }

    return new Response("OK. Open /sub to get JSON array.", { status: 200 });
  }
};