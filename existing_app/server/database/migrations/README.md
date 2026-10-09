# 独立 PostgreSQL 迁移

唯一目录为本目录及 `meta/`；提交 SQL、Drizzle 快照及 journal。当前仅有
`0000_independent_core` 及增量 `0001_care_and_place`，空库初始化，不导入旧平台数据，不使用 `db push`。
从 `existing_app` 运行 `npm.cmd run db:generate/check/migrate/status`。
`db:migrate -- --to 0000` 使用数据库级事务锁，同一事务应用 SQL 和账本；
再次执行不改数据。SQL/快照与已应用账本的校验和不同、未知非空 public
schema 或缺表均拒绝。check/status 只读，并通过 Windows 凭据连接执行 SELECT 1。

## 0000 回滚计划

触发条件：初始化报错、结构核对失败、后续归属或契约回归。
初次初始化出错时，事务回滚全部 SQL 和账本；先检查数据库仍为空，再修正
原因并重试。不得把手工删表、drop schema、删除卷或 `compose down -v` 当回滚。
成功初始化后若已有数据，停止应用写入，保留故障库及诊断；在容器内使用
官方 `pg_dump -Fc` 写临时文件，再复制到忽略的 `.local-backups/`，不能用
PowerShell 文本重定向备份二进制。恢复前必须验证 `pg_restore --list`、隔离
恢复、空间/权限以及匹配0000的构建和lockfile。自动备份/恢复命令尚待T057–T059实现。

需要回到初始化前状态时，不覆盖非空源库；导出并保留现有数据，明确选择
新的空数据库后再初始化。恢复既有0000备份时仅使用新的
`pathmate_restore_*`库，不自动切换应用。先撤销全部恢复会话，再核对表数量、
字段、FK、owner、设置唯一及演示域；使用匹配0000产物验证登录、退出、
两账号隔离和保存读取，通过后才由操作者修改不提交的连接配置并重启。
没有有效备份、匹配构建或隔离验证时，回滚验收未通过。故障后新增数据须
另行备份并隔离，不能静默覆盖或承诺零损失。0001需另附升级及恢复计划。

## 0001 升级与回滚

0001只新增邀请/关联表及地点address/lng/lat，保留0000字段、SQL、快照与账本校验和。
本次构建仅支持0001；升级前的构建已保存到被忽略的 `.local-baselines/0000/app`。
`node scripts/verify-upgrade.cjs` 在全新且没有应用连接的专用测试库执行0000初始化、
代表性资料写入、官方容器pg_dump -Fc、pg_restore --list、恢复到另一新测试库、
0001升级及重复升级；保存本机备份和脱敏manifest。不修改开发库或自动切换3000应用。

正式升级先停止应用写入，确认空间/权限及匹配0000基线；在容器内使用
`pg_dump -U <本机数据库用户> -d <源库> -Fc -f /tmp/pathmate-before-0001.dump`，
使用 `docker cp <db容器>:/tmp/pathmate-before-0001.dump .local-backups/` 保存，
核对SHA-256、pg_restore --list并恢复到尚不存在的新库验证。所有凭据仅本机配置，
不要将含密码URL放入命令、输出或文档。随后执行 `npm.cmd run db:migrate -- --to 0001`。

若升级事务或数量/归属/权限核对失败，停止写入并保留故障库及日志。库仍可读时
另备份升级后完整资料，单列新增地点坐标和授权记录，隔离待修复，不回灌旧版。
创建尚不存在的 `pathmate_restore_<timestamp>`，以 `pg_restore -U <用户> -d <新库>
--exit-on-error <备份文件>` 恢复，不覆盖源库，不执行drop/down -v或原地降级。
恢复后先清空账号session_token_hash及session_expires_at，核对表数量/FK/owner/字段，
在 `.local-baselines/0000/app` 按其lock执行npm.cmd ci，并仅注入恢复新库的本机配置，
用该归档构建启动，验证真实登录/退出/两账号隔离及保存读取后再切连接。
最新0001构建拒绝0000库是预期行为；自动恢复命令及完整恢复实演仍待T055–T060。

### 自动恢复工具已实现（2026-10-06）

scripts/recovery.cjs由db:backup/restore/verify入口调用，参数/停写/权限/空间和匹配构建步骤见应用README。
只接受.local-backups平面.dump非链接路径，已有文件拒绝覆盖；backup检查其他连接并锁住所有业务表，
官方pg_dump -Fc和pg_restore --list后真正建隔离库恢复、字段/结构核对，成功才写verifiedRestore=true。
失败archive/副本保留供诊断，不作为已验证恢复点。restore新建pathmate_restore_*、全部会话撤销，
verify基于receipt和备份清单核对原数据，列/约束/索引/FK/角色/owner/唯一性及照护域/消费状态。
0000归档实际登录/退出/隔离/保存/重启由verify-baseline --restored确认；新版拒绝旧库是预期。
升级后故障0001另备份，新账号/地点/授权不自动回灌0000；演练结果见verification.md。

### 恢复前置检查（2026-10-08）

`db:restore` 在复制归档或创建新数据库前，验证归档为可读的非空普通文件、
`.local-backups` 当前账户有读写/遍历权限、恢复目标尚未存在，并以
`gosu postgres test -w /var/lib/postgresql/data` 检查PostgreSQL OS用户写权限。
随后分别读取容器 `/tmp` 与数据目录 `df -Pk` 可用空间；低于归档大小3倍加64MiB
的保守估算时，在数据库操作前拒绝恢复。Windows备份目录至少需有1MiB可用空间
以写入恢复凭据。该估算不等于精确展开大小保证；运行环境无法报告空间或权限
时按未验证前提失败关闭。失败只留下脱敏诊断，不删除/覆盖归档、源库或卷，
也不更改ACL。不会通过填满磁盘或改权限制造失败测试；确定性测试验证容量
判定边界与缺失归档拒绝路径，正常恢复另由隔离新库演练证明。
