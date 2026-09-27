// LOCAL DEVELOPMENT ONLY — never deployed. Vercel serves the static files and api/*.mjs itself.
// Zero-dependency node:http server: static files from the repo root (index.html by default)
// plus /api/snapshot, /api/plan and /api/mcp/<code> wired to the same modules Vercel runs.
// Uses the in-memory store unless CONNECTOR_STORE is set. Needs HEALTH_SYNC_TOKEN (20+ chars).
//   HEALTH_SYNC_TOKEN=<code> node scripts/dev-server.mjs      (PORT defaults to 8765)
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { Readable } from 'node:stream';
import { fileURLToPath, pathToFileURL } from 'node:url';

var ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
var PORT = Number(process.env.PORT) || 8765;
if (!process.env.CONNECTOR_STORE) process.env.CONNECTOR_STORE = 'memory';

var MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webmanifest': 'application/manifest+json'
};

var moduleCache = {};
function loadModule(rel) {
  if (!moduleCache[rel]) moduleCache[rel] = import(pathToFileURL(path.join(ROOT, rel)).href);
  return moduleCache[rel];
}

function routeApi(pathname) {
  if (pathname === '/api/snapshot') return 'api/snapshot.mjs';
  if (pathname === '/api/plan') return 'api/plan.mjs';
  if (/^\/api\/mcp\/[^/]+\/?$/.test(pathname)) return 'api/mcp/[token].mjs';
  return null;
}

function toWebRequest(req) {
  var url = 'http://' + (req.headers.host || 'localhost:' + PORT) + req.url;
  var headers = new Headers();
  Object.keys(req.headers).forEach(function (k) {
    var v = req.headers[k];
    if (Array.isArray(v)) v.forEach(function (x) { headers.append(k, x); });
    else if (v !== undefined) headers.set(k, v);
  });
  var init = { method: req.method, headers: headers };
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    init.body = Readable.toWeb(req);
    init.duplex = 'half';
  }
  return new Request(url, init);
}

async function sendWebResponse(res, response) {
  var headers = {};
  response.headers.forEach(function (v, k) { headers[k] = v; });
  res.writeHead(response.status, headers);
  if (!response.body) { res.end(); return; }
  var reader = response.body.getReader();
  for (;;) {
    var step = await reader.read();
    if (step.done) break;
    res.write(Buffer.from(step.value));
  }
  res.end();
}

function serveStatic(req, res, pathname) {
  var rel = decodeURIComponent(pathname);
  if (rel.endsWith('/')) rel += 'index.html';
  var file = path.resolve(ROOT, '.' + rel);
  if (file !== ROOT && !file.startsWith(ROOT + path.sep)) { res.writeHead(403); res.end(); return; }
  var relFromRoot = path.relative(ROOT, file).split(path.sep);
  if (relFromRoot[0] === 'node_modules' || relFromRoot[0] === '.git' || relFromRoot[0] === 'api' || relFromRoot[0].startsWith('.')) {
    res.writeHead(404); res.end(); return;
  }
  fs.stat(file, function (err, st) {
    if (err || !st.isFile()) { res.writeHead(404, { 'Content-Type': 'text/plain' }); res.end('Not found'); return; }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
    fs.createReadStream(file).pipe(res);
  });
}

var server = http.createServer(function (req, res) {
  var pathname = new URL(req.url, 'http://localhost').pathname;
  var mod = routeApi(pathname);
  if (!mod) { serveStatic(req, res, pathname); return; }
  loadModule(mod).then(function (m) {
    return m.default.fetch(toWebRequest(req));
  }).then(function (response) {
    return sendWebResponse(res, response);
  }).catch(function (e) {
    console.error('dev-server error:', e && e.message);
    if (!res.headersSent) res.writeHead(500, { 'Content-Type': 'text/plain', 'Cache-Control': 'no-store' });
    res.end('Internal error');
  });
});

server.listen(PORT, function () {
  console.log('dev-server (local only) http://localhost:' + PORT + ' — store: ' + process.env.CONNECTOR_STORE);
  if (!process.env.HEALTH_SYNC_TOKEN || process.env.HEALTH_SYNC_TOKEN.length < 20) {
    console.log('HEALTH_SYNC_TOKEN is missing or shorter than 20 chars: every /api request will be rejected.');
  }
});
