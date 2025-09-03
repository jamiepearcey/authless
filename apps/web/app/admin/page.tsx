"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle, Button } from "@ui/base";
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
  FileText,
  Settings
} from "lucide-react";

import { trpc } from "@/lib/trpc";
import { BreadcrumbNavigation } from "@/components/BreadcrumbNavigation";
import { useHealthCheck } from "@/hooks/useHealthCheck";
import DraggableDashboard from "@/components/DraggableDashboard";
import { useState, useEffect } from "react";

export default function AdminDashboardPage() {
  const { data: dashboardStats, isLoading } = trpc.getAllTenants.useQuery();
  const { data: outboxStats, isLoading: outboxLoading } = trpc.getOutboxStats.useQuery({});
  const { data: auditStats, isLoading: auditLoading } = trpc.getAuditStats.useQuery({});
  
  // Grid mode state
  const [isGridMode, setIsGridMode] = useState(false);
  
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
          
          {/* Grid Layout Toggle */}
          <div className="flex items-center space-x-3">
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
        </div>
      </div>

      {/* Draggable Dashboard */}
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
    </div>
  );
}