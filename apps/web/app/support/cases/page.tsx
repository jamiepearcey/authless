"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
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
} from "lucide-react";
import { trpc } from "@/lib/trpc";

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
  tenant?: {
    name: string;
    slug: string;
  } | null;
  _count?: {
    messages: number;
  };
}

export default function SupportCasesPage() {
  const { data: session } = useSession();
  const [filters, setFilters] = useState({
    status: "",
    priority: "",
    assignee: "",
    search: "",
    tenantId: "",
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [activeTab, setActiveTab] = useState("all");

  // Get cases with filters
  const { data: casesData, isLoading, refetch } = trpc.getAllCases.useQuery({
    status: activeTab === "all" ? undefined : activeTab.toUpperCase() as "OPEN" | "PENDING" | "RESOLVED" | "CLOSED",
    priority: filters.priority && filters.priority !== "ALL" ? filters.priority as "LOW" | "NORMAL" | "HIGH" | "URGENT" : undefined,
    assigneeId: filters.assignee || undefined,
    search: filters.search || undefined,
    tenantId: filters.tenantId && filters.tenantId !== "ALL" ? filters.tenantId : undefined,
    page: currentPage,
    pageSize: 20,
  });

  // Get case metrics for dashboard cards
  const { data: metricsData } = trpc.getCaseMetrics.useQuery({
    dateFrom: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
    dateTo: new Date(),
  });

  // Get user's tenants for filtering
  const { data: userTenants } = trpc.getUserTenants.useQuery(
    undefined,
    { enabled: !!session?.user }
  );

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setCurrentPage(1);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getTimeAgo = (dateString: string) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return "Just now";
    if (diffInHours < 24) return `${diffInHours}h ago`;
    return `${Math.floor(diffInHours / 24)}d ago`;
  };

  if (!session) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">Please sign in to view support cases.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Support Cases</h1>
          <p className="text-gray-600 mt-1">
            Manage and track all support requests
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            New Case
          </Button>
        </div>
      </div>

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
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search cases..."
                  value={filters.search}
                  onChange={(e) => handleFilterChange("search", e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <Select value={filters.priority || "ALL"} onValueChange={(value) => handleFilterChange("priority", value)}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Priorities</SelectItem>
                <SelectItem value="URGENT">Urgent</SelectItem>
                <SelectItem value="HIGH">High</SelectItem>
                <SelectItem value="NORMAL">Normal</SelectItem>
                <SelectItem value="LOW">Low</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filters.tenantId || "ALL"} onValueChange={(value) => handleFilterChange("tenantId", value)}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Tenant" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Tenants</SelectItem>
                <SelectItem value="platform">Platform</SelectItem>
                {userTenants?.map((userTenant) => (
                  <SelectItem key={userTenant.tenant.id} value={userTenant.tenant.id}>
                    {userTenant.tenant.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button variant="outline" size="sm">
              <Filter className="h-4 w-4 mr-2" />
              More Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Cases List with Tabs */}
      <Card>
        <CardHeader className="pb-3">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="all">All Cases</TabsTrigger>
              <TabsTrigger value="open">Open</TabsTrigger>
              <TabsTrigger value="pending">Pending</TabsTrigger>
              <TabsTrigger value="resolved">Resolved</TabsTrigger>
              <TabsTrigger value="closed">Closed</TabsTrigger>
            </TabsList>
          </Tabs>
        </CardHeader>

        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : !casesData?.cases.length ? (
            <div className="text-center py-12">
              <MessageSquare className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-500">No cases found</p>
              <p className="text-sm text-gray-400 mt-1">Cases will appear here when they are created</p>
            </div>
          ) : (
            <div className="divide-y">
              {casesData.cases.map((case_: SupportCase) => (
                <div key={case_.id} className="p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <Link 
                          href={`/support/cases/${case_.id}`}
                          className="font-medium text-blue-600 hover:text-blue-800 hover:underline"
                        >
                          {case_.caseNumber}
                        </Link>
                        <StatusBadge status={case_.status} />
                        <PriorityBadge priority={case_.priority} />
                        {case_.supportOption && (
                          <Badge variant="outline" className="text-xs">
                            {case_.supportOption.label}
                          </Badge>
                        )}
                      </div>
                      
                      <h3 className="text-lg font-medium text-gray-900 mb-1 truncate">
                        {case_.title}
                      </h3>
                      
                      <div className="flex items-center gap-4 text-sm text-gray-500 mb-2">
                        {case_.contactMessage && (
                          <span className="flex items-center gap-1">
                            <User className="h-4 w-4" />
                            {case_.contactMessage.name} ({case_.contactMessage.email})
                          </span>
                        )}
                        {case_.assignee && (
                          <span className="flex items-center gap-1">
                            <User className="h-4 w-4" />
                            Assigned to {case_.assignee.name}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          Created {formatDate(case_.createdAt)}
                        </span>
                        {case_._count && (
                          <span className="flex items-center gap-1">
                            <MessageSquare className="h-4 w-4" />
                            {case_._count.messages} messages
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 ml-4">
                      <span className="text-sm text-gray-500">
                        Updated {getTimeAgo(case_.updatedAt)}
                      </span>
                      <Link href={`/support/cases/${case_.id}`}>
                        <Button variant="ghost" size="sm">
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {casesData?.pagination && casesData.pagination.totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t">
              <div className="text-sm text-gray-700">
                Showing {((casesData.pagination.page - 1) * casesData.pagination.pageSize) + 1} to{" "}
                {Math.min(casesData.pagination.page * casesData.pagination.pageSize, casesData.pagination.totalCount)} of{" "}
                {casesData.pagination.totalCount} cases
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={casesData.pagination.page <= 1}
                  onClick={() => setCurrentPage(prev => prev - 1)}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={casesData.pagination.page >= casesData.pagination.totalPages}
                  onClick={() => setCurrentPage(prev => prev + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}