# 发现登记

日期2026-10-09。共13个唯一发现；每项一个主分类，归属/模拟/隐私/兼容为交叉标签，不另计数。静态可确认缺口或错误，但不声称实际通知/设备/浏览器通过。全部均已确认所述代码差异或建议依据；尚未实测的场景仍明确待验，依赖漏洞/无障碍未知见decisions，不当已证实漏洞。

| ID | 主分类 | 归属/交叉标签 | 优先级 | 状态/验证 |
| --- | --- | --- | --- | --- |
| FND-01 | 需求缺口 | 跨端 | P1 | 已确认；仅静态证据（供应商返回另限EVD-11） |
| FND-02 | 需求缺口 | 跨端 | P1 | 已确认；仅静态证据（供应商返回另限EVD-11） |
| FND-03 | 需求缺口 | 跨端 | P1 | 已确认；仅静态证据（供应商返回另限EVD-11） |
| FND-04 | 需求缺口 | 跨端 | P2 | 已确认；仅静态证据（供应商返回另限EVD-11） |
| FND-05 | 需求缺口 | 跨端 | P2 | 已确认；仅静态证据（供应商返回另限EVD-11） |
| FND-06 | 需求缺口 | 端侧，供应商依赖 | P2 | 已确认；仅静态证据（供应商返回另限EVD-11） |
| FND-07 | 代码缺陷 | 端侧 | P2 | 已确认；已运行验证（仅模拟依赖，EVD-10） |
| FND-08 | 代码缺陷 | 端侧 | P2 | 已确认；已运行验证（仅模拟依赖，EVD-10） |
| FND-09 | 章程违反 | 端侧，模拟标签/需求交叉 | P2 | 已确认；仅静态证据（供应商返回另限EVD-11） |
| FND-10 | 章程违反 | 文档/跨端 | P2 | 已确认；仅静态证据（供应商返回另限EVD-11） |
| FND-11 | 可选改进 | 后端/公共契约 | P3 | 已确认；仅静态证据（供应商返回另限EVD-11） |
| FND-12 | 需求缺口 | 扩展/跨端/硬件 | P3 | 已确认；仅静态证据（供应商返回另限EVD-11） |
| FND-13 | 代码缺陷 | 端侧 | P2 | 已确认；已运行验证（仅模拟依赖，EVD-10） |

## FND-01 共享自主控制与关闭后的过滤缺失

依据：REQ-011–013/055–057；章程围栏上传基线。预期及完成条件：先DEC-06明确紧急例外；保留owner/link；后续逐端关闭/刷新/缓存/撤权/后续事件验证，不用联系人替代授权。

现状：现有care consent只授权关联，无位置/健康开关及逐读取/缓存/事件门禁；不能声称长者可自主关闭。 证据位置：EVD-09；engine elderSettings/overview、Family.getSetting/listAlerts/getVitalSummary/listMovements、schema setting/careLink；材料hash和日期见[evidence-index](evidence-index.md)。

影响/优先级理由：新增真实数据共享前影响隐私自主权；现未发现周期上传，不声称已有泄露。 P1按安全/隐私真实使用影响；现未授权上线这些缺失链路，不自动阻塞独立公共地点路线研究。

复核/依赖/验收：先DEC-06明确紧急例外；保留owner/link；后续逐端关闭/刷新/缓存/撤权/后续事件验证，不用联系人替代授权。 对应处置及职责/兼容/迁移在[disposition](disposition.md)及[开发交接](development-handoff.md)。

## FND-02 求助、防误触、分级与主备响应闭环缺失

依据：REQ-004–007/016–019/060/061。预期及完成条件：先DEC-04/05/06/07确定号码、时限、受限权限；后续用隔离合成事件检查长按/取消/重复/并发响应/备用可见及失败回执；本轮不发送。

现状：SOS仅click/语音toast，无长按/确认/真实事件POST、GPS发生事实、送达/响应/转交；种子alert不是通知。 证据位置：EVD-09；engine:953/2212/2422，Family.listAlerts:334/seedDemoInTransaction:423、principal/schema/controller；材料hash和日期见[evidence-index](evidence-index.md)。

影响/优先级理由：安全核心尚不能作为实际求助工具；前置安全规则影响多人权限，不假设短信/电话真实接通。 P1按安全/隐私真实使用影响；现未授权上线这些缺失链路，不自动阻塞独立公共地点路线研究。

复核/依赖/验收：先DEC-04/05/06/07确定号码、时限、受限权限；后续用隔离合成事件检查长按/取消/重复/并发响应/备用可见及失败回执；本轮不发送。 对应处置及职责/兼容/迁移在[disposition](disposition.md)及[开发交接](development-handoff.md)。

## FND-03 位置安全事件、站点及本地提醒链不完整

依据：REQ-020–022/032–039/041–044/058/062。预期及完成条件：先DEC-05/08确认阈值与原型历史范围；保留配置/地点API；后续检测→事件→提醒→接收→记录，按围栏上传基线及离线去重验证。

现状：围栏/地点配置真实保存；安全页明示未接自动侦测或送达。无站点进入/默认陌生/独立通知开关/提前提醒/7日事件关联；后端阈值存在，UI只显示。 证据位置：EVD-04/09；engine.safety:1079/overview:1095、Family.saveGeofence:221/listMovements:377、DTO/schema；材料hash和日期见[evidence-index](evidence-index.md)。

影响/优先级理由：保存配置不能证明风险检测；离线本地与在线家属送达均有断点。 P1按安全/隐私真实使用影响；现未授权上线这些缺失链路，不自动阻塞独立公共地点路线研究。

复核/依赖/验收：先DEC-05/08确认阈值与原型历史范围；保留配置/地点API；后续检测→事件→提醒→接收→记录，按围栏上传基线及离线去重验证。 对应处置及职责/兼容/迁移在[disposition](disposition.md)及[开发交接](development-handoff.md)。

## FND-04 主观健康、固定提示、跟进及即时叮嘱缺失

依据：REQ-024–030/063。预期及完成条件：先DEC-08健康模拟与跨端、DEC-06共享控制；后续八状态固定文案、HK区间/空态/跟进/本人可见/只读目录/即时叮嘱闭环，生活参考不作医疗判断。

现状：客观体征仅最近1小时GET；没有八状态打卡/提示目录/7或30日/跟进写/即时短消息接收。 证据位置：EVD-09；Family.getVitalSummary:352、family.controller/shared/schema及engine全入口搜索；材料hash和日期见[evidence-index](evidence-index.md)。

影响/优先级理由：无法完成主观健康管理；不能用体征seed/医疗扩展替代。 P2影响现有交互可靠性或核心完整性；本轮只登记。

复核/依赖/验收：先DEC-08健康模拟与跨端、DEC-06共享控制；后续八状态固定文案、HK区间/空态/跟进/本人可见/只读目录/即时叮嘱闭环，生活参考不作医疗判断。 对应处置及职责/兼容/迁移在[disposition](disposition.md)及[开发交接](development-handoff.md)。

## FND-05 家属配置下发、完整语言、提醒模式及布局消费缺失

依据：REQ-001/008–010/045–051/059。预期及完成条件：保留私人设置语义；先确认共享配置与本人控制边界；后续全页三语言+播报+同步+锁定/恢复验证；不得静默把私人PUT改为共享。

现状：私人设置保存通过，但只principal.accountId；voiceMode/lockLayout没有告警播放/nav消费。elderSettings仍可改语言，天气等硬编码。 证据位置：EVD-05/09；Family.getSetting/saveSetting:151–189，engine.nav:574/settings:1030/voiceLang:2061，voice adapter；材料hash和日期见[evidence-index](evidence-index.md)。

影响/优先级理由：持久化不等于长者生效；非持续麦克风已符合，不需更改为后台监听。 P2影响现有交互可靠性或核心完整性；本轮只登记。

复核/依赖/验收：保留私人设置语义；先确认共享配置与本人控制边界；后续全页三语言+播报+同步+锁定/恢复验证；不得静默把私人PUT改为共享。 对应处置及职责/兼容/迁移在[disposition](disposition.md)及[开发交接](development-handoff.md)。

## FND-06 首功能尚无方式选择、公交分段与无障碍证据呈现

依据：USR-ROUTE-01–07；REQ-002。预期及完成条件：先HND-07/08修复与DEC-09供应商/预算/确认口径；后续独立功能规格保留所有USR验收，三种方式+接驳/换乘+可信三类无障碍结果。

现状：底层walking/driving；路线页固定driving，返回丢弃instruction；无transit选择或无障碍状态。真实HK供应商返回已取得，应用未接入。 证据位置：EVD-09/11/12；amap.planRoute:267/AmpRoute:19、engine.planTripRoute:1865/planAndDraw:1973；材料hash和日期见[evidence-index](evidence-index.md)。

影响/优先级理由：首功能不能启动实现时假定完整供应商能力；路线方案有返回不证明可通行/全港/无障碍。 P2影响现有交互可靠性或核心完整性；本轮只登记。

复核/依赖/验收：先HND-07/08修复与DEC-09供应商/预算/确认口径；后续独立功能规格保留所有USR验收，三种方式+接驳/换乘+可信三类无障碍结果。 对应处置及职责/兼容/迁移在[disposition](disposition.md)及[开发交接](development-handoff.md)。

## FND-07 新规划待定或失败保留旧路线与摘要

依据：SUP-06；USR-ROUTE-03/07。预期及完成条件：不依赖后端；后续复核等待/无路线/权限超时/快速切换/旧响应迟到时清晰当前状态，旧路线不可冒充当前。真实浏览器补验仍需执行。

现状：clearRouteOverlays只在route非null后调用；getPosition等待和route=null期间旧线/摘要仍留。routeSequence/context挡旧回包，不能消除当前失败旧显示。 证据位置：EVD-09/10；engine:1973–2005；VAL-01抽取当前函数，合成无路线后overlay=1/detach=0/旧摘要仍留；材料hash和日期见[evidence-index](evidence-index.md)。

影响/优先级理由：用户可能把旧目的地或旧方式路线当当前结果；独立于002已验搜索与迟到身份保护。 P2影响现有交互可靠性或核心完整性；本轮只登记。

复核/依赖/验收：不依赖后端；后续复核等待/无路线/权限超时/快速切换/旧响应迟到时清晰当前状态，旧路线不可冒充当前。真实浏览器补验仍需执行。 对应处置及职责/兼容/迁移在[disposition](disposition.md)及[开发交接](development-handoff.md)。

## FND-08 服务错误与成功无路线归并null

依据：SUP-06；USR-ROUTE-07；章程V可观察错误语义。预期及完成条件：与HND-07协同；后续区分无路/网络/超时/认证配额，检查支持调用方兼容；若变返回契约先版本/迁移说明，不在本评估设计响应模型。

现状：planRoute捕获任何错误返回null，与status=1且paths=[]相同；engine只发相同toast，不能判断无路还是依赖失败。 证据位置：EVD-09/10；amap:267–296、engine:1985–1990；VAL-01合成服务异常和无paths都null；材料hash和日期见[evidence-index](evidence-index.md)。

影响/优先级理由：失败原因与恢复方法不可区分；不能把本轮通道URLError算真实供应商无路线。 P2影响现有交互可靠性或核心完整性；本轮只登记。

复核/依赖/验收：与HND-07协同；后续区分无路/网络/超时/认证配额，检查支持调用方兼容；若变返回契约先版本/迁移说明，不在本评估设计响应模型。 对应处置及职责/兼容/迁移在[disposition](disposition.md)及[开发交接](development-handoff.md)。

## FND-09 天气及语音SOS部分呈现未明确模拟

依据：REQ-052–054；章程I。预期及完成条件：无后端依赖；后续逐真实/前端演示模式核对页面/播报及五天气模拟双端边界；不接真实天气或电话作为这项修复前提。

现状：天气卡曼谷31°及固定预报无模拟/参考声明，语音SOS toast只999。前端demo总标识、payment/手动SOS的演示声明已存在，不能推所有页面已标。 证据位置：EVD-09；engine.weather:953/956–957/handleVoiceCommand:2212–2214/payment:976/action sos:2422；材料hash和日期见[evidence-index](evidence-index.md)。

影响/优先级理由：普通真实会话也看到固定天气，可能误读为实际香港天气/求助；原型仍须明确模拟。 P2影响现有交互可靠性或核心完整性；本轮只登记。

复核/依赖/验收：无后端依赖；后续逐真实/前端演示模式核对页面/播报及五天气模拟双端边界；不接真实天气或电话作为这项修复前提。 对应处置及职责/兼容/迁移在[disposition](disposition.md)及[开发交接](development-handoff.md)。

## FND-10 旧0000待实现说明与当前0001及运行证据冲突

依据：章程IV/VII；SUP-02/05。预期及完成条件：无业务迁移依赖；后续有界同步运行/方法说明，保留历史并标旧时点；不重跑已成功恢复，本轮只登记。

现状：服务README首段称0001未实现，若干assertOwnership/地点占位叙述已过时；迁移README旧段称恢复工具待实现而后文已实现。部分地图公共函数缺完整错误/副作用契约说明。 证据位置：EVD-09/08；server/modules/memopath/README.md首段与0001增量，migrations/README.md旧段与自动恢复段，amap.planRoute/loadAMap；材料hash和日期见[evidence-index](evidence-index.md)。

影响/优先级理由：接手者可能错误重做迁移/授权或误解失败契约；旧阶段记录必须注明有效时点，不删除历史证据。 P2影响现有交互可靠性或核心完整性；本轮只登记。

复核/依赖/验收：无业务迁移依赖；后续有界同步运行/方法说明，保留历史并标旧时点；不重跑已成功恢复，本轮只登记。 对应处置及职责/兼容/迁移在[disposition](disposition.md)及[开发交接](development-handoff.md)。

## FND-11 后续数据增长时评估列表分页

依据：SUP-02；Family.listAlerts/listMovements既有行为。预期及完成条件：待采纳；先量测真实合成数据规模与查询，收益达标再规划；代价为前后端分页/排序一致与公开响应兼容，风险漏项，不能自动变必做。

现状：现按长者返回全部记录，无limit；尚无数据量性能失败证据，PRD未要求分页。 证据位置：EVD-09；Family.listAlerts:334/listMovements:377；材料hash和日期见[evidence-index](evidence-index.md)。

影响/优先级理由：可能降低长历史传输和渲染成本；目前不能判必要修复。 P3辅助扩展或未证明影响的建议，不自动安排实现。

复核/依赖/验收：待采纳；先量测真实合成数据规模与查询，收益达标再规划；代价为前后端分页/排序一致与公开响应兼容，风险漏项，不能自动变必做。 对应处置及职责/兼容/迁移在[disposition](disposition.md)及[开发交接](development-handoff.md)。

## FND-12 便民预约、机构及手表扩展未接入

依据：REQ-064–077；手机独立基线。预期及完成条件：用户另行选择范围后规划；本人确认预约、家属只读、通知开关、来源区分分别验收；依赖对应服务/授权/告警基础，现无提供方。

现状：付款仅演示，消息朗读/社区医疗预约/机构视图无实现；客观体征seed不是手表采集，无设备来源事实。 证据位置：EVD-07/09；engine.payment/handleVoiceCommand、schema/shared/principal；材料hash和日期见[evidence-index](evidence-index.md)。

影响/优先级理由：扩展需求有记录但不属于本轮手机首功能；不得接硬件或扩大后端必做。 P3辅助扩展或未证明影响的建议，不自动安排实现。

复核/依赖/验收：用户另行选择范围后规划；本人确认预约、家属只读、通知开关、来源区分分别验收；依赖对应服务/授权/告警基础，现无提供方。 对应处置及职责/兼容/迁移在[disposition](disposition.md)及[开发交接](development-handoff.md)。

## FND-13 安全页滞留开关元素无法触发已有委托

依据：REQ-040；SUP-02现有围栏配置。预期及完成条件：无后端前置，后续修复端侧事件入口并在浏览器单击/键盘/保存/刷新及服务失败草稿验证。

现状：safety输出i[data-action=toggleDwell]，onClick只从button读action；非button分支无toggleDwell后return。后端保存与002布局锁修复均不覆盖此入口。 证据位置：EVD-09/10；engine:1091/2493/2569–2598；VAL-03转译现有onClick，模拟匹配非button目标后dwellEnabled仍true/render=0；材料hash和日期见[evidence-index](evidence-index.md)。

影响/优先级理由：可见开关不能改变配置，属于现有UI错误；不要求重写后端配置服务。 P2影响现有交互可靠性或核心完整性；本轮只登记。

复核/依赖/验收：无后端前置，后续修复端侧事件入口并在浏览器单击/键盘/保存/刷新及服务失败草稿验证。 对应处置及职责/兼容/迁移在[disposition](disposition.md)及[开发交接](development-handoff.md)。

去重规则：FND-03只含位置链缺失，具体已存在开关失灵为FND-13；FND-05只含消费/下发缺失，不重开002已修复布局锁按钮保存。FND-06是新功能差异，现有失败状态错误单列07/08。FND-09主分类章程违反，天气缺口交叉引用不另开同一发现。FND-12只汇总扩展，核心即时叮嘱仍FND-04。FND-11明确待采纳，不进入必要修复/必做分母。
