"use client";
import React, { useState, useMemo } from "react";
import { useParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@ui/base";
import { Button, Input, Label, Textarea, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@ui/base";
import { Badge } from "@ui/base";
import { 
  Users, 
  Plus, 
  Mail, 
  Shield, 
  UserCheck, 
  UserX, 
  MoreHorizontal, 
  Edit, 
  Trash2, 
  Eye, 
  ArrowLeft, 
  ArrowUpDown, 
  GripVertical, 
  Search, 
  X, 
  Filter, 
  ChevronDown,
  Download,
  Settings,
  Columns,
  RefreshCw,
  UserPlus,
  CheckCircle,
  Clock,
  Calendar,
  Building2
} from "lucide-react";
import Link from "next/link";

import { trpc } from "@/lib/trpc";
import { toast } from "@ui/base";
import { Copy } from "lucide-react";
import { copyToClipboard, User } from "@shared/base";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
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
  getGroupedRowModel,
  getPaginationRowModel,
  useReactTable,
  ColumnResizeMode,
  SortingState,
  ColumnOrderState,
  VisibilityState,
  GroupingState,
  ColumnFiltersState,
  PaginationState,
  ExpandedState,
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
  subRows?: MembershipData[];
  _groupingKey?: string;
  _groupingValue?: string;
  _timeBucket?: string;
  _roleGroup?: string;
  _statusGroup?: string;
}

interface MembershipData {
  id: string;
  role: string;
  createdAt: string;
  user: UserData;
  subRows?: MembershipData[];
  _groupingKey?: string;
  _groupingValue?: string;
  _timeBucket?: string;
  _roleGroup?: string;
  _statusGroup?: string;
}

const columnHelper = createColumnHelper<MembershipData>();

type Predicate<T> = (value: T) => boolean;

function or<T>(...predicates: Predicate<T>[]): Predicate<T> {
  return (value: T) => predicates.some(p => p(value));
}

// Helper function to create time-based buckets for grouping
function getTimeBucket(date: Date): string {
  const now = new Date();
  const diffInMs = now.getTime() - date.getTime();
  const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
  const diffInWeeks = Math.floor(diffInDays / 7);
  const diffInMonths = Math.floor(diffInDays / 30);
  const diffInYears = Math.floor(diffInDays / 365);

  // Today
  if (diffInDays === 0) {
    return 'Today';
  }
  
  // Yesterday
  if (diffInDays === 1) {
    return 'Yesterday';
  }
  
  // This week (1-6 days ago)
  if (diffInDays >= 2 && diffInDays <= 6) {
    return 'This Week';
  }
  
  // Last week (7-13 days ago)
  if (diffInWeeks === 1) {
    return 'Last Week';
  }
  
  // This month (2-4 weeks ago)
  if (diffInWeeks >= 2 && diffInWeeks <= 4) {
    return 'This Month';
  }
  
  // Last month (1-2 months ago)
  if (diffInMonths >= 1 && diffInMonths <= 2) {
    return 'Last Month';
  }
  
  // This year (3-11 months ago)
  if (diffInMonths >= 3 && diffInMonths <= 11) {
    return 'This Year';
  }
  
  // Last year (1-2 years ago)
  if (diffInYears >= 1 && diffInYears <= 2) {
    return 'Last Year';
  }
  
  // Older than 2 years
  if (diffInYears > 2) {
    return 'Older';
  }
  
  // Fallback
  return 'Unknown';
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
  
  // Advanced TanStack Table state
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnOrder, setColumnOrder] = useState<ColumnOrderState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({
    grouping: false, // Hide the virtual grouping column
    timeBucket: false, // Hide the virtual time bucket column
    roleGroup: false, // Hide the virtual role group column
    statusGroup: false, // Hide the virtual status group column
  });
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState("");
  const [grouping, setGrouping] = useState<GroupingState>([]);
  const [expanded, setExpanded] = useState<ExpandedState>({});
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 20,
  });

  const { data: memberships, refetch: refetchMemberships } = trpc.getTenantMemberships.useQuery(
    { slug: tenantSlug  },
    { enabled: !!tenantSlug }
  );

  // Transform data for proper grouping
  const transformedMemberships = useMemo(() => {
    if (!memberships) return [];
    
    return memberships.map(membership => {
      let groupingValue = 'All Members';
      let timeBucket = getTimeBucket(new Date(membership.createdAt));
      let roleGroup = membership.role || 'Unknown';
      let statusGroup = membership.user.isEmailVerified ? 'Verified' : 'Unverified';
      
      if (grouping.length > 0) {
        if (grouping[0] === 'role') {
          groupingValue = roleGroup;
        } else if (grouping[0] === 'status') {
          groupingValue = statusGroup;
        } else if (grouping[0] === 'timeBucket') {
          groupingValue = timeBucket;
        } else if (grouping[0] === 'roleGroup') {
          groupingValue = roleGroup;
        } else if (grouping[0] === 'statusGroup') {
          groupingValue = statusGroup;
        }
      }
      
      return {
        ...membership,
        _groupingKey: membership.id,
        _groupingValue: groupingValue,
        _timeBucket: timeBucket,
        _roleGroup: roleGroup,
        _statusGroup: statusGroup,
        user: {
          ...membership.user,
          _groupingKey: membership.user.id,
          _groupingValue: groupingValue,
          _timeBucket: timeBucket,
          _roleGroup: roleGroup,
          _statusGroup: statusGroup,
        }
      };
    });
  }, [memberships, grouping]);

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

  // Advanced column definitions with grouping support
  const columns = useMemo(
    () => [
      // Virtual grouping columns (hidden)
      columnHelper.accessor("_groupingValue", {
        id: "grouping",
        header: () => null,
        cell: () => null,
        enableSorting: false,
        enableResizing: false,
        enableGrouping: true,
        enableHiding: true,
      }),
      columnHelper.accessor("_timeBucket", {
        id: "timeBucket",
        header: () => null,
        cell: () => null,
        enableSorting: false,
        enableResizing: false,
        enableGrouping: true,
        enableHiding: true,
      }),
      columnHelper.accessor("_roleGroup", {
        id: "roleGroup",
        header: () => null,
        cell: () => null,
        enableSorting: false,
        enableResizing: false,
        enableGrouping: true,
        enableHiding: true,
      }),
      columnHelper.accessor("_statusGroup", {
        id: "statusGroup",
        header: () => null,
        cell: () => null,
        enableSorting: false,
        enableResizing: false,
        enableGrouping: true,
        enableHiding: true,
      }),
      columnHelper.accessor("user.name", {
        id: "user",
        header: ({ column }) => (
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
              className="h-8 px-2 hover:bg-gray-100"
            >
              <ArrowUpDown className="h-4 w-4 mr-1" />
              User
            </Button>
          </div>
        ),
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
        size: 300,
        minSize: 250,
        maxSize: 400,
        enableSorting: true,
        enableResizing: true,
        enableGrouping: false,
      }),
      columnHelper.accessor("role", {
        id: "role",
        header: ({ column }) => (
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
              className="h-8 px-2 hover:bg-gray-100"
            >
              <ArrowUpDown className="h-4 w-4 mr-1" />
              Role
            </Button>
          </div>
        ),
        cell: ({ row }) => {
          const role = row.original.role;
          switch (role) {
            case "admin":
              return <Badge variant="default" className="bg-red-100 text-red-700 border-red-200 hover:bg-red-200 hover:text-red-800">Admin</Badge>;
            case "member":
              return <Badge variant="secondary" className="bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-200 hover:text-blue-800">Member</Badge>;
            default:
              return <Badge variant="outline" className="hover:bg-gray-100">{role}</Badge>;
          }
        },
        size: 120,
        minSize: 100,
        maxSize: 150,
        enableSorting: true,
        enableResizing: true,
        enableGrouping: true,
        filterFn: (row, id, value) => {
          return value.includes(row.getValue(id));
        },
      }),
      columnHelper.accessor("user.isEmailVerified", {
        id: "status",
        header: ({ column }) => (
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
              className="h-8 px-2 hover:bg-gray-100"
            >
              <ArrowUpDown className="h-4 w-4 mr-1" />
              Status
            </Button>
          </div>
        ),
        cell: ({ row }) => {
          const isVerified = row.original.user.isEmailVerified;
          if (isVerified) {
            return <Badge variant="default" className="bg-green-100 text-green-700 border-green-200 hover:bg-green-200 hover:text-green-800">Verified</Badge>;
          } else {
            return <Badge variant="outline" className="text-orange-600 border-orange-200 hover:bg-orange-50">Unverified</Badge>;
          }
        },
        size: 120,
        minSize: 100,
        maxSize: 150,
        enableSorting: true,
        enableResizing: true,
        enableGrouping: true,
        filterFn: (row, id, value) => {
          return value.includes(row.getValue(id));
        },
      }),
      columnHelper.accessor("createdAt", {
        id: "joined",
        header: ({ column }) => (
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
              className="h-8 px-2 hover:bg-gray-100"
            >
              <ArrowUpDown className="h-4 w-4 mr-1" />
              Joined
            </Button>
          </div>
        ),
        cell: ({ row }) => (
          <div className="flex items-center space-x-2">
            <Calendar className="h-4 w-4 text-gray-400" />
            <span className="text-sm text-gray-500">
              {new Date(row.original.createdAt).toLocaleDateString()}
            </span>
          </div>
        ),
        size: 120,
        minSize: 100,
        maxSize: 150,
        enableSorting: true,
        enableResizing: true,
        enableGrouping: true,
      }),
      columnHelper.display({
        id: "actions",
        header: "Actions",
        cell: ({ row }) => (
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => openUserDetails(row.original.user as UserData)}
              className="h-8 w-8 p-0 hover:bg-gray-100"
            >
              <Eye className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => openEditForm(row.original.user as UserData)}
              className="h-8 w-8 p-0 hover:bg-gray-100"
            >
              <Edit className="h-4 w-4" />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 hover:bg-gray-100">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={() => openUserDetails(row.original.user as UserData)}
                >
                  <Eye className="h-4 w-4 mr-2" />
                  View Details
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => openEditForm(row.original.user as UserData)}
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Edit User
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => {
                    handleResendVerification(row.original.user.id);
                  }}
                  disabled={row.original.user.isEmailVerified}
                  className="text-blue-600"
                >
                  <Mail className="h-4 w-4 mr-2" />
                  Resend Verification
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => openDeleteConfirm(row.original.user as UserData)}
                  className="text-red-600"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Remove User
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ),
        size: 120,
        minSize: 100,
        maxSize: 150,
        enableSorting: false,
        enableResizing: false,
        enableGrouping: false,
      }),
    ],
    [grouping]
  );

  // Advanced table instance with grouping and pagination
  const table = useReactTable({
    data: transformedMemberships,
    columns,
    state: {
      sorting,
      columnOrder,
      columnVisibility,
      columnFilters,
      globalFilter,
      grouping,
      expanded,
      pagination,
    },
    onSortingChange: setSorting,
    onColumnOrderChange: setColumnOrder,
    onColumnVisibilityChange: setColumnVisibility,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    onGroupingChange: setGrouping,
    onExpandedChange: setExpanded,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getGroupedRowModel: getGroupedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    columnResizeMode: "onChange" as ColumnResizeMode,
    enableGrouping: true,
    enableColumnResizing: true,
    enableSorting: true,
    enableFilters: true,
    enableGlobalFilter: true,
    manualPagination: false,
    globalFilterFn: "includesString",
    groupedColumnMode: "remove",
    enableExpanding: true,
    enableSubRowSelection: false,
    getSubRows: (row) => row.subRows,
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
      <div className="mb-4">
        {/* Breadcrumb Navigation */}
        
        {/* Page Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center space-x-3">
              <Users className="h-8 w-8 text-indigo-600" />
              <span>Team Management</span>
            </h1>
            <p className="text-gray-600 mt-2">
              Manage tenant members, roles, and permissions for {tenantSlug}
            </p>
          </div>
          
          <div className="flex items-center space-x-3">
            <Button variant="outline" onClick={() => refetchMemberships()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Button variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            <Button onClick={() => setShowInviteForm(true)} className="bg-indigo-600 hover:bg-indigo-700">
              <UserPlus className="h-4 w-4 mr-2" />
              Invite User
            </Button>
          </div>
        </div>
      </div>

      {/* Advanced Controls */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          {/* Search and Filters */}
          <div className="flex items-center space-x-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search team members..."
                value={globalFilter ?? ""}
                onChange={(e) => setGlobalFilter(e.target.value)}
                className="pl-10 w-64"
              />
            </div>
            
            {/* Column Visibility */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <Columns className="h-4 w-4 mr-2" />
                  Columns
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuLabel>Toggle columns</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {table.getAllColumns()
                  .filter((column) => column.getCanHide())
                  .map((column) => (
                    <DropdownMenuItem
                      key={column.id}
                      onClick={() => column.toggleVisibility()}
                      className="flex items-center justify-between"
                    >
                      <span>{column.id}</span>
                      {column.getIsVisible() && <CheckCircle className="h-4 w-4" />}
                    </DropdownMenuItem>
                  ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Grouping - Single column only */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <GripVertical className="h-4 w-4 mr-2" />
                  Group by {grouping.length > 0 ? `(${grouping[0]})` : ''}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuLabel>Group by (single column)</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => setGrouping([])}
                  className="flex items-center justify-between"
                >
                  <span>No grouping</span>
                  {grouping.length === 0 && <CheckCircle className="h-4 w-4" />}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => setGrouping(grouping.includes('role') ? [] : ['role'])}
                  className="flex items-center justify-between"
                >
                  <span>Role</span>
                  {grouping.includes('role') && <CheckCircle className="h-4 w-4" />}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setGrouping(grouping.includes('status') ? [] : ['status'])}
                  className="flex items-center justify-between"
                >
                  <span>Status</span>
                  {grouping.includes('status') && <CheckCircle className="h-4 w-4" />}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setGrouping(grouping.includes('timeBucket') ? [] : ['timeBucket'])}
                  className="flex items-center justify-between"
                >
                  <span>Joined</span>
                  {grouping.includes('timeBucket') && <CheckCircle className="h-4 w-4" />}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          
          {/* Stats */}
          <div className="flex items-center space-x-4 text-sm text-gray-500">
            <span>{table.getFilteredRowModel().rows.length} members</span>
            {grouping.length > 0 && (
              <span>{table.getGroupedRowModel().rows.length} groups</span>
            )}
          </div>
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


      {/* Advanced Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <th
                      key={header.id}
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      style={{ width: header.getSize() }}
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(header.column.columnDef.header, header.getContext())}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {table.getRowModel().rows.length === 0 ? (
                <tr>
                  <td colSpan={table.getAllColumns().length} className="px-6 py-12 text-center">
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
                  </td>
                </tr>
              ) : (
                table.getRowModel().rows.map((row) => {
                  if (row.getIsGrouped()) {
                    // Render grouped header row
                    return (
                      <React.Fragment key={row.id}>
                        <tr className="bg-gray-100 border-b-2 border-gray-300">
                          <td
                            colSpan={row.getVisibleCells().length}
                            className="px-6 py-3 text-sm font-semibold text-gray-900"
                          >
                            <div className="flex items-center space-x-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={row.getToggleExpandedHandler()}
                                className="h-6 w-6 p-0 hover:bg-gray-200"
                              >
                                {row.getIsExpanded() ? (
                                  <ChevronDown className="h-4 w-4" />
                                ) : (
                                  <ChevronDown className="h-4 w-4 rotate-[-90deg]" />
                                )}
                              </Button>
                              <span className="font-medium">
                                {row.groupingColumnId === 'role' ? 'Role' : 
                                 row.groupingColumnId === 'status' ? 'Status' : 
                                 row.groupingColumnId === 'timeBucket' ? 'Joined' : 
                                 row.groupingColumnId}: {row.groupingValue === null || row.groupingValue === undefined ? 'No value' : String(row.groupingValue)} ({row.subRows.length} members)
                              </span>
                            </div>
                          </td>
                        </tr>
                        {/* Render sub-rows if expanded */}
                        {row.getIsExpanded() && row.subRows.map((subRow) => (
                          <tr key={subRow.id} className="hover:bg-gray-50 bg-gray-50">
                            {subRow.getVisibleCells().map((cell) => (
                              <td
                                key={cell.id}
                                className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 pl-8"
                              >
                                {flexRender(cell.column.columnDef.cell, cell.getContext())}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </React.Fragment>
                    );
                  } else {
                    // Render regular data row (only if not part of a collapsed group)
                    const isInCollapsedGroup = row.getParentRow() && !row.getParentRow()?.getIsExpanded();
                    if (isInCollapsedGroup) {
                      return null;
                    }
                    
                    return (
                      <tr key={row.id} className="hover:bg-gray-50">
                        {row.getVisibleCells().map((cell) => (
                          <td
                            key={cell.id}
                            className="px-6 py-4 whitespace-nowrap text-sm text-gray-900"
                          >
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </td>
                        ))}
                      </tr>
                    );
                  }
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
          <div className="flex-1 flex justify-between sm:hidden">
            <Button
              variant="outline"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              Next
            </Button>
          </div>
          <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-gray-700">
                Showing{" "}
                <span className="font-medium">
                  {table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1}
                </span>{" "}
                to{" "}
                <span className="font-medium">
                  {Math.min(
                    (table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize,
                    table.getFilteredRowModel().rows.length
                  )}
                </span>{" "}
                of{" "}
                <span className="font-medium">
                  {table.getFilteredRowModel().rows.length}
                </span>{" "}
                results
              </p>
            </div>
            <div>
              <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                <Button
                  variant="outline"
                  onClick={() => table.setPageIndex(0)}
                  disabled={!table.getCanPreviousPage()}
                  className="rounded-l-md"
                >
                  First
                </Button>
                <Button
                  variant="outline"
                  onClick={() => table.previousPage()}
                  disabled={!table.getCanPreviousPage()}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  onClick={() => table.nextPage()}
                  disabled={!table.getCanNextPage()}
                >
                  Next
                </Button>
                <Button
                  variant="outline"
                  onClick={() => table.setPageIndex(table.getPageCount() - 1)}
                  disabled={!table.getCanNextPage()}
                  className="rounded-r-md"
                >
                  Last
                </Button>
              </nav>
            </div>
          </div>
        </div>
      </div>

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
