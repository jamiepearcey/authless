"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { t } from "@i18n-core";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, OtpInput } from "@ui/base";
import { Button } from "@ui/base";
import { Input } from "@ui/base";
import { Label } from "@ui/base";
import { Separator } from "@ui/base";
import { Checkbox } from "@ui/base";
import { 
  Shield, 
  Smartphone, 
  MessageCircle, 
  Key, 
  AlertCircle, 
  CheckCircle,
  Eye,
  EyeOff,
  ArrowRight,
  Smartphone as PhoneIcon
} from "lucide-react";
import { trpc } from "../../lib/trpc";
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
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/";
  
  const [selectedMethod, setSelectedMethod] = useState<string | null>(null);
  const [verificationMode, setVerificationMode] = useState<"initial" | "verifying">("initial");
  const [verificationCode, setVerificationCode] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // tRPC mutations
  const verify2FACode = trpc.verifyTwoFactorCode.useMutation();

  // 2FA methods available to the user
  const twoFactorMethods: TwoFactorMethod[] = [
    {
      id: "authenticator",
      key: "authenticator",
      label: t("Authenticator App", "verify2fa.page.Verify2FAPage.authenticator_app__4abcde"),
      description: t("Use Google Authenticator, Authy, or similar app", "verify2fa.page.Verify2FAPage.use_google_authy_similar__5abcde"),
      icon: <Key className="h-5 w-5" />,
      available: true, // This would be checked against user's 2FA setup
    },
    {
      id: "whatsapp",
      key: "whatsapp",
      label: t("WhatsApp", "verify2fa.page.Verify2FAPage.whatsapp__6abcde"),
      description: t("Receive verification code via WhatsApp", "verify2fa.page.Verify2FAPage.receive_code_via_whatsapp__7abcde"),
      icon: <MessageCircle className="h-5 w-5" />,
      available: true, // This would be checked against user's WhatsApp setup
    }
  ];

  // Redirect if not authenticated
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/signin");
    }
  }, [status, router]);

  // Auto-select first available method
  useEffect(() => {
    if (twoFactorMethods.length > 0 && !selectedMethod) {
      const firstAvailable = twoFactorMethods.find(method => method.available);
      if (firstAvailable) {
        setSelectedMethod(firstAvailable.id);
      }
    }
  }, [twoFactorMethods, selectedMethod]);

  const handleMethodSelect = (methodId: string) => {
    setVerificationMode("initial");
    setSelectedMethod(methodId);
    setError("");
    setVerificationCode("");
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

    setIsVerifying(true);
    setError("");

    try {
      const result = await verify2FACode.mutateAsync({
        code: verificationCode,
      });

      if (result.success) {
        setSuccess(t("Verification successful! Redirecting...", "verify2fa.page.Verify2FAPage.verification_successful_redirecting__13abcde"));
        toast.success("2FA verification successful");
        
        // Redirect after a short delay
        setTimeout(() => {
          router.push(callbackUrl);
        }, 1500);
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Failed to verify 2FA code";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsVerifying(false);
    }
  };

  const handleSendVerificationCode = async () => {
    if (!selectedMethod) return;
    
    try {
      // This would trigger sending the verification code
      // Implementation depends on the selected method
      toast.success("Verification code sent");
      setVerificationMode("verifying");
      setError("");
    } catch (error) {
      toast.error("Failed to send verification code");
    }
  };

  const handleResendCode = async () => {
    // This would trigger resending the verification code
    // Implementation depends on the selected method
    toast.info("Verification code resent");
  };

  if (status === "loading") {
    return (
      <div className="flex flex-1 items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!session?.user) {
    return null; // Will redirect
  }

  return (
    <div className="flex flex-1 items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
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
                {t("Choose verification method:", "verify2fa.page.Verify2FAPage.choose_verification_method__3abcde")}
              </Label>
              <div className="space-y-3">
                {twoFactorMethods.map((method) => {
                  const isSelected = selectedMethod === method.id;
                  const isAvailable = method.available;
                  
                  return (
                    <div
                      key={method.id}
                      className={`flex items-start space-x-3 p-4 rounded-lg border transition-all duration-200 cursor-pointer ${
                        isSelected && isAvailable
                          ? 'bg-indigo-50 border-indigo-300 shadow-sm' 
                          : isAvailable
                          ? 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
                          : 'border-gray-200 bg-gray-50 cursor-not-allowed opacity-60'
                      }`}
                      onClick={() => isAvailable && handleMethodSelect(method.id)}
                    >
                      <Checkbox
                        id={method.id}
                        checked={isSelected}
                        onCheckedChange={() => isAvailable && handleMethodSelect(method.id)}
                        className="mt-0.5"
                        disabled={!isAvailable}
                      />
                      <div className="flex items-start space-x-3 flex-1">
                        <div className={`${isSelected && isAvailable ? 'text-indigo-600' : 'text-gray-500'}`}>
                          {method.icon}
                        </div>
                        <div className="space-y-1 flex-1">
                          <label 
                            htmlFor={method.id} 
                            className={`text-sm font-medium block ${
                              isSelected && isAvailable ? 'text-indigo-600' : 'text-gray-900'
                            }`}
                          >
                            {method.label}
                          </label>
                          <p className="text-xs text-gray-600">{method.description}</p>
                          {!isAvailable && (
                            <p className="text-xs text-gray-500 italic">{t("Coming soon", "verify2fa.page.Verify2FAPage.coming_soon__10abcde")}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Verification Code Section - Fixed Height Container */}
            {selectedMethod && (
              <>
                <Separator />
                <div className="h-64 relative overflow-hidden">
                  {/* Initial State - Send Verification Code */}
                  <div
                    className={`absolute inset-0 transition-all duration-300 ease-in-out ${
                      verificationMode === "initial"
                        ? "opacity-100 translate-y-0 pointer-events-auto"
                        : "opacity-0 -translate-y-4 pointer-events-none"
                    }`}
                  >
                    <div className="flex flex-col items-center justify-center h-full text-center space-y-4">
                      <div className="bg-indigo-100 p-4 rounded-full">
                        <Key className="h-8 w-8 text-indigo-600" />
                      </div>
                      <div>
                        <h3 className="text-lg font-medium text-gray-900">
                          {t("Send Verification Code", "verify2fa.page.Verify2FAPage.send_verification_code__20abcde")}
                        </h3>
                        <p className="text-sm text-gray-600 mt-1">
                          {t("Click below to send a verification code to your selected method", "verify2fa.page.Verify2FAPage.click_to_send_verification_code__21abcde")}
                        </p>
                      </div>
                      <Button
                        onClick={handleSendVerificationCode}
                        className="px-6 py-2"
                      >
                        Send Code
                      </Button>
                    </div>
                  </div>

                  {/* Verification State - Code Input */}
                  <div
                    className={`absolute inset-0 transition-all duration-300 ease-in-out ${
                      verificationMode === "verifying"
                        ? "opacity-100 translate-y-0 pointer-events-auto"
                        : "opacity-0 translate-y-4 pointer-events-none"
                    }`}
                  >
                    <div className="space-y-4 h-full flex flex-col">
                      <div className="space-y-2">
                        <Label htmlFor="verificationCode" className="text-sm font-medium text-gray-700">
                          {t("Verification Code", "verify2fa.page.Verify2FAPage.verification_code__11abcde")}
                        </Label>
                        <div className="relative">
                          <Key className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                          <OtpInput
                            value={verificationCode}
                            onChange={(value) => setVerificationCode(value)}
                            onComplete={(value) => setVerificationCode(value)}
                            autoFocus
                            length={6}
                            isInvalid={verificationCode.length !== 6}
                            ariaLabel={t("Enter the 6-digit code from your authenticator app", "verify2fa.page.Verify2FAPage.enter_6_digit_code_from_authenticator__19abcde")}
                            name="otp"
                            className="ml-14 w-full"
                          />
                        </div>
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

                      {/* Action Buttons */}
                      <div className="space-y-3 mt-auto">
                        <Button
                          type="submit"
                          className="w-full"
                          disabled={!verificationCode.trim() || verificationCode.length !== 6 || isVerifying}
                          onClick={handleVerify}
                        >
                          {isVerifying ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                              {t("Verifying...", "verify2fa.page.Verify2FAPage.verifying__15abcde")}
                            </>
                          ) : (
                            <>
                              {t("Verify & Continue", "verify2fa.page.Verify2FAPage.verify_continue__14abcde")}
                              <ArrowRight className="h-4 w-4 ml-2" />
                            </>
                          )}
                        </Button>

                        <div className="flex items-center justify-center">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={handleResendCode}
                            className="text-sm"
                          >
                            {t("Resend Code", "verify2fa.page.Verify2FAPage.resend_code__16abcde")}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Help Text */}
            <div className="text-center">
              <p className="text-xs text-gray-500">
                {t("Having trouble? Contact support for assistance", "verify2fa.page.Verify2FAPage.having_trouble_contact_support__18abcde")}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
