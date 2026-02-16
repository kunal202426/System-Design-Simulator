import React from 'react';
import { getNodeTypesArray } from '../services/nodeTypes';

const Sidebar = () => {
  const nodeTypes = getNodeTypesArray();

  const onDragStart = (event, nodeType) => {
    event.dataTransfer.setData('application/reactflow', JSON.stringify(nodeType));
    event.dataTransfer.effectAllowed = 'move';
  };

  return (
    <aside className="w-64 bg-gray-900 border-r border-gray-700 p-4">
      <h2 className="text-lg font-bold mb-4 text-white">Components</h2>
      <div className="space-y-2">
        {nodeTypes.map((nodeType) => (
          <div
            key={nodeType.id}
            draggable
            onDragStart={(e) => onDragStart(e, nodeType)}
            className="
              flex items-center gap-3 p-3 rounded-lg
              bg-gray-800 hover:bg-gray-700
              cursor-grab active:cursor-grabbing
              transition-colors border border-gray-700
            "
            style={{ borderLeftColor: nodeType.color, borderLeftWidth: '4px' }}
          >
            <span className="text-2xl">{nodeType.icon}</span>
            <div className="flex-1">
              <div className="font-medium text-sm text-white">{nodeType.label}</div>
              <div className="text-xs text-gray-400">
                {nodeType.defaultConfig.maxCapacity} req/s
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 p-3 bg-gray-800 rounded-lg border border-gray-700">
        <h3 className="text-sm font-semibold mb-2 text-gray-300">Instructions</h3>
        <ul className="text-xs text-gray-400 space-y-1">
          <li>• Drag components to canvas</li>
          <li>• Connect nodes by dragging from handles</li>
          <li>• Click nodes to configure</li>
        </ul>
      </div>
    </aside>
  );
};

export default Sidebar;
