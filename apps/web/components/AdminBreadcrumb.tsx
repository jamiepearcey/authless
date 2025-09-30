import { ArrowLeft, Link } from "lucide-react";
import { BreadcrumbItem, BreadcrumbNavigation } from "./BreadcrumbNavigation";

export interface AdminBreadcrumbProps {
  items: BreadcrumbItem[];
}

export const AdminBreadcrumb = ({ items }: AdminBreadcrumbProps) => {
  return (
    <div className="flex items-center space-x-4 mt-4">
      <Link 
        href="/admin"
        className="inline-flex items-center text-indigo-600 hover:text-indigo-800 transition-colors"
      >
        <ArrowLeft className="h-5 w-5 mr-2" />
        Back to Admin
      </Link>
      <div className="h-6 w-px bg-gray-300" />
      <BreadcrumbNavigation
        items={[
          { label: "Admin", href: "/admin" },
          ...items,
        ]}
        showHome={false}
      />
    </div>
  );
};