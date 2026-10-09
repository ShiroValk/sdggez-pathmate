# API Contract: 现有接口兼容与照护授权

> 实施状态（2026-10-06）：0001模型、权限/输入/持久化、25条契约和双演示、自动备份/新库恢复及匹配0000归档已分别验证。最终干净全量与界面末轮仍单列；历史Key按用户决定暂缓处置。详见verification.md。

日期：2026-10-04。现有契约基线来自当前 `auth.controller.ts`、`elder.controller.ts`、`family.controller.ts` 和 `shared/api.interface.ts`，共25条。以下为最终合同，实际覆盖与未通过事项见verification.md。页面 `/`、`/memopath` 和内部流程继续保留；不新增真实采集、告警投递、短信或叫车服务。

## 认证和响应

- 所有受保护请求沿用 `x-memopath-token`，UUID字符串；缺失、伪造、到期、撤销均401。数据库不可用为503，不把服务错误归类成账号失效。登录/注册返回 `MemoPathLoginResponse {accountId,role,displayName,token}`，me不返回token。成功响应继续直接对象/列表包装，不增加全局成功envelope。
- GET/PATCH/PUT/DELETE 成功200；现有POST保留Nest默认201。新增POST也201，新增预览显式200。JSON content type不变。退出有效会话201 `{message}`；旧token重放401。重新登录替换旧会话，默认有效期24小时。
- 错误继续 `{error:{code,message,timestamp,details?,fieldErrors?}}`。保留400 BAD_REQUEST、401 UNAUTHORIZED、403 FORBIDDEN、404 NOT_FOUND、409 CONFLICT、500 INTERNAL_ERROR；503 SERVICE_UNAVAILABLE及429 TOO_MANY_REQUESTS为已有枚举的适用结果。requestId通过 `x-request-id` 响应头返回。未知异常不返回stack/cause，日志只存脱敏诊断信息；用户消息可本地化，调用方依code/status处理，不依赖固定文字。
- 当前非法UUID曾在SQL异常映射为404，目标提前验证仍返回404 NOT_FOUND，避免因验证修复改变这个错误约定；缺必需参数400。有格式正确标识但不存在资源404；存在且无权限保持403且无资源详情。明确elderId若不在权限范围，不能静默替换为列表第一位。

## 全部现有接口及权限矩阵

F = 家属且为资源owner；E = 与本人长者存在有效关联的长者；S = 当前已认证账号的私有设置；P = 无需登录的公开认证入口。E对其他长者一律拒绝。未关联长者账号仍可me/退出及自身设置，长者列表为空、dashboard空态；指定照护资源拒绝。演示账号按相同矩阵且不得跨demo域。家属与长者账号均不具备机构或管理员特权。

| # | 方法/路径（前缀 `/api/memopath`） | 输入 | 成功响应 / 权限 |
| --- | --- | --- | --- |
| 01 | POST /auth/otp | MemoPathOtpRequest `{phone}` | MemoPathOtpResponse `{code,expiresIn}`，P；明确演示，不是短信核验 |
| 02 | GET /auth/exists | account查询 | MemoPathAccountExistsResponse `{exists}`，P；缺/空串维持false |
| 03 | POST /auth/register | MemoPathRegisterRequest | MemoPathLoginResponse，P；family/elder角色，原子注册，不接收owner字段 |
| 04 | POST /auth/login | MemoPathLoginRequest | MemoPathLoginResponse，P；wrong password401，显式演示账号同样真实验证 |
| 05 | GET /auth/me | token | MemoPathAccount，任一已认证账号 |
| 06 | POST /auth/logout | token | MemoPathMessageResponse，任一已认证账号，服务端撤销 |
| 07 | GET /elders | token | MemoPathElderListResponse `{items}`；F自己的全部、E至多本人1条、未关联E空列表 |
| 08 | POST /elders | MemoPathElderInput | MemoPathElderRecord；family，服务端设置owner；elder403 |
| 09 | PATCH /elders/:id | partial elder input | MemoPathElderRecord；F，E拒绝管理写入 |
| 10 | DELETE /elders/:id | UUID | MemoPathMessageResponse；F，E拒绝 |
| 11 | GET /elders/:id/contacts | UUID | MemoPathContactListResponse；F/E只读 |
| 12 | POST /elders/:id/contacts | MemoPathContactInput | MemoPathContactRecord；F，E拒绝 |
| 13 | GET /dashboard | 可选elderId | MemoPathFamilyDashboardResponse；F自己的或E本人，空态既有null/[]；显式无权限elderId拒绝 |
| 14 | GET /trips | 必需elderId | MemoPathTripListResponse；F/E |
| 15 | POST /trips | MemoPathTripInput | MemoPathTripRecord；F，E拒绝行程管理 |
| 16 | POST /trips/:id/call | UUID | MemoPathTripRecord；F/E本人允许操作，status=cab_called的真实保存，但叫车明确为模拟 |
| 17 | GET /settings | token | MemoPathSettingResponse `{config}`；S，仅当前账号 |
| 18 | PUT /settings | MemoPathSettingConfig | MemoPathSettingResponse；S，仅当前账号 |
| 19 | GET /geofences/:elderId | UUID | MemoPathGeofenceRecord；F/E |
| 20 | PUT /geofences/:elderId | partial MemoPathGeofenceInput | MemoPathGeofenceRecord；F，E拒绝 |
| 21 | GET /places | 必需elderId | MemoPathPlaceListResponse；F/E |
| 22 | POST /places | MemoPathPlaceInput | MemoPathPlaceRecord；F，E拒绝管理写入；地址坐标须读回 |
| 23 | GET /alerts | 必需elderId | MemoPathAlertListResponse；F/E本人，既有记录不证明投递 |
| 24 | GET /vitals | 必需elderId | MemoPathVitalSummaryResponse `{latest,trend}`；F/E本人 |
| 25 | GET /movements | 必需elderId | MemoPathMovementListResponse；F/E本人 |

### 增量地点操作接口（不计入既有25条）

地点管理页面已有新增、编辑及删除流程；为使这些操作真正持久化，补充以下兼容增量，不修改上述25条的路径、方法、状态码或响应字段：

| 方法/路径（前缀 `/api/memopath`） | 输入 | 成功响应/权限 |
| --- | --- | --- |
| PATCH /places/:id | `MemoPathPlaceUpdateInput`，至少一个字段；坐标须成对 | `MemoPathPlaceRecord`，仅家属且有该长者管理权限；长者账号403、未知UUID404、空更新400 |
| DELETE /places/:id | UUID | `{message}`，仅家属且有该长者管理权限；长者账号403、未知UUID404 |

更新/删除在长者行锁和当前 principal 授权检查内完成。页面仅在服务端成功后更新列表；失败保留草稿和原记录。演示模式只改当前内存状态并明确告知未写数据库。新搜索结果若高德未返回有效location，保留未解析状态并拒绝确认；既有地点的空数据库坐标继续按旧响应兼容映射为0/0，更新其他字段时不回写坐标。

E允许读取本人上述照护资料，不能取得F账号的私有设置、其他长者列表或私人账号数据。联系人存在不授予联系人登录访问权。位置/健康分享开关及全PRD同步仍由001完整评估，本次不制造新共享能力，也不绕过既有有效隐私控制。新发现冲突或有效契约破坏须遵循章程确认。

## 新增关联接口（增量能力）

统一前缀 `/api/memopath/care-links`。由新控制器委托ElderService处理长者归属及授权，不将业务归属逻辑放到数据库模块或AuthService。下列所有入口均要求真实会话及DTO验证。

| 方法/路径 | 输入和权限 | 响应及状态变化 |
| --- | --- | --- |
| POST /invitations | F；body `{elderId, elderAccount}`，后者为指定长者登录账号键 | 201 `{invitationId,code,expiresAt}`；验证owner、目标role及相同demo域，生成600秒有效邀请，只返回一次code；不能按姓名/手机自动绑定 |
| POST /invitations/preview | 指定E；body `{code}` | 200 `{invitationId,elder:{id,name},family:{displayName},expiresAt}`；仅目标已登录账号可预览，未确认不创建link |
| POST /accept | 指定E；body `{code,confirm:true}` | 201 `{id,elderId,status:'active'}`；事务校验、消费邀请、创建link；明确确认，不认演示OTP |
| GET / | 已登录F/E | 200 `{items:[{id,elderId,status,acceptedAt}]}`；仅自身参与的active link，无code、密码或无关账号信息 |
| DELETE /invitations/:id | 创建邀请的F | 200 `{message}`；撤销本人邀请；已经消费409，无权限403，已撤销本人请求可幂等200 |
| DELETE /:id | 关联F或E | 200 `{message}`；active→revoked，本人重复撤销可幂等200，不删除审计事实 |

无效code（形状错误400；无匹配/过期/撤销/消费或错目标统一409 INVITATION_UNAVAILABLE，通过error.code=CONFLICT及非敏感details区分业务类别）不暴露目标身份；角色不符403，目标账号不存在或不是长者时409且不泄露资料；唯一关联冲突409。同elder/目标的重新邀请撤销旧pending；有active关联须先撤销，不隐式替换。code不得在URL、日志或普通资源列表中出现。

## 输入合同与兼容修复

| 输入域 | 服务端规则 | 兼容及失败验证 |
| --- | --- | --- |
| account/exists | account trim后1–64；原大小写语义；exists缺/空维持false；拒绝数组/对象 | 超长、非字符串400，重复409；演示账号键保留，不自动按手机号合并 |
| password/role | 注册8–128、登录1–128且不trim；family/elder枚举，非空 | 格式拒绝400，认证失败401；错误演示密码不能重置已保存密码 |
| 嵌套elder | 必须为完整对象、name trim后非空≤100；其余字段长度/范围见data-model | 缺对象或非法嵌套400，注册事务无半成品；年龄0/可选空字符串保留 |
| 正文未知/权限字段 | 普通未知字段延续whitelist剥离；owner/accountId/isDemo/audit/权限伪造字段明确400 | 不允许未知字段取得权限；对合法旧调用样例作契约回归，不全局forbid所有未知字段 |
| resource UUID | 路径/elderId严格UUID，查询只接单字符串 | 非法UUID404、缺elderId400，无权限403且不访问DB写入 |
| 文字/电话/emoji | 各字段长度按表；可选空值保留；电话非空允许常用数字、+、空格、括号及连字符，不能超长度 | 注册账号键不当作已核验手机号，保留现有+852和空值样例；错误类型/非法字符400 |
| 行程 | YYYY-MM-DD需真实日历日期，非空时间HH:mm；空时间保留；两者非空则end≥start；auto/manual | 日期正则不足；无效日期、时间范围、顺序400；不新增过夜行程模型，记录该验证影响 |
| 围栏 | radius整数100–5000、dwell整数1–120、bool精确类型；partial合并后验证 | 范围/类型400；不伪造记录保存，缺记录保持原默认响应 |
| 地点 | 经纬度有限数、正确范围、同时提供；address≤255；枚举和label非空 | lng/lat一方缺400；未提供时保留旧响应0/0，实际值完整保存；SQL标准numeric/double而非字符串冒充 |
| token头 | 单值UUID；不接受数组、空白或多token拼接 | 401；日志不记录原头值；不把可解析字符串当有效会话 |
| invitation | code为32字节随机base64url格式，长度43；confirm必须boolean true | 400/409；错目标、重放、过期、并发必须无新增link |
| 语音输入 | 转换结果复用同一DTO/业务边界，提醒不持续监听 | 不从语音路径绕过权限或验证；没有后端写入的本地功能不伪造新API |

原响应字段的必填/默认值、列表包装、数值、日期时间及snake_case存储/camelCase对外映射不变。修复owner、角色越权、登录错误转演示、退出吞错、地点丢失字段和敏感stack输出，属于已确认安全/真实性缺口，记录前后样例；不把它们当必须保留的合法契约。

## 客户端可观察行为

- 开发由Vite代理，构建后由Nest同源页面/API服务；未知API返回JSON404而非SPA HTML，刷新现有页面成功。
- me验证后由服务端role决定真实入口；F切换“长者视图”只改变显示，不产生E身份，不修改真实账号role。E未关联显示待授权说明和显式关联确认入口，不显示他人样例冒充真实资料。
- 注册成功进入既有相应流程，家属注册创建其资料；长者注册进入待关联页面。两端不自动建立同名/手机号关联。
- 网络、超时、保存失败保留可重试输入且不toast成功；401清除身份并要求登录；退出本地清理但服务端撤销未确认时明确提示旧会话可能仍有效至到期，恢复连接后可用暂存于内存的凭证重试撤销，不在日志/新持久缓存保留。
- 前端演示不发送业务写请求；演示账号遵守同一接口和权限，不混入普通资料。地图无Key/无效Key/权限拒绝只使地图不可用，不阻断其他流程。

### me身份元数据补充

me保留accountId/role/displayName且新增可选isDemo:boolean，来源是服务端账号事实，只用于持续展示模式与保存含义，
客户端不可设置它或据此授予权限。login/register仍返回原四字段；contracts套件25/25方法/状态/字段检查通过。
两类演示、真实/演示切换及错误摘要/失败保留输入页面证据见verification.md，不代表叫车/告警/通知已送达。
