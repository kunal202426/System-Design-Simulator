# System Design Simulator

A distributed systems simulation platform designed to model service interactions, inject failures and observe cascading behavior in real time.

The project focuses on understanding how modern microservice-based systems behave under load, failure and changing traffic conditions.

---

## Overview

The simulator combines a FastAPI backend with a React-based visualization layer to create an interactive environment for experimenting with distributed system concepts.

It supports:
- live service monitoring
- dependency visualization
- anomaly detection
- simulated cascading failures
- alerting workflows

Instead of being a production observability platform, the goal is to provide a controllable environment for learning and experimentation.

---

## System Architecture

### Frontend Layer
Responsible for:
- graph visualization
- real-time node updates
- displaying alerts and metrics
- interaction with simulation controls

The frontend uses ReactFlow to represent services and dependencies as a dynamic graph.

---

### Backend Layer
Handles:
- simulation logic
- metric aggregation
- API polling
- event processing
- WebSocket streaming

FastAPI and asynchronous processing are used to support real-time updates.

---

### Detection & Analysis Layer
Includes:
- anomaly detection using statistical thresholds
- breach prediction logic
- cascading failure tracking
- alert generation and cooldown management

The intent is to mimic patterns seen in large distributed systems.

---

### Data & Cache Layer
Redis is used for:
- temporary state management
- deduplication
- alert coordination

---

## Core Features

### Real-Time Simulation
- service graph updates
- traffic/load visualization
- dependency monitoring

### Failure Injection
- simulate unhealthy services
- observe propagation effects
- analyze bottlenecks

### Monitoring & Alerts
- anomaly detection
- threshold breaches
- Slack/webhook notifications

### Visualization
- node graph representation
- sparkline metrics
- live updates through WebSockets

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Backend | Python, FastAPI, aiohttp, WebSockets |
| Frontend | React, ReactFlow, TypeScript |
| Cache | Redis |
| Deployment | Docker Compose |
| Alerting | Slack Webhooks |

---

## Running Locally

### Backend
```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

### Docker
```bash
docker-compose up --build
```

---

## Simulation Flow

1. Services are loaded from configuration
2. Dependencies are mapped into a graph
3. Metrics are streamed and updated
4. Detection systems analyze behavior
5. Alerts are generated if thresholds are breached
6. Frontend visualizes changes in real time

---

## Design Goals

The project was designed to explore:
- distributed systems behavior
- observability patterns
- service dependency modeling
- real-time visualization pipelines
- fault propagation

---

## Limitations

- simulation accuracy is simplified
- not intended for production monitoring
- large-scale graphs may require optimization

---

## Future Improvements

- distributed event simulation
- advanced fault injection strategies
- ML-assisted anomaly prediction
- historical replay and timeline analysis
- multi-region simulation support

---

## License

MIT © Kunal Mathur
