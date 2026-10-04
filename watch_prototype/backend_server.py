from fastapi import FastAPI
from pydantic import BaseModel
from typing import List, Dict

app = FastAPI(title="长者便民健康系统后端")

# 内存数据库（黑客松演示）
alarm_db: List[Dict] = []
order_db: List[Dict] = []
# 模拟医院号源库
hospital_slots = [
    {"dept":"内科", "date":"2026-10-05", "time":"09:00", "remain":3},
    {"dept":"内科", "date":"2026-10-05", "time":"10:30", "remain":1},
    {"dept":"内科", "date":"2026-10-06", "time":"14:00", "remain":5},
]

class WatchData(BaseModel):
    heart_rate: int
    lat: float
    lon: float
    sos_trigger: bool = False
    geofence_alarm: bool = False
    heart_alarm: bool = False

class MedicalOrder(BaseModel):
    dept: str
    date: str
    time: str
    elder_id: str = "elder_01"

# 手表上传心率、GPS、SOS数据
@app.post("/watch/upload")
async def watch_upload(data: WatchData):
    payload = data.model_dump()
    if payload["sos_trigger"] or payload["geofence_alarm"] or payload["heart_alarm"]:
        alarm_db.append(payload)
        print(f"\n⚠️后端收到告警：{payload}")
    return {"msg":"手表数据接收成功"}

# 查询门诊号源
@app.get("/hospital/slots")
async def get_slots(dept: str):
    res = [s for s in hospital_slots if s["dept"] == dept and s["remain"]>0]
    return {"slots": res}

# 长者提交挂号订单
@app.post("/elder/medical_order")
async def create_medical_order(order: MedicalOrder):
    new_order = order.model_dump()
    new_order["id"] = len(order_db)+1
    order_db.append(new_order)
    print(f"\n📝新建门诊预约：{new_order}")
    return new_order

# =========子女端接口：仅只读，不能新增/修改预约=========
@app.get("/family/alarms")
async def family_get_alarms():
    return {"alarms": alarm_db}

@app.get("/family/orders")
async def family_get_orders():
    return {"orders": order_db}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend_server:app", host="127.0.0.1", port=8000, reload=True)