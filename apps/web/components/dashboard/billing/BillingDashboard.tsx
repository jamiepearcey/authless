"use client";

import React from 'react';
import { BillingOverview } from './BillingOverview';
import { SubscriptionCharts } from './SubscriptionCharts';
import { PlanBreakdown } from './PlanBreakdown';
import { CustomersList } from './CustomersList';
import { RevenueMetrics } from './RevenueMetrics';

export interface DashboardContext {
  type: 'platform' | 'tenant';
  tenantId?: string;
  timeRange: 'week' | 'month' | 'quarter' | 'year';
}

export interface BillingDashboardProps {
  context: DashboardContext;
  className?: string;
}

export function BillingDashboard({ context, className = '' }: BillingDashboardProps) {
  const isplatform = context.type === 'platform';
  
  return (
    <div className={`space-y-6 ${className}`}>

      {/* Key Metrics Overview */}
      <BillingOverview context={context} />

      {/* Revenue Metrics */}
      <RevenueMetrics context={context} />

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SubscriptionCharts context={context} />
        <PlanBreakdown context={context} />
      </div>

      {/* Customers/Tenants List */}
      <CustomersList context={context} />
    </div>
  );
}

export default BillingDashboard;