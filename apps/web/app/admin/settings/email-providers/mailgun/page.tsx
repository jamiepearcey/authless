"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@ui/base";
import { Button, Input, Label, Textarea, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@ui/base";
import { ArrowLeft, Mail, Truck, Shield, CheckCircle, XCircle, Eye, EyeOff, ExternalLink } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "@ui/base";
import { BreadcrumbNavigation } from "@/components/BreadcrumbNavigation";
import Link from "next/link";

export default function MailgunProviderPage() {
  const [isEditing, setIsEditing] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [lastTested, setLastTested] = useState<Date | null>(null);
  const [showApiKey, setShowApiKey] = useState(false);
  const [formData, setFormData] = useState({
    enabled: false,
    apiKey: "",
    domain: "",
    fromName: "",
    fromEmail: "",
    replyToEmail: "",
    // Mailgun specific settings
    region: "us" as "us" | "eu",
    trackClicks: "yes" as "yes" | "no" | "htmlonly",
    trackOpens: "yes" as "yes" | "no",
    requireTLS: true,
    skipVerification: false,
    // Rate limiting and batching  
    rateLimitPerSecond: 10, // Mailgun free tier limit
    batchSize: 1000,
    // Template and tagging
    template: "",
    templateVariables: {} as Record<string, string>,
    tags: [] as string[],
    // Delivery settings
    deliveryTime: "",
    timeZone: "",
    testMode: false,
    // Webhook settings
    webhookUrls: {
      clicked: "",
      opened: "",
      delivered: "",
      bounced: "",
      dropped: "",
      complained: "",
      unsubscribed: "",
    },
    // Advanced settings
    customHeaders: {} as Record<string, string>,
    recipientVariables: {} as Record<string, any>,
    // DKIM and SPF
    dkimSignature: true,
    // Campaign settings
    campaignId: "",
    // Suppression management
    suppressionList: {
      bounces: true,
      unsubscribes: true,
      complaints: true,
    },
  });

  // Mock query for Mailgun settings - replace with actual tRPC query
  const { data: mailgunSettings, refetch } = trpc.getMailgunSettings?.useQuery() || { data: null, refetch: () => {} };

  // Mock mutation for updating Mailgun settings
  const updateSettings = trpc.updateMailgunSettings?.useMutation({
    onSuccess: () => {
      toast.success("Mailgun settings updated successfully!");
      setIsEditing(false);
      refetch();
    },
    onError: (error) => {
      toast.error(`Failed to update Mailgun settings: ${error.message}`);
    },
  }) || { mutateAsync: async () => {}, isPending: false };

  // Mock mutation for testing Mailgun connection
  const testConnection = trpc.testMailgunConnection?.useMutation({
    onSuccess: (result) => {
      if (result.success) {
        toast.success("Mailgun connection test successful!");
        setIsConnected(true);
        setLastTested(new Date());
      } else {
        toast.error(`Mailgun test failed: ${result.error}`);
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
    if (mailgunSettings && !isEditing) {
      setFormData({
        enabled: mailgunSettings.enabled || false,
        apiKey: mailgunSettings.apiKey || "",
        domain: mailgunSettings.domain || "",
        fromName: mailgunSettings.fromName || "",
        fromEmail: mailgunSettings.fromEmail || "",
        replyToEmail: mailgunSettings.replyToEmail || "",
        region: mailgunSettings.region || "us",
        trackClicks: mailgunSettings.trackClicks || "yes",
        trackOpens: mailgunSettings.trackOpens || "yes",
        requireTLS: mailgunSettings.requireTLS ?? true,
        skipVerification: mailgunSettings.skipVerification || false,
        rateLimitPerSecond: mailgunSettings.rateLimitPerSecond || 10,
        batchSize: mailgunSettings.batchSize || 1000,
        template: mailgunSettings.template || "",
        templateVariables: mailgunSettings.templateVariables || {},
        tags: mailgunSettings.tags || [],
        deliveryTime: mailgunSettings.deliveryTime || "",
        timeZone: mailgunSettings.timeZone || "",
        testMode: mailgunSettings.testMode || false,
        webhookUrls: mailgunSettings.webhookUrls || {
          clicked: "",
          opened: "",
          delivered: "",
          bounced: "",
          dropped: "",
          complained: "",
          unsubscribed: "",
        },
        customHeaders: mailgunSettings.customHeaders || {},
        recipientVariables: mailgunSettings.recipientVariables || {},
        dkimSignature: mailgunSettings.dkimSignature ?? true,
        campaignId: mailgunSettings.campaignId || "",
        suppressionList: mailgunSettings.suppressionList || {
          bounces: true,
          unsubscribes: true,
          complaints: true,
        },
      });
      setIsConnected(mailgunSettings.isConnected || false);
      setLastTested(mailgunSettings.lastTested ? new Date(mailgunSettings.lastTested) : null);
    }
  }, [mailgunSettings, isEditing]);

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
                  { label: "Mailgun Provider", current: true },
                ]}
                showHome={false}
              />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center space-x-3">
              <Truck className="h-8 w-8 text-orange-600" />
              <span>Mailgun Email Provider</span>
            </h1>
            <p className="text-gray-600 mt-2">
              Configure Mailgun API for powerful email delivery and tracking
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
                onClick={() => window.open('https://app.mailgun.com/mg/dashboard', '_blank')}
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Mailgun Dashboard
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
          <CardDescription>Essential Mailgun API settings</CardDescription>
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
              <Label htmlFor="enabled">Enable Mailgun provider</Label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="apiKey">Mailgun API Key *</Label>
                <div className="relative">
                  <Input
                    id="apiKey"
                    type={showApiKey ? "text" : "password"}
                    value={formData.apiKey}
                    onChange={(e) => setFormData(prev => ({ ...prev, apiKey: e.target.value }))}
                    disabled={!isEditing}
                    placeholder="key-xxxxxxxxxxxxxxxxxxxxxxxx"
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-2 top-1/2 transform -translate-y-1/2"
                    onClick={() => setShowApiKey(!showApiKey)}
                  >
                    {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
                <p className="text-sm text-gray-600 mt-1">
                  Find your API key in <a href="https://app.mailgun.com/mg/dashboard" target="_blank" rel="noopener noreferrer" className="text-orange-600 hover:underline">Mailgun Dashboard</a>
                </p>
              </div>
              <div>
                <Label htmlFor="domain">Mailgun Domain *</Label>
                <Input
                  id="domain"
                  value={formData.domain}
                  onChange={(e) => setFormData(prev => ({ ...prev, domain: e.target.value }))}
                  disabled={!isEditing}
                  placeholder="mg.yourdomain.com"
                  required
                />
              </div>
            </div>

            <div>
              <Label htmlFor="region">Region</Label>
              <Select 
                value={formData.region} 
                onValueChange={(value) => setFormData(prev => ({ ...prev, region: value as "us" | "eu" }))}
                disabled={!isEditing}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="us">United States (api.mailgun.net)</SelectItem>
                  <SelectItem value="eu">Europe (api.eu.mailgun.net)</SelectItem>
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
                  id="testMode"
                  checked={formData.testMode}
                  onChange={(e) => setFormData(prev => ({ ...prev, testMode: e.target.checked }))}
                  disabled={!isEditing}
                  className="rounded border-gray-300"
                />
                <Label htmlFor="testMode">Enable test mode (for development)</Label>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="requireTLS"
                  checked={formData.requireTLS}
                  onChange={(e) => setFormData(prev => ({ ...prev, requireTLS: e.target.checked }))}
                  disabled={!isEditing}
                  className="rounded border-gray-300"
                />
                <Label htmlFor="requireTLS">Require TLS connection</Label>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="dkimSignature"
                  checked={formData.dkimSignature}
                  onChange={(e) => setFormData(prev => ({ ...prev, dkimSignature: e.target.checked }))}
                  disabled={!isEditing}
                  className="rounded border-gray-300"
                />
                <Label htmlFor="dkimSignature">Enable DKIM signature</Label>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Tracking Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>Tracking & Analytics</CardTitle>
          <CardDescription>Email tracking and analytics settings</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="trackClicks">Click Tracking</Label>
                <Select 
                  value={formData.trackClicks} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, trackClicks: value as any }))}
                  disabled={!isEditing}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="yes">Track all clicks</SelectItem>
                    <SelectItem value="no">No click tracking</SelectItem>
                    <SelectItem value="htmlonly">HTML emails only</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="trackOpens">Open Tracking</Label>
                <Select 
                  value={formData.trackOpens} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, trackOpens: value as "yes" | "no" }))}
                  disabled={!isEditing}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="yes">Track opens</SelectItem>
                    <SelectItem value="no">No open tracking</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="tags">Tags (comma-separated)</Label>
              <Input
                id="tags"
                value={formData.tags.join(", ")}
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  tags: e.target.value.split(",").map(tag => tag.trim()).filter(Boolean)
                }))}
                disabled={!isEditing}
                placeholder="transactional, notifications, alerts"
              />
              <p className="text-sm text-gray-600 mt-1">
                Tags help categorize emails in Mailgun statistics
              </p>
            </div>

            <div>
              <Label htmlFor="campaignId">Campaign ID</Label>
              <Input
                id="campaignId"
                value={formData.campaignId}
                onChange={(e) => setFormData(prev => ({ ...prev, campaignId: e.target.value }))}
                disabled={!isEditing}
                placeholder="campaign-2024-01"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Advanced Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>Advanced Configuration</CardTitle>
          <CardDescription>Advanced Mailgun features and settings</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="rateLimitPerSecond">Rate Limit (emails/sec)</Label>
                <Input
                  id="rateLimitPerSecond"
                  type="number"
                  min="1"
                  max="100"
                  value={formData.rateLimitPerSecond}
                  onChange={(e) => setFormData(prev => ({ ...prev, rateLimitPerSecond: parseInt(e.target.value) || 10 }))}
                  disabled={!isEditing}
                />
                <p className="text-sm text-gray-600 mt-1">Free tier: 10/sec, Paid plans: higher limits</p>
              </div>
              <div>
                <Label htmlFor="batchSize">Batch Size</Label>
                <Input
                  id="batchSize"
                  type="number"
                  min="1"
                  max="1000"
                  value={formData.batchSize}
                  onChange={(e) => setFormData(prev => ({ ...prev, batchSize: parseInt(e.target.value) || 1000 }))}
                  disabled={!isEditing}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="template">Template Name</Label>
              <Input
                id="template"
                value={formData.template}
                onChange={(e) => setFormData(prev => ({ ...prev, template: e.target.value }))}
                disabled={!isEditing}
                placeholder="welcome-email"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="deliveryTime">Delivery Time (RFC 2822)</Label>
                <Input
                  id="deliveryTime"
                  value={formData.deliveryTime}
                  onChange={(e) => setFormData(prev => ({ ...prev, deliveryTime: e.target.value }))}
                  disabled={!isEditing}
                  placeholder="Fri, 14 Oct 2022 23:00:00 +0000"
                />
              </div>
              <div>
                <Label htmlFor="timeZone">Time Zone</Label>
                <Input
                  id="timeZone"
                  value={formData.timeZone}
                  onChange={(e) => setFormData(prev => ({ ...prev, timeZone: e.target.value }))}
                  disabled={!isEditing}
                  placeholder="America/New_York"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Suppression Management */}
      <Card>
        <CardHeader>
          <CardTitle>Suppression Management</CardTitle>
          <CardDescription>Automatic suppression list management</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="suppressBounces"
                checked={formData.suppressionList.bounces}
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  suppressionList: { 
                    ...prev.suppressionList, 
                    bounces: e.target.checked 
                  }
                }))}
                disabled={!isEditing}
                className="rounded border-gray-300"
              />
              <Label htmlFor="suppressBounces">Suppress bounced emails</Label>
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="suppressUnsubscribes"
                checked={formData.suppressionList.unsubscribes}
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  suppressionList: { 
                    ...prev.suppressionList, 
                    unsubscribes: e.target.checked 
                  }
                }))}
                disabled={!isEditing}
                className="rounded border-gray-300"
              />
              <Label htmlFor="suppressUnsubscribes">Suppress unsubscribed emails</Label>
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="suppressComplaints"
                checked={formData.suppressionList.complaints}
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  suppressionList: { 
                    ...prev.suppressionList, 
                    complaints: e.target.checked 
                  }
                }))}
                disabled={!isEditing}
                className="rounded border-gray-300"
              />
              <Label htmlFor="suppressComplaints">Suppress spam complaints</Label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Webhook Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>Webhook Configuration</CardTitle>
          <CardDescription>Configure webhooks for email events</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="webhookDelivered">Delivered Webhook URL</Label>
                <Input
                  id="webhookDelivered"
                  type="url"
                  value={formData.webhookUrls.delivered}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    webhookUrls: { 
                      ...prev.webhookUrls, 
                      delivered: e.target.value 
                    }
                  }))}
                  disabled={!isEditing}
                  placeholder="https://yourapp.com/webhooks/mailgun/delivered"
                />
              </div>
              <div>
                <Label htmlFor="webhookOpened">Opened Webhook URL</Label>
                <Input
                  id="webhookOpened"
                  type="url"
                  value={formData.webhookUrls.opened}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    webhookUrls: { 
                      ...prev.webhookUrls, 
                      opened: e.target.value 
                    }
                  }))}
                  disabled={!isEditing}
                  placeholder="https://yourapp.com/webhooks/mailgun/opened"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="webhookClicked">Clicked Webhook URL</Label>
                <Input
                  id="webhookClicked"
                  type="url"
                  value={formData.webhookUrls.clicked}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    webhookUrls: { 
                      ...prev.webhookUrls, 
                      clicked: e.target.value 
                    }
                  }))}
                  disabled={!isEditing}
                  placeholder="https://yourapp.com/webhooks/mailgun/clicked"
                />
              </div>
              <div>
                <Label htmlFor="webhookBounced">Bounced Webhook URL</Label>
                <Input
                  id="webhookBounced"
                  type="url"
                  value={formData.webhookUrls.bounced}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    webhookUrls: { 
                      ...prev.webhookUrls, 
                      bounced: e.target.value 
                    }
                  }))}
                  disabled={!isEditing}
                  placeholder="https://yourapp.com/webhooks/mailgun/bounced"
                />
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
            onClick={() => window.open('https://documentation.mailgun.com/', '_blank')}
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