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
