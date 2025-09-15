import { notFound } from "next/navigation";
import { TenantLayout } from "@/components/TenantLayout";

interface TenantLayoutProps {
  children: React.ReactNode;
  params: {
    slug: string;
  };
}

export default async function TenantLayoutWrapper({ children, params }: TenantLayoutProps) {
  // For now, we'll use a placeholder since this is a server component
  // In a real implementation, you'd fetch tenant data here
  const tenantSlug = params.slug;

  if (!tenantSlug) {
    notFound();
  }

  return (
    <TenantLayout 
      tenantSlug={tenantSlug}
    >
      {children}
    </TenantLayout>
  );
}
