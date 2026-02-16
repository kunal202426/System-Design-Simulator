# Digital Chaos Lab - Architecture

## System Components

### 1. Frontend (React + React Flow)
- Graph editor for building distributed systems
- Real-time metrics dashboard
- Canvas-based animation layer
- WebSocket client for live updates

### 2. Backend (FastAPI + Python)
- Simulation engine with queue theory models
- WebSocket server for real-time streaming
- Graph state management
- Failure injection controller

### 3. Core Simulation Logic
Based on M/M/1 queue theory and cascading failure models.

#### Key Equations:
- Utilization: ρ = λ/μ (arrival rate / service rate)
- Queue delay: W_q = ρ/(μ(1-ρ))
- Total latency: L = BaseLatency + W_q
- Failure probability: P_fail = max(0, (ρ - 0.7)/0.3)
