# Contracts: 路線預覽與相容邊界

日期2026-10-11，設計契約；沒有新增已部署端點。字段與演算規則以[data-model](../data-model.md)為準，用户结果以[spec](../spec.md)為準。

## C01 — 使用者可見契約

- 主要tripMap有方式選擇、起終點、一般輪椅開關、查詢狀態、方案／同段備選、摘要、文字步驟、來源与無障礙卡；用可操作button/select和清楚文字状态，不靠颜色判資料類型。沿用三語文字系統，來源原名可保留。
- 步行／驾车有效返回呈现有序步骤；公交接驳与ride依原序，缺內容显示未提供。分段线只画供應商已提供片段；目的地marker不能替代路线。
- 新結果的格式化需辨null與合法0，0顯示0米／0秒，不能直接沿用目前最少1米／1分鐘的舊formatter。旧export的formatter契约不改，新UI加对应格式化策略并测边界。
- 結果來源：live「真實當次查詢｜高德｜查询时点」；static「靜態設施資料」或「歷史回放｜原查詢時點」；simulated「模擬情境」。设施卡有自己的來源／日期／範圍，不能继承live路线标签。
- 未完成／暂緩是能力状態，沒有成功方案；原因可看见。失败显示在持續狀態区域，toast可輔助但不作唯一证据；旧文字、線、摘要、结论同步清除。
- 可显式選replay／simulation，提示所用sample及来源；live失败畫面不自动把结果替換。页面前端demoMode或真实demo account與此route sourceMode分开。
- 只在资料充分时confirmed；一般静态设施目录只提示部分/不足与条件。不自行定位接收方、不启用追踪／录音／预约或真实通知。

## C02 — 新增內部queryRoute介面

拟在既有client adapter新增`queryRoute(query: RouteQuery): Promise<RouteQueryOutcome>`，模式walking/driving/transit。只返回当前请求快照对应的数据，不操作engine DOM、不写业务DB、不改变身份。transport请求失败、格式失败、no-route分辨依data-model。engine决定是否接受请求context与显示，不让adapter猜用户已切換。

live模式使用既有AMAP_KEY注入与v3來源：walking/driving保持路径，transit为direction/transit/integrated、city/cityd=香港、extensions=all；有效origin/destination经既有URLSearchParams编码。按官方callback规则用output=JSON。不在文檔或日志输出真实Key／完整查询URL。错误码只映射已验证的官方值，未知保持provider/unknown。

用统一unknown边界验证顶层status、route与方案集合，再驗证嵌套步驟／站點／數值／坐標；合法空集合才能no-route。有可用方案但缺某字段返回success＋缺口。parser为纯函数，不能调用真服务补造缺段。transport timer／script／callback完成／失败／取消时清理，不新增CORS代理或SDK。

replay与simulation从各自明确资料入口读取，再经同样模型验证；不通过catch选择这些来源。来源切换需用户动作与新的context。静态回放必须是许可允许、去敏后的真实完整结果，若无payload则只展示历史记录，构造模型为模拟。

## C03 — 既有相容契約

| 既有边界 | 本设计保持 | 验證方式 |
| --- | --- | --- |
| planRoute(mode:'walking'\|'driving',from,to):Promise<AmpRoute\|null>；AmpRoute的distanceM/durationS/points | export签名、字段、既有回传策略保留；新增queryRoute不重解释该接口。新UI使用新增介面，不借旧缺字段零值呈现成功 | 全库rg核调用方、型別检查、旧入口正常／失败回归；不以新UI行为自动证明legacy export一致 |
| 地图搜索／geocode／loadAMap／position cache | 共用transport的JSON＋callback修正需在所有搜索／解析入口复检，现有有效搜索与清理不能回归 | V03/V10，四入口与重试／旧回调；定位TTL边界旧测试 |
| tripMap自动驾车、主页搜索步行、返家步行 | tripMap可选mode與公共起点；其他入口保留walking默认，共享新状态与错误处理 | 三入口独立成功／失败与清除，行程文字不被自动猜坐标 |
| /api/memopath与shared契約、认证／角色／照护 | 无请求字段、响应形状、访问权限／错误码变更；无新增route endpoint或持久偏好 | 既有contracts／permissions／auth／demo回归＋身份／elder UI；比对server/shared未改 |
| 位置与麦克风 | 无新增周期上传／远端共享、录音、手表依赖 | 网络写请求检查、输入公共点与定位拒绝场景，复用而不扩大既有权限 |

旧export回传策略目前包括缺值处理与错误→null，是历史行为，不作新UI设计标准；保持其契约避免擅自改受支持API，相关展示改用queryRoute。其改動若实际需要超出本表，先提供具体旧／新调用例、字段／错误差异与过渡方案供用户确认。

## C04 — 服務職責與回退

memopath-amap：现有前端高德调用、地图与定位；route-model：前端数据解析／验证；route-state：纯请求匹配；route-accessibility：静态资料与结论；engine：用户选择、状态／身份生命周期与展示。沒有Auth/Elder/Family责任转移或新的跨服务调用。

回退触发：新结果误标、旧context回填、旧搜索／导航回归或来源标识不完整。停用新演示入口并回到已保存的匹配前端构建／配置版本；静态資料与客户端作为同一版本回退，不删用户记录、不改Key或Git历史。核旧搜索、三旧入口、身份及配置；旧缺陷若重新出现必须披露，回退不等于缺陷已修复。

本设计无迁移，数据库回滚不適用。后续如确需迁移先提交：迁移原因／数据归属、旧读者相容、触发条件、备份或快照前提、逆向／恢复步骤、新数据保留策略、不可逆风险及验证；未具可审阅可执行计划不得迁移。如需要后端代理／服务调职，同样先提影响与方案，不由第三方失败自动授权。
