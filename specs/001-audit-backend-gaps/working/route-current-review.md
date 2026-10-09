# 当前路线链路 T038

SRC-04/05仍与002最终hash一致。数据入口home/route搜索有效坐标→navDestination/navPos，行程只存目的地文字；无坐标可明确选真实候选，不自动猜地点；现有home walking/findPOI、walking返家、tripMap固定driving。

amap.planRoute:267用v3 walking/driving，解析polyline/distance/duration，舍弃文字instruction；AmpRoute只有这三项。engine.planAndDraw:1973有identity/sequence/container/map保护，旧请求迟到被丢弃；当前等待/route null不清旧覆盖物和摘要，成功才清线。catch返回null合并无路径/错误。EVD-10模拟确认FND-07/08，不能用002搜索/身份场景当路线失败通过。

未发现方式选择/transit/分段指引/无障碍要求或三类证据状态。EVD-11证明当前供应商指定香港三方式/公交换乘实返回，不证明应用集成或可达；全程已确认样本0。复用地图/搜索/坐标/缓存/折线/竞态基础，首功能另spec/plan，供应商和设施选择见DEC-09。
