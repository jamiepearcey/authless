"use client";

import { usePathname } from "next/navigation";

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
    <nav className="flex space-x-8">
      <a
        href={`/tenants/${tenantSlug}`}
        className={`relative group px-3 py-2 text-sm font-medium transition-colors duration-200 ${getActiveStyles(`/tenants/${tenantSlug}`).text}`}
      >
        Dashboard
        <div className={`absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 transform transition-transform duration-200 ${getActiveStyles(`/tenants/${tenantSlug}`).underline}`}></div>
      </a>
      <a
        href={`/tenants/${tenantSlug}/admin/users`}
        className={`relative group px-3 py-2 text-sm font-medium transition-colors duration-200 ${getActiveStyles(`/tenants/${tenantSlug}/admin/users`).text}`}
      >
        Users
        <div className={`absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 transform transition-transform duration-200 ${getActiveStyles(`/tenants/${tenantSlug}/admin/users`).underline}`}></div>
      </a>
      <a
        href={`/tenants/${tenantSlug}/admin/notifications`}
        className={`relative group px-3 py-2 text-sm font-medium transition-colors duration-200 ${getActiveStyles(`/tenants/${tenantSlug}/admin/notifications`).text}`}
      >
        Notifications
        <div className={`absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 transform transition-transform duration-200 ${getActiveStyles(`/tenants/${tenantSlug}/admin/notifications`).underline}`}></div>
      </a>
      <a
        href={`/tenants/${tenantSlug}/admin/settings`}
        className={`relative group px-3 py-2 text-sm font-medium transition-colors duration-200 ${getActiveStyles(`/tenants/${tenantSlug}/admin/settings`).text}`}
      >
        Settings
        <div className={`absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 transform transition-transform duration-200 ${getActiveStyles(`/tenants/${tenantSlug}/admin/settings`).underline}`}></div>
      </a>
    </nav>
  );
}
