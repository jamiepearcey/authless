"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { t } from "@i18n-core";
import { Button } from "@ui/base";
import { Input } from "@ui/base";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@ui/base";
import { Badge } from "@ui/base";
import { ColumnOrderState, ColumnResizeMode, createColumnHelper, flexRender, getCoreRowModel, getFilteredRowModel, getSortedRowModel, SortingState, useReactTable, VisibilityState } from "@tanstack/react-table";
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
  GripVertical
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { BreadcrumbNavigation } from "@/components/BreadcrumbNavigation";
import Link from "next/link";


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
};

// Create column helper
const columnHelper = createColumnHelper<Tenant>();

export default function AdminTenantsPage() {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [selectedPlan, setSelectedPlan] = useState<string>("all");
  
  // TanStack Table state
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnOrder, setColumnOrder] = useState<ColumnOrderState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [globalFilter, setGlobalFilter] = useState("");
  
  const limit = 20;
  const offset = (currentPage - 1) * limit;

  const { data: tenantsData, isLoading } = trpc.getTenants.useQuery({
    limit,
    offset,
    status: selectedStatus === "all" ? undefined : selectedStatus,
    plan: selectedPlan === "all" ? undefined : selectedPlan,
  });

  // Define columns
  const columns = useMemo(
    () => [
      columnHelper.accessor("name", {
        id: "tenant",
        header: () => t("Tenant", "admin.tenants.page.AdminTenantsPage.tenant__23ckols"),
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
        size: 350,
        minSize: 250,
        maxSize: 500,
      }),
      columnHelper.accessor("status", {
        id: "status",
        header: () => t("Status", "admin.tenants.page.AdminTenantsPage.status__24ckols"),
        cell: ({ getValue }) => {
          const status = getValue();
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
        },
        size: 100,
        minSize: 80,
        maxSize: 150,
      }),
      columnHelper.accessor("plan", {
        id: "plan",
        header: () => t("Plan", "admin.tenants.page.AdminTenantsPage.plan__25ckols"),
        cell: ({ getValue }) => {
          const plan = getValue();
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
        },
        size: 100,
        minSize: 80,
        maxSize: 150,
      }),
      columnHelper.accessor("_count.memberships", {
        id: "members",
        header: () => t("Members", "admin.tenants.page.AdminTenantsPage.members__26ckols"),
        cell: ({ getValue }) => (
          <span className="text-sm text-gray-900">{getValue() || 0}</span>
        ),
        size: 80,
        minSize: 60,
        maxSize: 120,
      }),
      columnHelper.accessor("createdAt", {
        id: "created",
        header: () => t("Created", "admin.tenants.page.AdminTenantsPage.created__27ckols"),
        cell: ({ getValue }) => (
          <span className="text-sm text-gray-500">
            {new Date(getValue()).toLocaleDateString()}
          </span>
        ),
        size: 120,
        minSize: 100,
        maxSize: 150,
      }),
      columnHelper.display({
        id: "actions",
        header: () => t("Actions", "admin.tenants.page.AdminTenantsPage.actions__28ckols"),
        cell: ({ row }) => (
          <div className="flex items-center space-x-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleViewTenant(row.original.slug)}
              className="h-8 w-8 p-0"
              title="View Tenant"
            >
              <Eye className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleEditTenant(row.original.slug)}
              className="h-8 w-8 p-0"
              title="Edit Tenant"
            >
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
              title="Delete Tenant"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ),
        size: 120,
        minSize: 100,
        maxSize: 150,
        enableSorting: false,
      }),
    ],
    [t]
  );

  // Create table instance
  const table = useReactTable({
    data: tenantsData?.tenants || [],
    columns,
    state: {
      sorting,
      columnOrder,
      columnVisibility,
      globalFilter: globalFilter || searchTerm,
    },
    onSortingChange: setSorting,
    onColumnOrderChange: setColumnOrder,
    onColumnVisibilityChange: setColumnVisibility,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    columnResizeMode: "onChange" as ColumnResizeMode,
    enableColumnResizing: true,
    enableSorting: true,
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
    <div className="flex-1 space-y-6">
      {/* Header */}
      <div className="mb-8">
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
              { label: "Tenant Management", current: true },
            ]}
            showHome={false}
          />
        </div>
        
        {/* Page Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center space-x-3">
              <Building2 className="h-8 w-8 text-indigo-600" />
              <span>Tenant Management</span>
            </h1>
            <p className="text-gray-600 mt-2">
              Manage all workspaces and their settings
            </p>
          </div>
          
          <Button onClick={handleCreateTenant} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Create Tenant
          </Button>
        </div>
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
                  placeholder="Search tenants by name or slug..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 h-10 border-gray-300 focus:border-indigo-500 focus:ring-indigo-500"
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm("")}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 hover:text-gray-600"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Filters Section */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-gray-500" />
                <span className="text-sm font-medium text-gray-700">Filters:</span>
              </div>
              
              <div className="flex flex-wrap items-center gap-2">
                {/* Status Filter */}
                <div className="relative">
                  <select
                    value={selectedStatus}
                    onChange={(e) => setSelectedStatus(e.target.value)}
                    className="appearance-none bg-white border border-gray-300 rounded-lg px-3 py-2 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 hover:border-gray-400 transition-colors min-w-[120px]"
                  >
                    <option value="all">All Statuses</option>
                    <option value="active">Active</option>
                    <option value="suspended">Suspended</option>
                    <option value="deleted">Deleted</option>
                  </select>
                  <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                </div>

                {/* Plan Filter */}
                <div className="relative">
                  <select
                    value={selectedPlan}
                    onChange={(e) => setSelectedPlan(e.target.value)}
                    className="appearance-none bg-white border border-gray-300 rounded-lg px-3 py-2 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 hover:border-gray-400 transition-colors min-w-[120px]"
                  >
                    <option value="all">All Plans</option>
                    <option value="free">Free</option>
                    <option value="pro">Pro</option>
                    <option value="enterprise">Enterprise</option>
                  </select>
                  <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                </div>

                {/* Clear Filters Button */}
                {(searchTerm || selectedStatus !== "all" || selectedPlan !== "all") && (
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setSearchTerm("");
                      setSelectedStatus("all");
                      setSelectedPlan("all");
                      setCurrentPage(1);
                    }}
                    size="sm"
                    className="h-8 px-3 text-xs border-gray-300 hover:border-gray-400 hover:bg-gray-50"
                  >
                    <X className="h-3 w-3 mr-1" />
                    Clear All
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Active Filters Display */}
          {(searchTerm || selectedStatus !== "all" || selectedPlan !== "all") && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm text-gray-500">Active filters:</span>
                
                {searchTerm && (
                  <Badge variant="secondary" className="bg-blue-100 text-blue-800 border-blue-200">
                    <Search className="h-3 w-3 mr-1" />
                    "{searchTerm}"
                    <button
                      onClick={() => setSearchTerm("")}
                      className="ml-1 hover:bg-blue-200 rounded-full p-0.5"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                )}
                
                {selectedStatus !== "all" && (
                  <Badge variant="secondary" className="bg-green-100 text-green-800 border-green-200">
                    Status: {selectedStatus}
                    <button
                      onClick={() => setSelectedStatus("all")}
                      className="ml-1 hover:bg-green-200 rounded-full p-0.5"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                )}
                
                {selectedPlan !== "all" && (
                  <Badge variant="secondary" className="bg-purple-100 text-purple-800 border-purple-200">
                    Plan: {selectedPlan}
                    <button
                      onClick={() => setSelectedPlan("all")}
                      className="ml-1 hover:bg-purple-200 rounded-full p-0.5"
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

      {/* TanStack Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{t("All Tenants", "admin.tenants.page.AdminTenantsPage.all_tenants__21ckols")}</CardTitle>
              <CardDescription>
                {t("Manage and monitor all workspaces in the system", "admin.tenants.page.AdminTenantsPage.manage_and_monitor_all_workspaces__22ckols")}
              </CardDescription>
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => table.resetColumnOrder()}
                className="text-xs"
              >
                <GripVertical className="h-4 w-4 mr-1" />
                Reset Columns
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full divide-y divide-gray-200" style={{ width: table.getCenterTotalSize() }}>
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
          
          {/* Pagination */}
          {tenantsData && tenantsData.total > limit && (
            <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200">
              <div className="text-sm text-gray-700">
                {t("Showing", "admin.tenants.page.AdminTenantsPage.showing__29ckols")} {offset + 1} {t("to", "admin.tenants.page.AdminTenantsPage.to__30ckols")} {Math.min(offset + limit, tenantsData.total)} {t("of", "admin.tenants.page.AdminTenantsPage.of__31ckols")} {tenantsData.total} {t("results", "admin.tenants.page.AdminTenantsPage.results__32ckols")}
              </div>
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                >
                  {t("Previous", "admin.tenants.page.AdminTenantsPage.previous__33ckols")}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(currentPage + 1)}
                  disabled={offset + limit >= (tenantsData?.total || 0)}
                >
                  {t("Next", "admin.tenants.page.AdminTenantsPage.next__34ckols")}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
