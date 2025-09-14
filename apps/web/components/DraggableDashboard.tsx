"use client";

import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@ui/base";
import {
  Building2, Users, Shield, TrendingUp, Activity, AlertTriangle, Send, FileText
} from "lucide-react";
import { GridStack } from "gridstack";
import "gridstack/dist/gridstack.min.css";

interface DashboardStatProps {
  title: string;
  value: string;
  description: string;
  icon: React.ElementType;
  trend?: { value: string; isPositive: boolean };
}

function DashboardStat({ title, value, description, icon: Icon, trend, isGridMode }: DashboardStatProps & { isGridMode?: boolean }) {
  return (
    <Card data-variant={isGridMode ? "gridstack" : "default"} className="overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent className="overflow-hidden">
        <div className="text-2xl font-bold overflow-hidden">{value}</div>
        <div className="flex items-center space-x-2 text-xs text-muted-foreground overflow-hidden">
          <span className="truncate">{description}</span>
          {trend && (
            <span className={`flex items-center ${trend.isPositive ? "text-green-600" : "text-red-600"} flex-shrink-0`}>
              <TrendingUp className={`h-3 w-3 mr-1 ${trend.isPositive ? "" : "rotate-180"}`} />
              {trend.value}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

interface DraggableDashboardProps {
  dashboardStats: any[];
  outboxStats: any;
  auditStats: any;
  healthData: any;
  healthLoading: boolean;
  healthError: string | null;
  lastUpdate: Date | null;
  refreshHealth: () => void;
  isAllHealthy: boolean;
  healthyCount: number;
  totalCount: number;
  avgResponseTime: number;
  isGridMode: boolean;
}

export default function DraggableDashboard(props: DraggableDashboardProps) {
  const {
    dashboardStats, outboxStats, auditStats, healthData, healthLoading, healthError,
    lastUpdate, refreshHealth, isAllHealthy, healthyCount, totalCount, avgResponseTime, isGridMode
  } = props;

           // 12-col grid with proper heights for content
     const widgets = [
      { id: "stats-1", x: 0,  y: 0,  w: 3, h: 3, minW: 2, minH: 3  },
      { id: "stats-2", x: 3,  y: 0,  w: 3, h: 3, minW: 2, minH: 3},
      { id: "stats-3", x: 6,  y: 0,  w: 3, h: 3, minW: 2, minH: 3 },
      { id: "stats-4", x: 9,  y: 0,  w: 3, h: 3, minW: 2, minH: 3 },

     { id: "tenants",       x: 0,  y: 4,  w: 8, h: 10, minW: 4, minH: 6 },
     { id: "system-status", x: 8,  y: 4,  w: 4, h: 8, minW: 3, minH: 6 },

     { id: "outbox", x: 0,  y: 12, w: 8, h: 4, minW: 4, minH: 4 },
     { id: "audit",  x: 8,  y: 12, w: 4, h: 6, minW: 3, minH: 4 },

     { id: "alerts", x: 0,  y: 18, w: 12, h: 6, minW: 6, minH: 4 }
   ];

  const [isMounted, setIsMounted] = useState(false);
  const gridRef = useRef<HTMLDivElement>(null);
  const gridInstanceRef = useRef<GridStack | null>(null);

  useEffect(() => setIsMounted(true), []);

  useEffect(() => {
    if (!isMounted || !gridRef.current) return;

    // destroy any stale instance
    if (gridInstanceRef.current) {
      gridInstanceRef.current.destroy(false);
      gridInstanceRef.current = null;
    }

    const grid = GridStack.init(
       {
         column: 12,
         cellHeight: 50,
         margin: 5,
         animate: true,
         float: false,
         resizable: isGridMode ? { handles: "se" } : false,
         draggable: isGridMode ? { handle: ".card-header, .grid-stack-item-content" } : false,
         staticGrid: !isGridMode,
         minRow: 1,
         disableOneColumnMode: true,
         acceptWidgets: isGridMode
       },
       gridRef.current
     );

    gridInstanceRef.current = grid;

    return () => {
      if (gridInstanceRef.current) {
        gridInstanceRef.current.destroy(false);
        gridInstanceRef.current = null;
      }
    };
  }, [isMounted, isGridMode]);

  if (!isMounted) {
    return (
      <div className="space-y-6">
        <div className="flex justify-end">
          <div className="h-9 w-48 bg-gray-200 animate-pulse rounded" />
        </div>
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 animate-pulse rounded" />
            ))}
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-64 bg-gray-200 animate-pulse rounded" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  const stats = {
    totalTenants: dashboardStats?.length || 0,
    activeTenants: dashboardStats?.filter((t) => t.status === "active").length || 0,
    totalUsers: 1247
  };

  const getHealthPercentage = () => {
    if (!healthData) return "Unknown";
    if (isAllHealthy) return "100%";
    if (totalCount === 0) return "Unknown";
    return `${Math.round((healthyCount / totalCount) * 100)}%`;
  };



  const renderWidgetContent = (widgetId: string) => {
    switch (widgetId) {
      case "stats-1":
        return (
          <DashboardStat
            title="Total Tenants"
            value={stats.totalTenants.toString()}
            description="All registered workspaces"
            icon={Building2}
            trend={{ value: "+12%", isPositive: true }}
            isGridMode={isGridMode}
          />
        );
      case "stats-2":
        return (
          <DashboardStat
            title="Active Tenants"
            value={stats.activeTenants.toString()}
            description="Currently active workspaces"
            icon={Activity}
            trend={{ value: "+8%", isPositive: true }}
            isGridMode={isGridMode}
          />
        );
      case "stats-3":
        return (
          <DashboardStat
            title="Total Users"
            value="1,247"
            description="Across all tenants"
            icon={Users}
            trend={{ value: "+15%", isPositive: true }}
            isGridMode={isGridMode}
          />
        );
      case "stats-4":
        return (
          <DashboardStat
            title="System Health"
            value={getHealthPercentage()}
            description={healthData ? `${healthyCount}/${totalCount} services healthy` : "Checking services..."}
            icon={Shield}
            trend={healthData ? { value: `${avgResponseTime}ms avg`, isPositive: avgResponseTime < 200 } : undefined}
            isGridMode={isGridMode}
          />
        );
      case "tenants":
        return (
          <Card>
            <CardHeader>
              <CardTitle>Recent Tenant Activity</CardTitle>
              <CardDescription>Latest tenant registrations and status changes</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {dashboardStats?.slice(0, 6).map((tenant) => (
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
                        tenant.status === "active" ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"
                      }`}>
                        {tenant.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        );
      case "system-status":
        return (
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
                <Activity className={`h-4 w-4 ${healthLoading ? "animate-spin" : ""}`} />
              </button>
            </CardHeader>
            <CardContent>
              {healthLoading && !healthData ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600" />
                </div>
              ) : healthError ? (
                <div className="text-center py-4">
                  <div className="flex items-center justify-center text-red-600 mb-2">
                    <AlertTriangle className="h-5 w-5 mr-2" />
                    <span className="text-sm">Health check failed</span>
                  </div>
                  <p className="text-xs text-gray-500">{healthError}</p>
                  <button onClick={refreshHealth} className="text-xs text-indigo-600 hover:text-indigo-800 mt-2">
                    Retry
                  </button>
                </div>
              ) : healthData ? (
                <div className="space-y-3">
                  {healthData.services.map((service: any) => {
                    const statusColor =
                      service.status === "healthy" ? "text-green-600" :
                      service.status === "unhealthy" ? "text-red-600" : "text-gray-600";
                    const dotColor =
                      service.status === "healthy" ? "bg-green-500" :
                      service.status === "unhealthy" ? "bg-red-500" : "bg-gray-500";
                    return (
                      <div key={service.name} className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <span className="text-sm capitalize">{service.name.replace(/-/g, " ")}</span>
                          {service.responseTime && (
                            <span className="text-xs text-gray-400">({service.responseTime}ms)</span>
                          )}
                        </div>
                        <div className={`flex items-center ${statusColor}`}>
                          <div className={`w-2 h-2 ${dotColor} rounded-full mr-2`} />
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
                <div className="text-center py-4 text-gray-500 text-sm">No health data available</div>
              )}
            </CardContent>
          </Card>
        );
      case "outbox":
        return (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Send className="h-5 w-5" />
                <span>Outbox Events</span>
              </CardTitle>
              <CardDescription>Event publishing and delivery status</CardDescription>
            </CardHeader>
                         <CardContent>
               <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
             </CardContent>
          </Card>
        );
      case "audit":
        return (
          <Card className="bg-gradient-to-r from-slate-50 to-indigo-50 border-indigo-200">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <div className="p-1 bg-indigo-100 rounded-md">
                  <FileText className="h-4 w-4 text-indigo-600" />
                </div>
                <span className="text-indigo-900">Audit Monitor</span>
              </CardTitle>
              <CardDescription className="text-indigo-700">Security & compliance trail</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Enhanced Metrics Grid */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-white/60 rounded-lg p-3 border border-blue-100">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-medium text-blue-800">Recent (24h)</p>
                        <p className="text-xl font-bold text-blue-700">{auditStats?.recentEvents || 0}</p>
                      </div>
                      <Activity className="h-5 w-5 text-blue-600" />
                    </div>
                  </div>
                  
                  <div className="bg-white/60 rounded-lg p-3 border border-indigo-100">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-medium text-indigo-800">Total Events</p>
                        <p className="text-xl font-bold text-indigo-700">{auditStats?.totalEvents || 0}</p>
                      </div>
                      <FileText className="h-5 w-5 text-indigo-600" />
                    </div>
                  </div>
                  
                  <div className="bg-white/60 rounded-lg p-3 border border-yellow-100">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-medium text-yellow-800">Warnings</p>
                        <p className="text-xl font-bold text-yellow-700">
                          {auditStats?.severityBreakdown?.warning || 0}
                        </p>
                      </div>
                      <AlertTriangle className="h-5 w-5 text-yellow-600" />
                    </div>
                  </div>
                  
                  <div className="bg-white/60 rounded-lg p-3 border border-red-100">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-medium text-red-800">Critical</p>
                        <p className="text-xl font-bold text-red-700">
                          {(auditStats?.severityBreakdown?.error || 0) + (auditStats?.severityBreakdown?.critical || 0)}
                        </p>
                      </div>
                      <Shield className="h-5 w-5 text-red-600" />
                    </div>
                  </div>
                </div>
                
                {/* Top Actions with enhanced styling */}
                <div className="bg-white/40 rounded-lg p-3">
                  <h4 className="text-xs font-semibold text-indigo-900 mb-2 uppercase tracking-wide">Active Patterns</h4>
                  <div className="space-y-1.5">
                    {auditStats?.topActions?.slice(0, 3).map((action: any, index: number) => (
                      <div key={action.action} className="flex items-center justify-between text-sm">
                        <div className="flex items-center space-x-2">
                          <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full"></div>
                          <span className="text-gray-700 text-xs capitalize">{action.action.replace(/_/g, " ")}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <span className="text-xs font-bold text-indigo-600">{action.count}</span>
                          <TrendingUp className="h-3 w-3 text-green-500" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      case "alerts":
        return (
          <Card>
            <CardHeader>
              <CardTitle>System Alerts</CardTitle>
              <CardDescription>Recent system events and notifications</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
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
        );
      default:
        return <div className="p-4">Unknown widget: {widgetId}</div>;
    }
  };

  return (
    <div className="space-y-6">
      {isGridMode && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
          <p className="text-sm text-blue-800">
            <strong>Grid Layout Mode Active:</strong> Drag widgets to rearrange and resize by dragging the bottom-right corner.
          </p>
        </div>
      )}

      <style jsx>{`
        .grid-stack-static .grid-stack-item {
          cursor: default !important;
        }
        .grid-stack-static .grid-stack-item:hover {
          border: none !important;
          box-shadow: none !important;
        }
        .grid-stack-static .grid-stack-item .ui-resizable-handle {
          display: none !important;
        }
        .grid-stack-static .grid-stack-item .ui-draggable-handle {
          cursor: default !important;
        }
        .grid-stack-static .grid-stack-item .card-header {
          cursor: default !important;
        }
        .grid-stack-static .grid-stack-item .grid-stack-item-content {
          cursor: default !important;
        }
        .grid-stack-static .grid-stack-item .grid-stack-item-content:hover {
          border: none !important;
          box-shadow: none !important;
        }
        /* Ensure no hover effects on cards when not in grid mode */
        .grid-stack-static .grid-stack-item .grid-stack-item-content .card:hover {
          border: none !important;
          box-shadow: none !important;
        }
        .grid-stack-static .grid-stack-item .grid-stack-item-content .card {
          cursor: default !important;
        }
        .grid-stack-static .grid-stack-item .grid-stack-item-content .card * {
          cursor: default !important;
        }
        /* Override any potential hover states from the Card component */
        .grid-stack-static .grid-stack-item .grid-stack-item-content .card[data-variant="default"]:hover,
        .grid-stack-static .grid-stack-item .grid-stack-item-content .card[data-variant="gridstack"]:hover {
          border: none !important;
          box-shadow: none !important;
          transform: none !important;
        }
      `}</style>

      <div className="grid-edge-flush"> 
        <div ref={gridRef} className={`grid-stack ${!isGridMode ? 'grid-stack-static' : ''}`}>
          {widgets.map((w) => (
            <div
               key={w.id}
               className="grid-stack-item"
               gs-x={w.x} gs-y={w.y} gs-w={w.w} gs-h={w.h}
               gs-min-w={w.minW} gs-min-h={w.minH} gs-id={w.id}
             >
              <div className="grid-stack-item-content overflow-hidden">
                {renderWidgetContent(w.id)}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}