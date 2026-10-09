# Phase 0 Research: 评估基线与证据接续

日期：2026-10-09（Asia/Hong_Kong）。只读研究完成；未知业务规则转为评估待确认事项，不为其设计业务方案。

## 材料基线

代码HEAD为 `5e7883477c06ea325c603a4576213b707ee71efe`，002修复提交为`6b6aa6d`。开始时Git工作树无已报告改动，忽略成果不触碰。评估执行时重新记录HEAD、dirty差异及相关文件hash。

| 文件 | SHA256 |
| --- | --- |
| docs/PRD (1).pdf | 20FA8C1F306828472D31DF25073E23E727568D07D1E4823A539C6E192116AB53 |
| .specify/memory/constitution.md | 7EB949885E11C2D051982E75F6A529E63616A2BDDB0048174634EF5320551FF4 |
| specs/001-audit-backend-gaps/spec.md | E96155DF26A9D1DE958168C5D65064E76F05D3D4E3858CA162A693C48BDEF43D |
| existing_app/client/src/pages/MemoPathPage/memopath-engine.ts | C3AFCFB0FC692D4E157C7014B765520E4F346D8246DE0EA41B5772DB36F014CE |
| existing_app/client/src/pages/MemoPathPage/memopath-amap.ts | 1E1D06631B645156C9190CBF9A634C7B5D6C3D705220AD31BEC6AEAC247EA8EB |

PRD共13页，全部文字重新读取，本轮不评价PDF视觉布局。章程v1.0.1与001规格保留。引擎和地图hash与002最终记录一致。还读取package.json、schema、shared接口、Family服务/控制器、Elder服务/照护控制器、语音适配及服务README；用于规划定位，非全面代码审查或新运行通过。按speckit-plan研究步骤进行了只读证据研究代理核对，没有派发实现。

## Decision: 从最新002证据接续

**Rationale**：[verification.md](../002-remove-platform-dependency/verification.md)“2026-10-09 最终补验”修正了10月8日迟到错误证据及搜索边界。76/76是实施任务数，不是全部FR/SC达标。结合25FR/10SC/10DEP索引读取，保留历史失败和被替代的理由。

**Alternatives considered**：重跑converge/全套件重复合格范围；复制早期001线索会把已修复平台/归属/认证当缺口。均不采用。

| 复用ID | 002来源 | 可复用到001的范围 | 不覆盖/增量目标 |
| --- | --- | --- | --- |
| REUSE-01 | verification：US1独立安装与启动续验、最终复检、FR-001/002/013/017及DEP，config7/startup3 | 独立启动、配置失败、无平台依赖、干净安装/构建 | 非全部PRD或当前服务在线证明，不再安装/构建 |
| REUSE-02 | verification：认证阶段、FR-003/004/007/009/012，auth2；browser-acceptance B01–B13 | 注册登录me、有限会话/退出/失败/事务/基本隔离 | OTP仅演示；manual-auth-validation是步骤，不证明短信或手机号核验 |
| REUSE-03 | verification：US3 0001、FR-005/006、SC-003、permissions1、照护页面、最终迟到错误 | A/B/E资源隔离、邀请预览同意/撤销、写锁/并发 | 不证明主备/邻居角色及分级隐私；联系人不是协同授权 |
| REUSE-04 | verification：FR-008/009/016、T068/T069、10月8/9补验，persistence3 | 已有资料/围栏/地点读写、PATCH/DELETE、NULL与0、应用/数据库重启 | 仅已验数据路径；不是主观健康、告警生成或配置同步 |
| REUSE-05 | verification：T071/T072、“迟到授权错误：通过”、contracts1/validation1 | 8秒真实401/403、旧成功/身份/长者/演示隔离、撤权缓存、连续设置/失败草稿 | 早期15秒配置证据不足；账号私有设置不是家属下发 |
| REUSE-06 | verification：T073/T074、“旧地图搜索结果：通过”、Edge手动路线、position-cache1 | 四入口失败/无结果/旧回调保护、5分钟边界、Edge定位重规划 | 不证明穷举第三方次序或长者远端追踪/围栏事件；内置定位仍阻塞 |
| REUSE-07 | verification：FR-015、SC-009、demo1及演示边界图 | 前端演示零业务写、真实demo持久化与普通隔离 | 不把种子告警/体征/叫车变真实服务 |
| REUSE-08 | verification：FR-018/019/024、SC-007，migrations3/verify-recovery；operations合同 | 0000/0001迁移、备份恢复、旧匹配产物 | 未来业务迁移另附回滚方案；不重做恢复/操作现有卷 |

执行评估时每条复用补实际测试或符号、场景、原结果、版本适用性及未覆盖条件；只链接原记录/图片，不改原文件。同代码不同需求仍需增量检查，不能借复用扩大通过范围。

## Decision: 模型及合同只约束评估资料

**Rationale**：001实体是需求、证据、发现、覆盖、核对及交接。采用Markdown字段、枚举、引用、统计及验收规则；不生成SOS/打卡/通知表、未来端点、消息协议、服务拆分或SQL。

**Alternatives considered**：直接设计未来业务超出FR-017；跳过记录模型会失去去重和交接约束。

## Decision: 首个功能改为多出行方式与无障碍路线支持

**Decision**：按用户本轮追加指示撤回隐私控制/配置同步的首功能推荐，首个开发范围改为新建“多出行方式与无障碍路线支持”。此前隐私/同步仍在001评估领域及潜在依赖，不自动扩大路线范围。

**Rationale**：用户要求香港步行、驾车、公共交通及无障碍证据边界；现有代码与002证据仅提供局部地图基础。先做供应商调查和香港真实覆盖验证计划，再由后续功能规划设计实现。[route-provider-research.md](route-provider-research.md)记录官方初查及候选比较，[development-handoff.md](development-handoff.md)保留全部新增验收要求。

**Alternatives considered**：普通步行、少换乘或最短路线不得替代无障碍；消费者App功能不等于开放API；文档存在不能替代香港实际返回。没有可信全程资料时须明确无法确认，不生成貌似已验证的路线。本轮不建业务规格、购买/切换服务或实施。

## 限制与待确认

- 历史Key继续暂缓轮换/停用/历史清理，002 FR-014/SC-008该范围未完整达标；不显示值、不重开处置。
- 内置浏览器定位拒绝、旧Chrome自动化连接阻塞、Edge手动成功分开。本轮未新测DB、服务、浏览器或真实位置。
- 001历史source-context和服务README存在旧阶段“待实现/待验”文字；当前0001与新证据已存在。安排文档一致性核对，不依据旧段落判业务缺失。
- p2与p7–8位置、p7与p10语音、p1–2与p12–13手表矛盾按三基线执行，是已决定项，不重列为假设。
- p8号码示例与香港场景/当前演示999矛盾；响应/转交时限、滞留阈值示例、备用权限、紧急时共享关闭处理、p9无需API与p4/p11健康跨端记录范围，留待确认，不猜数值/隐私例外。
- 付款码/预约等扩展优先范围待明确；先记录来源现状，不入首批必做分母。消息朗读不能自动排除核心叮嘱接收。
- npm安装47项漏洞报告仅核查线索，未证实当前可达风险；不运行audit fix或强制升级。

规划方法没有未解决技术选型；产品规则以明确决策记录保留，评估可继续，依赖这些规则的未来设计不得自行推进。
