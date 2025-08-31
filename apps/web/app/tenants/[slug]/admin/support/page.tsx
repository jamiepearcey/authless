"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle,
  Button,
  Input,
  Badge,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@ui/base";
import { 
  Search,
  Plus,
  Filter,
  Download,
  MessageSquare,
  Clock,
  User,
  Calendar,
  ExternalLink,
  AlertCircle,
  CheckCircle,
  XCircle,
  Pause,
  ArrowLeft,
  HeadphonesIcon,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { BreadcrumbNavigation } from "@/components/BreadcrumbNavigation";

// Status badge component
const StatusBadge = ({ status }: { status: string }) => {
  const variants: Record<string, { variant: any; icon: any; color: string }> = {
    OPEN: { variant: "default", icon: AlertCircle, color: "text-blue-600" },
    PENDING: { variant: "secondary", icon: Pause, color: "text-yellow-600" },
    RESOLVED: { variant: "secondary", icon: CheckCircle, color: "text-green-600" },
    CLOSED: { variant: "outline", icon: XCircle, color: "text-gray-600" },
  };

  const config = variants[status] || variants.OPEN;
  const Icon = config.icon;

  return (
    <Badge variant={config.variant} className="flex items-center gap-1">
      <Icon className={`h-3 w-3 ${config.color}`} />
      {status}
    </Badge>
  );
};

// Priority badge component
const PriorityBadge = ({ priority }: { priority: string }) => {
  const variants: Record<string, { color: string; bg: string }> = {
    LOW: { color: "text-gray-600", bg: "bg-gray-100" },
    NORMAL: { color: "text-blue-600", bg: "bg-blue-100" },
    HIGH: { color: "text-orange-600", bg: "bg-orange-100" },
    URGENT: { color: "text-red-600", bg: "bg-red-100" },
  };

  const config = variants[priority] || variants.NORMAL;

  return (
    <Badge className={`${config.color} ${config.bg} border-0`}>
      {priority}
    </Badge>
  );
};

interface SupportCase {
  id: string;
  caseNumber: string;
  title: string;
  status: string;
  priority: string;
  createdAt: string;
  updatedAt: string;
  assignee?: {
    id: string;
    name: string | null;
    email: string | null;
  } | null;
  contactMessage?: {
    name: string;
    email: string;
    subject: string;
  } | null;
  supportOption?: {
    key: string;
    label: string;
    icon: string | null;
  } | null;
  _count?: {
    messages: number;
  };
}

export default function TenantSupportPage() {
  const params = useParams();
  const tenantSlug = params.slug as string;
  
  const [activeTab, setActiveTab] = useState("cases");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");

  // Get tenant data first to get the actual tenant ID
  const { data: tenant } = trpc.getTenant.useQuery(
    { slug: tenantSlug },
    { enabled: !!tenantSlug }
  );

  // tRPC queries - use supportCaseRouter.getAllCases for full data
  const { data: allCases, isLoading } = trpc.getAllCases.useQuery(
    { 
      tenantId: tenant?.id,
      page: 1,
      pageSize: 100 // Get all cases for now
    },
    { enabled: !!tenant?.id }
  );

  // Get case metrics for dashboard cards
  const { data: metricsData } = trpc.getCaseMetrics.useQuery({
    dateFrom: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
    dateTo: new Date(),
    tenantId: tenant?.id,
  }, { enabled: !!tenant?.id });

  // Get tenant support routing configuration
  const { data: supportRouting, refetch: refetchRouting } = trpc.getTenantSupportRouting.useQuery(
    { tenantId: tenant?.id || "" },
    { enabled: !!tenant?.id }
  );

  // Mutation for updating support routing
  const updateSupportRouting = trpc.upsertTenantSupportRouting.useMutation({
    onSuccess: () => {
      refetchRouting();
    },
    onError: (error) => {
      console.error("Failed to update support routing:", error);
    },
  });

  const getTimeAgo = (dateString: string) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return "Just now";
    if (diffInHours < 24) return `${diffInHours}h ago`;
    return `${Math.floor(diffInHours / 24)}d ago`;
  };

  // Filter cases based on search and filters
  const filteredCases = allCases?.cases?.filter((supportCase: any) => {
    const matchesSearch = searchTerm === "" || 
      supportCase.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      supportCase.caseNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      supportCase.contactMessage?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      supportCase.contactMessage?.email?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === "all" || supportCase.status === statusFilter;
    const matchesPriority = priorityFilter === "all" || supportCase.priority === priorityFilter;

    return matchesSearch && matchesStatus && matchesPriority;
  }) || [];

  if (isLoading) {
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
          <div>
            <div className="flex items-center space-x-4 mb-4">
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
                  { label: "Support", current: true },
                ]}
                showHome={false}
              />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center space-x-3">
              <HeadphonesIcon className="h-8 w-8 text-indigo-600" />
              <span>Support Management</span>
            </h1>
            <p className="text-gray-600 mt-2">
              Manage support cases and customer inquiries for this workspace
            </p>
          </div>
          
          <div className="flex items-center space-x-3">
            <Button variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Case
            </Button>
          </div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="cases" className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Support Cases
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Analytics
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            Support Settings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="cases" className="space-y-6">
          {/* Metrics Cards */}
          {metricsData && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Total Cases</p>
                      <p className="text-2xl font-bold">{metricsData.summary.totalCases}</p>
                    </div>
                    <MessageSquare className="h-8 w-8 text-blue-600" />
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Open Cases</p>
                      <p className="text-2xl font-bold text-orange-600">{metricsData.summary.openCases}</p>
                    </div>
                    <AlertCircle className="h-8 w-8 text-orange-600" />
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Resolved Cases</p>
                      <p className="text-2xl font-bold text-green-600">{metricsData.summary.resolvedCases}</p>
                    </div>
                    <CheckCircle className="h-8 w-8 text-green-600" />
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Avg Response</p>
                      <p className="text-2xl font-bold">
                        {metricsData.summary.avgFirstResponseTime 
                          ? `${Math.round(metricsData.summary.avgFirstResponseTime / 60)}h`
                          : "N/A"
                        }
                      </p>
                    </div>
                    <Clock className="h-8 w-8 text-purple-600" />
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Filters and Search */}
          <Card>
            <CardHeader>
              <CardTitle>Filters & Search</CardTitle>
              <CardDescription>
                Find specific support cases using the filters below
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="md:col-span-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                      placeholder="Search cases, case numbers, names, or emails..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="OPEN">Open</SelectItem>
                    <SelectItem value="PENDING">Pending</SelectItem>
                    <SelectItem value="RESOLVED">Resolved</SelectItem>
                    <SelectItem value="CLOSED">Closed</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Priorities" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Priorities</SelectItem>
                    <SelectItem value="LOW">Low</SelectItem>
                    <SelectItem value="NORMAL">Normal</SelectItem>
                    <SelectItem value="HIGH">High</SelectItem>
                    <SelectItem value="URGENT">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Cases List */}
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Support Cases</CardTitle>
                  <CardDescription>
                    {filteredCases.length} case{filteredCases.length !== 1 ? 's' : ''} found
                  </CardDescription>
                </div>
                <div className="flex items-center space-x-2 text-sm text-gray-500">
                  <Clock className="h-4 w-4" />
                  <span>Last updated: {new Date().toLocaleDateString()}</span>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {filteredCases.length > 0 ? (
                <div className="space-y-4">
                  {filteredCases.map((supportCase: SupportCase) => (
                    <div
                      key={supportCase.id}
                      className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <Link 
                            href={`/tenants/${tenantSlug}/admin/support/${supportCase.id}`}
                            className="font-medium text-blue-600 hover:text-blue-800 hover:underline"
                          >
                            {supportCase.caseNumber}
                          </Link>
                          <StatusBadge status={supportCase.status} />
                          <PriorityBadge priority={supportCase.priority} />
                          {supportCase.supportOption && (
                            <Badge variant="outline" className="text-xs">
                              {supportCase.supportOption.label}
                            </Badge>
                          )}
                        </div>
                        
                        <h3 className="text-lg font-medium text-gray-900 mb-1 truncate">
                          {supportCase.title || supportCase.contactMessage?.subject}
                        </h3>
                        
                        <div className="flex items-center gap-4 text-sm text-gray-500 mb-2">
                          {supportCase.contactMessage && (
                            <span className="flex items-center">
                              <User className="h-4 w-4 mr-1" />
                              {supportCase.contactMessage.name} ({supportCase.contactMessage.email})
                            </span>
                          )}
                          {supportCase.assignee && (
                            <span className="flex items-center">
                              <User className="h-4 w-4 mr-1" />
                              Assigned to {supportCase.assignee.name}
                            </span>
                          )}
                          <span className="flex items-center">
                            <Calendar className="h-4 w-4 mr-1" />
                            Created {new Date(supportCase.createdAt).toLocaleDateString()}
                          </span>
                          {supportCase._count && (
                            <span className="flex items-center">
                              <MessageSquare className="h-4 w-4 mr-1" />
                              {supportCase._count.messages} messages
                            </span>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2 ml-4">
                        <span className="text-sm text-gray-500">
                          Updated {getTimeAgo(supportCase.updatedAt)}
                        </span>
                        <Link href={`/tenants/${tenantSlug}/admin/support/${supportCase.id}`}>
                          <Button variant="ghost" size="sm">
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <MessageSquare className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p className="text-lg font-medium">No support cases found</p>
                  <p className="text-sm">Try adjusting your search criteria or create a new case.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Support Analytics</CardTitle>
              <CardDescription>
                Overview of support performance and metrics for the last 30 days
              </CardDescription>
            </CardHeader>
            <CardContent>
              {metricsData ? (
                <div className="space-y-6">
                  {/* Summary Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div className="text-center p-6 bg-blue-50 rounded-lg">
                      <div className="text-2xl font-bold text-blue-600">
                        {metricsData.summary.totalCases}
                      </div>
                      <div className="text-sm text-blue-600">Total Cases</div>
                    </div>
                    <div className="text-center p-6 bg-orange-50 rounded-lg">
                      <div className="text-2xl font-bold text-orange-600">
                        {metricsData.summary.openCases}
                      </div>
                      <div className="text-sm text-orange-600">Open Cases</div>
                    </div>
                    <div className="text-center p-6 bg-green-50 rounded-lg">
                      <div className="text-2xl font-bold text-green-600">
                        {metricsData.summary.resolvedCases}
                      </div>
                      <div className="text-sm text-green-600">Resolved Cases</div>
                    </div>
                    <div className="text-center p-6 bg-yellow-50 rounded-lg">
                      <div className="text-2xl font-bold text-yellow-600">
                        {metricsData.summary.pendingCases}
                      </div>
                      <div className="text-sm text-yellow-600">Pending Cases</div>
                    </div>
                  </div>

                  {/* Performance Metrics */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Response Time</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-center">
                          <div className="text-3xl font-bold text-purple-600">
                            {metricsData.summary.avgFirstResponseTime 
                              ? `${Math.round(metricsData.summary.avgFirstResponseTime / 60)}h`
                              : "N/A"
                            }
                          </div>
                          <p className="text-sm text-gray-600">Average First Response Time</p>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Resolution Time</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-center">
                          <div className="text-3xl font-bold text-green-600">
                            {metricsData.summary.avgResolutionTime
                              ? `${Math.round(metricsData.summary.avgResolutionTime / 60)}h`
                              : "N/A"
                            }
                          </div>
                          <p className="text-sm text-gray-600">Average Resolution Time</p>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Daily Trends */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Daily Case Volume</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {metricsData.daily.slice(0, 7).map((day: any) => (
                          <div key={day.date} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                            <span className="text-sm font-medium">
                              {new Date(day.date).toLocaleDateString()}
                            </span>
                            <div className="flex items-center gap-4 text-sm">
                              <span className="text-blue-600">{day.totalCases} total</span>
                              <span className="text-orange-600">{day.openCases} open</span>
                              <span className="text-green-600">{day.resolvedCases} resolved</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Clock className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p className="text-lg font-medium">No metrics available</p>
                  <p className="text-sm">Metrics will appear here once cases are created</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-6">
          {/* Email Routing Configuration */}
          <Card>
            <CardHeader>
              <CardTitle>Email Routing Configuration</CardTitle>
              <CardDescription>
                Configure where support emails are sent based on inquiry type
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {supportRouting?.map((route) => (
                  <div key={route.helpType} className="p-4 border border-gray-200 rounded-lg">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="font-medium capitalize">{route.helpType} Support</h3>
                        <p className="text-sm text-gray-500">
                          Email routing for {route.helpType} inquiries
                        </p>
                      </div>
                      <Badge variant={route.isActive ? "default" : "secondary"}>
                        {route.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                    <div className="space-y-3">
                      <div>
                        <label className="text-sm font-medium text-gray-700">
                          Email Address
                        </label>
                        <Input
                          type="email"
                          value={route.email}
                          onChange={(e) => {
                            const newEmail = e.target.value;
                            updateSupportRouting.mutate({
                              tenantId: tenant?.id || "",
                              helpType: route.helpType as "technical" | "billing" | "account" | "general",
                              email: newEmail,
                              isActive: route.isActive,
                            });
                          }}
                          placeholder={`${route.helpType}@company.com`}
                          className="mt-1"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={route.isActive}
                          onChange={(e) => {
                            updateSupportRouting.mutate({
                              tenantId: tenant?.id || "",
                              helpType: route.helpType as "technical" | "billing" | "account" | "general",
                              email: route.email,
                              isActive: e.target.checked,
                            });
                          }}
                          className="rounded"
                        />
                        <label className="text-sm text-gray-600">
                          Enable routing for this category
                        </label>
                      </div>
                    </div>
                  </div>
                ))}
                
                {!supportRouting && (
                  <div className="text-center py-8 text-gray-500">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-300 mx-auto mb-2"></div>
                    <p>Loading routing configuration...</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Additional Settings */}
          <Card>
            <CardHeader>
              <CardTitle>Additional Settings</CardTitle>
              <CardDescription>
                Configure other support options and automation
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                  <div>
                    <h3 className="font-medium">Auto-assignment</h3>
                    <p className="text-sm text-gray-500">
                      Automatically assign cases to support staff
                    </p>
                  </div>
                  <Button variant="outline">Configure</Button>
                </div>
                <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                  <div>
                    <h3 className="font-medium">SLA Settings</h3>
                    <p className="text-sm text-gray-500">
                      Set response time expectations
                    </p>
                  </div>
                  <Button variant="outline">Configure</Button>
                </div>
                <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                  <div>
                    <h3 className="font-medium">Email Templates</h3>
                    <p className="text-sm text-gray-500">
                      Customize automated email responses
                    </p>
                  </div>
                  <Button variant="outline">Configure</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
