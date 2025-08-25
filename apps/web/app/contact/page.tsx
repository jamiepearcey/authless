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

import { 
  MessageSquare, 
  Send, 
  User, 
  Calendar, 
  Bug,
  CreditCard,
  Shield,
  HelpCircle,
  ChevronRight
} from "lucide-react";
import { trpc } from "../../lib/trpc";
import { toast } from "@ui/base";

interface ContactMessage {
  id: string;
  subject: string;
  message: string;
  status: string;
  priority: string;
  createdAt: string;
  lastMessage?: {
    content: string;
    createdAt: string;
    isFromUser: boolean;
  };
}

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
  const [selectedMessage, setSelectedMessage] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");

  // tRPC queries and mutations
  const { data: contactReasons } = trpc.getContactReasons.useQuery(
    { tenantId: undefined }, // Will be enhanced with tenant context
    { enabled: !!session?.user }
  );
  const submitMessage = trpc.submitContactMessage.useMutation();
  const { data: userMessages, refetch: refetchMessages } = trpc.getUserContactMessages.useQuery(
    undefined,
    { enabled: !!session?.user }
  );
  const { data: selectedMessageData, refetch: refetchSelectedMessage } = trpc.getContactMessage.useQuery(
    { messageId: selectedMessage! },
    { enabled: !!selectedMessage }
  );
  const addReply = trpc.addContactReply.useMutation();

  // Auto-fill form for logged-in users (only once when session loads)
  useEffect(() => {
    if (session?.user && !formData.name && !formData.email) {
      setFormData(prev => ({
        ...prev,
        name: session.user?.name || "",
        email: session.user?.email || "",
      }));
    }
  }, [session?.user?.name, session?.user?.email]); // Remove formData dependencies

  const handleReasonToggle = (reasonId: string) => {
    setSelectedReasons(prev => 
      prev.includes(reasonId) 
        ? prev.filter(id => id !== reasonId)
        : [...prev, reasonId]
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
          userId: session?.user?.email || undefined, // Using email as identifier for now
        });

      if (result.success) {
        toast.success(result.message);
        setFormData({ name: "", email: "", subject: "", message: "" });
        setSelectedReasons([]);
        refetchMessages();
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Failed to send message";
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReply = async () => {
    if (!replyText.trim() || !selectedMessage) return;

    try {
      const result = await addReply.mutateAsync({
        messageId: selectedMessage,
        message: replyText,
      });

      if (result.success) {
        toast.success(result.message);
        setReplyText("");
        refetchSelectedMessage();
        refetchMessages();
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Failed to send reply";
      toast.error(errorMessage);
    }
  };



  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'open':
        return <Badge variant="default" className="bg-primary text-primary-foreground">Open</Badge>;
      case 'pending':
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-700 border-yellow-200">Pending</Badge>;
      case 'in_progress':
        return <Badge variant="secondary" className="bg-blue-100 text-blue-700 border-blue-200">In Progress</Badge>;
      case 'resolved':
        return <Badge variant="secondary" className="bg-green-100 text-green-700 border-green-200">Resolved</Badge>;
      case 'closed':
        return <Badge variant="secondary" className="bg-gray-100 text-gray-700 border-gray-200">Closed</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'low':
        return <Badge variant="outline" className="text-gray-600">Low</Badge>;
      case 'normal':
        return <Badge variant="secondary" className="bg-blue-100 text-blue-700 border-blue-200">Normal</Badge>;
      case 'high':
        return <Badge variant="secondary" className="bg-orange-100 text-orange-700 border-orange-200">High</Badge>;
      case 'urgent':
        return <Badge variant="secondary" className="bg-red-100 text-red-700 border-red-200">Urgent</Badge>;
      default:
        return <Badge variant="outline">Normal</Badge>;
    }
  };

  const getReasonIcon = (iconName: string) => {
    switch (iconName) {
      case 'Bug':
        return <Bug className="h-5 w-5" />;
      case 'CreditCard':
        return <CreditCard className="h-5 w-5" />;
      case 'Shield':
        return <Shield className="h-5 w-5" />;
      case 'MessageCircle':
        return <MessageSquare className="h-5 w-5" />;
      case 'HelpCircle':
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

  if (status === "loading") {
    return (
      <main className="flex flex-1 pt-8 pb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading...</p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="flex flex-1 pt-8 pb-8">
      <div className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            {t("Contact Us", "contact.page.ContactPage.contact_us__1itlrq")}
          </h1>
          <p className="text-gray-600">
            {t("Get in touch with our support team. We're here to help!", "contact.page.ContactPage.get_in_touch_with_our_support_team__2bkoks")}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Left Sidebar - User Profile & Conversation History */}
          {session?.user && (
            <div className="lg:col-span-1">
              <div className="space-y-6">
                {/* User Profile Card */}
                <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
                  <CardContent className="p-6">
                    <div className="flex items-center space-x-3">
                      <Avatar className="h-12 w-12 border-2 border-blue-200">
                        <AvatarImage src={session.user.image || ""} alt={session.user.name || ""} />
                        <AvatarFallback className="bg-blue-100 text-blue-600 font-semibold">
                          <User className="h-6 w-6" />
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <h3 className="font-semibold text-gray-900">{session.user.name}</h3>
                        <p className="text-sm text-gray-600">{session.user.email}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Conversation History */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <MessageSquare className="h-5 w-5" />
                      {t("Conversation History", "contact.page.ContactPage.conversation_history__11ckols")}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="h-96 overflow-y-auto">
                      {userMessages && userMessages.length > 0 ? (
                        <div className="space-y-1 p-3">
                          {userMessages.map((msg: ContactMessage) => (
                            <div 
                              key={msg.id} 
                              className={`p-3 rounded-lg cursor-pointer transition-colors hover:bg-gray-50 ${
                                selectedMessage === msg.id ? 'bg-blue-50 border border-blue-200' : ''
                              }`}
                              onClick={() => setSelectedMessage(msg.id)}
                            >
                              <div className="flex items-start justify-between mb-2">
                                <h4 className="font-medium text-sm text-gray-900 line-clamp-2">
                                  {msg.subject}
                                </h4>
                                <ChevronRight className="h-4 w-4 text-gray-400" />
                              </div>
                              <div className="flex items-center gap-2 mb-2">
                                {getStatusBadge(msg.status)}
                                {getPriorityBadge(msg.priority)}
                              </div>
                              <p className="text-xs text-gray-600 line-clamp-2 mb-2">
                                {msg.lastMessage?.content || msg.message}
                              </p>
                              <div className="flex items-center gap-2 text-xs text-gray-500">
                                <Calendar className="h-3 w-3" />
                                {formatDate(msg.createdAt)}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-8 text-gray-500">
                          <MessageSquare className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                          <p className="text-sm">{t("No conversations yet", "contact.page.ContactPage.no_conversations_yet__19ckols")}</p>
                        </div>
                                              )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {/* Main Content - Contact Form or Message Detail */}
          <div className="lg:col-span-3">
            {selectedMessage && selectedMessageData ? (
              /* Message Detail View */
              <Card className="h-full">
                <CardHeader className="border-b">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-xl">{selectedMessageData.subject}</CardTitle>
                      <div className="flex items-center gap-2 mt-2">
                        {getStatusBadge(selectedMessageData.status)}
                        {getPriorityBadge(selectedMessageData.priority)}
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedMessage(null)}
                    >
                      ✕
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="space-y-4">
                    {/* Original Message */}
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <User className="h-4 w-4 text-gray-500" />
                        <span className="font-medium">{selectedMessageData.name}</span>
                        <span className="text-sm text-gray-500">
                          {formatDate(selectedMessageData.createdAt)}
                        </span>
                      </div>
                      <p className="text-gray-700">{selectedMessageData.message}</p>
                    </div>

                    {/* Add Reply */}
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
                      <Button
                        onClick={handleReply}
                        disabled={!replyText.trim()}
                        className="w-full"
                      >
                        <Send className="h-4 w-4 mr-2" />
                        {t("Send Reply", "contact.page.ContactPage.send_reply__18ckols")}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : (
              /* Contact Form */
              <Card className="h-full bg-gradient-to-br from-white to-blue-50 border-blue-200 shadow-lg">
                <CardHeader className="space-y-1">
                  <CardTitle className="text-2xl font-semibold text-gray-900 flex items-center gap-2">
                    <MessageSquare className="h-6 w-6 text-blue-600" />
                    {t("Get Help", "contact.page.ContactPage.get_help__20ckols")}
                  </CardTitle>
                  <p className="text-gray-600">
                    {t("Select the reason(s) for contacting support and describe your issue", "contact.page.ContactPage.select_reasons_for_contacting_support__21ckols")}
                  </p>
                </CardHeader>
                
                <CardContent className="space-y-6">
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
                                  ? 'bg-blue-50 border-blue-300 shadow-sm' 
                                  : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
                              }`}
                            >
                              <Checkbox
                                id={reason.id}
                                checked={isSelected}
                                onCheckedChange={() => handleReasonToggle(reason.id)}
                                className="mt-0.5"
                              />
                              <div className="flex items-start space-x-3 flex-1">
                                <div className={`${isSelected ? 'text-blue-600' : 'text-gray-500'}`}>
                                  {getReasonIcon(reason.icon)}
                                </div>
                                <div className="space-y-1 flex-1">
                                  <label 
                                    htmlFor={reason.id} 
                                    className={`text-sm font-medium block ${
                                      isSelected ? 'text-blue-600' : 'text-gray-900'
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
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </main>
  );
};

export default ContactPage;
