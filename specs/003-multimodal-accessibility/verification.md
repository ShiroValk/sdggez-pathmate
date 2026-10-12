# Verification and Delivery Scope: 003 R2

更新：2026-10-12。修訂同一003，以普通入口的真實使用體驗為準；spec/plan/tasks checkpoints：`ca196ea` / `67b3cf6` / `a2cd5ad`。R1記錄與E01–E10保留為歷史，不作R2驗收。沒有新增編號、公開API、授權／服務責任、DB migration 或依賴。

## 當次證據與一致性分析

- **R2-A（T054）靜態一致性**：實作前只讀核spec、plan、model、contract、tasks：23FR＋8SC都有映射，critical/high=0，未映射=0。已刪產品来源／模拟／回放要求，保留共享模型的測試來源型別；frontend及verified `isDemo` 共用RAM分支。相容前端增量不需契約或職責調整／DB遷移；rollback見C05，回退前端匹配checkpoint即可。
- **R2-B 純／受控**：[74項UI斷言](evidence/r2-browser-validation.json)、[受控畫面](evidence/r2-controlled-ui.png)。route-model/state/accessibility/position-cache **25/25**，controlled UI **74/74**；受控provider/GPS=0、business API=0。覆蓋普通入口、legacy exports與搜索、快切/遲到/離頁、SDK/map錯誤、六類依據邊界、demo新增／編輯／刪除／設定／圍欄／長者及跨頁／切elder／刷新。控制物件不是當次真實高德或設施證據。
- **R2-C 構建／回歸**：[命令結果與失败修正記錄](evidence/r2-validation-summary.json)。lint（ESLint/stylelint/server+client types）退出0；完整build退出0；最後搜索狀態文案增量client build退出0。contracts→permissions→auth→demo→persistence順序運行全退出0，共8/8 Node測試（contracts覆蓋25API，persistence含重啟重讀及編輯／刪除）。首次誤用多檔`node --test`並行，兩項ECONNRESET，不能當通過；按專案串行調度重跑後通過。中途修改的錯誤狀態引用與地圖銷毀斷言亦先失敗再修正，最終74項／types重新通過。Vite既有module/chunk警告仍在。
- **R2-D 當次真實服務**：[運行記錄](evidence/r2-live-runtime.json)。普通長者首頁公共點→同導航頁，理大→醫院：步行44分鐘/3.2公里、駕車11分鐘/4.5公里、公交35分鐘/4.2公里/0換乘（4方案）。底圖、分段路線、起終點及指引可見；機場公交1小時7分鐘/38.2公里/2換乘（5方案），屯馬線→東涌線→S1，3乘車段、有序接駁。真實名稱搜索有香港科學館／南門等地區及地址候選。390px scrollWidth=390，沒有來源／情境／回放／坐標控件；詳細／來源預設折疊。5次明確direction操作（含最終產物步行覆驗）、1次inputtips；SDK/tiles另有流量，未作帳單計數。沒有GPS授權／私人位置、新服務、付費設定變更或自動假路線。
- **R2-E 真實保存／RAM**：[演示請求計數](evidence/r2-verified-demo-counts.json)、[SQL重讀](evidence/r2-ordinary-demo-sql-readback.json)、[清理](evidence/r2-identity-fixture-cleanup.json)、[最新fixture smoke清理](evidence/r2-identity-fixture-smoke-cleanup.json)。只用獨立_test庫與三個本次隨機合成帳號。verified demo普通登入→新增科學館行程→頁內可見→刷新只剩預設，業務寫请求0、DB新增行程0；普通客户端布局鎖設定PUT1、刷新與SQL重讀true；普通API行程201且重讀、elder寫403。CSP刻意封provider的夾具內普通新增行程真實搜索失敗，未保存／未假成功，不稱此情境端到端成功。所有自建帳號剩餘0、3104/3105已停止，未改開發DB、未加migration。更廣普通資料保存由persistence真實API／重啟回歸證明，frontend更多RAM分支由受控UI證明。

## FR交付範圍（23行）

| 要求 | 實作／檢查 | R2運行證據與限制 |
| --- | --- | --- |
| FR-001 | 同tripMap與四既有導航入口；T056–058 | B舊入口；D真實首頁公共點三方式，無新console |
| FR-002 | 名稱/GPS/preset Endpoint、唯一匹配；T056/058 | B同名/零/遲到GPS；D帶入公共點、真實搜索候選；真實GPS未授權 |
| FR-003 | 真實AMap、metrics/details；T056/057 | D底圖、線、marker、指引與易讀量值；B缺值/map故障，不補幾何 |
| FR-004 | 有序leg/options/transfer；T055/056/059 | B備選往返0重查；D醫院及機場真實3乘車/2換乘；缺ride instruction明示 |
| FR-005 | invalidate/abort/draw版本；T057/059 | B輸入/查詢開始四呈現清除，失敗不恢復 |
| FR-006 | identity/elder/view/map/request guards；T059/062 | B完整context遲到隔離、切elder及刷新；E真實認證登出/換身份 |
| FR-007 | 失敗分類/保留輸入/分開map；T057/059 | Bno-route/transport/timeout/GPS/map及重試；E真實CSP搜索失敗不假成功 |
| FR-008 | 一般需求只改評估；T060 | B需求切換不重查；D真實route不足提示 |
| FR-009 | 依據適用與保守結論；T055/060 | B局部/不足/障礙UI；D無全程證據，不選結論 |
| FR-010 | 全必要obligations/date/assistance；T055/060 | B純規則25項的一部分；真實全程confirmed=0 |
| FR-011 | 短提示/直接障礙/details；T060 | B已知障礙直接顯示、背景不升級；D不足短句 |
| FR-012 | 來源、日期、條件/details；T056/060 | B適用證據日期/缺口；D當次高德來源與static官方連結；正文未載入 |
| FR-013 | 未知/過期/衝突/障礙；T055/060 | B六類日期／條件UI與純測試；無統一虛構TTL |
| FR-014 | 必要staff直接顯示未預約；T060 | Bconditional/unknown/unavailable不confirmed，直接顯示條件；無真實安排 |
| FR-015 | 普通路線不保證可達；T060 | B判定規則；D成功三方式仍不足 |
| FR-016 | query固定live，SDK/search v3；T055/057/059 | D真實route/map/search/transit；預設僅input，設施僅static來源連結 |
| FR-017 | 移除產品合成/回放/來源控件；T055/056/059 | B/C/D控件0、非live拒發送；合成只在tests，失敗無fallback |
| FR-018 | 五個公共香港shortcut及兩行程；T056/058/061 | B/Epreset刷新；D醫院/機場/科學館搜索，其他點不宣稱全驗 |
| FR-019 | R2與R1隔離、31行scope；T054/067 | A–E分真實/靜態/受控/限制；E01–E10歷史不覆寫 |
| FR-020 | 有限故事無三項前置；T066/067 | D已完成有界故事，實地/全程確認/長期維護前置各0 |
| FR-021 | 既有Key／服務無付費調整；T059/066 | D依既有授權，沒有新provider/充值；T002私有額度／付費設定仍未核 |
| FR-022 | Auth/Care權限及本機位置；T059/062/064 | C五套真實回歸；Eelder寫403；demo中心public不冒充GPS，無新追蹤/錄音 |
| FR-023 | demo RAM/normal API、無migration；T061–065 | B更多RAM分支API0；Everified demo業務0、普通PUT/SQL重讀；C真實persistence重啟通過 |

## SC交付範圍（8行）

| 條件 | 對應檢查 | R2結果與口徑 |
| --- | --- | --- |
| SC-001 | T056–058/066，D | 公共理大→醫院真實三方式／地圖／指引成功；缺值明示 |
| SC-002 | T055/056/066，B/D | 醫院順序接駁，機場3乘車/2換乘；受控備選誤計0 |
| SC-003 | T057/059/062/063，B/E | 受控快切/context/方案備選往返誤回填0；真實認證換身份/刷新清RAM |
| SC-004 | T057/059/063，B/E | 四类失敗不造成功，map分開、provider封鎖保留錯誤；無自然配額耗盡測試 |
| SC-005 | T055/060/063，B/D | 局部、不足、未知/過期/衝突、障礙/staff覆蓋；真實误confirmed0 |
| SC-006 | T056/058/063/066，B/D | 390px無溢出、44px模式按鈕、keyboard、控制台與來源/模拟/回放/坐標控件0 |
| SC-007 | T054/067，A–E | FR23＋SC8=31行，本輪證據/歷史/限制分開；來源可展開，真實confirmed0 |
| SC-008 | T061–066，B/C/D/E | verified demo行程DB0與刷新預設，普通設定UI+SQL/行程API重讀；更多增編刪RAM受控，三項前置0 |

## R2未完成限制與相容審閱

T002仍未取得私有高德Web Service/JS免費類別、剩餘額度／期限、來源限制及付費超額關閉的獨立證據；使用既有Key已獲授權，不能聲稱已核免費或無限。五個preset不是實地入口確認；沒有真實全程輪椅confirmed、職員安排、持續設施內容或長期維護承諾。真實GPS及所有舊入口的真實provider故障／私人身份全組合未測；相稱受控覆蓋單列。原有天氣、叫車、支付、求助等業務展示未在R2接入服務或扩能力。

前端仍負責導航呈現／RAM，Auth仍負責認證，Family/Elder仍負責普通保存與授權。server/shared/DTO/schema未變；無不相容契約、職責調整或資料遷移，無需DB rollback。程式職責、輸入輸出與錯誤見 [client模組說明](../../existing_app/client/src/pages/MemoPathPage/README.md)，手動驗收見 [quickstart](quickstart.md)。七原則相稱核對：長者易讀／有依據可達／資料真實／隱私权限／既有資源／責任與文檔／必要測試均有上述證據；私有權益、實地與完整可達未驗如實保留。

## R1歷史證據（以下截至原003；其來源選擇／模擬／回放設計已被R2取代）


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

## E10：身份與舊導航收束（2026-10-12）

- 原existing_app-db-1仍healthy，前次隔離啟動在受限執行环境未ready；授權環境內啟動成功，沒有重建容器或資料卷。啟動亦放入finally管理，避免初始化失敗遺留連線。
- [實際身份瀏覽器記錄](evidence/identity-browser-validation.json)：使用既有API在獨立DATABASE_URL_TEST建立本次隨機family/elder，明確邀請及接受照護關聯；長者以真實認證登入，等待非同步dashboard載入後從主入口進路線頁。只使用公共點，不授權GPS。測試relay僅在本機轉送真實HTTP並以CSP刻意阻擋外部provider，沒有偽造成功或改產品服務邊界。
- [已發送的受控失敗](evidence/identity-live-controlled-failure.jpg)保留live嘗試、時間及transport错误；[明確選模擬](evidence/identity-explicit-simulation.jpg)後才顯示simulated路線／局部評估。離頁再入時線/摘要/指引/結論及端點皆清空。經既有私人設定登出，再選[前端演示](evidence/identity-demo-source-independent.jpg)，來源仍預設live、沒有舊結果。這是實際帳號與本次受控傳輸失敗，並非自然高德故障。
- 隔離Chromium [最新受控結果](evidence/browser-validation.json)81/81，退出碼0，API寫入及真實provider請求0；補主頁搜尋、常用地點、行程、返家四入口的方式／端點預設、live錯誤、保留端點重試成功、離頁abort與舊callback隔離。成功缺幾何仍可呈現來源，無畫線不造失敗。定位拒絕/遲到、全部context、方案/同段備選往返增量0沿用受控斷言，非真實GPS驗證。
- [清理證據](evidence/identity-fixture-cleanup.json)：本次合成帳號剩餘0，3104/3105服務已停，control/state已移除；開發DB變更false、新遷移0。產品コード未改，沿用575e3ac構建；本輪lint退出碼0。沒有新增真實高德查詢，E08真實結果與E07四套業務回歸不重算成本輪執行。
- T028/T040/T047按上述相稱證據完成，52/53；T002私有類別/額度/期限/允許來源/付費超額仍待使用者核查。官方正文與歷史payload未交付的原因保持明示；真實confirmed0，實地/全程確認/維護前置0。未宣稱全部舊入口在真實GPS與真實provider下端到端通過。
- 測試服務補端口佔用拒絕與無條件關閉DB連線；`node --import tsx tests/integration/route-identity.fixture.ts --smoke`退出碼0，[啟動／清理覆驗](evidence/identity-fixture-smoke-cleanup.json)剩餘帳號0。更新測試檔後eslint亦退出碼0；不重覆執行未改動的產品構建。
