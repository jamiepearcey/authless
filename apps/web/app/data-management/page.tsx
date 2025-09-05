"use client";

import { useState, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, Button, Badge, Input, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@ui/base";
import { 
  Database, 
  Search, 
  Filter, 
  Download, 
  Upload, 
  RefreshCw,
  MoreHorizontal,
  Eye,
  Edit,
  Trash2,
  Archive,
  MessageSquare,
  History,
  User,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Calendar,
  Tag,
  FileText,
  Settings,
  X,
  ChevronLeft,
  ChevronRight,
  Send,
  Plus,
  Building2
} from "lucide-react";
import { BreadcrumbNavigation } from "@/components/BreadcrumbNavigation";

// Mock data types
interface DataRecord {
  id: string;
  name: string;
  email: string;
  status: 'active' | 'inactive' | 'pending' | 'suspended';
  department: string;
  role: string;
  createdAt: string;
  lastModified: string;
  tags: string[];
}

interface AuditEntry {
  id: string;
  action: string;
  user: string;
  timestamp: string;
  details: string;
  changes?: { field: string; oldValue: string; newValue: string }[];
}

interface Comment {
  id: string;
  user: string;
  avatar: string;
  content: string;
  timestamp: string;
  isEdited?: boolean;
}

// Mock data
const mockData: DataRecord[] = [
  {
    id: '1',
    name: 'John Smith',
    email: 'john.smith@company.com',
    status: 'active',
    department: 'Engineering',
    role: 'Senior Developer',
    createdAt: '2024-01-15T10:30:00Z',
    lastModified: '2024-03-10T14:22:00Z',
    tags: ['senior', 'fullstack', 'team-lead']
  },
  {
    id: '2',
    name: 'Sarah Johnson',
    email: 'sarah.johnson@company.com',
    status: 'pending',
    department: 'Marketing',
    role: 'Marketing Manager',
    createdAt: '2024-02-20T09:15:00Z',
    lastModified: '2024-03-08T16:45:00Z',
    tags: ['manager', 'campaigns']
  },
  {
    id: '3',
    name: 'Mike Davis',
    email: 'mike.davis@company.com',
    status: 'suspended',
    department: 'Sales',
    role: 'Sales Representative',
    createdAt: '2024-01-08T11:20:00Z',
    lastModified: '2024-03-05T13:30:00Z',
    tags: ['sales', 'enterprise']
  },
  {
    id: '4',
    name: 'Emily Chen',
    email: 'emily.chen@company.com',
    status: 'active',
    department: 'Engineering',
    role: 'Frontend Developer',
    createdAt: '2024-02-12T08:45:00Z',
    lastModified: '2024-03-12T10:15:00Z',
    tags: ['frontend', 'react', 'ui-ux']
  },
  {
    id: '5',
    name: 'David Wilson',
    email: 'david.wilson@company.com',
    status: 'inactive',
    department: 'HR',
    role: 'HR Specialist',
    createdAt: '2024-01-25T14:30:00Z',
    lastModified: '2024-02-28T11:20:00Z',
    tags: ['hr', 'onboarding']
  }
];

const mockAuditHistory: AuditEntry[] = [
  {
    id: '1',
    action: 'Status Changed',
    user: 'Admin User',
    timestamp: '2024-03-12T10:15:00Z',
    details: 'Status changed from pending to active',
    changes: [{ field: 'status', oldValue: 'pending', newValue: 'active' }]
  },
  {
    id: '2',
    action: 'Profile Updated',
    user: 'John Smith',
    timestamp: '2024-03-10T14:22:00Z',
    details: 'Updated department and role information',
    changes: [
      { field: 'department', oldValue: 'Support', newValue: 'Engineering' },
      { field: 'role', oldValue: 'Support Engineer', newValue: 'Senior Developer' }
    ]
  },
  {
    id: '3',
    action: 'Record Created',
    user: 'HR System',
    timestamp: '2024-01-15T10:30:00Z',
    details: 'Initial record creation during onboarding process'
  }
];

const mockComments: Comment[] = [
  {
    id: '1',
    user: 'Alice Manager',
    avatar: 'AM',
    content: 'Great performance in the last sprint. Ready for promotion discussion.',
    timestamp: '2024-03-11T15:30:00Z'
  },
  {
    id: '2',
    user: 'Bob HR',
    avatar: 'BH',
    content: 'Completed all required certifications. Documentation updated.',
    timestamp: '2024-03-09T11:45:00Z',
    isEdited: true
  },
  {
    id: '3',
    user: 'Carol Tech Lead',
    avatar: 'CT',
    content: 'Leading the new authentication project. Excellent technical leadership skills.',
    timestamp: '2024-03-08T09:20:00Z'
  }
];

export default function DataManagementPage() {
  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  const [selectedRecord, setSelectedRecord] = useState<DataRecord | null>(null);
  const [sidebarTab, setSidebarTab] = useState<'details' | 'audit' | 'comments'>('details');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [departmentFilter, setDepartmentFilter] = useState<string>('all');
  const [newComment, setNewComment] = useState('');

  // Get unique departments for filter
  const departments = [...new Set(mockData.map(item => item.department))];

  // Filter data based on search and filters
  const filteredData = mockData.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.role.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
    const matchesDepartment = departmentFilter === 'all' || item.department === departmentFilter;
    
    return matchesSearch && matchesStatus && matchesDepartment;
  });

  const handleRowSelect = (id: string) => {
    setSelectedRows(prev => 
      prev.includes(id) 
        ? prev.filter(rowId => rowId !== id)
        : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedRows.length === filteredData.length) {
      setSelectedRows([]);
    } else {
      setSelectedRows(filteredData.map(item => item.id));
    }
  };

  const handleRecordClick = (record: DataRecord) => {
    setSelectedRecord(record);
    setSidebarTab('details');
  };

  const handleCloseSidebar = () => {
    setSelectedRecord(null);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      active: 'bg-green-100 text-green-800',
      inactive: 'bg-gray-100 text-gray-800',
      pending: 'bg-yellow-100 text-yellow-800',
      suspended: 'bg-red-100 text-red-800'
    };
    
    const icons = {
      active: CheckCircle,
      inactive: XCircle,
      pending: Clock,
      suspended: AlertCircle
    };

    const Icon = icons[status as keyof typeof icons] || AlertCircle;
    
    return (
      <Badge className={`${variants[status as keyof typeof variants]} flex items-center gap-1`}>
        <Icon className="h-3 w-3" />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const handleAddComment = () => {
    if (!newComment.trim()) return;
    
    // In real app, this would make an API call
    console.log('Adding comment:', newComment);
    setNewComment('');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <BreadcrumbNavigation
            items={[
              { label: "Data Management", current: true },
            ]}
            showHome={true}
          />
          <div className="mt-4">
            <h1 className="text-3xl font-bold text-gray-900 flex items-center space-x-3">
              <Database className="h-8 w-8 text-indigo-600" />
              <span>Data Management</span>
            </h1>
            <p className="text-gray-600 mt-2">
              Advanced data management with detailed records, audit history, and collaborative features
            </p>
          </div>
        </div>

        <div className="flex gap-6">
          {/* Main Content */}
          <div className={`transition-all duration-300 ${selectedRecord ? 'flex-1' : 'w-full'}`}>
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Employee Records</CardTitle>
                    <CardDescription>
                      {filteredData.length} records found
                      {selectedRows.length > 0 && ` • ${selectedRows.length} selected`}
                    </CardDescription>
                  </div>
                  
                  {/* Toolbar with Batch Actions */}
                  <div className="flex items-center space-x-2">
                    {selectedRows.length > 0 && (
                      <div className="flex items-center space-x-2 px-3 py-1 bg-indigo-50 rounded-lg border border-indigo-200">
                        <span className="text-sm font-medium text-indigo-700">
                          {selectedRows.length} selected
                        </span>
                        <div className="flex items-center space-x-1">
                          <Button variant="outline" size="sm" className="h-7">
                            <Archive className="h-3 w-3 mr-1" />
                            Archive
                          </Button>
                          <Button variant="outline" size="sm" className="h-7">
                            <Download className="h-3 w-3 mr-1" />
                            Export
                          </Button>
                          <Button variant="outline" size="sm" className="h-7 text-red-600 hover:bg-red-50">
                            <Trash2 className="h-3 w-3 mr-1" />
                            Delete
                          </Button>
                        </div>
                      </div>
                    )}
                    
                    <Button variant="outline" size="sm">
                      <Upload className="h-4 w-4 mr-2" />
                      Import
                    </Button>
                    <Button variant="outline" size="sm">
                      <Download className="h-4 w-4 mr-2" />
                      Export
                    </Button>
                    <Button variant="outline" size="sm">
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Refresh
                    </Button>
                    <Button size="sm">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Record
                    </Button>
                  </div>
                </div>
              </CardHeader>

              <CardContent>
                {/* Search and Filters */}
                <div className="flex items-center space-x-4 mb-6">
                  <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search records..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                  
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="All Statuses" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="suspended">Suspended</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="All Departments" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Departments</SelectItem>
                      {departments.map(dept => (
                        <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Data Grid */}
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="w-12 p-3">
                          <input
                            type="checkbox"
                            checked={selectedRows.length === filteredData.length && filteredData.length > 0}
                            onChange={handleSelectAll}
                            className="rounded border-gray-300"
                          />
                        </th>
                        <th className="text-left p-3 font-medium text-gray-900">Name</th>
                        <th className="text-left p-3 font-medium text-gray-900">Email</th>
                        <th className="text-left p-3 font-medium text-gray-900">Department</th>
                        <th className="text-left p-3 font-medium text-gray-900">Role</th>
                        <th className="text-left p-3 font-medium text-gray-900">Status</th>
                        <th className="text-left p-3 font-medium text-gray-900">Last Modified</th>
                        <th className="w-16 p-3"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {filteredData.map((record) => (
                        <tr 
                          key={record.id} 
                          className="hover:bg-gray-50 cursor-pointer"
                          onClick={() => handleRecordClick(record)}
                        >
                          <td className="p-3" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              checked={selectedRows.includes(record.id)}
                              onChange={() => handleRowSelect(record.id)}
                              className="rounded border-gray-300"
                            />
                          </td>
                          <td className="p-3">
                            <div className="flex items-center space-x-3">
                              <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center">
                                <span className="text-sm font-medium text-indigo-600">
                                  {record.name.split(' ').map(n => n[0]).join('')}
                                </span>
                              </div>
                              <div>
                                <div className="font-medium text-gray-900">{record.name}</div>
                                <div className="flex items-center space-x-1 mt-1">
                                  {record.tags.map(tag => (
                                    <Badge key={tag} variant="secondary" className="text-xs px-2 py-0">
                                      {tag}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="p-3 text-gray-600">{record.email}</td>
                          <td className="p-3 text-gray-600">{record.department}</td>
                          <td className="p-3 text-gray-600">{record.role}</td>
                          <td className="p-3">{getStatusBadge(record.status)}</td>
                          <td className="p-3 text-gray-600 text-sm">{formatDate(record.lastModified)}</td>
                          <td className="p-3" onClick={(e) => e.stopPropagation()}>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                <div className="flex items-center justify-between mt-4">
                  <div className="text-sm text-gray-600">
                    Showing 1 to {filteredData.length} of {filteredData.length} results
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button variant="outline" size="sm" disabled>
                      <ChevronLeft className="h-4 w-4" />
                      Previous
                    </Button>
                    <Button variant="outline" size="sm" disabled>
                      Next
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Full Side Panel */}
          {selectedRecord && (
            <div className="w-2/5 bg-white border-l shadow-lg h-screen sticky top-0 flex flex-col">
              <div className="p-6 border-b bg-gray-50">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900">Record Details</h3>
                    <p className="text-sm text-gray-600 mt-1">Complete employee information and history</p>
                  </div>
                  <Button variant="ghost" size="sm" onClick={handleCloseSidebar}>
                    <X className="h-5 w-5" />
                  </Button>
                </div>
                
                {/* Enhanced Profile Header */}
                <div className="flex items-start space-x-4 mb-6">
                  <div className="w-16 h-16 bg-indigo-100 rounded-xl flex items-center justify-center">
                    <span className="text-xl font-semibold text-indigo-600">
                      {selectedRecord.name.split(' ').map(n => n[0]).join('')}
                    </span>
                  </div>
                  <div className="flex-1">
                    <h4 className="text-lg font-semibold text-gray-900">{selectedRecord.name}</h4>
                    <p className="text-sm text-gray-600 mb-2">{selectedRecord.role}</p>
                    <div className="flex items-center space-x-2">
                      {getStatusBadge(selectedRecord.status)}
                      <Badge variant="secondary" className="text-xs">
                        ID: {selectedRecord.id}
                      </Badge>
                    </div>
                  </div>
                </div>
                
                {/* Tab Navigation */}
                <div className="flex space-x-1 bg-white rounded-lg p-1 border">
                  <button
                    className={`flex-1 flex items-center justify-center py-3 px-4 rounded-md text-sm font-medium transition-colors ${
                      sidebarTab === 'details' ? 'bg-indigo-50 text-indigo-700 shadow-sm' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                    }`}
                    onClick={() => setSidebarTab('details')}
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    Details
                  </button>
                  <button
                    className={`flex-1 flex items-center justify-center py-3 px-4 rounded-md text-sm font-medium transition-colors ${
                      sidebarTab === 'audit' ? 'bg-indigo-50 text-indigo-700 shadow-sm' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                    }`}
                    onClick={() => setSidebarTab('audit')}
                  >
                    <History className="h-4 w-4 mr-2" />
                    Audit History
                  </button>
                  <button
                    className={`flex-1 flex items-center justify-center py-3 px-4 rounded-md text-sm font-medium transition-colors ${
                      sidebarTab === 'comments' ? 'bg-indigo-50 text-indigo-700 shadow-sm' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                    }`}
                    onClick={() => setSidebarTab('comments')}
                  >
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Comments ({mockComments.length})
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-6">
                {/* Details Tab */}
                {sidebarTab === 'details' && (
                  <div className="space-y-8">
                    {/* Contact Information */}
                    <div>
                      <h5 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                        <User className="h-5 w-5 mr-2 text-indigo-600" />
                        Contact Information
                      </h5>
                      <div className="grid grid-cols-1 gap-6">
                        <div className="bg-gray-50 rounded-lg p-4">
                          <label className="text-sm font-medium text-gray-500 block mb-2">Email Address</label>
                          <div className="flex items-center space-x-2">
                            <p className="text-base text-gray-900 font-medium">{selectedRecord.email}</p>
                            <Button variant="ghost" size="sm">
                              <Send className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-4">
                          <label className="text-sm font-medium text-gray-500 block mb-2">Phone Number</label>
                          <p className="text-base text-gray-900 font-medium">+1 (555) 123-4567</p>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-4">
                          <label className="text-sm font-medium text-gray-500 block mb-2">Location</label>
                          <p className="text-base text-gray-900 font-medium">San Francisco, CA</p>
                        </div>
                      </div>
                    </div>

                    {/* Employment Details */}
                    <div>
                      <h5 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                        <Building2 className="h-5 w-5 mr-2 text-indigo-600" />
                        Employment Details
                      </h5>
                      <div className="grid grid-cols-1 gap-6">
                        <div className="bg-gray-50 rounded-lg p-4">
                          <label className="text-sm font-medium text-gray-500 block mb-2">Department</label>
                          <p className="text-base text-gray-900 font-medium">{selectedRecord.department}</p>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-4">
                          <label className="text-sm font-medium text-gray-500 block mb-2">Job Title</label>
                          <p className="text-base text-gray-900 font-medium">{selectedRecord.role}</p>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-4">
                          <label className="text-sm font-medium text-gray-500 block mb-2">Employee ID</label>
                          <p className="text-base text-gray-900 font-medium">EMP-{selectedRecord.id}</p>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-4">
                          <label className="text-sm font-medium text-gray-500 block mb-2">Status</label>
                          <div className="mt-2">{getStatusBadge(selectedRecord.status)}</div>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-4">
                          <label className="text-sm font-medium text-gray-500 block mb-2">Manager</label>
                          <p className="text-base text-gray-900 font-medium">Sarah Johnson</p>
                        </div>
                      </div>
                    </div>

                    {/* Tags & Labels */}
                    <div>
                      <h5 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                        <Tag className="h-5 w-5 mr-2 text-indigo-600" />
                        Tags & Skills
                      </h5>
                      <div className="bg-gray-50 rounded-lg p-4">
                        <div className="flex flex-wrap gap-2">
                          {selectedRecord.tags.map(tag => (
                            <Badge key={tag} className="bg-indigo-100 text-indigo-800 hover:bg-indigo-200 transition-colors">
                              <Tag className="h-3 w-3 mr-1" />
                              {tag}
                            </Badge>
                          ))}
                          <Button variant="ghost" size="sm" className="h-6 px-2 text-xs">
                            <Plus className="h-3 w-3 mr-1" />
                            Add Tag
                          </Button>
                        </div>
                      </div>
                    </div>

                    {/* System Information */}
                    <div>
                      <h5 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                        <Clock className="h-5 w-5 mr-2 text-indigo-600" />
                        System Information
                      </h5>
                      <div className="grid grid-cols-1 gap-6">
                        <div className="bg-gray-50 rounded-lg p-4">
                          <label className="text-sm font-medium text-gray-500 block mb-2">Created Date</label>
                          <p className="text-base text-gray-900 font-medium flex items-center">
                            <Calendar className="h-4 w-4 mr-2 text-gray-400" />
                            {formatDate(selectedRecord.createdAt)}
                          </p>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-4">
                          <label className="text-sm font-medium text-gray-500 block mb-2">Last Modified</label>
                          <p className="text-base text-gray-900 font-medium flex items-center">
                            <Clock className="h-4 w-4 mr-2 text-gray-400" />
                            {formatDate(selectedRecord.lastModified)}
                          </p>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-4">
                          <label className="text-sm font-medium text-gray-500 block mb-2">Last Login</label>
                          <p className="text-base text-gray-900 font-medium flex items-center">
                            <Clock className="h-4 w-4 mr-2 text-gray-400" />
                            March 12, 2024 at 2:30 PM
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="grid grid-cols-2 gap-4 pt-6 border-t">
                      <Button className="h-12">
                        <Edit className="h-4 w-4 mr-2" />
                        Edit Record
                      </Button>
                      <Button variant="outline" className="h-12">
                        <Settings className="h-4 w-4 mr-2" />
                        Settings
                      </Button>
                      <Button variant="outline" className="h-12">
                        <Send className="h-4 w-4 mr-2" />
                        Send Message
                      </Button>
                      <Button variant="outline" className="h-12 text-red-600 hover:bg-red-50 hover:border-red-300">
                        <Archive className="h-4 w-4 mr-2" />
                        Archive
                      </Button>
                    </div>
                  </div>
                )}

                {/* Audit History Tab */}
                {sidebarTab === 'audit' && (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <h5 className="text-lg font-semibold text-gray-900 flex items-center">
                          <History className="h-5 w-5 mr-2 text-indigo-600" />
                          Audit History
                        </h5>
                        <p className="text-sm text-gray-600 mt-1">Complete activity log for this record</p>
                      </div>
                      <Button variant="outline" size="sm">
                        <Download className="h-4 w-4 mr-2" />
                        Export Log
                      </Button>
                    </div>

                    {/* Timeline */}
                    <div className="relative">
                      {mockAuditHistory.map((entry, index) => (
                        <div key={entry.id} className="relative pb-8">
                          {index !== mockAuditHistory.length - 1 && (
                            <div className="absolute left-5 top-12 bottom-0 w-0.5 bg-gray-200"></div>
                          )}
                          
                          <div className="relative flex items-start space-x-4">
                            <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center flex-shrink-0 ring-4 ring-white border-2 border-indigo-200">
                              {entry.action === 'Status Changed' && <AlertCircle className="h-5 w-5 text-indigo-600" />}
                              {entry.action === 'Profile Updated' && <Edit className="h-5 w-5 text-indigo-600" />}
                              {entry.action === 'Record Created' && <Plus className="h-5 w-5 text-indigo-600" />}
                            </div>
                            
                            <div className="flex-1 min-w-0 bg-white rounded-lg border p-4 shadow-sm">
                              <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center space-x-2">
                                  <h6 className="text-base font-semibold text-gray-900">{entry.action}</h6>
                                  <Badge variant="secondary" className="text-xs px-2 py-1">
                                    <User className="h-3 w-3 mr-1" />
                                    {entry.user}
                                  </Badge>
                                </div>
                                <div className="text-xs text-gray-500 flex items-center">
                                  <Clock className="h-3 w-3 mr-1" />
                                  {formatDate(entry.timestamp)}
                                </div>
                              </div>
                              
                              <p className="text-sm text-gray-700 mb-3">{entry.details}</p>
                              
                              {entry.changes && (
                                <div className="space-y-2">
                                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Field Changes</p>
                                  {entry.changes.map((change, changeIndex) => (
                                    <div key={changeIndex} className="bg-gray-50 rounded-lg p-3">
                                      <div className="flex items-center justify-between mb-2">
                                        <span className="text-sm font-medium text-gray-900">{change.field}</span>
                                        <Badge variant="outline" className="text-xs">Modified</Badge>
                                      </div>
                                      <div className="grid grid-cols-2 gap-4">
                                        <div>
                                          <p className="text-xs text-gray-500 mb-1">Previous Value</p>
                                          <p className="text-sm text-red-600 bg-red-50 px-2 py-1 rounded border">
                                            {change.oldValue}
                                          </p>
                                        </div>
                                        <div>
                                          <p className="text-xs text-gray-500 mb-1">New Value</p>
                                          <p className="text-sm text-green-600 bg-green-50 px-2 py-1 rounded border">
                                            {change.newValue}
                                          </p>
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                              
                              {!entry.changes && (
                                <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
                                  <div className="flex items-center">
                                    <AlertCircle className="h-4 w-4 text-blue-600 mr-2" />
                                    <span className="text-sm text-blue-800">System generated event - no field changes</span>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Load More */}
                    <div className="text-center pt-4 border-t">
                      <Button variant="outline" className="w-full">
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Load Earlier History
                      </Button>
                    </div>
                  </div>
                )}

                {/* Comments Tab */}
                {sidebarTab === 'comments' && (
                  <div className="space-y-6 flex flex-col h-full">
                    <div className="flex items-center justify-between">
                      <div>
                        <h5 className="text-lg font-semibold text-gray-900 flex items-center">
                          <MessageSquare className="h-5 w-5 mr-2 text-indigo-600" />
                          Comments & Notes
                        </h5>
                        <p className="text-sm text-gray-600 mt-1">{mockComments.length} comments • Collaborative discussion</p>
                      </div>
                      <Button variant="outline" size="sm">
                        <Settings className="h-4 w-4 mr-2" />
                        Settings
                      </Button>
                    </div>

                    {/* Add Comment Form */}
                    <div className="bg-gray-50 rounded-lg p-4 border">
                      <label className="text-sm font-semibold text-gray-900 block mb-3">Add New Comment</label>
                      <div className="space-y-3">
                        <textarea
                          value={newComment}
                          onChange={(e) => setNewComment(e.target.value)}
                          placeholder="Share your thoughts, feedback, or notes about this record..."
                          className="w-full px-4 py-3 border rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
                          rows={4}
                        />
                        <div className="flex items-center justify-between">
                          <div className="text-xs text-gray-500">
                            Supports <strong>**bold**</strong> and <em>*italic*</em> formatting
                          </div>
                          <div className="flex space-x-2">
                            <Button variant="outline" size="sm" disabled={!newComment.trim()}>
                              <FileText className="h-4 w-4 mr-2" />
                              Save Draft
                            </Button>
                            <Button size="sm" onClick={handleAddComment} disabled={!newComment.trim()}>
                              <Send className="h-4 w-4 mr-2" />
                              Post Comment
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Comments Feed */}
                    <div className="flex-1 space-y-4">
                      <div className="flex items-center justify-between">
                        <h6 className="text-sm font-semibold text-gray-900">
                          Recent Comments ({mockComments.length})
                        </h6>
                        <Select defaultValue="newest">
                          <SelectTrigger className="w-32 h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="newest">Newest First</SelectItem>
                            <SelectItem value="oldest">Oldest First</SelectItem>
                            <SelectItem value="relevant">Most Relevant</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      {mockComments.map((comment, index) => (
                        <div key={comment.id} className="bg-white border rounded-lg p-4 hover:shadow-sm transition-shadow">
                          <div className="flex items-start space-x-4">
                            <div className="w-10 h-10 bg-gradient-to-br from-indigo-100 to-indigo-200 rounded-full flex items-center justify-center flex-shrink-0 ring-2 ring-white">
                              <span className="text-sm font-semibold text-indigo-700">
                                {comment.avatar}
                              </span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center space-x-3">
                                  <h6 className="text-sm font-semibold text-gray-900">{comment.user}</h6>
                                  <div className="flex items-center space-x-2">
                                    {comment.user.includes('Manager') && (
                                      <Badge className="text-xs px-2 py-0.5 bg-purple-100 text-purple-800">Manager</Badge>
                                    )}
                                    {comment.user.includes('HR') && (
                                      <Badge className="text-xs px-2 py-0.5 bg-green-100 text-green-800">HR</Badge>
                                    )}
                                    {comment.user.includes('Tech Lead') && (
                                      <Badge className="text-xs px-2 py-0.5 bg-blue-100 text-blue-800">Tech Lead</Badge>
                                    )}
                                    {comment.isEdited && (
                                      <Badge variant="outline" className="text-xs px-2 py-0.5">edited</Badge>
                                    )}
                                  </div>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <div className="text-xs text-gray-500 flex items-center">
                                    <Clock className="h-3 w-3 mr-1" />
                                    {formatDate(comment.timestamp)}
                                  </div>
                                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                                    <MoreHorizontal className="h-3 w-3" />
                                  </Button>
                                </div>
                              </div>
                              
                              <div className="prose prose-sm max-w-none">
                                <p className="text-sm text-gray-700 leading-relaxed mb-3">{comment.content}</p>
                              </div>
                              
                              <div className="flex items-center space-x-4 text-xs">
                                <button className="text-gray-500 hover:text-indigo-600 flex items-center">
                                  <MessageSquare className="h-3 w-3 mr-1" />
                                  Reply
                                </button>
                                <button className="text-gray-500 hover:text-indigo-600 flex items-center">
                                  <Edit className="h-3 w-3 mr-1" />
                                  Edit
                                </button>
                                <button className="text-gray-500 hover:text-red-600 flex items-center">
                                  <Trash2 className="h-3 w-3 mr-1" />
                                  Delete
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Load More Comments */}
                    <div className="text-center pt-4 border-t">
                      <Button variant="outline" className="w-full">
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Load More Comments
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}