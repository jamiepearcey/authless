"use client";

import { AdminSidebar } from "@/components/AdminSidebar";
import { SidebarLayout } from "@/components/SidebarLayout";

interface AdminLayoutProps {
  children: React.ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  return (
    <SidebarLayout sidebar={<AdminSidebar />} sidebarWidth="md">
      {children}
    </SidebarLayout>
  );
}