"use client";

import { NotificationTemplateForm } from "@/components/NotificationTemplateForm";
import { ArrowLeft, Bell, FileText } from "lucide-react";
import Link from "next/link";
import { BreadcrumbNavigation } from "@/components/BreadcrumbNavigation";

export default function AdminNotificationTemplatesPage() {
  return (
    <div className="flex-1 bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto ">
        {/* Header */}
        <div className="mb-4">
          <div className="flex items-center space-x-4 mb-4">
            <Link 
              href="/admin/notifications"
              className="inline-flex items-center text-indigo-600 hover:text-indigo-800 transition-colors"
            >
              <ArrowLeft className="h-5 w-5 mr-2" />
              Back to Notifications
            </Link>
            <div className="h-6 w-px bg-gray-300" />
            <BreadcrumbNavigation
              items={[
                { label: "Admin", href: "/admin" },
                { label: "Notifications", href: "/admin/notifications" },
                { label: "Templates", current: true },
              ]}
              showHome={false}
            />
          </div>
          
          <h1 className="text-3xl font-bold text-gray-900 flex items-center space-x-3">
            <FileText className="h-8 w-8 text-indigo-600" />
            <span>Notification Templates</span>
          </h1>
          <p className="mt-2 text-gray-600">
            Send notifications using predefined templates or create custom ones for your system
          </p>
        </div>

        {/* Template Form */}
        <NotificationTemplateForm 
          context="admin"
          className="mb-8"
        />

        {/* Additional Information */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-3 flex items-center">
            <Bell className="h-5 w-5 mr-2" />
            About Notification Templates
          </h3>
          <div className="text-blue-800 space-y-2">
            <p>
              Templates provide quick access to common notification types. You can:
            </p>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li>Use predefined templates for common scenarios</li>
              <li>Customize template content before sending</li>
              <li>Target specific users, tenants, or roles</li>
              <li>Send global notifications to all users</li>
            </ul>
            <p className="mt-3 text-sm">
              <strong>Note:</strong> All notifications are sent in real-time and will appear immediately 
              for targeted users through the notification system.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
