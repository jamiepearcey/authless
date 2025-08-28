"use client";

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@ui/base";
import { Button } from "@ui/base";
import { Badge } from "@ui/base";
import { centrifugoDebugger } from '@/lib/centrifugo-debug';

export function CentrifugoDebugPanel() {
  const [logs, setLogs] = useState(centrifugoDebugger.getLogs());
  const [isAutoRefresh, setIsAutoRefresh] = useState(true);
  const [filter, setFilter] = useState<'all' | 'connection' | 'subscription' | 'message' | 'error'>('all');

  const refreshLogs = useCallback(() => {
    setLogs(centrifugoDebugger.getLogs());
  }, []);

  const clearLogs = useCallback(() => {
    centrifugoDebugger.clearLogs();
    setLogs([]);
  }, []);

  const exportLogs = useCallback(() => {
    const data = centrifugoDebugger.exportLogs();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `centrifugo-logs-${new Date().toISOString()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  // Auto-refresh logs
  useEffect(() => {
    if (!isAutoRefresh) return;
    
    const interval = setInterval(refreshLogs, 1000);
    return () => clearInterval(interval);
  }, [isAutoRefresh, refreshLogs]);

  const filteredLogs = filter === 'all' 
    ? logs 
    : logs.filter(log => log.type === filter);

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'connection': return 'bg-blue-100 text-blue-800';
      case 'subscription': return 'bg-green-100 text-green-800';
      case 'message': return 'bg-purple-100 text-purple-800';
      case 'error': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'connection': return '🔗';
      case 'subscription': return '📡';
      case 'message': return '📨';
      case 'error': return '❌';
      default: return '📋';
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          Centrifugo Debug Panel
          <div className="flex items-center gap-2">
            <Badge variant="outline">{filteredLogs.length} logs</Badge>
            <div className="flex items-center gap-1">
              <span className="text-xs text-gray-500">Auto-refresh:</span>
              <button
                onClick={() => setIsAutoRefresh(!isAutoRefresh)}
                className={`w-4 h-4 rounded-full ${
                  isAutoRefresh ? 'bg-green-500' : 'bg-gray-300'
                }`}
              />
            </div>
          </div>
        </CardTitle>
        <CardDescription>
          Real-time monitoring of Centrifugo connections, subscriptions, and messages
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Controls */}
        <div className="flex flex-wrap gap-2 mb-4">
          {['all', 'connection', 'subscription', 'message', 'error'].map((filterType) => (
            <Button
              key={filterType}
              variant={filter === filterType ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter(filterType as any)}
            >
              {filterType.charAt(0).toUpperCase() + filterType.slice(1)}
              {filterType !== 'all' && (
                <span className="ml-1 text-xs">
                  ({logs.filter(log => log.type === filterType).length})
                </span>
              )}
            </Button>
          ))}
          
          <div className="flex gap-2 ml-auto">
            <Button variant="outline" size="sm" onClick={refreshLogs}>
              Refresh
            </Button>
            <Button variant="outline" size="sm" onClick={exportLogs}>
              Export
            </Button>
            <Button variant="outline" size="sm" onClick={clearLogs}>
              Clear
            </Button>
          </div>
        </div>

        {/* Logs */}
        <div className="bg-gray-50 rounded-lg p-4 max-h-96 overflow-y-auto">
          {filteredLogs.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No logs available. Connect to Centrifugo and interact with the system to see logs.
            </div>
          ) : (
            <div className="space-y-2">
              {filteredLogs.reverse().map((log, index) => (
                <div
                  key={index}
                  className="bg-white rounded p-3 border border-gray-200 hover:border-gray-300 transition-colors"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{getTypeIcon(log.type)}</span>
                      <Badge className={getTypeColor(log.type)}>
                        {log.type}
                      </Badge>
                      {log.channel && (
                        <Badge variant="outline" className="text-xs">
                          {log.channel}
                        </Badge>
                      )}
                      <span className="text-xs text-gray-500">
                        {new Date(log.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                  </div>
                  
                  <div className="text-sm font-medium text-gray-900 mb-1">
                    {log.details}
                  </div>
                  
                  {log.data && (
                    <details className="mt-2">
                      <summary className="text-xs text-gray-600 cursor-pointer hover:text-gray-800">
                        View Data
                      </summary>
                      <pre className="mt-2 p-2 bg-gray-100 rounded text-xs overflow-x-auto">
                        {JSON.stringify(log.data, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Summary Stats */}
        <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
          {['connection', 'subscription', 'message', 'error'].map((type) => {
            const count = logs.filter(log => log.type === type).length;
            return (
              <div key={type} className="text-center p-3 bg-gray-50 rounded">
                <div className="text-2xl font-bold">{count}</div>
                <div className="text-xs text-gray-600">{type}s</div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
