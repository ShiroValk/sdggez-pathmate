# 有界增量复核：VAL-01 / VAL-03

日期2026-10-09；唯一执行任务T035。只从当前源码读取函数，通过现有TypeScript transpileModule转译，bundled Node运行。业务源码/测试/应用配置未改变，没有连接DB或调用真实求助。源码hash见SRC-04/05。定位、DOM、地图及供应商依赖均明确模拟；结果不能当真实浏览器/香港线路验收。

## VAL-01 当前失败状态（SUP-06，USR-ROUTE-03/07，FND-07/08）

触发：此前002已验搜索失败和身份迟到响应，但未覆盖有旧路线时重新规划失败。代码先await getCurrentPosition/planRoute，再在成功分支clearRouteOverlays。

方法：读取engine.planAndDraw及clearRouteOverlays原函数；模拟仍连接的地图容器、已有overlay一个/摘要OLD ROUTE、有效身份、已解析位置，planRoute返回null。执行当前函数，分别记录overlay数量、setMap(null)次数、摘要是否改变。另读取amap.planRoute，分别让ampRest抛合成服务错误，或返回status=1且paths=[]，核对两个返回值。位置0/0仅合成参数，不声明真实定位。

| 场景 | 原始脱敏输出 | 结论 |
| --- | --- | --- |
| 当前无路线分支 | retained_overlay_count=1；detach_calls=0；retained_summary=true；failure_toast=true；exit0 | 确认该分支保留旧线/摘要，FND-07；等待阶段由静态控制流支持，未做真实浏览器等待验收 |
| 合成依赖失败 | case=provider_failure；result=null；exit0 | 当前错误归并null |
| 成功但无paths | case=no_paths；result=null；exit0 | 与失败同结果，FND-08 |

先行探针只记录摘要和toast，不足以直接证明overlay清除次数；随后使用当前clearRouteOverlays原函数及计数补全上述证据。两次均是模拟，不另分配VAL或扩大场景。

复检条件：后续修复有独立授权后，在真实浏览器已有路线→新目的地/方式待定→无路线/失败，观察线条、摘要、指引当前状态；快切/迟到仍应保持sequence/context保护。真实供应商无路线与权限/配额/网络失败另记，不把合成故障作为供应商真实失败。

## VAL-03 滞留开关入口（REQ-040，FND-13）

触发：逐输入检查发现safety输出i[data-action=toggleDwell]，onClick只提取button；002布局锁已修button，但并未涵盖这个不同入口，具有当前代码矛盾和具体用户影响。

方法：读取engine.onClick完整原函数转译执行；模拟dataset.action=toggleDwell但没有button/其他委托祖先的目标，与当前i模板结构匹配。state.geofence.dwellEnabled=true，render计数0。实际输出：`dwellEnabled=true，render_calls=0，exit0`。静态对应engine:1091/2493/2569–2598证明动作分支不可达。

结论：现有开关失灵已确认，验证程度为已运行验证（仅合成DOM目标）；真实点击/键盘/保存/刷新尚未验。后端dwellEnabled API已验范围继续EVD-04，不重跑。仅端侧必要修复，不制造后端缺失。

T035完成是已按门禁复核并记录差异，不是代码修复或产品验收通过。未执行资源长期压力、真实通知、硬件或全量测试。
