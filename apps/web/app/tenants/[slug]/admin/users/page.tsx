"use client";
import { useState, useMemo } from "react";
import { useParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@ui/base";
import { Button, Input, Label, Textarea, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@ui/base";
import { Badge } from "@ui/base";
import { Users, Plus, Mail, Shield, UserCheck, UserX, MoreHorizontal, Edit, Trash2, Eye, ArrowLeft, ArrowUpDown, GripVertical, Search, X, Filter, ChevronDown } from "lucide-react";
import Link from "next/link";

import { trpc } from "@/lib/trpc";
import { toast } from "@ui/base";
import { Copy } from "lucide-react";
import { copyToClipboard, User } from "@shared/base";
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

import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  useReactTable,
  ColumnResizeMode,
  SortingState,
  ColumnOrderState,
  VisibilityState,
} from "@tanstack/react-table";

interface UserData {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
  createdAt: string;
  lastLoginAt: string | null;
  status: string;
  isEmailVerified: boolean;
}

interface MembershipData {
  id: string;
  role: string;
  createdAt: string;
  user: UserData;
}

const columnHelper = createColumnHelper<MembershipData>();

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
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null);
  const [userToDelete, setUserToDelete] = useState<UserData | null>(null);
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
  
  // TanStack Table state
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnOrder, setColumnOrder] = useState<ColumnOrderState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [globalFilter, setGlobalFilter] = useState("");
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

  // Column definitions
  const columns = useMemo(
    () => [
      columnHelper.accessor("user.name", {
        id: "user",
        header: () => "User",
        cell: ({ row }) => (
          <div className="flex items-center min-w-0">
            <div className="h-10 w-10 flex-shrink-0">
              <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                {row.original.user.image ? (
                  <img src={row.original.user.image} alt={row.original.user.name || ""} className="h-10 w-10 rounded-full" />
                ) : (
                  <span className="text-gray-600 font-medium">
                    {row.original.user.name?.charAt(0) || row.original.user.email?.charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
            </div>
            <div className="ml-4 min-w-0 flex-1">
              <div className="text-sm font-medium text-gray-900 truncate">
                {row.original.user.name || "No Name"}
              </div>
                                            <div className="text-sm text-gray-500 truncate" title={row.original.user.email || ""}>
                                {row.original.user.email || ""}
                              </div>
            </div>
          </div>
        ),
        size: 350,
        minSize: 250,
        maxSize: 500,
        enableSorting: true,
        enableResizing: true,
      }),
      columnHelper.accessor("role", {
        id: "role",
        header: () => "Role",
        cell: ({ row }) => {
          const role = row.original.role;
          switch (role) {
            case "admin":
              return <Badge variant="default" className="bg-red-100 text-red-700 border-red-200">Admin</Badge>;
            case "member":
              return <Badge variant="secondary" className="bg-blue-100 text-blue-700 border-blue-200">Member</Badge>;
            default:
              return <Badge variant="outline">{role}</Badge>;
          }
        },
        size: 100,
        minSize: 80,
        maxSize: 120,
        enableSorting: true,
        enableResizing: true,
      }),
      columnHelper.accessor("user.isEmailVerified", {
        id: "status",
        header: () => "Status",
        cell: ({ row }) => {
          const isVerified = row.original.user.isEmailVerified;
          if (isVerified) {
            return <Badge variant="default" className="bg-green-100 text-green-700 border-green-200">Active</Badge>;
          } else {
            return (
              <div className="flex items-center gap-1">
                <Badge variant="outline" className="text-orange-600 border-orange-200">Unverified</Badge>
              </div>
            );
          }
        },
        size: 120,
        minSize: 100,
        maxSize: 150,
        enableSorting: true,
        enableResizing: true,
      }),
      columnHelper.accessor("createdAt", {
        id: "joined",
        header: () => "Joined",
        cell: ({ row }) => (
          <span className="text-sm text-gray-500">
            {new Date(row.original.createdAt).toLocaleDateString()}
          </span>
        ),
        size: 120,
        minSize: 100,
        maxSize: 150,
        enableSorting: true,
        enableResizing: true,
      }),
      columnHelper.display({
        id: "actions",
        header: () => "Actions",
        cell: ({ row }) => (
          <div className="flex items-center space-x-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => openUserDetails(row.original.user as UserData)}
              className="h-8 w-8 p-0"
              title="View Details"
            >
              <Eye className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => openEditForm(row.original.user as UserData)}
              className="h-8 w-8 p-0"
              title="Edit User"
            >
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => openDeleteConfirm(row.original.user as UserData)}
              className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
              title="Remove User"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ),
        size: 120,
        minSize: 100,
        maxSize: 150,
        enableSorting: false,
        enableResizing: true,
      }),
    ],
    []
  );

  // Table instance
  const table = useReactTable({
    data: memberships || [],
    columns,
    state: {
      sorting,
      columnOrder,
      columnVisibility,
      globalFilter,
    },
    onSortingChange: setSorting,
    onColumnOrderChange: setColumnOrder,
    onColumnVisibilityChange: setColumnVisibility,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    columnResizeMode: "onChange" as ColumnResizeMode,
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


  const openEditForm = (user: UserData) => {
    setSelectedUser(user);
    setEditData({
      name: user.name || "",
      role: "member" as "member" | "admin", // Default to member since role comes from membership
      status: user.status as "active" | "suspended" | "removed",
    });
    setShowEditForm(true);
  };

  const openUserDetails = (user: UserData) => {
    setSelectedUser(user);
    setShowUserDetails(true);
  };

  const openDeleteConfirm = (user: UserData) => {
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
                    { label: "Tenants", href: "/tenants/dashboard" },
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

      {/* Enhanced Toolbar */}
      <Card className="mb-6">
        <CardContent className="p-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            {/* Search Section */}
            <div className="flex-1 max-w-md">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search team members by name or email..."
                  value={globalFilter}
                  onChange={(e) => setGlobalFilter(e.target.value)}
                  className="pl-10 pr-4 h-10 border-gray-300 focus:border-indigo-500 focus:ring-indigo-500"
                />
                {globalFilter && (
                  <button
                    onClick={() => setGlobalFilter("")}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 hover:text-gray-600"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Clear Filters Button */}
            {globalFilter && (
              <Button 
                variant="outline" 
                onClick={() => setGlobalFilter("")}
                size="sm"
                className="h-8 px-3 text-xs border-gray-300 hover:border-gray-400 hover:bg-gray-50"
              >
                <X className="h-3 w-3 mr-1" />
                Clear Search
              </Button>
            )}
          </div>

          {/* Active Filters Display */}
          {globalFilter && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm text-gray-500">Active filters:</span>
                
                {globalFilter && (
                  <Badge variant="secondary" className="bg-blue-100 text-blue-800 border-blue-200">
                    <Search className="h-3 w-3 mr-1" />
                    "{globalFilter}"
                    <button
                      onClick={() => setGlobalFilter("")}
                      className="ml-1 hover:bg-blue-200 rounded-full p-0.5"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* User List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Team Members</CardTitle>
              <CardDescription>Manage user roles, permissions, and status</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSorting([]);
                  setColumnOrder([]);
                  setColumnVisibility({});
                  setGlobalFilter("");
                }}
                className="h-8 px-3 text-xs"
              >
                Reset Columns
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {table.getRowModel().rows.length === 0 ? (
            <div className="text-center py-12">
              <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No team members found</h3>
              <p className="text-gray-600 mb-6">
                {globalFilter ? "Try adjusting your search criteria" : "No team members have been added to this tenancy yet."}
              </p>
              {!globalFilter && (
                <Button onClick={() => setShowInviteForm(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Invite First Team Member
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    {table.getHeaderGroups().map(headerGroup => (
                      <tr key={headerGroup.id}>
                        {headerGroup.headers.map(header => (
                          <th
                            key={header.id}
                            className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider relative group"
                            style={{ width: header.getSize() }}
                          >
                            <div className="flex items-center space-x-1 min-h-[20px]">
                              {header.isPlaceholder ? null : (
                                <div
                                  className={`flex items-center space-x-1 min-h-[20px] ${
                                    header.column.getCanSort() ? 'cursor-pointer select-none' : ''
                                  }`}
                                  onClick={header.column.getToggleSortingHandler()}
                                >
                                  <span className="flex-1">
                                    {flexRender(header.column.columnDef.header, header.getContext())}
                                  </span>
                                  <div className="flex items-center space-x-1 w-6 justify-center">
                                    {header.column.getCanSort() && (
                                      <ArrowUpDown className="h-3 w-3 text-gray-400 flex-shrink-0" />
                                    )}
                                    {header.column.getIsSorted() === 'asc' && (
                                      <span className="text-indigo-600 text-xs flex-shrink-0">↑</span>
                                    )}
                                    {header.column.getIsSorted() === 'desc' && (
                                      <span className="text-indigo-600 text-xs flex-shrink-0">↓</span>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                            {/* Column Resize Handle */}
                            {header.column.getCanResize() && (
                              <div
                                className={`absolute right-0 top-0 h-full w-1 bg-gray-300 cursor-col-resize select-none touch-none ${
                                  header.column.getIsResizing() ? 'bg-indigo-500' : 'hover:bg-gray-400'
                                }`}
                                onMouseDown={header.getResizeHandler()}
                                onTouchStart={header.getResizeHandler()}
                              />
                            )}
                          </th>
                        ))}
                      </tr>
                    ))}
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {table.getRowModel().rows.map(row => (
                      <tr key={row.id} className="hover:bg-gray-50">
                        {row.getVisibleCells().map(cell => (
                          <td
                            key={cell.id}
                            className="px-6 py-4"
                            style={{ width: cell.column.getSize() }}
                          >
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
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
                      {selectedUser.name?.charAt(0) || selectedUser.email?.charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
                <div>
                  <h3 className="text-lg font-semibold">{selectedUser.name || "No Name"}</h3>
                  <p className="text-gray-600">{selectedUser.email || ""}</p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-gray-500">Role</Label>
                  <p className="text-sm">{getRoleBadge("member")}</p>
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
                  <code className="bg-gray-100 p-2 py-1 rounded-md flex-grow">/auth/invite/{invitationCode}</code>
                  <Button variant="outline" size="icon" onClick={(e) => 
                    {
                      e.preventDefault();
                      copyToClipboard(`${window.location.origin}/auth/invite/${invitationCode}`)
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
