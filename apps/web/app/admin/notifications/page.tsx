"use client";

import React, { useState, useEffect, useCallback } from "react";
import { 
  Bell, Search, Loader2, Inbox, Trash2, ArrowLeft, 
  Archive, Flag, Clock, CheckCircle, 
  AlertCircle, Info, AlertTriangle, 
  RefreshCw, Download, Building,
  FileText
} from "lucide-react";
import { Button } from "@ui/base";
import { Input } from "@ui/base";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@ui/base";
import { Badge } from "@ui/base";
import { trpc } from "@/lib/trpc";
import { toast } from "@ui/base";
import Link from "next/link";
import { BreadcrumbNavigation } from "@/components/BreadcrumbNavigation";
import { AdminPageLayout } from "@/components/AdminPageLayout";

export default function AdminNotificationsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "unread" | "read" | "archived">("all");
  const [typeFilter, setTypeFilter] = useState<"all" | "info" | "success" | "warning" | "error">("all");
  const [priorityFilter, setPriorityFilter] = useState<"all" | "low" | "normal" | "high" | "urgent">("all");
  const [tenantFilter, setTenantFilter] = useState<string>("all");
  
  // Inbox interface state
  const [selectedNotification, setSelectedNotification] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "priority" | "type">("newest");
  
  // Batch selection state
  const [selectedNotifications, setSelectedNotifications] = useState<Set<string>>(new Set());
  const [isSelectAll, setIsSelectAll] = useState(false);
  const [showBatchDeleteConfirm, setShowBatchDeleteConfirm] = useState(false);

  // Get all notifications with infinite scroll
  const {
    data: notificationsData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    refetch,
  } = trpc.getAllNotifications.useInfiniteQuery(
    {
      limit: 20,
      status: statusFilter === "all" ? undefined : statusFilter,
      type: typeFilter === "all" ? undefined : typeFilter,
      priority: priorityFilter === "all" ? undefined : priorityFilter,
      tenantId: tenantFilter === "all" ? undefined : tenantFilter,
    },
    {
      getNextPageParam: (lastPage) => lastPage.nextCursor,
    }
  );

  // Get webhook endpoints
  const { data: webhooks } = trpc.getWebhookEndpoints.useQuery({});

  // Mutations
  const deleteNotificationMutation = trpc.deleteNotification.useMutation({
    onSuccess: () => {
      refetch();
      toast.success("Notification deleted successfully");
    },
  });

  // Batch delete mutation
  const batchDeleteMutation = trpc.batchDeleteNotifications.useMutation({
    onSuccess: (deletedCount: number) => {
      setSelectedNotifications(new Set());
      setIsSelectAll(false);
      refetch();
      toast.success(`Successfully deleted ${deletedCount} notifications`);
    },
    onError: (error: any) => {
      toast.error(`Failed to delete notifications: ${error.message}`);
    },
  });

  // Flatten notifications from all pages
  const notifications = notificationsData?.pages.flatMap(page => page.items) || [];

  // Filter and sort notifications
  const filteredNotifications = notifications
    .filter(notification => {
      if (!searchTerm) return true;
      
      const searchLower = searchTerm.toLowerCase();
      const title = notification.title.toLowerCase();
      const description = notification.description?.toLowerCase() || "";
      const tenantName = notification.tenant?.name.toLowerCase() || "";
      
      return title.includes(searchLower) || 
             description.includes(searchLower) || 
             tenantName.includes(searchLower);
    })
    .sort((a, b) => {
      switch (sortBy) {
        case "newest":
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case "oldest":
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        case "priority":
          const priorityOrder = { urgent: 4, high: 3, normal: 2, low: 1 };
          return (priorityOrder[b.priority as keyof typeof priorityOrder] || 0) - 
                 (priorityOrder[a.priority as keyof typeof priorityOrder] || 0);
        case "type":
          return a.type.localeCompare(b.type);
        default:
          return 0;
      }
    });

  // Get selected notification details
  const selectedNotificationData = selectedNotification 
    ? filteredNotifications.find(n => n.id === selectedNotification)
    : null;

  // Handle delete notification
  const handleDeleteNotification = async (id: string) => {
    if (confirm("Are you sure you want to delete this notification? This action cannot be undone.")) {
      try {
        await deleteNotificationMutation.mutateAsync({ id });
      } catch (error) {
        toast.error("Failed to delete notification");
      }
    }
  };

  // Handle batch delete
  const handleBatchDelete = async () => {
    if (selectedNotifications.size === 0) return;
    
    setShowBatchDeleteConfirm(true);
  };

  // Confirm and execute batch delete
  const confirmBatchDelete = async () => {
    try {
      await batchDeleteMutation.mutateAsync({
        ids: Array.from(selectedNotifications)
      });
      setShowBatchDeleteConfirm(false);
    } catch (error) {
      toast.error("Failed to delete notifications");
    }
  };

  // Handle select all
  const handleSelectAll = () => {
    if (isSelectAll) {
      setSelectedNotifications(new Set());
      setIsSelectAll(false);
    } else {
      const allIds = new Set(filteredNotifications.map(n => n.id));
      setSelectedNotifications(allIds);
      setIsSelectAll(true);
    }
  };

  // Handle individual selection
  const handleSelectNotification = (id: string, checked: boolean) => {
    const newSelected = new Set(selectedNotifications);
    if (checked) {
      newSelected.add(id);
    } else {
      newSelected.delete(id);
    }
    setSelectedNotifications(newSelected);
    
    // Update select all state
    if (newSelected.size === filteredNotifications.length) {
      setIsSelectAll(true);
    } else if (newSelected.size === 0) {
      setIsSelectAll(false);
    } else {
      setIsSelectAll(false);
    }
  };

  // Update select all state when filters change
  useEffect(() => {
    if (selectedNotifications.size === filteredNotifications.length && filteredNotifications.length > 0) {
      setIsSelectAll(true);
    } 
  }, [filteredNotifications, selectedNotifications]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Ctrl+A or Cmd+A for select all
      if ((event.ctrlKey || event.metaKey) && event.key === 'a') {
        handleSelectAll()
      }
      
      // Escape to clear selection
      if (event.key === 'Escape' && selectedNotifications.size > 0) {
        setSelectedNotifications(new Set());
        setIsSelectAll(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedNotifications.size, handleSelectAll]);

  // Infinite scroll handler
  const loadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  // Auto-load more when scrolling
  useEffect(() => {
    const handleScroll = () => {
      if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 1000) {
        loadMore();
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [loadMore]);

  // Reset filters
  const resetFilters = () => {
    setSearchTerm("");
    setStatusFilter("all");
    setTypeFilter("all");
    setPriorityFilter("all");
    setTenantFilter("all");
  };

  const hasActiveFilters = searchTerm || statusFilter !== "all" || typeFilter !== "all" || priorityFilter !== "all" || tenantFilter !== "all";

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "success":
        return "🎉";
      case "warning":
        return "⚠️";
      case "error":
        return "🚨";
      default:
        return "ℹ️";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "urgent":
        return "bg-red-100 text-red-800 border-red-200";
      case "high":
        return "bg-orange-100 text-orange-800 border-orange-200";
      case "low":
        return "bg-gray-100 text-gray-800 border-gray-200";
      default:
        return "bg-blue-100 text-blue-800 border-blue-200";
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMinutes < 1) return "Just now";
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  // Inbox helper functions
  const handleNotificationSelect = (notificationId: string) => {
    setSelectedNotification(notificationId);
  };

  const getNotificationIcon = (type: string, status: string) => {
    if (status === "unread") {
      switch (type) {
        case "success": return <CheckCircle className="h-5 w-5 text-green-600" />;
        case "warning": return <AlertTriangle className="h-5 w-5 text-yellow-600" />;
        case "error": return <AlertCircle className="h-5 w-5 text-red-600" />;
        default: return <Info className="h-5 w-5 text-blue-600" />;
      }
    } else {
      switch (type) {
        case "success": return <CheckCircle className="h-5 w-5 text-green-400" />;
        case "warning": return <AlertTriangle className="h-5 w-5 text-yellow-400" />;
        case "error": return <AlertCircle className="h-5 w-5 text-red-400" />;
        default: return <Info className="h-5 w-5 text-gray-400" />;
      }
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case "urgent": return <Flag className="h-4 w-4 text-red-600" />;
      case "high": return <Flag className="h-4 w-4 text-orange-600" />;
      case "normal": return <Flag className="h-4 w-4 text-blue-600" />;
      case "low": return <Flag className="h-4 w-4 text-gray-400" />;
      default: return <Flag className="h-4 w-4 text-gray-400" />;
    }
  };

  return (
    <AdminPageLayout
      title="Notifications"
      description="Manage system notifications and alerts"
      actions={
        <div className="flex items-center space-x-3">
          <Button variant="outline" asChild>
            <Link href="/admin/notifications/manage">Manage & Test</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/admin/notifications/templates">Templates</Link>
          </Button>
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
            { label: "Notifications", current: true },
          ]}
          showHome={false}
        />
      </div>

      {/* Main Inbox Layout */}
      <div className="flex h-[calc(100vh-12rem)] overflow-hidden bg-white rounded-lg border border-gray-200">

        {/* Main Content Area - SharePoint Style */}
        <div className="flex-1 flex">
          {/* Left Panel - Notification Titles */}
          <div className="w-2/5 min-w-[376px] bg-white border-r border-gray-200 flex flex-col">
            {/* Left Panel Header */}
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">
                  {statusFilter === "all" ? "All Notifications" : 
                   statusFilter === "unread" ? "Unread Notifications" :
                   statusFilter === "read" ? "Read Notifications" :
                   statusFilter === "archived" ? "Archived Notifications" : "Notifications"}
                </h2>
                <div className="flex items-center space-x-2">
                  <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="sm">
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              
              {/* Search and Filters */}
              <div className="space-y-3">
                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search notifications..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                
                {/* Quick Filters Toolbar */}
                <div className="flex items-center space-x-1 bg-gray-100 rounded-lg p-1">
                  <Button
                    variant={statusFilter === "all" ? "default" : "ghost"}
                    size="sm"
                    className="h-7 px-3 text-[10px] font-medium"
                    onClick={() => setStatusFilter("all")}
                  >
                    All
                    <Badge variant="secondary" className="ml-1 h-4 px-1 text-xs">
                      {notifications.length}
                    </Badge>
                  </Button>
                  <Button
                    variant={statusFilter === "unread" ? "default" : "ghost"}
                    size="sm"
                    className="h-7 px-3 text-[10px] font-medium"
                    onClick={() => setStatusFilter("unread")}
                  >
                    Unread
                    <Badge variant="secondary" className="ml-1 h-4 px-1 text-xs">
                      {notifications.filter(n => n.status === "unread").length}
                    </Badge>
                  </Button>
                  <Button
                    variant={statusFilter === "read" ? "default" : "ghost"}
                    size="sm"
                    className="h-7 px-3 text-[10px] font-medium"
                    onClick={() => setStatusFilter("read")}
                  >
                    Read
                    <Badge variant="secondary" className="ml-1 h-4 px-1 text-xs">
                      {notifications.filter(n => n.status === "read").length}
                    </Badge>
                  </Button>
                  <Button
                    variant={statusFilter === "archived" ? "default" : "ghost"}
                    size="sm"
                    className="h-7 px-3 text-[10px] font-medium"
                    onClick={() => setStatusFilter("archived")}
                  >
                    Archived
                    <Badge variant="secondary" className="ml-1 h-4 px-1 text-xs">
                      {notifications.filter(n => n.status === "archived").length}
                    </Badge>
                  </Button>
                </div>
                
                {/* Additional Filters Toolbar */}
                <div className="flex items-center space-x-2">
                  <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
                    <SelectTrigger className="h-7 w-32 text-[10px]">
                      <SelectValue placeholder="Sort by" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="newest">Newest first</SelectItem>
                      <SelectItem value="oldest">Oldest first</SelectItem>
                      <SelectItem value="priority">Priority</SelectItem>
                      <SelectItem value="type">Type</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  <Select value={typeFilter} onValueChange={(value: any) => setTypeFilter(value)}>
                    <SelectTrigger className="h-7 w-28 text-[10px]">
                      <SelectValue placeholder="Type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="info">Info</SelectItem>
                      <SelectItem value="success">Success</SelectItem>
                      <SelectItem value="warning">Warning</SelectItem>
                      <SelectItem value="error">Error</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  <Select value={priorityFilter} onValueChange={(value: any) => setPriorityFilter(value)}>
                    <SelectTrigger className="h-7 w-28 text-[10px]">
                      <SelectValue placeholder="Priority" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Priorities</SelectItem>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="mt-3 flex items-center space-x-2">
                <Badge variant="outline" className="bg-indigo-100 text-indigo-800">
                  {filteredNotifications.length} total
                </Badge>
                {selectedNotifications.size > 0 && (
                  <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                    {selectedNotifications.size} selected
                  </Badge>
                )}
              </div>
            </div>
            
            {/* Notification List */}
            <div className="flex-1 overflow-y-auto">
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
                </div>
              ) : filteredNotifications.length === 0 ? (
                <div className="text-center py-12 px-4">
                  <Inbox className="h-16 w-16 mx-auto text-gray-300 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    {hasActiveFilters ? "No notifications match your filters" : "No notifications yet"}
                  </h3>
                  <p className="text-gray-500 text-sm">
                    {hasActiveFilters 
                      ? "Try adjusting your filters or search terms"
                      : "You'll see notifications here when they arrive"
                    }
                  </p>
                  {hasActiveFilters && (
                    <Button onClick={resetFilters} className="mt-4" size="sm">
                      Reset filters
                    </Button>
                  )}
                </div>
              ) : (
                <div className="divide-y divide-gray-200">
                  {filteredNotifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={`p-4 hover:bg-gray-50 cursor-pointer transition-colors border-l-4 ${
                        selectedNotification === notification.id 
                          ? 'bg-indigo-50 border-l-indigo-500' 
                          : 'border-l-transparent'
                      } ${notification.status === 'unread' ? 'bg-blue-50/30' : ''}`}
                      onClick={() => handleNotificationSelect(notification.id)}
                    >
                      <div className="flex items-start space-x-3">
                        {/* Notification Icon */}
                        <div className="flex-shrink-0 mt-1">
                          {getNotificationIcon(notification.type, notification.status)}
                        </div>
                        
                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between">
                            <h3 className={`text-sm font-medium line-clamp-2 ${
                              notification.status === 'unread' ? 'text-gray-900 font-semibold' : 'text-gray-700'
                            }`}>
                              {notification.title}
                            </h3>
                            
                            {/* Time and Priority */}
                            <div className="flex items-center space-x-1 ml-2 flex-shrink-0">
                              {getPriorityIcon(notification.priority)}
                              <span className="text-xs text-gray-400">
                                {formatTime(notification.createdAt)}
                              </span>
                            </div>
                          </div>
                          
                          {/* Meta Information */}
                          <div className="flex items-center justify-between mt-2">
                            <div className="flex items-center space-x-2 text-xs text-gray-500">
                              <Badge 
                                variant="outline" 
                                className={`text-xs ${notification.status === 'unread' ? 'bg-blue-100 text-blue-800 border-blue-200' : ''}`}
                              >
                                {notification.status}
                              </Badge>
                              <Badge variant="outline" className={`text-xs ${getPriorityColor(notification.priority)}`}>
                                {notification.type}
                              </Badge>
                            </div>
                            
                            {/* Actions */}
                            <div className="flex items-center space-x-1">
                              <input
                                type="checkbox"
                                checked={selectedNotifications.has(notification.id)}
                                onChange={(e) => {
                                  e.stopPropagation();
                                  handleSelectNotification(notification.id, e.target.checked);
                                }}
                                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          
          {/* Right Panel - Full Notification Content */}
          <div className="flex-1 bg-gray-50 flex flex-col">
            {selectedNotificationData ? (
              <>
                {/* Content Header */}
                <div className="bg-white border-b border-gray-200 px-6 py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-3">
                        {getNotificationIcon(selectedNotificationData.type, selectedNotificationData.status)}
                        <div>
                          <h1 className="text-xl font-semibold text-gray-900">
                            {selectedNotificationData.title}
                          </h1>
                          <div className="flex items-center space-x-4 mt-1">
                            <Badge variant="outline" className={getPriorityColor(selectedNotificationData.priority)}>
                              {selectedNotificationData.priority}
                            </Badge>
                            <Badge variant="outline" className={selectedNotificationData.status === 'unread' ? 'bg-blue-100 text-blue-800 border-blue-200' : ''}>
                              {selectedNotificationData.status}
                            </Badge>
                            <span className="text-sm text-gray-500">
                              {formatTime(selectedNotificationData.createdAt)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Button variant="outline" size="sm">
                        <Archive className="h-4 w-4 mr-2" />
                        Archive
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handleDeleteNotification(selectedNotificationData.id)}>
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </Button>
                    </div>
                  </div>
                </div>
                
                {/* Content Body */}
                <div className="bg-white flex-1 overflow-y-auto p-6">
                  <div className="max-w-4xl">
                    {/* Main Content */}
                    <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
                      <div className="prose max-w-none">
                        <h2 className="text-lg font-medium text-gray-900 mb-4">Notification Details</h2>
                        {selectedNotificationData.description ? (
                          <div className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                            {selectedNotificationData.description}
                          </div>
                        ) : (
                          <p className="text-gray-500 italic">No additional details provided.</p>
                        )}
                      </div>
                    </div>
                    
                    {/* Simple Metadata */}
                    <div className="bg-white rounded-lg border border-gray-200 p-4">
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center space-x-4">
                          <Badge variant="outline" className={selectedNotificationData.status === 'unread' ? 'bg-blue-100 text-blue-800 border-blue-200' : ''}>
                            {selectedNotificationData.status}
                          </Badge>
                          <Badge variant="outline" className={getPriorityColor(selectedNotificationData.priority)}>
                            {selectedNotificationData.type}
                          </Badge>
                          <Badge variant="outline" className={getPriorityColor(selectedNotificationData.priority)}>
                            {selectedNotificationData.priority}
                          </Badge>
                        </div>
                        <div className="flex items-center space-x-4 text-gray-500">
                          {selectedNotificationData.tenant && (
                            <div className="flex items-center space-x-1">
                              <Building className="h-3 w-3" />
                              <span>{selectedNotificationData.tenant.name}</span>
                            </div>
                          )}
                          <div className="flex items-center space-x-1">
                            <Clock className="h-3 w-3" />
                            <span>{formatTime(selectedNotificationData.createdAt)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              /* Empty State */
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <FileText className="h-16 w-16 mx-auto text-gray-300 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    Select a notification
                  </h3>
                  <p className="text-gray-500">
                    Choose a notification from the list to view its details
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Batch Actions Toolbar - Only show when notifications are selected */}
      {selectedNotifications.size > 0 && (
        <div className="bg-indigo-50 border-t border-indigo-200 px-6 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <span className="text-sm font-medium text-indigo-900">
                {selectedNotifications.size} notification{selectedNotifications.size > 1 ? 's' : ''} selected
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedNotifications(new Set())}
                className="text-indigo-600 hover:text-indigo-800"
              >
                Clear Selection
              </Button>
            </div>
            
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {/* TODO: Mark as read */}}
                className="text-indigo-600 border-indigo-300 hover:bg-indigo-100"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Mark as Read
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="text-indigo-600 border-indigo-300 hover:bg-indigo-100"
              >
                <Archive className="h-4 w-4 mr-2" />
                Archive
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleBatchDelete}
                disabled={batchDeleteMutation.isPending}
              >
                {batchDeleteMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Selected
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Batch Delete Confirmation Dialog */}
      {showBatchDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md mx-4 shadow-xl">
            <div className="flex items-center space-x-3 mb-4">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                  <Trash2 className="h-5 w-5 text-red-600" />
                </div>
              </div>
              <div>
                <h3 className="text-lg font-medium text-gray-900">
                  Delete Notifications
                </h3>
                <p className="text-sm text-gray-500">
                  This action cannot be undone
                </p>
              </div>
            </div>
            
            <p className="text-gray-700 mb-6">
              Are you sure you want to delete <strong>{selectedNotifications.size}</strong> notification{selectedNotifications.size > 1 ? 's' : ''}?
            </p>
            
            <div className="flex space-x-3">
              <Button
                variant="outline"
                onClick={() => setShowBatchDeleteConfirm(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={confirmBatchDelete}
                disabled={batchDeleteMutation.isPending}
                className="flex-1"
              >
                {batchDeleteMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  'Delete'
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </AdminPageLayout>
  );
}


