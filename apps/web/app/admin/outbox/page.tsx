"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@ui/base";
import { 
  Send, 
  RefreshCw, 
  AlertTriangle, 
  CheckCircle, 
  Clock,
  XCircle,
  Filter,
  Database,
  ArrowLeft
} from "lucide-react";
import { Button } from "@ui/base";
import { Input } from "@ui/base";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@ui/base";
import { Badge } from "@ui/base";
import { trpc } from "@/lib/trpc";
import { BreadcrumbNavigation } from "@/components/BreadcrumbNavigation";
import Link from "next/link";

interface OutboxEventFilters {
  status?: 'pending' | 'processing' | 'sent' | 'failed' | 'dead';
  eventType?: string;
  tenantId?: string;
}

export default function OutboxMonitoringPage() {
  const [filters, setFilters] = useState<OutboxEventFilters>({});
  const [page, setPage] = useState(0);
  const limit = 50;

  // Queries
  const { data: stats, isLoading: statsLoading, refetch: refetchStats } = trpc.getOutboxStats.useQuery({});
  const { data: events, isLoading: eventsLoading, refetch: refetchEvents } = trpc.getOutboxEvents.useQuery({
    status: filters.status,
    eventType: filters.eventType,
    tenantId: filters.tenantId,
    limit,
    offset: page * limit,
  });
  const { data: eventTypes } = trpc.getOutboxEventTypes.useQuery();
  const { data: tenantIds } = trpc.getOutboxTenantIds.useQuery();

  // Mutations
  const retryFailedMutation = trpc.retryFailedEvents.useMutation({
    onSuccess: () => {
      refetchStats();
      refetchEvents();
    },
  });

  const resetStuckMutation = trpc.resetStuckEvents.useMutation({
    onSuccess: () => {
      refetchStats();
      refetchEvents();
    },
  });

  const cleanupMutation = trpc.cleanupProcessedEvents.useMutation({
    onSuccess: () => {
      refetchStats();
      refetchEvents();
    },
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'sent': return 'text-green-600 bg-green-50 border-green-200';
      case 'pending': return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'processing': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'failed': return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'dead': return 'text-red-600 bg-red-50 border-red-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'sent': return <CheckCircle className="h-4 w-4" />;
      case 'pending': return <Clock className="h-4 w-4" />;
      case 'processing': return <RefreshCw className="h-4 w-4 animate-spin" />;
      case 'failed': return <AlertTriangle className="h-4 w-4" />;
      case 'dead': return <XCircle className="h-4 w-4" />;
      default: return <Database className="h-4 w-4" />;
    }
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({
      ...prev,
      [key]: value || undefined
    }));
    setPage(0);
  };

  const handleRetryFailed = async () => {
    await retryFailedMutation.mutateAsync({ maxRetries: 100 });
  };

  const handleResetStuck = async () => {
    await resetStuckMutation.mutateAsync({ stuckAfterMinutes: 30 });
  };

  const handleCleanup = async () => {
    await cleanupMutation.mutateAsync({ olderThanHours: 24 });
  };

  if (statsLoading || eventsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="mb-8">
        {/* Breadcrumb Navigation */}
        <div className="flex items-center space-x-4 mb-4">
          <Link 
            href="/admin"
            className="inline-flex items-center text-indigo-600 hover:text-indigo-800 transition-colors"
          >
            <ArrowLeft className="h-5 w-5 mr-2" />
            Back to Admin
          </Link>
          <div className="h-6 w-px bg-gray-300" />
          <BreadcrumbNavigation
            items={[
              { label: "Admin", href: "/admin" },
              { label: "Outbox Monitoring", current: true },
            ]}
            showHome={false}
          />
        </div>
        
        {/* Page Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center space-x-3">
              <Send className="h-8 w-8 text-indigo-600" />
              <span>Outbox Monitoring</span>
            </h1>
            <p className="text-gray-600 mt-2">
              Monitor event publishing and delivery across the system
            </p>
          </div>
          <div className="flex space-x-2">
            <Button
              onClick={() => { refetchStats(); refetchEvents(); }}
              variant="outline"
              size="sm"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <CheckCircle className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Sent</p>
                <p className="text-2xl font-bold text-green-600">{stats?.sent || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Clock className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Pending</p>
                <p className="text-2xl font-bold text-blue-600">{stats?.pending || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <RefreshCw className="h-8 w-8 text-yellow-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Processing</p>
                <p className="text-2xl font-bold text-yellow-600">{stats?.processing || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <AlertTriangle className="h-8 w-8 text-orange-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Failed</p>
                <p className="text-2xl font-bold text-orange-600">{stats?.failed || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <XCircle className="h-8 w-8 text-red-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Dead</p>
                <p className="text-2xl font-bold text-red-600">{stats?.dead || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>


      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Filter className="h-5 w-5" />
            <span>Filters</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Status
              </label>
              <Select onValueChange={(value) => handleFilterChange('status', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All statuses</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="processing">Processing</SelectItem>
                  <SelectItem value="sent">Sent</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                  <SelectItem value="dead">Dead</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Event Type
              </label>
              <Select onValueChange={(value) => handleFilterChange('eventType', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="All types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All types</SelectItem>
                  {eventTypes?.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tenant
              </label>
              <Select onValueChange={(value) => handleFilterChange('tenantId', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="All tenants" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All tenants</SelectItem>
                  {tenantIds?.map((tenantId) => (
                    <SelectItem key={tenantId} value={tenantId}>
                      {tenantId || '(no tenant)'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>


          </div>
        </CardContent>
      </Card>

      {/* Events Table */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
            <div>
              <CardTitle>Recent Events</CardTitle>
              <CardDescription>
                {events?.totalCount || 0} total events
              </CardDescription>
            </div>
            
            {/* Management Actions Toolbar */}
            <div className="flex items-center space-x-3">
              <span className="text-xs text-gray-500 font-medium hidden sm:inline">Actions</span>
              <div className={`flex items-center space-x-1 rounded-lg p-1 transition-colors ${
                (retryFailedMutation.isPending || resetStuckMutation.isPending || cleanupMutation.isPending) 
                  ? 'bg-blue-50 ring-1 ring-blue-200' 
                  : 'bg-gray-50'
              }`}>
                <Button
                  onClick={handleRetryFailed}
                  disabled={retryFailedMutation.isPending || (stats?.failed || 0) === 0}
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2"
                  title={`Retry Failed Events (${stats?.failed || 0})`}
                >
                  {retryFailedMutation.isPending ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                  {(stats?.failed || 0) > 0 && (
                    <span className="ml-1 text-xs text-orange-600 font-medium">
                      {stats?.failed}
                    </span>
                  )}
                </Button>
                
                <div className="w-px h-4 bg-gray-300" />
                
                <Button
                  onClick={handleResetStuck}
                  disabled={resetStuckMutation.isPending}
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2"
                  title="Reset Stuck Events (30min+)"
                >
                  <Clock className="h-4 w-4" />
                </Button>
                
                <Button
                  onClick={handleCleanup}
                  disabled={cleanupMutation.isPending}
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2"
                  title={`Cleanup Old Events (24h+)${(stats?.dead || 0) > 0 ? ` - ${stats?.dead} dead` : ''}`}
                >
                  <Database className="h-4 w-4" />
                  {(stats?.dead || 0) > 0 && (
                    <span className="ml-1 text-xs text-red-600 font-medium">
                      {stats?.dead}
                    </span>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {events?.events.map((event: any) => (
              <div
                key={event.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
              >
                <div className="flex items-center space-x-4">
                  <div className={`p-2 rounded-full ${getStatusColor(event.status)}`}>
                    {getStatusIcon(event.status)}
                  </div>
                  
                  <div>
                    <div className="flex items-center space-x-2">
                      <h3 className="font-medium">{event.eventType}</h3>
                      <Badge variant="outline" className="text-xs">
                        {event.aggregateType}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-600">
                      ID: {event.aggregateId} | Tenant: {event.tenantId || 'None'}
                    </p>
                    <p className="text-xs text-gray-500">
                      Created: {new Date(event.createdAt).toLocaleString()}
                    </p>
                  </div>
                </div>
                
                <div className="text-right">
                  <Badge 
                    variant="outline" 
                    className={`${getStatusColor(event.status)} border`}
                  >
                    {event.status}
                  </Badge>
                  {event.tries > 0 && (
                    <p className="text-xs text-gray-500 mt-1">
                      Tries: {event.tries}
                    </p>
                  )}
                  {event.lastError && (
                    <p className="text-xs text-red-600 mt-1 max-w-48 truncate">
                      Error: {event.lastError}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {events && events.totalCount > limit && (
            <div className="flex justify-between items-center mt-6">
              <p className="text-sm text-gray-600">
                Showing {page * limit + 1} to {Math.min((page + 1) * limit, events.totalCount)} of {events.totalCount} events
              </p>
              
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(page - 1)}
                  disabled={page === 0}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(page + 1)}
                  disabled={!events.hasMore}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}