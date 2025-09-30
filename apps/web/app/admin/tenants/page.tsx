"use client";

import React, { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { t } from "@i18n-core";
import { Button } from "@ui/base";
import { Input } from "@ui/base";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@ui/base";
import { Badge } from "@ui/base";
import { toast } from "@ui/base";
import { 
  ColumnOrderState, 
  ColumnResizeMode, 
  createColumnHelper, 
  flexRender, 
  getCoreRowModel, 
  getFilteredRowModel, 
  getSortedRowModel,
  getGroupedRowModel,
  getPaginationRowModel,
  SortingState, 
  useReactTable, 
  VisibilityState,
  GroupingState,
  ColumnFiltersState,
  PaginationState,
  ExpandedState,
} from "@tanstack/react-table";
import { 
  Plus, 
  Search, 
  Building2, 
  Users, 
  Calendar, 
  Eye,
  Edit,
  Trash2,
  AlertTriangle,
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
  CheckCircle,
  Clock,
  Globe,
  MoreHorizontal
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { BreadcrumbNavigation } from "@/components/BreadcrumbNavigation";
import { AdminPageLayout } from "@/components/AdminPageLayout";
import Link from "next/link";

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


// Define the tenant type
type Tenant = {
  id: string;
  name: string;
  slug: string;
  status: string;
  plan: string;
  logoUrl?: string | null;
  createdAt: string;
  _count?: {
    memberships: number;
  };
  subRows?: Tenant[];
  _groupingKey?: string;
  _groupingValue?: string;
  _timeBucket?: string;
  _statusGroup?: string;
  _planGroup?: string;
  _sizeGroup?: string;
};

// Create column helper
const columnHelper = createColumnHelper<Tenant>();

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

// Helper function to create size-based buckets for grouping
function getSizeBucket(memberCount: number): string {
  if (memberCount === 0) {
    return 'Empty (0 members)';
  } else if (memberCount <= 5) {
    return 'Small (1-5 members)';
  } else if (memberCount <= 20) {
    return 'Medium (6-20 members)';
  } else if (memberCount <= 50) {
    return 'Large (21-50 members)';
  } else {
    return 'Enterprise (50+ members)';
  }
}

export default function AdminTenantsPage() {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [selectedPlan, setSelectedPlan] = useState<string>("all");
  
  // Modal states
  const [showTenantDetails, setShowTenantDetails] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  const [tenantToDelete, setTenantToDelete] = useState<Tenant | null>(null);
  
  // Advanced TanStack Table state
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnOrder, setColumnOrder] = useState<ColumnOrderState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({
    grouping: false, // Hide virtual grouping column
    timeBucket: false, // Hide virtual time bucket column
    statusGroup: false, // Hide virtual status group column
    planGroup: false, // Hide virtual plan group column
    sizeGroup: false, // Hide virtual size group column
  });
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState("");
  const [grouping, setGrouping] = useState<GroupingState>([]);
  const [expanded, setExpanded] = useState<ExpandedState>({});
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 20,
  });
  
  const limit = 20;
  const offset = (currentPage - 1) * limit;

  const { data: tenantsData, isLoading, refetch } = trpc.getTenants.useQuery({
    limit,
    offset,
    status: selectedStatus === "all" ? undefined : selectedStatus,
    plan: selectedPlan === "all" ? undefined : selectedPlan,
  });

  // Transform data for proper grouping
  const transformedTenants = useMemo(() => {
    if (!tenantsData?.tenants) return [];
    
    return tenantsData.tenants.map(tenant => {
      let groupingValue = 'All Tenants';
      let timeBucket = getTimeBucket(new Date(tenant.createdAt));
      let statusGroup = tenant.status || 'Unknown';
      let planGroup = tenant.plan || 'Unknown';
      let sizeGroup = getSizeBucket(tenant._count?.memberships || 0);
      
      if (grouping.length > 0) {
        if (grouping[0] === 'status') {
          groupingValue = statusGroup;
        } else if (grouping[0] === 'plan') {
          groupingValue = planGroup;
        } else if (grouping[0] === 'timeBucket') {
          groupingValue = timeBucket;
        } else if (grouping[0] === 'statusGroup') {
          groupingValue = statusGroup;
        } else if (grouping[0] === 'planGroup') {
          groupingValue = planGroup;
        } else if (grouping[0] === 'sizeGroup') {
          groupingValue = sizeGroup;
        }
      }
      
      return {
        ...tenant,
        _groupingKey: tenant.id,
        _groupingValue: groupingValue,
        _timeBucket: timeBucket,
        _statusGroup: statusGroup,
        _planGroup: planGroup,
        _sizeGroup: sizeGroup,
      };
    });
  }, [tenantsData?.tenants, grouping]);

  // Define advanced columns with grouping support
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
      columnHelper.accessor("_statusGroup", {
        id: "statusGroup",
        header: () => null,
        cell: () => null,
        enableSorting: false,
        enableResizing: false,
        enableGrouping: true,
        enableHiding: true,
      }),
      columnHelper.accessor("_planGroup", {
        id: "planGroup",
        header: () => null,
        cell: () => null,
        enableSorting: false,
        enableResizing: false,
        enableGrouping: true,
        enableHiding: true,
      }),
      columnHelper.accessor("_sizeGroup", {
        id: "sizeGroup",
        header: () => null,
        cell: () => null,
        enableSorting: false,
        enableResizing: false,
        enableGrouping: true,
        enableHiding: true,
      }),
      columnHelper.accessor("name", {
        id: "tenant",
        header: ({ column }) => (
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
              className="h-8 px-2 hover:bg-gray-100"
            >
              <ArrowUpDown className="h-4 w-4 mr-1" />
              {t("Tenant", "admin.tenants.page.AdminTenantsPage.tenant__23ckols")}
            </Button>
          </div>
        ),
        cell: ({ row }) => (
          <div className="flex items-center min-w-0">
            <div className="h-10 w-10 flex-shrink-0">
              {row.original.logoUrl ? (
                <img className="h-10 w-10 rounded-full" src={row.original.logoUrl} alt={row.original.name} />
              ) : (
                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                  <Building2 className="h-5 w-5 text-white" />
                </div>
              )}
            </div>
            <div className="ml-4 min-w-0 flex-1">
              <div className="text-sm font-medium text-gray-900 truncate">{row.original.name}</div>
              <div className="text-sm text-gray-500 truncate">{row.original.slug}</div>
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
              {t("Status", "admin.tenants.page.AdminTenantsPage.status__24ckols")}
            </Button>
          </div>
        ),
        cell: ({ getValue }) => {
          const status = getValue();
          switch (status) {
            case "active":
              return <Badge variant="default" className="bg-green-100 text-green-800 hover:bg-green-200 hover:text-green-900">Active</Badge>;
            case "suspended":
              return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 hover:bg-yellow-200 hover:text-yellow-900">Suspended</Badge>;
            case "deleted":
              return <Badge variant="destructive" className="bg-red-100 text-red-800 hover:bg-red-200 hover:text-red-900">Deleted</Badge>;
            default:
              return <Badge variant="outline" className="hover:bg-gray-100">{status}</Badge>;
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
      columnHelper.accessor("plan", {
        id: "plan",
        header: ({ column }) => (
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
              className="h-8 px-2 hover:bg-gray-100"
            >
              <ArrowUpDown className="h-4 w-4 mr-1" />
              {t("Plan", "admin.tenants.page.AdminTenantsPage.plan__25ckols")}
            </Button>
          </div>
        ),
        cell: ({ getValue }) => {
          const plan = getValue();
          switch (plan) {
            case "free":
              return <Badge variant="outline" className="text-gray-600 hover:bg-gray-100">Free</Badge>;
            case "pro":
              return <Badge variant="secondary" className="bg-blue-100 text-blue-800 hover:bg-blue-200 hover:text-blue-900">Pro</Badge>;
            case "enterprise":
              return <Badge variant="default" className="bg-purple-100 text-purple-800 hover:bg-purple-200 hover:text-purple-900">Enterprise</Badge>;
            default:
              return <Badge variant="outline" className="hover:bg-gray-100">{plan}</Badge>;
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
      columnHelper.accessor("_count.memberships", {
        id: "members",
        header: ({ column }) => (
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
              className="h-8 px-2 hover:bg-gray-100"
            >
              <ArrowUpDown className="h-4 w-4 mr-1" />
              {t("Members", "admin.tenants.page.AdminTenantsPage.members__26ckols")}
            </Button>
          </div>
        ),
        cell: ({ getValue }) => (
          <div className="flex items-center space-x-2">
            <Users className="h-4 w-4 text-gray-400" />
            <span className="text-sm text-gray-900">{getValue() || 0}</span>
          </div>
        ),
        size: 120,
        minSize: 100,
        maxSize: 150,
        enableSorting: true,
        enableResizing: true,
        enableGrouping: true,
      }),
      columnHelper.accessor("createdAt", {
        id: "created",
        header: ({ column }) => (
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
              className="h-8 px-2 hover:bg-gray-100"
            >
              <ArrowUpDown className="h-4 w-4 mr-1" />
              {t("Created", "admin.tenants.page.AdminTenantsPage.created__27ckols")}
            </Button>
          </div>
        ),
        cell: ({ getValue }) => (
          <div className="flex items-center space-x-2">
            <Calendar className="h-4 w-4 text-gray-400" />
            <span className="text-sm text-gray-500">
              {new Date(getValue()).toLocaleDateString()}
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
        header: t("Actions", "admin.tenants.page.AdminTenantsPage.actions__28ckols"),
        cell: ({ row }) => (
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSelectedTenant(row.original);
                setShowTenantDetails(true);
              }}
              className="h-8 w-8 p-0 hover:bg-gray-100"
            >
              <Eye className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleEditTenant(row.original.slug)}
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
                    setSelectedTenant(row.original);
                    setShowTenantDetails(true);
                  }}
                >
                  <Eye className="h-4 w-4 mr-2" />
                  View Details
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => handleViewTenant(row.original.slug)}
                >
                  <Globe className="h-4 w-4 mr-2" />
                  Visit Tenant
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => handleEditTenant(row.original.slug)}
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Settings
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => {
                    toast.info("Status change not implemented yet");
                  }}
                  className="text-orange-600"
                >
                  <AlertTriangle className="h-4 w-4 mr-2" />
                  {row.original.status === "active" ? "Suspend" : "Activate"}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    setTenantToDelete(row.original);
                    setShowDeleteConfirm(true);
                  }}
                  className="text-red-600"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Tenant
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
    [t, grouping]
  );

  // Advanced table instance with grouping and pagination
  const table = useReactTable({
    data: transformedTenants,
    columns,
    state: {
      sorting,
      columnOrder,
      columnVisibility,
      columnFilters,
      globalFilter: globalFilter || searchTerm,
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

  // TODO: Implement inline tenant creation if needed in the future
  // const createTenant = trpc.createTenant.useMutation({
  //   onSuccess: () => {
  //     toast.success("Tenant created successfully");
  //     refetch();
  //   },
  //   onError: (error) => {
  //     toast.error(error.message);
  //   },
  // });

  const handleCreateTenant = () => {
    router.push("/admin/tenants/create");
  };

  const handleEditTenant = (tenantSlug: string) => {
    router.push(`/admin/tenants/${tenantSlug}/edit`);
  };

  const handleViewTenant = (tenantSlug: string) => {
    router.push(`/tenants/${tenantSlug}`);
  };

  // Update global filter when search term changes
  useMemo(() => {
    setGlobalFilter(searchTerm);
  }, [searchTerm]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <AdminPageLayout
      title="Tenant Management"
      description="Manage all workspaces and their settings"
      breadcrumb={[
        { label: "Tenant Management", current: true },
      ]}
      actions={
        <div className="flex items-center space-x-3">
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button onClick={handleCreateTenant} className="bg-indigo-600 hover:bg-indigo-700">
            <Plus className="h-4 w-4 mr-2" />
            Create Tenant
          </Button>
        </div>
      }
    >
      {/* Advanced Controls */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          {/* Search and Filters */}
          <div className="flex items-center space-x-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search tenants..."
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
                  .filter((column) => {
                    // Only show columns that can be hidden and are not dynamic grouping columns
                    const isDynamicColumn = [
                      'grouping', 'timeBucket', 'statusGroup', 'planGroup', 'sizeGroup'
                    ].includes(column.id);
                    return column.getCanHide() && !isDynamicColumn;
                  })
                  .map((column) => (
                    <DropdownMenuItem
                      key={column.id}
                      onClick={() => column.toggleVisibility()}
                      className="flex items-center justify-between"
                    >
                      <span>
                        {column.id === 'tenant' ? 'Tenant' :
                         column.id === 'status' ? 'Status' :
                         column.id === 'plan' ? 'Plan' :
                         column.id === 'members' ? 'Members' :
                         column.id === 'created' ? 'Created' :
                         column.id === 'actions' ? 'Actions' :
                         column.id}
                      </span>
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
                  Group by {grouping.length > 0 ? `(${
                    grouping[0] === 'status' ? 'Status' :
                    grouping[0] === 'plan' ? 'Plan' :
                    grouping[0] === 'sizeGroup' ? 'Size' :
                    grouping[0] === 'timeBucket' ? 'Created' :
                    grouping[0]
                  })` : ''}
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
                  onClick={() => setGrouping(grouping.includes('status') ? [] : ['status'])}
                  className="flex items-center justify-between"
                >
                  <span>Status</span>
                  {grouping.includes('status') && <CheckCircle className="h-4 w-4" />}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setGrouping(grouping.includes('plan') ? [] : ['plan'])}
                  className="flex items-center justify-between"
                >
                  <span>Plan</span>
                  {grouping.includes('plan') && <CheckCircle className="h-4 w-4" />}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setGrouping(grouping.includes('sizeGroup') ? [] : ['sizeGroup'])}
                  className="flex items-center justify-between"
                >
                  <span>Size</span>
                  {grouping.includes('sizeGroup') && <CheckCircle className="h-4 w-4" />}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setGrouping(grouping.includes('timeBucket') ? [] : ['timeBucket'])}
                  className="flex items-center justify-between"
                >
                  <span>Created</span>
                  {grouping.includes('timeBucket') && <CheckCircle className="h-4 w-4" />}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          
          {/* Stats */}
          <div className="flex items-center space-x-4 text-sm text-gray-500">
            <span>{table.getFilteredRowModel().rows.length} tenants</span>
            {grouping.length > 0 && (
              <span>{table.getGroupedRowModel().rows.length} groups</span>
            )}
          </div>
        </div>
      </div>


      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Building2 className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">{t("Total Tenants", "admin.tenants.page.AdminTenantsPage.total_tenants__17ckols")}</p>
                <p className="text-2xl font-bold text-gray-900">{tenantsData?.total || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Users className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">{t("Active Tenants", "admin.tenants.page.AdminTenantsPage.active_tenants__18ckols")}</p>
                <p className="text-2xl font-bold text-gray-900">
                  {tenantsData?.tenants.filter(t => t.status === "active").length || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <AlertTriangle className="h-8 w-8 text-yellow-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">{t("Suspended", "admin.tenants.page.AdminTenantsPage.suspended__19ckols")}</p>
                <p className="text-2xl font-bold text-gray-900">
                  {tenantsData?.tenants.filter(t => t.status === "suspended").length || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Calendar className="h-8 w-8 text-purple-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">{t("This Month", "admin.tenants.page.AdminTenantsPage.this_month__20ckols")}</p>
                <p className="text-2xl font-bold text-gray-900">
                  {tenantsData?.tenants.filter(t => {
                    const createdAt = new Date(t.createdAt);
                    const now = new Date();
                    return createdAt.getMonth() === now.getMonth() && createdAt.getFullYear() === now.getFullYear();
                  }).length || 0}
                </p>
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
                    <Building2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">No tenants found</h3>
                    <p className="text-gray-600 mb-6">
                      {globalFilter ? "Try adjusting your search criteria" : "Get started by creating your first tenant"}
                    </p>
                    {!globalFilter && (
                      <Button onClick={handleCreateTenant}>
                        <Plus className="h-4 w-4 mr-2" />
                        Create Tenant
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
                                {row.groupingColumnId === 'status' ? 'Status' : 
                                 row.groupingColumnId === 'plan' ? 'Plan' : 
                                 row.groupingColumnId === 'sizeGroup' ? 'Size' : 
                                 row.groupingColumnId === 'timeBucket' ? 'Created' : 
                                 row.groupingColumnId}: {row.groupingValue === null || row.groupingValue === undefined ? 'No value' : String(row.groupingValue)} ({row.subRows.length} tenants)
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

      {/* Tenant Details Modal */}
      <Dialog open={showTenantDetails} onOpenChange={setShowTenantDetails}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Tenant Details</DialogTitle>
            <DialogDescription>
              View detailed information about this tenant
            </DialogDescription>
          </DialogHeader>
          {selectedTenant && (
            <div className="space-y-4">
              <div className="flex items-center space-x-4">
                <div className="h-16 w-16 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                  {selectedTenant.logoUrl ? (
                    <img src={selectedTenant.logoUrl} alt={selectedTenant.name} className="h-16 w-16 rounded-full" />
                  ) : (
                    <Building2 className="h-8 w-8 text-white" />
                  )}
                </div>
                <div>
                  <h3 className="text-lg font-medium text-gray-900">
                    {selectedTenant.name}
                  </h3>
                  <p className="text-sm text-gray-500">{selectedTenant.slug}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Status</label>
                  <p className="text-sm text-gray-900">{selectedTenant.status}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Plan</label>
                  <p className="text-sm text-gray-900">{selectedTenant.plan}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Members</label>
                  <p className="text-sm text-gray-900">{selectedTenant._count?.memberships || 0}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Created</label>
                  <p className="text-sm text-gray-900">
                    {new Date(selectedTenant.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="col-span-2">
                  <label className="text-sm font-medium text-gray-500">Tenant ID</label>
                  <p className="text-sm text-gray-900 font-mono">{selectedTenant.id}</p>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTenantDetails(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Tenant</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this tenant? This action cannot be undone.
              All tenant data and associated content will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                toast.info("Tenant deletion not implemented yet");
                setShowDeleteConfirm(false);
              }}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-500"
            >
              Delete Tenant
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminPageLayout>
  );
}
