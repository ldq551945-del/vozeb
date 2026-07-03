<p align="center">
  <img src="web/public/logo.svg" width="96" alt="Vozeb logo">
</p>

<h1 align="center">Vozeb</h1>

<p align="center">
  <a href="https://github.com/csyqlz/vozeb"><img src="https://img.shields.io/github/stars/csyqlz/vozeb?style=flat-square&logo=github" alt="GitHub stars"></a>
  <a href="VERSION"><img src="https://img.shields.io/badge/version-v0.5.0-2563eb?style=flat-square" alt="Version"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-AGPL--3.0-f97316?style=flat-square" alt="License"></a>
  <a href="https://vercel.com/"><img src="https://img.shields.io/badge/Vercel-ready-000000?style=flat-square&logo=vercel" alt="Vercel ready"></a>
  <a href="https://nextjs.org/"><img src="https://img.shields.io/badge/Next.js-16.2-000000?style=flat-square&logo=nextdotjs" alt="Next.js"></a>
</p>

Vozeb 是一款面向 AI 图片创作和素材管理的开源工作台。它把无限画布、AI 生成、提示词库、素材沉淀、用户权限和本地 Agent 能力放到同一个工作流里，适合个人创作者或小团队持续迭代视觉方案。

> [!CAUTION]
> 项目仍处于快速开发阶段，不保证历史数据兼容。当前更适合个人或本地部署，不建议直接公网多人共用。

## 最新功能

- 无限画布：支持多画布项目、节点拖拽缩放、连线、小地图、撤销重做、导入导出。
- AI 创作：支持文生图、图生图、参考图编辑、文本问答、音频生成和视频生成；Seedance 2.0 可通过火山方舟 Agent Plan 接入。
- 画布助手：围绕选中节点和上游节点对话、生图，并把结果插回画布。
- 用户系统：支持注册开关、管理员后台、用户角色、账号状态、每日额度和签到奖励。
- 通用接口：管理员可配置 OpenAI 兼容接口、系统模型渠道、默认模型，并允许或禁止用户自配接口。
- 提示词库：支持公共提示词管理、我的提示词、提示词标签和封面展示。
- 素材管理：支持本地素材沉淀、图片/文本/视频素材复用、导入导出和 WebDAV 同步。
- 本地 Agent：通过本机 Canvas Agent 连接 Codex / Claude Code，让 Agent 通过 MCP 操作当前画布。
- Codex App 插件：提供 Codex app 插件，安装后可自动注册 MCP 并尝试拉起本地 Agent。
- 管理体验：后台管理页已改为侧边栏切换，顶部通知和签到反馈做了位置与视觉优化。

完整功能说明见 [功能介绍](docs/content/docs/overview/features.mdx)。

## 技术栈

- 前端：Next.js、React、TypeScript、Tailwind CSS、Ant Design、Zustand、TanStack Query。
- 存储：浏览器本地存储为主，支持导入导出与可选 WebDAV 同步。
- Agent：Canvas Agent、MCP、Codex / Claude Code 本地集成。
- 部署：Vercel 或 Docker。

## 快速开始

```bash
git clone git@github.com:csyqlz/vozeb.git
cd vozeb/web
pnpm install
pnpm run dev
```

运行后默认端口为 `3000`，可访问 `http://localhost:3000`。

Docker 运行：

```bash
docker build -t vozeb .
docker run --rm -p 3000:3000 vozeb
```

首次打开后进入右上角配置，填入自己的 OpenAI 兼容 `Base URL` 和 `API Key`。

## 文档

- [快速开始](docs/content/docs/overview/quick-start.mdx)
- [功能介绍](docs/content/docs/overview/features.mdx)
- [Docker 部署](docs/content/docs/overview/docker.mdx)
- [画布节点操作手册](docs/content/docs/canvas/canvas-node-manual.mdx)
- [画布快捷键](docs/content/docs/canvas/canvas-shortcuts.mdx)
- [本地 Canvas Agent](canvas-agent/README.md)
- [Codex app 插件](plugins/infinite-canvas)

## 致谢

Vozeb 基于原开源项目 [basketikun/infinite-canvas](https://github.com/basketikun/infinite-canvas) 继续开发。感谢原创作者 basketikun 对无限画布、AI 创作工作流、Canvas Agent 和 Codex 插件能力的开源贡献。

也感谢相关开源社区、提示词仓库和工具链项目提供的灵感与基础设施。

## 开源协议

本项目继续遵循 GNU Affero General Public License v3.0，见 [LICENSE](LICENSE)。二次开发、分发或部署时请遵守 AGPL-3.0 协议，并保留原作者与本项目的开源信息。
