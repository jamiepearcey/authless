import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

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
    // Check if user is authenticated and has admin access
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    // Parse service configuration from environment
    const servicesConfig = process.env.SERVICES_HEALTH_CONFIG || '';
    const servicesHost = process.env.SERVICES_HOST || 'localhost';
    
    if (!servicesConfig) {
      return NextResponse.json(
        { error: 'No services configured for health checks' },
        { status: 500 }
      );
    }
    
    const services = parseServiceConfig(servicesConfig);
    
    if (services.length === 0) {
      return NextResponse.json(
        { error: 'Invalid service configuration' },
        { status: 500 }
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
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Check if user is authenticated and has admin access
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    const { serviceName } = await request.json();
    
    if (!serviceName) {
      return NextResponse.json(
        { error: 'Service name is required' },
        { status: 400 }
      );
    }
    
    // Parse service configuration
    const servicesConfig = process.env.SERVICES_HEALTH_CONFIG || '';
    const servicesHost = process.env.SERVICES_HOST || 'localhost';
    const services = parseServiceConfig(servicesConfig);
    
    const service = services.find(s => s.name === serviceName);
    
    if (!service) {
      return NextResponse.json(
        { error: 'Service not found in configuration' },
        { status: 404 }
      );
    }
    
    // Check specific service health
    const healthCheck = await checkServiceHealth(servicesHost, service);
    
    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      service: healthCheck
    });
    
  } catch (error) {
    console.error('Individual health check error:', error);
    
    return NextResponse.json(
      { 
        success: false,
        error: 'Service health check failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}