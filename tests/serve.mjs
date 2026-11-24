// Static server for the built variants, on 127.0.0.1:$TEST_PORT.
// The longest variant baseurl prefixing the path picks _build/<name>; anything else is served from prod.
// Directory without slash -> 301 to path/ (as GitHub Pages); directory -> index.html; missing -> 404; '..' -> 400.
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { variants } from './variants.mjs';

const BUILD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '_build');
const PORT = Number(process.env.TEST_PORT);
if (!PORT) {
  console.error('TEST_PORT is required');
  process.exit(2);
}

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
  '.eot': 'application/vnd.ms-fontobject',
  '.mp4': 'video/mp4',
  '.pdf': 'application/pdf',
};

const prod = variants.find((v) => v.name === 'prod');
const prefixed = variants.filter((v) => v.baseurl).sort((a, b) => b.baseurl.length - a.baseurl.length);

function variantFor(pathname) {
  for (const v of prefixed) {
    if (pathname === v.baseurl || pathname.startsWith(`${v.baseurl}/`)) {
      return { variant: v, rest: pathname.slice(v.baseurl.length) };
    }
  }
  return { variant: prod, rest: pathname };
}

function send(res, status, headers = {}, body = '') {
  res.writeHead(status, { 'content-type': 'text/plain; charset=utf-8', ...headers });
  res.end(body);
}

http.createServer((req, res) => {
  const rawPath = req.url.split(/[?#]/)[0];
  let segments;
  try {
    segments = rawPath.split('/').map(decodeURIComponent);
  } catch {
    return send(res, 400, {}, 'bad path\n');
  }
  if (segments.includes('..') || segments.some((s) => s.includes('\0'))) return send(res, 400, {}, 'bad path\n');

  const url = new URL(req.url, 'http://localhost');
  const pathname = segments.join('/');
  const { variant, rest } = variantFor(pathname);
  let file = path.join(BUILD, variant.name, rest);
  let stat = fs.statSync(file, { throwIfNoEntry: false });
  if (stat?.isDirectory()) {
    if (!pathname.endsWith('/')) return send(res, 301, { location: `${url.pathname}/${url.search}` });
    file = path.join(file, 'index.html');
    stat = fs.statSync(file, { throwIfNoEntry: false });
  }
  if (!stat?.isFile()) return send(res, 404, {}, 'not found\n');

  const type = MIME[path.extname(file).toLowerCase()] ?? 'application/octet-stream';
  res.writeHead(200, { 'content-type': type, 'content-length': stat.size });
  if (req.method === 'HEAD') return res.end();
  fs.createReadStream(file).pipe(res);
}).listen(PORT, '127.0.0.1', () => console.log(`serving ${BUILD} on http://127.0.0.1:${PORT}/`));
