"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle,
  Button,
  Badge,
  Textarea,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Avatar,
  AvatarFallback,
  AvatarImage,
  Separator,
} from "@ui/base";
import { 
  ArrowLeft,
  Send,
  Edit,
  User,
  Calendar,
  Clock,
  MessageSquare,
  Mail,
  Phone,
  ExternalLink,
  AlertCircle,
  CheckCircle,
  XCircle,
  Pause,
  Settings,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "@ui/base";

// Status badge component (reused from list page)
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

export default function CaseDetailPage() {
  const { data: session } = useSession();
  const params = useParams();
  const router = useRouter();
  const caseId = params.id as string;

  const [replyText, setReplyText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newStatus, setNewStatus] = useState<string | null>(null);

  // Get case details
  const { data: caseData, isLoading, refetch } = trpc.getCaseById.useQuery(
    { caseId },
    { enabled: !!caseId }
  );

  // Get case messages
  const { data: messages, refetch: refetchMessages } = trpc.getCaseMessages.useQuery(
    { caseId, includeInternal: true },
    { enabled: !!caseId }
  );

  // Mutations
  const addMessageMutation = trpc.addCaseMessage.useMutation();
  const updateStatusMutation = trpc.updateCaseStatus.useMutation();
  const assignCaseMutation = trpc.assignCase.useMutation();

  const handleAddReply = async () => {
    if (!replyText.trim() || !caseData) return;

    setIsSubmitting(true);
    try {
      await addMessageMutation.mutateAsync({
        caseId: caseData.id,
        direction: "OUTBOUND",
        channel: "UI",
        content: replyText.trim(),
        fromAddress: session?.user?.email || "support",
        toAddress: caseData.contactMessage?.email || "customer",
      });

      setReplyText("");
      refetchMessages();
      refetch();
      toast.success("Reply added successfully");
    } catch (error) {
      toast.error("Failed to add reply");
      console.error("Failed to add reply:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStatusUpdate = async () => {
    if (!newStatus || !caseData) return;

    try {
      await updateStatusMutation.mutateAsync({
        caseId: caseData.id,
        status: newStatus as any,
      });

      refetch();
      setNewStatus(null);
      toast.success("Case status updated");
    } catch (error) {
      toast.error("Failed to update case status");
      console.error("Failed to update status:", error);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (!session) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">Please sign in to view this case.</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!caseData) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 mx-auto text-gray-400 mb-4" />
          <p className="text-gray-500">Case not found</p>
          <Link href="/support/cases">
            <Button variant="outline" className="mt-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Cases
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <Link href="/support/cases">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Cases
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl font-bold text-gray-900">
                {caseData.caseNumber}
              </h1>
              <StatusBadge status={caseData.status} />
              <PriorityBadge priority={caseData.priority} />
            </div>
            <h2 className="text-xl text-gray-700">{caseData.title}</h2>
          </div>
        </div>
        
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Edit className="h-4 w-4 mr-2" />
            Edit
          </Button>
          <Button variant="outline" size="sm">
            <Settings className="h-4 w-4 mr-2" />
            Actions
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Case Details */}
          <Card>
            <CardHeader>
              <CardTitle>Case Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {caseData.description && (
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Description</h4>
                  <p className="text-gray-700 whitespace-pre-wrap">{caseData.description}</p>
                </div>
              )}

              {caseData.contactMessage && (
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Customer Information</h4>
                  <div className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback>
                        {caseData.contactMessage.name?.charAt(0) || "U"}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{caseData.contactMessage.name}</p>
                      <p className="text-sm text-gray-600 flex items-center gap-1">
                        <Mail className="h-4 w-4" />
                        {caseData.contactMessage.email}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Contact Reasons */}
              {caseData.contactMessage?.reasons && (
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Contact Reasons</h4>
                  <div className="flex flex-wrap gap-2">
                    {caseData.contactMessage.reasons.map((reason: any) => (
                      <Badge key={reason.id} variant="outline">
                        {reason.contactReason.label}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Messages Thread */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Case Messages ({messages?.length || 0})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {!messages?.length ? (
                <p className="text-gray-500 text-center py-8">No messages yet</p>
              ) : (
                <div className="space-y-4">
                  {messages.map((message: any) => (
                    <div
                      key={message.id}
                      className={`flex ${
                        message.direction === "INBOUND" ? "justify-start" : "justify-end"
                      }`}
                    >
                      <div
                        className={`max-w-lg p-4 rounded-lg ${
                          message.direction === "INBOUND"
                            ? "bg-gray-50 border-l-4 border-blue-500"
                            : "bg-blue-50 border-l-4 border-green-500"
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <Avatar className="h-6 w-6">
                            <AvatarFallback className="text-xs">
                              {message.direction === "INBOUND" ? "C" : "S"}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-sm font-medium">
                            {message.direction === "INBOUND" ? "Customer" : "Support"}
                          </span>
                          <span className="text-xs text-gray-500">
                            {formatDate(message.createdAt)}
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
                        <div className="text-gray-800 whitespace-pre-wrap">
                          {message.content}
                        </div>
                        {message.subject && (
                          <div className="text-sm text-gray-600 mt-2">
                            <strong>Subject:</strong> {message.subject}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <Separator />

              {/* Reply Form */}
              <div className="space-y-3">
                <h4 className="font-medium text-gray-900">Add Reply</h4>
                <Textarea
                  placeholder="Type your reply..."
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  rows={4}
                  className="resize-none"
                />
                <div className="flex justify-between">
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => {
                        // TODO: Implement internal note functionality
                        toast.info("Internal note functionality coming soon");
                      }}
                    >
                      Internal Note
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => {
                        // TODO: Implement file attachment functionality
                        toast.info("File attachment functionality coming soon");
                      }}
                    >
                      Attach Files
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => {
                        // TODO: Implement email reply functionality
                        toast.info("Email reply functionality coming soon");
                      }}
                    >
                      Email Reply
                    </Button>
                  </div>
                  <Button
                    onClick={handleAddReply}
                    disabled={!replyText.trim() || isSubmitting}
                    className="flex items-center gap-2"
                  >
                    {isSubmitting ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                    {isSubmitting ? "Sending..." : "Send Reply"}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Status Update */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Update Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Select value={newStatus || "NOCHANGE"} onValueChange={(value) => setNewStatus(value === "" ? null : value)}>
                <SelectTrigger>
                  <SelectValue placeholder={`Current: ${caseData.status}`} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NOCHANGE">No Change</SelectItem>
                  <SelectItem value="OPEN">Open</SelectItem>
                  <SelectItem value="PENDING">Pending</SelectItem>
                  <SelectItem value="RESOLVED">Resolved</SelectItem>
                  <SelectItem value="CLOSED">Closed</SelectItem>
                </SelectContent>
              </Select>
              <Button 
                onClick={handleStatusUpdate}
                disabled={!newStatus || newStatus === caseData.status}
                className="w-full"
                size="sm"
              >
                Update Status
              </Button>
            </CardContent>
          </Card>

          {/* Case Properties */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Case Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-gray-500" />
                <div>
                  <p className="text-gray-600">Created</p>
                  <p className="font-medium">{formatDate(caseData.createdAt)}</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-gray-500" />
                <div>
                  <p className="text-gray-600">Updated</p>
                  <p className="font-medium">{formatDate(caseData.updatedAt)}</p>
                </div>
              </div>

              {caseData.assignee && (
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-gray-500" />
                  <div>
                    <p className="text-gray-600">Assigned to</p>
                    <p className="font-medium">{caseData.assignee.name}</p>
                  </div>
                </div>
              )}

              {caseData.supportOption && (
                <div className="flex items-center gap-2">
                  <ExternalLink className="h-4 w-4 text-gray-500" />
                  <div>
                    <p className="text-gray-600">Support Option</p>
                    <p className="font-medium">{caseData.supportOption.label}</p>
                  </div>
                </div>
              )}

              {caseData.tenant && (
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-gray-500" />
                  <div>
                    <p className="text-gray-600">Tenant</p>
                    <p className="font-medium">{caseData.tenant.name}</p>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-gray-500" />
                <div>
                  <p className="text-gray-600">Source</p>
                  <p className="font-medium">{caseData.source}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Status History */}
          {caseData.statusHistory && caseData.statusHistory.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Status History</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  {caseData.statusHistory.slice(0, 5).map((entry: any) => (
                    <div key={entry.id} className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                      <div className="flex-1">
                        <p>
                          {entry.fromStatus ? `${entry.fromStatus} → ` : ""}
                          <strong>{entry.toStatus}</strong>
                        </p>
                        <p className="text-gray-500 text-xs">
                          {formatDate(entry.createdAt)}
                          {entry.user && ` by ${entry.user.name}`}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}