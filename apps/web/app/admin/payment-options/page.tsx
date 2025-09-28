"use client";

import { AdminPageLayout } from "@/components/AdminPageLayout";
import { BreadcrumbNavigation } from "@/components/BreadcrumbNavigation";
import { OrderConfigurationManager } from "@/components/OrderConfigurationManager";

export default function PaymentOptionsPage() {
  return (
    <AdminPageLayout
      title="Payment Options"
      description="Manage order configurations, pricing plans, and payment settings"
    >
      {/* Breadcrumb Navigation */}
      <div className="flex items-center space-x-4 mb-6">
        <BreadcrumbNavigation
          items={[
            { label: "Admin Dashboard", href: "/admin" },
            { label: "Payment Options", current: true },
          ]}
          showHome={false}
        />
      </div>

      {/* Order Configuration Management */}
      <OrderConfigurationManager />
    </AdminPageLayout>
  );
}