# Phase 0 Research: 多方式與無障礙提示

日期2026-10-11（Asia/Hong_Kong），基線`7d34242`。方法：只讀現有代碼、001／002證據，按speckit-plan派遣只讀研究agent核對模型／相容／測試，閱讀官方資料。沒有新供應商調用、讀取帳號控制台、實地、預約或業務運行驗證。

## R01 — 沿用前端高德，新增共同queryRoute

**Decision**: 保留舊`planRoute(walking|driving, from, to): Promise<AmpRoute|null>`；另加`queryRoute`回傳success/no-route/error/not-implemented可辨結果。新UI與三個舊導航入口內部改用新介面，舊export仍可使用。共同模型屬client，不改shared／後端公开DTO。

**Rationale**: 現有`memopath-amap.ts`僅distanceM/durationS/points，且catch→null混淆失敗；`memopath-engine.ts`有tripMap駕車、搜索步行、返家步行三個planAndDraw入口。直接改舊回傳可破壞依賴，新增介面避免此風險。

**Alternatives considered**: 改舊AmpRoute為nullable字段、換SDK／供應商、新後端代理。皆不必要；舊export的既有回傳策略不重寫，與新queryRoute分開，新UI不用舊缺值處理或錯誤→null語義。若實作期發現必須變更舊契約，先提出具體差異，不藉相容wrapper靜默改行為。

## R02 — 正規化、公交、transport及來源

**Decision**: 按原方案／路段順序正規化，公交同段候選保留於同一ride leg；不flatten成連續換乘。缺字段為null＋原因。每個已提供polyline按有效連續片段繪製，無資料與錯誤坐標位置不跨越補線。queryRoute不自動重試或回退。

**Rationale**: [高德方向文檔](https://lbs.amap.com/api/webservice/guide/api/direction)列三方式、公交城市參數、分段及callback，與001歷史香港返回可相互核對。現transport的output=JSONP與文檔callback條件不一致，實作修正為JSON＋callback並保留清理；這是參數相容修正，尚未驗證其瀏覽器成功。

**Alternatives considered**: 用首個busline作唯一資訊、按buslines總數計換乘、將所有坐標連成一條線、缺字段填0，均可能產生錯誤摘要。採每ride leg預選首個候選，明示可選同段備選；選備選只重新評估／繪製，不造出另一完整供應商方案。不能推導完整總量時顯示未提供。

**Open operational check, resolved fallback**: 保留`direction/walking`、`direction/driving`；新增`direction/transit/integrated`，香港樣本city/cityd=香港、extensions=all。文檔存在與001直接HTTP結果不等於新UI可用，V03另取證；失败明示，不自動加代理。

## R03 — 请求有效性與地圖生命周期

**Decision**: 沿用identity／elder／view generation及routeSequence，增sourceMode與request snapshot；任何需要重新規劃的动作先invalidate清全部當前内容，再定位／解析／調用。成功、空结果与catch都先匹配context再更新。離頁、回退、render替換地圖、撤權及卸載失效，不能只防成功。

**Rationale**: 現engine有身份、序號、container連接及map instance防護，但成功後才清routeOverlays；視圖往返或前置定位失敗會留下舊摘要。能否取消JSONP不是正確性的前提。

**Alternatives considered**: 只加AbortController、只檢查mode、只清線不清提示／摘要，均不足。清理timer／script／callback仍按transport結束或取消有界執行，不把丟棄結果等同資源已清理。

## R04 — 無障礙是獨立證據評估

**Decision**: 一般輪椅需求為單一開關，證據可匹配某段／入口或僅背景；三類結論與已知障礙獨立。日期未知、過期、衝突或所需協助未確認保留缺口。沒有完整證據時不呈現真實已確認。

**Rationale**: 當日讀取[尖東設施表](https://www.mtr.com.hk/en/customer/services/free_search.php?station=80)：入口J有坡道、部分入口有升降機；這只是設施名錄，無本次路線／狀態保證。[科學館](https://hk.science.museum/en/web/scm/visit/barrier-free-facilities.html)及[藝術館](https://hk.art.museum/en/web/ma/visit/barrier-free-facilities.html)提供場地設施說明，未證明站口至館門連通。[MTR Care](https://www.mtr.com.hk/en/customer/services/mtr-care-app.html)的斜板安排需職員確認，App有資訊不代表可供本應用调用的即時接口。

**Alternatives considered**: 少換乘／普通步行當輪椅路線、静態表視作即時正常、要求先實地或全程样本，均與範圍或證據標準不符。日期以來源時點／有效条件处理，沒有統一TTL；查阅日期不是更新时间。具体路径无法匹配可先展示背景＋不足，不阻塞演示。

## R05 — 四類來源與功能完成程度分離

**Decision**: sourceKind=live/static/simulated，static subtype=facility-summary/historical-replay；實作程度獨立implemented/not-implemented/deferred。未完成沒有成功結果；live當次失敗仍是live失敗，只有用戶明確改sourceMode才進回放／模擬并新建context。

**Rationale**: 页面demoMode目前表示前端身份／持久化演示，不能代表地圖数据真假；真實地圖加静態設施須分項標示。001历史HTTP记录只能作为旧证据，无完整可重放payload时不得据摘要制造“真實回放”。

**Alternatives considered**: 單頁demo標籤、自動緩存／模擬降级，容易遮蔽当次失敗。若用摘要製作說故事場景则标simulated並附参考，非historical-replay。

## R06 — 免費與許可核查有界進行

**Decision**: 只採既有高德与已批准公开資料方向，使用前逐項查可用權益／日期與來源再利用條件。未能核實则保留live disabled原因或不打包该资料，提供來源連結／显式模擬選擇；不自動付費、不加未批准服務。

**Rationale**: 用户已確認免費額度，未獨立取得类别／剩余／期限；[官方流量限制](https://lbs.amap.com/api/webservice/guide/tools/flowlevel)不能證明私人账号当前權益。計劃無法在瀏覽器實時防止帳號層付費超額，必須在真實調用前確認控制台限額／付費設定與停用条件；不能聲稱代码已保證零費。

**Alternatives considered**: 購買新服务、自動代理、擷取完整第三方页面／图片長期存檔均不採用。僅保留允許的少量摘要与来源，许可不明则不复制；來源可访问不是再利用許可。

## R07 — 相稱驗證與交付

**Decision**: 純模型／狀態／證據的有風險規則用Node測試，UI用真實返回＋显式故障與延遲，最终受支持契約／身份作回歸。V01–V12與31項FR／SC在verification逐項映射，暂緩不计通过。

**Rationale**: package已有node:test／tsx、lint、build、9套件test:integration，dispatcher不支持route suite；用直接指定新測試檔，不捏造已存在的命令。既有002運行結果保留歷史，只证明当时范围。

**Alternatives considered**: 新框架、覆蓋率門檻、全PRD安全重做、實地／維護任务均不必要。實作受阻可交付限度，SC未達保留，不能改規格把缺口算成功。

## Gate outcome

没有未解的设计选择或待釐清產品事項。私有配额、資料許可、候選入口與瀏覽器真实返回是已列明的使用前查证项，有明确失败／暂缓路径；不偽稱已取得。两条初查MTR旧URL及高德错误码页本轮讀取失敗，随后用正確MTR官方頁讀取成功；錯誤碼分類只採實際已知映射，未確認保持provider/unknown，不把抓取失败當資料已核实。
