"use client";

import { useSession, signOut } from "next-auth/react";
import { useState, useCallback, useEffect } from "react";
import Link from "next/link";
import { Button, NotificationBell } from "@ui/base";
import { Settings, User, LogOut, Shield, Building2 } from "lucide-react";
import TenantSwitcher from "./TenantSwitcher";
import { navigationLinks } from "./links";
import { trpc } from "@/lib/trpc";
import { useBasicNotificationSubscription, useCentrifugo, NotificationMessage } from "@/hooks/useNotificationSubscription";
import { useRouter } from "next/navigation";

export default function Header() {
  const { data: session, status } = useSession();
  const router = useRouter();
  // Get notification data
  const { data: unreadCount, refetch: refetchUnreadCount } = trpc.getUnreadCount.useQuery();
  const { data: notificationsData, refetch: refetchNotifications } = trpc.getUserNotifications.useQuery({ limit: 5 });
  
  // Mutations for notification actions
  const markAsReadMutation = trpc.markAsRead.useMutation();
  const markAllAsReadMutation = trpc.markAllAsRead.useMutation();
  const archiveMutation = trpc.archiveNotification.useMutation();

  // Real-time notification handler
  const handleRealtimeNotification = useCallback((message: NotificationMessage) => {
    console.log('Received real-time notification:', message);
    
    if (message.type === 'notification_created') {
      refetchUnreadCount();
      refetchNotifications();
    }
  }, [refetchUnreadCount, refetchNotifications]);

  // Get Centrifugo connection status
  const { isConnected } = useCentrifugo();
  
  // Subscribe to real-time notifications
  const { isSubscribed, hasErrors } = useBasicNotificationSubscription(handleRealtimeNotification);

  // Log connection status (for debugging)
  useEffect(() => {
    if (session?.user?.id) {
      console.log('Centrifugo connection status:', { isSubscribed, isConnected, hasErrors });
    }
  }, [isSubscribed, isConnected, hasErrors, session?.user?.id]);

  // Combine server-side and real-time notifications
  const allNotifications = notificationsData?.items ?? []

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      await markAsReadMutation.mutateAsync({
        notificationId,
        userId: session?.user?.id || "",
      });
    } catch (error) {
      console.error("Failed to mark notification as read:", error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await markAllAsReadMutation.mutateAsync();
    } catch (error) {
      console.error("Failed to mark all notifications as read:", error);
    }
  };

  const handleArchive = async (notificationId: string) => {
    try {
      await archiveMutation.mutateAsync({ notificationId });
    } catch (error) {
      console.error("Failed to archive notification:", error);
    }
  };

  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex items-center">
            <Link href="/" className="text-xl font-bold text-indigo-600">
              Authless
            </Link>
          </div>

          {/* Navigation */}
          <nav className="hidden md:flex space-x-8">
            {navigationLinks.map((link: any) => {
              // Skip admin-only links for non-admin users
              if (link.adminOnly && (session?.user as any)?.platformRole !== 'admin') {
                return null;
              }
              
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-gray-700 hover:text-indigo-600 px-3 py-2 text-sm font-medium transition-colors flex items-center gap-1"
                >
                  {link.adminOnly && <Shield className="h-3 w-3" />}
                  {link.label}
                </Link>
              );
            })}
          </nav>

          {/* Auth Section */}
          <div className="flex items-center space-x-4">
            {status === "loading" ? (
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600"></div>
            ) : session ? (
              <div className="flex items-center space-x-4">
                {/* Tenant Switcher in fixed size container so it doesnt wabble */}
                <div className="w-70">
                  <TenantSwitcher />
                </div>
                
                {/* Notification Bell */}
                <NotificationBell
                  unreadCount={unreadCount || 0}
                  notifications={allNotifications}
                  onMarkAsRead={handleMarkAsRead}
                  onMarkAllAsRead={handleMarkAllAsRead}
                  onViewAllNotifications={() => router.push("/notifications")}
                  onArchive={handleArchive}
                  isLoading={false}
                />
                
                {/* User Menu */}
                <div className="relative group">
                  <button className="flex items-center space-x-2 text-gray-700 hover:text-indigo-600 transition-colors">
                    <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center">
                      {session.user?.image ? (
                        <img
                          src={session.user.image}
                          alt="Profile"
                          className="w-8 h-8 rounded-full"
                        />
                      ) : (
                        <User className="h-4 w-4 text-indigo-600" />
                      )}
                    </div>
                    <span className="text-sm font-medium">
                      {session.user?.name}
                    </span>
                  </button>

                  {/* Dropdown Menu */}
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
                    <Link
                      href="/notifications"
                      className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      <User className="h-4 w-4 mr-2" />
                      Notifications
                    </Link>
                    <Link
                      href="/settings/profile"
                      className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      <User className="h-4 w-4 mr-2" />
                      Profile
                    </Link>
                    <Link
                      href="/settings/account"
                      className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      <Settings className="h-4 w-4 mr-2" />
                      Account
                    </Link>
                    
                    {/* Admin Functions */}
                    {(session?.user as any)?.platformRole === 'admin' && (
                      <>
                        <hr className="my-1" />
                        <div className="px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Platform Admin
                        </div>
                        <Link
                          href="/admin/tenants"
                          className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        >
                          <Shield className="h-4 w-4 mr-2" />
                          Manage Tenants
                        </Link>
                        <Link
                          href="/admin/tenants/create"
                          className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        >
                          <Building2 className="h-4 w-4 mr-2" />
                          Create Tenant
                        </Link>
                        <Link
                          href="/admin/notifications"
                          className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        >
                          <Shield className="h-4 w-4 mr-2" />
                          Manage Notifications
                        </Link>
                      </>
                    )}
                 
                    <hr className="my-1" />
                    <button
                      onClick={() => signOut()}
                      className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      <LogOut className="h-4 w-4 mr-2" />
                      Sign Out
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center space-x-4">
                <Link href="/passkey-select">
                  <Button variant="outline">Sign In</Button>
                </Link>
                <Link href="/signup">
                  <Button>Sign Up</Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
