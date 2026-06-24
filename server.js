const http = require('http');
const fs = require('fs/promises');
const path = require('path');
const { URL } = require('url');

const HOST = process.env.HOST || '0.0.0.0';
const PORT = Number(process.env.PORT || 3000);
const ROOT = __dirname;

const MIME_TYPES = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.pdf': 'application/pdf',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.ttf': 'font/ttf',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2'
};

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store'
  });
  res.end(JSON.stringify(payload));
}

function sendText(res, statusCode, message) {
  res.writeHead(statusCode, {
    'Content-Type': 'text/plain; charset=utf-8'
  });
  res.end(message);
}

function sanitizePath(pathname) {
  const safePath = decodeURIComponent(pathname === '/' ? '/index.html' : pathname);
  const normalized = path.normalize(path.join(ROOT, safePath));
  if (!normalized.startsWith(ROOT)) return null;
  return normalized;
}

async function resolveTarget(filePath) {
  try {
    const stat = await fs.stat(filePath);
    return { stat, target: filePath };
  } catch (error) {
    // Mirror Vercel `cleanUrls`: an extensionless request (/menu) resolves to /menu.html
    // so local dev navigation matches production.
    if (!path.extname(filePath)) {
      try {
        const htmlPath = `${filePath}.html`;
        const htmlStat = await fs.stat(htmlPath);
        if (htmlStat.isFile()) return { stat: htmlStat, target: htmlPath };
      } catch (htmlError) {
        return null;
      }
    }
    return null;
  }
}

async function handleStatic(res, pathname) {
  const filePath = sanitizePath(pathname);
  if (!filePath) {
    sendText(res, 403, 'Forbidden');
    return;
  }

  const resolved = await resolveTarget(filePath);
  if (!resolved) {
    sendText(res, 404, 'Not found');
    return;
  }

  const { stat, target } = resolved;
  const resolvedPath = stat.isDirectory() ? path.join(target, 'index.html') : target;

  try {
    const file = await fs.readFile(resolvedPath);
    const ext = path.extname(resolvedPath).toLowerCase();
    res.writeHead(200, {
      'Content-Type': MIME_TYPES[ext] || 'application/octet-stream'
    });
    res.end(file);
  } catch (error) {
    sendText(res, 404, 'Not found');
  }
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host || `${HOST}:${PORT}`}`);

    if (url.pathname === '/healthz' && req.method === 'GET') {
      sendJson(res, 200, { ok: true });
      return;
    }

    await handleStatic(res, url.pathname);
  } catch (error) {
    console.error(error);
    sendJson(res, 500, { error: 'Internal server error.' });
  }
});

server.listen(PORT, HOST, () => {
  console.log(`Copain server running at http://${HOST}:${PORT}`);
});
