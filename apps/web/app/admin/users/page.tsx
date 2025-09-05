"use client";

import { useState, useMemo } from "react";
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
  GripVertical
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { BreadcrumbNavigation } from "@/components/BreadcrumbNavigation";
import Link from "next/link";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@ui/base";

// Removed TanStack Table for now - using simple table implementation

type User = {
  id: string;
  name: string | null;
  email: string | null;
  status: string;
  platformRole: string | null;
  createdAt: string;
};

export default function AdminUsersPage() {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [selectedRole, setSelectedRole] = useState<string>("all");
  const [globalFilter, setGlobalFilter] = useState("");
  
  const limit = 20;
  const offset = (currentPage - 1) * limit;

  const { data: usersData, isLoading } = trpc.getAllUsers.useQuery();

  // Filter users based on search and filters
  const filteredUsers = usersData?.filter(user => {
    const matchesSearch = !globalFilter || 
      user.name?.toLowerCase().includes(globalFilter.toLowerCase()) ||
      user.email?.toLowerCase().includes(globalFilter.toLowerCase());
    
    const matchesStatus = selectedStatus === "all" || 
      (selectedStatus === "active" && user.status === "active") ||
      (selectedStatus === "pending" && user.status === "pending");
    
    const matchesRole = selectedRole === "all" || user.platformRole === selectedRole;
    
    return matchesSearch && matchesStatus && matchesRole;
  }) || [];

  const handleCreateUser = () => {
    router.push("/admin/users/create");
  };

  const handleEditUser = (userId: string) => {
    router.push(`/admin/users/${userId}/edit`);
  };

  const handleViewUser = (userId: string) => {
    router.push(`/admin/users/${userId}`);
  };


  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
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
              Manage platform users across all tenants
            </p>
          </div>
          
          <Button onClick={handleCreateUser} className="flex items-center space-x-2">
            <Plus className="h-4 w-4" />
            <span>Add User</span>
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
                  placeholder="Search users by name or email..."
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
                    <option value="pending">Pending</option>
                    <option value="suspended">Suspended</option>
                  </select>
                  <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                </div>

                {/* Role Filter */}
                <div className="relative">
                  <select
                    value={selectedRole}
                    onChange={(e) => setSelectedRole(e.target.value)}
                    className="appearance-none bg-white border border-gray-300 rounded-lg px-3 py-2 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 hover:border-gray-400 transition-colors min-w-[120px]"
                  >
                    <option value="all">All Roles</option>
                    <option value="admin">Admin</option>
                    <option value="user">User</option>
                  </select>
                  <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                </div>

                {/* Clear Filters Button */}
                {(searchTerm || selectedStatus !== "all" || selectedRole !== "all") && (
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setSearchTerm("");
                      setSelectedStatus("all");
                      setSelectedRole("all");
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
          {(globalFilter || selectedStatus !== "all" || selectedRole !== "all") && (
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
                
                {selectedRole !== "all" && (
                  <Badge variant="secondary" className="bg-purple-100 text-purple-800 border-purple-200">
                    Role: {selectedRole}
                    <button
                      onClick={() => setSelectedRole("all")}
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

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Users className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Users</p>
                <p className="text-2xl font-bold text-gray-900">
                  {usersData?.length || 0}
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
                <p className="text-sm font-medium text-gray-600">Active Users</p>
                <p className="text-2xl font-bold text-gray-900">
                  {usersData?.filter(u => u.status === "active").length || 0}
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
                <p className="text-sm font-medium text-gray-600">Pending</p>
                <p className="text-2xl font-bold text-gray-900">
                  {usersData?.filter(u => u.status === "pending").length || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Shield className="h-8 w-8 text-purple-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Admins</p>
                <p className="text-2xl font-bold text-gray-900">
                  {usersData?.filter(u => u.platformRole === 'admin').length || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>All Users</CardTitle>
              <CardDescription>
                Manage all platform users and their permissions
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setGlobalFilter("");
                  setSelectedStatus("all");
                  setSelectedRole("all");
                }}
                className="h-8 px-3 text-xs"
              >
                Reset Filters
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {filteredUsers.length === 0 ? (
            <div className="text-center py-12">
              <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No users found</h3>
              <p className="text-gray-600 mb-6">
                {globalFilter ? "Try adjusting your search criteria" : "Get started by creating your first user"}
              </p>
              {!globalFilter && (
                <Button onClick={handleCreateUser}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create User
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Login</th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredUsers.map((user) => (
                      <tr key={user.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div className="flex items-center min-w-0">
                            <div className="h-10 w-10 flex-shrink-0">
                              <div className="h-10 w-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                                <span className="text-sm font-medium text-white">
                                  {user.name?.charAt(0) || user.email?.charAt(0).toUpperCase()}
                                </span>
                              </div>
                            </div>
                            <div className="ml-4 min-w-0 flex-1">
                              <div className="text-sm font-medium text-gray-900 truncate">
                                {user.name || "Unnamed User"}
                              </div>
                              <div className="text-sm text-gray-500 truncate" title={user.email || ""}>
                                {user.email || ""}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          {user.status === "active" ? (
                            <Badge className="bg-green-100 text-green-800">Active</Badge>
                          ) : (
                            <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Pending</Badge>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          {user.platformRole === "admin" ? (
                            <Badge className="bg-purple-100 text-purple-800">Admin</Badge>
                          ) : (
                            <Badge variant="outline" className="text-gray-600">User</Badge>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm text-gray-500">
                            {new Date(user.createdAt).toLocaleDateString()}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm text-gray-500">
                            {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : "Never"}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center space-x-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleViewUser(user.id)}
                              className="h-8 w-8 p-0"
                              title="View User"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditUser(user.id)}
                              className="h-8 w-8 p-0"
                              title="Edit User"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                              title="Delete User"
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
            </div>
          )}

          {/* Pagination */}
          {filteredUsers && filteredUsers.length > limit && (
            <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200">
              <div className="text-sm text-gray-700">
                Showing {Math.min(filteredUsers.length, limit)} of {filteredUsers.length} results
              </div>
              <div className="flex space-x-2">
                <span className="text-sm text-gray-500">Simple pagination - full pagination removed with TanStack Table</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}