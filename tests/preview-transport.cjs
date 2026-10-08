// 当前网络无法直连长预览域名时，经同一站点的 Vercel 边缘连接读取真实预览响应。
// 主机路由仍指向预览部署；访问令牌只从本地已授权凭据读取，不写文件或日志。
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
module.exports = async function setup(context, base) {
  const transport = process.env.JOBFACE_PREVIEW_TRANSPORT;
  if (!transport) return;
  const target = new URL(base);
  if (!target.hostname.endsWith('.vercel.app') || transport !== 'https://jobface.wezzik.com') throw new Error('预览测试目标不匹配');
  const project = JSON.parse(fs.readFileSync(path.join(__dirname, '../.vercel/project.json')));
  const authFile = process.env.JOBFACE_VERCEL_AUTH || path.join(os.homedir(), 'Library/Application Support/com.vercel.cli/auth.json');
  const auth = JSON.parse(fs.readFileSync(authFile));
  const raw = execFileSync('curl', ['-sS', '--retry', '2', '--max-time', '25', '--config', '-', `https://api.vercel.com/v9/projects/${project.projectId}?teamId=${project.orgId}`], { input: `header = "Authorization: Bearer ${auth.token}"\n`, maxBuffer: 4 * 1024 * 1024 });
  const projectData = JSON.parse(raw);
  const bypass = Object.keys(projectData.protectionBypass || {})[0];
  if (!bypass) throw new Error('缺少已授权预览测试凭据');
  await context.route(base + '/**', async route => {
    const url = new URL(route.request().url());
    const rawResponse = execFileSync('curl', ['-sS', '--include', '--retry', '2', '--max-time', '25', '--config', '-', transport + url.pathname + url.search], { input: `header = "Host: ${target.hostname}"\nheader = "x-vercel-protection-bypass: ${bypass}"\n`, maxBuffer: 20 * 1024 * 1024 });
    const split = rawResponse.indexOf('\r\n\r\n');
    const headersText = rawResponse.subarray(0, split).toString();
    const status = Number(headersText.match(/^HTTP\/\S+\s+(\d+)/)?.[1]);
    if (!status || split < 0) throw new Error('预览响应无法解析');
    const headers = {};
    for (const line of headersText.split('\r\n').slice(1)) {
      const colon = line.indexOf(':');
      const key = line.slice(0, colon).toLowerCase();
      if (['content-type', 'location', 'x-robots-tag'].includes(key)) headers[key] = line.slice(colon + 1).trim();
    }
    await route.fulfill({ status, headers, body: rawResponse.subarray(split + 4) });
  });
};
