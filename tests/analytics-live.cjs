// 仅对正式站点执行真实访问和下载；收集端响应不等于实时报告验收。
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium, devices } = require('playwright');
const sharp = require('sharp');
const base = 'https://jobface.wezzik.com';
const measurementId = 'G-SN0S9SS55N';
const expected = ['page_view', 'tool_start', 'photo_download', 'resume_download'];

(async () => {
  const browser = await chromium.launch({ headless: true, ...(process.env.JOBFACE_TEST_PROXY ? { proxy: { server: process.env.JOBFACE_TEST_PROXY } } : {}) });
  try {
    const context = await browser.newContext({ ...devices['iPhone 13'], acceptDownloads: true });
    const page = await context.newPage();
    const googleRequests = [];
    const received = [];
    const privacyErrors = [];
    page.on('request', request => {
      if (/google-analytics\.com|googletagmanager\.com/.test(new URL(request.url()).hostname)) googleRequests.push(request.url());
    });
    page.on('response', response => {
      const url = new URL(response.url());
      if (!/(^|\.)google-analytics\.com$/.test(url.hostname) || !url.pathname.endsWith('/collect')) return;
      const request = response.request();
      const payload = request.postData() || '';
      for (const line of payload.split('\n')) {
        const params = new URLSearchParams(url.search);
        for (const [key, value] of new URLSearchParams(line)) params.set(key, value);
        if (params.get('tid') !== measurementId) privacyErrors.push('衡量编号不匹配');
        const serialized = [...params].map(([key, value]) => key + '=' + value).join('&');
        if (/private-check|qa-person|qa-contact|qa-experience/.test(serialized)) privacyErrors.push('个人输入或查询参数外传');
        if (params.get('en')) received.push({ event: params.get('en'), status: response.status() });
      }
    });
    await page.goto(base + '/?private-check=not-for-analytics', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1500);
    assert.deepEqual(googleRequests, [], '未同意前不应加载谷歌统计');
    assert.equal(await page.evaluate(() => window.JOBFACE_ANALYTICS.measurementId), measurementId);
    await page.locator('#analytics-yes').click();
    await page.waitForFunction(() => Array.from(document.scripts).some(s => s.src.includes('G-SN0S9SS55N')));

    await page.getByRole('link', { name: 'Crop my photo →', exact: true }).click();
    await page.locator('#photo-file').setInputFiles(path.join(__dirname, '../assets/avatar-finance.webp'));
    await page.locator('#process-photo').click();
    await page.locator('#photo-download').waitFor({ state: 'visible' });
    let pending = page.waitForEvent('download');
    await page.locator('#photo-download').click();
    let download = await pending;
    const dimensions = await sharp(await download.path()).metadata();
    assert.equal(dimensions.width, 720);
    assert.equal(dimensions.height, 720);
    await page.locator('#close-dialog').click();
    await page.getByRole('link', { name: 'Build my resume →', exact: true }).first().click();
    await page.locator('#resume-name').fill('qa-person');
    await page.locator('#resume-contact').fill('qa-contact@example.invalid');
    await page.locator('#resume-experience').fill('qa-experience');
    pending = page.waitForEvent('download');
    await page.locator('#resume-form button[type=submit]').click();
    download = await pending;
    assert(fs.readFileSync(await download.path(), 'utf8').includes('qa-experience'));
    await page.locator('#close-dialog').click();
    for (let i = 0; i < 15 && !expected.every(event => received.some(item => item.event === event)); i++) await page.waitForTimeout(1000);
    console.log('谷歌收集端响应：', JSON.stringify(received));
    assert.deepEqual(privacyErrors, []);
    assert(expected.every(event => received.some(item => item.event === event && item.status >= 200 && item.status < 300)), '尚未确认全部事件的收集端响应');
    await page.locator('#analytics-settings').click();
    await page.locator('#analytics-no').click();
    const count = received.length;
    await page.getByRole('link', { name: 'Build my resume →', exact: true }).first().click();
    pending = page.waitForEvent('download');
    await page.locator('#resume-form button[type=submit]').click();
    await pending;
    await page.waitForTimeout(3000);
    assert.equal(received.length, count, '撤回同意后不应再发送事件');
    console.log('通过：正式站真实照片和简历下载、同意前无统计、输入与查询参数未进入统计、撤回后停止。仍须核对谷歌实时报告。');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
