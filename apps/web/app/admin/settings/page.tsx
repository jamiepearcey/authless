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
    // Platform Settings
    platformName: "Authless",
    platformDescription: "",
    supportEmail: "",
    maintenanceMode: false,
    allowNewTenantRegistration: true,
    maxTenantsPerUser: 5,
    defaultTenantPlan: "free" as "free" | "pro" | "enterprise",
    
    
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
    enableSystemNotifications: true,
    enableAuditLogging: true,
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
        platformName: platformSettings.platformName || "Authless",
        platformDescription: platformSettings.platformDescription || "",
        supportEmail: platformSettings.supportEmail || "",
        maintenanceMode: platformSettings.maintenanceMode || false,
        allowNewTenantRegistration: platformSettings.allowNewTenantRegistration ?? true,
        maxTenantsPerUser: platformSettings.maxTenantsPerUser || 5,
        defaultTenantPlan: platformSettings.defaultTenantPlan || "free",
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
        enableSystemNotifications: platformSettings.enableSystemNotifications ?? true,
        enableAuditLogging: platformSettings.enableAuditLogging ?? true,
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
            <Server className="h-4 w-4" />
            Platform
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

        {/* Platform Settings */}
        <TabsContent value="platform" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Platform Configuration</CardTitle>
              <CardDescription>General platform settings and tenant management</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="platformName">Platform Name</Label>
                    <Input
                      id="platformName"
                      value={formData.platformName}
                      onChange={(e) => setFormData(prev => ({ ...prev, platformName: e.target.value }))}
                      disabled={!isEditing}
                      placeholder="Authless"
                    />
                  </div>
                  <div>
                    <Label htmlFor="supportEmail">Support Email</Label>
                    <Input
                      id="supportEmail"
                      type="email"
                      value={formData.supportEmail}
                      onChange={(e) => setFormData(prev => ({ ...prev, supportEmail: e.target.value }))}
                      disabled={!isEditing}
                      placeholder="support@authless.com"
                    />
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="platformDescription">Platform Description</Label>
                  <Textarea
                    id="platformDescription"
                    value={formData.platformDescription}
                    onChange={(e) => setFormData(prev => ({ ...prev, platformDescription: e.target.value }))}
                    disabled={!isEditing}
                    rows={3}
                    placeholder="A secure authentication platform for modern applications"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="maxTenantsPerUser">Max Tenants Per User</Label>
                    <Input
                      id="maxTenantsPerUser"
                      type="number"
                      min="1"
                      max="100"
                      value={formData.maxTenantsPerUser}
                      onChange={(e) => setFormData(prev => ({ ...prev, maxTenantsPerUser: parseInt(e.target.value) || 5 }))}
                      disabled={!isEditing}
                    />
                  </div>
                  <div>
                    <Label htmlFor="defaultTenantPlan">Default Tenant Plan</Label>
                    <Select 
                      value={formData.defaultTenantPlan} 
                      onValueChange={(value) => setFormData(prev => ({ ...prev, defaultTenantPlan: value as "free" | "pro" | "enterprise" }))}
                      disabled={!isEditing}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="free">Free</SelectItem>
                        <SelectItem value="pro">Pro</SelectItem>
                        <SelectItem value="enterprise">Enterprise</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="maintenanceMode"
                      checked={formData.maintenanceMode}
                      onChange={(e) => setFormData(prev => ({ ...prev, maintenanceMode: e.target.checked }))}
                      disabled={!isEditing}
                      className="rounded border-gray-300"
                    />
                    <Label htmlFor="maintenanceMode">Enable maintenance mode</Label>
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
                    <Label htmlFor="allowNewTenantRegistration">Allow new tenant registration</Label>
                  </div>
                </div>
              </form>
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