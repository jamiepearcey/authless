import { trpc } from '@/lib/trpc';
import { DashboardContext } from '../billing/BillingDashboard';

export interface RevenueMetrics {
  mrr: number;
  mrrGrowth: number;
  arr: number;
  arrGrowth: number;
  arpu: number;
  arpuGrowth: number;
  churnRate: number;
  churnRateChange: number;
  revenueGrowthRate: number;
  clv: number; // Customer Lifetime Value
  revenuePerPlan: number;
  projectedNextMonth: number;
  projectedNextQuarter: number;
  projectedEndOfYear: number;
  forecastConfidence: number;
}

export interface RevenueChartDataPoint {
  month: string;
  mrr: number;
  totalRevenue: number;
}

export function useRevenueMetrics(context: DashboardContext) {
  const billingQuery = trpc.getBillingMetrics.useQuery({
    type: context.type,
    timeRange: context.timeRange,
    ...(context.tenantId && { tenantId: context.tenantId }),
  });
  
  const subscriptionQuery = trpc.getSubscriptionMetrics.useQuery({
    type: context.type,
    timeRange: context.timeRange,
    ...(context.tenantId && { tenantId: context.tenantId }),
  });

  // Derive revenue metrics from real billing data
  const mrr = billingQuery.data?.mrr || 0;
  const mrrGrowth = billingQuery.data?.mrrGrowth || 0;
  const activeCustomers = billingQuery.data?.activeCustomers || 0;
  
  const metrics: RevenueMetrics = {
    mrr,
    mrrGrowth,
    arr: mrr * 12,
    arrGrowth: mrrGrowth, // ARR growth same as MRR growth
    arpu: activeCustomers > 0 ? mrr / activeCustomers : 0,
    arpuGrowth: mrrGrowth, // ARPU growth follows MRR growth when customer count is stable
    churnRate: 0, // TODO: Calculate actual churn rate from subscription cancellations
    churnRateChange: 0, // TODO: Calculate actual churn rate change
    revenueGrowthRate: billingQuery.data?.revenueGrowth || 0,
    clv: activeCustomers > 0 ? (mrr * 12) / (activeCustomers * 0.05) : 0, // Simple CLV calculation assuming 5% churn
    revenuePerPlan: 0, // Will be calculated from plan metrics
    projectedNextMonth: mrr * (1 + (mrrGrowth / 100)),
    projectedNextQuarter: mrr * 3 * (1 + (mrrGrowth / 100)),
    projectedEndOfYear: mrr * 12 * (1 + (mrrGrowth / 100)),
    forecastConfidence: Math.max(50, Math.min(95, 100 - Math.abs(mrrGrowth))), // Confidence based on growth stability
  };
  
  // Convert subscription data to chart format
  const chartData: RevenueChartDataPoint[] = subscriptionQuery.data?.map(item => ({
    month: item.date,
    mrr: item.revenue,
    totalRevenue: item.revenue,
  })) || [];

  return { 
    metrics, 
    chartData, 
    isLoading: billingQuery.isLoading || subscriptionQuery.isLoading,
    error: billingQuery.error || subscriptionQuery.error,
  };
}