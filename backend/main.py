from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from typing import Dict
import json
import asyncio

from models.node import SystemGraph
from simulation.engine import SimulationEngine

app = FastAPI(title="Digital Chaos Lab API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

active_simulations: Dict[str, SimulationEngine] = {}

@app.get("/")
async def root():
    return {"message": "Digital Chaos Lab API", "status": "running"}

@app.post("/api/simulation/create")
async def create_simulation(graph: SystemGraph):
    """Create a new simulation from system graph"""
    sim_id = f"sim_{len(active_simulations)}"
    engine = SimulationEngine(graph)
    active_simulations[sim_id] = engine
    
    return {
        "simulationId": sim_id,
        "message": "Simulation created",
        "nodeCount": len(graph.nodes),
        "edgeCount": len(graph.edges)
    }

# ✅ NEW: Failure injection endpoints
@app.post("/api/simulation/{sim_id}/inject/crash")
async def inject_crash(sim_id: str, node_id: str):
    """Crash a specific node"""
    if sim_id in active_simulations:
        active_simulations[sim_id].inject_node_crash(node_id)
        return {"message": f"Node {node_id} crashed"}
    return {"error": "Simulation not found"}

@app.post("/api/simulation/{sim_id}/inject/latency")
async def inject_latency(sim_id: str, node_id: str, multiplier: float = 10.0):
    """Inject latency spike"""
    if sim_id in active_simulations:
        active_simulations[sim_id].inject_latency_spike(node_id, multiplier)
        return {"message": f"Latency spike on {node_id}: {multiplier}x"}
    return {"error": "Simulation not found"}

@app.post("/api/simulation/{sim_id}/inject/traffic")
async def inject_traffic(sim_id: str, multiplier: float = 5.0):
    """Inject traffic spike"""
    if sim_id in active_simulations:
        active_simulations[sim_id].inject_traffic_spike(multiplier)
        return {"message": f"Traffic spike: {multiplier}x"}
    return {"error": "Simulation not found"}

@app.post("/api/simulation/{sim_id}/inject/clear")
async def clear_injections(sim_id: str):
    """Clear all injections"""
    if sim_id in active_simulations:
        active_simulations[sim_id].clear_injections()
        return {"message": "All injections cleared"}
    return {"error": "Simulation not found"}

@app.websocket("/ws/simulation/{sim_id}")
async def simulation_websocket(websocket: WebSocket, sim_id: str):
    """WebSocket endpoint for real-time simulation"""
    await websocket.accept()
    print(f"🔌 WebSocket connected: {sim_id}")
    
    is_running = False
    entry_node_id = None
    traffic_load = 0
    
    try:
        while True:
            try:
                data = await asyncio.wait_for(websocket.receive_text(), timeout=0.1)
                command = json.loads(data)
                action = command.get("action")
                
                if action == "start":
                    is_running = True
                    entry_node_id = command.get("entryNodeId")
                    traffic_load = command.get("trafficLoad", 1000)
                    print(f"▶️ Simulation started: {traffic_load} req/s → {entry_node_id}")
                
                elif action == "stop":
                    is_running = False
                    print(f"⏸️ Simulation stopped: {sim_id}")
                    await websocket.send_json({"message": "Simulation stopped"})
                
                # ✅ NEW: Handle injection commands via WebSocket
                elif action == "inject_crash":
                    node_id = command.get("nodeId")
                    if sim_id in active_simulations:
                        active_simulations[sim_id].inject_node_crash(node_id)
                
                elif action == "inject_latency":
                    node_id = command.get("nodeId")
                    multiplier = command.get("multiplier", 10.0)
                    if sim_id in active_simulations:
                        active_simulations[sim_id].inject_latency_spike(node_id, multiplier)
                
                elif action == "inject_traffic":
                    multiplier = command.get("multiplier", 5.0)
                    if sim_id in active_simulations:
                        active_simulations[sim_id].inject_traffic_spike(multiplier)
                
                elif action == "clear_injections":
                    if sim_id in active_simulations:
                        active_simulations[sim_id].clear_injections()
                    
            except asyncio.TimeoutError:
                pass
            
            if is_running and sim_id in active_simulations:
                engine = active_simulations[sim_id]
                updated_graph = engine.step(traffic_load, entry_node_id)
                system_metrics = engine.get_system_metrics()
                
                response = {
                    "graph": {
                        "nodes": [node.dict() for node in updated_graph.nodes],
                        "edges": [edge.dict() for edge in updated_graph.edges]
                    },
                    "metrics": system_metrics,
                    "timestamp": asyncio.get_event_loop().time()
                }
                
                await websocket.send_json(response)
                await asyncio.sleep(0.2)
            else:
                await asyncio.sleep(0.1)
                
    except WebSocketDisconnect:
        print(f"❌ WebSocket disconnected: {sim_id}")
    except Exception as e:
        print(f"⚠️ WebSocket error: {e}")
        import traceback
        traceback.print_exc()
        await websocket.close()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, log_level="info")
