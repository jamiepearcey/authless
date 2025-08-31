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
  AlertTriangle
} from "lucide-react";
import { BreadcrumbNavigation } from "@/components/BreadcrumbNavigation";
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
  
  // Mock data for now - replace with real queries
  const stats = {
    totalTenants: dashboardStats?.length || 0,
    activeTenants: dashboardStats?.filter(t => t.status === 'active').length || 0,
    totalUsers: 0, // Would need a separate query
    activeNotifications: 0, // Would need a separate query
    securityIncidents: 0, // Would need a separate query
    systemHealth: "99.9%"
  };

  if (isLoading) {
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
        <div className="flex items-center space-x-4 mb-4">
          <BreadcrumbNavigation
            items={[
              { label: "Platform Admin", href: "/admin" },
              { label: "Dashboard", current: true },
            ]}
            showHome={false}
          />
        </div>
        
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

        {/* Recent Notifications */}
        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>System Alerts</CardTitle>
            <CardDescription>Recent system events and notifications</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-start space-x-3">
                <AlertTriangle className="h-5 w-5 text-yellow-500 mt-0.5" />
                <div>
                  <p className="font-medium">Email service degradation</p>
                  <p className="text-sm text-gray-600">Email delivery experiencing delays. Investigating...</p>
                  <p className="text-xs text-gray-500 mt-1">2 minutes ago</p>
                </div>
              </div>
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