// main.js

const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');
const http = require('http');
const https = require('https');
const nodeFetch = require('node-fetch');
const store = require('./store');

const isDev = !app.isPackaged;

const DIMANDUS_BASE_URL = 'https://dimandus.ru:5001';
// Client ID для Dimandus режима (публичный)
const DIMANDUS_TWITCH_CLIENT_ID = '2sk3t84wmxpeulajhrnrf7ztlid1xp';

// Агент для игнорирования ошибок SSL
const dimandusAgent = new https.Agent({
  rejectUnauthorized: false
});

// Обертка для запросов к Dimandus серверу
function fetchDimandus(url, options = {}) {
  return nodeFetch(url, { agent: dimandusAgent, ...options });
}

function getHelixClientId() {
  const authMode = store.get('twitch.authMode') || 'direct';
  if (authMode === 'dimandus') {
    return DIMANDUS_TWITCH_CLIENT_ID;
  }
  return store.get('twitch.clientId');
}

// Хелпер для получения заголовков
function getHelixHeaders() {
  const accessToken = store.get('twitch.accessToken');
  const clientId = getHelixClientId();

  if (!clientId || !accessToken) {
    throw new Error('Нет данных авторизации Twitch');
  }

  return {
    'Client-Id': clientId,
    Authorization: `Bearer ${accessToken}`,
    'Content-Type': 'application/json'
  };
}

// =====================================================
// ЛОГИКА ОБНОВЛЕНИЯ ТОКЕНА (REFRESH)
// =====================================================

// Глобальная переменная-обещание для блокировки одновременных рефрешей
let globalRefreshPromise = null;

async function refreshTwitchToken() {
  console.log('[Auth] Запрос на обновление токена...');

  const refreshToken = store.get('twitch.refreshToken');
  if (!refreshToken) {
    throw new Error('Нет Refresh Token. Требуется повторный вход.');
  }

  // 1. Определяем режим
  let authMode = store.get('twitch.authMode') || 'direct';
  const savedClientId = store.get('twitch.clientId');
  const savedClientSecret = store.get('twitch.clientSecret');

  // Авто-фикс для старых конфигов: если режим direct, но нет секрета и ID от Dimandus
  if (
    authMode === 'direct' &&
    !savedClientSecret &&
    savedClientId === DIMANDUS_TWITCH_CLIENT_ID
  ) {
    console.log('[Auth] Обнаружен конфиг Dimandus, переключение режима...');
    authMode = 'dimandus';
    store.set('twitch.authMode', 'dimandus');
  }

  // ------------------------------------------------------------
  // РЕЖИМ 1: DIMANDUS
  // ------------------------------------------------------------
  if (authMode === 'dimandus') {
    console.log('[Auth] Обновление через сервер Dimandus...');
    const refreshUrl = `${DIMANDUS_BASE_URL}/api/auth/twitch/refresh`;

    try {
      const res = await fetchDimandus(refreshUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: refreshToken })
      });

      if (!res.ok) {
        if (res.status >= 400 && res.status < 500) {
          store.delete('twitch.accessToken');
          store.delete('twitch.refreshToken');
        }
        const errText = await res.text().catch(() => '');
        throw new Error(`Ошибка сервера Dimandus: ${res.status} ${errText}`);
      }

      const json = await res.json();
      if (!json.access_token) throw new Error('Сервер вернул пустой токен');

      store.set('twitch.accessToken', json.access_token);
      if (json.refresh_token) store.set('twitch.refreshToken', json.refresh_token);

      console.log('[Auth] Токен успешно обновлен (Dimandus)!');
      return json.access_token;
    } catch (err) {
      console.error('[Auth] Ошибка рефреша (Dimandus):', err.message);
      throw err;
    }
  }

  // ------------------------------------------------------------
  // РЕЖИМ 2: DIRECT
  // ------------------------------------------------------------
  else {
    console.log('[Auth] Прямое обновление через Twitch API...');
    if (!savedClientId || !savedClientSecret) {
      throw new Error('Нет Client Secret для прямого обновления.');
    }

    const params = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: savedClientId,
      client_secret: savedClientSecret
    });

    try {
      const res = await nodeFetch('https://id.twitch.tv/oauth2/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params.toString()
      });

      const json = await res.json();
      if (!res.ok) {
        if (res.status === 400 || res.status === 401) {
          store.delete('twitch.accessToken');
        }
        throw new Error(json.message || 'Не удалось обновить токен');
      }

      store.set('twitch.accessToken', json.access_token);
      if (json.refresh_token) store.set('twitch.refreshToken', json.refresh_token);

      console.log('[Auth] Токен успешно обновлен (Direct)!');
      return json.access_token;
    } catch (err) {
      console.error('[Auth] Ошибка рефреша (Direct):', err.message);
      throw err;
    }
  }
}

/**
 * Обертка над node-fetch.
 * Параметр _isRetry используется, чтобы предотвратить бесконечный цикл.
 */
async function helixFetch(url, options = {}, _isRetry = false) {
  let headers;
  try {
    headers = getHelixHeaders();
  } catch (err) {
    throw err;
  }

  const config = { ...options, headers: { ...headers, ...options.headers } };

  // 1. Делаем запрос
  let res = await nodeFetch(url, config);

  // 2. Если 401 (Unauthorized)
  if (res.status === 401) {
    if (_isRetry) {
      console.error(
        `[Helix] 401 ПОСЛЕ рефреша. Токен невалиден или не хватает прав (Scopes). Сброс сессии.`
      );

      store.delete('twitch.accessToken');
      store.delete('twitch.refreshToken');
      throw new Error(
        'Недостаточно прав доступа (Scopes). Пожалуйста, выйдите и войдите в аккаунт заново.'
      );
    }

    if (!globalRefreshPromise) {
      console.log('[Helix] 401 -> Запуск рефреша...');
      globalRefreshPromise = refreshTwitchToken()
        .then(() => {
          return new Promise((r) => setTimeout(r, 500));
        })
        .finally(() => {
          globalRefreshPromise = null;
        });
    } else {
      console.log('[Helix] 401 -> Ждем завершения уже запущенного рефреша...');
    }

    try {
      await globalRefreshPromise;

      const newHeaders = getHelixHeaders();
      const retryConfig = {
        ...options,
        headers: { ...newHeaders, ...options.headers }
      };

      return await helixFetch(url, retryConfig, true);
    } catch (refreshErr) {
      console.error('[Helix] Не удалось восстановить сессию:', refreshErr.message);
      store.delete('twitch.accessToken');
      throw new Error('Сессия Twitch истекла. Перезайдите в приложение.');
    }
  }

  return res;
}

// Проверка/обновление accessToken перед использованием в чате
async function ensureAccessTokenHelix() {
  const login = store.get('twitch.login');
  const userId = store.get('twitch.userId');

  if (!login || !userId) {
    throw new Error('Нет сохранённого аккаунта Twitch');
  }

  const url = `https://api.twitch.tv/helix/users?id=${encodeURIComponent(userId)}`;
  await helixFetch(url);

  const accessToken = store.get('twitch.accessToken');
  return accessToken || null;
}

// =====================================================
// WINDOW MANAGEMENT
// =====================================================

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(
      path.join(__dirname, '..', 'dist', 'renderer', 'index.html')
    );
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// ----------------- IPC: ping / config -----------------

ipcMain.handle('ping', () => 'pong from main');
ipcMain.handle('config:get', (event, key) => store.get(key));
ipcMain.handle('config:set', (event, key, value) => store.set(key, value));
ipcMain.handle('config:delete', (event, key) => store.delete(key));

// ----------------- Twitch OAuth Scopes -----------------

const TWITCH_SCOPES = [
  'chat:read',
  'chat:edit',
  'moderation:read',
  'moderator:manage:banned_users',
  'moderator:manage:chat_messages',
  'moderator:manage:chat_settings',
  'moderator:manage:announcements',
  'moderator:manage:shield_mode',
  'moderator:read:shield_mode',
  'moderator:read:chatters',
  'user:read:moderated_channels',
  'user:read:follows',
  'user:write:chat'
];

// ----------------- Twitch OAuth (прямой) -----------------

async function startTwitchLogin() {
  const clientId = store.get('twitch.clientId');
  const clientSecret = store.get('twitch.clientSecret');

  if (!clientId || !clientSecret) {
    throw new Error('Сначала укажи Client ID и Client Secret в настройках.');
  }

  const redirectPort = 58585;
  const redirectPath = '/auth/twitch/callback';
  const redirectUri = `http://localhost:${redirectPort}${redirectPath}`;
  const state = Math.random().toString(36).slice(2);
  const scope = TWITCH_SCOPES.join(' ');

  const authUrl =
    'https://id.twitch.tv/oauth2/authorize' +
    `?client_id=${encodeURIComponent(clientId)}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&response_type=code` +
    `&scope=${encodeURIComponent(scope)}` +
    `&state=${encodeURIComponent(state)}`;

  return new Promise((resolve, reject) => {
    let server;
    let finished = false;
    let timeoutId;

    const cleanup = () => {
      if (finished) return;
      finished = true;
      if (timeoutId) clearTimeout(timeoutId);
      if (server) try { server.close(); } catch {}
    };

    server = http.createServer(async (req, res) => {
      try {
        if (!req.url.startsWith(redirectPath)) {
          res.writeHead(404);
          res.end();
          return;
        }

        const fullUrl = new URL(req.url, `http://localhost:${redirectPort}`);
        const code = fullUrl.searchParams.get('code');
        const error = fullUrl.searchParams.get('error');

        if (error) {
          res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
          res.end('<html><body>Ошибка.</body></html>');
          cleanup();
          return reject(new Error('Auth error: ' + error));
        }

        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(
          '<html><script>setTimeout(function(){window.close();},1000);</script><body>OK</body></html>'
        );

        const tokenRes = await nodeFetch('https://id.twitch.tv/oauth2/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            client_id: clientId,
            client_secret: clientSecret,
            code,
            grant_type: 'authorization_code',
            redirect_uri: redirectUri
          }).toString()
        });

        const tokenJson = await tokenRes.json();
        if (!tokenRes.ok) {
          cleanup();
          return reject(new Error(tokenJson.message));
        }

        const userRes = await nodeFetch('https://api.twitch.tv/helix/users', {
          headers: {
            'Client-Id': clientId,
            Authorization: `Bearer ${tokenJson.access_token}`
          }
        });
        const userJson = await userRes.json();
        const user = userJson.data[0];

        store.set('twitch.accessToken', tokenJson.access_token);
        store.set('twitch.refreshToken', tokenJson.refresh_token);
        store.set('twitch.scopes', tokenJson.scope);
        store.set('twitch.userId', user.id);
        store.set('twitch.login', user.login);
        store.set('twitch.authMode', 'direct');

        cleanup();
        resolve({ login: user.login, userId: user.id });
      } catch (err) {
        cleanup();
        reject(err);
      }
    });

    server.listen(redirectPort, '127.0.0.1', (err) => {
      if (err) {
        cleanup();
        return reject(err);
      }
      shell.openExternal(authUrl);
      timeoutId = setTimeout(() => {
        cleanup();
        reject(new Error('Timeout'));
      }, 300000);
    });
  });
}

// ----------------- Twitch OAuth через Dimandus -----------------

async function startTwitchDimandusAuth() {
  const scopeParam = TWITCH_SCOPES.join('+');
  const initUrl = `${DIMANDUS_BASE_URL}/api/auth/twitch/init?scope=${encodeURIComponent(
    scopeParam
  )}`;

  const initRes = await fetchDimandus(initUrl);
  if (!initRes.ok) throw new Error(`Init error: ${initRes.status}`);

  const initJson = await initRes.json();
  const { auth_url, session_id } = initJson;

  shell.openExternal(auth_url);

  return new Promise((resolve, reject) => {
    let attempts = 0;
    let finished = false;
    const timer = setInterval(async () => {
      if (finished) return;
      attempts++;
      if (attempts > 60) {
        finished = true;
        clearInterval(timer);
        return reject(new Error('Timeout'));
      }

      try {
        const statusRes = await fetchDimandus(
          `${DIMANDUS_BASE_URL}/api/auth/twitch/status/${session_id}`
        );
        if (!statusRes.ok) return;
        const statusJson = await statusRes.json();

        if (statusJson.status === 'completed') {
          finished = true;
          clearInterval(timer);

          const userRes = await nodeFetch('https://api.twitch.tv/helix/users', {
            headers: {
              'Client-Id': DIMANDUS_TWITCH_CLIENT_ID,
              Authorization: `Bearer ${statusJson.access_token}`
            }
          });
          const userJson = await userRes.json();
          const user = userJson.data[0];

          store.set('twitch.accessToken', statusJson.access_token);
          store.set('twitch.refreshToken', statusJson.refresh_token);
          store.set('twitch.scopes', statusJson.scope);
          store.set('twitch.userId', user.id);
          store.set('twitch.login', user.login);
          store.set('twitch.authMode', 'dimandus');
          store.delete('twitch.clientSecret');
          store.set('twitch.clientId', DIMANDUS_TWITCH_CLIENT_ID);

          resolve({ login: user.login, userId: user.id });
        } else if (
          statusJson.status === 'error' ||
          statusJson.status === 'expired'
        ) {
          finished = true;
          clearInterval(timer);
          reject(new Error(statusJson.error || 'Auth failed'));
        }
      } catch (e) {
        console.error(e);
      }
    }, 2000);
  });
}

// ----------------- Helix Implementation -----------------

const KNOWN_BOTS = new Set([
  'nightbot',
  'moobot',
  'streamelements',
  'fossabot',
  'deepbot',
  'phantombot',
  'streamlabs',
  'stay_hydrated_bot',
  'commanderroot',
  'wizebot'
]);

async function getBroadcasterIdByLogin(channelLogin) {
  const login = (channelLogin || '').toLowerCase().replace('#', '').trim();
  if (!login) throw new Error('Empty login');
  const res = await helixFetch(
    `https://api.twitch.tv/helix/users?login=${encodeURIComponent(login)}`
  );
  const json = await res.json();
  if (!res.ok || !json.data || !json.data[0]) throw new Error('Channel not found');
  return json.data[0].id;
}

async function getUserIdByLogin(userLogin) {
  const login = (userLogin || '').toLowerCase().trim();
  if (!login) throw new Error('Empty login');
  const res = await helixFetch(
    `https://api.twitch.tv/helix/users?login=${encodeURIComponent(login)}`
  );
  const json = await res.json();
  if (!res.ok || !json.data || !json.data[0]) throw new Error('User not found');
  return json.data[0].id;
}

// Chatters
async function fetchChannelChattersHelix(channelLogin) {
  const moderatorId = store.get('twitch.userId');
  const broadcasterId = await getBroadcasterIdByLogin(channelLogin);

  // Можем получить список модераторов ТОЛЬКО если мы сами владелец канала
  let moderatorIds = [];

  if (broadcasterId === moderatorId) {
    try {
      let res = await helixFetch(
        `https://api.twitch.tv/helix/moderation/moderators?broadcaster_id=${broadcasterId}`
      );
      let json = await res.json();
      if (res.ok && json.data) {
        moderatorIds = json.data.map((m) => m.user_id);
      }
    } catch (e) {
      console.warn(
        '[Chatters] Не удалось загрузить список модераторов (возможно, нет прав):',
        e.message
      );
    }
  }

  const allChatters = [];
  let cursor = null;

  try {
    do {
      const url = new URL('https://api.twitch.tv/helix/chat/chatters');
      url.searchParams.set('broadcaster_id', broadcasterId);
      url.searchParams.set('moderator_id', moderatorId);
      url.searchParams.set('first', '1000');
      if (cursor) url.searchParams.set('after', cursor);

      const res = await helixFetch(url.toString());
      const json = await res.json();

      if (!res.ok) {
        console.warn(
          `[Chatters] Ошибка доступа к зрителям канала ${channelLogin}: ${res.status}`
        );
        break;
      }

      if (json.data) allChatters.push(...json.data);
      cursor = json.pagination?.cursor;
    } while (cursor);
  } catch (err) {
    console.warn(
      `[Chatters] Глобальная ошибка при получении зрителей ${channelLogin}:`,
      err.message
    );
  }

  return { broadcasterId, moderatorIds, chatters: allChatters };
}

async function fetchModeratedChannelsHelix() {
  const userId = store.get('twitch.userId');
  const res = await helixFetch(
    `https://api.twitch.tv/helix/moderation/channels?user_id=${userId}`
  );
  const json = await res.json();
  return json.data || [];
}

async function fetchFollowedChannelsHelix() {
  const userId = store.get('twitch.userId');
  const allChannels = [];
  let cursor = null;
  do {
    const url = new URL('https://api.twitch.tv/helix/channels/followed');
    url.searchParams.set('user_id', userId);
    url.searchParams.set('first', '100');
    if (cursor) url.searchParams.set('after', cursor);
    const res = await helixFetch(url.toString());
    const json = await res.json();
    if (res.ok && json.data) allChannels.push(...json.data);
    cursor = json.pagination?.cursor;
  } while (cursor);
  return allChannels;
}

async function fetchChannelsLiveStatusHelix(logins) {
  const lower = Array.from(
    new Set(
      (logins || [])
        .map((l) => (l || '').toLowerCase().trim())
        .filter(Boolean)
    )
  );
  if (!lower.length) return [];

  const currentUserId = store.get('twitch.userId');

  const userMap = new Map();
  // Batch users
  for (let i = 0; i < lower.length; i += 100) {
    const chunk = lower.slice(i, i + 100);
    const url = new URL('https://api.twitch.tv/helix/users');
    chunk.forEach((l) => url.searchParams.append('login', l));
    const res = await helixFetch(url.toString());
    const json = await res.json();
    if (json.data) json.data.forEach((u) => userMap.set(u.login.toLowerCase(), u));
  }

  const ids = Array.from(new Set([...userMap.values()].map((u) => u.id)));
  const streamMap = new Map();
  // Batch streams
  for (let i = 0; i < ids.length; i += 100) {
    const chunk = ids.slice(i, i + 100);
    const url = new URL('https://api.twitch.tv/helix/streams');
    chunk.forEach((id) => url.searchParams.append('user_id', id));
    const res = await helixFetch(url.toString());
    const json = await res.json();
    if (json.data) json.data.forEach((s) => streamMap.set(s.user_id, s));
  }

  const statuses = [];
  for (const login of lower) {
    const user = userMap.get(login);
    if (!user) {
      statuses.push({
        login,
        isLive: false,
        title: null,
        viewerCount: null,
        modCount: null
      });
      continue;
    }
    const stream = streamMap.get(user.id);
    let modCount = null;

    // Запрашиваем модов ТОЛЬКО для своего канала
    if (user.id === currentUserId) {
      try {
        const res = await helixFetch(
          `https://api.twitch.tv/helix/moderation/moderators?broadcaster_id=${user.id}`
        );
        const json = await res.json();
        if (res.ok && json.data) {
          modCount = json.data.filter(
            (m) => !KNOWN_BOTS.has(m.user_login.toLowerCase())
          ).length;
        }
      } catch (e) {
        // игнор
      }
    }

    statuses.push({
      login,
      isLive: !!stream,
      title: stream?.title || null,
      viewerCount: stream?.viewer_count || 0,
      modCount
    });
  }
  return statuses;
}

async function fetchUsersInfoHelix(logins) {
  const lower = Array.from(
    new Set(logins.map((l) => l.toLowerCase().trim()).filter(Boolean))
  );
  if (!lower.length) return [];
  const result = [];
  for (let i = 0; i < lower.length; i += 100) {
    const url = new URL('https://api.twitch.tv/helix/users');
    lower.slice(i, i + 100).forEach((l) => url.searchParams.append('login', l));
    const res = await helixFetch(url.toString());
    const json = await res.json();
    if (json.data) {
      result.push(
        ...json.data.map((u) => ({
          login: u.login.toLowerCase(),
          displayName: u.display_name,
          avatarUrl: u.profile_image_url,
          bannerUrl: u.offline_image_url
        }))
      );
    }
  }
  return result;
}

// Полные данные о пользователе
async function getUserDetailsHelix(userLogin) {
  const login = (userLogin || '').toLowerCase().trim();
  if (!login) throw new Error('Empty login');

  const res = await helixFetch(
    `https://api.twitch.tv/helix/users?login=${encodeURIComponent(login)}`
  );
  const json = await res.json();
  if (!res.ok || !json.data || !json.data[0]) {
    throw new Error('User not found');
  }

  return json.data[0];
}

// Moderation Actions
async function banUserHelix(channel, user, duration, reason) {
  const bid = await getBroadcasterIdByLogin(channel);
  const mid = store.get('twitch.userId');
  const uid = await getUserIdByLogin(user);
  const body = { data: { user_id: uid, reason: reason || '' } };
  if (duration) body.data.duration = duration;

  const res = await helixFetch(
    `https://api.twitch.tv/helix/moderation/bans?broadcaster_id=${bid}&moderator_id=${mid}`,
    {
      method: 'POST',
      body: JSON.stringify(body)
    }
  );
  if (!res.ok) throw new Error((await res.json()).message);
  return { success: true };
}

async function unbanUserHelix(channel, user) {
  const bid = await getBroadcasterIdByLogin(channel);
  const mid = store.get('twitch.userId');
  const uid = await getUserIdByLogin(user);
  const res = await helixFetch(
    `https://api.twitch.tv/helix/moderation/bans?broadcaster_id=${bid}&moderator_id=${mid}&user_id=${uid}`,
    {
      method: 'DELETE'
    }
  );
  if (!res.ok) throw new Error((await res.json()).message);
  return { success: true };
}

async function deleteMessageHelix(channel, msgId) {
  const bid = await getBroadcasterIdByLogin(channel);
  const mid = store.get('twitch.userId');
  const res = await helixFetch(
    `https://api.twitch.tv/helix/moderation/chat?broadcaster_id=${bid}&moderator_id=${mid}&message_id=${msgId}`,
    {
      method: 'DELETE'
    }
  );
  if (!res.ok) throw new Error('Failed to delete');
  return { success: true };
}

async function clearChatHelix(channel) {
  const bid = await getBroadcasterIdByLogin(channel);
  const mid = store.get('twitch.userId');
  const res = await helixFetch(
    `https://api.twitch.tv/helix/moderation/chat?broadcaster_id=${bid}&moderator_id=${mid}`,
    {
      method: 'DELETE'
    }
  );
  if (!res.ok) throw new Error('Failed to clear');
  return { success: true };
}

// Chat Settings & Shield
async function updateChatSettingsHelix(channel, settings) {
  const bid = await getBroadcasterIdByLogin(channel);
  const mid = store.get('twitch.userId');
  const res = await helixFetch(
    `https://api.twitch.tv/helix/chat/settings?broadcaster_id=${bid}&moderator_id=${mid}`,
    {
      method: 'PATCH',
      body: JSON.stringify(settings)
    }
  );
  return (await res.json()).data?.[0] || { success: true };
}

async function getChatSettingsHelix(channel) {
  const bid = await getBroadcasterIdByLogin(channel);
  const mid = store.get('twitch.userId');
  const res = await helixFetch(
    `https://api.twitch.tv/helix/chat/settings?broadcaster_id=${bid}&moderator_id=${mid}`
  );
  return (await res.json()).data?.[0] || {};
}

async function getShieldModeHelix(channel) {
  const bid = await getBroadcasterIdByLogin(channel);
  const mid = store.get('twitch.userId');
  const res = await helixFetch(
    `https://api.twitch.tv/helix/moderation/shield_mode?broadcaster_id=${bid}&moderator_id=${mid}`
  );
  return (await res.json()).data?.[0] || { is_active: false };
}

async function updateShieldModeHelix(channel, isActive) {
  const bid = await getBroadcasterIdByLogin(channel);
  const mid = store.get('twitch.userId');
  const res = await helixFetch(
    `https://api.twitch.tv/helix/moderation/shield_mode?broadcaster_id=${bid}&moderator_id=${mid}`,
    {
      method: 'PUT',
      body: JSON.stringify({ is_active: isActive })
    }
  );
  return (await res.json()).data?.[0] || { is_active: isActive };
}

async function sendAnnouncementHelix(channel, message, color) {
  const bid = await getBroadcasterIdByLogin(channel);
  const mid = store.get('twitch.userId');
  const res = await helixFetch(
    `https://api.twitch.tv/helix/chat/announcements?broadcaster_id=${bid}&moderator_id=${mid}`,
    {
      method: 'POST',
      body: JSON.stringify({ message, color })
    }
  );
  if (!res.ok) throw new Error('Announcement failed');
  return { success: true };
}

// Отправка обычного чата через Helix (chat/messages)
async function sendChatMessageHelix(channel, message) {
  const bid = await getBroadcasterIdByLogin(channel);   // broadcaster_id
  const senderId = store.get('twitch.userId');          // sender_id (наш userId)

  if (!senderId) {
    throw new Error('Нет twitch.userId в конфиге, пользователь не авторизован');
  }

  const body = {
    broadcaster_id: bid,
    sender_id: senderId,
    message
  };

  const res = await helixFetch('https://api.twitch.tv/helix/chat/messages', {
    method: 'POST',
    body: JSON.stringify(body)
  });

  const json = await res.json();

  if (!res.ok) {
    throw new Error(json?.message || 'Не удалось отправить сообщение через Helix');
  }

  const data = json.data && json.data[0];
  return { messageId: data?.message_id };
}

// ----------------- IPC EXPORTS -----------------

ipcMain.handle('twitch:getUserDetails', (e, login) =>
  getUserDetailsHelix(login)
);
ipcMain.handle('twitch:login', () => startTwitchLogin());
ipcMain.handle('twitch:loginViaDimandus', () => startTwitchDimandusAuth());
ipcMain.handle('twitch:getCurrentUser', () => {
  const login = store.get('twitch.login');
  const userId = store.get('twitch.userId');
  return login && userId ? { login, userId } : null;
});
ipcMain.handle('twitch:logout', () => {
  [
    'accessToken',
    'refreshToken',
    'scopes',
    'userId',
    'login',
    'authMode',
    'clientSecret'
  ].forEach((k) => store.delete('twitch.' + k));
});

ipcMain.handle('twitch:getChannelChatters', (e, ch) =>
  fetchChannelChattersHelix(ch)
);
ipcMain.handle('twitch:getModeratedChannels', () =>
  fetchModeratedChannelsHelix()
);
ipcMain.handle('twitch:getChannelsLiveStatus', (e, logins) =>
  fetchChannelsLiveStatusHelix(logins)
);
ipcMain.handle('twitch:getUsersInfo', (e, logins) =>
  fetchUsersInfoHelix(logins)
);
ipcMain.handle('twitch:getFollowedChannels', () =>
  fetchFollowedChannelsHelix()
);

ipcMain.handle('twitch:banUser', (e, ch, u, d, r) => banUserHelix(ch, u, d, r));
ipcMain.handle('twitch:timeoutUser', (e, ch, u, d, r) =>
  banUserHelix(ch, u, d || 600, r)
);
ipcMain.handle('twitch:unbanUser', (e, ch, u) => unbanUserHelix(ch, u));
ipcMain.handle('twitch:deleteMessage', (e, ch, id) =>
  deleteMessageHelix(ch, id)
);
ipcMain.handle('twitch:clearChat', (e, ch) => clearChatHelix(ch));

ipcMain.handle('twitch:getShieldMode', (e, ch) => getShieldModeHelix(ch));
ipcMain.handle('twitch:setShieldMode', (e, ch, active) =>
  updateShieldModeHelix(ch, active)
);

ipcMain.handle('twitch:getChatSettings', (e, ch) =>
  getChatSettingsHelix(ch)
);
ipcMain.handle('twitch:updateChatSettings', (e, ch, s) =>
  updateChatSettingsHelix(ch, s)
);
ipcMain.handle('twitch:sendAnnouncement', (e, ch, msg, col) =>
  sendAnnouncementHelix(ch, msg, col)
);

ipcMain.handle('twitch:slowMode', (e, ch, en, sec) =>
  updateChatSettingsHelix(ch, {
    slow_mode: en,
    slow_mode_wait_time: en ? sec : 0
  })
);
ipcMain.handle('twitch:followersOnly', (e, ch, en, min) =>
  updateChatSettingsHelix(ch, {
    follower_mode: en,
    follower_mode_duration: en ? min : 0
  })
);
ipcMain.handle('twitch:subscribersOnly', (e, ch, en) =>
  updateChatSettingsHelix(ch, { subscriber_mode: en })
);
ipcMain.handle('twitch:emoteOnly', (e, ch, en) =>
  updateChatSettingsHelix(ch, { emote_mode: en })
);

// Отправка сообщения через Helix chat/messages
ipcMain.handle('twitch:sendChatMessage', (e, ch, msg) =>
  sendChatMessageHelix(ch, msg)
);

// Гарантировать свежий accessToken перед подключением чата
ipcMain.handle('twitch:ensureAccessToken', () =>
  ensureAccessTokenHelix()
);