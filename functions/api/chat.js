/**
 * Cloudflare Pages Function · /api/chat
 * - 文件路径 functions/api/chat.js 自动对应路由 /api/chat
 * - 使用 Web Fetch API（不是 Node https 模块）
 * - 环境变量 DEEPSEEK_API_KEY 在 Cloudflare Pages 项目 Settings → Environment variables 设置
 */

import { SHEN_SYSTEM_PROMPT } from './_prompt.js';

const MODEL_DEFAULT = 'deepseek-chat';

async function callDeepSeek(messages, apiKey, model) {
  const resp = await fetch('https://api.deepseek.com/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: model || MODEL_DEFAULT,
      messages,
      temperature: 0.85,
      top_p: 0.9,
      max_tokens: 300,
      frequency_penalty: 0.3,
      presence_penalty: 0.2,
    }),
  });

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`DeepSeek ${resp.status}: ${text}`);
  }
  const json = await resp.json();
  const content = json?.choices?.[0]?.message?.content || '';
  return content.trim();
}

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// 处理预检
export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

// 处理 POST
export async function onRequestPost(context) {
  const { request, env } = context;
  const apiKey = env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: '后端未配置 DEEPSEEK_API_KEY（请到 Cloudflare Pages → Settings → Environment variables 添加）' }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } }
    );
  }

  try {
    const body = await request.json().catch(() => ({}));
    const history = Array.isArray(body.messages) ? body.messages : [];
    const messages = [
      { role: 'system', content: SHEN_SYSTEM_PROMPT },
      ...history.slice(-20),
    ];
    const reply = await callDeepSeek(messages, apiKey, env.DEEPSEEK_MODEL);
    return new Response(JSON.stringify({ reply }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
    });
  } catch (err) {
    console.error('[chat] error:', err.message);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 502,
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
    });
  }
}

// 其他方法
export async function onRequest(context) {
  return new Response(JSON.stringify({ error: 'Method Not Allowed' }), {
    status: 405,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
  });
}
