"use client";

import { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { TenantAdminSidebar } from "@/components/TenantAdminSidebar";
import { SidebarLayout } from "@/components/SidebarLayout";
import { BreadcrumbItem } from "./BreadcrumbNavigation";
import { AuthGuard } from "./AuthGuard";

interface TenantLayoutProps {
  children: ReactNode;
  tenantSlug: string;
  className?: string;
}

export function TenantLayout({ 
  children, 
  tenantSlug, 
  className = ""
}: TenantLayoutProps) {
  const pathname = usePathname();

  // Determine breadcrumbs based on current path
  const getBreadcrumbs = (): BreadcrumbItem[] => {
    const pathSegments = pathname.split('/').filter(Boolean);
    
    // Base breadcrumbs
    const baseBreadcrumbs: BreadcrumbItem[] = [
      { label: "Tenants", href: "/tenants/dashboard" },
      { label: tenantSlug, href: `/tenants/${tenantSlug}` },
    ];

    // Add admin breadcrumb if we're in admin section
    if (pathSegments.includes('admin')) {
      // Add specific admin page breadcrumb
      const adminPage = pathSegments[pathSegments.length - 1];
      switch (adminPage) {
        case 'users':
          baseBreadcrumbs.push({ label: "Users", current: true });
          break;
        case 'settings':
          baseBreadcrumbs.push({ label: "Tenant Settings", current: true });
          break;
        case 'notifications':
          baseBreadcrumbs.push({ label: "Notifications", current: true });
          break;
        case 'support':
          baseBreadcrumbs.push({ label: "Support", current: true });
          break;
        default:
          baseBreadcrumbs.push({ label: "Admin", current: true });
      }
    } else {
      // Main tenant page
      baseBreadcrumbs[baseBreadcrumbs.length - 1].current = true;
    }

    return baseBreadcrumbs;
  };

  return (
    <AuthGuard>
      <SidebarLayout 
        sidebar={<TenantAdminSidebar tenantSlug={tenantSlug} />} 
        sidebarWidth="md"
        className={className}
        breadcrumbs={getBreadcrumbs()}
        backHref="/admin/tenants"
        backLabel="Back to Platform"
        showHome={false}
      >
        {children}
      </SidebarLayout>
    </AuthGuard>
  );
}
