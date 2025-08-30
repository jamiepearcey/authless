"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Bell, Filter, Search, Loader2, Inbox, Trash2, Edit, ArrowLeft } from "lucide-react";
import { Button } from "@ui/base";
import { Input } from "@ui/base";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@ui/base";
import { Card, CardContent, CardHeader, CardTitle } from "@ui/base";
import { Badge } from "@ui/base";
import { trpc } from "@/lib/trpc";
import { toast } from "@ui/base";
import Link from "next/link";
import { BreadcrumbNavigation } from "@/components/BreadcrumbNavigation";

export default function AdminNotificationsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "unread" | "read" | "archived">("all");
  const [typeFilter, setTypeFilter] = useState<"all" | "info" | "success" | "warning" | "error">("all");
  const [priorityFilter, setPriorityFilter] = useState<"all" | "low" | "normal" | "high" | "urgent">("all");
  const [tenantFilter, setTenantFilter] = useState<string>("all");
  
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

  // Filter notifications by search term
  const filteredNotifications = notifications.filter(notification => {
    if (!searchTerm) return true;
    
    const searchLower = searchTerm.toLowerCase();
    const title = notification.title.toLowerCase();
    const description = notification.description?.toLowerCase() || "";
    const tenantName = notification.tenant?.name.toLowerCase() || "";
    
    return title.includes(searchLower) || 
           description.includes(searchLower) || 
           tenantName.includes(searchLower);
  });

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

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>   <div className="flex items-center space-x-4 mb-4">
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
                    { label: "Notifications", href: "/admin/notifications", current: true }
                  ]}
                  showHome={false}
                />
              </div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center space-x-3">
                <Bell className="h-8 w-8 text-indigo-600" />
                <span>Admin Notifications</span>
                {selectedNotifications.size > 0 && (
                  <Badge variant="secondary" className="ml-3 bg-indigo-100 text-indigo-800">
                    {selectedNotifications.size} selected
                  </Badge>
                )}
              </h1>
              <p className="mt-2 text-gray-600">
                Manage all notifications across the system
              </p>
            </div>
            
            <div className="flex space-x-3">
              <Button variant="outline" asChild>
                <Link href="/admin/notifications/manage">🔧 Manage & Test</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/admin/notifications/templates">📝 Templates</Link>
              </Button>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Notifications</CardTitle>
              <Bell className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{notifications.length}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Unread</CardTitle>
              <Badge variant="outline" className="bg-blue-100 text-blue-800">
                {notifications.filter(n => n.status === "unread").length}
              </Badge>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {notifications.filter(n => n.status === "unread").length}
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Webhooks</CardTitle>
              <Badge variant="outline">
                {webhooks?.length || 0}
              </Badge>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {webhooks?.length || 0}
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Tenants</CardTitle>
              <Badge variant="outline">
                {new Set(notifications.map(n => n.tenant?.name).filter(Boolean)).size}
              </Badge>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">
                {new Set(notifications.map(n => n.tenant?.name).filter(Boolean)).size}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-medium text-gray-900 flex items-center space-x-2">
              <Filter className="h-5 w-5" />
              <span>Filters</span>
            </h2>
            
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={resetFilters}>
                Reset filters
              </Button>
            )}
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
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
            
            {/* Status Filter */}
            <Select value={statusFilter} onValueChange={(value: any) => setStatusFilter(value)}>
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="unread">Unread</SelectItem>
                <SelectItem value="read">Read</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
              </SelectContent>
            </Select>
            
            {/* Type Filter */}
            <Select value={typeFilter} onValueChange={(value: any) => setTypeFilter(value)}>
              <SelectTrigger>
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
            
            {/* Priority Filter */}
            <Select value={priorityFilter} onValueChange={(value: any) => setPriorityFilter(value)}>
              <SelectTrigger>
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
            
            {/* Tenant Filter */}
            <Select value={tenantFilter} onValueChange={(value: any) => setTenantFilter(value)}>
              <SelectTrigger>
                <SelectValue placeholder="Tenant" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Tenants</SelectItem>
                {Array.from(new Set(notifications.map(n => n.tenant?.name).filter(Boolean))).map(tenantName => {
                  const tenant = notifications.find(n => n.tenant?.name === tenantName)?.tenant;
                  return (
                    <SelectItem key={tenantName} value={tenantName || ""}>
                      {tenant?.name || tenantName}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Notifications List */}
        <div className="space-y-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div className="text-center py-12">
              <Inbox className="h-16 w-16 mx-auto text-gray-300 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {hasActiveFilters ? "No notifications match your filters" : "No notifications yet"}
              </h3>
              <p className="text-gray-500">
                {hasActiveFilters 
                  ? "Try adjusting your filters or search terms"
                  : "You'll see notifications here when they arrive"
                }
              </p>
              {hasActiveFilters && (
                <Button onClick={resetFilters} className="mt-4">
                  Reset filters
                </Button>
              )}
            </div>
          ) : (
            <>
              {/* Batch Selection Toolbar */}
              {filteredNotifications.length > 0 && (
                <div className="flex items-center justify-between bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 p-4 rounded-lg mb-4 shadow-sm">
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={isSelectAll}
                        onChange={handleSelectAll}
                        className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                      />
                      <span className="text-sm font-medium text-gray-700">
                        {isSelectAll ? "Deselect All" : "Select All"}
                      </span>
                    </div>
                    {selectedNotifications.size > 0 && (
                      <span className="text-sm text-gray-600">
                        • {selectedNotifications.size} of {filteredNotifications.length} selected
                      </span>
                    )}
                    <span className="text-xs text-gray-500">
                      💡 Use Ctrl+A to select all, Escape to clear
                    </span>
                  </div>
                  
                  {selectedNotifications.size > 0 && (
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedNotifications(new Set())}
                        className="text-gray-600 border-gray-300 hover:bg-gray-50"
                      >
                        Clear Selection
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={handleBatchDelete}
                        disabled={batchDeleteMutation.isPending}
                        className="text-white bg-red-600 hover:bg-red-700 border-red-600"
                      >
                        {batchDeleteMutation.isPending ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Deleting...
                          </>
                        ) : (
                          <>
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete Selected ({selectedNotifications.size})
                          </>
                        )}
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {filteredNotifications.map((notification) => (
                <Card 
                  key={notification.id} 
                  className={`hover:shadow-md transition-all duration-200 ${
                    selectedNotifications.has(notification.id) 
                      ? 'ring-2 ring-indigo-500 bg-indigo-50/50' 
                      : ''
                  }`}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-3">
                        <span className="text-2xl">
                          {getTypeIcon(notification.type)}
                        </span>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between">
                            <h3 className="text-lg font-semibold text-gray-900 truncate">
                              {notification.title}
                            </h3>
                            <div className="flex items-center space-x-2">
                              <Badge variant="outline" className={getPriorityColor(notification.priority)}>
                                {notification.priority}
                              </Badge>
                              <Badge variant="outline">
                                {notification.status}
                              </Badge>
                            </div>
                          </div>
                          
                          {notification.description && (
                            <p className="text-sm text-gray-600 mt-1">
                              {notification.description}
                            </p>
                          )}
                          
                          <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                            <span>Created: {formatTime(notification.createdAt)}</span>
                            {notification.tenant && (
                              <>
                                <span>•</span>
                                <span>Tenant: {notification.tenant.name}</span>
                              </>
                            )}
                            {notification.role && (
                              <>
                                <span>•</span>
                                <span>Role: {notification.role}</span>
                              </>
                            )}
                            {notification.userId && (
                              <>
                                <span>•</span>
                                <span>User: {notification.userId}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-blue-600 border-blue-200 hover:bg-blue-50"
                        >
                          <Edit className="h-4 w-4 mr-1" />
                          Edit
                        </Button>
                        
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteNotification(notification.id)}
                          className="text-red-600 border-red-200 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4 mr-1" />
                          Delete
                        </Button>
                        
                        <input
                          type="checkbox"
                          checked={selectedNotifications.has(notification.id)}
                          onChange={(e) => handleSelectNotification(notification.id, e.target.checked)}
                          className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                        />
                      </div>
                    </div>
                  </CardHeader>
                  
                  {notification.recipients && notification.recipients.length > 0 && (
                    <CardContent className="pt-0">
                      <div className="border-t pt-3">
                        <h4 className="text-sm font-medium text-gray-900 mb-2">
                          Recipients ({notification.recipients.length})
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {notification.recipients.map((recipient) => (
                            <Badge key={recipient.id} variant="outline" className="text-xs">
                              {recipient.user.email} ({recipient.status})
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </CardContent>
                  )}
                </Card>
              ))}
              
              {/* Load More */}
              {hasNextPage && (
                <div className="flex justify-center py-6">
                  <Button
                    onClick={loadMore}
                    disabled={isFetchingNextPage}
                    variant="outline"
                    className="w-48"
                  >
                    {isFetchingNextPage ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Loading...
                      </>
                    ) : (
                      "Load more notifications"
                    )}
                  </Button>
                </div>
              )}
              
              {/* End of notifications */}
              {!hasNextPage && filteredNotifications.length > 0 && (
                <div className="text-center py-6 text-gray-500">
                  <p>You've reached the end of all notifications</p>
                </div>
              )}
            </>
          )}
        </div>
      </div>

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
    </div>
  );
}


