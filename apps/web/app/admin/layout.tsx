"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { Tabs, TabsList, TabsTrigger } from "@ui/base";
import { 
  Building2, 
  Users, 
  Bell, 
  Settings,
  BarChart3,
  Shield,
  HelpCircle
} from "lucide-react";

interface AdminLayoutProps {
  children: React.ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const pathname = usePathname();
  
  // Extract the current tab from the pathname
  const getCurrentTab = () => {
    if (pathname === "/admin" || pathname.startsWith("/admin/dashboard")) return "dashboard";
    if (pathname.startsWith("/admin/tenants")) return "tenants";
    if (pathname.startsWith("/admin/users")) return "users";
    if (pathname.startsWith("/admin/notifications")) return "notifications";
    if (pathname.startsWith("/admin/settings")) return "settings";
    if (pathname.startsWith("/admin/security")) return "security";
    if (pathname.startsWith("/admin/support")) return "support";
    return "dashboard";
  };

  const currentTab = getCurrentTab();

  return (
    <div className="flex-1 space-y-6 mb-8">
      {/* Platform Admin Navigation */}
      <div className="border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Tabs value={currentTab} className="w-full">
            <TabsList className="grid w-full grid-cols-7 bg-transparent h-auto p-0 border-none">
              <TabsTrigger 
                value="dashboard" 
                className="flex items-center gap-2 px-4 py-3 data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-indigo-600 rounded-none"
                asChild
              >
                <Link href="/admin">
                  <BarChart3 className="h-4 w-4" />
                  Dashboard
                </Link>
              </TabsTrigger>
              <TabsTrigger 
                value="tenants" 
                className="flex items-center gap-2 px-4 py-3 data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-indigo-600 rounded-none"
                asChild
              >
                <Link href="/admin/tenants">
                  <Building2 className="h-4 w-4" />
                  Tenants
                </Link>
              </TabsTrigger>
              <TabsTrigger 
                value="users" 
                className="flex items-center gap-2 px-4 py-3 data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-indigo-600 rounded-none"
                asChild
              >
                <Link href="/admin/users">
                  <Users className="h-4 w-4" />
                  Users
                </Link>
              </TabsTrigger>
              <TabsTrigger 
                value="notifications" 
                className="flex items-center gap-2 px-4 py-3 data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-indigo-600 rounded-none"
                asChild
              >
                <Link href="/admin/notifications">
                  <Bell className="h-4 w-4" />
                  Notifications
                </Link>
              </TabsTrigger>
              <TabsTrigger 
                value="security" 
                className="flex items-center gap-2 px-4 py-3 data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-indigo-600 rounded-none"
                asChild
              >
                <Link href="/admin/security">
                  <Shield className="h-4 w-4" />
                  Security
                </Link>
              </TabsTrigger>
              <TabsTrigger 
                value="support" 
                className="flex items-center gap-2 px-4 py-3 data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-indigo-600 rounded-none"
                asChild
              >
                <Link href="/admin/support">
                  <HelpCircle className="h-4 w-4" />
                  Support
                </Link>
              </TabsTrigger>
              <TabsTrigger 
                value="settings" 
                className="flex items-center gap-2 px-4 py-3 data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-indigo-600 rounded-none"
                asChild
              >
                <Link href="/admin/settings">
                  <Settings className="h-4 w-4" />
                  Settings
                </Link>
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {/* Page Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {children}
      </div>
    </div>
  );
}