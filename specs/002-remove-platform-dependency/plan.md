# Implementation Plan: 移除妙搭平台依赖并补齐独立运行能力

**Branch**: `main`（实际 Git 分支；setup-plan 返回的功能标识为 `002-remove-platform-dependency`，未切换分支） | **Date**: 2026-10-04 | **Spec**: [spec.md](spec.md)

**Input**: `specs/002-remove-platform-dependency/spec.md` 及五项已确认澄清。

## Summary

沿用 React、Vite、NestJS、Drizzle 和现有业务服务；将妙搭提供的数据库注入、身份上下文、请求/日志工具及构建检查预设替换为独立能力。当前工作区已有便携命令、本地注入、同源请求、静态页面服务和地图配置读取，优先修补并验收，禁止无依据重写。Windows PowerShell 运行应用，Docker Desktop/WSL 2 仅承载本地 PostgreSQL；浏览器仅本机访问。空库起步，不导入旧平台或已有本地业务数据。

补齐真实密码认证、有限单会话、显式一对一照护授权、输入验证、完整持久化、错误及脱敏日志。保留不写业务库的显式前端演示和使用真实认证、隔离保存的演示账号；模拟定位、叫车、求助、告警及通知不变成真实服务。`001-audit-backend-gaps` 的完整评估范围不变。

## Technical Context

**Language/Version**: TypeScript 5.9；Node.js 24 系列，当前机器可执行版本 24.19.0；npm 11.17.0。锁定实际验证版本，不自动追最新。

**Primary Dependencies**: React 19、Vite 8、NestJS 10、Drizzle ORM 0.44.6、postgres-js、class-validator/transformer、axios；普通 React 插件及 drizzle-kit 必须显式声明并锁定。保留当前 React Router、组件和 CSS。独立 TS、ESLint、Tailwind 配置替代平台 presets，不升级业务框架。

**Storage**: PostgreSQL 17 容器，固定实施时验证的镜像 digest；具名持久卷，端口仅绑定 127.0.0.1。Drizzle 提交 SQL、快照和迁移日志；不用 db push 代替可审阅迁移。

**Testing**: 保留 type:check、build、lint；新增 Node test runner + tsx 的真实 PostgreSQL 集成/契约测试，以及浏览器人工验收。数据库失败、跨账号/角色、一对一关联、并发和回滚用真实数据库验证，不以 mock 成功证明能力。

**Target Platform**: Windows PowerShell 5.1/7 与本机浏览器；应用不迁入 WSL，生产方式指本机运行已构建产物，不指公网部署。

**Project Type**: 已有 fullstack web application，单仓库 `existing_app`。

**Performance Goals**: 无用户批准的吞吐、覆盖率或延迟门槛；记录本机验收耗时，受影响流程不出现挂起/无反馈。数据库连接超时 5 秒、HTTP 请求超时沿用 15 秒，均验证失败反馈。

**Constraints**: 所有必需路径无妙搭 SDK/账号/网关/数据库；本地真实凭据只从不提交配置注入；默认单活动会话 24 小时，重新登录替换，过期/退出立即拒绝。地图是可选外部能力，Key 会在浏览器使用，不能称其为浏览器不可见秘密。

**Scale/Scope**: 验收至少 2 个未关联家属账号、1 个独立长者账号和演示账号，覆盖全部现有受保护入口。家属可管理多位长者；每位长者/长者账号至多一条有效照护关联。不新增多人协作、短信、真实定位上报或全 PRD 功能。

## Constitution Check

*GATE: Phase 0 前检查并于 Phase 1 设计后复核。依据章程 v1.0.1；设计通过不等于现有实现通过。*

| 条款 | 设计前发现 | 设计后约束与证据落点 | Gate |
| --- | --- | --- | --- |
| I 模拟/真实 | 登录失败自动演示、模拟告警文字可能混淆 | 显式双演示、真实注册认证不降级；contracts/api.md、quickstart.md A12 | 通过 |
| II 风险相称验证 | 旧证据不足证明新迁移 | 真实库成功/失败、角色及隔离、正常重启；未运行项单列 verification.md | 通过 |
| III 全部输入 | DTO 部分覆盖，路径/查询/头不足 | contracts/api.md 的输入、错误及权限矩阵，嵌套/边界/语音反例 | 通过 |
| IV 代码文档 | 现有服务注释不完整，README 与代码矛盾 | 改动同步模块、函数、公共接口、权限、副作用及错误文档，新增命令 help | 通过；实现需补 |
| V 公共 API | 错误结构读取不匹配，地点丢字段 | 固定 25 条现有 API 的方法/路径/响应，新增关联为增量；修复影响明示，不静默破坏合法调用 | 通过 |
| VI 服务边界 | Auth、Elder、Family 现有职责 | 保留认证/注册编排、长者生命周期/访问授权、关联业务职责；数据库模块仅基础连接和迁移，无业务授权 | 通过 |
| VII 迁移回滚 | 尚无落地 SQL/回滚命令 | data-model.md 规定分版本、备份、恢复及验证；quickstart.md 规定可执行命令合同 | 通过；执行未验证 |
| 三项基线 | 不因迁移授权真实位置/麦克风/硬件 | 默认围栏进出上传、不持续监听、手机不依赖手表；本次不新增采集上传 | 通过 |

无需例外，无已授权的公共契约破坏或服务职责迁移。若实施发现必须改变有效契约/职责，提交具体影响及迁移安排由用户确认后再执行，不将评估建议当授权。

## Project Structure

### Documentation (this feature)

```text
specs/002-remove-platform-dependency/
├── spec.md
├── source-context.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── verification.md
├── contracts/
│   ├── api.md
│   ├── operations.md
│   └── .env.example
└── tasks.md  # 已生成并修订为67项任务；规划/修订不执行实施
```

### Source Code (repository root)

```text
existing_app/
├── client/src/lib/{http,logger}.ts             # 保留并完善
├── client/src/pages/MemoPathPage/              # 保留页面引擎，补身份/错误/关联反馈
├── client/src/components/business-ui/         # 静态候选未使用，确认后清理
├── shared/api.interface.ts                    # 现有共享类型，增量关联契约
├── server/common/{filters,interfaces,constants}/
├── server/database/{database.module,schema}.ts
├── server/database/migrations/                # 待实现，SQL/快照/元数据/恢复说明
├── server/modules/memopath/
│   ├── auth.{controller,service}.ts
│   ├── elder.{controller,service}.ts
│   ├── family.{controller,service}.ts
│   ├── memopath-session.guard.ts
│   ├── care-link.controller.ts                # 待实现，委托 ElderService
│   ├── dto.ts
│   └── memopath.module.ts
├── server/modules/view/                      # 保留生产 SPA 路由
├── scripts/run.cjs                           # 保留便携进程启动
├── scripts/db.cjs                            # 待实现，统一迁移/备份/恢复入口
├── tests/integration/                        # 待实现，真实库与契约/权限
├── compose.yaml
├── drizzle.config.ts
├── .env.example
├── package.json / package-lock.json
└── README.md
```

**Structure Decision**: 不搬迁项目、不拆服务、不另建框架。AuthService 保持密码、会话、演示账号和注册编排；ElderService 负责长者 CRUD/资源访问判断，并承担新照护关联，FamilyService 保持联系人、行程、设置、围栏、地点、行踪、体征、告警及聚合。注册编排复用 ElderService 的事务内创建入口，演示初始化调用对应服务的事务内初始化方法；事务穿透作为显式参数而非互相侵占业务数据职责。新增 care-link 控制器只是既有长者授权职责的入口。守卫向服务传可信 principal，不把长者 principal 的 ownerId 冒充家属 ID。

## Phase 0 — Research and Decisions

研究输出 [research.md](research.md) 逐项说明选择、依据、替代方案；已解决版本、迁移工具、归属字段、会话、照护授权、配置、演示及验证方法。依据依赖清单，而不是模板宣传确定平台责任。当前验证记录见 [verification.md](verification.md)，数据库运行证据仍受 Docker 前提限制。

## Phase 1 — Design and Contracts

- [data-model.md](data-model.md)：标准 UUID 归属/审计，单会话列、邀请与照护关联、地点坐标、数据库约束和迁移/恢复。
- [contracts/api.md](contracts/api.md)：现有 25 条 API 契约、角色/操作矩阵、增量关联接口、输入及失败行为。
- [contracts/operations.md](contracts/operations.md)：配置、命令、日志及平台替代验收；[contracts/.env.example](contracts/.env.example) 是计划模板，不是已替换的应用配置。
- [quickstart.md](quickstart.md)：PowerShell 安装、启动、备份恢复及 A01–A12 正常/失败验收。待新增命令显式标为设计合同，不能声称当前可执行。

任务实施顺序为环境及共享基础 → US2账号和所有受影响服务属性适配 → US1构建/启动验收 → 0000恢复基线归档 → US3的0001授权及持久化 → US4兼容/演示 → US5恢复/交接 → 最终验收。schema改动后的中间状态不宣称构建/启动通过，不保留明文旧会话字段或关闭认证；US2适配完成后先检查构建，再执行启动验收。迁移唯一目录为 `existing_app/server/database/migrations/`，SQL、meta快照/journal和恢复说明均由Drizzle配置、db命令及验收引用此目录。startup纳入显式及无参数全套验收入口。

### 依赖顺序与复用策略

实施环境准备由代理负责，不预设用户已安装 Docker Desktop 或 WSL 2。后续生成 tasks.md 时，必须将以下前置任务显式列出并设置依赖；本次规划只记录职责，不执行安装。

| 前置任务 | 代理职责与完成证据 | 依赖及用户操作边界 |
| --- | --- | --- |
| ENV-01 环境检查 | 检查 Windows 版本/架构、虚拟化、WSL 版本及状态、安装目录与 PATH、Node/npm 兼容性、Docker 客户端/引擎、Compose、数据库端口；记录已安装、缺失、不兼容和待验证项 | 先检查再安装；当前已验证的 Node 24.19.0/npm 11.17.0 优先复用，不为追新升级；PATH 问题先修复进程环境 |
| ENV-02 补齐缺失工具 | 从 Microsoft、Docker 官方来源获取本次必需且缺失的 WSL 2、Docker Desktop；仅在 Node/npm 缺失或经证据确认不兼容时补装官方兼容版本；核对发布者签名或官方校验和，记录来源、版本及安装结果 | 依赖 ENV-01；能自动完成的由代理执行。BIOS 虚拟化、系统重启、必需用户界面或权限限制，给出观察结果、原因、具体操作和恢复检查入口；禁止擅自重启，使用安装程序支持的不自动重启选项 |
| ENV-03 运行底座验证 | 复检 WSL 2 状态和实际版本，启动 Docker Desktop，验证 docker version 的服务端、docker info 及 docker compose version | 依赖 ENV-02 及必要用户操作完成；CLI 存在或安装退出成功不等于引擎可用，未通过不得运行依赖它的任务 |
| ENV-04 项目依赖准备 | 按实际依赖清单完成独立构建配置和最小依赖调整；将 .npmrc 与 lock 下载来源同步为官方 npm registry，保留兼容版本与完整性校验，再以 npm.cmd ci 在干净 checkout 安装并验证依赖 | 依赖 ENV-01；平台依赖替换参见顺序 1。不得用无依据版本升级或已有 node_modules 替代锁定安装证据；独立于 Docker 的工作可继续 |
| ENV-05 PostgreSQL 就绪 | 落实 Compose 与不提交的配置后，使用官方 library/postgres 镜像启动本地持久卷数据库；检查容器状态、pg_isready 和带凭据的 SELECT 1，记录镜像版本/digest 及脱敏结果 | 依赖 ENV-03、ENV-04 及顺序 2 的 Compose/配置准备；是空库迁移和全部真实数据库验收的前置。连接通过仍须随后验证 schema/迁移版本，不能等同业务就绪 |

安装或权限失败按实际结果记录，代理继续可独立完成的工作；必须由用户完成的操作给出具体步骤，完成后复检再执行依赖任务。真实凭据只注入不提交的本地配置，不放入命令输出或安装记录。官方安装说明与可复现检查见 [quickstart.md](quickstart.md)。

| 顺序 | 范围及现有成果 | 计划处置 | 验证 |
| --- | --- | --- | --- |
| 1 | DEP-06/07 构建预设、锁文件、便携 launcher | 保留 launcher/普通 Vite；补显式依赖、独立 tsconfig/ESLint/Tailwind，确认业务未使用组件后清理，移除全部平台包/命令 | 干净 npm ci、type:check、lint、build；平台直接/间接依赖及产物扫描 |
| 2 | DEP-01/03 本地数据库注入及 Compose | 保留池生命周期；补配置校验、结构版本检查、参数化 Compose、Drizzle 迁移/备份恢复命令 | 空库、重复迁移、缺表/停库、正常重启及回滚 |
| 3 | DEP-02 自建密码与 ownerId 迁移 | 保留密码算法，单会话哈希和到期；显式 owner_account_id 与账号设置归属；注册事务与演示归属 | 错误密码、并发注册、旧 token、退出、输入、两账号隔离 |
| 4 | 照护角色与最小关联 | 复用 ElderService 访问判断，补双端明确同意的短期一次邀请/接受、撤销与权限矩阵 | 未授权/过期/重放/并发/演示混用拒绝、本人允许访问、撤销后拒绝 |
| 5 | DEP-04/05/10 请求/日志/地图；已有静态服务 | 保留路径/共享类型/主界面；补 me 恢复、错误读取、失败反馈、显式演示、结构化日志、地点保存 | 开发/构建后回归、前端演示无写库、演示账号隔离、地图缺失不阻断 |
| 6 | DEP-08/09 文档与配置 | 清理有证据的模板残留、更新 README/示例/函数说明及脱敏验证报告 | 接手者复现全部步骤，密钥与历史检查、文档一致性 |

### 交付判定

25 条 FR 与 10 项 SC 均在上述设计/验收资料及 tasks.md 的“需求及验收追踪”中有落点。完整安装、真实认证授权、持久化及恢复必须在独立库通过；当前既有 node_modules 的检查/构建通过只能证明当前环境，不证明脱平台安装。此前规划阶段未安装或改变机器环境、未创建 tasks.md、未执行业务实现或数据库变更，也未修改 001；后续任务生成及修订阶段已生成67项任务。当前计划、任务及需求质量审阅已完成，实施及强制验收尚未完成；实施阶段须执行 ENV-01–ENV-05，不能把文档命令或待用户操作标为已验证通过。

## Complexity Tracking

无章程例外。新增两张授权表源于已确认的真实一对一照护关系；不引入 JWT/Redis/OAuth/多人权限系统，不另建业务服务层。回滚优先使用已验证备份恢复到匹配版本，以减少无法证明逆向 SQL 完整性的风险。
