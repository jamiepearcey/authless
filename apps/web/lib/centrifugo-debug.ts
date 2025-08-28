// Debug utility for monitoring Centrifugo messages
export class CentrifugoDebugger {
  private static instance: CentrifugoDebugger;
  private logs: Array<{
    timestamp: string;
    type: 'connection' | 'subscription' | 'message' | 'error';
    channel?: string;
    data?: any;
    details?: string;
  }> = [];

  static getInstance(): CentrifugoDebugger {
    if (!CentrifugoDebugger.instance) {
      CentrifugoDebugger.instance = new CentrifugoDebugger();
    }
    return CentrifugoDebugger.instance;
  }

  log(type: 'connection' | 'subscription' | 'message' | 'error', details: string, data?: any, channel?: string) {
    const entry = {
      timestamp: new Date().toISOString(),
      type,
      channel,
      data: data ? JSON.parse(JSON.stringify(data)) : undefined,
      details,
    };
    
    this.logs.push(entry);
    
    // Keep only last 100 logs
    if (this.logs.length > 100) {
      this.logs = this.logs.slice(-100);
    }

    // Console log with colors
    const colors = {
      connection: '🔗',
      subscription: '📡',
      message: '📨',
      error: '❌'
    };
    
    console.log(
      `${colors[type]} [${entry.timestamp}] ${details}`,
      channel ? `(${channel})` : '',
      data ? data : ''
    );
  }

  getLogs() {
    return [...this.logs];
  }

  clearLogs() {
    this.logs = [];
  }

  getLogsByType(type: 'connection' | 'subscription' | 'message' | 'error') {
    return this.logs.filter(log => log.type === type);
  }

  getLogsByChannel(channel: string) {
    return this.logs.filter(log => log.channel === channel);
  }

  exportLogs() {
    return JSON.stringify(this.logs, null, 2);
  }
}

export const centrifugoDebugger = CentrifugoDebugger.getInstance();
