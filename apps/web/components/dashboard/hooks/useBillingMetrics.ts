import { trpc } from '@/lib/trpc';
import { DashboardContext } from '../billing/BillingDashboard';

export interface BillingMetrics {
  totalRevenue: number;
  revenueGrowth: number;
  activeTenants: number;
  tenantGrowth: number;
  activeCustomers: number;
  customerGrowth: number;
  activeSubscriptions: number;
  subscriptionGrowth: number;
  mrr: number;
  mrrGrowth: number;
}

export function useBillingMetrics(context: DashboardContext) {
  const query = trpc.getBillingMetrics.useQuery({
    type: context.type,
    timeRange: context.timeRange,
    ...(context.tenantId && { tenantId: context.tenantId }),
  });

  return {
    metrics: query.data || {
      totalRevenue: 0,
      revenueGrowth: 0,
      activeTenants: 0,
      tenantGrowth: 0,
      activeCustomers: 0,
      customerGrowth: 0,
      activeSubscriptions: 0,
      subscriptionGrowth: 0,
      mrr: 0,
      mrrGrowth: 0,
    },
    isLoading: query.isLoading,
    error: query.error,
  };
}