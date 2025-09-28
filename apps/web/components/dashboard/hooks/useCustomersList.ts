import { trpc } from '@/lib/trpc';
import { DashboardContext } from '../billing/BillingDashboard';

export interface Customer {
  id: string;
  name: string;
  email?: string;
  status: 'active' | 'trial' | 'churned' | 'overdue' | 'cancelled';
  planName?: string;
  totalRevenue: number;
  subscriptionCount: number;
  createdAt: string;
  lastPaymentAt?: string;
  isEnterprise?: boolean;
}

export interface CustomersListParams {
  context: DashboardContext;
  searchTerm: string;
  filter: string;
  sortBy: string;
  page: number;
  pageSize: number;
}

export interface CustomersListResult {
  customers: Customer[];
  totalCount: number;
  isLoading: boolean;
  error: Error | null;
}

export function useCustomersList({
  context,
  searchTerm,
  filter,
  sortBy,
  page,
  pageSize
}: CustomersListParams): CustomersListResult {
  const query = trpc.getCustomersList.useQuery({
    type: context.type,
    timeRange: context.timeRange,
    ...(context.tenantId && { tenantId: context.tenantId }),
    search: searchTerm,
    limit: pageSize,
    offset: (page - 1) * pageSize,
  });

  // Convert tRPC response to expected Customer format
  const customers: Customer[] = query.data?.items.map(item => ({
    id: item.id,
    name: item.name,
    email: item.email,
    status: item.status as 'active' | 'trial' | 'churned' | 'overdue' | 'cancelled',
    planName: undefined, // TODO: Get from subscription/order data
    totalRevenue: 0, // TODO: Calculate from orders - would need additional query
    subscriptionCount: item.subscriptions,
    createdAt: typeof item.joinedAt === 'string' ? item.joinedAt : (item.joinedAt as Date).toISOString(),
    lastPaymentAt: typeof item.lastActive === 'string' ? item.lastActive : (item.lastActive as Date).toISOString(),
    isEnterprise: item.subscriptions > 5, // Simple heuristic: >5 subscriptions = enterprise
  })) || [];

  return {
    customers,
    totalCount: query.data?.total || 0,
    isLoading: query.isLoading,
    error: query.error as Error | null,
  };
}