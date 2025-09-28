"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@ui/base';
import { 
  DollarSign, 
  Users, 
  CreditCard, 
  TrendingUp,
  TrendingDown,
  Building,
  Calendar
} from 'lucide-react';
import { DashboardContext } from './BillingDashboard';
import { useBillingMetrics } from '../hooks/useBillingMetrics';

interface BillingOverviewProps {
  context: DashboardContext;
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

export function BillingOverview({ context }: BillingOverviewProps) {
  const { metrics, isLoading, error } = useBillingMetrics(context);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="space-y-2">
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            </CardHeader>
            <CardContent>
              <div className="h-8 bg-gray-200 rounded w-1/2"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-red-200">
        <CardContent className="pt-6">
          <div className="text-center text-red-600">
            Failed to load billing metrics: {error.message}
          </div>
        </CardContent>
      </Card>
    );
  }

  const isPlatform = context.type === 'platform';

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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

      <MetricCard
        title={isPlatform ? "Active Tenants" : "Active Customers"}
        value={isPlatform ? metrics.activeTenants : metrics.activeCustomers}
        change={{
          value: isPlatform ? metrics.tenantGrowth : metrics.customerGrowth,
          type: (isPlatform ? metrics.tenantGrowth : metrics.customerGrowth) > 0 ? 'increase' : 'decrease',
          period: 'last month'
        }}
        icon={isPlatform ? Building : Users}
      />

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
    </div>
  );
}

export default BillingOverview;