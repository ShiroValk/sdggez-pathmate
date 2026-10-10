# 001 评估证据索引

日期：2026-10-09，Asia/Hong_Kong。执行的是001评估，不是业务开发或002再次converge。起始HEAD `47a3e937bc2f8fbef04c10d2bb660fc8b5d807b1`，分支 `chore/spec-kit-git-workflow`；起始status/staged为空。Spec Kit返回FEATURE_DIR/FEATURE_SPEC为001；feature.json指向001，Process/User/Machine的SPECIFY_INIT_DIR、SPECIFY_FEATURE_DIRECTORY、SPECIFY_FEATURE、SPECIFY_FEATURE_NO_PERSIST共12项均为空。忽略的配置和验收成果保留，未清理。

## 材料 SRC

| ID | 路径/版本及范围 | SHA256或版本 |
| --- | --- | --- |
| SRC-01 | docs/PRD (1).pdf，pypdf逐页读取13页；原PDF只读 | 20FA8C1F306828472D31DF25073E23E727568D07D1E4823A539C6E192116AB53 |
| SRC-02 | .specify/memory/constitution.md，v1.0.1/2026-10-04 | 7EB949885E11C2D051982E75F6A529E63616A2BDDB0048174634EF5320551FF4 |
| SRC-03 | 001 spec.md；plan/research/data-model/contracts/quickstart/tasks沿用当前HEAD | spec E96155DF26A9D1DE958168C5D65064E76F05D3D4E3858CA162A693C48BDEF43D |
| SRC-04 | existing_app/client/src/pages/MemoPathPage/memopath-engine.ts | C3AFCFB0FC692D4E157C7014B765520E4F346D8246DE0EA41B5772DB36F014CE |
| SRC-05 | 同目录memopath-amap.ts | 1E1D06631B645156C9190CBF9A634C7B5D6C3D705220AD31BEC6AEAC247EA8EB |
| SRC-06 | existing_app/server/modules/memopath/dto.ts | B86BB71980B03F63FE7C25967CC993CB1169C69A701413E2784D34B15FD508C9 |
| SRC-07 | 同目录family.service.ts | F659F08D92E635B106CF984CB31F14C30DF1B3C33FE349EE3272591E9BF1D22F |
| SRC-08 | existing_app/server/database/schema.ts | 101E4AAE6FB6C8C57C531832DCDE85231DF5C9D9108808DCDE68A3674AE94001 |
| SRC-09 | 002 verification.md、browser-acceptance.md、contracts、测试及现有源码 | 当前HEAD；002修复6b6aa6d；最新2026-10-09最终补验优先 |
| SRC-10 | 用户本轮首功能追加要求 | USR-ROUTE-01–07；独立于PRD分母 |

起始对001可编辑评估资料之外的356个已跟踪文件建立SHA256快照，包括业务、002、001规格/历史上下文/清单；结束逐文件对照。未读取或快照私人数据库/忽略成果内容。历史source-context不作为当前认证/平台缺口结论。

## 既有运行证据：本轮未重跑

下列EVD-01–08均来自[002最新记录](../002-remove-platform-dependency/verification.md#2026-10-09-最终补验)，结合原章节、正式测试及[页面记录](../002-remove-platform-dependency/browser-acceptance.md)。当前业务hash/差异无变化，证据有效；旧失败、15秒超时导致推断不足的历史保留，不作为通过。正式9套件22项不是PRD全功能验收。

| EVD / REUSE | 原定位/场景/工具/日期 | 适用结论 | 限制/复检条件 |
| --- | --- | --- | --- |
| EVD-01 / REUSE-01 | verification启动/配置及最终补验；startup3/config7，真实进程，10-09 | 可复用独立配置/启动、拒绝缺配置 | 不证明本轮服务在线；相关配置或脚本变动再最小复检；不再安装 |
| EVD-02 / REUSE-02 | 认证章节、最终auth2、B01–B13，隔离真实库/浏览器，10-09 | 注册/login/me/logout、有限会话、scrypt、回滚、竞争注册 | OTP仅演示，无短信或手机号认证；manual-auth-validation仅操作步骤 |
| EVD-03 / REUSE-03 | US3/permissions1/照护页面及最终8秒真实403，10-09 | A/B/E资源隔离、明确同意、撤权、同事务锁 | 不覆盖主备/邻居分级角色或共享开关；权限代码变动才增量 |
| EVD-04 / REUSE-04 | persistence3、T068/069、独立数据库重启夹具，10-08/09 | 资料/地点/围栏保存，PATCH/DELETE，NULL/合法0、重启读回 | 不证明事件生成/消息送达；既有六类资源按各自场景复用 |
| EVD-05 / REUSE-05 | T071/072、最终8秒401/403计数；contracts1/validation1，10-09 | 旧身份/长者/演示响应隔离、撤权清缓存、连续设置保存/草稿重试 | 账号私人配置不是家属下发；不覆盖未来方式切换 |
| EVD-06 / REUSE-06 | T073/074，四搜索入口及旧JSONP仍待回调后改词、position-cache1；Edge用户手动，10-08/09 | 搜索失败/空态/重试/旧回调；5分钟边界；圣德肋撒医院驾车显示/重新规划 | 不是第三方次序穷举或远端长者轨迹。内置定位拒绝；Chrome历史连接阻塞不是定位失败 |
| EVD-07 / REUSE-07 | demo1及演示边界，10-09 | 前端演示零业务写、真实demo独立持久化 | 种子告警/体征、cab_called、OTP不证明真实通知/叫车/短信 |
| EVD-08 / REUSE-08 | migrations3/verify-recovery、operations合同，10-09 | 0000/0001、备份隔离恢复、旧匹配产物 | 不覆盖未来迁移；本轮不迁移、不恢复、不操作卷 |

## 本轮证据

| ID | 方法与记录 | 可证明 / 不可证明 |
| --- | --- | --- |
| EVD-09 | 当前4控制器/DTO/guard/3服务/schema/shared/api/engine/amap/voice及运行文档静态追溯；见[检查覆盖](inspection-coverage.md) | 现有环节、搜索范围、差异；仅静态证据，不证明运行送达 |
| EVD-10 | VAL-01/03，有界执行现有路线与点击委托函数、模拟定位/地图/供应商/DOM依赖；见[增量复核](evidence/inspection-validation.md) | 合成依赖下失败保留旧线/摘要及滞留开关委托不可达；不是浏览器或真实路由供应商验收 |
| EVD-11 | VAL-02，16次成功真实高德公共香港地点搜索/三方式查询；见[香港路线](evidence/hong-kong-routes.md) | 指定地点真实返回；不证明全港、全程可走或无障碍 |
| EVD-12 | 当日官方供应商/港铁/政府资料；见[供应商研究](route-provider-research.md) | 文档及部分设施资料；API存在/消费App功能不能证明集成和全程确认 |
| EVD-13 | 文档ID/字段/链接/计数/diff及保护性检查；见[交付复核](working/delivery-review.md) | 交付一致性；SC-006于2026-10-11用户批准免除，不算实际审阅通过 |

边界：不输出Key/token/密码/真实私人坐标；真实HTTP只查询公开地点，使用本机既有凭据，不购买/切换服务。受限网络首次URLError记录为通道阻塞，正常权限重试另记真实返回。历史Key继续暂缓处置，002 FR-014/SC-008该项未完整达标，不扩大为隐私例外。忽略、Docker、ESLint保护规则已只读核对，应用不发布包，无新增安装/运行配置需求。
