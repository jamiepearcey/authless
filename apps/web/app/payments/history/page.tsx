"use client";

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@ui/base';
import { Button } from '@ui/base';
import { Badge } from '@ui/base';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@ui/base';
import { 
  CreditCard, 
  Calendar,
  Receipt,
  ExternalLink,
  Download,
  ArrowLeft,
  Loader2,
  AlertCircle,
  ShoppingBag,
  CheckCircle,
  Clock,
  XCircle
} from 'lucide-react';

interface PaymentItem {
  id: string;
  type: 'payment_intent' | 'checkout_payment';
  amount: number;
  currency: string;
  status: string;
  created: number;
  description?: string;
  receiptUrl?: string;
  orderId?: string;
  metadata?: Record<string, string>;
}

interface OrderItem {
  id: string;
  type: 'order';
  amount: number;
  currency: string;
  status: string;
  paymentStatus: string;
  created: number;
  description?: string;
  customerEmail?: string;
  paymentIntentId?: string;
  metadata?: Record<string, string>;
  canRetry?: boolean;
}

interface HistoryData {
  payments: PaymentItem[];
  orders: OrderItem[];
  summary: {
    totalPayments: number;
    totalOrders: number;
    totalSpent: number;
    successfulPayments: number;
  };
}

export default function PaymentHistoryPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [historyData, setHistoryData] = useState<HistoryData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'orders' | 'payments'>('orders');

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
      return;
    }

    if (session) {
      fetchPaymentHistory();
    }
  }, [session, status, router]);

  const fetchPaymentHistory = async () => {
    try {
      setIsLoading(true);
      
      const response = await fetch('/api/payments/history');
      const data = await response.json();
      
      if (data.success) {
        setHistoryData(data.data);
      } else {
        setError(data.error?.message || 'Failed to fetch payment history');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch payment history');
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(amount / 100);
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-GB', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'succeeded':
      case 'paid':
      case 'complete':
        return 'bg-green-100 text-green-800';
      case 'processing':
      case 'open':
        return 'bg-yellow-100 text-yellow-800';
      case 'requires_payment_method':
      case 'unpaid':
        return 'bg-red-100 text-red-800';
      case 'canceled':
      case 'expired':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-blue-100 text-blue-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'succeeded':
      case 'paid':
      case 'complete':
        return <CheckCircle className="h-6 w-6 text-green-600" />;
      case 'processing':
      case 'open':
        return <Clock className="h-6 w-6 text-yellow-600" />;
      case 'canceled':
      case 'expired':
      case 'requires_payment_method':
      case 'unpaid':
        return <XCircle className="h-6 w-6 text-red-600" />;
      default:
        return <Receipt className="h-6 w-6 text-blue-600" />;
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
    return null; // Will redirect to signin
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center mb-4">
            <Button
              onClick={() => router.back()}
              variant="outline"
              size="sm"
              className="mr-4"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </div>
          
          <div className="flex items-center mb-2">
            <CreditCard className="h-8 w-8 text-blue-600 mr-3" />
            <h1 className="text-3xl font-bold text-gray-900">Payment History</h1>
          </div>
          <p className="text-gray-600">
            View and manage your payment transactions
          </p>
        </div>

        {isLoading ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
              <p>Loading your payment history...</p>
            </CardContent>
          </Card>
        ) : error ? (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="p-6">
              <div className="flex items-center">
                <AlertCircle className="h-5 w-5 text-red-600 mr-2" />
                <span className="text-red-800">{error}</span>
              </div>
            </CardContent>
          </Card>
        ) : !historyData || (historyData.orders.length === 0 && historyData.payments.length === 0) ? (
          <Card>
            <CardContent className="p-8 text-center">
              <CreditCard className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No payments yet</h3>
              <p className="text-gray-600 mb-4">
                You haven't made any payments yet. When you do, they'll appear here.
              </p>
              <Button onClick={() => router.push('/payments')}>
                Make a Payment
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'orders' | 'payments')}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="orders" className="flex items-center space-x-2">
                <ShoppingBag className="h-4 w-4" />
                <span>Orders ({historyData.orders.length})</span>
              </TabsTrigger>
              <TabsTrigger value="payments" className="flex items-center space-x-2">
                <CreditCard className="h-4 w-4" />
                <span>Payments ({historyData.payments.length})</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="orders" className="space-y-4 mt-6">
              {historyData.orders.length === 0 ? (
                <Card>
                  <CardContent className="p-8 text-center">
                    <ShoppingBag className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">No orders yet</h3>
                    <p className="text-gray-600 mb-4">When you place orders, they'll appear here.</p>
                  </CardContent>
                </Card>
              ) : (
                historyData.orders.map((order) => (
                  <Card key={order.id}>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className="p-3 bg-indigo-100 rounded-full">
                            {getStatusIcon(order.status)}
                          </div>
                          <div>
                            <div className="flex items-center space-x-2">
                              <h3 className="font-semibold text-gray-900">
                                {order.description || 'Order'}
                              </h3>
                              <Badge className={`${getStatusColor(order.paymentStatus)} border-0`}>
                                {order.paymentStatus}
                              </Badge>
                            </div>
                            <p className="text-lg font-bold text-indigo-600 mt-1">
                              {formatCurrency(order.amount, order.currency)}
                            </p>
                            <div className="flex items-center text-xs text-gray-500 mt-2">
                              <Calendar className="h-3 w-3 mr-1" />
                              {formatDate(order.created)}
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          {order.canRetry && (
                            <Button
                              onClick={() => router.push(`/checkout/${order.id}`)}
                              className="bg-orange-600 hover:bg-orange-700"
                              size="sm"
                            >
                              <CreditCard className="h-4 w-4 mr-2" />
                              Retry Payment
                            </Button>
                          )}
                          {order.paymentIntentId && order.paymentStatus === 'paid' && (
                            <Button
                              onClick={() => router.push(`/payments/receipt/${order.paymentIntentId}`)}
                              variant="outline"
                              size="sm"
                            >
                              <Receipt className="h-4 w-4 mr-2" />
                              Receipt
                            </Button>
                          )}
                          <Button
                            onClick={() => router.push(`/checkout/${order.id}?view=details`)}
                            variant="outline"
                            size="sm"
                          >
                            <ExternalLink className="h-4 w-4 mr-2" />
                            Details
                          </Button>
                        </div>
                      </div>
                      
                      <div className="mt-4 pt-4 border-t border-gray-200">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                          <div>
                            <span className="text-gray-500">Order ID:</span>
                            <p className="font-mono text-xs">{order.id}</p>
                          </div>
                          <div>
                            <span className="text-gray-500">Plan:</span>
                            <p className="font-semibold">{order.metadata?.plan || 'N/A'}</p>
                          </div>
                          <div>
                            <span className="text-gray-500">Payment Status:</span>
                            <Badge className={`${getStatusColor(order.paymentStatus)} border-0 ml-2`}>
                              {order.paymentStatus}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </TabsContent>

            <TabsContent value="payments" className="space-y-4 mt-6">
              {historyData.payments.length === 0 ? (
                <Card>
                  <CardContent className="p-8 text-center">
                    <CreditCard className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">No payments yet</h3>
                    <p className="text-gray-600 mb-4">When payments are processed, they'll appear here.</p>
                  </CardContent>
                </Card>
              ) : (
                historyData.payments.map((payment) => (
                  <Card key={payment.id}>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className="p-3 bg-green-100 rounded-full">
                            {getStatusIcon(payment.status)}
                          </div>
                          <div>
                            <div className="flex items-center space-x-2">
                              <h3 className="font-semibold text-gray-900">
                                {formatCurrency(payment.amount, payment.currency)}
                              </h3>
                              <Badge className={`${getStatusColor(payment.status)} border-0`}>
                                {payment.status}
                              </Badge>
                            </div>
                            <p className="text-sm text-gray-600 mt-1">
                              {payment.description || 'Payment'}
                            </p>
                            <div className="flex items-center text-xs text-gray-500 mt-2">
                              <Calendar className="h-3 w-3 mr-1" />
                              {formatDate(payment.created)}
                            </div>
                            {payment.orderId && (
                              <p className="text-xs text-gray-500 mt-1">
                                Related to order: {payment.orderId}
                              </p>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <Button
                            onClick={() => window.print()}
                            variant="outline"
                            size="sm"
                          >
                            <Download className="h-4 w-4 mr-2" />
                            Receipt
                          </Button>
                          <Button
                            onClick={() => router.push(`/payments/receipt/${payment.id}`)}
                            variant="outline"
                            size="sm"
                          >
                            <ExternalLink className="h-4 w-4 mr-2" />
                            Details
                          </Button>
                        </div>
                      </div>
                      
                      <div className="mt-4 pt-4 border-t border-gray-200">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                          <div>
                            <span className="text-gray-500">Payment ID:</span>
                            <p className="font-mono text-xs">{payment.id}</p>
                          </div>
                          <div>
                            <span className="text-gray-500">Type:</span>
                            <p className="font-semibold">{payment.type.replace('_', ' ')}</p>
                          </div>
                          <div>
                            <span className="text-gray-500">Status:</span>
                            <Badge className={`${getStatusColor(payment.status)} border-0 ml-2`}>
                              {payment.status}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </TabsContent>
          </Tabs>
        )}

        {/* Summary Card */}
        {historyData && (historyData.orders.length > 0 || historyData.payments.length > 0) && (
          <Card className="mt-8">
            <CardHeader>
              <CardTitle>Summary</CardTitle>
              <CardDescription>
                Your activity overview
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-indigo-50 rounded-lg">
                  <p className="text-2xl font-bold text-indigo-600">
                    {historyData.summary.totalOrders}
                  </p>
                  <p className="text-sm text-indigo-700">Total Orders</p>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <p className="text-2xl font-bold text-green-600">
                    {historyData.summary.successfulPayments}
                  </p>
                  <p className="text-sm text-green-700">Successful Payments</p>
                </div>
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <p className="text-2xl font-bold text-blue-600">
                    {formatCurrency(historyData.summary.totalSpent, 'gbp')}
                  </p>
                  <p className="text-sm text-blue-700">Total Spent</p>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <p className="text-2xl font-bold text-gray-600">
                    {historyData.summary.totalPayments}
                  </p>
                  <p className="text-sm text-gray-700">Total Transactions</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}