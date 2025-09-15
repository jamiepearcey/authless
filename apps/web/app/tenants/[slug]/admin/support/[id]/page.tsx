"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle,
  Button,
  Badge,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
  Separator,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Input,
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@ui/base";
import { 
  ArrowLeft,
  MessageSquare,
  User,
  Clock,
  AlertCircle,
  CheckCircle,
  XCircle,
  Pause,
  Send,
  Edit,
  Save,
  X,
  HeadphonesIcon,
  Search,
  Loader2,
} from "lucide-react";
import { trpc } from "@/lib/trpc";

import { toast } from "@ui/base";

// Status badge component
const StatusBadge = ({ status }: { status: string }) => {
  const variants: Record<string, { variant: any; icon: any; color: string }> = {
    OPEN: { variant: "default", icon: AlertCircle, color: "text-white" },
    PENDING: { variant: "secondary", icon: Pause, color: "text-yellow-700" },
    RESOLVED: { variant: "secondary", icon: CheckCircle, color: "text-green-700" },
    CLOSED: { variant: "outline", icon: XCircle, color: "text-gray-700" },
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

export default function SupportCaseDetailPage() {
  const params = useParams();
  const tenantSlug = params.slug as string;
  const caseId = params.id as string;
  
  const [isEditing, setIsEditing] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [editData, setEditData] = useState({
    status: "",
    priority: "",
    assigneeId: "",
  });
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedAssignee, setSelectedAssignee] = useState<any>(null);

  // Get tenant data first
  const { data: tenant } = trpc.getTenant.useQuery(
    { slug: tenantSlug },
    { enabled: !!tenantSlug }
  );

  // tRPC queries and mutations
  const { data: supportCase, isLoading, refetch } = trpc.getCaseByCaseNumber.useQuery(
    { caseNumber: caseId },
    { enabled: !!caseId }
  );

  // Get case messages
  const { data: messages, refetch: refetchMessages } = trpc.getCaseMessages.useQuery(
    { caseId, includeInternal: true },
    { enabled: !!caseId }
  );

  const updateStatus = trpc.updateCaseStatus.useMutation({
    onSuccess: () => {
      toast.success("Case status updated successfully!");
      refetch();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const addMessage = trpc.addCaseMessage.useMutation({
    onSuccess: () => {
      toast.success("Reply added successfully!");
      setReplyText("");
      refetchMessages();
      refetch();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  // Search users for assignment
  const { data: searchResults, isLoading: isSearching } = trpc.searchUsers.useQuery(
    { query: searchQuery, limit: 10 },
    { enabled: searchQuery.length >= 2 }
  );

  // Assign case mutation
  const assignCase = trpc.assignCase.useMutation({
    onSuccess: () => {
      toast.success("Case assigned successfully!");
      setShowAssignModal(false);
      setSearchQuery("");
      setSelectedAssignee(null);
      refetch();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  // Initialize edit data when case loads
  useState(() => {
    if (supportCase && !isEditing) {
      setEditData({
        status: supportCase.status || "",
        priority: supportCase.priority || "",
        assigneeId: supportCase.assignee?.id || "",
      });
    }
  });

  const handleStatusUpdate = async () => {
    if (!supportCase) return;
    
    try {
      await updateStatus.mutateAsync({
        caseId: supportCase.id,
        status: editData.status as any,
      });
      setIsEditing(false);
    } catch (error) {
      // Handled by mutation
    }
  };

  const handleReply = async () => {
    if (!replyText.trim() || !supportCase) return;
    
    try {
      await addMessage.mutateAsync({
        caseId: supportCase.id,
        direction: "OUTBOUND",
        channel: "UI",
        content: replyText.trim(),
        fromAddress: "support",
        toAddress: supportCase.contactMessage?.email || "customer",
      });
    } catch (error) {
      // Handled by mutation
    }
  };

  const handleAssignCase = async () => {
    if (!supportCase || !selectedAssignee) return;
    
    try {
      await assignCase.mutateAsync({
        caseId: supportCase.id,
        assigneeId: selectedAssignee.id,
      });
    } catch (error) {
      // Handled by mutation
    }
  };

  const handleUnassignCase = async () => {
    if (!supportCase) return;
    
    try {
      await assignCase.mutateAsync({
        caseId: supportCase.id,
        assigneeId: null,
      });
    } catch (error) {
      // Handled by mutation
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!supportCase) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">Support case not found</p>
        <Link href={`/tenants/${tenantSlug}/admin/support`} className="text-indigo-600 hover:text-indigo-800">
          Back to Support
        </Link>
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
            </div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center space-x-3">
              <HeadphonesIcon className="h-8 w-8 text-indigo-600" />
              <span>Support Case {supportCase.caseNumber || supportCase.id.substring(0, 8)}</span>
            </h1>
            <p className="text-gray-600 mt-2">
              {supportCase.contactMessage?.subject || "No subject"}
            </p>
          </div>
          
          <div className="flex items-center space-x-3">
            {isEditing ? (
              <>
                <Button variant="outline" onClick={() => setIsEditing(false)}>
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
                <Button onClick={handleStatusUpdate} disabled={updateStatus.isPending}>
                  <Save className="h-4 w-4 mr-2" />
                  {updateStatus.isPending ? "Saving..." : "Save Changes"}
                </Button>
              </>
            ) : (
              <Button onClick={() => setIsEditing(true)}>
                <Edit className="h-4 w-4 mr-2" />
                Edit Case
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Case Details */}
          <Card>
            <CardHeader>
              <CardTitle>Case Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Status</label>
                  {isEditing ? (
                    <Select value={editData.status} onValueChange={(value) => setEditData(prev => ({ ...prev, status: value }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="OPEN">Open</SelectItem>
                        <SelectItem value="PENDING">Pending</SelectItem>
                        <SelectItem value="RESOLVED">Resolved</SelectItem>
                        <SelectItem value="CLOSED">Closed</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <div className="mt-1">
                      <StatusBadge status={supportCase.status} />
                    </div>
                  )}
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Priority</label>
                  {isEditing ? (
                    <Select value={editData.priority} onValueChange={(value) => setEditData(prev => ({ ...prev, priority: value }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="LOW">Low</SelectItem>
                        <SelectItem value="NORMAL">Normal</SelectItem>
                        <SelectItem value="HIGH">High</SelectItem>
                        <SelectItem value="URGENT">Urgent</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <div className="mt-1">
                      <PriorityBadge priority={supportCase.priority} />
                    </div>
                  )}
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Case Number</label>
                  <p className="mt-1 text-sm text-gray-900 font-mono">
                    {supportCase.caseNumber || 'Generating...'}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Created</label>
                  <p className="mt-1 text-sm text-gray-900">
                    {new Date(supportCase.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Assigned To</label>
                  <div className="mt-1">
                    {supportCase.assignee ? (
                      <div className="flex items-center space-x-2">
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={supportCase.assignee.image || undefined} />
                          <AvatarFallback className="text-xs">
                            {supportCase.assignee.name?.charAt(0) || "U"}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-medium text-gray-900">{supportCase.assignee.name}</p>
                          <p className="text-xs text-gray-500">{supportCase.assignee.email}</p>
                        </div>
                      </div>
                    ) : (
                      <span className="text-sm text-gray-500">Unassigned</span>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Contact Information */}
          <Card>
            <CardHeader>
              <CardTitle>Contact Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Name</label>
                  <p className="mt-1 text-sm text-gray-900">{supportCase.contactMessage?.name || "Unknown"}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Email</label>
                  <p className="mt-1 text-sm text-gray-900">{supportCase.contactMessage?.email || "Unknown"}</p>
                </div>
                <div className="md:col-span-2">
                  <label className="text-sm font-medium text-gray-500">Subject</label>
                  <p className="mt-1 text-sm text-gray-900">{supportCase.contactMessage?.subject || "No subject"}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Conversation Thread */}
          <Card>
            <CardHeader>
              <CardTitle>Conversation Thread</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Original Message */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <User className="h-4 w-4 text-gray-500" />
                    <span className="font-medium">{supportCase.contactMessage?.name}</span>
                    <span className="text-sm text-gray-500">
                      {new Date(supportCase.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-gray-700">{supportCase.description}</p>
                  
                  {/* Contact Reasons */}
                  {supportCase.sourceMetadata && 
                   typeof supportCase.sourceMetadata === 'object' && 
                   (supportCase.sourceMetadata as any).contactReasons && (
                    <div className="mt-3">
                      <p className="text-sm font-medium text-gray-600 mb-2">Contact Reasons:</p>
                      <div className="flex flex-wrap gap-2">
                        {(supportCase.sourceMetadata as any).contactReasons.map((reason: any, index: number) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {reason.label}
                            {reason.helpType && (
                              <span className="ml-1 text-gray-400">({reason.helpType})</span>
                            )}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* All Conversation Messages */}
                {messages && messages.length > 0 && (
                  <div className="space-y-3">
                    {messages.map((message: any) => (
                      <div
                        key={message.id}
                        className={`p-4 rounded-lg ${
                          message.direction === "INBOUND"
                            ? "bg-blue-50 border-l-4 border-blue-500"
                            : "bg-green-50 border-l-4 border-green-500"
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-sm font-medium">
                            {message.direction === "INBOUND" ? "Customer" : "Support"}
                          </span>
                          <span className="text-xs text-gray-500">
                            {new Date(message.createdAt).toLocaleString()}
                          </span>
                          <Badge variant="outline" className="text-xs">
                            {message.channel}
                          </Badge>
                          {message.isInternal && (
                            <Badge variant="destructive" className="text-xs">
                              Internal
                            </Badge>
                          )}
                        </div>
                        <p className="text-gray-800 whitespace-pre-wrap">{message.content}</p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Add Reply */}
                <Separator />
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-900">Add Reply</label>
                  <Textarea
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="Type your reply..."
                    rows={3}
                  />
                  <Button onClick={handleReply} disabled={!replyText.trim() || addMessage.isPending}>
                    <Send className="h-4 w-4 mr-2" />
                    {addMessage.isPending ? "Sending..." : "Send Reply"}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button variant="outline" className="w-full justify-start">
                <MessageSquare className="h-4 w-4 mr-2" />
                Send Email
              </Button>
              <Dialog open={showAssignModal} onOpenChange={setShowAssignModal}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="w-full justify-start">
                    <User className="h-4 w-4 mr-2" />
                    {supportCase?.assignee ? "Reassign Staff" : "Assign to Staff"}
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>
                      {supportCase?.assignee ? "Reassign Case" : "Assign Case to Staff"}
                    </DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    {/* Current Assignee */}
                    {supportCase?.assignee && (
                      <div className="p-3 bg-gray-50 rounded-lg">
                        <p className="text-sm font-medium text-gray-700 mb-2">Current Assignee:</p>
                        <div className="flex items-center space-x-3">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={supportCase.assignee.image || undefined} />
                            <AvatarFallback>
                              {supportCase.assignee.name?.charAt(0) || "U"}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="text-sm font-medium">{supportCase.assignee.name}</p>
                            <p className="text-xs text-gray-500">{supportCase.assignee.email}</p>
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleUnassignCase}
                          disabled={assignCase.isPending}
                          className="mt-2"
                        >
                          {assignCase.isPending ? "Unassigning..." : "Unassign"}
                        </Button>
                      </div>
                    )}

                    {/* Search for New Assignee */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Search for staff member:</label>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                          placeholder="Type name or email..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="pl-10"
                        />
                      </div>
                    </div>

                    {/* Search Results */}
                    {searchQuery.length >= 2 && (
                      <div className="space-y-2 max-h-60 overflow-y-auto">
                        {isSearching ? (
                          <div className="flex items-center justify-center py-4">
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            <span className="text-sm text-gray-500">Searching...</span>
                          </div>
                        ) : searchResults && searchResults.length > 0 ? (
                          searchResults.map((user: any) => (
                            <div
                              key={user.id}
                              className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                                selectedAssignee?.id === user.id
                                  ? "border-blue-500 bg-blue-50"
                                  : "border-gray-200 hover:bg-gray-50"
                              }`}
                              onClick={() => setSelectedAssignee(user)}
                            >
                              <div className="flex items-center space-x-3">
                                <Avatar className="h-8 w-8">
                                  <AvatarImage src={user.image || undefined} />
                                  <AvatarFallback>
                                    {user.name?.charAt(0) || "U"}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="flex-1">
                                  <p className="text-sm font-medium">{user.name}</p>
                                  <p className="text-xs text-gray-500">{user.email}</p>
                                  <Badge variant="outline" className="text-xs mt-1">
                                    {user.platformRole}
                                  </Badge>
                                </div>
                              </div>
                            </div>
                          ))
                        ) : (
                          <p className="text-sm text-gray-500 text-center py-4">
                            No staff members found
                          </p>
                        )}
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex justify-end space-x-2 pt-4">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setShowAssignModal(false);
                          setSearchQuery("");
                          setSelectedAssignee(null);
                        }}
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={handleAssignCase}
                        disabled={!selectedAssignee || assignCase.isPending}
                      >
                        {assignCase.isPending ? "Assigning..." : "Assign Case"}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
              <Button variant="outline" className="w-full justify-start">
                <Clock className="h-4 w-4 mr-2" />
                Set Reminder
              </Button>
            </CardContent>
          </Card>

          {/* Case Timeline */}
          <Card>
            <CardHeader>
              <CardTitle>Case Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Case Created - Always first */}
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">Case Created</p>
                    <p className="text-xs text-gray-500">
                      {new Date(supportCase.createdAt).toLocaleString()}
                    </p>
                    <p className="text-xs text-gray-400">
                      via {supportCase.source?.toLowerCase().replace('_', ' ')}
                    </p>
                  </div>
                </div>

                {/* Status History - Dynamic from database */}
                {supportCase.statusHistory && supportCase.statusHistory.length > 0 && (
                  <>
                    {supportCase.statusHistory.map((historyItem: any) => {
                      const getStatusColor = (status: string) => {
                        switch (status) {
                          case 'OPEN': return 'bg-blue-500';
                          case 'PENDING': return 'bg-yellow-500';
                          case 'RESOLVED': return 'bg-green-500';
                          case 'CLOSED': return 'bg-gray-500';
                          default: return 'bg-gray-400';
                        }
                      };

                      const getStatusAction = (fromStatus: string | null, toStatus: string) => {
                        if (!fromStatus) return `Set to ${toStatus}`;
                        return `Changed from ${fromStatus} to ${toStatus}`;
                      };

                      return (
                        <div key={historyItem.id} className="flex items-start space-x-3">
                          <div className={`w-2 h-2 rounded-full mt-2 ${getStatusColor(historyItem.toStatus)}`}></div>
                          <div className="flex-1">
                            <p className="text-sm font-medium">
                              Status {getStatusAction(historyItem.fromStatus, historyItem.toStatus)}
                            </p>
                            <p className="text-xs text-gray-500">
                              {new Date(historyItem.createdAt).toLocaleString()}
                            </p>
                            {historyItem.user && (
                              <p className="text-xs text-gray-400">
                                by {historyItem.user.name || historyItem.user.email}
                              </p>
                            )}
                            {historyItem.reason && (
                              <p className="text-xs text-gray-400 italic">
                                "{historyItem.reason}"
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </>
                )}

                {/* No status changes yet */}
                {(!supportCase.statusHistory || supportCase.statusHistory.length === 0) && (
                  <div className="flex items-start space-x-3">
                    <div className="w-2 h-2 bg-gray-300 rounded-full mt-2"></div>
                    <div>
                      <p className="text-sm text-gray-500 italic">No status changes yet</p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
