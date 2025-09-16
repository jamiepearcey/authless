"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@ui/base";
import { Button } from "@ui/base";
import { Badge } from "@ui/base";
import { Input } from "@ui/base";
import { Textarea } from "@ui/base";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@ui/base";
import { trpc } from "@/lib/trpc";
import { Send, Settings, Activity, Users, Globe, Loader2, Bell } from "lucide-react";
import { toast } from "@ui/base";

interface NotificationTemplateFormProps {
  context: 'admin' | 'tenant';
  tenantId?: string;
  onSuccess?: () => void;
  className?: string;
}

interface NotificationFormData {
  title: string;
  description: string;
  type: 'info' | 'success' | 'warning' | 'error';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  targetType: 'global' | 'user' | 'tenant' | 'role';
  targetId: string;
}

// Predefined notification templates
const NOTIFICATION_TEMPLATES = [
  {
    id: 'welcome',
    name: 'Welcome Message',
    title: 'Welcome to our platform!',
    description: 'We\'re excited to have you on board. Get started by exploring our features.',
    type: 'success' as const,
    priority: 'normal' as const,
  },
  {
    id: 'maintenance',
    name: 'Scheduled Maintenance',
    title: 'Scheduled Maintenance Notice',
    description: 'We will be performing scheduled maintenance on our systems. Please expect some downtime.',
    type: 'warning' as const,
    priority: 'high' as const,
  },
  {
    id: 'update',
    name: 'System Update',
    title: 'System Update Available',
    description: 'A new system update is available with improved features and security enhancements.',
    type: 'info' as const,
    priority: 'normal' as const,
  },
  {
    id: 'urgent',
    name: 'Urgent Alert',
    title: 'Urgent: Action Required',
    description: 'Immediate action is required. Please review and respond as soon as possible.',
    type: 'error' as const,
    priority: 'urgent' as const,
  },
  {
    id: 'reminder',
    name: 'Reminder',
    title: 'Friendly Reminder',
    description: 'This is a friendly reminder about your upcoming tasks or deadlines.',
    type: 'info' as const,
    priority: 'low' as const,
  },
];

export function NotificationTemplateForm({ context, tenantId, onSuccess, className }: NotificationTemplateFormProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [notificationForm, setNotificationForm] = useState<NotificationFormData>({
    title: '',
    description: '',
    type: 'info',
    priority: 'normal',
    targetType: context === 'tenant' ? 'tenant' : 'global',
    targetId: context === 'tenant' ? tenantId || '' : '',
  });

  // Create notification intent mutation
  const createNotification = trpc.createNotificationIntent.useMutation({
    onSuccess: (intent) => {
      toast.success(`Notification intent "${intent.type}" created successfully!`);
      // Reset form
      setNotificationForm({
        title: '',
        description: '',
        type: 'info',
        priority: 'normal',
        targetType: context === 'tenant' ? 'tenant' : 'global',
        targetId: context === 'tenant' ? tenantId || '' : '',
      });
      setSelectedTemplate('');
      onSuccess?.();
    },
    onError: (error) => {
      toast.error(`Failed to create notification: ${error.message}`);
    },
  });

  const handleTemplateSelect = (templateId: string) => {
    const template = NOTIFICATION_TEMPLATES.find(t => t.id === templateId);
    if (template) {
      setSelectedTemplate(templateId);
      setNotificationForm(prev => ({
        ...prev,
        title: template.title,
        description: template.description,
        type: template.type,
        priority: template.priority,
      }));
    }
  };

  const sendNotification = async () => {
    if (!notificationForm.title.trim()) {
      toast.error("Notification title is required");
      return;
    }

    // Build notification intent data for the new API
    const intentData: any = {
      type: `${context}_${notificationForm.type}_notification`,
      payloadJson: {
        title: notificationForm.title,
        description: notificationForm.description || undefined,
        type: notificationForm.type,
        priority: notificationForm.priority,
        sourceType: notificationForm.targetType,
      },
    };

    // Add targeting based on context and type
    if (context === 'tenant') {
      // Tenant context: always target the current tenant
      intentData.tenantId = tenantId;
      
      if (notificationForm.targetType === 'user' && notificationForm.targetId) {
        intentData.recipients = [notificationForm.targetId];
      } else if (notificationForm.targetType === 'role' && notificationForm.targetId) {
        const [role] = notificationForm.targetId.split(':');
        intentData.recipients = { type: 'role', ids: [role] };
      } else {
        // All users in tenant
        intentData.recipients = { type: 'user', ids: [] };
      }
    } else {
      // Admin context: can target globally or specifically
      if (notificationForm.targetType === 'user' && notificationForm.targetId) {
        intentData.recipients = [notificationForm.targetId];
      } else if (notificationForm.targetType === 'tenant' && notificationForm.targetId) {
        intentData.tenantId = notificationForm.targetId;
        intentData.recipients = { type: 'user', ids: [] };
      } else if (notificationForm.targetType === 'role' && notificationForm.targetId) {
        const [tenantId, role] = notificationForm.targetId.split(':');
        intentData.tenantId = tenantId;
        intentData.recipients = { type: 'role', ids: [role] };
      } else {
        // Global notifications
        intentData.recipients = { type: 'user', ids: [] };
      }
    }

    createNotification.mutate(intentData);
  };

  const getTargetTypeOptions = () => {
    if (context === 'tenant') {
      return [
        { value: 'tenant', label: 'All Tenant Users', icon: <Settings className="h-4 w-4" /> },
        { value: 'user', label: 'Specific User', icon: <Users className="h-4 w-4" /> },
        { value: 'role', label: 'Role in Tenant', icon: <Activity className="h-4 w-4" /> },
      ];
    } else {
      return [
        { value: 'global', label: 'Global (All Users)', icon: <Globe className="h-4 w-4" /> },
        { value: 'user', label: 'Specific User', icon: <Users className="h-4 w-4" /> },
        { value: 'tenant', label: 'Tenant', icon: <Settings className="h-4 w-4" /> },
        { value: 'role', label: 'Role in Tenant', icon: <Activity className="h-4 w-4" /> },
      ];
    }
  };

  return (
    <div className={className}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Bell className="h-5 w-5" />
            <span>Send Notification from Template</span>
          </CardTitle>
          <CardDescription>
            Choose a template or create a custom notification to send to your {context === 'tenant' ? 'tenant' : 'system'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Template Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Choose a Template (Optional)
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {NOTIFICATION_TEMPLATES.map((template) => (
                <button
                  key={template.id}
                  onClick={() => handleTemplateSelect(template.id)}
                  className={`p-3 border rounded-lg text-left transition-all hover:shadow-md ${
                    selectedTemplate === template.id
                      ? 'border-indigo-500 bg-indigo-50 ring-2 ring-indigo-200'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-sm text-gray-900">{template.name}</h4>
                    <Badge variant="outline" className="text-xs">
                      {template.type}
                    </Badge>
                  </div>
                  <p className="text-xs text-gray-600 line-clamp-2">{template.title}</p>
                  <div className="mt-2 flex items-center justify-between">
                    <Badge variant="outline" className="text-xs">
                      {template.priority}
                    </Badge>
                    <span className="text-xs text-gray-500">Click to use</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Notification Form */}
          <div className="space-y-4">
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
                  {getTargetTypeOptions().map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      <div className="flex items-center space-x-2">
                        {option.icon}
                        <span>{option.label}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {notificationForm.targetType !== 'global' && notificationForm.targetType !== 'tenant' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Target ID
                </label>
                <Input
                  placeholder={
                    notificationForm.targetType === 'user' ? 'User ID' :
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
                  Sending...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Send Notification
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
