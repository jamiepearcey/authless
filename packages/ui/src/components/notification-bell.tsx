"use client";

import React, { useState, useEffect } from "react";
import { Bell, Check, Archive, X, Loader2 } from "lucide-react";
import { Button } from "./button";
import { Badge } from "./badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./dropdown-menu";
import { ScrollArea } from "./scroll-area";
import { Separator } from "./separator";
import { toast } from "./sonner";

interface Notification {
  id: string;
  notification: {
    id: string;
    title: string;
    description?: string | null;
    type?: "info" | "success" | "warning" | "error" | null | string
    priority: "low" | "normal" | "high" | "urgent" | string
    createdAt: string;
    tenant?: {
      name: string;
      slug: string;
    } | null;
  };
  status: "unread" | "read" | "archived" | string;
  readAt?: string | null;
}

interface NotificationBellProps {
  unreadCount: number;
  notifications: Notification[];
  onMarkAsRead: (notificationId: string) => Promise<void>;
  onMarkAllAsRead: () => Promise<void>;
  onArchive: (notificationId: string) => Promise<void>;
  isLoading?: boolean;
}

export function NotificationBell({
  unreadCount,
  notifications,
  onMarkAsRead,
  onMarkAllAsRead,
  onArchive,
  isLoading = false,
}: NotificationBellProps) {
  const [isOpen, setIsOpen] = useState(false);

  const getNotificationIcon = (type: string) => {
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
        return "text-red-600";
      case "high":
        return "text-orange-600";
      case "low":
        return "text-gray-600";
      default:
        return "text-blue-600";
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

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      await onMarkAsRead(notificationId);
      toast.success("Notification marked as read");
    } catch (error) {
      toast.error("Failed to mark notification as read");
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await onMarkAllAsRead();
      toast.success("All notifications marked as read");
      setIsOpen(false);
    } catch (error) {
      toast.error("Failed to mark all notifications as read");
    }
  };

  const handleArchive = async (notificationId: string) => {
    try {
      await onArchive(notificationId);
      toast.success("Notification archived");
    } catch (error) {
      toast.error("Failed to archive notification");
    }
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          onClick={() => setIsOpen(!isOpen)}
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 text-xs flex items-center justify-center"
            >
              {unreadCount > 99 ? "99+" : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent
        align="end"
        className="w-80 max-h-96"
        sideOffset={8}
      >
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>Notifications</span>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleMarkAllAsRead}
              className="h-6 px-2 text-xs"
            >
              Mark all read
            </Button>
          )}
        </DropdownMenuLabel>
        
        <DropdownMenuSeparator />
        
        <ScrollArea className="h-64">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : notifications.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Bell className="h-8 w-8 mx-auto mb-2 text-gray-300" />
              <p className="text-sm">No notifications</p>
            </div>
          ) : (
            <div className="space-y-1">
              {notifications.map((item) => (
                <div key={item.id} className="p-3 hover:bg-gray-50 rounded-lg">
                  <div className="flex items-start space-x-3">
                    <span className="text-lg">
                      {getNotificationIcon(item.notification.type ?? "info")}
                    </span>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {item.notification.title}
                        </p>
                        <span className={`text-xs font-medium ${getPriorityColor(item.notification.priority)}`}>
                          {item.notification.priority}
                        </span>
                      </div>
                      
                      {item.notification.description && (
                        <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                          {item.notification.description}
                        </p>
                      )}
                      
                      <div className="flex items-center justify-between mt-2">
                        <div className="flex items-center space-x-2 text-xs text-gray-500">
                          <span>{formatTime(item.notification.createdAt)}</span>
                          {item.notification.tenant && (
                            <>
                              <span>•</span>
                              <span>{item.notification.tenant.name}</span>
                            </>
                          )}
                        </div>
                        
                        <div className="flex items-center space-x-1">
                          {item.status === "unread" && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleMarkAsRead(item.notification.id)}
                              className="h-6 w-6 p-0 hover:bg-green-100 hover:text-green-700"
                            >
                              <Check className="h-3 w-3" />
                            </Button>
                          )}
                          
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleArchive(item.notification.id)}
                            className="h-6 w-6 p-0 hover:bg-gray-100"
                          >
                            <Archive className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
        
        {notifications.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <div className="p-2">
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => setIsOpen(false)}
              >
                View all notifications
              </Button>
            </div>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}


