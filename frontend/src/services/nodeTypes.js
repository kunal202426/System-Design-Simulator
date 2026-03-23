import {
  Scale,
  Plug,
  Database,
  Zap,
  Inbox,
  Settings,
  Globe,
  ShieldCheck,
  ExternalLink,
  Eye,
  ArrowUpDown,
  ShieldOff,
  Network,
  FileText,
  HardDrive,
  BellRing
} from 'lucide-react';

export const NODE_TYPES = {
  LOAD_BALANCER: {
    id: 'load_balancer',
    label: 'Load Balancer',
    icon: 'Scale',
    IconComponent: Scale,
    color: '#3b82f6',
    defaultConfig: {
      baseLatency: 5,
      maxCapacity: 1000,
      retryPolicy: 'none',
      failureThreshold: 0.9,
      timeout: 5000
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
      failureThreshold: 0.85,
      timeout: 5000
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
      failureThreshold: 0.8,
      timeout: 5000
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
      failureThreshold: 0.95,
      timeout: 2000
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
      failureThreshold: 0.9,
      timeout: 5000
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
      failureThreshold: 0.75,
      timeout: 10000
    }
  },
  CDN: {
    id: 'cdn',
    label: 'CDN',
    icon: 'Globe',
    IconComponent: Globe,
    color: '#0ea5e9',
    defaultConfig: {
      baseLatency: 3,
      maxCapacity: 5000,
      retryPolicy: 'none',
      failureThreshold: 0.95,
      timeout: 3000
    }
  },
  RATE_LIMITER: {
    id: 'rate_limiter',
    label: 'Rate Limiter',
    icon: 'ShieldCheck',
    IconComponent: ShieldCheck,
    color: '#84cc16',
    defaultConfig: {
      baseLatency: 2,
      maxCapacity: 3000,
      retryPolicy: 'none',
      failureThreshold: 0.99,
      timeout: 1000
    }
  },
  EXTERNAL_API: {
    id: 'external_api',
    label: 'External API',
    icon: 'ExternalLink',
    IconComponent: ExternalLink,
    color: '#f97316',
    defaultConfig: {
      baseLatency: 200,
      maxCapacity: 300,
      retryPolicy: 'exponential',
      failureThreshold: 0.7,
      timeout: 10000
    }
  },
  MONITORING_AGENT: {
    id: 'monitoring_agent',
    label: 'Monitor Agent',
    icon: 'Eye',
    IconComponent: Eye,
    color: '#a78bfa',
    defaultConfig: {
      baseLatency: 10,
      maxCapacity: 1000,
      retryPolicy: 'linear',
      failureThreshold: 0.9,
      timeout: 5000
    }
  },
  AUTOSCALER: {
    id: 'autoscaler',
    label: 'Autoscaler',
    icon: 'ArrowUpDown',
    IconComponent: ArrowUpDown,
    color: '#34d399',
    defaultConfig: {
      baseLatency: 5,
      maxCapacity: 2000,
      retryPolicy: 'none',
      failureThreshold: 0.9,
      timeout: 5000
    }
  },
  CIRCUIT_BREAKER: {
    id: 'circuit_breaker',
    label: 'Circuit Breaker',
    icon: 'ShieldOff',
    IconComponent: ShieldOff,
    color: '#fb923c',
    defaultConfig: {
      baseLatency: 1,
      maxCapacity: 4000,
      retryPolicy: 'none',
      failureThreshold: 0.5,
      timeout: 2000
    }
  },
  SERVICE_MESH: {
    id: 'service_mesh',
    label: 'Service Mesh',
    icon: 'Network',
    IconComponent: Network,
    color: '#22d3ee',
    defaultConfig: {
      baseLatency: 8,
      maxCapacity: 2000,
      retryPolicy: 'exponential',
      failureThreshold: 0.9,
      timeout: 5000
    }
  },
  LOG_AGGREGATOR: {
    id: 'log_aggregator',
    label: 'Log Aggregator',
    icon: 'FileText',
    IconComponent: FileText,
    color: '#94a3b8',
    defaultConfig: {
      baseLatency: 30,
      maxCapacity: 800,
      retryPolicy: 'linear',
      failureThreshold: 0.8,
      timeout: 5000
    }
  },
  BACKUP_STORAGE: {
    id: 'backup_storage',
    label: 'Backup Storage',
    icon: 'HardDrive',
    IconComponent: HardDrive,
    color: '#d97706',
    defaultConfig: {
      baseLatency: 500,
      maxCapacity: 150,
      retryPolicy: 'linear',
      failureThreshold: 0.75,
      timeout: 30000
    }
  },
  ALERT_MANAGER: {
    id: 'alert_manager',
    label: 'Alert Manager',
    icon: 'BellRing',
    IconComponent: BellRing,
    color: '#f43f5e',
    defaultConfig: {
      baseLatency: 15,
      maxCapacity: 1000,
      retryPolicy: 'exponential',
      failureThreshold: 0.95,
      timeout: 5000
    }
  },
};

export const ICON_MAP = {
  Scale,
  Plug,
  Database,
  Zap,
  Inbox,
  Settings,
  Globe,
  ShieldCheck,
  ExternalLink,
  Eye,
  ArrowUpDown,
  ShieldOff,
  Network,
  FileText,
  HardDrive,
  BellRing
};

export const getNodeTypesArray = () => {
  return Object.values(NODE_TYPES);
};

export const getIconComponent = (iconName) => {
  return ICON_MAP[iconName] || Plug;
};

/** Return the display label for a node type id string. */
export const getNodeTypeLabel = (typeId) => {
  const entry = Object.values(NODE_TYPES).find(t => t.id === typeId);
  return entry ? entry.label : typeId;
};

/** Return the color hex for a node type id string. */
export const getNodeTypeColor = (typeId) => {
  const entry = Object.values(NODE_TYPES).find(t => t.id === typeId);
  return entry ? entry.color : '#6b7280';
};
