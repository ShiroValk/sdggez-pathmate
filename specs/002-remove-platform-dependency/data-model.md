# Data Model: 独立归属、会话与照护授权

> 实施状态（2026-10-06）：0001模型、权限/输入/持久化、25条契约和双演示、自动备份/新库恢复及匹配0000归档已分别验证。最终干净全量与界面末轮仍单列；历史Key按用户决定暂缓处置。详见verification.md。

日期：2026-10-04。最终模型及0000/0001 SQL已实现，匹配和恢复证据见verification.md。公共字段继续遵循 `existing_app/shared/api.interface.ts`；只改变内部存储和增量授权实体。空库起步，不导入旧平台/本地业务数据。

## 公共约定

- 主键 UUID；时间 `timestamptz(3)`，对外 ISO 时间；业务日期保留 YYYY-MM-DD，默认日期和 dashboard 今天统一 Asia/Hong_Kong，避免 UTC 截日错误。
- `_created_at/_updated_at` 保留时间含义；`_created_by/_updated_by` 使用可空 UUID 外键，仅表示实际操作者。业务归属使用独立必填列；系统初始化可无审计操作者，不能无归属。
- 所有客户端 owner、creator、审计、session、isDemo 与权限伪造字段拒绝。服务端控制 role（只注册时允许两种值）、is_demo 和资源归属；角色不提供自助更改入口。
- 演示隔离从 owner/account 的 `is_demo` 推导；演示资料不放进普通账号，关联两端必须同一演示域。模拟内容由资料来源与界面标识呈现，不修改既有 status 字段含义。

## 账号 `memopath_account`

| 字段 | 规则 / 用途 |
| --- | --- |
| id | UUID 主键 |
| account_key | trim 后 1–64 字符、唯一；保持大小写语义，不按手机号或姓名合并 |
| password_hash | text，沿用 salt:hash scrypt 格式；密码注册 8–128 字符，不 trim；不返回 |
| role | family / elder，检查约束，注册后不可经普通业务修改 |
| display_name | 1–100 字符，沿用注册 elder.name 来源 |
| is_demo | bool，默认 false；保留 demo 账号标识，只有显式种子可设 true |
| session_token_hash | 可空 64 位 hex SHA-256；唯一非空值；不存返回的原始 token |
| session_expires_at | 可空时间，和 token_hash 同时存在或同时为空；默认有效期 86400 秒 |

单活动会话：未登录/注销 → 登录事务替换摘要及到期时间 → 有效 → 到期或撤销。注册成功可原子创建会话；失败不留下账号、初始长者或孤立会话。并发重复账号以唯一约束裁决并映射 409。注册 family 创建一位归属长者；注册 elder 延续原请求结构，仅创建账号和显示名，不自行生成可访问照护资料。

## 长者 `memopath_elder`

保留 id、name、nickname、relation、age、gender、address、phone、emergency_phone、avatar_emoji 与公共响应。新增必填 `owner_account_id` → 家属账号，账号删除默认 restrict；服务校验 role=family。`name` trim 非空≤100，nickname/relation≤100，age 整数 0–130，gender≤20，address≤255，电话≤32、可选空值保留，emoji≤16。不引入新性别枚举或强制所有电话带区号。

建立 `(id, owner_account_id)` 唯一键供关联复合外键使用，owner 索引覆盖列表查询。删除长者按现有 cascade 删除联系人、行程、围栏、地点、行踪、体征、告警和授权记录；操作前检查家属所有权，使用事务，仍存活的长者账号保留但失去关联。

## 设置 `memopath_setting`

id UUID；新增必填唯一 `account_id` → 本地账号；config jsonb。继续存 snake_case 键 `language/voice_mode/lock_layout`，对外 camelCase 不变。language={mandarin,cantonese,english}，voiceMode={default_on,standby}，lockLayout boolean；缺记录时返回既有默认 cantonese/default_on/false，保存原子 upsert。两角色仅 GET/PUT 自己的账号设置；不利用照护关联读取家属私人设置，不新增 PRD 双端设置同步。

## 关联业务资料

| 实体 | 保留字段与约束 | 替代及一致性 |
| --- | --- | --- |
| memopath_elder_contact | elder_id FK，name≤100，relation≤100，phone≤32，avatar_emoji≤16 | owner/授权从 elder 推导；家属新增，关联长者只读 |
| memopath_trip | elder_id，destination≤255，真实 trip_date，start_time/end_time≤8，schedule_mode auto/manual，status | 日期必须真实；空时间保留，非空 HH:mm、双方有值时结束≥开始；默认 pending，模拟 call 仍 cab_called，不代表外部叫车 |
| memopath_geofence | elder_id 唯一，home_label≤100，radius_m 100–5000，dwell_enabled bool，dwell_minutes 1–120 | 保留默认800/true/18与无记录的 id='' 响应，不伪装保存；原子 upsert |
| memopath_place | elder_id，label≤100，icon≤16，place_type frequent/beacon，beacon_status safe/strange | 新增 address varchar255 默认''、lng/lat nullable double；有限数、[-180,180]/[-90,90]且同时提供。未提交位置公开响应仍兼容 0/0，库区分未提供和真实0值，提交的值完整读回 |
| memopath_movement | elder_id、occurred_date、location≤255、status safe/out_of_range、note≤255 | 沿用只读列表，不新增真实位置事件写入；演示/测试样例明确来源 |
| memopath_vital | elder_id、heart_rate、blood_oxygen、temperature numeric、steps、recorded_at | 沿用 latest/trend 及既有查询窗口，空数据 latest=null，不新增设备接入或健康采集 |
| memopath_alert | elder_id、alert_type、title/location≤255、status、occurred_at | 沿用只读记录和现有 status，不将演示“已通知”解释为真实投递 |

所有 elder FK onDelete cascade；写入者审计随真实 principal，关联/归属不能从任意请求字段赋值。新记录授权决定和写入同事务，使用长者行锁；并发撤销先获取同一长者锁，再完成授权变更，保证撤销返回后新请求不使用旧缓存。只读请求在 SQL 中包含有效关联条件，不缓存关联结果跨请求。

## 邀请 `memopath_care_invitation`

| 字段 | 规则 |
| --- | --- |
| id / elder_id / family_account_id | UUID；(elder_id,family_account_id) 指向长者及其 owner，删除长者 cascade |
| target_elder_account_id | 指定 role=elder 账号 FK，不能猜测编号成为授权 |
| code_hash | 唯一 SHA-256 摘要；原 code 为随机32字节 base64url，生成时一次返回 |
| status | pending / accepted / revoked；到期通过 expires_at 判断，无需定时任务才能拒绝 |
| created_at / expires_at / consumed_at | expires 默认创建后600秒；消费时间服务端设置 |

家属创建时核实 owner、目标角色和 demo 域，无有效 link；替换同 elder/target 的待用邀请时在事务中撤销旧邀请。code 不进入 URL、日志或备份清单。预览必须已登录且目标账号匹配，仅返回必要的长者/家属显示名、邀请 id 和 expiry。接受锁定邀请、长者和目标账号，核对 expiry/status/角色/域/owner，再建立 link 并标 accepted；回滚时全部不变。过期、撤销、重放、错目标和已有关联明确拒绝，不产生关联。

## 照护关联 `memopath_care_link`

id UUID；elder_id、family_account_id、elder_account_id；status active/revoked；授权 created_at/accepted_at 与 revoked_at。复合 FK 保证家属确为该长者 owner；账号 FK restrict。active 状态的 elder_id 和 elder_account_id 各自建立部分唯一索引；家属可管理多 elder，但同一 elder 不支持多个家属照护者。

状态：无关联 → 双方明确邀请/接受 → active → 任一方撤销 → revoked。任一方只能撤销自己参与的关联；无关联者不能查看关联详情。角色非法/跨 demo 域在服务验证，接受时 DB 唯一约束兜底并发冲突。邀请不发送短信，不依据演示验证码授权。

## 迁移版本与启动兼容

| 版本 | 内容 | 升级与验收 | 回滚策略 |
| --- | --- | --- | --- |
| 0000 independent_core | 空库标准UUID/时间、账号和有限会话、显式归属、现有业务核心表及FK/唯一约束；无平台自定义类型 | 首次仅允许空目标schema，无迁移账本却有业务表则拒绝；真实family账号读写、归属和基础资料测试；保存匹配0000的编译产物用于恢复验收 | 初始化失败事务回滚；完整初始化的非空库不能以drop表/删卷回退。需回到初始化前则保留数据导出和备份、人工明确选择空新库，不自动清空 |
| 0001 care_and_place | 新增邀请/link、地点地址坐标及校验，必要索引；不更改公开字段 | 将0000上的测试账号、长者及关联资料升级，检查归属/行程/设置未变，新地点保存及关联授权通过；重复migrate无变化 | 恢复升级前0000备份到新库，切换匹配0000产物；新地点及授权数据按下文隔离处理，不能静默丢失 |

Drizzle schema为最终目标，SQL按0000/0001拆分并保留各快照、journal和review；用generate/custom SQL而非生产push。迁移脚本持有数据库级advisory lock，按账本和校验和识别已应用版本、拒绝漂移。应用启动比对其最低/最高支持版本、表列和必要约束，连接成功不等于schema正确；缺表、少列或不匹配时不监听业务端口。配置不足时build可独立完成，但start/migrate须失败。

## 备份、回滚与恢复的可审阅步骤

1. **触发**：迁移失败、归属/数量/字段核对不一致、权限或既有契约回归。暂停应用及写入，保留故障版本和迁移日志；不直接重试到覆盖状态。
2. **前提**：升级前custom-format备份已执行 `pg_restore --list` 和隔离恢复；保存应用构建/代码标识、lockfile、schema版本和数据核对清单，实际密钥另存本地；磁盘空间、目标权限和停止写入条件已核对。
3. **升级后新增数据**：如库可读，先对失败库完整备份，另导出升级后变化的脱敏核对信息。新地点/新关联可能无法在旧版表示；保持隔离待后续修复升级，不直接回灌，不承诺零数据损失。明确恢复点到停写间差异及用户处理选择。
4. **恢复**：将升级前备份恢复到新的 `pathmate_restore_<timestamp>` 数据库，不覆盖源库；迁移账本与业务数据来自同一备份。校验表数量、FK、owner、settings唯一、账号/关联不混域、字段值及到期/撤销状态。
5. **应用兼容**：使用匹配旧schema的保存构建运行登录、退出、家属隔离和保存读取；会话恢复后先统一撤销所有恢复的会话，防止被备份重新激活的旧token继续使用。核对通过后在不提交配置中切换DATABASE_URL并重启。
6. **证据/收尾**：保存恢复库名、备份校验和、实际步骤、数据差异和验收结果，保留故障库直到明确处理；普通 `compose down` 保留卷，不能执行 `down -v` 当恢复方案。相关命令合同见 operations.md，实际执行前仍须核对前提。
