import math
from typing import Dict, List, Optional
from models.node import NodeState, EdgeState, SystemGraph

class SimulationEngine:
    """
    Core simulation engine with failure injection capabilities.
    """
    
    def __init__(self, graph: SystemGraph):
        self.graph = graph
        self.node_map: Dict[str, NodeState] = {node.id: node for node in graph.nodes}
        self.incoming_edges: Dict[str, List[EdgeState]] = {}
        self.outgoing_edges: Dict[str, List[EdgeState]] = {}
        
        # Failure injection state
        self.crashed_nodes: set = set()
        self.latency_multipliers: Dict[str, float] = {}
        self.traffic_multiplier: float = 1.0
        self.partitioned_edges: set = set()
        
        for edge in graph.edges:
            if edge.target not in self.incoming_edges:
                self.incoming_edges[edge.target] = []
            self.incoming_edges[edge.target].append(edge)
            
            if edge.source not in self.outgoing_edges:
                self.outgoing_edges[edge.source] = []
            self.outgoing_edges[edge.source].append(edge)
    
    # ✅ NEW: Failure injection methods
    def inject_node_crash(self, node_id: str):
        """Crash a specific node (100% failure)"""
        self.crashed_nodes.add(node_id)
        print(f"💥 Node crashed: {node_id}")
    
    def inject_latency_spike(self, node_id: str, multiplier: float = 10.0):
        """Increase node latency by multiplier"""
        self.latency_multipliers[node_id] = multiplier
        print(f"🐌 Latency spike on {node_id}: {multiplier}x")
    
    def inject_traffic_spike(self, multiplier: float = 5.0):
        """Multiply all incoming traffic"""
        self.traffic_multiplier = multiplier
        print(f"📈 Traffic spike: {multiplier}x")
    
    def inject_network_partition(self, source_id: str, target_id: str):
        """Disconnect two nodes"""
        partition_key = f"{source_id}->{target_id}"
        self.partitioned_edges.add(partition_key)
        print(f"🔌 Network partition: {partition_key}")
    
    def clear_injections(self):
        """Clear all failure injections"""
        self.crashed_nodes.clear()
        self.latency_multipliers.clear()
        self.traffic_multiplier = 1.0
        self.partitioned_edges.clear()
        print("🔄 All injections cleared")
    
    def calculate_utilization(self, node: NodeState) -> float:
        """Calculate node utilization: ρ = λ/μ"""
        if node.config.maxCapacity == 0:
            return 1.0
        
        utilization = node.currentLoad / node.config.maxCapacity
        return min(utilization, 2.0)
    
    def calculate_latency(self, node: NodeState, utilization: float) -> float:
        """Calculate total latency with injection support"""
        base_latency = node.config.baseLatency
        
        # Apply latency injection
        if node.id in self.latency_multipliers:
            base_latency *= self.latency_multipliers[node.id]
        
        if utilization < 0.95:
            queue_delay = base_latency * (utilization / max(1 - utilization, 0.01))
            total_latency = base_latency + queue_delay
        else:
            total_latency = base_latency * (1 + math.pow(utilization, 4))
        
        return min(total_latency, node.config.timeout * 2)
    
    def calculate_failure_rate(self, node: NodeState, utilization: float, latency: float) -> float:
        """Calculate failure probability with crash injection"""
        # Node crash = 100% failure
        if node.id in self.crashed_nodes:
            return 1.0
        
        threshold = node.config.failureThreshold
        
        if utilization < threshold:
            util_failure = 0.0
        elif utilization < 1.0:
            util_failure = 0.2 * ((utilization - threshold) / (1.0 - threshold))
        elif utilization < 1.5:
            util_failure = 0.2 + 0.4 * ((utilization - 1.0) / 0.5)
        else:
            util_failure = 0.6 + 0.3 * min((utilization - 1.5) / 0.5, 1.0)
        
        timeout_failure = 0.0
        if latency >= node.config.timeout:
            timeout_failure = 0.3
        
        total_failure = min(util_failure + timeout_failure, 0.95)
        return total_failure
    
    def calculate_retry_amplification(self, node: NodeState, failure_rate: float) -> float:
        """Calculate retry storm amplification"""
        if failure_rate == 0:
            return 1.0
        
        policy = node.config.retryPolicy
        
        if policy == "none":
            return 1.0
        elif policy == "linear":
            return 1.0 + failure_rate
        elif policy == "exponential":
            return 1.0 + (3 * failure_rate)
        
        return 1.0
    
    def determine_status(self, utilization: float, failure_rate: float, node_id: str) -> str:
        """Determine node health status"""
        if node_id in self.crashed_nodes:
            return "down"
        
        if failure_rate >= 0.60 or utilization >= 1.8:
            return "down"
        elif failure_rate >= 0.30 or utilization >= 1.2:
            return "failing"
        elif utilization >= 0.80 or failure_rate >= 0.10:
            return "stressed"
        else:
            return "healthy"
    
    def calculate_queue_length(self, node: NodeState, utilization: float) -> int:
        """Estimate queue length using Little's Law"""
        if utilization < 1.0:
            avg_wait_time = (utilization / max(1 - utilization, 0.01)) * (1.0 / max(node.config.maxCapacity, 1))
            queue_length = int(node.currentLoad * avg_wait_time)
        else:
            queue_length = int(node.currentLoad * (utilization ** 2))
        
        return max(0, min(queue_length, 100000))
    
    def propagate_load(self, entry_load: float, entry_node_id: str):
        """Propagate load with failure injection support"""
        # Apply traffic multiplier
        effective_entry_load = entry_load * self.traffic_multiplier
        
        # Reset all nodes
        for node in self.graph.nodes:
            node.currentLoad = 0.0
            node.totalProcessed = 0
            node.totalFailed = 0
            node.totalRetries = 0
        
        for edge in self.graph.edges:
            edge.traffic = 0.0
        
        # BFS propagation
        processed = {}
        queue = [(entry_node_id, effective_entry_load, 0)]
        
        while queue:
            current_id, incoming_load, depth = queue.pop(0)
            
            if current_id in processed:
                processed[current_id] += incoming_load
                continue
            
            processed[current_id] = incoming_load
            current_node = self.node_map.get(current_id)
            
            if not current_node:
                continue
            
            current_node.currentLoad = incoming_load
            
            # Calculate metrics
            utilization = self.calculate_utilization(current_node)
            latency = self.calculate_latency(current_node, utilization)
            failure_rate = self.calculate_failure_rate(current_node, utilization, latency)
            retry_multiplier = self.calculate_retry_amplification(current_node, failure_rate)
            queue_length = self.calculate_queue_length(current_node, utilization)
            status = self.determine_status(utilization, failure_rate, current_node.id)
            
            # Update node state
            current_node.utilization = round(utilization, 3)
            current_node.currentLatency = round(latency, 2)
            current_node.failureRate = round(failure_rate, 3)
            current_node.queueLength = queue_length
            current_node.status = status
            
            # Calculate output
            processable_load = min(incoming_load, current_node.config.maxCapacity)
            successful_output = processable_load * (1 - failure_rate)
            failed_requests = incoming_load - successful_output
            
            current_node.totalProcessed = int(successful_output)
            current_node.totalFailed = int(failed_requests)
            current_node.totalRetries = int(failed_requests * max(retry_multiplier - 1, 0))
            
            # Propagate downstream
            if current_id in self.outgoing_edges:
                downstream_edges = self.outgoing_edges[current_id]
                
                if len(downstream_edges) > 0:
                    load_per_downstream = successful_output / len(downstream_edges)
                    amplified_load = load_per_downstream * retry_multiplier
                    
                    for edge in downstream_edges:
                        # Check for network partition
                        partition_key = f"{edge.source}->{edge.target}"
                        if partition_key in self.partitioned_edges:
                            print(f"  🚫 Partition blocked: {partition_key}")
                            continue
                        
                        edge.traffic = round(amplified_load, 2)
                        queue.append((edge.target, amplified_load, depth + 1))
    
    def step(self, entry_load: float, entry_node_id: str) -> SystemGraph:
        """Execute one simulation step"""
        self.propagate_load(entry_load, entry_node_id)
        return self.graph
    
    def get_system_metrics(self) -> dict:
        """Calculate system-wide metrics"""
        total_throughput = sum(node.totalProcessed for node in self.graph.nodes)
        total_failures = sum(node.totalFailed for node in self.graph.nodes)
        total_retries = sum(node.totalRetries for node in self.graph.nodes)
        
        avg_latency = sum(node.currentLatency for node in self.graph.nodes) / len(self.graph.nodes) if self.graph.nodes else 0
        
        error_rate = total_failures / (total_throughput + total_failures) if (total_throughput + total_failures) > 0 else 0
        
        status_counts = {"healthy": 0, "stressed": 0, "failing": 0, "down": 0}
        for node in self.graph.nodes:
            status_counts[node.status] = status_counts.get(node.status, 0) + 1
        
        total_nodes = len(self.graph.nodes)
        degraded_nodes = status_counts["failing"] + status_counts["down"]
        collapse_score = (degraded_nodes / total_nodes) if total_nodes > 0 else 0
        
        return {
            "totalThroughput": total_throughput,
            "totalFailures": total_failures,
            "totalRetries": total_retries,
            "averageLatency": round(avg_latency, 2),
            "errorRate": round(error_rate, 3),
            "collapseScore": round(collapse_score, 3),
            "statusCounts": status_counts,
            "activeInjections": {
                "crashedNodes": list(self.crashed_nodes),
                "latencySpikes": dict(self.latency_multipliers),
                "trafficMultiplier": self.traffic_multiplier,
                "partitions": list(self.partitioned_edges)
            }
        }
