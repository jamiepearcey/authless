"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@ui/base";
import { Button, Input, Label, Textarea, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@ui/base";
import { Settings, Server, Mail, Bell, Globe, Zap } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "@ui/base";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@ui/base";
import { BreadcrumbNavigation } from "@/components/BreadcrumbNavigation";
import Link from "next/link";

export default function AdminSettingsPage() {
  const [activeTab, setActiveTab] = useState("platform");
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    // Feature Toggles - Authentication & Security
    enableMFA: false,
    enablePasskeys: false,
    enableSocialLogin: false,
    enableSessionManagement: false,
    
    // Feature Toggles - Tenant Management
    enableMultiTenant: true,
    allowNewTenantRegistration: true,
    enableTenantInvitations: false,
    enableCustomDomains: false,
    
    // Feature Toggles - API & Integrations
    enableRestAPI: false,
    enableWebhooks: false,
    enableGraphQL: false,
    enableRateLimiting: false,
    
    // Feature Toggles - Monitoring & Analytics
    enableAuditLogging: true,
    enableAnalytics: false,
    enableRealTimeMonitoring: false,
    enablePerformanceMetrics: false,
    
    // System Controls
    maintenanceMode: false,
    enableSystemNotifications: true,
    maxTenantsPerUser: 5,
    defaultTenantPlan: "free" as "free" | "pro" | "enterprise",
    sessionTimeoutMinutes: 60,
    
    // Email Settings
    emailProvider: "smtp" as "smtp" | "sendgrid" | "mailgun" | "ses" | "jetstream",
    emailFromName: "",
    emailFromAddress: "",
    // SMTP Settings
    smtpHost: "",
    smtpPort: 587,
    smtpUsername: "",
    smtpPassword: "",
    smtpTls: true,
    // SendGrid Settings
    sendgridApiKey: "",
    // Mailgun Settings
    mailgunApiKey: "",
    mailgunDomain: "",
    // AWS SES Settings
    sesAccessKeyId: "",
    sesSecretAccessKey: "",
    sesRegion: "us-east-1",
    // JetStream Settings
    jetstreamApiKey: "",
    jetstreamDomain: "",
    
    // Notification Settings
    retentionDays: 90,
  });

  // Mock query for platform settings - replace with actual tRPC query
  const { data: platformSettings, refetch } = trpc.getPlatformSettings?.useQuery() || { data: null, refetch: () => {} };
  
  // Mock mutation for updating platform settings - replace with actual tRPC mutation
  const updateSettings = trpc.updatePlatformSettings?.useMutation({
    onSuccess: () => {
      toast.success("Platform settings updated successfully!");
      setIsEditing(false);
      refetch();
    },
    onError: (error) => {
      toast.error(`Failed to update settings: ${error.message}`);
    },
  }) || { mutateAsync: async () => {}, isPending: false };

  // Initialize form data when settings load
  useEffect(() => {
    if (platformSettings && !isEditing) {
      setFormData({
        // Feature Toggles - Authentication & Security
        enableMFA: platformSettings.enableMFA ?? false,
        enablePasskeys: platformSettings.enablePasskeys ?? false,
        enableSocialLogin: platformSettings.enableSocialLogin ?? false,
        enableSessionManagement: platformSettings.enableSessionManagement ?? false,
        
        // Feature Toggles - Tenant Management
        enableMultiTenant: platformSettings.enableMultiTenant ?? true,
        allowNewTenantRegistration: platformSettings.allowNewTenantRegistration ?? true,
        enableTenantInvitations: platformSettings.enableTenantInvitations ?? false,
        enableCustomDomains: platformSettings.enableCustomDomains ?? false,
        
        // Feature Toggles - API & Integrations
        enableRestAPI: platformSettings.enableRestAPI ?? false,
        enableWebhooks: platformSettings.enableWebhooks ?? false,
        enableGraphQL: platformSettings.enableGraphQL ?? false,
        enableRateLimiting: platformSettings.enableRateLimiting ?? false,
        
        // Feature Toggles - Monitoring & Analytics
        enableAuditLogging: platformSettings.enableAuditLogging ?? true,
        enableAnalytics: platformSettings.enableAnalytics ?? false,
        enableRealTimeMonitoring: platformSettings.enableRealTimeMonitoring ?? false,
        enablePerformanceMetrics: platformSettings.enablePerformanceMetrics ?? false,
        
        // System Controls
        maintenanceMode: platformSettings.maintenanceMode ?? false,
        enableSystemNotifications: platformSettings.enableSystemNotifications ?? true,
        maxTenantsPerUser: platformSettings.maxTenantsPerUser || 5,
        defaultTenantPlan: platformSettings.defaultTenantPlan || "free",
        sessionTimeoutMinutes: platformSettings.sessionTimeoutMinutes || 60,
        
        // Email Settings
        emailProvider: platformSettings.emailProvider || "smtp",
        emailFromName: platformSettings.emailFromName || "",
        emailFromAddress: platformSettings.emailFromAddress || "",
        smtpHost: platformSettings.smtpHost || "",
        smtpPort: platformSettings.smtpPort || 587,
        smtpUsername: platformSettings.smtpUsername || "",
        smtpPassword: platformSettings.smtpPassword || "",
        smtpTls: platformSettings.smtpTls ?? true,
        sendgridApiKey: platformSettings.sendgridApiKey || "",
        mailgunApiKey: platformSettings.mailgunApiKey || "",
        mailgunDomain: platformSettings.mailgunDomain || "",
        sesAccessKeyId: platformSettings.sesAccessKeyId || "",
        sesSecretAccessKey: platformSettings.sesSecretAccessKey || "",
        sesRegion: platformSettings.sesRegion || "us-east-1",
        jetstreamApiKey: platformSettings.jetstreamApiKey || "",
        jetstreamDomain: platformSettings.jetstreamDomain || "",
        
        // Notification Settings
        retentionDays: platformSettings.retentionDays || 90,
      });
    }
  }, [platformSettings, isEditing]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      await updateSettings.mutateAsync(formData);
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
              <BreadcrumbNavigation
                items={[
                  { label: "Admin", href: "/admin" },
                  { label: "Platform Settings", current: true },
                ]}
                showHome={false}
              />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center space-x-3">
              <Settings className="h-8 w-8 text-indigo-600" />
              <span>Platform Settings</span>
            </h1>
            <p className="text-gray-600 mt-2">
              Configure platform-wide settings and preferences
            </p>
          </div>
          
          <div className="flex items-center space-x-3">
            {isEditing ? (
              <>
                <Button variant="outline" onClick={() => setIsEditing(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSubmit} disabled={updateSettings.isPending}>
                  {updateSettings.isPending ? "Saving..." : "Save Changes"}
                </Button>
              </>
            ) : (
              <Button onClick={() => setIsEditing(true)}>
                Edit Settings
              </Button>
            )}
          </div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="platform" className="flex items-center gap-2">
            <Zap className="h-4 w-4" />
            Feature Toggles
          </TabsTrigger>
          <TabsTrigger value="email" className="flex items-center gap-2">
            <Mail className="h-4 w-4" />
            Email Providers
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            Notifications
          </TabsTrigger>
        </TabsList>

        {/* Feature Toggles */}
        <TabsContent value="platform" className="space-y-6">
          {/* Core Platform Features */}
          <Card>
            <CardHeader>
              <CardTitle>Core Platform Features</CardTitle>
              <CardDescription>Enable or disable fundamental platform capabilities</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Authentication Features */}
                <div className="space-y-4">
                  <h4 className="text-sm font-medium text-gray-900 border-b pb-2">Authentication & Security</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <Label className="text-sm font-medium">Multi-Factor Authentication</Label>
                        <p className="text-xs text-gray-500">Enable MFA for all users</p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id="enableMFA"
                          checked={formData.enableMFA || false}
                          onChange={(e) => setFormData(prev => ({ ...prev, enableMFA: e.target.checked }))}
                          disabled={!isEditing}
                          className="rounded border-gray-300"
                        />
                        <span className={`text-xs px-2 py-1 rounded-full ${formData.enableMFA ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                          {formData.enableMFA ? 'Enabled' : 'Disabled'}
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <Label className="text-sm font-medium">Passkey Authentication</Label>
                        <p className="text-xs text-gray-500">WebAuthn/FIDO2 support</p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id="enablePasskeys"
                          checked={formData.enablePasskeys || false}
                          onChange={(e) => setFormData(prev => ({ ...prev, enablePasskeys: e.target.checked }))}
                          disabled={!isEditing}
                          className="rounded border-gray-300"
                        />
                        <span className={`text-xs px-2 py-1 rounded-full ${formData.enablePasskeys ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                          {formData.enablePasskeys ? 'Enabled' : 'Disabled'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <Label className="text-sm font-medium">Social Login</Label>
                        <p className="text-xs text-gray-500">OAuth providers (Google, GitHub, etc.)</p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id="enableSocialLogin"
                          checked={formData.enableSocialLogin || false}
                          onChange={(e) => setFormData(prev => ({ ...prev, enableSocialLogin: e.target.checked }))}
                          disabled={!isEditing}
                          className="rounded border-gray-300"
                        />
                        <span className={`text-xs px-2 py-1 rounded-full ${formData.enableSocialLogin ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                          {formData.enableSocialLogin ? 'Enabled' : 'Disabled'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <Label className="text-sm font-medium">Session Management</Label>
                        <p className="text-xs text-gray-500">Advanced session controls</p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id="enableSessionManagement"
                          checked={formData.enableSessionManagement || false}
                          onChange={(e) => setFormData(prev => ({ ...prev, enableSessionManagement: e.target.checked }))}
                          disabled={!isEditing}
                          className="rounded border-gray-300"
                        />
                        <span className={`text-xs px-2 py-1 rounded-full ${formData.enableSessionManagement ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                          {formData.enableSessionManagement ? 'Enabled' : 'Disabled'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Tenant Management Features */}
                <div className="space-y-4">
                  <h4 className="text-sm font-medium text-gray-900 border-b pb-2">Tenant Management</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <Label className="text-sm font-medium">Multi-Tenant Support</Label>
                        <p className="text-xs text-gray-500">Allow multiple tenants per user</p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id="enableMultiTenant"
                          checked={formData.enableMultiTenant || false}
                          onChange={(e) => setFormData(prev => ({ ...prev, enableMultiTenant: e.target.checked }))}
                          disabled={!isEditing}
                          className="rounded border-gray-300"
                        />
                        <span className={`text-xs px-2 py-1 rounded-full ${formData.enableMultiTenant ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                          {formData.enableMultiTenant ? 'Enabled' : 'Disabled'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <Label className="text-sm font-medium">Tenant Registration</Label>
                        <p className="text-xs text-gray-500">Allow new tenant creation</p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id="allowNewTenantRegistration"
                          checked={formData.allowNewTenantRegistration}
                          onChange={(e) => setFormData(prev => ({ ...prev, allowNewTenantRegistration: e.target.checked }))}
                          disabled={!isEditing}
                          className="rounded border-gray-300"
                        />
                        <span className={`text-xs px-2 py-1 rounded-full ${formData.allowNewTenantRegistration ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                          {formData.allowNewTenantRegistration ? 'Enabled' : 'Disabled'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <Label className="text-sm font-medium">Tenant Invitations</Label>
                        <p className="text-xs text-gray-500">Enable tenant member invitations</p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id="enableTenantInvitations"
                          checked={formData.enableTenantInvitations || false}
                          onChange={(e) => setFormData(prev => ({ ...prev, enableTenantInvitations: e.target.checked }))}
                          disabled={!isEditing}
                          className="rounded border-gray-300"
                        />
                        <span className={`text-xs px-2 py-1 rounded-full ${formData.enableTenantInvitations ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                          {formData.enableTenantInvitations ? 'Enabled' : 'Disabled'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <Label className="text-sm font-medium">Custom Domains</Label>
                        <p className="text-xs text-gray-500">Allow tenants to use custom domains</p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id="enableCustomDomains"
                          checked={formData.enableCustomDomains || false}
                          onChange={(e) => setFormData(prev => ({ ...prev, enableCustomDomains: e.target.checked }))}
                          disabled={!isEditing}
                          className="rounded border-gray-300"
                        />
                        <span className={`text-xs px-2 py-1 rounded-full ${formData.enableCustomDomains ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                          {formData.enableCustomDomains ? 'Enabled' : 'Disabled'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* API & Integration Features */}
                <div className="space-y-4">
                  <h4 className="text-sm font-medium text-gray-900 border-b pb-2">API & Integrations</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <Label className="text-sm font-medium">REST API</Label>
                        <p className="text-xs text-gray-500">Public REST API access</p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id="enableRestAPI"
                          checked={formData.enableRestAPI || false}
                          onChange={(e) => setFormData(prev => ({ ...prev, enableRestAPI: e.target.checked }))}
                          disabled={!isEditing}
                          className="rounded border-gray-300"
                        />
                        <span className={`text-xs px-2 py-1 rounded-full ${formData.enableRestAPI ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                          {formData.enableRestAPI ? 'Enabled' : 'Disabled'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <Label className="text-sm font-medium">Webhooks</Label>
                        <p className="text-xs text-gray-500">Event-driven webhook notifications</p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id="enableWebhooks"
                          checked={formData.enableWebhooks || false}
                          onChange={(e) => setFormData(prev => ({ ...prev, enableWebhooks: e.target.checked }))}
                          disabled={!isEditing}
                          className="rounded border-gray-300"
                        />
                        <span className={`text-xs px-2 py-1 rounded-full ${formData.enableWebhooks ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                          {formData.enableWebhooks ? 'Enabled' : 'Disabled'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <Label className="text-sm font-medium">GraphQL API</Label>
                        <p className="text-xs text-gray-500">GraphQL query interface</p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id="enableGraphQL"
                          checked={formData.enableGraphQL || false}
                          onChange={(e) => setFormData(prev => ({ ...prev, enableGraphQL: e.target.checked }))}
                          disabled={!isEditing}
                          className="rounded border-gray-300"
                        />
                        <span className={`text-xs px-2 py-1 rounded-full ${formData.enableGraphQL ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                          {formData.enableGraphQL ? 'Enabled' : 'Disabled'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <Label className="text-sm font-medium">Rate Limiting</Label>
                        <p className="text-xs text-gray-500">API request rate limiting</p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id="enableRateLimiting"
                          checked={formData.enableRateLimiting || false}
                          onChange={(e) => setFormData(prev => ({ ...prev, enableRateLimiting: e.target.checked }))}
                          disabled={!isEditing}
                          className="rounded border-gray-300"
                        />
                        <span className={`text-xs px-2 py-1 rounded-full ${formData.enableRateLimiting ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                          {formData.enableRateLimiting ? 'Enabled' : 'Disabled'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Monitoring & Analytics */}
                <div className="space-y-4">
                  <h4 className="text-sm font-medium text-gray-900 border-b pb-2">Monitoring & Analytics</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <Label className="text-sm font-medium">Audit Logging</Label>
                        <p className="text-xs text-gray-500">Comprehensive audit trails</p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id="enableAuditLogging"
                          checked={formData.enableAuditLogging}
                          onChange={(e) => setFormData(prev => ({ ...prev, enableAuditLogging: e.target.checked }))}
                          disabled={!isEditing}
                          className="rounded border-gray-300"
                        />
                        <span className={`text-xs px-2 py-1 rounded-full ${formData.enableAuditLogging ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                          {formData.enableAuditLogging ? 'Enabled' : 'Disabled'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <Label className="text-sm font-medium">Analytics Dashboard</Label>
                        <p className="text-xs text-gray-500">Usage metrics and insights</p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id="enableAnalytics"
                          checked={formData.enableAnalytics || false}
                          onChange={(e) => setFormData(prev => ({ ...prev, enableAnalytics: e.target.checked }))}
                          disabled={!isEditing}
                          className="rounded border-gray-300"
                        />
                        <span className={`text-xs px-2 py-1 rounded-full ${formData.enableAnalytics ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                          {formData.enableAnalytics ? 'Enabled' : 'Disabled'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <Label className="text-sm font-medium">Real-time Monitoring</Label>
                        <p className="text-xs text-gray-500">Live system health monitoring</p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id="enableRealTimeMonitoring"
                          checked={formData.enableRealTimeMonitoring || false}
                          onChange={(e) => setFormData(prev => ({ ...prev, enableRealTimeMonitoring: e.target.checked }))}
                          disabled={!isEditing}
                          className="rounded border-gray-300"
                        />
                        <span className={`text-xs px-2 py-1 rounded-full ${formData.enableRealTimeMonitoring ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                          {formData.enableRealTimeMonitoring ? 'Enabled' : 'Disabled'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <Label className="text-sm font-medium">Performance Metrics</Label>
                        <p className="text-xs text-gray-500">Detailed performance tracking</p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id="enablePerformanceMetrics"
                          checked={formData.enablePerformanceMetrics || false}
                          onChange={(e) => setFormData(prev => ({ ...prev, enablePerformanceMetrics: e.target.checked }))}
                          disabled={!isEditing}
                          className="rounded border-gray-300"
                        />
                        <span className={`text-xs px-2 py-1 rounded-full ${formData.enablePerformanceMetrics ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                          {formData.enablePerformanceMetrics ? 'Enabled' : 'Disabled'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* System Controls */}
          <Card>
            <CardHeader>
              <CardTitle>System Controls</CardTitle>
              <CardDescription>Critical system-wide settings and emergency controls</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center justify-between p-3 border-2 border-orange-200 rounded-lg bg-orange-50">
                    <div>
                      <Label className="text-sm font-medium text-orange-900">Maintenance Mode</Label>
                      <p className="text-xs text-orange-700">Disable platform access for maintenance</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="maintenanceMode"
                        checked={formData.maintenanceMode}
                        onChange={(e) => setFormData(prev => ({ ...prev, maintenanceMode: e.target.checked }))}
                        disabled={!isEditing}
                        className="rounded border-orange-300"
                      />
                      <span className={`text-xs px-2 py-1 rounded-full ${formData.maintenanceMode ? 'bg-orange-200 text-orange-900' : 'bg-green-100 text-green-800'}`}>
                        {formData.maintenanceMode ? 'Active' : 'Normal'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <Label className="text-sm font-medium">System Notifications</Label>
                      <p className="text-xs text-gray-500">Platform-wide notifications</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="enableSystemNotifications"
                        checked={formData.enableSystemNotifications}
                        onChange={(e) => setFormData(prev => ({ ...prev, enableSystemNotifications: e.target.checked }))}
                        disabled={!isEditing}
                        className="rounded border-gray-300"
                      />
                      <span className={`text-xs px-2 py-1 rounded-full ${formData.enableSystemNotifications ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                        {formData.enableSystemNotifications ? 'Enabled' : 'Disabled'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Platform Limits */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t">
                  <div>
                    <Label htmlFor="maxTenantsPerUser" className="text-sm font-medium">Max Tenants Per User</Label>
                    <Input
                      id="maxTenantsPerUser"
                      type="number"
                      min="1"
                      max="100"
                      value={formData.maxTenantsPerUser}
                      onChange={(e) => setFormData(prev => ({ ...prev, maxTenantsPerUser: parseInt(e.target.value) || 5 }))}
                      disabled={!isEditing}
                      className="mt-1"
                    />
                    <p className="text-xs text-gray-500 mt-1">Global limit per user account</p>
                  </div>
                  <div>
                    <Label htmlFor="defaultTenantPlan" className="text-sm font-medium">Default Tenant Plan</Label>
                    <Select 
                      value={formData.defaultTenantPlan} 
                      onValueChange={(value) => setFormData(prev => ({ ...prev, defaultTenantPlan: value as "free" | "pro" | "enterprise" }))}
                      disabled={!isEditing}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="free">Free</SelectItem>
                        <SelectItem value="pro">Pro</SelectItem>
                        <SelectItem value="enterprise">Enterprise</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-gray-500 mt-1">Default plan for new tenants</p>
                  </div>
                  <div>
                    <Label htmlFor="sessionTimeoutMinutes" className="text-sm font-medium">Session Timeout (minutes)</Label>
                    <Input
                      id="sessionTimeoutMinutes"
                      type="number"
                      min="15"
                      max="1440"
                      value={formData.sessionTimeoutMinutes || 60}
                      onChange={(e) => setFormData(prev => ({ ...prev, sessionTimeoutMinutes: parseInt(e.target.value) || 60 }))}
                      disabled={!isEditing}
                      className="mt-1"
                    />
                    <p className="text-xs text-gray-500 mt-1">User session timeout duration</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>


        {/* Email Settings */}
        <TabsContent value="email" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Email Service Providers</CardTitle>
              <CardDescription>Configure email delivery services for the platform</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* SMTP Provider Card */}
                <div className="p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                        <Mail className="h-5 w-5 text-gray-600" />
                      </div>
                      <div>
                        <h3 className="font-medium text-gray-900">SMTP</h3>
                        <p className="text-sm text-gray-500">Standard SMTP server</p>
                      </div>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 mb-4">
                    Configure any SMTP server for email delivery with custom authentication and security settings.
                  </p>
                  <Link href="/admin/settings/email-providers/smtp">
                    <Button variant="outline" className="w-full">
                      Configure SMTP
                    </Button>
                  </Link>
                </div>

                {/* SendGrid Provider Card */}
                <div className="p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                        <Zap className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="font-medium text-gray-900">SendGrid</h3>
                        <p className="text-sm text-gray-500">Cloud email API</p>
                      </div>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 mb-4">
                    Reliable cloud-based email delivery with advanced analytics, tracking, and deliverability features.
                  </p>
                  <Link href="/admin/settings/email-providers/sendgrid">
                    <Button variant="outline" className="w-full">
                      Configure SendGrid
                    </Button>
                  </Link>
                </div>

                {/* Mailgun Provider Card */}
                <div className="p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                        <Mail className="h-5 w-5 text-orange-600" />
                      </div>
                      <div>
                        <h3 className="font-medium text-gray-900">Mailgun</h3>
                        <p className="text-sm text-gray-500">Email API service</p>
                      </div>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 mb-4">
                    Powerful email API with advanced routing, webhooks, and detailed analytics for developers.
                  </p>
                  <Link href="/admin/settings/email-providers/mailgun">
                    <Button variant="outline" className="w-full">
                      Configure Mailgun
                    </Button>
                  </Link>
                </div>

                {/* AWS SES Provider Card */}
                <div className="p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
                        <Globe className="h-5 w-5 text-yellow-600" />
                      </div>
                      <div>
                        <h3 className="font-medium text-gray-900">Amazon SES</h3>
                        <p className="text-sm text-gray-500">AWS email service</p>
                      </div>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 mb-4">
                    Scalable and cost-effective email service from Amazon Web Services with high deliverability.
                  </p>
                  <Link href="/admin/settings/email-providers/ses">
                    <Button variant="outline" className="w-full">
                      Configure AWS SES
                    </Button>
                  </Link>
                </div>

                {/* JetStream Provider Card */}
                <div className="p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                        <Zap className="h-5 w-5 text-green-600" />
                      </div>
                      <div>
                        <h3 className="font-medium text-gray-900">JetStream</h3>
                        <p className="text-sm text-gray-500">Event-driven emails</p>
                      </div>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 mb-4">
                    High-performance, event-driven email processing with NATS JetStream for scalable applications.
                  </p>
                  <Link href="/admin/settings/email-providers/jetstream">
                    <Button variant="outline" className="w-full">
                      Configure JetStream
                    </Button>
                  </Link>
                </div>

                {/* Add Provider Placeholder */}
                <div className="p-4 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center text-center">
                  <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center mb-3">
                    <Mail className="h-5 w-5 text-gray-400" />
                  </div>
                  <h3 className="font-medium text-gray-600 mb-1">Need Another Provider?</h3>
                  <p className="text-sm text-gray-500">
                    Contact support for additional email provider integrations.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>


        {/* Notification Settings */}
        <TabsContent value="notifications" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Notification Settings</CardTitle>
              <CardDescription>System notifications and audit logging</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="retentionDays">Log Retention (days)</Label>
                  <Input
                    id="retentionDays"
                    type="number"
                    min="1"
                    max="365"
                    value={formData.retentionDays}
                    onChange={(e) => setFormData(prev => ({ ...prev, retentionDays: parseInt(e.target.value) || 90 }))}
                    disabled={!isEditing}
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    How long to keep audit logs and system notifications
                  </p>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="enableSystemNotifications"
                      checked={formData.enableSystemNotifications}
                      onChange={(e) => setFormData(prev => ({ ...prev, enableSystemNotifications: e.target.checked }))}
                      disabled={!isEditing}
                      className="rounded border-gray-300"
                    />
                    <Label htmlFor="enableSystemNotifications">Enable system notifications</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="enableAuditLogging"
                      checked={formData.enableAuditLogging}
                      onChange={(e) => setFormData(prev => ({ ...prev, enableAuditLogging: e.target.checked }))}
                      disabled={!isEditing}
                      className="rounded border-gray-300"
                    />
                    <Label htmlFor="enableAuditLogging">Enable audit logging</Label>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

      </Tabs>
    </div>
  );
}