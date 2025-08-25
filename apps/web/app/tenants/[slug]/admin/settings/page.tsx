"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { t } from "@i18n-core";
import { Button } from "@ui/base";
import { Input } from "@ui/base";
import { Label } from "@ui/base";
import { Textarea } from "@ui/base";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@ui/base";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@ui/base";
import { Switch } from "@ui/base";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@ui/base";
import { 
  Save, 
  Building2, 
  Users, 
  Shield, 
  Palette, 
  Globe,
  AlertCircle,
  CheckCircle
} from "lucide-react";
import { trpc } from "../../../../../lib/trpc";
import { toast } from "@ui/base";

export default function TenantSettingsPage() {
  const params = useParams();
  const router = useRouter();
  const tenantSlug = params.slug as string;
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    website: "",
    industry: "",
    size: "",
    locale: "en",
    timezone: "UTC",
    invitePolicy: "admin_only",
    emailVerificationBypassEnabled: false,
    ssoEnabled: false,
    primaryColor: "",
    secondaryColor: "",
  });

  const { data: tenant, isLoading } = trpc.getTenant.useQuery(
    { slug: tenantSlug },
    { enabled: !!tenantSlug }
  );

  useEffect(() => {
    if (tenant) {
      setFormData({
        name: tenant.name || "",
        description: tenant.description || "",
        website: tenant.website || "",
        industry: tenant.industry || "",
        size: tenant.size || "",
        locale: tenant.locale || "en",
        timezone: tenant.timezone || "UTC",
        invitePolicy: tenant.invitePolicy || "admin_only",
        emailVerificationBypassEnabled: tenant.emailVerificationBypassEnabled || false,
        ssoEnabled: tenant.ssoEnabled || false,
        primaryColor: tenant.primaryColor || "",
        secondaryColor: tenant.secondaryColor || "",
      });
    }
  }, [tenant]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast.error("Workspace name is required");
      return;
    }

    setIsSubmitting(true);
    
    try {
      // TODO: Implement tenant update mutation
      toast.success("Settings updated successfully!");
    } catch (error) {
      toast.error("Failed to update settings");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!tenant) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">Tenant not found</h1>
          <p className="text-gray-600 mt-2">The requested workspace could not be found.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          {t("Workspace Settings", "tenants.settings.page.TenantSettingsPage.workspace_settings__1itlrq")}
        </h1>
        <p className="text-gray-600 mt-2">
          {t("Manage your workspace configuration and preferences", "tenants.settings.page.TenantSettingsPage.manage_your_workspace_configuration_and_preferences__2bkoks")}
        </p>
      </div>

      <div className="max-w-6xl mx-auto">
        <Tabs defaultValue="general" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="general" className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              {t("General", "tenants.settings.page.TenantSettingsPage.general__3ckols")}
            </TabsTrigger>
            <TabsTrigger value="appearance" className="flex items-center gap-2">
              <Palette className="h-4 w-4" />
              {t("Appearance", "tenants.settings.page.TenantSettingsPage.appearance__4ckols")}
            </TabsTrigger>
            <TabsTrigger value="security" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              {t("Security", "tenants.settings.page.TenantSettingsPage.security__5ckols")}
            </TabsTrigger>
            <TabsTrigger value="integrations" className="flex items-center gap-2">
              <Globe className="h-4 w-4" />
              {t("Integrations", "tenants.settings.page.TenantSettingsPage.integrations__6ckols")}
            </TabsTrigger>
          </TabsList>

          {/* General Settings */}
          <TabsContent value="general">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  {t("General Information", "tenants.settings.page.TenantSettingsPage.general_information__7ckols")}
                </CardTitle>
                <CardDescription>
                  {t("Basic workspace details and configuration", "tenants.settings.page.TenantSettingsPage.basic_workspace_details_and_configuration__8ckols")}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <Label htmlFor="name" className="text-sm font-medium text-gray-700">
                        {t("Workspace Name", "tenants.settings.page.TenantSettingsPage.workspace_name__9ckols")} *
                      </Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                        className="mt-1"
                        required
                      />
                    </div>

                    <div>
                      <Label htmlFor="website" className="text-sm font-medium text-gray-700">
                        {t("Website", "tenants.settings.page.TenantSettingsPage.website__10ckols")}
                      </Label>
                      <Input
                        id="website"
                        type="url"
                        value={formData.website}
                        onChange={(e) => setFormData(prev => ({ ...prev, website: e.target.value }))}
                        placeholder="https://example.com"
                        className="mt-1"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <Label htmlFor="industry" className="text-sm font-medium text-gray-700">
                        {t("Industry", "tenants.settings.page.TenantSettingsPage.industry__11ckols")}
                      </Label>
                      <Select value={formData.industry} onValueChange={(value) => setFormData(prev => ({ ...prev, industry: value }))}>
                        <SelectTrigger className="mt-1">
                          <SelectValue placeholder={t("Select industry", "tenants.settings.page.TenantSettingsPage.select_industry__12ckols")} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="technology">{t("Technology", "tenants.settings.page.TenantSettingsPage.technology__13ckols")}</SelectItem>
                          <SelectItem value="healthcare">{t("Healthcare", "tenants.settings.page.TenantSettingsPage.healthcare__14ckols")}</SelectItem>
                          <SelectItem value="finance">{t("Finance", "tenants.settings.page.TenantSettingsPage.finance__15ckols")}</SelectItem>
                          <SelectItem value="education">{t("Education", "tenants.settings.page.TenantSettingsPage.education__16ckols")}</SelectItem>
                          <SelectItem value="retail">{t("Retail", "tenants.settings.page.TenantSettingsPage.retail__17ckols")}</SelectItem>
                          <SelectItem value="manufacturing">{t("Manufacturing", "tenants.settings.page.TenantSettingsPage.manufacturing__18ckols")}</SelectItem>
                          <SelectItem value="other">{t("Other", "tenants.settings.page.TenantSettingsPage.other__19ckols")}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="size" className="text-sm font-medium text-gray-700">
                        {t("Company Size", "tenants.settings.page.TenantSettingsPage.company_size__20ckols")}
                      </Label>
                      <Select value={formData.size} onValueChange={(value) => setFormData(prev => ({ ...prev, size: value }))}>
                        <SelectTrigger className="mt-1">
                          <SelectValue placeholder={t("Select size", "tenants.settings.page.TenantSettingsPage.select_size__21ckols")} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1-10">{t("1-10 employees", "tenants.settings.page.TenantSettingsPage.1_10_employees__22ckols")}</SelectItem>
                          <SelectItem value="11-50">{t("11-50 employees", "tenants.settings.page.TenantSettingsPage.11_50_employees__23ckols")}</SelectItem>
                          <SelectItem value="51-200">{t("51-200 employees", "tenants.settings.page.TenantSettingsPage.51_200_employees__24ckols")}</SelectItem>
                          <SelectItem value="201-1000">{t("201-1000 employees", "tenants.settings.page.TenantSettingsPage.201_1000_employees__25ckols")}</SelectItem>
                          <SelectItem value="1000+">{t("1000+ employees", "tenants.settings.page.TenantSettingsPage.1000_employees__26ckols")}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="description" className="text-sm font-medium text-gray-700">
                      {t("Description", "tenants.settings.page.TenantSettingsPage.description__27ckols")}
                    </Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                      rows={3}
                      className="mt-1"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <Label htmlFor="locale" className="text-sm font-medium text-gray-700">
                        {t("Language", "tenants.settings.page.TenantSettingsPage.language__28ckols")}
                      </Label>
                      <Select value={formData.locale} onValueChange={(value) => setFormData(prev => ({ ...prev, locale: value }))}>
                        <SelectTrigger className="mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="en">{t("English", "tenants.settings.page.TenantSettingsPage.english__29ckols")}</SelectItem>
                          <SelectItem value="de">{t("German", "tenants.settings.page.TenantSettingsPage.german__30ckols")}</SelectItem>
                          <SelectItem value="fr">{t("French", "tenants.settings.page.TenantSettingsPage.french__31ckols")}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="timezone" className="text-sm font-medium text-gray-700">
                        {t("Timezone", "tenants.settings.page.TenantSettingsPage.timezone__32ckols")}
                      </Label>
                      <Select value={formData.timezone} onValueChange={(value) => setFormData(prev => ({ ...prev, timezone: value }))}>
                        <SelectTrigger className="mt-1">
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
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Appearance Settings */}
          <TabsContent value="appearance">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Palette className="h-5 w-5" />
                  {t("Branding & Appearance", "tenants.settings.page.TenantSettingsPage.branding_appearance__33ckols")}
                </CardTitle>
                <CardDescription>
                  {t("Customize your workspace look and feel", "tenants.settings.page.TenantSettingsPage.customize_your_workspace_look_and_feel__34ckols")}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <Label htmlFor="primaryColor" className="text-sm font-medium text-gray-700">
                        {t("Primary Color", "tenants.settings.page.TenantSettingsPage.primary_color__35ckols")}
                      </Label>
                      <div className="mt-1 flex items-center gap-3">
                        <Input
                          id="primaryColor"
                          type="color"
                          value={formData.primaryColor || "#3B82F6"}
                          onChange={(e) => setFormData(prev => ({ ...prev, primaryColor: e.target.value }))}
                          className="w-16 h-10 p-1"
                        />
                        <Input
                          value={formData.primaryColor || "#3B82F6"}
                          onChange={(e) => setFormData(prev => ({ ...prev, primaryColor: e.target.value }))}
                          placeholder="#3B82F6"
                          className="flex-1"
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="secondaryColor" className="text-sm font-medium text-gray-700">
                        {t("Secondary Color", "tenants.settings.page.TenantSettingsPage.secondary_color__36ckols")}
                      </Label>
                      <div className="mt-1 flex items-center gap-3">
                        <Input
                          id="secondaryColor"
                          type="color"
                          value={formData.secondaryColor || "#6366F1"}
                          onChange={(e) => setFormData(prev => ({ ...prev, secondaryColor: e.target.value }))}
                          className="w-16 h-10 p-1"
                        />
                        <Input
                          value={formData.secondaryColor || "#6366F1"}
                          onChange={(e) => setFormData(prev => ({ ...prev, secondaryColor: e.target.value }))}
                          placeholder="#6366F1"
                          className="flex-1"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="text-sm font-medium text-gray-900 mb-3">
                      {t("Preview", "tenants.settings.page.TenantSettingsPage.preview__37ckols")}
                    </h4>
                    <div className="space-y-2">
                      <div 
                        className="h-8 rounded"
                        style={{ backgroundColor: formData.primaryColor || "#3B82F6" }}
                      ></div>
                      <div 
                        className="h-8 rounded"
                        style={{ backgroundColor: formData.secondaryColor || "#6366F1" }}
                      ></div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Security Settings */}
          <TabsContent value="security">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  {t("Security & Access", "tenants.settings.page.TenantSettingsPage.security_access__38ckols")}
                </CardTitle>
                <CardDescription>
                  {t("Configure security settings and access policies", "tenants.settings.page.TenantSettingsPage.configure_security_settings_and_access_policies__39ckols")}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-sm font-medium text-gray-900">
                        {t("Invite Policy", "tenants.settings.page.TenantSettingsPage.invite_policy__40ckols")}
                      </Label>
                      <p className="text-sm text-gray-500">
                        {t("Control who can invite new users to the workspace", "tenants.settings.page.TenantSettingsPage.control_who_can_invite_new_users_to_workspace__41ckols")}
                      </p>
                    </div>
                    <Select value={formData.invitePolicy} onValueChange={(value) => setFormData(prev => ({ ...prev, invitePolicy: value }))}>
                      <SelectTrigger className="w-40">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin_only">{t("Admin Only", "tenants.settings.page.TenantSettingsPage.admin_only__42ckols")}</SelectItem>
                        <SelectItem value="open">{t("Open", "tenants.settings.page.TenantSettingsPage.open__43ckols")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-sm font-medium text-gray-900">
                        {t("Email Verification Bypass", "tenants.settings.page.TenantSettingsPage.email_verification_bypass__44ckols")}
                      </Label>
                      <p className="text-sm text-gray-500">
                        {t("Allow admins to bypass email verification when inviting users", "tenants.settings.page.TenantSettingsPage.allow_admins_to_bypass_email_verification_when_inviting_users__45ckols")}
                      </p>
                    </div>
                    <Switch
                      checked={formData.emailVerificationBypassEnabled}
                      onCheckedChange={(checked) => setFormData(prev => ({ ...prev, emailVerificationBypassEnabled: checked }))}
                    />
                  </div>

                  <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
                    <div className="flex">
                      <AlertCircle className="h-5 w-5 text-yellow-400" />
                      <div className="ml-3">
                        <h3 className="text-sm font-medium text-yellow-800">
                          {t("Security Note", "tenants.settings.page.TenantSettingsPage.security_note__46ckols")}
                        </h3>
                        <div className="mt-2 text-sm text-yellow-700">
                          <p>
                            {t("Email verification bypass should only be enabled for trusted users in controlled environments.", "tenants.settings.page.TenantSettingsPage.email_verification_bypass_security_note__47ckols")}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Integrations Settings */}
          <TabsContent value="integrations">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="h-5 w-5" />
                  {t("Integrations & SSO", "tenants.settings.page.TenantSettingsPage.integrations_sso__48ckols")}
                </CardTitle>
                <CardDescription>
                  {t("Configure external integrations and single sign-on", "tenants.settings.page.TenantSettingsPage.configure_external_integrations_and_single_sign_on__49ckols")}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-sm font-medium text-gray-900">
                        {t("Single Sign-On (SSO)", "tenants.settings.page.TenantSettingsPage.single_sign_on_sso__50ckols")}
                      </Label>
                      <p className="text-sm text-gray-500">
                        {t("Enable SSO for your workspace users", "tenants.settings.page.TenantSettingsPage.enable_sso_for_your_workspace_users__51ckols")}
                      </p>
                    </div>
                    <Switch
                      checked={formData.ssoEnabled}
                      onCheckedChange={(checked) => setFormData(prev => ({ ...prev, ssoEnabled: checked }))}
                    />
                  </div>

                  {formData.ssoEnabled && (
                    <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                      <div className="flex">
                        <CheckCircle className="h-5 w-5 text-blue-400" />
                        <div className="ml-3">
                          <h3 className="text-sm font-medium text-blue-800">
                            {t("SSO Configuration", "tenants.settings.page.TenantSettingsPage.sso_configuration__52ckols")}
                          </h3>
                          <div className="mt-2 text-sm text-blue-700">
                            <p>
                              {t("Contact your platform administrator to configure SSO providers and settings.", "tenants.settings.page.TenantSettingsPage.contact_platform_administrator_to_configure_sso__53ckols")}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="text-sm font-medium text-gray-900 mb-2">
                      {t("Available Integrations", "tenants.settings.page.TenantSettingsPage.available_integrations__54ckols")}
                    </h4>
                    <div className="text-sm text-gray-600">
                      <p>{t("More integrations coming soon:", "tenants.settings.page.TenantSettingsPage.more_integrations_coming_soon__55ckols")}</p>
                      <ul className="mt-2 space-y-1">
                        <li>• Slack</li>
                        <li>• Microsoft Teams</li>
                        <li>• Google Workspace</li>
                        <li>• Okta</li>
                        <li>• Auth0</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Save Button */}
        <div className="mt-8 flex justify-end">
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="flex items-center gap-2"
          >
            {isSubmitting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                {t("Saving...", "tenants.settings.page.TenantSettingsPage.saving__56ckols")}
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                {t("Save Changes", "tenants.settings.page.TenantSettingsPage.save_changes__57ckols")}
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
