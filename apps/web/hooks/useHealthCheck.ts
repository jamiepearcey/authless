import { useState, useEffect, useCallback } from 'react';

export interface ServiceStatus {
  name: string;
  status: 'healthy' | 'unhealthy' | 'unknown';
  responseTime?: number;
  error?: string;
  url: string;
  lastChecked: string;
}

export interface OverallHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  healthyServices: number;
  totalServices: number;
  averageResponseTime: number;
}

export interface HealthCheckResponse {
  success: boolean;
  timestamp: string;
  overall: OverallHealth;
  services: ServiceStatus[];
  error?: string;
}

export function useHealthCheck(autoRefresh: boolean = true, refreshInterval: number = 30000) {
  const [healthData, setHealthData] = useState<HealthCheckResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const fetchHealthStatus = useCallback(async () => {
    try {
      setError(null);
      const response = await fetch('/api/health', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const data = await response.json();
      setHealthData(data);
      setLastUpdate(new Date());
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch health status';
      setError(errorMessage);
      console.error('Health check fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const checkServiceHealth = useCallback(async (serviceName: string) => {
    try {
      const response = await fetch('/api/admin/health', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ serviceName }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const data = await response.json();
      
      // Update the specific service in our current health data
      if (healthData) {
        const updatedServices = healthData.services.map(service =>
          service.name === serviceName ? data.service : service
        );
        
        // Recalculate overall health
        const healthyCount = updatedServices.filter(s => s.status === 'healthy').length;
        const totalCount = updatedServices.length;
        const overallStatus = healthyCount === totalCount ? 'healthy' : 
                             healthyCount > 0 ? 'degraded' : 'unhealthy';
        
        const healthyServices = updatedServices.filter(s => s.status === 'healthy');
        const avgResponseTime = healthyServices.length > 0 
          ? healthyServices.reduce((sum, s) => sum + (s.responseTime || 0), 0) / healthyServices.length
          : 0;

        setHealthData({
          ...healthData,
          timestamp: data.timestamp,
          overall: {
            status: overallStatus,
            healthyServices: healthyCount,
            totalServices: totalCount,
            averageResponseTime: Math.round(avgResponseTime)
          },
          services: updatedServices
        });
      }

      return data.service;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to check service health';
      console.error(`Service health check error for ${serviceName}:`, err);
      throw new Error(errorMessage);
    }
  }, [healthData]);

  const refresh = useCallback(() => {
    setLoading(true);
    fetchHealthStatus();
  }, [fetchHealthStatus]);

  // Initial fetch
  useEffect(() => {
    fetchHealthStatus();
  }, [fetchHealthStatus]);

  // Auto refresh
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      fetchHealthStatus();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, fetchHealthStatus]);

  // Helper functions
  const getServiceByName = useCallback((serviceName: string) => {
    return healthData?.services.find(service => service.name === serviceName);
  }, [healthData]);

  const getHealthyServices = useCallback(() => {
    return healthData?.services.filter(service => service.status === 'healthy') || [];
  }, [healthData]);

  const getUnhealthyServices = useCallback(() => {
    return healthData?.services.filter(service => service.status === 'unhealthy') || [];
  }, [healthData]);

  const isServiceHealthy = useCallback((serviceName: string) => {
    return getServiceByName(serviceName)?.status === 'healthy';
  }, [getServiceByName]);

  return {
    // Data
    healthData,
    loading,
    error,
    lastUpdate,
    
    // Actions
    refresh,
    checkServiceHealth,
    
    // Helper methods
    getServiceByName,
    getHealthyServices,
    getUnhealthyServices,
    isServiceHealthy,
    
    // Computed values
    isAllHealthy: healthData?.overall.status === 'healthy',
    isDegraded: healthData?.overall.status === 'degraded',
    isAllUnhealthy: healthData?.overall.status === 'unhealthy',
    healthyCount: healthData?.overall.healthyServices || 0,
    totalCount: healthData?.overall.totalServices || 0,
    avgResponseTime: healthData?.overall.averageResponseTime || 0
  };
}