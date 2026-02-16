import React, { useCallback, useRef, useState, useMemo } from 'react';
import ReactFlow, {
  addEdge,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
} from 'reactflow';
import 'reactflow/dist/style.css';
import CustomNode from './CustomNode';

let nodeId = 0;
const getId = () => `node_${nodeId++}`;

const SystemCanvas = () => {
  const reactFlowWrapper = useRef(null);
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [reactFlowInstance, setReactFlowInstance] = useState(null);

  // ✅ FIX: Memoize nodeTypes to prevent recreation on every render
  const nodeTypes = useMemo(() => ({ custom: CustomNode }), []);

  // Handle connection between nodes
  const onConnect = useCallback((params) => {
    setEdges((eds) => addEdge({
      ...params,
      animated: true,
      style: { stroke: '#fff', strokeWidth: 2 }
    }, eds));
  }, [setEdges]);

  // Handle drop event when dragging node from sidebar
  const onDrop = useCallback(
    (event) => {
      event.preventDefault();

      const reactFlowBounds = reactFlowWrapper.current.getBoundingClientRect();
      const nodeData = JSON.parse(
        event.dataTransfer.getData('application/reactflow')
      );

      if (!nodeData) return;

      // Calculate position on canvas
      const position = reactFlowInstance.project({
        x: event.clientX - reactFlowBounds.left,
        y: event.clientY - reactFlowBounds.top,
      });

      // Create new node
      const newNode = {
        id: getId(),
        type: 'custom',
        position,
        data: {
          ...nodeData,
          config: { ...nodeData.defaultConfig },
          status: 'healthy'
        },
      };

      setNodes((nds) => nds.concat(newNode));
    },
    [reactFlowInstance, setNodes]
  );

  const onDragOver = useCallback((event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  return (
    <div 
      className="flex-1" 
      style={{ width: '100%', height: '100%' }}
      ref={reactFlowWrapper}
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onInit={setReactFlowInstance}
        onDrop={onDrop}
        onDragOver={onDragOver}
        nodeTypes={nodeTypes}
        fitView
        className="bg-gray-950"
      >
        <Background color="#333" gap={16} />
        <Controls className="bg-gray-800 border-gray-700" />
        <MiniMap 
          nodeColor={(node) => node.data.color}
          className="bg-gray-900 border-gray-700"
        />
      </ReactFlow>
    </div>
  );
};

export default SystemCanvas;
