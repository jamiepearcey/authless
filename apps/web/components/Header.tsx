"use client";

import { useSession, signOut } from "next-auth/react";
import { useCallback } from "react";
import Link from "next/link";
import { Button, NotificationBell } from "@ui/base";
import { Settings, User, LogOut, Shield, Building2 } from "lucide-react";
import TenantSwitcher from "./TenantSwitcher";
import { navigationLinks } from "./links";
import { trpc } from "@/lib/trpc";
import { useBasicNotificationSubscription, useCentrifugo, NotificationMessage } from "@/hooks/useNotificationSubscription";
import { useRouter } from "next/navigation";
import TwoFactorPrompt from "./TwoFactorPrompt";

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
    if (message.type === 'notification_created') {
      refetchUnreadCount();
      refetchNotifications();
    }
  }, [refetchUnreadCount, refetchNotifications]);

  // Get Centrifugo connection status
  useCentrifugo();
  
  // Subscribe to real-time notifications
  useBasicNotificationSubscription(handleRealtimeNotification);

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
<>
      {/* 2FA Prompt Banner */}
      <TwoFactorPrompt 
        variant="banner"
        enforceAfter={7}
        showReminders={true}
        reminderInterval={24}
      />
    <header className="bg-white/95 backdrop-blur-sm shadow-sm border-b border-gray-200 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Left Section: Logo + Navigation */}
          <div className="flex items-center space-x-8">
            {/* Logo */}
            <Link href="/" className="text-xl font-bold text-indigo-600 hover:text-indigo-700 transition-colors">
              Authless
            </Link>

            {/* Navigation - Always left-aligned, fixed positioning */}
            <nav className="hidden md:flex items-center space-x-1">
              {navigationLinks.map((link: any) => {
                // Skip admin-only links for non-admin users
                if (link.adminOnly && (session?.user as any)?.platformRole !== 'admin') {
                  return null;
                }
                
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="relative px-4 py-2 text-sm font-medium text-gray-700 hover:text-indigo-600 transition-all duration-200 rounded-lg hover:bg-indigo-50 flex items-center gap-2 group"
                  >
                    {link.adminOnly && (
                      <Shield className="h-3.5 w-3.5 text-indigo-500 group-hover:text-indigo-600" />
                    )}
                    <span>{link.label}</span>
                    <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 h-0.5 w-0 bg-indigo-600 transition-all duration-200 group-hover:w-6"></div>
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Right Section: Auth/User Menu */}
          <div className="flex items-center space-x-3">
            {status === "loading" ? (
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600"></div>
            ) : session ? (
              <>
                {/* Tenant Switcher - Fixed width to prevent layout shifts */}
                <div className="min-w-[200px]">
                  <TenantSwitcher />
                </div>
                
                {/* Notification Bell */}
                <div className="relative">
                  <NotificationBell
                    unreadCount={unreadCount || 0}
                    notifications={allNotifications}
                    onMarkAsRead={handleMarkAsRead}
                    onMarkAllAsRead={handleMarkAllAsRead}
                    onViewAllNotifications={() => router.push("/notifications")}
                    onArchive={handleArchive}
                    isLoading={false}
                  />
                </div>
                
                {/* User Menu */}
                <div className="relative group">
                  <button className="flex items-center space-x-3 px-3 py-2 rounded-lg text-gray-700 hover:text-indigo-600 hover:bg-indigo-50 transition-all duration-200 group">
                    <div className="relative">
                      <div className="w-9 h-9 bg-gradient-to-br from-indigo-100 to-indigo-200 rounded-full flex items-center justify-center ring-2 ring-white shadow-sm group-hover:shadow-md transition-shadow">
                        {session.user?.image ? (
                          <img
                            src={session.user.image}
                            alt="Profile"
                            className="w-9 h-9 rounded-full object-cover"
                          />
                        ) : (
                          <User className="h-4 w-4 text-indigo-700" />
                        )}
                      </div>
                      {/* Online status indicator */}
                      <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-white shadow-sm"></div>
                    </div>
                    <div className="hidden sm:block text-left">
                      <p className="text-sm font-medium leading-none">
                        {session.user?.name || 'User'}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {(session.user as any)?.platformRole === 'admin' ? 'Platform Admin' : 'Member'}
                      </p>
                    </div>
                    <div className="w-4 h-4 text-gray-400 group-hover:text-indigo-500 transition-colors">
                      <svg viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
                      </svg>
                    </div>
                  </button>

                  {/* Dropdown Menu */}
                  <div className="absolute right-0 mt-3 w-64 bg-white rounded-xl shadow-xl border border-gray-100 py-2 z-50 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 transform translate-y-1 group-hover:translate-y-0">
                    {/* User Info Header */}
                    <div className="px-4 py-3 border-b border-gray-100">
                      <p className="text-sm font-medium text-gray-900">{session.user?.name || 'User'}</p>
                      <p className="text-xs text-gray-500">{session.user?.email}</p>
                    </div>

                    {/* User Actions */}
                    <div className="py-1">
                      <Link
                        href="/notifications"
                        className="flex items-center px-4 py-2.5 text-sm text-gray-700 hover:bg-indigo-50 hover:text-indigo-700 transition-colors"
                      >
                        <User className="h-4 w-4 mr-3 text-gray-400" />
                        Notifications
                      </Link>
                      <Link
                        href="/settings/profile"
                        className="flex items-center px-4 py-2.5 text-sm text-gray-700 hover:bg-indigo-50 hover:text-indigo-700 transition-colors"
                      >
                        <User className="h-4 w-4 mr-3 text-gray-400" />
                        Profile
                      </Link>
                      <Link
                        href="/settings/account"
                        className="flex items-center px-4 py-2.5 text-sm text-gray-700 hover:bg-indigo-50 hover:text-indigo-700 transition-colors"
                      >
                        <Settings className="h-4 w-4 mr-3 text-gray-400" />
                        Account Settings
                      </Link>
                    </div>
                    
                    {/* Admin Functions */}
                    {(session?.user as any)?.platformRole === 'admin' && (
                      <>
                        <div className="border-t border-gray-100 my-1"></div>
                        <div className="px-4 py-2">
                          <p className="text-xs font-semibold text-indigo-600 uppercase tracking-wider">Platform Admin</p>
                        </div>
                        <div className="py-1">
                          <Link
                            href="/admin/tenants"
                            className="flex items-center px-4 py-2.5 text-sm text-gray-700 hover:bg-indigo-50 hover:text-indigo-700 transition-colors"
                          >
                            <Shield className="h-4 w-4 mr-3 text-indigo-500" />
                            Manage Tenants
                          </Link>
                          <Link
                            href="/admin/tenants/create"
                            className="flex items-center px-4 py-2.5 text-sm text-gray-700 hover:bg-indigo-50 hover:text-indigo-700 transition-colors"
                          >
                            <Building2 className="h-4 w-4 mr-3 text-indigo-500" />
                            Create Tenant
                          </Link>
                          <Link
                            href="/admin/notifications"
                            className="flex items-center px-4 py-2.5 text-sm text-gray-700 hover:bg-indigo-50 hover:text-indigo-700 transition-colors"
                          >
                            <Shield className="h-4 w-4 mr-3 text-indigo-500" />
                            Manage Notifications
                          </Link>
                        </div>
                      </>
                    )}
                 
                    <div className="border-t border-gray-100 my-1"></div>
                    <div className="py-1">
                      <button
                        onClick={() => signOut()}
                        className="flex items-center w-full px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                      >
                        <LogOut className="h-4 w-4 mr-3" />
                        Sign Out
                      </button>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex items-center space-x-4">
                <Link href="/auth/signin/passkey">
                  <Button variant="outline">Sign In</Button>
                </Link>
                <Link href="/auth/signup">
                  <Button>Sign Up</Button>
                </Link>
              </div>
            )}
          </div>
        </div>
          </div>
    </header>
    </>
  );
}
