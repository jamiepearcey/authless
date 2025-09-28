"use client";

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@ui/base';
import { Button } from '@ui/base';
import { Badge } from '@ui/base';
import { 
  ShoppingCart, 
  Calendar,
  Receipt,
  ExternalLink,
  Loader2,
  AlertCircle,
  CheckCircle,
  Clock,
  XCircle,
  RefreshCw,
  User,
  Building
} from 'lucide-react';
import { trpc } from "@/lib/trpc";

interface Order {
  id: string;
  orderNumber: string;
  description?: string | null;
  totalAmount: number;
  currency: string;
  status: string;
  isSubscription: boolean;
  subscriptionFrequency?: string | null;
  createdAt: string;
  invoices: Invoice[];
  subscription?: {
    id: string;
    status: string;
    frequency: string;
    nextBillingDate: string;
  } | null;
  tenant?: {
    id: string;
    name: string;
    slug: string;
  } | null;
  user?: {
    id: string;
    name: string;
    email: string;
  } | null;
}

interface Invoice {
  id: string;
  invoiceNumber: string;
  amount: number;
  status: string;
  dueDate: string;
  checkoutUrl?: string;
}

export default function OrderHistoryPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
      return;
    }
  }, [status, router]);

  // Fetch orders with invoices and payments
  const { 
    data: ordersData, 
    isLoading: ordersLoading, 
    error: ordersError,
    refetch: refetchOrders 
  } = trpc.getOrders.useQuery({
    limit: 50,
    offset: 0,
  }, {
    enabled: !!session,
  });


  const formatCurrency = (amount: number, currency?: string) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: (currency || 'GBP').toUpperCase(),
    }).format(amount / 100);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
      case 'succeeded':
      case 'paid':
        return 'bg-green-100 text-green-800';
      case 'processing':
      case 'confirmed':
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'draft':
        return 'bg-blue-100 text-blue-800';
      case 'failed':
      case 'cancelled':
      case 'void':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
      case 'succeeded':
      case 'paid':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'processing':
      case 'confirmed':
      case 'pending':
        return <Clock className="h-5 w-5 text-yellow-600" />;
      case 'failed':
      case 'cancelled':
      case 'void':
        return <XCircle className="h-5 w-5 text-red-600" />;
      default:
        return <Receipt className="h-5 w-5 text-blue-600" />;
    }
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center space-x-3">
                <ShoppingCart className="h-8 w-8 text-indigo-600" />
                <span>Order History</span>
              </h1>
              <p className="text-gray-600 mt-2">
                View your orders with nested invoices and payments
              </p>
            </div>
            <Button onClick={() => refetchOrders()} variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>

        {/* Orders List */}
        {ordersLoading ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
              <p>Loading your orders...</p>
            </CardContent>
          </Card>
        ) : ordersError ? (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="p-6">
              <div className="flex items-center">
                <AlertCircle className="h-5 w-5 text-red-600 mr-2" />
                <span className="text-red-800">Failed to load orders</span>
              </div>
            </CardContent>
          </Card>
        ) : !ordersData?.orders?.length ? (
          <Card>
            <CardContent className="p-8 text-center">
              <ShoppingCart className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No orders yet</h3>
              <p className="text-gray-600 mb-4">
                When you place orders, they'll appear here with their invoices and payments.
              </p>
              <Button onClick={() => router.push('/checkout')}>
                Create Order
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {ordersData.orders.map((order: any) => (
              <Card key={order.id} className="overflow-hidden">
                <CardContent className="p-0">
                  
                  {/* Order Header */}
                  <div 
                    className="w-full cursor-pointer"
                    onClick={() => router.push(`/orders/${order.id}`)}
                  >
                    <div className="flex items-center justify-between p-6 hover:bg-gray-50 transition-colors">
                      <div className="flex items-center space-x-4">
                        <div className="p-3 bg-indigo-100 rounded-full">
                          {getStatusIcon(order.status)}
                        </div>
                        <div className="text-left">
                          <div className="flex items-center space-x-2 mb-1">
                            <h3 className="text-lg font-semibold text-gray-900">
                              Order #{order.orderNumber}
                            </h3>
                            <Badge className={`${getStatusColor(order.status)} border-0`}>
                              {order.status}
                            </Badge>
                            {order.isSubscription && (
                              <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                                Subscription
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center space-x-4 text-sm text-gray-600">
                            <span className="font-semibold text-lg text-indigo-600">
                              {formatCurrency(order.totalAmount, order.currency)}
                            </span>
                            <span className="flex items-center">
                              <Calendar className="h-3 w-3 mr-1" />
                              {formatDate(order.createdAt)}
                            </span>
                            {order.tenant ? (
                              <span className="flex items-center">
                                <Building className="h-3 w-3 mr-1" />
                                {order.tenant.name}
                              </span>
                            ) : order.user && (
                              <span className="flex items-center">
                                <User className="h-3 w-3 mr-1" />
                                {order.user.name || order.user.email}
                              </span>
                            )}
                          </div>
                          {order.description && (
                            <p className="text-sm text-gray-600 mt-1">{order.description}</p>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-3">
                        <div className="text-right text-sm text-gray-500">
                          <div>{order.invoices?.length || 0} invoices</div>
                        </div>
                        <ExternalLink className="h-5 w-5 text-gray-400" />
                      </div>
                    </div>
                  </div>

                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Summary */}
        {ordersData?.orders?.length && (
          <Card className="mt-8">
            <CardHeader>
              <CardTitle>Summary</CardTitle>
              <CardDescription>Your order activity overview</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-indigo-50 rounded-lg">
                  <p className="text-2xl font-bold text-indigo-600">
                    {ordersData.total || 0}
                  </p>
                  <p className="text-sm text-indigo-700">Total Orders</p>
                </div>
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <p className="text-2xl font-bold text-blue-600">
                    {ordersData.orders.reduce((sum: number, order: any) => sum + (order.invoices?.length || 0), 0)}
                  </p>
                  <p className="text-sm text-blue-700">Total Invoices</p>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <p className="text-2xl font-bold text-green-600">
                    {ordersData.orders.filter((order: any) => order.status === 'PROCESSING' || order.status === 'COMPLETED').length}
                  </p>
                  <p className="text-sm text-green-700">Active Orders</p>
                </div>
                <div className="text-center p-4 bg-purple-50 rounded-lg">
                  <p className="text-2xl font-bold text-purple-600">
                    {ordersData.orders.filter((order: any) => order.status === 'COMPLETED').length}
                  </p>
                  <p className="text-sm text-purple-700">Completed Orders</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}