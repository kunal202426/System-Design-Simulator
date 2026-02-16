import React, { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import ReactFlow, {
  ReactFlowProvider,
  addEdge,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { Box, Trash2, Eraser } from 'lucide-react';
import CustomNode from './components/CustomNode';
import ConfigPanel from './components/ConfigPanel';
import MetricsDashboard from './components/MetricsDashboard';
import SimulationControls from './components/SimulationControls';
import FailureInjection from './components/FailureInjection';
import { getNodeTypesArray } from './services/nodeTypes';
import simulationWS from './services/websocket';

let nodeId = 0;
const getId = () => `node_${nodeId++}`;

// Sidebar Component
const Sidebar = () => {
  const nodeTypes = getNodeTypesArray();

  const onDragStart = (event, nodeType) => {
    console.log('Drag started:', nodeType.label);
    event.dataTransfer.setData('application/reactflow', JSON.stringify(nodeType));
    event.dataTransfer.effectAllowed = 'move';
  };

  return (
    <aside style={{
      width: '280px',
      backgroundColor: '#111827',
      borderRight: '1px solid #374151',
      padding: '20px',
      overflowY: 'auto'
    }}>
      <div style={{ marginBottom: '20px' }}>
        <h2 style={{ 
          fontSize: '16px', 
          fontWeight: '700', 
          marginBottom: '4px',
          color: '#fff',
          letterSpacing: '0.5px',
          textTransform: 'uppercase'
        }}>
          Components
        </h2>
        <p style={{ fontSize: '12px', color: '#6b7280', margin: 0 }}>
          Drag to canvas to build system
        </p>
      </div>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {nodeTypes.map((nodeType) => {
          const IconComponent = nodeType.IconComponent;
          
          return (
            <div
              key={nodeType.id}
              draggable
              onDragStart={(e) => onDragStart(e, nodeType)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '12px 14px',
                borderRadius: '8px',
                backgroundColor: '#1f2937',
                border: '1px solid #374151',
                borderLeft: `3px solid ${nodeType.color}`,
                cursor: 'grab',
                transition: 'all 0.2s',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                userSelect: 'none'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#374151';
                e.currentTarget.style.transform = 'translateX(4px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#1f2937';
                e.currentTarget.style.transform = 'translateX(0)';
              }}
            >
              <div style={{
                padding: '8px',
                borderRadius: '6px',
                backgroundColor: `${nodeType.color}20`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                pointerEvents: 'none'
              }}>
                {IconComponent && <IconComponent size={18} color={nodeType.color} strokeWidth={2.5} />}
              </div>
              <div style={{ flex: 1, pointerEvents: 'none' }}>
                <div style={{ fontWeight: '600', fontSize: '13px', color: '#fff', letterSpacing: '0.3px' }}>
                  {nodeType.label}
                </div>
                <div style={{ fontSize: '11px', color: '#6b7280', fontFamily: 'monospace' }}>
                  {nodeType.defaultConfig.maxCapacity} req/s
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div style={{
        marginTop: '24px',
        padding: '14px',
        backgroundColor: '#1f2937',
        borderRadius: '8px',
        border: '1px solid #374151'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
          <Box size={16} color="#9ca3af" />
          <h3 style={{ 
            fontSize: '13px', 
            fontWeight: '600', 
            margin: 0,
            color: '#d1d5db',
            textTransform: 'uppercase',
            letterSpacing: '0.5px'
          }}>
            Instructions
          </h3>
        </div>
        <ul style={{ 
          fontSize: '11px', 
          color: '#9ca3af', 
          listStyle: 'none', 
          padding: 0, 
          margin: 0,
          lineHeight: '1.8'
        }}>
          <li style={{ marginBottom: '4px' }}>• Drag components to canvas</li>
          <li style={{ marginBottom: '4px' }}>• Connect by dragging handles</li>
          <li style={{ marginBottom: '4px' }}>• Click node to configure</li>
          <li style={{ marginBottom: '4px' }}>• Select entry & traffic volume</li>
          <li>• Start to run simulation</li>
        </ul>
      </div>
    </aside>
  );
};

// Canvas Component
const Canvas = () => {
  const reactFlowWrapper = useRef(null);
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [reactFlowInstance, setReactFlowInstance] = useState(null);
  const [selectedNodes, setSelectedNodes] = useState([]);
  const [selectedNode, setSelectedNode] = useState(null);
  const [isSimulationRunning, setIsSimulationRunning] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [metrics, setMetrics] = useState(null);
  const [isInitializing, setIsInitializing] = useState(false);

  const nodeTypes = useMemo(() => ({ custom: CustomNode }), []);

  const onConnect = useCallback(
    (params) => {
      console.log('Connected:', params);
      setEdges((eds) => addEdge({ ...params, animated: true }, eds));
    },
    [setEdges]
  );

  const onDragOver = useCallback((event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

const onDrop = useCallback(
  (event) => {
    event.preventDefault();

    if (!reactFlowInstance) return;

    const nodeData = JSON.parse(event.dataTransfer.getData('application/reactflow'));
    if (!nodeData) return;

    const position = reactFlowInstance.screenToFlowPosition({
      x: event.clientX,
      y: event.clientY,
    });

    // Create new node with only serializable data
    const newNode = {
      id: getId(),
      type: 'custom',
      position,
      data: {
        id: nodeData.id,
        label: nodeData.label,
        icon: nodeData.icon, // Store icon name, not component
        color: nodeData.color,
        config: { 
          ...nodeData.defaultConfig,
          timeout: 5000
        },
        status: 'healthy',
      },
    };

    setNodes((nds) => nds.concat(newNode));
  },
  [reactFlowInstance, setNodes]
);


  const onSelectionChange = useCallback(({ nodes }) => {
    setSelectedNodes(nodes);
  }, []);

  const onNodeClick = useCallback((event, node) => {
    setSelectedNode(node);
  }, []);

  const onDeleteSelected = useCallback(() => {
    if (selectedNodes.length === 0) return;

    const nodeIds = selectedNodes.map(n => n.id);
    setNodes((nds) => nds.filter((node) => !nodeIds.includes(node.id)));
    setEdges((eds) => eds.filter((edge) => 
      !nodeIds.includes(edge.source) && !nodeIds.includes(edge.target)
    ));
    
    setSelectedNodes([]);
    setSelectedNode(null);
  }, [selectedNodes, setNodes, setEdges]);

  const onKeyDown = useCallback(
    (event) => {
      const isTyping = ['INPUT', 'TEXTAREA', 'SELECT'].includes(event.target.tagName);
      
      if (isTyping) {
        return;
      }

      if (event.key === 'Delete' || event.key === 'Backspace') {
        onDeleteSelected();
      }
      if (event.key === 'Escape') {
        setSelectedNode(null);
      }
    },
    [onDeleteSelected]
  );

  const onClearAll = useCallback(() => {
    if (nodes.length === 0) return;
    
    if (window.confirm('Delete all nodes? This cannot be undone.')) {
      if (isSimulationRunning) {
        simulationWS.stopSimulation();
        simulationWS.disconnect();
      }
      
      setNodes([]);
      setEdges([]);
      setSelectedNodes([]);
      setSelectedNode(null);
      setMetrics(null);
      setIsSimulationRunning(false);
      setIsConnected(false);
      
      console.log('System cleared');
    }
  }, [nodes.length, isSimulationRunning, setNodes, setEdges]);

  const onUpdateNodeConfig = useCallback((nodeId, newConfig) => {
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === nodeId) {
          return {
            ...node,
            data: {
              ...node.data,
              config: newConfig,
            },
          };
        }
        return node;
      })
    );
    
    const updatedNode = nodes.find(n => n.id === nodeId);
    if (updatedNode) {
      setSelectedNode({
        ...updatedNode,
        data: {
          ...updatedNode.data,
          config: newConfig
        }
      });
    }
  }, [nodes, setNodes]);

  const convertGraphToBackendFormat = useCallback(() => {
    const backendNodes = nodes.map(node => ({
      id: node.id,
      label: node.data.label,
      type: node.data.id,
      config: node.data.config,
      currentLoad: 0,
      utilization: 0,
      currentLatency: 0,
      queueLength: 0,
      failureRate: 0,
      status: 'healthy',
      totalProcessed: 0,
      totalFailed: 0,
      totalRetries: 0
    }));

    const backendEdges = edges.map(edge => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      traffic: 0
    }));

    return {
      nodes: backendNodes,
      edges: backendEdges
    };
  }, [nodes, edges]);

  const handleStartSimulation = useCallback(async (entryNodeId, trafficLoad) => {
    if (nodes.length === 0) {
      alert('Please add nodes to the canvas first');
      return;
    }

    setIsInitializing(true);

    try {
      const graph = convertGraphToBackendFormat();
      await simulationWS.createSimulation(graph);
      console.log('Simulation created');
      
      simulationWS.connect((data) => {
        if (data.graph && data.metrics) {
          setNodes((nds) =>
            nds.map((node) => {
              const backendNode = data.graph.nodes.find(n => n.id === node.id);
              if (backendNode) {
                return {
                  ...node,
                  data: {
                    ...node.data,
                    status: backendNode.status,
                    currentLoad: backendNode.currentLoad,
                    utilization: backendNode.utilization,
                    currentLatency: backendNode.currentLatency
                  }
                };
              }
              return node;
            })
          );

          setEdges((eds) =>
            eds.map((edge) => {
              const backendEdge = data.graph.edges.find(e => e.id === edge.id);
              if (backendEdge && backendEdge.traffic > 0) {
                return {
                  ...edge,
                  animated: true,
                  style: {
                    ...edge.style,
                    strokeWidth: Math.max(2, Math.min(8, backendEdge.traffic / 100))
                  }
                };
              }
              return edge;
            })
          );

          setMetrics(data.metrics);
        }
      });

      await new Promise((resolve) => setTimeout(resolve, 500));
      
      setIsConnected(true);
      console.log('WebSocket connected');

      simulationWS.startSimulation(entryNodeId, trafficLoad);
      setIsSimulationRunning(true);
      console.log('Simulation started with traffic:', trafficLoad);

    } catch (error) {
      console.error('Failed to start simulation:', error);
      alert('Failed to start simulation: ' + error.message);
    } finally {
      setIsInitializing(false);
    }
  }, [nodes, edges, convertGraphToBackendFormat, setNodes, setEdges]);

  const handleStopSimulation = useCallback(() => {
    simulationWS.stopSimulation();
    setIsSimulationRunning(false);
    setMetrics(null);
    setIsConnected(false);
    simulationWS.disconnect();
    
    setNodes((nds) =>
      nds.map((node) => ({
        ...node,
        data: {
          ...node.data,
          status: 'healthy',
          currentLoad: 0,
          utilization: 0,
          currentLatency: 0
        }
      }))
    );
    
    setEdges((eds) =>
      eds.map((edge) => ({
        ...edge,
        animated: false,
        style: {
          stroke: '#fff',
          strokeWidth: 2
        }
      }))
    );
    
    console.log('Simulation stopped and reset');
  }, [setNodes, setEdges]);

  // Failure injection handler
  const handleFailureInjection = useCallback((type, params) => {
    switch(type) {
      case 'crash':
        simulationWS.injectCrash(params.nodeId);
        break;
      case 'latency':
        simulationWS.injectLatency(params.nodeId, params.multiplier);
        break;
      case 'traffic':
        simulationWS.injectTraffic(params.multiplier);
        break;
      case 'clear':
        simulationWS.clearInjections();
        break;
      default:
        break;
    }
  }, []);

  useEffect(() => {
    return () => {
      simulationWS.disconnect();
    };
  }, []);

  return (
    <div 
      ref={reactFlowWrapper} 
      style={{ width: '100%', height: '100%', position: 'relative' }}
      onKeyDown={onKeyDown}
      tabIndex={0}
    >
      <SimulationControls
        nodes={nodes}
        onStart={handleStartSimulation}
        onStop={handleStopSimulation}
        isRunning={isSimulationRunning}
        isConnected={isConnected}
        isInitializing={isInitializing}
      />

      <MetricsDashboard metrics={metrics} isRunning={isSimulationRunning} />

      <FailureInjection 
        nodes={nodes}
        isRunning={isSimulationRunning}
        onInject={handleFailureInjection}
        activeInjections={metrics?.activeInjections}
      />

      <div style={{
        position: 'absolute',
        top: '16px',
        right: selectedNode ? '336px' : '16px',
        zIndex: 5,
        display: 'flex',
        gap: '8px',
        transition: 'right 0.3s ease'
      }}>
        <button
          onClick={onDeleteSelected}
          disabled={selectedNodes.length === 0}
          style={{
            padding: '10px 16px',
            backgroundColor: selectedNodes.length > 0 ? '#ef4444' : '#374151',
            color: '#fff',
            border: 'none',
            borderRadius: '8px',
            cursor: selectedNodes.length > 0 ? 'pointer' : 'not-allowed',
            fontSize: '13px',
            fontWeight: '600',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: selectedNodes.length > 0 ? '0 2px 8px rgba(239, 68, 68, 0.3)' : 'none',
            transition: 'all 0.2s'
          }}
        >
          <Trash2 size={16} />
          <span>Delete ({selectedNodes.length})</span>
        </button>

        <button
          onClick={onClearAll}
          disabled={nodes.length === 0}
          style={{
            padding: '10px 16px',
            backgroundColor: nodes.length > 0 ? '#dc2626' : '#374151',
            color: '#fff',
            border: 'none',
            borderRadius: '8px',
            cursor: nodes.length > 0 ? 'pointer' : 'not-allowed',
            fontSize: '13px',
            fontWeight: '600',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: nodes.length > 0 ? '0 2px 8px rgba(220, 38, 38, 0.3)' : 'none',
            transition: 'all 0.2s'
          }}
        >
          <Eraser size={16} />
          <span>Clear All</span>
        </button>
      </div>

      {nodes.length > 0 && (
        <div style={{
          position: 'absolute',
          bottom: '16px',
          right: selectedNode ? '336px' : '16px',
          zIndex: 5,
          padding: '8px 14px',
          backgroundColor: '#1f2937',
          border: '1px solid #374151',
          borderRadius: '8px',
          fontSize: '11px',
          color: '#9ca3af',
          transition: 'right 0.3s ease',
          fontFamily: 'monospace',
          fontWeight: '600'
        }}>
          Nodes: {nodes.length} | Edges: {edges.length}
        </div>
      )}

      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onInit={setReactFlowInstance}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onSelectionChange={onSelectionChange}
        onNodeClick={onNodeClick}
        nodeTypes={nodeTypes}
        fitView
        deleteKeyCode={['Delete', 'Backspace']}
      >
        <Background color="#333" gap={16} />
        <Controls />
        <MiniMap 
          nodeColor={(node) => {
            const statusColors = {
              healthy: '#10b981',
              stressed: '#f59e0b',
              failing: '#ef4444',
              down: '#6b7280'
            };
            return statusColors[node.data?.status] || '#3b82f6';
          }}
          maskColor="rgba(0, 0, 0, 0.6)"
        />
      </ReactFlow>

      {selectedNode && (
        <ConfigPanel
          node={selectedNode}
          onClose={() => setSelectedNode(null)}
          onUpdate={onUpdateNodeConfig}
        />
      )}
    </div>
  );
};

// Main App
function App() {
  return (
    <ReactFlowProvider>
      <div style={{ 
        display: 'flex',
        height: '100vh',
        width: '100vw',
        overflow: 'hidden',
        backgroundColor: '#0a0a0a'
      }}>
        <Sidebar />
        
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <header style={{
            backgroundColor: '#111827',
            borderBottom: '1px solid #374151',
            padding: '18px 24px'
          }}>
            <h1 style={{ 
              fontSize: '22px', 
              fontWeight: '700', 
              color: '#fff', 
              margin: 0,
              letterSpacing: '0.5px'
            }}>
              Digital Chaos Lab
            </h1>
            <p style={{ 
              fontSize: '13px', 
              color: '#9ca3af', 
              margin: '4px 0 0 0',
              letterSpacing: '0.3px'
            }}>
              Real-Time Distributed System Failure Propagation Simulator
            </p>
          </header>
          
          <div style={{ flex: 1, position: 'relative' }}>
            <Canvas />
          </div>
        </div>
      </div>
    </ReactFlowProvider>
  );
}

export default App;
