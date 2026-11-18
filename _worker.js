export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;
    const kv = env.KV;

    // 1. /jsonsetting — отдает веб-интерфейс конвертера
    if (path === '/jsonsetting' || path === '/') {
      return new Response(getHTMLPage(), {
        headers: { 'Content-Type': 'text/html; charset=utf-8' }
      });
    }

    // 2. /subsetting — панель управления с поддержкой импорта JSON и VLESS-ссылок
    if (path === '/subsetting') {
      const auth = request.headers.get('Authorization');
      const expectedPassword = env.ADMIN_PASSWORD || 'wlvpn-admin-2025';

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

        return new Response(getSubSettingHTML(expectedPassword), {
          headers: { 'Content-Type': 'text/html; charset=utf-8' }
        });
      }

      return new Response(getLoginHTML(), {
        headers: { 'Content-Type': 'text/html; charset=utf-8' }
      });
    }

    // 3. /sub — отдает клиентам строго JSON-массив из KV
    if (path === '/sub') {
      let serversJson = await kv.get('SERVERS_ARRAY');
      let servers = [];
      try {
        servers = JSON.parse(serversJson || '[]');
      } catch (e) {
        servers = [];
      }

      return new Response(JSON.stringify(servers, null, 2), {
        headers: { 'Content-Type': 'application/json; charset=utf-8' }
      });
    }

    return new Response('Not Found', { status: 404 });
  }
};

function getHTMLPage() {
  return `<!DOCTYPE html>
<html lang="ru" class="dark">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Xray ⇄ VLESS Hub</title>
    <script src="https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4"></script>
</head>
<body class="bg-slate-950 text-slate-100 min-h-screen font-sans p-6">
    <div class="max-w-4xl mx-auto text-center py-12">
        <h1 class="text-4xl font-extrabold bg-gradient-to-r from-blue-400 to-indigo-500 bg-clip-text text-transparent mb-4">Xray JSON & VLESS Manager</h1>
        <p class="text-slate-400 mb-8">Управление массивом серверов и выдача JSON через Cloudflare KV.</p>
        <a href="/subsetting" class="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl shadow-lg transition">Перейти в панель управления серверами (/subsetting)</a>
    </div>
</body>
</html>`;
}

function getSubSettingHTML(defaultPass) {
  return `<!DOCTYPE html>
<html lang="ru" class="dark">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Управление серверами и импорт</title>
    <script src="https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4"></script>
</head>
<body class="bg-slate-950 text-slate-100 min-h-screen font-sans p-4 md:p-8">
    <div class="max-w-5xl mx-auto">
        <div class="flex justify-between items-center mb-6">
            <div>
                <h1 class="text-2xl font-bold text-slate-100">⚙️ Массив серверов и Импорт</h1>
                <p class="text-slate-400 text-sm">Вставляйте Xray JSON или VLESS ссылки, настраивайте порядок и сохраняйте</p>
            </div>
            <div class="flex items-center gap-3">
                <a href="/sub" target="_blank" class="text-xs px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-blue-400 rounded-lg border border-slate-700">📋 Открыть /sub (JSON массив)</a>
                <a href="/jsonsetting" class="text-sm text-blue-400 hover:underline">← На главную</a>
            </div>
        </div>

        <!-- Блок универсального импорта (JSON или VLESS ссылки) -->
        <div class="bg-slate-900 border border-slate-800 rounded-2xl p-6 mb-6 shadow-xl">
            <h2 class="text-lg font-semibold mb-2 text-slate-200">📥 Массовый импорт (Xray JSON или VLESS ссылки)</h2>
            <p class="text-xs text-slate-400 mb-3">Вставьте либо JSON-конфиг, либо список <code>vless://...</code> ссылок (каждая с новой строки). Все узлы автоматически добавятся в массив.</p>
            <textarea id="jsonInput" rows="5" placeholder="Вставьте Xray JSON конфиг или vless:// ссылки сюда..." class="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs font-mono text-slate-300 focus:outline-none focus:border-blue-500 mb-3"></textarea>
            <button onclick="importData()" class="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-xl text-sm transition">⚡ Разобрать и добавить узлы</button>
        </div>

        <!-- Список серверов -->
        <div class="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl mb-6">
            <div class="flex justify-between items-center mb-4">
                <h2 class="text-lg font-semibold text-slate-200">Список серверов (<span id="countServers">0</span>)</h2>
                <div class="flex gap-2">
                    <button onclick="sortServers('name')" class="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-xs rounded-lg text-slate-300">По имени</button>
                    <button onclick="clearAll()" class="px-3 py-1 bg-red-950/40 hover:bg-red-900/40 text-xs rounded-lg text-red-400 border border-red-900/50">Очистить все</button>
                </div>
            </div>
            <div id="serversList" class="space-y-3 mb-6">
                <p class="text-slate-500 text-sm">Список пуст. Вставьте данные выше или добавьте узлы.</p>
            </div>
            <button onclick="saveServers()" class="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl text-sm transition shadow-lg shadow-emerald-600/20">💾 Сохранить изменения в Cloudflare KV</button>
        </div>
    </div>

    <script>
        let servers = [];

        function loadLocal() {
            let local = localStorage.getItem('vln_servers_v2');
            if (local) {
                try { servers = JSON.parse(local); } catch(e) { servers = []; }
            }
            renderServers();
        }

        function saveLocal() {
            localStorage.setItem('vln_servers_v2', JSON.stringify(servers));
            renderServers();
        }

        function renderServers() {
            document.getElementById('countServers').innerText = servers.length;
            let container = document.getElementById('serversList');
            if (servers.length === 0) {
                container.innerHTML = '<p class="text-slate-500 text-sm">Список пуст. Вставьте данные выше или добавьте узлы.</p>';
                return;
            }

            container.innerHTML = servers.map((s, index) => \`
                <div class="flex flex-col md:flex-row items-center justify-between bg-slate-950 border border-slate-800 p-3 rounded-xl gap-3">
                    <div class="flex items-center gap-2 w-full md:w-auto">
                        <div class="flex flex-col gap-1">
                            <button onclick="moveServer(\${index}, -1)" \${index === 0 ? 'disabled' : ''} class="text-slate-500 hover:text-slate-200 disabled:opacity-20 text-xs">▲</button>
                            <button onclick="moveServer(\${index}, 1)" \${index === servers.length - 1 ? 'disabled' : ''} class="text-slate-500 hover:text-slate-200 disabled:opacity-20 text-xs">▼</button>
                        </div>
                        <input type="text" value="\${s.name || 'Server ' + (index+1)}" onchange="updateName(\${index}, this.value)" class="bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-sm text-slate-200 font-medium w-full md:w-64 focus:outline-none focus:border-blue-500">
                    </div>
                    <div class="text-xs text-slate-400 font-mono truncate max-w-xs">
                        \${s.address}:\${s.port} (<span class="text-blue-400">\${s.type}</span>)
                    </div>
                    <div class="flex items-center gap-2">
                        <button onclick="removeServer(\${index})" class="text-red-400 hover:text-red-300 text-xs px-2.5 py-1.5 bg-red-950/40 rounded-lg border border-red-900/50">Удалить</button>
                    </div>
                </div>
            \`).join('');
        }

        function updateName(index, newName) {
            servers[index].name = newName;
            saveLocal();
        }

        function moveServer(index, direction) {
            let target = index + direction;
            if (target < 0 || target >= servers.length) return;
            let temp = servers[index];
            servers[index] = servers[target];
            servers[target] = temp;
            saveLocal();
        }

        function removeServer(index) {
            servers.splice(index, 1);
            saveLocal();
        }

        function clearAll() {
            if (confirm('Очистить весь список серверов?')) {
                servers = [];
                saveLocal();
            }
        }

        function sortServers(by) {
            if (by === 'name') {
                servers.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
            }
            saveLocal();
        }

        // Универсальный парсер: распознает и Xray JSON, и vless:// ссылки
        function importData() {
            let raw = document.getElementById('jsonInput').value.trim();
            if (!raw) {
                alert('Вставьте данные (JSON или vless:// ссылки)!');
                return;
            }

            let addedCount = 0;

            // Проверяем, является ли ввод JSON-конфигом
            if (raw.startsWith('{') || raw.startsWith('[')) {
                try {
                    let cleaned = raw.replace(/\\/\\/.*$/gm, '').replace(/\\/\\*[\\s\\S]*?\\*\\//g, '');
                    let json = JSON.parse(cleaned);
                    let outbounds = json.outbounds || (Array.isArray(json) ? json : []);

                    outbounds.forEach(out => {
                        if (out.protocol === 'vless' && out.settings && out.settings.vnext) {
                            out.settings.vnext.forEach(vnext => {
                                let address = vnext.address;
                                let port = vnext.port;
                                vnext.users.forEach(user => {
                                    let uuid = user.id;
                                    let flow = user.flow || '';
                                    let stream = out.streamSettings || {};
                                    let net = stream.network || 'tcp';
                                    let security = stream.security || 'none';
                                    let sni = '', pbk = '', sid = '', path = '';

                                    if (security === 'reality' && stream.realitySettings) {
                                        sni = stream.realitySettings.serverName || '';
                                        pbk = stream.realitySettings.publicKey || '';
                                        sid = stream.realitySettings.shortId || '';
                                    } else if (security === 'tls' && stream.tlsSettings) {
                                        sni = stream.tlsSettings.serverName || '';
                                    }
                                    if (net === 'ws' && stream.wsSettings) path = stream.wsSettings.path || '/';
                                    else if (net === 'grpc' && stream.grpcSettings) path = stream.grpcSettings.serviceName || '';

                                    servers.push({
                                        name: out.tag || ('VLESS - ' + address.slice(0, 8)),
                                        address, port, uuid, type: security, net, sni, pbk, sid, path, flow
                                    });
                                    addedCount++;
                                });
                            });
                        }
                    });
                } catch (e) {
                    alert('Ошибка парсинга JSON: ' + e.message);
                    return;
                }
            } else {
                // Если это не JSON, пробуем распарсить как список vless:// ссылок по строкам
                let lines = raw.split('\\n');
                lines.forEach(line => {
                    line = line.trim();
                    if (!line.startsWith('vless://')) return;

                    try {
                        let urlObj = new URL(line);
                        let uuid = urlObj.username;
                        let address = urlObj.hostname;
                        let port = urlObj.port ? parseInt(urlObj.port) : 443;
                        let params = urlObj.searchParams;
                        
                        let type = params.get('security') || 'none';
                        let net = params.get('type') || 'tcp';
                        let sni = params.get('sni') || '';
                        let pbk = params.get('pbk') || '';
                        let sid = params.get('sid') || '';
                        let path = params.get('path') ? decodeURIComponent(params.get('path')) : '';
                        let flow = params.get('flow') || '';
                        let name = urlObj.hash ? decodeURIComponent(urlObj.hash.substring(1)) : ('VLESS - ' + address.slice(0, 8));

                        servers.push({ name, address, port, uuid, type, net, sni, pbk, sid, path, flow });
                        addedCount++;
                    } catch (err) {
                        console.error('Ошибка парсинга ссылки:', line);
                    }
                });
            }

            if (addedCount > 0) {
                saveLocal();
                alert(\`Успешно добавлено узлов: \${addedCount}\`);
                document.getElementById('jsonInput').value = '';
            } else {
                alert('Не удалось найти валидные VLESS узлы в тексте.');
            }
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

        loadLocal();
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