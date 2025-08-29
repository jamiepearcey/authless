"use client";
import { useState } from "react";
import { useParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@ui/base";
import { Button, Input, Label, Textarea, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@ui/base";
import { Badge } from "@ui/base";
import { Users, Plus, Mail, Shield, UserCheck, UserX, MoreHorizontal, Edit, Trash2, Eye, EyeOff, User, ArrowLeft } from "lucide-react";
import Link from "next/link";

import { trpc } from "@/lib/trpc";
import { toast } from "@ui/base";
import { Copy } from "lucide-react";
import { copyToClipboard } from "@shared/base";
import { BreadcrumbNavigation } from "@/components/BreadcrumbNavigation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@ui/base";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@ui/base";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@ui/base";

interface User {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
  createdAt: string;
  lastLoginAt: string | null;
  status: string;
  role: string;
  isEmailVerified: boolean;
}

type Predicate<T> = (value: T) => boolean;

function or<T>(...predicates: Predicate<T>[]): Predicate<T> {
  return (value: T) => predicates.some(p => p(value));
}

export default function TenantUsersPage() {
  const params = useParams();
  const tenantSlug = params.slug as string;
  
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [showUserDetails, setShowUserDetails] = useState(false);
  const [showInvitationCode, setShowInvitationCode] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [invitationCode, setInvitationCode] = useState("");
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [inviteData, setInviteData] = useState({
    email: "",
    role: "member",
    message: "",
    bypassEmailVerification: false,
  });
  const [editData, setEditData] = useState({
    name: "",
    role: "member" as "member" | "admin",
    status: "active" as "active" | "suspended" | "removed",
  });
  const [search, setSearch] = useState("");
  const { data: memberships, refetch: refetchMemberships } = trpc.getTenantMemberships.useQuery(
    { slug: tenantSlug  },
    { enabled: !!tenantSlug }
  );

  const inviteUser = trpc.inviteUser.useMutation({
    onSuccess: (data) => {
      if (inviteData.bypassEmailVerification && data.invitationCode) {
        setInvitationCode(data.invitationCode);
        setShowInvitationCode(true);
      } else {
        toast.success("User invited successfully!");
        setShowInviteForm(false);
        setInviteData({ email: "", role: "member", message: "", bypassEmailVerification: false });
        refetchMemberships();
      }
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const updateUser = trpc.updateTenantUser.useMutation({
    onSuccess: () => {
      toast.success("User updated successfully!");
      setShowEditForm(false);
      setSelectedUser(null);
      refetchMemberships();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const resendVerification = trpc.resendUserVerification.useMutation({
    onSuccess: () => {
      toast.success("Verification email sent successfully!");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const deleteUser = trpc.deleteTenantUser.useMutation({
    onSuccess: () => {
      toast.success("User removed from tenant successfully!");
      setShowDeleteConfirm(false);
      setUserToDelete(null);
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
      // Handled by mutation
    }
  };

  const handleEditUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    
    try {
      await updateUser.mutateAsync({
        userId: selectedUser.id,
        slug: tenantSlug,
        name: editData.name,
        role: editData.role,
        status: editData.status
      });
    } catch (error) {
      // Handled by mutation
    }
  };

  const handleResendVerification = async (userId: string) => {
    try {
      await resendVerification.mutateAsync({
        userId,
        slug: tenantSlug,
      });
    } catch (error) {
      // Handled by mutation
    }
  };

  const handleDeleteUser = async () => {
    if (!userToDelete) return;
    
    try {
      await deleteUser.mutateAsync({
        userId: userToDelete.id,
        slug: tenantSlug,
      });
    } catch (error) {
      // Handled by mutation
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "admin":
        return <Badge variant="default" className="bg-red-100 text-red-700 border-red-200">Admin</Badge>;
      case "member":
        return <Badge variant="secondary" className="bg-blue-100 text-blue-700 border-blue-200">Member</Badge>;
      default:
        return <Badge variant="outline">{role}</Badge>;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge variant="default" className="bg-green-100 text-green-700 border-green-200">Active</Badge>;
      case "suspended":
        return <Badge variant="destructive" className="bg-red-100 text-red-700 border-red-200">Suspended</Badge>;
      case "removed":
        return <Badge variant="destructive" className="bg-red-100 text-red-700 border-red-200">Removed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const openEditForm = (user: User) => {
    setSelectedUser(user);
    setEditData({
      name: user.name || "",
      role: user.role as "member" | "admin",
      status: user.status as "active" | "suspended" | "removed",
    });
    setShowEditForm(true);
  };

  const openUserDetails = (user: User) => {
    setSelectedUser(user);
    setShowUserDetails(true);
  };

  const openDeleteConfirm = (user: User) => {
    setUserToDelete(user);
    setShowDeleteConfirm(true);
  };

  if (!memberships) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const nameEqual : Predicate<typeof memberships[0]> =  (membership) => membership.user.name?.toLowerCase().includes(search.toLowerCase()) || false;    
  const emailEqual : Predicate<typeof memberships[0]> =  (membership) => membership.user.email?.toLowerCase().includes(search.toLowerCase()) || false;
  const roleEqual : Predicate<typeof memberships[0]> =  (membership) => membership.role === search.toLowerCase() || false;

  const filteredMemberships = memberships.filter(or(nameEqual, emailEqual, roleEqual
  ));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex justify-between items-center">
          <div>   <div className="flex items-center space-x-4 mb-4">
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
                    { label: "Users", current: true },
                  ]}
                  showHome={false}
                />
              </div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center space-x-3">
              <Users className="h-8 w-8 text-indigo-600" />
              <span>User Management</span>
            </h1>
            <p className="text-gray-600 mt-2">
              Manage tenant members, roles, and permissions
            </p>
          </div>
          
          <Button onClick={() => setShowInviteForm(true)} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Invite User
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-2xl font-bold">{memberships.length}</p>
                <p className="text-sm text-gray-600">Total Users</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <UserCheck className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-2xl font-bold">
                  {memberships.filter(m => m.user.isEmailVerified).length}
                </p>
                <p className="text-sm text-gray-600">Active</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-red-600" />
              <div>
                <p className="text-2xl font-bold">
                  {memberships.filter(m => m.role === "admin").length}
                </p>
                <p className="text-sm text-gray-600">Admins</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <UserX className="h-5 w-5 text-yellow-600" />
              <div>
                <p className="text-2xl font-bold">
                  {memberships.filter(m => !m.user.isEmailVerified).length}
                </p>
                <p className="text-sm text-gray-600">Removed</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* User List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between"> 
          <div className="inline-flex flex-col">
            <CardTitle>Team Members</CardTitle>
            <CardDescription>Manage user roles, permissions, and status   
            </CardDescription>
          </div>
          {/* filter controls for memberships using input filter and button to apply filter right aligned */}
          <div className="inline-flex gap-2 justify-end mt-2">
            <div className="flex items-center gap-2 w-96">
              <Input type="text" onChange={(e) => setSearch(e.target.value)} placeholder="Search" />
            </div>
          </div></div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {filteredMemberships.map((membership) => (
              <div key={membership.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                    {membership.user.image ? (
                      <img src={membership.user.image} alt={membership.user.name || ""} className="h-10 w-10 rounded-full" />
                    ) : (
                      <span className="text-gray-600 font-medium">
                        {membership.user.name?.charAt(0) || membership.user.email?.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{membership.user.name || "No Name"}</p>
                    <p className="text-sm text-gray-500">{membership.user.email}</p>
                    <div className="flex items-center gap-2 mt-1">
                      {getRoleBadge(membership.role)}
                      {getStatusBadge(membership.user.isEmailVerified ? "active" : "removed")}
                      {!membership.user.isEmailVerified && (
                        <Badge variant="outline" className="text-orange-600 border-orange-200">
                          Unverified
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500">
                    Joined {new Date(membership.createdAt).toLocaleDateString()}
                  </span>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => openUserDetails(membership.user as User)}>
                        <Eye className="h-4 w-4 mr-2" />
                        View Details
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => openEditForm(membership.user as User)}>
                        <Edit className="h-4 w-4 mr-2" />
                        Edit User
                      </DropdownMenuItem>
                      {!membership.user.isEmailVerified && (
                        <DropdownMenuItem onClick={() => handleResendVerification(membership.user.id)}>
                          <Mail className="h-4 w-4 mr-2" />
                          Resend Verification
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem 
                        className="text-red-600"
                        onClick={() => openDeleteConfirm(membership.user as User)}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Remove User
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            ))}
          </div>
        </CardContent>  
      </Card>

      {/* Invite User Modal */}
      {showInviteForm && (
        <Dialog open={showInviteForm} onOpenChange={setShowInviteForm}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Invite Team Member</DialogTitle>
              <DialogDescription>
                Send an invitation to join your team
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleInviteUser} className="space-y-4">
              <div>
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  value={inviteData.email}
                  onChange={(e) => setInviteData(prev => ({ ...prev, email: e.target.value }))}
                  required
                />
              </div>
              <div>
                <Label htmlFor="role">Role</Label>
                <Select value={inviteData.role} onValueChange={(value) => setInviteData(prev => ({ ...prev, role: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="member">Member</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="message">Personal Message (Optional)</Label>
                <Textarea
                  id="message"
                  value={inviteData.message}
                  onChange={(e) => setInviteData(prev => ({ ...prev, message: e.target.value }))}
                  rows={3}
                  placeholder="Add a personal message to your invitation..."
                />
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="bypassEmailVerification"
                  checked={inviteData.bypassEmailVerification}
                  onChange={(e) => setInviteData(prev => ({ ...prev, bypassEmailVerification: e.target.checked }))}
                  className="rounded border-gray-300"
                />
                <Label htmlFor="bypassEmailVerification">
                  Bypass email verification (generate invitation code)
                </Label>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setShowInviteForm(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={inviteUser.isPending}>
                  {inviteUser.isPending ? "Inviting..." : "Send Invitation"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {/* Edit User Modal */}
      {showEditForm && selectedUser && (
        <Dialog open={showEditForm} onOpenChange={setShowEditForm}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Edit User</DialogTitle>
              <DialogDescription>
                Update user information and permissions
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleEditUser} className="space-y-4">
              <div>
                <Label htmlFor="edit-name">Name</Label>
                <Input
                  id="edit-name"
                  value={editData.name}
                  onChange={(e) => setEditData(prev => ({ ...prev, name: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="edit-role">Role</Label>
                <Select value={editData.role} onValueChange={(value) => setEditData(prev => ({ ...prev, role: value as "member" | "admin" }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="member">Member</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="edit-status">Status</Label>
                  <Select value={editData.status} onValueChange={(value) => setEditData(prev => ({ ...prev, status: value as "active" | "suspended" | "removed" }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="suspended">Suspended</SelectItem>
                    <SelectItem value="removed">Removed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setShowEditForm(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={updateUser.isPending}>
                  {updateUser.isPending ? "Updating..." : "Update User"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {/* User Details Modal */}
      {showUserDetails && selectedUser && (
        <Dialog open={showUserDetails} onOpenChange={setShowUserDetails}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>User Details</DialogTitle>
              <DialogDescription>
                View detailed information about this user
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="h-16 w-16 rounded-full bg-gray-200 flex items-center justify-center">
                  {selectedUser.image ? (
                    <img src={selectedUser.image} alt={selectedUser.name || ""} className="h-16 w-16 rounded-full" />
                  ) : (
                    <span className="text-gray-600 font-medium text-xl">
                      {selectedUser.name?.charAt(0) || selectedUser.email.charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
                <div>
                  <h3 className="text-lg font-semibold">{selectedUser.name || "No Name"}</h3>
                  <p className="text-gray-600">{selectedUser.email}</p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-gray-500">Role</Label>
                  <p className="text-sm">{getRoleBadge(selectedUser.role)}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-500">Status</Label>
                  <p className="text-sm">{getStatusBadge(selectedUser.status)}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-500">Email Verified</Label>
                  <p className="text-sm">
                    {selectedUser.isEmailVerified ? (
                      <Badge variant="default" className="bg-green-100 text-green-700 border-green-200">Verified</Badge>
                    ) : (
                      <Badge variant="outline" className="text-orange-600 border-orange-200">Unverified</Badge>
                    )}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-500">Member Since</Label>
                  <p className="text-sm">{new Date(selectedUser.createdAt).toLocaleDateString()}</p>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={() => setShowUserDetails(false)}>Close</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Invitation Code Modal */}
      {showInvitationCode && (
        <Dialog open={showInvitationCode} onOpenChange={setShowInvitationCode}>
          <DialogContent className="w-full max-w-4xl">
            <DialogHeader>
              <DialogTitle>Invitation Code Generated</DialogTitle>
              <DialogDescription>
                Share this invitation code with the user. They can use it to set up their account.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600 mb-2">Invitation Code:</p>
                <code className="text-lg font-mono bg-white p-2 rounded border block break-all">
                  {invitationCode}
                </code>
              </div> <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600 mb-2">The user should visit:</p>
                <div className="flex items-center gap-1">
                  <code className="bg-gray-100 p-2 py-1 rounded-md flex-grow">/invite/{invitationCode}</code>
                  <Button variant="outline" size="icon" onClick={(e) => 
                    {
                      e.preventDefault();
                      copyToClipboard(`${window.location.origin}/invite/${invitationCode}`)
                      toast.success("Copied to clipboard")
                    }
                  } className="text-blue-600 hover:text-blue-700">
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={() => setShowInvitationCode(false)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Delete Confirmation Dialog */}
      {showDeleteConfirm && userToDelete && (
        <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Remove User from Tenant</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to remove <strong>{userToDelete.name || userToDelete.email}</strong> from this tenant? 
                This action cannot be undone and the user will lose access to all tenant resources.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteUser}
                className="bg-red-600 hover:bg-red-700"
                disabled={deleteUser.isPending}
              >
                {deleteUser.isPending ? "Removing..." : "Remove User"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}
