"use client";

import { useState, useEffect } from "react";
import { Button, OtpInput, toast } from "@ui/base";
import { QrCode, ArrowLeft, CheckCircle } from "lucide-react";
import Link from "next/link";
import { t } from "@i18n-core";
import { trpc } from "@/lib/trpc";
import QRCodeComponent from "react-qr-code";

export default function AuthenticatorSetupPage() {
  const [step, setStep] = useState<"setup" | "verify" | "success">("setup");
  const [qrCode, setQrCode] = useState<string>("");
  const [secret, setSecret] = useState<string>("");
  const [verificationCode, setVerificationCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const setup2FA = trpc.setupTwoFactor.useMutation({
    onSuccess: (data) => {
      setQrCode(data.qrCodeUrl);
      setSecret(data.secret);
      setStep("setup");
      console.log(data.qrCodeUrl);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const verify2FA = trpc.verifyTwoFactor.useMutation({
    onSuccess: () => {
      setStep("success");
    },
    onError: (error) => {
      alert("Invalid verification code. Please try again.");
    },
  });

  useEffect(() => {
    setup2FA.mutate();
  }, []);

  const handleSetup = async () => {
    setIsLoading(true);
    try {
      // TODO: Call API to generate authenticator setup
      await new Promise((resolve) => setTimeout(resolve, 1000)); // Simulate API call
      setStep("verify");
    } catch (error) {
      console.error("Failed to setup authenticator:", error);
    } finally {
      setIsLoading(false);
    }
  };
  const handleVerify = async () => {
    if (!verificationCode || verificationCode.length !== 6) {
      alert("Please enter a valid 6-digit code");
      return;
    }
    setIsLoading(true);
    try {
      await verify2FA.mutate({ code: verificationCode });
    } finally {
      setIsLoading(false);
    }
  };
  const handleResendCode = async () => {
    setIsLoading(true);
    try {
      // TODO: Call API to resend verification code
      await new Promise((resolve) => setTimeout(resolve, 1000)); // Simulate API call
      alert("New verification code sent!");
    } catch (error) {
      console.error("Failed to resend code:", error);
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
              "Authenticator App Setup Complete!",
              "2fa.authenticator.page.AuthenticatorSetupPage.authenticator_app_setup_complete__1mjles",
            )}
          </h3>
          <p className="text-sm text-gray-600 mb-6">
            {t(
              "Your authenticator app is now configured and will generate verification codes for your account.",
              "2fa.authenticator.page.AuthenticatorSetupPage.your_authenticator_app_is_now_configured_and_will_generate_verification_codes_for_your_account__2d93l7",
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
            <QrCode className="h-6 w-6 text-indigo-600" />
            <h3 className="text-lg leading-6 font-medium text-gray-900">
              {t(
                "Set Up Authenticator App",
                "2fa.authenticator.page.AuthenticatorSetupPage.set_up_authenticator_app__1en0ih",
              )}
            </h3>
          </div>

          <p className="text-sm text-gray-600 mb-6">
            {t(
              "Scan the QR code with your authenticator app to set up two-factor authentication.",
              "2fa.authenticator.page.AuthenticatorSetupPage.scan_the_qr_code_with_your_authenticator_app_to_set_up_two_factor_authentication__23djg5",
            )}
          </p>
        </div>
      </div>

      {step === "setup" && (
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* QR Code Section */}
              <div className="text-center">
                <h4 className="text-lg font-medium text-gray-900 mb-4">
                  {t(
                    "Scan QR Code",
                    "2fa.authenticator.page.AuthenticatorSetupPage.scan_qr_code__1trunj",
                  )}
                </h4>

                {qrCode ? (
                  <div className="bg-gray-100 p-6 rounded-lg inline-block">
                    <div className="w-48 h-48 bg-white p-4 rounded-lg">
                      {/* Mock QR Code - in real app, use a QR code library */}
                      <div className="w-full h-full bg-gray-800 rounded-lg flex items-center justify-center">
                        <QRCodeComponent value={qrCode} />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="w-48 h-48 bg-gray-200 rounded-lg flex items-center justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                  </div>
                )}

                <p className="text-sm text-gray-600 mt-4">
                  {t(
                    "Use apps like Google Authenticator, Authy, or Microsoft Authenticator",
                    "2fa.authenticator.page.AuthenticatorSetupPage.use_apps_like_google_authenticator_authy_or_microsoft_authenticator__877017",
                  )}
                </p>
              </div>

              {/* Setup Instructions */}
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
                          "Download an authenticator app from your device's app store",
                          "2fa.authenticator.page.AuthenticatorSetupPage.download_an_authenticator_app_from_your_device_s_app_store__2f78m7",
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
                          "Open the app and scan the QR code above",
                          "2fa.authenticator.page.AuthenticatorSetupPage.open_the_app_and_scan_the_qr_code_above__18xly6",
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
                          "The app will start generating 6-digit codes every 30 seconds",
                          "2fa.authenticator.page.AuthenticatorSetupPage.the_app_will_start_generating_6_digit_codes_every_30_seconds__2gnmvu",
                        )}
                      </p>
                    </div>

                    <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0 w-6 h-6 bg-indigo-100 rounded-full flex items-center justify-center">
                        <span className="text-xs font-medium text-indigo-600">
                          4
                        </span>
                      </div>
                      <p className="text-sm text-gray-700">
                        {t(
                          'Click "Continue" when you\'re ready to verify',
                          "2fa.authenticator.page.AuthenticatorSetupPage.click_continue_when_you_re_ready_to_verify__1kqh7h",
                        )}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Manual Entry */}
                <div>
                  <h5 className="text-sm font-medium text-gray-900 mb-2">
                    Manual Entry
                  </h5>
                  <p className="text-sm text-gray-600 mb-2">
                    {t(
                      "If you can't scan the QR code, you can manually enter this secret key:",
                      "2fa.authenticator.page.AuthenticatorSetupPage.if_you_can_t_scan_the_qr_code_you_can_manually_enter_this_secret_key__119q3z",
                    )}
                  </p>
                  <div className="bg-gray-100 p-3 rounded-md">
                    <code className="text-sm font-mono text-gray-800">
                      {secret}
                    </code>
                  </div>
                </div>

                <Button
                  onClick={handleSetup}
                  disabled={isLoading}
                  className="w-full"
                >
                  {isLoading ? "Setting up..." : "Continue"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {step === "verify" && (
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h4 className="text-lg font-medium text-gray-900 mb-6">
              Verify Setup
            </h4>

            <div className="max-w-md mx-auto space-y-6">
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
                  length={6}
                  isInvalid={verificationCode.length !== 6}
                  ariaLabel="Enter the 6-digit code from your authenticator app"
                  name="otp"
                  className="w-full"
                />

                <p className="text-sm text-gray-500 mt-2">
                  {t(
                    "Enter the 6-digit code from your authenticator app",
                    "2fa.authenticator.page.AuthenticatorSetupPage.enter_the_6_digit_code_from_your_authenticator_app__xwwbik",
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

              <div className="text-center">
                <button
                  onClick={() => setStep("setup")}
                  className="text-sm text-indigo-600 hover:text-indigo-500"
                >
                  {t(
                    "\u2190 Back to Setup",
                    "2fa.authenticator.page.AuthenticatorSetupPage.back_to_setup__1tpmli",
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
