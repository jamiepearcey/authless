import { ReactNode } from "react";
import { notFound } from "next/navigation";
import { TenantNavigation } from "@/components/TenantNavigation";

interface TenantLayoutProps {
  children: ReactNode;
  params: {
    slug: string;
  };
}

export default async function TenantLayout({ children, params }: TenantLayoutProps) {
  // For now, we'll use a placeholder since this is a server component
  // In a real implementation, you'd fetch tenant data here
  const tenantSlug = params.slug;

  if (!tenantSlug) {
    notFound();
  }

  return (
    <div className="flex-1 bg-gray-50">
      {/* Tenant Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold text-gray-900">
                {tenantSlug}
              </h1>
            </div>
            
            {/* Tenant Navigation */}
            <TenantNavigation tenantSlug={tenantSlug} />
          </div>
        </div>
      </div>

      {/* Page Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  );
}
