# Operations Contract: 配置、命令与诊断

日期：2026-10-06。本文件定义操作合同；当前全部db/test入口已实现，逐项运行结果见verification.md，命令存在不等于最终交付通过。全部 npm 命令工作目录 `existing_app`，PowerShell 使用 npm.cmd；由现有 scripts/run.cjs 或新 scripts/db.cjs 启动，不用POSIX内联赋值语法。

## 配置

示例见 [.env.example](.env.example)。真实值仅写 `existing_app/.env.local` 或注入进程环境；根 `.gitignore` 已覆盖 `.env`、`.env.*`，例外允许 example。增加 `.local-backups/`、测试输出及证据中秘密的忽略规则，检查已跟踪文件不能只依赖ignore。进程 > .env.local > .env > 非秘密默认；如保留Vite原生mode文件加载，说明其优先级并确保不加载平台变量，不能使前后端使用不同后端地址。

| 配置 | 必需/默认及验证 | 适用与生效 |
| --- | --- | --- |
| POSTGRES_USER / POSTGRES_DB | Compose需显式提供；示例pathmate，简单标识≤63，不使用系统postgres库当业务库 | 容器初始化；已有卷改变量不自动改已有用户/密码 |
| POSTGRES_PASSWORD | 必需非空，无默认真实密码 | Compose初始化，不打印config展开内容；新卷设置/已有库改密需单独操作 |
| DATABASE_URL | migrate/start必需，postgresql/postgres URL，非空合法用户名/密码/数据库；本次仅127.0.0.1/localhost | Node启动读取；禁止在日志或VITE_变量输出，重启生效 |
| DATABASE_URL_TEST | 集成测试必需，独立localhost数据库名以_test结尾且不同开发/恢复库 | 测试程序验证目标后建测试数据，不修改开发库 |
| SERVER_HOST / SERVER_PORT | 默认127.0.0.1/3000；本次拒绝非loopback监听，port整数1–65535 | 服务启动、Vite/preview代理；不包含LAN/公网 |
| SESSION_TTL_SECONDS | 默认86400，整数60–604800 | 注册/登录生成新会话使用；过期测试以隔离DB控制时间验证 |
| CARE_INVITE_TTL_SECONDS | 默认600，整数60–1800 | 新邀请使用；旧邀请保留原expiry |
| LOG_LEVEL | error/warn/info/debug，默认info | 服务及客户端wrapper的允许级别；debug也须脱敏 |
| DEMO_ACCOUNT_ENABLED | true/false，默认true，精确解析 | 控制显式演示账号种子/登录；关闭时演示账号不可登录或继续旧会话，前端纯演示仍可独立选择 |
| VITE_AMAP_KEY | 可选，空则地图不可用 | 外部注入，不在源码/历史；Vite build进入浏览器产物，更改需重建并重启；浏览器Key不是保密服务端密钥 |

配置错误须给变量名和可操作提示，不回显值；数据库不可达和版本不匹配不监听业务端口并非零退出。连接成功后的表、列及迁移版本检查必需。build不依赖运行数据库和必需连接配置，能在无Key环境完成。非空URL但数据库写入失败不能返回保存成功。

## npm命令合同

| 命令 | 行为 / 预期 |
| --- | --- |
| ci | 标准npm锁定安装，package/lock不一致失败，不运行平台init |
| type:check / lint / build | 延续现有入口，独立TS/规则/构建；输出dist/server/main.js和dist/client/index.html；build不能替代typecheck |
| dev / dev:server / dev:client | 便携launcher，dev双进程一方退出停止另一方；Vite5173代理本地3000，server库未就绪明确退出 |
| start | NODE_ENV=production运行构建产物，同源API及SPA；localhost3000，不等同公网部署 |
| preview | 仅前端产物预览及本地API代理，不自动启动真实后端，不能作为完整生产服务证据 |
| db:generate | 锁定本地drizzle-kit生成SQL/快照，唯一目录server/database/migrations/及其meta/；不执行DB修改，不能使用npx latest |
| db:check | 检查迁移链、SQL/快照/journal完整性，并从Windows通过DATABASE_URL带凭据连接执行SELECT 1，无写库；空目标schema无账本时报告待初始化，未知非空schema或已有账本漂移失败；失败不继续升级，应用结构兼容另由启动检查判定 |
| db:migrate -- [--to 0000或0001] | 无--to到已提交最新版本；只能前进，迁移锁/账本/校验和核对、事务执行及非空未知库保护；重复执行无变化，配置/漂移失败非零 |
| db:status | 输出数据库名称、版本、待执行版本和漂移结果，不输出URL密码 |
| db:backup -- --output PATH | 停写前提，容器内pg_dump -Fc写临时文件再复制到本地；SHA-256、schema/app版本及备份清单；输出只显示文件路径/校验和 |
| db:restore -- --input PATH --database NAME | 只恢复到新建的pathmate_restore_*库；存在则拒绝，无--force覆盖能力；核对archive、迁移账本、FK/数量/owner，统一撤销恢复的会话；输出库名及结果，不自动切换应用 |
| db:verify -- --database NAME | 核对schema/FK/归属/演示域/关联唯一、设置唯一和备份清单数据，不包含敏感正文输出 |
| test:integration -- --suite NAME | Node runner/tsx执行真实隔离库套件：startup、auth、permissions、validation、persistence、migrations、config、contracts、demo，失败非零；--suite startup运行startup.test.ts，无参数必须包含全部九套件 |

`--to`仅为验收构建旧基线的明确版本支持，不提供任意SQL执行。db工具使用不含凭据的参数与容器环境身份，避免密码出现在进程命令行；使用spawn数组参数而非拼接shell。无docker/文件/有效配置时输出可操作错误。备份/恢复/核对由scripts/db.cjs委托scripts/recovery.cjs实现。backup拒绝其他源库连接且持有写锁；真正隔离恢复通过后才标记verifiedRestore。只接受.local-backups内非链接的平面.dump文件，失败保留记录和新目标，不自动覆盖。verify需要restore receipt与原始备份清单；全部旧会话撤销是唯一预期字段差异。官方重解析的等价字面数组转型和AND/OR分组规范化后比较，运算符/值/外键动作保留。

Compose工具在本目录存在`.env.local`时使用该配置文件，否则使用进程环境变量，不要求干净副本复制真实配置。隔离副本复用已有容器时必须显式设置`COMPOSE_PROJECT_NAME=existing_app`（本仓库原Compose项目名），避免根据副本目录名误找另一项目；这是验收进程配置，不改变应用数据归属或数据库选择。正常用户运行仍按quickstart在existing_app目录操作。

## 日志与错误

- Nest记录结构化单行JSON：UTC time、level、requestId、operation、result、httpStatus/errorCode、必要内部账号UUID（不用phone/name）。认证/退出成功失败、权限/验证拒绝、DB故障、配置/启动及迁移结果均记录。
- requestId由服务端生成，合法且长度受限的来访标识可选接受；不能原样记录任意请求头。响应头x-request-id供关联，不改变原JSON字段结构。浏览器只记录错误码、状态、requestId及固定摘要。
- 禁止记录password、原token、邀请code、完整Authorization/headers、DATABASE_URL、Key、用户资料正文或完整axios error；SQL/异常日志也要脱敏。未知异常只在内部保留脱敏堆栈，客户端通用错误。
- stdout/stderr为默认日志位置，文件输出由操作者定向并不提交，保留时间不作为新业务功能；验收确认错误不会被控制台失败或日志写失败转为成功。

## 平台退出证据

实施须对source-context的DEP-01–10逐项记录：直接与间接依赖、静态引用/动态入口、替代能力、实际成功/失败结果及限制。干净npm ci之后执行依赖树检查，零个必需@lark-apaas包；锁文件、TS/样式/lint配置、launcher无平台工具。产物与请求检查分别记录，不把grep零命中当真实运行成功。确认未使用的business-ui才删除；若发现使用者，保留其用户结果并独立替代，不能偷偷删除受支持流程。
