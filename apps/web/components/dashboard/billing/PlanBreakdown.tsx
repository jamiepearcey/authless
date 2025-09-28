"use client";

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@ui/base';
import { Button } from '@ui/base';
import { Badge } from '@ui/base';
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid
} from 'recharts';
import { 
  PieChart as PieChartIcon, 
  BarChart3, 
  Users, 
  DollarSign,
  TrendingUp,
  Package
} from 'lucide-react';
import { DashboardContext } from './BillingDashboard';
import { PlanMetric, usePlanMetrics } from '../hooks/usePlanMetrics';

interface PlanBreakdownProps {
  context: DashboardContext;
}

type ViewType = 'pie' | 'bar';
type MetricType = 'subscribers' | 'revenue';

const CHART_COLORS = [
  '#3b82f6', // blue-500
  '#10b981', // emerald-500
  '#8b5cf6', // violet-500
  '#f59e0b', // amber-500
  '#ef4444', // red-500
  '#06b6d4', // cyan-500
  '#84cc16', // lime-500
  '#f97316', // orange-500
];

export function PlanBreakdown({ context }: PlanBreakdownProps) {
  const [viewType, setViewType] = useState<ViewType>('pie');
  const [metricType, setMetricType] = useState<MetricType>('subscribers');
  
  const { planData, isLoading, error } = usePlanMetrics(context);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Plan Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border-red-200">
        <CardHeader>
          <CardTitle>Plan Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-red-600 py-8">
            Failed to load plan data: {error.message}
          </div>
        </CardContent>
      </Card>
    );
  }

  const formatCurrency = (value: number) => `£${(value / 100).toLocaleString()}`;
  const formatNumber = (value: number) => value.toLocaleString();

  const chartData = planData.map((plan: PlanMetric, index: number) => ({
    ...plan,
    color: CHART_COLORS[index % CHART_COLORS.length],
    value: metricType === 'subscribers' ? plan.subscriberCount : plan.totalRevenue
  }));

  const totalValue = chartData.reduce((sum: number, plan: any) => sum + plan.value, 0);

  const renderPieChart = () => (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie
          data={chartData}
          cx="50%"
          cy="50%"
          innerRadius={60}
          outerRadius={120}
          paddingAngle={2}
          dataKey="value"
        >
          {chartData.map((entry: any, index: number) => (
            <Cell key={`cell-${index}`} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip 
          formatter={(value: number) => [
            metricType === 'subscribers' ? formatNumber(value) : formatCurrency(value),
            metricType === 'subscribers' ? 'Subscribers' : 'Revenue'
          ]}
          contentStyle={{ 
            backgroundColor: 'white', 
            border: '1px solid #e5e7eb',
            borderRadius: '8px'
          }}
        />
      </PieChart>
    </ResponsiveContainer>
  );

  const renderBarChart = () => (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
        <XAxis 
          dataKey="planName" 
          axisLine={false}
          tickLine={false}
          className="text-xs"
          angle={-45}
          textAnchor="end"
          height={80}
        />
        <YAxis 
          axisLine={false}
          tickLine={false}
          className="text-xs"
          tickFormatter={metricType === 'subscribers' ? formatNumber : formatCurrency}
        />
        <Tooltip 
          formatter={(value: number) => [
            metricType === 'subscribers' ? formatNumber(value) : formatCurrency(value),
            metricType === 'subscribers' ? 'Subscribers' : 'Revenue'
          ]}
          contentStyle={{ 
            backgroundColor: 'white', 
            border: '1px solid #e5e7eb',
            borderRadius: '8px'
          }}
        />
        <Bar 
          dataKey="value" 
          fill="#3b82f6"
          radius={[4, 4, 0, 0]}
        />
      </BarChart>
    </ResponsiveContainer>
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center space-x-2">
              <Package className="h-5 w-5" />
              <span>Plan Breakdown</span>
            </CardTitle>
            <CardDescription>
              Distribution of {metricType === 'subscribers' ? 'subscribers' : 'revenue'} across plans
            </CardDescription>
          </div>

          {/* View Type Selector */}
          <div className="flex space-x-1 bg-gray-100 rounded-lg p-1">
            <Button
              variant={viewType === 'pie' ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewType('pie')}
              className="text-xs"
            >
              <PieChartIcon className="h-3 w-3 mr-1" />
              Pie
            </Button>
            <Button
              variant={viewType === 'bar' ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewType('bar')}
              className="text-xs"
            >
              <BarChart3 className="h-3 w-3 mr-1" />
              Bar
            </Button>
          </div>
        </div>

        {/* Metric Type Selector */}
        <div className="flex space-x-1 bg-gray-50 rounded-lg p-1 mt-4">
          <Button
            variant={metricType === 'subscribers' ? "default" : "ghost"}
            size="sm"
            onClick={() => setMetricType('subscribers')}
            className="flex items-center space-x-2 flex-1"
          >
            <Users className="h-4 w-4" />
            <span>Subscribers</span>
          </Button>
          <Button
            variant={metricType === 'revenue' ? "default" : "ghost"}
            size="sm"
            onClick={() => setMetricType('revenue')}
            className="flex items-center space-x-2 flex-1"
          >
            <DollarSign className="h-4 w-4" />
            <span>Revenue</span>
          </Button>
        </div>
      </CardHeader>

      <CardContent>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Chart */}
          <div className="lg:col-span-2">
            {viewType === 'pie' ? renderPieChart() : renderBarChart()}
          </div>

          {/* Legend and Stats */}
          <div className="space-y-4">
            <div className="space-y-3">
              <h4 className="font-medium text-gray-900">Plan Details</h4>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {chartData.map((plan: any) => {
                  const percentage = totalValue > 0 ? (plan.value / totalValue) * 100 : 0;
                  
                  return (
                    <div key={plan.planName} className="flex items-center justify-between p-2 rounded-lg bg-gray-50">
                      <div className="flex items-center space-x-3">
                        <div 
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: plan.color }}
                        />
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {plan.planName}
                          </p>
                          <p className="text-xs text-gray-500">
                            {metricType === 'subscribers' 
                              ? `${formatNumber(plan.subscriberCount)} subscribers`
                              : formatCurrency(plan.totalRevenue)
                            }
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-gray-900">
                          {percentage.toFixed(1)}%
                        </p>
                        <Badge 
                          variant={plan.growthRate > 0 ? "default" : "secondary"}
                          className="text-xs"
                        >
                          <TrendingUp className="h-3 w-3 mr-1" />
                          {plan.growthRate > 0 ? '+' : ''}{plan.growthRate.toFixed(1)}%
                        </Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Summary Stats */}
            <div className="border-t pt-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Total Plans:</span>
                <span className="font-medium">{chartData.length}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">
                  Total {metricType === 'subscribers' ? 'Subscribers' : 'Revenue'}:
                </span>
                <span className="font-medium">
                  {metricType === 'subscribers' ? formatNumber(totalValue) : formatCurrency(totalValue)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Most Popular:</span>
                <span className="font-medium">
                  {chartData.length > 0 ? chartData.reduce((prev: any, current: any) => 
                    prev.subscriberCount > current.subscriberCount ? prev : current
                  ).planName : 'N/A'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default PlanBreakdown;