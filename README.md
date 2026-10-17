# PathMate / MemoPath

面向长者及认知障碍人群的出行辅助项目。本仓库包含两个独立运行的项目：

| 目录 | 内容 | 开发入口 |
| --- | --- | --- |
| [existing_app/](existing_app/) | 主应用，React + Vite 前端、NestJS 后端，独立 PostgreSQL 数据库 | 无须原平台环境；按 [主应用运行说明](existing_app/README.md) 配置 Node.js、Docker Desktop 和本机数据库 |
| [watch_prototype/](watch_prototype/) | Python 手表模拟原型，含演示后端、长者端和家属端 | 依照 [原型运行说明](watch_prototype/README.md) 安装和启动 |

## 目录结构

```text
existing_app/       # 主应用代码及其构建配置
watch_prototype/    # 手表相关的独立演示项目及其 README
docs/              # 项目文档
specs/             # 需求与实现规划
```

## 主应用当前状态

spec002 已完成平台依赖移除及 converge 后的补充实施，T001–T076 全部完成。
在 Windows 本机运行，使用 Node.js 24 和 Docker Desktop 中的 PostgreSQL；真实配置保存在不提交的 `.env.local`。
安装、数据库初始化、构建和启动步骤见 [主应用运行说明](existing_app/README.md) 和 [快速开始](specs/002-remove-platform-dependency/quickstart.md)。

截至 2026-10-09，验收记录包含 9 套件 22 项集成测试及 lint 通过，完整证据见 [spec002 验证记录](specs/002-remove-platform-dependency/verification.md)。
历史高德 Key 处置按用户决定暂缓，部分浏览器定位存在环境限制，因此不声明完整规格全部达标。
短信验证码、叫车、求助、告警和通知等仍有演示边界；独立运行不代表全部 PRD 功能已经实现。

## 在线演示

[直接打开 PathMate 互动演示](https://yinbangguo0806-source.github.io/sdggez-pathmate/)，
无需安装、注册或 GitHub 账号。选择长者端或家属端，再点击「开始体验」。
这是独立的公开前端演示构建，使用内置样例，修改刷新后恢复；不连接真实账号或数据库。
地图/实时路线未配置，求助、叫车、天气和通知仍是演示。
构建与验证边界见 [公开演示说明](docs/public-demo.md)。

## 先打开可视化演示（不需要数据库）

使用 Node.js 24，在仓库根目录打开终端：

```sh
cd existing_app
npm ci
npm run dev:client
```

浏览器打开 <http://127.0.0.1:5173/memopath>，先选择「长者端」或「家属端」，
再点击 **「演示登入」**。不用输入账号密码；页面会持续提示演示资料不保存，
修改只在当前页面会话保留，刷新恢复默认数据。Windows PowerShell 如有脚本策略问题，
可将上述 `npm` 改用 `npm.cmd`。

终端需保持运行，按 Ctrl+C 停止。此入口只启动前端：普通注册、账号登录与数据库保存
需要另行按主应用 README 配置并启动后端；输入 `demo / demo1234` 也需要后端认证，
不能代替「演示登入」。地图与真实路线另需配置 `VITE_AMAP_KEY`，未配置时会明确报错。
求助、叫车、天气等标为演示的界面不代表已接入真实服务。

## 协作约定

开发流程见 [Spec Kit 与 Git 工作流](docs/git-workflow.md)，agent 规则见 [AGENTS.md](AGENTS.md)。

- 主应用的改动放在 `existing_app/`；手表演示的改动放在 `watch_prototype/`。
- 两个项目分别管理依赖、启动和构建，主应用原型不依赖手表运行。
- `watch_prototype/` 是 Python 模拟演示，不是可安装到 Wear OS 的原生应用。
- 演示后端与主应用后端目前独立；如需共享数据，应先约定接口并完成对接。
- 功能开发或目录整理通过独立分支和合并请求提交。
