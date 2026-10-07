# 平台替代需求质量 Checklist: 移除妙搭平台依赖并补齐独立运行能力

**Purpose**: 审阅平台替代范围、认证权限、数据隔离、兼容性、配置缺失行为、迁移回滚及验收条件是否完整、明确、一致且可验证。
**Created**: 2026-10-04
**Feature**: [spec.md](../spec.md)
**Depth / Actor / Timing**: 标准深度；需求及计划审阅者；tasks.md 已生成后的实施前审阅。

**Note**: 本自定义清单由 `$speckit-checklist` 根据当前规格、计划及合同生成，检查需求文字质量。
**Review Ownership**: 本清单归审阅者所有；仅由审阅者判定需求质量标准满足后勾选。
**Marker Semantics**: `[x]` 表示需求质量已审阅并满足，不表示实施完成或运行验收通过。按用户授权逐项审阅并修订CHK036涉及的阶段状态后，36项均满足需求质量标准。本次文档修订及复审未运行功能测试或实施验收，未将任何实施任务标为完成。

## 需求完整性（Requirement Completeness）

- [x] CHK001 是否要求“原依赖—用途—替代能力—验收方式”逐项覆盖平台身份上下文、数据库注入、请求封装、日志、构建预设及平台专属组件，并定义使用证据和处置结果的记录内容？ [Completeness, Spec §FR-001/FR-002/FR-017]

  **审阅（2026-10-04）**：依据：[规格](../spec.md) FR-001/002/017要求逐项对照、使用证据及验证程度；[计划](../plan.md)“依赖顺序与复用策略”及[操作合同](../contracts/operations.md)“平台退出证据”覆盖身份、数据库、请求、日志、预设和组件；[初查](../source-context.md) DEP-01–10已有逐项记录。替代范围与处置标准明确。
- [x] CHK002 是否完整规定注册、登录、当前身份验证、退出、会话到期与撤销，且明确禁止关闭认证、取消权限检查或模拟成功作为替代能力？ [Completeness, Spec §FR-003/FR-004/FR-005/FR-010/FR-015]

  **审阅（2026-10-04）**：依据：[规格](../spec.md) FR-003–005/010/015及故事2覆盖注册、密码、me、退出、到期和撤销；[API合同](../contracts/api.md)“认证和响应”要求真实会话及受保护失败拒绝，“客户端可观察行为”禁止失败自动演示。不能用模拟成功或绕过权限满足这些条件。
- [x] CHK003 数据归属及权限要求是否覆盖全部现有资料类别、账号私有设置、聚合结果，以及家属和长者各自允许与拒绝的操作，而非只规定长者主记录？ [Completeness, Spec §FR-005/FR-006; API Contract §全部现有接口及权限矩阵]

  **审阅（2026-10-04）**：依据：[规格](../spec.md) FR-005/006列举全部资料类别；[API合同](../contracts/api.md)25条接口权限矩阵逐项列出F/E/S/P及管理写入拒绝，涵盖聚合和账号私有设置；[数据模型](../data-model.md)归属由账号或长者推导。权限范围有可枚举落点。
- [x] CHK004 是否完整规定代理负责检查、补齐必需缺失工具及项目依赖、验证运行底座和数据库就绪，以及后续任务必须包含这些前置职责？ [Completeness, Spec §FR-025; Plan §依赖顺序与复用策略]

  **审阅（2026-10-04）**：依据：[规格](../spec.md) FR-025及SC-010明确代理安装和验证职责；[计划](../plan.md) ENV-01–05列出前提、证据和用户操作边界；[任务](../tasks.md) T003–007、T016–017承接环境、依赖及数据库就绪前置工作。职责完整，不以工具存在代替验证。

## 需求清晰度（Requirement Clarity）

- [x] CHK005 “独立运行”和“正式启动”的定义是否明确限定Windows本机应用及浏览器，区分安装、构建、开发启动、构建后启动与数据库底座，不隐含公网或手机访问？ [Clarity, Spec §FR-002/FR-024/Assumptions; Plan §Target Platform]

  **审阅（2026-10-04）**：依据：[规格](../spec.md)澄清、FR-002/024及Assumptions明确Windows应用和本机浏览器；[计划](../plan.md) Target Platform及[操作合同](../contracts/operations.md) start/preview区分开发、构建后本机运行和仅前端预览，Docker/WSL仅承载数据库。未隐含公网或手机验收。
- [x] CHK006 “本人资料”“一对一”“明确授权”是否给出关联双方、家属可管理多位长者、每位长者及长者账号的有效关联上限、授权证据与撤销时点，排除姓名或手机号自动关联？ [Clarity, Spec §FR-005/FR-006; API Contract §新增关联接口（增量能力）]

  **审阅（2026-10-04）**：依据：[规格](../spec.md) FR-005/006明确归属不转移、家属可管理多位长者及双向唯一关联；[API合同](../contracts/api.md)新增关联接口规定指定账号邀请、预览、confirm:true接受及双方撤销；[数据模型](../data-model.md)唯一索引、授权时间和撤销锁定义证据与立即失效语义。
- [x] CHK007 会话有效期、重新登录替换规则、退出成功含义与撤销未确认时的处理是否明确，且区分本地状态清理和服务端访问资格撤销？ [Clarity, Spec §FR-004/User Story 2; Operations Contract §配置; API Contract §客户端可观察行为]

  **审阅（2026-10-04）**：依据：[操作合同](../contracts/operations.md) SESSION_TTL_SECONDS默认86400及合法范围；[API合同](../contracts/api.md)重新登录替换旧会话、退出201后旧token401，客户端退出未确认时清本地并提示可能有效至到期、恢复后内存凭证重试；[规格](../spec.md)故事2分别定义两种退出结果。
- [x] CHK008 “前端演示”“演示账号”“真实保存”和“模拟服务”是否有明确分类、标识要求及保存边界，避免把验证码、定位、叫车、求助、告警或通知记录解释为真实服务完成？ [Clarity, Spec §FR-015/Assumptions; Spec §SC-009]

  **审阅（2026-10-04）**：依据：[规格](../spec.md) FR-015、SC-009及Assumptions区分前端演示无写库、演示账号真实认证与隔离持久化、模拟服务不代表执行；[API合同](../contracts/api.md)OTP、call、告警及模式切换说明对应结果；[指南](../quickstart.md) A12分别验收两类演示。

## 需求一致性（Requirement Consistency）

- [x] CHK009 spec、plan及quickstart对安装职责是否一致：规划仅更新文档，实施由代理自动完成可做步骤，复用兼容Node/npm，且用户操作前提不被误写成代理无需处理的事项？ [Consistency, Spec §FR-025; Plan §ENV-01–ENV-05; Quickstart §前提与PowerShell]

  **审阅（2026-10-04）**：依据：[规格](../spec.md) FR-025、[计划](../plan.md) ENV-01–05及[指南](../quickstart.md)“前提与PowerShell”一致要求实施代理自动完成可做步骤、复用兼容Node/npm、处理PATH及用户操作后复检，规划不安装。工具职责没有转交给用户；阶段状态文字已按CHK036复审同步。
- [x] CHK010 空库起步、不迁入既有业务数据与仍须验证数据库升级和回滚的要求是否一致，避免将“不导入旧数据”解释为不需要版本迁移？ [Consistency, Spec §FR-018/FR-019/SC-007; Data Model §迁移版本与启动兼容]

  **审阅（2026-10-04）**：依据：[规格](../spec.md)第三项澄清、FR-018/019及SC-007明确不导入旧业务数据，但须以本地测试数据验证升级/回滚；[数据模型](../data-model.md)0000/0001版本和[指南](../quickstart.md) A10及回滚演练承接同一范围。空库起步不免除版本迁移。
- [x] CHK011 账号归属、照护授权和私有设置要求是否在角色矩阵与数据模型中一致，且照护关联不被解释为转移管理归属、共享家属账号或授予联系人登录权限？ [Consistency, Spec §FR-005/FR-006; API Contract §全部现有接口及权限矩阵; Data Model §公共约定/设置/照护关联]

  **审阅（2026-10-04）**：依据：[API合同](../contracts/api.md)权限矩阵明确E仅本人资料、S仅自身设置、联系人不授予登录权限；[数据模型](../data-model.md)owner_account_id、account_id及照护复合外键分别保持家属归属、账号设置和授权关系，与[规格](../spec.md) FR-005/006一致。
- [x] CHK012 兼容性与安全修复要求是否一致区分受支持合法调用、可选空值和原有漏洞，并规定合法契约或服务职责确需改变时的独立确认路径？ [Consistency, Spec §FR-016/FR-023; Constitution §V/VI; API Contract §输入合同与兼容修复]

  **审阅（2026-10-04）**：依据：[规格](../spec.md) FR-016/023及[计划](../plan.md) Constitution Check区分合法兼容与漏洞修复；[API合同](../contracts/api.md)输入规则保留可选空值、普通未知字段剥离及原错误约定，单列安全修复影响；合法契约或服务职责确需变更须按章程V/VI另行确认。

## 验收条件质量（Acceptance Criteria Quality）

- [x] CHK013 全新安装、构建、数据库准备、开发与构建后启动的成功条件是否可客观判断，且“无平台依赖”覆盖安装链、间接依赖、产物和实际请求，而非仅源码引用？ [Measurability, Spec §SC-001/SC-006/FR-002; Operations Contract §平台退出证据]

  **审阅（2026-10-04）**：依据：[规格](../spec.md) SC-001/006和FR-002要求干净安装、开发及构建后运行；[指南](../quickstart.md) A01/A02给出目录、命令、页面及失败标准；[操作合同](../contracts/operations.md)“平台退出证据”要求直接/间接依赖、锁文件、配置、产物和实际请求分别核对。
- [x] CHK014 两账号隔离及角色权限验收是否明确账号组合、受保护资源全集、授权前后和撤销后的结果，使“全部资源”与“100%通过”具有可枚举的分母？ [Measurability, Spec §SC-003; API Contract §全部现有接口及权限矩阵; Quickstart §验收矩阵 A05]

  **审阅（2026-10-04）**：依据：[规格](../spec.md) SC-003明确两个未关联家属及至少一个长者；[API合同](../contracts/api.md)25条现有接口及6条关联接口列出允许/拒绝对象；[指南](../quickstart.md) A05覆盖关联前、授权后、撤销后、跨demo域及聚合。资源全集和判定对象可以枚举。
- [x] CHK015 无效输入拒绝和重启持久化是否明确输入域、适用边界、不可改变的数据及字段/关联比较标准，而非只定义页面出现成功提示？ [Measurability, Spec §SC-004/FR-007/FR-008; Quickstart §验收矩阵 A06/A07]

  **审阅（2026-10-04）**：依据：[API合同](../contracts/api.md)“输入合同与兼容修复”及[数据模型](../data-model.md)逐字段定义类型、长度、格式、范围、枚举、嵌套和关系；[指南](../quickstart.md) A06要求拒绝后库无变化，A07要求逐字段及FK/owner一致并覆盖刷新、重登、应用及数据库重启，对应FR-007/008及SC-004。
- [x] CHK016 验收证据是否要求版本环境、输入、预期、实际结果、脱敏证据和清理范围，并明确静态检查、运行通过、失败、阻塞及未验证状态，避免计划完成被当作业务完成？ [Measurability, Spec §FR-021/SC-008/SC-010; Plan §交付判定; Quickstart §记录与完成]

  **审阅（2026-10-04）**：依据：[规格](../spec.md) FR-021及SC-008/010、[指南](../quickstart.md)“记录与完成”要求版本环境、准确操作、脱敏输入、预期/实际、证据与清理范围并区分静态/通过/失败/阻塞；[计划](../plan.md)“交付判定”及[验证记录](../verification.md)明确既有构建不证明独立业务通过。证据标准明确；阶段标签已按CHK036复审同步。

## 场景覆盖（Scenario Coverage）

- [x] CHK017 主流程要求是否覆盖注册、重新登录、身份恢复、保存、刷新、重登、应用及数据库重启，以及现有页面入口的构建后访问？ [Coverage, Spec §User Story 1–3/FR-010/FR-020]

  **审阅（2026-10-04）**：依据：[规格](../spec.md)故事1–3覆盖安装到保存、身份恢复及重启；[API合同](../contracts/api.md)“客户端可观察行为”定义me验证和页面刷新；[指南](../quickstart.md) A02–A04/A07给出开发/构建后入口、重登及应用与持久卷重启核对。主流程连续且可验证。
- [x] CHK018 替代路径是否明确前端演示与演示账号的显式选择、模式切换和隔离要求，以及未关联长者账号可访问内容与空态，不依赖业务失败自动进入演示？ [Coverage, Spec §User Story 4/FR-015; API Contract §全部现有接口及权限矩阵]

  **审阅（2026-10-04）**：依据：[规格](../spec.md) FR-015和故事4规定显式演示及切换隔离；[API合同](../contracts/api.md)未关联E可me/退出/自身设置、空列表/dashboard及待授权界面，并拒绝指定照护资料；[指南](../quickstart.md) A03/A12要求失败不进入演示。替代路径不是故障掩盖。
- [x] CHK019 异常要求是否涵盖错误密码、无效/过期凭证、越权、无效输入、冲突、资源不存在、数据库不可用和保存失败，并规定可区分的反馈及不伪报成功的约束？ [Coverage, Spec §FR-003/FR-004/FR-007/FR-011/FR-013; API Contract §认证和响应]

  **审阅（2026-10-04）**：依据：[API合同](../contracts/api.md)“认证和响应”分别约定400/401/403/404/409/500/503及嵌套错误，数据库503不误判账号失效；客户端网络/超时/保存失败保留输入且不提示成功；[规格](../spec.md) FR-011/013和[指南](../quickstart.md) A03/A06/A08/A09涵盖所列异常。
- [x] CHK020 恢复要求是否覆盖升级失败、备份恢复、应用版本匹配和恢复后会话撤销，并分别定义数据完整性与业务可用性的判定内容？ [Coverage, Spec §FR-018/FR-019/SC-007; Data Model §备份、回滚与恢复的可审阅步骤]

  **审阅（2026-10-04）**：依据：[数据模型](../data-model.md)恢复六步规定失败停写、验证备份、新库恢复、数量/FK/owner/字段检查、匹配旧构建及统一撤销会话；[操作合同](../contracts/operations.md) restore/verify不自动切换；[指南](../quickstart.md) A10和回滚演练另要求登录/退出/隔离/保存验证。完整性与运行可用性分别判断。

## 边界情况覆盖（Edge Case Coverage）

- [x] CHK021 是否定义并发重复注册、初始化部分失败、重复迁移、并发关联与撤销的需求边界，明确唯一性、一致性及禁止半完成结果？ [Edge Case, Spec §FR-003/FR-009/FR-018/User Story 3]

  **审阅（2026-10-04）**：依据：[规格](../spec.md) FR-003/009/018和故事3禁止半完成结果；[数据模型](../data-model.md)注册事务/唯一约束、邀请与关联锁及部分唯一索引、撤销锁、迁移advisory lock/账本定义并发边界；[指南](../quickstart.md) A03/A05/A10覆盖并发注册、关联及重复/并发迁移。
- [x] CHK022 是否明确必需配置缺失/无效、数据库不可达与结构不兼容的失败条件，并与仅缺地图Key、地图加载失败或设备定位拒绝的局部不可用要求区分？ [Edge Case, Spec §FR-013/FR-014/SC-005/Edge Cases]

  **审阅（2026-10-04）**：依据：[规格](../spec.md) FR-013/014及Edge Cases区分必需故障与地图局部不可用；[操作合同](../contracts/operations.md)配置校验、连接/结构不兼容要求非零退出且不监听；[API合同](../contracts/api.md)客户端及[指南](../quickstart.md) A08覆盖无Key/无效Key/加载或定位权限失败，不阻断其他流程。
- [x] CHK023 初始化发现未知非空数据库、恢复目标已存在或备份前提不满足时，是否明确拒绝覆盖及后续处理要求，排除删库、删卷作为升级或回滚？ [Edge Case, Spec §FR-018/FR-019; Data Model §迁移版本与启动兼容; Operations Contract §npm命令合同]

  **审阅（2026-10-04）**：依据：[数据模型](../data-model.md)未知非空库初始化拒绝、失败停写保留故障库及禁止删卷；[操作合同](../contracts/operations.md) restore只允许新库、无force覆盖；[指南](../quickstart.md)“迁移与回滚演练”要求无备份/匹配构建/隔离验证时不执行覆盖恢复。拒绝条件及后续安全处理明确。
- [x] CHK024 是否规定跨账号缓存、旧会话、伪造归属/角色、未授权资源标识及演示资料残留的边界，且无权限的显式目标不会被静默替换为其他资料？ [Edge Case, Spec §FR-005/FR-007/FR-015/Edge Cases; API Contract §认证和响应]

  **审阅（2026-10-04）**：依据：[规格](../spec.md) Edge Cases及FR-005/007/015要求按服务端身份重载、拒绝伪造权限、切换清缓存；[API合同](../contracts/api.md)显式无权限elderId不得fallback、token必须验证且E只读本人，客户端401清身份；[指南](../quickstart.md) A05/A09/A12对应越权及模式残留反例。

## 非功能与治理要求（Non-Functional Requirements）

- [x] CHK025 密码、会话凭证、邀请凭证和数据库配置的保存及诊断保护要求是否明确，覆盖示例、日志、错误、命令输出和本地证据文件的脱敏边界？ [Security, Spec §FR-003/FR-012/FR-013/FR-021; Operations Contract §日志与错误]

  **审阅（2026-10-04）**：依据：[数据模型](../data-model.md)密码scrypt、会话/邀请只存摘要；[操作合同](../contracts/operations.md)配置仅外部注入、日志禁止密码/token/code/URL/Key/正文、命令不带密码参数；[指南](../quickstart.md)安装与配置、测试及记录要求证据脱敏、备份/报告不提交、扫描不打印命中值。保护范围已写明。
- [x] CHK026 地图Key“不进入源码或提交历史”的要求是否与浏览器产物使用事实一致，并明确配置注入、生效条件、历史暴露处置及不默认授权历史重写的边界？ [Security, Spec §FR-014; Plan §Constraints; Operations Contract §配置]

  **审阅（2026-10-04）**：依据：[规格](../spec.md) FR-014规定源码/历史无Key、既有暴露只记录路径并另行轮换清理、不默认授权重写；[计划](../plan.md) Constraints和[操作合同](../contracts/operations.md) VITE_AMAP_KEY明确浏览器可见、外部注入、build进入产物且改值需重建重启，与不提交源码的要求相容。
- [x] CHK027 可诊断性要求是否规定日志事件、时间、结果、关联标识、级别及输出位置，并说明用户可获得的错误信息与内部诊断信息边界？ [Clarity, Spec §FR-011/FR-012/SC-008; Operations Contract §日志与错误]

  **审阅（2026-10-04）**：依据：[规格](../spec.md) FR-011/012列出必要事件及敏感边界；[操作合同](../contracts/operations.md)“日志与错误”规定UTC time、level、requestId、operation、result、状态/错误码、stdout/stderr、内部脱敏堆栈与客户端通用错误；[指南](../quickstart.md) A11要求可定位认证和保存失败。
- [x] CHK028 受影响流程的超时/无反馈要求是否有明确适用范围及失败反馈标准，且没有擅自增加统一性能、覆盖率或持续位置/麦克风采集目标？ [Measurability, Plan §Performance Goals; Spec §FR-023; Constitution §II/项目范围与已确认基线]

  **审阅（2026-10-04）**：依据：[计划](../plan.md) Performance Goals规定数据库连接5秒、HTTP请求15秒及失败反馈，不设未批准吞吐/覆盖率/延迟门槛；[API合同](../contracts/api.md)网络/超时失败保留可重试输入且不toast成功；[规格](../spec.md) FR-023和章程基线禁止借迁移扩展持续位置/麦克风采集。

## 依赖与假设（Dependencies & Assumptions）

- [x] CHK029 缺失工具安装要求是否明确官方来源、安装结果证据、兼容已装工具复用及安装必要性判断，不将PATH问题当缺失，也不将追新作为升级理由？ [Dependency, Spec §FR-025/SC-010; Plan §ENV-01/ENV-02/ENV-04]

  **审阅（2026-10-04）**：依据：[规格](../spec.md) FR-025及[计划](../plan.md) ENV-01/02/04要求先查标准/用户安装目录和PATH、仅缺失或证据确认不兼容才安装、官方来源及签名/校验和、保留兼容版本；[指南](../quickstart.md)提供官方入口及锁文件来源核对，PATH问题不当缺失。
- [x] CHK030 运行前置要求是否明确区分工具已安装、引擎与Compose可用、数据库就绪、真实应用连接及数据库结构兼容，且后续任务的依赖关系没有以CLI存在代替完成条件？ [Dependency, Spec §FR-013/FR-025; Plan §ENV-03/ENV-05; Quickstart §空库、构建和启动（A02）]

  **审阅（2026-10-04）**：依据：[计划](../plan.md) ENV-03/05分别要求Docker服务端/Compose、pg_isready及真实连接；[操作合同](../contracts/operations.md) db:check从Windows使用DATABASE_URL、应用启动另核结构；[指南](../quickstart.md) A02明确各层不能互代；[任务](../tasks.md) T005/T015–017及依赖章节将实际就绪作为数据库任务前提。
- [x] CHK031 BIOS虚拟化、系统重启、必须用户操作的界面和权限限制是否有明确职责边界、具体操作说明、恢复复检及继续独立工作的要求，且不擅自重启或伪报完成？ [Assumption, Spec §FR-025/SC-010; Quickstart §前提与PowerShell]

  **审阅（2026-10-04）**：依据：[规格](../spec.md) FR-025/SC-010禁止擅自重启和待操作冒充通过；[计划](../plan.md) ENV-02/03与[指南](../quickstart.md)用户介入表逐项要求观察结果、原因、适用操作/界面/权限说明、完成后复检及继续独立工作。BIOS具体厂商步骤按现场检测提供，不假设通用按钮可用。
- [x] CHK032 已迁移成果复用条件是否要求对应成功与失败证据，且说明现有依赖环境的检查通过不等于干净独立安装通过，未使用组件删除也必须有使用分析依据？ [Dependency, Spec §FR-001/FR-017; Plan §依赖顺序与复用策略/交付判定]

  **审阅（2026-10-04）**：依据：[规格](../spec.md) FR-001/017要求成功与失败证据及动态/类型/构建使用分析；[计划](../plan.md)“依赖顺序与复用策略/交付判定”明确既有安装树通过不等于干净安装；[验证记录](../verification.md)逐项保留待验收状态，[操作合同](../contracts/operations.md)禁止仅零命中或无引用就认定运行成功。

## 歧义与冲突（Ambiguities & Conflicts）

- [x] CHK033 “本次平台替代范围”与001完整评估范围是否清晰分离，模板专属功能、全PRD实现及真实定位/告警/通知是否明确不自动纳入，且既有有效隐私控制不会因迁移被绕过？ [Ambiguity, Spec §FR-017/FR-022/Assumptions; API Contract §全部现有接口及权限矩阵]

  **审阅（2026-10-04）**：依据：[规格](../spec.md) FR-017/022及Assumptions保留001完整评估、排除模板业务/全PRD及真实采集投递；[计划](../plan.md) Summary/Scale与之相符；[API合同](../contracts/api.md)权限矩阵后说明不得绕过既有有效隐私控制，分享开关和全PRD同步仍由001评估。范围边界明确。
- [x] CHK034 回滚后新增数据的保留方式、可能损失边界、匹配应用版本的获取前提及切换条件是否足够明确，避免“恢复备份”被解释为无条件零损失或自动切换？ [Ambiguity, Spec §FR-019; Data Model §备份、回滚与恢复的可审阅步骤; Quickstart §迁移与回滚演练]

  **审阅（2026-10-04）**：依据：[数据模型](../data-model.md)恢复前保存旧构建/lock/schema、故障库完整备份并记录恢复点至停写差异，新地点/关联隔离待修复且不承诺零损失；[操作合同](../contracts/operations.md) restore不自动切换；[指南](../quickstart.md)须核对后手动改不提交的URL并用保存的0000构建验证，无匹配构建不通过。
- [x] CHK035 数据库检查职责是否在操作合同与quickstart中一致：`db:check`只检查迁移链，还是还负责Windows应用凭据的真实连接；首次空库的检查是否与尚无迁移账本的前提相容？ [Conflict, Gap, Spec §FR-013/FR-025; Operations Contract §npm命令合同; Quickstart §空库、构建和启动（A02）]

  **审阅（2026-10-04）**：依据：[操作合同](../contracts/operations.md) db:check与[指南](../quickstart.md) A02一致规定迁移链完整性、Windows凭据SELECT 1、只读、空schema无账本报告待初始化、未知非空或账本漂移失败；业务结构兼容另由启动核对。[任务](../tasks.md) T002/T015承接该合同。原文职责冲突已消除，命令实现/运行仍待验证。
- [x] CHK036 需求到验收项、验收证据及实施任务的追踪要求是否明确，25条FR和10项SC是否都有判定落点；文档是否一致说明tasks.md已生成、需求质量审阅已完成，但实施及强制验收尚未完成，环境前置任务仍待执行验证？ [Traceability, Spec §FR-021/FR-025/SC-001–SC-010; Plan §交付判定]

  **审阅（2026-10-04，修订后复审）**：依据：[规格](../spec.md) Status及FR-021/025、[计划](../plan.md)“交付判定”、[任务](../tasks.md) Notes均已同步为任务生成和需求质量审阅完成、实施及强制验收未完成；计划中未创建任务的说明已明确为此前规划时点。任务“需求及验收追踪”覆盖全部25条FR和10项SC，对应有效实施/验收任务及verification.md证据；[指南](../quickstart.md) A01–A12和“记录与完成”定义操作、预期/实际、脱敏证据及清理要求。67项任务编号T001–T067保留，环境前置T003–T007/T016–T017仍待执行验证。原阶段状态冲突已消除，满足追踪与一致性质量标准，按用户授权勾选；不表示实施或验收通过。

## Notes

- 引用中的Spec、Plan、API Contract、Operations Contract和Data Model分别对应 [spec.md](../spec.md)、[plan.md](../plan.md)、[contracts/api.md](../contracts/api.md)、[contracts/operations.md](../contracts/operations.md) 和 [data-model.md](../data-model.md)；操作及证据要求另见 [quickstart.md](../quickstart.md)。Constitution指 [项目章程](../../../.specify/memory/constitution.md)。
- 按完整性、清晰度、一致性、可衡量性及场景覆盖审阅；每项可追加引用、发现、修订建议及审阅结论。`[Gap]`、`[Ambiguity]`和`[Conflict]`表示需要关注的问题类型，不表示未经审阅已判定失败。
- CHK035已按一致的操作合同及quickstart通过需求质量审阅；T002仍须在实施前复核，T015负责实现。勾选不代表检查命令已实现或运行通过。
- tasks.md已生成并修订为67项任务，实施完成情况仍须逐项执行并举证。按用户授权同步spec/plan/tasks的阶段状态并复审CHK036后，本自定义清单36项均通过需求质量审阅；该门槛通过不替代环境就绪、任务实施或规定验收。
- 仅在审阅者确认需求质量满足时标记`[x]`；需要澄清、纠正或审阅的项保持未勾选。`$speckit-implement`读取清单状态作为门槛，不修改勾选标记。
- [requirements.md](requirements.md)属于`$speckit-specify`和`$speckit-clarify`维护的内置规格质量清单，本次未修改其内容或标记。
