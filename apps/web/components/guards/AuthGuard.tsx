"use client";

import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useEffect } from "react";

interface AuthGuardProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  redirectTo?: string;
}

/**
 * Component that guards authenticated-only content
 * @param fallback Content to show while loading or if not authenticated
 * @param redirectTo URL to redirect to if not authenticated (optional)
 */
export function AuthGuard({ 
  children, 
  fallback = <div>Please sign in to continue</div>,
  redirectTo = "/signin"
}: AuthGuardProps) {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push(redirectTo);
    }
  }, [status, redirectTo, router]);

  // Show loading state
  if (status === "loading") {
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

  // Show protected content
  return <>{children}</>;
}

/**
 * Higher-order component to wrap pages that require authentication
 */
export function withAuthGuard<P extends object>(
  Component: React.ComponentType<P>,
  redirectTo?: string
) {
  return function AuthGuardedComponent(props: P) {
    return (
      <AuthGuard redirectTo={redirectTo}>
        <Component {...props} />
      </AuthGuard>
    );
  };
}

