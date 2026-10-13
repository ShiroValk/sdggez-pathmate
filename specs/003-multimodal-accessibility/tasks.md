# Tasks: 多出行方式與無障礙提示

**R2有效範圍（2026-10-12）**：T001–T053及其分組／勾選／統計保留R1歷史，原模擬／回放產品工作已被新spec取代，不要重新執行或抹掉完成記錄。當前增量從T054開始，見文末；私有權益T002仍待資料，不阻使用者已授權Key的有界查詢。

**Input**: [plan.md](plan.md)、[spec.md](spec.md)、[research.md](research.md)、[data-model.md](data-model.md)、[contracts/route-preview.md](contracts/route-preview.md)、[quickstart.md](quickstart.md)、[verification.md](verification.md)。

**Prerequisites**: 設計已完成；實作時核對`feat/003-multimodal-accessibility`、`.specify/feature.json`與環境覆寫。生成基線`d17ed62`，工作區乾淨。

**Tests**: 用戶已要求逐FR／SC檢查與運行證據，spec有明確驗收條件，故納入計劃列明的必要純邏輯／UI／相容檢查；不設全庫TDD、統一覆蓋率或性能門檻。先撰寫測試預期，再與對應實作共同驗證及提交，不為低影響文字改動增測試。

**Organization**: 按US1／US2／US3 P1、US4 P2分組；Setup/Foundation及收束無故事標籤。全部初始未勾選，不表示已實作或驗收完成。

## Format: `[ID] [P?] [Story] Description`

`[P]`只標不同檔案、同批可獨立撰寫的任務，前置必須已完成；不授權自動派agent或同檔案同時寫入。測試撰寫可與不同檔案實作並行，通過仍需對應實作完成。各有界階段更新證據後依AGENTS checkpoint，不部署、不推送。

## Path Conventions

路徑相對倉庫根`C:/Users/RedV/Documents/Code/sdggez-pathmate`，操作時解析絕對路徑。新模塊在既有`existing_app/client/src/pages/MemoPathPage/`、測試在`existing_app/tests/integration/`；樣式實際在`memopath-styles.ts`。無新後端、shared DTO、DB／localStorage或依賴安裝任務。

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: 固定基線、使用前核查與證據規則，復用現有工具及服務。

- [X] T001 在 `specs/003-multimodal-accessibility/verification.md` 記實作開始commit、分支／feature／工作區、Node24／npm版本、既有3000／5173服務與獨立測試庫條件；按 `existing_app/README.md` 復用配置和依賴，不輸出秘密、重裝或盲目重啟。
- [ ] T002 [P] 在 `specs/003-multimodal-accessibility/verification.md` 完成V09高德Web Service／JS免費類別、餘額／期限、允許來源、付費超額／限額核查，記脫敏依據與停用條件；不可取得時只將相應live標blocked，不自動付費、索取Key或阻塞純模型。
- [X] T003 [P] 在 `specs/003-multimodal-accessibility/research.md` 補D01／D02公共入口資料範圍、日期、再利用條件及D03／D04歷史payload可取得性，僅有界核對批准來源；許可不明只連來源／暫緩打包，不擷取整頁、聯繫／預約或把歷史摘要當真實回放。
- [X] T004 在 `specs/003-multimodal-accessibility/verification.md` 登記V01–V12證據格式及公共點查詢清單，分列當次live、靜態查閱／歷史、受控模擬與未完成，記T002／T003允許或停用項；保留31行未執行狀態，不造空截圖或假證據。

**Checkpoint**: 核查有結果或明確限制即可繼續；私有資訊不可得與缺段，不成為實地／全程樣本／維護前置。

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: 共同資料、版本、來源與輸入邊界；純模塊不需Key、DB或服務。

- [X] T005 在 `existing_app/client/src/pages/MemoPathPage/route-model.ts` 定義Endpoint、Selection／Context、RequestAttempt、RoutePresentation、Plan／Leg／Step／RideOption／Fragment、Evidence／Conclusion及DeliveryScopeRow型別，逐項承接data-model全部欄位而不改舊AmpRoute；落实「nullable明確用null」「walking／driving／transit允許值；任意其他字串拒絕，不默認駕車」「selectionOrigin=public-search/device/explicit-public-sample」「sourceMode=live/replay/simulation」及「success{plans:非空RoutePlan[], provenance, warnings[]}」，錯誤類別用原允許值「invalid-input/config/position-denied/position-timeout/position-unavailable/transport/timeout/provider/permission/quota/invalid-response/unknown」，不是任意字串。
- [X] T006 在 `existing_app/client/src/pages/MemoPathPage/route-model.ts` 實作輸入與嵌套資料驗證及安全文字策略，保留「有限經度[-180,180]、緯度[-90,90]，合法0保留；空分量／不完整坐標拒絕」、數值「number或null，有限且>=0；空字串、空陣列、負值、NaN、Infinity為null＋MissingField」、MissingField「reason=not-provided/invalid/unsupported」，不先Number(raw??0)；方案／備選ID只接受當前結果成員，不插入不可信HTML。
- [X] T007 在 `existing_app/client/src/pages/MemoPathPage/route-state.ts` 建立純QueryState與immutable request匹配／invalidate，承接「idle/resolving/loading/success/no-route/error/not-implemented」，requestId在定位／候選解析前取得；requestId＋RequestContext管理不可變查詢批次，selectedPlanId／selectedRideOptionIds＋selectionVersion管理展示，accessibilityVersion管理評估；RoutePlan不帶selectionVersion，key含端點／mode／source／sample／identity／elder／view／map epoch，不序列化token，輪椅開關不使請求永久loading。
- [X] T008 在 `existing_app/client/src/pages/MemoPathPage/route-model.ts` 建立來源與完成狀態驗證，承接「kind=live/static/simulated」、static「subtype=facility-summary/historical-replay」、「originalQueriedAt:null或時間」「publishedAt/updatedAt:null或來源日期」及「implemented/not-implemented/deferred與reason；與sourceKind獨立」；無日期明示未知，歷史重播不改成當次live；驗requestedSourceMode與RequestAttempt，請求前error／not-implemented的provenance=null、sentAt=null，不因選live而造當次查詢來源。
- [X] T009 在 `existing_app/tests/integration/route-state.test.ts` 撰寫並運行基礎斷言：前置解析／定位已有requestId、舊成功／失敗不匹配、identity／elder／view／map／source epoch、同屏往返、輪椅版本獨立與輸入允許值、選擇不改原requestId及批次、評估context含兩種版本與選擇ID；修正T005–T008問題後記V01/V05於 `specs/003-multimodal-accessibility/verification.md`，不需DB／Key。

**Checkpoint**: T005–T009完成且純測試可運行後整合故事；不等於瀏覽器隔離已通過。

## Phase 3: User Story 1 — 三方式與可閱讀指引 (Priority: P1)

**Goal**: 明確公共起終點／方式，呈現共同路線及公交分段；不依賴完整無障礙資料。

**Independent Test**: 一組香港公共點三方式逐項核方式、路線、時間／距離／指引及來源，含換乘另用D04，分開真實／回放／模擬。

### Tests for User Story 1

- [X] T010 [P] [US1] 在 `existing_app/tests/integration/route-model.test.ts` 撰寫V01/V02解析斷言：0／缺數值、缺instruction／站名、坏點斷線、空集合與畸形／provider失敗、同段備選不加換乘、未知ride令次数null、首末接駁、總量缺等候／備選改变不可沿用；合成輸入不當香港真實返回。

### Implementation for User Story 1

- [X] T011 [P] [US1] 在 `existing_app/client/src/pages/MemoPathPage/route-model.ts` 實作步行／駕車方案及steps正規化、outcome分類與片段；落实「instruction:string|null、road:string|null」「metricBasis=provider/derived-complete/unknown」「coverage=provided/partial/none」「optionId:null或選定候選ID」「points:至少2個有限合法點」「缺step幾何或polyline內非法點造成中斷，分開片段，禁止跳過坏點後連接兩端」，僅有效明確空集合為no-route，有可用但缺字段為success＋缺口。
- [X] T012 [US1] 在 `existing_app/client/src/pages/MemoPathPage/route-model.ts` 實作公交transits／segments／walking／buslines／railway與方案／備選選擇，保留「kind=walk/drive/ride/unknown」「role=access/transfer/egress/route/unknown」及RideOption「name:null或字串、transportType:null或字串、departureStop／arrivalStop（各自name/id/point可null）」；換乘承接「可辨連續ride legs時max(rideCount−1,0)，任何未能判定是否乘車的段令其未知」，不以純步行route.distance冒充全程或加總乘車時間冒充含等候ETA。
- [X] T013 [US1] 在 `existing_app/client/src/pages/MemoPathPage/memopath-amap.ts` 新增 `queryRoute(query: RouteQuery): Promise<RouteQueryOutcome>`，沿用v3 walking／driving及transit/integrated、香港city／cityd、extensions=all；transport用output=JSON＋callback、保留10秒及timer／script／callback清理，錯誤按可靠訊號分類，只有路線transport實際發送才記requestAttempt=sent與sentAt，前置失敗為not-sent／null來源；舊planRoute／AmpRoute／formatter签名及策略保持，無代理或新服務。
- [X] T014 [US1] 在 `existing_app/client/src/pages/MemoPathPage/memopath-engine.ts` 解耦initLocationMap與強制定位，加公共起終點明確選擇、合法候選及同名待選；行程仍保存原目的地文字，定位拒絕可選公共點建圖，解析／定位前同步invalidate，不猜第一同名或虛構origin。
- [X] T015 [US1] 在 `existing_app/client/src/pages/MemoPathPage/memopath-engine.ts` 加tripMap三方式與mode控件，內部planAndDraw用queryRoute及共享state，搜索／返家保留walking；新請求先清全部舊呈現，每await及catch核context，加初步來源／未完成／失敗狀態，不能為演示暫時绕过隔離或来源。
- [X] T016 [US1] 在 `existing_app/client/src/pages/MemoPathPage/memopath-engine.ts` 呈現摘要、Step、接駁／站點／線路／換乘及方案／備選控件，缺字段明示；新formatter的null與0分開、0為0米／0秒，不用舊最少1策略；備選不增加乘車段、不保留不適用總量、不發新請求；驗當前批次成員ID，以選擇導出RoutePresentation，切完整方案／備選遞增兩種版本、清舊呈現與結論，原RoutePlan／requestId不改。
- [X] T017 [US1] 在 `existing_app/client/src/pages/MemoPathPage/memopath-amap.ts` 增fragment／leg／選定alternative分段繪圖，未知幾何不補線、不串不同候選，無幾何仍可讀文字，marker不當完整路線；保持地圖建立／銷毀及其他覆蓋物。
- [X] T018 [US1] 在 `existing_app/client/src/pages/MemoPathPage/memopath-styles.ts` 增方式／方案／備選、持續狀態、指引及来源標籤窄屏／焦點樣式，配合engine三語及button/select，不只靠顏色，不重寫已有布局。
- [X] T019 [US1] 運行 `existing_app/tests/integration/route-model.test.ts`、共享state測試及 `npm.cmd run type:check:client`，修正後於 `specs/003-multimodal-accessibility/verification.md` 記V01/V02退出碼及合成邊界；檔案不存在／未執行不算passed。
- [X] T020 [US1] 依 `specs/003-multimodal-accessibility/quickstart.md` D01／D02優先、D03補足、D04換乘，完成有界真實瀏覽器三方式／公交核對，將入口／provider／當次時間／請求次數／截圖／結構記於 `specs/003-multimodal-accessibility/verification.md` V03/V04；T002/T003阻塞時明記，歷史或模擬不替代當次UI證據。
- [X] T021 [US1] 在 `specs/003-multimodal-accessibility/verification.md` 更新FR-001–004、SC-001–002實際範圍、缺失／暫緩原因影響與證據，審源碼文檔／diff後存US1 checkpoint；做不出某方式不刪目標或稱真實三方式全通過。

**Checkpoint**: US1可獨立展示路線價值；初步失效／guard／來源已具備。US2完整生命周期尚未驗部分明示。

## Phase 4: User Story 2 — 目前結果、失敗與隔離 (Priority: P1)

**Goal**: 補全解析／定位／查詢／離頁／身份／來源切換的失效與反饋；可在舊兩方式先做，不依賴US1公交。

**Independent Test**: 用顯式延遲舊成功／失敗、無路径與錯誤，在舊兩方式核線／摘要／指引／結論同時撤銷；往返同屏、換身份／長者／demo／來源不回填。

### Tests for User Story 2

- [X] T022 [P] [US2] 在 `existing_app/tests/integration/route-state.test.ts` 擴充V05/V06：解析期切點、定位期切mode、正反快切、遲到success／no-route／catch、同screen往返、身份／elder／demo／source／map換代、重試用目前選擇及loading輪椅toggle、A→B→A與同段備選往返不新增路線請求、ID相同但舊版本評估仍丟棄、新查詢不接受舊批次；預期模擬錯誤與真實結果分開；補無Key／無效輸入／定位拒絕／免費門禁未通過的not-sent及null來源，與已發送網絡／provider失敗的sent及live來源斷言。
- [X] T023 [P] [US2] 在 `existing_app/tests/integration/route-ui.validation.ts` 建有界瀏覽器控制及重現情境，明示合成供應商／定位錯誤／延遲，只生成當次臨時資料、無常駐夾具；操作有日誌，結束清理timer／腳本／臨時服務／合成帳號，不動真實關聯。

### Implementation for User Story 2

- [X] T024 [US2] 在 `existing_app/client/src/pages/MemoPathPage/route-state.ts` 補transition及全結果失效，no-route／error／not-implemented無舊plan；查詢／展示／評估身份按data-model分工，選方案不失效原查詢批次，改端點／方式／來源則整批失效；路線返回核RequestContext，評估返回核requestId、兩種版本、方案／備選ID及身份／視圖context，支持重試／取消及地圖換代失效。
- [X] T025 [US2] 在 `existing_app/client/src/pages/MemoPathPage/memopath-engine.ts` 統一nav／back、clearIdentityData、403清理、長者／角色／demoMode、地圖重建及卸載invalidate，清旧线／摘要／指引／證據／私人端點；guard含container.isConnected、map instance、identity/current，成功與catch均無舊toast／回填。
- [X] T026 [US2] 在 `existing_app/client/src/pages/MemoPathPage/memopath-engine.ts` 實作持續可辨查詢中／無路線／失敗／未完成、定位拒絕／超時／缺坐標／已知provider／quota提示，保留輸入及修改／手動重試；未知原因不猜、live失敗不改sourceMode或模擬成功；未發送顯示所選來源與「尚未調用」，已發送失敗標查詢嘗試，不宣稱取得路線。
- [X] T027 [US2] 在 `existing_app/client/src/pages/MemoPathPage/memopath-amap.ts` 核取消／超時的timer／script／callback及地圖清理，不可取消則最多既有10秒結束；丟棄結果不等同清理，不增無限重試或服務費。
- [X] T028 [US2] 運行state測試並用 `existing_app/tests/integration/route-ui.validation.ts` 按V05/V06觀察舊導航／新入口，涵蓋前置解析定位、快切遲到、失敗重試與全部context；截圖證明四類旧內容撤銷，網絡／狀態證據核A→B→A及同段備選往返的路線請求增量0、舊評估不回填、新查詢不接受舊批次，並核未發送前置失敗的null來源及已發送失敗的live嘗試，將退出碼／模擬控制／真實自然失敗分列於 `specs/003-multimodal-accessibility/verification.md`。
- [X] T029 [US2] 在 `specs/003-multimodal-accessibility/verification.md` 更新FR-005–007、SC-003–004結果／未驗原因，review身份與公開契約後存US2 checkpoint，不把未取得运行證據的guard稱全部通過。

**Checkpoint**: US2在舊兩方式可獨立驗證；US1已做時補驗新增入口，展示明示未驗／暫緩。

## Phase 5: User Story 3 — 一般輪椅的依據與缺口 (Priority: P1)

**Goal**: 可追溯的保守提示，支持局部／背景／不足、日期與協助；不要求全程confirmed。

**Independent Test**: 對一個選定或顯式模擬路線輸入局部靜態證據／無資料，核partial／insufficient、來源、日期、缺口與協助；不依賴新live公交或實地。

### Tests for User Story 3

- [X] T030 [P] [US3] 在 `existing_app/tests/integration/route-accessibility.test.ts` 撰寫V07：exact-leg／exact-facility／背景、關需求、partial／insufficient、無日期／過期／衝突／障礙、staff未知／conditional／unavailable、必要段缺口與完整模擬；普通最短／少換乘／駕車不自動confirmed。

### Implementation for User Story 3

- [X] T031 [P] [US3] 在 `existing_app/client/src/pages/MemoPathPage/route-accessibility.ts` 實作Evidence嵌套驗證及匹配，落实「matchLevel=exact-leg/exact-facility/background/unmatched」「conflictGroup:null或ID」「knownBarrier:null或说明」及usageReview，按入口／leg／選定rideOption匹配；不保存身份，背景不升格整段。
- [X] T032 [US3] 在 `existing_app/client/src/pages/MemoPathPage/route-accessibility.ts` 實作來源原日期精度／時區與dateAssessment，承接「published／updated／validFrom／validUntil可null」「status=known-date/no-date/expired/conflicting」，查閱非更新日、無統一TTL；較新資料不自動消除事實衝突，過期僅作歷史背景。
- [X] T033 [US3] 在 `existing_app/client/src/pages/MemoPathPage/route-accessibility.ts` 實作Assistance／Conclusion，承接「required:boolean」「type=staff-portable-ramp/other」「availability=applicable-confirmed/conditional/unknown/unavailable」「bookingStatus=not-booked」「status=confirmed/partial/insufficient」「simulated:boolean」；一般介紹非本次確認，必要段適用且無未解缺口才confirmed，障礙顯著披露，模擬不支持真實confirmed。
- [X] T034 [US3] 在 `existing_app/client/src/pages/MemoPathPage/route-preview-data.ts` 加T003許可允許的尖東／科學館／藝術館少量靜態摘要、exact-facility／background綁定、來源／原日期／查閱日／條件／缺口；許可未知不複製，只連來源及不足，1米接駁或一般POI非可達；另用顯式模擬供邊界測試。
- [X] T035 [US3] 在 `existing_app/client/src/pages/MemoPathPage/memopath-engine.ts` 加一般輪椅開關，落实「enabled:boolean，profile固定general-wheelchair」，按requestId、selectionVersion、accessibilityVersion、目前方案／備選及身份／視圖context接受評估，依據更新遞增accessibilityVersion、不重發路線；loading切開關仍接受route後用最新需求，無設備細分或假輪椅專用路由。
- [X] T036 [US3] 在 `existing_app/client/src/pages/MemoPathPage/memopath-engine.ts` 顯示三類結論、具體設施／段或背景、缺口、日期未知／過期／衝突、障礙與斜板條件；步行街道入口、公交站台車輛接駁、駕車drop-off／parking未知分列；關需求無確認徽章、更換方案無舊結論。
- [X] T037 [US3] 在 `existing_app/client/src/pages/MemoPathPage/memopath-styles.ts` 加卡片／日期／來源／缺口／障礙／協助窄屏與鍵盤可讀樣式，配合三語文案，狀態不只靠顏色、不暗示即時正常或已預約。
- [X] T038 [US3] 運行 `existing_app/tests/integration/route-accessibility.test.ts` 並在瀏覽器驗六類邊界、路線／備選／開關及live路線＋static資料，將查閱、模擬及真實分列於 `specs/003-multimodal-accessibility/verification.md` V07/V08；真實全程數可0，模擬confirmed不補數。
- [X] T039 [US3] 在 `specs/003-multimodal-accessibility/verification.md` 更新FR-008–015、SC-005及SC-006設施資料部分，逐證據核來源／日期／範圍／許可／未知後存US3 checkpoint；無實地／維護任務，真實全程樣本0不阻塞已驗提示。

**Checkpoint**: 局部資料與未知可演示；真實confirmed標準不降低，未有真實樣本如實0。

## Phase 6: User Story 4 — 來源與完成邊界 (Priority: P2)

**Goal**: 各項獨立標來源、明確選回放／模擬、未完成與交付說明；demo身份非模擬路線。

**Independent Test**: 明示static／simulated與未完成條目核標籤／來源切換，不依賴live；有混合結果再核其分項。

### Tests for User Story 4

- [X] T040 [P] [US4] 在 `existing_app/tests/integration/route-ui.validation.ts` 擴V08：live失敗仍live錯誤、明確切replay／simulation新context、舊回應不回填、前端／真實demo account不代替route來源、每項標籤與分母及未完成原因；模擬confirmed非真實。

### Implementation for User Story 4

- [X] T041 [P] [US4] 在 `existing_app/client/src/pages/MemoPathPage/route-preview-data.ts` 分開允許的facility-summary、歷史證據／合法historical-replay及simulated，驗sampleId／ImplementationStatus；無完整合法payload只顯歷史文字，依摘要構造必標模擬，無token／Key／私人坐標。
- [X] T042 [US4] 在 `existing_app/client/src/pages/MemoPathPage/memopath-engine.ts` 加明確來源選擇及分項標籤，回放保留originalQueriedAt、每設施獨立來源、live失敗不自切；未完成／暫緩有reason無success，source切換走invalidate，不由demoMode判真假。
- [X] T043 [US4] 在 `existing_app/client/src/pages/MemoPathPage/memopath-styles.ts` 完成持續live／static／歷史／simulated及未完成標識，配合三語與可訪問控件；混合結果每項可辨，不只總角標或顏色。
- [X] T044 [US4] 用 `existing_app/tests/integration/route-ui.validation.ts` 及允許資料驗V08來源齊全率100%、demo／source上下文、明確切換及失敗非自動成功，於 `specs/003-multimodal-accessibility/verification.md` 記分母／截圖／時點／模擬局限；漏標不通過。
- [X] T045 [US4] 在 `specs/003-multimodal-accessibility/verification.md` 為31行補ImplementationStatus／sourceKinds／verificationStatus／evidenceIds／reason／impact／followupConditions，承接「verificationStatus=passed/failed/not-run/blocked/accepted-deferred」；暫緩非passed，真實全程數可0。
- [X] T046 [US4] 在 `specs/003-multimodal-accessibility/quickstart.md` 更新實際公共故事／來源操作／限制，於 `specs/003-multimodal-accessibility/verification.md` 記FR-016–020、SC-006–008現狀後存US4 checkpoint；不設部署、實地／全程樣本／維護前置。

**Checkpoint**: 四類可辨，整體驗收仍依FR／SC證據，不以故事好看替代。

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: 相容／權限回歸、文檔／構建與一次有界故事，非全PRD重做。

- [X] T047 核 `existing_app/client/src/pages/MemoPathPage/memopath-amap.ts`／`memopath-engine.ts` 的legacy planRoute／AmpRoute／formatter與三舊導航，復檢四搜索入口JSON＋callback後的成功、錯誤、舊回調／重試／輸入保留／清理，於 `specs/003-multimodal-accessibility/verification.md` 記V10，不改公開字段／錯誤或職責。
- [X] T048 運行 `existing_app/tests/integration/position-cache.test.ts` 及既有contracts／permissions／auth／demo四套（獨立_test庫，dispatcher不含新route tests），核 `existing_app/server/`／`existing_app/shared/` 無新契約／遷移，脫敏網絡無新周期位置寫入、共享绕过／錄音／手表依賴，於 `specs/003-multimodal-accessibility/verification.md` 記V10及阻塞。
- [X] T049 在 `existing_app/client/src/pages/MemoPathPage/route-model.ts`、`route-state.ts`、`route-accessibility.ts`、`route-preview-data.ts` 及被改amap／engine完善模塊／公共函數職責、輸入輸出、失敗、副作用／權限／來源／資源文檔，審 `specs/003-multimodal-accessibility/contracts/route-preview.md` 相容與回退；確需不相容／調職先具體方案確認，需遷移先完整回滾，不提前執行。
- [X] T050 依 `specs/003-multimodal-accessibility/quickstart.md` 明確運行3個新route測試、`npm.cmd run lint`、`npm.cmd run build`，匹配產物做適用UI復檢；新改動／失敗才擴大測試，不無故重複全量，於 `specs/003-multimodal-accessibility/verification.md` 記V11退出碼／產物／範圍。
- [X] T051 用 `specs/003-multimodal-accessibility/quickstart.md` D01／D02主故事及D03／D04補充做一次V12，核窄屏／鍵盤、三方式／公交、依據缺口／失敗／明確來源；於 `specs/003-multimodal-accessibility/verification.md` 記步驟與暫緩影響，真實樣本0可接受、三個非前置計數0，無實地／維護／真救援。
- [X] T052 在 `specs/003-multimodal-accessibility/verification.md` 完成FR23＋SC8、V01–V12證據對照、七原則／三基線、許可及無DB／職責變更核查，更新 `existing_app/README.md` 與 `specs/003-multimodal-accessibility/quickstart.md` 現行能力限制，保留001／002歷史與Key暫緩，未驗／暫緩非通過。
- [X] T053 清理 `existing_app/tests/integration/route-ui.validation.ts` 本次生成的合成資料／帳號／臨時監聽／控制檔（先核歸屬，不動用户3000／開發DB），復核 `specs/003-multimodal-accessibility/tasks.md` 只勾實際完成，審diff／links／狀態後存最終checkpoint；未完成保留未勾與暫緩說明，不推送／部署／合併。

## Dependencies & Execution Order

### Phase Dependencies

T001先完成；T002/T003不同文件可並行；T004等兩項都有結果（可為限制）。Foundation按T005→T006→T007→T008→T009，不需live權利。

| 故事 | 獨立開始／前置 | 整合與證據依賴 |
| --- | --- | --- |
| US1 | Foundation後，T010與T011不同檔可並行撰寫 | T011→T012→T013→T014→T015→T016→T017→T018→T019；T020真實受T002/T003限制，T021收束。幾何接口T017前保持編譯可用，未連通UI不單獨提交 |
| US2 | Foundation後可用舊兩方式，不等US1公交；T022/T023並行 | T024–T027順序整合；T028需T022–T027及可用入口，T029收束；US1未做只聲明舊入口，後補新入口 |
| US3 | Foundation後T030/T031並行，純評估不需live | T032→T033；T034受T003；T035–T037需可選路線宿主（舊兩方式或US1），T038/T039收束 |
| US4 | Foundation後可設計來源／測試，T040/T041並行；US3資料寫入完成後才改同一檔 | T042/T043接state／宿主，T044–T046無live則用明示static／simulated，後補混合證據，不假稱其他故事通過 |
| Polish | 故事完成或有明確暫緩 | T047→T048→T049→T050→T051→T052→T053；阻塞記錄後繼續可完成項，非變邊界消除 |

共享amap／engine／styles、route-preview-data、verification禁止跨故事同時寫入。T021/T029/T039/T046為實作＋驗證證據的checkpoint，不另要求每檔提交。

### User Story Completion Graph

```text
Setup → Foundation → US1三方式 → US2完整隔離 → US3提示 → US4來源交付 → Polish
                     ├ US2可用舊兩方式先獨立驗證
                     ├ US3純評估可用明示模擬／舊路線先驗證
                     └ US4來源可用靜態／模擬先驗證
```

主線為默認單人順序，支線是獨立驗證能力，非同檔並行許可。live受阻只暫緩其真實證據，其他邏輯繼續；最終31項保留缺口。

### Parallel Examples per Story

| 故事 | 前置滿足後的不同文件撰寫對 | 合流點 |
| --- | --- | --- |
| US1 | T010 route-model.test.ts預期 ＋ T011 route-model.ts解析 | T019運行，預期失敗不當驗收 |
| US2 | T022 route-state.test.ts ＋ T023 route-ui.validation.ts | T028運行／證據 |
| US3 | T030 route-accessibility.test.ts ＋ T031 route-accessibility.ts | T038運行／UI |
| US4 | T040 route-ui.validation.ts ＋ T041 route-preview-data.ts | T044執行／來源分母 |

P共10項（Setup2、每故事2），僅明確不同檔撰寫，不表示整故事無條件並行。

## Implementation Strategy

### MVP First

Setup/Foundation＋US1形成三方式可閱讀閉環；MVP已有初步來源／失效／guard，不臨時屏蔽保護。US2完整證據前明示未驗場景；無障礙未知不阻US1，不稱完整無障礙服務。live受阻可交付明示static／simulated範圍，SC-001未達或來源邊界保留。

### Incremental Delivery

US1→US2→US3→US4各適用測試／UI及證據後checkpoint；暫緩有原因／影響／後續條件，繼續獨立工作、不無限追補。API、職責、免費及許可保持；確需變更先具體方案，不自加代理、服務或DB。

### Requirement and Evidence Coverage

| 要求／檢查 | 主要任務 |
| --- | --- |
| FR-001 | T014–T018/T020/T047 |
| FR-002 | T006/T010/T014/T022/T026/T028 |
| FR-003 | T010/T011/T016/T017/T019/T020 |
| FR-004 | T010/T012/T016/T020 |
| FR-005 | T007/T015/T024/T025/T028 |
| FR-006 | T007/T009/T022/T025/T028/T042 |
| FR-007 | T011/T013/T022/T026/T028 |
| FR-008 | T030/T035/T038 |
| FR-009 | T030/T033/T036/T038 |
| FR-010 | T030/T031/T033/T038/T039 |
| FR-011 | T031/T034/T036/T038 |
| FR-012 | T003/T008/T032/T034/T036/T038 |
| FR-013 | T030/T032/T033/T036/T038 |
| FR-014 | T030/T033/T036/T038 |
| FR-015 | T030/T033/T035/T038 |
| FR-016 | T008/T015/T034/T040–T044 |
| FR-017 | T023/T026/T040–T044 |
| FR-018 | T003/T020/T034/T046/T051 |
| FR-019 | T004/T021/T029/T039/T045/T046/T052 |
| FR-020 | T039/T045/T046/T051/T052 |
| FR-021 | T002/T003/T004/T013/T034/T041/T052 |
| FR-022 | T007/T022/T025/T028/T048/T052 |
| FR-023 | T005/T013/T047–T049/T052 |
| SC-001 | T020/T021/T044/T051 |
| SC-002 | T010/T012/T016/T020/T021 |
| SC-003 | T009/T022/T024/T025/T028/T029 |
| SC-004 | T010/T022/T026/T028/T029 |
| SC-005 | T030–T039 |
| SC-006 | T038/T040–T045 |
| SC-007 | T004/T045/T052 |
| SC-008 | T046/T051/T052 |
| V01/V02 | T006/T009–T012/T019 |
| V03/V04 | T013–T020 |
| V05/V06 | T007/T009/T022–T029/T040/T044 |
| V07/V08 | T030–T046 |
| V09 | T002/T003/T004/T034/T041/T052 |
| V10 | T047/T048/T013/T022/T025/T028 |
| V11/V12 | T049–T053/T021/T029/T039/T045/T046 |

## Notes

53項：Setup4、Foundation5、US1 12、US2 8、US3 10、US4 7、Polish7，依實際完成勾選，受阻／部分驗證保持未勾。任務處理數、模擬通過數、真實覆蓋與全程confirmed分開。關鍵欄位null、允許值／邊界已引原data-model，其餘逐項按T005原契約落實，不自行改定義。

無實地、至少一條真實confirmed、長期維護、正式部署、新服務付費或無關分页／預約／救援／手表任務。本輪已執行實作與相稱驗證，after_implement hook存本次checkpoint；受控驗證不代表真實香港或DB通過。

## 本次未勾項及可完成範圍

52/53已完成。E08/E09補真實公共點三方式、換乘與保守提示；E10補實際SQL認證長者的來源／離頁／登出／前端演示切換及舊導航受控回歸81/81，T028/T040/T047完成。各證據邊界見verification；受控成功不是真實供應商成功。

T002：私有免費/付費設定仍未核驗，使用者已明確授權現有Key，有界調用不因此重阻。官方正文與完整歷史payload按原契約明示未載入／未完成，不假造成功；D02未查、沒有實地或真實全程confirmed。E10真實帳號使用本次合成資料及獨立_test庫，外部provider由CSP刻意阻擋；定位拒絕／遲到及全context由受控測試補，不宣稱所有舊入口完成真實GPS或真實provider端到端。

## R2 增量任務：普通入口真實使用（2026-10-12）

R1完成52/53只是歷史；本批14項T054–T067需獨立驗證。無新功能號、DB migration或新service。

### Setup / 一致性

- [X] T054 在 `specs/003-multimodal-accessibility/spec.md`、`plan.md`、`data-model.md`、`contracts/route-preview.md` 與本任務表完成只讀一致性分析，核23FR/8SC覆蓋、歷史隔離、服務/API/模式識別及rollback，記分析結果於本次交付證據。
- [X] T055 在 `existing_app/tests/integration/route-test-data.ts` 搬入原合成route/evidence，改相應純測試import與 `route-ui.validation.ts` 測試預期；產品 `route-preview-data.ts` 不保留合成情境，R2輸出不覆寫E01–E10。

### US1：普通入口 → 地點 → 方式 → 真實地圖／指引

- [X] T056 [US1] 修 `existing_app/client/src/pages/MemoPathPage/route-preview.ts` 與 `route-preview-data.ts`：香港公共preset、名稱搜索明選/定位Endpoint、無手填coords/source/scenario/replay，三方式44px按鈕、分鐘／小時和米／公里、details步驟與來源。
- [X] T057 [US1] 修 `existing_app/client/src/pages/MemoPathPage/memopath-engine.ts` 與 `memopath-styles.ts`：同tripMap掛現有真實AMap底圖、分段線與起終marker、fitView，SDK遲到隔離、map錯誤單獨重試、離頁destroy，無GPS前置或SVG假底圖。
- [X] T058 [US1] 修 `existing_app/client/src/pages/MemoPathPage/memopath-engine.ts`：移除專用route-preview-entry，首頁搜索/常用點/行程/返家直接同頁带目的地；已知位置及唯一精確preset/places匹配直接帶入，其他名称明選不猜第一候選。

### US2：Live失敗與生命期

- [X] T059 [US2] 修 `existing_app/client/src/pages/MemoPathPage/memopath-amap.ts`／`route-preview.ts`：產品query固定live、拒非live；前置/已發送失败分辨、保留地点與方式、明確重試/改點；新搜尋/GPS/query及context清舊結果，map/request序列分開，保留方案/備選增量0與legacy相容測試。

### US3：有依據的簡短提示

- [X] T060 [US3] 修 `existing_app/client/src/pages/MemoPathPage/route-preview.ts`：一般輪椅需求只評估，無選結論；不足短句、障礙/協助直接顯示，詳細依據/日期/缺口展開，測試局部/未知/過期/衝突/障礙/協助/完整不誤confirmed。

### US4：演示頁內資料／普通保存

- [X] T061 [US4] 修 `existing_app/client/src/pages/MemoPathPage/memopath-engine.ts`：frontend demo及verified.isDemo使用同RAM業務分支，認證/登出保留；短句提示、香港公共地点及行程預設；普通API、角色、错误與保存不改。
- [X] T062 [US4] 修 `existing_app/client/src/pages/MemoPathPage/memopath-engine.ts`：演示按elder保存/恢复RAM快照，不寫ELDER_KEY；非業務session view識別供刷新重建preset，登出/切身份清理，业务修改/coords不入storage，無儲存方式設定。
- [X] T063 [US4] 擴 `existing_app/tests/integration/route-ui.validation.ts`：普通入口、390px/鍵盤/無多餘控件，demo新增/編輯/刪除place/trip/elder/setting/geofence及跨頁/切elder/刷新RAM恢復，business API寫入0；受控map/route/search錯誤、GPS與全部context隔離。
- [X] T064 [US4] 擴 `existing_app/tests/integration/route-identity.fixture.ts` 及適用真實業務測試：獨立_test庫合成普通帳號真實保存/重讀與權限失敗、verified demo client業務寫入0，測試services/accounts清理0，不改開發DB。

### Polish / 當次運行與交付

- [X] T065 運行 `existing_app` 純模型/状态/accessibility/cache、R2 controlled UI、lint/build、contracts/permissions/auth/demo適用回歸，退出碼與產物記 `specs/003-multimodal-accessibility/verification.md`，不擴無關能力。
- [X] T066 從普通入口以預設理大→醫院完成三方式真實查詢/地圖/指引，必要機場公交参照及名稱搜索一次，核390px及demo刷新、請求類別/次數，保存脫敏R2截圖/運行記錄到 `specs/003-multimodal-accessibility/evidence/`，失敗不fake或無限重試。
- [X] T067 更新 `specs/003-multimodal-accessibility/verification.md` 31行R2範圍/限制與 `existing_app/README.md`／`quickstart.md`／代碼职责文檔，保持R1歷史證據；核links/diff/秘密與清理，按Git extension提交實作checkpoint。

### Dependencies / implementation strategy

T054→T055→T056→T057→T058→T059→T060→T061→T062→T063→T064→T065→T066→T067。同檔工作順序處理；模型fixture可先寫後產品實作。四故事各有獨立驗收（真實導航／狀態失敗／提示／保存），主故事优先。沒有新增並行寫入相同engine的任務，研究代理唯讀完成後不參與編輯。

### R2 requirements coverage

| 要求 | 增量任務 |
| --- | --- |
| FR-001 | T056–T058/T063/T066 |
| FR-002 | T056/T058/T059/T063/T066 |
| FR-003 | T056/T057/T063/T066 |
| FR-004 | T055/T056/T059/T065/T066 |
| FR-005 | T057/T059/T063 |
| FR-006 | T057/T059/T062/T063 |
| FR-007 | T056/T057/T059/T063 |
| FR-008 | T060/T063 |
| FR-009 | T055/T060/T065 |
| FR-010 | T055/T060/T065 |
| FR-011 | T060/T063 |
| FR-012 | T056/T060/T067 |
| FR-013 | T055/T060/T065 |
| FR-014 | T055/T060/T065 |
| FR-015 | T060/T065 |
| FR-016 | T055/T057/T059/T066 |
| FR-017 | T055/T056/T059/T063 |
| FR-018 | T056/T058/T061/T066 |
| FR-019 | T054/T067 |
| FR-020 | T066/T067 |
| FR-021 | T059/T066/T067 |
| FR-022 | T054/T059/T062/T064/T065 |
| FR-023 | T061–T065 |
| SC-001 | T056–T058/T066 |
| SC-002 | T055/T056/T066 |
| SC-003 | T057/T059/T062/T063 |
| SC-004 | T057/T059/T063 |
| SC-005 | T055/T060/T063/T065 |
| SC-006 | T056/T058/T063/T066 |
| SC-007 | T054/T067 |
| SC-008 | T061–T066 |
