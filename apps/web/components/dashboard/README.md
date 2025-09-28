# Billing & Subscription Dashboard

A comprehensive, reusable dashboard system for displaying billing analytics, subscription metrics, and customer insights. Built with React, TypeScript, and Recharts.

## Features

- **Dual Context Support**: Works for both platform admin (viewing all tenants) and tenant admin (viewing customers)
- **Interactive Charts**: Revenue trends, subscription analytics, and plan breakdowns using Recharts
- **Real-time Metrics**: Key performance indicators with growth tracking
- **Customer Management**: Searchable, filterable customer/tenant listings
- **Responsive Design**: Mobile-friendly with Tailwind CSS
- **Type-safe**: Full TypeScript support throughout

## Components Structure

```
components/dashboard/
├── billing/                    # Main dashboard components
│   ├── BillingDashboard.tsx   # Root dashboard component
│   ├── BillingOverview.tsx    # Key metrics cards
│   ├── SubscriptionCharts.tsx # Interactive charts (revenue, subscriptions, customers)
│   ├── PlanBreakdown.tsx      # Plan usage analytics with pie/bar charts
│   ├── CustomersList.tsx      # Customer/tenant listing with search & filters
│   ├── RevenueMetrics.tsx     # Revenue analytics and forecasting
│   └── index.ts               # Component exports
├── hooks/                     # Custom hooks for data fetching
│   ├── useBillingMetrics.ts   # Overview metrics hook
│   ├── useSubscriptionMetrics.ts # Chart data hook
│   ├── usePlanMetrics.ts      # Plan breakdown hook
│   ├── useCustomersList.ts    # Customer listing hook
│   ├── useRevenueMetrics.ts   # Revenue analytics hook
│   └── index.ts               # Hook exports
└── index.ts                   # Main exports
```

## Usage

### Platform Admin Dashboard

```tsx
import { BillingDashboard, DashboardContext } from '@/components/dashboard';

const context: DashboardContext = {
  type: 'platform',
  timeRange: 'month',
};

<BillingDashboard context={context} />
```

### Tenant Admin Dashboard

```tsx
import { BillingDashboard, DashboardContext } from '@/components/dashboard';

const context: DashboardContext = {
  type: 'tenant',
  tenantId: 'tenant-123',
  timeRange: 'quarter',
};

<BillingDashboard context={context} />
```

## Dashboard Context

The `DashboardContext` determines what data is displayed:

```typescript
interface DashboardContext {
  type: 'platform' | 'tenant';
  tenantId?: string;        // Required when type is 'tenant'
  timeRange: 'week' | 'month' | 'quarter' | 'year';
}
```

## Key Components

### BillingOverview
Displays key metrics with growth indicators:
- Total Revenue
- Active Customers/Tenants
- Active Subscriptions
- Monthly Recurring Revenue (MRR)

### SubscriptionCharts
Interactive charts with multiple views:
- **Revenue Chart**: Area chart showing revenue over time
- **Subscriptions Chart**: Line chart of active subscriptions
- **Customers Chart**: Bar chart of new customer acquisitions
- Time range selector (7D, 30D, 90D, 1Y)

### PlanBreakdown
Plan analytics with dual visualization:
- **Pie Chart**: Visual distribution of subscribers/revenue by plan
- **Bar Chart**: Comparative view of plan performance
- Toggle between subscriber count and revenue metrics
- Growth rate indicators for each plan

### CustomersList
Comprehensive customer/tenant management:
- Search functionality
- Status filters (Active, Trial, Churned, Overdue)
- Sorting options (Revenue, Name, Date, Last Payment)
- Pagination support
- Direct links to customer detail pages

### RevenueMetrics
Advanced revenue analytics:
- MRR, ARR, ARPU, Churn Rate
- Revenue trend charts with MRR overlay
- Customer Lifetime Value (CLV)
- Revenue forecasting with confidence levels

## Data Integration

### Mock Data
All hooks include mock data fallbacks for development and testing. The mock data simulates realistic business metrics and growth patterns.

### API Integration
To connect to real data, implement these API endpoints:

- `GET /api/dashboard/billing-metrics` - Overview metrics
- `GET /api/dashboard/subscription-metrics` - Chart data
- `GET /api/dashboard/plan-metrics` - Plan breakdown
- `GET /api/dashboard/customers-list` - Customer listing
- `GET /api/dashboard/revenue-metrics` - Revenue analytics

### Query Parameters
All endpoints support these query parameters:
- `type`: 'platform' or 'tenant'
- `tenantId`: Required when type is 'tenant'
- `timeRange`: 'week', 'month', 'quarter', 'year'
- Additional parameters per endpoint (search, filters, pagination)

## Styling

The dashboard uses:
- **Tailwind CSS** for styling
- **Lucide React** for icons
- **Recharts** for data visualization
- **shadcn/ui** components for consistent UI elements

## Integration Examples

### Platform Admin Page
```typescript
// apps/web/app/admin/page.tsx
<Tabs defaultValue="billing">
  <TabsContent value="billing">
    <BillingDashboard context={{ type: 'platform', timeRange: 'month' }} />
  </TabsContent>
</Tabs>
```

### Tenant Admin Page
```typescript
// apps/web/app/tenant/admin/page.tsx
<Tabs defaultValue="analytics">
  <TabsContent value="analytics">
    <BillingDashboard 
      context={{ 
        type: 'tenant', 
        tenantId: params.tenantId,
        timeRange: 'month' 
      }} 
    />
  </TabsContent>
</Tabs>
```

## Extensibility

The dashboard is designed for easy extension:

1. **Add new metrics**: Extend the hooks with additional data points
2. **Custom charts**: Add new chart types to the components
3. **New contexts**: Support additional user types beyond platform/tenant
4. **Real-time updates**: Add WebSocket support to the hooks
5. **Export functionality**: Add PDF/CSV export capabilities

## Dependencies

- **recharts**: "^2.x" - Chart library
- **lucide-react**: Icons
- **@ui/base**: Internal UI component library
- **next**: React framework
- **tailwindcss**: Styling

## Performance Considerations

- Uses React.memo for chart components
- Debounced search in customer listings
- Pagination for large datasets
- Lazy loading for chart data
- Error boundaries for graceful failures