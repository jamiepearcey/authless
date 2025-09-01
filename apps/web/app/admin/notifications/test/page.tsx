"use client";

import { useState } from "react";
import { Button } from "@ui/base";
import { Input } from "@ui/base";
import { Label } from "@ui/base";
import { Textarea } from "@ui/base";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@ui/base";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@ui/base";
           
import { trpc } from "../../../../lib/trpc";
import { Loader2, Send, Users, User, Building, Shield, Globe } from "lucide-react";
import { toast } from "@ui/base";

interface TestNotificationForm {
  title: string;
  description: string;
  type: "info" | "success" | "warning" | "error";
  priority: "low" | "normal" | "high" | "urgent";
  targetType: "global" | "tenant" | "role" | "user";
  tenantId?: string;
  role?: string;
  userId?: string;
}

export default function TestNotificationsPage() {
  const [form, setForm] = useState<TestNotificationForm>({
    title: "",
    description: "",
    type: "info",
    priority: "normal",
    targetType: "global",
  });

  const [isLoading, setIsLoading] = useState(false);

  // Fetch available data for targeting
  const { data: tenants } = trpc.getAllTenants.useQuery();
  const { data: users } = trpc.getAllUsers.useQuery();
  const { data: roles } = trpc.getTenantRoles.useQuery(
    { tenantId: form.tenantId || "" },
    { enabled: !!form.tenantId }
  );

  // Create notification mutation
    const createNotification = trpc.createNotification.useMutation({
    onSuccess: () => {
      toast("Success! Notification sent successfully");
      setIsLoading(false);
      // Reset form
      setForm({
        title: "",
        description: "",
        type: "info",
        priority: "normal",
        targetType: "global",
      });
    },
    onError: () => {
      toast("Error sending notification");
      setIsLoading(false);
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const notificationData = {
      title: form.title,
      description: form.description,
      type: form.type,
      priority: form.priority,
      tenantId: form.targetType === "tenant" || form.targetType === "role" ? form.tenantId : undefined,
      role: form.targetType === "role" ? form.role : undefined,
      userId: form.targetType === "user" ? form.userId : undefined,
    };

    createNotification.mutate(notificationData);
  };

  const getTargetDescription = () => {
    switch (form.targetType) {
      case "global":
        return "All users in the system";
      case "tenant":
        return tenants?.find(t => t.id === form.tenantId)?.name || "Select a tenant";
      case "role":
        return `${tenants?.find(t => t.id === form.tenantId)?.name || "Select tenant"} - ${form.role || "Select role"}`;
      case "user":
        return users?.find(u => u.id === form.userId)?.name || users?.find(u => u.id === form.userId)?.email || "Select a user";
      default:
        return "";
    }
  };

  const getTargetIcon = () => {
    switch (form.targetType) {
      case "global":
        return <Globe className="h-4 w-4" />;
      case "tenant":
        return <Building className="h-4 w-4" />;
      case "role":
        return <Shield className="h-4 w-4" />;
      case "user":
        return <User className="h-4 w-4" />;
      default:
        return <Users className="h-4 w-4" />;
    }
  };

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Test Notifications</h1>
          <p className="text-gray-600 mt-2">
            Send test notifications to different targets to verify the system works correctly
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Notification Form */}
        <Card>
          <CardHeader>
            <CardTitle>Send Test Notification</CardTitle>
            <CardDescription>
              Create a notification to test the system
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Basic Fields */}
              <div className="space-y-2">
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="Enter notification title"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Enter notification description"
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="type">Type</Label>
                  <Select
                    value={form.type}
                    onValueChange={(value: "info" | "success" | "warning" | "error") =>
                      setForm({ ...form, type: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="info">Info</SelectItem>
                      <SelectItem value="success">Success</SelectItem>
                      <SelectItem value="warning">Warning</SelectItem>
                      <SelectItem value="error">Error</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="priority">Priority</Label>
                  <Select
                    value={form.priority}
                    onValueChange={(value: "low" | "normal" | "high" | "urgent") =>
                      setForm({ ...form, priority: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Target Selection */}
              <div className="space-y-2">
                <Label htmlFor="targetType">Target Type</Label>
                <Select
                  value={form.targetType}
                  onValueChange={(value: "global" | "tenant" | "role" | "user") => {
                    setForm({
                      ...form,
                      targetType: value,
                      tenantId: undefined,
                      role: undefined,
                      userId: undefined,
                    });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="global">Global (All Users)</SelectItem>
                    <SelectItem value="tenant">Tenant (All Members)</SelectItem>
                    <SelectItem value="role">Role (Specific Role in Tenant)</SelectItem>
                    <SelectItem value="user">Specific User</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Conditional Target Fields */}
              {(form.targetType === "tenant" || form.targetType === "role") && (
                <div className="space-y-2">
                  <Label htmlFor="tenantId">Tenant *</Label>
                  <Select
                    value={form.tenantId}
                    onValueChange={(value) => setForm({ ...form, tenantId: value, role: undefined })}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a tenant" />
                    </SelectTrigger>
                    <SelectContent>
                      {tenants?.map((tenant) => (
                        <SelectItem key={tenant.id} value={tenant.id}>
                          {tenant.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {form.targetType === "role" && (
                <div className="space-y-2">
                  <Label htmlFor="role">Role *</Label>
                  <Select
                    value={form.role}
                    onValueChange={(value) => setForm({ ...form, role: value })}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a role" />
                    </SelectTrigger>
                    <SelectContent>
                      {roles?.map((role) => (
                        <SelectItem key={role} value={role}>
                          {role}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {form.targetType === "user" && (
                <div className="space-y-2">
                  <Label htmlFor="userId">User *</Label>
                  <Select
                    value={form.userId}
                    onValueChange={(value) => setForm({ ...form, userId: value })}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a user" />
                    </SelectTrigger>
                    <SelectContent>
                      {users?.map((user) => (
                        <SelectItem key={user.id} value={user.id}>
                          {user.name || user.email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Target Preview */}
              <div className="p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  {getTargetIcon()}
                  <span className="font-medium">Target:</span>
                  <span>{getTargetDescription()}</span>
                </div>
              </div>

              <Button
                type="submit"
                disabled={isLoading || !form.title}
                className="w-full"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    Send Notification
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Quick Test Buttons */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Tests</CardTitle>
            <CardDescription>
              Send predefined test notifications
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => {
                setForm({
                  title: "🎉 Welcome to Authless uk!",
                  description: "This is a test notification to verify the system is working correctly.",
                  type: "success",
                  priority: "normal",
                  targetType: "global",
                });
              }}
            >
              <Globe className="mr-2 h-4 w-4" />
              Global Welcome Message
            </Button>

            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => {
                setForm({
                  title: "⚠️ System Maintenance",
                  description: "Scheduled maintenance will occur tonight at 2 AM. Expect brief downtime.",
                  type: "warning",
                  priority: "high",
                  targetType: "global",
                });
              }}
            >
              <Shield className="mr-2 h-4 w-4" />
              System Maintenance Alert
            </Button>

            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => {
                setForm({
                  title: "🚨 Security Alert",
                  description: "Please update your password if you haven't done so recently.",
                  type: "error",
                  priority: "urgent",
                  targetType: "global",
                });
              }}
            >
              <Shield className="mr-2 h-4 w-4" />
              Security Alert
            </Button>

            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => {
                setForm({
                  title: "📱 New Feature Available",
                  description: "Check out our new mobile app features in the latest update!",
                  type: "info",
                  priority: "normal",
                  targetType: "global",
                });
              }}
            >
              <Users className="mr-2 h-4 w-4" />
              Feature Announcement
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Webhook Testing */}
      <Card>
        <CardHeader>
          <CardTitle>Webhook Testing</CardTitle>
          <CardDescription>
            Test the webhook endpoint directly
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600 mb-2">
                <strong>Webhook URL:</strong> <code className="bg-gray-200 px-2 py-1 rounded">/api/webhooks/notifications</code>
              </p>
              <p className="text-sm text-gray-600">
                <strong>Method:</strong> POST
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Button
                variant="outline"
                onClick={async () => {
                  try {
                    const response = await fetch('/api/webhooks/notifications', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        title: "🌐 Webhook Test",
                        description: "This notification was sent via webhook",
                        type: "info",
                        priority: "normal"
                      })
                    });
                    
                    if (response.ok) {
                      toast.success(
                        "Test notification sent via webhook"
                      );
                    } else {
                      throw new Error(`HTTP ${response.status}`);
                    }
                  } catch (error) {
                    toast.error(
                      `Failed to send webhook: ${error}`
                    );
                  }
                }}
              >
                Test Webhook Endpoint
              </Button>

              <Button
                variant="outline"
                onClick={async () => {
                  try {
                    const response = await fetch('/api/webhooks/notifications', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        title: "🎯 Targeted Webhook Test",
                        description: "This notification targets a specific tenant",
                        type: "success",
                        priority: "high",
                        tenantId: tenants?.[0]?.id || "test-tenant"
                      })
                    });
                    
                    if (response.ok) {
                      toast.success("Targeted Webhook Success", {
                        description: "Targeted notification sent via webhook",
                      });
                    } else {
                      toast("Targeted Webhook Error");
                      throw new Error(`HTTP ${response.status}`);
                    }
                  } catch (error) {
                    toast.error("Failed to send targeted webhook");
                  }
                }}
              >
                Test Targeted Webhook
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
