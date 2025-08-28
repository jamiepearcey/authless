"use client";

import React from "react";
import { Check, Archive, Clock, AlertCircle, CheckCircle, XCircle, Info } from "lucide-react";
import { Button } from "./button";
import { Badge } from "./badge";
import { Card, CardContent, CardHeader } from "./card";

interface NotificationCardProps {
  id: string;
  title: string;
  description?: string | null;
  type?: "info" | "success" | "warning" | "error";
  priority: "low" | "normal" | "high" | "urgent";
  status: "unread" | "read" | "archived";
  createdAt: string;
  readAt?: string | null;
  tenant?: {
    name: string | null;
    slug: string | null;
  } | null;
  onMarkAsRead: (notificationId: string) => Promise<void>;
  onArchive: (notificationId: string) => Promise<void>;
}

export function NotificationCard({
    id,
  title,
  description,
  type,
  priority,
  status,
  createdAt,
  readAt,
  tenant,
  onMarkAsRead,
  onArchive,
}: NotificationCardProps) {
  const getTypeIcon = () => {
    switch (type) {
      case "success":
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case "warning":
        return <AlertCircle className="h-5 w-5 text-yellow-600" />;
      case "error":
        return <XCircle className="h-5 w-5 text-red-600" />;
      default:
        return <Info className="h-5 w-5 text-blue-600" />;
    }
  };

  const getPriorityColor = () => {
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

  const getStatusColor = () => {
    switch (status) {
      case "unread":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "read":
        return "bg-green-100 text-green-800 border-green-200";
      case "archived":
        return "bg-gray-100 text-gray-800 border-gray-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
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

  const formatReadTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  return (
    <Card className={`transition-all duration-200 hover:shadow-md ${
      status === "unread" ? "border-l-4 border-l-blue-500" : ""
    }`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3">
            {getTypeIcon()}
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-semibold text-gray-900 truncate">
                {title}
              </h3>
              {tenant && (
                <p className="text-sm text-gray-500 mt-1">
                  From: {tenant.name}
                </p>
              )}
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <Badge variant="outline" className={getPriorityColor()}>
              {priority}
            </Badge>
            <Badge variant="outline" className={getStatusColor()}>
              {status}
            </Badge>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        {description && (
          <p className="text-gray-700 mb-4 leading-relaxed">
            {description}
          </p>
        )}
        
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4 text-sm text-gray-500">
            <div className="flex items-center space-x-1">
              <Clock className="h-4 w-4" />
              <span>Created: {formatTime(createdAt)}</span>
            </div>
            
            {readAt && (
              <div className="flex items-center space-x-1">
                <Check className="h-4 w-4" />
                <span>Read: {formatReadTime(readAt)}</span>
              </div>
            )}
          </div>
          
          <div className="flex items-center space-x-2">
            {status === "unread" && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onMarkAsRead(id)}
                className="text-green-600 border-green-200 hover:bg-green-50"
              >
                <Check className="h-4 w-4 mr-1" />
                Mark Read
              </Button>
            )}
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => onArchive(id)}
              className="text-gray-600 border-gray-200 hover:bg-gray-50"
            >
              <Archive className="h-4 w-4 mr-1" />
              Archive
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}


