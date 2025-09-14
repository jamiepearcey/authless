"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@ui/base";
import { CheckCircle, AlertCircle } from "lucide-react";

export default function SsoSuccessPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();

  const userId = searchParams.get("userId");
  const tenantSlug = searchParams.get("tenantSlug");
  const callbackUrl = searchParams.get("callbackUrl") || "/";

  useEffect(() => {
    async function createSession() {
      if (!userId || !tenantSlug) {
        setError("Missing required parameters");
        setIsLoading(false);
        return;
      }

      try {
        // Create NextAuth session using a special SSO credentials provider
        const result = await signIn("sso-credentials", {
          userId,
          tenantSlug,
          redirect: false,
        });

        if (result?.error) {
          setError("Failed to create session");
        } else if (result?.ok) {
          // Redirect to callback URL after successful session creation
          router.push(callbackUrl);
        }
      } catch (error) {
        console.error("Session creation error:", error);
        setError("An unexpected error occurred");
      } finally {
        setIsLoading(false);
      }
    }

    createSession();
  }, [userId, tenantSlug, callbackUrl, router]);

  if (error) {
    return (
      <div className="flex flex-1 items-center justify-center bg-gray-50 py-12 ">
        <div className="max-w-md w-full">
          <Card className="shadow-lg">
            <CardHeader className="space-y-1">
              <CardTitle className="text-2xl font-bold text-center text-red-600 flex items-center justify-center gap-2">
                <AlertCircle className="h-6 w-6" />
                SSO Error
              </CardTitle>
              <CardDescription className="text-center">
                There was a problem completing your sign-in
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center">
                <p className="text-sm text-gray-600 mb-4">{error}</p>
                <button
                  onClick={() => router.push("/auth/signin")}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  Return to Sign In
                </button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 items-center justify-center bg-gray-50 py-12 ">
      <div className="max-w-md w-full">
        <Card className="shadow-lg">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold text-center text-green-600 flex items-center justify-center gap-2">
              <CheckCircle className="h-6 w-6" />
              {isLoading ? "Completing Sign-In..." : "Sign-In Complete"}
            </CardTitle>
            <CardDescription className="text-center">
              {isLoading
                ? "Please wait while we complete your SSO sign-in"
                : "You have been successfully signed in"
              }
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoading && (
              <div className="flex justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
              </div>
            )}
            <div className="text-center text-sm text-gray-500">
              {tenantSlug && (
                <p>Signing you into <strong>{tenantSlug}</strong></p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}