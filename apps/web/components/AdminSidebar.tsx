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
  Home,
  Database,
  Activity,
  Mail,
  Zap,
  CreditCard
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
      name: "Payment Options",
      href: "/admin/payment-options",
      icon: CreditCard,
      description: "Order configurations and pricing"
    },
    {
      name: "Security",
      href: "/admin/security",
      icon: Shield,
      description: "Security settings"
    },
    {
      name: "Inbox",
      href: "/admin/inbox",
      icon: Mail,
      description: "Inbound event monitoring"
    },
    {
      name: "Outbox",
      href: "/admin/outbox",
      icon: Database,
      description: "Event processing monitoring"
    },
    {
      name: "Audit",
      href: "/admin/audit",
      icon: Activity,
      description: "System audit logs"
    },
    {
      name: "Settings",
      href: "/admin/settings",
      icon: Settings,
      description: "Platform configuration"
    }
  ];

  return (
    <aside className={`lg:col-span-2 ${className}`}>
      <nav className="space-y-1">
        {navigationItems.map((item) => {
          // Special handling for dashboard - only active if exactly /admin
          const isActive = item.href === "/admin" 
            ? pathname === "/admin"
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
