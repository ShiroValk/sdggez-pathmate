# Tasks: 移除妙搭平台依赖并补齐独立运行能力

**Input**: `specs/002-remove-platform-dependency/` 中的 spec.md、plan.md、research.md、data-model.md、contracts/api.md、contracts/operations.md、quickstart.md、source-context.md、verification.md。
**Prerequisites**: 已有规格和计划；实施前读取 `.specify/memory/constitution.md` 与自定义需求质量清单。任务生成阶段未执行安装或业务实施；当前已进入实施，实际状态见任务标记及verification.md。
**Tests**: spec FR-021、SC-001–SC-010明确要求可复现成功、失败、隔离、持久化及恢复验收，故包含真实数据库集成/契约测试和浏览器验收；不额外引入覆盖率门槛或全项目TDD要求。
**Organization**: 先环境准备和共享基础，再按US2账号适配、US1启动验收、US2基线归档、US3–US5组织可单独验证的增量。完成状态由逐项实施证据决定，旧代码存在或规划检查通过不构成勾选依据。

## Format: `[ID] [P?] [Story] Description`

- `[P]`表示共同前提完成后可与明确列出的不同文件任务并行，不表示跳过依赖。
- `[US1]`–`[US5]`对应spec的用户故事；Setup、Foundational及Polish不使用故事标签。
- 下列路径均相对仓库根目录；应用命令工作目录为`existing_app`，PowerShell使用`npm.cmd`。
- 每个实施任务同步其模块/函数的职责、输入输出、错误、权限、依赖、副作用文档；保留用户现有改动，不无依据重写。
- 测试编写任务先定义断言并记录现有失败或尚缺能力；编写和通过是不同任务，不以测试文件存在作为完成证据。

## Phase 1: Setup — 环境检查、缺失工具安装与依赖准备

**Purpose**: 落实ENV-01–ENV-04；代理承担可自动执行的安装与验证，不预设用户已准备机器。

- [X] T001 复核当前工作区和DEP-01–DEP-10、现有25条API与页面调用基线，在 `specs/002-remove-platform-dependency/source-context.md` 记录原依赖、用途、替代、使用证据、复用条件与工作区快照；不改001评估范围。（FR-001/FR-016/FR-017/FR-022）
- [X] T002 复核已对齐的 `specs/002-remove-platform-dependency/contracts/operations.md` 与 `specs/002-remove-platform-dependency/quickstart.md` 的db:check合同：包括迁移文件完整性及Windows通过DATABASE_URL的带凭据SELECT 1，无写库；空库允许无账本并报告待初始化，有未知业务表或已有账本漂移则拒绝；应用结构就绪仍由启动检查判定；在 `specs/002-remove-platform-dependency/checklists/platform-migration.md` 保留CHK035审阅状态不代勾。（FR-013/FR-025）
- [X] T003 执行ENV-01，检查Windows版本/架构、虚拟化、WSL版本/状态、标准与用户安装目录和PATH、Node/npm兼容性、Docker引擎/Compose及端口，将脱敏结果追加到 `specs/002-remove-platform-dependency/verification.md`；优先复用已兼容Node 24.19.0/npm 11.17.0，PATH问题先修当前进程，不无故升级。（FR-025/SC-010）
- [X] T004 执行ENV-02，从Microsoft、Docker官方来源补装本次必需且缺失的WSL 2和Docker Desktop，验证签名或官方校验和；仅Node/npm确实缺失或不兼容才补装官方兼容版本，在 `specs/002-remove-platform-dependency/verification.md` 记录来源、版本、安装结果。可自动完成的自行执行；BIOS、重启、必需用户界面或权限限制写明原因、具体操作及复检入口，使用官方支持的不自动重启选项，不擅自重启。（FR-025）
- [X] T005 执行ENV-03，启动Docker Desktop并复检WSL 2、docker version服务端、docker info和docker compose version，在 `specs/002-remove-platform-dependency/verification.md` 记录实际结果；用户操作未完成则保留阻塞并继续独立工作，不把CLI存在当引擎可用。（FR-024/FR-025）
- [X] T006 按T001证据替换 `existing_app/tsconfig.json`、`existing_app/tsconfig.app.json`、`existing_app/tsconfig.node.json`、`existing_app/eslint.config.js`、`existing_app/tailwind.config.ts`、`existing_app/vite.config.ts` 的平台预设，保留别名、decorators/metadata、SWC输出与CSS行为；检查 `existing_app/client/src/components/business-ui/` 的导出、动态、类型及构建引用后替换实际使用能力或清理确认未使用组件，不盲删页面能力。（FR-002/FR-017）
- [X] T007 执行ENV-04，在 `existing_app/package.json` 显式声明并锁定postgres、普通React插件、兼容drizzle-kit及tsx，移除已替代平台包/脚本，修正兼容engines；将 `existing_app/.npmrc` 和 `existing_app/package-lock.json` 下载来源同步到官方npm registry，保留其余兼容版本和integrity；在干净隔离checkout执行npm ci、type:check、lint、build并记录结果到 `specs/002-remove-platform-dependency/verification.md`，不靠残留node_modules。（FR-002/FR-025）

**Checkpoint**: 工具安装及引擎已验证、项目可从官方来源锁定安装；必要用户操作未完成时不得开始依赖它的数据库任务。独立构建准备T006/T007可在Docker阻塞时继续。

## Phase 2: Foundational — 配置、持久化与可信边界

**Purpose**: 所有故事共享的阻塞基础，落实ENV-05；不在此阶段声称认证、授权或业务流程已通过。

- [X] T008 在 `existing_app/scripts/config.cjs`、`existing_app/scripts/run.cjs`、`existing_app/server/app.module.ts` 与 `existing_app/.env.example` 统一进程>.env.local>.env>非秘密默认加载，按 `specs/002-remove-platform-dependency/contracts/operations.md` 验证全部配置：loopback地址、port整数1–65535、SESSION_TTL_SECONDS整数60–604800默认86400、CARE_INVITE_TTL_SECONDS整数60–1800默认600、LOG_LEVEL及精确布尔DEMO_ACCOUNT_ENABLED；build不强制DB连接，start/migrate必需有效URL，秘密不带VITE_前缀。（FR-013）
- [X] T009 在 `existing_app/server/common/logger.ts`、`existing_app/server/common/filters/exception.filter.ts`、`existing_app/server/main.ts` 建立脱敏结构化日志与服务端requestId，保留嵌套error合同和400/401/403/404/409/500/503分类，未知异常不向客户端输出stack/cause，日志不泄露password/token/code/Key/URL或资料正文。（FR-011/FR-012）
- [X] T010 在 `existing_app/server/database/schema.ts` 替换已确认平台字段/helper，公共约定逐字落实：“主键 UUID；时间 `timestamptz(3)`，对外 ISO 时间；业务日期保留 YYYY-MM-DD，默认日期和 dashboard 今天统一 Asia/Hong_Kong”；“`_created_by/_updated_by` 使用可空 UUID 外键，仅表示实际操作者。业务归属使用独立必填列”；角色、审计、归属与演示标识不由客户端赋值。（FR-005/FR-008）
- [X] T011 在 `existing_app/server/database/schema.ts` 建立0000账号模型，逐字落实account_key“trim 后 1–64 字符、唯一；保持大小写语义，不按手机号或姓名合并”，password_hash“text，沿用 salt:hash scrypt 格式；密码注册 8–128 字符，不 trim；不返回”，role“family / elder，检查约束，注册后不可经普通业务修改”，display_name“1–100 字符，沿用注册 elder.name 来源”，is_demo“bool，默认 false；保留 demo 账号标识，只有显式种子可设 true”，session_token_hash“可空 64 位 hex SHA-256；唯一非空值；不存返回的原始 token”，session_expires_at“可空时间，和 token_hash 同时存在或同时为空；默认有效期 86400 秒”。（FR-003/FR-004/FR-015）
- [X] T012 在 `existing_app/server/database/schema.ts` 建立0000长者/设置模型，逐字落实长者“新增必填 `owner_account_id` → 家属账号，账号删除默认 restrict；服务校验 role=family”，“`name` trim 非空≤100，nickname/relation≤100，age 整数 0–130，gender≤20，address≤255，电话≤32、可选空值保留，emoji≤16”，及“`(id, owner_account_id)` 唯一键”；设置“id UUID；新增必填唯一 `account_id` → 本地账号；config jsonb”，“language={mandarin,cantonese,english}，voiceMode={default_on,standby}，lockLayout boolean”，“缺记录时返回既有默认 cantonese/default_on/false，保存原子 upsert”，保留snake_case存储/camelCase响应。（FR-005/FR-008/FR-009）
- [X] T013 在 `existing_app/server/database/schema.ts` 建立0000关联业务表，逐字落实联系人“elder_id FK，name≤100，relation≤100，phone≤32，avatar_emoji≤16”；行程“elder_id，destination≤255，真实 trip_date，start_time/end_time≤8，schedule_mode auto/manual，status”，“日期必须真实；空时间保留，非空 HH:mm、双方有值时结束≥开始；默认 pending，模拟 call 仍 cab_called，不代表外部叫车”；围栏“elder_id 唯一，home_label≤100，radius_m 100–5000，dwell_enabled bool，dwell_minutes 1–120”，“保留默认800/true/18与无记录的 id='' 响应，不伪装保存；原子 upsert”；地点核心“elder_id，label≤100，icon≤16，place_type frequent/beacon，beacon_status safe/strange”；行踪“elder_id、occurred_date、location≤255、status safe/out_of_range、note≤255”；体征“elder_id、heart_rate、blood_oxygen、temperature numeric、steps、recorded_at”及“空数据 latest=null”；告警“elder_id、alert_type、title/location≤255、status、occurred_at”；“所有 elder FK onDelete cascade”，保留既有只读数据含义，不新增采集或投递。（FR-008/FR-009）
- [X] T014 在 `existing_app/drizzle.config.ts`、`existing_app/server/database/migrations/0000_independent_core.sql`、`existing_app/server/database/migrations/meta/0000_snapshot.json`、`existing_app/server/database/migrations/meta/_journal.json` 提供可审阅0000初始化迁移与元数据，在 `existing_app/server/database/migrations/README.md` 写明该版本失败事务回滚、非空库不得drop/删卷回退及恢复前提；不导入旧业务数据，不用push替代迁移。（FR-018/FR-019）
- [X] T015 在 `existing_app/scripts/db.cjs`、`existing_app/package.json` 实现db:generate/check/migrate/status，使用锁定本地drizzle-kit、postgres-js、数组参数和共享配置，db:check遵循T002合同；迁移使用advisory lock、版本/校验和检查、事务及非空未知库拒绝，重复执行无变化；支持--to 0000，之后扩展0001，不提供任意SQL或覆盖开关。（FR-018/FR-020）
- [X] T016 在 `existing_app/compose.yaml` 固定官方PostgreSQL 17镜像验证digest、具名卷、127.0.0.1端口和健康检查，从未提交 `existing_app/.env.local` 读取凭据；代理安全生成缺失数据库密码而不覆盖已有配置，同步 `.gitignore` 对env、产物、备份和本地报告的规则，已有卷改环境变量不假称已改库密码。（FR-013/FR-024/FR-025）
- [X] T017 执行ENV-05，启动 `existing_app/compose.yaml` 的db，检查容器状态、pg_isready、容器SELECT 1及Windows db:check带凭据连接，初始化0000并核对status，在 `specs/002-remove-platform-dependency/verification.md` 记录准确命令、镜像digest与脱敏结果；失败不切模拟存储，运行前核对目标为空测试/开发库。（FR-018/FR-025/SC-010）
- [X] T018 在 `existing_app/tests/integration/helpers.ts`、`existing_app/tests/integration/run.ts`、`existing_app/package.json` 建立Node runner/tsx真实数据库套件入口，限定DATABASE_URL_TEST为本机、_test结尾且不同开发/恢复库，使用独立fixture/schema清理；支持startup/auth/permissions/validation/persistence/config/contracts/migrations/demo；startup显式入口为npm.cmd run test:integration -- --suite startup，无参数必须包含全部九套件，失败非零，合成账号无真实短信/通知副作用。（FR-021）
- [X] T019 在 `existing_app/server/database/database.module.ts`、`existing_app/server/main.ts` 复用连接池与关闭钩子，补5秒连接超时和最低/最高支持schema版本、表列/约束检查；0000阶段仅支持0000，0001应用阶段更新范围，缺配置/停库/结构不匹配不监听业务端口且非零退出，明确提示已实现的准备命令。（FR-013/FR-020）

**Checkpoint**: 本地PostgreSQL真实就绪，0000结构可重复初始化，共享配置、日志、迁移和测试基座完成；没有任何绕过认证的临时业务入口。

## Phase 3: User Story 2 — 真实账号、会话与退出（P1）

**Goal**: 本地账号真实注册、登录、会话验证和可靠退出，保持公共认证合同。
**Independent Test**: 合成family/elder账号覆盖正确/错误密码、重复及并发注册、me、刷新、重新登录替换、到期/伪造/撤销凭证和退出失败，不进入演示。

### Tests

- [X] T020 [US2] 在 `existing_app/tests/integration/auth.test.ts` 为/auth/otp、exists、register、login、me、logout定义真实库契约及失败断言，包含exists缺/空false、family初始长者与elder待关联、并发注册只成功一次、初始化失败无半成品、到期/替换/退出旧token401和DB错误503。（FR-003/FR-004/SC-002）

### Implementation

- [X] T021 [US2] 在 `existing_app/server/modules/memopath/dto.ts`、`existing_app/server/modules/memopath/auth.controller.ts` 落实account trim后1–64且保持大小写、注册密码8–128/登录1–128且不trim、family/elder、完整嵌套elder、显示名1–100与电话规则；exists空值保留，普通未知字段strip但owner/accountId/isDemo/audit等伪造字段400，演示OTP不作为手机号核验。（FR-003/FR-007/FR-016）
- [X] T022 [US2] 在 `existing_app/server/modules/memopath/auth.service.ts` 复用salt:hash scrypt并固定N=16384/r=8/p=1、64字节结果/16字节盐和等长安全比较；随机UUID会话只存摘要/到期，默认86400秒、登录替换、退出清空、注册事务原子初始化，保持MemoPathLoginResponse，不保存/日志输出原token。（FR-003/FR-004）
- [X] T023 [US2] 在 `existing_app/server/modules/memopath/memopath-session.guard.ts`、`existing_app/server/modules/memopath/principal.ts` 验证单值UUID头、摘要与数据库时间到期，向服务传可信accountId/role/isDemo，区分认证401和数据库503；不得将elder principal冒充family owner，角色选择器不改变权限。（FR-004/FR-005）
- [X] T024 [US2] 在 `existing_app/server/modules/memopath/elder.service.ts`、`existing_app/server/modules/memopath/family.service.ts` 提供各自职责内事务初始化入口供Auth编排，family注册创建其归属长者和账号设置、elder仅建账号和私有设置，任何失败回滚；同步全部受影响的旧schema属性引用，先适配0000基础family资料/设置查询为显式归属并拒绝未关联elder的照护访问；未关联elder仍可me/退出及自己的设置，长者列表/dashboard为空态，支持T034旧构建的真实family隔离和保存验收，完整照护权限在US3扩展；不将业务资料写入职责迁入Auth或数据库模块。（FR-003/FR-005/FR-009/FR-023）
- [X] T025 [US2] 在 `existing_app/client/src/pages/MemoPathPage/memopath-api.ts`、`existing_app/client/src/pages/MemoPathPage/memopath-engine.ts` 接入真实注册/login/me/logout，验证me后按服务器角色恢复资料，取消普通登录失败自动演示；退出清敏感缓存，撤销失败明确提示旧会话风险和内存重试方式，不留下新持久凭证副本。（FR-004/FR-010/FR-011）
- [X] T026 [US2] 先在0000 schema与全部受影响服务适配完成后执行type:check和build，再运行auth套件及浏览器注册/登录/刷新/退出，含停后端退出、旧token重放、错密码和DB错误；在 `specs/002-remove-platform-dependency/verification.md` 记录A03/A04与公共响应、状态码、字段含义的前后样例。（SC-002/FR-016/FR-021）


**Checkpoint**: 0000真实账号生命周期和适配后的构建通过；随后完成US1启动验收，才归档旧版可恢复构建。照护授权与完整资源权限仍由US3交付。

## Phase 4: User Story 1 — 无平台机器安装、构建与启动（P1）

**Goal**: 验证独立安装和两种启动方式，地图不可用不阻断其他能力。
**Independent Test**: 干净Windows checkout完成npm ci、构建、空库准备、dev/start和页面刷新；缺配置/停库/缺表明确失败。US2认证已完成；US1的完整非地图资料流程在US3完成后复验，不用模拟成功填补尚缺能力。

### Tests

- [X] T027 [P] [US1] 在 `existing_app/tests/integration/config.test.ts` 定义缺失/无效配置、端口范围和非loopback、数据库不可达/缺表/少列/版本不匹配、无地图Key的断言，检查非零退出与脱敏诊断，区分build不要求DB和start要求DB。（FR-013/SC-005）
- [X] T028 [P] [US1] 在 `existing_app/tests/integration/startup.test.ts` 定义dev进程生命周期、构建后同源API、首页/memopath刷新、未知API JSON404和缺asset不回SPA的契约断言，不以preview充当后端生产方式。（FR-010/SC-001）

### Implementation

- [X] T029 [US1] 在 `existing_app/scripts/run.cjs`、`existing_app/vite.config.ts`、`existing_app/client/src/lib/http.ts` 复用Windows便携launcher和同源请求，统一本机后端配置，保留15秒HTTP超时，dev一方退出停止另一方，客户端不依赖平台网关或全局平台上下文。（FR-002/FR-010）
- [X] T030 [P] [US1] 在 `existing_app/server/modules/view/view.controller.ts`、`existing_app/server/modules/view/view.module.ts` 复用构建产物静态服务并修正SPA回退边界，保留/与/memopath入口、未知API JSON404、缺asset404，不回落为假成功页面。（FR-010/FR-016）
- [X] T031 [P] [US1] 在 `existing_app/client/src/pages/MemoPathPage/memopath-amap.ts`、`existing_app/client/src/pages/MemoPathPage/MemoPathPage.tsx` 复用外部地图配置，补无Key、无效Key、加载失败和定位拒绝的明确不可用提示，不阻断认证及非地图流程，Key不写源码。（FR-014）
- [X] T032 [US1] 执行T027的config套件和T028的npm.cmd run test:integration -- --suite startup，以及干净安装、type:check/lint/build、dev/start浏览器访问和缺地图失败场景，在 `specs/002-remove-platform-dependency/verification.md` 记录A01/A02/A08实际结果；已迁移DatabaseModule/http/Vite/launcher/静态服务各自给出复用证据，真实认证流程同时复验，完整资料权限流程暂列待US3复验。（FR-001/FR-021/SC-001/SC-005）
- [X] T033 [US1] 将已验证的官方安装、配置、空库准备、开发及构建后启动步骤同步到 `existing_app/README.md` 与 `specs/002-remove-platform-dependency/quickstart.md`，注明工具权限/用户操作恢复入口、地图限制及仍待业务验收的内容。（FR-020/FR-025）

**Checkpoint**: 环境与启动里程碑成立；不将US1基础设施完成声明为全部已有业务迁移完成。

## Phase 5: User Story 2 — 0000恢复基线归档检查点（P1）

**Goal**: US2账号适配与US1构建启动验收均通过后，保留0001变更前的可恢复产物。
**Independent Test**: 核对归档构建、代码及lock标识、迁移版本和真实family登录/退出/隔离/保存证据；不混入秘密。

- [X] T034 [US2] 在 `existing_app/scripts/archive-baseline.cjs` 提供并执行0000恢复基线归档，保存匹配0000的构建、代码/lock标识及迁移版本到被忽略 `.local-baselines/0000/`，在 `specs/002-remove-platform-dependency/verification.md` 记录清单和无秘密检查；在0001修改之前保留真实family登录/退出/隔离/保存可验证产物，不用最新构建冒充旧版。（FR-019/SC-007）

**Checkpoint**: 0000恢复基线已保留，方可开始US3的0001变更。

## Phase 6: User Story 3 — 隔离、角色权限及持久化（P1）

**Goal**: 家属/长者明确授权、全部资源权限、输入拒绝和保存后重启保持一致。
**Independent Test**: family A/B及elder E覆盖25条既有接口的权限矩阵、双端邀请/接受/撤销、并发和跨demo拒绝；保存全部资料并重启应用和db逐字段核对。

### Tests

- [X] T035 [P] [US3] 在 `existing_app/tests/integration/permissions.test.ts` 定义全部受保护接口、聚合、设置的A/B/E权限与新增关联合同，覆盖未关联空态、目标/角色/owner伪造、过期/重放/并发/跨demo邀请、双方撤销及长者删除后旧会话不能再访问。（FR-005/FR-006/SC-003）
- [X] T036 [P] [US3] 在 `existing_app/tests/integration/validation.test.ts`、`existing_app/tests/integration/persistence.test.ts` 定义正文/路径/查询/头/嵌套/语音转换的边界、部分更新合并验证、无效输入不写库、复合写失败回滚，及长者/联系人/行程/设置/围栏/地点逐字段持久化断言。（FR-007/FR-008/FR-009/SC-004）

### Implementation

- [X] T037 [US3] 在 `existing_app/server/database/schema.ts` 新增0001地点字段，逐字落实“address varchar255 默认''、lng/lat nullable double；有限数、[-180,180]/[-90,90]且同时提供”；邀请字段逐字落实“UUID；(elder_id,family_account_id) 指向长者及其 owner，删除长者 cascade”，“指定 role=elder 账号 FK，不能猜测编号成为授权”，“唯一 SHA-256 摘要；原 code 为随机32字节 base64url，生成时一次返回”，“pending / accepted / revoked；到期通过 expires_at 判断，无需定时任务才能拒绝”，“expires 默认创建后600秒；消费时间服务端设置”；关联逐字落实“id UUID；elder_id、family_account_id、elder_account_id；status active/revoked；授权 created_at/accepted_at 与 revoked_at”，“复合 FK 保证家属确为该长者 owner；账号 FK restrict”，“active 状态的 elder_id 和 elder_account_id 各自建立部分唯一索引”。（FR-006/FR-008/FR-009）
- [X] T038 [US3] 在 `existing_app/server/database/migrations/0001_care_and_place.sql`、`existing_app/server/database/migrations/meta/0001_snapshot.json`、`existing_app/server/database/migrations/meta/_journal.json` 生成并审阅增量SQL，先在0000代表性测试资料上备份并隔离验证升级，扩展 `existing_app/scripts/db.cjs` --to 0001与 `existing_app/server/database/database.module.ts` 的0001结构检查；在 `existing_app/server/database/migrations/README.md` 附0001备份恢复到新库/匹配0000产物/新增数据隔离的回滚步骤。（FR-018/FR-019）
- [X] T039 [US3] 在 `existing_app/server/modules/memopath/dto.ts`、`existing_app/server/modules/memopath/elder.controller.ts`、`existing_app/server/modules/memopath/family.controller.ts` 落实T012/T013/T037逐字约束及合同输入规则：真实日历日期、非空HH:mm/结束≥开始、精确bool、finite坐标/同时提供、电话字符、label非空、code长度43/confirm必须boolean true；严格单值UUID非法404/缺参数400，普通未知strip/权限伪造400，partial合并后验证。（FR-007/FR-016）
- [X] T040 [US3] 在 `existing_app/server/modules/memopath/elder.service.ts` 实现owner及有效关联访问判定、邀请/预览/接受/双方撤销，保持家属可管理多长者而每位长者/elder账号仅一active link；接受消费同事务，关联/撤销和写入使用同长者锁，只读查询含有效关联条件，无跨请求授权缓存；删除长者事务cascade但保留其独立账号。（FR-005/FR-006/FR-009）
- [X] T041 [US3] 在 `existing_app/server/modules/memopath/care-link.controller.ts`、`existing_app/server/modules/memopath/memopath.module.ts`、`existing_app/shared/api.interface.ts` 添加合同规定的六个增量照护入口与类型，由ElderService承担授权职责；预览200、其余POST201、撤销200、错目标/过期/消费统一409不泄露身份，code不进URL/日志/普通列表。（FR-006/FR-016/FR-023）
- [X] T042 [US3] 在 `existing_app/server/modules/memopath/family.service.ts` 复用现有业务查询并对联系人/行程/围栏/地点/行踪/体征/告警/dashboard落实完整principal和权限矩阵，账号设置仅自己可读写；保存地点address/lng/lat，区分未提供与真实0且旧响应0/0兼容，默认围栏不伪报保存，数据库复合写事务失败不留半成品。（FR-005/FR-008/FR-009/FR-016）
- [X] T043 [US3] 在 `existing_app/client/src/pages/MemoPathPage/memopath-api.ts`、`existing_app/client/src/pages/MemoPathPage/memopath-engine.ts`、`existing_app/client/src/pages/MemoPathPage/MemoPathPage.tsx` 接入双端邀请摘要/明确接受/撤销、elder待关联空态及只读/本人允许操作，family“长者视图”只改显示不赋权；撤销重载资料/缓存，语音结果经同一业务输入路径处理，不新增持续监听。（FR-006/FR-007/FR-010/FR-023）
- [X] T044 [US3] 运行permissions/validation及关联并发失败测试，核对所有受保护接口覆盖分母与写前后库状态，在 `specs/002-remove-platform-dependency/verification.md` 记录A05/A06、账号组合、角色矩阵、拒绝状态和关联撤销结果，不以页面隐藏替代服务端权限证明。（SC-003/SC-004）
- [X] T045 [US3] 运行persistence套件及浏览器真实保存、刷新、重登，正常stop/start数据库和应用，逐字段核对地址/坐标/日期/归属/FK；补停库/断网保存失败和事务回滚，并复验US1全部非地图流程，在 `specs/002-remove-platform-dependency/verification.md` 记录A07及SC-001完整业务结果。（FR-008/SC-001/SC-004）
- [X] T046 [US3] 同步 `specs/002-remove-platform-dependency/data-model.md`、`specs/002-remove-platform-dependency/contracts/api.md` 与相关服务职责文档的真实归属/权限/约束/副作用及验证影响；若发现需改变合法契约或既有服务职责，先提出具体方案待用户确认，不擅自扩大PRD。（FR-016/FR-023）

**Checkpoint**: 真实认证、全部资源隔离/授权/验证及重启持久化通过，US1–US3最小真实业务增量可独立验收。

## Phase 7: User Story 4 — 契约兼容及明确演示边界（P2）

**Goal**: 保留已有合法页面/API语义，分别交付前端演示与真实认证保存的演示账号。
**Independent Test**: 25条既有API合法样例与页面流程回归；前端演示业务库写次数0；demo账号真实认证、隔离保存/重启读取，模式切换不带入资料或权限。

### Tests

- [X] T047 [P] [US4] 在 `existing_app/tests/integration/contracts.test.ts` 为25条既有API定义方法/路径、对象或列表包装、POST201与其他200、错误code/status、默认值/可选空值、日期数值和snake/camel字段含义的合法样例断言，非法显式elderId不fallback。（FR-016/SC-006）
- [X] T048 [P] [US4] 在 `existing_app/tests/integration/demo.test.ts` 定义前端演示无业务写入、demo真实密码/me/logout/到期、双向隔离、重启恢复、跨demo关联拒绝、错误密码不重置种子密码、关闭DEMO_ACCOUNT_ENABLED后旧会话拒绝及无自动失败fallback断言。（FR-015/SC-009）

### Implementation

- [X] T049 [US4] 在 `existing_app/server/modules/memopath/auth.controller.ts`、`existing_app/server/modules/memopath/elder.controller.ts`、`existing_app/server/modules/memopath/family.controller.ts`、`existing_app/shared/api.interface.ts` 按T047对齐既有合法契约、字段和默认值，不新增成功envelope，安全/输入修复影响记录到 `specs/002-remove-platform-dependency/contracts/api.md`；公共破坏需另提版本方案。（FR-016）
- [X] T050 [US4] 在 `existing_app/client/src/pages/MemoPathPage/memopath-api.ts`、`existing_app/client/src/lib/http.ts`、`existing_app/client/src/lib/logger.ts` 读取嵌套error并兼容原顶层message，保留请求超时/网络/401/403/409/503区别及requestId摘要；保存失败保留可重试输入且不toast成功，不打印完整axios配置/headers/异常。（FR-010/FR-011/FR-012）
- [X] T051 [US4] 在 `existing_app/server/modules/memopath/auth.service.ts`、`existing_app/server/modules/memopath/elder.service.ts`、`existing_app/server/modules/memopath/family.service.ts` 复用显式demo种子并修补真实owner/is_demo与事务初始化，种子重复执行不覆盖已有密码/业务资料；使用同一密码/会话/权限/输入体系，demo开关拒绝登录及旧会话，演示账号与普通账号不可跨域访问/关联。（FR-005/FR-015）
- [X] T052 [US4] 在 `existing_app/client/src/pages/MemoPathPage/memopath-engine.ts` 区分显式前端演示与演示账号，前者不发送业务写请求，普通认证/保存失败不自动入演示；切换清上个模式缓存/会话，不用共用空owner或mock成功取得权限。（FR-015）
- [X] T053 [US4] 在 `existing_app/client/src/pages/MemoPathPage/MemoPathPage.tsx`、`existing_app/client/src/pages/MemoPathPage/memopath-voice.ts` 标明两种演示的入口/结果和保存含义，演示验证码、定位、叫车、求助、告警及通知不声明真实送达/执行；保持手机原型、不持续监听、未授权不新增位置上传的基线。（FR-015/FR-023）
- [X] T054 [US4] 运行contracts/demo套件并逐页浏览器回归正常及演示流程、切换、重启读取与停服务失败反馈，在 `specs/002-remove-platform-dependency/verification.md` 记录A09/A12、25条合同覆盖与演示业务写入数/隔离证据。（SC-006/SC-009）

**Checkpoint**: 演示不伪装真实照护服务，兼容与演示增量可分别验收。

## Phase 8: User Story 5 — 交接、诊断与迁移恢复（P2）

**Goal**: 可复现升级和回滚，所有依赖有处置证据，接手者能定位真实失败。
**Independent Test**: 代表性0000测试资料备份、升级0001、重复/失败迁移、恢复到新库并使用匹配0000构建登录/退出/隔离/保存；核对数量/FK/owner/字段及脱敏诊断。

### Tests

- [X] T055 [US5] 在 `existing_app/tests/integration/migrations.test.ts` 定义空库初始化、非空未知库拒绝、重复/并发迁移锁、文件/账本漂移、升级事务中断、备份完整性、已存在恢复库拒绝、恢复会话撤销、匹配/不匹配构建及恢复数据核对断言，保护开发数据库和持久卷。（FR-018/FR-019/SC-007）

### Implementation

- [X] T056 [US5] 在 `existing_app/scripts/db.cjs` 加固迁移锁、SQL/snapshot/journal/账本校验及--to版本检查，错误非零且不中途改应用连接；复用已实现0000/0001，不将重置schema或删卷当升级，输出可操作脱敏错误。（FR-018/FR-019）
- [X] T057 [US5] 在 `existing_app/scripts/db.cjs`、`existing_app/package.json` 实现db:backup，停止写入前提下容器pg_dump -Fc临时文件复制到被忽略 `.local-backups/`，记录SHA-256、schema/app/lock版本、数量/FK/owner等清单，验证pg_restore --list及隔离恢复，参数与输出不含凭据。（FR-019/FR-020）
- [X] T058 [US5] 在 `existing_app/scripts/db.cjs` 实现db:restore，只创建尚不存在的pathmate_restore_*目标库，核对archive/权限/空间/版本后恢复，不覆盖源库或自动切应用，不提供force；统一撤销全部恢复会话，防止旧token被备份重新激活，失败保留源库与可诊断状态。（FR-019）
- [X] T059 [US5] 在 `existing_app/scripts/db.cjs` 实现db:verify，按备份清单核对表列/版本、数量、FK、字段、owner、账号设置唯一、demo域、关联唯一和撤销/到期状态；会话主动撤销作为预期安全差异单列，不打印敏感正文。（FR-019/SC-007）
- [X] T060 [US5] 使用T034保存的0000构建和0000测试资料实演备份→0001升级→新库恢复→旧版兼容，并验证最新0001构建拒绝0000结构；备份故障库、隔离升级后新增地点/授权差异，不自动回灌或承诺零损失，将实际恢复点/数据差异追加到 `specs/002-remove-platform-dependency/verification.md`。（FR-019/SC-007）
- [X] T061 [US5] 在 `existing_app/README.md`、`existing_app/server/database/migrations/README.md`、`specs/002-remove-platform-dependency/quickstart.md` 同步可执行备份/升级/回滚命令、停止写入、空间/权限/备份前提、触发条件、恢复目标、版本选择、新增数据处理和恢复后登录要求，保留普通down不删卷的说明。（FR-019/FR-020）
- [X] T062 [US5] 运行migrations套件并复现实演步骤，采集认证/权限/输入/DB/迁移诊断及requestId脱敏样例，逐项更新 `specs/002-remove-platform-dependency/source-context.md` 的DEP处置与 `specs/002-remove-platform-dependency/verification.md` 的A10/A11及通过/失败/阻塞证据，不声称001评估完成。（FR-001/FR-012/FR-021/SC-007/SC-008）

**Checkpoint**: 恢复路径实际可执行且数据和应用兼容已验证；没有备份或旧构建则回滚验收未通过。

## Phase 9: Polish & Cross-Cutting — 最终独立验收与资料一致性

- [X] T063 [P] 对照实际实现修订 `existing_app/README.md`、`specs/002-remove-platform-dependency/contracts/operations.md`、`specs/002-remove-platform-dependency/research.md` 与受影响服务/公共接口文档，消除命令/职责/默认值/失败行为矛盾；保持001资料原样，已验证状态必须关联证据。（FR-020/FR-022/FR-023）
- [X] T064 [P] 在 `existing_app/scripts/audit-independence.cjs` 实现源码/配置/锁文件/间接依赖/产物平台必需依赖检查及可访问历史的秘密规则扫描，结果仅报路径/规则和处置状态；记录地图浏览器产物的外部注入事实，发现历史Key安排轮换/清理但不自动历史重写，不打印值。（FR-002/FR-014/FR-017）
- [X] T065 在隔离干净Windows checkout按 `specs/002-remove-platform-dependency/quickstart.md` 重跑官方npm ci、type:check/lint/build、dev/start、全部真实库suite与A01–A12浏览器验收；包括工具/Compose/DB就绪、两家属+elder+demo、无Key非地图全流程、重启保留和回滚，失败排查修复后仅重跑受影响检查。（FR-021/SC-001–SC-010）
- [X] T066 在 `specs/002-remove-platform-dependency/verification.md` 建立25条FR、10项SC、DEP-01–DEP-10及T001–T067证据索引，明确静态/运行通过/失败/阻塞、环境安装或用户操作限制、有效地图配置未验证项与清理范围；强制项阻塞非零不得宣称功能交付。（FR-001/FR-021/SC-006/SC-008/SC-010）
- [X] T067 复核 `specs/002-remove-platform-dependency/tasks.md` 与 `specs/002-remove-platform-dependency/checklists/platform-migration.md` 的状态语义，任务仅有实际完成证据才勾选、自定义清单标记归审阅者且实施代理不修改；在 `specs/002-remove-platform-dependency/verification.md` 写最终交付结果、真实/演示边界及001范围未变声明。（FR-015/FR-021/FR-022）

## Dependencies & Execution Order

### Phase dependencies / 故事依赖图

```text
Setup T001–T007
  ├─ T003 → T004 → T005：WSL/Docker底座
  └─ T001 → T006 → T007：独立配置/依赖（Docker阻塞时可继续）
                  ↓
Foundational T008–T019（T002合同 → T015；T005/T007/T015/T016 → T017）
                  ↓
US2 T020–T026：真实账号与全部受影响服务适配，构建/认证验收
                  ↓
US1 T027–T033：环境与启动里程碑
                  ↓
US2 T034：保存0000恢复基线（US1验收后）
                  ↓
US3 T035–T046：0001 + 全资源权限/持久化 + US1完整业务复验
                  ↓
US4 T047–T054：兼容与显式演示
                  ↓
US5 T055–T062：恢复与交接（依赖已保留0000基线及0001业务）
                  ↓
Polish T063–T067：最终强制验收
```

- 所有故事共享Phase 2；故事阶段的独立测试指在已完成前提上单独运行其验收，不表示五个故事完全无依赖。
- T008配置、T009日志、T010–T014模型和迁移先于数据库/应用运行；schema.ts和db.cjs的连续修改串行，不并发覆盖。
- T017需Docker真实就绪、锁定项目依赖、Compose/本地配置和db命令；T019需0000已初始化。测试基座T018可在同阶段等待数据库前提时准备。
- T020/T027等测试定义先于同故事实现，通过测试在该故事末尾记录；不得关闭认证或改成mock成功使测试通过。
- T010–T013变更schema后，直到T022–T024完成全部受影响服务属性适配之前，不要求应用构建/启动通过；T026先执行type:check/build及真实认证验收，US1的T032随后验收完整启动路径。中间状态不部署、不保留明文会话旧字段，也不关闭认证。
- T034必须先于T037/T038；T038升级前备份可用官方pg_dump/pg_restore做隔离验证，完整自动备份合同T057再落地复验，不循环依赖US5脚本。
- T038修改最终schema后必须保留0000 SQL/快照/旧构建；T060恢复测试必须使用旧产物，新构建拒绝旧库是预期失败。
- US4改变Auth/Family/engine的演示分支，安排在US3之后；US5实演在US4之后避免同测试库和共享文件并发修改。
- T065等待T063/T064与全部故事；T066/T067最后核对强制证据，不以任务文档生成自动判完成。

### Parallel examples per story

| 故事 | 已满足共同前提 | 可并行示例 | 必须串行的整合 |
| --- | --- | --- | --- |
| US1 | Phase 2及US2 T020–T026 | T027 config测试定义 / T028 startup测试定义；T029完成后T030静态服务 / T031地图提示 | T032运行验收、T033更新说明 |
| US2 | Phase 2；T034另需US1完成 | 不标无依据并行；auth/DTO/principal/注册初始化/engine共享接口且有先后依赖 | T020→T021–T025→T026；US1之后T034归档 |
| US3 | US2及0000归档 | T035 permissions测试定义 / T036 validation和persistence测试定义 | T037→T038→T039–T043→T044/T045→T046 |
| US4 | US3 | T047 contracts测试定义 / T048 demo测试定义 | T049–T053共享controller/Auth/engine，T054最后验收 |
| US5 | US3/US4、0000归档及0001 | 不并行修改同一db.cjs或操作恢复目标；测试定义T055完成后按命令依赖串行 | T056→T057→T058→T059→T060→T061/T062 |

Polish的T063文档与T064审查工具可并行，前提是全部故事已完成；所有数据库重启、中断、升级和恢复验收独占隔离目标，不与其他测试争用。并行示例只说明任务机会，不要求启动子代理。

## Implementation Strategy

### MVP与增量交付

1. 先完成Setup和Foundational；代理自动补齐缺失工具和项目依赖，遇必须用户操作的步骤提供具体原因/操作并保留阻塞。
2. 先完成US2账号和全部受影响服务适配，再完成US1环境与启动验收；之后T034归档0000基线。US1里程碑不代表完整照护权限已交付，也不授权临时关闭认证。
3. 建议最小真实业务交付为US1–US3：注册登录退出、明确照护授权、已有资料保存和跨账号隔离，独立库和重启持久化通过。
4. 加入US4兼容与双演示、US5迁移恢复；每个增量独立运行其验收并回归受影响已有流程。
5. 最终全量验收全部强制FR/SC。检查通过后保留证据，系统重启、历史重写、公开部署不由本任务清单自动执行。

### 需求及验收追踪

| 需求 | 主要实施任务 | 验收与证据 |
| --- | --- | --- |
| FR-001/002/017 | T001/T006/T007/T029/T064 | T032/T062/T065/T066；SC-001/006 |
| FR-003/004 | T011/T020–T026 | T026/T065；SC-002 |
| FR-005/006 | T012/T023/T035/T037/T040–T043/T051 | T044/T054/T065；SC-003/009 |
| FR-007/008/009 | T010–T013/T021/T024/T036–T042 | T044/T045/T065；SC-004 |
| FR-010/011 | T009/T029/T030/T025/T043/T049/T050 | T032/T026/T045/T054/T065；SC-001/002/005 |
| FR-012/013/014 | T002/T008/T009/T016/T019/T031/T050/T064 | T027/T032/T062/T065；SC-005/008 |
| FR-015/016 | T001/T021/T039/T047–T054 | T026/T044/T054/T065；SC-006/009 |
| FR-018/019 | T014/T015/T034/T038/T055–T060 | T060/T062/T065；SC-007 |
| FR-020/021 | T018/T033/T061/T063/T065–T067 | 全部故事验收和verification.md；SC-008 |
| FR-022/023 | T001/T024/T040/T041/T043/T046/T063/T067 | T066/T067；SC-006/008；001范围不变 |
| FR-024/025 | T003–T008/T015–T017/T033 | T017/T032/T065/T066；SC-001/005/010 |

## Notes

- 全部67项任务初始未勾选；既有迁移优先复用，但每项需对应真实成功/失败证据。
- 自定义需求清单已完成逐项审阅及CHK036文档状态修订复审，36项均满足需求质量标准；这不表示任务完成或功能测试、实施验收通过。实施阶段仍遵循清单门槛及所有者规则，不由实施流程自动修改标记。内置requirements.md与自定义清单生命周期不同。
- 不引入旧数据导入、平台身份映射、多家属协同、短信服务、真实定位采集/告警投递/通知或全PRD实现。
- 真实凭据只注入不提交的配置；验证日志不回显值，地图Key缺失不阻断其他独立能力。
- 任务分布：Setup 7、Foundational 12、US1 7、US2 8、US3 12、US4 8、US5 8、Polish 5。

## Phase 10: Convergence

日期：2026-10-08（Asia/Hong_Kong）。本轮仅评估当前代码并追加任务，不运行业务验收、不修改应用代码、spec.md、plan.md、既有任务或清单标记；T001–T067的原勾选状态作为历史记录保留，不作为当前实现已完全合格的证据。前后置extensions配置不存在。前置检查脚本被当前PowerShell执行策略阻止，未更改策略；以只读方式核对`.specify/feature.json`指向002且spec/plan/tasks齐全。既有implement记录存在，满足converge阶段前提；不使用Git比较或重新扫描历史。

本轮核对25条FR、10项SC、25个用户故事验收场景、67项既有任务、12项计划决策（既有框架/服务职责、Windows宿主与Docker底座、官方锁定依赖、配置、会话、归属、照护关联、输入、持久化、请求/日志/启动、演示/地图、迁移恢复），以及章程7项原则与3项既有基线。以下是静态发现及待完成工作，不是本轮运行测试通过结论。

### 发现分类及执行边界

| ID | 类别 | Gap type | 严重性 | 当前代码或证据依据 | 对应任务 |
| --- | --- | --- | --- | --- | --- |
| C01 | 实现缺口 | contradicts | CRITICAL | `memopath-engine.ts:1432`的confirmPlace先写本地记录、忽略服务端返回ID，捕获addPlace失败后仍清草稿并提示保存；编辑跳过API，`deletePlace:1483`只删内存；FamilyController仅有GET/POST places | T068 |
| C02 | 实现缺口 | contradicts | CRITICAL | `memopath-engine.ts:1414`的pickPlaceTip把高德缺失location转为0/0并允许confirmPlace持久化；这不同于旧API明确约定的缺坐标响应占位0/0，不应改变该兼容约定 | T069 |
| C09 | 验收证据不足且结论过宽 | contradicts | CRITICAL | `verification.md`最终FR-008/010/011、SC-004等概括通过与C01–C05的当前分支不一致；9套件18项的既有结果存在，但不能证明未覆盖的前端地点编辑/删除/失败及延迟响应隔离 | T070 |
| C03 | 实现缺口 | partial | HIGH | `memopath-engine.ts:670`的loadScreenData只在care/home成功分支检查identityGeneration；contacts/trips/settings/elders/safety/overview/vitals与catch及多项保存回调未统一检查，旧响应可能回填新身份或旧401清除新会话；切换长者也没有完整请求上下文检查 | T071 |
| C04 | 实现缺口 | partial | HIGH | `memopath-engine.ts:1332`的saveSetting立即替换state.setting；失败只toast，未单列已确认值/待保存值及明确重试入口，连续整体配置保存未串行或处理乱序 | T072 |
| C05 | 实现缺口 | partial | HIGH | `memopath-engine.ts:1400`的suggestPlaceSearch在无Key、无效Key、网络错误时只logger.warn；用户只有空建议列表，无法区分失败与无结果 | T073 |
| C06 | 实现缺口 | partial | MEDIUM | `memopath-amap.ts:149`的getCurrentPosition在cachedPosition存在时永远直接返回；无取得时间/过期检查，disposeMaps不清定位缓存，重试/重新规划不一定发起新的真实定位 | T074 |
| C07 | 实现缺口 | partial | MEDIUM | `scripts/recovery.cjs:133`的restoreArchive校验归档/新目标后复制并建库，未显式预检本机/容器空间与必要访问前提；official仅在命令失败后给通用提示；T058要求执行前核对这些前提 | T075 |
| C08 | 实现缺口 | partial | MEDIUM | `memopath-engine.ts`的vitals使用`latest.steps > 0`判断有数据，真实记录steps=0显示`--`；不应把零步数当无记录或增加健康结论 | T076 |

另行记录，**不作为代码缺陷或新增秘密修复任务**：

- 历史Key：继续执行用户既有暂缓决定，不轮换、不停用、不改写历史、不输出Key。本轮不读取私人配置或Git历史；FR-014/SC-008历史处置部分保持“用户暂缓/未完成”，既有外部配置读取和无Key行为另判。以后实施不得为了让验收全绿而将暂缓标为通过。
- 浏览器环境：按用户2026-10-08说明，VS Code会话的浏览器验收阻塞按工具/宿主环境记录；需要浏览器时先通知用户切换Codex桌面端，切换完成后再核对实际连接。不把该情况归因于PathMate实现，也不未经同意寻找替代验收通道。
- 定位权限：按用户说明，桌面端权限不足时通知用户手动打开浏览器检查Windows与站点定位权限；原内置浏览器超时、Chrome连接阻塞及用户Edge手动通过各保留其证据来源，不根据用户说明把所有既有超时改写成已证实的同一根因。未复检前仍记环境阻塞，不模拟定位、不自动授权、不要求用户发送坐标或密钥。

### 追加实施任务

- [x] T068 [US3] **CRITICAL / C01 / 实现缺口**：在`existing_app/client/src/pages/MemoPathPage/memopath-engine.ts`的confirmPlace/openEditPlace/deletePlace及`memopath-api.ts`、`existing_app/server/modules/memopath/family.controller.ts`、`family.service.ts`补齐已存在地点页面新增、编辑、删除的真实持久化：仅在真实服务成功后确认保存/删除并采用返回的真实UUID；失败保留可重试草稿和原已保存列表，显示真实错误，不清草稿或返回本地模拟成功；显式前端演示仍仅改内存并标明未写库。先核对已有页面基线，为缺少的持久化操作形成最小增量合同，遵循Family/Elder授权边界，保持既有25条API及合法输入响应兼容；若确需破坏既有合法契约，先按章程V提交方案由用户确认。同步`contracts/api.md`及模块职责说明，补普通/演示账号刷新、重登、应用与数据库正常重启读回，以及停库/断网、角色越权和跨账号拒绝的真实验收。依据FR-008/010/011/015/016、US3/AC3、US4/AC4、章程I、既有T042/T045/T050（contradicts）。
- [x] T069 [US3] **CRITICAL / C02 / 实现缺口**：在`existing_app/client/src/pages/MemoPathPage/memopath-engine.ts`的pickPlaceTip/confirmPlace及`memopath-amap.ts`使缺少高德location的搜索结果保持“坐标未知”，不得补0/0作为真实搜索结果写库；必要时使用已批准高德能力解析并明确成功/失败，解析失败保留草稿、拒绝将虚构坐标当真实值保存。区分真实合法零坐标、未提供坐标和旧API的0/0占位约定，保持受支持契约；不模拟定位、不改换地图服务。验证无location/解析失败无错误写入、有效坐标原值读回及合法零值兼容，同步边界说明。依据FR-008/014/015/016、US3/AC3、章程I、既有T037/T042/T053（contradicts）。
- [x] T070 **CRITICAL / C09 / 验收证据不足**：先在`specs/002-remove-platform-dependency/verification.md`追加当前发现与待复验状态，修订其当前总览/FR/SC结论，撤回对未覆盖或已发现缺口的全流程通过声明，保留原日期的9套件18项及用户Edge手动路线证据，不删历史失败。为T068/T069/T071–T076建立真实库与页面验收记录：明确构建/源码标识、命令/步骤、合成输入、预期、实际、脱敏证据、清理范围；补延迟响应身份切换、地点编辑/删除/失败/坐标缺失、设置失败/连续保存、地图搜索失败、定位缓存重试、恢复前提失败与零步数。修复后只复验受影响检查；最终受影响构建/权限/兼容/持久化及场景未通过时不得声明完整交付。浏览器前通知用户从VS Code切换桌面端，定位权限问题通知其手动打开浏览器检查，再按实际结果区分代理验收、用户手动验收、证据不足及环境阻塞；需要替代方案时先征求同意。同步`quickstart.md`与必要运行说明及25FR/10SC/DEP/新增任务证据索引，自定义需求清单标记不动，历史Key继续暂缓且不新增轮换/历史扫描或清理要求，不变更001范围。依据FR-001/020/021/022、SC-001/004/005/006/008/009、US5/AC1、章程II、既有T054/T063/T065–T067（contradicts）。
- [x] T071 [US3] **HIGH / C03 / 实现缺口**：在`existing_app/client/src/pages/MemoPathPage/memopath-engine.ts`统一绑定所有异步读写、catch、后续重载及必要地图/语音回调的身份、模式、当前长者与组件存活上下文，补全clearIdentityData和切换长者后的失效检查；旧账号/旧模式/旧长者响应不得回填状态、触发新身份写请求或清除较新的有效会话，失效旧401/403也不得操作新会话。当前授权撤销/删除后的失败应清除相应受保护缓存，不能把旧数据当可继续访问资料；不新增实时远端追踪或持续监听。用真实A/B/E及demo账号、受控请求延迟/顺序验证退出后迟到响应、跨账号/模式切换、切换长者、撤销关联与迟到失败；故障/延迟注入只用于测试，不代替真实认证/业务响应。依据FR-005/006/010/015、SC-003/009、US3/AC7、既有T043/T052（partial）。
- [x] T072 [US3] **HIGH / C04 / 实现缺口**：在`existing_app/client/src/pages/MemoPathPage/memopath-engine.ts`的saveSetting及相关设置视图区分已确认服务端值和待保存修改；失败明确标记未保存、保留修改并提供重试，不把仅内存设置显示为已持久化，不在导航重载时悄悄丢失可重试输入；处理快速连续语言/语音/锁定设置保存，避免旧整体配置或乱序响应覆盖较新修改，结合T071上下文保护。保持前端演示仅内存与真实账号设置归属，验证停库/断网、恢复重试、连续切换及刷新/重登后值一致，补模块说明和T070证据。依据FR-008/010/011/015、SC-004、Edge Case断网保留输入、既有T025/T050/T052（partial）。
- [x] T073 [US4] **HIGH / C05 / 实现缺口**：在`existing_app/client/src/pages/MemoPathPage/memopath-engine.ts`的suggestPlaceSearch及相关搜索视图统一缺Key、Key无效、脚本/网络/超时失败的脱敏可操作反馈，区分请求失败与成功但无结果；保留搜索输入，失效/较旧搜索不得覆盖新输入的结果，不使地图故障阻断其他独立页面。用无Key与无效合成配置、真实请求失败验证全部受支持搜索入口，不输出真实Key或完整第三方URL；有效地图/定位页面按T070的桌面端与手动权限交接流程验收。依据FR-014、SC-005、US1/AC2、既有T031/T050（partial）。
- [x] T074 [US4] **MEDIUM / C06 / 实现缺口**：在`existing_app/client/src/pages/MemoPathPage/memopath-amap.ts`及引擎重试/重新规划入口记录定位缓存取得时间并限制其有效期；明确重试使失效缓存不再直接返回，切换/销毁及新的定位失败处理不能把永久缓存当当前设备位置。保持用户触发、真实浏览器定位、权限失败明确不可用及不新增位置上传/持续跟踪的基线。用明确时间/缓存状态的边界检查验证过期和重试路径；真实定位验收先通知用户手动打开浏览器检查权限，未取得真实位置时记录阻塞，不以模拟坐标判通过，补行为说明。依据FR-014/016/023、plan地图/请求决策、既有T031/T053（partial）。
- [x] T075 [US5] **MEDIUM / C07 / 实现缺口**：在`existing_app/scripts/recovery.cjs`及`existing_app/server/database/migrations/README.md`、运行说明落实T058要求的恢复执行前检查：明确归档可读性、本机/容器必要访问条件与可用空间检查或有依据的容量前提，检查失败在建库/复制/恢复前明确停止，不仅依赖pg_restore失败后的通用错误；不能证明的前提保留未验证限制。以受控失败条件验证不可读/无访问能力/不足空间的诊断及源库、原卷、应用连接不变，不真实填满用户磁盘或修改用户目录权限；继续仅创建新恢复目标、撤销恢复会话并保留失败诊断。补真实正常恢复和受影响migrations复验及T070证据，不扩大为新备份平台。依据FR-019/020、US5/AC2、plan恢复前提、既有T058/T060/T061（partial）。
- [x] T076 [US3] **MEDIUM / C08 / 实现缺口**：在`existing_app/client/src/pages/MemoPathPage/memopath-engine.ts`的vitals零步数显示分支区分真实记录steps=0与latest=null/缺失，不改变既有API字段或把零值作健康判断。复核相关显示分支是否同样抹去合法数据，限定修复为已有读取语义，不新增采集/医疗判断；使用来源明确的隔离测试记录分别验证0、正数和无记录，通过真实API读取后在页面核对，记录数据来源与清理及T070证据。依据FR-008/016、US3/AC3、既有T013/T042/T053（partial）。

### 本阶段依赖与完成条件

- T070分两次执行：先登记缺口并纠正当前结论；T068/T069/T071–T076实际修复并完成对应验证后，再收束验收结论。证据不足不得用新增文案或仅通过编译消除。
- 共享`memopath-engine.ts`的任务串行；T068形成地点操作合同/持久化后执行T069，T071先落实异步上下文再整合T072–T074及T076。T075仅操作独立恢复测试目标，不与持久化/重启测试争用数据库。
- 地点与设置修复均需成功、失败及重启证据；权限/隔离仍在服务端独立验证，不用隐藏按钮替代。所有新增条目初始未勾选，原67项不重写、不重排、不取消勾选；本阶段共9项，编号T068–T076。
- 新增任务时结果为`tasks_appended`；2026-10-09实施及适用补验完成，证据见verification.md最终补验。任务完成不代表历史Key暂缓项达标，不声明完整规格验收全部通过。浏览器/定位阻塞与用户暂缓的历史Key单列，不能替代实际代码缺口，也不构成未经同意使用替代方案的授权。
