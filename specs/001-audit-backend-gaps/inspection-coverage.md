# 主动检查覆盖

日期2026-10-09，EVD-09为当前HEAD静态检查，EVD-01–08为既有运行、本轮未重跑。当前业务源码/hash未变化。没有保证发现所有缺陷；无发现仅限所列对象。

## COV-01 全部输入入口

枚举4个业务控制器共33个方法：Auth6、Elder6、Family15、Care6；4个公开入口，其余29个经SessionGuard。读取14个DTO类及InputValidationPipe、ResourceUuidPipe、可信principal、服务二次权限/约束。以下按同约束分组，但每个入口均列出：

| 控制器入口 | 输入/可信边界/适用验证 | 证据/结果/限制 |
| --- | --- | --- |
| Auth POST otp | phone正文：字符串/必填/32长/允许字符；不是短信或手机认证 | DTO/issueOtp；EVD-02/09；演示，不把验证码作为身份 |
| Auth GET exists | account单值查询，数组/对象拒绝，trim/64长，空返回false | AuthController.exists；EVD-02；不宣称防枚举策略 |
| Auth POST register | account trim必填64，password8–128，role elder/family，elder必填对象+ValidateNested/Type；字段长度/age0–130/电话字符 | 递归拒owner/权限/会话/审计及嵌套伪造；EVD-02/05；完整事务 |
| Auth POST login | account trim必填64/password必填128，不trim密码；数据库认证 | DTO/Auth；EVD-02，错误401/DB503 |
| Auth GET me、POST logout | 单UUID x-memopath-token，缺/多头/拼接/过期拒；logout只撤原匹配摘要 | Guard/Auth；EVD-02/05 |
| Elder GET list、POST create | list无业务输入；create完整elder DTO，family权，服务端owner/audit | EVD-03/04；名字trim必填，其他可选及长度/格式 |
| Elder PATCH :id、DELETE :id | UUID路径+partial DTO，空patch400，存在/owner/family检查，锁后写/级联 | EVD-03/04；真实A/B/E已验 |
| Elder GET/POST :id/contacts | UUID+ContactDto：名字必填trim100，relation100/phone32允许字符/avatar16；管理权 | EVD-03/04；无contact PATCH/DELETE契约，不能声称全CRUD |
| Family GET dashboard | 可选elderId单UUID；显式未授权不可fallback；无关联空态 | EVD-03/05；server返回可信长者，原身份不替换 |
| Family GET/POST trips | elderId查询或正文UUID；destination必填trim255，真实calendarDate，同日start/end精确HH:mm+顺序，schedule允许值 | EVD-03/04/05；不接受非法标识进SQL |
| Family POST trips/:id/call | UUID+角色/资源锁，cab_called演示持久化 | EVD-03/07；不是司机派单或通知 |
| Family GET/PUT settings | 无caller owner；DTO语言3值、voice2值、布尔lockLayout；principal.accountId | EVD-05；两角色私人语义，不等于配置同步 |
| Family GET/PUT geofences/:elderId | UUID/owner；homeLabel100/radius100–5000/dwell1–120/布尔，可选字段合并 | EVD-04/09；端侧阈值只读、开关FND-13；不因API通过外推UI |
| Family GET/POST places | elderId单UUID；labeltrim必填100/icon16/type2值/status2值/address255；lng/lat成对有限范围 | EVD-04/05；未提供SQL NULL与合法0分开 |
| Family PATCH/DELETE places/:id | UUID路径、允许partial字段、成对坐标；锁内从记录取owner，空patch/非法字段拒 | EVD-04/05；既有兼容公开0占位需调用方谨慎 |
| Family GET alerts/vitals/movements | elderId必填单UUID+每资源授权SQL，无业务写入口 | EVD-03/09；只读种子/客观体征，不证明事件采集 |
| Care POST invitations | elderId UUID+elderAccount trim必填64；owner/target elder/demo域 | EVD-03/05；服务确定目标身份 |
| Care POST invitations/preview、POST accept | body-only43字符code；accept精确true；target/expiry/status在锁后重查 | EVD-03；不同角色/目标/过期/消费统一失败，不猜身份授权 |
| Care GET list、DELETE invitations/:id、DELETE :id | list无业务输入；UUID路径+双方权限/同长者锁/幂等撤销 | EVD-03/05；link不会授予主备/邻居角色 |

前端额外入口全部检查：loginAccount/loginPassword、regPhone/regOtp/regPassword/regPassword2、elder动态字段(name/nickname/relation/age/gender/address/phone/emergencyPhone/avatarEmoji)、relationCustom、newPlaceLabel/placeSearch/homeSearch/mapsearch/destination/tripDate/startTime及按钮/选择语言/voice/layout/radius/dwell、care code/确认。表单最终走上述DTO；年龄转换不绕过后端整数范围；搜索文字只读外部服务，坐标选择经parseLocation及成对校验。语音6类动作（求助/返家/付款/叫车/天气/联系人/目的地，其中联系人含按名）只分流同UI/API，识别文本不可信且无服务端赋权。无业务批量API；递归权限字段拦截涵盖数组/嵌套，不能把数组合法CRUD当已支持。动态外部数据schema/HTML转义esc及坐标校验核对；供应商失败契约FND-08。

范围限制：逐入口静态约束核对完整，不等于穷举全部输入运行；语音各浏览器实际识别、认知障碍用户可用性、未来新增入口未验。不存在的事件/共享输入记需求缺口而不虚构DTO。结果FND-01–06/13；现有受支持DTO未发现新的owner绕过证据。

## 十领域结果

| COV | 领域/对象和方法 | 已检查结果/EVD/FND | 未覆盖/原因及最小复检 |
| --- | --- | --- | --- |
| COV-02 | 访问控制/归属：Guard、principal、Elder.accessPredicate/resourceAccess/assertAccess/withElderWrite；Family每读写、care lifecycle、schemaFK | EVD-03/05/09；family owner与elder active link、锁后授权/真实操作者可复用；主备和共享缺失FND-01/02 | 不存在主备角色不能运行；未来扩权时补受限字段/重复撤权/并发写；未证明跨账号泄露 |
| COV-03 | 状态/重复/并发：Auth注册事务及demo advisory锁；accept目标/长者锁、唯一active索引、revoke幂等；setting保存队列、身份/长者/演示generation、routeSequence | EVD-02/03/05/09；既有锁和异步隔离有效；事件多人响应/转交无实现FND-02；路线失败旧状态FND-07 | 不重做注册/撤权；新增方式选择后需迟到和快速切换；未来事件重复/多人竞争另验 |
| COV-04 | 错误/异常：GlobalExceptionFilter、logger、api15秒、engine.handleApiError/runWithContext、amap.planRoute/ampRest/search | 400/401/403/404/409/503及DB不可用脱敏；草稿重试EVD-02/04/05/06；null归并FND-08；VAL-01模拟确认旧线FND-07 | 外部真实无路线/配额/超时未强制制造；初网络URLError是通道失败，非产品无路；未来按失败类型UI验收 |
| COV-05 | 数据一致性/删除：12表/FK/constraint、Elder删除、Family NULL/0/默认id空、care消费事务；HK today及date筛选 | EVD-03/04/08/09；7个elder关联业务表+invite/link随elder级联；账号owner/setting restrict不误删；HK today无跨时区本地日期推断；7天movement无过滤、health无7/30功能FND-03/04 | 不重跑重启/迁移；未来真实区间用HK 23:59/00:00、空/过期/边界记录；未模拟已有时区通过 |
| COV-06 | 敏感数据：scrypt固定参数、会话UUID摘要/expiry、invite codeHash/body-only、日志allowlist、位置健康、local token/照护缓存 | EVD-02/03/05/09；不输出秘密；clearIdentityData及当前撤权已验；粒度共享FND-01；历史Key暂缓DEC-03 | 不扫描输出凭据/改历史；不作法律认证；新共享数据策略上线前复检所有读取/事件/缓存 |
| COV-07 | 配置/资源：config.cjs优先级/验证，DatabaseModule异常关闭/OnShutdown，engine清timer/voice/maps，voice continuous=false，amap JSONP清理/positionGeneration | EVD-01/06/09；进程/池生命周期已有明确所有者；主动麦克风与播报不同；loadAMap超时脚本可能留存的失败重试范围记录DEC-11未确认，不猜全面无泄漏 | 未停止进程/改权限，未进行长期资源压力；确认重试脚本实际残留需隔离DOM/网络故障，核心路线判断不依赖该疑点 |
| COV-08 | 公共契约/调用方：shared API、4控制器、memopath-api、engine、旧25API契约及新增place PATCH/DELETE | EVD-05/09；成功形状/错误/NULL兼容占位保留；private setting不能静默变共享；route内部null不足FND-08 | 新功能返回合同未设计；若变internal/public caller检查版本/可观察错误；不称旧25条覆盖未来功能 |
| COV-09 | 服务职责：Auth仅身份/注册编排，Elder生命周期/同意/授权锁，Family业务/聚合，client地图/语音 | EVD-09/08；当前职责可保留，未发现本轮职责移动；FND-01–06是待规划能力 | 代理/数据融合/消息投递服务未分配；确需改职责先理由影响兼容迁移并用户决定 |
| COV-10 | 文档/运行/测试/迁移：模块README、应用README、main/config/run/test dispatcher/helpers、0000/0001与recovery/verify-baseline/restore receipt | EVD-01/08/09；隔离_test与pathmate_restore保护、固定官方镜像、备份校验/恢复流程已有；旧待实现说明FND-10；47依赖审计记录仅线索DEC-10 | 不再安装/audit fix/迁移/恢复；无具体advisory依赖路径数据不能确认47项可达；未来有ID/版本/路径再有界核对 |

至少一个PRD外SUP正常/异常有记录：SUP-01成功登录和错误401/DB503/回滚（EVD-02）；SUP-06现有无路线分支本轮模拟复核（EVD-10）。全部COV均有对象/方法/限制；评估覆盖完成不等于所有场景运行通过。
