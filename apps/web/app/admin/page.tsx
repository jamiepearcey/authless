"use client";

import { Button } from "@ui/base";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@ui/base";
import { 
  BarChart3,
  Settings,
  DollarSign,
  Building
} from "lucide-react";

import { trpc } from "@/lib/trpc";
import { BreadcrumbNavigation } from "@/components/BreadcrumbNavigation";
import { useHealthCheck } from "@/hooks/useHealthCheck";
import DraggableDashboard from "@/components/DraggableDashboard";
import { AdminPageLayout } from "@/components/AdminPageLayout";
import { BillingDashboard, DashboardContext } from "@/components/dashboard";
import { useState, useEffect } from "react";

export default function AdminDashboardPage() {
  const { data: dashboardStats, isLoading } = trpc.getAllTenants.useQuery();
  const { data: outboxStats, isLoading: outboxLoading } = trpc.getOutboxStats.useQuery({});
  const { data: auditStats, isLoading: auditLoading } = trpc.getAuditStats.useQuery({});
  
  // Grid mode state
  const [isGridMode, setIsGridMode] = useState(false);
  
  // Billing dashboard state
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'quarter' | 'year'>('month');
  
  const billingDashboardContext: DashboardContext = {
    type: 'platform',
    timeRange,
  };
  
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

  // Load grid mode preference from localStorage on mount
  useEffect(() => {
    try {
      const savedGridMode = localStorage.getItem('admin-dashboard-grid-mode');
      if (savedGridMode) {
        setIsGridMode(savedGridMode === 'true');
      }
    } catch (error) {
      console.error('Failed to load grid mode preference:', error);
    }
  }, []);

  if (isLoading || outboxLoading || auditLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <AdminPageLayout
      title="Platform Administration"
      description="Manage tenants, billing, and platform-wide analytics"
      actions={
        <div className="flex items-center space-x-3">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value as any)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="week">Last Week</option>
            <option value="month">Last Month</option>
            <option value="quarter">Last Quarter</option>
            <option value="year">Last Year</option>
          </select>
          <Button
            variant={isGridMode ? "default" : "outline"}
            onClick={() => {
              const newGridMode = !isGridMode;
              setIsGridMode(newGridMode);
              try {
                localStorage.setItem('admin-dashboard-grid-mode', newGridMode.toString());
              } catch (error) {
                console.error('Failed to save grid mode preference:', error);
              }
            }}
            className="flex items-center space-x-2"
          >
            <Settings className="h-4 w-4" />
            <span>{isGridMode ? "Exit Grid Mode" : "Enable Grid Layout"}</span>
          </Button>
        </div>
      }
    >
      {/* Breadcrumb Navigation */}
      <div className="flex items-center space-x-4 mb-6">
        <BreadcrumbNavigation
          items={[
            { label: "Admin Dashboard", current: true },
          ]}
          showHome={false}
        />
      </div>

      {/* Tabbed Interface */}
      <Tabs defaultValue="system" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 lg:w-fit lg:grid-cols-3">
          <TabsTrigger value="system" className="flex items-center space-x-2">
            <BarChart3 className="h-4 w-4" />
            <span>System Health</span>
          </TabsTrigger>
          <TabsTrigger value="billing" className="flex items-center space-x-2">
            <DollarSign className="h-4 w-4" />
            <span>Billing & Analytics</span>
          </TabsTrigger>
          <TabsTrigger value="tenants" className="flex items-center space-x-2">
            <Building className="h-4 w-4" />
            <span>Tenants</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="system" className="space-y-6">
          {/* Original Dashboard */}
          <DraggableDashboard
            dashboardStats={dashboardStats || []}
            outboxStats={outboxStats}
            auditStats={auditStats}
            healthData={healthData}
            healthLoading={healthLoading}
            healthError={healthError}
            lastUpdate={lastUpdate}
            refreshHealth={refreshHealth}
            isAllHealthy={isAllHealthy}
            healthyCount={healthyCount}
            totalCount={totalCount}
            avgResponseTime={avgResponseTime}
            isGridMode={isGridMode}
          />
        </TabsContent>

        <TabsContent value="billing" className="space-y-6">
          {/* Billing Dashboard */}
          <BillingDashboard 
            context={billingDashboardContext}
            className="space-y-6"
          />
        </TabsContent>

        <TabsContent value="tenants" className="space-y-6">
          {/* Tenant Management - This would be implemented later */}
          <div className="text-center py-12">
            <Building className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Tenant Management</h3>
            <p className="text-gray-500 mb-4">
              Detailed tenant management interface would be implemented here
            </p>
            <Button variant="outline">
              View All Tenants
            </Button>
          </div>
        </TabsContent>
      </Tabs>
    </AdminPageLayout>
  );
}