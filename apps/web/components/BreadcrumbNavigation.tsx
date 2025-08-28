"use client";

import Link from "next/link";
import { ChevronRight, Home } from "lucide-react";

export interface BreadcrumbItem {
  label: string;
  href?: string;
  current?: boolean;
}

interface BreadcrumbNavigationProps {
  items: BreadcrumbItem[];
  showHome?: boolean;
  className?: string;
}

export function BreadcrumbNavigation({ items, showHome = true, className = "" }: BreadcrumbNavigationProps) {
  const allItems = showHome 
    ? [{ label: "Home", href: "/" }, ...items]
    : items;

  return (
    <nav className={`flex items-center space-x-2 text-sm text-gray-500 ${className}`}>
      {allItems.map((item, index) => (
        <div key={index} className="flex items-center">
          {index > 0 && (
            <ChevronRight className="h-4 w-4 mx-2 text-gray-400" />
          )}
          
          {item.href && !item.current ? (
            <Link 
              href={item.href}
              className="hover:text-gray-700 transition-colors flex items-center"
            >
              {index === 0 && showHome && <Home className="h-4 w-4 mr-1" />}
              {item.label}
            </Link>
          ) : (
            <span className={`${item.current ? 'text-gray-900 font-medium' : 'text-gray-500'}`}>
              {item.label}
            </span>
          )}
        </div>
      ))}
    </nav>
  );
}
