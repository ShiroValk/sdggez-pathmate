# Quickstart: 后续评估执行与验收

本轮只规划，以下为后续评估指南，不是本轮执行结果。不会启动002收尾或converge。完整交付见 [交付合同](contracts/assessment-delivery.md)，记录字段见 [data-model.md](data-model.md)。

## 1. 上下文保护

在仓库根目录执行只读检查：

```powershell
git branch --show-current
git status --short
Get-Content .specify/feature.json
Get-ChildItem Env: | Where-Object Name -Match 'SPECIFY|SPECKIT'
.specify/scripts/powershell/check-prerequisites.ps1 -Json -PathsOnly
```

另核对Process/User/Machine的SPECIFY_INIT_DIR及SPECIFY_FEATURE_DIRECTORY；如覆盖001，先纠正调用上下文，不操作002。脚本FEATURE_DIR/FEATURE_SPEC须为001，实际Git分支与脚本BRANCH分别记录。保存HEAD/dirty差异及材料hash，不清理当前成果/环境/服务/卷，不复跑setup-plan覆盖已有规划。

## 2. 先复用后增量

读取PRD全部13页、001 spec、章程、research及002最新verification。建立REUSE→EVD→CAP映射，核对代码场景/数据条件，使用已有测试断言与页面记录，不再运行合格全套件。

当发现相关代码变化、证据矛盾、过期文档、原场景不足或未覆盖的高风险环节时，先静态追溯、说明缺口，再安排最小范围验证。已有测试运行入口为 existing_app 下 `npm.cmd run test:integration -- --suite <实际已有套件名>`，仅在必要时选择auth/permissions/validation/persistence等；运行前读run.ts/helper保护条件及原证据。不要按此指南默认执行全量命令或再执行002恢复/重启。

新增验证使用合成账号、隔离测试库及明确故障；不得影响现有服务/真实账号/数据。无法满足条件则记验证阻塞及可执行复核步骤，不降低断言或伪造成功。任何需要新增业务代码才能验证的缺口，留后续开发，不在评估中补实现。只清自己的临时产物且确认路径/归属，现有忽略成果保持。

## 3. 全面静态追溯

按plan领域表枚举独立需求及所有输入/资源入口；分别追溯求助、位置、主观健康、配置同步、隐私五链路。每个环节填状态、证据支持的边界及限制。主动检查FR-018十类，PRD未写的行为用SUP。查香港跨日、关联删除、重复/并发、依赖不可用、空/旧数据、授权关闭、跨账号/角色等适用边界。

## 4. 首功能路线调查与香港实测计划

用户已指定“多出行方式与无障碍路线支持”。先读 [route-provider-research.md](route-provider-research.md) 和 [development-handoff.md](development-handoff.md)。本轮只有官方文档初查和代码证据，尚未请求新路线。

后续调查优先用明确香港公共地点作为起终点，无需取得用户实时位置；分别保存供应商/日期/方式/时间条件、脱敏真实返回和核对结果。现有凭据的许可/配额若不足则记阻塞，不轮换历史Key、不购买或接入新供应商；替代方案比较完成后交用户选择。

至少覆盖九龙短程、港岛多入口/高差、跨区且可换乘、新界路线；候选公共地点如香港理工大学→圣德肋撒医院、中环码头→香港大学、沙田站→尖沙咀站。先核对具体公开入口及可用线路，不预设所有方式必有路线，也不预认定无障碍。步行/驾车/公交分别调用核查路径、时间距离、分段指引；公交核查接驳步行、站点、线路、换乘及时间条件。使用已授权有效凭据前明确请求边界，保留真实结果失败/无路线。

无障碍逐段查街道/建筑入口/电梯坡道/站点到站台/上下车/车辆/换乘及实时不可用条件。缺证据输出部分或信息不足；已知不符合明确披露。全程确认样本需有足够新的可信来源和必要实地/运营方核对，不能用普通步行或最短策略替代。若尚不能取得这样的真实样本，保留该验收待验，模拟只测显示/异常边界。

## 5. 交付复核

核对ID唯一、引用、全部FR/SC覆盖、统计去重、可选独立、章程及开发依赖。抽样检查完整链路及一项PRD外行为，T047独立交接审阅已于2026-10-11由用户批准跳过，无需安排。文档检查用 `git diff --check`；本阶段无业务变更，不默认重跑lint/build或002收尾。
