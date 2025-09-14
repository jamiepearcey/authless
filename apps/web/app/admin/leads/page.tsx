"use client";

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@ui/base';
import { Button } from '@ui/base';
import { Badge } from '@ui/base';
// import { Tabs, TabsContent, TabsList, TabsTrigger } from '@ui/base';
import { 
  Users, 
  ArrowLeft, 
  Loader2, 
  AlertCircle,
  Eye,
  ShoppingCart,
  CreditCard,
  CheckCircle,
  XCircle,
  Calendar,
  TrendingUp,
  Filter,
  Download,
  RefreshCw
} from 'lucide-react';

interface Lead {
  id: string;
  timestamp: string;
  userId: string | null;
  userEmail: string | null;
  userName: string | null;
  event: string;
  metadata: Record<string, string>;
  ip: string;
  userAgent: string;
  isAuthenticated: boolean;
}

interface LeadSummary {
  totalLeads: number;
  pageVisits: number;
  checkoutsStarted: number;
  paymentsAttempted: number;
  paymentsCompleted: number;
  paymentsFailed: number;
  conversionRate: string;
}

interface LeadsData {
  leads: Lead[];
  summary: LeadSummary;
  pagination: {
    limit: number;
    offset: number;
    total: number;
    hasMore: boolean;
  };
}

export default function AdminLeadsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [leadsData, setLeadsData] = useState<LeadsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<string>('');
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
      return;
    }

    if (session) {
      fetchLeads();
    }
  }, [session, status, router, selectedEvent]);

  const fetchLeads = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const params = new URLSearchParams();
      if (selectedEvent) {
        params.append('event', selectedEvent);
      }
      
      const response = await fetch(`/api/leads/track?${params.toString()}`);
      const data = await response.json();
      
      if (data.success) {
        setLeadsData(data.data);
      } else {
        setError(data.error?.message || 'Failed to fetch leads');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch leads');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchLeads();
  };

  const formatDate = (timestamp: string) => {
    return new Date(timestamp).toLocaleDateString('en-GB', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getEventIcon = (event: string) => {
    switch (event) {
      case 'page_visit':
        return <Eye className="h-4 w-4" />;
      case 'plan_selection':
        return <ShoppingCart className="h-4 w-4" />;
      case 'checkout_started':
        return <CreditCard className="h-4 w-4" />;
      case 'payment_attempted':
        return <CreditCard className="h-4 w-4" />;
      case 'payment_completed':
        return <CheckCircle className="h-4 w-4" />;
      case 'payment_failed':
        return <XCircle className="h-4 w-4" />;
      default:
        return <Calendar className="h-4 w-4" />;
    }
  };

  const getEventColor = (event: string) => {
    switch (event) {
      case 'page_visit':
        return 'bg-blue-100 text-blue-800';
      case 'plan_selection':
        return 'bg-purple-100 text-purple-800';
      case 'checkout_started':
        return 'bg-yellow-100 text-yellow-800';
      case 'payment_attempted':
        return 'bg-orange-100 text-orange-800';
      case 'payment_completed':
        return 'bg-green-100 text-green-800';
      case 'payment_failed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
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
      <div className="max-w-7xl mx-auto">
        
        {/* Header */}
        <div className="mb-4">
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
            
            <Button
              onClick={handleRefresh}
              variant="outline"
              size="sm"
              disabled={isRefreshing}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
          
          <div className="flex items-center mb-2">
            <Users className="h-8 w-8 text-blue-600 mr-3" />
            <h1 className="text-3xl font-bold text-gray-900">Lead Analytics</h1>
          </div>
          <p className="text-gray-600">
            Track user behavior and conversion funnel
          </p>
        </div>

        {isLoading ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
              <p>Loading lead analytics...</p>
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
        ) : !leadsData ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No leads tracked yet</h3>
              <p className="text-gray-600">Lead data will appear here once users start visiting your site.</p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <div className="p-3 bg-blue-100 rounded-full">
                      <Eye className="h-6 w-6 text-blue-600" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">Page Visits</p>
                      <p className="text-2xl font-bold text-gray-900">{leadsData.summary.pageVisits}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <div className="p-3 bg-yellow-100 rounded-full">
                      <ShoppingCart className="h-6 w-6 text-yellow-600" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">Checkouts Started</p>
                      <p className="text-2xl font-bold text-gray-900">{leadsData.summary.checkoutsStarted}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <div className="p-3 bg-green-100 rounded-full">
                      <CheckCircle className="h-6 w-6 text-green-600" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">Payments Completed</p>
                      <p className="text-2xl font-bold text-gray-900">{leadsData.summary.paymentsCompleted}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <div className="p-3 bg-purple-100 rounded-full">
                      <TrendingUp className="h-6 w-6 text-purple-600" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">Conversion Rate</p>
                      <p className="text-2xl font-bold text-gray-900">{leadsData.summary.conversionRate}%</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Filters */}
            <Card className="mb-6">
              <CardContent className="p-6">
                <div className="flex items-center space-x-4">
                  <Filter className="h-5 w-5 text-gray-600" />
                  <span className="text-sm font-medium text-gray-700">Filter by event:</span>
                  
                  <select
                    value={selectedEvent}
                    onChange={(e) => setSelectedEvent(e.target.value)}
                    className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">All Events</option>
                    <option value="page_visit">Page Visits</option>
                    <option value="plan_selection">Plan Selections</option>
                    <option value="checkout_started">Checkouts Started</option>
                    <option value="payment_attempted">Payment Attempts</option>
                    <option value="payment_completed">Payment Completed</option>
                    <option value="payment_failed">Payment Failed</option>
                  </select>
                </div>
              </CardContent>
            </Card>

            {/* Leads Table */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Recent Activity ({leadsData.pagination.total} total)</span>
                  <Button variant="outline" size="sm">
                    <Download className="h-4 w-4 mr-2" />
                    Export
                  </Button>
                </CardTitle>
                <CardDescription>
                  Detailed view of user interactions and events
                </CardDescription>
              </CardHeader>
              <CardContent>
                {leadsData.leads.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-600">No leads match the selected filter.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left font-medium text-gray-600">Timestamp</th>
                          <th className="px-4 py-3 text-left font-medium text-gray-600">Event</th>
                          <th className="px-4 py-3 text-left font-medium text-gray-600">User</th>
                          <th className="px-4 py-3 text-left font-medium text-gray-600">Details</th>
                          <th className="px-4 py-3 text-left font-medium text-gray-600">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {leadsData.leads.map((lead) => (
                          <tr key={lead.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3">
                              <div className="flex items-center text-sm">
                                <Calendar className="h-4 w-4 text-gray-400 mr-2" />
                                {formatDate(lead.timestamp)}
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <Badge className={`${getEventColor(lead.event)} border-0 flex items-center w-fit`}>
                                {getEventIcon(lead.event)}
                                <span className="ml-1 capitalize">{lead.event.replace('_', ' ')}</span>
                              </Badge>
                            </td>
                            <td className="px-4 py-3">
                              <div>
                                <p className="font-medium text-gray-900">
                                  {lead.userName || 'Anonymous'}
                                </p>
                                <p className="text-gray-600 text-xs">
                                  {lead.userEmail || 'No email'}
                                </p>
                                {lead.isAuthenticated && (
                                  <Badge variant="outline" className="mt-1 text-xs">
                                    Authenticated
                                  </Badge>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <div className="text-sm text-gray-600">
                                {lead.metadata.plan && (
                                  <p><span className="font-medium">Plan:</span> {lead.metadata.plan}</p>
                                )}
                                {lead.metadata.amount && (
                                  <p><span className="font-medium">Amount:</span> £{(parseInt(lead.metadata.amount) / 100).toFixed(2)}</p>
                                )}
                                {lead.metadata.error && (
                                  <p className="text-red-600"><span className="font-medium">Error:</span> {lead.metadata.error}</p>
                                )}
                                {lead.metadata.paymentMethod && (
                                  <p><span className="font-medium">Method:</span> {lead.metadata.paymentMethod}</p>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <div className="text-xs text-gray-500">
                                <p>IP: {lead.ip}</p>
                                <p className="truncate max-w-24" title={lead.userAgent}>
                                  {lead.userAgent.split(' ')[0]}
                                </p>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                
                {leadsData.pagination.hasMore && (
                  <div className="mt-6 text-center">
                    <Button variant="outline">
                      Load More
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}