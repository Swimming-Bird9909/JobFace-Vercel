// 将真实的免费定位自然加入每个子页面，并同步页面元信息与结构化数据。
const fs = require('node:fs');

const pages = {
  'resume-photo/index.html': {
    old: 'Free Resume Photo Cropper: Square JPG Online',
    title: 'Free Resume Photo Cropper: Square JPG Online',
    oldDesc: 'Crop a resume or CV photo to a square 720 × 720 JPG online. Free, no sign-up or watermark. Your existing photo stays in your browser; no background removal.',
    desc: 'Use a free resume photo cropper to make a square 720 × 720 JPG online. No sign-up or watermark; your existing photo stays in your browser and is not uploaded for processing.'
  },
  'professional-headshot/index.html': {
    old: 'Free Headshot Resizer: Crop a 4:5 Portrait Online',
    title: 'Free Headshot Resizer: Crop a 4:5 Portrait Online',
    oldDesc: 'Resize an existing headshot to a 1080 × 1350 JPG with a centered 4:5 crop. Free online portrait tool, no account or upload to a photo service. No AI generation.',
    desc: 'Free online headshot resizer for an existing portrait: create a centered 4:5 1080 × 1350 JPG in your browser. No account, photo-service upload or AI generation.'
  },
  'resume-builder/index.html': {
    old: 'Free Resume Builder Without Sign-Up: HTML Download',
    title: 'Free Resume Builder Without Sign-Up: HTML Download',
    oldDesc: 'Build a simple single-column resume without signing up. Download HTML free, then use your browser to save as PDF. No direct PDF or DOCX export, no ATS score.',
    desc: 'Build a free simple single-column resume without signing up. Download HTML, then use your browser to save as PDF; no direct DOCX export or ATS score.'
  },
  'resume-templates/index.html': {
    old: 'Simple Resume Layout Examples &amp; HTML Template',
    title: 'Free Resume Layout Examples &amp; HTML Template',
    oldDesc: 'Compare four resume layout examples with the one single-column HTML template JobFace can download. See a sample, included sections and browser PDF print steps.',
    desc: 'Compare free resume layout examples with JobFace’s actual single-column HTML download. See what the free template includes and what it does not.'
  },
  'blog/index.html': {
    old: 'Resume Writing &amp; Photo Guides: Examples and Checklists',
    title: 'Free Resume Writing &amp; Photo Guides: Examples and Checklists',
    oldJsonName: 'Resume Writing & Photo Guides: Examples and Checklists',
    newJsonName: 'Free Resume Writing & Photo Guides: Examples and Checklists',
    oldDesc: 'Find resume summary examples, layout tips, an ATS keyword checklist and guidance on resume photos. Five practical guides linked to free JobFace tools.',
    desc: 'Browse free resume writing and photo guides with summary examples, layout tips, an ATS keyword checklist and links to JobFace’s free tools.'
  },
  'blog/how-to-choose-a-resume-photo/index.html': {
    old: 'Should You Put a Photo on Your Resume? Checklist',
    title: 'Free Guide: Should You Put a Photo on Your Resume?',
    oldDesc: 'Should your resume include a photo? Check US-specific guidance, employer instructions and a worked example, then review photo size, crop and JPG upload limits.',
    desc: 'Free guide to deciding whether a resume needs a photo. Check US-specific guidance, employer instructions, crop examples and JPG upload limits.'
  },
  'blog/professional-headshot-vs-resume-photo/index.html': {
    old: 'Headshot vs Resume Photo: Differences &amp; Crop Examples',
    title: 'Free Guide: Headshot vs Resume Photo Differences',
    oldDesc: 'Compare a professional headshot with a resume photo. See square and 4:5 crop examples, when the uses differ, and which JPG output JobFace can create.',
    desc: 'Free guide comparing a professional headshot with a resume photo. See square and 4:5 crop examples and choose the right JPG output.'
  },
  'blog/resume-layout-guide/index.html': {
    old: 'Simple Resume Format: Single-Column Layout Example',
    title: 'Free Resume Format Guide: Single-Column Layout Example',
    oldDesc: 'Use a single-column resume format with a sample section order, spacing checklist and HTML-to-PDF steps. Review the final file without claiming ATS certification.',
    desc: 'Free resume format guide with a single-column example, section order, spacing checklist and HTML-to-PDF review steps.'
  },
  'blog/how-to-write-a-resume-summary/index.html': {
    old: 'Resume Summary Examples: Entry-Level &amp; Support Roles',
    title: 'Free Resume Summary Examples: Entry-Level &amp; Support Roles',
    oldDesc: 'Learn how to write a resume summary with entry-level and customer support examples. Use real experience, a simple framework and a practical editing checklist.',
    desc: 'Free resume summary examples for entry-level and customer support roles. Use real experience, a simple framework and an editing checklist.'
  },
  'blog/ats-resume-keywords/index.html': {
    old: 'ATS Resume Keywords: Job Description Matching Examples',
    title: 'Free ATS Resume Keywords Guide: Job Description Examples',
    oldDesc: 'Find resume keywords in a job description and match them to real experience. Includes an evidence table, placement tips and a checklist; no guaranteed ATS score.',
    desc: 'Free ATS resume keywords guide: find terms in a job description, match them to real experience and avoid unsupported claims or keyword stuffing.'
  },
  'about/index.html': {
    old: 'About JobFace: Free Photo &amp; Resume Tools',
    title: 'About JobFace: Free Photo &amp; Resume Tools',
    oldDesc: 'Learn what JobFace can do: crop existing photos and create a basic HTML resume in your browser. No account, AI headshot generation or cloud saving.',
    desc: 'Learn about JobFace’s free photo cropping and basic resume tools. See the browser-based workflow, real limits and features that are not available.'
  },
  'privacy/index.html': {
    old: 'JobFace Privacy: Photo Processing &amp; Resume Data',
    title: 'Privacy for JobFace Free Photo &amp; Resume Tools',
    oldDesc: 'See how JobFace handles photos and resume text in your browser, what hosting requests disclose, and how to allow or decline optional Google Analytics.',
    desc: 'Privacy information for JobFace’s free photo and resume tools: browser processing, hosting requests and optional Google Analytics choices.'
  }
};

for (const [file, page] of Object.entries(pages)) {
  let html = fs.readFileSync(file, 'utf8');
  html = html.replaceAll('Free Free ', 'Free ');
  let changedJsonLd = false;
  const titleMatch = html.match(/<title>([\s\S]*?) \| JobFace<\/title>/);
  const ldMatch = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
  if (titleMatch && ldMatch) {
    const visibleTitle = titleMatch[1].replaceAll('&amp;', '&');
    const headingMatch = html.match(/<h1>([\s\S]*?)<\/h1>/);
    const visibleHeading = headingMatch ? headingMatch[1].replaceAll('&amp;', '&') : null;
    const ld = JSON.parse(ldMatch[1]);
    for (const item of ld['@graph'] || []) {
      if (item['@type'] === 'WebPage') item.name = visibleTitle;
      if (item['@type'] === 'Article' && visibleHeading) item.headline = visibleHeading;
      if (item['@type'] === 'BreadcrumbList') {
        const current = item.itemListElement?.find((entry) => entry.position === 2);
        if (current) current.name = visibleTitle;
      }
    }
    const updatedLd = JSON.stringify(ld);
    if (updatedLd !== ldMatch[1]) {
      html = html.replace(ldMatch[0], `<script type="application/ld+json">${updatedLd}</script>`);
      changedJsonLd = true;
    }
  }
  const titleOld = html.includes(`<title>${page.old} | JobFace</title>`);
  const jsonOld = page.oldJsonName && html.includes(`"name":"${page.oldJsonName}"`);
  const hasOld = titleOld || jsonOld;
  const hasNew = html.includes(`<title>${page.title} | JobFace</title>`)
    && html.includes(`name="description" content="${page.desc}"`)
    && (!page.oldJsonName || html.includes(`"name":"${page.newJsonName}"`))
    && (!page.oldJsonName || html.includes(`"name":"${page.oldJsonName}"`) || html.includes(`"name":"${page.newJsonName}"`));
  if (!hasOld && !hasNew) throw new Error(`找不到预期文案：${file}`);
  if (hasOld || page.oldJsonName || changedJsonLd) {
    if (titleOld) html = html.replaceAll(page.old, page.title).replaceAll(page.oldDesc, page.desc);
    if (page.oldJsonName) html = html.replaceAll(page.oldJsonName, page.newJsonName);
    html = html.replaceAll('Free Free ', 'Free ');
    fs.writeFileSync(file, html);
  }
}
console.log(`已同步 ${Object.keys(pages).length} 个子页面的 Free 定位词。`);
