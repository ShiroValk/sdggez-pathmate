# Data Model: 三方式、查詢狀態與無障礙依據

日期2026-10-11，設計文件；以下型別為實作契約草案，尚未加入業務代碼。不新增DB、API DTO或持久化偏好。欄位以camelCase命名，nullable明確用null；現有tsconfig關閉strictNullChecks，不能只靠型別，須有運行驗證。

## 1. 基本值與來源

| 實體／值 | 欄位與規則 |
| --- | --- |
| RouteMode | walking／driving／transit允許值；任意其他字串拒絕，不默認駕車 |
| Endpoint | id、label、point{lng,lat}、selectionOrigin=public-search/device/explicit-public-sample；public id可為前端局部ID，非Elder ID。有限經度[-180,180]、緯度[-90,90]，合法0保留；空分量／不完整坐標拒絕 |
| WheelchairRequirement | enabled:boolean，profile固定general-wheelchair；不加入尺寸／重量／電動分類或統一數值承諾 |
| Provenance | kind=live/static/simulated、provider、sourceTitle、sourceUrl或referenceId、observedAt、originalQueriedAt:null或時間、publishedAt/updatedAt:null或來源日期、limitations[]。static須subtype=facility-summary/historical-replay；無法給日期明示未知 |
| ImplementationStatus | implemented/not-implemented/deferred與reason；與sourceKind獨立。unimplemented不生成success路線 |
| MissingField | path、reason=not-provided/invalid/unsupported、不可信原值不入畫面；便於具體顯示缺站名／時間／幾何 |

live只用於該次實際供應商請求的結果（成功或失敗）；所選sourceMode不代表已調用或已取得結果。請求前失敗的provenance為null，畫面顯示「所選來源：真實查詢｜尚未調用」與實際原因，不顯示「真實當次查詢結果」或虛構查詢時點。改來源模式必須重新建請求。歷史live結果重新開啟展示為static/historical-replay，originalQueriedAt保留，不改成現在查询時間。回放无合法完整数据時僅顯示歷史文字證據；根據文字構造可執行payload標simulated。

資料日期用來源原精度（日期或日期時間）並記精度／時區；查閱時間為ISO時間，畫面以Asia/Hong_Kong顯示。publishedAt不是updatedAt，observedAt不是來源更新或效力證明。不輸出Key、完整敏感請求URL、token或私人起點。

## 2. Selection、Query與Outcome

| 實體 | 欄位 |
| --- | --- |
| RouteSelection | origin、destination、mode、wheelchair、sourceMode=live/replay/simulation、sampleId:null或已審閱資料ID、selectedPlanId:null或目前批次方案ID、selectedRideOptionIds:按legId對應optionId、selectionVersion、accessibilityVersion；selectionVersion管理展示選擇，accessibilityVersion管理輪椅需求及證據評估。新查詢清空方案／備選選擇；ID只接受目前批次及選定方案的成員 |
| RequestContext | requestId、不可變查詢snapshot{origin,destination,mode,sourceMode,sampleId}、identityGeneration、elderGeneration、viewGeneration、screen、viewRole、elderId、demoMode、map generation／instance；不以selectionVersion、accessibilityVersion或輪椅開關匹配供應商回應。token僅沿用內部identity snapshot作匹配，不加入可序列化payload、回放或日誌 |
| RouteQuery | 查詢snapshot{origin,destination,mode,sourceMode,sampleId}、requestId；啟動前驗證全部输入；定位／候選解析開始前已取得requestId；不傳展示方案／備選或輪椅評估版本給供應商 |
| RequestAttempt | status=not-sent/sent、sentAt:null或ISO時間；僅路線transport實際啟動發送時為sent，不代表供應商已收到或成功。驗證、定位、候選解析及免費／配置門禁不算路線請求；replay/simulation亦為not-sent |
| RouteQueryOutcome | 共用requestedSourceMode=live/replay/simulation、requestAttempt；success{plans:非空RoutePlan[], provenance, warnings[]}／no-route{provenance}／error{category,message,provenance:Provenance或null}／not-implemented{reason,mode,sourceMode,provenance:null}；success/no-route必須有對應結果來源 |
| ErrorCategory | invalid-input/config/position-denied/position-timeout/position-unavailable/transport/timeout/provider/permission/quota/invalid-response/unknown；只有實際可靠訊號才分類permission/quota，不從任意文本猜 |

有可用方案但部分字段缺失是success＋缺口，不當無路線。供應商成功狀態且方案集合合法、明確空才no-route；route缺失、方案集合類型畸形／全數無法解析屬invalid-response。異常、provider失敗不得no-route，不導向simulated。單個畸形方案可隔離並列warning；其餘可用方案保持順序，原索引保留。

請求前無Key、輸入無效、定位拒絕或免費條件未確認：error保留requestedSourceMode，requestAttempt={status:not-sent,sentAt:null}且provenance=null。實際live路線請求已發送後的網路／超時／provider／格式失敗：requestAttempt為sent並有實際發送時點，provenance為live，僅證明調用嘗試而非取得有效路線。回放／模擬只有取得該來源的資料或處理結果時才帶相應provenance；讀取前失敗為null。not-implemented固定not-sent及null來源。任何分支均不自動修改requestedSourceMode或退為模擬。

查詢身份沿用requestId及完整RequestContext，匹配key含起終點、mode、sourceMode、sampleId及身份／elder／視圖／地圖generation，不含展示選擇或輪椅版本。每次接受結果保存不可變方案批次，RoutePlan保留原requestId，不因選A／B或同段備選而重綁、改寫或失效。非目前查詢的成功、無路線及失敗一律丟棄。

展示選擇由selectedPlanId與selectedRideOptionIds決定。完整方案／備選改動只遞增selectionVersion與accessibilityVersion，從同一批次重建RoutePresentation，不新發供應商請求；尚未有目前成功批次時不可選舊方案。需求開關或評估依據更新只遞增accessibilityVersion，不影響路線請求。路線返回用目前需求建立評估；評估context必須包含requestId、selectionVersion、accessibilityVersion、selectedPlanId、selectedRideOptionIds及身份／視圖上下文，全部仍匹配才接受，即使A→B→A的ID相同也不得接受第一次A的遲到評估。

## 3. RoutePlan共同模型

| 欄位 | 類型／語義與驗證 |
| --- | --- |
| id、providerPlanIndex | 局部穩定ID、原方案索引；不得跨請求當同一結果 |
| requestId、mode | 原查詢身份與方式；RoutePlan不帶selectionVersion。所屬查詢批次須通過目前RequestContext匹配才可選取，切換展示選擇不改原requestId |
| origin、destination、provenance | 完整快照与來源；不会因static设施把live路线改成整页static |
| distanceM、durationS | number或null，有限且>=0；空字串、空陣列、負值、NaN、Infinity為null＋MissingField，明確合法0顯示0而不是最少1。記metricBasis=provider/derived-complete/unknown |
| totalWalkingM | number或null，公交步行總量與全程距離分開 |
| legs | 有序RouteLeg[]；保留供應商segment／step索引，可有unknown leg避免默默刪除未知段 |
| geometry | PolylineFragment[]、coverage=provided/partial/none、missingParts[]；provided只指供應商提供，不證明可達或精度 |
| transferCount | number或null；可辨連續ride legs時max(rideCount−1,0)，任何未能判定是否乘車的段令其未知；walking不增加次数 |
| completeness | missingFields[]、unsupportedParts[]、warnings[]，不得以success隱藏缺口 |

RoutePresentation是從不可變RoutePlan及目前選擇導出的畫面資料，帶requestId、selectionVersion、selectedPlanId、selectedRideOptionIds、目前legs／geometry／metrics／missingFields；不當另一個供應商方案或改寫原批次。供應商原總量只在選擇仍適用時顯示，備選改變後依下述總量規則處理。

數值不先Number(raw??0)；仅有限數字或非空可解析數字字串轉換，原始空值拒絕。總時間不能由步行／乘車時間简单加總冒充供應商ETA（缺等候时间）；总距离優先用語義明確的方案值，不能用公交route.distance（可能為純步行）冒充全程。确实有全部所選段距离可加總時標derived-complete；同段備選改变后无适用总量则null，不继续显示原方案总量或伪造重算時間。

## 4. Legs、Steps、RideOptions與幾何

RouteLeg共有id、order、providerSegmentIndex、kind=walk/drive/ride/unknown、distanceM/durationS、steps[]、geometry[]、missingFields[]、entrance/exit（名称与坐標可分别缺失）。Step有order、instruction:string|null、road:string|null、distanceM/durationS、geometry[]。每条供應商文字以文本／现有esc转義输出，禁止未受信HTML。

| kind | 專屬欄位／規則 |
| --- | --- |
| walk | role=access/transfer/egress/route/unknown，由乘車段相對順序判定；供應商確有該段才顯示，不造首／末接駁。沒有明細则明示接駁資料未提供 |
| drive | 按原steps順序；不因駕車抵達推論輪椅車、停泊或下車點可達 |
| ride | alternatives:RideOption[]；同segment的buslines放在本陣列，初次選方案時於RouteSelection預選首個合法候選且明示。selectedOptionId只屬導出的RoutePresentation，不寫回原RoutePlan。铁路／其他已识别乘車模式可正規化成ride，保留type與来源，不支持的信息為unknown／缺字段 |
| unknown | 保留位置與「此段資料未支援」；不跳過该段连成完整路線或计精确換乘 |

RideOption有局部id、providerLineId、name:null或字串、transportType:null或字串、departureStop／arrivalStop（各自name/id/point可null）、distanceM/durationS、geometry[]、viaStops[]、sourceIndex。公交的一個segment若同时出现多种乘车子结构且先后关系不明，保留unsupported警告，不猜连乘順序。

換乘按選定方案的可辨ride legs計算，不按segments长度或alternatives總數。選同段備選只替換該leg資訊，不增加ride數；失去站點／幾何／总量依據时显式不完整并重新评估無障礙證據。完整方案選擇與同段備選分開UI控件。

PolylineFragment有legId、stepIndex、optionId:null或選定候選ID、points:至少2個有限合法點、原fragment索引。缺step幾何或polyline內非法點造成中斷，分開片段，禁止跳過坏點後連接兩端。不同leg／alternative不串線；不畫猜測端點直線。沒有可繪片段時文字仍可用，顯示無路線幾何，不把目的地marker当完整路线。

## 5. QueryState與生命周期

QueryState為idle/resolving/loading/success/no-route/error/not-implemented。resolving是已開始本次流程、等待用户明确候選／定位；界面用「選定地點／取得起點」，不得显示旧結果。success仅當accepted context有plans。

| 事件 | 同步動作 | 非同步返回處理 |
| --- | --- | --- |
| 改mode／起終點、按重新規劃 | requestId、selectionVersion與accessibilityVersion遞增；失效整批舊方案，清route overlays、摘要、步驟、選方案與accessibility；validate後resolving/loading | 地點解析、定位、查詢每個await后對完整RequestContext；失败同樣检查，不弹旧toast |
| origin=device定位失败 | 本次error，保留選擇；顯示公共起點選擇入口 | 不發虛構origin请求；后續選public觸發新requestId |
| 更換完整方案／同段備選 | 僅selectionVersion與accessibilityVersion遞增；保留原查詢批次及requestId，更新有效選擇ID，清當前呈現與結論后重建RoutePresentation；不增加供應商請求 | 評估返回須匹配完整評估context；A→B→A亦拒絕第一次A的遲到評估 |
| 切無障礙需求 | 重新評估目前選定方案，清舊結論；更新需求版本，不自動改普通mode或再次付費調用 | 如果路線仍loading，保留該路線請求context，完成時套用最新需求版本，不因toggle丟掉唯一請求而永久loading |
| 改live/replay/simulation或回放／模擬sample | 先invalidate整批結果及評估，遞增requestId與兩種版本；更新sourceMode/sampleId，新context，需用户明確操作 | 旧live成功／失敗不覆盖新回放；旧模擬不回填live |
| nav/back、身份／長者／demo變更、403清理、卸載或地圖替換 | routeSequence与相关generation失效；清结果、证据、输入中私人端点、掛載资源 | container.isConnected、map instance及identity/current全部一致才可更新；同screen離開再回也不例外 |
| 收到success/no-route/error | 先match context；不匹配丟棄 | 只更新當前状态，非success不附旧plan；每種完成不改sourceMode |

純state模塊只接收serializable epoch摘要與selection key；token比較留engine既有identity方法。JSONP如可取消则清理，不能取消时等既有10秒有界超時；忽略结果不等于清理完成。資料lookup即使同步亦取同一版本，避免后續异步擴充破坏隔離。

地圖初始化不能必須成功裝置定位：主要入口明確public endpoint後可用該點建圖；装置位置是自選來源。文字目的地若需解析，显示候選等用户选定；無決定不自動採用第一同名结果，不改行程API只存文字的既有契約。

## 6. 無障礙Evidence與Conclusion

Evidence欄位：id、provenance、subject{stationId/facilityId/entrance/legId/rideOptionId/routeSampleId}、matchLevel=exact-leg/exact-facility/background/unmatched、scopeComponents[]、claim、conditions[]、assistance、dateAssessment、conflictGroup:null或ID、knownBarrier:null或说明、limitations[]、usageReview{checkedAt,allowed,notes}。静态清单不保存用户身份。

scopeComponents涵蓋本次需求的street/crossing/entrance/lift-ramp/station-platform/vehicle/boarding/alighting/access/transfer/egress；駕車须另外保留drop-off/parking到入口的未知，不以車輛可開路代替輪椅段。只對路线所需環節评估，不强加不存在的公交段；普通步行仍需完整街道／入口依据。

dateAssessment：published／updated／validFrom／validUntil可null、reviewedAt、status=known-date/no-date/expired/conflicting、basisNotes。日期有值不自动valid；没有來源有效条件不能确认当次设施状态。过期依据只当历史背景；新來源可補但要记录解决了哪个冲突，不自动选较新日期压过事实冲突。

Assistance有required:boolean、type=staff-portable-ramp/other、instructions、availabilityEvidenceIds[]、availability=applicable-confirmed/conditional/unknown/unavailable、bookingStatus=not-booked。运营方普通介绍与可预约功能只支持conditional，不表示本次staff已经确认。无本次可获得性依据则未知缺口。

AccessibilityConclusion欄位：profile、enabled、requestId、selectionVersion、accessibilityVersion、routePlanId、selectedRideOptionIds、evaluatedAt、evidenceIds[]、status=confirmed/partial/insufficient、supportedComponents[]、gaps[{component,reason}]、knownBarriers[]、assistanceConditions[]、freshnessWarnings[]、simulated:boolean；接受前核完整評估context，版本只管理有效性，不充當來源或可信證據。

結論規則順序：

1. 需求关闭时不显示轮椅确认徽章，可保留背景设施卡；来源標識不消失。
2. 模擬依據不能支持真实confirmed；真实结论只合并适用的真实资料来源，不取页面demoMode推测。
3. 任一已知障礙顯著显示，status不得confirmed；可为partial（另有適用依据）或insufficient，并显示「已知障礙」而非藏在总标签。
4. 只有背景資料、没有任何可匹配具体段/施設的适用支持时insufficient；精确设施資料仅确认其描述范围，不确认到達該施設的街道或运作状态。部分有依据但必要段仍未知时partial。
5. 日期／状态不适用、冲突未解或必要協助不明时生成gap，不因其他支持降低标准。所有必要環節都有可信適用证据、没有障碍／未解缺口且協助满足条件才可confirmed。
6. 当前真实全程样本0，不需为演示制造confirmed。模拟complete可测分支，其provenance与结论模拟标识同时可见。

## 7. DeliveryScopeRow

按[verification.md](verification.md)的31项FR／SC记录：requirementId、featureSlice、implementationStatus、sourceKinds[]、verificationStatus=passed/failed/not-run/blocked/accepted-deferred、evidenceIds[]、reason、impact、followupConditions。模拟passed只指相应展示逻辑，真实覆盖独立记录。planning-ready不填写成implemented/passed；全程真实样本数为单独计数，当前0。
