// 验证公开的域名证明文件，不提交网址，也不触发访问统计。
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');
const previewTransport = require('./preview-transport.cjs');
const root = path.resolve(__dirname, '..');
const files = fs.readdirSync(root).filter(file => /^[a-f0-9]{32}\.txt$/.test(file));
assert.equal(files.length, 1, '必须有且只有一个验证文件');
const file = files[0];
const key = fs.readFileSync(path.join(root, file), 'utf8').trim();
assert.equal(file, key + '.txt');
assert(!fs.readFileSync(path.join(root, 'sitemap.xml'), 'utf8').includes(file));
const base = process.env.JOBFACE_TEST_URL;
assert(base, '请指定验收地址');
(async () => {
  const browser = await chromium.launch({ headless: true, ...(process.env.JOBFACE_TEST_PROXY ? { proxy: { server: process.env.JOBFACE_TEST_PROXY } } : {}) });
  try {
    const context = await browser.newContext({ javaScriptEnabled: false });
    await previewTransport(context, base);
    const page = await context.newPage();
    const response = await page.goto(base + '/' + file, { waitUntil: 'domcontentloaded' });
    assert.equal(response.status(), 200);
    assert.equal((await response.text()).trim(), key);
    assert.match(response.headers()['content-type'], /text\/plain/);
    assert.match(response.headers()['x-robots-tag'], /noindex/);
    console.log('通过：公开验证文件内容、响应类型、禁止收录标记及站点地图隔离');
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
