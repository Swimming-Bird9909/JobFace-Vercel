(() => {
 'use strict';
 const languages=[["en","英语","English"],["zh-CN","简体中文","简体中文"],["zh-TW","繁體中文","繁體中文"],["ja","日本語","日本語"],["ko","한국어","한국어"],["de","德語","Deutsch"],["fr","法語","Français"],["it","意大利語","Italiano"],["es","西班牙語","Español"],["pt","葡萄牙語","Português"],["id","印尼語","Bahasa Indonesia"],["ar","阿拉伯語","العربية"],["bn","孟加拉","বাংলা"],["ms","馬來語","Bahasa Melayu"],["th","ภาษาไทย","ภาษาไทย"],["he","עברית","עברית"],["ru","俄語","Русский"],["ur","烏爾都語","اردو"],["tr","土耳其語","Türkçe"],["vi","越南語","Tiếng Việt"],["fa","فارسی","فارسی"],["mr","मराठी","मराठी"],["ta","தமிழ்","தமிழ்"],["pl","波蘭語","Polski"],["te","తెలుగు","తెలుగు"],["ne","नेपाली","नेपाली"],["da","丹麥語","Dansk"],["fi","芬蘭","Suomi"],["nl","荷蘭語","Nederlands"],["no","挪威語","Norsk"],["sv","瑞典語","Svenska"]];
 const translated={"zh-CN":{"start":"裁剪照片 →","write":"填写简历 →","eyebrow":"免费工具，无需账号","headline":"照片更清楚，简历更简洁。","intro":"裁剪现有照片，调整求职照尺寸，或填写并下载基础简历。照片和简历文字在当前浏览器内处理。","limits":"不生成新头像、不替换背景、不提供账号保存或付费升级。","choose":"选择你的照片","fileHelp":"支持 JPG、PNG 或 WebP，最大 20 MB。仅居中裁剪，不上传照片。","output":"输出尺寸","preview":"生成预览","check":"下载前检查裁剪结果","downloadPhoto":"下载 JPG 照片","resumeHelp":"提供一种纯文字单栏布局。下载 HTML 文件后在浏览器打开，通过打印另存为 PDF。提交前检查分页。","name":"姓名","role":"目标岗位","contact":"希望分享的联系方式","summary":"个人简介","experience":"工作经历或项目","education":"教育背景","skills":"相关技能","noSave":"信息不会保存到账号，请在关闭页面前下载。","downloadResume":"下载简历（HTML）","photoTitle":"照片裁剪","resumeTitle":"基础简历制作","photoDescription":"处理已有照片，不生成头像或替换背景。","resumeDescription":"简历内容保留在此浏览器中，无需账号。","fileError":"请选择小于 20 MB 的 JPG、PNG 或 WebP。","decodeError":"无法处理此图片，请选择有效且尺寸较小的 JPG、PNG 或 WebP。","upscale":" · 已放大，不能恢复原本缺失的细节。","saved":"已开始下载。用浏览器打开 HTML 文件，需要时通过打印另存为 PDF。"},"zh-TW":{"start":"免費開始製作"},"ja":{"start":"無料で始める","write":"入力を始める"},"ko":{"start":"무료로 시작하기","write":"작성 시작"},"de":{"start":"Kostenlos starten"},"fr":{"start":"Commencer gratuitement"},"es":{"start":"Empezar gratis"},"it":{"start":"Inizia gratis"},"pt":{"start":"Começar grátis"},"id":{"start":"Mulai gratis"},"ar":{"start":"ابدأ مجانًا"},"th":{"start":"เริ่มใช้ฟรี"},"ru":{"start":"Начать бесплатно"}};
 const select=document.getElementById('language');
 const defaults=new Map([...document.querySelectorAll('[data-i18n]')].map(el=>[el,el.innerHTML]));
 select.replaceChildren(...languages.map(([value,,label])=>{const option=document.createElement('option');option.value=value;option.textContent=label;return option;}));
 let chosen='en';
 try {chosen=localStorage.getItem('jobface-language')||localStorage.getItem('zhimian-language')||'en';}catch{}
 function apply(locale) {
   chosen=languages.some(([code])=>code===locale)?locale:'en';
   select.value=chosen;
   const copy=translated[chosen]||{};
   for(const [element,english] of defaults){
     const value=copy[element.dataset.i18n];
     if(value){element.textContent=value;element.lang=chosen;}
     else{element.innerHTML=english;element.lang='en';}
   }
   const note=document.getElementById('language-note');
   note.hidden=chosen==='en';
   note.textContent=chosen==='zh-CN'?'已保留语言切换；指南及未翻译的介绍仍以英文提供。':'Partial translation: guides and untranslated interface text remain in English.';
   try {localStorage.setItem('jobface-language',chosen);}catch{}
 }
 window.jobfaceText=key=>translated[chosen]?.[key]||'';
 select.addEventListener('change',()=>apply(select.value));
 apply(chosen);
})();
