from pydantic import BaseModel, Field
from typing import Optional, Literal

class NodeConfig(BaseModel):
    """Configuration for a single node"""
    baseLatency: int = Field(..., description="Base processing latency in ms")
    maxCapacity: int = Field(..., description="Max requests per second")
    retryPolicy: Literal["none", "linear", "exponential"] = Field(..., description="Retry policy")
    failureThreshold: float = Field(..., ge=0.5, le=1.0, description="Failure threshold (0.5-1.0)")
    timeout: int = Field(..., description="Timeout in ms")

class NodeState(BaseModel):
    """Real-time state of a node during simulation"""
    id: str
    label: str
    type: str
    config: NodeConfig
    
    # Real-time metrics (updated during simulation)
    currentLoad: float = 0.0  # Current incoming requests/sec
    utilization: float = 0.0  # currentLoad / maxCapacity
    currentLatency: float = 0.0  # Calculated latency
    queueLength: int = 0  # Number of queued requests
    failureRate: float = 0.0  # 0.0 to 1.0
    status: Literal["healthy", "stressed", "failing", "down"] = "healthy"
    
    # Cumulative stats
    totalProcessed: int = 0
    totalFailed: int = 0
    totalRetries: int = 0

class EdgeState(BaseModel):
    """Connection between nodes"""
    id: str
    source: str  # source node id
    target: str  # target node id
    traffic: float = 0.0  # Current traffic flow (req/sec)

class SystemGraph(BaseModel):
    """Complete system architecture"""
    nodes: list[NodeState]
    edges: list[EdgeState]
