// 读取已部署页面，核对本地文案；预览仅复用既有验收权限，不打印凭据。
const fs = require('node:fs');
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const setup = require('./preview-transport.cjs');
const base = process.env.JOBFACE_TEST_URL;
const paths = [...fs.readFileSync('sitemap.xml', 'utf8').matchAll(/<loc>(.*?)<\/loc>/g)].map(x => new URL(x[1]).pathname);
(async () => {
  assert(base && (base === 'https://jobface.wezzik.com' || /^https:\/\/jobface-[a-z0-9]+-qiuliang087-5768s-projects\.vercel\.app$/.test(base)), '验收域名不匹配');
  let headers = {};
  await setup({ route: async (pattern, handler) => {
    if (pattern === base + '/**') await handler({ request: () => ({ headers: () => ({}) }), continue: async value => { headers = value.headers; } });
  } }, base);
  function get(p) {
    const input = Object.entries(headers).map(([k,v]) => `header = "${k}: ${v}"`).join('\n');
    const args = ['-sS', '--max-time', '30', '--retry', '1', '--config', '-', '-i', base + p];
    if (process.env.JOBFACE_TEST_PROXY) args.unshift('--proxy', process.env.JOBFACE_TEST_PROXY);
    const raw = execFileSync('curl', args, { input, encoding: 'utf8', maxBuffer: 2 * 1024 * 1024 });
    const split = raw.split(/\r?\n\r?\n/);
    while (split[0].includes('Connection established')) split.shift();
    const head = split.shift();
    return { status: Number(head.match(/^HTTP\/[\d.]+ (\d+)/)[1]), head, body: split.join('\n\n') };
  }
  for (const p of paths) {
    const r = get(p); assert.equal(r.status, 200, p);
    if (!process.env.JOBFACE_PREVIEW_AUTH) assert(!/x-robots-tag:.*noindex/i.test(r.head), p);
    const local = fs.readFileSync(p === '/' ? 'index.html' : p.slice(1) + 'index.html', 'utf8');
    if (p === '/' || p === '/blog/') {
      for (const guide of paths.filter(url => url.startsWith('/blog/') && url !== '/blog/')) {
        assert(r.body.includes(`href="${guide}"`), p + ' 缺少指南入口 ' + guide);
      }
    }
    for (const regex of [/<title>.*?<\/title>/s, /<meta name="description"[^>]*>/s, /<section class="search-guide">.*?<\/section>/s, /<script type="application\/ld\+json">.*?<\/script>/s]) {
      assert.equal(r.body.match(regex)?.[0], local.match(regex)?.[0], p + ' 部署内容不一致');
    }
    console.log('通过：' + p);
  }
  assert.equal(get('/missing-search-check-20261027/').status, 404);
  const sitemap = get('/sitemap.xml'); assert.equal(sitemap.status, 200);
  assert.equal(sitemap.body.trim(), fs.readFileSync('sitemap.xml','utf8').trim());
  assert(get('/robots.txt').body.includes('Sitemap: https://jobface.wezzik.com/sitemap.xml'));
  assert(get('/assets/analytics-config.js').body.includes('G-SN0S9SS55N'));
  console.log(`通过：${paths.length} 页已部署文案、真实错误页面、站点地图、抓取规则和统计配置；未执行统计脚本。`);
})().catch(e => { console.error(e.message); process.exitCode = 1; });
