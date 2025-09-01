"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { 
  Building2, 
  Users, 
  Bell, 
  Settings,
  BarChart3,
  Shield,
  HelpCircle,
  Home
} from "lucide-react";

interface AdminSidebarProps {
  className?: string;
}

export function AdminSidebar({ className }: AdminSidebarProps) {
  const pathname = usePathname();
  
  const navigationItems = [
    {
      name: "Dashboard",
      href: "/admin",
      icon: Home,
      description: "Platform overview and metrics"
    },
    {
      name: "Tenants",
      href: "/admin/tenants",
      icon: Building2,
      description: "Manage workspaces"
    },
    {
      name: "Users",
      href: "/admin/users",
      icon: Users,
      description: "User management"
    },
    {
      name: "Notifications",
      href: "/admin/notifications",
      icon: Bell,
      description: "System notifications"
    },
    {
      name: "Support",
      href: "/admin/support",
      icon: HelpCircle,
      description: "Support case management"
    },
    {
      name: "Security",
      href: "/admin/security",
      icon: Shield,
      description: "Security settings"
    },
    {
      name: "Settings",
      href: "/admin/settings",
      icon: Settings,
      description: "Platform configuration"
    }
  ];

  return (
    <aside className={`py-6 px-2 sm:px-6 lg:col-span-3 ${className}`}>
      <nav className="space-y-1">
        {navigationItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
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
