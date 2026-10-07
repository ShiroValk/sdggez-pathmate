# PathMate / MemoPath

面向长者及认知障碍人群的出行辅助项目。本仓库包含两个独立运行的项目：

| 目录 | 内容 | 开发入口 |
| --- | --- | --- |
| [existing_app/](existing_app/) | 主应用，React + Vite 前端、NestJS 后端 | 在此目录使用项目的 npm 配置；安装和运行需要原有平台环境 |
| [watch_prototype/](watch_prototype/) | Python 手表模拟原型，含演示后端、长者端和家属端 | 依照 [原型运行说明](watch_prototype/README.md) 安装和启动 |

## 目录结构

```text
existing_app/       # 主应用代码及其构建配置
watch_prototype/    # 手表相关的独立演示项目及其 README
docs/              # 项目文档
specs/             # 需求与实现规划
```

## 协作约定

- 主应用的改动放在 `existing_app/`；手表演示的改动放在 `watch_prototype/`。
- 两个项目分别管理依赖、启动和构建，主应用原型不依赖手表运行。
- `watch_prototype/` 是 Python 模拟演示，不是可安装到 Wear OS 的原生应用。
- 演示后端与主应用后端目前独立；如需共享数据，应先约定接口并完成对接。
- 功能开发或目录整理通过独立分支和合并请求提交。
