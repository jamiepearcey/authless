// Centrifugo Debug Utility
// Enable verbose logging by running: window.__CENTRIFUGO_DEBUG = true

type LogLevel = 'info' | 'warn' | 'error' | 'debug';

export const centrifugoDebugger = {
  log: (category: string, message: string, ...args: any[]) => {
    // Map categories to appropriate log levels
    const level: LogLevel = category === 'error' ? 'error' : 
                          category === 'connection' ? 'info' : 
                          'debug';
    log(level, `[${category}] ${message}`, ...args);
  },
  
  // Legacy methods for compatibility
  info: (message: string, ...args: any[]) => log('info', message, ...args),
  warn: (message: string, ...args: any[]) => log('warn', message, ...args),
  error: (message: string, ...args: any[]) => log('error', message, ...args),
  debug: (message: string, ...args: any[]) => log('debug', message, ...args),
  
  // Methods expected by CentrifugoDebugPanel
  getLogs: () => [], // Placeholder - can be enhanced later
  clearLogs: () => {}, // Placeholder
  exportLogs: () => '[]', // Placeholder
};

function log(level: LogLevel, message: string, ...args: any[]) {
  // Always log errors and warnings
  if (level === 'error' || level === 'warn') {
    console[level](`[Centrifugo] ${message}`, ...args);
    return;
  }

  // Only log debug/info if debug mode is enabled
  if (typeof window !== 'undefined' && (window as any).__CENTRIFUGO_DEBUG) {
    console[level === 'debug' ? 'log' : level](`[Centrifugo] ${message}`, ...args);
  }
}

// Utility to enable debug logging from browser console
if (typeof window !== 'undefined') {
  (window as any).enableCentrifugoDebug = () => {
    (window as any).__CENTRIFUGO_DEBUG = true;
    console.log('[Centrifugo] Debug logging enabled. Reload page to see all logs.');
  };
  
  (window as any).disableCentrifugoDebug = () => {
    (window as any).__CENTRIFUGO_DEBUG = false;
    console.log('[Centrifugo] Debug logging disabled.');
  };
}