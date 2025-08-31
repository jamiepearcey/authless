"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@ui/base";
import { Button, Input } from "@ui/base";
import { Badge } from "@ui/base";
import { 
  HelpCircle, 
  MessageSquare, 
  Clock, 
  CheckCircle, 
  AlertCircle,
  Users,
  TrendingUp,
  Mail,
  Search,
  Eye,
  Reply
} from "lucide-react";
import { BreadcrumbNavigation } from "@/components/BreadcrumbNavigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@ui/base";
import { trpc } from "@/lib/trpc";

export default function AdminSupportPage() {
  const [activeTab, setActiveTab] = useState("overview");
  const [searchTerm, setSearchTerm] = useState("");

  // Fetch support cases - using the same tRPC query as tenant admin
  const { data: supportCases, isLoading } = trpc.getAllCases.useQuery({
    limit: 50,
    offset: 0,
  });

  // Mock support metrics - would be replaced with real queries
  const supportMetrics = {
    totalCases: supportCases?.cases?.length || 0,
    openCases: supportCases?.cases?.filter(c => c.status === 'open').length || 0,
    pendingCases: supportCases?.cases?.filter(c => c.status === 'pending').length || 0,
    resolvedCases: supportCases?.cases?.filter(c => c.status === 'resolved').length || 0,
    averageResponseTime: "2.3 hours",
    customerSatisfaction: "4.8/5"
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "open":
        return <Badge variant="default" className="bg-blue-100 text-blue-800">Open</Badge>;
      case "pending":
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Pending</Badge>;
      case "resolved":
        return <Badge variant="default" className="bg-green-100 text-green-800">Resolved</Badge>;
      case "closed":
        return <Badge variant="outline" className="text-gray-600">Closed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case "urgent":
        return <Badge variant="destructive" className="bg-red-100 text-red-800">Urgent</Badge>;
      case "high":
        return <Badge variant="secondary" className="bg-orange-100 text-orange-800">High</Badge>;
      case "normal":
        return <Badge variant="outline" className="text-gray-600">Normal</Badge>;
      case "low":
        return <Badge variant="outline" className="text-gray-400">Low</Badge>;
      default:
        return <Badge variant="outline">{priority}</Badge>;
    }
  };

  const filteredCases = supportCases?.cases?.filter(supportCase =>
    supportCase.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
    supportCase.description.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center space-x-4 mb-4">
          <BreadcrumbNavigation
            items={[
              { label: "Platform Admin", href: "/admin" },
              { label: "Support Management", current: true },
            ]}
            showHome={false}
          />
        </div>
        
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center space-x-3">
              <HelpCircle className="h-8 w-8 text-indigo-600" />
              <span>Support Management</span>
            </h1>
            <p className="text-gray-600 mt-2">
              Manage platform-wide support cases and customer inquiries
            </p>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search support cases..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-64"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Support Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <MessageSquare className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Cases</p>
                <p className="text-2xl font-bold text-gray-900">{supportMetrics.totalCases}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <AlertCircle className="h-8 w-8 text-orange-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Open Cases</p>
                <p className="text-2xl font-bold text-gray-900">{supportMetrics.openCases}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Clock className="h-8 w-8 text-yellow-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Avg Response Time</p>
                <p className="text-2xl font-bold text-gray-900">{supportMetrics.averageResponseTime}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <CheckCircle className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Satisfaction</p>
                <p className="text-2xl font-bold text-gray-900">{supportMetrics.customerSatisfaction}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Support Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <HelpCircle className="h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="cases" className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            All Cases
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Analytics
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Mail className="h-4 w-4" />
            Settings
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Recent Cases */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Support Cases</CardTitle>
                <CardDescription>Latest support inquiries across all tenants</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {supportCases?.cases?.slice(0, 5).map((supportCase) => (
                    <div key={supportCase.id} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                      <MessageSquare className="h-5 w-5 text-indigo-600 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2 mb-1">
                          {getStatusBadge(supportCase.status)}
                          {getPriorityBadge(supportCase.priority || 'normal')}
                        </div>
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {supportCase.subject}
                        </p>
                        <p className="text-xs text-gray-600">
                          {supportCase.description?.substring(0, 100)}...
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {new Date(supportCase.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <Button variant="outline" size="sm">
                        <Eye className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Support Statistics */}
            <Card>
              <CardHeader>
                <CardTitle>Support Statistics</CardTitle>
                <CardDescription>Key metrics and performance indicators</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Resolution Rate</span>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-bold text-green-600">94.2%</span>
                      <div className="w-16 h-2 bg-gray-200 rounded-full">
                        <div className="h-2 bg-green-600 rounded-full" style={{width: '94%'}}></div>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">First Response Time</span>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-bold text-blue-600">1.8h</span>
                      <div className="w-16 h-2 bg-gray-200 rounded-full">
                        <div className="h-2 bg-blue-600 rounded-full" style={{width: '75%'}}></div>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Cases This Week</span>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-bold text-purple-600">47</span>
                      <TrendingUp className="h-3 w-3 text-green-600" />
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Customer Satisfaction</span>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-bold text-yellow-600">4.8/5</span>
                      <div className="flex space-x-1">
                        {[...Array(5)].map((_, i) => (
                          <div key={i} className={`w-2 h-2 rounded-full ${i < 5 ? 'bg-yellow-400' : 'bg-gray-200'}`}></div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* All Cases Tab */}
        <TabsContent value="cases" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>All Support Cases</CardTitle>
              <CardDescription>Complete list of support cases across all tenants</CardDescription>
            </CardHeader>
            <CardContent>
              {filteredCases.length === 0 ? (
                <div className="text-center py-12">
                  <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No support cases found</h3>
                  <p className="text-gray-600">
                    {searchTerm ? "Try adjusting your search criteria" : "No support cases have been created yet"}
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-3 px-4 font-semibold text-gray-700">Case</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-700">Status</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-700">Priority</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-700">Tenant</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-700">Created</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-700">Updated</th>
                        <th className="text-right py-3 px-4 font-semibold text-gray-700">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredCases.map((supportCase) => (
                        <tr key={supportCase.id} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="py-4 px-4">
                            <div>
                              <p className="font-medium text-gray-900">{supportCase.subject}</p>
                              <p className="text-sm text-gray-600 truncate max-w-xs">
                                {supportCase.description?.substring(0, 60)}...
                              </p>
                            </div>
                          </td>
                          <td className="py-4 px-4">
                            {getStatusBadge(supportCase.status)}
                          </td>
                          <td className="py-4 px-4">
                            {getPriorityBadge(supportCase.priority || 'normal')}
                          </td>
                          <td className="py-4 px-4">
                            <span className="text-gray-900">{supportCase.tenantId}</span>
                          </td>
                          <td className="py-4 px-4">
                            <span className="text-gray-600">
                              {new Date(supportCase.createdAt).toLocaleDateString()}
                            </span>
                          </td>
                          <td className="py-4 px-4">
                            <span className="text-gray-600">
                              {new Date(supportCase.updatedAt).toLocaleDateString()}
                            </span>
                          </td>
                          <td className="py-4 px-4">
                            <div className="flex items-center justify-end space-x-2">
                              <Button variant="ghost" size="sm">
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="sm">
                                <Reply className="h-4 w-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Case Volume Trends</CardTitle>
                <CardDescription>Support case volume over time</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg">
                  <p className="text-gray-600">Chart visualization would go here</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Response Time Analysis</CardTitle>
                <CardDescription>Average response times by priority</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Urgent Cases</span>
                    <span className="text-sm font-bold">0.8 hours</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">High Priority</span>
                    <span className="text-sm font-bold">2.1 hours</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Normal Priority</span>
                    <span className="text-sm font-bold">4.5 hours</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Low Priority</span>
                    <span className="text-sm font-bold">12.3 hours</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Support Configuration</CardTitle>
              <CardDescription>Configure platform-wide support settings</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div>
                  <h4 className="font-medium mb-4">Email Integration</h4>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">Email Routing</p>
                        <p className="text-xs text-gray-600">Configure email-to-case routing</p>
                      </div>
                      <Button variant="outline" size="sm">Configure</Button>
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">Auto-Reply Templates</p>
                        <p className="text-xs text-gray-600">Manage automated response templates</p>
                      </div>
                      <Button variant="outline" size="sm">Manage</Button>
                    </div>
                  </div>
                </div>

                <div className="border-t pt-6">
                  <h4 className="font-medium mb-4">SLA Settings</h4>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">Response Time Targets</p>
                        <p className="text-xs text-gray-600">Set SLA targets for different priorities</p>
                      </div>
                      <Button variant="outline" size="sm">Configure</Button>
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">Escalation Rules</p>
                        <p className="text-xs text-gray-600">Automatic case escalation policies</p>
                      </div>
                      <Button variant="outline" size="sm">Set Rules</Button>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}