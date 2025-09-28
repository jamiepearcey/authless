import { trpc } from '@/lib/trpc';
import { DashboardContext } from '../billing/BillingDashboard';

export interface PlanMetric {
  planId: string;
  planName: string;
  subscriberCount: number;
  totalRevenue: number;
  averageRevenue: number;
  growthRate: number;
  churnRate: number;
  frequency: string;
  isActive: boolean;
}

export function usePlanMetrics(context: DashboardContext) {
  const query = trpc.getPlanMetrics.useQuery({
    type: context.type,
    timeRange: context.timeRange,
    ...(context.tenantId && { tenantId: context.tenantId }),
  });

  // Convert tRPC response to expected interface format
  const planData = query.data?.map(item => ({
    planId: item.planName.toLowerCase().replace(/\s+/g, '-'),
    planName: item.planName,
    subscriberCount: item.subscriberCount,
    totalRevenue: item.totalRevenue,
    averageRevenue: item.subscriberCount > 0 ? item.totalRevenue / item.subscriberCount : 0,
    growthRate: item.growthRate,
    churnRate: 0, // TODO: Calculate actual churn rate per plan
    frequency: 'MONTHLY', // TODO: Get actual frequency from order configuration
    isActive: item.subscriberCount > 0, // Plan is active if it has subscribers
  })) || [];

  return {
    planData,
    isLoading: query.isLoading,
    error: query.error,
  };
}