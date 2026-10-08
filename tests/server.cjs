// 本地静态验收服务器；线上路由仍须在预览部署单独验证。
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css', '.xml': 'application/xml', '.txt': 'text/plain', '.webp': 'image/webp', '.svg': 'image/svg+xml' };
http.createServer((req, res) => {
  let pathname;
  try { pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname); } catch { res.writeHead(400).end(); return; }
  let file = path.resolve(root, '.' + pathname);
  if (!file.startsWith(root + path.sep) && file !== root) { res.writeHead(403).end(); return; }
  if (fs.existsSync(file) && fs.statSync(file).isDirectory()) {
    if (!pathname.endsWith('/')) { res.writeHead(308, { Location: pathname + '/' }).end(); return; }
    file = path.join(file, 'index.html');
  }
  const exists = fs.existsSync(file) && fs.statSync(file).isFile();
  if (!exists) file = path.join(root, '404.html');
  res.writeHead(exists ? 200 : 404, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
}).listen(Number(process.env.PORT || 4173), '127.0.0.1', () => console.log('本地验收服务已启动'));
