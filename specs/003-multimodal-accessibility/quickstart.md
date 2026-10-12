# Quickstart: 003 普通入口手動核驗（R2）

日期2026-10-12。R1操作來源／模擬／回放／坐標的指南已撤銷；歷史見3894916，E01–E10保留，不能作R2當次通過。

## 啟動與入口

沿用Node24、现有依賴、原Docker/DB與Key；若已有5173/3000服務則復用，不重新迁移。

```powershell
Set-Location C:/Users/RedV/Documents/Code/sdggez-pathmate/existing_app
npm.cmd run dev
```

打開http://127.0.0.1:5173/memopath。從既有長者／家屬登入或既有演示登入進普通首頁；沒有新導航控制台。演示只提示「演示資料不保存」，地图/search/route仍真實。

## 普通導航故事

1. 長者首頁點常用公共點「聖德肋撒醫院」，直接帶入同一導航頁目的地，不另進新功能入口。
2. 起點選「香港理工大學」，不用輸入坐標或允許GPS。點規劃，先看步行，再切駕車、公交；各方式一次有界真實查詢。
3. 核底圖、當次路線、易讀時間／距離与指引；展開詳細步驟，公交檢查接駁/站點/線路/換乘。多方案／同段備選切換不重查。
4. 用輪椅需求看簡短不足；已知障礙/必要協助直接顯示，来源與缺口展開。現在沒有全程真實依據不能保證可達。
5. 必要換乘参照改終點「香港國際機場T1出發」，公交一次；当次無方案如實記錄，不填假路线。
6. 首頁搜尋名称／行程导航／返家亦進同頁並帶入目的地；文字不唯一匹配時明選候選，定位拒絕仍可用公共起點。
7. 改地点／方式／重試／離頁四類舊内容立即清除；失敗提供重試/改点，地圖與路线錯誤分開，不切模擬。
8. 390px無横向溢出、44px按鈕、鍵盤操作；來源/模擬/回放/坐標輸入/选结论控件0。

## 業務保存

演示從普通設定新增/編輯行程或常用地点、修改長者／圍欄／設定：本頁可見，跨頁及切長者再回保留，刷新恢復預設。Network不應有业务POST/PUT/PATCH/DELETE；認證/login/logout与真實provider查询不算business寫入。
普通合成帳號同操作應保存成功且刷新可重讀；使用獨立_test庫，不操作真實照護資料或扩大角色。既有真實demo帳號亦使用client演示RAM，server API契約不改。

## 自動化與證據

```powershell
node --import tsx --test tests/integration/route-model.test.ts tests/integration/route-state.test.ts tests/integration/route-accessibility.test.ts tests/integration/position-cache.test.ts
node --import tsx tests/integration/route-ui.validation.ts
npm.cmd run lint
npm.cmd run build
npm.cmd run test:integration -- --suite contracts
npm.cmd run test:integration -- --suite permissions
npm.cmd run test:integration -- --suite auth
npm.cmd run test:integration -- --suite demo
```

合成故障／日期／衝突／障礙／協助只在測試；不增加用戶情境選單。R2輸出另命名，E01–E10不覆寫。紀錄commit、公共點、操作、真實返回／地图及指引、截圖、请求類別與次數、退出碼、存儲/清理證據。無Key/完整敏感URL/token/私人定位入Git。私有免費權益T002仍待資料；原有Key使用授權有效，不自動付費、新service或无限重試。實地、全程真實confirmed、維護不是前置。
