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
import { ArrowLeft, Building2, Save, Trash2 } from "lucide-react";
import { trpc } from "../../../../../lib/trpc";
import { toast } from "@ui/base";

export default function EditTenantPage() {
  const params = useParams();
  const router = useRouter();
  const tenantSlug = params.slug as string;
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    website: "",
    industry: "",
    size: "",
    plan: "free",
    status: "active",
    invitePolicy: "admin_only",
    emailVerificationBypassEnabled: false,
    ssoEnabled: false,
    primaryColor: "",
    secondaryColor: "",
  });

  const { data: tenant, isLoading, refetch } = trpc.getTenant.useQuery(
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
        plan: tenant.plan || "free",
        status: tenant.status || "active",
        invitePolicy: tenant.invitePolicy || "admin_only",
        emailVerificationBypassEnabled: tenant.emailVerificationBypassEnabled || false,
        ssoEnabled: tenant.ssoEnabled || false,
        primaryColor: tenant.primaryColor || "",
        secondaryColor: tenant.secondaryColor || "",
      });
    }
  }, [tenant]);

  const updateTenant = trpc.updateTenant.useMutation({
    onSuccess: () => {
      toast.success("Tenant updated successfully!");
      router.push("/admin/tenants");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const deleteTenant = trpc.deleteTenant.useMutation({
    onSuccess: () => {
      toast.success("Tenant deleted successfully!");
      router.push("/admin/tenants");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast.error("Tenant name is required");
      return;
    }

    setIsSubmitting(true);
    
    try {
      await updateTenant.mutateAsync({
        slug: tenantSlug,
        data: {
          name: formData.name.trim(),
          description: formData.description.trim() || undefined,
          website: formData.website.trim() || undefined,
          industry: formData.industry.trim() || undefined,
          size: formData.size.trim() || undefined,
          plan: formData.plan as any,
          status: formData.status as any,
          invitePolicy: formData.invitePolicy as any,
          emailVerificationBypassEnabled: formData.emailVerificationBypassEnabled,
          ssoEnabled: formData.ssoEnabled,
          primaryColor: formData.primaryColor.trim() || undefined,
          secondaryColor: formData.secondaryColor.trim() || undefined,
        },
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this tenant? This action cannot be undone.")) {
      return;
    }

    setIsDeleting(true);
    
    try {
      await deleteTenant.mutateAsync({ slug: tenantSlug });
    } finally {
      setIsDeleting(false);
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
          <p className="text-gray-600 mt-2">The requested tenant could not be found.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            onClick={() => router.back()}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            {t("Back", "admin.tenants.edit.page.EditTenantPage.back__1itlrq")}
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {t("Edit Workspace", "admin.tenants.edit.page.EditTenantPage.edit_workspace__2bkoks")}
            </h1>
            <p className="text-gray-600 mt-2">
              {t("Update workspace settings and configuration", "admin.tenants.edit.page.EditTenantPage.update_workspace_settings_and_configuration__3ckols")}
            </p>
          </div>
        </div>
        
        <Button
          variant="destructive"
          onClick={handleDelete}
          disabled={isDeleting}
          className="flex items-center gap-2"
        >
          {isDeleting ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
              {t("Deleting...", "admin.tenants.edit.page.EditTenantPage.deleting__4ckols")}
            </>
          ) : (
            <>
              <Trash2 className="h-4 w-4" />
              {t("Delete Tenant", "admin.tenants.edit.page.EditTenantPage.delete_tenant__5ckols")}
            </>
          )}
        </Button>
      </div>

      <div className="max-w-4xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              {t("Workspace Information", "admin.tenants.edit.page.EditTenantPage.workspace_information__6ckols")}
            </CardTitle>
            <CardDescription>
              {t("Update the workspace details and configuration", "admin.tenants.edit.page.EditTenantPage.update_workspace_details_and_configuration__7ckols")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Basic Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="name" className="text-sm font-medium text-gray-700">
                    {t("Workspace Name", "admin.tenants.edit.page.EditTenantPage.workspace_name__8ckols")} *
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
                    {t("Website", "admin.tenants.edit.page.EditTenantPage.website__9ckols")}
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
                    {t("Industry", "admin.tenants.edit.page.EditTenantPage.industry__10ckols")}
                  </Label>
                  <Select value={formData.industry} onValueChange={(value) => setFormData(prev => ({ ...prev, industry: value }))}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder={t("Select industry", "admin.tenants.edit.page.EditTenantPage.select_industry__11ckols")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="technology">{t("Technology", "admin.tenants.edit.page.EditTenantPage.technology__12ckols")}</SelectItem>
                      <SelectItem value="healthcare">{t("Healthcare", "admin.tenants.edit.page.EditTenantPage.healthcare__13ckols")}</SelectItem>
                      <SelectItem value="finance">{t("Finance", "admin.tenants.edit.page.EditTenantPage.finance__14ckols")}</SelectItem>
                      <SelectItem value="education">{t("Education", "admin.tenants.edit.page.EditTenantPage.education__15ckols")}</SelectItem>
                      <SelectItem value="retail">{t("Retail", "admin.tenants.edit.page.EditTenantPage.retail__16ckols")}</SelectItem>
                      <SelectItem value="manufacturing">{t("Manufacturing", "admin.tenants.edit.page.EditTenantPage.manufacturing__17ckols")}</SelectItem>
                      <SelectItem value="other">{t("Other", "admin.tenants.edit.page.EditTenantPage.other__18ckols")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="size" className="text-sm font-medium text-gray-700">
                    {t("Company Size", "admin.tenants.edit.page.EditTenantPage.company_size__19ckols")}
                  </Label>
                  <Select value={formData.size} onValueChange={(value) => setFormData(prev => ({ ...prev, size: value }))}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder={t("Select size", "admin.tenants.edit.page.EditTenantPage.select_size__20ckols")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1-10">{t("1-10 employees", "admin.tenants.edit.page.EditTenantPage.1_10_employees__21ckols")}</SelectItem>
                      <SelectItem value="11-50">{t("11-50 employees", "admin.tenants.edit.page.EditTenantPage.11_50_employees__22ckols")}</SelectItem>
                      <SelectItem value="51-200">{t("51-200 employees", "admin.tenants.edit.page.EditTenantPage.51_200_employees__23ckols")}</SelectItem>
                      <SelectItem value="201-1000">{t("201-1000 employees", "admin.tenants.edit.page.EditTenantPage.201_1000_employees__24ckols")}</SelectItem>
                      <SelectItem value="1000+">{t("1000+ employees", "admin.tenants.edit.page.EditTenantPage.1000_employees__25ckols")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="description" className="text-sm font-medium text-gray-700">
                  {t("Description", "admin.tenants.edit.page.EditTenantPage.description__26ckols")}
                </Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  rows={3}
                  className="mt-1"
                />
              </div>

              {/* Plan and Status */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="plan" className="text-sm font-medium text-gray-700">
                    {t("Plan", "admin.tenants.edit.page.EditTenantPage.plan__27ckols")}
                  </Label>
                  <Select value={formData.plan} onValueChange={(value) => setFormData(prev => ({ ...prev, plan: value }))}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="free">{t("Free", "admin.tenants.edit.page.EditTenantPage.free__28ckols")}</SelectItem>
                      <SelectItem value="pro">{t("Pro", "admin.tenants.edit.page.EditTenantPage.pro__29ckols")}</SelectItem>
                      <SelectItem value="enterprise">{t("Enterprise", "admin.tenants.edit.page.EditTenantPage.enterprise__30ckols")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="status" className="text-sm font-medium text-gray-700">
                    {t("Status", "admin.tenants.edit.page.EditTenantPage.status__31ckols")}
                  </Label>
                  <Select value={formData.status} onValueChange={(value) => setFormData(prev => ({ ...prev, status: value }))}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">{t("Active", "admin.tenants.edit.page.EditTenantPage.active__32ckols")}</SelectItem>
                      <SelectItem value="suspended">{t("Suspended", "admin.tenants.edit.page.EditTenantPage.suspended__33ckols")}</SelectItem>
                      <SelectItem value="deleted">{t("Deleted", "admin.tenants.edit.page.EditTenantPage.deleted__34ckols")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Settings */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="invitePolicy" className="text-sm font-medium text-gray-700">
                    {t("Invite Policy", "admin.tenants.edit.page.EditTenantPage.invite_policy__35ckols")}
                  </Label>
                  <Select value={formData.invitePolicy} onValueChange={(value) => setFormData(prev => ({ ...prev, invitePolicy: value }))}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin_only">{t("Admin Only", "admin.tenants.edit.page.EditTenantPage.admin_only__36ckols")}</SelectItem>
                      <SelectItem value="open">{t("Open", "admin.tenants.edit.page.EditTenantPage.open__37ckols")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="primaryColor" className="text-sm font-medium text-gray-700">
                    {t("Primary Color", "admin.tenants.edit.page.EditTenantPage.primary_color__38ckols")}
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
              </div>

              <div>
                <Label htmlFor="secondaryColor" className="text-sm font-medium text-gray-700">
                  {t("Secondary Color", "admin.tenants.edit.page.EditTenantPage.secondary_color__39ckols")}
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

              {/* Actions */}
              <div className="flex justify-end space-x-3 pt-6 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.back()}
                  disabled={isSubmitting}
                >
                  {t("Cancel", "admin.tenants.edit.page.EditTenantPage.cancel__40ckols")}
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting || !formData.name.trim()}
                  className="flex items-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                      {t("Saving...", "admin.tenants.edit.page.EditTenantPage.saving__41ckols")}
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                      {t("Save Changes", "admin.tenants.edit.page.EditTenantPage.save_changes__42ckols")}
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
