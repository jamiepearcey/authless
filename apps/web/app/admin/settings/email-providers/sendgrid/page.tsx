"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@ui/base";
import { Button, Input, Label, Textarea, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@ui/base";
import { ArrowLeft, Mail, Zap, Shield, CheckCircle, XCircle, Eye, EyeOff, ExternalLink } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "@ui/base";
import { BreadcrumbNavigation } from "@/components/BreadcrumbNavigation";
import Link from "next/link";

export default function SendGridProviderPage() {
  const [isEditing, setIsEditing] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [lastTested, setLastTested] = useState<Date | null>(null);
  const [showApiKey, setShowApiKey] = useState(false);
  const [formData, setFormData] = useState({
    enabled: false,
    apiKey: "",
    fromName: "",
    fromEmail: "",
    replyToEmail: "",
    // SendGrid specific settings
    clickTracking: true,
    openTracking: true,
    subscriptionTracking: false,
    ganalytics: false,
    sandboxMode: false,
    // Rate limiting and batching
    rateLimitPerSecond: 100, // SendGrid allows up to 100/sec
    batchSize: 1000,
    // Template and branding
    templateId: "",
    ipPool: "",
    asm: {
      groupId: null as number | null,
      groupsToDisplay: [] as number[],
    },
    // Tracking and analytics
    customArgs: {} as Record<string, string>,
    categories: [] as string[],
    // Mail settings
    mailSettings: {
      bypassListManagement: false,
      bypassSpamManagement: false,
      bypassBounceManagement: false,
      bypassUnsubscribeManagement: false,
      footer: {
        enable: false,
        text: "",
        html: "",
      },
      spamCheck: {
        enable: false,
        threshold: 1,
        postToUrl: "",
      },
    },
  });

  // Mock query for SendGrid settings - replace with actual tRPC query
  const { data: sendgridSettings, refetch } = trpc.getSendGridSettings?.useQuery() || { data: null, refetch: () => {} };

  // Mock mutation for updating SendGrid settings
  const updateSettings = trpc.updateSendGridSettings?.useMutation({
    onSuccess: () => {
      toast.success("SendGrid settings updated successfully!");
      setIsEditing(false);
      refetch();
    },
    onError: (error) => {
      toast.error(`Failed to update SendGrid settings: ${error.message}`);
    },
  }) || { mutateAsync: async () => {}, isPending: false };

  // Mock mutation for testing SendGrid connection
  const testConnection = trpc.testSendGridConnection?.useMutation({
    onSuccess: (result) => {
      if (result.success) {
        toast.success("SendGrid connection test successful!");
        setIsConnected(true);
        setLastTested(new Date());
      } else {
        toast.error(`SendGrid test failed: ${result.error}`);
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
    if (sendgridSettings && !isEditing) {
      setFormData({
        enabled: sendgridSettings.enabled || false,
        apiKey: sendgridSettings.apiKey || "",
        fromName: sendgridSettings.fromName || "",
        fromEmail: sendgridSettings.fromEmail || "",
        replyToEmail: sendgridSettings.replyToEmail || "",
        clickTracking: sendgridSettings.clickTracking ?? true,
        openTracking: sendgridSettings.openTracking ?? true,
        subscriptionTracking: sendgridSettings.subscriptionTracking || false,
        ganalytics: sendgridSettings.ganalytics || false,
        sandboxMode: sendgridSettings.sandboxMode || false,
        rateLimitPerSecond: sendgridSettings.rateLimitPerSecond || 100,
        batchSize: sendgridSettings.batchSize || 1000,
        templateId: sendgridSettings.templateId || "",
        ipPool: sendgridSettings.ipPool || "",
        asm: sendgridSettings.asm || { groupId: null, groupsToDisplay: [] },
        customArgs: sendgridSettings.customArgs || {},
        categories: sendgridSettings.categories || [],
        mailSettings: sendgridSettings.mailSettings || {
          bypassListManagement: false,
          bypassSpamManagement: false,
          bypassBounceManagement: false,
          bypassUnsubscribeManagement: false,
          footer: { enable: false, text: "", html: "" },
          spamCheck: { enable: false, threshold: 1, postToUrl: "" },
        },
      });
      setIsConnected(sendgridSettings.isConnected || false);
      setLastTested(sendgridSettings.lastTested ? new Date(sendgridSettings.lastTested) : null);
    }
  }, [sendgridSettings, isEditing]);

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
                  { label: "SendGrid Provider", current: true },
                ]}
                showHome={false}
              />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center space-x-3">
              <Zap className="h-8 w-8 text-blue-600" />
              <span>SendGrid Email Provider</span>
            </h1>
            <p className="text-gray-600 mt-2">
              Configure SendGrid API for reliable email delivery
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
                onClick={() => window.open('https://app.sendgrid.com/settings/api_keys', '_blank')}
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                SendGrid Dashboard
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
          <CardDescription>Essential SendGrid API settings</CardDescription>
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
              <Label htmlFor="enabled">Enable SendGrid provider</Label>
            </div>

            <div>
              <Label htmlFor="apiKey">SendGrid API Key *</Label>
              <div className="relative">
                <Input
                  id="apiKey"
                  type={showApiKey ? "text" : "password"}
                  value={formData.apiKey}
                  onChange={(e) => setFormData(prev => ({ ...prev, apiKey: e.target.value }))}
                  disabled={!isEditing}
                  placeholder="SG.xxxxxxxxxxxxxxxxxxxx"
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
                Get your API key from <a href="https://app.sendgrid.com/settings/api_keys" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">SendGrid Dashboard</a>
              </p>
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

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="sandboxMode"
                checked={formData.sandboxMode}
                onChange={(e) => setFormData(prev => ({ ...prev, sandboxMode: e.target.checked }))}
                disabled={!isEditing}
                className="rounded border-gray-300"
              />
              <Label htmlFor="sandboxMode">Enable sandbox mode (for testing)</Label>
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
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="clickTracking"
                  checked={formData.clickTracking}
                  onChange={(e) => setFormData(prev => ({ ...prev, clickTracking: e.target.checked }))}
                  disabled={!isEditing}
                  className="rounded border-gray-300"
                />
                <Label htmlFor="clickTracking">Enable click tracking</Label>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="openTracking"
                  checked={formData.openTracking}
                  onChange={(e) => setFormData(prev => ({ ...prev, openTracking: e.target.checked }))}
                  disabled={!isEditing}
                  className="rounded border-gray-300"
                />
                <Label htmlFor="openTracking">Enable open tracking</Label>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="subscriptionTracking"
                  checked={formData.subscriptionTracking}
                  onChange={(e) => setFormData(prev => ({ ...prev, subscriptionTracking: e.target.checked }))}
                  disabled={!isEditing}
                  className="rounded border-gray-300"
                />
                <Label htmlFor="subscriptionTracking">Enable subscription tracking</Label>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="ganalytics"
                  checked={formData.ganalytics}
                  onChange={(e) => setFormData(prev => ({ ...prev, ganalytics: e.target.checked }))}
                  disabled={!isEditing}
                  className="rounded border-gray-300"
                />
                <Label htmlFor="ganalytics">Enable Google Analytics tracking</Label>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Advanced Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>Advanced Configuration</CardTitle>
          <CardDescription>Advanced SendGrid features and settings</CardDescription>
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
                  max="1000"
                  value={formData.rateLimitPerSecond}
                  onChange={(e) => setFormData(prev => ({ ...prev, rateLimitPerSecond: parseInt(e.target.value) || 100 }))}
                  disabled={!isEditing}
                />
                <p className="text-sm text-gray-600 mt-1">SendGrid allows up to 100 emails/second</p>
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="templateId">Default Template ID</Label>
                <Input
                  id="templateId"
                  value={formData.templateId}
                  onChange={(e) => setFormData(prev => ({ ...prev, templateId: e.target.value }))}
                  disabled={!isEditing}
                  placeholder="d-1234567890abcdef"
                />
              </div>
              <div>
                <Label htmlFor="ipPool">IP Pool</Label>
                <Input
                  id="ipPool"
                  value={formData.ipPool}
                  onChange={(e) => setFormData(prev => ({ ...prev, ipPool: e.target.value }))}
                  disabled={!isEditing}
                  placeholder="marketing"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="categories">Categories (comma-separated)</Label>
              <Input
                id="categories"
                value={formData.categories.join(", ")}
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  categories: e.target.value.split(",").map(cat => cat.trim()).filter(Boolean)
                }))}
                disabled={!isEditing}
                placeholder="transactional, notifications, alerts"
              />
              <p className="text-sm text-gray-600 mt-1">
                Categories help organize your emails in SendGrid analytics
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Mail Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Mail Settings</CardTitle>
          <CardDescription>Advanced mail handling and compliance settings</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="bypassListManagement"
                  checked={formData.mailSettings.bypassListManagement}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    mailSettings: { 
                      ...prev.mailSettings, 
                      bypassListManagement: e.target.checked 
                    }
                  }))}
                  disabled={!isEditing}
                  className="rounded border-gray-300"
                />
                <Label htmlFor="bypassListManagement">Bypass list management</Label>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="bypassSpamManagement"
                  checked={formData.mailSettings.bypassSpamManagement}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    mailSettings: { 
                      ...prev.mailSettings, 
                      bypassSpamManagement: e.target.checked 
                    }
                  }))}
                  disabled={!isEditing}
                  className="rounded border-gray-300"
                />
                <Label htmlFor="bypassSpamManagement">Bypass spam management</Label>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="bypassBounceManagement"
                  checked={formData.mailSettings.bypassBounceManagement}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    mailSettings: { 
                      ...prev.mailSettings, 
                      bypassBounceManagement: e.target.checked 
                    }
                  }))}
                  disabled={!isEditing}
                  className="rounded border-gray-300"
                />
                <Label htmlFor="bypassBounceManagement">Bypass bounce management</Label>
              </div>
            </div>

            <div className="pt-4 border-t">
              <div className="flex items-center space-x-2 mb-3">
                <input
                  type="checkbox"
                  id="footerEnable"
                  checked={formData.mailSettings.footer.enable}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    mailSettings: { 
                      ...prev.mailSettings, 
                      footer: { 
                        ...prev.mailSettings.footer, 
                        enable: e.target.checked 
                      }
                    }
                  }))}
                  disabled={!isEditing}
                  className="rounded border-gray-300"
                />
                <Label htmlFor="footerEnable">Enable custom footer</Label>
              </div>
              
              {formData.mailSettings.footer.enable && (
                <div className="space-y-3 ml-6">
                  <div>
                    <Label htmlFor="footerText">Footer Text</Label>
                    <Textarea
                      id="footerText"
                      value={formData.mailSettings.footer.text}
                      onChange={(e) => setFormData(prev => ({ 
                        ...prev, 
                        mailSettings: { 
                          ...prev.mailSettings, 
                          footer: { 
                            ...prev.mailSettings.footer, 
                            text: e.target.value 
                          }
                        }
                      }))}
                      disabled={!isEditing}
                      placeholder="Text version of footer"
                      rows={2}
                    />
                  </div>
                  <div>
                    <Label htmlFor="footerHtml">Footer HTML</Label>
                    <Textarea
                      id="footerHtml"
                      value={formData.mailSettings.footer.html}
                      onChange={(e) => setFormData(prev => ({ 
                        ...prev, 
                        mailSettings: { 
                          ...prev.mailSettings, 
                          footer: { 
                            ...prev.mailSettings.footer, 
                            html: e.target.value 
                          }
                        }
                      }))}
                      disabled={!isEditing}
                      placeholder="<p>HTML version of footer</p>"
                      rows={2}
                    />
                  </div>
                </div>
              )}
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
            onClick={() => window.open('https://docs.sendgrid.com/', '_blank')}
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