"use client";

import React, { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@ui/base";
import { Input } from "@ui/base";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@ui/base";
import { Badge } from "@ui/base";
import { 
  Plus, 
  Search, 
  Users, 
  Calendar, 
  Eye,
  Edit,
  Trash2,
  AlertTriangle,
  UserCheck,
  Mail,
  Shield,
  MoreHorizontal,
  ArrowLeft,
  Filter,
  X,
  ChevronDown,
  ArrowUpDown,
  GripVertical,
  Download,
  Settings,
  Columns,
  RefreshCw,
  UserPlus,
  UserX,
  CheckCircle,
  Clock,
  Globe,
  Building2
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { BreadcrumbNavigation } from "@/components/BreadcrumbNavigation";
import Link from "next/link";
import { toast } from "@ui/base";

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
  image?: string | null;
  platformRole: string | null;
  status: string;
  createdAt: string;
  memberships: {
    role: string;
    tenant: {
      id: string;
      name: string;
      slug: string;
    };
  }[];
  subRows?: UserData[];
  _groupingKey?: string;
  _groupingValue?: string;
  _timeBucket?: string;
  _tenantRole?: string;
}

const columnHelper = createColumnHelper<UserData>();

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

export default function AdminUsersPage() {
  const router = useRouter();
  
  // State for modals and forms
  const [showUserDetails, setShowUserDetails] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null);
  const [userToDelete, setUserToDelete] = useState<UserData | null>(null);
  const [search, setSearch] = useState("");
  
  // TanStack Table state
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnOrder, setColumnOrder] = useState<ColumnOrderState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({
    grouping: false, // Hide the virtual grouping column
    timeBucket: false, // Hide the virtual time bucket column
  });
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState("");
  const [grouping, setGrouping] = useState<GroupingState>([]);
  const [expanded, setExpanded] = useState<ExpandedState>({});
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 20,
  });

  // Data fetching
  const { data: users, isLoading, refetch } = trpc.getAllUsers.useQuery();

  // Transform data for proper grouping
  const transformedUsers = useMemo(() => {
    if (!users) return [];
    
    // If grouping by tenants (using virtual 'grouping' column), duplicate users for each tenant
    if (grouping.length > 0 && grouping[0] === 'grouping') {
      const expandedUsers: UserData[] = [];
      users.forEach(user => {
        if (user.memberships.length === 0) {
          // User with no tenants - add as is
          expandedUsers.push({
            ...user,
            _groupingKey: 'no-tenants',
            _groupingValue: 'No Tenants'
          });
        } else {
          // User with tenants - duplicate for each tenant
          user.memberships.forEach(membership => {
            expandedUsers.push({
              ...user,
              _groupingKey: `tenant-${membership.tenant.id}`,
              _groupingValue: membership.tenant.name,
              _tenantRole: membership.role
            });
          });
        }
      });
      return expandedUsers;
    }
    
    // For other groupings or no grouping, return users as-is with proper grouping values
    return users.map(user => {
      let groupingValue = 'All Users';
      let timeBucket = getTimeBucket(new Date(user.createdAt));
      
      if (grouping.length > 0) {
        if (grouping[0] === 'role') {
          groupingValue = user.platformRole || 'Unknown';
        } else if (grouping[0] === 'status') {
          groupingValue = user.status || 'Unknown';
        } else if (grouping[0] === 'timeBucket') {
          groupingValue = timeBucket;
        }
      }
      
      return {
        ...user,
        _groupingKey: user.id,
        _groupingValue: groupingValue,
        _timeBucket: timeBucket
      };
    });
  }, [users, grouping]);

  // Mutations
  const deleteUser = trpc.deleteUser.useMutation({
    onSuccess: () => {
      toast.success("User deleted successfully!");
      setShowDeleteConfirm(false);
      setUserToDelete(null);
      refetch();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  // Column definitions with advanced features
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
      columnHelper.accessor("name", {
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
                {row.original.image ? (
                  <img src={row.original.image} alt={row.original.name || ""} className="h-10 w-10 rounded-full" />
                ) : (
                  <span className="text-gray-600 font-medium">
                    {row.original.name?.charAt(0) || row.original.email?.charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
            </div>
            <div className="ml-4 min-w-0 flex-1">
              <div className="text-sm font-medium text-gray-900 truncate">
                {row.original.name || "No Name"}
              </div>
              <div className="text-sm text-gray-500 truncate" title={row.original.email || ""}>
                {row.original.email || ""}
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
      columnHelper.accessor("platformRole", {
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
          const role = row.original.platformRole;
    switch (role) {
      case "admin":
              return <Badge variant="default" className="bg-red-100 text-red-700 border-red-200 hover:bg-red-200 hover:text-red-800">Platform Admin</Badge>;
            case "moderator":
              return <Badge variant="secondary" className="bg-purple-100 text-purple-700 border-purple-200 hover:bg-purple-200 hover:text-purple-800">Moderator</Badge>;
      case "user":
              return <Badge variant="outline" className="bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-200 hover:text-blue-800">User</Badge>;
      default:
              return <Badge variant="outline" className="hover:bg-gray-100">Unknown</Badge>;
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
      columnHelper.accessor("status", {
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
          const status = row.original.status;
          
          if (status === "active") {
            return <Badge variant="default" className="bg-green-100 text-green-700 border-green-200 hover:bg-green-200 hover:text-green-800">Active</Badge>;
          } else if (status === "suspended") {
            return <Badge variant="destructive" className="bg-red-100 text-red-700 border-red-200 hover:bg-red-200 hover:text-red-800">Suspended</Badge>;
          } else {
            return <Badge variant="outline" className="hover:bg-gray-100">Unknown</Badge>;
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
      columnHelper.accessor("memberships", {
        id: "tenants",
        header: ({ column }) => (
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
              className="h-8 px-2 hover:bg-gray-100"
            >
              <ArrowUpDown className="h-4 w-4 mr-1" />
              Tenants
            </Button>
          </div>
        ),
        cell: ({ row }) => {
          const memberships = row.original.memberships;
          const tenantRole = row.original._tenantRole;
          
          if (memberships.length === 0) {
            return <span className="text-sm text-gray-500">No tenants</span>;
          }
          
          // When grouping by tenants, show the specific tenant and role
          if (grouping.length > 0 && grouping[0] === 'tenants' && tenantRole) {
            return (
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">
                  {row.original._groupingValue}
                </Badge>
                <Badge variant="secondary" className="text-xs">
                  {tenantRole}
                </Badge>
              </div>
            );
          }
          
          if (memberships.length === 0) {
            return <span className="text-sm text-gray-500">No tenants</span>;
          }
          
          if (memberships.length === 1) {
            return (
              <Badge variant="outline" className="text-xs">
                {memberships[0].tenant.name}
              </Badge>
            );
          }
          
          // Multiple tenants - show first one, then +X more with tooltip
          return (
            <div className="flex flex-col gap-1">
              <Badge variant="outline" className="text-xs">
                {memberships[0].tenant.name}
              </Badge>
              <div className="group relative">
                <Badge 
                  variant="secondary" 
                  className="text-xs bg-gray-100 text-gray-600 w-fit cursor-pointer hover:bg-gray-200"
                >
                  +{memberships.length - 1} more
                </Badge>
                <div className="absolute bottom-full left-0 mb-2 hidden group-hover:block z-50">
                  <div className="bg-gray-900 text-white text-xs rounded-md px-3 py-2 shadow-lg min-w-max">
                    <div className="font-semibold mb-1">All Tenants:</div>
                    <div className="space-y-1">
                      {memberships.map((membership, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <span>{membership.tenant.name}</span>
                          <Badge variant="outline" className="text-xs bg-gray-700 text-gray-200 border-gray-600">
                            {membership.role}
                          </Badge>
                        </div>
                      ))}
                    </div>
                    <div className="absolute top-full left-4 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
                  </div>
                </div>
              </div>
            </div>
          );
        },
        size: 200,
        minSize: 150,
        maxSize: 300,
        enableSorting: true,
        enableResizing: true,
        enableGrouping: true,
        sortingFn: (rowA, rowB) => {
          const aCount = rowA.original.memberships.length;
          const bCount = rowB.original.memberships.length;
          return aCount - bCount;
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
              onClick={() => {
                setSelectedUser(row.original);
                setShowUserDetails(true);
              }}
              className="h-8 w-8 p-0 hover:bg-gray-100"
            >
              <Eye className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSelectedUser(row.original);
                // Handle edit logic
              }}
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
                  onClick={() => {
                    setSelectedUser(row.original);
                    setShowUserDetails(true);
                  }}
                >
                  <Eye className="h-4 w-4 mr-2" />
                  View Details
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    setSelectedUser(row.original);
                    // Handle edit logic
                  }}
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Edit User
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => {
                    toast.info("User status update not implemented yet");
                  }}
                  className="text-orange-600"
                >
                  <UserX className="h-4 w-4 mr-2" />
                  {row.original.status === "active" ? "Suspend" : "Activate"}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    setUserToDelete(row.original);
                    setShowDeleteConfirm(true);
                  }}
                  className="text-red-600"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete User
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

  // Table instance with advanced features
  const table = useReactTable({
    data: transformedUsers,
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

  const handleDeleteUser = async () => {
    if (userToDelete) {
      await deleteUser.mutateAsync({ id: userToDelete.id });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-6">
      {/* Header */}
      <div className="mb-4">
        {/* Breadcrumb Navigation */}
        <div className="flex items-center space-x-4 mb-4">
          <Link 
            href="/admin"
            className="inline-flex items-center text-indigo-600 hover:text-indigo-800 transition-colors"
          >
            <ArrowLeft className="h-5 w-5 mr-2" />
            Back to Admin
          </Link>
          <div className="h-6 w-px bg-gray-300" />
          <BreadcrumbNavigation
            items={[
              { label: "Admin", href: "/admin" },
              { label: "User Management", current: true },
            ]}
            showHome={false}
          />
        </div>
        
        {/* Page Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center space-x-3">
              <Users className="h-8 w-8 text-indigo-600" />
              <span>User Management</span>
            </h1>
            <p className="text-gray-600 mt-2">
              Manage platform users, roles, and permissions
            </p>
          </div>
          
          <div className="flex items-center space-x-3">
            <Button variant="outline" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Button variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            <Button className="bg-indigo-600 hover:bg-indigo-700">
              <UserPlus className="h-4 w-4 mr-2" />
              Add User
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
                placeholder="Search users..."
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
                  onClick={() => setGrouping(grouping.includes('grouping') ? [] : ['grouping'])}
                  className="flex items-center justify-between"
                >
                  <span>Tenant</span>
                  {grouping.includes('grouping') && <CheckCircle className="h-4 w-4" />}
                </DropdownMenuItem>
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
            <span>{table.getFilteredRowModel().rows.length} users</span>
            {grouping.length > 0 && (
              <span>{table.getGroupedRowModel().rows.length} groups</span>
            )}
          </div>
        </div>
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
              {table.getRowModel().rows.map((row) => {
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
                              {row.groupingColumnId === 'grouping' ? 'Tenant' : 
                               row.groupingColumnId === 'role' ? 'Role' : 
                               row.groupingColumnId === 'status' ? 'Status' : 
                               row.groupingColumnId === 'timeBucket' ? 'Joined' : 
                               row.groupingColumnId === 'joined' ? 'Joined' : 
                               row.groupingColumnId}: {row.groupingValue === null || row.groupingValue === undefined ? 'No value' : String(row.groupingValue)} ({row.subRows.length} items)
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
              })}
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

      {/* User Details Modal */}
      <Dialog open={showUserDetails} onOpenChange={setShowUserDetails}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>User Details</DialogTitle>
            <DialogDescription>
              View detailed information about this user
            </DialogDescription>
          </DialogHeader>
          {selectedUser && (
            <div className="space-y-4">
              <div className="flex items-center space-x-4">
                <div className="h-16 w-16 rounded-full bg-gray-200 flex items-center justify-center">
                  <span className="text-2xl text-gray-600 font-medium">
                    {selectedUser.name?.charAt(0) || selectedUser.email?.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div>
                  <h3 className="text-lg font-medium text-gray-900">
                    {selectedUser.name || "No Name"}
                  </h3>
                  <p className="text-sm text-gray-500">{selectedUser.email}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Status</label>
                  <p className="text-sm text-gray-900">{selectedUser.status}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Role</label>
                  <p className="text-sm text-gray-900">{selectedUser.platformRole}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Joined</label>
                  <p className="text-sm text-gray-900">
                    {new Date(selectedUser.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">User ID</label>
                  <p className="text-sm text-gray-900 font-mono">{selectedUser.id}</p>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowUserDetails(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete User</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this user? This action cannot be undone.
              All user data and associated content will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteUser}
              disabled={deleteUser.isPending}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-500"
            >
              {deleteUser.isPending ? "Deleting..." : "Delete User"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}