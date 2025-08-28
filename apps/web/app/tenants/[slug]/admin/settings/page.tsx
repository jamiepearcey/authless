"use client";
import { useState } from "react";
import { useParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@ui/base";
import { Button, Input, Label, Textarea, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@ui/base";
import { Badge } from "@ui/base";
import { Building2, Palette, Shield, Zap } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "@ui/base";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@ui/base";
import { BreadcrumbNavigation } from "@/components/BreadcrumbNavigation";

export default function TenantSettingsPage() {
  const params = useParams();
  const tenantSlug = params.slug as string;
  console.log("tenantSlug", tenantSlug);
  
  
  const [activeTab, setActiveTab] = useState("general");
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    website: "",
    industry: "",
    size: "",
    plan: "free" as "free" | "pro" | "enterprise",
    status: "active" as "active" | "suspended" | "deleted",
    invitePolicy: "admin_only" as "admin_only" | "open",
    emailVerificationBypassEnabled: false,
    primaryColor: "#3B82F6",
    secondaryColor: "#1E40AF",
    locale: "en",
    timezone: "UTC",
    ssoEnabled: false,
    ssoProvider: "none" as "none" | "google" | "azure" | "okta" | "onelogin" | "custom",
    billingEnabled: false,
  });

  const { data: tenant, refetch } = trpc.getTenant.useQuery(
    { slug: tenantSlug },
    { enabled: !!tenantSlug }
  );

  const updateTenant = trpc.updateTenant.useMutation({
    onSuccess: () => {
      toast.success("Tenant settings updated successfully!");
      setIsEditing(false);
      refetch();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  // Initialize form data when tenant loads
  useState(() => {
    if (tenant && !isEditing) {
      setFormData({
        name: tenant.name || "",
        description: tenant.description || "",
        website: tenant.website || "",
        industry: tenant.industry || "",
        size: tenant.size || "",
        plan: (tenant.plan as "free" | "pro" | "enterprise") || "free",
        status: (tenant.status as "active" | "suspended" | "deleted") || "active",
        invitePolicy: (tenant.invitePolicy as "admin_only" | "open") || "admin_only",
        emailVerificationBypassEnabled: tenant.emailVerificationBypassEnabled || false,
        primaryColor: tenant.primaryColor || "#3B82F6",
        secondaryColor: tenant.secondaryColor || "#1E40AF",
        locale: tenant.locale || "en",
        timezone: tenant.timezone || "UTC",
        ssoEnabled: tenant.ssoEnabled || false,
        ssoProvider: (tenant.ssoProvider as "none" | "google" | "azure" | "okta" | "onelogin" | "custom") || "none",
        billingEnabled: tenant.billingEnabled || false,
      });
    }
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      await updateTenant.mutateAsync({
        slug: tenantSlug,
        data: formData,
      });
    } catch (error) {
      // Handled by mutation
    }
  };

  const getPlanBadge = (plan: string) => {
    switch (plan) {
      case "free":
        return <Badge variant="secondary">Free</Badge>;
      case "pro":
        return <Badge variant="default" className="bg-blue-100 text-blue-700 border-blue-200">Pro</Badge>;
      case "enterprise":
        return <Badge variant="default" className="bg-purple-100 text-purple-700 border-purple-200">Enterprise</Badge>;
      default:
        return <Badge variant="outline">{plan}</Badge>;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge variant="default" className="bg-green-100 text-green-700 border-green-200">Active</Badge>;
      case "suspended":
        return <Badge variant="destructive" className="bg-red-100 text-red-700 border-red-200">Suspended</Badge>;
      case "pending":
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-700 border-yellow-200">Pending</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (!tenant) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center space-x-4 mb-4">
          <BreadcrumbNavigation
            items={[
              { label: "Tenants", href: "/tenants" },
              { label: tenantSlug, href: `/tenants/${tenantSlug}` },
              { label: "Admin", href: `/tenants/${tenantSlug}/admin` },
              { label: "Settings", current: true },
            ]}
            showHome={false}
          />
        </div>
        
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center space-x-3">
              <Building2 className="h-8 w-8 text-indigo-600" />
              <span>Tenant Settings</span>
            </h1>
            <p className="text-gray-600 mt-2">
              Configure workspace settings and preferences
            </p>
          </div>
          
          <div className="flex items-center space-x-3">
            {isEditing ? (
              <>
                <Button variant="outline" onClick={() => setIsEditing(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSubmit} disabled={updateTenant.isPending}>
                  {updateTenant.isPending ? "Saving..." : "Save Changes"}
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
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="general" className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            General
          </TabsTrigger>
          <TabsTrigger value="appearance" className="flex items-center gap-2">
            <Palette className="h-4 w-4" />
            Appearance
          </TabsTrigger>
          <TabsTrigger value="security" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Security
          </TabsTrigger>
          <TabsTrigger value="integrations" className="flex items-center gap-2">
            <Zap className="h-4 w-4" />
            Integrations
          </TabsTrigger>
        </TabsList>

        {/* General Settings */}
        <TabsContent value="general" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
              <CardDescription>Update your workspace details and configuration</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name">Workspace Name</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      disabled={!isEditing}
                    />
                  </div>
                  <div>
                    <Label htmlFor="plan">Plan</Label>
                    <Select 
                      value={formData.plan} 
                      onValueChange={(value) => setFormData(prev => ({ ...prev, plan: value as "free" | "pro" | "enterprise" }))}
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
                
                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    disabled={!isEditing}
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="website">Website</Label>
                    <Input
                      id="website"
                      value={formData.website}
                      onChange={(e) => setFormData(prev => ({ ...prev, website: e.target.value }))}
                      disabled={!isEditing}
                      placeholder="https://example.com"
                    />
                  </div>
                  <div>
                    <Label htmlFor="industry">Industry</Label>
                    <Select 
                      value={formData.industry} 
                      onValueChange={(value) => setFormData(prev => ({ ...prev, industry: value }))}
                      disabled={!isEditing}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select industry" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="technology">Technology</SelectItem>
                        <SelectItem value="healthcare">Healthcare</SelectItem>
                        <SelectItem value="finance">Finance</SelectItem>
                        <SelectItem value="education">Education</SelectItem>
                        <SelectItem value="retail">Retail</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="size">Company Size</Label>
                    <Select 
                      value={formData.size} 
                      onValueChange={(value) => setFormData(prev => ({ ...prev, size: value }))}
                      disabled={!isEditing}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select size" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1-10">1-10 employees</SelectItem>
                        <SelectItem value="11-50">11-50 employees</SelectItem>
                        <SelectItem value="51-200">51-200 employees</SelectItem>
                        <SelectItem value="201-1000">201-1000 employees</SelectItem>
                        <SelectItem value="1000+">1000+ employees</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  {!isEditing ? (
                    <Button type="button" onClick={() => setIsEditing(true)}>
                      Edit Settings
                    </Button>
                  ) : (
                    <>
                      <Button type="button" variant="outline" onClick={() => setIsEditing(false)}>
                        Cancel
                      </Button>
                      <Button type="submit" disabled={updateTenant.isPending}>
                        {updateTenant.isPending ? "Saving..." : "Save Changes"}
                      </Button>
                    </>
                  )}
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Appearance Settings */}
        <TabsContent value="appearance" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Branding & Appearance</CardTitle>
              <CardDescription>Customize your workspace colors and theme</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="primaryColor">Primary Color</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <Input
                        id="primaryColor"
                        type="color"
                        value={formData.primaryColor}
                        onChange={(e) => setFormData(prev => ({ ...prev, primaryColor: e.target.value }))}
                        className="w-16 h-10 p-1"
                      />
                      <Input
                        value={formData.primaryColor}
                        onChange={(e) => setFormData(prev => ({ ...prev, primaryColor: e.target.value }))}
                        placeholder="#3B82F6"
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="secondaryColor">Secondary Color</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <Input
                        id="secondaryColor"
                        type="color"
                        value={formData.secondaryColor}
                        onChange={(e) => setFormData(prev => ({ ...prev, secondaryColor: e.target.value }))}
                        className="w-16 h-10 p-1"
                      />
                      <Input
                        value={formData.secondaryColor}
                        onChange={(e) => setFormData(prev => ({ ...prev, secondaryColor: e.target.value }))}
                        placeholder="#1E40AF"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="locale">Language</Label>
                    <Select 
                      value={formData.locale} 
                      onValueChange={(value) => setFormData(prev => ({ ...prev, locale: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="en">English</SelectItem>
                        <SelectItem value="es">Spanish</SelectItem>
                        <SelectItem value="fr">French</SelectItem>
                        <SelectItem value="de">German</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="timezone">Timezone</Label>
                    <Select 
                      value={formData.timezone} 
                      onValueChange={(value) => setFormData(prev => ({ ...prev, timezone: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="UTC">UTC</SelectItem>
                        <SelectItem value="America/New_York">Eastern Time</SelectItem>
                        <SelectItem value="America/Chicago">Central Time</SelectItem>
                        <SelectItem value="America/Denver">Mountain Time</SelectItem>
                        <SelectItem value="America/Los_Angeles">Pacific Time</SelectItem>
                        <SelectItem value="Europe/London">London</SelectItem>
                        <SelectItem value="Europe/Paris">Paris</SelectItem>
                        <SelectItem value="Asia/Tokyo">Tokyo</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Settings */}
        <TabsContent value="security" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Security & Access Control</CardTitle>
              <CardDescription>Manage user invitations and verification settings</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="invitePolicy">Invitation Policy</Label>
                  <Select 
                    value={formData.invitePolicy} 
                    onValueChange={(value) => setFormData(prev => ({ ...prev, invitePolicy: value as "admin_only" | "open" }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin_only">Admin Only</SelectItem>
                      <SelectItem value="admin_and_members">Admins & Members</SelectItem>
                      <SelectItem value="open">Open (Anyone can invite)</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-gray-500 mt-1">
                    Control who can invite new users to your workspace
                  </p>
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="emailVerificationBypassEnabled"
                    checked={formData.emailVerificationBypassEnabled}
                    onChange={(e) => setFormData(prev => ({ ...prev, emailVerificationBypassEnabled: e.target.checked }))}
                    className="rounded border-gray-300"
                  />
                  <Label htmlFor="emailVerificationBypassEnabled">
                    Allow email verification bypass for invited users
                  </Label>
                </div>
                <p className="text-sm text-gray-500">
                  When enabled, invited users can set passwords without email verification
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Integrations Settings */}
        <TabsContent value="integrations" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Third-party Integrations</CardTitle>
              <CardDescription>Connect external services and SSO providers</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="ssoEnabled"
                    checked={formData.ssoEnabled}
                    onChange={(e) => setFormData(prev => ({ ...prev, ssoEnabled: e.target.checked }))}
                    className="rounded border-gray-300"
                  />
                  <Label htmlFor="ssoEnabled">Enable Single Sign-On (SSO)</Label>
                </div>

                {formData.ssoEnabled && (
                  <div>
                    <Label htmlFor="ssoProvider">SSO Provider</Label>
                    <Select 
                      value={formData.ssoProvider} 
                      onValueChange={(value) => setFormData(prev => ({ ...prev, ssoProvider: value as "none" | "google" | "azure" | "okta" | "onelogin" | "custom"  }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Select Provider</SelectItem>
                        <SelectItem value="google">Google Workspace</SelectItem>
                        <SelectItem value="azure">Microsoft Azure AD</SelectItem>
                        <SelectItem value="okta">Okta</SelectItem>
                        <SelectItem value="onelogin">OneLogin</SelectItem>
                        <SelectItem value="custom">Custom SAML</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="billingEnabled"
                    checked={formData.billingEnabled}
                    onChange={(e) => setFormData(prev => ({ ...prev, billingEnabled: e.target.checked }))}
                    className="rounded border-gray-300"
                  />
                  <Label htmlFor="billingEnabled">Enable Billing & Subscriptions</Label>
                </div>
                <p className="text-sm text-gray-500">
                  Connect to Stripe for payment processing and subscription management
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
