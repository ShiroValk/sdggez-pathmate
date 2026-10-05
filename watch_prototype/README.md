# Elderly Care Watch System | 长者健康便民系统
该目录为独立的 Python 黑客松演示原型，包含手表模拟器、演示后端，以及命令行长者端和家属端。不是原生 Wear OS 工程，未与 `../existing_app/` 主应用后端对接。以下为演示设计的功能范围，不代表真实硬件、推送或语音识别已完成。

## Core Features / 演示设计范围
- Continuous GPS collection on smartwatch; automatic alert pushed to family members once the elder leaves the geofence safe zone
- Continuous heart rate monitoring:
  - Watch vibration + voice reminder when abnormal heart rate detected
  - System prompts to check internal medicine appointment slots
  - Appointment process starts only after voice confirmation from the elder
- Auto early warning sent to family app when heart rate stays abnormal
- Physical SOS button: long press to sync location and heart rate data to family app
- Shared alert backend for both watch SOS and mobile SOS
- Elder can state department, date and time slot via voice; system reads available appointments aloud
- Elder confirms by voice to finish booking
- Appointment records synchronised to family side. Family members can only view, cannot edit or cancel.

## Run Instructions / 运行说明

### 1. 安装依赖

安装 Python 后，从仓库根目录进入此项目：

```sh
cd watch_prototype
python -m pip install -r requirements.txt
```

也可以使用自己的 Python 虚拟环境。

### 2. 分别启动四个终端

四个终端都应以 `watch_prototype/` 为工作目录，使用已安装依赖的 Python 环境。先启动后端，再启动其他脚本。

终端 1：演示后端

```sh
python backend_server.py
```

终端 2：手表模拟器

```sh
python watch_simulator.py
```

终端 3：长者端演示

```sh
python elder_app.py
```

终端 4：家属端演示

```sh
python family_app.py
```

后端地址为 `http://127.0.0.1:8000`，接口文档可在 `http://127.0.0.1:8000/docs` 查看。按 Ctrl+C 停止各终端。

## Notes / 演示边界

- GPS 和心率使用模拟数值，语音和 SOS 使用终端输入、输出模拟。
- 告警与预约保存在后端内存中，重启后丢失；医院号源为固定演示数据。
- 家属端通过菜单查询告警和预约，并未实现真实手机推送。
- 家属端演示仅提供查看操作；后端尚未实现账号认证与权限校验。
- `checklist.md` 保留原团队的功能核对记录，不作为真实功能验证结果。
- 原生 Wear OS 应用需要另行实现。本目录的演示后端与主应用独立运行。
