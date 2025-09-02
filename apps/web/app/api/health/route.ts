import { NextRequest, NextResponse } from 'next/server';

interface ServiceConfig {
  name: string;
  port: number;
  path: string;
}

interface ServiceStatus {
  name: string;
  status: 'healthy' | 'unhealthy' | 'unknown';
  responseTime?: number;
  error?: string;
  url: string;
  lastChecked: string;
}

function parseServiceConfig(configString: string): ServiceConfig[] {
  if (!configString) return [];
  
  return configString.split(',').map(service => {
    const [name, port, path = '/health'] = service.trim().split(':');
    return {
      name,
      port: parseInt(port),
      path
    };
  });
}

async function checkServiceHealth(
  host: string, 
  service: ServiceConfig, 
  timeout: number = 5000
): Promise<ServiceStatus> {
  const url = `http://${host}:${service.port}${service.path}`;
  const startTime = Date.now();
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': 'Authless-HealthCheck/1.0',
      },
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    const responseTime = Date.now() - startTime;
    
    // Consider 2xx responses as healthy
    const status = response.ok ? 'healthy' : 'unhealthy';
    
    return {
      name: service.name,
      status,
      responseTime,
      url,
      lastChecked: new Date().toISOString(),
      ...(status === 'unhealthy' && {
        error: `HTTP ${response.status}: ${response.statusText}`
      })
    };
  } catch (error) {
    const responseTime = Date.now() - startTime;
    
    return {
      name: service.name,
      status: 'unhealthy',
      responseTime,
      url,
      lastChecked: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

export async function GET(request: NextRequest) {
  try {
    // Parse service configuration from environment
    const servicesConfig = process.env.SERVICES_HEALTH_CONFIG || '';
    const servicesHost = process.env.SERVICES_HOST || 'localhost';
    
    if (!servicesConfig) {
      return NextResponse.json(
        { 
          success: false,
          error: 'No services configured for health checks',
          services: [],
          overall: {
            status: 'unknown',
            healthyServices: 0,
            totalServices: 0,
            averageResponseTime: 0
          }
        },
        { status: 200 }
      );
    }
    
    const services = parseServiceConfig(servicesConfig);
    
    if (services.length === 0) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Invalid service configuration',
          services: [],
          overall: {
            status: 'unknown',
            healthyServices: 0,
            totalServices: 0,
            averageResponseTime: 0
          }
        },
        { status: 200 }
      );
    }
    
    // Check all services in parallel
    const healthChecks = await Promise.all(
      services.map(service => checkServiceHealth(servicesHost, service))
    );
    
    // Calculate overall health status
    const healthyCount = healthChecks.filter(check => check.status === 'healthy').length;
    const totalCount = healthChecks.length;
    const overallStatus = healthyCount === totalCount ? 'healthy' : 
                         healthyCount > 0 ? 'degraded' : 'unhealthy';
    
    // Calculate average response time for healthy services
    const healthyServices = healthChecks.filter(check => check.status === 'healthy');
    const avgResponseTime = healthyServices.length > 0 
      ? healthyServices.reduce((sum, service) => sum + (service.responseTime || 0), 0) / healthyServices.length
      : 0;
    
    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      overall: {
        status: overallStatus,
        healthyServices: healthyCount,
        totalServices: totalCount,
        averageResponseTime: Math.round(avgResponseTime)
      },
      services: healthChecks.sort((a, b) => a.name.localeCompare(b.name))
    });
    
  } catch (error) {
    console.error('Health check error:', error);
    
    return NextResponse.json(
      { 
        success: false,
        error: 'Health check failed',
        message: error instanceof Error ? error.message : 'Unknown error',
        services: [],
        overall: {
          status: 'unhealthy',
          healthyServices: 0,
          totalServices: 0,
          averageResponseTime: 0
        }
      },
      { status: 200 }
    );
  }
}