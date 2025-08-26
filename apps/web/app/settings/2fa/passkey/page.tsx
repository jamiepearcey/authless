"use client";

import { useState, useEffect } from "react";
import { Button } from "@ui/base";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@ui/base";
import {
  Key,
  ArrowLeft,
  CheckCircle,
  Smartphone,
  Fingerprint,
  Shield,
  XCircle,
  Plus,
  Trash2,
  Clock,
  Monitor,
  Laptop,
} from "lucide-react";
import Link from "next/link";
import { t } from "@i18n-core";
import { toast } from "@ui/base";
import { trpc } from "@/lib/trpc";
import { useSession } from "next-auth/react";

interface Passkey {
  id: string;
  name: string;
  lastUsedAt: string | null;
  createdAt: string;
  transports: string | null;
  backupEligible: boolean;
  backupState: boolean;
}

export default function PasskeySetupPage() {
  const { data: session } = useSession();
  const [step, setStep] = useState<"list" | "setup" | "verify" | "success">("list");
  const [isLoading, setIsLoading] = useState(false);
  const [supportedMethods, setSupportedMethods] = useState<string[]>([]);
  const [newPasskeyName, setNewPasskeyName] = useState("");
  const [isAddingPasskey, setIsAddingPasskey] = useState(false);

  // tRPC queries and mutations
  const { data: passkeys, refetch: refetchPasskeys } = trpc.getUserPasskeys.useQuery(
    { userId: session?.user?.id },
    { enabled: !!session?.user?.id }
  );
  const revokePasskeyMutation = trpc.revokePasskey.useMutation();
  const getRegistrationOptionsMutation = trpc.getRegistrationOptions.useMutation();
  const registerPasskeyMutation = trpc.registerPasskey.useMutation();

  // Check for supported passkey methods
  useEffect(() => {
    const methods = [];
    if (typeof window !== "undefined" && window.PublicKeyCredential) {
      methods.push("WebAuthn");
    }
    if (typeof navigator !== "undefined" && navigator.credentials) {
      methods.push("Credentials API");
    }
    setSupportedMethods(methods);
  }, []);

  const handleSetup = async () => {
    // This is now handled by handleAddPasskey - just show the add passkey form
    setStep("list");
  };

  const handleVerify = async () => {
    // Verification is now part of the real WebAuthn flow in handleAddPasskey
    setStep("success");
  };

  const handleAddPasskey = async () => {
    if (!newPasskeyName.trim()) {
      toast.error("Please enter a name for your passkey");
      return;
    }

    if (!session?.user?.id) {
      toast.error("User session not found. Please log in again.");
      return;
    }

    // Check if WebAuthn is supported
    if (typeof window === "undefined" || !window.PublicKeyCredential) {
      toast.error("WebAuthn is not supported in this browser");
      return;
    }

    if (!navigator.credentials) {
      toast.error("Credentials API is not supported in this browser");
      return;
    }

    setIsAddingPasskey(true);
    try {
      // Get registration options from tRPC
      const options = await getRegistrationOptionsMutation.mutateAsync({
        userId: session.user.id,
      });

      // Ensure the page is focused before triggering WebAuthn
      if (document.hasFocus && !document.hasFocus()) {
        toast.error("Please ensure this tab is focused before adding a passkey");
        return;
      }

      // Convert base64 challenge back to ArrayBuffer
      const challenge = Uint8Array.from(atob(options.challenge), c => c.charCodeAt(0));
      
      // Convert user ID from base64 back to ArrayBuffer
      const userId = Uint8Array.from(atob(options.user.id), c => c.charCodeAt(0));

      // Create WebAuthn registration options
      const publicKeyOptions: PublicKeyCredentialCreationOptions = {
        challenge,
        rp: options.rp,
        user: {
          id: userId,
          name: options.user.name,
          displayName: options.user.displayName,
        },
        pubKeyCredParams: options.pubKeyCredParams.map(param => ({
          alg: param.alg,
          type: "public-key" as const,
        })),
        timeout: options.timeout,
        attestation: options.attestation as AttestationConveyancePreference,
        authenticatorSelection: {
          authenticatorAttachment: options.authenticatorSelection.authenticatorAttachment as AuthenticatorAttachment,
          userVerification: options.authenticatorSelection.userVerification as UserVerificationRequirement,
          requireResidentKey: options.authenticatorSelection.requireResidentKey,
        },
        excludeCredentials: options.excludeCredentials,
      };

      console.log("WebAuthn options:", publicKeyOptions);

      // Trigger WebAuthn registration
      const credential = await navigator.credentials.create({
        publicKey: publicKeyOptions,
      }) as PublicKeyCredential;

      if (!credential) {
        throw new Error("Failed to create passkey credential");
      }

      // Extract credential data
      const response = credential.response as AuthenticatorAttestationResponse;
      const credentialId = btoa(String.fromCharCode(...new Uint8Array(credential.rawId)));
      const publicKey = btoa(String.fromCharCode(...new Uint8Array(response.getPublicKey() || new ArrayBuffer(0))));
      const clientDataJSON = btoa(String.fromCharCode(...new Uint8Array(response.clientDataJSON)));
      const attestationObject = btoa(String.fromCharCode(...new Uint8Array(response.attestationObject)));

      // Get transports if available (this is a newer API)
      let transports: string[] | undefined;
      if ('getTransports' in response && typeof response.getTransports === 'function') {
        transports = response.getTransports();
      }

      // Register the passkey with our backend
      await registerPasskeyMutation.mutateAsync({
        userId: session.user.id,
        name: newPasskeyName,
        credentialId,
        publicKey,
        signCount: 0,
        transports,
        backupEligible: response.attestationObject ? true : false,
        backupState: false,
        userVerification: "preferred",
      });

      toast.success("Passkey added successfully!");
      setNewPasskeyName("");
      setStep("list");
      refetchPasskeys();
    } catch (error) {
      console.error("Failed to add passkey:", error);
      
      // Handle specific WebAuthn errors
      if (error instanceof Error) {
        if (error.name === "SecurityError") {
          toast.error("Security error: Please ensure you're on the correct domain and try again");
        } else if (error.name === "NotAllowedError") {
          toast.error("Operation cancelled or not allowed. Please ensure the tab is focused and try again");
        } else if (error.name === "NotSupportedError") {
          toast.error("WebAuthn is not supported in this browser. Please use a modern browser with WebAuthn support");
        } else if (error.name === "InvalidStateError") {
          toast.error("Invalid state error. Please refresh the page and try again");
        } else {
          toast.error(`Failed to add passkey: ${error.message}`);
        }
      } else {
        toast.error("Failed to add passkey");
      }
    } finally {
      setIsAddingPasskey(false);
    }
  };

  const handleRevokePasskey = async (passkeyId: string) => {
    try {
      await revokePasskeyMutation.mutateAsync({ passkeyId });
      toast.success("Passkey revoked successfully");
      refetchPasskeys();
    } catch (error) {
      toast.error("Failed to revoke passkey");
      console.error("Failed to revoke passkey:", error);
    }
  };

  const getDeviceIcon = (passkey: Passkey) => {
    const name = passkey.name.toLowerCase();
    if (name.includes("iphone") || name.includes("android") || name.includes("phone")) {
      return <Smartphone className="h-5 w-5" />;
    } else if (name.includes("macbook") || name.includes("laptop")) {
      return <Laptop className="h-5 w-5" />;
    } else if (name.includes("desktop") || name.includes("pc")) {
      return <Monitor className="h-5 w-5" />;
    } else {
      return <Key className="h-5 w-5" />;
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "Never";
    
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return date.toLocaleDateString();
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

  if (step === "list") {
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
                  "Passkey Management",
                  "2fa.passkey.page.PasskeySetupPage.passkey_management__new_key",
                )}
              </h3>
            </div>

            <p className="text-sm text-gray-600 mb-6">
              {t(
                "Manage your passkeys for secure, passwordless authentication across your devices.",
                "2fa.passkey.page.PasskeySetupPage.manage_passkeys_for_secure_passwordless_authentication__new_desc",
              )}
            </p>

            {/* Add New Passkey */}
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <div className="flex items-center space-x-3 mb-3">
                <Plus className="h-5 w-5 text-indigo-600" />
                <h4 className="text-sm font-medium text-gray-900">Add New Passkey</h4>
              </div>
              <div className="flex space-x-3">
                <input
                  type="text"
                  placeholder="Enter passkey name (e.g., iPhone 14, MacBook Pro)"
                  value={newPasskeyName}
                  onChange={(e) => setNewPasskeyName(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-indigo-500 focus:border-indigo-500"
                />
                <Button
                  onClick={handleAddPasskey}
                  disabled={isAddingPasskey || !newPasskeyName.trim()}
                  size="sm"
                >
                  {isAddingPasskey ? "Adding..." : "Add Passkey"}
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Existing Passkeys */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h4 className="text-lg font-medium text-gray-900 mb-4">
              {t(
                "Your Passkeys",
                "2fa.passkey.page.PasskeySetupPage.your_passkeys__new_title",
              )}
            </h4>

            {passkeys && passkeys.length > 0 ? (
              <div className="space-y-4">
                {passkeys.map((passkey: Passkey) => (
                  <div
                    key={passkey.id}
                    className="border border-gray-200 rounded-lg p-4 flex items-center justify-between"
                  >
                    <div className="flex items-center space-x-3">
                      {getDeviceIcon(passkey)}
                      <div>
                        <p className="font-medium text-gray-900">{passkey.name}</p>
                        <div className="flex items-center space-x-4 text-sm text-gray-500">
                          <span className="flex items-center space-x-1">
                            <Clock className="h-4 w-4" />
                            <span>Last used: {formatDate(passkey.lastUsedAt)}</span>
                          </span>
                          <span>Created: {formatDate(passkey.createdAt)}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      {passkey.backupEligible && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          {passkey.backupState ? "Backed up" : "Backup eligible"}
                        </span>
                      )}
                      
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700 hover:bg-red-50">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Revoke Passkey</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to revoke the passkey "{passkey.name}"? 
                              This action cannot be undone and you'll need to set it up again if you want to use it.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction 
                              onClick={() => handleRevokePasskey(passkey.id)}
                              className="bg-red-600 hover:bg-red-700"
                            >
                              Revoke Passkey
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Key className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h5 className="text-sm font-medium text-gray-900 mb-2">
                  {t(
                    "No passkeys yet",
                    "2fa.passkey.page.PasskeySetupPage.no_passkeys_yet__new_text",
                  )}
                </h5>
                <p className="text-sm text-gray-600 mb-4">
                  {t(
                    "Add your first passkey to get started with passwordless authentication.",
                    "2fa.passkey.page.PasskeySetupPage.add_first_passkey_to_get_started__new_desc",
                  )}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Supported Methods */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h4 className="text-sm font-medium text-gray-900 mb-4">
              Supported Methods
            </h4>
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
