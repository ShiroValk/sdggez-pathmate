# 路线供应商初查与后续调查计划

2026-10-09（Asia/Hong_Kong）。本轮只读代码与官方资料初查，未调用新路线API、未购买/切换供应商、未验证香港新样本。所有候选方案须在后续评估比较后由用户选择；不是已有能力保证。

## 当前实现与证据

memopath-amap.ts的planRoute支持walking/driving，只保存distance/duration/polyline；memopath-engine.ts路线页固定driving，长者导航使用walking。002Edge香港理工大学及圣德肋撒医院路线个案、重规划为用户手动证据，搜索/旧回调/位置缓存边界可复用；不代表香港公交、步行全覆盖、分段指引或无障碍可用。

## 官方资料支持什么

| 候选 | 已读官方出处与支持范围 | 未确认/不能推导 |
| --- | --- | --- |
| 高德现有服务 | [路径规划文档](https://lbs.amap.com/api/webservice/guide/api/direction)有步行/驾车/公交及公交分段字段 | 本轮未找到该页香港特定承诺或全程无障碍字段，不等于证明全产品无此能力；须查当前API版本、账号权益及香港实返回 |
| Google Routes | [公交路线说明](https://developers.google.com/maps/documentation/routes/transit-route)说明步行接驳及站点/线路/步骤；[TransitPreferences](https://developers.google.com/maps/documentation/routes/reference/rest/v2/TransitPreferences)列少步行/少换乘 | 未确认香港具体样本；这两个偏好不能证明无障碍 |
| Google Maps消费端 | [无障碍帮助](https://support.google.com/maps/answer/6396990?hl=en)说明公共交通轮椅可达选项 | 消费App选项不等于可集成Routes API能力，也不保证门到门街道/入口/设施实时可用 |
| 港铁官方资料 | [DATA.GOV.HK数据集](https://data.gov.hk/en-data/dataset/mtr-data-routes-fares-barrier-free-facilities)提供设施类别/站点无障碍CSV，月度更新；[MTR Care](https://www.mtr.com.hk/en/customer/services/mtr-care-app.html)说明电梯维护信息 | 设施存在不等于连接全程或实时可用；消费App不等于开放实时API，不覆盖全部街道/建筑或巴士车辆 |
| openrouteservice | [官方限制](https://openrouteservice.org/restrictions/)列轮椅profile；[后端标签规则](https://giscience.github.io/openrouteservice/technical-details/tag-filtering)用于可达性过滤 | 路网标签缺失/更新与香港精细覆盖需实查，不直接解决公交站台/车辆或设施故障；普通计算成功不能视作已确认 |

## 替代方案比较框架（候选，未选定）

| 方案 | 可调查覆盖 | 限制和成本 | 验证方法 |
| --- | --- | --- | --- |
| 继续高德并补证据 | 保留现有集成/地图；先核香港三方式及是否直接提供无障碍字段 | 当前产品权益、香港公交及无障碍未知；[官方升级/价格](https://lbs.amap.com/upgrade)按许可/配额核实际成本，本轮不读账号秘密或代购买 | 用同组香港公共起终点查三方式、字段、站点换乘与故障；向官方确认地域/无障碍范围 |
| Google Routes或其他供应商替换/补充 + 运营方设施资料 | 普通路线/公交步骤与港铁局部设施信息组合 | API调用、地图/地点另计及融合维护成本；许可/跨供应商展示/坐标一致性要核；没有证据的接驳和车辆仍未知 | 并行同样本对比，核真实公交路径、入口/平台/电梯及资料日期，确认可集成权限 |
| 轮椅路由引擎 + 香港运营方/人工核实 | 路网坡度/路面等轮椅路段，补站点/车辆及设施条件 | 香港标签缺失；自托管计算/更新/运营与实地核查成本，公交另需数据；[ORS计划入口](https://openrouteservice.org/plans/)本轮无法提取具体额度，待核，不声称免费无限 | 抽查缺标签路段、坡道/台阶/电梯连续性，运营方/实地核对；未知保持未知 |
| 外部可信服务/人工审核的有限覆盖路线 | 可先验证少量完整路线或引导官方服务 | 服务/API/授权未确认、人工时效及费用待报价；外跳不能当本App已完成全程规划 | 明确覆盖边界、核对当前设施/车辆，取得可追溯确认；不覆盖处提示无法确认 |

Google [官方价格表](https://developers.google.com/maps/billing-and-pricing/pricing)当前Compute Routes Essentials列每月免费额度10,000、首付费档每1,000次US$5；只是一个SKU示例，不能当整体方案报价。实际字段触发SKU、其他地图/地点调用、税费、币种换算、用量、重试和配额须后续核算。所有候选列调用成本、整合/托管/维护/数据更新/核查成本及许可，不擅自估总预算。

## 必须调查及真实验证

香港步行路网、车辆道路与公交线路是否有实际返回；公交步行接驳/上下车/站点入口/线路/换乘/时间距离字段是否完整。核坐标与地图绘制一致性、步行指引文本和线路来源，不能只看HTTP成功或接口名字。

无障碍逐段调查：全程无台阶、轮椅通行、路缘/路面/宽度坡度适用性、电梯/坡道连接及状态、入口到站台、上下车和车辆、换乘/首末段；来源缺字段不等于无障碍。记录可用性日期、运营时间、需要协助/预约条件、矛盾与未知。

结论三类为“已确认符合要求”“仅部分路段有依据”“信息不足，无法确认”；已知不满足另显式披露。已确认要求全程相关条件有可信适用证据；文档、普通步行、少换乘或最短不能替代。真实已确认样本未取得前保持待验。样本与验收见 [quickstart](quickstart.md) 及 [开发交接](development-handoff.md)。

本初查未确定供应商不足已经不可补救，也未确认任一替代方案在香港可交付全程无障碍。后续比较完成后再请用户选择。

## 2026-10-09 执行评估补充（T037–041）

以上是计划时初查，保留历史。本次EVD-11已取得指定香港真实三方式及公交换乘返回，详情见[实际样本](evidence/hong-kong-routes.md)。这校正“本轮没有真实请求”的初查时点，不证明全港或无障碍。当前应用没有公交/方式选择/证据状态，见FND-06；无障碍全程真实已确认样本仍为0。

| 官方出处（当日核对） | 已有依据 | 集成/覆盖限制 |
| --- | --- | --- |
| [高德v3方向](https://lbs.amap.com/api/webservice/guide/api/direction) | 文档有步行/驾车/综合公交、steps/segments；本轮香港确有返回 | 未见本次API提供直接全程无障碍保证；没有公开段级可达性证据不能推断 |
| [Google Transit](https://developers.google.com/maps/documentation/routes/transit-route)、[TransitPreferences](https://developers.google.com/maps/documentation/routes/reference/rest/v2/TransitPreferences) | 有步行接驳/站点/线路；偏好少步行/少换乘 | 这些偏好不是无障碍；本轮无授权Google调用凭据，香港/全程可达未运行。消费Maps轮椅选项不能当此API能力 |
| [港铁开放设施数据](https://data.gov.hk/en-data/dataset/mtr-data-routes-fares-barrier-free-facilities) | 设施类别与站点CSV，月更新，可作为站点设施证据来源 | 分类/目录不等于实时升降机、完整入口到站台连通、车辆或街道；CSV下载通道失败，未检查数据行完整性 |
| [港铁Care App](https://www.mtr.com.hk/en/customer/services/mtr-care-app.html)、[设施检索](https://www.mtr.com.hk/en/customer/services/free_search.php?station=1) | 消费端有实时升降机维护信息、须职员确认的便携斜板预约 | 无可集成实时维护/预约API合同证明，不能抓取绕过许可或替用户预约；目录不涵盖全程接驳 |
| [运输署九巴/龙运数据](https://data.gov.hk/en-data/dataset/hk-td-tis_21-etakmb)、[九巴车型设施说明](https://www.kmb.hk/storage/en.news_detail_2023.html) | 路线/站点/ETA；车队低地台、坡道、轮椅位为车辆类别证据 | ETA不含当次轮椅位/设施状态及上落站环境；历史车型说明需当日核查，城巴等运营者单独调查 |
| [ORS限制](https://openrouteservice.org/restrictions/)、[wheelchair路网过滤](https://giscience.github.io/openrouteservice/technical-details/tag-filtering) | 有wheelchair profile，过滤steps/不适合路面等OSM标签 | 标签缺失及默认允许不能当实地确认；香港路网完整度未运行，非公交全程解法 |

## 可选择的可行方案（没有自动采纳/采购）

| 方案 | 覆盖与实际依据 | 无障碍方式/限制 | 成本及许可 | 验证与选择影响 |
| --- | --- | --- | --- | --- |
| A 保留高德普通三方式＋港铁/运营者资料＋有界人工核验路线 | 当前两组HK三方式及换乘实返回；复用现有搜索/地图 | 无障碍另逐段核查，先有限公共地点试点；任意起终点缺证据显示不足，不能保证全港确认 | [高德价格](https://lbs.amap.com/upgrade)基础LBS/搜索人民币30元/万次、地图初始化3元/万次；实际账号配额/商用许可未核对。公开资料费用与再发布条件待逐源确认；人工踏勘/运营确认/更新为额外成本待报价 | 首选比较起点：变动较小，普通三方式已有真实依据。先选试点/预算/资料许可，再核实街道、入口、站内、车辆及故障；仅可信全程样本可确认 |
| B Google Routes＋Google地图＋设施资料/人工核验 | API文档可给多方式和公交字段；HK本轮未实际调用 | 本API未证明可直接轮椅全程；仍需设施融合与核查 | [价格](https://developers.google.com/maps/billing-and-pricing/pricing)Compute Routes Essentials每月免费cap10000，首计费阶每1000次USD5；Pro/Enterprise及所选字段、地图/搜索另计，实际SKU待确认。[政策](https://developers.google.com/maps/documentation/routes/policies)路线在地图展示须Google地图，归属/缓存限制，不可直接叠在当前高德 | 需授权凭据、HK同样本返回/路线可行性及费用试算。切换底图/搜索兼容成本，不因消费者App轮椅功能判通过 |
| C ORS轮椅步行＋OSM/港铁/运营者数据＋普通驾车公交供应商 | 轮椅profile文档；没有香港运行样本或全程已确认数据 | 可辅助筛除台阶/不适合路面，街道标签未知仍不足；公交/车站/车厢可达另补，不把多源拼接当已确认 | [ORS计划](https://openrouteservice.org/plans/)重定向动态页面本轮无法取价/额度，待账号确认；自托管需计算/存储/更新和运维估价。[OSM许可](https://www.openstreetmap.org/copyright)要求署名/ODbL及相关数据义务，混合来源需逐项兼容核对 | 先有界测试香港标签覆盖和未标注段比例、坐标/路径匹配；融合/运维复杂度更高，不默认替换地图或拆服务 |
| D 有限已核验公共路线目录＋运营者/可达出行协助 | 人工核验指定街道/入口/设施、运营者确认预约条件，提供可确认的有限试点 | 覆盖严格限核验线路/时段/条件；其他请求明确不足，可引导查运营者消费服务，由用户自行选择；不能冒充自动全港规划 | 不预设免费；人工/维护/服务接洽及预约费用需报价/用户批准；只链接官方消费服务不等于取得API或代订授权 | 可先取得一条可信全程样本作为USR-07验收。需指定需求/试点/复核期限、故障撤销及每段证据；无实地/运营依据仍不能确认 |

建议先选择A并结合D的有限核验试点，作为后续规格的调查方向；用户尚未选择，当前不切换、不采购、不接入。A仅普通路线实际有证据；若要求任意香港起终点均给已确认无障碍路线，四方案目前都缺足够证据，不能承诺。

无障碍记录格式仍只是评估交付：每段/接驳/入口/站台/设施/车辆列来源日期、所选要求、可达/不可达/未知、运营条件及冲突；结论三类，已知不满足另明示。成本是假设口径，不是账户已获额度或批准预算。选择前须定所需轮椅/无台阶等维度、设施更新/故障时效、踏勘条件与预算。未知项进入DEC-09，未自动设计后端代理或未来业务模型。
