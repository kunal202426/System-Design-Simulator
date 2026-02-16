class SimulationWebSocket {
  constructor() {
    this.ws = null;
    this.simulationId = null;
    this.onUpdate = null;
    this.isConnected = false;
  }

  async createSimulation(graph) {
    try {
      console.log('📡 Creating simulation with graph:', graph);
      
      const response = await fetch('http://localhost:8000/api/simulation/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(graph),
      });

      const data = await response.json();
      this.simulationId = data.simulationId;
      
      console.log('✅ Simulation created:', data);
      return data;
    } catch (error) {
      console.error('❌ Failed to create simulation:', error);
      throw error;
    }
  }

  connect(onUpdate) {
    if (!this.simulationId) {
      console.error('❌ No simulation ID. Create simulation first.');
      return;
    }

    this.onUpdate = onUpdate;
    
    const wsUrl = `ws://localhost:8000/ws/simulation/${this.simulationId}`;
    console.log('🔌 Connecting to WebSocket:', wsUrl);
    
    this.ws = new WebSocket(wsUrl);

    this.ws.onopen = () => {
      console.log('✅ WebSocket connected');
      this.isConnected = true;
    };

    this.ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      if (Math.random() < 0.1) {
        console.log('📨 Received update:', data.metrics);
      }
      
      if (this.onUpdate) {
        this.onUpdate(data);
      }
    };

    this.ws.onerror = (error) => {
      console.error('❌ WebSocket error:', error);
    };

    this.ws.onclose = () => {
      console.log('🔌 WebSocket disconnected');
      this.isConnected = false;
    };
  }

  startSimulation(entryNodeId, trafficLoad = 1000) {
    if (!this.ws || !this.isConnected) {
      console.error('❌ WebSocket not connected');
      return;
    }

    const command = {
      action: 'start',
      entryNodeId: entryNodeId,
      trafficLoad: trafficLoad,
    };

    console.log('▶️ Starting continuous simulation:', command);
    this.ws.send(JSON.stringify(command));
  }

  stopSimulation() {
    if (!this.ws || !this.isConnected) {
      return;
    }

    console.log('⏸️ Stopping simulation');
    this.ws.send(JSON.stringify({ action: 'stop' }));
  }

  // ✅ NEW: Failure injection methods
  injectCrash(nodeId) {
    if (!this.ws || !this.isConnected) return;
    console.log('💥 Injecting node crash:', nodeId);
    this.ws.send(JSON.stringify({ 
      action: 'inject_crash', 
      nodeId 
    }));
  }

  injectLatency(nodeId, multiplier) {
    if (!this.ws || !this.isConnected) return;
    console.log('🐌 Injecting latency spike:', nodeId, multiplier);
    this.ws.send(JSON.stringify({ 
      action: 'inject_latency', 
      nodeId, 
      multiplier 
    }));
  }

  injectTraffic(multiplier) {
    if (!this.ws || !this.isConnected) return;
    console.log('📈 Injecting traffic spike:', multiplier);
    this.ws.send(JSON.stringify({ 
      action: 'inject_traffic', 
      multiplier 
    }));
  }

  clearInjections() {
    if (!this.ws || !this.isConnected) return;
    console.log('🔄 Clearing all injections');
    this.ws.send(JSON.stringify({ 
      action: 'clear_injections' 
    }));
  }

  disconnect() {
    if (this.ws) {
      this.stopSimulation();
      this.ws.close();
      this.ws = null;
      this.isConnected = false;
    }
  }
}

export default new SimulationWebSocket();
