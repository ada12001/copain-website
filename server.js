const http = require('http');
const { randomUUID } = require('crypto');
const fs = require('fs/promises');
const path = require('path');
const { URL } = require('url');

const HOST = process.env.HOST || '0.0.0.0';
const PORT = Number(process.env.PORT || 3000);
const ROOT = __dirname;
const DATA_DIR = path.join(ROOT, 'data');

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
  return board.sections.flatMap((section) => section.items.map((item) => ({
    ...item,
    section_id: section.id,
    section_title: section.title,
    location_name: board.location,
    location_slug: board.slug
  })));
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

function buildLiveItem(item, event, now) {
  if (!event) return null;

  const startedAt = new Date(event.started_at).getTime();
  const bakeEndAt = startedAt + item.bake_minutes * 60 * 1000;
  const floorAt = bakeEndAt + (item.cool_minutes + item.floor_minutes) * 60 * 1000;
  const visibilityMs = (item.homepage_visibility_minutes || 90) * 60 * 1000;
  const hideAt = floorAt + visibilityMs;

  if (now < bakeEndAt) {
    return {
      item_id: item.id,
      item_name: item.name,
      location_name: item.location_name,
      location_slug: item.location_slug,
      status: 'In the Oven',
      display_time: 'Expected at',
      time_value: new Date(floorAt).toISOString(),
      floor_at: new Date(floorAt).toISOString(),
      sort_bucket: 2,
      sort_time: floorAt
    };
  }

  if (now < floorAt) {
    return {
      item_id: item.id,
      item_name: item.name,
      location_name: item.location_name,
      location_slug: item.location_slug,
      status: 'Cooling Now',
      display_time: 'Expected at',
      time_value: new Date(floorAt).toISOString(),
      floor_at: new Date(floorAt).toISOString(),
      sort_bucket: 1,
      sort_time: floorAt
    };
  }

  if (now < hideAt) {
    return {
      item_id: item.id,
      item_name: item.name,
      location_name: item.location_name,
      location_slug: item.location_slug,
      status: 'Ready',
      display_time: 'Placed at',
      time_value: new Date(floorAt).toISOString(),
      floor_at: new Date(floorAt).toISOString(),
      hide_at: new Date(hideAt).toISOString(),
      sort_bucket: 0,
      sort_time: floorAt
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
    const boards = await readBoards();
    return sendJson(res, 200, {
      items: buildHomepageFeed(boards),
      generated_at: new Date().toISOString()
    });
  }

  const boardMatch = pathname.match(/^\/api\/kitchen\/([a-z0-9-]+)$/);
  if (boardMatch && req.method === 'GET') {
    const board = await readBoard(boardMatch[1]);
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
