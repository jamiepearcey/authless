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
  
  // Mock data for now - replace with real queries
  const stats = {
    totalTenants: dashboardStats?.length || 0,
    activeTenants: dashboardStats?.filter(t => t.status === 'active').length || 0,
    totalUsers: 0, // Would need a separate query
    activeNotifications: 0, // Would need a separate query
    securityIncidents: 0, // Would need a separate query
    systemHealth: "99.9%"
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

        
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center space-x-3">
              <BarChart3 className="h-8 w-8 text-indigo-600" />
              <span>Platform Dashboard (Sample Page)</span>
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
          value={stats.systemHealth}
          description="Uptime this month"
          icon={Shield}
          trend={{ value: "0 incidents", isPositive: true }}
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
          <CardHeader>
            <CardTitle>System Status</CardTitle>
            <CardDescription>Current system health indicators</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm">Database</span>
                <div className="flex items-center text-green-600">
                  <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                  <span className="text-sm">Healthy</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">API Services</span>
                <div className="flex items-center text-green-600">
                  <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                  <span className="text-sm">Operational</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Real-time</span>
                <div className="flex items-center text-green-600">
                  <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                  <span className="text-sm">Connected</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Email Service</span>
                <div className="flex items-center text-yellow-600">
                  <div className="w-2 h-2 bg-yellow-500 rounded-full mr-2"></div>
                  <span className="text-sm">Degraded</span>
                </div>
              </div>
            </div>
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