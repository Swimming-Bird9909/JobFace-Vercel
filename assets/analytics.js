(() => {
  'use strict';
  const id = window.JOBFACE_ANALYTICS?.measurementId || '';
  const events = new Set(['tool_start', 'photo_download', 'resume_download']);
  let enabled = false;
  // 白名单阻止姓名、联系方式、文件名或表单内容进入统计参数。
  window.jobfaceTrack = (event, values = {}) => {
    if (!enabled || !events.has(event)) return;
    const clean = {};
    if (['photo', 'resume'].includes(values.tool)) clean.tool = values.tool;
    if (['avatar', 'job'].includes(values.mode)) clean.mode = values.mode;
    window.gtag('event', event, clean);
  };
  if (!/^G-[A-Z0-9]+$/.test(id)) return;
  const choice = document.createElement('section');
  choice.className = 'cookie-choice';
  choice.setAttribute('aria-label', 'Optional analytics');
  choice.innerHTML = '<p>Allow optional Google Analytics to measure page visits and tool downloads? We do not send your photos or resume details. <a href="/privacy/">Privacy</a></p><button class="secondary" id="analytics-no">No thanks</button> <button class="primary" id="analytics-yes">Allow analytics</button>';
  document.body.append(choice);
  function enable() {
    if (enabled) return;
    enabled = true;
    window['ga-disable-' + id] = false;
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { window.dataLayer.push(arguments); };
    window.gtag('js', new Date());
    // 不向统计服务传递查询参数或哈希片段。
    let referrer = '';
    try { referrer = document.referrer ? new URL(document.referrer).origin : ''; } catch {}
    window.gtag('config', id, { send_page_view: false, allow_google_signals: false, allow_ad_personalization_signals: false, page_location: location.origin + location.pathname, page_referrer: referrer });
    window.gtag('event', 'page_view', { page_location: location.origin + location.pathname, page_referrer: referrer, page_title: document.title });
    const script = document.createElement('script');
    script.async = true;
    script.src = 'https://www.googletagmanager.com/gtag/js?id=' + id;
    document.head.append(script);
  }
  function remember(value) {
    try { localStorage.setItem('jobface-analytics-consent', value); } catch {}
    choice.hidden = true;
  }
  document.querySelector('#analytics-yes').onclick = () => { remember('yes'); enable(); };
  document.querySelector('#analytics-no').onclick = () => { remember('no'); enabled = false; window['ga-disable-' + id] = true; };
  const settings = document.querySelector('#analytics-settings');
  if (settings) { settings.hidden = false; settings.onclick = () => { choice.hidden = false; }; }
  try {
    const saved = localStorage.getItem('jobface-analytics-consent');
    if (saved === 'yes') { choice.hidden = true; enable(); }
    else if (saved === 'no') choice.hidden = true;
  } catch {}
})();
