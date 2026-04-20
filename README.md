# 甜蜜困局 · 沈知予亲密度对话 Demo

> 国产乙游女主 AI 陪伴 demo｜DeepSeek + Node + 原生 JS｜QQ AIO 聊天风格

## 在线体验

🌸 **Demo 链接**：部署到 Vercel 后会生成，形如 `https://sweet-dilemma-demo.vercel.app`

## 功能亮点

- 💬 **真 LLM 对话**：接入 DeepSeek，用户可自由输入和沈知予对话
- 🎭 **Lv.4 人设注入**：「入心·克制」亲密度阶段的完整 system prompt
- 🎁 **送礼物**：9 种礼物，沈知予按人设接收（绝不客套拒绝）
- 🔴 **她的直播**：深夜工作室场景，含付费点歌/连麦锚点
- 📞 **打电话**：语音通话场景，价格锚点设计
- 💭 **场景 chips**：约会剧情 / AI 定制歌 / 晚安电台 / 限定写真集（Coming Soon）

## 本地运行

```bash
# 1. 在根目录创建 .env 文件
echo "DEEPSEEK_API_KEY=sk-你的key" > .env

# 2. 启动（零依赖，无需 npm install）
node server.js

# 3. 浏览器访问
open http://localhost:8765
```

## Vercel 部署

1. Fork / Clone 本仓库
2. 登录 [vercel.com](https://vercel.com) → New Project → Import 本仓库
3. 在 **Environment Variables** 中添加：
   - `DEEPSEEK_API_KEY` = 你的 DeepSeek API Key
4. Deploy，生成的 URL 即可公网访问

## 文件结构

```
sweet-dilemma-demo/
├── index.html          # 前端（QQ AIO 风格，原生 HTML/CSS/JS，无框架）
├── server.js           # 本地开发用 Node HTTP 服务器
├── api/
│   ├── chat.js         # Vercel Serverless Function（线上 /api/chat）
│   └── _prompt.js      # 沈知予 Lv.4 system prompt（本地 + 线上共用）
├── vercel.json         # Vercel 配置
├── package.json        # Node 项目元信息
├── .env                # （不提交）DeepSeek API Key
└── .gitignore          # 忽略 .env / *.log / node_modules
```

## 技术选型

- **模型**：DeepSeek `deepseek-chat`（OpenAI 兼容协议）
- **参数**：`temperature=0.85, top_p=0.9, max_tokens=300, frequency_penalty=0.3, presence_penalty=0.2`
- **前端**：原生 HTML / CSS / JS，无框架无构建，QQ AIO 视觉语言
- **后端**：Node 原生 `http/https`，零依赖
- **部署**：Vercel Serverless + 静态托管

## 设计文档

- [甜蜜困局三女主人设分析.md](../甜蜜困局三女主人设分析.md)
- [甜蜜困局_亲密度体系.md](../甜蜜困局_亲密度体系.md)

## 商业化路线图

1. ✅ 送礼物（9 件分档 ¥6 - ¥199）
2. ✅ 她的直播（付费点歌 ¥18/首、连麦 ¥99/3min）
3. ✅ 打电话（¥6/min，月卡 ¥68）
4. 🔜 约会剧情（单本 ¥18，章节副本）
5. 🔜 AI 定制歌（¥68 起，音乐人角色最强差异化）
6. 🔜 晚安电台（订阅 ¥28/月，日活黏性）
7. 🔜 限定写真集（¥48，动态壁纸+语音+手写信）

---

_Made with ⚡ by Olivia_
