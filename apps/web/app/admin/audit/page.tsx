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
  ArrowLeft,
  Eye,
  Code,
  Activity,
  Copy,
  Play,
  Pause
} from "lucide-react";
import { Button } from "@ui/base";
import { Input } from "@ui/base";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@ui/base";
import { Badge } from "@ui/base";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@ui/base";
import { trpc } from "@/lib/trpc";
import { BreadcrumbNavigation } from "@/components/BreadcrumbNavigation";
import { AdminPageLayout } from "@/components/AdminPageLayout";
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
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "severity" | "action">("newest");
  const limit = 50;

  // Queries with auto-refresh
  const { data: events, isLoading: eventsLoading, refetch: refetchEvents } = trpc.getAuditEvents.useQuery({
    action: filters.action,
    resourceType: filters.resourceType,
    severity: filters.severity,
    userId: filters.userId,
    tenantId: filters.tenantId,
    search: filters.search || searchTerm,
    dateFrom: filters.dateFrom,
    dateTo: filters.dateTo,
    limit,
    offset: page * limit,
    sortBy: 'createdAt',
    sortOrder: 'desc',
  }, {
    refetchInterval: autoRefresh ? 10000 : false,
    refetchIntervalInBackground: false
  });
  
  const { data: stats, isLoading: statsLoading, refetch: refetchStats } = trpc.getAuditStats.useQuery({
    ...filters,
  }, {
    refetchInterval: autoRefresh ? 5000 : false,
    refetchIntervalInBackground: false
  });
  
  const { data: filterOptions } = trpc.getAuditFilterOptions.useQuery({});
  
  // Selected event details
  const { data: selectedEvent, isLoading: selectedEventLoading, error: selectedEventError } = trpc.getAuditEventById.useQuery(
    { eventId: selectedEventId! },
    { enabled: !!selectedEventId, refetchInterval: autoRefresh ? 5000 : false }
  );

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

  const formatTime = (date: Date | string) => {
    const d = new Date(date);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return d.toLocaleDateString();
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    // You could add a toast notification here
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
    <AdminPageLayout
      title="Audit Events"
      description="System activity audit trail and security monitoring"
      actions={
        <div className="flex items-center space-x-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={() => { refetchStats(); refetchEvents(); }}
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2"
                >
                  <RefreshCw className="h-3 w-3" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Refresh Data</p>
              </TooltipContent>
            </Tooltip>
            
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={() => setAutoRefresh(!autoRefresh)}
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2"
                >
                  {autoRefresh ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{autoRefresh ? 'Pause Auto-refresh' : 'Start Auto-refresh'}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      }
    >
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

      {/* Enterprise Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5 mb-6">
        <Card className="bg-gradient-to-r from-blue-50 to-cyan-50 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-800">Total Events</p>
                <p className="text-2xl font-bold text-blue-700">{stats?.totalEvents || 0}</p>
                <p className="text-xs text-blue-600 mt-1">All Time</p>
              </div>
              <Info className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-800">Recent (24h)</p>
                <p className="text-2xl font-bold text-green-700">{stats?.recentEvents || 0}</p>
                <p className="text-xs text-green-600 mt-1">Last 24 Hours</p>
              </div>
              <Calendar className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-yellow-50 to-amber-50 border-yellow-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-yellow-800">Warnings</p>
                <p className="text-2xl font-bold text-yellow-700">{stats?.severityBreakdown?.warning || 0}</p>
                <p className="text-xs text-yellow-600 mt-1">Attention Needed</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-red-50 to-rose-50 border-red-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-red-800">Errors</p>
                <p className="text-2xl font-bold text-red-700">
                  {(stats?.severityBreakdown?.error || 0) + (stats?.severityBreakdown?.critical || 0)}
                </p>
                <p className="text-xs text-red-600 mt-1">Critical Issues</p>
              </div>
              <XCircle className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-purple-50 to-violet-50 border-purple-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-800">Info Events</p>
                <p className="text-2xl font-bold text-purple-700">{stats?.severityBreakdown?.info || 0}</p>
                <p className="text-xs text-purple-600 mt-1">Informational</p>
              </div>
              <FileText className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

      </div>

      {/* Main Content */}
      <div className="flex h-[calc(100vh-200px)] overflow-hidden bg-white rounded-lg border border-gray-200">
        {/* Left Panel - Event List */}
        <div className="w-1/2 bg-white border-r border-gray-200 flex flex-col">
          <div className="bg-white border-b border-gray-200 px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Audit Events</h2>
                <p className="text-sm text-gray-500">
                  {events?.totalCount || 0} total events
                </p>
              </div>
            </div>
            
            {/* Search and Filters */}
            <div className="space-y-3 mt-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search events, actions, users..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              {/* Quick Severity Filters */}
              <div className="flex items-center space-x-1 bg-gray-100 rounded-lg p-1">
                <Button
                  variant={!filters.severity ? "default" : "ghost"}
                  size="sm"
                  className="h-7 px-3 text-xs"
                  onClick={() => handleFilterChange('severity', '')}
                >
                  All
                </Button>
                <Button
                  variant={filters.severity === "info" ? "default" : "ghost"}
                  size="sm"
                  className="h-7 px-3 text-xs"
                  onClick={() => handleFilterChange('severity', 'info')}
                >
                  Info
                </Button>
                <Button
                  variant={filters.severity === "warning" ? "default" : "ghost"}
                  size="sm"
                  className="h-7 px-3 text-xs"
                  onClick={() => handleFilterChange('severity', 'warning')}
                >
                  Warning
                </Button>
                <Button
                  variant={filters.severity === "error" ? "default" : "ghost"}
                  size="sm"
                  className="h-7 px-3 text-xs"
                  onClick={() => handleFilterChange('severity', 'error')}
                >
                  Error
                </Button>
              </div>
              
              {/* Advanced Filters */}
              <div className="grid grid-cols-2 gap-2">
                <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="newest">Newest First</SelectItem>
                    <SelectItem value="oldest">Oldest First</SelectItem>
                    <SelectItem value="severity">By Severity</SelectItem>
                    <SelectItem value="action">By Action</SelectItem>
                  </SelectContent>
                </Select>
                
                <Select onValueChange={(value) => handleFilterChange('action', value)}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Action" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Actions</SelectItem>
                    {filterOptions?.actions?.map((action) => (
                      <SelectItem key={action} value={action}>{formatEventAction(action)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Event List */}
          <div className="flex-1 overflow-y-auto">
            {events?.events.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No audit events found</h3>
                <p className="text-gray-500">No events match your current filters</p>
              </div>
            ) : (
              events?.events.map((event) => (
                <div
                  key={event.id}
                  className={`p-4 cursor-pointer transition-colors hover:bg-gray-50 ${
                    selectedEventId === event.id ? 'bg-blue-50 border-r-2 border-r-blue-500' : ''
                  }`}
                  onClick={() => setSelectedEventId(event.id)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3">
                      <div className={`p-1.5 rounded-full ${getSeverityColor(event.severity)}`}>
                        {getSeverityIcon(event.severity)}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2 mb-1">
                          <h3 className="font-medium text-gray-900 truncate">{formatEventAction(event.action)}</h3>
                          <Badge variant="outline" className="text-xs flex-shrink-0">
                            {event.resourceType}
                          </Badge>
                        </div>
                        
                        <p className="text-sm text-gray-600 truncate mb-1">
                          {event.user?.name || event.user?.email || 'System'}
                        </p>
                        
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2 text-xs text-gray-500">
                            <Badge variant="outline" className={`text-xs ${getSeverityColor(event.severity)}`}>
                              {event.severity}
                            </Badge>
                            {event.tenant && (
                              <span className="text-xs text-gray-500">
                                {event.tenant.name}
                              </span>
                            )}
                          </div>
                          <span className="text-xs text-gray-400">
                            {formatTime(event.createdAt)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Panel - Event Details */}
        <div className="flex-1 bg-white flex flex-col">
          {selectedEventId && selectedEvent ? (
            <>
              {/* Event Header */}
              <div className="bg-white border-b border-gray-200 px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className={`p-2 rounded-full ${getSeverityColor(selectedEvent.severity)}`}>
                      {getSeverityIcon(selectedEvent.severity)}
                    </div>
                    <div>
                      <h1 className="text-xl font-semibold text-gray-900">
                        {formatEventAction(selectedEvent.action)}
                      </h1>
                      <div className="flex items-center space-x-3 mt-1">
                        <Badge variant="outline" className={getSeverityColor(selectedEvent.severity)}>
                          {selectedEvent.severity}
                        </Badge>
                        <Badge variant="outline">
                          {selectedEvent.resourceType}
                        </Badge>
                        <span className="text-sm text-gray-500">
                          {formatTime(selectedEvent.createdAt)}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(JSON.stringify(selectedEvent, null, 2), "Event data")}
                    >
                      <Copy className="h-4 w-4 mr-2" />
                      Copy Data
                    </Button>
                  </div>
                </div>
              </div>
              
              {/* Event Content */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {/* Key Information */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Eye className="h-5 w-5" />
                      <span>Event Information</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <label className="font-medium text-gray-700">Event ID</label>
                        <div className="flex items-center space-x-2 mt-1">
                          <code className="bg-gray-100 px-2 py-1 rounded text-xs font-mono">
                            {selectedEvent.id}
                          </code>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyToClipboard(selectedEvent.id, 'Event ID')}
                            className="h-6 w-6 p-0"
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                      <div>
                        <label className="font-medium text-gray-700">Resource ID</label>
                        <div className="flex items-center space-x-2 mt-1">
                          <code className="bg-gray-100 px-2 py-1 rounded text-xs font-mono">
                            {selectedEvent.resourceId || 'N/A'}
                          </code>
                          {selectedEvent.resourceId && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => copyToClipboard(selectedEvent.resourceId!, 'Resource ID')}
                              className="h-6 w-6 p-0"
                            >
                              <Copy className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      </div>
                      {selectedEvent.user && (
                        <div>
                          <label className="font-medium text-gray-700">User</label>
                          <div className="flex items-center space-x-2 mt-1">
                            <code className="bg-gray-100 px-2 py-1 rounded text-xs font-mono">
                              {selectedEvent.user.name || selectedEvent.user.email}
                            </code>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => copyToClipboard(selectedEvent.user?.name || selectedEvent.user?.email || '', 'User')}
                              className="h-6 w-6 p-0"
                            >
                              <Copy className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      )}
                      {selectedEvent.tenant && (
                        <div>
                          <label className="font-medium text-gray-700">Tenant</label>
                          <div className="flex items-center space-x-2 mt-1">
                            <code className="bg-gray-100 px-2 py-1 rounded text-xs font-mono">
                              {selectedEvent.tenant.name}
                            </code>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => copyToClipboard(selectedEvent.tenant?.name || '', 'Tenant')}
                              className="h-6 w-6 p-0"
                            >
                              <Copy className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Event Details */}
                {selectedEvent.details && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center space-x-2">
                        <Code className="h-5 w-5" />
                        <span>Event Details</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="bg-gray-900 rounded-lg p-4 max-h-96 overflow-auto">
                        <pre className="text-sm text-green-400 font-mono whitespace-pre-wrap">
                          {(() => {
                            try {
                              return JSON.stringify(JSON.parse(selectedEvent.details), null, 2);
                            } catch {
                              return selectedEvent.details;
                            }
                          })()}
                        </pre>
                      </div>
                      <div className="flex justify-end mt-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(selectedEvent.details || '', 'Details')}
                          className="h-6 w-6 p-0 ml-auto"
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </>
          ) : selectedEventLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-4" />
                <p className="text-gray-500">Loading event details...</p>
              </div>
            </div>
          ) : selectedEventError ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                <p className="text-red-600">Failed to load event details</p>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Select an event to view details
                </h3>
                <p className="text-gray-500">
                  Choose an event from the list to see its details and information
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </AdminPageLayout>
  );
}
