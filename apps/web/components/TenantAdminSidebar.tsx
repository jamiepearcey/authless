"use client";

import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { 
  Building2, 
  Users, 
  Bell, 
  Settings,
  HelpCircle,
  ArrowLeft
} from "lucide-react";

interface TenantAdminSidebarProps {
  tenantSlug: string;
  className?: string;
}

export function TenantAdminSidebar({ tenantSlug, className }: TenantAdminSidebarProps) {
  const pathname = usePathname();
  const { data: session } = useSession();
  
  // Check if user is a platform administrator
  const isPlatformAdmin = session?.user?.platformRole === "admin";
  
  const navigationItems = [
    {
      name: "Dashboard",
      href: `/tenants/${tenantSlug}`,
      icon: Building2,
      description: "Workspace overview"
    },
    {
      name: "Users",
      href: `/tenants/${tenantSlug}/admin/users`,
      icon: Users,
      description: "Team management"
    },
    {
      name: "Notifications",
      href: `/tenants/${tenantSlug}/admin/notifications`,
      icon: Bell,
      description: "Workspace notifications"
    },
    {
      name: "Support",
      href: `/tenants/${tenantSlug}/admin/support`,
      icon: HelpCircle,
      description: "Support cases"
    },
    {
      name: "Settings",
      href: `/tenants/${tenantSlug}/admin/settings`,
      icon: Settings,
      description: "Workspace configuration"
    }
  ];

  return (
    <aside className={`py-6 px-2 sm:px-6 lg:col-span-3 ${className}`}>
      {/* Back to Platform - Only visible for platform administrators */}
      {isPlatformAdmin && (
        <div className="mb-6">
          <Link
            href="/admin/tenants"
            className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Platform
          </Link>
        </div>
      )}

      <nav className="space-y-1">
        {navigationItems.map((item) => {
          // Special handling for Dashboard - only active on exact match
          const isActive = item.name === "Dashboard" 
            ? pathname === item.href
            : pathname === item.href || pathname.startsWith(item.href + "/");
          const Icon = item.icon;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`group flex items-center px-3 py-2 text-sm font-medium rounded-md ${
                isActive 
                  ? "bg-indigo-50 border-indigo-200 text-indigo-700" 
                  : "text-gray-900 hover:text-gray-700 hover:bg-gray-50"
              }`}
            >
              <Icon
                className={`flex-shrink-0 -ml-1 mr-3 h-5 w-5 ${
                  isActive ? "text-indigo-500" : "text-gray-400 group-hover:text-gray-500"
                }`}
              />
              <div>
                <div className="font-medium">{item.name}</div>
                <div className="text-xs text-gray-500">
                  {item.description}
                </div>
              </div>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
