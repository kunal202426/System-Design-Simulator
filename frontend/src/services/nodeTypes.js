import { 
  Scale, 
  Plug, 
  Database, 
  Zap, 
  Inbox, 
  Settings 
} from 'lucide-react';

export const NODE_TYPES = {
  LOAD_BALANCER: {
    id: 'load_balancer',
    label: 'Load Balancer',
    icon: 'Scale', // Store as string
    IconComponent: Scale,
    color: '#3b82f6',
    defaultConfig: {
      baseLatency: 5,
      maxCapacity: 1000,
      retryPolicy: 'none',
      failureThreshold: 0.9
    }
  },
  API_SERVICE: {
    id: 'api_service',
    label: 'API Service',
    icon: 'Plug',
    IconComponent: Plug,
    color: '#10b981',
    defaultConfig: {
      baseLatency: 50,
      maxCapacity: 500,
      retryPolicy: 'exponential',
      failureThreshold: 0.85
    }
  },
  DATABASE: {
    id: 'database',
    label: 'Database',
    icon: 'Database',
    IconComponent: Database,
    color: '#8b5cf6',
    defaultConfig: {
      baseLatency: 100,
      maxCapacity: 200,
      retryPolicy: 'linear',
      failureThreshold: 0.8
    }
  },
  CACHE: {
    id: 'cache',
    label: 'Cache',
    icon: 'Zap',
    IconComponent: Zap,
    color: '#f59e0b',
    defaultConfig: {
      baseLatency: 10,
      maxCapacity: 2000,
      retryPolicy: 'none',
      failureThreshold: 0.95
    }
  },
  MESSAGE_QUEUE: {
    id: 'message_queue',
    label: 'Message Queue',
    icon: 'Inbox',
    IconComponent: Inbox,
    color: '#ec4899',
    defaultConfig: {
      baseLatency: 20,
      maxCapacity: 1500,
      retryPolicy: 'exponential',
      failureThreshold: 0.9
    }
  },
  WORKER: {
    id: 'worker',
    label: 'Worker',
    icon: 'Settings',
    IconComponent: Settings,
    color: '#06b6d4',
    defaultConfig: {
      baseLatency: 200,
      maxCapacity: 100,
      retryPolicy: 'linear',
      failureThreshold: 0.75
    }
  }
};

// Icon lookup map
export const ICON_MAP = {
  Scale,
  Plug,
  Database,
  Zap,
  Inbox,
  Settings
};

export const getNodeTypesArray = () => {
  return Object.values(NODE_TYPES);
};

export const getIconComponent = (iconName) => {
  return ICON_MAP[iconName] || Plug; // Default to Plug if not found
};
