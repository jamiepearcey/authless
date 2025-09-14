"use client";

import React, { useState, useEffect, useCallback } from "react";
import { 
  Bell, Search, Loader2, Inbox, Archive, Flag, Clock, CheckCircle, 
  AlertCircle, Info, AlertTriangle, RefreshCw, Building,
  FileText, Check
} from "lucide-react";
import { Button } from "@ui/base";
import { Input } from "@ui/base";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@ui/base";
import { Badge } from "@ui/base";
import { trpc } from "../../lib/trpc";
import { toast } from "@ui/base";

export default function NotificationsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "unread" | "read" | "archived">("all");
  const [typeFilter, setTypeFilter] = useState<"all" | "info" | "success" | "warning" | "error">("all");
  const [priorityFilter, setPriorityFilter] = useState<"all" | "low" | "normal" | "high" | "urgent">("all");
  
  // UI state for sidebar layout
  const [selectedNotification, setSelectedNotification] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "priority" | "type">("newest");

  // Get notifications with infinite scroll
  const {
    data: notificationsData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    refetch,
  } = trpc.getUserNotifications.useInfiniteQuery(
    {
      limit: 20,
      status: statusFilter === "all" ? undefined : statusFilter,
      type: typeFilter === "all" ? undefined : typeFilter,
      priority: priorityFilter === "all" ? undefined : priorityFilter,
    },
    {
      getNextPageParam: (lastPage) => lastPage.nextCursor,
    }
  );

  // Get unread count
  const { data: unreadCount, refetch: refetchUnreadCount } = trpc.getUnreadCount.useQuery();

  // Mutations
  const markAsReadMutation = trpc.markAsRead.useMutation({
    onSuccess: () => {
      refetch();
      refetchUnreadCount();
    },
  });

  const markAllAsReadMutation = trpc.markAllAsRead.useMutation({
    onSuccess: () => {
      refetch();
      refetchUnreadCount();
      toast.success("All notifications marked as read");
    },
  });

  const archiveMutation = trpc.archiveNotification.useMutation({
    onSuccess: () => {
      refetch();
      refetchUnreadCount();
    },
  });

  // Flatten notifications from all pages
  const notifications = notificationsData?.pages.flatMap(page => page.items) || [];

  // Filter and sort notifications
  const filteredNotifications = notifications
    .filter(notification => {
      if (!searchTerm) return true;
      
      const searchLower = searchTerm.toLowerCase();
      const title = notification.notification.title.toLowerCase();
      const description = notification.notification.description?.toLowerCase() || "";
      const tenantName = notification.notification.tenant?.name.toLowerCase() || "";
      
      return title.includes(searchLower) || 
             description.includes(searchLower) || 
             tenantName.includes(searchLower);
    })
    .sort((a, b) => {
      switch (sortBy) {
        case "newest":
          return new Date(b.notification.createdAt).getTime() - new Date(a.notification.createdAt).getTime();
        case "oldest":
          return new Date(a.notification.createdAt).getTime() - new Date(b.notification.createdAt).getTime();
        case "priority":
          const priorityOrder = { urgent: 4, high: 3, normal: 2, low: 1 };
          return (priorityOrder[b.notification.priority as keyof typeof priorityOrder] || 0) - 
                 (priorityOrder[a.notification.priority as keyof typeof priorityOrder] || 0);
        case "type":
          return a.notification.type.localeCompare(b.notification.type);
        default:
          return 0;
      }
    });

  // Get selected notification details
  const selectedNotificationData = selectedNotification 
    ? filteredNotifications.find(n => n.notification.id === selectedNotification)
    : null;

  // Handle mark as read
  const handleMarkAsRead = async (notificationId: string) => {
    try {
      await markAsReadMutation.mutateAsync({
        notificationId,
        userId: "current-user-id", // This should come from session
      });
      toast.success("Notification marked as read");
    } catch (error) {
      toast.error("Failed to mark notification as read");
    }
  };

  // Handle archive
  const handleArchive = async (notificationId: string) => {
    try {
      await archiveMutation.mutateAsync({ notificationId });
      toast.success("Notification archived");
    } catch (error) {
      toast.error("Failed to archive notification");
    }
  };

  // Handle mark all as read
  const handleMarkAllAsRead = async () => {
    try {
      await markAllAsReadMutation.mutateAsync();
    } catch (error) {
      toast.error("Failed to mark all notifications as read");
    }
  };

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
  };

  const hasActiveFilters = searchTerm || statusFilter !== "all" || typeFilter !== "all" || priorityFilter !== "all";

  // Helper functions from admin page
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

  return (
    <div className="flex-1 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center space-x-3">
                <Bell className="h-8 w-8 text-indigo-600" />
                <span>Notifications</span>
                {unreadCount != null && unreadCount > 0 && (
                  <span className="bg-indigo-100 text-indigo-800 text-sm font-medium px-3 py-1 rounded-full">
                    {unreadCount} unread
                  </span>
                )}
              </h1>
              <p className="mt-2 text-gray-600">
                Stay updated with important information and updates
              </p>
            </div>
            
            {unreadCount != null && unreadCount > 0 && (
              <Button onClick={handleMarkAllAsRead} variant="outline">
                <Check className="h-4 w-4 mr-2" />
                Mark all as read
              </Button>
            )}
          </div>
        </div>

        {/* Main Inbox Layout */}
        <div className="flex h-[calc(100vh-12rem)] overflow-hidden bg-white rounded-lg border border-gray-200">
        {/* Left Panel - Notification Titles */}
        <div className="w-2/5 bg-white border-r border-gray-200 flex flex-col">
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
                {filteredNotifications.map((item) => (
                  <div
                    key={item.id}
                    className={`p-4 hover:bg-gray-50 cursor-pointer transition-colors border-l-4 ${
                      selectedNotification === item.notification.id 
                        ? 'bg-indigo-50 border-l-indigo-500' 
                        : 'border-l-transparent'
                    } ${item.status === 'unread' ? 'bg-blue-50/30' : ''}`}
                    onClick={() => handleNotificationSelect(item.notification.id)}
                  >
                    <div className="flex items-start space-x-3">
                      {/* Notification Icon */}
                      <div className="flex-shrink-0 mt-1">
                        {getNotificationIcon(item.notification.type, item.status)}
                      </div>
                      
                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between">
                          <h3 className={`text-sm font-medium line-clamp-2 ${
                            item.status === 'unread' ? 'text-gray-900 font-semibold' : 'text-gray-700'
                          }`}>
                            {item.notification.title}
                          </h3>
                          
                          {/* Time and Priority */}
                          <div className="flex items-center space-x-1 ml-2 flex-shrink-0">
                            {getPriorityIcon(item.notification.priority)}
                            <span className="text-xs text-gray-400">
                              {formatTime(item.notification.createdAt)}
                            </span>
                          </div>
                        </div>
                        
                        {/* Meta Information */}
                        <div className="flex items-center justify-between mt-2">
                          <div className="flex items-center space-x-2 text-xs text-gray-500">
                            <Badge 
                              variant="outline" 
                              className={`text-xs ${item.status === 'unread' ? 'bg-blue-100 text-blue-800 border-blue-200' : ''}`}
                            >
                              {item.status}
                            </Badge>
                            <Badge variant="outline" className={`text-xs ${getPriorityColor(item.notification.priority)}`}>
                              {item.notification.type}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                
                {/* Load More */}
                {hasNextPage && (
                  <div className="p-4">
                    <Button
                      onClick={loadMore}
                      disabled={isFetchingNextPage}
                      variant="outline"
                      className="w-full"
                      size="sm"
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
                      {getNotificationIcon(selectedNotificationData.notification.type, selectedNotificationData.status)}
                      <div>
                        <h1 className="text-xl font-semibold text-gray-900">
                          {selectedNotificationData.notification.title}
                        </h1>
                        <div className="flex items-center space-x-4 mt-1">
                          <Badge variant="outline" className={getPriorityColor(selectedNotificationData.notification.priority)}>
                            {selectedNotificationData.notification.priority}
                          </Badge>
                          <Badge variant="outline" className={selectedNotificationData.status === 'unread' ? 'bg-blue-100 text-blue-800 border-blue-200' : ''}>
                            {selectedNotificationData.status}
                          </Badge>
                          <span className="text-sm text-gray-500">
                            {formatTime(selectedNotificationData.notification.createdAt)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    {selectedNotificationData.status === 'unread' && (
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleMarkAsRead(selectedNotificationData.notification.id)}
                      >
                        <Check className="h-4 w-4 mr-2" />
                        Mark as Read
                      </Button>
                    )}
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleArchive(selectedNotificationData.notification.id)}
                    >
                      <Archive className="h-4 w-4 mr-2" />
                      Archive
                    </Button>
                  </div>
                </div>
              </div>
              
              {/* Content Body */}
              <div className="flex-1 overflow-y-auto p-6">
                <div className="max-w-4xl">
                  {/* Main Content */}
                  <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
                    <div className="prose max-w-none">
                      <h2 className="text-lg font-medium text-gray-900 mb-4">Notification Details</h2>
                      {selectedNotificationData.notification.description ? (
                        <div className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                          {selectedNotificationData.notification.description}
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
                        <Badge variant="outline" className={getPriorityColor(selectedNotificationData.notification.priority)}>
                          {selectedNotificationData.notification.type}
                        </Badge>
                        <Badge variant="outline" className={getPriorityColor(selectedNotificationData.notification.priority)}>
                          {selectedNotificationData.notification.priority}
                        </Badge>
                      </div>
                      <div className="flex items-center space-x-4 text-gray-500">
                        {selectedNotificationData.notification.tenant && (
                          <div className="flex items-center space-x-1">
                            <Building className="h-3 w-3" />
                            <span>{selectedNotificationData.notification.tenant.name}</span>
                          </div>
                        )}
                        <div className="flex items-center space-x-1">
                          <Clock className="h-3 w-3" />
                          <span>{formatTime(selectedNotificationData.notification.createdAt)}</span>
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
    </div>
  );
}


