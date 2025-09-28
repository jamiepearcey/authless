"use client";

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@ui/base';
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">
            {isplatform ? 'Platform Billing Dashboard' : 'Tenant Billing Dashboard'}
          </h2>
          <p className="text-gray-600 mt-1">
            {isplatform 
              ? 'Overview of all tenant subscriptions and revenue' 
              : 'Your subscription analytics and customer insights'
            }
          </p>
        </div>
      </div>

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