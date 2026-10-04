import time
import threading
import requests

BACKEND_URL = "http://127.0.0.1:8000"

class WearOSWatch:
    def __init__(self):
        self.heart_rate = 75
        self.lat = 22.2783
        self.lon = 114.1747
        # 家属预先设置的安全地理围栏
        self.safe_zone = {"lat_min":22.27, "lat_max":22.28, "lon_min":114.17, "lon_max":114.18}

    def check_geofence(self):
        # 判断长者是否走出安全区域
        out_of_range = not (self.safe_zone["lat_min"] <= self.lat <= self.safe_zone["lat_max"]
                            and self.safe_zone["lon_min"] <= self.lon <= self.safe_zone["lon_max"])
        return out_of_range

    def check_heart_rate(self):
        # 心率过高/过低判定
        return self.heart_rate > 110 or self.heart_rate < 50

    def voice_broadcast(self, text):
        """模拟手表语音播报+震动"""
        print(f"\n⌚【手表震动+语音】：{text}")

    def heart_abnormal_flow(self):
        # PRD三步流程：
        #①手表震动+语音提醒心率偏高
        self.voice_broadcast("检测到心率偏高，请注意休息")
        #②主动询问是否查询内科号源
        self.voice_broadcast("是否需要帮你查询内科门诊号源？")
        user_confirm = input("长者语音回答（yes / no）：")
        if user_confirm.lower() == "yes":
            print("👉 发起门诊号源查询，跳转长者APP语音预约流程")

    def send_watch_data(self, sos=False):
        payload = {
            "heart_rate": self.heart_rate,
            "lat": self.lat,
            "lon": self.lon,
            "sos_trigger": sos,
            "geofence_alarm": self.check_geofence(),
            "heart_alarm": self.check_heart_rate()
        }
        try:
            requests.post(f"{BACKEND_URL}/watch/upload", json=payload)
        except Exception as e:
            print("手表数据上传失败", e)

    def sos_button_pressed(self):
        # 实体SOS按键：长按侧边按键触发
        print("\n🚨【手表实体SOS按键触发】")
        self.voice_broadcast("紧急告警已发送家属！")
        self.send_watch_data(sos=True)

    def watch_main_loop(self):
        print("=== Wear OS手表模拟器启动 ===")
        while True:
            self.send_watch_data()
            # 心率异常触发完整交互流程
            if self.check_heart_rate():
                self.heart_abnormal_flow()
            time.sleep(5)

if __name__ == "__main__":
    watch = WearOSWatch()
    # 独立线程监听SOS按键输入
    def listen_sos():
        while True:
            input("\n按回车模拟长按手表侧边SOS按键 >>> ")
            watch.sos_button_pressed()
    threading.Thread(target=listen_sos, daemon=True).start()
    watch.watch_main_loop()