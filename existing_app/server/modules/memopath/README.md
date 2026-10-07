# MemoPath 服务职责与0000接口说明

本模块使用Nest注入的独立Drizzle连接。控制器验证输入、委托服务，并保留既有
对象/列表响应；异常由全局过滤器转换为嵌套error。账号字段、UUID、时间和业务字段
约束见 `specs/002-remove-platform-dependency/contracts/api.md` 与 `data-model.md`。
本说明对应当前0000实现；0001照护邀请及完整权限矩阵尚未实现，不据此声称通过。

## 认证及可信身份

| 方法/函数 | 输入、输出与职责 | 权限、副作用与失败 |
| --- | --- | --- |
| Auth.issueOtp | 返回6位演示码及300秒说明 | 公开；不发送短信、不建立手机验证状态或照护授权 |
| Auth.accountExists | 单值trim账号键；缺/空返回false | 公开；只读；大小写保持，数组/对象/超长查询400，DB故障503 |
| Auth.register | 验证后的完整注册DTO；返回accountId/role/displayName/token | 公开；固定scrypt密码、随机UUID有限会话；事务编排长者及私有设置；重复409，初始化失败全部回滚 |
| Auth.login | trim账号键及原样密码；返回原登录结构 | 公开；固定N16384/r8/p1、16字节盐/64字节结果、等长比较；错误401；替换唯一会话摘要与到期时间；DB故障503 |
| hashPassword/verifyPassword | 密码原字节、salt:hash存储格式 | 内部；不trim密码，不输出密码/摘要；畸形存储格式拒绝 |
| sessionDigest | 原UUID会话→64位hex SHA256 | 内部；持久化只存摘要，原token只在成功认证响应返回 |
| Auth.logout | 当前有效会话token→void，由控制器返回message | guard认证；只清匹配摘要及expiry，不撤销较新会话；旧token401；DB故障503 |
| Auth.seedDemoAccount | 显式demo登录的事务内种子 | 私有；advisory锁，已存在不覆盖；Auth只写账号，Elder/Family负责各自种子，失败回滚 |
| principal/uniqueConflict | DB账号→可信principal；提取SQL唯一冲突代码 | 内部；不接收客户端角色/owner；不记录SQL消息或cause正文 |
| SessionGuard.canActivate | 单个UUID请求头→可信accountId/accountKey/role/isDemo/displayName | 不接受缺失、拼接、多头；数据库now校验expiry，失效401；DB故障503；无owner别名或客户端赋权 |
| AuthController.me | guard principal→accountId/role/displayName | 任何已认证角色，响应不含token/hash/私人资料 |

请求正文普通未知字段剥离；伪造owner/accountId/isDemo/审计/session/permissions等字段
由全局InputValidationPipe递归拒绝。role仅注册DTO允许family/elder，普通业务不能改变账号角色。
注册和登录会话默认24小时，DB保存摘要和expiry配对值，退出同步清空。

## 长者生命周期与基础归属

| Elder方法/函数 | 输入及输出 | 权限、副作用与失败 |
| --- | --- | --- |
| list | 可信principal→长者列表 | family仅自己的owner_account_id；0000未关联elder返回[]；不按姓名/电话绑定 |
| create/createInTransaction | principal+完整长者输入→公开长者记录 | family；服务填owner及操作者；create开事务，后者使用Auth传入事务，禁止自身提交 |
| update | principal+资源UUID+partial DTO→记录 | assertOwnership后更新明确提供字段及审计；空patch400、缺记录404、他人/elder403；完整并发授权在0001补齐 |
| remove | principal+UUID→void | family所有权；数据库FK级联关联业务；缺记录404、无权403；不删除独立账号 |
| assertOwnership | principal+UUID→内部行 | 检查存在404、family及owner匹配403；内部行不直接返回客户端 |
| seedDemoInTransaction | 已认证demo principal+显式事务→首位长者UUID | 写两位样例并绑定demo owner，缺结果抛错使事务回滚；不接管账号/其他业务种子 |
| toRecord | 数据库行→MemoPathElderRecord | 只映射既有公开字段，不输出owner/audit |

## Family资料服务与聚合

所有照护资源方法通过Elder.assertOwnership检查归属；0000不允许未关联elder访问照护资料。
私有设置不从长者owner或照护关联推导，始终用当前principal.accountId。

| Family方法 | 职责与输入输出 | 副作用及边界 |
| --- | --- | --- |
| listContacts/addContact | 长者UUID及联系人DTO→公开列表/新记录 | 归属检查；新增联系人仅写本服务表 |
| listTrips/createTrip/callCab/toTripRecord | 长者/行程UUID及行程DTO→行程公开结构 | create保存；call只持久化cab_called模拟状态，不调用外部车务；格式和完整约束在0001强化 |
| getSetting/saveSetting/initializeSetting | 当前账号→配置；保存配置；事务内初始设置 | 两角色本人；get无记录返回既有默认，save原子upsert；initialize使用传入事务，不替Auth提交 |
| getGeofence/saveGeofence | 长者UUID及partial输入→围栏 | 无记录默认id空字符串，不冒充已保存；save本服务持久化；完整合并验证在0001落实 |
| listPlaces/addPlace | 长者及地点DTO→列表/新记录 | 0000缺地址/坐标列，旧响应占位值不是完整持久化通过；0001必须补齐 |
| listAlerts/getVitalSummary/listMovements | 长者UUID→现有列表/体征latest与trend | 只读；无数据null/[]；不引入定位、健康采集或真实通知投递 |
| getDashboard | 可选显式长者UUID→聚合 | 明确UUID须核对归属，不fallback；未关联elder无参数空态；今天统一Asia/Hong_Kong |
| seedDemoInTransaction | 样例長者UUID及显式事务→void | 写本服务联系人/行程/地点等样例；失败由Auth总事务回滚；系统初始化审计可空，业务必须有长者归属 |

## 前端身份交接与验收

`memopath-api.ts`保持同源Axios请求及15秒超时。me验证服务端角色后页面加载资料；
注册、登录和刷新共享此信任边界。普通认证失败保持登录页，不进入演示。
logout返回撤销是否确认；未确认的原token仅在模块内存保留供显式retryLogout，
不创建额外持久凭据；刷新丢失该重试值，旧会话仍受原expiry约束。
`clearIdentityData`清旧账号资料、草稿、选择缓存、地图及语音句柄；本人长者设置不显示家属管理入口。

正式验收入口：`npm.cmd run test:integration -- --suite auth`。
该套件使用独立测试库、真实构建服务器及合成账号，验证事务回滚、并发注册、有限会话、
错误输入、基本family隔离和两角色私有设置。断连测试使用临时TCP转发真实PG流量再关闭
本测试连接，不停Docker，不模拟成功响应。页面证据见功能目录的browser-acceptance.md。
全部资源角色权限、邀请、迁移恢复及演示写入次数仍按后续任务验收。

## 0001照护与地点增量（2026-10-05）

当前新构建要求0001；0000匹配产物保留于忽略的.local-baselines/0000。
ElderService继续负责长者生命周期和授权，Auth仅认证/注册编排，Family仍负责关联业务。

| 方法 | 职责/输出 | 权限、错误与副作用 |
| --- | --- | --- |
| accessPredicate/resourceAccess/assertAccess | 当前owner或active link的SQL条件；授权内部行 | 每请求重查；不存在404/无权403，不缓存授权，不替换真实principal |
| withElderWrite | 锁定长者、检查授权、同事务业务操作 | 管理写仅owner family；模拟call允许关联elder；与撤销使用同长者锁，失败整体回滚 |
| invite | 指定账号→一次返回code/id/expiry | owner family；目标必须elder且同demo域；随机32字节base64url，库只存SHA-256；撤销旧pending，不隐式替换active link |
| invitation/preview | body code→必要长者/家属显示名 | 指定elder；到期/错目标/撤销/消费统一非识别409，错误角色403；预览不产生link |
| accept | 消费邀请并建立active link | elder/目标账号锁序统一；角色/owner/demo/到期重查；link和消费同事务；确认由DTO要求boolean true |
| links | 当前参与者active列表 | 不输出code、账号私密字段或无关资料 |
| revokeInvitation/revokeLink | 撤销邀请或双方授权 | 本人权限；已消费邀请409；同长者锁，保留撤销事实，重复撤销幂等 |
| ResourceUuidPipe/resourceUuid | 输入UUID→合法标识 | 缺必需查询400、重复/结构化/非法UUID404；不让非法标识进入SQL |
| CalendarDate/OrderedTimes/DTO | 边界验证 | 真实日期和同日时间顺序、坐标成对有限且范围内、精确bool；普通未知剥离，权限字段拒绝 |

Family读查询同时包含有效授权SQL条件；新增联系人/行程/地点及围栏合并保存和模拟call
在长者锁事务内完成，并记录实际操作者。地点保存address/lng/lat；未提交坐标库为NULL，
公开旧响应仍0/0，真实0值在库中保留。私人设置仅accountId，不随照护关联分享。
前端care API将code放JSON正文；邀请/预览仅内存保存，退出清除；接受前显示摘要，
撤销后清除照护缓存并重载。真实elder管理按钮及操作被限制，服务端仍独立判权限。
正式permissions/validation/persistence及auth回归在隔离0001测试库通过；页面合成资料
完成邀请→预览→明确接受→撤销→刷新空态。完整失败/数据库重启/最终验收仍见verification。