"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { t } from "@i18n-core";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@ui/base";
import { Button } from "@ui/base";
import { Badge } from "@ui/base";
import { Input } from "@ui/base";
import { Label } from "@ui/base";
import { Textarea } from "@ui/base";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@ui/base";
import { 
  Building2, 
  Users, 
  Settings, 
  Calendar,
  Shield,
  Plus,
  Mail
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import Link from "next/link";
import { toast } from "@ui/base";
import { BreadcrumbNavigation } from "@/components/BreadcrumbNavigation";

export default function TenantDashboardPage() {
  const params = useParams();
  const tenantSlug = params.slug as string;
  
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [inviteData, setInviteData] = useState({
    email: "",
    role: "member",
    message: "",
    bypassEmailVerification: false,
  });

  const { data: tenant, isLoading } = trpc.getTenant.useQuery(
    { slug: tenantSlug },
    { enabled: !!tenantSlug }
  );

  const { data: memberships, refetch: refetchMemberships } = trpc.getTenantMemberships.useQuery(
    { slug: tenantSlug },
    { enabled: !!tenantSlug }
  );

  const inviteUser = trpc.inviteUser.useMutation({
    onSuccess: () => {
      toast.success("User invited successfully!");
      setShowInviteForm(false);
      setInviteData({ email: "", role: "member", message: "", bypassEmailVerification: false });
      refetchMemberships();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleInviteUser = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!inviteData.email.trim()) {
      toast.error("Email is required");
      return;
    }

    try {
      await inviteUser.mutateAsync({    
        slug: tenantSlug,
        email: inviteData.email.trim(),
        role: inviteData.role as any,
        message: inviteData.message.trim() || undefined,
        bypassEmailVerification: inviteData.bypassEmailVerification,
      });
    } catch (error) {
      // Error is handled by the mutation
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
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-900">Tenant not found</h1>
        <p className="text-gray-600 mt-2">The requested workspace could not be found.</p>
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge variant="default" className="bg-green-100 text-green-800">Active</Badge>;
      case "suspended":
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Suspended</Badge>;
      case "deleted":
        return <Badge variant="destructive" className="bg-red-100 text-red-800">Deleted</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getPlanBadge = (plan: string) => {
    switch (plan) {
      case "free":
        return <Badge variant="outline" className="text-gray-600">Free</Badge>;
      case "pro":
        return <Badge variant="secondary" className="bg-blue-100 text-blue-800">Pro</Badge>;
      case "enterprise":
        return <Badge variant="default" className="bg-purple-100 text-purple-800">Enterprise</Badge>;
      default:
        return <Badge variant="outline">{plan}</Badge>;
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "admin":
        return <Badge variant="default" className="bg-purple-100 text-purple-800">Admin</Badge>;
      case "member":
        return <Badge variant="secondary" className="bg-blue-100 text-blue-800">Member</Badge>;
      default:
        return <Badge variant="outline">{role}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center space-x-4 mb-4">
          <BreadcrumbNavigation
            items={[
              { label: "Tenants", href: "/tenants/dashboard" },
              { label: tenant.name || tenantSlug, current: true },
            ]}
            showHome={false}
          />
        </div>
        
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center space-x-3">
              <Building2 className="h-8 w-8 text-indigo-600" />
              <span>Welcome to {tenant.name}</span>
            </h1>
            <p className="text-gray-600 mt-2">
              Manage your workspace and team
            </p>
          </div>
          
          <div className="flex space-x-3">
            <Link href={`/tenants/${tenantSlug}/admin/settings`}>
              <Button variant="outline" className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                Settings
              </Button>
            </Link>
            <Link href={`/tenants/${tenantSlug}/admin/users`}>
              <Button className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Manage Users
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Users className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">{t("Total Users", "tenants.dashboard.page.TenantDashboardPage.total_users__5ckols")}</p>
                <p className="text-2xl font-bold text-gray-900">{tenant?.memberships?.length || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Building2 className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">{t("Status", "tenants.dashboard.page.TenantDashboardPage.status__6ckols")}</p>
                <div className="mt-1">{getStatusBadge(tenant.status)}</div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Shield className="h-8 w-8 text-purple-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">{t("Plan", "tenants.dashboard.page.TenantDashboardPage.plan__7ckols")}</p>
                <div className="mt-1">{getPlanBadge(tenant.plan)}</div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Calendar className="h-8 w-8 text-indigo-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">{t("Created", "tenants.dashboard.page.TenantDashboardPage.created__8ckols")}</p>
                <p className="text-2xl font-bold text-gray-900">
                  {new Date(tenant.createdAt).toLocaleDateString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>



      {/* User Management Section */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                {t("Team Members", "tenants.dashboard.page.TenantDashboardPage.team_members__29ckols")}
              </CardTitle>
              <CardDescription>
                {t("Manage your team members and their roles", "tenants.dashboard.page.TenantDashboardPage.manage_your_team_members_and_their_roles__30ckols")}
              </CardDescription>
            </div>
            <Button
              onClick={() => setShowInviteForm(true)}
              className="flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              {t("Invite User", "tenants.dashboard.page.TenantDashboardPage.invite_user__31ckols")}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {memberships && memberships.length > 0 ? (
            <div className="space-y-3">
              {memberships.map((membership) => (
                <div
                  key={membership.id}
                  className="flex items-center justify-between p-3 border border-gray-200 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                      {membership.user.image ? (
                        <img
                          src={membership.user.image}
                          alt={membership.user.name || "User"}
                          className="h-10 w-10 rounded-full"
                        />
                      ) : (
                        <span className="text-sm font-medium text-gray-600">
                          {membership.user.name?.charAt(0) || membership.user.email?.charAt(0) || "U"}
                        </span>
                      )}
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">
                        {membership.user.name || "Unnamed User"}
                      </div>
                      <div className="text-sm text-gray-500">{membership.user.email}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {getRoleBadge(membership.role)}
                    <div className="text-sm text-gray-500">
                      {t("Joined", "tenants.dashboard.page.TenantDashboardPage.joined__32ckols")} {new Date(membership.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Users className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>{t("No team members yet", "tenants.dashboard.page.TenantDashboardPage.no_team_members_yet__33ckols")}</p>
              <p className="text-sm">{t("Invite your first team member to get started", "tenants.dashboard.page.TenantDashboardPage.invite_your_first_team_member_to_get_started__34ckols")}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tenant Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            {t("Workspace Information", "tenants.dashboard.page.TenantDashboardPage.workspace_information__17ckols")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="text-sm font-medium text-gray-900 mb-3">{t("Basic Details", "tenants.dashboard.page.TenantDashboardPage.basic_details__18ckols")}</h4>
              <dl className="space-y-2">
                <div className="flex justify-between">
                  <dt className="text-sm text-gray-500">{t("Name", "tenants.dashboard.page.TenantDashboardPage.name__19ckols")}</dt>
                  <dd className="text-sm text-gray-900">{tenant.name}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-sm text-gray-500">{t("Slug", "tenants.dashboard.page.TenantDashboardPage.slug__20ckols")}</dt>
                  <dd className="text-sm text-gray-900">{tenant.slug}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-sm text-gray-500">{t("Status", "tenants.dashboard.page.TenantDashboardPage.status__21ckols")}</dt>
                  <dd>{getStatusBadge(tenant.status)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-sm text-gray-500">{t("Plan", "tenants.dashboard.page.TenantDashboardPage.plan__22ckols")}</dt>
                  <dd>{getPlanBadge(tenant.plan)}</dd>
                </div>
              </dl>
            </div>
            
            <div>
              <h4 className="text-sm font-medium text-gray-900 mb-3">{t("Additional Information", "tenants.dashboard.page.TenantDashboardPage.additional_information__23ckols")}</h4>
              <dl className="space-y-2">
                {tenant.website && (
                  <div className="flex justify-between">
                    <dt className="text-sm text-gray-500">{t("Website", "tenants.dashboard.page.TenantDashboardPage.website__24ckols")}</dt>
                    <dd className="text-sm text-gray-900">
                      <a href={tenant.website} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:text-indigo-500">
                        {tenant.website}
                      </a>
                    </dd>
                  </div>
                )}
                {tenant.industry && (
                  <div className="flex justify-between">
                    <dt className="text-sm text-gray-500">{t("Industry", "tenants.dashboard.page.TenantDashboardPage.industry__25ckols")}</dt>
                    <dd className="text-sm text-gray-900">{tenant.industry}</dd>
                  </div>
                )}
                {tenant.size && (
                  <div className="flex justify-between">
                    <dt className="text-sm text-gray-500">{t("Company Size", "tenants.dashboard.page.TenantDashboardPage.company_size__26ckols")}</dt>
                    <dd className="text-sm text-gray-900">{tenant.size}</dd>
                  </div>
                )}
                <div className="flex justify-between">
                  <dt className="text-sm text-gray-500">{t("Created", "tenants.dashboard.page.TenantDashboardPage.created__27ckols")}</dt>
                  <dd className="text-sm text-gray-900">{new Date(tenant.createdAt).toLocaleDateString()}</dd>
                </div>
              </dl>
            </div>
          </div>
          
          {tenant.description && (
            <div className="mt-6">
              <h4 className="text-sm font-medium text-gray-900 mb-2">{t("Description", "tenants.dashboard.page.TenantDashboardPage.description__28ckols")}</h4>
              <p className="text-sm text-gray-600">{tenant.description}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Invite User Modal */}
      {showInviteForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">
              {t("Invite Team Member", "tenants.dashboard.page.TenantDashboardPage.invite_team_member__35ckols")}
            </h3>
            <form onSubmit={handleInviteUser} className="space-y-4">
              <div>
                <Label htmlFor="email" className="text-sm font-medium text-gray-700">
                  {t("Email Address", "tenants.dashboard.page.TenantDashboardPage.email_address__36ckols")}
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={inviteData.email}
                  onChange={(e) => setInviteData(prev => ({ ...prev, email: e.target.value }))}
                  className="mt-1"
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="role" className="text-sm font-medium text-gray-700">
                  {t("Role", "tenants.dashboard.page.TenantDashboardPage.role__37ckols")}
                </Label>
                <Select value={inviteData.role} onValueChange={(value) => setInviteData(prev => ({ ...prev, role: value }))}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="member">{t("Member", "tenants.dashboard.page.TenantDashboardPage.member__38ckols")}</SelectItem>
                    <SelectItem value="admin">{t("Admin", "tenants.dashboard.page.TenantDashboardPage.admin__39ckols")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="message" className="text-sm font-medium text-gray-700">
                  {t("Personal Message (Optional)", "tenants.dashboard.page.TenantDashboardPage.personal_message_optional__40ckols")}
                </Label>
                <Textarea
                  id="message"
                  value={inviteData.message}
                  onChange={(e) => setInviteData(prev => ({ ...prev, message: e.target.value }))}
                  rows={3}
                  className="mt-1"
                  placeholder={t("Add a personal message to your invitation...", "tenants.dashboard.page.TenantDashboardPage.add_a_personal_message_to_your_invitation__41ckols")}
                />
              </div>
              
              <div className="flex justify-end space-x-3 pt-4">
                                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowInviteForm(false)}
                    disabled={inviteUser.isPending}
                  >
                    {t("Cancel", "tenants.dashboard.page.TenantDashboardPage.cancel__42ckols")}
                  </Button>
                  <Button
                    type="submit"
                    disabled={inviteUser.isPending || !inviteData.email.trim()}
                    className="flex items-center gap-2"
                  >
                    {inviteUser.isPending ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                        {t("Inviting...", "tenants.dashboard.page.TenantDashboardPage.inviting__43ckols")}
                      </>
                    ) : (
                      <>
                        <Mail className="h-4 w-4" />
                        {t("Send Invitation", "tenants.dashboard.page.TenantDashboardPage.send_invitation__44ckols")}
                      </>
                    )}
                  </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
