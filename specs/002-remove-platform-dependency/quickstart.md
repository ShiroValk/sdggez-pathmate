# Quickstart & Validation: Windows 独立运行

更新：2026-10-06。0001认证/权限/输入/重启持久化、25条契约、双演示边界及自动备份/恢复已实现并逐项验证；config/startup已对齐0001。干净Windows源码快照npm ci/lint/build及9套件18测试最终通过（首次迁移套件失败，修复后仅重测受影响项）。无Key生产页面续验通过。历史Key存在，用户决定暂缓轮换/清理，不声明全部规格或秘密审计通过；浏览器定位按通道分别记录，全部证据见verification.md。

## 前提与PowerShell

应用在Windows本机运行，浏览器本机访问；Docker Desktop使用WSL 2承载PostgreSQL，不要求把项目搬入WSL。实施阶段由代理检查、安装本次必需且缺失的工具、验证并启动数据库；能自动完成的步骤自行执行，不把环境准备全部交给用户。环境前置任务按 [plan.md](plan.md) 的 ENV-01–ENV-05 执行，已安装兼容工具复用；用户操作及权限边界如下。

代理先检查Windows版本/架构、虚拟化状态、WSL版本、标准和用户安装目录、PATH、Node/npm兼容性、Docker引擎与Compose及端口占用。工具从 [Docker官方Windows安装说明](https://docs.docker.com/desktop/setup/install/windows-install/)、[Microsoft官方WSL说明](https://learn.microsoft.com/en-us/windows/wsl/install) 获取；核对当前系统要求与安装选项，验证发布者签名或官方校验和，记录来源、版本和安装结果。若Node/npm确实缺失或不兼容，使用 [Node.js官方下载](https://nodejs.org/en/download) 的兼容版本。PostgreSQL使用 [Docker官方postgres镜像](https://hub.docker.com/_/postgres)，记录版本和digest，不从不明镜像或第三方安装脚本获取工具。

已有Node/npm兼容时直接复用，不无故升级；当前检查记录中Node 24.19.0/npm 11.17.0可用于类型检查和构建，但不代替独立安装验收。PATH缺失不等于工具未安装，先使用实际安装目录修复当前进程PATH，安装确需刷新后重开终端。以下命令不更改系统执行策略；目录须按检查结果替换：

```powershell
Set-Location 'C:\Users\RedV\Documents\Code\sdggez-pathmate\existing_app'
$env:PATH = 'C:\Program Files\nodejs;' + $env:PATH
node --version
npm.cmd --version
wsl --version
wsl --status
docker version
docker info
docker compose version
```

预期Node/npm兼容、WSL 2满足Docker要求、Docker客户端和服务端均就绪，docker info和Compose版本命令成功；安装后代理启动Docker Desktop并复检，不把客户端存在或安装退出码为0当引擎可用。其他接手者将仓库绝对路径换为自己的checkout。

仅安装缺失的必需项，采用官方支持的自动安装方式与不自动重启选项；安装过程中出现以下边界时，代理给出实际原因和具体操作，保留未完成状态，并继续不依赖该步骤的工作：

| 需用户介入的情况 | 说明及操作要求 | 完成后代理复检 |
| --- | --- | --- |
| BIOS/UEFI虚拟化未启用 | 根据检测结果说明所缺能力，提供适用的厂商官方步骤和设置名称，请用户进入固件设置启用；不擅自改固件或重启 | 重新检查虚拟化、WSL 2和Docker引擎 |
| Windows功能或安装程序要求重启 | 记录需要重启的组件、安装状态和恢复入口，说明保存工作后由用户自行安排重启；未经用户明确指示不重启电脑 | 重新检查安装状态、版本、WSL 2及Docker，避免重复安装 |
| 必须由用户操作的界面 | 指明当前界面、需点击/确认的内容及原因，例如首次Docker Desktop启动的协议确认；可由代理操作的界面自行处理 | 检查界面完成后的引擎和Compose实际输出 |
| 提权、网络或工具权限限制 | 明确被限制的操作及实际错误；按可用工具申请必要权限，仍不能执行时提供官方安装入口或具体命令、终端权限要求，不绕过限制 | 核对安装来源与结果，重新执行相关检查 |

若必需项仍未就绪，记录阻塞及待完成步骤，不标为验收通过；WSL/Docker恢复后继续原任务，不自动切换模拟数据库。

## 安装与配置（A01）

全新安装由代理在独立checkout或明确标识的工作区快照执行，不能用残留node_modules证明独立。已依据实际平台依赖清单调整必要包，.npmrc和锁文件下载地址均为官方 `https://registry.npmjs.org/`，保留兼容版本和integrity。仅覆盖registry参数不能替换锁文件已有地址，仍须复核实际来源。只用锁定安装，错误不能以普通npm install掩盖。[npm官方registry说明](https://docs.npmjs.com/cli/v11/using-npm/registry/)

```powershell
npm.cmd config get registry
npm.cmd ci
npm.cmd run type:check
npm.cmd run lint
if (-not (Test-Path -LiteralPath '.env.local')) {
  Copy-Item -LiteralPath '.env.example' -Destination '.env.local'
}
```

预期registry为官方来源，npm ci成功且锁文件未被无依据改版。Copy仅用于尚无.env.local的新环境，已有配置先保留不覆盖。实施应把 [配置模板](contracts/.env.example) 落入应用示例；代理生成本地数据库密码并安全写入不提交的配置，用户也可通过本地编辑器填写，不在聊天中索取或展示真实凭据。DATABASE_URL形如 `postgresql://pathmate:<URL编码密码>@127.0.0.1:5432/pathmate`，测试连接指向独立pathmate_test库；上述形式是结构说明，不是可直接使用的凭据。POSTGRES_PASSWORD和连接密码须一致，真实值不贴到聊天、不提交。可选VITE_AMAP_KEY为空也应运行。

```powershell
git check-ignore .env.local
git ls-files .env .env.local
npm.cmd ls --all --json | Out-File -Encoding utf8 '.dependency-tree.local.json'
```

预期env.local被忽略且没有真实配置被跟踪；实现须忽略依赖树本地报告并扫描其中必需平台包，不能只靠直接依赖清单。secret扫描的实际规则/命令由验证脚本提供，只报告路径/规则，不打印命中值。`npm ls` 非零时先诊断依赖树，不直接认定合格。

## 空库、构建和启动（A02）

以下db:check/migrate/status命令当前已实现。代理在底座验证通过、Compose和本地配置准备完成后启动数据库并完成就绪检查；Compose从本地配置读取凭据，名为db的服务继续使用持久卷。

```powershell
docker compose --env-file .env.local up -d db
docker compose --env-file .env.local ps
docker compose --env-file .env.local exec -T db pg_isready -U pathmate -d pathmate
docker compose --env-file .env.local exec -T db psql -U pathmate -d pathmate -v ON_ERROR_STOP=1 -c "SELECT 1"
npm.cmd run db:check
npm.cmd run db:migrate
npm.cmd run db:status
npm.cmd run build
npm.cmd run dev
```

预期db健康、pg_isready成功、SELECT 1返回1；容器内查询不证明Windows应用凭据可用，db:check还须从Windows通过DATABASE_URL执行真实带凭据连接及SELECT 1，并检查迁移SQL/快照/journal完整性。空目标schema无账本时报告待初始化，未知非空schema或已有账本漂移须失败，不写库；应用结构兼容另由启动检查判定。当前迁移账本0001、重复db:migrate无变化；完整US3业务失败场景仍需验收，不能只凭数据库端口或连接成功宣称业务就绪。SQL、快照、journal及恢复说明统一存于 `existing_app/server/database/migrations/`。构建无需数据库连接或地图Key，Vite `http://127.0.0.1:5173/` 和 `/memopath` 提供页面、/api代理真实后端。默认数据库用户/库名pathmate；自定义名称时同步上述命令，不把密码放命令参数。dev一侧失败后另一侧退出，不留伪就绪页面。

Ctrl+C停止开发，再执行构建产物启动：

```powershell
npm.cmd start
```

本机 `http://127.0.0.1:3000/`、`/memopath` 及刷新均成功；未知 `/api/not-a-route` JSON404；不存在asset不得返回SPA HTML。preview仅前端预览，不当完整生产验收。这里production指已构建本机应用，不是公网发布。

当前新构建和迁移账本预期为0001；0000归档只用于匹配旧库恢复，不用新构建替代。缺Key不会阻止构建或账号功能。高德Key只放本机配置，更改后重启开发服务或重新build:client并刷新；VITE变量进入浏览器，安全密钥不能以VITE变量提交或分发。2026-10-05用户Edge真实定位、地图及一次驾驶路线通过，内置浏览器定位逾时另记环境阻塞；地图蓝点为当前浏览器设备，不代表长者远程位置。

## 真实数据库测试准备

启动合同的显式验收入口已经实现；当前无参数入口包括全部九套件，但其中contracts/migrations/demo三套件尚未实现，会如实非零退出，不能当作完整验收通过。已实现的入口为config、startup、auth、permissions、validation、persistence；startup/config旧0000 fixture待最终复核。执行前确认与fixture端口冲突的手动进程；不得停止不属于代理的进程。

```powershell
npm.cmd run test:integration -- --suite startup
npm.cmd run test:integration -- --suite config
npm.cmd run test:integration -- --suite auth
```

上述测试需先完成下述独立测试库准备；配置缺失/停库等失败场景由隔离fixture控制。实施顺序为环境与基础、US2账号/服务适配、US1启动验收、0000基线归档，再进行US3的0001变更；以下完整运行指南描述最终0001状态，不要求中间0000阶段提前通过完整业务验收。

在同一容器另建pathmate_test（已存在则检查目标，不覆盖）：

```powershell
docker compose --env-file .env.local exec -T db createdb -U pathmate pathmate_test
npm.cmd run test:integration
```

测试runner只使用DATABASE_URL_TEST，先验证localhost、_test后缀及不等于开发库，独立schema/事务fixture清理后重建测试数据；不要直接清空开发数据库。各测试密码和账号为合成测试输入，不代表真实用户数据；禁止发送短信、拨打急救电话或真实通知。runner要输出suite结果、expected/actual、requestId、数据一致性核对且不显示token/邀请code/密码。

## 验收矩阵（A03–A12）

接口和权限详见 [contracts/api.md](contracts/api.md)，输入/关联见 [data-model.md](data-model.md)。下列矩阵保留全部最终要求；九套件与0001关联已实现并分别验证，最终完整复验单列。前端可观察行为另行在浏览器逐项记录，不能用API通过代替UI通过。

| 编号 / 命令 | 正常场景 | 失败和边界 / 预期 |
| --- | --- | --- |
| A03 `test:integration -- --suite auth` | 合成family A/B、elder E注册；正确密码登录、me；family注册初始化其长者，elder显示待关联 | 8字以下密码400、重复409、并发1成功1冲突无孤立资料、错误密码401、空账号拒绝；旧token被新登录替换、到期401；不进入演示 |
| A04 同auth套件 +浏览器 | 正常logout，本地清缓存，再使用旧token401 | 停服务后退出清本地但提示撤销未确认；重启后确认旧token仍受原有效期规则，不谎称已撤销 |
| A05 `... --suite permissions` | A为自己的长者向E创建邀请，E预览并显式确认；E仅本人读取/模拟call，双方可撤销 | B访问A全部资源及聚合拒绝；E改长者/联系人/行程/围栏/地点403；未关联、错目标、错role、跨demo域、过期、重放、并发关联拒绝；撤销后旧会话无法继续访问；同名/手机号不自动绑定 |
| A06 `... --suite validation` | 原合法调用样例、可选空字段、嵌套、中文/emoji输入 | 每入口正文/路径/查询/头、未知权限字段、类型/长度/枚举、真实日期/时间关系、坐标范围/缺一项；明确400或合同约定404，前后库无变化 |
| A07 `... --suite persistence` +浏览器 | 保存长者、联系人、行程、设置、围栏、含真实测试坐标地点，刷新/重登/应用重启、容器stop/start | 逐字段及FK/owner一致，不能以0/空默认代替提交值；保存中停库/断网失败无成功提示、复合写入回滚 |
| A08 `... --suite config` +启动试验 | 合法配置正常启动；无地图非地图全流程通过 | 必需URL空/非法、端口非整数/非loopback、库不可达、少表少列/版本错误非零退出；无Key/无效Key/定位拒绝明确地图不可用，无secret输出 |
| A09 `... --suite contracts` +浏览器 | 全部25条现有接口的合法请求/结构/默认/角色样例，页面入口/流程回归 | 服务端嵌套error客户端可读，401/403/404/409/503正确反馈、未知异常无stack；显式不合法elderId不得fallback到另一长者 |
| A10 `... --suite migrations` | 空库0000、测试资料、备份、升级0001、重复执行、恢复0000并用匹配构建验证 | 未知非空库拒绝、不静默覆盖；并发迁移锁、账本漂移拒绝、中断回滚；恢复数据/版本/归属一致、恢复会话全部撤销 |
| A11 日志/依赖/secret检查 | 认证、退出、权限、验证、DB故障与迁移日志有time/operation/result/requestId | 脱敏日志可定位错误，无password/token/code/Key/个人正文；源码、历史、锁文件/产物/运行请求逐项平台/密钥检查；历史暴露单独处置不复制值 |
| A12 `... --suite demo` +浏览器 | 显式前端演示无业务DB写入；demo账号真实认证/保存/重启读回 | 演示错误密码401且不重置密码、无自动失败fallback；普通和demo资料双向隔离；模式切换无缓存/授权带入；叫车/SOS/告警/定位仍明确模拟 |

正常持久卷重启命令：

```powershell
docker compose --env-file .env.local stop db
docker compose --env-file .env.local start db
```

随后重启应用并重新登录核对保存数据。普通停止可用compose down但不加-v；不得删除卷来演示“恢复”。数据库中断测试只在独立验收环境执行，不影响用户真实数据。

## 迁移与回滚演练

下面命令已实现并实演。backup/restore/verify及指定版本--to 0000/0001均有运行证据；执行前满足停写与新恢复库要求。专用测试库先迁移到0000，保存匹配0000的应用构建及lock版本，建立代表性测试资料；运行目录仍为existing_app，不能拿本地开发库替代测试目标。使用独立进程环境把DATABASE_URL设为测试连接，禁止回显连接字符串。升级前Ctrl+C停应用写入。

```powershell
npm.cmd run db:migrate -- --to 0000
npm.cmd run db:backup -- --output .local-backups/before-0001.dump
npm.cmd run db:migrate -- --to 0001
npm.cmd run db:status
npm.cmd run db:migrate
npm.cmd run db:restore -- --input .local-backups/before-0001.dump --database pathmate_restore_acceptance
npm.cmd run db:verify -- --database pathmate_restore_acceptance
```

预期backup生成custom archive、校验和及版本清单，已恢复archive预验可读；restore只接受尚不存在的恢复库，撤销其所有会话并不自动切换应用。按data-model的数量/归属/FK/字段清单验证后，修改不提交的DATABASE_URL指向恢复库，使用保存的0000构建登录/退出/隔离及保存验证；最新0001构建应明确拒绝0000 schema，不能拿启动失败认定备份坏了。

如果故障版产生新数据，先完整备份故障库并记录新增地点/关联差异，隔离保留等修复后再处理；不承诺自动回灌或零损失。无备份、无匹配构建、无隔离验证时，回滚验收标未通过，不执行覆盖恢复。每次迁移的具体回滚说明必须随SQL版本提交。

## 记录与完成

环境准备单独记录ENV-01–ENV-05：检查结果、复用的Node/npm、官方来源、发布者/校验和验证、安装版本与结果、WSL 2状态、Docker服务端与Compose结果、数据库就绪及Windows真实连接结果。用户操作或重启待办须记录具体原因、步骤、完成后的复检结果；未完成时保持阻塞，不将说明或CLI存在当通过。安装记录及错误输出脱敏，不含本地配置值。


每项记录版本/工作区快照、Node/npm/Docker/镜像digest、准确命令、脱敏输入、预期、实际、证据与清理范围。静态、已运行通过、失败、阻塞分开；干净安装、全部权限/输入/保存、重启和恢复强制项必须通过才交付。地图缺有效Key时记录有效地图路径未验证，缺配置的非地图路径仍必须通过。全部与FR/SC关联，不以本次计划完成宣称001评估完成。

## US4/US5 已实现入口与恢复验收（2026-10-06）

contracts/demo/migrations三套件已实际通过；详见verification.md。前端演示写计数0经真实页面核对，demo使用真实认证和隔离保存。
当前所有九套件文件已存在；无参数执行全部，任何失败非零。最终干净环境全量复验仍单列。
备份/升级/恢复完整可执行步骤见existing_app/README.md“备份、升级与回滚”和migrations/README.md。
停写/关闭池后按顺序执行db:backup -- --output .local-backups/before-0001.dump，db:migrate -- --to 0001；
回滚先另存fault-0001.dump，再db:restore -- --input .local-backups/before-0001.dump --database pathmate_restore_before0001，
db:verify -- --database pathmate_restore_before0001，node scripts/verify-baseline.cjs --restored pathmate_restore_before0001。
均在existing_app使用npm.cmd run；restore只创建新库、撤销旧会话、不切换连接，0000使用匹配归档。
容器/磁盘空间、建库/文件权限、原连接和旧构建必须可用；发生失败不继续启动，不删除卷。
恢复后的重新登录与升级后新资料的单独隔离不是可省略步骤，不能把恢复旧点声明为无数据损失。
