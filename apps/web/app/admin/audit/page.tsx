"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@ui/base";
import { 
  FileText, 
  RefreshCw, 
  Filter,
  Search,
  AlertTriangle,
  Info,
  Shield,
  XCircle,
  Calendar,
  User,
  Building2,
  ArrowLeft
} from "lucide-react";
import { Button } from "@ui/base";
import { Input } from "@ui/base";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@ui/base";
import { Badge } from "@ui/base";
import { trpc } from "@/lib/trpc";
import { BreadcrumbNavigation } from "@/components/BreadcrumbNavigation";
import Link from "next/link";

interface AuditEventFilters {
  action?: string;
  resourceType?: string;
  severity?: 'info' | 'warning' | 'error' | 'critical';
  userId?: string;
  tenantId?: string;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
}

export default function AuditEventsPage() {
  const [filters, setFilters] = useState<AuditEventFilters>({});
  const [page, setPage] = useState(0);
  const limit = 50;

  // Queries
  const { data: events, isLoading: eventsLoading, refetch: refetchEvents } = trpc.getAuditEvents.useQuery({
    action: filters.action,
    resourceType: filters.resourceType,
    severity: filters.severity,
    userId: filters.userId,
    tenantId: filters.tenantId,
    search: filters.search,
    dateFrom: filters.dateFrom,
    dateTo: filters.dateTo,
    limit,
    offset: page * limit,
    sortBy: 'createdAt',
    sortOrder: 'desc',
  });
  
  const { data: stats, isLoading: statsLoading, refetch: refetchStats } = trpc.getAuditStats.useQuery({
    ...filters,
  });
  
  const { data: filterOptions } = trpc.getAuditFilterOptions.useQuery({});

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'info': return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'warning': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'error': return 'text-red-600 bg-red-50 border-red-200';
      case 'critical': return 'text-purple-600 bg-purple-50 border-purple-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'info': return <Info className="h-4 w-4" />;
      case 'warning': return <AlertTriangle className="h-4 w-4" />;
      case 'error': return <XCircle className="h-4 w-4" />;
      case 'critical': return <Shield className="h-4 w-4" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({
      ...prev,
      [key]: value === "all" ? undefined : value || undefined
    }));
    setPage(0);
  };

  const formatEventAction = (action: string) => {
    return action.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  const formatEventDetails = (details: string | null) => {
    if (!details) return 'No details';
    
    try {
      const parsed = JSON.parse(details);
      const keys = Object.keys(parsed);
      if (keys.length === 0) return 'No details';
      
      // Show the first few key-value pairs
      const summary = keys.slice(0, 3).map(key => {
        const value = parsed[key];
        if (typeof value === 'object') return `${key}: [object]`;
        return `${key}: ${String(value).substring(0, 50)}${String(value).length > 50 ? '...' : ''}`;
      }).join(', ');
      
      return summary + (keys.length > 3 ? `... +${keys.length - 3} more` : '');
    } catch {
      return details.substring(0, 100) + (details.length > 100 ? '...' : '');
    }
  };

  if (eventsLoading || statsLoading) {
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
              { label: "Audit Events", current: true },
            ]}
            showHome={false}
          />
        </div>
        
        {/* Page Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center space-x-3">
              <FileText className="h-8 w-8 text-indigo-600" />
              <span>Audit Events</span>
            </h1>
            <p className="text-gray-600 mt-2">
              System activity audit trail and security monitoring
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
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Info className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Events</p>
                <p className="text-2xl font-bold text-indigo-600">{stats?.totalEvents || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Calendar className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Recent (24h)</p>
                <p className="text-2xl font-bold text-green-600">{stats?.recentEvents || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <AlertTriangle className="h-8 w-8 text-yellow-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Warnings</p>
                <p className="text-2xl font-bold text-yellow-600">{stats?.severityBreakdown?.warning || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <XCircle className="h-8 w-8 text-red-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Errors</p>
                <p className="text-2xl font-bold text-red-600">
                  {(stats?.severityBreakdown?.error || 0) + (stats?.severityBreakdown?.critical || 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Actions & Resources */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Top Actions</CardTitle>
            <CardDescription>Most frequent audit actions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats?.topActions?.slice(0, 5).map((action, index) => (
                <div key={action.action} className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium text-gray-500">#{index + 1}</span>
                    <span className="text-sm">{formatEventAction(action.action)}</span>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {action.count}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Resource Types</CardTitle>
            <CardDescription>Most audited resource types</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats?.resourceTypeBreakdown?.slice(0, 5).map((resource, index) => (
                <div key={resource.resourceType} className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium text-gray-500">#{index + 1}</span>
                    <span className="text-sm">{resource.resourceType}</span>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {resource.count}
                  </Badge>
                </div>
              ))}
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
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Severity
              </label>
              <Select onValueChange={(value) => handleFilterChange('severity', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="All severities" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All severities</SelectItem>
                  <SelectItem value="info">Info</SelectItem>
                  <SelectItem value="warning">Warning</SelectItem>
                  <SelectItem value="error">Error</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Action
              </label>
              <Select onValueChange={(value) => handleFilterChange('action', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="All actions" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All actions</SelectItem>
                  {filterOptions?.actions?.slice(0, 20).map((action) => (
                    <SelectItem key={action} value={action}>
                      {formatEventAction(action)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Resource Type
              </label>
              <Select onValueChange={(value) => handleFilterChange('resourceType', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="All resources" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All resources</SelectItem>
                  {filterOptions?.resourceTypes?.map((resourceType) => (
                    <SelectItem key={resourceType} value={resourceType || ""}>
                      {resourceType}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Search
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search events..."
                  className="pl-10"
                  onChange={(e) => handleFilterChange('search', e.target.value)}
                />
              </div>
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
                  <SelectItem value="all">All tenants</SelectItem>
                  {filterOptions?.tenants?.map((tenant) => (
                    <SelectItem key={tenant.id} value={tenant.id!}>
                      {tenant.name} ({tenant.slug})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                User
              </label>
              <Select onValueChange={(value) => handleFilterChange('userId', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="All users" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All users</SelectItem>
                  {filterOptions?.users?.slice(0, 50).map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.name || user.email || user.id}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Date From
              </label>
              <Input
                type="date"
                onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Date To
              </label>
              <Input
                type="date"
                onChange={(e) => handleFilterChange('dateTo', e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Events Table */}
      <Card>
        <CardHeader>
          <CardTitle>Audit Events</CardTitle>
          <CardDescription>
            {events?.totalCount || 0} total events found
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {events?.events.map((event) => (
              <div
                key={event.id}
                className="flex items-start justify-between p-4 border rounded-lg hover:bg-gray-50"
              >
                <div className="flex items-start space-x-4">
                  <div className={`p-2 rounded-full ${getSeverityColor(event.severity)}`}>
                    {getSeverityIcon(event.severity)}
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <h3 className="font-medium">{formatEventAction(event.action)}</h3>
                      <Badge variant="outline" className="text-xs">
                        {event.resourceType}
                      </Badge>
                      <Badge 
                        variant="outline" 
                        className={`text-xs ${getSeverityColor(event.severity)} border`}
                      >
                        {event.severity}
                      </Badge>
                    </div>
                    
                    <div className="text-sm text-gray-600 space-y-1">
                      <div className="flex items-center space-x-4">
                        {event.user && (
                          <div className="flex items-center space-x-1">
                            <User className="h-3 w-3" />
                            <span>{event.user.name || event.user.email}</span>
                          </div>
                        )}
                        {event.tenant && (
                          <div className="flex items-center space-x-1">
                            <Building2 className="h-3 w-3" />
                            <span>{event.tenant.name}</span>
                          </div>
                        )}
                        {event.resourceId && (
                          <span>Resource: {event.resourceId.substring(0, 8)}...</span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500">
                        {formatEventDetails(event.details)}
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="text-right text-sm text-gray-500">
                  <p>{new Date(event.createdAt).toLocaleString()}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {events && events.totalCount > limit && (
            <div className="flex justify-between items-center mt-6">
              <p className="text-sm text-gray-600">
                Showing {events.pagination.offset + 1} to {Math.min(events.pagination.offset + events.pagination.limit, events.totalCount)} of {events.totalCount} events
              </p>
              
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-600">
                  Page {events.pagination.currentPage} of {events.pagination.totalPages}
                </span>
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