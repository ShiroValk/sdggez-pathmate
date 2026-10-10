# Implementation Plan: 多出行方式與無障礙提示

**Branch**: `feat/003-multimodal-accessibility` | **Date**: 2026-10-11（Asia/Hong_Kong） | **Spec**: [spec.md](spec.md)

**Input**: `specs/003-multimodal-accessibility/spec.md`，以及本次用戶列明的七項規劃要求。

**Status**: Phase 0研究及Phase 1設計完成；尚未實作或取得003運行驗收。規劃基線 `7d34242`；Git分支與`.specify/feature.json`均指向003，環境變量無覆寫。setup-plan輸出中的BRANCH為目錄標記`003-multimodal-accessibility`，實際Git分支以以上全名為準。

## Summary

在既有MemoPath手機網頁原型加入步行、駕車、公交選擇，使用共同結果模型呈現摘要、有序指引、接駁及換乘，修正旧線／摘要殘留及失敗與無路線混淆。沿用前端高德適配、搜索、定位緩存、身份上下文及繪圖，不新增後端代理、付費服務、資料庫或權限。

無障礙提示以一般輪椅需求為準，獨立附上靜態公開資料、範圍、日期、缺口及協助條件，不把普通路線等同輪椅路由。真實當次查詢、靜態／回放、模擬與未完成在每項內容分別標示。尖東／尖沙咀少量公共地点作主故事，既有理大／醫院與機場样本作回歸或換乘參照。全程已確認真實樣本可以為0；實地、长期维护、正式部署均非前置。

設計決策見[research.md](research.md)，完整字段及狀態規則見[data-model.md](data-model.md)，邊界及相容策略見[contracts/route-preview.md](contracts/route-preview.md)，實作後運行指南見[quickstart.md](quickstart.md)。逐項FR／SC映射與未填運行證據欄見[verification.md](verification.md)。

## Technical Context

**Language/Version**: TypeScript（package宣告^5.9.2）；Node.js 24（>=24且<25）、npm>=10。沿用鎖文件，不安排依賴升級。

**Primary Dependencies**: 既有React 19、Vite 8、MemoPath DOM engine、高德JS地圖1.4.15及Web Service v3；後端NestJS 10、Drizzle/PostgreSQL既有部分不改。版本來自現有配置，不表示本輪重新安裝或驗證。

**Storage**: 路線選擇／結果僅頁面記憶體；少量已審閱設施摘要／公共回放為版本化前端靜態檔，附來源與使用條件。私人坐標／token不保存於回放或證據。不新增localStorage鍵、DB表或遷移。

**Testing**: Node `node:test`＋既有tsx執行純正規化、狀態／日期／來源測試；瀏覽器檢查真實高德與明示故障／延遲控制；既有integration dispatcher驗證受支持契約與身份。具體命令與證據要求見quickstart，新增測試檔目前未建立。

**Target Platform**: Windows本機、桌面與窄屏瀏覽器；既有5173开发／3000构建後入口。香港時間作示範與記錄時區。內置瀏覽器定位拒絕可改明確公共起點，不模擬成功定位。

**Project Type**: 既有web應用中的前端功能增量。

**Performance Goals**: 選擇變更同一處理流程內清舊結果並顯示查詢中；先沿用10秒高德查詢、30秒裝置定位時限，以目前請求結果呈現錯誤。無新增吞吐、99%可用或定位速度承諾；真實延遲只記觀察值。

**Constraints**: 不靜默回退、不付費、不跨未批准服務；免費與許可核查只阻塞相應真實調用／資料打包，不阻塞純模型與顯式模擬設計。支持API、角色、共享、默認圍欄上传與不持續監聽基線保留。

**Scale/Scope**: 2組尖東候選＋1組既有三方式回歸＋1組換乘參照；不要求候選全有公交或實際換乘。按可行性一次有界調查后記錄選定／暫緩，不无限尋找已確認路線。

## Constitution Check

*GATE: Phase 0前與Phase 1設計後均核對；通過表示設計合規，不代表實作驗證。*

| 條款 | Phase 0前 | Phase 1後與必需實作證據 |
| --- | --- | --- |
| I 模擬／真實 | 通過，四類來源已明示 | 通過設計；每資料項有provenance，靜態回放保留歷史查詢時點，模擬不計真實樣本；V08驗證 |
| II 相稱驗證 | 通過，文件階段只查文件與官方資料 | 通過設計；V01–V12分開純邏輯、受控瀏覽器、真實返回與既有證據，未執行保持未驗 |
| III 全部輸入 | 通過，不新增服務端寫入 | 通過設計；mode／來源允許值、選定坐標、方案／備選ID、需求值及嵌套供應商資料在使用邊界驗證；模板文本轉義；V01/V02/V10 |
| IV 代碼文檔 | 通過，規劃同步文檔 | 通過設計；新增模塊及改動公共函數寫職責、輸入輸出、錯誤、副作用、上下文／配額與資料限制；已有缺文檔僅修影響範圍，非全庫已合規 |
| V 公共API相容 | 通過，不需公開契約變更 | 通過設計；保留舊planRoute签名和AmpRoute，新增queryRoute；無後端／shared DTO變更，V10核全部舊入口及契約 |
| VI 服務邊界 | 通過，既有client地圖／engine承擔 | 通過設計；純資料處理仍屬client；Auth/Elder/Family無新責任，无跨服務调用增量 |
| VII 遷移回滾 | 本次不適用，無資料庫變更 | 維持不適用；回退匹配前端產物／靜態資料版本，不動DB。若確需DB另提方案，觸發條件／備份／步驟／恢復及驗證完整后再执行 |
| 三項基線 | 通過 | 不新增遠端位置上報、持續麥克風或手表依賴；V10核對 |

沒有需批准的章程例外、不相容契約或服務職責調整。若前端callback真實能力不足，先記錄不可用／暫緩；如認為必須加代理，另提受影響服務、契約、資料／Key處理、成本與回退方案供用戶確認，不能自動加後端。

## Project Structure

### Documentation (this feature)

```text
specs/003-multimodal-accessibility/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── contracts/route-preview.md
├── quickstart.md
├── verification.md
└── checklists/requirements.md
```

`tasks.md`由下一階段speckit-tasks產生，本輪不建立。verification現為驗證設計及交付範圍表，非完成證據。

### Source Code (repository root)

```text
existing_app/
├── client/src/pages/MemoPathPage/
│   ├── memopath-amap.ts            # 既有transport、搜索、地圖；增queryRoute
│   ├── memopath-engine.ts          # 既有三導航入口；增方式／公共起點／提示UI
│   ├── position-cache.ts           # 保留既有定位政策
│   ├── route-model.ts             # 擬新增共同型別、正規化／输入驗證
│   ├── route-state.ts             # 擬新增純狀態／請求匹配策略
│   ├── route-accessibility.ts     # 擬新增局部證據與保守結論
│   └── route-preview-data.ts      # 擬新增已審閱靜態／回放及顯式模擬
├── tests/integration/
│   ├── route-model.test.ts        # 擬新增，不需DB
│   ├── route-state.test.ts        # 擬新增，不需DB
│   ├── route-accessibility.test.ts # 擬新增，不需DB
│   ├── route-ui.validation.ts     # 擬新增有界測試控制，非正式服務
│   ├── position-cache.test.ts     # 既有
│   ├── contracts.test.ts          # 既有
│   └── run.ts                    # 保留9套件dispatcher
└── server/、shared/               # 公開契約與資料歸屬不改
```

**Structure Decision**: 純正規化／狀態／證據分成可直接測試的同頁模塊；transport仍由memopath-amap負責，engine整合畫面與生命周期，不導入新框架或路由服務。擬新增檔名供tasks定位，實作依現有CSS組織增樣式與三語文字，不重寫MemoPath架構。

測試控制只保留可審閱的執行代碼；合成資料在測試中生成、结束清理，不保留持續運行夾具、測試帳號、空證據檔或一次性演示workflow。產品所需且已標示來源的靜態／模擬故事資料属于用户授权范围，不以其代替真实验收。

## Phase 0 — Research decisions

已完成代碼與既有001／002證據核對，按技能派遣一名只讀研究agent，並查當前官方文檔。結論在research；無待釐清產品選擇。帳號私有配額／許可、具體候選入口與段級資料仍列作使用前核查，已決定未取得時的處理路徑，不假稱已核實。

## Phase 1 — Design and bounded implementation order

1. 建立共同模型、字段驗證、分段幾何與公交方案／備選區別，先用顯式測試資料核對缺失與錯誤分類。
2. 在既有前端transport加queryRoute、公交及文字指引解析；callback使用官方規則output=JSON，保留callback與清理。檢查免費與來源條件後用少量公共樣本核真實瀏覽器返回，記錄HTTP歷史與新UI不同。
3. 在地圖請求前（包括定位／目的地解析前）失效舊結果；所有成功與失敗回應受sequence、identity、elder、view、map instance、來源模式約束。整合三個舊入口及主要tripMap新選擇。
4. 加一般輪椅需求、靜態設施卡與缺口結論；匹配不到路段時只作背景，既有样本无完整证据保持不足。無障礙開關只重新評估目前方案，不額外調用付費或新路由。
5. 分別標示來源，增明確靜態回放／模擬入口；四類交付狀態記錄。完成V01–V12适用驗證、31項映射與一次故事演示，暫緩部分保留未達標。

每個有界實作階段通過適用檢查再checkpoint；正式打包後核回歸，不把003測試命令不存在當通過。無實地／全程已確認樣本／長期維護任務。若主故事候選公交不足，保留該地點可用方式，換乘用既有公共參照，不自動換服務。

## Complexity Tracking

沒有章程違反或需要豁免的複雜度。額外模塊僅隔離可測試資料政策，沒有新增服務、資料庫、SDK或依賴。
