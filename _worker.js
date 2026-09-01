export default {
  async fetch(request) {
    // Массив всех VLESS-строк (ваши сервера)
    const servers = [
      "vless://31dac09f-78ee-49ca-9566-d20aea578fdc@de-new.datanode-internal.net:443?flow=xtls-rprx-vision&type=tcp&security=reality&fp=qq&sni=ads.x5.ru&pbk=r6lN34m1nN-xQZ458j5NPD5xJ3_QBF2bGzY4KJEo4ic&sid=abbcd128#🇩🇪 Германия",
      "vless://31dac09f-78ee-49ca-9566-d20aea578fdc@se-new.datanode-internal.net:443?flow=xtls-rprx-vision&type=tcp&security=reality&fp=qq&sni=ads.x5.ru&pbk=r6lN34m1nN-xQZ458j5NPD5xJ3_QBF2bGzY4KJEo4ic&sid=abbcd128#🇸🇪 Швеция",
      "vless://31dac09f-78ee-49ca-9566-d20aea578fdc@pl.datanode-internal.net:443?flow=xtls-rprx-vision&type=tcp&security=reality&fp=qq&sni=sun9-35.userapi.com&pbk=r6lN34m1nN-xQZ458j5NPD5xJ3_QBF2bGzY4KJEo4ic&sid=abbcd128#🇵🇱 Польша",
      "vless://31dac09f-78ee-49ca-9566-d20aea578fdc@ru.datanode-internal.net:443?flow=xtls-rprx-vision&type=tcp&security=reality&fp=qq&sni=sun9-38.userapi.com&pbk=r6lN34m1nN-xQZ458j5NPD5xJ3_QBF2bGzY4KJEo4ic&sid=abbcd128#🇷🇺 Россия",
      "vless://31dac09f-78ee-49ca-9566-d20aea578fdc@tr.datanode-internal.net:443?flow=xtls-rprx-vision&type=tcp&security=reality&sni=sun9-38.userapi.com&pbk=r6lN34m1nN-xQZ458j5NPD5xJ3_QBF2bGzY4KJEo4ic&sid=abbcd128#🇹🇷 Турция",
      "vless://31dac09f-78ee-49ca-9566-d20aea578fdc@hole-nn.datanode-internal.net:443?type=grpc&security=reality&fp=qq&sni=ads.x5.ru&pbk=r6lN34m1nN-xQZ458j5NPD5xJ3_QBF2bGzY4KJEo4ic&sid=abbcd128&serviceName=ads.x5.ru&mode=gun#🇷🇺 Мобильная связь #1"
    ];

    // Формируем JSON-объект
    const responseData = {
      announce: "🏳 wlvpn - стабильный VPN сервис.",
      profileTitle: "wlvpn",
      updateInterval: 1,
      servers: servers
    };

    // Возвращаем JSON с красивым форматированием
    return new Response(JSON.stringify(responseData, null, 2), {
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-cache',
        'Access-Control-Allow-Origin': '*' // разрешаем доступ с любых доменов
      }
    });
  }
};
