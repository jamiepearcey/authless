"use client";

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@ui/base';
import { Button } from '@ui/base';
import { Badge } from '@ui/base';
import { 
  ShoppingCart, 
  Calendar,
  Receipt,
  Download,
  ArrowLeft,
  Loader2,
  AlertCircle,
  CheckCircle,
  Clock,
  XCircle,
  CreditCard,
  FileText,
  RefreshCw,
  User,
  Building,
  Printer,
  FileDown
} from 'lucide-react';
import { BreadcrumbNavigation } from "@/components/BreadcrumbNavigation";
import { SubscriptionCancellationModal } from "@/components/SubscriptionCancellationModal";
import { trpc } from "@/lib/trpc";
import Link from "next/link";

interface Order {
  id: string;
  orderNumber: string;
  description?: string;
  totalAmount: number;
  currency: string;
  status: string;
  isSubscription: boolean;
  subscriptionFrequency?: string;
  createdAt: string;
  updatedAt: string;
  metadata?: Record<string, any> | null;
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
  // Guest checkout information
  guestName?: string;
  guestEmail?: string;
  // Billing information
  billingCompanyName?: string;
  billingVatNumber?: string;
  billingAddressLine1?: string;
  billingAddressLine2?: string;
  billingCity?: string;
  billingState?: string;
  billingPostalCode?: string;
  billingCountry?: string;
}

interface Invoice {
  id: string;
  invoiceNumber: string;
  amount: number;
  currency: string;
  status: string;
  dueDate: string;
  createdAt: string;
  description?: string;
  payments?: Payment[];
}

interface Payment {
  id: string;
  amount: number;
  currency: string;
  status: string;
  paymentIntentId?: string;
  createdAt: string;
}

export default function OrderDetailPage() {
  const { status } = useSession();
  const router = useRouter();
  const params = useParams();
  const orderId = params.orderId as string;
  const [showCancellationModal, setShowCancellationModal] = useState(false);


  // Fetch order details
  const { data: order, isLoading, error } = trpc.getOrder.useQuery(
    { id: orderId },
    { enabled: !!orderId }
  ) as { data: Order | undefined; isLoading: boolean; error: any };

  // Update order status mutation
  const updateOrderStatusMutation = trpc.updateOrderStatus.useMutation({
    onSuccess: () => {
      // Refetch order data to get updated status
      window.location.reload();
    },
    onError: (error: any) => {
      console.error('Failed to update order status:', error);
      alert('Failed to complete payment. Please try again.');
    },
  });

  // Create checkout session for invoice payment
  const createCheckoutSessionMutation = trpc.createCheckoutSession.useMutation({
    onSuccess: (result) => {
      // Redirect to Stripe checkout
      window.location.href = result.checkoutUrl;
    },
    onError: (error: any) => {
      console.error('Failed to create checkout session:', error);
      alert('Failed to create payment session. Please try again.');
    },
  });

  // Cancel subscription mutation
  const cancelSubscriptionMutation = trpc.cancelOrder.useMutation({
    onSuccess: () => {
      // Refetch order data to get updated status
      window.location.reload();
    },
    onError: (error: any) => {
      console.error('Failed to cancel subscription:', error);
      alert('Failed to cancel subscription. Please try again.');
    },
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

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      DRAFT: { color: 'bg-gray-100 text-gray-800', icon: Clock },
      PENDING: { color: 'bg-yellow-100 text-yellow-800', icon: Clock },
      CONFIRMED: { color: 'bg-blue-100 text-blue-800', icon: CheckCircle },
      PROCESSING: { color: 'bg-blue-100 text-blue-800', icon: RefreshCw },
      COMPLETED: { color: 'bg-green-100 text-green-800', icon: CheckCircle },
      CANCELLED: { color: 'bg-red-100 text-red-800', icon: XCircle },
      FAILED: { color: 'bg-red-100 text-red-800', icon: XCircle },
      ACTIVE: { color: 'bg-green-100 text-green-800', icon: CheckCircle },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.PENDING;
    const Icon = config.icon;

    return (
      <Badge className={`${config.color} flex items-center space-x-1`}>
        <Icon className="h-3 w-3" />
        <span>{status}</span>
      </Badge>
    );
  };

  const getPaymentStatusBadge = (status: string) => {
    const statusConfig = {
      DRAFT: { color: 'bg-gray-100 text-gray-800', icon: Clock },
      PENDING: { color: 'bg-yellow-100 text-yellow-800', icon: Clock },
      PROCESSING: { color: 'bg-blue-100 text-blue-800', icon: RefreshCw },
      COMPLETED: { color: 'bg-green-100 text-green-800', icon: CheckCircle },
      PAID: { color: 'bg-green-100 text-green-800', icon: CheckCircle },
      SENT: { color: 'bg-blue-100 text-blue-800', icon: Clock },
      OVERDUE: { color: 'bg-red-100 text-red-800', icon: XCircle },
      FAILED: { color: 'bg-red-100 text-red-800', icon: XCircle },
      CANCELLED: { color: 'bg-gray-100 text-gray-800', icon: XCircle },
      VOID: { color: 'bg-gray-100 text-gray-800', icon: XCircle },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.PENDING;
    const Icon = config.icon;

    return (
      <Badge className={`${config.color} flex items-center space-x-1`}>
        <Icon className="h-3 w-3" />
        <span>{status === 'DRAFT' ? 'PROFORMA' : status}</span>
      </Badge>
    );
  };

  const handleInvoicePayment = async (invoice: Invoice) => {
    if (!invoice || createCheckoutSessionMutation.isPending) return;
    
    // Prevent payment for cancelled subscriptions
    if (order?.isSubscription && order?.subscription?.status === 'CANCELLED') {
      alert('Cannot process payment for a cancelled subscription.');
      return;
    }
    
    try {
      const baseUrl = window.location.origin;
      const successUrl = `${baseUrl}/payments/success?session_id={CHECKOUT_SESSION_ID}`;
      const cancelUrl = `${baseUrl}/orders/${orderId}`;
      
      await createCheckoutSessionMutation.mutateAsync({
        invoiceId: invoice.id,
        successUrl,
        cancelUrl,
      });
    } catch (error) {
      console.error('Failed to create checkout session:', error);
    }
  };

  const handleSubscriptionCancellation = async (reason: string, feedback?: string) => {
    if (!order?.id) return;
    
    await cancelSubscriptionMutation.mutateAsync({
      id: order.id,
      reason,
      // Include feedback in the reason if provided
      ...(feedback && { reason: `${reason}: ${feedback}` })
    });
    
    setShowCancellationModal(false);
  };

  const isActiveSubscription = order?.isSubscription && 
    order?.subscription?.status === 'ACTIVE' && 
    order?.status !== 'CANCELLED' &&
    (order?.status === 'PROCESSING' || order?.status === 'CONFIRMED');

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (status === 'unauthenticated') {
    router.push('/auth/signin');
    return null;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Order Not Found</h2>
          <p className="text-gray-600 mb-4">The order you're looking for doesn't exist or you don't have permission to view it.</p>
          <Button onClick={() => router.push('/orders/history')}>
            Back to Orders
          </Button>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Order Not Found</h2>
          <p className="text-gray-600 mb-4">The order you're looking for doesn't exist.</p>
          <Button onClick={() => router.push('/orders/history')}>
            Back to Orders
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <style jsx global>{`
        @media print {
          .print\\:hidden { display: none !important; }
          .print\\:block { display: block !important; }
          .print\\:text-black { color: black !important; }
          body { 
            background: white !important; 
            -webkit-print-color-adjust: exact;
          }
          .bg-gray-50, .bg-blue-50, .bg-yellow-50, .bg-green-50 { 
            background: white !important; 
          }
          .shadow-lg, .shadow { box-shadow: none !important; }
          .border { border: 1px solid #e5e7eb !important; }
          .text-indigo-600, .text-blue-600, .text-green-600 { 
            color: black !important; 
            font-weight: bold !important;
          }
          
          /* Print-specific invoice styling */
          .print-invoice-header {
            border-bottom: 2px solid #000;
            padding-bottom: 20px;
            margin-bottom: 30px;
          }
          
          .print-invoice-section {
            margin-bottom: 25px;
            page-break-inside: avoid;
          }
          
          .print-payment-status {
            font-weight: bold;
            text-transform: uppercase;
          }
          
          .print-total {
            font-size: 18px;
            font-weight: bold;
            border-top: 2px solid #000;
            padding-top: 10px;
          }
        }
      `}</style>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          {/* Breadcrumb Navigation */}
          <div className="flex items-center space-x-4 mb-4">
            <Link 
              href="/orders/history"
              className="inline-flex items-center text-indigo-600 hover:text-indigo-800 transition-colors"
            >
              <ArrowLeft className="h-5 w-5 mr-2" />
              Back to Orders
            </Link>
            <div className="h-6 w-px bg-gray-300" />
            <BreadcrumbNavigation
              items={[
                { label: "Orders", href: "/orders/history" },
                { label: "Order Details", current: true },
              ]}
              showHome={false}
            />
          </div>
          
          {/* Page Header */}
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center space-x-3">
                <ShoppingCart className="h-8 w-8 text-indigo-600" />
                <span>Order Details</span>
              </h1>
              <p className="text-gray-600 mt-2">
                Order #{order.orderNumber}
              </p>
            </div>
            <div className="flex items-center space-x-3 print:hidden">
              <Button 
                onClick={() => window.print()} 
                variant="outline"
                className="flex items-center space-x-2"
              >
                <Printer className="h-4 w-4" />
                <span>Print Invoice</span>
              </Button>
              <Button 
                variant="outline"
                className="flex items-center space-x-2"
                onClick={() => {
                  const pdfUrl = `/api/orders/${orderId}/pdf`;
                  const link = document.createElement('a');
                  link.href = pdfUrl;
                  link.download = `order-${order.orderNumber}.pdf`;
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                }}
              >
                <FileDown className="h-4 w-4" />
                <span>Download PDF</span>
              </Button>
            </div>
          </div>

          {/* Retry Button for Cancelled Orders (but not cancelled subscriptions) */}
          {order.status === 'CANCELLED' && !order.isSubscription && (
            <div className="mt-6 print:hidden">
              <Button 
                variant="outline"
                onClick={() => {
                  if (confirm('Are you sure you want to retry this order?')) {
                    updateOrderStatusMutation.mutate({
                      id: order.id,
                      status: 'PENDING'
                    });
                  }
                }}
                disabled={updateOrderStatusMutation.isPending}
                className="flex items-center space-x-2"
              >
                {updateOrderStatusMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Retrying...</span>
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4" />
                    <span>Retry Order</span>
                  </>
                )}
              </Button>
            </div>
          )}

          {/* Message for Cancelled Subscriptions */}
          {order.isSubscription && order.subscription?.status === 'CANCELLED' && (
            <div className="mt-6 print:hidden">
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-center space-x-2">
                  <XCircle className="h-5 w-5 text-red-600" />
                  <div>
                    <p className="font-medium text-red-900">Subscription Cancelled</p>
                    <p className="text-sm text-red-700">
                      This subscription has been cancelled and cannot be retried. 
                      {order.status === 'COMPLETED' 
                        ? ' Previous payments were processed successfully.' 
                        : ' All pending payments have been cancelled.'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-3">
            <div className="space-y-6">
              {/* Order Header */}
              <Card className="print-invoice-section">
                <CardHeader className="print-invoice-header">
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <FileText className="h-5 w-5 print:hidden" />
                      <span className="print:text-black">INVOICE #{order.orderNumber}</span>
                    </div>
                    <div className="flex items-center space-x-3">
                      <span className="print-payment-status print:text-black">
                        {order.invoices && order.invoices.length > 0 
                          ? (order.invoices[0].status === 'DRAFT' ? 'PROFORMA' : order.invoices[0].status)
                          : order.status}
                      </span>
                      <span className="print:hidden">{getStatusBadge(order.status)}</span>
                    </div>
                  </CardTitle>
                  <CardDescription className="print:text-black">
                    {order.description || 'Order details and invoice information'}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <div>
                      <label className="text-sm font-medium text-gray-500">Total Amount</label>
                      <p className="text-2xl font-bold text-indigo-600">{formatCurrency(order.totalAmount, order.currency)}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Created</label>
                      <p className="text-sm">{formatDate(order.createdAt)}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Type</label>
                      <p className="text-sm">{order.isSubscription ? 'Subscription' : 'One-time'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Last Updated</label>
                      <p className="text-sm">{formatDate(order.updatedAt)}</p>
                    </div>
                    {order.isSubscription && order.subscriptionFrequency && (
                      <div>
                        <label className="text-sm font-medium text-gray-500">Frequency</label>
                        <p className="text-sm capitalize">{order.subscriptionFrequency.toLowerCase()}</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Customer Information */}
              <Card className="print-invoice-section">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <User className="h-5 w-5 print:hidden" />
                    <span className="print:text-black">Customer Information</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {order.user ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-gray-500">Name</label>
                        <p className="text-sm">{order.user.name || 'N/A'}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Email</label>
                        <p className="text-sm">{order.user.email}</p>
                      </div>
                    </div>
                  ) : order.tenant ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-gray-500">Tenant Name</label>
                        <p className="text-sm">{order.tenant.name}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Slug</label>
                        <p className="text-sm font-mono">{order.tenant.slug}</p>
                      </div>
                    </div>
                  ) : order.guestName ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-gray-500">Guest Name</label>
                        <p className="text-sm">{order.guestName}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Guest Email</label>
                        <p className="text-sm">{order.guestEmail}</p>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">No customer information available</p>
                  )}
                </CardContent>
              </Card>

              {/* Billing Information */}
              {(order.billingCompanyName || order.billingVatNumber || order.billingAddressLine1) && (
                <Card className="print-invoice-section">
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Receipt className="h-5 w-5 print:hidden" />
                      <span className="print:text-black">Billing Information</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {order.billingCompanyName && (
                        <div>
                          <label className="text-sm font-medium text-gray-500">Company Name</label>
                          <p className="text-sm">{order.billingCompanyName}</p>
                        </div>
                      )}
                      {order.billingVatNumber && (
                        <div>
                          <label className="text-sm font-medium text-gray-500">VAT Number</label>
                          <p className="text-sm font-mono">{order.billingVatNumber}</p>
                        </div>
                      )}
                      {order.billingAddressLine1 && (
                        <div className="md:col-span-2">
                          <label className="text-sm font-medium text-gray-500">Billing Address</label>
                          <div className="text-sm">
                            <p>{order.billingAddressLine1}</p>
                            {order.billingAddressLine2 && <p>{order.billingAddressLine2}</p>}
                            <p>
                              {order.billingCity}
                              {order.billingState && `, ${order.billingState}`}
                              {order.billingPostalCode && ` ${order.billingPostalCode}`}
                            </p>
                            {order.billingCountry && <p>{order.billingCountry}</p>}
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Invoices Section */}
              <Card className="print-invoice-section">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Receipt className="h-5 w-5 print:hidden" />
                    <span className="print:text-black">Invoices & Payments</span>
                  </CardTitle>
                  <CardDescription className="print:text-black">
                    Invoice details and payment status
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {order.invoices && order.invoices.length > 0 ? (
                    <div className="space-y-6">
                      {order.invoices.map((invoice) => (
                        <div key={invoice.id} className="border rounded-lg p-6">
                          {/* Invoice Header */}
                          <div className="flex justify-between items-start mb-4">
                            <div className="space-y-2">
                              <div className="flex items-center space-x-3">
                                <h4 className="text-lg font-semibold">Invoice #{invoice.invoiceNumber}</h4>
                                {getPaymentStatusBadge(invoice.status)}
                              </div>
                              {invoice.description && (
                                <p className="text-sm text-gray-600">{invoice.description}</p>
                              )}
                            </div>
                            <div className="text-right">
                              <p className="text-2xl font-bold text-indigo-600 print-total print:text-black">
                                {formatCurrency(invoice.amount, invoice.currency)}
                              </p>
                            </div>
                          </div>

                          {/* Invoice Details */}
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                            <div>
                              <label className="text-sm font-medium text-gray-500">Due Date</label>
                              <p className="text-sm">{formatDate(invoice.dueDate)}</p>
                            </div>
                            <div>
                              <label className="text-sm font-medium text-gray-500">Created</label>
                              <p className="text-sm">{formatDate(invoice.createdAt)}</p>
                            </div>
                            <div>
                              <label className="text-sm font-medium text-gray-500">Status</label>
                              <div className="mt-1">{getPaymentStatusBadge(invoice.status)}</div>
                            </div>
                          </div>

                          {/* Payment Actions */}
                          <div className="border-t pt-4">
                            {invoice.status === 'PAID' ? (
                              <div className="flex items-center justify-between">
                                <div className="flex items-center text-green-600">
                                  <CheckCircle className="h-5 w-5 mr-2" />
                                  <span className="font-medium">This invoice has been paid</span>
                                </div>
                                <Button variant="outline" size="sm">
                                  <Download className="h-4 w-4 mr-2" />
                                  Download Receipt
                                </Button>
                              </div>
                            ) : order.isSubscription && order.subscription?.status === 'CANCELLED' ? (
                              <div className="flex items-center justify-between">
                                <div className="flex items-center text-red-600">
                                  <XCircle className="h-5 w-5 mr-2" />
                                  <span className="font-medium">Payment cancelled - subscription terminated</span>
                                </div>
                              </div>
                            ) : (
                              <div className="flex items-center justify-between">
                                <div className="flex items-center text-yellow-600">
                                  <Clock className="h-5 w-5 mr-2" />
                                  <span className="font-medium">Payment pending</span>
                                </div>
                                <Button 
                                  onClick={() => handleInvoicePayment(invoice)}
                                  disabled={createCheckoutSessionMutation.isPending}
                                  className="bg-indigo-600 hover:bg-indigo-700"
                                >
                                  {createCheckoutSessionMutation.isPending ? (
                                    <>
                                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                      Creating...
                                    </>
                                  ) : (
                                    <>
                                      <CreditCard className="h-4 w-4 mr-2" />
                                      Pay with Stripe
                                    </>
                                  )}
                                </Button>
                              </div>
                            )}
                          </div>

                          {/* Payment History */}
                          {invoice.payments && invoice.payments.length > 0 && (
                            <div className="border-t pt-4 mt-4">
                              <h5 className="font-medium text-gray-900 mb-3">Payment History</h5>
                              <div className="space-y-2">
                                {invoice.payments.map((payment) => (
                                  <div key={payment.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                                    <div className="flex items-center space-x-3">
                                      <div className="p-2 bg-white rounded-full">
                                        {payment.status === 'SUCCEEDED' ? (
                                          <CheckCircle className="h-4 w-4 text-green-600" />
                                        ) : (
                                          <XCircle className="h-4 w-4 text-red-600" />
                                        )}
                                      </div>
                                      <div>
                                        <p className="text-sm font-medium">
                                          {formatCurrency(payment.amount, payment.currency)}
                                        </p>
                                        <p className="text-xs text-gray-500">
                                          {formatDate(payment.createdAt)}
                                        </p>
                                      </div>
                                    </div>
                                    <div className="text-right">
                                      {getPaymentStatusBadge(payment.status)}
                                      {payment.paymentIntentId && (
                                        <p className="text-xs text-gray-500 mt-1">
                                          {payment.paymentIntentId}
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Receipt className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">No invoices yet</h3>
                      <p className="text-gray-500">Invoices will appear here once they are generated for this order.</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">

            {/* Subscription Details */}
            {order.isSubscription && order.subscription && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Subscription</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <label className="text-sm font-medium text-gray-500">Status</label>
                    <div className="mt-1">{getStatusBadge(order.subscription.status)}</div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Frequency</label>
                    <p className="text-sm capitalize">{order.subscription.frequency.toLowerCase()}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">
                      {order.subscription.status === 'CANCELLED' ? 'Cancelled On' : 'Next Billing'}
                    </label>
                    <p className="text-sm">{formatDate(order.subscription.nextBillingDate)}</p>
                  </div>
                  
                  {/* Show cancellation reason if cancelled */}
                  {order.subscription.status === 'CANCELLED' && order.metadata && (order.metadata as any).cancellationReason && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">Cancellation Reason</label>
                      <p className="text-sm text-gray-700">{(order.metadata as any).cancellationReason}</p>
                    </div>
                  )}
                  
                  {/* Cancel Subscription Button in Sidebar */}
                  {isActiveSubscription && (
                    <div className="pt-3 border-t">
                      <Button 
                        variant="outline"
                        size="sm"
                        onClick={() => setShowCancellationModal(true)}
                        className="w-full border-red-300 text-red-700 hover:bg-red-50 hover:border-red-400"
                      >
                        <XCircle className="h-4 w-4 mr-2" />
                        Cancel Subscription
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Invoice Summary */}
            {order.invoices && order.invoices.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Invoice Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {order.isSubscription ? (
                    // Subscription orders - show detailed breakdown
                    <>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Total Invoices</span>
                        <span>{order.invoices.length}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Paid</span>
                        <span className="text-green-600">
                          {order.invoices.filter(inv => inv.status === 'PAID').length}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">
                          {order.subscription?.status === 'CANCELLED' ? 'Cancelled' : 'Pending'}
                        </span>
                        <span className={order.subscription?.status === 'CANCELLED' ? 'text-red-600' : 'text-yellow-600'}>
                          {order.invoices.filter(inv => inv.status !== 'PAID').length}
                        </span>
                      </div>
                    </>
                  ) : (
                    // Non-subscription orders - show single invoice status
                    <>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Invoice Status</span>
                        <span className={
                          order.invoices[0]?.status === 'PAID' 
                            ? 'text-green-600' 
                            : (order.status === 'CANCELLED' || (order.isSubscription && order.subscription?.status === 'CANCELLED'))
                              ? 'text-red-600' 
                              : 'text-yellow-600'
                        }>
                          {order.invoices[0]?.status === 'PAID' 
                            ? 'Paid' 
                            : (order.status === 'CANCELLED' || (order.isSubscription && order.subscription?.status === 'CANCELLED'))
                              ? 'Cancelled' 
                              : 'Outstanding'}
                        </span>
                      </div>
                    </>
                  )}
                  <div className="flex justify-between font-semibold border-t pt-3">
                    <span>Total Amount</span>
                    <span>{formatCurrency(order.totalAmount, order.currency)}</span>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Order Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Order Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Subtotal</span>
                  <span>{formatCurrency(order.totalAmount, order.currency)}</span>
                </div>
                <div className="flex justify-between font-semibold border-t pt-3">
                  <span>Total</span>
                  <span>{formatCurrency(order.totalAmount, order.currency)}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Subscription Cancellation Modal */}
        {order && order.subscription && (
          <SubscriptionCancellationModal
            isOpen={showCancellationModal}
            onClose={() => setShowCancellationModal(false)}
            onConfirm={handleSubscriptionCancellation}
            subscription={order.subscription}
            order={order}
            isLoading={cancelSubscriptionMutation.isPending}
          />
        )}
      </div>
    </div>
  );
}
