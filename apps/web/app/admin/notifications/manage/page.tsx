"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@ui/base";
import { Button } from "@ui/base";
import { Badge } from "@ui/base";
import { Input } from "@ui/base";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@ui/base";
import { Textarea } from "@ui/base";
import { trpc } from "@/lib/trpc";
import { useCentrifugo, useBasicNotificationSubscription, NotificationMessage } from "@/hooks/useNotificationSubscription";
import { CentrifugoDebugPanel } from "@/components/CentrifugoDebugPanel";
import { ArrowLeft, Bell, Plus, Send, Activity, Loader2 } from "lucide-react";
import Link from "next/link";
import { BreadcrumbNavigation } from "@/components/BreadcrumbNavigation";

interface RealtimeNotification {
  id: string;
  title: string;
  description?: string;
  type: 'info' | 'success' | 'warning' | 'error';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  createdAt: string;
  receivedAt: string;
}

export default function NotificationManagementPage() {
  const { data: session } = useSession();
  const [receivedNotifications, setReceivedNotifications] = useState<RealtimeNotification[]>([]);
  const [connectionLog, setConnectionLog] = useState<string[]>([]);
  
  // Notification creation form state
  const [notificationForm, setNotificationForm] = useState({
    title: '',
    description: '',
    type: 'info' as const,
    priority: 'normal' as const,
    targetType: 'global' as 'global' | 'user' | 'tenant' | 'role',
    targetId: '',
  });

  // Centrifugo connection
  const { isConnected, error } = useCentrifugo();
  
  // Real-time notification subscription
  const { isSubscribed, hasErrors } = useBasicNotificationSubscription((message: NotificationMessage) => {
    console.log("✅ NOTIFICATION RECEIVED:", message);
    addToLog(`📨 RAW MESSAGE: ${JSON.stringify(message)}`);
    
    const notification: RealtimeNotification = {
      ...message.notification,
      receivedAt: new Date().toISOString(),
    };
    
    setReceivedNotifications(prev => [notification, ...prev]);
    addToLog(`📨 Received: ${notification.title} (${notification.type}/${notification.priority})`);
  });

  // Debug logging for subscription state
  useEffect(() => {
    console.log("🔍 [ManagementPage] Subscription state changed:", { isConnected, isSubscribed, hasErrors, error });
    addToLog(`🔍 Subscription state: connected=${isConnected}, subscribed=${isSubscribed}, errors=${hasErrors}`);
  }, [isConnected, isSubscribed, hasErrors, error]);

  // Create notification mutation
  const createNotification = trpc.createNotification.useMutation({
    onSuccess: (notification) => {
      addToLog(`✅ Created notification: ${notification.title}`);
      // Reset form
      setNotificationForm({
        title: '',
        description: '',
        type: 'info',
        priority: 'normal',
        targetType: 'global',
        targetId: '',
      });
    },
    onError: (error) => {
      addToLog(`❌ Failed to create notification: ${error.message}`);
    },
  });

  const addToLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setConnectionLog(prev => [`[${timestamp}] ${message}`, ...prev.slice(0, 19)]);
  };

  useEffect(() => {
    addToLog("🚀 Notification Management page loaded");
    if (session?.user?.id) {
      addToLog(`👤 User ID: ${session.user.id}`);
      addToLog(`📡 Expected channels: notifications:global, notifications:user:${session.user.id}`);
    }
  }, [session?.user?.id]);

  useEffect(() => {
    if (isConnected) {
      addToLog("🟢 Connected to Centrifugo");
    } else {
      addToLog("🔴 Disconnected from Centrifugo");
    }
  }, [isConnected]);

  useEffect(() => {
    if (isSubscribed) {
      addToLog("📡 Subscribed to notification channels");
    }
  }, [isSubscribed]);

  useEffect(() => {
    if (error) {
      addToLog(`❌ Connection error: ${error}`);
    }
    if (hasErrors) {
      addToLog(`❌ Subscription errors detected`);
    }
  }, [error, hasErrors]);

  const sendNotification = async () => {
    if (!notificationForm.title.trim()) {
      addToLog("❌ Notification title is required");
      return;
    }

    const notificationData: any = {
      title: notificationForm.title,
      description: notificationForm.description || undefined,
      type: notificationForm.type,
      priority: notificationForm.priority,
    };

    // Add targeting based on type
    if (notificationForm.targetType === 'user' && notificationForm.targetId) {
      notificationData.userId = notificationForm.targetId;
    } else if (notificationForm.targetType === 'tenant' && notificationForm.targetId) {
      notificationData.tenantId = notificationForm.targetId;
    } else if (notificationForm.targetType === 'role' && notificationForm.targetId) {
      // For role-based, we'd need both tenant and role
      const [tenantId, role] = notificationForm.targetId.split(':');
      notificationData.tenantId = tenantId;
      notificationData.role = role;
    }
    // Global notifications don't need additional targeting

    addToLog(`📤 Sending ${notificationForm.targetType} notification...`);
    createNotification.mutate(notificationData);
  };

  const clearNotifications = () => {
    setReceivedNotifications([]);
    addToLog("🧹 Cleared received notifications");
  };


  return (
    <div className=" bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto ">
        {/* Header */}
        <div className="mb-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center space-x-4 mb-4">
                <Link 
                  href="/admin/notifications"
                  className="inline-flex items-center text-indigo-600 hover:text-indigo-800 transition-colors"
                >
                  <ArrowLeft className="h-5 w-5 mr-2" />
                  Back to Notifications
                </Link>
                <div className="h-6 w-px bg-gray-300" />
                <BreadcrumbNavigation
                  items={[
                    { label: "Admin", href: "/admin" },
                    { label: "Notifications", href: "/admin/notifications" },
                    { label: "Management", current: true },
                  ]}
                  showHome={false}
                />
              </div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center space-x-3 mt-2">
                <Bell className="h-8 w-8 text-indigo-600" />
                <span>Notification Management</span>
              </h1>
              <p className="mt-2 text-gray-600">
                Create, test, and monitor real-time notifications across the system
              </p>
            </div>
            
            <div className="flex items-center space-x-2">
              <Badge variant={isConnected ? "default" : "destructive"} className="flex items-center space-x-1">
                {isConnected ? "🟢" : "🔴"}
                <span>{isConnected ? "Connected" : "Disconnected"}</span>
              </Badge>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Connection Status</CardTitle>
              <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{isConnected ? 'Connected' : 'Disconnected'}</div>
              <p className="text-xs text-muted-foreground">
                {isConnected ? 'Real-time updates active' : 'No connection'}
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Subscription Status</CardTitle>
              <div className={`w-3 h-3 rounded-full ${isSubscribed ? 'bg-green-500' : 'bg-yellow-500'}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{isSubscribed ? 'Active' : 'Inactive'}</div>
              <p className="text-xs text-muted-foreground">
                {isSubscribed ? 'Listening for notifications' : 'Not subscribed'}
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Received Today</CardTitle>
              <Bell className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{receivedNotifications.length}</div>
              <p className="text-xs text-muted-foreground">
                Real-time notifications
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">System Health</CardTitle>
              <div className={`w-3 h-3 rounded-full ${!error && !hasErrors ? 'bg-green-500' : 'bg-red-500'}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{!error && !hasErrors ? 'Healthy' : 'Issues'}</div>
              <p className="text-xs text-muted-foreground">
                {!error && !hasErrors ? 'All systems operational' : 'Errors detected'}
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column - Notification Creation */}
          <div className="space-y-6">
            {/* Create Notification Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Plus className="h-5 w-5" />
                  <span>Create Notification</span>
                </CardTitle>
                <CardDescription>
                  Send a new notification to test the system
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Title *
                  </label>
                  <Input
                    placeholder="Notification title"
                    value={notificationForm.title}
                    onChange={(e) => setNotificationForm(prev => ({ ...prev, title: e.target.value }))}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <Textarea
                    placeholder="Notification description (optional)"
                    value={notificationForm.description}
                    onChange={(e) => setNotificationForm(prev => ({ ...prev, description: e.target.value }))}
                    rows={4}
                    className="resize-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Type
                    </label>
                    <Select 
                      value={notificationForm.type} 
                      onValueChange={(value: any) => setNotificationForm(prev => ({ ...prev, type: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="info">ℹ️ Info</SelectItem>
                        <SelectItem value="success">🎉 Success</SelectItem>
                        <SelectItem value="warning">⚠️ Warning</SelectItem>
                        <SelectItem value="error">🚨 Error</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Priority
                    </label>
                    <Select 
                      value={notificationForm.priority} 
                      onValueChange={(value: any) => setNotificationForm(prev => ({ ...prev, priority: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">🔵 Low</SelectItem>
                        <SelectItem value="normal">🟢 Normal</SelectItem>
                        <SelectItem value="high">🟠 High</SelectItem>
                        <SelectItem value="urgent">🔴 Urgent</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Target Type
                  </label>
                  <Select 
                    value={notificationForm.targetType} 
                    onValueChange={(value: any) => setNotificationForm(prev => ({ ...prev, targetType: value, targetId: '' }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="global">Global (All Users)</SelectItem>
                      <SelectItem value="user">Specific User</SelectItem>
                      <SelectItem value="tenant">Tenant</SelectItem>
                      <SelectItem value="role">Role in Tenant</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {notificationForm.targetType !== 'global' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Target ID
                    </label>
                    <Input
                      placeholder={
                        notificationForm.targetType === 'user' ? 'User ID' :
                        notificationForm.targetType === 'tenant' ? 'Tenant ID' :
                        'TenantID:Role (e.g., tenant123:admin)'
                      }
                      value={notificationForm.targetId}
                      onChange={(e) => setNotificationForm(prev => ({ ...prev, targetId: e.target.value }))}
                    />
                  </div>
                )}

                <Button
                  onClick={sendNotification}
                  disabled={createNotification.isPending || !notificationForm.title.trim()}
                  className="w-full"
                >
                  {createNotification.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Send Notification
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Connection Status Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Activity className="h-5 w-5" />
                  <span>Connection Status</span>
                </CardTitle>
                <CardDescription>
                  Real-time connection and subscription status
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Centrifugo Connection:</span>
                    <Badge variant={isConnected ? "default" : "destructive"}>
                      {isConnected ? "🟢 Connected" : "🔴 Disconnected"}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Subscription Status:</span>
                    <Badge variant={isSubscribed ? "default" : "secondary"}>
                      {isSubscribed ? "📡 Subscribed" : "❌ Not Subscribed"}
                    </Badge>
                  </div>
                  {error && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Error:</span>
                      <Badge variant="destructive">{error}</Badge>
                    </div>
                  )}
                  {hasErrors && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Subscription Errors:</span>
                      <Badge variant="destructive">❌ Errors Detected</Badge>
                    </div>
                  )}
                  
                  {/* Subscription Channels */}
                  {session?.user?.id && (
                    <div className="pt-3 border-t">
                      <div className="text-sm text-gray-600 mb-2">Your Subscription Channels:</div>
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2 text-xs">
                          <div className="w-2 h-2 bg-blue-500 rounded-full" />
                          <span className="font-mono">notifications:global</span>
                        </div>
                        <div className="flex items-center space-x-2 text-xs">
                          <div className="w-2 h-2 bg-green-500 rounded-full" />
                          <span className="font-mono">notifications:user:{session.user.id}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Real-time Monitoring */}
          <div className="space-y-6">
            {/* Received Notifications Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Received Notifications</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={clearNotifications}
                    className="text-gray-600"
                  >
                    Clear All
                  </Button>
                </CardTitle>
                <CardDescription>
                  Real-time notifications received via Centrifugo
                </CardDescription>
              </CardHeader>
              <CardContent>
                {receivedNotifications.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Bell className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                    <p>No notifications received yet</p>
                    <p className="text-sm">Send a notification to see it appear here</p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {receivedNotifications.map((notification, index) => (
                      <div
                        key={`${notification.id}-${index}`}
                        className="border rounded-lg p-3 bg-gray-50"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <h4 className="font-medium text-gray-900">{notification.title}</h4>
                          <div className="flex items-center space-x-2">
                            <Badge variant="outline" className="text-xs">
                              {notification.type}
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              {notification.priority}
                            </Badge>
                          </div>
                        </div>
                        {notification.description && (
                          <p className="text-sm text-gray-600 mb-2">{notification.description}</p>
                        )}
                        <div className="flex items-center justify-between text-xs text-gray-500">
                          <span>Received: {new Date(notification.receivedAt).toLocaleTimeString()}</span>
                          <span>Created: {new Date(notification.createdAt).toLocaleTimeString()}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Connection Log Card */}
            <Card>
              <CardHeader>
                <CardTitle>Connection Log</CardTitle>
                <CardDescription>
                  Detailed connection and subscription logs
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="bg-gray-900 text-green-400 p-3 rounded font-mono text-sm max-h-64 overflow-y-auto">
                  {connectionLog.length === 0 ? (
                    <span className="text-gray-500">No logs yet...</span>
                  ) : (
                    connectionLog.map((log, index) => (
                      <div key={index} className="mb-1">
                        {log}
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Debug Panel - Only show in development */}
        {process.env.NODE_ENV === 'development' && (
          <div className="mt-8">
            <CentrifugoDebugPanel />
          </div>
        )}
      </div>
    </div>
  );
}
