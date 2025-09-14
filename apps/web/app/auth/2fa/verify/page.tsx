"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { t } from "@i18n-core";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, OtpInput } from "@ui/base";
import { Button } from "@ui/base";
import { Label } from "@ui/base";
import { Separator } from "@ui/base";
import { 
  Shield, 
  Smartphone, 
  MessageCircle, 
  Key, 
  AlertCircle, 
  CheckCircle,
  ArrowRight,
  Clock
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "@ui/base";

interface TwoFactorMethod {
  id: string;
  key: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  available: boolean;
}

export default function Verify2FAPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nonce = searchParams.get("nonce");
  const callbackUrl = searchParams.get("callbackUrl") || "/";
  
  const [selectedMethod, setSelectedMethod] = useState<string | null>(null);
  const [verificationCode, setVerificationCode] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [countdown, setCountdown] = useState(0);

  // tRPC queries and mutations
  const { data: pendingAuth, isError: pendingAuthError } = trpc.getPendingAuthStatus.useQuery(
    { nonce: nonce || "" },
    { enabled: !!nonce, refetchInterval: false }
  );
  const send2faCode = trpc.send2faCode.useMutation();
  const verify2faCode = trpc.verify2faCode.useMutation();
  const completeAuthentication = trpc.completeAuthentication.useMutation();

  // Redirect if no nonce or invalid pending auth
  useEffect(() => {
    if (!nonce) {
      toast.error("Invalid authentication session");
      router.push("/auth/signin");
      return;
    }

    if (pendingAuthError) {
      toast.error("Authentication session expired");
      router.push("/auth/signin");
      return;
    }
  }, [nonce, pendingAuthError, router]);

  // Generate available methods based on pending auth
  const availableMethods = pendingAuth?.requiredFactors.map(factor => {
    switch (factor) {
      case "totp":
        return {
          id: "totp",
          key: "totp",
          label: "Authenticator App",
          description: "Use Google Authenticator, Authy, or similar app",
          icon: <Key className="h-5 w-5" />,
          available: true,
        };
      case "whatsapp":
        return {
          id: "whatsapp",
          key: "whatsapp", 
          label: "WhatsApp",
          description: "Receive verification code via WhatsApp",
          icon: <MessageCircle className="h-5 w-5" />,
          available: true,
        };
      case "sms":
        return {
          id: "sms",
          key: "sms",
          label: "SMS",
          description: "Receive verification code via SMS",
          icon: <Smartphone className="h-5 w-5" />,
          available: true,
        };
      default:
        return null;
    }
  }).filter(Boolean) as TwoFactorMethod[] || [];

  // Auto-select first available method
  useEffect(() => {
    if (availableMethods.length > 0 && !selectedMethod) {
      setSelectedMethod(availableMethods[0].id);
    }
  }, [availableMethods, selectedMethod]);

  // Countdown timer for resend
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const handleMethodSelect = (methodId: string) => {
    setSelectedMethod(methodId);
    setError("");
    setVerificationCode("");
  };

  const handleSendCode = async () => {
    if (!selectedMethod || !nonce) return;
    
    setIsSending(true);
    setError("");

    try {
      await send2faCode.mutateAsync({
        method: selectedMethod as "whatsapp" | "sms" | "email",
        nonce,
      });

      toast.success("Verification code sent");
      setCountdown(60); // 60 second countdown
    } catch (error: any) {
      const errorMessage = error?.message || "Failed to send verification code";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsSending(false);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!verificationCode.trim()) {
      setError("Please enter the verification code");
      return;
    }

    if (verificationCode.length !== 6) {
      setError("Please enter a 6-digit verification code");
      return;
    }

    if (!selectedMethod || !nonce) {
      setError("Invalid authentication session");
      return;
    }

    setIsVerifying(true);
    setError("");

    try {
      const result = await verify2faCode.mutateAsync({
        method: selectedMethod as "whatsapp" | "sms" | "email" | "totp",
        code: verificationCode,
        nonce,
      });

      if (result.success && result.sessionToken) {
        setSuccess("Verification successful! Completing authentication...");
        toast.success("2FA verification successful");
        
        // Complete authentication using the secure session token
        const completeResult = await completeAuthentication.mutateAsync({
          sessionToken: result.sessionToken,
        });

        if (completeResult.success) {
          // Create NextAuth session with the verified user data
          const signInResult = await signIn("credentials", {
            email: completeResult.user.email,
            password: "", // Password already verified in previous step
            callbackUrl,
            redirect: false,
          });

          if (signInResult?.ok) {
            router.push(callbackUrl);
          } else {
            setError("Failed to complete sign in");
          }
        } else {
          setError("Failed to complete authentication");
        }
      }
    } catch (error: any) {
      const errorMessage = error?.message || "Failed to verify 2FA code";
      setError(errorMessage);
      
      if (errorMessage.includes("locked")) {
        toast.error("Account temporarily locked due to too many failed attempts");
      } else {
        toast.error(errorMessage);
      }
    } finally {
      setIsVerifying(false);
    }
  };


  if (!nonce || !pendingAuth) {
    return (
      <div className="flex flex-1 items-center justify-center bg-gray-50 py-12 ">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading authentication session...</p>
        </div>
      </div>
    );
  }

  if (availableMethods.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center bg-gray-50 py-12 ">
        <Card className="max-w-md w-full">
          <CardContent className="text-center p-6">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-lg font-semibold text-gray-900 mb-2">No 2FA Methods Available</h2>
            <p className="text-gray-600 mb-4">No two-factor authentication methods are configured for this account.</p>
            <Button onClick={() => router.push("/auth/signin")} variant="outline">
              Back to Sign In
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-1 items-center justify-center bg-gray-50 py-12 ">
      <div className="max-w-md w-full space-y-8">
        <Card className="shadow-lg">
          <CardHeader className="space-y-1">
            <div className="flex items-center justify-center mb-4">
              <div className="bg-indigo-100 p-3 rounded-full">
                <Shield className="h-8 w-8 text-indigo-600" />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold text-center">
              {t("Two-Factor Authentication", "verify2fa.page.Verify2FAPage.two_factor_authentication__1abcde")}
            </CardTitle>
            <CardDescription className="text-center">
              {t("Verify your identity to continue to your account", "verify2fa.page.Verify2FAPage.verify_identity_to_continue__2abcde")}
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-6">
            {/* 2FA Method Selection */}
            <div className="space-y-4">
              <Label className="text-base font-medium text-gray-900">
                Choose verification method:
              </Label>
              <div className="space-y-3">
                {availableMethods.map((method) => {
                  const isSelected = selectedMethod === method.id;
                  
                  return (
                    <div
                      key={method.id}
                      className={`flex items-center space-x-3 p-4 rounded-lg border transition-all duration-200 cursor-pointer ${
                        isSelected
                          ? 'bg-indigo-50 border-indigo-300 shadow-sm' 
                          : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
                      }`}
                      onClick={() => handleMethodSelect(method.id)}
                    >
                      <div className={`${isSelected ? 'text-indigo-600' : 'text-gray-500'}`}>
                        {method.icon}
                      </div>
                      <div className="space-y-1 flex-1">
                        <p className={`text-sm font-medium ${isSelected ? 'text-indigo-600' : 'text-gray-900'}`}>
                          {method.label}
                        </p>
                        <p className="text-xs text-gray-600">{method.description}</p>
                      </div>
                      {isSelected && (
                        <CheckCircle className="h-5 w-5 text-indigo-600" />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Verification Code Section */}
            {selectedMethod && (
              <>
                <Separator />
                
                {selectedMethod !== "totp" && (
                  <div className="space-y-4">
                    <div className="text-center">
                      <h3 className="text-lg font-medium text-gray-900 mb-2">
                        Send Verification Code
                      </h3>
                      <p className="text-sm text-gray-600 mb-4">
                        We'll send a 6-digit code to your {selectedMethod === "whatsapp" ? "WhatsApp" : "SMS"}
                      </p>
                      <Button
                        onClick={handleSendCode}
                        disabled={isSending || countdown > 0}
                        className="px-6 py-2"
                      >
                        {isSending ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                            Sending...
                          </>
                        ) : countdown > 0 ? (
                          <>
                            <Clock className="h-4 w-4 mr-2" />
                            Resend in {countdown}s
                          </>
                        ) : (
                          <>
                            Send Code
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                )}

                <form onSubmit={handleVerify} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="verificationCode" className="text-sm font-medium text-gray-700">
                      {selectedMethod === "totp" ? "Authenticator Code" : "Verification Code"}
                    </Label>
                    <div className="relative">
                      <Key className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <OtpInput
                        value={verificationCode}
                        onChange={setVerificationCode}
                        onComplete={setVerificationCode}
                        autoFocus
                        length={6}
                        isInvalid={!!error}
                        ariaLabel="Enter the 6-digit verification code"
                        name="otp"
                        className="pl-10"
                      />
                    </div>
                    {selectedMethod === "totp" && (
                      <p className="text-xs text-gray-500">
                        Enter the 6-digit code from your authenticator app
                      </p>
                    )}
                  </div>

                  {/* Error/Success Messages */}
                  {error && (
                    <div className="flex items-center gap-2 p-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded-md">
                      <AlertCircle className="h-4 w-4" />
                      {error}
                    </div>
                  )}

                  {success && (
                    <div className="flex items-center gap-2 p-3 text-sm text-green-700 bg-green-50 border border-green-200 rounded-md">
                      <CheckCircle className="h-4 w-4" />
                      {success}
                    </div>
                  )}

                  <Button
                    type="submit"
                    className="w-full"
                    disabled={!verificationCode.trim() || verificationCode.length !== 6 || isVerifying}
                  >
                    {isVerifying ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                        Verifying...
                      </>
                    ) : (
                      <>
                        Verify & Continue
                        <ArrowRight className="h-4 w-4 ml-2" />
                      </>
                    )}
                  </Button>
                </form>
              </>
            )}

            {/* Help Text */}
            <div className="text-center">
              <p className="text-xs text-gray-500">
                Having trouble? Contact support for assistance
              </p>
              <button
                onClick={() => router.push("/auth/signin")}
                className="mt-2 text-xs text-indigo-600 hover:text-indigo-800 underline"
              >
                Back to Sign In
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
