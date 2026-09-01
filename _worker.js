export default {
  async fetch(request) {
    // 1. Получаем User-Agent
    const userAgent = request.headers.get('User-Agent') || '';

    // 2. Список ключевых слов клиентов (можно дополнять)
    const clientKeywords = [
      'Hiddify',
      'v2ray',
      'V2Ray',
      'clash',
      'Clash',
      'nekoray',
      'NekoRay',
      'sing-box',
      'singbox',
      'Nekoray',
      'Mihomo',   // Clash Meta
      'Stash',
      'Karing',
      'Shadowrocket',
      'happ',
      'incy',
      'Loon'
    ];

    // 3. Проверяем, содержит ли User-Agent хотя бы одно ключевое слово
    const isClient = clientKeywords.some(keyword => userAgent.includes(keyword));

    // 4. Если это НЕ клиент – возвращаем 404 (или пустой ответ)
    if (!isClient) {
      return new Response('Not Found', { status: 404 });
    }

    // 5. Формируем подписку для клиента
    const config = `#announce: 🏳 wlvpn - стабильный VPN сервис.
#profile-title: wlvpn
#profile-update-interval: 1
vless://31dac09f-78ee-49ca-9566-d20aea578fdc@de-new.datanode-internal.net:443?flow=xtls-rprx-vision&type=tcp&security=reality&fp=qq&sni=ads.x5.ru&pbk=r6lN34m1nN-xQZ458j5NPD5xJ3_QBF2bGzY4KJEo4ic&sid=abbcd128#🇩🇪 Германия
vless://31dac09f-78ee-49ca-9566-d20aea578fdc@se-new.datanode-internal.net:443?flow=xtls-rprx-vision&type=tcp&security=reality&fp=qq&sni=ads.x5.ru&pbk=r6lN34m1nN-xQZ458j5NPD5xJ3_QBF2bGzY4KJEo4ic&sid=abbcd128#🇸🇪 Швеция
vless://31dac09f-78ee-49ca-9566-d20aea578fdc@pl.datanode-internal.net:443?flow=xtls-rprx-vision&type=tcp&security=reality&fp=qq&sni=sun9-35.userapi.com&pbk=r6lN34m1nN-xQZ458j5NPD5xJ3_QBF2bGzY4KJEo4ic&sid=abbcd128#🇵🇱 Польша
vless://31dac09f-78ee-49ca-9566-d20aea578fdc@ru.datanode-internal.net:443?flow=xtls-rprx-vision&type=tcp&security=reality&fp=qq&sni=sun9-38.userapi.com&pbk=r6lN34m1nN-xQZ458j5NPD5xJ3_QBF2bGzY4KJEo4ic&sid=abbcd128#🇷🇺 Россия
vless://31dac09f-78ee-49ca-9566-d20aea578fdc@tr.datanode-internal.net:443?flow=xtls-rprx-vision&type=tcp&security=reality&sni=sun9-38.userapi.com&pbk=r6lN34m1nN-xQZ458j5NPD5xJ3_QBF2bGzY4KJEo4ic&sid=abbcd128#🇹🇷 Турция
vless://31dac09f-78ee-49ca-9566-d20aea578fdc@hole-nn.datanode-internal.net:443?type=grpc&security=reality&fp=qq&sni=ads.x5.ru&pbk=r6lN34m1nN-xQZ458j5NPD5xJ3_QBF2bGzY4KJEo4ic&sid=abbcd128&serviceName=ads.x5.ru&mode=gun#🇷🇺 Мобильная связь #1
`;

    // 6. Возвращаем конфиг с правильными заголовками
    return new Response(config, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache',
        'Access-Control-Allow-Origin': '*' // опционально, если нужно
      }
    });
  }
};
