// 检查关键词优化后各页信息一致，不以词频推测排名。
const fs = require('node:fs');
const assert = require('node:assert/strict');
const path = require('node:path');
const decode = s => s.replace(/&amp;/g, '&').replace(/&quot;/g, '"');
const urls = [...fs.readFileSync('sitemap.xml', 'utf8').matchAll(/<loc>(.*?)<\/loc>/g)].map(x => x[1]);
const titles = new Set(), descriptions = new Set();
for (const url of urls) {
  const pathname = new URL(url).pathname;
  const file = pathname === '/' ? 'index.html' : pathname.slice(1) + 'index.html';
  const html = fs.readFileSync(file, 'utf8');
  const read = regex => decode(html.match(regex)?.[1] || '');
  const info = {
    title: read(/<title>(.*?)<\/title>/),
    description: read(/name="description" content="([^"]*)"/),
    shareTitle: read(/property="og:title" content="([^"]*)"/),
    shareDescription: read(/property="og:description" content="([^"]*)"/),
    canonical: read(/rel="canonical" href="([^"]*)"/),
    headingCount: [...html.matchAll(/<h1\b/g)].length,
    heading: read(/<h1>(.*?)<\/h1>/),
    keywordCount: [...html.matchAll(/name="keywords"/g)].length,
    guideCount: [...html.matchAll(/class="search-guide"/g)].length,
    date: read(/<time datetime="([^"]*)"/),
    schemas: [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map(x => JSON.parse(x[1]))
  };
  for (const link of html.matchAll(/href="(\/[^"]*)"/g)) {
    const target = new URL(decode(link[1]), url).pathname;
    assert(fs.existsSync(path.join('.', target.endsWith('/') ? target + 'index.html' : target)), pathname + ' 无效链接 ' + target);
  }
  const { title, description } = info;
  assert(!titles.has(title), '标题重复：' + pathname); titles.add(title);
  assert(!descriptions.has(description), '摘要重复：' + pathname); descriptions.add(description);
  assert.equal(info.shareTitle, title);
  assert.equal(info.shareDescription, description);
  assert.equal(info.canonical, url);
  assert.equal(info.headingCount, 1);
  assert.equal(info.keywordCount, 0);
  assert.equal(info.guideCount, 1);
  if (pathname !== '/') assert(/\bfree\b/i.test(title + ' ' + description + ' ' + info.heading), pathname + ' 缺少 Free 定位词');
  for (const data of info.schemas) {
    for (const node of data['@graph'] || [data]) {
      if (node['@type'] === 'WebPage') {
        assert.equal(node.name + ' | JobFace', title);
        assert.equal(node.description, description);
        assert.equal(node.dateModified, '2026-10-27');
      }
      if (node['@type'] === 'Article') {
        assert.equal(node.headline, info.heading);
        assert.equal(node.dateModified, info.date);
      }
    }
  }
}
assert.equal(urls.length, 13);
console.log('通过：13 页标题与摘要唯一、分享信息及结构化信息一致、关键词未堆入无效标签。');
