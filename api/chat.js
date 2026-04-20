/**
 * Vercel Serverless Function · /api/chat
 * - 接收前端 { messages: [...] }
 * - 在服务端拼接沈知予 system prompt + 最近 20 条历史
 * - 转发到 DeepSeek，返回 { reply }
 *
 * 部署前需要在 Vercel 项目环境变量中设置：DEEPSEEK_API_KEY
 */

const https = require('https');
const { SHEN_SYSTEM_PROMPT } = require('./_prompt.js');

const MODEL = process.env.DEEPSEEK_MODEL || 'deepseek-chat';

function callDeepSeek(messages, apiKey) {
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
        'Authorization': `Bearer ${apiKey}`,
        'Content-Length': Buffer.byteLength(payload),
      },
      timeout: 28000, // Vercel Hobby 默认 30s，留 2s 余量
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

module.exports = async (req, res) => {
  // CORS（Vercel 同域其实不需要，但便于调试）
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method Not Allowed' });
    return;
  }

  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: '后端未配置 DEEPSEEK_API_KEY（请到 Vercel 项目设置 → Environment Variables 添加）' });
    return;
  }

  try {
    // Vercel 会自动 parse JSON body 到 req.body
    const body = req.body || {};
    const history = Array.isArray(body.messages) ? body.messages : [];
    const messages = [
      { role: 'system', content: SHEN_SYSTEM_PROMPT },
      ...history.slice(-20),
    ];
    const reply = await callDeepSeek(messages, apiKey);
    res.status(200).json({ reply });
  } catch (err) {
    console.error('[chat] error:', err.message);
    res.status(502).json({ error: err.message });
  }
};
