# A virtual Lab for testing system design 

Real-time distributed system failure propagation simulator with chaos injection.

## Features

- Interactive drag-and-drop system builder
- Real-time simulation with WebSocket
- Chaos injection (crashes, latency spikes, traffic surges)
- Queue theory-based calculations
- Live metrics dashboard

## Quick Start

### Backend
```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload
