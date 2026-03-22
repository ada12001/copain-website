const http = require('http');
const { createHmac, randomUUID, timingSafeEqual } = require('crypto');
const fs = require('fs/promises');
const path = require('path');
const { URL } = require('url');

const HOST = process.env.HOST || '0.0.0.0';
const PORT = Number(process.env.PORT || 3000);
const ROOT = __dirname;
const DATA_DIR = path.join(ROOT, 'data');
const DEFAULT_SESSION_HOURS = 12;
const REMEMBER_SESSION_DAYS = 30;

const MIME_TYPES = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.pdf': 'application/pdf',
  '.ico': 'image/x-icon'
};

function getTodayInTimeZone(timeZone) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(new Date());
}

function boardFileForSlug(slug) {
  return path.join(DATA_DIR, `${slug}-kitchen.json`);
}

function authCookieName(slug) {
  return `copain_kitchen_auth_${slug}`;
}

function normalizeSlug(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '');
}

function getKitchenPassword(slug) {
  const envKey = `KITCHEN_PASSWORD_${slug.toUpperCase().replace(/-/g, '_')}`;
  return process.env[envKey] || process.env.KITCHEN_PASSWORD || '';
}

function getKitchenSecret(slug) {
  return process.env.KITCHEN_AUTH_SECRET || getKitchenPassword(slug) || 'local-dev-kitchen-secret';
}

function parseCookies(req) {
  const header = req.headers.cookie || '';
  return header.split(';').reduce((cookies, part) => {
    const [key, ...valueParts] = part.trim().split('=');
    if (!key) return cookies;
    cookies[key] = decodeURIComponent(valueParts.join('=') || '');
    return cookies;
  }, {});
}

function signSessionPayload(payload, slug) {
  return createHmac('sha256', getKitchenSecret(slug))
    .update(payload)
    .digest('hex');
}

function createKitchenSessionToken(slug, expiresAt) {
  const payload = `${slug}.${expiresAt}`;
  const signature = signSessionPayload(payload, slug);
  return Buffer.from(`${payload}.${signature}`).toString('base64url');
}

function verifyKitchenSessionToken(token, slug) {
  if (!token) return false;

  try {
    const decoded = Buffer.from(token, 'base64url').toString('utf8');
    const parts = decoded.split('.');
    if (parts.length !== 3) return false;

    const [tokenSlug, expiresAtRaw, signature] = parts;
    const expiresAt = Number(expiresAtRaw);
    if (tokenSlug !== slug || !Number.isFinite(expiresAt) || expiresAt <= Date.now()) {
      return false;
    }

    const expected = signSessionPayload(`${tokenSlug}.${expiresAtRaw}`, slug);
    const actualBuffer = Buffer.from(signature, 'utf8');
    const expectedBuffer = Buffer.from(expected, 'utf8');
    if (actualBuffer.length !== expectedBuffer.length) return false;

    return timingSafeEqual(actualBuffer, expectedBuffer);
  } catch (error) {
    return false;
  }
}

function buildCookieHeader(name, value, maxAgeSeconds, req) {
  const segments = [
    `${name}=${encodeURIComponent(value)}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax'
  ];

  if (typeof maxAgeSeconds === 'number') {
    segments.push(`Max-Age=${Math.max(0, Math.floor(maxAgeSeconds))}`);
    segments.push(`Expires=${new Date(Date.now() + Math.max(0, maxAgeSeconds) * 1000).toUTCString()}`);
  }

  const forwardedProto = req.headers['x-forwarded-proto'];
  if (forwardedProto === 'https') {
    segments.push('Secure');
  }

  return segments.join('; ');
}

function sendKitchenUnauthorized(res, slug, message) {
  sendJson(res, 401, {
    error: message || 'Authentication required.',
    requires_auth: true,
    location_slug: slug
  });
}

function requireKitchenAuth(req, res, slug) {
  const password = getKitchenPassword(slug);
  if (!password) {
    sendJson(res, 503, {
      error: `Kitchen password for ${slug} is not configured.`,
      requires_auth: true,
      location_slug: slug,
      configuration_error: true
    });
    return false;
  }

  const cookies = parseCookies(req);
  const token = cookies[authCookieName(slug)];
  if (!verifyKitchenSessionToken(token, slug)) {
    sendKitchenUnauthorized(res, slug, 'Enter the kitchen password to continue.');
    return false;
  }

  return true;
}

async function listBoardFiles() {
  const entries = await fs.readdir(DATA_DIR, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile() && entry.name.endsWith('-kitchen.json'))
    .map((entry) => path.join(DATA_DIR, entry.name));
}

async function writeBoardToFile(filePath, board) {
  const tempFile = filePath + '.tmp';
  await fs.writeFile(tempFile, JSON.stringify(board, null, 2) + '\n', 'utf8');
  await fs.rename(tempFile, filePath);
}

async function readBoardFromFile(filePath) {
  const raw = await fs.readFile(filePath, 'utf8');
  const board = JSON.parse(raw);
  const today = getTodayInTimeZone(board.timezone || 'America/New_York');

  if (board.board_date !== today) {
    board.board_date = today;
    board.events = [];
    await writeBoardToFile(filePath, board);
  }

  if (!Array.isArray(board.events)) board.events = [];
  if (!Array.isArray(board.sections)) board.sections = [];
  board.sections.forEach((section) => {
    section.items = Array.isArray(section.items) ? section.items : [];
    section.items.forEach((item) => {
      if (typeof item.active_today === 'undefined') item.active_today = true;
    });
  });

  return board;
}

async function readBoard(slug) {
  return readBoardFromFile(boardFileForSlug(slug));
}

async function readBoards() {
  const files = await listBoardFiles();
  return Promise.all(files.map((filePath) => readBoardFromFile(filePath)));
}

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store'
  });
  res.end(JSON.stringify(payload));
}

function sendError(res, statusCode, message) {
  sendJson(res, statusCode, { error: message });
}

async function parseJsonBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const body = Buffer.concat(chunks).toString('utf8');
  if (!body) return {};
  return JSON.parse(body);
}

function sanitizePath(pathname) {
  const safePath = decodeURIComponent(pathname === '/' ? '/index.html' : pathname);
  const normalized = path.normalize(path.join(ROOT, safePath));
  if (!normalized.startsWith(ROOT)) return null;
  return normalized;
}

function collectItems(board) {
  return board.sections.flatMap((section) => section.items
    .filter((item) => item.active_today !== false)
    .map((item) => ({
    ...item,
    section_id: section.id,
    section_title: section.title,
    location_name: board.location,
    location_slug: board.slug
    })));
}

function getItemLookup(board) {
  return new Map(board.sections.flatMap((section) => section.items.map((item) => [item.id, {
    ...item,
    section_id: section.id,
    section_title: section.title,
    location_name: board.location,
    location_slug: board.slug
  }])));
}

function getLifecycleTimes(item, event) {
  const startedAt = new Date(event.started_at).getTime();
  const bakeEndAt = startedAt + item.bake_minutes * 60 * 1000;
  const floorAt = bakeEndAt + (item.cool_minutes + item.floor_minutes) * 60 * 1000;
  const visibilityMs = (item.homepage_visibility_minutes || 90) * 60 * 1000;
  const hideAt = floorAt + visibilityMs;

  return {
    startedAt,
    bakeEndAt,
    floorAt,
    hideAt
  };
}

function latestEventsByItem(board) {
  const latest = new Map();
  (board.events || []).forEach((event) => {
    const prior = latest.get(event.item_id);
    if (!prior || new Date(event.started_at).getTime() > new Date(prior.started_at).getTime()) {
      latest.set(event.item_id, event);
    }
  });
  return latest;
}

async function pruneExpiredEvents(filePath, board) {
  const itemLookup = getItemLookup(board);
  const now = Date.now();
  const nextEvents = (board.events || []).filter((event) => {
    const item = itemLookup.get(event.item_id);
    if (!item) return false;
    const times = getLifecycleTimes(item, event);
    return times.hideAt > now;
  });

  if (nextEvents.length !== board.events.length) {
    board.events = nextEvents;
    await writeBoardToFile(filePath, board);
  }

  return board;
}

function buildLiveItem(item, event, now) {
  if (!event) return null;

  const times = getLifecycleTimes(item, event);

  if (now < times.bakeEndAt) {
    return {
      item_id: item.id,
      item_name: item.name,
      location_name: item.location_name,
      location_slug: item.location_slug,
      status: 'In the Oven',
      display_time: 'Expected at',
      time_value: new Date(times.floorAt).toISOString(),
      floor_at: new Date(times.floorAt).toISOString(),
      sort_bucket: 2,
      sort_time: times.floorAt
    };
  }

  if (now < times.floorAt) {
    return {
      item_id: item.id,
      item_name: item.name,
      location_name: item.location_name,
      location_slug: item.location_slug,
      status: 'Cooling Now',
      display_time: 'Expected at',
      time_value: new Date(times.floorAt).toISOString(),
      floor_at: new Date(times.floorAt).toISOString(),
      sort_bucket: 1,
      sort_time: times.floorAt
    };
  }

  if (now < times.hideAt) {
    return {
      item_id: item.id,
      item_name: item.name,
      location_name: item.location_name,
      location_slug: item.location_slug,
      status: 'Ready',
      display_time: 'Placed at',
      time_value: new Date(times.floorAt).toISOString(),
      floor_at: new Date(times.floorAt).toISOString(),
      hide_at: new Date(times.hideAt).toISOString(),
      sort_bucket: 0,
      sort_time: times.floorAt
    };
  }

  return null;
}

function buildHomepageFeed(boards) {
  const now = Date.now();
  const items = boards.flatMap((board) => {
    const latestEvents = latestEventsByItem(board);
    return collectItems(board)
      .map((item) => buildLiveItem(item, latestEvents.get(item.id), now))
      .filter(Boolean);
  });

  items.sort((a, b) => {
    if (a.sort_bucket !== b.sort_bucket) return a.sort_bucket - b.sort_bucket;
    if (a.sort_bucket === 0) return b.sort_time - a.sort_time;
    return a.sort_time - b.sort_time;
  });

  return items.slice(0, 6);
}

async function handleApi(req, res, pathname) {
  if (pathname === '/api/homepage/live' && req.method === 'GET') {
    const files = await listBoardFiles();
    const boards = await Promise.all(files.map(async (filePath) => {
      const board = await readBoardFromFile(filePath);
      return pruneExpiredEvents(filePath, board);
    }));
    return sendJson(res, 200, {
      items: buildHomepageFeed(boards),
      generated_at: new Date().toISOString()
    });
  }

  const authLoginMatch = pathname.match(/^\/api\/kitchen\/([a-z0-9-]+)\/auth\/login$/);
  if (authLoginMatch && req.method === 'POST') {
    let body;
    try {
      body = await parseJsonBody(req);
    } catch (error) {
      return sendError(res, 400, 'Invalid JSON body.');
    }

    const slug = normalizeSlug(authLoginMatch[1]);
    const expectedPassword = getKitchenPassword(slug);
    if (!expectedPassword) {
      return sendJson(res, 503, {
        error: `Kitchen password for ${slug} is not configured.`,
        configuration_error: true
      });
    }

    if (String(body.password || '') !== expectedPassword) {
      return sendKitchenUnauthorized(res, slug, 'Incorrect password. Please try again.');
    }

    const remember = body.remember === true;
    const maxAgeSeconds = remember
      ? REMEMBER_SESSION_DAYS * 24 * 60 * 60
      : DEFAULT_SESSION_HOURS * 60 * 60;
    const expiresAt = Date.now() + maxAgeSeconds * 1000;
    const cookie = buildCookieHeader(
      authCookieName(slug),
      createKitchenSessionToken(slug, expiresAt),
      maxAgeSeconds,
      req
    );

    res.writeHead(200, {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'Set-Cookie': cookie
    });
    res.end(JSON.stringify({
      ok: true,
      expires_at: new Date(expiresAt).toISOString(),
      location_slug: slug
    }));
    return;
  }

  const authLogoutMatch = pathname.match(/^\/api\/kitchen\/([a-z0-9-]+)\/auth\/logout$/);
  if (authLogoutMatch && req.method === 'POST') {
    const slug = normalizeSlug(authLogoutMatch[1]);
    res.writeHead(200, {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'Set-Cookie': buildCookieHeader(authCookieName(slug), '', 0, req)
    });
    res.end(JSON.stringify({ ok: true }));
    return;
  }

  const boardMatch = pathname.match(/^\/api\/kitchen\/([a-z0-9-]+)$/);
  if (boardMatch && req.method === 'GET') {
    const slug = boardMatch[1];
    if (!requireKitchenAuth(req, res, slug)) return;
    const filePath = boardFileForSlug(slug);
    const board = await readBoardFromFile(filePath);
    await pruneExpiredEvents(filePath, board);
    return sendJson(res, 200, {
      board,
      server_time: new Date().toISOString()
    });
  }

  const startMatch = pathname.match(/^\/api\/kitchen\/([a-z0-9-]+)\/start$/);
  if (startMatch && req.method === 'POST') {
    let body;
    try {
      body = await parseJsonBody(req);
    } catch (error) {
      return sendError(res, 400, 'Invalid JSON body.');
    }

    const slug = startMatch[1];
    if (!requireKitchenAuth(req, res, slug)) return;
    const filePath = boardFileForSlug(slug);
    const board = await readBoardFromFile(filePath);
    const item = collectItems(board).find((entry) => entry.id === body.itemId);

    if (!item) {
      return sendError(res, 404, 'Unknown kitchen item.');
    }

    board.events.push({
      id: randomUUID(),
      item_id: item.id,
      started_at: new Date().toISOString()
    });
    board.events = board.events.slice(-120);

    await writeBoardToFile(filePath, board);

    return sendJson(res, 200, {
      ok: true,
      board,
      server_time: new Date().toISOString()
    });
  }

  const clearMatch = pathname.match(/^\/api\/kitchen\/([a-z0-9-]+)\/clear$/);
  if (clearMatch && req.method === 'POST') {
    let body;
    try {
      body = await parseJsonBody(req);
    } catch (error) {
      return sendError(res, 400, 'Invalid JSON body.');
    }

    const slug = clearMatch[1];
    if (!requireKitchenAuth(req, res, slug)) return;
    const filePath = boardFileForSlug(slug);
    const board = await readBoardFromFile(filePath);
    const itemId = body.itemId;

    if (!itemId) {
      return sendError(res, 400, 'Missing itemId.');
    }

    let latestIndex = -1;
    let latestTs = -Infinity;
    board.events.forEach((event, index) => {
      if (event.item_id !== itemId) return;
      const ts = new Date(event.started_at).getTime();
      if (ts > latestTs) {
        latestTs = ts;
        latestIndex = index;
      }
    });

    if (latestIndex === -1) {
      return sendError(res, 404, 'No active batch found for that item.');
    }

    board.events.splice(latestIndex, 1);
    await writeBoardToFile(filePath, board);

    return sendJson(res, 200, {
      ok: true,
      board,
      server_time: new Date().toISOString()
    });
  }

  const resetMatch = pathname.match(/^\/api\/kitchen\/([a-z0-9-]+)\/reset$/);
  if (resetMatch && req.method === 'POST') {
    const slug = resetMatch[1];
    if (!requireKitchenAuth(req, res, slug)) return;
    const filePath = boardFileForSlug(slug);
    const board = await readBoardFromFile(filePath);

    board.events = [];
    board.board_date = getTodayInTimeZone(board.timezone || 'America/New_York');
    await writeBoardToFile(filePath, board);

    return sendJson(res, 200, {
      ok: true,
      board,
      server_time: new Date().toISOString()
    });
  }

  const settingsMatch = pathname.match(/^\/api\/kitchen\/([a-z0-9-]+)\/settings$/);
  if (settingsMatch && req.method === 'POST') {
    let body;
    try {
      body = await parseJsonBody(req);
    } catch (error) {
      return sendError(res, 400, 'Invalid JSON body.');
    }

    const slug = settingsMatch[1];
    if (!requireKitchenAuth(req, res, slug)) return;
    const filePath = boardFileForSlug(slug);
    const board = await readBoardFromFile(filePath);
    const itemStates = new Map(
      Array.isArray(body.items)
        ? body.items.map((item) => [item.id, item.active_today !== false])
        : []
    );

    board.sections.forEach((section) => {
      section.items.forEach((item) => {
        if (itemStates.has(item.id)) item.active_today = itemStates.get(item.id);
      });
    });

    await writeBoardToFile(filePath, board);

    return sendJson(res, 200, {
      ok: true,
      board,
      server_time: new Date().toISOString()
    });
  }

  return sendError(res, 404, 'API route not found.');
}

async function handleStatic(res, pathname) {
  const filePath = sanitizePath(pathname);
  if (!filePath) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  let stat;
  try {
    stat = await fs.stat(filePath);
  } catch (error) {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Not found');
    return;
  }

  const resolvedPath = stat.isDirectory()
    ? path.join(filePath, 'index.html')
    : filePath;

  try {
    const file = await fs.readFile(resolvedPath);
    const ext = path.extname(resolvedPath).toLowerCase();
    res.writeHead(200, {
      'Content-Type': MIME_TYPES[ext] || 'application/octet-stream'
    });
    res.end(file);
  } catch (error) {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Not found');
  }
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host || `${HOST}:${PORT}`}`);

    if (url.pathname === '/healthz' && req.method === 'GET') {
      sendJson(res, 200, { ok: true });
      return;
    }

    if (url.pathname.startsWith('/api/')) {
      await handleApi(req, res, url.pathname);
      return;
    }

    await handleStatic(res, url.pathname);
  } catch (error) {
    console.error(error);
    sendError(res, 500, 'Internal server error.');
  }
});

server.listen(PORT, HOST, () => {
  console.log(`Copain server running at http://${HOST}:${PORT}`);
});
