"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { t } from "@i18n-core";
import { Card, CardContent, CardHeader, CardTitle } from "@ui/base";
import { Button } from "@ui/base";
import { Input } from "@ui/base";
import { Textarea } from "@ui/base";
import { Label } from "@ui/base";
import { Badge } from "@ui/base";
import { Separator } from "@ui/base";
import { Checkbox } from "@ui/base";
import { Avatar, AvatarFallback, AvatarImage } from "@ui/base";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@ui/base";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@ui/base";
import { motion, AnimatePresence, type Transition, Variants } from "framer-motion";

import {
  MessageSquare,
  Send,
  User,
  Calendar,
  Bug,
  CreditCard,
  Shield,
  HelpCircle,
  ChevronRight,
  RefreshCw,
  Plus,
  Flag,
  Clock,
  CheckCircle,
  AlertCircle,
  Info,
  AlertTriangle,
  FileText,
  Building
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "@ui/base";
import { getErrorMessage } from "@shared/base";

interface ContactMessage {
  id: string;
  subject: string;
  message: string | null;
  status: string;
  priority: string;
  createdAt: string;
  updatedAt: string;
  caseNumber: string;
  assignee: { name: string | null; email: string | null } | null;
  lastMessage?: {
    content: string | null;
    createdAt: string;
    isFromUser: boolean;
  };
}

// Typed spring (avoid TS error where "spring" becomes string)
const spring: Transition = {
  type: "spring",
  stiffness: 340,
  damping: 30,
  mass: 0.9,
};

// Simplified list variants for smooth animations
const listVariants = {
  hidden: {},
  show: { 
    transition: { 
      staggerChildren: 0.08,
      delayChildren: 0.1
    } 
  },
};

// Fixed item variants with proper upward motion
const itemVariants = {
  hidden: { 
    opacity: 0, 
    y: 20,
    transition: { duration: 0.2 }
  },
  show: {
    opacity: 1,
    y: 0,
    transition: { 
      type: "spring",
      stiffness: 400,
      damping: 25,
      duration: 0.4
    },
  },
  exit: {
    opacity: 0,
    y: -10,
    transition: { duration: 0.2 },
  },
};

// Simplified conversation variants
const conversationVariants = {
  hidden: { opacity: 0, y: 15 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.3, ease: "easeOut" },
  },
};

const ContactPage = () => {
  const { data: session, status } = useSession();

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  });
  const [selectedReasons, setSelectedReasons] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCloseDialog, setShowCloseDialog] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [showNewMessage, setShowNewMessage] = useState<boolean>(false);

  // Get user tenants to find their primary tenant
  const { data: userTenants } = trpc.getUserTenants.useQuery(
    undefined,
    { enabled: !!session?.user }
  );

  // Get the first tenant (or could be made configurable)
  const primaryTenant = userTenants?.[0]?.tenant;

  // tRPC queries and mutations
  const { data: contactReasons } = trpc.getContactReasons.useQuery(
    { tenantId: primaryTenant?.id },
    { enabled: !!session?.user }
  );
  const submitMessage = trpc.submitContactMessage.useMutation();
  const { data: userMessages, refetch: refetchMessages } =
    trpc.getUserContactMessages.useQuery(undefined, { enabled: !!session?.user });
  const { data: selectedMessageData, refetch: refetchSelectedMessage } =
    trpc.getContactMessage.useQuery({ messageId: selectedMessage! }, { enabled: !!selectedMessage });
  const addReply = trpc.addContactReply.useMutation();
  const updateStatus = trpc.updateContactMessageStatus.useMutation();

  // Auto-fill form for logged-in users (only once when session loads)
  useEffect(() => {
    if (session?.user && !formData.name && !formData.email) {
      setFormData(prev => ({
        ...prev,
        name: session.user?.name || "",
        email: session.user?.email || "",
      }));
    }
  }, [session?.user?.name, session?.user?.email]);

  const handleReasonToggle = (reasonId: string) => {
    setSelectedReasons(prev =>
      prev.includes(reasonId) ? prev.filter(id => id !== reasonId) : [...prev, reasonId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!session?.user) {
      toast.error("Please login to send a message");
      return;
    }
    if (selectedReasons.length === 0) {
      toast.error("Please select at least one reason for contacting us");
      return;
    }
    if (!formData.subject.trim() || !formData.message.trim()) {
      toast.error("Please fill in all required fields");
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await submitMessage.mutateAsync({
        ...formData,
        reasonIds: selectedReasons,
        userId: session?.user?.email || undefined,
        tenantId: primaryTenant?.id,
      });

      if (result.success) {
        toast.success(result.message);
        setFormData({ name: "", email: "", subject: "", message: "" });
        setSelectedReasons([]);
        setShowNewMessage(false);
        refetchMessages();
      }
    } catch (error: unknown) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReply = async () => {
    if (!replyText.trim() || !selectedMessage) return;
    try {
      const result = await addReply.mutateAsync({ messageId: selectedMessage, message: replyText });
      if (result.success) {
        toast.success(
          "Reply sent successfully! Your ticket status has been updated to 'Pending' as support staff will review your response."
        );
        setReplyText("");
        refetchSelectedMessage();
        refetchMessages();
      }
    } catch (error: unknown) {
      toast.error(getErrorMessage(error));
    }
  };

  const handleCloseTicket = async () => {
    if (!selectedMessage) return;
    try {
      const result = await updateStatus.mutateAsync({
        contactMessageId: selectedMessage,
        status: "closed",
      });
      if (result) {
        toast.success("Ticket closed successfully");
        refetchSelectedMessage();
        refetchMessages();
        setShowCloseDialog(false);
      }
    } catch (error: unknown) {
      toast.error(getErrorMessage(error));
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "open":
        return <Badge variant="default" className="bg-primary text-primary-foreground">Open</Badge>;
      case "pending":
        return <Badge className="bg-yellow-100 text-yellow-700 border border-yellow-200">Pending</Badge>;
      case "in_progress":
        return <Badge className="bg-blue-100 text-blue-700 border border-blue-200">In Progress</Badge>;
      case "resolved":
        return <Badge className="bg-green-100 text-green-700 border border-green-200">Resolved</Badge>;
      case "closed":
        return <Badge className="bg-gray-100 text-gray-700 border border-gray-200">Closed</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case "low":
        return <Badge variant="outline" className="text-gray-600">Low</Badge>;
      case "normal":
        return <Badge className="bg-blue-100 text-blue-700 border border-blue-200">Normal</Badge>;
      case "high":
        return <Badge className="bg-orange-100 text-orange-700 border border-orange-200">High</Badge>;
      case "urgent":
        return <Badge className="bg-red-100 text-red-700 border border-red-200">Urgent</Badge>;
      default:
        return <Badge variant="outline">Normal</Badge>;
    }
  };

  const getReasonIcon = (iconName: string) => {
    switch (iconName) {
      case "Bug":
        return <Bug className="h-5 w-5" />;
      case "CreditCard":
        return <CreditCard className="h-5 w-5" />;
      case "Shield":
        return <Shield className="h-5 w-5" />;
      case "MessageCircle":
        return <MessageSquare className="h-5 w-5" />;
      case "HelpCircle":
        return <HelpCircle className="h-5 w-5" />;
      default:
        return <HelpCircle className="h-5 w-5" />;
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Helper functions for inbox-style layout
  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMinutes < 1) return "Just now";
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "open":
        return <Info className="h-5 w-5 text-blue-600" />;
      case "pending":
        return <Clock className="h-5 w-5 text-yellow-600" />;
      case "in_progress":
        return <RefreshCw className="h-5 w-5 text-purple-600" />;
      case "resolved":
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case "closed":
        return <CheckCircle className="h-5 w-5 text-gray-400" />;
      default:
        return <Info className="h-5 w-5 text-blue-600" />;
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case "urgent": return <Flag className="h-4 w-4 text-red-600" />;
      case "high": return <Flag className="h-4 w-4 text-orange-600" />;
      case "normal": return <Flag className="h-4 w-4 text-blue-600" />;
      case "low": return <Flag className="h-4 w-4 text-gray-400" />;
      default: return <Flag className="h-4 w-4 text-gray-400" />;
    }
  };

  const handleNewMessage = () => {
    setShowNewMessage(true);
    setSelectedMessage(null);
  };

  const handleMessageSelect = (messageId: string) => {
    setSelectedMessage(messageId);
    setShowNewMessage(false);
  };

  // Filter messages based on status
  const filteredMessages =
    userMessages?.filter((msg: ContactMessage) => {
      if (statusFilter === "all") return true;
      return msg.status === statusFilter;
    }) || [];

  if (status === "loading") {
    return (
      <main className="flex flex-1 pt-8 pb-8">
        <div className="max-w-7xl mx-auto ">
          <div className="text-center">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading...</p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <div className="flex-1 bg-gray-50">
      <div className="max-w-7xl mx-auto  py-8">
        {/* Header */}
        <div className="mb-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center space-x-3">
                <MessageSquare className="h-8 w-8 text-indigo-600" />
                <span>{t("Contact Support", "contact.page.ContactPage.contact_support__1itlrq")}</span>
              </h1>
              <p className="mt-2 text-gray-600">
                {t("Get in touch with our support team. We're here to help!", "contact.page.ContactPage.get_in_touch_with_our_support_team__2bkoks")}
              </p>
            </div>
            
            {session?.user && (
              <Button onClick={handleNewMessage} className="bg-indigo-600 hover:bg-indigo-700">
                <Plus className="h-4 w-4 mr-2" />
                New Message
              </Button>
            )}
          </div>
        </div>

        {session?.user ? (
          /* Main Inbox Layout */
          <div className="flex h-[calc(100vh-12rem)] overflow-hidden bg-white rounded-lg border border-gray-200">
            {/* Left Panel - Support Tickets List */}
            <div className="w-2/5 bg-white border-r border-gray-200 flex flex-col">
              {/* Left Panel Header */}
              <div className="p-4 border-b border-gray-200">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-gray-900">
                    {statusFilter === "all" ? "All Support Tickets" : 
                     statusFilter === "open" ? "Open Tickets" :
                     statusFilter === "pending" ? "Pending Tickets" :
                     statusFilter === "in_progress" ? "In Progress Tickets" :
                     statusFilter === "resolved" ? "Resolved Tickets" :
                     statusFilter === "closed" ? "Closed Tickets" : "Support Tickets"}
                  </h2>
                  <div className="flex items-center space-x-2">
                    <Button variant="outline" size="sm" onClick={() => refetchMessages()}>
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                
                {/* Quick Filters Toolbar */}
                <div className="space-y-3">
                  <div className="flex items-center space-x-1 bg-gray-100 rounded-lg p-1">
                    <Button
                      variant={statusFilter === "all" ? "default" : "ghost"}
                      size="sm"
                      className="h-7 px-3 text-[10px] font-medium"
                      onClick={() => setStatusFilter("all")}
                    >
                      All
                      <Badge variant="secondary" className="ml-1 h-4 px-1 text-xs">
                        {filteredMessages.length}
                      </Badge>
                    </Button>
                    <Button
                      variant={statusFilter === "open" ? "default" : "ghost"}
                      size="sm"
                      className="h-7 px-3 text-[10px] font-medium"
                      onClick={() => setStatusFilter("open")}
                    >
                      Open
                      <Badge variant="secondary" className="ml-1 h-4 px-1 text-xs">
                        {filteredMessages.filter((m: ContactMessage) => m.status === "open").length}
                      </Badge>
                    </Button>
                    <Button
                      variant={statusFilter === "pending" ? "default" : "ghost"}
                      size="sm"
                      className="h-7 px-3 text-[10px] font-medium"
                      onClick={() => setStatusFilter("pending")}
                    >
                      Pending
                      <Badge variant="secondary" className="ml-1 h-4 px-1 text-xs">
                        {filteredMessages.filter((m: ContactMessage) => m.status === "pending").length}
                      </Badge>
                    </Button>
                    <Button
                      variant={statusFilter === "resolved" ? "default" : "ghost"}
                      size="sm"
                      className="h-7 px-3 text-[10px] font-medium"
                      onClick={() => setStatusFilter("resolved")}
                    >
                      Resolved
                      <Badge variant="secondary" className="ml-1 h-4 px-1 text-xs">
                        {filteredMessages.filter((m: ContactMessage) => m.status === "resolved").length}
                      </Badge>
                    </Button>
                  </div>
                </div>
                
                <div className="mt-3 flex items-center space-x-2">
                  <Badge variant="outline" className="bg-indigo-100 text-indigo-800">
                    {filteredMessages.length} tickets
                  </Badge>
                </div>
              </div>
              
              {/* Support Tickets List */}
              <div className="flex-1 overflow-y-auto">
                {filteredMessages.length > 0 ? (
                  <div className="divide-y divide-gray-200">
                    {filteredMessages.map((msg: ContactMessage) => (
                      <div
                        key={msg.id}
                        className={`p-4 hover:bg-gray-50 cursor-pointer transition-colors border-l-4 ${
                          selectedMessage === msg.id 
                            ? 'bg-indigo-50 border-l-indigo-500' 
                            : 'border-l-transparent'
                        } ${msg.status === 'open' ? 'bg-blue-50/30' : ''}`}
                        onClick={() => handleMessageSelect(msg.id)}
                      >
                        <div className="flex items-start space-x-3">
                          {/* Status Icon */}
                          <div className="flex-shrink-0 mt-1">
                            {getStatusIcon(msg.status)}
                          </div>
                          
                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between">
                              <h3 className={`text-sm font-medium line-clamp-2 ${
                                msg.status === 'open' ? 'text-gray-900 font-semibold' : 'text-gray-700'
                              }`}>
                                {msg.subject}
                              </h3>
                              
                              {/* Time and Priority */}
                              <div className="flex items-center space-x-1 ml-2 flex-shrink-0">
                                {getPriorityIcon(msg.priority)}
                                <span className="text-xs text-gray-400">
                                  {formatTimeAgo(msg.createdAt)}
                                </span>
                              </div>
                            </div>
                            
                            {/* Meta Information */}
                            <div className="flex items-center justify-between mt-2">
                              <div className="flex items-center space-x-2 text-xs text-gray-500">
                                <Badge 
                                  variant="outline" 
                                  className={`text-xs ${msg.status === 'open' ? 'bg-blue-100 text-blue-800 border-blue-200' : ''}`}
                                >
                                  {msg.status.replace('_', ' ')}
                                </Badge>
                                <Badge variant="outline" className="text-xs">
                                  #{msg.caseNumber}
                                </Badge>
                              </div>
                            </div>
                            
                            {/* Last message preview */}
                            <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                              {msg.lastMessage?.content || msg.message || "No message content"}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 px-4">
                    <MessageSquare className="h-16 w-16 mx-auto text-gray-300 mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      {statusFilter === "all" ? "No support tickets yet" : `No ${statusFilter.replace('_', ' ')} tickets`}
                    </h3>
                    <p className="text-gray-500 text-sm">
                      {statusFilter === "all" 
                        ? "Create your first support ticket to get started"
                        : `You don't have any ${statusFilter.replace('_', ' ')} tickets`
                      }
                    </p>
                    <Button onClick={handleNewMessage} className="mt-4" size="sm">
                      <Plus className="h-4 w-4 mr-2" />
                      New Message
                    </Button>
                  </div>
                )}
              </div>
            </div>
            
            {/* Right Panel - Message Details or New Message Form */}
            <div className="flex-1 bg-gray-50 flex flex-col">
              <AnimatePresence mode="wait">
                {selectedMessage && selectedMessageData ? (
                  /* Message Detail View */
                  <motion.div
                    key="message-detail"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.3, ease: "easeInOut" }}
                    className="flex flex-col h-full"
                  >
                    {/* Content Header */}
                    <div className="bg-white border-b border-gray-200 px-6 py-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className="flex items-center space-x-3">
                            {getStatusIcon(selectedMessageData.status)}
                            <div>
                              <h1 className="text-xl font-semibold text-gray-900">
                                {selectedMessageData.subject}
                              </h1>
                              <div className="flex items-center space-x-4 mt-1">
                                {getStatusBadge(selectedMessageData.status)}
                                {getPriorityBadge(selectedMessageData.priority)}
                                <span className="text-sm text-gray-500">
                                  #{selectedMessageData.caseNumber}
                                </span>
                                <span className="text-sm text-gray-500">
                                  {formatDate(selectedMessageData.createdAt)}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          {selectedMessageData.status === "resolved" && (
                            <AlertDialog open={showCloseDialog} onOpenChange={setShowCloseDialog}>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="text-green-600 border-green-200 hover:bg-green-50"
                                >
                                  Close Ticket
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Close this ticket?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    This will mark the ticket as closed. You can still view the conversation history, but no further replies will be expected.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={handleCloseTicket}
                                    className="bg-green-600 hover:bg-green-700 focus:ring-green-500"
                                  >
                                    Yes, close ticket
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          )}
                          {selectedMessageData.status !== "closed" && selectedMessageData.status !== "resolved" && (
                            <AlertDialog open={showCloseDialog} onOpenChange={setShowCloseDialog}>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="text-orange-600 border-orange-200 hover:bg-orange-50"
                                >
                                  Close Ticket
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Close this ticket?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    This will mark the ticket as closed. You can still view the conversation history, but no further replies will be expected.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={handleCloseTicket}
                                    className="bg-orange-600 hover:bg-orange-700 focus:ring-orange-500"
                                  >
                                    Yes, close ticket
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          )}
                          <Button variant="outline" size="sm" onClick={() => setSelectedMessage(null)}>
                            ✕
                          </Button>
                        </div>
                      </div>
                    </div>
                    
                    {/* Content Body */}
                    <div className="flex-1 overflow-y-auto p-6">
                      <div className="max-w-4xl space-y-6">
                        {/* Help Reasons Display */}
                        {selectedMessageData.reasons && selectedMessageData.reasons.length > 0 && (
                          <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
                            <h4 className="text-sm font-medium text-blue-900 mb-2 flex items-center gap-2">
                              <HelpCircle className="h-4 w-4" />
                              What can we help you with?
                            </h4>
                            <div className="flex flex-wrap gap-2">
                              {selectedMessageData.reasons.map((reason: any, index: number) => (
                                <Badge
                                  key={index}
                                  variant="outline"
                                  className="bg-white border-blue-300 text-blue-700 text-xs"
                                >
                                  {reason.contactReason.label}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Conversation Thread */}
                        <div className="space-y-4 max-h-96 overflow-y-auto scroll-smooth">
                          {/* Original Message */}
                          <motion.div 
                            className="bg-gray-50 p-4 rounded-lg"
                            variants={conversationVariants as Variants}
                            initial="hidden"
                            animate="show"
                          >
                            <div className="flex items-center gap-2 mb-2">
                              <User className="h-4 w-4 text-gray-500" />
                              <span className="font-medium">{selectedMessageData.name}</span>
                              <span className="text-sm text-gray-500">
                                {formatDate(selectedMessageData.createdAt)}
                              </span>
                            </div>
                            <p className="text-gray-700">{selectedMessageData.message}</p>
                          </motion.div>

                          {/* All Conversation Messages in Chronological Order */}
                          {selectedMessageData.replies && selectedMessageData.replies.length > 0 && (
                            <AnimatePresence>
                              {selectedMessageData.replies.map((reply: any, index: number) => (
                                <motion.div
                                  key={reply.id}
                                  variants={conversationVariants as Variants}
                                  initial="hidden"
                                  animate="show"
                                  transition={{
                                    delay: index * 0.1,
                                    duration: 0.3
                                  }}
                                  className={`p-4 rounded-lg ${
                                    reply.isFromUser
                                      ? "bg-blue-50 border border-blue-200 ml-8 shadow-sm"
                                      : "bg-green-50 border border-green-200 mr-8 shadow-sm"
                                  }`}
                                >
                                  <div className="flex items-center gap-2 mb-2">
                                    {reply.isFromUser ? (
                                      <User className="h-4 w-4 text-blue-500" />
                                    ) : (
                                      <MessageSquare className="h-4 w-4 text-green-500" />
                                    )}
                                    <span className="font-medium text-sm">
                                      {reply.isFromUser ? "You" : (reply.fromAddress ? reply.fromAddress : "Support Team")}
                                    </span>
                                    <span className="text-xs text-gray-500">
                                      {formatDate(reply.createdAt)}
                                    </span>
                                    {reply.channel && reply.channel !== 'UI' && (
                                      <span className="text-xs bg-gray-200 text-gray-600 px-2 py-1 rounded-full">
                                        {reply.channel.toLowerCase()}
                                      </span>
                                    )}
                                  </div>
                                  <p className={`text-sm whitespace-pre-wrap ${reply.isFromUser ? "text-blue-800" : "text-green-800"}`}>
                                    {reply.message}
                                  </p>
                                </motion.div>
                              ))}
                            </AnimatePresence>
                          )}
                        </div>

                        {/* Status Information */}
                        {selectedMessageData.status === "open" && (
                          <div className="bg-green-50 border border-green-200 p-3 rounded-lg">
                            <div className="flex items-center gap-2">
                              <MessageSquare className="h-4 w-4 text-green-600" />
                              <p className="text-sm text-green-800">
                                <strong>Status: Open</strong> - Your ticket is open and waiting for support staff to respond.
                              </p>
                            </div>
                          </div>
                        )}

                        {selectedMessageData.status === "pending" && (
                          <div className="bg-blue-50 border border-blue-200 p-3 rounded-lg">
                            <div className="flex items-center gap-2">
                              <MessageSquare className="h-4 w-4 text-blue-600" />
                              <p className="text-sm text-blue-800">
                                <strong>Status: Pending</strong> - Support staff are reviewing your ticket and will respond soon.
                              </p>
                            </div>
                          </div>
                        )}

                        {selectedMessageData.status === "in_progress" && (
                          <div className="bg-yellow-50 border border-yellow-200 p-3 rounded-lg">
                            <div className="flex items-center gap-2">
                              <MessageSquare className="h-4 w-4 text-yellow-600" />
                              <p className="text-sm text-yellow-800">
                                <strong>Status: In Progress</strong> - Support staff are actively working on your ticket.
                              </p>
                            </div>
                          </div>
                        )}

                        {selectedMessageData.status === "resolved" && (
                          <div className="bg-purple-50 border border-purple-200 p-3 rounded-lg">
                            <div className="flex items-center gap-2">
                              <MessageSquare className="h-4 w-4 text-purple-600" />
                              <p className="text-sm text-purple-800">
                                <strong>Status: Resolved</strong> - Your issue has been resolved. You can close this ticket if you're satisfied.
                              </p>
                            </div>
                          </div>
                        )}

                        {/* Add Reply - Only show if ticket is not closed */}
                        {selectedMessageData.status !== "closed" && (
                          <>
                            <Separator />
                            <div className="space-y-2">
                              <Label htmlFor="reply" className="text-base font-medium text-foreground">
                                {t("Add Reply", "contact.page.ContactPage.add_reply__16ckols")}
                              </Label>
                              <Textarea
                                id="reply"
                                value={replyText}
                                onChange={(e) => setReplyText(e.target.value)}
                                placeholder={t("Type your reply...", "contact.page.ContactPage.type_your_reply__17ckols")}
                                rows={3}
                              />
                              <div className="text-xs text-gray-500">
                                Adding a reply will update your ticket status to "Pending" as support staff review your response.
                              </div>
                              <Button onClick={handleReply} disabled={!replyText.trim()} className="w-full">
                                <Send className="h-4 w-4 mr-2" />
                                {t("Send Reply", "contact.page.ContactPage.send_reply__18ckols")}
                              </Button>
                            </div>
                          </>
                        )}

                        {/* Closed Ticket Notice */}
                        {selectedMessageData.status === "closed" && (
                          <div className="bg-gray-100 p-4 rounded-lg text-center">
                            <p className="text-gray-600 text-sm">
                              This ticket is closed. If you need further assistance, please create a new contact message.
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ) : showNewMessage || (!selectedMessage && !filteredMessages.length) ? (
                  /* New Message Form */
                  <motion.div
                    key="contact-form"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.3, ease: "easeInOut" }}
                    className="flex flex-col h-full"
                  >
                    {/* Form Header */}
                    <div className="bg-white border-b border-gray-200 px-6 py-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <MessageSquare className="h-6 w-6 text-indigo-600" />
                          <div>
                            <h1 className="text-xl font-semibold text-gray-900">
                              {t("New Support Ticket", "contact.page.ContactPage.new_support_ticket__20ckols")}
                            </h1>
                            <p className="text-sm text-gray-600">
                              {t("Select the reason(s) for contacting support and describe your issue", "contact.page.ContactPage.select_reasons_for_contacting_support__21ckols")}
                            </p>
                          </div>
                        </div>
                        
                        <Button variant="outline" size="sm" onClick={() => setShowNewMessage(false)}>
                          ✕
                        </Button>
                      </div>
                    </div>

                    {/* Form Content */}
                    <div className="bg-white flex-1 overflow-y-auto p-6">
                      <div className="max-w-4xl space-y-6">
                      <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Contact Reasons */}
                        <div className="space-y-4">
                          <Label className="text-base font-medium text-gray-900">
                            {t("What can we help you with?", "contact.page.ContactPage.what_can_we_help_you_with__22ckols")}
                          </Label>
                          <div className="grid gap-3">
                            {contactReasons?.map((reason: { id: string; key: string; label: string; description: string; icon: string }) => {
                              const isSelected = selectedReasons.includes(reason.id);
                              return (
                                <div
                                  key={reason.id}
                                  className={`flex items-start space-x-3 p-4 rounded-lg border transition-all duration-200 ${
                                    isSelected
                                      ? "bg-blue-50 border-blue-300 shadow-sm"
                                      : "border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm"
                                  }`}
                                >
                                  <Checkbox
                                    id={reason.id}
                                    checked={isSelected}
                                    onCheckedChange={() => handleReasonToggle(reason.id)}
                                    className="mt-0.5"
                                  />
                                  <div className="flex items-start space-x-3 flex-1">
                                    <div className={`${isSelected ? "text-blue-600" : "text-gray-500"}`}>
                                      {getReasonIcon(reason.icon)}
                                    </div>
                                    <div className="space-y-1 flex-1">
                                      <label
                                        htmlFor={reason.id}
                                        className={`text-sm font-medium block ${
                                          isSelected ? "text-blue-600" : "text-gray-900"
                                        }`}
                                      >
                                        {reason.label}
                                      </label>
                                      <p className="text-xs text-gray-600">{reason.description}</p>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {/* Subject */}
                        <div className="space-y-2">
                          <Label htmlFor="subject" className="text-base font-medium text-gray-900">
                            {t("Subject", "contact.page.ContactPage.subject__6ckols")}
                          </Label>
                          <Input
                            id="subject"
                            value={formData.subject}
                            onChange={(e) => setFormData(prev => ({ ...prev, subject: e.target.value }))}
                            placeholder={t("Brief description of your issue", "contact.page.ContactPage.brief_description_of_your_issue__23ckols")}
                            required
                            className="border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                          />
                        </div>

                        {/* Message */}
                        <div className="space-y-2">
                          <Label htmlFor="message" className="text-base font-medium text-gray-900">
                            {t("Describe your issue", "contact.page.ContactPage.describe_your_issue__24ckols")}
                          </Label>
                          <Textarea
                            id="message"
                            value={formData.message}
                            onChange={(e) => setFormData(prev => ({ ...prev, message: e.target.value }))}
                            placeholder={t("Please provide as much detail as possible about your issue...", "contact.page.ContactPage.please_provide_detail_about_your_issue__25ckols")}
                            className="min-h-[120px] resize-none border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                            required
                          />
                        </div>

                        {/* Submit Button */}
                        <Button
                          type="submit"
                          disabled={!formData.subject.trim() || !formData.message.trim() || selectedReasons.length === 0 || isSubmitting}
                          className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 border-0 text-white font-medium py-3 text-base transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
                        >
                          {isSubmitting ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                              {t("Sending...", "contact.page.ContactPage.sending__9ckols")}
                            </>
                          ) : (
                            <>
                              <Send className="w-4 h-4 mr-2" />
                              {t("Send Message", "contact.page.ContactPage.send_message__10ckols")}
                            </>
                          )}
                        </Button>
                      </form>
                      </div>
                    </div>
                  </motion.div>
                ) : (
                  /* Empty State */
                  <div className="flex-1 flex items-center justify-center">
                    <div className="text-center">
                      <FileText className="h-16 w-16 mx-auto text-gray-300 mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">
                        Select a support ticket
                      </h3>
                      <p className="text-gray-500 mb-4">
                        Choose a ticket from the list to view its details and conversation history
                      </p>
                      <Button onClick={handleNewMessage} variant="outline">
                        <Plus className="h-4 w-4 mr-2" />
                        Create New Ticket
                      </Button>
                    </div>
                  </div>
                )}
              </AnimatePresence>
            </div>
          </div>
        ) : (
          /* Not logged in - Show login prompt */
          <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
            <MessageSquare className="h-16 w-16 mx-auto text-gray-300 mb-4" />
            <h3 className="text-xl font-medium text-gray-900 mb-2">
              Sign in to contact support
            </h3>
            <p className="text-gray-500 mb-6">
              You need to be signed in to create support tickets and view your conversation history.
            </p>
            <Button className="bg-indigo-600 hover:bg-indigo-700">
              Sign In
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ContactPage;