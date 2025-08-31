"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  Building2, 
  Users, 
  Bell, 
  Settings,
  Shield,
  HelpCircle
} from "lucide-react";

interface TenantNavigationProps {
  tenantSlug: string;
}

export function TenantNavigation({ tenantSlug }: TenantNavigationProps) {
  const pathname = usePathname();
  
  const isActive = (path: string) => {
    if (path === `/tenants/${tenantSlug}`) {
      return pathname === path;
    }
    return pathname.startsWith(path);
  };

  const getActiveStyles = (path: string) => {
    const active = isActive(path);
    return {
      text: active ? "text-indigo-600" : "text-gray-500 hover:text-indigo-600",
      underline: active ? "scale-x-100" : "scale-x-0 group-hover:scale-x-100",
    };
  };

  return (
    <nav className="flex space-x-6 overflow-x-auto">
      <Link
        href={`/tenants/${tenantSlug}`}
        className={`relative group px-3 py-2 text-sm font-medium transition-colors duration-200 whitespace-nowrap flex items-center ${getActiveStyles(`/tenants/${tenantSlug}`).text}`}
      >
        <Building2 className="h-4 w-4 mr-2 flex-shrink-0" />
        Dashboard
        <div className={`absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 transform transition-transform duration-200 ${getActiveStyles(`/tenants/${tenantSlug}`).underline}`}></div>
      </Link>
      <Link
        href={`/tenants/${tenantSlug}/admin/users`}
        className={`relative group px-3 py-2 text-sm font-medium transition-colors duration-200 whitespace-nowrap flex items-center ${getActiveStyles(`/tenants/${tenantSlug}/admin/users`).text}`}
      >
        <Users className="h-4 w-4 mr-2 flex-shrink-0" />
        Users
        <div className={`absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 transform transition-transform duration-200 ${getActiveStyles(`/tenants/${tenantSlug}/admin/users`).underline}`}></div>
      </Link>
      <Link
        href={`/tenants/${tenantSlug}/admin/notifications`}
        className={`relative group px-3 py-2 text-sm font-medium transition-colors duration-200 whitespace-nowrap flex items-center ${getActiveStyles(`/tenants/${tenantSlug}/admin/notifications`).text}`}
      >
        <Bell className="h-4 w-4 mr-2 flex-shrink-0" />
        Notifications
        <div className={`absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 transform transition-transform duration-200 ${getActiveStyles(`/tenants/${tenantSlug}/admin/notifications`).underline}`}></div>
      </Link>
      <Link
        href={`/tenants/${tenantSlug}/admin/support`}
        className={`relative group px-3 py-2 text-sm font-medium transition-colors duration-200 whitespace-nowrap flex items-center ${getActiveStyles(`/tenants/${tenantSlug}/admin/support`).text}`}
      >
        <HelpCircle className="h-4 w-4 mr-2 flex-shrink-0" />
        Support
        <div className={`absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 transform transition-transform duration-200 ${getActiveStyles(`/tenants/${tenantSlug}/admin/support`).underline}`}></div>
      </Link>
      <Link
        href={`/tenants/${tenantSlug}/admin/settings`}
        className={`relative group px-3 py-2 text-sm font-medium transition-colors duration-200 whitespace-nowrap flex items-center ${getActiveStyles(`/tenants/${tenantSlug}/admin/settings`).text}`}
      >
        <Settings className="h-4 w-4 mr-2 flex-shrink-0" />
        Settings
        <div className={`absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 transform transition-transform duration-200 ${getActiveStyles(`/tenants/${tenantSlug}/admin/settings`).underline}`}></div>
      </Link>
    </nav>
  );
}
