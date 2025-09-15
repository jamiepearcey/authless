"use client";

import { ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { BreadcrumbNavigation, BreadcrumbItem } from "./BreadcrumbNavigation";

interface SidebarLayoutProps {
  children: ReactNode;
  sidebar: ReactNode;
  sidebarWidth?: "sm" | "md" | "lg";
  className?: string;
  breadcrumbs?: BreadcrumbItem[];
  backHref?: string;
  backLabel?: string;
  showHome?: boolean;
}

export function SidebarLayout({ 
  children, 
  sidebar, 
  sidebarWidth = "md",
  className = "",
  breadcrumbs,
  backHref,
  backLabel = "Back",
  showHome = false
}: SidebarLayoutProps) {
  const sidebarCols = {
    sm: "lg:col-span-1", // 8.3% of grid
    md: "lg:col-span-2", // 16.7% of grid  
    lg: "lg:col-span-3"  // 25% of grid
  };

  const mainCols = {
    sm: "lg:col-span-11", // 91.7% of grid
    md: "lg:col-span-10", // 83.3% of grid
    lg: "lg:col-span-9"   // 75% of grid
  };

  return (
    <div className={`flex-1 bg-gray-50 ${className}`}>
      <div className="max-w-7xl mx-auto py-6">
        <div className="lg:grid lg:grid-cols-12 lg:gap-x-6">
          {/* Sidebar */}
          <aside className={`${sidebarCols[sidebarWidth]}`}>
            {sidebar}
          </aside>
          
          {/* Main Content */}
          <div className={`${mainCols[sidebarWidth]}`}>
            {/* Breadcrumb Navigation */}
            {breadcrumbs && (
              <div className="flex items-center space-x-4 mb-4">
                {backHref && (
                  <>
                    <Link 
                      href={backHref}
                      className="inline-flex items-center text-indigo-600 hover:text-indigo-800 transition-colors"
                    >
                      <ArrowLeft className="h-5 w-5 mr-2" />
                      {backLabel}
                    </Link>
                    <div className="h-6 w-px bg-gray-300" />
                  </>
                )}
                <BreadcrumbNavigation
                  items={breadcrumbs}
                  showHome={showHome}
                />
              </div>
            )}
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
