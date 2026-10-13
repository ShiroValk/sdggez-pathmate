# Contracts: 003 普通導航與相容邊界（R2）

日期2026-10-12。R2取代R1產品source/replay/simulation控制台契約，歷史見3894916及E01–E10。無新增公開API。

## C01 — 同一普通頁面

首頁名稱搜尋、常用地點、行程与返家導航直接進tripMap。只有名稱時精確唯一匹配已知地點／公共preset，無匹配讓用戶明選候選。搜尋顯示名稱／地區／地址，不顯示經緯度；既有Endpoint位置內部保留。

導航頁順序為地点選擇→三方式大按鈕→地圖與易讀摘要。查詢／改地点先失效四類結果，明確規劃按鈕，不自動GPS。詳情以原生details展開指引／公交備選／結果來源／缺口；已知障礙與必要協助不折疊，輪椅不足一句短說明。無source/scenario/replay/手填coords／選結論控件，也無新控制台頁。

合法0數值保留；null明示未提供；時間分鐘／小時、距離米／公里，格式化不改legacy export。公共預設是原有真實公共坐標的快捷輸入，沒有核驗或輪椅可達承諾。

## C02 — Live transport與map

queryRoute產品只接受sourceMode=live/sampleId=null。非live直接明確拒絕且not-sent，不保留產品模擬分支；歷史SourceMode型別在測試模型可留，不是產品選项。
walking/driving/transit/integrated沿用現有Key/v3，公交city/cityd香港、extensions all；JSON+callback、AbortSignal與10秒cleanup保持，无自動重試/兜底。
真實搜尋searchPublicRouteTips沿用現有香港限制，所有候選位置驗證，保留地區／地址供區分。

loadAMap/createMap提供真實底圖，createRouteFragments按原片段，不補造缺幾何；起终marker與fitView。地圖生命期独立於query：先清舊overlay，遲到SDK需匹配identity/view/elder/draw序列；map錯誤不清掉有效route指引，提供map retry，離頁dispose。無SVG假底圖或新的provider。

## C03 — Identity與storage

普通帳號使用現有驗證、API、持久化。既有frontend演示及verified.isDemo帳號在client使用同一RAM业务分支；不改server demo端點行為。登入/驗會話/登出仍可實際調服務，不計业务寫入。
演示按elderId的RAM快照保存trips/places/geofence/contacts，跨頁/切elder再回保留；清身份/刷新重新建預設。演示不得寫ELDER_KEY或其他业务存儲。
sessionStorage僅保存非業務演示視圖elder/family供刷新，不保存修改、坐標或私密資料；無存儲設定控件。普通保存與角色限制保持。

## C04 — 保留受支持接口

| 邊界 | 保留及檢查 |
| --- | --- |
| planRoute/AmpRoute/formatDistance/formatDuration | export簽名/字段/錯誤策略不改，實際adapter與四搜索回歸 |
| /api/memopath/shared | 無字段/錯誤/權限變更；contracts、permissions、auth、demo適用回歸 |
| 前端路線controller | 同頁內部無外部消費者，移除來源/情境/coords產品UI由用戶明確授權 |
| 位置／語音 | 明按定位才請求，本機位置不遠端上傳，無周期或持續監聽 |
| storage | client demo不business寫、普通SQL保存，schema和責任不變 |

## C05 — 回退

誤顯舊結果、demo漏寫或普通保存失效即回退匹配前端產物，清演示非業務模式識別、重新登入；不刪真實資料、不改Key、DB或shared契約。無migration。確需不相容API/新服务职责/迁移時另提具體影響及回滾供確認。
