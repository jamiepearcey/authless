"use client";

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@ui/base';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Area,
  AreaChart
} from 'recharts';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  CalendarDays,
  Target,
  Percent
} from 'lucide-react';
import { DashboardContext } from './BillingDashboard';
import { useRevenueMetrics } from '../hooks/useRevenueMetrics';

interface RevenueMetricsProps {
  context: DashboardContext;
}

interface MetricCardProps {
  title: string;
  value: string;
  change?: {
    value: number;
    type: 'increase' | 'decrease';
  };
  icon: React.ComponentType<{ className?: string }>;
  description?: string;
}

function MetricCard({ title, value, change, icon: Icon, description }: MetricCardProps) {
  return (
    <Card>
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
            {change.value > 0 ? '+' : ''}{change.value}% from last period
          </div>
        )}
        {description && (
          <p className="text-xs text-gray-500 mt-1">{description}</p>
        )}
      </CardContent>
    </Card>
  );
}

export function RevenueMetrics({ context }: RevenueMetricsProps) {
  const { metrics, chartData, isLoading, error } = useRevenueMetrics(context);

  if (isLoading) {
    return (
      <div className="space-y-6">
        {/* Metrics Cards Skeleton */}
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

        {/* Chart Skeleton */}
        <Card className="animate-pulse">
          <CardHeader>
            <div className="h-6 bg-gray-200 rounded w-1/4"></div>
          </CardHeader>
          <CardContent>
            <div className="h-64 bg-gray-200 rounded"></div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-red-200">
        <CardContent className="pt-6">
          <div className="text-center text-red-600">
            Failed to load revenue metrics: {error.message}
          </div>
        </CardContent>
      </Card>
    );
  }

  const formatCurrency = (value: number) => `£${(value / 100).toLocaleString()}`;

  return (
    <div className="space-y-6">
      {/* Revenue Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Monthly Recurring Revenue"
          value={formatCurrency(metrics.mrr)}
          change={{
            value: metrics.mrrGrowth,
            type: metrics.mrrGrowth > 0 ? 'increase' : 'decrease'
          }}
          icon={DollarSign}
          description="Predictable monthly income"
        />

        <MetricCard
          title="Annual Recurring Revenue"
          value={formatCurrency(metrics.arr)}
          change={{
            value: metrics.arrGrowth,
            type: metrics.arrGrowth > 0 ? 'increase' : 'decrease'
          }}
          icon={CalendarDays}
          description="Projected yearly revenue"
        />

        <MetricCard
          title="Average Revenue Per User"
          value={formatCurrency(metrics.arpu)}
          change={{
            value: metrics.arpuGrowth,
            type: metrics.arpuGrowth > 0 ? 'increase' : 'decrease'
          }}
          icon={Target}
          description="Revenue per customer"
        />

        <MetricCard
          title="Churn Rate"
          value={`${metrics.churnRate.toFixed(1)}%`}
          change={{
            value: metrics.churnRateChange,
            type: metrics.churnRateChange < 0 ? 'increase' : 'decrease' // Lower churn is better
          }}
          icon={Percent}
          description="Monthly customer loss rate"
        />
      </div>

      {/* Revenue Trend Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <TrendingUp className="h-5 w-5" />
            <span>Revenue Trend</span>
          </CardTitle>
          <CardDescription>
            Monthly recurring revenue and total revenue over time
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <AreaChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis 
                dataKey="month" 
                axisLine={false}
                tickLine={false}
                className="text-xs"
              />
              <YAxis 
                axisLine={false}
                tickLine={false}
                className="text-xs"
                tickFormatter={formatCurrency}
              />
              <Tooltip 
                formatter={(value: number, name: string) => [
                  formatCurrency(value), 
                  name === 'mrr' ? 'MRR' : 'Total Revenue'
                ]}
                labelStyle={{ color: '#374151' }}
                contentStyle={{ 
                  backgroundColor: 'white', 
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px'
                }}
              />
              
              {/* Total Revenue Area */}
              <Area 
                type="monotone" 
                dataKey="totalRevenue" 
                stroke="#8b5cf6" 
                strokeWidth={2}
                fill="url(#totalRevenueGradient)" 
                name="Total Revenue"
              />
              
              {/* MRR Line */}
              <Line 
                type="monotone" 
                dataKey="mrr" 
                stroke="#3b82f6" 
                strokeWidth={3}
                dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6, fill: '#3b82f6' }}
                name="MRR"
              />
              
              <defs>
                <linearGradient id="totalRevenueGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.2}/>
                  <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                </linearGradient>
              </defs>
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Additional Revenue Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Revenue Insights</CardTitle>
            <CardDescription>Key performance indicators</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
              <div>
                <p className="text-sm font-medium text-blue-900">Revenue Growth Rate</p>
                <p className="text-xs text-blue-700">Month-over-month growth</p>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-blue-900">
                  {metrics.revenueGrowthRate > 0 ? '+' : ''}{metrics.revenueGrowthRate.toFixed(1)}%
                </p>
              </div>
            </div>

            <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
              <div>
                <p className="text-sm font-medium text-green-900">Customer Lifetime Value</p>
                <p className="text-xs text-green-700">Average value per customer</p>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-green-900">
                  {formatCurrency(metrics.clv)}
                </p>
              </div>
            </div>

            <div className="flex justify-between items-center p-3 bg-purple-50 rounded-lg">
              <div>
                <p className="text-sm font-medium text-purple-900">Revenue per Plan</p>
                <p className="text-xs text-purple-700">Average across all plans</p>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-purple-900">
                  {formatCurrency(metrics.revenuePerPlan)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Forecasting</CardTitle>
            <CardDescription>Projected revenue based on current trends</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Next Month (Projected)</span>
                <span className="font-medium">{formatCurrency(metrics.projectedNextMonth)}</span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Next Quarter (Projected)</span>
                <span className="font-medium">{formatCurrency(metrics.projectedNextQuarter)}</span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">End of Year (Projected)</span>
                <span className="font-medium">{formatCurrency(metrics.projectedEndOfYear)}</span>
              </div>
            </div>

            <div className="border-t pt-4 mt-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-900">Confidence Level</span>
                <div className="flex items-center space-x-2">
                  <div className="w-20 bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full" 
                      style={{ width: `${metrics.forecastConfidence}%` }}
                    ></div>
                  </div>
                  <span className="text-sm font-medium">{metrics.forecastConfidence}%</span>
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Based on {context.timeRange} of historical data
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default RevenueMetrics;