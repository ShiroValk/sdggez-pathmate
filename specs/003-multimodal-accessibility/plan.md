# Implementation Plan: 003 普通入口真實導航（R2）

日期2026-10-12；沿用feat/003-multimodal-accessibility。需求見[spec](spec.md)，R1設計與實作由3894916可查，E01–E10和T001–T053保留歷史。R2用新增任務收束，不重開編號。

## Summary

首頁搜尋、常用地點、行程、返家共用既有tripMap導航頁。移除專用route-preview-entry、來源／模擬／回放／坐標控件；目的地帶入、名稱搜尋／定位／公共預設選起點，大按鈕選三方式，結果用現有真實高德底圖與分段線及指引。來源與詳細步驟收在details，輪椅不足簡述，已知障礙／必要協助直接顯示。

演示業務改動只在本頁記憶體；既有前端演示及verified.isDemo帳號均用同一內存分支，不調业务寫API。普通帳號原API/持久化不改。演示輸入預設改為已取得公共點的理大、醫院、尖東P1、科學館南門及機場T1，不冒充核驗入口。

## Technical Context

- TypeScript、Node24、npm現有版本；React/Vite/DOM engine、AMap JS1.4.15與WebService v3，無依賴升級。
- client route-model/state/accessibility保留共同模型與輸入／結果驗證；SourceMode歷史型別可留作測試，產品Query固定live、sampleId=null，adapter拒絕非live，不提供回放或合成成功。
- route-preview改為同頁普通導航控制器：Endpoint由搜尋／定位／預設或帶入取得，無坐標輸入。展示按鈕>=44px、文字>=16px，時間分鐘／小時、距離米／公里，null不造0，合法0保留。
- route-preview-data只含批准策略、官方來源metadata與真實公共選點預設。simulationRoute/Evidence搬至tests/integration/route-test-data.ts，產品不import，舊測試資料只用於自動化。
- 路線選擇／結果、演示按elderId的contacts/trips/places/geofence快照只在RAM。已有token保存政策不改；sessionStorage僅保存演示視圖elder/family的非業務識別，供刷新重建預設，不能保存修改、坐標或身份內容，登出清除；普通ELDER_KEY選擇保存保留，演示不寫此業務ID。
- test:純Node模型／狀態／accessibility；隔離Chromium產品DOM與故障注入；獨立_test DB實際帳號HTTP保存/權限/清理；CUA普通入口實際高德查詢與地圖、390px截圖。每類證據分列，不以受控結果冒充live。
- Windows本機5173開發/3000構建，香港日期；無DB migration、後端proxy、新SDK、付費或未批准服務。

## Constitution Check

| 條款 | R2設計及驗證 |
| --- | --- |
| I 真實／模擬 | 公共預設只作輸入；產品只live，合成僅測試；結果來源／設施詳情可查，演示提示短句 |
| II 相稱驗證 | DOM改需模型/狀態/controlled UI/lint/build；存儲隔離需演示寫入0、刷新、跨長者以及普通SQL保存/權限成功失敗 |
| III 輸入驗證 | 名稱長度、候選完整location、preset ID、方式、方案/備選ID、nested provider；既有業務API服務端驗證不改 |
| IV 文檔 | 同步module职责、生命周期／錯誤／存儲；R1歷史不作現行指南 |
| V API相容 | 保留planRoute/AmpRoute/formatter、受支持/api/memopath/shared/角色與錯誤；新內部controller可改無外部消費者 |
| VI 邊界 | map/transport仍memopath-amap，engine控identity/RAM，純模型不觸DB；无職責移轉或後端代理 |
| VII 遷移 | 不適用，無schema變更；回退相同前端版本，不動DB |
| 三項基線 | 無位置周期上傳、遠端追蹤、持續錄音或手表 |

用戶已明確要求演示业务內存及刷新預設，與章程真實性區分相容；不能因此修改真實demo API本身的服務契約。認證／登出可調現有服務，業務資料只在RAM，真實map/search/query不受demoMode改為fake。

## Project Structure

主要改動：
- existing_app/client/src/pages/MemoPathPage/route-preview.ts：同頁選點、三方式、簡短結果與details。
- route-preview-data.ts：公共預設／來源metadata；無產品模擬資料。
- memopath-amap.ts：live adapter，保留legacy；真實map既有API復用。
- memopath-engine.ts：四普通入口、地圖生命周期、預设匹配、演示快照與刷新識別。
- memopath-styles.ts：390px、44px按钮、底圖區與易讀摘要。
- tests/integration/route-test-data.ts、route-ui.validation.ts、route-identity.fixture.ts：僅測試注入、实际SQL保存與清理。
- specs/003-multimodal-accessibility/evidence/：R2新前綴，舊文件不覆寫。
- server/shared/migrations：不改。

## Phase 0 — Research

唯讀研究確認tripMap目前無map容器，draw捕獲null只畫SVG；initLocationMap強制GPS不能直接作新流程前置。復用loadAMap/createMap/createRouteFragments/createPositionMarker/createDestMarker/getMapFor/disposeMaps即可。controller draw改動態map getter及獨立draw序列，以identity/view/elder/context驗遲到SDK；map ready不可重掛清掉剛取得的路線。

演示已有mutation RAM分支但verified.isDemo未啟用、setCurrentElder仍寫localStorage、切elder重設預設。R2統一演示識別、保存/恢復按elder RAM快照、登出/新身份清理，刷新只記模式並重建。

## Phase 1 — Data and contracts

詳見[data-model](data-model.md)、[contracts](contracts/route-preview.md)、[research](research.md)、[quickstart](quickstart.md)。
新增公共preset endpoint共用搜索候選驗證，已知地點/行程精確唯一匹配可直接帶入；沒有位置或歧義保留名稱供明選，不自動採第一結果。定位只有使用者明按才調用。

地圖只在導航頁目前context初始化，預設公共中心或選點可用，不依GPS。draw(p)清舊overlays，畫分段線與起終標記/fit；draw(null)立即清線。SDK pending用獨立draw version/identity guard，離頁dispose；map失敗显示明確重試，真實路線指引保留，不造底圖。

## Implementation order

需求checkpoint → plan/data/contracts/quickstart checkpoint → append T054+與只讀一致性分析 → tests移除產品情境依賴 → endpoint/導航頁真實map → RAM存儲隔離／刷新 → automated checks → 少量真实普通入口UI → 31行R2交付表與限制 → implementation checkpoint。

主故事理大→醫院三方式各一次，公交换乘必要時理大→機場一次；其餘公共點用選點／搜尋驗，不無限挑樣本。私有高德權益T002待核仍不冒充已核；現有Key授權有效，不自動付費。

## Rollback and scope

新結果混上下文、RAM業務漏寫或普通保存回歸時回退完整匹配前端構建，清非業務演示模式識別、重新登入；DB無迁移不需資料回滾。測試仅刪本次合成帳號／資料，保留開發DB和原服務。R1產品source控件不作替代方案；若需不相容公開契約／服务迁移先另提具體方案。
