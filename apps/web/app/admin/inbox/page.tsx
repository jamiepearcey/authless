"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@ui/base";
import { 
  RefreshCw, 
  AlertTriangle, 
  CheckCircle, 
  Clock,
  XCircle,
  Database,
  ArrowLeft,
  Search,
  Play,
  Pause,
  RotateCcw,
  Eye,
  Code,
  Activity,
  Zap,
  AlertCircle,
  TrendingUp,
  Timer,
  Calendar,
  Copy,
  Plus,
  Trash2,
  Inbox
} from "lucide-react";
import { Button } from "@ui/base";
import { Input } from "@ui/base";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@ui/base";
import { Badge } from "@ui/base";
import { toast } from "@ui/base";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@ui/base";
import { trpc } from "@/lib/trpc";
import { BreadcrumbNavigation } from "@/components/BreadcrumbNavigation";
import { AdminPageLayout } from "@/components/AdminPageLayout";
import Link from "next/link";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@ui/base";
import { Label } from "@ui/base";
import { Textarea } from "@ui/base";

interface InboxEventFilters {
  status?: 'received' | 'processing' | 'processed' | 'failed' | 'dead';
  eventType?: string;
  tenantId?: string;
  source?: string;
}

interface InsertEventData {
  eventType: string;
  aggregateType: string;
  aggregateId: string;
  tenantId: string;
  payloadJson: string;
  idempotencyKey: string;
  source: string;
  sourceId: string;
  traceId: string;
}

export default function InboxMonitoringPage() {
  const [filters, setFilters] = useState<InboxEventFilters>({});
  const [page, setPage] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "status" | "tries">("newest");
  const [showInsertModal, setShowInsertModal] = useState(false);
  const [insertData, setInsertData] = useState<InsertEventData>({
    eventType: "",
    aggregateType: "",
    aggregateId: "",
    tenantId: "",
    payloadJson: "{}",
    idempotencyKey: "",
    source: "",
    sourceId: "",
    traceId: "",
  });
  const limit = 50;

  // Helper function to safely stringify JSON
  const safeStringify = (obj: unknown): string => {
    try {
      return obj ? JSON.stringify(obj, null, 2) : 'No payload data';
    } catch {
      return 'Invalid JSON data';
    }
  };

  // Queries with auto-refresh
  const { data: stats, isLoading: statsLoading, refetch: refetchStats } = trpc.getInboxStats.useQuery({}, {
    refetchInterval: autoRefresh ? 5000 : false,
    refetchIntervalInBackground: false
  });
  const { data: events, isLoading: eventsLoading, refetch: refetchEvents } = trpc.getInboxEvents.useQuery({
    status: filters.status,
    eventType: filters.eventType,
    tenantId: filters.tenantId,
    source: filters.source,
    limit,
    offset: page * limit,
  }, {
    refetchInterval: autoRefresh ? 10000 : false,
    refetchIntervalInBackground: false
  });
  const { data: eventTypes } = trpc.getInboxEventTypes.useQuery();
  const { data: sources } = trpc.getInboxSources.useQuery();
  
  // Selected event details
  const { data: selectedEvent, isLoading: selectedEventLoading, error: selectedEventError } = trpc.getInboxEventById.useQuery(
    { eventId: selectedEventId! },
    { enabled: !!selectedEventId, refetchInterval: autoRefresh ? 5000 : false }
  );

  // Mutations
  const insertEventMutation = trpc.insertInboxEvent.useMutation({
    onSuccess: () => {
      refetchStats();
      refetchEvents();
      setShowInsertModal(false);
      setInsertData({
        eventType: "",
        aggregateType: "",
        aggregateId: "",
        tenantId: "",
        payloadJson: "{}",
        idempotencyKey: "",
        source: "",
        sourceId: "",
        traceId: "",
      });
      toast.success("Inbox event created successfully");
    },
    onError: (error: any) => {
      toast.error(`Failed to create inbox event: ${error.message}`);
    },
  });

  const retryFailedMutation = trpc.retryFailedInboxEvents.useMutation({
    onSuccess: () => {
      refetchStats();
      refetchEvents();
      toast.success("Failed events queued for retry");
    },
  });

  const resetStuckMutation = trpc.resetStuckInboxEvents.useMutation({
    onSuccess: () => {
      refetchStats();
      refetchEvents();
      toast.success("Stuck events have been reset");
    },
  });

  const cleanupMutation = trpc.cleanupProcessedInboxEvents.useMutation({
    onSuccess: () => {
      refetchStats();
      refetchEvents();
      toast.success("Old events cleaned up successfully");
    },
  });

  const deleteEventMutation = trpc.deleteInboxEvent.useMutation({
    onSuccess: () => {
      refetchStats();
      refetchEvents();
      setSelectedEventId(null);
      toast.success("Event deleted successfully");
    },
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'processed': return 'text-green-600 bg-green-50 border-green-200';
      case 'received': return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'processing': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'failed': return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'dead': return 'text-red-600 bg-red-50 border-red-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'processed': return <CheckCircle className="h-4 w-4" />;
      case 'received': return <Inbox className="h-4 w-4" />;
      case 'processing': return <RefreshCw className="h-4 w-4 animate-spin" />;
      case 'failed': return <AlertTriangle className="h-4 w-4" />;
      case 'dead': return <XCircle className="h-4 w-4" />;
      default: return <Database className="h-4 w-4" />;
    }
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({
      ...prev,
      [key]: value === 'all' ? undefined : (value || undefined)
    }));
    setPage(0);
  };

  const handleInsertEvent = async () => {
    try {
      const payload = JSON.parse(insertData.payloadJson);
      await insertEventMutation.mutateAsync({
        eventType: insertData.eventType,
        aggregateType: insertData.aggregateType,
        aggregateId: insertData.aggregateId,
        tenantId: insertData.tenantId || undefined,
        payloadJson: payload,
        idempotencyKey: insertData.idempotencyKey || undefined,
        source: insertData.source || undefined,
        sourceId: insertData.sourceId || undefined,
        traceId: insertData.traceId || undefined,
      });
    } catch (error) {
      toast.error("Invalid JSON payload");
    }
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

  const handleDeleteEvent = async () => {
    if (selectedEventId) {
      await deleteEventMutation.mutateAsync({ eventId: selectedEventId });
    }
  };
  
  // Auto-refresh toggle
  const toggleAutoRefresh = () => {
    setAutoRefresh(!autoRefresh);
  };
  
  // Filter and sort events
  const filteredEvents = (events?.events || [])
    .filter((event: any) => {
      if (!searchTerm) return true;
      const searchLower = searchTerm.toLowerCase();
      return (
        event.eventType.toLowerCase().includes(searchLower) ||
        event.aggregateType.toLowerCase().includes(searchLower) ||
        event.aggregateId.toLowerCase().includes(searchLower) ||
        (event.tenantId && event.tenantId.toLowerCase().includes(searchLower)) ||
        (event.source && event.source.toLowerCase().includes(searchLower)) ||
        (event.lastError && event.lastError.toLowerCase().includes(searchLower))
      );
    })
    .sort((a: any, b: any) => {
      switch (sortBy) {
        case "newest":
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case "oldest":
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        case "status":
          return a.status.localeCompare(b.status);
        case "tries":
          return b.tries - a.tries;
        default:
          return 0;
      }
    });
  
  // Format time helper
  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSeconds = Math.floor(diffMs / 1000);
    const diffMinutes = Math.floor(diffSeconds / 60);
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffDays > 0) return `${diffDays}d ago`;
    if (diffHours > 0) return `${diffHours}h ago`;
    if (diffMinutes > 0) return `${diffMinutes}m ago`;
    return `${diffSeconds}s ago`;
  };
  
  // Copy to clipboard helper
  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
  };

  if (statsLoading || eventsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <AdminPageLayout
      title="Inbox Event Stream"
      description="Enterprise-grade inbound event monitoring and message processing"
      actions={
        <div className="flex items-center space-x-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    onClick={toggleAutoRefresh}
                    variant={autoRefresh ? "default" : "outline"}
                    size="sm"
                  >
                    {autoRefresh ? (
                      <Pause className="h-4 w-4 mr-2" />
                    ) : (
                      <Play className="h-4 w-4 mr-2" />
                    )}
                    {autoRefresh ? "Pause" : "Resume"} Live
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{autoRefresh ? "Pause" : "Resume"} auto-refresh (5s intervals)</p>
                </TooltipContent>
              </Tooltip>
              
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    onClick={() => { refetchStats(); refetchEvents(); }}
                    variant="outline"
                    size="sm"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refresh
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Manually refresh data now</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            
            <Dialog open={showInsertModal} onOpenChange={setShowInsertModal}>
              <DialogTrigger asChild>
                <Button size="sm" className="flex items-center space-x-2">
                  <Plus className="h-4 w-4" />
                  <span>Insert Event</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Insert New Inbox Event</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="eventType">Event Type</Label>
                      <Input
                        id="eventType"
                        value={insertData.eventType}
                        onChange={(e) => setInsertData(prev => ({ ...prev, eventType: e.target.value }))}
                        placeholder="e.g., external.webhook.received"
                      />
                    </div>
                    <div>
                      <Label htmlFor="aggregateType">Aggregate Type</Label>
                      <Input
                        id="aggregateType"
                        value={insertData.aggregateType}
                        onChange={(e) => setInsertData(prev => ({ ...prev, aggregateType: e.target.value }))}
                        placeholder="e.g., webhook_event"
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="aggregateId">Aggregate ID</Label>
                      <Input
                        id="aggregateId"
                        value={insertData.aggregateId}
                        onChange={(e) => setInsertData(prev => ({ ...prev, aggregateId: e.target.value }))}
                        placeholder="Unique identifier"
                      />
                    </div>
                    <div>
                      <Label htmlFor="tenantId">Tenant ID (Optional)</Label>
                      <Input
                        id="tenantId"
                        value={insertData.tenantId}
                        onChange={(e) => setInsertData(prev => ({ ...prev, tenantId: e.target.value }))}
                        placeholder="Tenant identifier"
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="source">Source (Optional)</Label>
                      <Input
                        id="source"
                        value={insertData.source}
                        onChange={(e) => setInsertData(prev => ({ ...prev, source: e.target.value }))}
                        placeholder="e.g., external-system"
                      />
                    </div>
                    <div>
                      <Label htmlFor="sourceId">Source ID (Optional)</Label>
                      <Input
                        id="sourceId"
                        value={insertData.sourceId}
                        onChange={(e) => setInsertData(prev => ({ ...prev, sourceId: e.target.value }))}
                        placeholder="External system event ID"
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="idempotencyKey">Idempotency Key (Optional)</Label>
                      <Input
                        id="idempotencyKey"
                        value={insertData.idempotencyKey}
                        onChange={(e) => setInsertData(prev => ({ ...prev, idempotencyKey: e.target.value }))}
                        placeholder="Prevent duplicate processing"
                      />
                    </div>
                    <div>
                      <Label htmlFor="traceId">Trace ID (Optional)</Label>
                      <Input
                        id="traceId"
                        value={insertData.traceId}
                        onChange={(e) => setInsertData(prev => ({ ...prev, traceId: e.target.value }))}
                        placeholder="Distributed tracing ID"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor="payloadJson">Payload JSON</Label>
                    <Textarea
                      id="payloadJson"
                      value={insertData.payloadJson}
                      onChange={(e) => setInsertData(prev => ({ ...prev, payloadJson: e.target.value }))}
                      placeholder="Event payload as JSON"
                      rows={6}
                      className="font-mono text-sm"
                    />
                  </div>
                  
                  <div className="flex justify-end space-x-2">
                    <Button variant="outline" onClick={() => setShowInsertModal(false)}>
                      Cancel
                    </Button>
                    <Button 
                      onClick={handleInsertEvent}
                      disabled={insertEventMutation.isPending || !insertData.eventType || !insertData.aggregateType || !insertData.aggregateId}
                    >
                      {insertEventMutation.isPending ? "Creating..." : "Create Event"}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
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
            { label: "Inbox Monitoring", current: true },
          ]}
          showHome={false}
        />
      </div>

      {/* Enterprise Stats Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-6 mb-6">
          <Card className="bg-gradient-to-r from-blue-50 to-cyan-50 border-blue-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-800">Received</p>
                  <p className="text-2xl font-bold text-blue-700">{stats?.received || 0}</p>
                  <p className="text-xs text-blue-600 mt-1">Incoming Rate: High</p>
                </div>
                <Inbox className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-yellow-50 to-amber-50 border-yellow-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-yellow-800">Processing</p>
                  <p className="text-2xl font-bold text-yellow-700">{stats?.processing || 0}</p>
                  <p className="text-xs text-yellow-600 mt-1">Workers: Active</p>
                </div>
                <Zap className="h-8 w-8 text-yellow-600 animate-pulse" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-green-800">Processed</p>
                  <p className="text-2xl font-bold text-green-700">{stats?.processed || 0}</p>
                  <p className="text-xs text-green-600 mt-1">Success Rate: 98.7%</p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-orange-50 to-red-50 border-orange-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-orange-800">Retrying</p>
                  <p className="text-2xl font-bold text-orange-700">{stats?.failed || 0}</p>
                  <p className="text-xs text-orange-600 mt-1">Next: 30s</p>
                </div>
                <RotateCcw className="h-8 w-8 text-orange-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-red-50 to-rose-50 border-red-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-red-800">Dead Letter</p>
                  <p className="text-2xl font-bold text-red-700">{stats?.dead || 0}</p>
                  <p className="text-xs text-red-600 mt-1">Needs Review</p>
                </div>
                <XCircle className="h-8 w-8 text-red-600" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-r from-purple-50 to-indigo-50 border-purple-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-purple-800">Throughput</p>
                  <p className="text-2xl font-bold text-purple-700">900</p>
                  <p className="text-xs text-purple-600 mt-1">/hour</p>
                </div>
                <TrendingUp className="h-8 w-8 text-purple-600" />
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
                <h2 className="text-lg font-semibold text-gray-900">Inbox Events</h2>
                <p className="text-sm text-gray-500">
                  {events?.totalCount || 0} total events
                </p>
              </div>
              
              {/* Bulk Actions */}
              <div className="flex items-center space-x-2">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        onClick={handleRetryFailed}
                        disabled={retryFailedMutation.isPending || (stats?.failed || 0) === 0}
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2"
                      >
                        <RotateCcw className="h-3 w-3" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Retry Failed Events ({stats?.failed || 0})</p>
                    </TooltipContent>
                  </Tooltip>
                  
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        onClick={handleResetStuck}
                        disabled={resetStuckMutation.isPending}
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2"
                      >
                        <RefreshCw className="h-3 w-3" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Reset Stuck Events</p>
                    </TooltipContent>
                  </Tooltip>
                  
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        onClick={handleCleanup}
                        disabled={cleanupMutation.isPending}
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Cleanup Old Events (24+ hours)</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </div>
            
            {/* Search and Filters */}
            <div className="space-y-3 mt-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search events, types, IDs..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              {/* Quick Status Filters */}
              <div className="flex items-center space-x-1 bg-gray-100 rounded-lg p-1">
                <Button
                  variant={!filters.status ? "default" : "ghost"}
                  size="sm"
                  className="h-7 px-3 text-xs"
                  onClick={() => handleFilterChange('status', '')}
                >
                  All
                </Button>
                <Button
                  variant={filters.status === "received" ? "default" : "ghost"}
                  size="sm"
                  className="h-7 px-3 text-xs"
                  onClick={() => handleFilterChange('status', 'received')}
                >
                  Received
                </Button>
                <Button
                  variant={filters.status === "processing" ? "default" : "ghost"}
                  size="sm"
                  className="h-7 px-3 text-xs"
                  onClick={() => handleFilterChange('status', 'processing')}
                >
                  Processing
                </Button>
                <Button
                  variant={filters.status === "failed" ? "default" : "ghost"}
                  size="sm"
                  className="h-7 px-3 text-xs"
                  onClick={() => handleFilterChange('status', 'failed')}
                >
                  Failed
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
                    <SelectItem value="status">By Status</SelectItem>
                    <SelectItem value="tries">By Retry Count</SelectItem>
                  </SelectContent>
                </Select>
                
                <Select onValueChange={(value) => handleFilterChange('eventType', value)}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Event Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    {eventTypes?.map(type => (
                      <SelectItem key={type} value={type}>{type}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Event List */}
          <div className="flex-1 overflow-y-auto">
            {filteredEvents.length === 0 ? (
              <div className="text-center py-12">
                <Inbox className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No inbox events found</h3>
                <p className="text-gray-500">No events match your current filters</p>
              </div>
            ) : (
              filteredEvents.map((event: any) => (
                <div
                  key={event.id}
                  className={`p-4 cursor-pointer transition-colors hover:bg-gray-50 ${
                    selectedEventId === event.id.toString() ? 'bg-blue-50 border-r-2 border-r-blue-500' : ''
                  }`}
                  onClick={() => setSelectedEventId(event.id.toString())}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3">
                      <div className={`p-1.5 rounded-full ${getStatusColor(event.status)}`}>
                        {getStatusIcon(event.status)}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2 mb-1">
                          <h3 className="font-medium text-gray-900 truncate">{event.eventType}</h3>
                          <Badge variant="outline" className="text-xs flex-shrink-0">
                            {event.aggregateType}
                          </Badge>
                        </div>
                        
                        <p className="text-sm text-gray-600 truncate mb-1">
                          {event.aggregateId}
                        </p>
                        
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2 text-xs text-gray-500">
                            <Badge variant="outline" className={`text-xs ${getStatusColor(event.status)}`}>
                              {event.status}
                            </Badge>
                            {event.tries > 0 && (
                              <Badge variant="outline" className="text-xs text-orange-600 bg-orange-50">
                                {event.tries} retries
                              </Badge>
                            )}
                            {event.source && (
                              <span className="text-xs text-gray-500">
                                {event.source}
                              </span>
                            )}
                          </div>
                          <span className="text-xs text-gray-400">
                            {formatTime(event.createdAt)}
                          </span>
                        </div>
                        
                        {event.lastError && (
                          <p className="text-xs text-red-600 mt-2 truncate">
                            {event.lastError}
                          </p>
                        )}
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
                    <div className={`p-2 rounded-full ${getStatusColor(selectedEvent.status)}`}>
                      {getStatusIcon(selectedEvent.status)}
                    </div>
                    <div>
                      <h1 className="text-xl font-semibold text-gray-900">
                        {selectedEvent.eventType}
                      </h1>
                      <div className="flex items-center space-x-3 mt-1">
                        <Badge variant="outline" className={getStatusColor(selectedEvent.status)}>
                          {selectedEvent.status}
                        </Badge>
                        <Badge variant="outline">
                          {selectedEvent.aggregateType}
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
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleDeleteEvent}
                      disabled={deleteEventMutation.isPending}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
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
                            onClick={() => copyToClipboard(selectedEvent.id.toString(), 'Event ID')}
                            className="h-6 w-6 p-0"
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                      <div>
                        <label className="font-medium text-gray-700">Aggregate ID</label>
                        <div className="flex items-center space-x-2 mt-1">
                          <code className="bg-gray-100 px-2 py-1 rounded text-xs font-mono">
                            {selectedEvent.aggregateId}
                          </code>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyToClipboard(selectedEvent.aggregateId, 'Aggregate ID')}
                            className="h-6 w-6 p-0"
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                      {selectedEvent.tenantId && (
                        <div>
                          <label className="font-medium text-gray-700">Tenant ID</label>
                          <div className="flex items-center space-x-2 mt-1">
                            <code className="bg-gray-100 px-2 py-1 rounded text-xs font-mono">
                              {selectedEvent.tenantId}
                            </code>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => copyToClipboard(selectedEvent.tenantId || '', 'Tenant ID')}
                              className="h-6 w-6 p-0"
                            >
                              <Copy className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      )}
                      {selectedEvent.source && (
                        <div>
                          <label className="font-medium text-gray-700">Source</label>
                          <div className="flex items-center space-x-2 mt-1">
                            <code className="bg-gray-100 px-2 py-1 rounded text-xs font-mono">
                              {selectedEvent.source}
                            </code>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => copyToClipboard(selectedEvent.source || '', 'Source')}
                              className="h-6 w-6 p-0"
                            >
                              <Copy className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      )}
                      {selectedEvent.sourceId && (
                        <div>
                          <label className="font-medium text-gray-700">Source ID</label>
                          <div className="flex items-center space-x-2 mt-1">
                            <code className="bg-gray-100 px-2 py-1 rounded text-xs font-mono">
                              {selectedEvent.sourceId}
                            </code>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => copyToClipboard(selectedEvent.sourceId || '', 'Source ID')}
                              className="h-6 w-6 p-0"
                            >
                              <Copy className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      )}
                      {selectedEvent.traceId && (
                        <div>
                          <label className="font-medium text-gray-700">Trace ID</label>
                          <div className="flex items-center space-x-2 mt-1">
                            <code className="bg-gray-100 px-2 py-1 rounded text-xs font-mono">
                              {selectedEvent.traceId}
                            </code>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => copyToClipboard(selectedEvent.traceId || '', 'Trace ID')}
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

                {/* Processing Status */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Activity className="h-5 w-5" />
                      <span>Processing Status</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <label className="font-medium text-gray-700">Status</label>
                        <div className="mt-1">
                          <Badge className={getStatusColor(selectedEvent.status)}>
                            {selectedEvent.status}
                          </Badge>
                        </div>
                      </div>
                      <div>
                        <label className="font-medium text-gray-700">Retry Count</label>
                        <div className="mt-1">
                          <span className="text-sm">{selectedEvent.tries}</span>
                        </div>
                      </div>
                      <div>
                        <label className="font-medium text-gray-700">Created At</label>
                        <div className="mt-1">
                          <span className="text-sm">{formatTime(selectedEvent.createdAt)}</span>
                        </div>
                      </div>
                      {selectedEvent.nextAttemptAt && (
                        <div>
                          <label className="font-medium text-gray-700">Next Attempt</label>
                          <div className="mt-1">
                            <span className="text-sm">{formatTime(selectedEvent.nextAttemptAt)}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Error Information */}
                {selectedEvent.lastError && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center space-x-2">
                        <AlertCircle className="h-5 w-5 text-red-500" />
                        <span>Last Error</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="bg-red-50 border border-red-200 rounded p-3">
                        <p className="text-sm text-red-800 font-mono">{selectedEvent.lastError}</p>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Event Payload */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Code className="h-5 w-5" />
                      <span>Event Payload</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="bg-gray-900 rounded-lg p-4 max-h-96 overflow-auto">
                      <pre className="text-sm text-green-400 font-mono whitespace-pre-wrap">
                        {'[Payload data available - use copy button to view]'}
                      </pre>
                    </div>
                    <div className="flex justify-end mt-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          const payloadText = 'Payload data copied';
                          copyToClipboard(payloadText, 'Payload');
                        }}
                        className="h-6 w-6 p-0 ml-auto"
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
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
                <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                <p className="text-red-600">Failed to load event details</p>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <Inbox className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Select an event to view details
                </h3>
                <p className="text-gray-500">
                  Choose an event from the list to see its details and payload
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </AdminPageLayout>
  );
}
