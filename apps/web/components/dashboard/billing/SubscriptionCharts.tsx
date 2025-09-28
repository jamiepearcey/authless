"use client";

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@ui/base';
import { Button } from '@ui/base';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar
} from 'recharts';
import { Calendar, TrendingUp, Users, CreditCard } from 'lucide-react';
import { DashboardContext } from './BillingDashboard';
import { useSubscriptionMetrics } from '../hooks/useSubscriptionMetrics';

interface SubscriptionChartsProps {
  context: DashboardContext;
}

type ChartType = 'revenue' | 'subscriptions' | 'customers';

export function SubscriptionCharts({ context }: SubscriptionChartsProps) {
  const [activeChart, setActiveChart] = useState<ChartType>('revenue');
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d' | '1y'>('30d');
  
  const { chartData, isLoading, error } = useSubscriptionMetrics(context, timeRange);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Subscription Analytics</CardTitle>
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
          <CardTitle>Subscription Analytics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-red-600 py-8">
            Failed to load chart data: {error.message}
          </div>
        </CardContent>
      </Card>
    );
  }

  const formatCurrency = (value: number) => `£${(value / 100).toLocaleString()}`;
  const formatNumber = (value: number) => value.toLocaleString();

  const renderChart = () => {
    switch (activeChart) {
      case 'revenue':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={chartData.revenue}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis 
                dataKey="date" 
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
                formatter={(value: number) => [formatCurrency(value), 'Revenue']}
                labelStyle={{ color: '#374151' }}
                contentStyle={{ 
                  backgroundColor: 'white', 
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px'
                }}
              />
              <Area 
                type="monotone" 
                dataKey="amount" 
                stroke="#3b82f6" 
                strokeWidth={2}
                fill="url(#revenueGradient)" 
              />
              <defs>
                <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                </linearGradient>
              </defs>
            </AreaChart>
          </ResponsiveContainer>
        );

      case 'subscriptions':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData.subscriptions}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis 
                dataKey="date" 
                axisLine={false}
                tickLine={false}
                className="text-xs"
              />
              <YAxis 
                axisLine={false}
                tickLine={false}
                className="text-xs"
                tickFormatter={formatNumber}
              />
              <Tooltip 
                formatter={(value: number) => [formatNumber(value), 'Active Subscriptions']}
                labelStyle={{ color: '#374151' }}
                contentStyle={{ 
                  backgroundColor: 'white', 
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px'
                }}
              />
              <Line 
                type="monotone" 
                dataKey="count" 
                stroke="#10b981" 
                strokeWidth={3}
                dot={{ fill: '#10b981', strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6, fill: '#10b981' }}
              />
            </LineChart>
          </ResponsiveContainer>
        );

      case 'customers':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData.customers}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis 
                dataKey="date" 
                axisLine={false}
                tickLine={false}
                className="text-xs"
              />
              <YAxis 
                axisLine={false}
                tickLine={false}
                className="text-xs"
                tickFormatter={formatNumber}
              />
              <Tooltip 
                formatter={(value: number) => [formatNumber(value), context.type === 'platform' ? 'New Tenants' : 'New Customers']}
                labelStyle={{ color: '#374151' }}
                contentStyle={{ 
                  backgroundColor: 'white', 
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px'
                }}
              />
              <Bar 
                dataKey="count" 
                fill="#8b5cf6"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        );

      default:
        return null;
    }
  };

  const chartConfigs = [
    {
      key: 'revenue' as ChartType,
      label: 'Revenue',
      icon: TrendingUp,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      description: 'Track revenue over time'
    },
    {
      key: 'subscriptions' as ChartType,
      label: 'Subscriptions',
      icon: CreditCard,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      description: 'Active subscription growth'
    },
    {
      key: 'customers' as ChartType,
      label: context.type === 'platform' ? 'Tenants' : 'Customers',
      icon: Users,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      description: context.type === 'platform' ? 'New tenant signups' : 'New customer acquisitions'
    }
  ];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center space-x-2">
              <Calendar className="h-5 w-5" />
              <span>Subscription Analytics</span>
            </CardTitle>
            <CardDescription>
              Track performance metrics over time
            </CardDescription>
          </div>
          
          {/* Time Range Selector */}
          <div className="flex space-x-1 bg-gray-100 rounded-lg p-1">
            {[
              { key: '7d', label: '7D' },
              { key: '30d', label: '30D' },
              { key: '90d', label: '90D' },
              { key: '1y', label: '1Y' }
            ].map((range) => (
              <Button
                key={range.key}
                variant={timeRange === range.key ? "default" : "ghost"}
                size="sm"
                onClick={() => setTimeRange(range.key as any)}
                className="text-xs"
              >
                {range.label}
              </Button>
            ))}
          </div>
        </div>

        {/* Chart Type Selector */}
        <div className="flex space-x-1 bg-gray-50 rounded-lg p-1 mt-4">
          {chartConfigs.map((config) => {
            const Icon = config.icon;
            const isActive = activeChart === config.key;
            
            return (
              <Button
                key={config.key}
                variant={isActive ? "default" : "ghost"}
                size="sm"
                onClick={() => setActiveChart(config.key)}
                className={`flex items-center space-x-2 flex-1 ${
                  isActive ? '' : 'hover:bg-white'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{config.label}</span>
              </Button>
            );
          })}
        </div>
      </CardHeader>

      <CardContent>
        <div className="mb-4">
          <p className="text-sm text-gray-600">
            {chartConfigs.find(c => c.key === activeChart)?.description}
          </p>
        </div>
        
        {renderChart()}
      </CardContent>
    </Card>
  );
}

export default SubscriptionCharts;