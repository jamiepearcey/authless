"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@ui/base";
import { Button, Input, Label, Textarea, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@ui/base";
import { ArrowLeft, Mail, Cloud, Shield, CheckCircle, XCircle, Eye, EyeOff, ExternalLink } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "@ui/base";
import { BreadcrumbNavigation } from "@/components/BreadcrumbNavigation";
import Link from "next/link";

export default function SESProviderPage() {
  const [isEditing, setIsEditing] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [lastTested, setLastTested] = useState<Date | null>(null);
  const [showSecretKey, setShowSecretKey] = useState(false);
  const [formData, setFormData] = useState({
    enabled: false,
    accessKeyId: "",
    secretAccessKey: "",
    region: "us-east-1",
    fromName: "",
    fromEmail: "",
    replyToEmail: "",
    // SES specific settings
    configurationSet: "",
    defaultTags: {} as Record<string, string>,
    // Rate limiting and batching
    rateLimitPerSecond: 14, // SES limit in sandbox mode
    maxSendRate: 200, // Max send rate per 24 hours in sandbox
    batchSize: 50,
    // Sending settings
    returnPath: "",
    sourceArn: "",
    returnPathArn: "",
    // Email tracking
    deliveryNotifications: {
      topic: "",
      includeOriginalHeaders: false,
    },
    bounceNotifications: {
      topic: "",
      includeOriginalHeaders: false,
    },
    complaintNotifications: {
      topic: "",
      includeOriginalHeaders: false,
    },
    // Template settings
    templateName: "",
    templateData: {} as Record<string, any>,
    // Advanced settings
    sendingEnabled: true,
    verifiedDomains: [] as string[],
    verifiedEmails: [] as string[],
    customMessageTag: "",
    // Suppression list
    suppressionAttributes: {
      suppressedReasons: [] as string[],
    },
    // DKIM settings
    dkimEnabled: true,
    // Reputation tracking
    reputationTrackingEnabled: true,
    // Virtual deliverability manager
    vdmAttributes: {
      vdmEnabled: "ENABLED" as "ENABLED" | "DISABLED",
      dashboardAttributes: {
        engagementMetrics: "ENABLED" as "ENABLED" | "DISABLED",
      },
      guardianAttributes: {
        optimizedSharedDelivery: "ENABLED" as "ENABLED" | "DISABLED",
      },
    },
  });

  // Mock query for SES settings - replace with actual tRPC query
  const { data: sesSettings, refetch } = trpc.getSESSettings?.useQuery() || { data: null, refetch: () => {} };

  // Mock mutation for updating SES settings
  const updateSettings = trpc.updateSESSettings?.useMutation({
    onSuccess: () => {
      toast.success("AWS SES settings updated successfully!");
      setIsEditing(false);
      refetch();
    },
    onError: (error) => {
      toast.error(`Failed to update SES settings: ${error.message}`);
    },
  }) || { mutateAsync: async () => {}, isPending: false };

  // Mock mutation for testing SES connection
  const testConnection = trpc.testSESConnection?.useMutation({
    onSuccess: (result) => {
      if (result.success) {
        toast.success("AWS SES connection test successful!");
        setIsConnected(true);
        setLastTested(new Date());
      } else {
        toast.error(`SES test failed: ${result.error}`);
        setIsConnected(false);
      }
    },
    onError: (error) => {
      toast.error(`Connection test failed: ${error.message}`);
      setIsConnected(false);
    },
  }) || { mutateAsync: async () => {}, isPending: false };

  // Initialize form data when settings load
  useEffect(() => {
    if (sesSettings && !isEditing) {
      setFormData({
        enabled: sesSettings.enabled || false,
        accessKeyId: sesSettings.accessKeyId || "",
        secretAccessKey: sesSettings.secretAccessKey || "",
        region: sesSettings.region || "us-east-1",
        fromName: sesSettings.fromName || "",
        fromEmail: sesSettings.fromEmail || "",
        replyToEmail: sesSettings.replyToEmail || "",
        configurationSet: sesSettings.configurationSet || "",
        defaultTags: sesSettings.defaultTags || {},
        rateLimitPerSecond: sesSettings.rateLimitPerSecond || 14,
        maxSendRate: sesSettings.maxSendRate || 200,
        batchSize: sesSettings.batchSize || 50,
        returnPath: sesSettings.returnPath || "",
        sourceArn: sesSettings.sourceArn || "",
        returnPathArn: sesSettings.returnPathArn || "",
        deliveryNotifications: sesSettings.deliveryNotifications || {
          topic: "",
          includeOriginalHeaders: false,
        },
        bounceNotifications: sesSettings.bounceNotifications || {
          topic: "",
          includeOriginalHeaders: false,
        },
        complaintNotifications: sesSettings.complaintNotifications || {
          topic: "",
          includeOriginalHeaders: false,
        },
        templateName: sesSettings.templateName || "",
        templateData: sesSettings.templateData || {},
        sendingEnabled: sesSettings.sendingEnabled ?? true,
        verifiedDomains: sesSettings.verifiedDomains || [],
        verifiedEmails: sesSettings.verifiedEmails || [],
        customMessageTag: sesSettings.customMessageTag || "",
        suppressionAttributes: sesSettings.suppressionAttributes || {
          suppressedReasons: [],
        },
        dkimEnabled: sesSettings.dkimEnabled ?? true,
        reputationTrackingEnabled: sesSettings.reputationTrackingEnabled ?? true,
        vdmAttributes: sesSettings.vdmAttributes || {
          vdmEnabled: "ENABLED",
          dashboardAttributes: { engagementMetrics: "ENABLED" },
          guardianAttributes: { optimizedSharedDelivery: "ENABLED" },
        },
      });
      setIsConnected(sesSettings.isConnected || false);
      setLastTested(sesSettings.lastTested ? new Date(sesSettings.lastTested) : null);
    }
  }, [sesSettings, isEditing]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateSettings.mutateAsync(formData);
    } catch (error) {
      // Handled by mutation
    }
  };

  const handleTestConnection = async () => {
    try {
      await testConnection.mutateAsync(formData);
    } catch (error) {
      // Handled by mutation
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex justify-between items-center">
          <div>
            <div className="flex items-center space-x-4 mb-4">
              <Link 
                href="/admin/settings"
                className="inline-flex items-center text-indigo-600 hover:text-indigo-800 transition-colors"
              >
                <ArrowLeft className="h-5 w-5 mr-2" />
                Back to Settings
              </Link>
              <div className="h-6 w-px bg-gray-300" />
              <BreadcrumbNavigation
                items={[
                  { label: "Admin", href: "/admin" },
                  { label: "Settings", href: "/admin/settings" },
                  { label: "AWS SES Provider", current: true },
                ]}
                showHome={false}
              />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center space-x-3">
              <Cloud className="h-8 w-8 text-yellow-600" />
              <span>Amazon SES Email Provider</span>
            </h1>
            <p className="text-gray-600 mt-2">
              Configure Amazon Simple Email Service for scalable email delivery
            </p>
          </div>
          
          <div className="flex items-center space-x-3">
            {isConnected ? (
              <div className="flex items-center text-green-600">
                <CheckCircle className="h-5 w-5 mr-2" />
                <span className="text-sm">Connected</span>
              </div>
            ) : (
              <div className="flex items-center text-red-600">
                <XCircle className="h-5 w-5 mr-2" />
                <span className="text-sm">Not Connected</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Connection Status Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Connection Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <div className="flex items-center gap-2">
                {isConnected ? (
                  <CheckCircle className="h-5 w-5 text-green-600" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-600" />
                )}
                <span className="font-medium">
                  Status: {isConnected ? "Connected" : "Disconnected"}
                </span>
              </div>
              {lastTested && (
                <p className="text-sm text-gray-600 mt-1">
                  Last tested: {lastTested.toLocaleString()}
                </p>
              )}
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => window.open('https://console.aws.amazon.com/ses/', '_blank')}
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                AWS SES Console
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={handleTestConnection}
                disabled={testConnection.isPending}
              >
                {testConnection.isPending ? "Testing..." : "Test Connection"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Basic Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>Basic Configuration</CardTitle>
          <CardDescription>AWS credentials and basic SES settings</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex items-center space-x-2 mb-4">
              <input
                type="checkbox"
                id="enabled"
                checked={formData.enabled}
                onChange={(e) => setFormData(prev => ({ ...prev, enabled: e.target.checked }))}
                disabled={!isEditing}
                className="rounded border-gray-300"
              />
              <Label htmlFor="enabled">Enable AWS SES provider</Label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="accessKeyId">Access Key ID *</Label>
                <Input
                  id="accessKeyId"
                  value={formData.accessKeyId}
                  onChange={(e) => setFormData(prev => ({ ...prev, accessKeyId: e.target.value }))}
                  disabled={!isEditing}
                  placeholder="AKIAIOSFODNN7EXAMPLE"
                  required
                />
              </div>
              <div>
                <Label htmlFor="secretAccessKey">Secret Access Key *</Label>
                <div className="relative">
                  <Input
                    id="secretAccessKey"
                    type={showSecretKey ? "text" : "password"}
                    value={formData.secretAccessKey}
                    onChange={(e) => setFormData(prev => ({ ...prev, secretAccessKey: e.target.value }))}
                    disabled={!isEditing}
                    placeholder="••••••••••••••••••••••••••••••••••••••••"
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-2 top-1/2 transform -translate-y-1/2"
                    onClick={() => setShowSecretKey(!showSecretKey)}
                  >
                    {showSecretKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            </div>

            <div>
              <Label htmlFor="region">AWS Region</Label>
              <Select 
                value={formData.region} 
                onValueChange={(value) => setFormData(prev => ({ ...prev, region: value }))}
                disabled={!isEditing}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="us-east-1">US East (N. Virginia)</SelectItem>
                  <SelectItem value="us-west-1">US West (N. California)</SelectItem>
                  <SelectItem value="us-west-2">US West (Oregon)</SelectItem>
                  <SelectItem value="eu-west-1">Europe (Ireland)</SelectItem>
                  <SelectItem value="eu-central-1">Europe (Frankfurt)</SelectItem>
                  <SelectItem value="eu-north-1">Europe (Stockholm)</SelectItem>
                  <SelectItem value="ap-southeast-1">Asia Pacific (Singapore)</SelectItem>
                  <SelectItem value="ap-southeast-2">Asia Pacific (Sydney)</SelectItem>
                  <SelectItem value="ap-northeast-1">Asia Pacific (Tokyo)</SelectItem>
                  <SelectItem value="ca-central-1">Canada (Central)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="fromName">From Name</Label>
                <Input
                  id="fromName"
                  value={formData.fromName}
                  onChange={(e) => setFormData(prev => ({ ...prev, fromName: e.target.value }))}
                  disabled={!isEditing}
                  placeholder="Authless Support"
                />
              </div>
              <div>
                <Label htmlFor="fromEmail">From Email *</Label>
                <Input
                  id="fromEmail"
                  type="email"
                  value={formData.fromEmail}
                  onChange={(e) => setFormData(prev => ({ ...prev, fromEmail: e.target.value }))}
                  disabled={!isEditing}
                  placeholder="noreply@authless.com"
                  required
                />
              </div>
            </div>

            <div>
              <Label htmlFor="replyToEmail">Reply-To Email</Label>
              <Input
                id="replyToEmail"
                type="email"
                value={formData.replyToEmail}
                onChange={(e) => setFormData(prev => ({ ...prev, replyToEmail: e.target.value }))}
                disabled={!isEditing}
                placeholder="support@authless.com"
              />
            </div>

            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="sendingEnabled"
                  checked={formData.sendingEnabled}
                  onChange={(e) => setFormData(prev => ({ ...prev, sendingEnabled: e.target.checked }))}
                  disabled={!isEditing}
                  className="rounded border-gray-300"
                />
                <Label htmlFor="sendingEnabled">Enable sending</Label>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="dkimEnabled"
                  checked={formData.dkimEnabled}
                  onChange={(e) => setFormData(prev => ({ ...prev, dkimEnabled: e.target.checked }))}
                  disabled={!isEditing}
                  className="rounded border-gray-300"
                />
                <Label htmlFor="dkimEnabled">Enable DKIM signing</Label>
              </div>
            </div>

            <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
              <p className="text-sm text-yellow-800">
                <strong>Important:</strong> Create IAM credentials with <code>ses:SendEmail</code>, <code>ses:SendRawEmail</code> permissions. 
                New accounts start in sandbox mode with limited sending capabilities.
              </p>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Configuration Set & Tagging */}
      <Card>
        <CardHeader>
          <CardTitle>Configuration Set & Tagging</CardTitle>
          <CardDescription>Advanced SES configuration and message tagging</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <Label htmlFor="configurationSet">Configuration Set</Label>
              <Input
                id="configurationSet"
                value={formData.configurationSet}
                onChange={(e) => setFormData(prev => ({ ...prev, configurationSet: e.target.value }))}
                disabled={!isEditing}
                placeholder="my-configuration-set"
              />
              <p className="text-sm text-gray-600 mt-1">
                Configuration sets allow you to publish email event data to CloudWatch
              </p>
            </div>

            <div>
              <Label htmlFor="customMessageTag">Custom Message Tag</Label>
              <Input
                id="customMessageTag"
                value={formData.customMessageTag}
                onChange={(e) => setFormData(prev => ({ ...prev, customMessageTag: e.target.value }))}
                disabled={!isEditing}
                placeholder="transactional-emails"
              />
            </div>

            <div>
              <Label htmlFor="defaultTags">Default Tags (JSON format)</Label>
              <Textarea
                id="defaultTags"
                value={JSON.stringify(formData.defaultTags, null, 2)}
                onChange={(e) => {
                  try {
                    const tags = JSON.parse(e.target.value);
                    setFormData(prev => ({ ...prev, defaultTags: tags }));
                  } catch {
                    // Invalid JSON, ignore
                  }
                }}
                disabled={!isEditing}
                placeholder='{"environment": "production", "service": "authless"}'
                rows={3}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Rate Limiting & Performance */}
      <Card>
        <CardHeader>
          <CardTitle>Rate Limiting & Performance</CardTitle>
          <CardDescription>Sending limits and performance optimization</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="rateLimitPerSecond">Rate Limit (emails/sec)</Label>
                <Input
                  id="rateLimitPerSecond"
                  type="number"
                  min="1"
                  max="1000"
                  value={formData.rateLimitPerSecond}
                  onChange={(e) => setFormData(prev => ({ ...prev, rateLimitPerSecond: parseInt(e.target.value) || 14 }))}
                  disabled={!isEditing}
                />
                <p className="text-sm text-gray-600 mt-1">Sandbox: 1/sec, Production: varies</p>
              </div>
              <div>
                <Label htmlFor="maxSendRate">Max Daily Send Rate</Label>
                <Input
                  id="maxSendRate"
                  type="number"
                  min="1"
                  max="100000"
                  value={formData.maxSendRate}
                  onChange={(e) => setFormData(prev => ({ ...prev, maxSendRate: parseInt(e.target.value) || 200 }))}
                  disabled={!isEditing}
                />
                <p className="text-sm text-gray-600 mt-1">Sandbox: 200/day, Production: varies</p>
              </div>
              <div>
                <Label htmlFor="batchSize">Batch Size</Label>
                <Input
                  id="batchSize"
                  type="number"
                  min="1"
                  max="100"
                  value={formData.batchSize}
                  onChange={(e) => setFormData(prev => ({ ...prev, batchSize: parseInt(e.target.value) || 50 }))}
                  disabled={!isEditing}
                />
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="reputationTrackingEnabled"
                checked={formData.reputationTrackingEnabled}
                onChange={(e) => setFormData(prev => ({ ...prev, reputationTrackingEnabled: e.target.checked }))}
                disabled={!isEditing}
                className="rounded border-gray-300"
              />
              <Label htmlFor="reputationTrackingEnabled">Enable reputation tracking</Label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Templates */}
      <Card>
        <CardHeader>
          <CardTitle>Email Templates</CardTitle>
          <CardDescription>SES email template configuration</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <Label htmlFor="templateName">Template Name</Label>
              <Input
                id="templateName"
                value={formData.templateName}
                onChange={(e) => setFormData(prev => ({ ...prev, templateName: e.target.value }))}
                disabled={!isEditing}
                placeholder="welcome-email-template"
              />
            </div>

            <div>
              <Label htmlFor="templateData">Template Data (JSON format)</Label>
              <Textarea
                id="templateData"
                value={JSON.stringify(formData.templateData, null, 2)}
                onChange={(e) => {
                  try {
                    const data = JSON.parse(e.target.value);
                    setFormData(prev => ({ ...prev, templateData: data }));
                  } catch {
                    // Invalid JSON, ignore
                  }
                }}
                disabled={!isEditing}
                placeholder='{"userName": "{{user.name}}", "companyName": "{{company.name}}"}'
                rows={4}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* SNS Notifications */}
      <Card>
        <CardHeader>
          <CardTitle>SNS Notifications</CardTitle>
          <CardDescription>Configure SNS topics for email event notifications</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <Label htmlFor="deliveryTopic">Delivery Notifications SNS Topic</Label>
              <Input
                id="deliveryTopic"
                value={formData.deliveryNotifications.topic}
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  deliveryNotifications: { 
                    ...prev.deliveryNotifications, 
                    topic: e.target.value 
                  }
                }))}
                disabled={!isEditing}
                placeholder="arn:aws:sns:us-east-1:123456789012:ses-delivery-notifications"
              />
            </div>

            <div>
              <Label htmlFor="bounceTopic">Bounce Notifications SNS Topic</Label>
              <Input
                id="bounceTopic"
                value={formData.bounceNotifications.topic}
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  bounceNotifications: { 
                    ...prev.bounceNotifications, 
                    topic: e.target.value 
                  }
                }))}
                disabled={!isEditing}
                placeholder="arn:aws:sns:us-east-1:123456789012:ses-bounce-notifications"
              />
            </div>

            <div>
              <Label htmlFor="complaintTopic">Complaint Notifications SNS Topic</Label>
              <Input
                id="complaintTopic"
                value={formData.complaintNotifications.topic}
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  complaintNotifications: { 
                    ...prev.complaintNotifications, 
                    topic: e.target.value 
                  }
                }))}
                disabled={!isEditing}
                placeholder="arn:aws:sns:us-east-1:123456789012:ses-complaint-notifications"
              />
            </div>

            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="includeOriginalHeaders"
                  checked={formData.deliveryNotifications.includeOriginalHeaders}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    deliveryNotifications: { 
                      ...prev.deliveryNotifications, 
                      includeOriginalHeaders: e.target.checked 
                    },
                    bounceNotifications: { 
                      ...prev.bounceNotifications, 
                      includeOriginalHeaders: e.target.checked 
                    },
                    complaintNotifications: { 
                      ...prev.complaintNotifications, 
                      includeOriginalHeaders: e.target.checked 
                    }
                  }))}
                  disabled={!isEditing}
                  className="rounded border-gray-300"
                />
                <Label htmlFor="includeOriginalHeaders">Include original headers in notifications</Label>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Virtual Deliverability Manager */}
      <Card>
        <CardHeader>
          <CardTitle>Virtual Deliverability Manager (VDM)</CardTitle>
          <CardDescription>Advanced deliverability features and insights</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <Label htmlFor="vdmEnabled">VDM Status</Label>
              <Select 
                value={formData.vdmAttributes.vdmEnabled} 
                onValueChange={(value) => setFormData(prev => ({ 
                  ...prev, 
                  vdmAttributes: { 
                    ...prev.vdmAttributes, 
                    vdmEnabled: value as "ENABLED" | "DISABLED" 
                  }
                }))}
                disabled={!isEditing}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ENABLED">Enabled</SelectItem>
                  <SelectItem value="DISABLED">Disabled</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="engagementMetrics"
                  checked={formData.vdmAttributes.dashboardAttributes.engagementMetrics === "ENABLED"}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    vdmAttributes: { 
                      ...prev.vdmAttributes, 
                      dashboardAttributes: { 
                        engagementMetrics: e.target.checked ? "ENABLED" : "DISABLED" 
                      }
                    }
                  }))}
                  disabled={!isEditing}
                  className="rounded border-gray-300"
                />
                <Label htmlFor="engagementMetrics">Enable engagement metrics</Label>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="optimizedSharedDelivery"
                  checked={formData.vdmAttributes.guardianAttributes.optimizedSharedDelivery === "ENABLED"}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    vdmAttributes: { 
                      ...prev.vdmAttributes, 
                      guardianAttributes: { 
                        optimizedSharedDelivery: e.target.checked ? "ENABLED" : "DISABLED" 
                      }
                    }
                  }))}
                  disabled={!isEditing}
                  className="rounded border-gray-300"
                />
                <Label htmlFor="optimizedSharedDelivery">Enable optimized shared delivery</Label>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex items-center justify-between pt-4">
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={handleTestConnection}
            disabled={testConnection.isPending}
          >
            {testConnection.isPending ? "Testing..." : "Test Connection"}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => window.open('https://docs.aws.amazon.com/ses/', '_blank')}
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            View Documentation
          </Button>
        </div>
        <div className="flex gap-2">
          {isEditing ? (
            <>
              <Button variant="outline" onClick={() => setIsEditing(false)}>
                Cancel
              </Button>
              <Button onClick={handleSubmit} disabled={updateSettings.isPending}>
                {updateSettings.isPending ? "Saving..." : "Save Configuration"}
              </Button>
            </>
          ) : (
            <Button onClick={() => setIsEditing(true)}>
              Edit Configuration
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}