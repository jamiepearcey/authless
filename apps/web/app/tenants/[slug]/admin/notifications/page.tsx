"use client";

import { NotificationTemplateForm } from "@/components/NotificationTemplateForm";
import { ArrowLeft, Bell, FileText, Settings } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { BreadcrumbNavigation } from "@/components/BreadcrumbNavigation";

export default function TenantAdminNotificationsPage() {
  const params = useParams();
  const tenantSlug = params.slug as string;

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center space-x-4 mb-4">
            <Link 
              href={`/tenants/${tenantSlug}/admin`}
              className="inline-flex items-center text-indigo-600 hover:text-indigo-800 transition-colors"
            >
              <ArrowLeft className="h-5 w-5 mr-2" />
              Back to Tenant Admin
            </Link>
            <div className="h-6 w-px bg-gray-300" />
            <BreadcrumbNavigation
              items={[
                { label: "Tenants", href: "/tenants" },
                { label: tenantSlug, href: `/tenants/${tenantSlug}` },
                { label: "Admin", href: `/tenants/${tenantSlug}/admin` },
                { label: "Notifications", current: true },
              ]}
              showHome={false}
            />
          </div>
          
          <h1 className="text-3xl font-bold text-gray-900 flex items-center space-x-3">
            <Bell className="h-8 w-8 text-indigo-600" />
            <span>Tenant Notifications</span>
          </h1>
          <p className="mt-2 text-gray-600">
            Send notifications to your tenant members using templates or create custom ones
          </p>
        </div>

        {/* Template Form */}
        <NotificationTemplateForm 
          context="tenant"
          tenantId={tenantSlug}
          className="mb-8"
        />

        {/* Additional Information */}
        <div className="bg-green-50 border border-green-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-green-900 mb-3 flex items-center">
            <Settings className="h-5 w-5 mr-2" />
            Tenant Notification Guidelines
          </h3>
          <div className="text-green-800 space-y-2">
            <p>
              As a tenant admin, you can send notifications to:
            </p>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li><strong>All Tenant Users:</strong> Send to everyone in your tenant</li>
              <li><strong>Specific Users:</strong> Target individual members</li>
              <li><strong>Role-based:</strong> Send to users with specific roles</li>
            </ul>
            <p className="mt-3 text-sm">
              <strong>Note:</strong> Notifications are sent in real-time and will appear immediately 
              for your tenant members. Use this feature responsibly for important announcements.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
