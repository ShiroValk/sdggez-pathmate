# PathMate / MemoPath 独立本机运行

前端为React + Vite，后端为NestJS，使用Drizzle和独立PostgreSQL。
安装、构建及已有认证入口不再要求妙搭账号、SDK、网关或平台数据库。
当前0001真实账号/照护授权/持久化、25条契约、演示及官方备份/新库恢复已分别验证；最终干净全量复验见verification.md，历史Key按用户决定暂缓处置。
实际验收状态见 `../specs/002-remove-platform-dependency/verification.md`，编译成功不代表业务验收通过。

## Windows环境

在 `existing_app` 目录使用PowerShell。项目要求Node 24（>=24且<25）和npm>=10；
已验证Node24.19.0/npm11.17.0，兼容版本直接复用，不无故升级。使用 `npm.cmd` 避免脚本执行策略限制。
PostgreSQL由Docker Desktop的WSL 2后端运行；应用仍在Windows运行，无须迁入WSL目录。
代理负责检查、安装缺失工具、官方来源及签名验证、引擎/Compose和数据库就绪检查。
BIOS虚拟化、系统重启、协议界面或受限权限需要用户操作时说明具体原因和恢复步骤，不自动重启电脑。

```powershell
node --version
npm.cmd --version
wsl --version
docker version
docker info
docker compose version
npm.cmd ci
```

下载来源为官方npm registry，锁文件固定可复现依赖；不使用妙搭CLI或旧平台初始化命令。
若找不到命令，先检查实际安装路径和当前终端PATH，不把PATH缺失当作未安装。

## 本机配置

首次创建配置；已有 `.env.local` 不覆盖：

```powershell
if (-not (Test-Path -LiteralPath '.env.local')) {
  Copy-Item -LiteralPath '.env.example' -Destination '.env.local'
}
git check-ignore .env.local
```

在不提交的 `.env.local` 填写POSTGRES_PASSWORD、DATABASE_URL及独立DATABASE_URL_TEST。
默认POSTGRES_USER/POSTGRES_DB为pathmate。DATABASE_URL指向本机5432的pathmate，
测试连接指向不同的pathmate_test库；连接密码必须进行URL编码并与数据库密码一致。
不要把真实配置发送到聊天、写入源码、命令参数或Git。配置优先级为进程变量、.env.local、.env。
SERVER_HOST限loopback，SERVER_PORT默认3000；会话默认86400秒，日志级别默认info。

## 数据库初始化与0001迁移

```powershell
docker compose --env-file .env.local up -d db
docker compose --env-file .env.local ps
docker compose --env-file .env.local exec -T db pg_isready -U pathmate -d pathmate
npm.cmd run db:check
npm.cmd run db:migrate
npm.cmd run db:status
```

自定义数据库名或用户名时同步替换命令。Compose固定PostgreSQL17镜像digest并保留命名卷。
db:check从Windows使用真实配置连接并检查迁移完整性；空库允许初始化，未知非空库及账本漂移拒绝操作。
迁移链保留0000和0001；当前应用要求0001。重复迁移不重复写入，启动不会自动建表。
数据库结构、SQL、快照和journal位于 `server/database/migrations/`。
常规停止使用compose stop/start或down，不加 `-v`，不能通过删除卷完成恢复。
db:backup/restore/verify已实现并真实验证；匹配0000归档及最新构建拒绝旧结构通过，全部恢复会话撤销。
restore在复制和建库前检查归档可读、备份目录权限、PostgreSQL数据目录写权限及Docker临时/数据卷空间；
最低容量按归档3倍加64MiB估算，无法确认时先停止，不清理源库/卷或改变权限。详见migrations/README.md。

## 开发及构建后启动

```powershell
npm.cmd run lint
npm.cmd run build
npm.cmd run dev
```

开发访问 http://127.0.0.1:5173/memopath，/api代理真实Nest后端。
后端数据库预检失败时非零退出，同时停止Vite；Ctrl+C停止开发。
构建本身不要求连接数据库或地图Key。

```powershell
npm.cmd start
```

构建后访问 http://127.0.0.1:3000/ 或 /memopath，Nest同源提供dist/client及API。
终端需要保持运行，Ctrl+C会停止应用；停止后浏览器连接拒绝不代表地图故障。
未知API和不存在静态资源返回JSON404，不回落为成功的SPA页面。
`dev:client`和`preview`仅提供前端，不能代替真实后端生产启动。
缺失/非法配置、数据库不可达或结构不兼容时启动失败，不关闭认证或返回模拟成功。

## 地图与演示边界

可选VITE_AMAP_KEY通过不提交的本机配置注入。VITE变量进入浏览器产物，应在高德控制台限制来源。
更改后开发服务重启，构建后运行需重新build:client并刷新；不把安全密钥放入VITE变量。
未配置或高德加载失败会明确显示地图不可用，其他账号、设置和资料流程仍可运行。
定位权限拒绝、位置不可用和30秒逾时分别提示；不采用模拟当前位置。
当前实现同时使用JS API及REST接口，同一个Key是否被高德允许须逐项真实验证，不从Key字符串猜类型。
2026-10-05用户Edge定位、地图及一次驾驶路线验收通过；内置浏览器定位逾时另记环境阻塞。
地图起点为当前浏览器设备，不能宣称为长者设备远程追踪；高德显示不证明双端同步。

真实账号需注册并使用自己的密码。demo/demo1234是明确演示账号，使用真实会话及独立演示资料，
不等于新账号默认密码。前端演示有持续标识；天气、叫车、支付、告警和通知展示不代表真实服务。
demo套件验证真实认证/隔离/重启和禁用旧会话；前端演示经页面操作及数据库写计数增量0验证。

## 可复现测试

测试只使用独立DATABASE_URL_TEST，拒绝开发库、非本机及恢复库。测试库尚未存在时创建一次：

```powershell
docker compose --env-file .env.local exec -T db createdb -U pathmate pathmate_test
npm.cmd run test:integration -- --suite config
npm.cmd run test:integration -- --suite startup
npm.cmd run test:integration -- --suite auth
```

测试库已存在时不重复createdb，也不清空数据库或卷；fixture只清理自身合成资料/唯一临时数据库。
九套件均已提供。当前0001权限、输入、持久化、认证、startup/config、25条契约及demo已分别通过；migrations实际覆盖空库、漂移、并发/失败、官方备份恢复及撤销旧会话。最终全量干净环境复验另见verification.md。
无参数test:integration会请求全部九套件，缺套件会失败，不代表整个功能验收通过。
验收须分别记录API、页面、保存后重启、两账号隔离、拒绝输入及恢复演练的通过/失败/环境阻塞。
完整说明见 `../specs/002-remove-platform-dependency/quickstart.md`。
## 备份、升级与回滚

先停止所有应用写入进程（开发终端Ctrl+C、生产终端Ctrl+C），关闭数据库管理工具的连接。
备份命令拒绝源库的其他连接，并在转储期间锁住业务写入；不自动终止连接。确认Docker引擎/Compose可用，
容器与本机有容纳转储及一份恢复副本的空间、当前用户有文件和建库权限。备份包含个人资料及哈希，保留在被忽略的本机目录，不上传或提交。

```powershell
npm.cmd run db:backup -- --output .local-backups/before-0001.dump
npm.cmd run db:migrate -- --to 0001
npm.cmd run db:status
npm.cmd run build
npm.cmd start
```

backup生成官方-Fc归档及.json清单，SHA-256/版本/锁文件/数量/结构/字段哈希，真正隔离恢复验证完成才标verifiedRestore。
路径只能在.local-backups，已存在文件拒绝覆盖；超时、空间/权限或校验失败非零，不继续升级。
升级失败先保持停写并保留日志；升级后业务失败需额外保存故障库0001备份，再恢复升级前0000到新库：

```powershell
npm.cmd run db:backup -- --output .local-backups/fault-0001.dump
npm.cmd run db:restore -- --input .local-backups/before-0001.dump --database pathmate_restore_before0001
npm.cmd run db:verify -- --database pathmate_restore_before0001
node scripts/verify-baseline.cjs --restored pathmate_restore_before0001
```

restore只创建尚不存在的pathmate_restore_*库，不支持force，不覆盖源库、卷或自动改应用连接；
归档完整性、表列/约束/索引、FK、字段/数量/owner、角色/演示域及关联状态必须吻合。
全部恢复会话强制撤销，恢复后必须重新登录；核对把这一变化单列为安全差异。
恢复失败保留新目标供诊断，不自动清空重试，另选新名称。
0000必须使用本机已归档.local-baselines/0000/app的匹配产物，不能用最新代码重建冒充旧版。
verify-baseline核对归档哈希与恢复receipt，在恢复库只新增并清理自身随机验收资料；后续可再db:verify确认。
手动切换时只在不提交的配置中更改DATABASE_URL并运行匹配版本，恢复之前保持原连接不变。
0001之后新地点字段、账号/授权及其他新增写入保留在故障库/备份另行评估，不承诺零损失或自动合并。
最终转储恢复点及新增差异见verification.md；普通compose down不带-v。

收束修复的可复现页面夹具、故障/延迟控制、独立数据库正常重启和定位缓存边界命令见 `../specs/002-remove-platform-dependency/quickstart.md` 的“收束验收夹具与真实数据库重启”。地点编辑/删除仅在真实成功后更新列表，失败保留草稿；设置使用账号私有的待保存状态及串行队列，连续语言/语音/布局锁修改最终读回，不把演示内存状态显示为写库。地图搜索按身份、页面和搜索序号拒绝旧回调；定位缓存最长5分钟，明确重试/重新规划要求真实新定位。具体通过、失败和浏览器权限限制分别见verification，实施任务完成不代表历史Key暂缓项达标。
