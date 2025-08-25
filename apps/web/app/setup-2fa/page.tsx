"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Shield, CheckCircle, ArrowRight } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@ui/base";
import { Button } from "@ui/base";
import TwoFactorSetup from "../../components/TwoFactorSetup";

export default function Setup2FAPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [show2FASetup, setShow2FASetup] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/signin");
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Welcome Header */}
        <div className="text-center mb-12">
          <div className="mx-auto w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mb-6">
            <Shield className="h-10 w-10 text-blue-600" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Welcome {session.user.name || "to your workspace"}!
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Let's get your account set up with the best security practices
          </p>
        </div>

        {/* Setup Steps */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <Card className="text-center">
            <CardHeader>
              <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-3">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <CardTitle className="text-lg">Account Created</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600">
                Your account has been successfully created and you're now signed in.
              </p>
            </CardContent>
          </Card>

          <Card className="text-center border-blue-200 bg-blue-50">
            <CardHeader>
              <div className="mx-auto w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-3">
                <Shield className="h-6 w-6 text-blue-600" />
              </div>
              <CardTitle className="text-lg">Security Setup</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600">
                Enable two-factor authentication to protect your account with an extra layer of security.
              </p>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardHeader>
              <div className="mx-auto w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-3">
                <ArrowRight className="h-6 w-6 text-gray-600" />
              </div>
              <CardTitle className="text-lg">Ready to Go</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600">
                Once setup is complete, you'll have full access to all features.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Security Benefits */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="text-xl text-center">Why Two-Factor Authentication?</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <h4 className="font-medium text-gray-900">Enhanced Security</h4>
                <p className="text-sm text-gray-600">
                  Even if someone gets your password, they can't access your account without your phone.
                </p>
              </div>
              <div className="space-y-3">
                <h4 className="font-medium text-gray-900">Industry Standard</h4>
                <p className="text-sm text-gray-600">
                  Used by banks, tech companies, and security-conscious organizations worldwide.
                </p>
              </div>
              <div className="space-y-3">
                <h4 className="font-medium text-gray-900">Easy to Use</h4>
                <p className="text-sm text-gray-600">
                  Works with popular apps like Google Authenticator, Authy, and Microsoft Authenticator.
                </p>
              </div>
              <div className="space-y-3">
                <h4 className="font-medium text-gray-900">Quick Setup</h4>
                <p className="text-sm text-gray-600">
                  Takes less than 2 minutes to set up and only adds a few seconds to your login process.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="text-center space-y-4">
          <Button
            onClick={() => setShow2FASetup(true)}
            size="lg"
            className="px-8 py-3 text-lg"
          >
            <Shield className="h-5 w-5 mr-2" />
            Set Up Two-Factor Authentication
          </Button>
          
          <div>
            <Button
              variant="outline"
              onClick={() => router.push("/")}
              size="lg"
              className="px-8 py-3 text-lg"
            >
              Skip for Now
            </Button>
            <p className="text-sm text-gray-500 mt-2">
              You can always enable this later in your account settings
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
