"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Shield, CheckCircle, ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@ui/base";
import { Button } from "@ui/base";
import TwoFactorSetup from "@/components/TwoFactorSetup";

export default function Setup2FAPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [show2FASetup, setShow2FASetup] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin");
    }
  }, [status, router]);

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!session?.user) {
    return null;
  }

  if (show2FASetup) {
    return (
      <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <TwoFactorSetup
          isWizard={true}
          onComplete={() => router.push("/")}
          onSkip={() => router.push("/")}
        />
      </div>
    );
  }


}
