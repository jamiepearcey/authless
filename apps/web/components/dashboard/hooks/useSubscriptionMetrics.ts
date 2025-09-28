import { trpc } from '@/lib/trpc';
import { DashboardContext } from '../billing/BillingDashboard';

export interface ChartDataPoint {
  date: string;
  amount?: number;
  count?: number;
}

export interface SubscriptionChartData {
  revenue: ChartDataPoint[];
  subscriptions: ChartDataPoint[];
  customers: ChartDataPoint[];
}

export function useSubscriptionMetrics(context: DashboardContext, timeRange: string) {
  const query = trpc.getSubscriptionMetrics.useQuery({
    type: context.type,
    timeRange: context.timeRange,
    ...(context.tenantId && { tenantId: context.tenantId }),
  });

  // Convert the tRPC response format to expected chart data format
  const chartData: SubscriptionChartData = {
    revenue: query.data?.map(item => ({ date: item.date, amount: item.revenue })) || [],
    subscriptions: query.data?.map(item => ({ date: item.date, count: item.subscriptions })) || [],
    customers: query.data?.map(item => ({ date: item.date, count: item.customers })) || [],
  };

  return {
    chartData,
    isLoading: query.isLoading,
    error: query.error,
  };
}