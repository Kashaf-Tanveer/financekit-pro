'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const rootDir = __dirname;
const port = Number(process.env.PORT) || 3000;
const clients = new Set();
let reloadTimer = null;

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon'
};

function getContentType(filePath) {
  return MIME_TYPES[path.extname(filePath).toLowerCase()] || 'application/octet-stream';
}

function isInsideRoot(candidatePath) {
  const normalizedRoot = path.resolve(rootDir) + path.sep;
  const normalizedCandidate = path.resolve(candidatePath);
  return normalizedCandidate === path.resolve(rootDir) || normalizedCandidate.startsWith(normalizedRoot);
}

function sendNotFound(res) {
  res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end('Not found');
}

function injectLiveReload(html) {
  const script = `\n<script>\n(function () {\n  try {\n    var source = new EventSource('/__livereload');\n    source.onmessage = function (event) {\n      if (event.data === 'reload') location.reload();\n    };\n    source.onerror = function () {};\n  } catch (error) {}\n})();\n</script>\n`;

  if (html.includes('/__livereload')) {
    return html;
  }

  if (html.includes('</body>')) {
    return html.replace('</body>', script + '</body>');
  }

  if (html.includes('</head>')) {
    return html.replace('</head>', script + '</head>');
  }

  return html + script;
}

function broadcastReload() {
  for (const res of clients) {
    res.write('data: reload\n\n');
  }
}

function scheduleReload() {
  clearTimeout(reloadTimer);
  reloadTimer = setTimeout(broadcastReload, 150);
}

const server = http.createServer((req, res) => {
  const parsed = url.parse(req.url || '/');
  const pathname = decodeURIComponent(parsed.pathname || '/');

  if (pathname === '/__livereload') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'Access-Control-Allow-Origin': '*'
    });
    res.write('data: connected\n\n');
    clients.add(res);
    req.on('close', () => clients.delete(res));
    return;
  }

  let filePath = path.join(rootDir, pathname === '/' ? 'index.html' : pathname);
  filePath = path.normalize(filePath);

  if (!isInsideRoot(filePath)) {
    res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Forbidden');
    return;
  }

  fs.stat(filePath, (statErr, stats) => {
    if (statErr) {
      sendNotFound(res);
      return;
    }

    const resolvedPath = stats.isDirectory() ? path.join(filePath, 'index.html') : filePath;
    fs.readFile(resolvedPath, (readErr, data) => {
      if (readErr) {
        sendNotFound(res);
        return;
      }

      const contentType = getContentType(resolvedPath);
      res.writeHead(200, { 'Content-Type': contentType });

      if (contentType.startsWith('text/html')) {
        res.end(injectLiveReload(data.toString('utf8')));
      } else {
        res.end(data);
      }
    });
  });
});

server.listen(port, () => {
  console.log(`Live reload server running at http://localhost:${port}`);
});

try {
  fs.watch(rootDir, { recursive: true }, (eventType, filename) => {
    if (!filename) return;
    const ext = path.extname(filename).toLowerCase();
    if (!['.html', '.css', '.js', '.json', '.xml'].includes(ext)) return;
    scheduleReload();
  });
} catch (error) {
  console.warn('File watching is unavailable:', error.message);
}