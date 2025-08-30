"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter, usePathname } from "next/navigation";
import { t } from "@i18n-core";
import { Button, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger, Avatar, AvatarFallback, AvatarImage, Badge } from "@ui/base";
import { ChevronDown, Building2, Plus, Settings, Users, Globe } from "lucide-react";
import { trpc } from "@/lib/trpc";

interface Tenant {
  id: string;
  slug: string;
  name: string;
  status: string;
  logoUrl?: string | null;
  plan: string;
  primaryColor?: string | null;
  secondaryColor?: string | null;
}

interface UserTenant {
  tenant: Tenant;
  role: string;
  isAdmin: boolean;
  createdAt: string | Date;
  lastActiveAt?: string | Date | null;
}

export default function TenantSwitcher() {
  const { data: session } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const [currentTenant, setCurrentTenant] = useState<Tenant | null>(null);
  const [userTenants, setUserTenants] = useState<UserTenant[]>([]);
  const [isLoading, setIsLoading] = useState(false);


  const isPlatformAdmin = (session?.user as any)?.platformRole === 'admin';

  const { data: tenantsData } = trpc.getUserTenants.useQuery(
    undefined, 
    { enabled: !!session?.user }
  );

  // Get all tenants if platform admin
  const { data: allTenants } = trpc.getAllTenants.useQuery(
    undefined,
    { enabled: !!session?.user && isPlatformAdmin }
  );

  // Get current tenant from URL or session
  useEffect(() => {
    if (tenantsData || (isPlatformAdmin && allTenants)) {
      const dataToUse = isPlatformAdmin && allTenants ? 
        allTenants.map(tenant => ({
          tenant,
          role: 'admin',
          isAdmin: true,
          createdAt: tenant.createdAt,
          lastActiveAt: tenant.updatedAt
        })) : 
        tenantsData;
      
      if (dataToUse) {
        setUserTenants(dataToUse);
        
        // Determine current tenant from URL or session
        const pathParts = pathname.split('/');
        let currentTenantSlug: string | null = null;
        
        // Check for path-based tenant (/tenants/[slug])
        if (pathParts[1] === 'tenants' && pathParts[2]) {
          currentTenantSlug = pathParts[2];
        }
        
        // Check for subdomain-based tenant (would need additional logic in production)
        // For now, use the first tenant or platform context
        
        if (currentTenantSlug) {
          const tenant = dataToUse.find(ut => ut.tenant.slug === currentTenantSlug);
          if (tenant) {
            setCurrentTenant(tenant.tenant);
          }
        } else if (dataToUse.length > 0) {
          // Default to first tenant if no specific tenant in URL
          setCurrentTenant(dataToUse[0].tenant);
        }
      }
    }
  }, [tenantsData, allTenants, isPlatformAdmin, pathname]);

  const handleTenantSwitch = async (tenant: Tenant) => {
    setIsLoading(true);
    try {
      // Update current tenant
      setCurrentTenant(tenant);
      
      // Navigate to tenant-specific URL
      if (pathname.startsWith('/tenants/')) {
        // Replace current tenant slug with new one
        const newPath = pathname.replace(/^\/tenants\/[^/]+/, `/tenants/${tenant.slug}`);
        router.push(newPath);
      } else {
        // Navigate to tenant path
        router.push(`/tenants/${tenant.slug}`);
      }
      
      // TODO: Update session with new tenant context
      // This would typically involve a tRPC call to update the session
      
    } catch (error) {
      console.error('Failed to switch tenant:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePlatformAccess = () => {
    // Navigate to platform root (untenanted)
    router.push('/');
  };

  const handleCreateTenant = () => {
    router.push("/admin/tenants/create");
  };

  const handleManageTenants = () => {
    router.push("/admin/tenants");
  };

  const handleTenantSettings = () => {
    if (currentTenant) {
      router.push(`/tenants/${currentTenant.slug}/admin/settings`);
    }
  };

  if (!session?.user) {
    return (
      <div className="w-full p-2 text-center text-sm text-gray-500 bg-gray-100 rounded border">
        Loading...
      </div>
    );
  }

  // For platform admins, use all tenants; for regular users, use their memberships
  const availableTenants = isPlatformAdmin && allTenants ? 
    allTenants.map(tenant => ({
      tenant,
      role: 'admin',
      isAdmin: true,
      createdAt: tenant.createdAt,
      lastActiveAt: tenant.updatedAt
    })) : 
    userTenants;
  
  if (availableTenants.length === 0 && !isPlatformAdmin) {
    return (
      <div className="w-full p-2 text-center text-sm text-gray-500 bg-gray-100 rounded border">
        No workspaces
      </div>
    );
  }

  const currentTenantData = availableTenants.find(ut => ut.tenant.id === currentTenant?.id);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="flex items-center gap-2 min-w-[200px] justify-between" disabled={isLoading}>
          {isLoading ? (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600" />
          ) : (
            <>
              <div className="flex items-center gap-2">
                {currentTenant?.logoUrl ? (
                  <Avatar className="h-6 w-6">
                    <AvatarImage src={currentTenant.logoUrl} alt={currentTenant.name} />
                    <AvatarFallback className="text-xs">
                      <Building2 className="h-3 w-3" />
                    </AvatarFallback>
                  </Avatar>
                ) : (
                  <div className="h-6 w-6 rounded bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                    <Building2 className="h-3 w-3 text-white" />
                  </div>
                )}
                <div className="text-left">
                  <div className="text-sm font-medium text-gray-900 truncate max-w-[120px]">
                    {currentTenant?.name || 'Select Workspace'}
                  </div>
                  <div className="text-xs text-gray-500">
                    {currentTenantData?.isAdmin ? 'Admin' : 'Member'}
                  </div>
                </div>
              </div>
              <ChevronDown className="h-4 w-4 text-gray-500" />
            </>
          )}
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel className="flex items-center gap-2">
          <Globe className="h-4 w-4" />
          {t("Your Workspaces", "components.TenantSwitcher.your_workspaces__1itlrq")}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        {/* Current Tenant */}
        {currentTenant && (
          <>
            <DropdownMenuItem className="flex items-center gap-2 cursor-pointer" onClick={handleTenantSettings}>
              <div className="flex items-center gap-2 flex-1">
                {currentTenant.logoUrl ? (
                  <Avatar className="h-6 w-6">
                    <AvatarImage src={currentTenant.logoUrl} alt={currentTenant.name} />
                    <AvatarFallback className="text-xs">
                      <Building2 className="h-3 w-3" />
                    </AvatarFallback>
                  </Avatar>
                ) : (
                  <div className="h-6 w-6 rounded bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                    <Building2 className="h-3 w-3 text-white" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-900 truncate">
                    {currentTenant.name}
                  </div>
                  <div className="text-xs text-gray-500 flex items-center gap-1">
                    <Badge variant="outline" className="text-xs">
                      {currentTenant.plan}
                    </Badge>
                    {currentTenantData?.isAdmin && (
                      <Badge variant="secondary" className="text-xs">Admin</Badge>
                    )}
                  </div>
                </div>
              </div>
              <Settings className="h-4 w-4 text-gray-400" />
            </DropdownMenuItem>
            <DropdownMenuSeparator />
          </>
        )}
        
        {/* Other Tenants */}
        {availableTenants
          .filter(ut => ut.tenant.id !== currentTenant?.id)
          .map((userTenant) => (
            <DropdownMenuItem 
              key={userTenant.tenant.id}
              className="flex items-center gap-2 cursor-pointer"
              onClick={() => handleTenantSwitch(userTenant.tenant)}
            >
              <div className="flex items-center gap-2 flex-1">
                {userTenant.tenant.logoUrl ? (
                  <Avatar className="h-6 w-6">
                    <AvatarImage src={userTenant.tenant.logoUrl} alt={userTenant.tenant.name} />
                    <AvatarFallback className="text-xs">
                      <Building2 className="h-3 w-3" />
                    </AvatarFallback>
                  </Avatar>
                ) : (
                  <div className="h-6 w-6 rounded bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                    <Building2 className="h-3 w-3 text-white" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-900 truncate">
                    {userTenant.tenant.name}
                  </div>
                  <div className="text-xs text-gray-500 flex items-center gap-1">
                    <Badge variant="outline" className="text-xs">
                      {userTenant.tenant.plan}
                    </Badge>
                    {userTenant.isAdmin && (
                      <Badge variant="secondary" className="text-xs">Admin</Badge>
                    )}
                  </div>
                </div>
              </div>
            </DropdownMenuItem> 
          ))}
        
        <DropdownMenuSeparator />
        
        {/* Platform Admin Actions */}
        {false && isPlatformAdmin && (
          <>
            <DropdownMenuLabel className="flex items-center gap-2 text-xs text-gray-500">
              <Globe className="h-3 w-3" />
              Platform Administration
            </DropdownMenuLabel>
            <DropdownMenuItem className="flex items-center gap-2 cursor-pointer" onClick={handlePlatformAccess}>
              <Globe className="h-4 w-4" />
              <span>Platform Root</span>
              <Badge variant="outline" className="ml-auto text-xs">Global</Badge>
            </DropdownMenuItem>
            <DropdownMenuItem className="flex items-center gap-2 cursor-pointer" onClick={handleCreateTenant}>
              <Plus className="h-4 w-4" />
              <span>Create Workspace</span>
            </DropdownMenuItem>
            <DropdownMenuItem className="flex items-center gap-2 cursor-pointer" onClick={handleManageTenants}>
              <Users className="h-4 w-4" />
              <span>Manage All Workspaces</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
          </>
        )}
        
        {/* User Management */}
        {currentTenantData?.isAdmin && (
          <>
            <DropdownMenuLabel className="flex items-center gap-2 text-xs text-gray-500">
              <Users className="h-3 w-3" />
              {t("Administration", "components.TenantSwitcher.workspace_administration__1itlrq")}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
          <DropdownMenuItem className="flex items-center gap-2 cursor-pointer" onClick={() => router.push(`/tenants/${currentTenant?.slug}/admin/users`)}>
            <Users className="h-4 w-4" />
            <span>Manage Users</span>
          </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
