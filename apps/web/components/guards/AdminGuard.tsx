import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useIsAdmin } from "@/lib/admin-helper";
import { useEffect } from "react";

interface AdminGuardProps {
  children: React.ReactNode;
  tenantId?: string;
  fallback?: React.ReactNode;
  redirectTo?: string;
}

/**
 * Component that guards admin-only content
 * @param tenantId Optional tenant ID to check if user is admin of that specific tenant
 * @param fallback Content to show while loading or if not admin
 * @param redirectTo URL to redirect to if not admin (optional)
 */
export function AdminGuard({ 
  children, 
  tenantId, 
  fallback = <div>Access denied</div>,
  redirectTo 
}: AdminGuardProps) {
  const { data: session, status } = useSession();
  const { isAdmin, isLoading } = useIsAdmin(tenantId);
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin");
    } else if (status === "authenticated" && !isLoading && !isAdmin && redirectTo) {
      router.push(redirectTo);
    }
  }, [status, isLoading, isAdmin, redirectTo, router]);

  // Show loading state
  if (status === "loading" || isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Show fallback if not authenticated
  if (status === "unauthenticated") {
    return fallback;
  }

  // Show fallback if not admin
  if (!isAdmin) {
    return fallback;
  }

  // Show protected content
  return <>{children}</>;
}

/**
 * Higher-order component to wrap pages that require admin access
 */
export function withAdminGuard<P extends object>(
  Component: React.ComponentType<P>,
  tenantId?: string,
  redirectTo?: string
) {
  return function AdminGuardedComponent(props: P) {
    return (
      <AdminGuard tenantId={tenantId} redirectTo={redirectTo}>
        <Component {...props} />
      </AdminGuard>
    );
  };
}

