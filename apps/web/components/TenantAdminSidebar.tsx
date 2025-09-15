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
    <aside className={`${className}`}>
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
              className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors ${
                isActive 
                  ? "bg-indigo-50 border-indigo-200 text-indigo-700" 
                  : "text-gray-700 hover:text-gray-900 hover:bg-gray-50"
              }`}
              title={item.description}
            >
              <Icon
                className={`flex-shrink-0 h-4 w-4 mr-2 ${
                  isActive ? "text-indigo-500" : "text-gray-400 group-hover:text-gray-500"
                }`}
              />
              <span className="truncate">{item.name}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
