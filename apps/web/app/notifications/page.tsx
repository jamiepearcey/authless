"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Bell, Filter, Search, Check, Archive, Loader2, Inbox } from "lucide-react";
import { Button } from "@ui/base";
import { Input } from "@ui/base";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@ui/base";
import { NotificationCard } from "@ui/base";
import { trpc } from "../../lib/trpc";
import { toast } from "@ui/base";

export default function NotificationsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "unread" | "read" | "archived">("all");
  const [typeFilter, setTypeFilter] = useState<"all" | "info" | "success" | "warning" | "error">("all");
  const [priorityFilter, setPriorityFilter] = useState<"all" | "low" | "normal" | "high" | "urgent">("all");

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

  // Filter notifications by search term
  const filteredNotifications = notifications.filter(notification => {
    if (!searchTerm) return true;
    
    const searchLower = searchTerm.toLowerCase();
    const title = notification.notification.title.toLowerCase();
    const description = notification.notification.description?.toLowerCase() || "";
    const tenantName = notification.notification.tenant?.name.toLowerCase() || "";
    
    return title.includes(searchLower) || 
           description.includes(searchLower) || 
           tenantName.includes(searchLower);
  });

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

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
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
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
              {filteredNotifications.map((item) => (
                <NotificationCard
                  key={item.id}
                  id={item.notification.id}
                  title={item.notification.title}
                  description={item.notification.description}
                  type={item.notification.type as "info" | "success" | "warning" | "error"}
                  priority={item.notification.priority as "low" | "normal" | "high" | "urgent"}
                  status={item.status as "unread" | "read" | "archived"}
                  createdAt={item.notification.createdAt}
                  readAt={item.readAt}
                  tenant={item.notification.tenant}
                  onMarkAsRead={handleMarkAsRead}
                  onArchive={handleArchive}
                />
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
                  <p>You've reached the end of your notifications</p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}


