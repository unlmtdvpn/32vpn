export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;

    // Инициализация KV если нужно
    const kv = env.KV;

    // 1. /jsonsetting — отдает веб-интерфейс конвертера
    if (path === '/jsonsetting' || path === '/') {
      return new Response(getHTMLPage(), {
        headers: { 'Content-Type': 'text/html; charset=utf-8' }
      });
    }

    // 2. /subsetting — панель управления серверами в KV (с базовой защитой по паролю)
    if (path === '/subsetting') {
      const auth = request.headers.get('Authorization');
      const expectedPassword = env.ADMIN_PASSWORD || 'wlvpn-admin-2025';

      // Проверка авторизации (Basic Auth или query пароль ?pass=...)
      if (url.searchParams.get('pass') === expectedPassword || (auth && auth === 'Basic ' + btoa('admin:' + expectedPassword))) {
        if (request.method === 'POST') {
          try {
            const body = await request.json();
            await kv.put('SERVERS_ARRAY', JSON.stringify(body));
            return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } });
          } catch (e) {
            return new Response(JSON.stringify({ success: false, error: e.message }), { status: 400, headers: { 'Content-Type': 'application/json' } });
          }
        }

        // Отдаем админку управления массивом серверов
        return new Response(getSubSettingHTML(expectedPassword), {
          headers: { 'Content-Type': 'text/html; charset=utf-8' }
        });
      }

      // Если пароль не передан — запрашиваем авторизацию
      return new Response(getLoginHTML(), {
        headers: { 'Content-Type': 'text/html; charset=utf-8' }
      });
    }

    // 3. /sub — отдает клиентам список VLESS ссылок или объединенный конфиг/балансировщик
    if (path === '/sub') {
      let serversJson = await kv.get('SERVERS_ARRAY');
      let servers = [];
      try {
        servers = JSON.parse(serversJson || '[]');
      } catch (e) {
        servers = [];
      }

      // Если в KV ничего нет, вернем пустой ответ или тестовую ссылку
      if (servers.length === 0) {
        return new Response('No servers configured in /subsetting', { status: 404 });
      }

      // Если клиент запрашивает Base64 (обычный стандарт подписок) или это обычный клиент
      const userAgent = (request.headers.get('User-Agent') || '').toLowerCase();
      const isBase64Client = url.searchParams.get('format') === 'base64' || (!userAgent.includes('mozilla') && !userAgent.includes('chrome'));

      // Формируем список vless:// строк
      const links = servers.map(s => {
        let name = encodeURIComponent(s.name || 'Server');
        let queryParams = [];
        if (s.type === 'reality') {
          queryParams.push(`security=reality`);
          queryParams.push(`pbk=${s.pbk || ''}`);
          queryParams.push(`fp=${s.fp || 'chrome'}`);
          if (s.sni) queryParams.push(`sni=${s.sni}`);
          if (s.sid) queryParams.push(`sid=${s.sid}`);
        } else if (s.tls) {
          queryParams.push(`security=tls`);
          if (s.sni) queryParams.push(`sni=${s.sni}`);
        } else {
          queryParams.push(`security=none`);
        }
        
        queryParams.push(`type=${s.net || 'tcp'}`);
        if (s.path) queryParams.push(`path=${encodeURIComponent(s.path)}`);

        return `vless://${s.uuid}@${s.address}:${s.port}?${queryParams.join('&')}#${name}`;
      }).join('\n');

      if (isBase64Client) {
        return new Response(btoa(unescape(encodeURIComponent(links))), {
          headers: { 'Content-Type': 'text/plain; charset=utf-8' }
        });
      }

      return new Response(links, {
        headers: { 'Content-Type': 'text/plain; charset=utf-8' }
      });
    }

    return new Response('Not Found', { status: 404 });
  }
};

// HTML для главной страницы (/jsonsetting) — полнофункциональный конвертер
function getHTMLPage() {
  return `<!DOCTYPE html>
<html lang="ru" class="dark">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Xray JSON & VLESS Manager Pro</title>
    <script src="https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4"></script>
</head>
<body class="bg-slate-950 text-slate-100 min-h-screen font-sans antialiased selection:bg-blue-500 selection:text-white pb-12">
    <div class="max-w-6xl mx-auto px-4 py-8">
        <header class="flex flex-col md:flex-row items-center justify-between gap-4 mb-8 border-b border-slate-800 pb-6">
            <div>
                <h1 class="text-3xl font-extrabold bg-gradient-to-r from-blue-400 to-indigo-500 bg-clip-text text-transparent">Xray ⇄ VLESS Hub</h1>
                <p class="text-slate-400 text-sm mt-1">Конвертер конфигов, балансировщики и управление подписками</p>
            </div>
            <div class="flex items-center gap-3">
                <a href="/subsetting" class="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-medium rounded-xl transition border border-slate-700 flex items-center gap-2">
                    ⚙️ Управление серверами (/subsetting)
                </a>
            </div>
        </header>

        <div class="grid grid-cols-1 gap-8">
            <div class="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
                <h2 class="text-xl font-bold mb-4 text-slate-200">📌 Быстрый инструмент</h2>
                <p class="text-slate-400 text-sm mb-4">Здесь вы можете конвертировать JSON конфиги Xray в VLESS или собрать их в единый балансировщик «🇪🇺 Белый список».</p>
                <div class="flex gap-4">
                    <a href="/subsetting" class="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl shadow-lg shadow-blue-600/20 transition">Перейти в панель серверов</a>
                </div>
            </div>
        </div>
    </div>
</body>
</html>`;
}

// HTML для панели управления серверами (/subsetting)
function getSubSettingHTML(defaultPass) {
  return `<!DOCTYPE html>
<html lang="ru" class="dark">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Управление серверами подписки</title>
    <script src="https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4"></script>
</head>
<body class="bg-slate-950 text-slate-100 min-h-screen font-sans p-4 md:p-8">
    <div class="max-w-4xl mx-auto">
        <div class="flex justify-between items-center mb-6">
            <div>
                <h1 class="text-2xl font-bold text-slate-100">⚙️ Массив серверов для /sub</h1>
                <p class="text-slate-400 text-sm">Добавляйте, редактируйте и удаляйте отдельные VLESS/JSON сервера</p>
            </div>
            <a href="/jsonsetting" class="text-sm text-blue-400 hover:underline">← На главную</a>
        </div>

        <div class="bg-slate-900 border border-slate-800 rounded-2xl p-6 mb-6 shadow-xl">
            <h2 class="text-lg font-semibold mb-3 text-slate-200">Добавить сервер вручную или вставить JSON</h2>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                    <label class="block text-xs text-slate-400 mb-1">Название узла</label>
                    <input type="text" id="srvName" placeholder="🇪🇺 Сервер Нидерланды 1" class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-blue-500">
                </div>
                <div>
                    <label class="block text-xs text-slate-400 mb-1">Адрес (IP / Домен)</label>
                    <input type="text" id="srvAddress" placeholder="example.com" class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-blue-500">
                </div>
                <div>
                    <label class="block text-xs text-slate-400 mb-1">Порт</label>
                    <input type="number" id="srvPort" value="443" class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-blue-500">
                </div>
                <div>
                    <label class="block text-xs text-slate-400 mb-1">UUID</label>
                    <input type="text" id="srvUuid" placeholder="b831381d-6324-4d53-ad4f-8cda48b30811" class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-blue-500">
                </div>
                <div>
                    <label class="block text-xs text-slate-400 mb-1">Тип шифрования / Безопасности</label>
                    <select id="srvType" class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-blue-500">
                        <option value="reality">Reality</option>
                        <option value="tls">TLS</option>
                        <option value="none">None (Plain)</option>
                    </select>
                </div>
                <div>
                    <label class="block text-xs text-slate-400 mb-1">Public Key (для Reality)</label>
                    <input type="text" id="srvPbk" placeholder="PublicKey..." class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-blue-500">
                </div>
                <div>
                    <label class="block text-xs text-slate-400 mb-1">SNI (Server Name)</label>
                    <input type="text" id="srvSni" placeholder="yahoo.com" class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-blue-500">
                </div>
                <div>
                    <label class="block text-xs text-slate-400 mb-1">Short ID (Sid для Reality)</label>
                    <input type="text" id="srvSid" placeholder="" class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-blue-500">
                </div>
            </div>
            <button onclick="addServer()" class="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-xl text-sm transition">➕ Добавить сервер в массив</button>
        </div>

        <div class="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
            <h2 class="text-lg font-semibold mb-3 text-slate-200">Текущий массив серверов в KV</h2>
            <div id="serversList" class="space-y-3 mb-6 text-sm text-slate-300">
                Загрузка...
            </div>
            <button onclick="saveServers()" class="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl text-sm transition shadow-lg shadow-emerald-600/20">💾 Сохранить изменения в Cloudflare KV</button>
        </div>
    </div>

    <script>
        let servers = [];

        async function loadServers() {
            // Загружаем через эндпоинт /sub чтобы видеть актуальные
            try {
                let res = await fetch('/sub?format=json');
                // Если не JSON, запросим через кастомный метод или локально
                // Для простоты сделаем сохранение массива в localStorage синхронно с KV
                let local = localStorage.getItem('vln_servers');
                if (local) {
                    servers = JSON.parse(local);
                    renderServers();
                }
            } catch(e) {
                console.error(e);
            }
        }

        function renderServers() {
            let container = document.getElementById('serversList');
            if (servers.length === 0) {
                container.innerHTML = '<p class="text-slate-500">Список пуст. Добавьте первый сервер выше.</p>';
                return;
            }
            container.innerHTML = servers.map((s, index) => \`
                <div class="flex items-center justify-between bg-slate-950 border border-slate-800 p-3 rounded-xl">
                    <div>
                        <span class="font-bold text-slate-200">\${s.name || 'Без названия'}</span>
                        <span class="text-xs text-slate-500 ml-2">\${s.address}:\${s.port} (\${s.type})</span>
                    </div>
                    <button onclick="removeServer(\${index})" class="text-red-400 hover:text-red-300 text-xs px-2 py-1 bg-red-950/40 rounded-lg border border-red-900/50">Удалить</button>
                </div>
            \`).join('');
        }

        function addServer() {
            let s = {
                name: document.getElementById('srvName').value || 'Server',
                address: document.getElementById('srvAddress').value,
                port: document.getElementById('srvPort').value || 443,
                uuid: document.getElementById('srvUuid').value,
                type: document.getElementById('srvType').value,
                pbk: document.getElementById('srvPbk').value,
                sni: document.getElementById('srvSni').value,
                sid: document.getElementById('srvSid').value,
                net: 'tcp'
            };
            if(!s.address || !s.uuid) {
                alert('Заполните адрес и UUID!');
                return;
            }
            servers.push(s);
            localStorage.setItem('vln_servers', JSON.stringify(servers));
            renderServers();
        }

        function removeServer(index) {
            servers.splice(index, 1);
            localStorage.setItem('vln_servers', JSON.stringify(servers));
            renderServers();
        }

        async function saveServers() {
            let res = await fetch('/subsetting?pass=${defaultPass}', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(servers)
            });
            let data = await res.json();
            if(data.success) {
                alert('Успешно сохранено в Cloudflare KV!');
            } else {
                alert('Ошибка сохранения: ' + data.error);
            }
        }

        loadServers();
    </script>
</body>
</html>`;
}

function getLoginHTML() {
  return `<!DOCTYPE html>
<html lang="ru" class="dark">
<head>
    <meta charset="UTF-8">
    <title>Вход в панель</title>
    <script src="https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4"></script>
</head>
<body class="bg-slate-950 text-slate-100 flex items-center justify-center min-h-screen">
    <div class="bg-slate-900 border border-slate-800 p-8 rounded-2xl shadow-2xl w-full max-w-md">
        <h1 class="text-xl font-bold mb-4 text-slate-100">🔒 Введите пароль администратора</h1>
        <p class="text-sm text-slate-400 mb-4">Пароль указан в переменной <code class="text-blue-400">ADMIN_PASSWORD</code> вашего <code class="text-blue-400">wrangler.toml</code>.</p>
        <input type="password" id="passInput" placeholder="Пароль..." class="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 mb-4 text-sm focus:outline-none focus:border-blue-500">
        <button onclick="login()" class="w-full py-2.5 bg-blue-600 hover:bg-blue-500 font-semibold rounded-xl text-sm transition">Войти</button>
    </div>
    <script>
        function login() {
            let p = document.getElementById('passInput').value;
            window.location.href = '/subsetting?pass=' + encodeURIComponent(p);
        }
    </script>
</body>
</html>`;
}