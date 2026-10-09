# 后端具体保留边界 T018

当前HEAD/Hash见evidence-index；现有12表和33入口全读。Auth、Elder、Family职责保持。

| 对象 | 当前可保留行为/异常依据 | 未完成的目标边界 |
| --- | --- | --- |
| Auth | scrypt、有限单会话摘要、login/me/logout、事务创建账号/长者/私有配置、demo advisory锁；重复409/错误401/DB503；EVD-02 | OTP演示无手机核验/短信，非主备角色体系 |
| Elder | owner、active link、target/expiry/明确true消费邀请、同长者/目标锁、撤销幂等、数据归属/多长者/删除级联；EVD-03/04 | 备用/邻居受限接收与粒度共享没有实现 |
| Family联系人/行程 | UUID/操作者/长者锁、真实读写/异常隔离；cab_called真实保存但叫车模拟；EVD-03/04/07 | 联系人不授角色；行程不是预约订单/真实派单 |
| 围栏/地点 | radius/dwellEnabled/dwellMinutes合并保存、地点type/beaconStatus/地址/成对坐标NULL或合法0、PATCH/DELETE；EVD-04 | 主圈中心仅homeLabel/地图解析，不完整安全判定；多点/站点保存不等于风险事件；阈值UI无编辑、滞留开关端侧失灵 |
| 设置 | principal.accountId、原子upsert、三种语言/两voice值/布尔lockLayout；EVD-05 | 私有配置不是家属下发，值持久化不证明消费 |
| alerts/movements/vitals | 每读授权SQL/无数据空态；seed隔离；体征最近1小时，dashboard today用Asia/Hong_Kong；EVD-03/07/09 | 没有主观打卡/消息写、事件生成、七日movement过滤/事件关联、通知送达；这些读取不可扩成新功能通过 |

PRD p9主观八状态固定生活提示复核目标：正常（三餐规律/走动/睡眠）；头晕乏力（休息/慢起身/营养）；胸闷心慌（停止活动/休息/持续不适联系家人）；睡不好（晚餐清淡/少晚茶/活动）；腰腿关节不适（保暖/少久站/轻柔）；胃部腹胀不舒服（清淡/少食多餐/不生冷）；口干上火（温水/少辛辣）；手脚容易冰凉（保暖/适度慢走）。现未发现入口/目录/播报/主观记录，不用客观体征或医疗建议取代；原文为生活参考。

普通/真实demo与前端demo、两家庭与关联elder的既有覆盖分开；设置关闭/主备/新事件因能力未完整暂无法运行，不造新表或测试。前后端/存储/接收边界见CAP五链，处置见DSP-R1–6和M1–6/12。
