import { useSession } from "next-auth/react";
import { trpc } from "./trpc";
import { useMemo } from "react";

/**
 * Hook to check if the current user is an admin
 * @param tenantId Optional tenant ID to check if user is admin of that specific tenant
 * @returns Object with isAdmin boolean and loading state
 */
export function useIsAdmin(tenantId?: string) {
  const { data: session, status } = useSession();
  
  // Check if user is global platform admin
  const isPlatformAdmin = useMemo(() => {
    return session?.user?.platformRole === "admin";
  }, [session?.user?.platformRole]);

  // If user is platform admin, they're admin everywhere
  if (isPlatformAdmin) {
    return {
      isAdmin: true,
      isLoading: status === "loading",
      isPlatformAdmin: true,
      isTenantAdmin: false,
    };
  }

  // If no tenantId provided, just check platform admin status
  if (!tenantId) {
    return {
      isAdmin: isPlatformAdmin,
      isLoading: status === "loading",
      isPlatformAdmin,
      isTenantAdmin: false,
    };
  }

  // Check if user is admin of the specific tenant
  const { data: memberships, isLoading: membershipsLoading } = trpc.getTenantMemberships.useQuery(
    { slug: tenantId },
    { enabled: !!tenantId && status === "authenticated" }
  );

  const isTenantAdmin = useMemo(() => {
    if (!memberships || !session?.user?.email) return false;
    
    return memberships.some(membership => 
      membership.user.email === session.user.email && 
      membership.role === "admin" && 
      membership.user.status === "active"
    );
  }, [memberships, session?.user?.email]);

  return {
    isAdmin: isPlatformAdmin || isTenantAdmin,
    isLoading: status === "loading" || membershipsLoading,
    isPlatformAdmin,
    isTenantAdmin,
  };
}

/**
 * Hook to check if the current user is a member of a specific tenant
 * @param tenantId Tenant ID to check membership
 * @returns Object with isMember boolean and loading state
 */
export function useIsTenantMember(tenantId: string) {
  const { data: session, status } = useSession();
  
  const { data: memberships, isLoading: membershipsLoading } = trpc.getTenantMemberships.useQuery(
    { slug: tenantId },
    { enabled: !!tenantId && status === "authenticated" }
  );

  const isMember = useMemo(() => {
    if (!memberships || !session?.user?.email) return false;
    
    return memberships.some(membership => 
      membership.user.email === session.user.email && 
        membership.user.status === "active"
    );
  }, [memberships, session?.user?.email]);

  return {
    isMember,
    isLoading: status === "loading" || membershipsLoading,
  };
}

/**
 * Hook to get user's role in a specific tenant
 * @param tenantId Tenant ID to check role
 * @returns Object with role, isAdmin boolean, and loading state
 */
export function useTenantRole(tenantId: string) {
  const { data: session, status } = useSession();
  
  const { data: memberships, isLoading: membershipsLoading } = trpc.getTenantMemberships.useQuery(
    { slug: tenantId },
    { enabled: !!tenantId && status === "authenticated" }
  );

  const userMembership = useMemo(() => {
    if (!memberships || !session?.user?.email) return null;
    
    return memberships.find(membership => 
      membership.user.email === session.user.email && 
      membership.user.status === "active"
    );
  }, [memberships, session?.user?.email]);

  return {
    role: userMembership?.role || null,
    isAdmin: userMembership?.role === "admin",
    isMember: !!userMembership,
    isLoading: status === "loading" || membershipsLoading,
  };
}
