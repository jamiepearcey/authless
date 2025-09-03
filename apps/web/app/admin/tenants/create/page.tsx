"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { t } from "@i18n-core";
import { Button } from "@ui/base";
import { Input } from "@ui/base";
import { Label } from "@ui/base";
import { Textarea } from "@ui/base";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@ui/base";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@ui/base";
import { Checkbox } from "@ui/base";
import { ArrowLeft, Building2, Save, AlertCircle } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "@ui/base";
import { BreadcrumbNavigation } from "@/components/BreadcrumbNavigation";

export default function CreateTenantPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    slug: "",
    name: "",
    subdomain: "",
    domainAlias: "",
    registrationClosed: false,
    plan: "free",
    invitePolicy: "admin_only",
    description: "",
    website: "",
    industry: "",
    size: "",
    contactEmail: "",
  });

  const createTenant = trpc.createTenant.useMutation({
    onSuccess: () => {
      toast.success("Tenant created successfully!");
      router.push(`/admin/tenants`);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.slug.trim() || !formData.name.trim()) {
      toast.error("Slug and name are required");
      return;
    }

    setIsSubmitting(true);
    
    try {
      await createTenant.mutateAsync({
        slug: formData.slug.trim(),
        name: formData.name.trim(),
        subdomain: formData.subdomain.trim() || undefined,
        domainAlias: formData.domainAlias.trim() || undefined,
        registrationClosed: formData.registrationClosed,
        plan: formData.plan as any,
        invitePolicy: formData.invitePolicy as any,
        description: formData.description.trim() || undefined,
        website: formData.website.trim() || undefined,
        industry: formData.industry.trim() || undefined,
        size: formData.size.trim() || undefined,
        contactEmail: formData.contactEmail.trim() || undefined,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSlugChange = (value: string) => {
    // Auto-generate slug from name
    const slug = value
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .trim();
    
    setFormData(prev => ({
      ...prev,
      slug: slug,
    }));
  };

  const handleNameChange = (value: string) => {
    setFormData(prev => ({
      ...prev,
      name: value,
    }));
    
    // Auto-generate slug if slug is empty
    if (!formData.slug) {
      handleSlugChange(value);
    }
  };

  return (
    <main className="flex flex-1 pt-8 pb-8">
      <div className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center space-x-4 mb-4">
            <Button
              variant="outline"
              onClick={() => router.back()}
              className="inline-flex items-center text-indigo-600 hover:text-indigo-800 transition-colors"
            >
              <ArrowLeft className="h-5 w-5 mr-2" />
              Back
            </Button>
            <div className="h-6 w-px bg-gray-300" />
            <BreadcrumbNavigation
              items={[
                { label: "Admin", href: "/admin" },
                { label: "Tenants", href: "/admin/tenants" },
                { label: "Create New Workspace", current: true },
              ]}
              showHome={false}
            />
          </div>
          
          <h1 className="text-3xl font-bold text-gray-900 flex items-center space-x-3">
            <Building2 className="h-8 w-8 text-indigo-600" />
            <span>Create New Workspace</span>
          </h1>
          <p className="mt-2 text-gray-600">
            Set up a new workspace for your organization
          </p>
        </div>

      <div className=" mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              {t("Workspace Information", "admin.tenants.create.page.CreateTenantPage.workspace_information__4ckols")}
            </CardTitle>
            <CardDescription>
              {t("Configure the basic settings for the new workspace", "admin.tenants.create.page.CreateTenantPage.configure_basic_settings_for_new_workspace__5ckols")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Basic Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="name" className="text-sm font-medium text-gray-700">
                    {t("Workspace Name", "admin.tenants.create.page.CreateTenantPage.workspace_name__6ckols")} *
                  </Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => handleNameChange(e.target.value)}
                    placeholder={t("Enter workspace name", "admin.tenants.create.page.CreateTenantPage.enter_workspace_name__7ckols")}
                    className="mt-1"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {t("This will be displayed to users", "admin.tenants.create.page.CreateTenantPage.this_will_be_displayed_to_users__8ckols")}
                  </p>
                </div>

                <div>
                  <Label htmlFor="slug" className="text-sm font-medium text-gray-700">
                    {t("Workspace Slug", "admin.tenants.create.page.CreateTenantPage.workspace_slug__9ckols")} *
                  </Label>
                  <Input
                    id="slug"
                    value={formData.slug}
                    onChange={(e) => setFormData(prev => ({ ...prev, slug: e.target.value }))}
                    placeholder={t("workspace-slug", "admin.tenants.create.page.CreateTenantPage.workspace_slug_placeholder__10ckols")}
                    className="mt-1"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {t("Used in URLs and subdomains", "admin.tenants.create.page.CreateTenantPage.used_in_urls_and_subdomains__11ckols")}
                  </p>
                </div>
              </div>

              {/* Subdomain */}
              <div>
                <Label htmlFor="subdomain" className="text-sm font-medium text-gray-700">
                  {t("Subdomain (Optional)", "admin.tenants.create.page.CreateTenantPage.subdomain_optional__12ckols")}
                </Label>
                <div className="mt-1 flex rounded-md shadow-sm">
                  <Input
                    id="subdomain"
                    value={formData.subdomain}
                    onChange={(e) => setFormData(prev => ({ ...prev, subdomain: e.target.value }))}
                    placeholder={t("workspace", "admin.tenants.create.page.CreateTenantPage.workspace_placeholder__13ckols")}
                    className="rounded-r-none"
                  />
                  <span className="inline-flex items-center px-3 rounded-r-md border border-l-0 border-gray-300 bg-gray-50 text-gray-500 text-sm">
                    .localhost:3000
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {t("Leave empty to use path-based routing only", "admin.tenants.create.page.CreateTenantPage.leave_empty_to_use_path_based_routing_only__14ckols")}
                </p>
              </div>

              {/* Domain Alias */}
              <div>
                <Label htmlFor="domainAlias" className="text-sm font-medium text-gray-700">
                  Custom Domain Alias (Optional)
                </Label>
                <Input
                  id="domainAlias"
                  value={formData.domainAlias}
                  onChange={(e) => setFormData(prev => ({ ...prev, domainAlias: e.target.value }))}
                  placeholder="example.com"
                  className="mt-1"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Custom domain where this tenant will be accessible (e.g., your-domain.com)
                </p>
              </div>

              {/* Plan and Settings */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="plan" className="text-sm font-medium text-gray-700">
                    {t("Plan", "admin.tenants.create.page.CreateTenantPage.plan__15ckols")}
                  </Label>
                  <Select value={formData.plan} onValueChange={(value) => setFormData(prev => ({ ...prev, plan: value }))}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="free">{t("Free", "admin.tenants.create.page.CreateTenantPage.free__16ckols")}</SelectItem>
                      <SelectItem value="pro">{t("Pro", "admin.tenants.create.page.CreateTenantPage.pro__17ckols")}</SelectItem>
                      <SelectItem value="enterprise">{t("Enterprise", "admin.tenants.create.page.CreateTenantPage.enterprise__18ckols")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="invitePolicy" className="text-sm font-medium text-gray-700">
                    {t("Invite Policy", "admin.tenants.create.page.CreateTenantPage.invite_policy__19ckols")}
                  </Label>
                  <Select value={formData.invitePolicy} onValueChange={(value) => setFormData(prev => ({ ...prev, invitePolicy: value }))}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin_only">{t("Admin Only", "admin.tenants.create.page.CreateTenantPage.admin_only__20ckols")}</SelectItem>
                      <SelectItem value="open">{t("Open", "admin.tenants.create.page.CreateTenantPage.open__21ckols")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Registration Settings */}
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="registrationClosed"
                  checked={formData.registrationClosed}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, registrationClosed: !!checked }))}
                />
                <Label htmlFor="registrationClosed" className="text-sm font-medium text-gray-700">
                  Close Registration
                </Label>
                <p className="text-xs text-gray-500 ml-2">
                  Prevent new users from signing up to this tenant
                </p>
              </div>

              {/* Additional Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="website" className="text-sm font-medium text-gray-700">
                    {t("Website (Optional)", "admin.tenants.create.page.CreateTenantPage.website_optional__22ckols")}
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

                <div>
                  <Label htmlFor="industry" className="text-sm font-medium text-gray-700">
                    {t("Industry (Optional)", "admin.tenants.create.page.CreateTenantPage.industry_optional__23ckols")}
                  </Label>
                  <Select value={formData.industry} onValueChange={(value) => setFormData(prev => ({ ...prev, industry: value }))}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder={t("Select industry", "admin.tenants.create.page.CreateTenantPage.select_industry__24ckols")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="technology">{t("Technology", "admin.tenants.create.page.CreateTenantPage.technology__25ckols")}</SelectItem>
                      <SelectItem value="healthcare">{t("Healthcare", "admin.tenants.create.page.CreateTenantPage.healthcare__26ckols")}</SelectItem>
                      <SelectItem value="finance">{t("Finance", "admin.tenants.create.page.CreateTenantPage.finance__27ckols")}</SelectItem>
                      <SelectItem value="education">{t("Education", "admin.tenants.create.page.CreateTenantPage.education__28ckols")}</SelectItem>
                      <SelectItem value="retail">{t("Retail", "admin.tenants.create.page.CreateTenantPage.retail__29ckols")}</SelectItem>
                      <SelectItem value="manufacturing">{t("Manufacturing", "admin.tenants.create.page.CreateTenantPage.manufacturing__30ckols")}</SelectItem>
                      <SelectItem value="other">{t("Other", "admin.tenants.create.page.CreateTenantPage.other__31ckols")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="size" className="text-sm font-medium text-gray-700">
                  {t("Company Size (Optional)", "admin.tenants.create.page.CreateTenantPage.company_size_optional__32ckols")}
                </Label>
                <Select value={formData.size} onValueChange={(value) => setFormData(prev => ({ ...prev, size: value }))}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder={t("Select size", "admin.tenants.create.page.CreateTenantPage.select_size__33ckols")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1-10">{t("1-10 employees", "admin.tenants.create.page.CreateTenantPage.1_10_employees__34ckols")}</SelectItem>
                    <SelectItem value="11-50">{t("11-50 employees", "admin.tenants.create.page.CreateTenantPage.11_50_employees__35ckols")}</SelectItem>
                    <SelectItem value="51-200">{t("51-200 employees", "admin.tenants.create.page.CreateTenantPage.51_200_employees__36ckols")}</SelectItem>
                    <SelectItem value="201-1000">{t("201-1000 employees", "admin.tenants.create.page.CreateTenantPage.201_1000_employees__37ckols")}</SelectItem>
                    <SelectItem value="1000+">{t("1000+ employees", "admin.tenants.create.page.CreateTenantPage.1000_employees__38ckols")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="description" className="text-sm font-medium text-gray-700">
                  {t("Description (Optional)", "admin.tenants.create.page.CreateTenantPage.description_optional__39ckols")}
                </Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder={t("Describe the workspace purpose and goals...", "admin.tenants.create.page.CreateTenantPage.describe_workspace_purpose_and_goals__40ckols")}
                  className="mt-1"
                  rows={3}
                />
              </div>

              {/* Warning */}
              <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
                <div className="flex">
                  <AlertCircle className="h-5 w-5 text-yellow-400" />
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-yellow-800">
                      {t("Important", "admin.tenants.create.page.CreateTenantPage.important__41ckols")}
                    </h3>
                    <div className="mt-2 text-sm text-yellow-700">
                      <p>
                        {t("The workspace slug cannot be changed after creation. Choose carefully as it will be used in URLs and subdomains.", "admin.tenants.create.page.CreateTenantPage.workspace_slug_cannot_be_changed_after_creation__42ckols")}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end space-x-3 pt-6 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.back()}
                  disabled={isSubmitting}
                >
                  {t("Cancel", "admin.tenants.create.page.CreateTenantPage.cancel__43ckols")}
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting || !formData.slug.trim() || !formData.name.trim()}
                  className="flex items-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                      {t("Creating...", "admin.tenants.create.page.CreateTenantPage.creating__44ckols")}
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                      {t("Create Workspace", "admin.tenants.create.page.CreateTenantPage.create_workspace__45ckols")}
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
    </main> 
  );
}
