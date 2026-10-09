// 通过已有的 Vercel 自动验收凭据访问预览，不关闭部署保护。
// 凭据只从本地已授权文件读取，并且仅发送至指定预览主机。
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
let cachedBypass;
module.exports = async function setup(context, base) {
  if (process.env.JOBFACE_PREVIEW_AUTH !== '1') return;
  const target = new URL(base);
  if (!target.hostname.startsWith('jobface-') || !target.hostname.endsWith('-qiuliang087-5768s-projects.vercel.app')) throw new Error('预览测试目标不匹配');
  const project = JSON.parse(fs.readFileSync(path.join(__dirname, '../.vercel/project.json')));
  const authFile = process.env.JOBFACE_VERCEL_AUTH || path.join(os.homedir(), 'Library/Application Support/com.vercel.cli/auth.json');
  const auth = JSON.parse(fs.readFileSync(authFile));
  if (!cachedBypass) {
    const proxy = process.env.JOBFACE_TEST_PROXY ? ['--proxy', process.env.JOBFACE_TEST_PROXY] : [];
    const raw = execFileSync('curl', ['-sS', ...proxy, '--retry', '1', '--max-time', '25', '--config', '-', `https://api.vercel.com/v9/projects/${project.projectId}?teamId=${project.orgId}`], { input: `header = "Authorization: Bearer ${auth.token}"\n`, maxBuffer: 4 * 1024 * 1024 });
    const projectData = JSON.parse(raw);
    cachedBypass = Object.keys(projectData.protectionBypass || {}).find(key => projectData.protectionBypass[key].scope === 'automation-bypass');
  }
  const bypass = cachedBypass;
  if (!bypass) throw new Error('缺少已授权预览测试凭据');
  // 平台注入的反馈工具栏不属于产品功能，避免其远程资源阻塞页面验收。
  await context.route('https://vercel.live/**', route => route.abort());
  await context.route(base + '/**', async route => {
    await route.continue({ headers: { ...route.request().headers(), 'x-vercel-protection-bypass': bypass } });
  });
};
