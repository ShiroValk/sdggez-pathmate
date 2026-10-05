import requests
BACKEND_URL = "http://127.0.0.1:8000"

class FamilyApp:
    def show_alerts(self):
        res = requests.get(f"{BACKEND_URL}/family/alarms")
        alarms = res.json()["alarms"]
        if len(alarms) > 0:
            print("\n🚨子女APP收到手表告警消息！")
            for item in alarms:
                print(item)
        else:
            print("\n✅暂无告警")

    def show_medical_orders(self):
        # 子女只有查看权限，不能修改/删除预约
        res = requests.get(f"{BACKEND_URL}/family/orders")
        orders = res.json()["orders"]
        print("\n📋长者门诊预约记录（只读权限）")
        for o in orders:
            print(o)

if __name__ == "__main__":
    family = FamilyApp()
    print("===子女端APP启动===")
    while True:
        print("\n1.查看告警 2.查看预约记录")
        choice = input("选择：")
        if choice == "1":
            family.show_alerts()
        elif choice == "2":
            family.show_medical_orders()