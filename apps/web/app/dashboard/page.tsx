"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { AuthGuard } from "@/components/guards/AuthGuard";

export default function DashboardPage() {
  const { data: session } = useSession();
  const router = useRouter();

  useEffect(() => {
    // Redirect to appropriate dashboard based on user role
    if (session?.user) {
      if (session.user.platformRole === "admin") {
        router.push("/admin");
      } else {
        // For now, redirect all non-admin users to settings
        // TODO: Add tenant detection logic when needed
        router.push("/settings");
      }
    }
  }, [session, router]);

  return (
    <AuthGuard>
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    </AuthGuard>
  );
}
