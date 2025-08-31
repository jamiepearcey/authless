"use client";
import { useState } from "react";
import { useParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@ui/base";
import { Button, Input, Label, Textarea, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@ui/base";
// import { Badge } from "@ui/base";
import { ArrowLeft, Building2, Palette, Shield, Zap, AlertCircle, CheckCircle, Eye, EyeOff, TestTube } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "@ui/base";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@ui/base";
import { BreadcrumbNavigation } from "@/components/BreadcrumbNavigation";
import Link from "next/link";

// SSO Configuration Component
function  SsoConfiguration({ tenantId, tenantSlug }: { tenantId: string; tenantSlug: string }) {
  const [isEditing, setIsEditing] = useState(false);
  const [showSecrets, setShowSecrets] = useState(false);
  const [ssoFormData, setSsoFormData] = useState({
    provider: "none" as "none" | "saml" | "oidc" | "azure-ad" | "google-workspace",
    providerName: "",
    isEnabled: false,
    enforceSSO: false,
    // SAML fields
    samlSsoUrl: "",
    samlEntityId: "",
    samlX509Certificate: "",
    samlSignRequests: false,
    samlEncryptAssertions: false,
    // OIDC fields
    oidcIssuer: "",
    oidcClientId: "",
    oidcClientSecret: "",
    oidcScope: "openid profile email",
    // Attribute mapping
    attributeMapping: {
      email: "email",
      firstName: "given_name",
      lastName: "family_name",
      displayName: "name"
    }
  });

  const { data: ssoConfig, refetch: refetchSsoConfig } = trpc.getSsoConfiguration.useQuery(
    { tenantId },
    { enabled: !!tenantId }
  );

  // const { data: ssoProviders } = trpc.getSsoProviders.useQuery();

  const upsertSsoConfig = trpc.upsertSsoConfiguration.useMutation({
    onSuccess: () => {
      toast.success("SSO configuration saved successfully!");
      setIsEditing(false);
      refetchSsoConfig();
    },
    onError: (error) => {
      toast.error(`Failed to save SSO configuration: ${error.message}`);
    },
  });

  const testSsoConfig = trpc.testSsoConfiguration.useMutation({
    onSuccess: (result) => {
      if (result.valid) {
        toast.success("SSO configuration test passed!");
      } else {
        toast.error(`SSO test failed: ${result.errors.map((error: any) => error.error).join(", ")}`);
      }
    },
    onError: (error) => {
      toast.error(`Test failed: ${error.message}`);
    },
  });

  const deleteSsoConfig = trpc.deleteSsoConfiguration.useMutation({
    onSuccess: () => {
      toast.success("SSO configuration deleted successfully!");
      refetchSsoConfig();
      setSsoFormData({
        provider: "none",
        providerName: "",
        isEnabled: false,
        enforceSSO: false,
        samlSsoUrl: "",
        samlEntityId: "",
        samlX509Certificate: "",
        samlSignRequests: false,
        samlEncryptAssertions: false,
        oidcIssuer: "",
        oidcClientId: "",
        oidcClientSecret: "",
        oidcScope: "openid profile email",
        attributeMapping: {
          email: "email",
          firstName: "given_name",
          lastName: "family_name",
          displayName: "name"
        }
      });
    },
    onError: (error) => {
      toast.error(`Failed to delete SSO configuration: ${error.message}`);
    },
  });

  // Initialize form data when SSO config loads
  useState(() => {
    if (ssoConfig && !isEditing) {
      setSsoFormData({
        provider: ssoConfig.provider as any || "none",
        providerName: ssoConfig.providerName || "",
        isEnabled: ssoConfig.isEnabled || false,
        enforceSSO: ssoConfig.enforceSSO || false,
        samlSsoUrl: ssoConfig.samlSsoUrl || "",
        samlEntityId: ssoConfig.samlEntityId || "",
        samlX509Certificate: ssoConfig.samlCertificate || "",
        samlSignRequests: ssoConfig.signRequests || false,
        samlEncryptAssertions: ssoConfig.encryptAssertions || false,
        oidcIssuer: ssoConfig.oidcIssuer || "",
        oidcClientId: ssoConfig.oidcClientId || "",
        oidcClientSecret: ssoConfig.oidcClientSecret || "",
        oidcScope: ssoConfig.oidcScopes || "openid profile email",
        attributeMapping: (() => {
          try {
            return JSON.parse((ssoConfig?.samlAttributeMapping as string) || "{}");
          } catch {
            return {
              email: "email",
              firstName: "given_name",
              lastName: "family_name",
              displayName: "name"
            };
          }
        })()
      });
    }
  });

  const handleSsoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      await upsertSsoConfig.mutateAsync({
        tenantId,
        configuration: ssoFormData as any
      });
    } catch (error) {
      // Handled by mutation
    }
  };

  const handleTestConfiguration = async () => {
    try {
      await testSsoConfig.mutateAsync({ tenantId, configuration: ssoFormData as any });
    } catch (error) {
      // Handled by mutation
    }
  };

  const handleDeleteConfiguration = async () => {
    if (window.confirm("Are you sure you want to delete this SSO configuration? This action cannot be undone.")) {
      try {
        await deleteSsoConfig.mutateAsync({ tenantId });
      } catch (error) {
        // Handled by mutation
      }
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Single Sign-On (SSO)
        </CardTitle>
        <CardDescription>
          Configure single sign-on authentication for your workspace users
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSsoSubmit} className="space-y-6">
          {/* SSO Status */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <div className="flex items-center gap-2">
                {ssoFormData.isEnabled ? (
                  <CheckCircle className="h-5 w-5 text-green-600" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-gray-400" />
                )}
                <span className="font-medium">
                  SSO Status: {ssoFormData.isEnabled ? "Enabled" : "Disabled"}
                </span>
              </div>
              {ssoFormData.isEnabled && ssoFormData.provider !== "none" && (
                <p className="text-sm text-gray-600 mt-1">
                  Provider: {ssoFormData.providerName || ssoFormData.provider}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2">
              {!isEditing ? (
                <Button type="button" onClick={() => setIsEditing(true)}>
                  Configure SSO
                </Button>
              ) : (
                <div className="flex gap-2">
                  <Button type="button" variant="outline" onClick={() => setIsEditing(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={upsertSsoConfig.isPending}>
                    {upsertSsoConfig.isPending ? "Saving..." : "Save Configuration"}
                  </Button>
                </div>
              )}
            </div>
          </div>

          {isEditing && (
            <div className="space-y-6">
              {/* Basic Configuration */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="provider">SSO Provider</Label>
                  <Select 
                    value={ssoFormData.provider} 
                    onValueChange={(value) => setSsoFormData(prev => ({ ...prev, provider: value as any }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No SSO</SelectItem>
                      <SelectItem value="saml">SAML 2.0</SelectItem>
                      <SelectItem value="oidc">OpenID Connect</SelectItem>
                      <SelectItem value="azure-ad">Microsoft Azure AD</SelectItem>
                      <SelectItem value="google-workspace">Google Workspace</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="providerName">Provider Display Name</Label>
                  <Input
                    id="providerName"
                    value={ssoFormData.providerName}
                    onChange={(e) => setSsoFormData(prev => ({ ...prev, providerName: e.target.value }))}
                    placeholder="e.g., Company SSO, Azure AD"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="isEnabled"
                    checked={ssoFormData.isEnabled}
                    onChange={(e) => setSsoFormData(prev => ({ ...prev, isEnabled: e.target.checked }))}
                    className="rounded border-gray-300"
                  />
                  <Label htmlFor="isEnabled">Enable SSO for this workspace</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="enforceSSO"
                    checked={ssoFormData.enforceSSO}
                    onChange={(e) => setSsoFormData(prev => ({ ...prev, enforceSSO: e.target.checked }))}
                    className="rounded border-gray-300"
                    disabled={!ssoFormData.isEnabled}
                  />
                  <Label htmlFor="enforceSSO">Enforce SSO (disable password login)</Label>
                </div>
              </div>

              {/* Provider-specific Configuration */}
              {ssoFormData.provider === "saml" && (
                <div className="space-y-4">
                  <h4 className="font-medium text-lg">SAML Configuration</h4>
                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <Label htmlFor="samlSsoUrl">SSO URL</Label>
                      <Input
                        id="samlSsoUrl"
                        value={ssoFormData.samlSsoUrl}
                        onChange={(e) => setSsoFormData(prev => ({ ...prev, samlSsoUrl: e.target.value }))}
                        placeholder="https://your-idp.com/sso/saml"
                      />
                    </div>
                    <div>
                      <Label htmlFor="samlEntityId">Entity ID</Label>
                      <Input
                        id="samlEntityId"
                        value={ssoFormData.samlEntityId}
                        onChange={(e) => setSsoFormData(prev => ({ ...prev, samlEntityId: e.target.value }))}
                        placeholder="urn:your-idp:entity-id"
                      />
                    </div>
                    <div>
                      <Label htmlFor="samlX509Certificate">X.509 Certificate</Label>
                      <Textarea
                        id="samlX509Certificate"
                        value={ssoFormData.samlX509Certificate}
                        onChange={(e) => setSsoFormData(prev => ({ ...prev, samlX509Certificate: e.target.value }))}
                        placeholder="-----BEGIN CERTIFICATE-----&#10;...&#10;-----END CERTIFICATE-----"
                        rows={5}
                      />
                    </div>
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id="samlSignRequests"
                          checked={ssoFormData.samlSignRequests}
                          onChange={(e) => setSsoFormData(prev => ({ ...prev, samlSignRequests: e.target.checked }))}
                          className="rounded border-gray-300"
                        />
                        <Label htmlFor="samlSignRequests">Sign SAML requests</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id="samlEncryptAssertions"
                          checked={ssoFormData.samlEncryptAssertions}
                          onChange={(e) => setSsoFormData(prev => ({ ...prev, samlEncryptAssertions: e.target.checked }))}
                          className="rounded border-gray-300"
                        />
                        <Label htmlFor="samlEncryptAssertions">Encrypt SAML assertions</Label>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {(ssoFormData.provider === "oidc" || ssoFormData.provider === "azure-ad" || ssoFormData.provider === "google-workspace") && (
                <div className="space-y-4">
                  <h4 className="font-medium text-lg">
                    {ssoFormData.provider === "oidc" ? "OpenID Connect" : 
                     ssoFormData.provider === "azure-ad" ? "Azure AD" : "Google Workspace"} Configuration
                  </h4>
                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <Label htmlFor="oidcIssuer">
                        {ssoFormData.provider === "azure-ad" ? "Tenant ID / Issuer" : "Issuer URL"}
                      </Label>
                      <Input
                        id="oidcIssuer"
                        value={ssoFormData.oidcIssuer}
                        onChange={(e) => setSsoFormData(prev => ({ ...prev, oidcIssuer: e.target.value }))}
                        placeholder={
                          ssoFormData.provider === "azure-ad" 
                            ? "https://login.microsoftonline.com/{tenant-id}" 
                            : "https://your-oidc-provider.com"
                        }
                      />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="oidcClientId">Client ID</Label>
                        <Input
                          id="oidcClientId"
                          value={ssoFormData.oidcClientId}
                          onChange={(e) => setSsoFormData(prev => ({ ...prev, oidcClientId: e.target.value }))}
                          placeholder="your-client-id"
                        />
                      </div>
                      <div>
                        <Label htmlFor="oidcClientSecret">Client Secret</Label>
                        <div className="relative">
                          <Input
                            id="oidcClientSecret"
                            type={showSecrets ? "text" : "password"}
                            value={ssoFormData.oidcClientSecret}
                            onChange={(e) => setSsoFormData(prev => ({ ...prev, oidcClientSecret: e.target.value }))}
                            placeholder="your-client-secret"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute right-2 top-1/2 transform -translate-y-1/2"
                            onClick={() => setShowSecrets(!showSecrets)}
                          >
                            {showSecrets ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </Button>
                        </div>
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="oidcScope">Scopes</Label>
                      <Input
                        id="oidcScope"
                        value={ssoFormData.oidcScope}
                        onChange={(e) => setSsoFormData(prev => ({ ...prev, oidcScope: e.target.value }))}
                        placeholder="openid profile email"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Attribute Mapping */}
              {ssoFormData.provider !== "none" && (
                <div className="space-y-4">
                  <h4 className="font-medium text-lg">User Attribute Mapping</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="emailMapping">Email Attribute</Label>
                      <Input
                        id="emailMapping"
                        value={ssoFormData.attributeMapping.email}
                        onChange={(e) => setSsoFormData(prev => ({ 
                          ...prev, 
                          attributeMapping: { ...prev.attributeMapping, email: e.target.value }
                        }))}
                        placeholder="email"
                      />
                    </div>
                    <div>
                      <Label htmlFor="firstNameMapping">First Name Attribute</Label>
                      <Input
                        id="firstNameMapping"
                        value={ssoFormData.attributeMapping.firstName}
                        onChange={(e) => setSsoFormData(prev => ({ 
                          ...prev, 
                          attributeMapping: { ...prev.attributeMapping, firstName: e.target.value }
                        }))}
                        placeholder="given_name"
                      />
                    </div>
                    <div>
                      <Label htmlFor="lastNameMapping">Last Name Attribute</Label>
                      <Input
                        id="lastNameMapping"
                        value={ssoFormData.attributeMapping.lastName}
                        onChange={(e) => setSsoFormData(prev => ({ 
                          ...prev, 
                          attributeMapping: { ...prev.attributeMapping, lastName: e.target.value }
                        }))}
                        placeholder="family_name"
                      />
                    </div>
                    <div>
                      <Label htmlFor="displayNameMapping">Display Name Attribute</Label>
                      <Input
                        id="displayNameMapping"
                        value={ssoFormData.attributeMapping.displayName}
                        onChange={(e) => setSsoFormData(prev => ({ 
                          ...prev, 
                          attributeMapping: { ...prev.attributeMapping, displayName: e.target.value }
                        }))}
                        placeholder="name"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-4 border-t">
                <div className="flex gap-2">
                  {ssoConfig && ssoFormData.provider !== "none" && (
                    <>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleTestConfiguration}
                        disabled={testSsoConfig.isPending}
                      >
                        <TestTube className="h-4 w-4 mr-2" />
                        {testSsoConfig.isPending ? "Testing..." : "Test Configuration"}
                      </Button>
                      <Button
                        type="button"
                        variant="destructive"
                        onClick={handleDeleteConfiguration}
                        disabled={deleteSsoConfig.isPending}
                      >
                        {deleteSsoConfig.isPending ? "Deleting..." : "Delete Configuration"}
                      </Button>
                    </>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button type="button" variant="outline" onClick={() => setIsEditing(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={upsertSsoConfig.isPending}>
                    {upsertSsoConfig.isPending ? "Saving..." : "Save Configuration"}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* SSO Info for non-editing state */}
          {!isEditing && ssoConfig && ssoFormData.provider !== "none" && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium">Provider:</span>
                  <p className="text-gray-600">{ssoFormData.providerName || ssoFormData.provider}</p>
                </div>
                <div>
                  <span className="font-medium">Enforce SSO:</span>
                  <p className="text-gray-600">{ssoFormData.enforceSSO ? "Yes" : "No"}</p>
                </div>
              </div>
              
              {/* SSO URLs for reference */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h5 className="font-medium mb-2">Integration URLs</h5>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="font-medium">SSO Login URL:</span>
                    <code className="ml-2 px-2 py-1 bg-gray-100 rounded text-xs">
                      {`${window.location.origin}/auth/sso/${tenantSlug}`}
                    </code>
                  </div>
                  <div>
                    <span className="font-medium">Callback URL:</span>
                    <code className="ml-2 px-2 py-1 bg-gray-100 rounded text-xs">
                      {`${window.location.origin}/auth/callback/sso/${tenantSlug}`}
                    </code>
                  </div>
                </div>
              </div>
            </div>
          )}
        </form>
      </CardContent>
    </Card>
  );
}

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

  // const getPlanBadge = (plan: string) => {
  //   switch (plan) {
  //     case "free":
  //       return <Badge variant="secondary">Free</Badge>;
  //     case "pro":
  //       return <Badge variant="default" className="bg-blue-100 text-blue-700 border-blue-200">Pro</Badge>;
  //     case "enterprise":
  //       return <Badge variant="default" className="bg-purple-100 text-purple-700 border-purple-200">Enterprise</Badge>;
  //     default:
  //       return <Badge variant="outline">{plan}</Badge>;
  //   }
  // };

  // const getStatusBadge = (status: string) => {
  //   switch (status) {
  //     case "active":
  //       return <Badge variant="default" className="bg-green-100 text-green-700 border-green-200">Active</Badge>;
  //     case "suspended":
  //       return <Badge variant="destructive" className="bg-red-100 text-red-700 border-red-200">Suspended</Badge>;
  //     case "pending":
  //       return <Badge variant="secondary" className="bg-yellow-100 text-yellow-700 border-yellow-200">Pending</Badge>;
  //     default:
  //       return <Badge variant="outline">{status}</Badge>;
  //   }
  // };

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
        <div className="flex justify-between items-center">
          <div>
            <div className="flex items-center space-x-4 mb-4">
            <Link 
                  href={`/tenants/${tenantSlug}/admin`}
                  className="inline-flex items-center text-indigo-600 hover:text-indigo-800 transition-colors"
                >
                  <ArrowLeft className="h-5 w-5 mr-2" />
                  Back to Admin
                </Link>
                <div className="h-6 w-px bg-gray-300" />
                <BreadcrumbNavigation
                  items={[
                    { label: "Tenants", href: "/tenants" },
                    { label: tenantSlug, href: `/tenants/${tenantSlug}` },
                    { label: "Admin", href: `/tenants/${tenantSlug}/admin` },
                    { label: "Tenant Settings", current: true },
                  ]}
                  showHome={false}
                />
            </div>
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
          <SsoConfiguration tenantId={tenant.id} tenantSlug={tenantSlug} />
          
          <Card>
            <CardHeader>
              <CardTitle>Other Integrations</CardTitle>
              <CardDescription>Connect additional external services</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
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
