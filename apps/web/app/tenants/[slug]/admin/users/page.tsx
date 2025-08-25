"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { t } from "@i18n-core";
import { Button } from "@ui/base";
import { Input } from "@ui/base";
import { Label } from "@ui/base";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@ui/base";
import { Badge } from "@ui/base";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@ui/base";
import { 
  Plus, 
  Search, 
  Users, 
  Mail, 
  Calendar, 
  Crown,
  UserPlus,
  MoreHorizontal,
  Edit,
  Trash2,
  Shield,
  UserCheck
} from "lucide-react";
import { trpc } from "../../../../../lib/trpc";
import { toast } from "@ui/base";

export default function TenantUsersPage() {
  const params = useParams();
  const router = useRouter();
  const tenantSlug = params.slug as string;
  
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRole, setSelectedRole] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [inviteData, setInviteData] = useState({
    email: "",
    role: "member",
    message: "",
    bypassEmailVerification: false,
  });

  const { data: tenant } = trpc.getTenant.useQuery(
    { slug: tenantSlug },
    { enabled: !!tenantSlug }
  );

  const inviteUser = trpc.inviteUser.useMutation({
    onSuccess: (data) => {
      toast.success("Invitation sent successfully!");
      setShowInviteForm(false);
      setInviteData({ email: "", role: "member", message: "", bypassEmailVerification: false });
      // TODO: Refresh user list
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
        tenantId: tenant?.id || "",
        email: inviteData.email.trim(),
        role: inviteData.role as any,
        message: inviteData.message.trim() || undefined,
        bypassEmailVerification: inviteData.bypassEmailVerification,
      });
    } catch (error) {
      // Error is handled by the mutation
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "admin":
        return <Badge variant="default" className="bg-purple-100 text-purple-800 flex items-center gap-1">
          <Crown className="h-3 w-3" />
          Admin
        </Badge>;
      case "member":
        return <Badge variant="secondary" className="bg-blue-100 text-blue-800">Member</Badge>;
      default:
        return <Badge variant="outline">{role}</Badge>;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge variant="default" className="bg-green-100 text-green-800">Active</Badge>;
      case "pending":
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Pending</Badge>;
      case "suspended":
        return <Badge variant="destructive" className="bg-red-100 text-red-800">Suspended</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  // Mock data for now - will be replaced with actual tRPC query
  const mockUsers = [
    {
      id: "1",
      name: "John Doe",
      email: "john@example.com",
      role: "admin",
      status: "active",
      joinedAt: "2024-01-15",
      lastActiveAt: "2024-01-20",
    },
    {
      id: "2",
      name: "Jane Smith",
      email: "jane@example.com",
      role: "member",
      status: "active",
      joinedAt: "2024-01-16",
      lastActiveAt: "2024-01-19",
    },
    {
      id: "3",
      name: "Bob Johnson",
      email: "bob@example.com",
      role: "member",
      status: "pending",
      joinedAt: "2024-01-17",
      lastActiveAt: null,
    },
  ];

  const filteredUsers = mockUsers.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = selectedRole === "all" || user.role === selectedRole;
    const matchesStatus = selectedStatus === "all" || user.status === selectedStatus;
    
    return matchesSearch && matchesRole && matchesStatus;
  });

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
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            {t("User Management", "tenants.users.page.TenantUsersPage.user_management__1itlrq")}
          </h1>
          <p className="text-gray-600 mt-2">
            {t("Manage users and permissions for", "tenants.users.page.TenantUsersPage.manage_users_and_permissions_for__2bkoks")} {tenant.name}
          </p>
        </div>
        <Button onClick={() => setShowInviteForm(true)} className="flex items-center gap-2">
          <UserPlus className="h-4 w-4" />
          {t("Invite User", "tenants.users.page.TenantUsersPage.invite_user__3ckols")}
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Users className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">{t("Total Users", "tenants.users.page.TenantUsersPage.total_users__4ckols")}</p>
                <p className="text-2xl font-bold text-gray-900">{mockUsers.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Crown className="h-8 w-8 text-purple-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">{t("Admins", "tenants.users.page.TenantUsersPage.admins__5ckols")}</p>
                <p className="text-2xl font-bold text-gray-900">
                  {mockUsers.filter(u => u.role === "admin").length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <UserCheck className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">{t("Active Users", "tenants.users.page.TenantUsersPage.active_users__6ckols")}</p>
                <p className="text-2xl font-bold text-gray-900">
                  {mockUsers.filter(u => u.status === "active").length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Mail className="h-8 w-8 text-yellow-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">{t("Pending", "tenants.users.page.TenantUsersPage.pending__7ckols")}</p>
                <p className="text-2xl font-bold text-gray-900">
                  {mockUsers.filter(u => u.status === "pending").length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="search" className="text-sm font-medium text-gray-700">
                {t("Search", "tenants.users.page.TenantUsersPage.search__8ckols")}
              </Label>
              <div className="relative mt-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="search"
                  placeholder={t("Search users...", "tenants.users.page.TenantUsersPage.search_users__9ckols")}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <div>
              <Label htmlFor="role" className="text-sm font-medium text-gray-700">
                {t("Role", "tenants.users.page.TenantUsersPage.role__10ckols")}
              </Label>
              <Select value={selectedRole} onValueChange={setSelectedRole}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("All Roles", "tenants.users.page.TenantUsersPage.all_roles__11ckols")}</SelectItem>
                  <SelectItem value="admin">{t("Admin", "tenants.users.page.TenantUsersPage.admin__12ckols")}</SelectItem>
                  <SelectItem value="member">{t("Member", "tenants.users.page.TenantUsersPage.member__13ckols")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="status" className="text-sm font-medium text-gray-700">
                {t("Status", "tenants.users.page.TenantUsersPage.status__14ckols")}
              </Label>
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("All Statuses", "tenants.users.page.TenantUsersPage.all_statuses__15ckols")}</SelectItem>
                  <SelectItem value="active">{t("Active", "tenants.users.page.TenantUsersPage.active__16ckols")}</SelectItem>
                  <SelectItem value="pending">{t("Pending", "tenants.users.page.TenantUsersPage.pending__17ckols")}</SelectItem>
                  <SelectItem value="suspended">{t("Suspended", "tenants.users.page.TenantUsersPage.suspended__18ckols")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-end">
              <Button 
                variant="outline" 
                onClick={() => {
                  setSearchTerm("");
                  setSelectedRole("all");
                  setSelectedStatus("all");
                }}
                className="w-full"
              >
                {t("Clear Filters", "tenants.users.page.TenantUsersPage.clear_filters__19ckols")}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle>{t("Users", "tenants.users.page.TenantUsersPage.users__20ckols")}</CardTitle>
          <CardDescription>
            {t("Manage user roles and permissions", "tenants.users.page.TenantUsersPage.manage_user_roles_and_permissions__21ckols")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t("User", "tenants.users.page.TenantUsersPage.user__22ckols")}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t("Role", "tenants.users.page.TenantUsersPage.role__23ckols")}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t("Status", "tenants.users.page.TenantUsersPage.status__24ckols")}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t("Joined", "tenants.users.page.TenantUsersPage.joined__25ckols")}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t("Last Active", "tenants.users.page.TenantUsersPage.last_active__26ckols")}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t("Actions", "tenants.users.page.TenantUsersPage.actions__27ckols")}
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="h-10 w-10 flex-shrink-0">
                          <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                            <span className="text-sm font-medium text-white">
                              {user.name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{user.name}</div>
                          <div className="text-sm text-gray-500">{user.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getRoleBadge(user.role)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(user.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(user.joinedAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {user.lastActiveAt ? new Date(user.lastActiveAt).toLocaleDateString() : t("Never", "tenants.users.page.TenantUsersPage.never__28ckols")}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Invite User Modal */}
      {showInviteForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">
                {t("Invite User", "tenants.users.page.TenantUsersPage.invite_user__29ckols")}
              </h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowInviteForm(false)}
                className="h-8 w-8 p-0"
              >
                ×
              </Button>
            </div>
            
            <form onSubmit={handleInviteUser} className="space-y-4">
              <div>
                <Label htmlFor="invite-email" className="text-sm font-medium text-gray-700">
                  {t("Email Address", "tenants.users.page.TenantUsersPage.email_address__30ckols")} *
                </Label>
                <Input
                  id="invite-email"
                  type="email"
                  value={inviteData.email}
                  onChange={(e) => setInviteData(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="user@example.com"
                  className="mt-1"
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="invite-role" className="text-sm font-medium text-gray-700">
                  {t("Role", "tenants.users.page.TenantUsersPage.role__31ckols")}
                </Label>
                <Select value={inviteData.role} onValueChange={(value) => setInviteData(prev => ({ ...prev, role: value }))}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="member">{t("Member", "tenants.users.page.TenantUsersPage.member__32ckols")}</SelectItem>
                    <SelectItem value="admin">{t("Admin", "tenants.users.page.TenantUsersPage.admin__33ckols")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="invite-message" className="text-sm font-medium text-gray-700">
                  {t("Personal Message (Optional)", "tenants.users.page.TenantUsersPage.personal_message_optional__34ckols")}
                </Label>
                <textarea
                  id="invite-message"
                  value={inviteData.message}
                  onChange={(e) => setInviteData(prev => ({ ...prev, message: e.target.value }))}
                  rows={3}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  placeholder={t("Add a personal message to the invitation...", "tenants.users.page.TenantUsersPage.add_personal_message_to_invitation__35ckols")}
                />
              </div>
              
              <div className="flex items-center space-x-2">
                <input
                  id="bypass-verification"
                  type="checkbox"
                  checked={inviteData.bypassEmailVerification}
                  onChange={(e) => setInviteData(prev => ({ ...prev, bypassEmailVerification: e.target.checked }))}
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                />
                <Label htmlFor="bypass-verification" className="text-sm text-gray-700">
                  {t("Bypass email verification", "tenants.users.page.TenantUsersPage.bypass_email_verification__36ckols")}
                </Label>
              </div>
              
              <div className="flex justify-end space-x-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowInviteForm(false)}
                >
                  {t("Cancel", "tenants.users.page.TenantUsersPage.cancel__37ckols")}
                </Button>
                <Button
                  type="submit"
                  disabled={inviteUser.isLoading}
                  className="flex items-center gap-2"
                >
                  {inviteUser.isLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                      {t("Sending...", "tenants.users.page.TenantUsersPage.sending__38ckols")}
                    </>
                  ) : (
                    <>
                      <Mail className="h-4 w-4" />
                      {t("Send Invitation", "tenants.users.page.TenantUsersPage.send_invitation__39ckols")}
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
