"use client";

import { Button } from "@ui/base";
import { 
  BarChart3,
  Settings,
  DollarSign,
  Building
} from "lucide-react";

import { trpc } from "@/lib/trpc";
import { useHealthCheck } from "@/hooks/useHealthCheck";
import DraggableDashboard from "@/components/DraggableDashboard";
import DraggableBillingDashboard from "@/components/DraggableBillingDashboard";
import { AdminPageLayout } from "@/components/AdminPageLayout";
import { DashboardContext } from "@/components/dashboard";
import { useState, useEffect } from "react";
import { RotateCcw, Save } from "lucide-react";

export default function AdminDashboardPage() {
  const { data: dashboardStats, isLoading } = trpc.getAllTenants.useQuery();
  const { data: outboxStats, isLoading: outboxLoading } = trpc.getOutboxStats.useQuery({});
  const { data: auditStats, isLoading: auditLoading } = trpc.getAuditStats.useQuery({});
  
  // Reset layout mutations
  const resetSystemHealthLayout = trpc.resetDashboardLayout.useMutation();
  const resetBillingLayout = trpc.resetDashboardLayout.useMutation();
  
  // Save layout mutations
  const saveSystemHealthLayout = trpc.saveDashboardLayout.useMutation();
  const saveBillingLayout = trpc.saveDashboardLayout.useMutation();
  
  // Grid mode state
  const [isGridMode, setIsGridMode] = useState(false);

  // Reset layout handlers
  const handleResetSystemHealthLayout = () => {
    resetSystemHealthLayout.mutate({
      dashboard: "system-health"
    }, {
      onSuccess: () => {
        window.location.reload();
      }
    });
  };

  const handleResetBillingLayout = () => {
    resetBillingLayout.mutate({
      dashboard: "billing"
    }, {
      onSuccess: () => {
        window.location.reload();
      }
    });
  };

  // Manual save handlers for testing
  const handleSaveSystemHealthLayout = () => {
    if ((window as any).saveSystemHealthLayout) {
      (window as any).saveSystemHealthLayout();
    } else {
      console.log('Save function not available yet');
    }
  };

  const handleSaveBillingLayout = () => {
    if ((window as any).saveBillingLayout) {
      (window as any).saveBillingLayout();
    } else {
      console.log('Save function not available yet');
    }
  };
  
  // Billing dashboard state
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'quarter' | 'year'>('month');
  
  // Active tab state
  const [activeTab, setActiveTab] = useState<'system' | 'billing'>('system');
  
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
      header={
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex">
            <button
              onClick={() => setActiveTab('system')}
              className={`flex items-center space-x-2 py-4 px-1 border-b-2 text-sm font-medium transition-colors ${
                activeTab === 'system'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <BarChart3 className="h-4 w-4" />
              <span>System Health</span>
            </button>
            <button
              onClick={() => setActiveTab('billing')}
              className={`flex items-center space-x-2 py-4 px-1 border-b-2 text-sm font-medium transition-colors ${
                activeTab === 'billing'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <DollarSign className="h-4 w-4" />
              <span>Billing & Analytics</span>
            </button>
          </nav>
        </div>
      }
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
          {isGridMode && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={activeTab === 'billing' ? handleSaveBillingLayout : handleSaveSystemHealthLayout}
                className="flex items-center space-x-2"
              >
                <Save className="h-4 w-4" />
                <span>Save Layout</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={activeTab === 'billing' ? handleResetBillingLayout : handleResetSystemHealthLayout}
                className="flex items-center space-x-2"
                disabled={activeTab === 'billing' ? resetBillingLayout.isPending : resetSystemHealthLayout.isPending}
              >
                <RotateCcw className="h-4 w-4" />
                <span>Reset Layout</span>
              </Button>
            </>
          )}
        </div>
      }
    >
      {/* Tabbed Interface */}
      <div className="space-y-6">

        {activeTab === 'system' && (
          <div >
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
          </div>
        )}

        {activeTab === 'billing' && (
          <div className="">
            {/* Billing Dashboard */}
            <DraggableBillingDashboard 
              context={billingDashboardContext}
              isGridMode={isGridMode}
              className="space-y-6"
            />
          </div>
        )}
      </div>
    </AdminPageLayout>
  );
}