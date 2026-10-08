// 使用真实浏览器验收下载；统计替身只测试参数，不代表服务端已收到事件。
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium, devices } = require('playwright');
const sharp = require('sharp');
const previewTransport = require('./preview-transport.cjs');
const base = process.env.JOBFACE_TEST_URL || 'http://127.0.0.1:4173';
const root = path.resolve(__dirname, '..');
const urls = [...fs.readFileSync(path.join(root, 'sitemap.xml'), 'utf8').matchAll(/<loc>(.*?)<\/loc>/g)].map(x => new URL(x[1]).pathname);
(async () => {
  const browser = await chromium.launch({ headless: true, ...(process.env.JOBFACE_TEST_PROXY ? { proxy: { server: process.env.JOBFACE_TEST_PROXY } } : {}) });
  try {
    const nojs = await browser.newContext({ javaScriptEnabled: false });
    await previewTransport(nojs, base);
    const page = await nojs.newPage();
    for (const url of urls) {
      const response = await page.goto(base + url);
      assert.equal(response.status(), 200, url);
      assert.equal(await page.locator('h1').count(), 1, url);
      assert.equal(await page.locator('html').getAttribute('lang'), 'en');
      assert.equal(await page.locator('link[rel=canonical]').getAttribute('href'), 'https://jobface.wezzik.com' + url);
      const text = await page.locator('main').evaluate(el => { const copy = el.cloneNode(true); copy.querySelectorAll('select').forEach(x => x.remove()); return copy.textContent; });
      assert(text.length > 400, url + ' 正文过少');
      assert(!/[\u4e00-\u9fff]/.test(text), url + ' 默认正文不是英文');
      for (const json of await page.locator('script[type="application/ld+json"]').allTextContents()) JSON.parse(json);
      const links = await page.locator('a[href]').evaluateAll(els => els.map(a => a.getAttribute('href')).filter(h => h.startsWith('/')));
      for (const href of links) {
        const local = new URL(href, base).pathname;
        const file = path.join(root, local.endsWith('/') ? local + 'index.html' : local);
        assert(fs.existsSync(file), url + ' 无效内部链接 ' + href);
      }
    }
    for (const url of ['/missing-jobface-check-999/', '/resume-photo/not-a-page/', '/random-missing.html']) {
      const response = await page.goto(base + url); assert.equal(response.status(), 404, url);
      assert(await page.getByRole('link', { name: 'Return to JobFace home' }).count());
    }
    await page.goto(base + '/');
    const faq = await page.locator('script[type="application/ld+json"]').evaluate(el => JSON.parse(el.textContent)['@graph'].find(x => x['@type'] === 'FAQPage'));
    const visibleFaq = await page.locator('#faq details').evaluateAll(els => els.map(el => [el.querySelector('summary').textContent, el.querySelector('p').textContent]));
    assert.deepEqual(faq.mainEntity.map(x => [x.name, x.acceptedAnswer.text]), visibleFaq);
    console.log('通过：13 个页面、禁脚本英文内容、内部链接、结构化数据、3 种错误地址');
    await nojs.close();
    const mobile = await browser.newContext({ ...devices['iPhone 13'], acceptDownloads: true });
    await previewTransport(mobile, base);
    const p = await mobile.newPage();
    const errors = [], external = [];
    p.on('pageerror', e => errors.push(e.message));
    p.on('request', req => { if (/^https?:/.test(req.url()) && !req.url().startsWith(base)) external.push(req.url()); });
    await p.goto(base + '/');
    await p.evaluate(() => { window.testEvents = []; window.jobfaceTrack = (event, values) => window.testEvents.push({ event, values }); });
    assert(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth), '手机横向溢出');
    await p.getByRole('link', { name: 'Crop my photo →', exact: true }).click();
    await p.locator('#photo-file').setInputFiles(path.join(root, 'assets/avatar-finance.webp'));
    await p.locator('#process-photo').click();
    await p.locator('#photo-download').waitFor({ state: 'visible' });
    let downloadPromise = p.waitForEvent('download'); await p.locator('#photo-download').click();
    let download = await downloadPromise;
    let metadata = await sharp(await download.path()).metadata();
    assert.equal(metadata.width, 720); assert.equal(metadata.height, 720); assert.equal(metadata.format, 'jpeg');
    await p.locator('#photo-mode').selectOption('job');
    assert(await p.locator('#photo-result').isHidden(), '切换尺寸须清理旧预览');
    await p.locator('#process-photo').click();
    await p.locator('#photo-download').waitFor({ state: 'visible' });
    downloadPromise = p.waitForEvent('download'); await p.locator('#photo-download').click();
    download = await downloadPromise; metadata = await sharp(await download.path()).metadata();
    assert.equal(metadata.width, 1080); assert.equal(metadata.height, 1350);
    await p.locator('#photo-file').setInputFiles({ name: 'bad.jpg', mimeType: 'image/jpeg', buffer: Buffer.from('invalid') });
    await p.locator('#process-photo').click();
    await p.waitForFunction(() => document.getElementById('photo-error').textContent.includes('could not'));
    assert(await p.locator('#photo-result').isHidden());
    await p.locator('#close-dialog').click();
    await p.getByRole('link', { name: 'Build my resume →', exact: true }).first().click();
    await p.locator('#resume-name').fill('Example <script>alert(1)</script>');
    await p.locator('#resume-contact').fill('test@example.com');
    await p.locator('#resume-experience').fill('Example work\nA second line');
    downloadPromise = p.waitForEvent('download'); await p.locator('#resume-form button[type=submit]').click();
    download = await downloadPromise;
    const html = fs.readFileSync(await download.path(), 'utf8');
    assert(html.includes('&lt;script&gt;')); assert(!html.includes('<script>')); assert(html.includes('Example work\nA second line')); assert(!html.includes('<h2>Education</h2>'));
    const events = await p.evaluate(() => window.testEvents);
    assert.equal(events.filter(e => e.event === 'tool_start').length, 2);
    assert.equal(events.filter(e => e.event === 'photo_download').length, 2);
    assert.equal(events.filter(e => e.event === 'resume_download').length, 1);
    assert(!JSON.stringify(events).includes('test@example.com'));
    assert.deepEqual(errors, []); assert.deepEqual(external, []);
    await p.locator('#close-dialog').click();
    await p.locator('#language').selectOption('zh-CN');
    assert((await p.locator('h1').innerText()).includes('照片'));
    await p.locator('#language').selectOption('en');
    fs.mkdirSync(path.join(root, 'test-results'), { recursive: true });
    await p.screenshot({ path: path.join(root, 'test-results/mobile-home.png'), fullPage: true });
    for (const url of ['/resume-photo/', '/resume-templates/', '/blog/ats-resume-keywords/']) {
      await p.goto(base + url);
      assert(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth), url + ' 手机横向溢出');
    }
    console.log('通过：手机两种照片下载、坏图片提示、简历实际下载与转义、可选字段、语言切换、无输入外传、事件参数白名单');
    await mobile.close();
    // 单独测试统计同意边界，所有 Google 请求均拦截，不把测试当成真实统计验收。
    const analytics = await browser.newContext();
    await previewTransport(analytics, base);
    await analytics.route('**/assets/analytics-config.js', route => route.fulfill({ contentType: 'text/javascript', body: "window.JOBFACE_ANALYTICS={measurementId:'G-TESTONLY'};" }));
    await analytics.route('https://www.googletagmanager.com/**', route => route.fulfill({ body: '' }));
    const ap = await analytics.newPage(); await ap.goto(base + '/?private=do-not-send');
    assert.equal(await ap.evaluate(() => typeof window.gtag), 'undefined');
    await ap.locator('#analytics-yes').click();
    await ap.evaluate(() => window.jobfaceTrack('resume_download', { tool: 'resume', name: 'secret', contact: 'secret' }));
    const payload = await ap.evaluate(() => window.dataLayer.map(x => [...x]));
    assert(!JSON.stringify(payload).includes('secret')); assert(!JSON.stringify(payload).includes('do-not-send'));
    await ap.locator('#analytics-settings').click(); await ap.locator('#analytics-no').click();
    const count = await ap.evaluate(() => window.dataLayer.length);
    await ap.evaluate(() => window.jobfaceTrack('resume_download', { tool: 'resume' }));
    assert.equal(await ap.evaluate(() => window.dataLayer.length), count);
    await analytics.close();
    console.log('通过：统计未同意不加载、同意后参数过滤、拒绝后停止（非真实 GA4 接收验证）');
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
