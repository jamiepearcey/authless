"use client";

import { useState } from "react";
import { Button } from "@ui/base";
import {
  Key,
  ArrowLeft,
  CheckCircle,
  Smartphone,
  Fingerprint,
  Shield,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { t } from "@i18n-core";
export default function PasskeySetupPage() {
  const [step, setStep] = useState<"setup" | "verify" | "success">("setup");
  const [isLoading, setIsLoading] = useState(false);
  const [supportedMethods, setSupportedMethods] = useState<string[]>([]);

  // Check for supported passkey methods
  useState(() => {
    const methods = [];
    if (window.PublicKeyCredential) {
      methods.push("WebAuthn");
    }
    if (navigator.credentials) {
      methods.push("Credentials API");
    }
    // Add more detection logic as needed
    setSupportedMethods(methods);
  });
  const handleSetup = async () => {
    setIsLoading(true);
    try {
      // TODO: Call API to generate passkey challenge
      await new Promise((resolve) => setTimeout(resolve, 1000)); // Simulate API call
      setStep("verify");
    } catch (error) {
      console.error("Failed to setup passkey:", error);
    } finally {
      setIsLoading(false);
    }
  };
  const handleVerify = async () => {
    setIsLoading(true);
    try {
      // TODO: Call API to verify passkey
      await new Promise((resolve) => setTimeout(resolve, 1000)); // Simulate API call
      setStep("success");
    } catch (error) {
      console.error("Failed to verify passkey:", error);
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
              "Passkey Setup Complete!",
              "2fa.passkey.page.PasskeySetupPage.passkey_setup_complete__nb0lh7",
            )}
          </h3>
          <p className="text-sm text-gray-600 mb-6">
            {t(
              "Your passkey is now configured and can be used for secure, passwordless authentication.",
              "2fa.passkey.page.PasskeySetupPage.your_passkey_is_now_configured_and_can_be_used_for_secure_passwordless_authentication__1zwpp3",
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
            <Key className="h-6 w-6 text-indigo-600" />
            <h3 className="text-lg leading-6 font-medium text-gray-900">
              {t(
                "Set Up Passkey",
                "2fa.passkey.page.PasskeySetupPage.set_up_passkey__ieez43",
              )}
            </h3>
          </div>

          <p className="text-sm text-gray-600 mb-6">
            {t(
              "Use biometric authentication or device security keys for secure, passwordless sign-in.",
              "2fa.passkey.page.PasskeySetupPage.use_biometric_authentication_or_device_security_keys_for_secure_passwordless_sign_in__10yvjj",
            )}
          </p>
        </div>
      </div>

      {step === "setup" && (
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Passkey Info */}
              <div className="space-y-6">
                <div>
                  <h4 className="text-lg font-medium text-gray-900 mb-4">
                    {t(
                      "What is a Passkey?",
                      "2fa.passkey.page.PasskeySetupPage.what_is_a_passkey__20lv7x",
                    )}
                  </h4>
                  <p className="text-sm text-gray-600 mb-4">
                    {t(
                      "Passkeys are a modern, secure alternative to passwords that use biometric authentication \n                    (like fingerprint or face recognition) or device security keys.",
                      "2fa.passkey.page.PasskeySetupPage.passkeys_are_a_modern_secure_alternative_to_passwords_that_use_biometric_authentication_like_fingerprint_or_face_recognition_or_device_security_keys__1138sb",
                    )}
                  </p>

                  <div className="space-y-3">
                    <div className="flex items-center space-x-3">
                      <Shield className="h-5 w-5 text-green-500" />
                      <span className="text-sm text-gray-700">
                        {t(
                          "More secure than passwords",
                          "2fa.passkey.page.PasskeySetupPage.more_secure_than_passwords__bon07t",
                        )}
                      </span>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Smartphone className="h-5 w-5 text-green-500" />
                      <span className="text-sm text-gray-700">
                        {t(
                          "Works across your devices",
                          "2fa.passkey.page.PasskeySetupPage.works_across_your_devices__17d696",
                        )}
                      </span>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Fingerprint className="h-5 w-5 text-green-500" />
                      <span className="text-sm text-gray-700">
                        Biometric authentication
                      </span>
                    </div>
                  </div>
                </div>

                {/* Supported Methods */}
                <div>
                  <h5 className="text-sm font-medium text-gray-900 mb-2">
                    Supported Methods
                  </h5>
                  <div className="space-y-2">
                    {supportedMethods.length > 0 ? (
                      supportedMethods.map((method) => (
                        <div
                          key={method}
                          className="flex items-center space-x-2"
                        >
                          <CheckCircle className="h-4 w-4 text-green-500" />
                          <span className="text-sm text-gray-600">
                            {method}
                          </span>
                        </div>
                      ))
                    ) : (
                      <div className="flex items-center space-x-2">
                        <XCircle className="h-4 w-4 text-red-500" />
                        <span className="text-sm text-gray-600">
                          {t(
                            "No passkey support detected",
                            "2fa.passkey.page.PasskeySetupPage.no_passkey_support_detected__1onmtc",
                          )}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
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
                          "Ensure your device supports biometric authentication or has a security key",
                          "2fa.passkey.page.PasskeySetupPage.ensure_your_device_supports_biometric_authentication_or_has_a_security_key__2b5x72",
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
                          'Click "Set Up Passkey" to begin the registration process',
                          "2fa.passkey.page.PasskeySetupPage.click_set_up_passkey_to_begin_the_registration_process__1ndb7l",
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
                          "Follow your device's prompts to create the passkey",
                          "2fa.passkey.page.PasskeySetupPage.follow_your_device_s_prompts_to_create_the_passkey__1cndyn",
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
                          "Verify the setup by using your passkey to sign in",
                          "2fa.passkey.page.PasskeySetupPage.verify_the_setup_by_using_your_passkey_to_sign_in__2uox8r",
                        )}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Requirements */}
                <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                  <h5 className="text-sm font-medium text-blue-800 mb-2">
                    Requirements
                  </h5>
                  <ul className="text-sm text-blue-700 space-y-1">
                    <li>
                      {t(
                        "\u2022 Device with biometric authentication (fingerprint, face ID)",
                        "2fa.passkey.page.PasskeySetupPage.device_with_biometric_authentication_fingerprint_face_id__bv3343",
                      )}
                    </li>
                    <li>
                      {t(
                        "\u2022 Or a compatible security key (FIDO2)",
                        "2fa.passkey.page.PasskeySetupPage.or_a_compatible_security_key_fido2__18l3w8",
                      )}
                    </li>
                    <li>
                      {t(
                        "\u2022 Modern browser with WebAuthn support",
                        "2fa.passkey.page.PasskeySetupPage.modern_browser_with_webauthn_support__1lmwh5",
                      )}
                    </li>
                    <li>
                      {t(
                        "\u2022 HTTPS connection (required for security)",
                        "2fa.passkey.page.PasskeySetupPage.https_connection_required_for_security__1s61m1",
                      )}
                    </li>
                  </ul>
                </div>

                <Button
                  onClick={handleSetup}
                  disabled={isLoading || supportedMethods.length === 0}
                  className="w-full"
                >
                  {isLoading ? "Setting up..." : "Set Up Passkey"}
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
              {t(
                "Verify Passkey Setup",
                "2fa.passkey.page.PasskeySetupPage.verify_passkey_setup__ivyroo",
              )}
            </h4>

            <div className="max-w-md mx-auto space-y-6">
              <div className="text-center">
                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
                  <CheckCircle className="h-6 w-6 text-green-600" />
                </div>
                <h5 className="text-sm font-medium text-gray-900 mb-2">
                  {t(
                    "Passkey Created Successfully!",
                    "2fa.passkey.page.PasskeySetupPage.passkey_created_successfully__1xb5ci",
                  )}
                </h5>
                <p className="text-sm text-gray-600">
                  {t(
                    "Your passkey has been created. Now let's verify it works by testing the authentication.",
                    "2fa.passkey.page.PasskeySetupPage.your_passkey_has_been_created_now_let_s_verify_it_works_by_testing_the_authentication__ois1pq",
                  )}
                </p>
              </div>

              <div className="space-y-3">
                <Button
                  onClick={handleVerify}
                  disabled={isLoading}
                  className="w-full"
                >
                  {isLoading ? "Verifying..." : "Test Passkey Authentication"}
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
