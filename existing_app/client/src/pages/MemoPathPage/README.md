# 003 R2 普通導航與演示頁內資料

使用既有 `mountMemoApp` 及 `tripMap`，首頁搜尋／常用地點／行程／返家只帶入目的地與既有方式。沒有獨立演示控制台。`route-test-data.ts` 只由測試引用，不在產品 bundle。

| 模組／函數 | 輸入與輸出、責任 | 副作用、失敗與邊界 |
| --- | --- | --- |
| `publicRouteEndpoint` / `PUBLIC_ROUTE_PLACES` | 已知 ID → 五個香港公共點之一或 null；預設是選點快捷方式 | 無網絡／保存；不代表已核驗入口或路線 |
| `readableRouteMetric` | 可空秒／米 → 分鐘、小時、米／公里 | 保留合法零，缺值／不合法值顯示未提供 |
| `mountRoutePreview` | DOM、現有 query/search/locate/context/draw 與初始端點 → 控制器 | 端點及結果僅 RAM；名稱必須明選，修改立即 abort 並清結果；run 使用固定 live；dispose 清 DOM／transport。每 await 核 context，失敗保留輸入並可重試 |
| `display` / wheelchair evaluation | 当前選定方案及適用依據 → 摘要、詳細步驟／來源、保守提示 | 方案／備選／需求不重查；不從來源連結推導設施內容；障礙／協助直接顯示，依據／缺口展開。實際 engine 尚無全程設施依據 |
| `queryRoute` / `searchPublicRouteTips` | 現有 Key、live 公共端點／名称 → v3 JSONP 結果／候選 | 原有免費服務邊界；非 live 拒發送，不回假路線；abort／10秒 timeout 清 script/callback；legacy exports 不變 |
| `knownRouteDestination` / `autoPlanTrip` | 已有目的地及坐標 → Endpoint 或待明選名稱 | 精確匹配只在唯一位置時帶入，0/0 舊空值不猜位置；不取同名第一候選 |
| `drawNavigationMap` | 當次 presentation 或 null → 現有 AMap 底圖／分段線、起終 marker、fitView | 地圖 SDK 不依賴 GPS；獨立 draw epoch 隔離遲到，離頁 destroy；地圖失敗單獨可重試，文字指引仍可查看 |
| `initLocationMap` | 原有首頁／家屬／安全頁容器 → 現有 AMap | demo 使用公共預設中心和家 marker，不冒充裝置定位，不自動請求私人 GPS；普通狀態保持既有定位行為 |
| `snapshotDemoData` / `applyDemoElderData` | 當前 demo elder 與 contacts/trips/places/geofence → clone RAM snapshot／還原 | 跨頁、切長者保留；刷新重建预設；不把業務資料或 elder ID 寫 storage |
| `loadDemoData` / `enterDemoMode` / verified login | frontend demo 或服務端 `isDemo` → 同 RAM 分支 | 真實演示認證仍由 Auth；sessionStorage 只記 elder/family 視圖供刷新重建，token 邊界不變；登出／換身份清除 RAM。普通業務依原 API 保存 |

沒有改公開契約、DTO、角色授權、服務責任、資料庫 schema 或新增依賴。失敗／缺日期／衝突等測試只在 `tests/integration/`；無新服務、付費切換或自動假路線。以 [003 verification](../../../../../specs/003-multimodal-accessibility/verification.md) 的當次結果及限制為準。
