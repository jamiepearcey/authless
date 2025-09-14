import { notFound } from "next/navigation";
import { TenantAdminSidebar } from "@/components/TenantAdminSidebar";

interface TenantLayoutProps {
  children: React.ReactNode;
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
      <div className="max-w-7xl mx-auto  py-8">
        <div className="lg:grid lg:grid-cols-12 lg:gap-x-5">
          {/* Sidebar */}
          <TenantAdminSidebar tenantSlug={tenantSlug} />
          
          {/* Main Content */}
          <div className="lg:col-span-9">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
