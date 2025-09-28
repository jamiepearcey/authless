"use client";

import { AdminSidebar } from "@/components/AdminSidebar";
import { SidebarLayout } from "@/components/SidebarLayout";
import { AuthGuard } from "@/components/AuthGuard";

interface AdminLayoutProps {
  children: React.ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  return (
    <AuthGuard requireAdmin={true}>
      <SidebarLayout sidebar={<AdminSidebar />} sidebarWidth="md">
        {children}
      </SidebarLayout>
    </AuthGuard>
  );
}