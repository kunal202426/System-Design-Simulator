/**
 * Environment Configuration
 * Centralizes environment variable handling for the application
 */

// Get API base URL from environment or fallback to localhost
const getApiBase = () => {
  const url = import.meta.env.VITE_API_URL || 'http://localhost:8000';
  return url.replace(/\/$/, ''); // Remove trailing slash if present
};

// Get WebSocket base URL from environment or fallback to localhost
const getWsBase = () => {
  let url = import.meta.env.VITE_WS_URL;
  
  // If not set, derive from API URL
  if (!url) {
    url = getApiBase()
      .replace('https://', 'wss://')
      .replace('http://', 'ws://');
  }
  
  return url.replace(/\/$/, ''); // Remove trailing slash if present
};

export const API_BASE = getApiBase();
export const WS_BASE = getWsBase();

// Log configuration in development
if (import.meta.env.DEV) {
  console.log('🔧 Environment Configuration:');
  console.log('  API_BASE:', API_BASE);
  console.log('  WS_BASE:', WS_BASE);
}
