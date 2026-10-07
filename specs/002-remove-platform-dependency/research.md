# Research: 独立运行能力设计决策

日期：2026-10-04。输入为当前工作区、[spec.md](spec.md)、[source-context.md](source-context.md) 和章程 v1.0.1。技能要求的研究代理已完成只读依赖/运行检查；主代理复核其证据，实际验证结果见 [verification.md](verification.md)。所有未知设计项已决定，无待澄清项；运行阻塞不冒充设计未知。

## R1 保留现有栈与实际迁移

- **Decision**：React 19、Vite 8、NestJS 10、Drizzle 0.44.6 不换框架。Node 24 系列，实施锁定与验证具体版本；当前 Node 24.19.0/npm 11.17.0 可用。`postgres`、`@vitejs/plugin-react` 从传递依赖改为显式直接依赖，新增锁定的 drizzle-kit、tsx；新增版本与 ORM 兼容性须真实检查，不在规划阶段编造确切包版本。
- **Rationale**：package.json、Vite 和本地 DatabaseModule 已使用这些能力；当前类型及构建通过，但安装树仍含平台包。Vite 8 的 Node 下限须修正 engines；选择现有 24 运行线避免换栈。[Vite 8 文档](https://v8.vite.dev/guide/)
- **Alternatives considered**：换框架、降级 Vite、靠平台传递依赖均不能证明独立且增加回归范围。

## R2 依赖与构建预设替代

- **Decision**：以实际继承的 TS、SWC、ESLint、Tailwind 配置为基线，在本地配置显式保留路径别名、decorators、emitDecoratorMetadata、输出结构、CSS 扫描和规则。保持 SWC 构建与单独类型检查；不全局改 package type 以免破坏 Nest/CJS 脚本，可把 Vite/Tailwind 配置改为明确的 .mts/.mjs 形式并验证。
- **Rationale**：tsconfig、ESLint、Tailwind 当前仍直接引用 fullstack-presets；`business-ui` 模板未见页面使用但仍在 `client/**/*` 检查范围。清理前核对导出、动态调用、类型引用及页面；不是按包名整目录盲删。全部平台 packages/脚本在确认替代后去除，再提交一致锁文件。
- **Alternatives considered**：保留平台开发依赖、只从运行代码移除 SDK 都不满足安装/构建无平台。重写 UI 与业务无必要。
- **Install decision**：依据新增的官方来源要求，实施时将当前 `.npmrc` 的 npmmirror 配置与 lock 下载来源同步为官方 `https://registry.npmjs.org/`，保留已锁定且兼容的版本和完整性校验；只针对已确认的平台替代需要调整依赖，不无依据升级 Node/npm 或其他包。本次仅更新文档，不修改应用配置或安装依赖。验收使用 `npm.cmd ci`，不使用 `npx ...@latest`、不依赖旧 node_modules；仅覆盖 registry 参数不能证明 lock 中下载地址已替换，须逐项检查。锁文件不一致必须失败。[npm registry](https://docs.npmjs.com/cli/v11/using-npm/registry/)、[npm ci](https://docs.npmjs.com/cli/commands/npm-ci/)

## R3 独立 PostgreSQL 与迁移

- **Decision**：沿用本地注入符号、postgres-js 驱动、连接池/关闭钩子和 compose 服务，数据库 PostgreSQL 17 镜像锁定 digest、凭据从 `.env.local` 注入。仅 localhost 端口。`drizzle-kit generate/check` 生成并检查提交 SQL，再经 Node 驱动执行受锁保护的 migration；不用平台 schema sync 或 push。
- **Rationale**：现有 SQL 查询可复用；首次库为空，不需兼容未导入的数据库复合类型。平台身份/附件类型改为标准 UUID 审计与归属，未使用附件 helper 确认无引用后删除，公共响应含义不变。新迁移必须可审阅及保存元数据。[Drizzle migrations](https://orm.drizzle.team/docs/migrations)、[Drizzle Kit](https://orm.drizzle.team/docs/kit-overview)
- **Alternatives considered**：创建旧平台复合类型可避免内部查询变化，但继续耦合平台字段并混淆归属；SQLite 换库、原生 Windows PostgreSQL 双路径与用户已选范围不符。此为新库设计，不自动转换已有数据。

## R4 归属与服务职责

- **Decision**：长者显式 `owner_account_id`，设置 `account_id`；`_created_by/_updated_by` 只记实际操作账号，不能充当授权关系。关联资源从 elderId 取得归属和有效授权。Auth 编排注册/会话，Elder 管理长者及关联授权，Family 管关联业务；每个请求传完整可信 principal。
- **Rationale**：当前 `account.createdBy` 平台 owner 已改账号 ID，但演示长者缺创建人。只更换 ownerId 不足以支持已确认独立长者账号，不能把长者 ownerId 伪装成家属以获得全部写权限。
- **Alternatives considered**：共用空归属、按姓名/手机号合并账号、仅 UI 切换角色均不可靠；不引入通用租户/机构体系。

## R5 单活动会话

- **Decision**：保留现有 `{accountId, role, displayName, token}` 和 `x-memopath-token`。随机 UUID token 返回一次，数据库仅存 SHA-256 摘要与绝对到期时间，默认 86400 秒；登录替换旧摘要，退出清空，guard 校验格式/摘要/到期，数据库错误不能变 401 假装用户未登录。浏览器沿用 token 存储并在 me 验证后加载资料，不改变成 cookie/JWT。
- **Rationale**：现有模式适合单机范围，服务端撤销清晰。密码沿用带随机盐的 scrypt 及等长 timingSafeEqual，参数固定并记录（N=16384、r=8、p=1、64 字节结果、16 字节盐）；可改异步调用避免阻塞，不更换已有格式。token 摘要不用于密码存储。[Node crypto](https://nodejs.org/docs/latest-v24.x/api/crypto.html)
- **Alternatives considered**：JWT 加撤销库、Redis、多会话表和 Cookie 改契约都增加无必要的改动；不存明文会话凭据。过期以数据库时间比较，测试不用实际等待 24 小时。

## R6 一对一明确授权

- **Decision**：家属登录后，为自己管理的一位长者及指定真实长者账号创建 10 分钟一次性邀请；随机 32 字节 base64url code，只存摘要。长者登录后预览本人邀请、核对家属/长者摘要并显式确认接受，事务建立关联并消费邀请。双方可撤销；同一 elder/长者账号只有一条 active link，撤销/删除实时影响所有资料查询。邀请不发送真实短信，不把验证码当证明。
- **Rationale**：邀请者经真实认证和所有权检查，接受者与目标账号匹配且明确同意，满足双端授权；姓名、手机与资源编号不是授权。短期一次性高熵码及唯一约束处理错绑和并发；普通与演示账号不可混合关联。
- **Alternatives considered**：手机号自动关联、前端指定 owner、仅家属单方绑定不满足明确授权；多人邀请/机构流程超范围。

## R7 输入、错误、日志

- **Decision**：保留全局 ValidationPipe，补 DTO、UUID 路径/查询和 token 头验证；未知普通字段沿用 strip 并明确记录，owner/审计/权限字段伪造则 400；嵌套必填、长度、范围及日期/时间关系在受信任边界验证。保留嵌套 `error` 响应，客户端优先读取该结构并兼容旧顶层 message；未知错误客户端不含 stack/cause。[NestJS validation](https://docs.nestjs.com/techniques/validation)
- **Rationale**：全局 whitelist 不意味着 DTO 覆盖所有入口。结构化 Nest 日志记录 operation/status/requestId/time/errorCode，客户端 logger 只记录脱敏摘要，不打印 axios config、headers、完整异常对象；每类身份、授权、验证、DB 错误有证据。
- **Alternatives considered**：关闭验证、数据库报错才处理输入、只 console 替换 logger、所有失败都当网络问题不能满足要求。

## R8 配置与地图边界

- **Decision**：进程环境 > `.env.local` > `.env` > 有文档的非秘密默认值；统一 launcher/数据库命令/服务加载。数据库配置必需，地图可选。真实秘密不带 VITE_ 前缀；地图浏览器 Key 外部注入并限制使用，REST 调用沿用现有浏览器配置方式，不增加新平台网关。
- **Rationale**：根 `.gitignore` 已忽略 `.env`、`.env.*` 并保留 example，`git check-ignore` 确认生效，不能误报只忽略 `.env.local`。VITE_ 值会进入产物，产物/备份不提交；不能把浏览器地图 Key 承诺为浏览器不可见秘密。[Vite 环境变量](https://vite.dev/guide/env-and-mode)
- **Alternatives considered**：将连接密码公开给 Vite、使用 SUDA 平台变量、地图失败阻断认证均排除。源码及历史密钥检查仅输出路径/规则命中，不回显值；历史重写另行安排。

## R9 两类演示

- **Decision**：前端演示显式进入且无业务 API 写入；演示账号显式登录、用相同认证与权限体系、真实数据库保存，账号 is_demo 标识决定隔离边界。初始化整个演示数据集在事务内幂等完成；禁止错误密码触发密码重置或半成品演示初始化。
- **Rationale**：用户确认保留两类；演示登录失败不能自动转前端成功。现有模拟叫车可改状态并真实保存，但反馈明确模拟，不代表外部叫车成功；现有告警/行踪/体征样例保持模拟来源，普通账号没有虚构默认“真实”记录。
- **Alternatives considered**：去掉全部演示、普通失败自动降级、演示放开跨账号权限均违背已确认范围。

## R10 回滚与验证

- **Decision**：每版本提交回滚说明；停写并用 pg_dump custom format 保存备份/迁移清单/匹配应用版本。失败优先恢复到新库验证后切换，并使用匹配旧应用构建；不虚构 `drizzle-kit down`。备份在容器内写文件再 compose cp，不用 PowerShell 重定向二进制。迁移后新数据先隔离导出并明确处置，不自动重放。[PostgreSQL 17 pg_dump](https://www.postgresql.org/docs/17/app-pgdump.html)、[pg_restore](https://www.postgresql.org/docs/17/app-pgrestore.html)
- **Rationale**：空库起步仍需测试升级/恢复，方案必须验证归属、字段和应用兼容；直接删卷不能叫回滚。
- **Alternatives considered**：只有 down SQL 而不处理备份/迁移账本、自动清空非空库、在真实平台数据上试迁移均排除。当前 Docker 未就绪，数据库运行验收待独立环境，不阻止完整设计。

## 实施决策复核（2026-10-06）

React/Vite/NestJS10/Drizzle保留，官方锁定依赖及普通构建配置实现；Node24.19/npm11.17复用。
认证/归属/会话/明确照护授权与服务职责沿原结构补齐；0000归档保留，0001增量及官方备份/新库恢复、旧会话撤销已实演。
恢复结构比较规范化PostgreSQL官方重解析的等价字面数组转型与布尔分组，仍拒绝被修改的约束。
官方审计新增proxy-addr严重问题，允许的补丁2.0.7→2.0.8仅变该锁项；不换Nest主版本。其他审计风险及废弃库保留记录，未声称安全风险全消除。
历史中仍有当前高德Key，用户要求暂缓轮换及历史清理；不自动重写历史，不以私有仓库宣称秘密审计通过。
以上是实施证据更新；下文原“规划阶段未安装”等表述仅描述2026-10-04设计时点，最终状态以verification.md为准。
