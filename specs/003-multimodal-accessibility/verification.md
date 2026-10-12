# Verification Plan and Delivery Scope: 003

日期2026-10-11。003 已實作共同模型、來源門禁、三方式預覽、版本隔離與保守輪椅提示；驗證範圍如下。受控返回不是當次真實高德或實地證據，001／002仍只證明歷史時點。

## 檢查與運行證據編號

| ID | 检查與可觀察結果 | 必須保存的實作後證據 |
| --- | --- | --- |
| V01 | 共同模型／信任边界：允許值、有限坐标含0、缺／空／負／NaN数值、缺instruction／站名、几何坏点／缺段、部分可解析／全畸形、合法空方案vs失败 | route-model Node断言输出＋去敏测试来源；模拟解析证明，不是live覆盖 |
| V02 | 公交：完整方案分开、首／末／换乘walk、ride顺序、同段备选不加乘车段、未知段transferCount未知、改备选总量适用性、不可變原方案與導出呈現分開 | 独立模型输出、结构对照；V04另证当前UI |
| V03 | 当前真实浏览器三方式：少量明确香港公共点、时间／距离／文字／几何与响应一致；callback JSON修正及不依赖定位建图 | public sample、当次查询时间／类型／次数、去敏规范结果、截图与当前产物；历史HTTP不可替代 |
| V04 | 当前公交指引／换乘UI：上下车、接驳、同段备选、选择／缺字段反馈与真实或回放一致 | 含換乘场景截图／步骤、合法原结果引用；若构造则标simulated，不当真实 |
| V05 | 状态与隔离：前置解析／定位起即失效；正反快切；旧成功／旧失败；nav/back同屏、身份／elder／demo／source、卸载；查询中切需求；A→B→A及同段備選往返不重查、兩種版本拒絕舊評估、新查詢拒絕舊批次 | state断言＋受控UI操作日志／截图，分别证明线、摘要、文字、結論清除，記往返選擇的路線請求增量0、原批次未改及舊評估拒絕。标人为延迟／模拟，无真实身份写操作声明 |
| V06 | 无路线、provider／网络／timeout／config／配额提示、畸形响应、坐标／定位失败均不造成功；可改／重试；sourceMode不自动改变；未發送時requestAttempt=not-sent、sentAt/provenance=null，已發送失敗才記sent及live調用嘗試 | 显式故障夹具输出与UI截图，核未發送時無路線請求、無虛構來源／時點，已發送失敗不宣稱取得路線；自然真实失败可另记，禁止耗尽配額制造错误 |
| V07 | 轮椅证据：exact／background、partial／insufficient、未知／过期日期、冲突、已知障碍、協助未确认；完整模拟与真實confirmed分开 | evidence规则断言、局部静态来源／日期核對、UI六类边界、当前真实完整样本数 |
| V08 | 来源：每项live/static/replay/simulated标签、实施未完成独立、demo身份不混来源；失败需用户明确改来源 | 混合來源、静態历史、模擬与未完成截图／操作；來源计数分母与缺标次数 |
| V09 | 免費／许可：高德类别、余额、期限、来源限制、付费关闭／限额、资料再利用，结果只记录可公开非秘密字段 | 使用前核查日期／依据／限制；未可核实记blocked并停该live／资料打包，不声明免费无限 |
| V10 | 相容／隐私／职责：三旧导航与四搜索入口、legacy export、定位TTL、支持contracts／permissions／auth／demo、无新DB/API／周期上传／录音 | rg／diff與型別、适用旧测试、UI回归、脱敏网络请求种类；无迁移审阅说明，不把静态检查当UI通过 |
| V11 | 文档／构建：函数职责、输入输出／副作用／错误／边界、来源和有界限制；lint／build适用；31行交付范围表与证据互链 | 命令退出码／产物、审阅diff、links检查、更新后状态表 |
| V12 | 有界完整故事：公共选点→三方式／公交→设施与缺口→错误／来源，窄屏／键盘可读；实地／全程样本／维护前置数0 | 演示步骤与截图，实际可用清单、暫緩原因／影响、31项总数，真实全程样本数可为0 |

## FR逐项交付範圍表

sourceKind：E01純邏輯合成；E02受控simulated＋static來源連結；E03本機構建；E04真實本機回歸嘗試／blocked；E05只讀邊界檢查；E06真實HTTP、E07恢復DB回歸、E08真實瀏覽器、E09本輪純/受控/構建。implemented表示代碼可用，不等同未執行情境passed。

| 要求 | 设计位置／检查 | 实作后验收结果与证据边界 | 当前实现／验证 |
| --- | --- | --- | --- |
| FR-001 | C01，V03/V10 | 主入口三方式；三旧入口保留方式与正确状态 | implemented；E08 真實D03三方式UI、D01步行/駕車及公交no-route；E09舊主頁步行、返家步行與三方式入口；三舊入口完整真實身份回歸仍partial |
| FR-002 | model Endpoint/context，V01/V03/V06 | 明確公共点，定位拒绝可继续；不猜同名或造坐标 | implemented；E01/E09拒絕定位、合法0與同名明選；E08尖東P1及科學館南門從候選明選，不宣稱實地核驗 |
| FR-003 | model Plan/geometry，V01/V03 | 数值／文字／线与结果一致，缺项标未提供 | implemented；E08真實摘要/指引/分段幾何；E09空railway佔位不造乘車段，未知幾何仍保留缺口，SVG無底圖 |
| FR-004 | model Legs，V02/V04 | 接驳／站點／备选／换乘正确，無换乘不造 | implemented；E08 D04按屯馬線→東涌線→S1、3乘車段/2換乘；D03同段備選不加換乘，ETA失效；E09受控規則通過 |
| FR-005 | model state，V05 | 查询前全部旧呈現失效，失败无旧结果 | implemented；E01/E02 loading、錯誤、無路線撤銷舊呈現；無靜默成功 |
| FR-006 | model context，V05 | 每await及catch上下文匹配，离页／身份／模式不回填 | implemented；E09完整context純斷言及受控遲到隔離，E08既有demo真實登入/登出；可登入長者身份的路線頁切換仍未驗 |
| FR-007 | model outcome，V01/V06 | no-route与失败／未完成分辨，可改／重试 | implemented；E01/E02 無路線、前置失敗、未完成、已發送受控錯誤分開，輸入保留／手動重試 |
| FR-008 | model需求，V07 | 一般轮椅开关仅评估，关开不改路线来源 | implemented；E01/E02 輪椅開關只評估，不重查路線，loading返回可使用最新需求 |
| FR-009 | model Conclusion，V07 | 三类可表达；真实无完整样本时无confirmed，障碍显式 | implemented；E01/E02 不足／局部／完整模擬分支及障礙；真實 confirmed=0 |
| FR-010 | model结论规则，V07 | 必要段缺口不confirmed；模拟完整仅测逻辑，真实样本可0 | implemented；E01 必要段及兩端入口各自需要當次適用依據；E02 完整僅為 simulated |
| FR-011 | evidence matching，V07 | 具体支持与缺口可见，背景不冒充路段 | implemented evaluator及許可未知降級；E08僅官方靜態連結、日期未知、未載入內容及不足；不交付未授權正文或入口綁定 |
| FR-012 | evidence日期／来源，V07/V08 | source／原日期或未知／查阅日／条件齐全，静態非即時 | implemented；E02 各模擬資料及靜態來源連結顯示日期／未知／查閱日；無打包官方正文 |
| FR-013 | dateAssessment，V07 | 日期未知／过期／冲突明确；无假TTL／维护承诺 | implemented；E01/E02 未知／過期／衝突保留缺口，查閱日不是來源有效期；無自訂TTL |
| FR-014 | assistance，V07 | 斜板需协助／确认条件；没有本次安排不称预约 | implemented；E01/E02 協助可用性需依據，條件／未知／不可用不能confirmed，保持未預約 |
| FR-015 | Conclusion规则，V07 | 普通步行／最短／少换乘／驾车不自动confirmed | implemented；E01/E02 路由模式與輪椅判定獨立，普通路線不自動升級 |
| FR-016 | provenance，V08 | 路线与每项设施独立标识、混合正确 | implemented；E08 live路線＋static資訊不足評估及3官方連結分項顯示，未完成回放/顯式模擬另列；無合法歷史payload |
| FR-017 | sourceMode/outcome，V05/V06/V08 | 模拟持续标、真实失败不自动成功或变来源 | implemented；E02 顯式選模擬才生成；live門禁失敗仍live/not-sent，受控sent錯誤不轉成功 |
| FR-018 | D01–D04，V03/V04/V12 | 小范围香港故事与换乘参照，覆蓋限制明示 | implemented limited story；E08 D01兩方式及公交no-route，D03補真實三方式，D04換乘；D02未查，公共POI/入口不是可達確認 |
| FR-019 | DeliveryScopeRow，V11/V12 | 每能力来源／证据／暂緩原因影响，真静模分开 | implemented；31行範圍表已更新E08/E09與仍未驗限制，不將受控返回算真實 |
| FR-020 | plan范围，V12 | 全程真实样本0可交付限度，三项非前置 | implemented；E08真實公共點與顯式模擬完成有界故事，實地/全程確認/維護前置均0 |
| FR-021 | R06/C02，V09 | 免费／许可查证或停调用／打包，不付费或换服务 | implemented gate＋deferred live；ROUTE_LIVE_REVIEW.allowed=true（使用者新指示），私有免費設定仍未獨立核驗；不新增付費／服務，靜態正文停打包 |
| FR-022 | C03/章程，V05/V10 | 既有身份隔离／共享／位置／语音／手表边界保持 | partial verification；E07 SQL/HTTP权限/auth/demo通過；E09客户端搜尋/導航不寫API；E08保留demo家屬角色限制，未擴大權限 |
| FR-023 | C03/C04，V10/V11 | 公共API／职责保持，无DB；若需变更先方案确认 | implemented without contract/migration changes；E07 25API回歸；E09舊export、四搜尋成功/失敗/重試/遲到/清理及入口預設；全部舊入口真實身份UI仍partial |

## SC逐项验收範圍表

| 条件 | 检查 | 計數／證據与通过口径 | 当前验证 |
| --- | --- | --- | --- |
| SC-001 | V03/V08 | >=1组3方式各有结果，逐方式真实／静態／模擬分别记录；未完成方式不达标，混合演示不叫真實三方式全通过 | 通過有界真實UI範圍；E08 D03步行/駕車/公交各一次成功；D01公交no-route保留，不用模擬補數 |
| SC-002 | V02/V04 | >=1含换乘情境完整，误计备选为0；live／历史／模拟分列 | 通過真實及受控範圍；E08 D04 3乘車段/2換乘及有序接駁；D03同段備選誤加換乘0，ETA不沿用；E09合成規則亦通過 |
| SC-003 | V05 | 正反切換、前置解析／定位、快切、重试及各context场景，旧结果误标0 | partial verification；E09純context/受控UI遲到、快切、方案/備選往返誤回填0；E08真實切方式四類舊內容撤銷；長者真實身份路線UI待驗 |
| SC-004 | V01/V06 | 无路線／失败／缺坐标／定位拒绝4类反馈，伪造成功／缺值造数0 | 受控範圍通過；E01/E02 無路線／失敗／缺坐標／拒絕定位皆反饋，缺值造數／偽成功0；不是自然供應商故障 |
| SC-005 | V07 | 6类边界完整，真实误confirmed0；模拟完整不增加真实样本数 | 通過受控邊界及真實不足範圍；E09六類提示/完整模擬，E08真實路線均資訊不足；真實confirmed=0 |
| SC-006 | V07/V08 | 展示条目来源齐全率100%，分母为所有路线方案／设施卡／场景／未完成入口；每资料日期或未知都有 | 通過已展示項目範圍；E08 live路線/評估/靜態連結5/5、E09模擬路線/評估/依據/連結6/6；回放未完成明示原因/來源，無合法歷史內容不虛構 |
| SC-007 | V11/V12 | FR23行及SC8行各一，共31行无遗漏，暂緩有原因与影响；真实全程数单列0可接受 | 通過交付表檢查；FR23＋SC8=31行，各有來源／證據／限制，暫緩不當passed；真實confirmed=0 |
| SC-008 | V12 | 1次完整故事，实地／全程确认／长期维护前置计数0；实际可用范围及未达项保留 | 通過有界故事範圍；E08 D01→D03三方式→D04換乘→不足→未完成回放→顯式模擬及390px鍵盤；三非前置均0，未驗身份另列 |

## 本轮计划证据与历史材料

- P01：2026-10-11只读代码与package、分支／feature核對，plan前工作区乾净；設計review及文档检查是本轮可报告内容，非业务验证。
- P02：當前高德方向／流量及港鐵、科学馆／艺术馆官方頁閱讀见[research](research.md)；无新路线请求或配额控制台访问。來源可讀不等於可再利用，V09仍待执行。
- H01：[001香港真實HTTP](../001-audit-backend-gaps/evidence/hong-kong-routes.md)，2026-10-09兩組三方式及換乘；仅历史返回，不证明003UI或全程。
- H02：[002运行](../002-remove-platform-dependency/verification.md)，已記錄22项及lint、Edge手动路线与环境限制；不是本次重新运行，不消除003缺口。
- H03：[001当前路线](../001-audit-backend-gaps/working/route-current-review.md)及[模拟缺陷检查](../001-audit-backend-gaps/evidence/inspection-validation.md)，支持修正需求，不当真实故障或003修复通过。

**本次運行**：E01新route測試19／19＋既有cache1／1；E02受控瀏覽器52／52；E03 lint/build退出碼0。E04首次受阻；恢復後E07四套業務回歸全通過。**當次真實高德請求**：5（E06）；**真實全程確認樣本**：0。

## 實作基線與門禁（2026-10-11）

- T001：開始commit `462080c`，分支及feature均003，開始時工作區乾淨；Node v24.19.0、npm 11.17.0，既有node_modules可用，3000／5173均無監聽。只核配置是否有地圖Key及独立本機_test庫，兩項均有；未輸出憑據、未改配置、未安裝／啟動服務或遷移。忽略規則已覆蓋依賴、產物、環境、Docker及ESLint，package為private、不需npm發佈ignore。
- T002／V09：使用者先前確認免費額度；本輪仍缺帳號當次Web Service／JS類別、餘額／期限及付費超額設定證據。已請求脫敏資料，真實調用暫記blocked；不以有Key當免費核查通过。
- T003：批准公開來源的有界查閱與許可結果見research；設施正文不打包，只連來源。完整歷史payload不可取得，真實回放暫緩；不構造假歷史。
- T004：V01–V12統一記操作、日期、代碼／產物、來源、預期／實際、退出碼／截圖與限制。真實清單為D01或D02各三方式、必要時D03補、D04換乘，每項一次及最多一次有理由手動重試；門禁解除前請求數0。31項目前狀態見上表，純測試與受控UI不改live門禁。
- 使用者本輪答覆：「先进行其他部分，这个我再确认后告知」。高德私有權益核查保持blocked，按授權繼續其他部分。
- F01（V01/V05純邏輯）：新增route-model／route-state與route-state.test.ts；6項斷言全部通過，退出碼0；client type check退出碼0。涵蓋0值／缺值／enum、前置requestId、舊成功／錯誤、身份／視圖／地圖epoch、loading需求切換、A→B→A批次不變及舊評估拒絕、請求前null來源。未作UI或live驗收。
- F02（V01/V02純解析）：route-model.test.ts＋state共11項通過，退出碼0；含幾何斷點、合法空方案／provider失敗／畸形集合、原方案與呈現分開、同段备选／換乘／未知段／不造ETA。`npm.cmd run lint`退出碼0（ESLint、Stylelint、server/client型別）；未執行外部服務或UI驗收。模型／狀態為可測試基礎，不據此改FR／SC整合狀態。

## 本次整合證據（2026-10-11）

- E01 / V01,V02,V05,V07：直接運行三個route純測試檔19項＋position-cache既有1項，共20／20，退出碼0。包括兩端入口分別核證，不把單端設施存在當另一端或街道證據。無DB／GPS／provider依賴。
- E02 / V03–V08,V12：[瀏覽器日誌](evidence/browser-validation.json)、[當次截圖](evidence/browser-simulation.png)，52／52，退出碼0。原創合成三方式、公交首末接駁／換乘／同段備選、A→B→A路線請求增量0、需求toggle、六類提示邊界、遲到成功／失敗及多context、來源切換、未完成回放、live前置停用、定位等待期切換、原引擎入口／nav/back、鍵盤與390px範圍。JSONP使用假測試Key，腳本在加入DOM前攔截，驗output=JSON＋callback、舊searchTips／planRoute簽名與零值、成功／provider拒絕／abort／10秒超時界限後callback/script清理；測試中放行只是記憶體控制，不改產品門禁，也不是真實live證據。API寫入0、外部provider請求0、真實定位0。當前可見卡片來源分母／分子見JSON sourceLabels；不是未驗來源的100%。
- E03 / V11：npm.cmd run lint退出碼0（ESLint、Stylelint、server/client型別）；npm.cmd run build退出碼0，SWC29檔、Vite1816模塊，當次client產物index-BCyy7zJV.js。首次SWC沙箱路徑解析EACCES，原命令提高執行權限重試通過，未改配置／繞過檢查。現有Vite模組配置及chunk大小警告仍在，非構建失敗。UI以同一源碼的esbuild受控bundle驗證，並非生產伺服器部署驗收。
- E04 / V09,V10：使用者要求先做其他部分，首次驗證時真實高德門禁為false；其後使用者直接授權，見E06。獨立_test配置存在，但只讀探測（無憑據輸出）為ECONNREFUSED。本次contracts與permissions各1斷言停在測試庫遷移前置，auth2項包含migration前置／測試伺服器ready逾時，demo1項連線拒絕；四套退出碼均1、業務驗收未通過。未啟動DB／重設schema／操作真實帳號，沒有新增遷移。不得將失敗解讀成已證明API相容或權限成功。
- E05 / V10,V11：git diff server/shared為空；無新增依賴、公開HTTP契約、localStorage路線保存、DB表、週期位置寫入、語音錄音、共享繞過或手錶要求。端點／候選／結果在頁面記憶體，dispose與身份／长者切換清除DOM私有輸入。既有語音／安全／其他地圖服務未調職。無不相容契約或DB遷移，故無資料回滾操作；代碼回退使用Git revert本次feature checkpoint，不重設資料庫。

## 暫緩與影響

1. 高德私有權益核查T002仍未完成；2026-10-11使用者明確要求直接用現有Key，已按其指示放行並記錄授權時間。不是宣稱已核實免費餘額／付費超額。E06完成5次真實HTTP；真實瀏覽器／JS地圖、自然錯誤及更多香港樣本仍未驗。
2. 設施正文T034與完整歷史回放：未證明再利用許可／適用入口／來源有效期，歷史只有001文字而无原payload。僅提供3個官方靜態連結（日期未知＋查閱日），回放明示未完成；不復製官方內容或按摘要假造真實回放。
3. 本機DB原阻塞已解除（E07）：原容器／資料卷恢復健康，四套全部通過，T048完成；沒有本feature新遷移。
4. 舊三入口／四搜尋完整UI、真實帳號、合法live＋static摘要等未驗場景保留T022/T028/T038/T040/T044/T047未勾，已驗子項見E01/E02。不得把語義上的guard或靜態review當實際全場景通過。

## 章程與交付審閱

七原則核對：長者可讀原生控件／焦點與缺口（E02）；無障礙主張按證據限制（E01）；資料誠實分來源（E02）；隱私與照護授權沿既有邊界（E05，真實SQL/HTTP回歸E07通過，瀏覽器身份場景仍有未驗）；資源與免費使用門禁（E04）；責任與API保持（E05）；必要測試／可重現證據（E01–E04）。三基線維持受支持API、權限、服務邊界；沒有增代理或把前端模擬當後端保存。限制不需實地／全程已確認真實樣本／長期維護豁免，三项原本即非前置。

## E06 現有高德Key授權與當次查詢（2026-10-11）

使用者新指示：「直接使用当前高德key」。沿用既有Key及v3服務，ROUTE_LIVE_REVIEW.allowed改true；此授權替代之前的暫停指示，並非免費類別、餘額、來源白名單或付費超額設定已獨立核實。未新購服務、充值或改付費設定，無自動重試。

[脫敏當次記錄](evidence/current-amap-query.json)：2次公共搜尋＋3次方向，合計5次，HTTP200/status1/infocode10000。理大同名候選有兩個，明確選香港校園114.184483,22.301814，非猜第一同名；醫院公共點114.189741,22.323363。兩者為一般POI，非核驗入口。步行1方案3248m/2598s；駕車1方案4519m/684s；公交4方案，首方案4207m/2083s，正規化保留未知交通段，換乘數null／缺字段19，不把不明結構造為確定。所有資料為当次供應商估計，非實地可達證明。直接HTTP不等於JSONP／真實UI驗收；全程真實confirmed仍0、T020與相應未驗項保留。

本次只讀復核：5432／3000／5173無監聽；docker compose ps無法連接dockerDesktopLinuxEngine（管道不存在）。這支持本機Docker資料庫服務未運行；不能由此判定資料損壞。四套回歸停在基礎设施前置：contracts檢25條API契約、permissions檢照護同意／資源隔離、auth檢註冊／会话／角色／登出及斷庫503、demo檢真實演示登入／持久化／隔離；前置失敗不代表這些业务断言实际失败，也不代表通過。未啟動或重設Docker／DB。恢復原有DB服務後再按quickstart重跑，不需要先改高德Key或業務代码。

E06放行後再驗：20項純測試及52項受控UI通過；受控bundle顯式設allowed=false驗前置拒絕，後續mock transport放行，與產品目前allowed=true分開。npm build退出碼0，當次產物index-BCVhKAhY.js；無新增真實查詢，總數仍5。臨時查詢腳本已刪，只保留脫敏公共點結果。

## E07 原服務恢復與四套回歸（2026-10-11）

使用者要求恢復此前可用服務。啟動原Docker Desktop，再用compose start db啟動六日前已存在的existing_app-db-1及原命名資料卷；未up重建、down、刪卷或重設。初始57P03為PostgreSQL啟動期；其後healthy，pg_isready接受連線，db:check/status均ready/version0001/pending[]，獨立_test庫可連線且與開發庫不同。

首次contracts重試停在服務ready逾時；有界脫敏診斷約7.75秒ready，清理診斷子進程後按contracts→permissions→auth→demo序列重跑，四套退出碼均0，共5／5 Node測試通過（contracts內覆蓋25條API）。沒有放寬斷言、增加逾時或修改業務代碼。合成資料與臨時測試服務按既有fixtures清理，未操作真實照護關聯。[當次恢復證據](evidence/service-recovery.json)。

原本機應用以npm.cmd run dev恢復運行：3000後端及5173前端ready，三項只讀HTTP確認API／兩端memopath頁均200。保留Docker、資料庫與開發服務運行供使用者繼續操作；測試端口與診斷進程已結束。此恢復只解除E04的環境與SQL/HTTP回歸缺口，不補其他真實瀏覽器／資料许可／無障礙實地證據。

## E08 / E09：真實瀏覽器與本輪修正（2026-10-11）

- E08 / V03,V04,V07,V08,V12：[真實瀏覽器操作與渲染記錄](evidence/live-browser-validation.json)。D01尖東P1(114.181003,22.294218)→科學館南門(114.182116,22.297682)由具名候選明選，步行527m/422s、駕車877m/205s，公交明確no-route且舊線/摘要/指引/結論撤銷。D03公共POI沿用E06明選坐標，步行3248m/2598s、駕車4519m/631s、公交4方案首案4207m/2083s/0換乘；公交第二方案4同段備選，切107後4122m及時間未提供，仍0換乘。D04明選機場T1出發POI，5方案首案38236m/4025s、3乘車段/2換乘，1米接駁不當無障礙證據。時間是當次值，非固定服務承諾。
- [D01步行](evidence/live-d01-walking.jpg)、[D01駕車](evidence/live-d01-driving.jpg)、[D01無公交](evidence/live-d01-no-transit.jpg)、[D03公交](evidence/live-d03-transit.jpg)、[D03步行](evidence/live-d03-walking.jpg)、[D03駕車](evidence/live-d03-driving.jpg)、[切換清除](evidence/live-switch-cleared.jpg)、[最終D04換乘窄屏](evidence/live-d04-transfers-final.jpg)、[未完成回放](evidence/replay-unfinished.jpg)、[鍵盤顯式模擬](evidence/simulation-keyboard-narrow.jpg)。首批D01/D03截圖對應當時產物；最終D04含本輪所有修正，完整渲染文字以JSON snapshots補足滾動視窗。
- 本輪有界請求：瀏覽器inputtips3、direction9（包括修正後覆驗）、結構診斷直接HTTP direction1，共13次明確REST操作；SDK為舊主頁/家屬地圖入頁載入嘗試，無獨立網絡計數，不當0或帳單。無自動路線重試、GPS授權/私人坐標、充值/新服務。既有demo兩次登入及兩次登出，無profile/care/place/trip寫入。demo為家屬角色，搜尋地圖導航保持家屬首頁；未為驗證擴大權限，長者真實身份路線頁仍缺證據。
- E09 / V01,V02,V05–V08,V10,V11：純測試25/25（route-model6、state11、accessibility7、cache1），受控UI67/67，退出碼均0。新增空railway佔位回歸先失敗再修正；保留實際多乘車結構不明時unsupported。主頁搜尋原錯用駕車及返家面板不可滾動亦先重現後修正；主頁/返家保留walking，重試用目前端點/方式/來源。四搜尋入口各成功、失敗保留输入、遲到隔離、重試通過；合成script/callback清理，API寫入0/真實provider0。
- 本輪lint/build退出碼0；最終產物index-bYHTYFK3.js。Vite既有模組配置與chunk警告未消除，不阻建置。E07四套業務回歸仍有效：本轮無server/shared/DB改動，未重复遷移或改資料庫。受控資料/來源完整性不代表真實全程確認。
- 可見來源分母：E08當前live路線1、無已載入靜態依據的資訊評估1、官方連結3，5/5；E09當前simulated路線/評估/依據3＋static連結3，6/6。每項有來源或明確資料未載入/日期未知，真實confirmed0、實地0、維護前置0。歷史回放有未完成原因，無成功路線/原查詢日期可計；不把不存在的資料納入成功分子。
- 收束限制：T002私有權益未核；T028/T040真實長者身份及相關路線切換未驗；T047三舊入口全部真實身份成功/失敗/定位生命周期仍partial，四搜尋受控67項已補。D02未查、官方正文/可重播payload仍不打包。這些不阻止有界演示，亦不被全程已確認樣本或實地核驗取代。
