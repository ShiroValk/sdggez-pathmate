# 文档/运行/迁移复核 T026/033

对象：Auth/Elder/Family/controller/DTO/guard/principal及模块README；地图/voice/position-cache公共函数；shared/API调用；main/config/logger/DatabaseModule；应用README、run/test dispatcher/helpers；0000/0001/schema/迁移README；recovery/verify-recovery/verify-baseline及002operations合同。

README覆盖身份/输入输出/错误/权限/副作用/职责及迁移步骤，但旧0000首段和方法表继续声称0001未实现、地点无列，后文已追加0001；迁移旧段称恢复工具待实现、后文工具已实现。按FND-10登记必要文档差异，不据旧段判业务缺失。地图planRoute未完整说明catch/null与错误归并语义，loadAMap失败资源说明也不足。此处不要求显然逐行注释，不改应用文档/注释。

现有启动配置/独立_test、恢复pathmate_restore、普通/真实demo隔离、备份checksum/pg_restore检查/新库恢复/会话清理/匹配0000验证、0001新数据另备份均有当前实现及EVD-01/08。只读核对，不再安装/迁移/恢复，不停止现服务。已有22项及lint结果仅复用，不当全部PRD或本轮新运行。

47项依赖审计线索来自002旧安装记录；package/lock是当前依赖边界，缺具体advisory/受影响版本/依赖路径与可达条件，不能确认应用当前47个漏洞。DEC-10保留待核查，无升级/audit fix或全量新审计；待具备具体线索再风险相称验证。此限制不阻断当前业务差异或路线供应商判断。
