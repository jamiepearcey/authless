'use client';

import React, { useRef } from 'react';
import 'flexlayout-react/style/light.css';
import { Layout, Model, TabNode } from 'flexlayout-react';
import { Card, CardContent, CardHeader, CardTitle } from '@ui/base';
import { Badge } from '@ui/base';
import { Button } from '@ui/base';
import { Input } from '@ui/base';
import { Search, Filter, MoreVertical, Eye, Edit, Trash2, TrendingUp, TrendingDown, DollarSign, Activity, Users, Clock } from 'lucide-react';

// Define the FlexLayout model
const json = {
  global: {
    tabEnableClose: false,
    tabSetEnableMaximize: true,
  },
  borders: [],
  layout: {
    type: 'row',
    weight: 100,
    children: [
      {
        type: 'col',
        weight: 70,
        children: [
          {
            type: 'tabset',
            weight: 30,
            children: [
              {
                type: 'tab',
                name: 'Metrics Overview',
                component: 'MetricsHeader',
              }
            ]
          },
          {
            type: 'tabset',
            weight: 70,
            children: [
              {
                type: 'tab',
                name: 'Advanced Orders',
                component: 'AdvancedOrdersTable',
              }
            ]
          }
        ]
      },
      {
        type: 'tabset',
        weight: 30,
        children: [
          {
            type: 'tab',
            name: 'Order Details',
            component: 'UltraOrderDetail',
          }
        ]
      }
    ]
  }
};

// Trading Metrics Component
const MetricsHeader = () => {
  const metrics = [
    { label: 'Total Volume', value: '$2.4M', change: '+12.5%', trend: 'up', icon: DollarSign },
    { label: 'Active Orders', value: '1,247', change: '+8.3%', trend: 'up', icon: Activity },
    { label: 'Executed Today', value: '856', change: '-2.1%', trend: 'down', icon: TrendingUp },
    { label: 'Active Traders', value: '342', change: '+15.2%', trend: 'up', icon: Users },
    { label: 'Avg Response Time', value: '12ms', change: '-5.4%', trend: 'down', icon: Clock }
  ];

  return (
    <div className="p-6 bg-gradient-to-br from-slate-50 to-slate-100 min-h-full">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Trading Dashboard</h2>
          <p className="text-slate-600 mt-1">Real-time market overview and performance metrics</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" size="sm">
            Export Data
          </Button>
          <Button size="sm">Refresh</Button>
        </div>
      </div>
      
      <div className="grid grid-cols-5 gap-4">
        {metrics.map((metric, index) => {
          const Icon = metric.icon;
          return (
            <Card key={index} className="backdrop-blur-md bg-white/60 border border-white/20 shadow-lg hover:shadow-xl transition-all duration-200">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-slate-100 rounded-lg">
                      <Icon className="w-4 h-4 text-slate-700" />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-slate-600 uppercase tracking-wide">{metric.label}</p>
                      <p className="text-xl font-bold text-slate-900 mt-1">{metric.value}</p>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1 mt-3">
                  {metric.trend === 'up' ? (
                    <TrendingUp className="w-3 h-3 text-green-500" />
                  ) : (
                    <TrendingDown className="w-3 h-3 text-red-500" />
                  )}
                  <span className={`text-xs font-medium ${
                    metric.trend === 'up' ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {metric.change}
                  </span>
                  <span className="text-xs text-slate-500 ml-1">vs last period</span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

// Advanced Orders Table Component
const AdvancedOrdersTable = () => {
  const orders = [
    {
      id: 'ORD-2024-001',
      type: 'LIMIT',
      symbol: 'AAPL',
      side: 'BUY',
      quantity: 500,
      price: 185.42,
      filled: 350,
      status: 'PARTIALLY_FILLED',
      timestamp: '2024-01-15 09:30:15',
      trader: 'John Smith',
      commission: 2.50
    },
    {
      id: 'ORD-2024-002',
      type: 'MARKET',
      symbol: 'TSLA',
      side: 'SELL',
      quantity: 200,
      price: 242.15,
      filled: 200,
      status: 'FILLED',
      timestamp: '2024-01-15 09:28:43',
      trader: 'Sarah Johnson',
      commission: 1.80
    },
    {
      id: 'ORD-2024-003',
      type: 'STOP_LOSS',
      symbol: 'MSFT',
      side: 'SELL',
      quantity: 750,
      price: 378.90,
      filled: 0,
      status: 'PENDING',
      timestamp: '2024-01-15 09:25:12',
      trader: 'Mike Chen',
      commission: 0.00
    },
    {
      id: 'ORD-2024-004',
      type: 'LIMIT',
      symbol: 'GOOGL',
      side: 'BUY',
      quantity: 100,
      price: 142.85,
      filled: 100,
      status: 'FILLED',
      timestamp: '2024-01-15 09:22:58',
      trader: 'Emily Davis',
      commission: 1.25
    },
    {
      id: 'ORD-2024-005',
      type: 'MARKET',
      symbol: 'AMZN',
      side: 'BUY',
      quantity: 300,
      price: 155.20,
      filled: 150,
      status: 'PARTIALLY_FILLED',
      timestamp: '2024-01-15 09:20:31',
      trader: 'Robert Wilson',
      commission: 1.95
    }
  ];

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      'FILLED': { variant: 'default', className: 'bg-green-100 text-green-800 hover:bg-green-100' },
      'PARTIALLY_FILLED': { variant: 'secondary', className: 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100' },
      'PENDING': { variant: 'outline', className: 'bg-blue-100 text-blue-800 hover:bg-blue-100' },
      'CANCELLED': { variant: 'destructive', className: 'bg-red-100 text-red-800 hover:bg-red-100' }
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig['PENDING'];
    
    return (
      <Badge variant={config.variant as any} className={config.className}>
        {status.replace('_', ' ')}
      </Badge>
    );
  };

  const getSideBadge = (side: string) => {
    return (
      <Badge variant={side === 'BUY' ? 'default' : 'destructive'} className={
        side === 'BUY' 
          ? 'bg-green-100 text-green-800 hover:bg-green-100' 
          : 'bg-red-100 text-red-800 hover:bg-red-100'
      }>
        {side}
      </Badge>
    );
  };

  return (
    <div className="p-6 bg-white min-h-full">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-xl font-semibold text-slate-900">Advanced Orders Management</h3>
          <p className="text-slate-600 mt-1">Monitor and manage all trading orders in real-time</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
            <Input
              placeholder="Search orders..."
              className="pl-9 w-64"
            />
          </div>
          <Button variant="outline" size="sm">
            <Filter className="w-4 h-4 mr-2" />
            Filter
          </Button>
          <Button size="sm">New Order</Button>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">Order ID</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">Type</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">Symbol</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">Side</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-700 uppercase tracking-wider">Quantity</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-700 uppercase tracking-wider">Price</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-700 uppercase tracking-wider">Filled</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-slate-700 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">Trader</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-slate-700 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {orders.map((order) => (
                <tr key={order.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-4">
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-slate-900">{order.id}</span>
                      <span className="text-xs text-slate-500">{order.timestamp}</span>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <Badge variant="outline" className="text-xs">
                      {order.type}
                    </Badge>
                  </td>
                  <td className="px-4 py-4">
                    <span className="text-sm font-semibold text-slate-900">{order.symbol}</span>
                  </td>
                  <td className="px-4 py-4">
                    {getSideBadge(order.side)}
                  </td>
                  <td className="px-4 py-4 text-right text-sm text-slate-900">
                    {order.quantity.toLocaleString()}
                  </td>
                  <td className="px-4 py-4 text-right text-sm font-medium text-slate-900">
                    ${order.price.toFixed(2)}
                  </td>
                  <td className="px-4 py-4 text-right">
                    <div className="flex flex-col items-end">
                      <span className="text-sm font-medium text-slate-900">{order.filled}</span>
                      <span className="text-xs text-slate-500">
                        {((order.filled / order.quantity) * 100).toFixed(1)}%
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-4 text-center">
                    {getStatusBadge(order.status)}
                  </td>
                  <td className="px-4 py-4">
                    <span className="text-sm text-slate-900">{order.trader}</span>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center justify-center gap-1">
                      <Button variant="ghost" size="sm">
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="sm">
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="sm">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// Ultra Order Detail Component  
const UltraOrderDetail = () => {
  const selectedOrder = {
    id: 'ORD-2024-001',
    type: 'LIMIT',
    symbol: 'AAPL',
    side: 'BUY',
    quantity: 500,
    price: 185.42,
    filled: 350,
    status: 'PARTIALLY_FILLED',
    timestamp: '2024-01-15 09:30:15',
    trader: 'John Smith',
    commission: 2.50,
    timeInForce: 'DAY',
    account: 'ACC-12345',
    exchange: 'NASDAQ',
    averagePrice: 184.95,
    lastFillTime: '2024-01-15 09:35:22',
    remainingQuantity: 150,
    totalValue: 92710.00,
    estimatedCommission: 4.63
  };

  return (
    <div className="p-6 bg-slate-50 min-h-full">
      <div className="mb-6">
        <h3 className="text-xl font-semibold text-slate-900 mb-2">Order Details</h3>
        <p className="text-slate-600">Comprehensive view of order #{selectedOrder.id}</p>
      </div>

      <div className="space-y-6">
        {/* Order Summary Card */}
        <Card className="bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg flex items-center justify-between">
              <span>Order Summary</span>
              <Badge variant={selectedOrder.side === 'BUY' ? 'default' : 'destructive'} className={
                selectedOrder.side === 'BUY' 
                  ? 'bg-green-100 text-green-800 hover:bg-green-100' 
                  : 'bg-red-100 text-red-800 hover:bg-red-100'
              }>
                {selectedOrder.side} {selectedOrder.symbol}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-slate-600 uppercase tracking-wide">Order Type</label>
                  <p className="text-sm font-semibold text-slate-900 mt-1">{selectedOrder.type}</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-600 uppercase tracking-wide">Quantity</label>
                  <p className="text-sm font-semibold text-slate-900 mt-1">{selectedOrder.quantity.toLocaleString()} shares</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-600 uppercase tracking-wide">Limit Price</label>
                  <p className="text-sm font-semibold text-slate-900 mt-1">${selectedOrder.price.toFixed(2)}</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-600 uppercase tracking-wide">Time in Force</label>
                  <p className="text-sm font-semibold text-slate-900 mt-1">{selectedOrder.timeInForce}</p>
                </div>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-slate-600 uppercase tracking-wide">Account</label>
                  <p className="text-sm font-semibold text-slate-900 mt-1">{selectedOrder.account}</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-600 uppercase tracking-wide">Exchange</label>
                  <p className="text-sm font-semibold text-slate-900 mt-1">{selectedOrder.exchange}</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-600 uppercase tracking-wide">Trader</label>
                  <p className="text-sm font-semibold text-slate-900 mt-1">{selectedOrder.trader}</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-600 uppercase tracking-wide">Created</label>
                  <p className="text-sm font-semibold text-slate-900 mt-1">{selectedOrder.timestamp}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Execution Status Card */}
        <Card className="bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Execution Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-600">Fill Progress</span>
                <span className="text-sm font-semibold text-slate-900">
                  {selectedOrder.filled} / {selectedOrder.quantity} 
                  ({((selectedOrder.filled / selectedOrder.quantity) * 100).toFixed(1)}%)
                </span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${(selectedOrder.filled / selectedOrder.quantity) * 100}%` }}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-200">
                <div>
                  <label className="text-xs font-medium text-slate-600 uppercase tracking-wide">Filled Quantity</label>
                  <p className="text-lg font-bold text-green-600 mt-1">{selectedOrder.filled.toLocaleString()}</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-600 uppercase tracking-wide">Remaining</label>
                  <p className="text-lg font-bold text-orange-600 mt-1">{selectedOrder.remainingQuantity.toLocaleString()}</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-600 uppercase tracking-wide">Average Price</label>
                  <p className="text-lg font-bold text-slate-900 mt-1">${selectedOrder.averagePrice.toFixed(2)}</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-600 uppercase tracking-wide">Last Fill</label>
                  <p className="text-sm font-semibold text-slate-900 mt-1">{selectedOrder.lastFillTime}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Financial Summary Card */}
        <Card className="bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Financial Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-slate-600 uppercase tracking-wide">Total Value</label>
                <p className="text-xl font-bold text-slate-900 mt-1">${selectedOrder.totalValue.toLocaleString()}</p>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 uppercase tracking-wide">Est. Commission</label>
                <p className="text-xl font-bold text-slate-900 mt-1">${selectedOrder.estimatedCommission.toFixed(2)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex gap-3">
          <Button variant="outline" className="flex-1">
            <Edit className="w-4 h-4 mr-2" />
            Modify Order
          </Button>
          <Button variant="destructive" className="flex-1">
            <Trash2 className="w-4 h-4 mr-2" />
            Cancel Order
          </Button>
        </div>
      </div>
    </div>
  );
};

// Factory function for FlexLayout components
const factory = (node: TabNode) => {
  const component = node.getComponent();
  
  switch (component) {
    case 'MetricsHeader':
      return <MetricsHeader />;
    case 'AdvancedOrdersTable':
      return <AdvancedOrdersTable />;
    case 'UltraOrderDetail':
      return <UltraOrderDetail />;
    default:
      return <div>Component not found: {component}</div>;
  }
};

export default function FlexLayoutTradingDemo() {
  const layoutRef = useRef<Layout>(null);
  const model = Model.fromJson(json);

  return (
    <div className="flexlayout__theme_light" style={{ 
      height: 'calc(100vh - 80px)', 
      position: 'relative' 
    }}>
      <Layout
        ref={layoutRef}
        model={model}
        factory={factory}
      />
    </div>
  );
}