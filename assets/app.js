(() => {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const dialog = $('tool-dialog');
  const tr = (key, fallback) => window.jobfaceText?.(key) || fallback;
  let output = '', generation = 0;
  function resetPhoto() {
    generation++;
    if (output) URL.revokeObjectURL(output);
    output = '';
    $('photo-result').hidden = true;
    $('photo-preview').removeAttribute('src');
    $('photo-download').removeAttribute('href');
    $('photo-error').textContent = '';
    $('process-photo').disabled = false;
  }
  function openTool(tool, mode = 'avatar') {
    const photo = tool === 'photo';
    resetPhoto();
    $('photo-form').reset();
    $('photo-mode').value = mode === 'job' ? 'job' : 'avatar';
    $('photo-form').hidden = !photo;
    $('resume-form').hidden = photo;
    $('dialog-title').textContent = photo ? tr('photoTitle', 'Photo cropper') : tr('resumeTitle', 'Basic resume builder');
    $('dialog-description').textContent = photo ? tr('photoDescription', 'Crop your own photo. No face generation or background replacement.') : tr('resumeDescription', 'Your text stays in this browser. No account is needed.');
    $('resume-status').textContent = '';
    if (!dialog.open) dialog.showModal();
    window.jobfaceTrack('tool_start', { tool: photo ? 'photo' : 'resume', ...(photo ? { mode: $('photo-mode').value } : {}) });
  }
  document.querySelectorAll('[data-launch]').forEach(link => link.addEventListener('click', event => {
    if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    const q = new URL(link.href).searchParams;
    openTool(q.get('tool'), q.get('mode'));
  }));
  $('close-dialog').onclick = () => dialog.close();
  dialog.addEventListener('close', resetPhoto);
  dialog.addEventListener('click', e => { if (e.target === dialog && (e.clientX < dialog.getBoundingClientRect().left || e.clientX > dialog.getBoundingClientRect().right || e.clientY < dialog.getBoundingClientRect().top || e.clientY > dialog.getBoundingClientRect().bottom)) dialog.close(); });
  $('photo-file').addEventListener('change', resetPhoto);
  $('photo-mode').addEventListener('change', resetPhoto);
  $('photo-form').addEventListener('submit', async event => {
    event.preventDefault();
    resetPhoto();
    const current = generation;
    const file = $('photo-file').files[0];
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 20 * 1024 * 1024) {
      $('photo-error').textContent = tr('fileError', 'Choose a JPG, PNG or WebP smaller than 20 MB.'); return;
    }
    $('process-photo').disabled = true;
    const source = URL.createObjectURL(file);
    try {
      const img = new Image();
      img.src = source;
      await img.decode();
      if (current !== generation) return;
      if (!img.naturalWidth || img.naturalWidth * img.naturalHeight > 60000000) throw new Error('image');
      const portrait = $('photo-mode').value === 'job';
      const width = portrait ? 1080 : 720, height = portrait ? 1350 : 720;
      const canvas = document.createElement('canvas');
      canvas.width = width; canvas.height = height;
      const context = canvas.getContext('2d');
      const scale = Math.max(width / img.naturalWidth, height / img.naturalHeight);
      context.fillStyle = '#ffffff'; context.fillRect(0, 0, width, height);
      context.drawImage(img, (width - img.naturalWidth * scale) / 2, (height - img.naturalHeight * scale) / 2, img.naturalWidth * scale, img.naturalHeight * scale);
      const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', .9));
      if (current !== generation) return;
      if (!blob) throw new Error('export');
      output = URL.createObjectURL(blob);
      $('photo-preview').src = output;
      $('photo-preview').width = width; $('photo-preview').height = height;
      $('photo-download').href = output;
      $('photo-dimensions').textContent = `${width} × ${height} JPG · ${Math.ceil(blob.size / 1024)} KB` + (scale > 1 ? tr('upscale', ' · Enlarged: detail cannot be restored.') : '');
      $('photo-result').hidden = false;
    } catch {
      if (current === generation) $('photo-error').textContent = tr('decodeError', 'This image could not be processed. Try a smaller, valid JPG, PNG or WebP.');
    } finally {
      URL.revokeObjectURL(source);
      if (current === generation) $('process-photo').disabled = false;
    }
  });
  $('photo-download').addEventListener('click', e => {
    if (!output) { e.preventDefault(); return; }
    window.jobfaceTrack('photo_download', { tool: 'photo', mode: $('photo-mode').value });
  });
  const escape = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  $('resume-form').addEventListener('submit', event => {
    event.preventDefault();
    const data = new FormData(event.target);
    const value = key => escape(data.get(key)?.trim() || '');
    const sections = [['summary', 'Summary'], ['experience', 'Experience & projects'], ['education', 'Education'], ['skills', 'Skills']].filter(([key]) => data.get(key)?.trim()).map(([key, title]) => `<section><h2>${title}</h2><p>${value(key)}</p></section>`).join('');
    const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${value('name')} — Resume</title><style>body{font:16px/1.5 Arial,sans-serif;color:#17191c;max-width:760px;margin:40px auto;padding:0 24px}h1{margin-bottom:4px;font-size:30px}h2{font-size:18px;border-bottom:1px solid #bbb;padding-bottom:5px}p{white-space:pre-line;overflow-wrap:anywhere}h1,h2{break-after:avoid}@page{margin:18mm}@media print{body{margin:0;padding:0;font-size:11pt}.print-help{display:none}}</style></head><body><aside class="print-help">To create a PDF, choose Print → Save as PDF in your browser. Review page breaks and turn off browser headers and footers before saving.</aside><h1>${value('name')}</h1>${value('role') ? `<p>${value('role')}</p>` : ''}${value('contact') ? `<p>${value('contact')}</p>` : ''}${sections}</body></html>`;
    const url = URL.createObjectURL(new Blob([html], { type: 'text/html;charset=utf-8' }));
    const link = document.createElement('a'); link.href = url; link.download = 'jobface-resume.html';
    document.body.append(link); link.click(); link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 30000);
    window.jobfaceTrack('resume_download', { tool: 'resume' });
    $('resume-status').textContent = tr('saved', 'Download started. Open the HTML file in your browser; use Print → Save as PDF if needed.');
  });
  const q = new URLSearchParams(location.search);
  if (['photo', 'resume'].includes(q.get('tool'))) openTool(q.get('tool'), q.get('mode'));
})();
