# Research: 003 R2 普通入口

日期2026-10-12。唯讀檢查現有代碼及E06/E08，按speckit-plan派遣一名研究代理；未讀Key、未調provider。R1研究由3894916查閱，原證據不覆寫。

## R2-01 同一導航與真實地圖

Decision：復用tripMap及memopath-amap，移除額外首頁route-preview-entry；普通搜尋/地點/行程/返家都直接帶目的地。
Rationale：目前tripMap沒有large map容器，ensureRoutePreview捕獲map=null，真實結果僅SVG；現有loadAMap/createMap/createRouteFragments/markers/fitView足夠。
Alternatives：新控制台違反用户方向；initLocationMap直接復用會強制GPS；新SDK或後端代理無必要。
Guard：SDK遲到需動態map取得與獨立draw版本，不能因map ready重掛controller而丟路線；route與map錯誤分開。

## R2-02 地點與真實服務

Decision：Endpoint只由香港名稱搜尋、明按定位或E06/E08公共預設取得；query固定live，產品拒絕非live。合成scenario資料搬到tests。
Rationale：使用者只需选目的地/起點，不輸入coords、不選來源；公共預設只加速輸入，不替代provider結果。
Alternatives：自動挑第一候選會猜同名位置；保留隱藏演示頁違反明確要求。已有trip名唯一匹配known place/preset可帶入，無明確匹配保留名稱等待候選。

## R2-03 演示RAM與普通保存

Decision：frontend demo及verified.isDemo帳號共用现有client RAM分支；不改server demo契約。演示按elder快照，切換前保存、切回恢復；ELDER_KEY僅普通寫。
Rationale：现有mutation已有demoMode分支，但真實demo帳號仍寫DB，切長者會重新seed；必須補識別與RAM生命期。
Refresh：只保存非業務session視圖識別，刷新重新seed；业务修改/坐標不入storage。token認證沿用、logout撤銷不算业务寫。
Alternatives：讓用戶選memory/database違反方向；改server API責任或schema不必要；把整個demo business存localStorage違反頁內要求。

## R2-04 內容與風險

Decision：易讀分鐘/小時、米/公里，詳細步驟/來源原生details；障礙與必要協助直接顯示，不足一句短提示。沒有適用正文仍不能确认，全程真實confirmed可0。
Evidence：普通入口真實三方式与地圖/指引使用CUA；故障/日期/冲突/协助在隔離DOM及純測試；demo业务Network寫入0＋刷新，普通合成帳號在_test DB實際保存/重讀。
Limits：公共preset非核驗入口，官方內容再利用未知仍不複製；private AMap權益T002待資料，現有Key使用明確授權保持，不新增付費或service。

## R2-05 相容結論

planRoute/AmpRoute/formatters、/api/memopath/shared、角色/照護/輸入驗證及DB不改；client UI與demo RAM分支在已授權範圍，服務責任不轉移，無migration或需要再確認的破壞性契約。若實作證據發現須變此結論，先提交具體方案，不用provider失敗自動擴服務。
