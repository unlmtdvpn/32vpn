export default {
  async fetch(request, env, ctx) {
    // Поддержка CORS, если сайт обращается к воркеру кросс-доменно
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
        },
      });
    }

    if (request.method !== "POST") {
      return new Response("OK. Send POST request with JSON config.", { status: 200 });
    }

    try {
      let rawBody = await request.text();

      // Очистка невидимых управляющих символов, ломающих JSON.parse
      let cleanedBody = rawBody.replace(/[\u0000-\u001F\u007F-\u009F]/g, (ch) => {
        return '\\u' + ('0000' + ch.charCodeAt(0).toString(16)).slice(-4);
      });

      let config;
      try {
        config = JSON.parse(cleanedBody);
      } catch (err) {
        return new Response(JSON.stringify({
          success: false,
          error: "Ошибка парсинга JSON: " + err.message
        }), {
          status: 400,
          headers: { 
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*"
          }
        });
      }

      // Здесь идет ваша основная логика обработки конфига
      // (например, сохранение в KV или генерация ссылок)

      return new Response(JSON.stringify({
        success: true,
        message: "Конфиг успешно принят и обработан!",
        data: config
      }), {
        status: 200,
        headers: { 
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*"
        }
      });

    } catch (e) {
      return new Response(JSON.stringify({
        success: false,
        error: e.message
      }), {
        status: 500,
        headers: { 
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*"
        }
      });
    }
  }
};