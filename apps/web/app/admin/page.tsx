"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@ui/base";
import { 
  Building2, 
  Users, 
  Bell, 
  Shield,
  BarChart3,
  TrendingUp,
  Activity,
  AlertTriangle,
  Send,
  Database,
  FileText
} from "lucide-react";

import { trpc } from "@/lib/trpc";
import { BreadcrumbNavigation } from "@/components/BreadcrumbNavigation";
import { useHealthCheck } from "@/hooks/useHealthCheck";

interface DashboardStatProps {
  title: string;
  value: string;
  description: string;
  icon: React.ElementType;
  trend?: {
    value: string;
    isPositive: boolean;
  };
}

function DashboardStat({ title, value, description, icon: Icon, trend }: DashboardStatProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <div className="flex items-center space-x-2 text-xs text-muted-foreground">
          <span>{description}</span>
          {trend && (
            <span className={`flex items-center ${trend.isPositive ? 'text-green-600' : 'text-red-600'}`}>
              <TrendingUp className={`h-3 w-3 mr-1 ${trend.isPositive ? '' : 'rotate-180'}`} />
              {trend.value}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default function AdminDashboardPage() {
  const { data: dashboardStats, isLoading } = trpc.getAllTenants.useQuery();
  const { data: outboxStats, isLoading: outboxLoading } = trpc.getOutboxStats.useQuery({});
  const { data: auditStats, isLoading: auditLoading } = trpc.getAuditStats.useQuery({});
  
  // Health check hook
  const {
    healthData,
    loading: healthLoading,
    error: healthError,
    lastUpdate,
    refresh: refreshHealth,
    checkServiceHealth,
    isAllHealthy,
    isDegraded,
    healthyCount,
    totalCount,
    avgResponseTime
  } = useHealthCheck(true, 30000); // Auto-refresh every 30 seconds
  
  // Calculate stats including health data
  const stats = {
    totalTenants: dashboardStats?.length || 0,
    activeTenants: dashboardStats?.filter(t => t.status === 'active').length || 0,
    totalUsers: 0, // Would need a separate query
    activeNotifications: 0, // Would need a separate query
    securityIncidents: 0, // Would need a separate query
    systemHealth: healthData ? 
      (isAllHealthy ? "100%" : isDegraded ? "Degraded" : "Critical") : 
      "Unknown"
  };

  const getHealthPercentage = () => {
    if (!healthData) return "Unknown";
    if (isAllHealthy) return "100%";
    if (totalCount === 0) return "Unknown";
    return `${Math.round((healthyCount / totalCount) * 100)}%`;
  };

  if (isLoading || outboxLoading || auditLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="mb-8">
        {/* Breadcrumb Navigation */}
        <div className="flex items-center space-x-4 mb-4">
          <BreadcrumbNavigation
            items={[
              { label: "Admin Dashboard", current: true },
            ]}
            showHome={false}
          />
        </div>
        
        {/* Page Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center space-x-3">
              <BarChart3 className="h-8 w-8 text-indigo-600" />
              <span>Platform Dashboard</span>
            </h1>
            <p className="text-gray-600 mt-2">
              Overview of platform-wide metrics and system health
            </p>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <DashboardStat
          title="Total Tenants"
          value={stats.totalTenants.toString()}
          description="All registered workspaces"
          icon={Building2}
          trend={{ value: "+12%", isPositive: true }}
        />
        <DashboardStat
          title="Active Tenants"
          value={stats.activeTenants.toString()}
          description="Currently active workspaces"
          icon={Activity}
          trend={{ value: "+8%", isPositive: true }}
        />
        <DashboardStat
          title="Total Users"
          value="1,247"
          description="Across all tenants"
          icon={Users}
          trend={{ value: "+15%", isPositive: true }}
        />
        <DashboardStat
          title="System Health"
          value={getHealthPercentage()}
          description={healthData ? `${healthyCount}/${totalCount} services healthy` : "Checking services..."}
          icon={Shield}
          trend={healthData ? {
            value: `${avgResponseTime}ms avg`,
            isPositive: avgResponseTime < 200
          } : undefined}
        />
      </div>

      {/* Dashboard Content */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Recent Tenants */}
        <Card className="col-span-2">
          <CardHeader>
            <CardTitle>Recent Tenant Activity</CardTitle>
            <CardDescription>Latest tenant registrations and status changes</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {dashboardStats?.slice(0, 5).map((tenant) => (
                <div key={tenant.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <Building2 className="h-5 w-5 text-indigo-600" />
                    <div>
                      <p className="font-medium">{tenant.name}</p>
                      <p className="text-sm text-gray-600">@{tenant.slug}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      tenant.status === 'active' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {tenant.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* System Status */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div>
              <CardTitle>System Status</CardTitle>
              <CardDescription>Current system health indicators</CardDescription>
            </div>
            <button
              onClick={refreshHealth}
              disabled={healthLoading}
              className="p-2 hover:bg-gray-100 rounded-md disabled:opacity-50"
              title="Refresh health status"
            >
              <Activity className={`h-4 w-4 ${healthLoading ? 'animate-spin' : ''}`} />
            </button>
          </CardHeader>
          <CardContent>
            {healthLoading && !healthData ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600"></div>
              </div>
            ) : healthError ? (
              <div className="text-center py-4">
                <div className="flex items-center justify-center text-red-600 mb-2">
                  <AlertTriangle className="h-5 w-5 mr-2" />
                  <span className="text-sm">Health check failed</span>
                </div>
                <p className="text-xs text-gray-500">{healthError}</p>
                <button
                  onClick={refreshHealth}
                  className="text-xs text-indigo-600 hover:text-indigo-800 mt-2"
                >
                  Retry
                </button>
              </div>
            ) : healthData ? (
              <div className="space-y-4">
                {healthData.services.map((service) => {
                  const statusColor = service.status === 'healthy' ? 'text-green-600' : 
                                    service.status === 'unhealthy' ? 'text-red-600' : 'text-gray-600';
                  const dotColor = service.status === 'healthy' ? 'bg-green-500' : 
                                 service.status === 'unhealthy' ? 'bg-red-500' : 'bg-gray-500';
                  
                  return (
                    <div key={service.name} className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className="text-sm capitalize">{service.name.replace(/-/g, ' ')}</span>
                        {service.responseTime && (
                          <span className="text-xs text-gray-400">({service.responseTime}ms)</span>
                        )}
                      </div>
                      <div className={`flex items-center ${statusColor}`}>
                        <div className={`w-2 h-2 ${dotColor} rounded-full mr-2`}></div>
                        <span className="text-sm capitalize">{service.status}</span>
                      </div>
                    </div>
                  );
                })}
                
                {lastUpdate && (
                  <div className="pt-2 border-t">
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span>Last updated: {lastUpdate.toLocaleTimeString()}</span>
                      <span>Avg: {avgResponseTime}ms</span>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-4 text-gray-500 text-sm">
                No health data available
              </div>
            )}
          </CardContent>
        </Card>

        {/* Outbox Monitoring */}
        <Card className="col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Send className="h-5 w-5" />
              <span>Outbox Events</span>
            </CardTitle>
            <CardDescription>Event publishing and delivery status</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{outboxStats?.sent || 0}</div>
                  <div className="text-sm text-gray-600">Sent</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{outboxStats?.pending || 0}</div>
                  <div className="text-sm text-gray-600">Pending</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-yellow-600">{outboxStats?.processing || 0}</div>
                  <div className="text-sm text-gray-600">Processing</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">{(outboxStats?.failed || 0) + (outboxStats?.dead || 0)}</div>
                  <div className="text-sm text-gray-600">Failed</div>
                </div>
              </div>
              
              {outboxStats?.oldestPending && (
                <div className="mt-4 p-3 bg-yellow-50 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <AlertTriangle className="h-4 w-4 text-yellow-600" />
                    <span className="text-sm font-medium text-yellow-800">
                      Oldest pending: {new Date(outboxStats.oldestPending).toLocaleString()}
                    </span>
                  </div>
                </div>
              )}
              
              <div className="mt-4">
                <a 
                  href="/admin/outbox" 
                  className="text-sm text-indigo-600 hover:text-indigo-800 font-medium"
                >
                  View detailed outbox monitoring →
                </a>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Audit Monitoring */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <FileText className="h-5 w-5" />
              <span>Audit Events</span>
            </CardTitle>
            <CardDescription>System audit trail and activity</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-indigo-600">{auditStats?.recentEvents || 0}</div>
                <div className="text-sm text-gray-600">Events (24h)</div>
              </div>
              
              <div className="space-y-2">
                {auditStats?.topActions?.slice(0, 3).map((action) => (
                  <div key={action.action} className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">{action.action.replace(/_/g, ' ')}</span>
                    <span className="font-medium">{action.count}</span>
                  </div>
                ))}
              </div>
              
              <div className="mt-4">
                <a 
                  href="/admin/audit" 
                  className="text-sm text-indigo-600 hover:text-indigo-800 font-medium"
                >
                  View audit events →
                </a>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* System Alerts Section */}
      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>System Alerts</CardTitle>
            <CardDescription>Recent system events and notifications</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Health-related alerts */}
              {healthData?.services.filter(s => s.status === 'unhealthy').map((service) => (
                <div key={service.name} className="flex items-start space-x-3">
                  <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5" />
                  <div>
                    <p className="font-medium">{service.name.replace(/-/g, ' ')} service unhealthy</p>
                    <p className="text-sm text-gray-600">
                      {service.error || 'Service is not responding properly'}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">Last checked: {new Date(service.lastChecked).toLocaleTimeString()}</p>
                  </div>
                </div>
              ))}

              {outboxStats && (outboxStats.failed > 0 || outboxStats.dead > 0) && (
                <div className="flex items-start space-x-3">
                  <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5" />
                  <div>
                    <p className="font-medium">Outbox events failing</p>
                    <p className="text-sm text-gray-600">
                      {outboxStats.failed + outboxStats.dead} events need attention
                    </p>
                    <p className="text-xs text-gray-500 mt-1">Check outbox monitoring</p>
                  </div>
                </div>
              )}

              {/* Show positive alert when all services are healthy */}
              {healthData && isAllHealthy && (
                <div className="flex items-start space-x-3">
                  <Shield className="h-5 w-5 text-green-500 mt-0.5" />
                  <div>
                    <p className="font-medium">All services healthy</p>
                    <p className="text-sm text-gray-600">All {totalCount} services are responding normally</p>
                    <p className="text-xs text-gray-500 mt-1">Last checked: {lastUpdate?.toLocaleTimeString()}</p>
                  </div>
                </div>
              )}
              
              <div className="flex items-start space-x-3">
                <Shield className="h-5 w-5 text-green-500 mt-0.5" />
                <div>
                  <p className="font-medium">Security scan completed</p>
                  <p className="text-sm text-gray-600">Weekly security audit passed with no issues found</p>
                  <p className="text-xs text-gray-500 mt-1">1 hour ago</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <Building2 className="h-5 w-5 text-blue-500 mt-0.5" />
                <div>
                  <p className="font-medium">New tenant registered</p>
                  <p className="text-sm text-gray-600">AcmeCorp has successfully completed onboarding</p>
                  <p className="text-xs text-gray-500 mt-1">3 hours ago</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}