"use client";

import { AdminPageLayout } from "@/components/AdminPageLayout";
import { OrderConfigurationManager } from "@/components/OrderConfigurationManager";

export default function PaymentOptionsPage() {
  return (
    <AdminPageLayout
      title="Payment Options"
      breadcrumb={[
        { label: "Payment Options", current: true },
      ]}
      description="Manage order configurations, pricing plans, and payment settings"
    >
      {/* Order Configuration Management */}
      <OrderConfigurationManager />
    </AdminPageLayout>
  );
}