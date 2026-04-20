/**
 * 甜蜜困局 Demo · 后端代理
 * - 托管 index.html 静态资源
 * - 代理 DeepSeek Chat Completions（把 API Key 留在服务端，不暴露给前端）
 *
 * 启动：
 *   DEEPSEEK_API_KEY=sk-xxxxx node server.js
 *   （可选）PORT=8765 node server.js
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const https = require('https');
const { SHEN_SYSTEM_PROMPT } = require('./api/_prompt.js');

const ROOT = __dirname;

// ---------- 自动加载 .env（零依赖迷你版） ----------
(function loadDotenv() {
  const envPath = path.join(ROOT, '.env');
  if (!fs.existsSync(envPath)) return;
  const content = fs.readFileSync(envPath, 'utf8');
  content.split('\n').forEach(line => {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/i);
    if (!m) return;
    const key = m[1];
    let val = m[2];
    // 去掉首尾引号
    if (/^".*"$/.test(val) || /^'.*'$/.test(val)) val = val.slice(1, -1);
    if (!(key in process.env)) process.env[key] = val;
  });
})();

const PORT = process.env.PORT || 8765;
const API_KEY = process.env.DEEPSEEK_API_KEY || '';
const MODEL = process.env.DEEPSEEK_MODEL || 'deepseek-chat';

if (!API_KEY) {
  console.warn('⚠️  未设置 DEEPSEEK_API_KEY（可写入 .env 或通过环境变量传入），/api/chat 会 500。');
}

// ---------- 沈知予 · System Prompt 已抽取到 api/_prompt.js ----------

// ---------- 静态资源 MIME ----------
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.json': 'application/json; charset=utf-8',
};

function serveStatic(req, res) {
  let urlPath = decodeURIComponent(req.url.split('?')[0]);
  if (urlPath === '/') urlPath = '/index.html';
  const filePath = path.join(ROOT, urlPath);
  // 防目录穿越
  if (!filePath.startsWith(ROOT)) {
    res.writeHead(403); return res.end('Forbidden');
  }
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404); return res.end('Not Found');
    }
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    res.end(data);
  });
}

// ---------- /api/chat 代理到 DeepSeek ----------
function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', c => chunks.push(c));
    req.on('end', () => {
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}'));
      } catch (e) { reject(e); }
    });
    req.on('error', reject);
  });
}

function callDeepSeek(messages) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify({
      model: MODEL,
      messages,
      temperature: 0.85,
      top_p: 0.9,
      max_tokens: 300,
      frequency_penalty: 0.3,
      presence_penalty: 0.2,
    });

    const req = https.request({
      hostname: 'api.deepseek.com',
      port: 443,
      path: '/chat/completions',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Length': Buffer.byteLength(payload),
      },
      timeout: 30000,
    }, (resp) => {
      const chunks = [];
      resp.on('data', c => chunks.push(c));
      resp.on('end', () => {
        const body = Buffer.concat(chunks).toString('utf8');
        if (resp.statusCode >= 400) {
          return reject(new Error(`DeepSeek ${resp.statusCode}: ${body}`));
        }
        try {
          const json = JSON.parse(body);
          const content = json?.choices?.[0]?.message?.content || '';
          resolve(content.trim());
        } catch (e) { reject(e); }
      });
    });
    req.on('timeout', () => { req.destroy(new Error('DeepSeek timeout')); });
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

async function handleChat(req, res) {
  if (!API_KEY) {
    res.writeHead(500, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ error: '后端未配置 DEEPSEEK_API_KEY' }));
  }
  try {
    const body = await readJsonBody(req);
    const history = Array.isArray(body.messages) ? body.messages : [];
    // 强制带上沈知予人设
    const messages = [
      { role: 'system', content: SHEN_SYSTEM_PROMPT },
      ...history.slice(-20), // 只保留最近 20 条，控制 token
    ];
    const reply = await callDeepSeek(messages);
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ reply }));
  } catch (err) {
    console.error('[chat] error:', err.message);
    res.writeHead(502, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: err.message }));
  }
}

// ---------- Server ----------
const server = http.createServer(async (req, res) => {
  // CORS（同源调用时其实不需要，但留着方便调试）
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  if (req.method === 'OPTIONS') { res.writeHead(204); return res.end(); }

  if (req.method === 'POST' && req.url.startsWith('/api/chat')) {
    return handleChat(req, res);
  }
  // 健康检查端点（给 cron-job.org 保活用，避免 Render Free 休眠）
  if (req.method === 'GET' && req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ ok: true, ts: Date.now() }));
  }
  if (req.method === 'GET') return serveStatic(req, res);
  res.writeHead(405); res.end('Method Not Allowed');
});

server.listen(PORT, () => {
  console.log(`🌙 甜蜜困局 Demo 已启动`);
  console.log(`   本地访问: http://localhost:${PORT}/index.html`);
  console.log(`   聊天接口: POST http://localhost:${PORT}/api/chat`);
  console.log(`   模型:    ${MODEL}`);
  console.log(`   API Key: ${API_KEY ? '已配置 ✅' : '未配置 ❌（/api/chat 会 500）'}`);
});
