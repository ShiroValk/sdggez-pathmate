# Elderly Care Watch System | 长者健康便民系统
## Core Features (Match PRD)
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

## Run Instructions
### 1. Install dependencies
```bash
pip install fastapi uvicorn requests
2. Open 4 separate terminals
Terminal 1: Start backend
bash
python backend_server.py
Terminal 2: Start Wear OS watch simulator
bash
python watch_simulator.py
Terminal 3: Start elder mobile app
bash
python elder_app.py
Terminal 4: Start family mobile app
bash
python family_app.py
Notes
This is a hackathon demo prototype for code submission & demo presentation.
Real Wear OS product uses Kotlin. Voice recognition is simulated.
Family account has read-only permission for all elder orders.