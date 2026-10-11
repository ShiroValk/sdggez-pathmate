# Quickstart: 003實作後演示與驗證

日期2026-10-11。本文件為運行計劃；003新測試／頁面尚未實作，以下擬新增命令與情境不可當已通過。完整对照见[verification.md](verification.md)，模型與畫面规则见[data-model](data-model.md)及[契約](contracts/route-preview.md)。

## 前提與啟動

1. 核Git分支`feat/003-multimodal-accessibility`與`.specify/feature.json`均为003；優先檢查SPECIFY_FEATURE_DIRECTORY覆寫。保留用户既有服務／改动，不建立新编号。
2. 沿用[主应用README](../../existing_app/README.md)的Node 24、现有node_modules與本機数据库；有配置就复用，不重装、不自动起新服务或执行迁移。无依赖时按原README补齐，保留锁文件。
3. 既有`.env.local`不读取到聊天、不覆盖；真实调用前检查高德Web Service／JS各自免费类别、期限、额度、允许来源与付费超额是否禁用，并核设施／回放再利用条件。无法确认时关闭相应live或不打包资料，明示原因；不充值或换服务。只记录脱敏核查结果。
4. 纯模型／状态测试不需DB或Key。真实API回归须独立本机`DATABASE_URL_TEST`，不同于开发／恢复库且以`_test`结尾。浏览器身份测试仅用本次合成账号或既有显式前端演示，不操作用户真实照护关联。

在PowerShell中：

```powershell
Set-Location C:/Users/RedV/Documents/Code/sdggez-pathmate/existing_app
node --version
npm.cmd --version
npm.cmd run dev
```

开发页`http://127.0.0.1:5173/memopath`；若现有3000已在运行先复用，不能盲目重启。构建后验证用`npm.cmd run build`、`npm.cmd start`及`http://127.0.0.1:3000/memopath`；正式服务启停遵守既有README。前端preview不当真后端证据。无需再执行DB迁移。

## D01–D04少量公共样本

| ID | 起終點与用途 | 取證／限制 |
| --- | --- | --- |
| D01 | 尖東站明确公共入口→香港科学馆明确入口，主故事候选 | 搜索坐标由用户明确选，资料能对应入口才绑定；普通三方式逐一观察，可能短公交无可用方案。设施只能静态／背景，不称全程可达 |
| D02 | 尖東站明确公共入口→香港艺术馆明确入口，第二候选 | 与D01相同规则；资料不足保留不足，不无限挑出口制造确认 |
| D03 | 香港理工大学→圣德肋撒医院，三方式回归 | [001既有记录](../001-audit-backend-gaps/evidence/hong-kong-routes.md)仅2026-10-09直接HTTP；本次新UI另验，记录当前实际返回，不比较数值必须相同 |
| D04 | 香港理工大学→香港国际机场，含换乘参照 | 旧样本3乘车段／2换乘及另一同段E42/E42C；末段一般POI与1米接驳不证明可达。可优先用历史文字或取得合法回放，不能按旧摘要编造真实payload |

最少选一组能完成三方式的明确公共点（优先D01／D02，不足用D03补，保留主区限制），另一个含换乘情境D04；不要求4组全查三方式。首次选择／真实查询预算先列清单，优先每项一次，无自动重试；无路线或失败仅一次有依据的手动重试／修改后记录，不无限追补。实际搜索／JS加载也记请求类型及次数，不将估算当账单或免费资格。

## 相稱命令

擬新增3个纯测试檔後才运行（直接命令，不加入现有9套件dispatcher）：

```powershell
node --import tsx --test tests/integration/route-model.test.ts tests/integration/route-state.test.ts tests/integration/route-accessibility.test.ts
node --import tsx --test tests/integration/position-cache.test.ts
npm.cmd run lint
npm.cmd run build
```

预期：模型缺失／0值／几何断点、同段备选、空集合／错误、context隔离、日期／证据边界断言通过；lint含两端类型，build可用。若新文件不存在应记录未实作，不运行空glob称成功。

受支持API／权限回归（独立测试库前提满足后）：

```powershell
npm.cmd run test:integration -- --suite contracts
npm.cmd run test:integration -- --suite permissions
npm.cmd run test:integration -- --suite auth
npm.cmd run test:integration -- --suite demo
```

此客户端变更以这4套及定位边界为基线回归；新model测试不由dispatcher自动执行。若改到后端持久化／配置／共享基础则重新审范围並选适用其他套件，最终集成按AGENTS及影响决定全量，不因未改DB重复迁移／重启夹具。预提交hook不可绕过。

## 浏览器关键流程

1. V03／V04：选D01或D02明确公共起点，拒绝／不启用装置定位仍可建图。明確选终点；切步行→駕車→公交及反向，逐次记录state、摘要、文字、来源及polyline。公交选完整方案与同段備選，检查不能误加换乘、缺总量不继续显示原估计。補A→B→A及同段備選往返，記路線請求增量0、原批次／requestId不變；人為延遲首次A的評估，選回A後仍拒絕舊評估。改端點／方式後核整批舊方案不可選。D03补三方式、D04核换乘。
2. V05：先有成功结果，再改方式／端点／重规划，在定位／搜索／查詢各阶段暂停观察旧線、摘要、指引与結論立即失效。受控测试延迟旧成功和旧失败，并快切再重试；同screen离开再回、登出／登入合成账号、切长者与demoMode、切live/replay/simulation、卸载都不回填。不能以测试控制结果当真实供应商故障证据。
3. V06：显示有效空方案、provider失败、脚本／网络失败、超时、无Key、无坐标、定位拒绝／超时与畸形结果；保留输入，明示原因，当前来源不自动变simulated。未發送路線請求時核requestAttempt=not-sent、sentAt/provenance=null及「尚未調用」；已發送失敗才顯示live查詢嘗試與實際發送時點，網絡記錄核無多發請求。真实自然失败有则单列，其他使用显式测试控制；不耗尽真实配额制造故障。
4. V07：开启一般轮椅提示，核局部设施匹配与未覆盖街道；只背景資料显示不足。另用显式模拟覆盖日期未知、過期、冲突、已知障碍、斜板协助未知及完整确认分支。真實数据缺口不靠模拟消除。关开需求时路线不重发、結論重评，查询中切开关也能完成，不永久loading。
5. V08：live路线＋static设施两种标识同时可见，回放有历史日期，模拟有持续标识，未完成有原因。服务故障后只能用户明确选回放／模拟；当前上下文是新来源。全程真实confirmed计数可为0。
6. V10：主页搜索步行／返家步行／tripMap三旧入口，及常去地点／行程／主页／路線四搜索入口，复检JSON＋callback参数修正后的成功、失败、输入保留、旧回调、重試／清理。地點相容与权限回归不以三方式成功替代。
7. V12：一次有界故事演示串「选方式→指引／换乘→局部设施／缺口→失败／不足→明确静态／模拟选择」。窄屏阅读、键盘选择与状态文字核對；未完成的功能展示原因，不预设计时、用户满意度或实地任务。

## 證據與清理

每个V记录日期、代码commit／产物、public sample与明确入口、方式、来源、操作、预期／实際、结果及脱敏文件链接。截图与文本证明界面；去敏结构与步骤证明字段；测试输出不能单独证明真实UI。地图Key、token、私人定位、真实用户资料不入Git。

V01/V02/V05/V06/V07受控数据仅证明相應逻辑；live覆盖、静态资料查閱、历史证据、模拟显示各有自己的证据ID。验证后停止本次夹具、清本次合成账号及临时资源，保留用户3000／开发DB。复用既有清理策略但不运行未审查的全库删除。

更新verification的31行，未执行保持not-run，阻塞有原因與可继续范围，暂緩记reason／impact；SC未达保留。核git diff／链接后按阶段提交，不部署、不推送。交付全程真实样本数0是允许结果，不要求长期维护安排。
