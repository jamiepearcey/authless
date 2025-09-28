"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

interface AuthGuardProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
  redirectTo?: string;
}

export function AuthGuard({ 
  children, 
  requireAdmin = false, 
  redirectTo = "/" 
}: AuthGuardProps) {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "loading") return; // Still loading

    if (!session) {
      // Not authenticated
      router.push(redirectTo);
      return;
    }

    if (requireAdmin && session.user?.platformRole !== "admin") {
      // Authenticated but not admin
      router.push("/dashboard");
      return;
    }
  }, [session, status, router, requireAdmin, redirectTo]);

  // Show loading or nothing while redirecting
  if (status === "loading") {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  // Don't render children if not authenticated or not authorized
  if (!session) return null;
  if (requireAdmin && session.user?.platformRole !== "admin") return null;

  return <>{children}</>;
}