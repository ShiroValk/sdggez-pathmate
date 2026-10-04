import requests
BACKEND_URL = "http://127.0.0.1:8000"

class ElderApp:
    def voice_sim(self, prompt):
        """模拟长者口述语音"""
        print(f"\n📱【长者APP语音提示】{prompt}")
        content = input("长者口述：")
        return content

    def voice_medical_booking(self):
        # 口述科室、就诊日期时段，系统检索号源，语音朗读号源列表
        dept = self.voice_sim("请口述你要预约的科室")
        date_str = self.voice_sim("口述就诊日期")
        time_str = self.voice_sim("口述就诊时段")

        # 请求后端查询号源
        resp = requests.get(f"{BACKEND_URL}/hospital/slots", params={"dept": dept})
        slot_list = resp.json()["slots"]
        print("\n📱【语音朗读号源信息】")
        for slot in slot_list:
            print(f"{slot['dept']}，{slot['date']} {slot['time']}，剩余号源：{slot['remain']}")

        # 长者语音确认完成挂号
        confirm = self.voice_sim("请确认是否预约此号源 yes/no")
        if confirm.lower() == "yes":
            order_data = {
                "dept": dept,
                "date": date_str,
                "time": time_str
            }
            requests.post(f"{BACKEND_URL}/elder/medical_order", json=order_data)
            print("\n✅挂号成功！预约记录同步至子女端（子女仅查看，不可修改）")

if __name__ == "__main__":
    app = ElderApp()
    print("===长者手机端APP启动===")
    while True:
        print("\n1.语音门诊预约")
        opt = input("请选择功能：")
        if opt == "1":
            app.voice_medical_booking()