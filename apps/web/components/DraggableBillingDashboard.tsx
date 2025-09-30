"use client";

import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@ui/base";
import { GridStack } from "gridstack";
import "gridstack/dist/gridstack.min.css";
import { SubscriptionCharts } from './dashboard/billing/SubscriptionCharts';
import { PlanBreakdown } from './dashboard/billing/PlanBreakdown';
import { CustomersList } from './dashboard/billing/CustomersList';
import { useBillingMetrics } from './dashboard/hooks/useBillingMetrics';
import { trpc } from "@/lib/trpc";
import { 
  DollarSign, 
  Users, 
  CreditCard, 
  TrendingUp,
  TrendingDown,
  Building,
  Calendar
} from 'lucide-react';

export interface DashboardContext {
  type: 'platform' | 'tenant';
  tenantId?: string;
  timeRange: 'week' | 'month' | 'quarter' | 'year';
}

export interface DraggableBillingDashboardProps {
  context: DashboardContext;
  isGridMode: boolean;
  className?: string;
}

interface MetricCardProps {
  title: string;
  value: string | number;
  change?: {
    value: number;
    type: 'increase' | 'decrease';
    period: string;
  };
  icon: React.ComponentType<{ className?: string }>;
  className?: string;
}

function MetricCard({ title, value, change, icon: Icon, className = '' }: MetricCardProps) {
  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-gray-600">
          {title}
        </CardTitle>
        <Icon className="h-4 w-4 text-gray-500" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-gray-900">{value}</div>
        {change && (
          <div className={`flex items-center text-xs mt-1 ${
            change.type === 'increase' ? 'text-green-600' : 'text-red-600'
          }`}>
            {change.type === 'increase' ? (
              <TrendingUp className="h-3 w-3 mr-1" />
            ) : (
              <TrendingDown className="h-3 w-3 mr-1" />
            )}
            {change.value > 0 ? '+' : ''}{change.value}% from {change.period}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function DraggableBillingDashboard({ 
  context, 
  isGridMode, 
  className = '' 
}: DraggableBillingDashboardProps) {
  const [isMounted, setIsMounted] = useState(false);
  const gridRef = useRef<HTMLDivElement>(null);
  const gridInstanceRef = useRef<GridStack | null>(null);
  const { metrics, isLoading, error } = useBillingMetrics(context);

  // tRPC mutations for saving layout
  const saveLayoutMutation = trpc.saveDashboardLayout.useMutation();
  const getLayoutQuery = trpc.getDashboardLayout.useQuery({ 
    dashboard: "billing",
    tenantId: context.tenantId,
  } as any);

  // Expose save function to parent component
  const saveCurrentLayout = () => {
    if (gridInstanceRef.current) {
      const layout = gridInstanceRef.current.save(false) as any[];
      console.log('Manually saving billing layout:', layout);
      console.log('Billing layout type:', typeof layout, 'Is array:', Array.isArray(layout));
      saveLayoutMutation.mutate({
        dashboard: "billing",
        layout: layout,
        tenantId: context.tenantId,
      }, {
        onSuccess: () => {
          console.log('Billing layout saved successfully');
        },
        onError: (error) => {
          console.error('Failed to save billing layout:', error);
        }
      });
    }
  };

  // Expose save function to window for debugging
  useEffect(() => {
    (window as any).saveBillingLayout = saveCurrentLayout;
  }, [saveCurrentLayout]);

  // Define widget layout for billing dashboard - individual widgets for each metric
  const widgets = [
    // Top row - 4 key metric cards (3 columns each)
    { id: "total-revenue", x: 0, y: 0, w: 3, h: 3, minW: 2, minH: 3 },
    { id: "active-tenants", x: 3, y: 0, w: 3, h: 3, minW: 2, minH: 3 },
    { id: "active-subscriptions", x: 6, y: 0, w: 3, h: 3, minW: 2, minH: 3 },
    { id: "monthly-recurring-revenue", x: 9, y: 0, w: 3, h: 3, minW: 2, minH: 3 },

    // Second row - individual revenue metrics (3 columns each)
    { id: "mrr", x: 0, y: 4, w: 3, h: 3, minW: 2, minH: 3 },
    { id: "arr", x: 3, y: 4, w: 3, h: 3, minW: 2, minH: 3 },
    { id: "arpu", x: 6, y: 4, w: 3, h: 3, minW: 2, minH: 3 },
    { id: "churn-rate", x: 9, y: 4, w: 3, h: 3, minW: 2, minH: 3 },

    // Third row - large charts and insights
    { id: "revenue-trend", x: 0, y: 8, w: 6, h: 8, minW: 4, minH: 6 },
    { id: "revenue-insights", x: 6, y: 8, w: 3, h: 8, minW: 2, minH: 6 },
    { id: "forecasting", x: 9, y: 8, w: 3, h: 8, minW: 2, minH: 6 },

    // Fourth row - subscription and plan data
    { id: "subscription-charts", x: 0, y: 16, w: 6, h: 6, minW: 4, minH: 4 },
    { id: "plan-breakdown", x: 6, y: 16, w: 3, h: 6, minW: 2, minH: 4 },
    { id: "customers-list", x: 9, y: 16, w: 3, h: 6, minW: 2, minH: 4 },
  ];

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
        resizable: isGridMode ? { handles: "se" } : undefined,
        draggable: isGridMode ? { handle: ".card-header, .grid-stack-item-content" } : undefined,
        staticGrid: !isGridMode,
        minRow: 1,
        acceptWidgets: isGridMode
      },
      gridRef.current
    );

    gridInstanceRef.current = grid;

    // Load saved layout if available
    if (getLayoutQuery.data && Array.isArray(getLayoutQuery.data)) {
      try {
        grid.load(getLayoutQuery.data as any);
      } catch (error) {
        console.error('Failed to load saved billing layout:', error);
      }
    }

    // Save layout changes when grid changes
    const saveLayout = () => {
      if (gridInstanceRef.current) {
        const layout = gridInstanceRef.current.save(false) as any[];
        console.log('Saving billing layout:', layout);
        saveLayoutMutation.mutate({
          dashboard: "billing",
          layout: layout,
          tenantId: context.tenantId,
        }, {
          onSuccess: () => {
            console.log('Billing layout saved successfully');
          },
          onError: (error) => {
            console.error('Failed to save billing layout:', error);
          }
        });
      }
    };

    // Listen for grid changes
    grid.on('change', saveLayout);
    grid.on('resizestop', saveLayout);

    return () => {
      grid.off('change');
      grid.off('resizestop');
      if (gridInstanceRef.current) {
        gridInstanceRef.current.destroy(false);
        gridInstanceRef.current = null;
      }
    };
  }, [isMounted, isGridMode, getLayoutQuery.data]);

  // Save layout when exiting grid mode
  useEffect(() => {
    if (!isGridMode && gridInstanceRef.current) {
      const layout = gridInstanceRef.current.save(false) as any[];
      console.log('Saving billing layout on grid mode exit:', layout);
      saveLayoutMutation.mutate({
        dashboard: "billing",
        layout: layout,
        tenantId: context.tenantId,
      }, {
        onSuccess: () => {
          console.log('Billing layout saved on grid mode exit');
        },
        onError: (error) => {
          console.error('Failed to save billing layout on grid mode exit:', error);
        }
      });
    }
  }, [isGridMode, saveLayoutMutation, context.tenantId]);

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

  return (
    <div className={`space-y-6 ${className}`}>
      <div 
        ref={gridRef} 
        className="grid-stack"
        data-variant={isGridMode ? "gridstack" : "default"}
      >
        {/* Individual Metric Cards - similar to system health dashboard */}
        {/* Total Revenue */}
        <div 
          className="grid-stack-item" 
          data-gs-id="total-revenue"
          data-gs-x="0" 
          data-gs-y="0" 
          data-gs-w="3" 
          data-gs-h="3"
          data-gs-min-w="2"
          data-gs-min-h="3"
        >
          <div className="grid-stack-item-content">
            {isLoading ? (
              <Card className="animate-pulse">
                <CardHeader className="space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                </CardHeader>
                <CardContent>
                  <div className="h-8 bg-gray-200 rounded w-1/2"></div>
                </CardContent>
              </Card>
            ) : error ? (
              <Card className="border-red-200">
                <CardContent className="pt-6">
                  <div className="text-center text-red-600 text-sm">
                    Error loading revenue
                  </div>
                </CardContent>
              </Card>
            ) : (
              <MetricCard
                title="Total Revenue"
                value={`£${(metrics.totalRevenue / 100).toLocaleString()}`}
                change={{
                  value: metrics.revenueGrowth,
                  type: metrics.revenueGrowth > 0 ? 'increase' : 'decrease',
                  period: 'last month'
                }}
                icon={DollarSign}
              />
            )}
          </div>
        </div>

        {/* Active Tenants/Customers */}
        <div 
          className="grid-stack-item" 
          data-gs-id="active-tenants"
          data-gs-x="3" 
          data-gs-y="0" 
          data-gs-w="3" 
          data-gs-h="3"
          data-gs-min-w="2"
          data-gs-min-h="3"
        >
          <div className="grid-stack-item-content">
            {isLoading ? (
              <Card className="animate-pulse">
                <CardHeader className="space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                </CardHeader>
                <CardContent>
                  <div className="h-8 bg-gray-200 rounded w-1/2"></div>
                </CardContent>
              </Card>
            ) : error ? (
              <Card className="border-red-200">
                <CardContent className="pt-6">
                  <div className="text-center text-red-600 text-sm">
                    Error loading data
                  </div>
                </CardContent>
              </Card>
            ) : (
              <MetricCard
                title={context.type === 'platform' ? "Active Tenants" : "Active Customers"}
                value={context.type === 'platform' ? metrics.activeTenants : metrics.activeCustomers}
                change={{
                  value: context.type === 'platform' ? metrics.tenantGrowth : metrics.customerGrowth,
                  type: (context.type === 'platform' ? metrics.tenantGrowth : metrics.customerGrowth) > 0 ? 'increase' : 'decrease',
                  period: 'last month'
                }}
                icon={context.type === 'platform' ? Building : Users}
              />
            )}
          </div>
        </div>

        {/* Active Subscriptions */}
        <div 
          className="grid-stack-item" 
          data-gs-id="active-subscriptions"
          data-gs-x="6" 
          data-gs-y="0" 
          data-gs-w="3" 
          data-gs-h="3"
          data-gs-min-w="2"
          data-gs-min-h="3"
        >
          <div className="grid-stack-item-content">
            {isLoading ? (
              <Card className="animate-pulse">
                <CardHeader className="space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                </CardHeader>
                <CardContent>
                  <div className="h-8 bg-gray-200 rounded w-1/2"></div>
                </CardContent>
              </Card>
            ) : error ? (
              <Card className="border-red-200">
                <CardContent className="pt-6">
                  <div className="text-center text-red-600 text-sm">
                    Error loading subscriptions
                  </div>
                </CardContent>
              </Card>
            ) : (
              <MetricCard
                title="Active Subscriptions"
                value={metrics.activeSubscriptions}
                change={{
                  value: metrics.subscriptionGrowth,
                  type: metrics.subscriptionGrowth > 0 ? 'increase' : 'decrease',
                  period: 'last month'
                }}
                icon={CreditCard}
              />
            )}
          </div>
        </div>

        {/* Monthly Recurring Revenue */}
        <div 
          className="grid-stack-item" 
          data-gs-id="monthly-recurring-revenue"
          data-gs-x="9" 
          data-gs-y="0" 
          data-gs-w="3" 
          data-gs-h="3"
          data-gs-min-w="2"
          data-gs-min-h="3"
        >
          <div className="grid-stack-item-content">
            {isLoading ? (
              <Card className="animate-pulse">
                <CardHeader className="space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                </CardHeader>
                <CardContent>
                  <div className="h-8 bg-gray-200 rounded w-1/2"></div>
                </CardContent>
              </Card>
            ) : error ? (
              <Card className="border-red-200">
                <CardContent className="pt-6">
                  <div className="text-center text-red-600 text-sm">
                    Error loading MRR
                  </div>
                </CardContent>
              </Card>
            ) : (
              <MetricCard
                title="Monthly Recurring Revenue"
                value={`£${(metrics.mrr / 100).toLocaleString()}`}
                change={{
                  value: metrics.mrrGrowth,
                  type: metrics.mrrGrowth > 0 ? 'increase' : 'decrease',
                  period: 'last month'
                }}
                icon={Calendar}
              />
            )}
          </div>
        </div>

        {/* Individual Revenue Metric Widgets */}
        
        {/* MRR Widget */}
        <div 
          className="grid-stack-item" 
          data-gs-id="mrr"
          data-gs-x="0" 
          data-gs-y="4" 
          data-gs-w="3" 
          data-gs-h="3"
          data-gs-min-w="2"
          data-gs-min-h="3"
        >
          <div className="grid-stack-item-content">
            {isLoading ? (
              <Card className="animate-pulse">
                <CardHeader className="space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                </CardHeader>
                <CardContent>
                  <div className="h-8 bg-gray-200 rounded w-1/2"></div>
                </CardContent>
              </Card>
            ) : error ? (
              <Card className="border-red-200">
                <CardContent className="pt-6">
                  <div className="text-center text-red-600 text-sm">
                    Error loading MRR
                  </div>
                </CardContent>
              </Card>
            ) : (
              <MetricCard
                title="Monthly Recurring Revenue"
                value={`£${(metrics.mrr / 100).toLocaleString()}`}
                change={{
                  value: metrics.mrrGrowth,
                  type: metrics.mrrGrowth > 0 ? 'increase' : 'decrease',
                  period: 'last month'
                }}
                icon={DollarSign}
              />
            )}
          </div>
        </div>

        {/* ARR Widget */}
        <div 
          className="grid-stack-item" 
          data-gs-id="arr"
          data-gs-x="3" 
          data-gs-y="4" 
          data-gs-w="3" 
          data-gs-h="3"
          data-gs-min-w="2"
          data-gs-min-h="3"
        >
          <div className="grid-stack-item-content">
            {isLoading ? (
              <Card className="animate-pulse">
                <CardHeader className="space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                </CardHeader>
                <CardContent>
                  <div className="h-8 bg-gray-200 rounded w-1/2"></div>
                </CardContent>
              </Card>
            ) : error ? (
              <Card className="border-red-200">
                <CardContent className="pt-6">
                  <div className="text-center text-red-600 text-sm">
                    Error loading ARR
                  </div>
                </CardContent>
              </Card>
            ) : (
              <MetricCard
                title="Annual Recurring Revenue"
                value={`£${(metrics.mrr * 12 / 100).toLocaleString()}`}
                change={{
                  value: metrics.mrrGrowth,
                  type: metrics.mrrGrowth > 0 ? 'increase' : 'decrease',
                  period: 'last month'
                }}
                icon={Calendar}
              />
            )}
          </div>
        </div>

        {/* ARPU Widget */}
        <div 
          className="grid-stack-item" 
          data-gs-id="arpu"
          data-gs-x="6" 
          data-gs-y="4" 
          data-gs-w="3" 
          data-gs-h="3"
          data-gs-min-w="2"
          data-gs-min-h="3"
        >
          <div className="grid-stack-item-content">
            {isLoading ? (
              <Card className="animate-pulse">
                <CardHeader className="space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                </CardHeader>
                <CardContent>
                  <div className="h-8 bg-gray-200 rounded w-1/2"></div>
                </CardContent>
              </Card>
            ) : error ? (
              <Card className="border-red-200">
                <CardContent className="pt-6">
                  <div className="text-center text-red-600 text-sm">
                    Error loading ARPU
                  </div>
                </CardContent>
              </Card>
            ) : (
              <MetricCard
                title="Average Revenue Per User"
                value={`£${(metrics.totalRevenue / metrics.activeCustomers / 100).toLocaleString()}`}
                change={{
                  value: metrics.revenueGrowth,
                  type: metrics.revenueGrowth > 0 ? 'increase' : 'decrease',
                  period: 'last month'
                }}
                icon={TrendingUp}
              />
            )}
          </div>
        </div>

        {/* Churn Rate Widget */}
        <div 
          className="grid-stack-item" 
          data-gs-id="churn-rate"
          data-gs-x="9" 
          data-gs-y="4" 
          data-gs-w="3" 
          data-gs-h="3"
          data-gs-min-w="2"
          data-gs-min-h="3"
        >
          <div className="grid-stack-item-content">
            {isLoading ? (
              <Card className="animate-pulse">
                <CardHeader className="space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                </CardHeader>
                <CardContent>
                  <div className="h-8 bg-gray-200 rounded w-1/2"></div>
                </CardContent>
              </Card>
            ) : error ? (
              <Card className="border-red-200">
                <CardContent className="pt-6">
                  <div className="text-center text-red-600 text-sm">
                    Error loading churn rate
                  </div>
                </CardContent>
              </Card>
            ) : (
              <MetricCard
                title="Churn Rate"
                value="2.5%"
                change={{
                  value: -0.5,
                  type: 'increase',
                  period: 'last month'
                }}
                icon={TrendingDown}
              />
            )}
          </div>
        </div>

        {/* Revenue Trend Chart Widget */}
        <div 
          className="grid-stack-item" 
          data-gs-id="revenue-trend"
          data-gs-x="0" 
          data-gs-y="8" 
          data-gs-w="6" 
          data-gs-h="8"
          data-gs-min-w="4"
          data-gs-min-h="6"
        >
          <div className="grid-stack-item-content">
            <Card>
              <CardHeader>
                <CardTitle>Revenue Trend</CardTitle>
                <CardDescription>Monthly revenue over time</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="h-64 bg-gray-200 animate-pulse rounded"></div>
                ) : error ? (
                  <div className="h-64 flex items-center justify-center text-red-600">
                    Error loading chart
                  </div>
                ) : (
                  <div className="h-64">
                    {/* Revenue trend chart would go here */}
                    <div className="h-full flex items-center justify-center text-gray-500">
                      Revenue Trend Chart
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Revenue Insights Widget */}
        <div 
          className="grid-stack-item" 
          data-gs-id="revenue-insights"
          data-gs-x="6" 
          data-gs-y="8" 
          data-gs-w="3" 
          data-gs-h="8"
          data-gs-min-w="2"
          data-gs-min-h="6"
        >
          <div className="grid-stack-item-content">
            <Card>
              <CardHeader>
                <CardTitle>Revenue Insights</CardTitle>
                <CardDescription>Key performance indicators</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="space-y-3">
                    {[...Array(4)].map((_, i) => (
                      <div key={i} className="h-4 bg-gray-200 animate-pulse rounded"></div>
                    ))}
                  </div>
                ) : error ? (
                  <div className="text-center text-red-600 text-sm">
                    Error loading insights
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="text-sm">
                      <div className="font-medium">Growth Rate</div>
                      <div className="text-green-600">+{metrics.revenueGrowth}%</div>
                    </div>
                    <div className="text-sm">
                      <div className="font-medium">Customer Count</div>
                      <div>{metrics.activeCustomers}</div>
                    </div>
                    <div className="text-sm">
                      <div className="font-medium">Avg. Subscription</div>
                      <div>£{(metrics.totalRevenue / metrics.activeCustomers / 100).toLocaleString()}</div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Forecasting Widget */}
        <div 
          className="grid-stack-item" 
          data-gs-id="forecasting"
          data-gs-x="9" 
          data-gs-y="8" 
          data-gs-w="3" 
          data-gs-h="8"
          data-gs-min-w="2"
          data-gs-min-h="6"
        >
          <div className="grid-stack-item-content">
            <Card>
              <CardHeader>
                <CardTitle>Forecasting</CardTitle>
                <CardDescription>Revenue projections</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="space-y-3">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="h-4 bg-gray-200 animate-pulse rounded"></div>
                    ))}
                  </div>
                ) : error ? (
                  <div className="text-center text-red-600 text-sm">
                    Error loading forecast
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="text-sm">
                      <div className="font-medium">Next Month</div>
                      <div className="text-blue-600">£{((metrics.mrr * 1.1) / 100).toLocaleString()}</div>
                    </div>
                    <div className="text-sm">
                      <div className="font-medium">Next Quarter</div>
                      <div className="text-blue-600">£{((metrics.mrr * 12 * 1.05) / 100).toLocaleString()}</div>
                    </div>
                    <div className="text-sm">
                      <div className="font-medium">Next Year</div>
                      <div className="text-blue-600">£{((metrics.mrr * 12 * 1.2) / 100).toLocaleString()}</div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Subscription Charts Widget */}
        <div 
          className="grid-stack-item" 
          data-gs-id="subscription-charts"
          data-gs-x="0" 
          data-gs-y="16" 
          data-gs-w="6" 
          data-gs-h="6"
          data-gs-min-w="4"
          data-gs-min-h="4"
        >
          <div className="grid-stack-item-content">
            <SubscriptionCharts context={context} />
          </div>
        </div>

        {/* Plan Breakdown Widget */}
        <div 
          className="grid-stack-item" 
          data-gs-id="plan-breakdown"
          data-gs-x="6" 
          data-gs-y="16" 
          data-gs-w="3" 
          data-gs-h="6"
          data-gs-min-w="2"
          data-gs-min-h="4"
        >
          <div className="grid-stack-item-content">
            <PlanBreakdown context={context} />
          </div>
        </div>

        {/* Customers List Widget */}
        <div 
          className="grid-stack-item" 
          data-gs-id="customers-list"
          data-gs-x="9" 
          data-gs-y="16" 
          data-gs-w="3" 
          data-gs-h="6"
          data-gs-min-w="2"
          data-gs-min-h="4"
        >
          <div className="grid-stack-item-content">
            <CustomersList context={context} />
          </div>
        </div>
      </div>
    </div>
  );
}
