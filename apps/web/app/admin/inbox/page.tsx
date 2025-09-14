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
import { trpc } from "@/lib/trpc";
import { BreadcrumbNavigation } from "@/components/BreadcrumbNavigation";
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
      [key]: value || undefined
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
    <div className="flex-1 space-y-6">
      {/* Header */}
      <div className="mb-4">
        {/* Breadcrumb Navigation */}
        <div className="flex items-center space-x-4 mb-4">
          <Link 
            href="/admin"
            className="inline-flex items-center text-indigo-600 hover:text-indigo-800 transition-colors"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Admin
          </Link>
          <BreadcrumbNavigation
            items={[
              { label: "Admin Dashboard", href: "/admin" },
              { label: "Inbox Events", current: true },
            ]}
            showHome={false}
          />
        </div>
        
        {/* Page Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center space-x-3">
              <Inbox className="h-8 w-8 text-indigo-600" />
              <span>Inbox Event Monitoring</span>
            </h1>
            <p className="text-gray-600 mt-2">
              Monitor and manage inbound events from external systems
            </p>
          </div>
          
          {/* Controls */}
          <div className="flex items-center space-x-3">
            <Button
              variant={autoRefresh ? "default" : "outline"}
              onClick={toggleAutoRefresh}
              className="flex items-center space-x-2"
            >
              {autoRefresh ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              <span>{autoRefresh ? "Pause" : "Resume"}</span>
            </Button>
            
            <Dialog open={showInsertModal} onOpenChange={setShowInsertModal}>
              <DialogTrigger asChild>
                <Button className="flex items-center space-x-2">
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
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Inbox className="h-8 w-8 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Received</p>
                <p className="text-2xl font-semibold text-gray-900">{stats?.received || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <RefreshCw className="h-8 w-8 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Processing</p>
                <p className="text-2xl font-semibold text-gray-900">{stats?.processing || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Processed</p>
                <p className="text-2xl font-semibold text-gray-900">{stats?.processed || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <AlertTriangle className="h-8 w-8 text-orange-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Failed</p>
                <p className="text-2xl font-semibold text-gray-900">{stats?.failed || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <XCircle className="h-8 w-8 text-red-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Dead</p>
                <p className="text-2xl font-semibold text-gray-900">{stats?.dead || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Panel - Event List */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Inbox Events</CardTitle>
                  <CardDescription>
                    {events?.totalCount || 0} total events
                  </CardDescription>
                </div>
                
                {/* Bulk Actions */}
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRetryFailed}
                    disabled={retryFailedMutation.isPending || (stats?.failed || 0) === 0}
                  >
                    <RotateCcw className="h-4 w-4 mr-1" />
                    Retry Failed
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleResetStuck}
                    disabled={resetStuckMutation.isPending}
                  >
                    <RefreshCw className="h-4 w-4 mr-1" />
                    Reset Stuck
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCleanup}
                    disabled={cleanupMutation.isPending}
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    Cleanup
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {/* Filters */}
              <div className="flex flex-wrap items-center gap-4 mb-6">
                <div className="flex items-center space-x-2">
                  <Search className="h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search events..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-64"
                  />
                </div>
                
                <Select value={filters.status || "all"} onValueChange={(value) => handleFilterChange('status', value)}>
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="received">Received</SelectItem>
                    <SelectItem value="processing">Processing</SelectItem>
                    <SelectItem value="processed">Processed</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                    <SelectItem value="dead">Dead</SelectItem>
                  </SelectContent>
                </Select>
                
                <Select value={filters.eventType || ""} onValueChange={(value) => handleFilterChange('eventType', value)}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Event Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    {eventTypes?.map(type => (
                      <SelectItem key={type} value={type}>{type}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                <Select value={filters.source || ""} onValueChange={(value) => handleFilterChange('source', value)}>
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="Source" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Sources</SelectItem>
                    {sources?.map(source => (
                      <SelectItem key={source} value={source || ""}>{source || ""}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="newest">Newest</SelectItem>
                    <SelectItem value="oldest">Oldest</SelectItem>
                    <SelectItem value="status">Status</SelectItem>
                    <SelectItem value="tries">Tries</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Event List */}
              <div className="space-y-2">
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
                      className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                        selectedEventId === event.id.toString()
                          ? 'border-indigo-500 bg-indigo-50'
                          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                      onClick={() => setSelectedEventId(event.id.toString())}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className={`p-2 rounded-full ${getStatusColor(event.status)}`}>
                            {getStatusIcon(event.status)}
                          </div>
                          <div>
                            <div className="flex items-center space-x-2">
                              <span className="font-medium text-gray-900">{event.eventType}</span>
                              <Badge variant="outline" className="text-xs">
                                {event.aggregateType}
                              </Badge>
                            </div>
                            <div className="flex items-center space-x-4 text-sm text-gray-500">
                              <span>ID: {event.aggregateId}</span>
                              {event.tenantId && <span>Tenant: {event.tenantId}</span>}
                              {event.source && <span>Source: {event.source}</span>}
                              <span>{formatTime(event.createdAt)}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge className={getStatusColor(event.status)}>
                            {event.status}
                          </Badge>
                          {event.tries > 0 && (
                            <span className="text-sm text-gray-500">
                              {event.tries} tries
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Panel - Event Details */}
        <div className="lg:col-span-1">
          {selectedEventId ? (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Event Details</CardTitle>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(JSON.stringify(selectedEvent, null, 2), "Event data")}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleDeleteEvent}
                      disabled={deleteEventMutation.isPending}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {selectedEventLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600" />
                  </div>
                ) : selectedEventError ? (
                  <div className="text-center py-4">
                    <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-2" />
                    <p className="text-red-600">Failed to load event details</p>
                  </div>
                ) : selectedEvent ? (
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">Basic Information</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-500">Event Type:</span>
                          <span className="font-mono">{selectedEvent.eventType}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Aggregate Type:</span>
                          <span className="font-mono">{selectedEvent.aggregateType}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Aggregate ID:</span>
                          <span className="font-mono">{selectedEvent.aggregateId}</span>
                        </div>
                        {selectedEvent.tenantId && (
                          <div className="flex justify-between">
                            <span className="text-gray-500">Tenant ID:</span>
                            <span className="font-mono">{selectedEvent.tenantId}</span>
                          </div>
                        )}
                        {selectedEvent.source && (
                          <div className="flex justify-between">
                            <span className="text-gray-500">Source:</span>
                            <span className="font-mono">{selectedEvent.source}</span>
                          </div>
                        )}
                        {selectedEvent.sourceId && (
                          <div className="flex justify-between">
                            <span className="text-gray-500">Source ID:</span>
                            <span className="font-mono">{selectedEvent.sourceId}</span>
                          </div>
                        )}
                        <div className="flex justify-between">
                          <span className="text-gray-500">Status:</span>
                          <Badge className={getStatusColor(selectedEvent.status)}>
                            {selectedEvent.status}
                          </Badge>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Tries:</span>
                          <span>{selectedEvent.tries}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Created:</span>
                          <span>{new Date(selectedEvent.createdAt).toLocaleString()}</span>
                        </div>
                        {selectedEvent.nextAttemptAt && (
                          <div className="flex justify-between">
                            <span className="text-gray-500">Next Attempt:</span>
                            <span>{new Date(selectedEvent.nextAttemptAt).toLocaleString()}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {selectedEvent.lastError && (
                      <div>
                        <h4 className="font-medium text-gray-900 mb-2">Last Error</h4>
                        <div className="bg-red-50 border border-red-200 rounded p-3">
                          <p className="text-sm text-red-800 font-mono">{selectedEvent.lastError}</p>
                        </div>
                      </div>
                    )}
                    
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">Payload</h4>
                      <div className="bg-gray-50 border border-gray-200 rounded p-3 max-h-64 overflow-auto">
                        <pre className="text-xs text-gray-800 font-mono whitespace-pre-wrap">
                          {JSON.stringify(selectedEvent.payloadJson, null, 2)}
                        </pre>
                      </div>
                    </div>
                  </div>
                ) : null}
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <Inbox className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Select an event to view details
                </h3>
                <p className="text-gray-500">
                  Choose an event from the list to see its details and payload
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
