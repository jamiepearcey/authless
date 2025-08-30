"use client";

import { useState, useEffect } from "react";
import { Button, OtpInput, ConfirmRemoveDialog } from "@ui/base";
import { PhoneNumberInput } from "@/components/PhoneNumberInput";
import {
  MessageCircle,
  ArrowLeft,
  CheckCircle,
  Smartphone,
  Shield,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { t } from "@i18n-core";
import { trpc } from "@/lib/trpc";
import { toast } from "@ui/base";

export default function WhatsAppSetupPage() {
  const [step, setStep] = useState<"setup" | "verify" | "success" | "manage">("setup");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [, setCountryCode] = useState("44");
  const [fullPhoneNumber, setFullPhoneNumber] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [, setPhoneValidationError] = useState("");
  const [isPhoneValid, setIsPhoneValid] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false); // Track if user is updating phone number

  // tRPC queries and mutations
  const { data: twoFactorMethods, refetch: refetchMethods } = trpc.get2fa.useQuery();
  const enableWhatsApp = trpc.enableWhatsapp2fa.useMutation();
  const verifyActivation = trpc.verifyWhatsappActivation.useMutation();
  const disableWhatsApp = trpc.disableWhatsapp2fa.useMutation();

  // Check if WhatsApp is already enabled
  const whatsAppMethod = twoFactorMethods?.find(method => method.type === "whatsapp");
  const isWhatsAppEnabled = !!whatsAppMethod;

  useEffect(() => {
    if (isWhatsAppEnabled && step === "setup" && !isUpdating) {
      setStep("manage");
    }
  }, [isWhatsAppEnabled, step, isUpdating]);

  const handlePhoneNumberChange = (value: string, code: string) => {
    setPhoneNumber(value);
    setCountryCode(code);
    setFullPhoneNumber(`+${code}${value}`);
  };

  const handlePhoneValidationChange = (isValid: boolean, error?: string) => {
    setIsPhoneValid(isValid);
    setPhoneValidationError(error || "");
  };

  const handleSetup = async () => {
    if (!isPhoneValid || !fullPhoneNumber) {
      setPhoneValidationError("Please enter a valid phone number");
      return;
    }
    
    setIsLoading(true);
    try {
      await enableWhatsApp.mutateAsync({
        phoneE164: fullPhoneNumber
      });
      toast.success("Verification code sent to your WhatsApp!");
      setStep("verify");
    } catch (error: any) {
      console.error("Failed to setup WhatsApp:", error);
      toast.error(error?.message || "Failed to send verification code");
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerify = async () => {
    if (!verificationCode || verificationCode.length !== 6) {
      toast.error("Please enter a valid 6-digit code");
      return;
    }
    setIsLoading(true);
    try {
      await verifyActivation.mutateAsync({
        code: verificationCode
      });
      toast.success("WhatsApp 2FA enabled successfully!");
      setStep("success");
      setIsUpdating(false); // Reset updating flag
      refetchMethods();
    } catch (error: any) {
      console.error("Failed to verify WhatsApp code:", error);
      toast.error(error?.message || "Invalid verification code. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendCode = async () => {
    if (!fullPhoneNumber) {
      toast.error("Phone number is required");
      return;
    }

    setIsLoading(true);
    try {
      await enableWhatsApp.mutateAsync({
        phoneE164: fullPhoneNumber
      });
      toast.success("New verification code sent to WhatsApp!");
    } catch (error: any) {
      console.error("Failed to resend WhatsApp code:", error);
      toast.error(error?.message || "Failed to resend verification code");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisable = async () => {
    setIsLoading(true);
    try {
      await disableWhatsApp.mutateAsync();
      toast.success("WhatsApp 2FA disabled");
      setStep("setup");
      setIsUpdating(false); // Reset updating flag
      refetchMethods();
    } catch (error: any) {
      console.error("Failed to disable WhatsApp:", error);
      toast.error(error?.message || "Failed to disable WhatsApp 2FA");
    } finally {
      setIsLoading(false);
    }
  };
  if (step === "success") {
    return (
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6 text-center">
          <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {t(
              "WhatsApp 2FA Setup Complete!",
              "2fa.whatsapp.page.WhatsAppSetupPage.whatsapp_2fa_setup_complete__1r3ltj",
            )}
          </h3>
          <p className="text-sm text-gray-600 mb-6">
            {t(
              "You will now receive verification codes via WhatsApp for two-factor authentication.",
              "2fa.whatsapp.page.WhatsAppSetupPage.you_will_now_receive_verification_codes_via_whatsapp_for_two_factor_authentication__1zj7lf",
            )}
          </p>
          <div className="space-x-3">
            <Link href="/settings/2fa">
              <Button variant="outline">
                {t(
                  "Back to 2FA Settings",
                  "2fa.authenticator.page.AuthenticatorSetupPage.back_to_2fa_settings__2184h3",
                )}
              </Button>
            </Link>
            <Link href="/settings">
              <Button>
                {t(
                  "Go to Settings",
                  "2fa.authenticator.page.AuthenticatorSetupPage.go_to_settings__27qmfj",
                )}
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (step === "manage") {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <div className="flex items-center space-x-3 mb-6">
              <Link
                href="/settings/2fa"
                className="text-gray-400 hover:text-gray-600"
              >
                <ArrowLeft className="h-5 w-5" />
              </Link>
              <MessageCircle className="h-8 w-8 text-green-600" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  {t(
                    "WhatsApp 2FA",
                    "2fa.whatsapp.page.WhatsAppSetupPage.whatsapp_2fa__1h8j9k",
                  )}
                </h1>
                <p className="text-sm text-gray-600">
                  {t(
                    "Manage your WhatsApp two-factor authentication",
                    "2fa.whatsapp.page.WhatsAppSetupPage.manage_whatsapp_2fa__2k9l0m",
                  )}
                </p>
              </div>
            </div>

            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center space-x-3">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <div>
                  <p className="text-sm font-medium text-green-800">
                    WhatsApp 2FA is enabled
                  </p>
                  <p className="text-sm text-green-600">
                    Phone: {whatsAppMethod?.identifier || "Hidden"}
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-6 flex space-x-3">
              <Button
                variant="outline"
                onClick={() => {
                  setIsUpdating(true);
                  setStep("setup");
                }}
              >
                Update Phone Number
              </Button>
              <ConfirmRemoveDialog
                title="Disable WhatsApp 2FA"
                description="Are you sure you want to disable WhatsApp 2FA? This will reduce your account security and you'll need to set it up again if you want to use it."
                actionText="Disable WhatsApp 2FA"
                onConfirm={handleDisable}
                trigger={
                  <Button
                    variant="destructive"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                        Disabling...
                      </>
                    ) : (
                      <>
                        <Trash2 className="h-4 w-4 mr-2" />
                        Disable WhatsApp 2FA
                      </>
                    )}
                  </Button>
                }
              />
            </div>
          </div>
        </div>
      </div>
    );
  }
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <div className="flex items-center space-x-3 mb-6">
            <Link
              href="/settings/2fa"
              className="text-gray-400 hover:text-gray-600"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <MessageCircle className="h-6 w-6 text-indigo-600" />
            <h3 className="text-lg leading-6 font-medium text-gray-900">
              {isUpdating 
                ? "Update WhatsApp Phone Number"
                : t(
                    "Set Up WhatsApp 2FA",
                    "2fa.whatsapp.page.WhatsAppSetupPage.set_up_whatsapp_2fa__262t7e",
                  )
              }
            </h3>
          </div>

          <p className="text-sm text-gray-600 mb-6">
            {t(
              "Receive verification codes via WhatsApp for quick and easy two-factor authentication.",
              "2fa.whatsapp.page.WhatsAppSetupPage.receive_verification_codes_via_whatsapp_for_quick_and_easy_two_factor_authentication__8re438",
            )}
          </p>
        </div>
      </div>

      {step === "setup" && (
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* WhatsApp Info */}
              <div className="space-y-6">
                <div>
                  <h4 className="text-lg font-medium text-gray-900 mb-4">
                    WhatsApp Verification
                  </h4>
                  <p className="text-sm text-gray-600 mb-4">
                    {t(
                      "Get verification codes delivered directly to your WhatsApp number for secure \n                    two-factor authentication.",
                      "2fa.whatsapp.page.WhatsAppSetupPage.get_verification_codes_delivered_directly_to_your_whatsapp_number_for_secure_two_factor_authentication__yljkma",
                    )}
                  </p>

                  <div className="space-y-3">
                    <div className="flex items-center space-x-3">
                      <Shield className="h-5 w-5 text-green-500" />
                      <span className="text-sm text-gray-700">
                        {t(
                          "Secure delivery via WhatsApp",
                          "2fa.whatsapp.page.WhatsAppSetupPage.secure_delivery_via_whatsapp__5e7rx6",
                        )}
                      </span>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Smartphone className="h-5 w-5 text-green-500" />
                      <span className="text-sm text-gray-700">
                        Instant delivery
                      </span>
                    </div>
                    <div className="flex items-center space-x-3">
                      <MessageCircle className="h-5 w-5 text-green-500" />
                      <span className="text-sm text-gray-700">
                        {t(
                          "No additional app needed",
                          "2fa.whatsapp.page.WhatsAppSetupPage.no_additional_app_needed__y3b7oc",
                        )}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Benefits */}
                <div>
                  <h5 className="text-sm font-medium text-gray-900 mb-2">
                    Benefits
                  </h5>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>
                      {t(
                        "\u2022 Quick and convenient verification",
                        "2fa.whatsapp.page.WhatsAppSetupPage.quick_and_convenient_verification__1m2tk0",
                      )}
                    </li>
                    <li>
                      {t(
                        "\u2022 Works with your existing WhatsApp account",
                        "2fa.whatsapp.page.WhatsAppSetupPage.works_with_your_existing_whatsapp_account__22yme3",
                      )}
                    </li>
                    <li>
                      {t(
                        "\u2022 No need to install additional apps",
                        "2fa.whatsapp.page.WhatsAppSetupPage.no_need_to_install_additional_apps__1isje2",
                      )}
                    </li>
                    <li>
                      {t(
                        "\u2022 Instant delivery and easy to read",
                        "2fa.whatsapp.page.WhatsAppSetupPage.instant_delivery_and_easy_to_read__2f2gbd",
                      )}
                    </li>
                  </ul>
                </div>
              </div>

              {/* Setup Form */}
              <div className="space-y-6">
                <div>
                  <h4 className="text-lg font-medium text-gray-900 mb-4">
                    Setup Instructions
                  </h4>

                  <div className="space-y-4">
                    <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0 w-6 h-6 bg-indigo-100 rounded-full flex items-center justify-center">
                        <span className="text-xs font-medium text-indigo-600">
                          1
                        </span>
                      </div>
                      <p className="text-sm text-gray-700">
                        {t(
                          "Enter your WhatsApp phone number below",
                          "2fa.whatsapp.page.WhatsAppSetupPage.enter_your_whatsapp_phone_number_below__2fsoq6",
                        )}
                      </p>
                    </div>

                    <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0 w-6 h-6 bg-indigo-100 rounded-full flex items-center justify-center">
                        <span className="text-xs font-medium text-indigo-600">
                          2
                        </span>
                      </div>
                      <p className="text-sm text-gray-700">
                        {t(
                          "We'll send a verification code to your WhatsApp",
                          "2fa.whatsapp.page.WhatsAppSetupPage.we_ll_send_a_verification_code_to_your_whatsapp__22zi88",
                        )}
                      </p>
                    </div>

                    <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0 w-6 h-6 bg-indigo-100 rounded-full flex items-center justify-center">
                        <span className="text-xs font-medium text-indigo-600">
                          3
                        </span>
                      </div>
                      <p className="text-sm text-gray-700">
                        {t(
                          "Enter the code to complete setup",
                          "2fa.whatsapp.page.WhatsAppSetupPage.enter_the_code_to_complete_setup__pm45bh",
                        )}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Phone Number Input */}
                <div>
                  <label
                    htmlFor="phoneNumber"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    {t(
                      "WhatsApp Phone Number",
                      "2fa.whatsapp.page.WhatsAppSetupPage.whatsapp_phone_number__qnkklh",
                    )}
                  </label>
                  
                  <PhoneNumberInput
                    value={phoneNumber}
                    onChange={handlePhoneNumberChange}
                    onValidationChange={handlePhoneValidationChange}
                    placeholder="Enter your phone number"
                    showError={true}
                    required={true}
                    className="mb-2"
                  />

                  <p className="text-sm text-gray-500 mt-2">
                    {t(
                      "Enter the phone number associated with your WhatsApp account",
                      "2fa.whatsapp.page.WhatsAppSetupPage.enter_the_phone_number_associated_with_your_whatsapp_account__206mok",
                    )}
                  </p>
                </div>

                {/* Requirements */}
                <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                  <h5 className="text-sm font-medium text-blue-800 mb-2">
                    Requirements
                  </h5>
                  <ul className="text-sm text-blue-700 space-y-1">
                    <li>
                      {t(
                        "\u2022 Active WhatsApp account",
                        "2fa.whatsapp.page.WhatsAppSetupPage.active_whatsapp_account__1h2j6f",
                      )}
                    </li>
                    <li>
                      {t(
                        "\u2022 Phone number must be verified in WhatsApp",
                        "2fa.whatsapp.page.WhatsAppSetupPage.phone_number_must_be_verified_in_whatsapp__1v9drd",
                      )}
                    </li>
                    <li>
                      {t(
                        "\u2022 Stable internet connection",
                        "2fa.whatsapp.page.WhatsAppSetupPage.stable_internet_connection__nkzrot",
                      )}
                    </li>
                    <li>
                      {t(
                        "\u2022 WhatsApp must be accessible on your device",
                        "2fa.whatsapp.page.WhatsAppSetupPage.whatsapp_must_be_accessible_on_your_device__vuzgda",
                      )}
                    </li>
                  </ul>
                </div>

                <div className="space-y-3">
                  <Button
                    onClick={handleSetup}
                    disabled={isLoading || !isPhoneValid}
                    className="w-full"
                  >
                    {isLoading ? "Setting up..." : "Send Verification Code"}
                  </Button>
                  
                  {isUpdating && (
                    <Button
                      variant="outline"
                      onClick={() => {
                        setIsUpdating(false);
                        setStep("manage");
                      }}
                      disabled={isLoading}
                      className="w-full"
                    >
                      Cancel Update
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {step === "verify" && (
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h4 className="text-lg font-medium text-gray-900 mb-6">
              {t(
                "Verify WhatsApp Code",
                "2fa.whatsapp.page.WhatsAppSetupPage.verify_whatsapp_code__1nn7n2",
              )}
            </h4>

            <div className="max-w-md mx-auto space-y-6">
              <div className="text-center">
                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
                  <MessageCircle className="h-6 w-6 text-green-600" />
                </div>
                <h5 className="text-sm font-medium text-gray-900 mb-2">
                  {t(
                    "Code Sent to WhatsApp!",
                    "2fa.whatsapp.page.WhatsAppSetupPage.code_sent_to_whatsapp__vs7lld",
                  )}
                </h5>
                <p className="text-sm text-gray-600">
                  {t(
                    "We've sent a 6-digit verification code to",
                    "2fa.whatsapp.page.WhatsAppSetupPage.we_ve_sent_a_6_digit_verification_code_to__1zm7h6",
                  )}
                  {phoneNumber} via WhatsApp.
                </p>
              </div>

              <div>
                <label
                  htmlFor="verificationCode"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  {t(
                    "Enter 6-Digit Code",
                    "2fa.authenticator.page.AuthenticatorSetupPage.enter_6_digit_code__1bukp8",
                  )}
                </label>
                <OtpInput
                  value={verificationCode}
                  onChange={(value) => setVerificationCode(value)}
                  onComplete={(value) => setVerificationCode(value)}
                  autoFocus
                  isInvalid={verificationCode.length !== 6}
                />

                <p className="text-sm text-gray-500 mt-2">
                  {t(
                    "Enter the 6-digit code from your WhatsApp message",
                    "2fa.whatsapp.page.WhatsAppSetupPage.enter_the_6_digit_code_from_your_whatsapp_message__p6uray",
                  )}
                </p>
              </div>

              <div className="space-y-3">
                <Button
                  onClick={handleVerify}
                  disabled={isLoading || verificationCode.length !== 6}
                  className="w-full"
                >
                  {isLoading ? "Verifying..." : "Verify and Enable"}
                </Button>

                <Button
                  onClick={handleResendCode}
                  disabled={isLoading}
                  variant="outline"
                  className="w-full"
                >
                  {isLoading ? "Sending..." : "Resend Code"}
                </Button>
              </div>

              <div className="text-center space-y-2">
                <button
                  onClick={() => setStep("setup")}
                  className="text-sm text-indigo-600 hover:text-indigo-500"
                >
                  {t(
                    "\u2190 Back to Setup",
                    "2fa.authenticator.page.AuthenticatorSetupPage.back_to_setup__1tpmli",
                  )}
                </button>
                
                {isUpdating && (
                  <div>
                    <button
                      onClick={() => {
                        setIsUpdating(false);
                        setStep("manage");
                      }}
                      className="text-sm text-gray-600 hover:text-gray-500"
                    >
                      Cancel Update
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
