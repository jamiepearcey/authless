"use client";

import * as NavigationMenu from '@radix-ui/react-navigation-menu';
import { useSession } from "next-auth/react";
import Link from "next/link";

import { 
  ChevronDown, 
  Database, 
  Settings, 
  Shield, 
  Building2, 
  Users, 
  FileText,
  History,
  MessageSquare,
  Mail,
  Bell,
  Workflow,
  Grid3X3,
  Plus,
  Star,
  Target,
  BarChart3,
  TrendingUp
} from "lucide-react";

interface NavigationItem {
  label: string;
  href?: string;
  icon?: React.ComponentType<any>;
  description?: string;
  items?: NavigationItem[];
  adminOnly?: boolean;
  comingSoon?: boolean;
}

const navigationStructure: NavigationItem[] = [
  {
    label: "Platform",
    items: [
      {
        label: "Features",
        href: "/features",
        icon: Star,
        description: "Discover platform capabilities and features"
      },
      {
        label: "Pricing",
        href: "/pricing",
        icon: Target,
        description: "Choose the plan that fits your needs"
      },
      {
        label: "FAQ",
        href: "/faq",
        icon: FileText,
        description: "Frequently asked questions and answers"
      },
      {
        label: "Contact",
        href: "/contact",
        icon: Mail,
        description: "Get in touch with our support team"
      }
    ]
  },
  {
    label: "Demos",
    items: [
      {
        label: "Workflows",
        href: "/workflows/demo",
        icon: Workflow,
        description: "Workflow automation and process management"
      },
      {
        label: "FlexLayout Trading",
        href: "/demo/flexlayout-trading",
        icon: BarChart3,
        description: "Advanced trading terminal with flexible layouts"
      }
    ]
  },
  {
    label: "Admin",
    adminOnly: true,
    items: [
      {
        label: "Overview",
        items: [
          {
            label: "Dashboard",
            href: "/admin",
            icon: BarChart3,
            description: "Platform overview and key metrics"
          },
          {
            label: "Analytics",
            href: "/admin/analytics",
            icon: TrendingUp,
            description: "Detailed analytics and reporting"
          }
        ]
      },
      {
        label: "Management",
        items: [
          {
            label: "User Management", 
            href: "/admin/users",
            icon: Users,
            description: "Manage platform users and permissions"
          },
          {
            label: "Tenant Management",
            href: "/admin/tenants",
            icon: Building2,
            description: "View and manage all platform tenants"
          },
          {
            label: "Create Tenant",
            href: "/admin/tenants/create",
            icon: Plus,
            description: "Add a new tenant to the platform"
          }
        ]
      },
      {
        label: "System",
        items: [
          {
            label: "Settings",
            href: "/admin/settings",
            icon: Settings,
            description: "Platform configuration and feature toggles"
          },
          {
            label: "Security",
            href: "/admin/security",
            icon: Shield,
            description: "Security policies and access controls"
          },
          {
            label: "Audit Log",
            href: "/admin/audit",
            icon: History,
            description: "System activity and audit trails"
          }
        ]
      },
      {
        label: "Communication",
        items: [
          {
            label: "Support",
            href: "/admin/support",
            icon: MessageSquare,
            description: "Customer support and ticket management"
          },
          {
            label: "Notifications",
            href: "/admin/notifications",
            icon: Bell,
            description: "System notifications and alerts"
          },
          {
            label: "Email Templates",
            href: "/admin/notifications/templates",
            icon: Mail,
            description: "Manage email templates and campaigns"
          }
        ]
      }
    ]
  }
];

const NavigationItem = ({ item, level = 0 }: { item: NavigationItem; level?: number }) => {
  const { data: session } = useSession();
  const isAdmin = (session?.user as any)?.platformRole === 'admin';
  
  // Hide admin-only items for non-admin users
  if (item.adminOnly && !isAdmin) {
    return null;
  }

  // If item has a direct href, render as link
  if (item.href) {
    return (
      <NavigationMenu.Link asChild>
        <Link
          href={item.href}
          className="group block p-3 rounded-lg border border-transparent hover:border-gray-200 hover:bg-gray-50 nav-item-hover focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1"
        >
          <div className="flex items-start space-x-3">
            {item.icon && (
              <div className="w-8 h-8 rounded-md bg-gray-100 group-hover:bg-indigo-100 flex items-center justify-center transition-colors nav-icon-fix">
                <item.icon className="h-4 w-4 text-gray-600 group-hover:text-indigo-600" />
              </div>
            )}
            <div className="flex-1 min-w-0 nav-text-align">
              <div className="flex items-center space-x-2 mb-1">
                <h4 className="font-medium text-sm text-gray-900 group-hover:text-indigo-900">
                  {item.label}
                </h4>
                {item.adminOnly && (
                  <Shield className="h-3 w-3 text-indigo-500 flex-shrink-0 nav-icon-fix" />
                )}
                {item.comingSoon && (
                  <span className="px-2 py-0.5 text-xs bg-amber-100 text-amber-700 rounded-full font-medium flex-shrink-0">
                    Coming Soon
                  </span>
                )}
              </div>
              {item.description && (
                <p className="text-xs text-gray-500 leading-relaxed line-clamp-2 nav-text-align">
                  {item.description}
                </p>
              )}
            </div>
          </div>
        </Link>
      </NavigationMenu.Link>
    );
  }

  // If item has sub-items, render them
  if (item.items) {
    return (
      <div className="space-y-3">
        {/* Section Header */}
        <div className="flex items-center space-x-3 pb-2 border-b border-gray-100">
          {item.icon && (
            <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center">
              <item.icon className="h-4 w-4 text-indigo-600" />
            </div>
          )}
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-gray-900 flex items-center space-x-2">
              <span>{item.label}</span>
              {item.adminOnly && <Shield className="h-3 w-3 text-indigo-500" />}
            </h3>
            {item.description && (
              <p className="text-xs text-gray-500 mt-0.5">{item.description}</p>
            )}
          </div>
        </div>
        
        {/* Section Items */}
        <div className={`grid gap-3 ${item.items && item.items.length > 6 ? 'grid-cols-3' : item.items && item.items.length > 4 ? 'grid-cols-2' : 'grid-cols-2'}`}>
          {item.items.map((subItem, index) => (
            <NavigationItem key={index} item={subItem} level={level + 1} />
          ))}
        </div>
      </div>
    );
  }

  return null;
};

const NavigationPanel = ({ items, isAdmin }: { items: NavigationItem[]; isAdmin?: boolean }) => {
  // Determine panel width and layout based on content
  const isLargeSection = items.some(item => item.items && item.items.length > 4);
  const panelWidth = isLargeSection ? "w-[640px]" : "w-[480px]";
  
  // For admin section with many items, use multi-column layout
  const useMultiColumn = isAdmin && items.length > 6;
  const gridCols = useMultiColumn ? "grid-cols-2" : "grid-cols-1";
  
  return (
    <NavigationMenu.Content className="absolute top-0 left-0 w-auto data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-90">
      <div className={`bg-white text-gray-900 rounded-lg border border-gray-200 shadow-xl p-6 ${panelWidth} max-h-[80vh] overflow-y-auto navigation-panel-enter z-50`}>
        <div className={`grid ${gridCols} gap-6`}>
          {items.map((item, index) => (
            <div key={index} className="last:pb-0">
              <NavigationItem item={item} />
            </div>
          ))}
        </div>
      </div>
    </NavigationMenu.Content>
  );
};

export default function EnterpriseNavigation() {
  const { data: session } = useSession();
  const isAdmin = (session?.user as any)?.platformRole === 'admin';

  return (
    <NavigationMenu.Root className="relative z-10 flex max-w-max flex-1 items-center justify-center">
      <NavigationMenu.List className="group flex flex-1 list-none items-center justify-center space-x-1">
        {navigationStructure.map((section) => {
          // Hide admin section for non-admin users
          if (section.adminOnly && !isAdmin) {
            return null;
          }

          return (
            <NavigationMenu.Item key={section.label}>
              <NavigationMenu.Trigger className="group inline-flex h-10 w-max items-center justify-center rounded-md bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground focus:outline-none disabled:pointer-events-none disabled:opacity-50 data-[active]:bg-accent/50 data-[state=open]:bg-accent/50">
                <span className="flex items-center space-x-2">
                  <span>{section.label}</span>
                  {section.adminOnly && (
                    <Shield className="h-3.5 w-3.5 text-indigo-500" />
                  )}
                </span>
                <ChevronDown
                  className="relative top-[1px] ml-1 h-3 w-3 transition duration-200 group-data-[state=open]:rotate-180"
                  aria-hidden="true"
                />
              </NavigationMenu.Trigger>
              <NavigationPanel items={section.items || []} isAdmin={section.adminOnly} />
            </NavigationMenu.Item>
          );
        })}

        {/* Navigation Indicator */}
        <NavigationMenu.Indicator className="data-[state=visible]:animate-in data-[state=hidden]:animate-out data-[state=hidden]:fade-out data-[state=visible]:fade-in top-full z-[1] flex h-1.5 items-end justify-center overflow-hidden">
          <div className="relative top-[60%] h-2 w-2 rotate-45 rounded-tl-sm bg-border shadow-md" />
        </NavigationMenu.Indicator>
      </NavigationMenu.List>

      {/* Viewport for positioning panels */}
      <div className="absolute left-0 top-full flex justify-center">
        <NavigationMenu.Viewport className="origin-top-center relative mt-1.5 h-[var(--radix-navigation-menu-viewport-height)] w-full overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-lg data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-90 md:w-[var(--radix-navigation-menu-viewport-width)]" />
      </div>
    </NavigationMenu.Root>
  );
}