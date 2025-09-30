"use client";

import { ReactNode } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@ui/base";
import { BreadcrumbItem } from "./BreadcrumbNavigation";
import { AdminBreadcrumb } from "./AdminBreadcrumb";

interface AdminPageLayoutProps {
  children: ReactNode;
  title: string;
  description?: string;
  actions?: ReactNode;
  breadcrumb?: BreadcrumbItem[] | BreadcrumbItem;
  header?: ReactNode;
  className?: string;
}

export function AdminPageLayout({ 
  children, 
  title, 
  description, 
  actions,
  breadcrumb,
  header,
  className = ""
}: AdminPageLayoutProps) {
  return (
    <div className={`${className}`}>
      {/* Page Header */}
      <div className="md:flex md:items-center md:justify-between">
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold leading-7 text-gray-900 sm:truncate sm:text-3xl sm:tracking-tight">
            {title}
          </h1>
          {description && (
            <p className="mt-1 text-sm text-gray-500">
              {description}
            </p>
          )}
        </div>
        {actions && (
          <div className="mt-4 flex md:ml-4 md:mt-0">
            {actions}
          </div>
        )}
      </div>
      
      {(header || breadcrumb) && (
        <div className="mb-4">
          {breadcrumb && (
              <AdminBreadcrumb items={Array.isArray(breadcrumb) ? breadcrumb : [breadcrumb]} />
          )}
          {header} 
        </div>
      )}

        
      {/* Page Content */}
      <div className="space-y-6">
        {children}
      </div>
    </div>
  );
}

interface AdminCardProps {
  children: ReactNode;
  title?: string;
  description?: string;
  className?: string;
}

export function AdminCard({ 
  children, 
  title, 
  description, 
  className = "" 
}: AdminCardProps) {
  return (
    <Card className={className}>
      {(title || description) && (
        <CardHeader>
          {title && <CardTitle>{title}</CardTitle>}
          {description && <CardDescription>{description}</CardDescription>}
        </CardHeader>
      )}
      <CardContent>
        {children}
      </CardContent>
    </Card>
  );
}

interface AdminSectionProps {
  children: ReactNode;
  title?: string;
  description?: string;
  className?: string;
}

export function AdminSection({ 
  children, 
  title, 
  description, 
  className = "" 
}: AdminSectionProps) {
  return (
    <section className={`space-y-4 ${className}`}>
      {(title || description) && (
        <div>
          {title && (
            <h2 className="text-lg font-medium text-gray-900">
              {title}
            </h2>
          )}
          {description && (
            <p className="mt-1 text-sm text-gray-500">
              {description}
            </p>
          )}
        </div>
      )}
      {children}
    </section>
  );
}
