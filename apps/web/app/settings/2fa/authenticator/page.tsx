"use client";

import { useState } from "react";
import { Button, OtpInput, toast, ConfirmRemoveDialog } from "@ui/base";
import { QrCode, ArrowLeft, CheckCircle, Plus, Smartphone } from "lucide-react";
import Link from "next/link";
import { t } from "@i18n-core";
import { trpc } from "@/lib/trpc";
import QRCodeComponent from "react-qr-code";

export default function AuthenticatorSetupPage() {
  const [step, setStep] = useState<"add" | "verify" | "success">("add");
  const [qrCode, setQrCode] = useState<string>("");
  const [secret, setSecret] = useState<string>("");
  const [verificationCode, setVerificationCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [newCodeName, setNewCodeName] = useState("");
  const [tempName, setTempName] = useState("");

  // Check if user already has authenticator codes
  const { data: existingCodes, refetch: refetchCodes } = trpc.getAuthenticatorCodes.useQuery();
  const hasExistingCodes = existingCodes && existingCodes.length > 0;

  const generateCode = trpc.generateAuthenticatorCode.useMutation({
    onSuccess: (data) => {
      setQrCode(data.qrCodeUrl);
      setSecret(data.secret);
      setTempName(data.name);
      setStep("verify");
      toast.success("Authenticator code generated! Please scan the QR code and verify.");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const verifyAndCreate = trpc.verifyAndCreateAuthenticatorCode.useMutation({
    onSuccess: () => {
      setStep("success");
      refetchCodes();
      // Reset form
      setNewCodeName("");
      setVerificationCode("");
      setQrCode("");
      setSecret("");
      setTempName("");
      // Auto-reset to add step after 3 seconds
      setTimeout(() => setStep("add"), 7000);
    },
    onError: () => {
      toast.error("Invalid verification code. Please try again.");
    },
  });

  const deleteCode = trpc.deleteAuthenticatorCode.useMutation({
    onSuccess: () => {
      toast.success("Authenticator code deleted successfully");
      refetchCodes();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleGenerateCode = async () => {
    if (!newCodeName.trim()) {
      toast.error("Please enter a name for the authenticator code");
      return;
    }

    setIsLoading(true);
    try {
      await generateCode.mutateAsync({ name: newCodeName.trim() });
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
      await verifyAndCreate.mutateAsync({ 
        code: verificationCode,
        name: tempName,
        secret: secret
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteCode = async (id: string) => {
    await deleteCode.mutateAsync({ id });
  };

  const handleBackToAdd = () => {
    setStep("add");
    setQrCode("");
    setSecret("");
    setVerificationCode("");
    setTempName("");
  };

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
                "Authenticator App Management",
                "2fa.authenticator.page.AuthenticatorSetupPage.authenticator_app_management__4d84h3",
              )}
            </h3>
          </div>

          <p className="text-sm text-gray-600 mb-6">
            {t(
              "Manage your authenticator apps to generate verification codes for your account.",
              "2fa.authenticator.page.AuthenticatorSetupPage.manage_authenticator_apps_to_generate_verification_codes__5d84h3",
            )}
          </p>

          {/* Add New Authenticator */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <div className="flex items-center space-x-3 mb-3">
              <Plus className="h-5 w-5 text-indigo-600" />
              <h4 className="text-sm font-medium text-gray-900">Add New Authenticator</h4>
            </div>
            <div className="flex space-x-3">
              <input
                type="text"
                placeholder="Enter authenticator name (e.g., iPhone, Google Authenticator, Backup)"
                value={newCodeName}
                onChange={(e) => setNewCodeName(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-indigo-500 focus:border-indigo-500"
              />
              <Button
                onClick={handleGenerateCode}
                disabled={isLoading || !newCodeName.trim()}
                size="sm"
              >
                {isLoading ? "Generating..." : "Generate Code"}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Section 2: QR Code and Verification (fixed height, transitions to success) */}
      {step === "verify" && (
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex items-center space-x-3 mb-4">
            <QrCode className="h-5 w-5 text-green-600" />
            <h2 className="text-lg font-medium text-gray-900">
              {t(
                "Verify Authenticator",
                "2fa.authenticator.page.AuthenticatorSetupPage.verify_authenticator__9d84h3",
              )}
            </h2>
          </div>
          
          <div className="space-y-6">
            <div className="text-center">
              <p className="text-sm text-gray-600 mb-4">
                {t(
                  "Scan this QR code with your authenticator app, then enter the 6-digit code below to verify.",
                  "2fa.authenticator.page.AuthenticatorSetupPage.scan_qr_code_with_authenticator_app__0d84h3",
                )}
              </p>
              
              <div className="inline-block p-4 bg-white border-2 border-gray-200 rounded-lg">
                <QRCodeComponent value={qrCode} size={200} />
              </div>
              
              <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-600 mb-1">Manual Entry Secret:</p>
                <code className="text-sm font-mono bg-white px-2 py-1 rounded border">
                  {secret}
                </code>
              </div>
            </div>
            
            <div className="space-y-4">
              <div>
                <label htmlFor="verificationCode" className="block text-sm font-medium text-gray-700 mb-2">
                  {t(
                    "Verification Code",
                    "2fa.authenticator.page.AuthenticatorSetupPage.verification_code__1d84h3",
                  )}
                </label>
                <OtpInput
                  value={verificationCode}
                  onChange={setVerificationCode}
                  length={6}
                  className="justify-center"
                />
              </div>
              
              <div className="flex space-x-3">
                <Button 
                  onClick={handleVerify} 
                  disabled={isLoading || verificationCode.length !== 6}
                  className="flex-1"
                >
                  {isLoading ? "Verifying..." : t(
                    "Verify & Create",
                    "2fa.authenticator.page.AuthenticatorSetupPage.verify_and_create__2d84h3",
                  )}
                </Button>
                
                <Button 
                  variant="outline" 
                  onClick={handleBackToAdd}
                  className="flex-1"
                >
                  {t(
                    "Cancel",
                    "2fa.authenticator.page.AuthenticatorSetupPage.cancel__3d84h3",
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Success Notification (overlays the QR section) */}
      {step === "success" && (
        <div className="bg-white shadow rounded-lg p-6 border-2 border-green-200 bg-green-50">
          <div className="text-center">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-green-900 mb-2">
              {t(
                "Authenticator App Setup Complete!",
                "2fa.authenticator.page.AuthenticatorSetupPage.authenticator_app_setup_complete__1mjles",
              )}
            </h3>
            <p className="text-sm text-green-700 mb-4">
              {t(
                "Your authenticator app is now configured and will generate verification codes for your account.",
                "2fa.authenticator.page.AuthenticatorSetupPage.your_authenticator_app_is_now_configured_and_will_generate_verification_codes_for_your_account__2d93l7",
              )}
            </p>
            <p className="text-xs text-green-600">
              This notification will automatically disappear in a few seconds...
            </p>
          </div>
        </div>
      )}

      {/* Section 3: Existing Authenticator Apps */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h4 className="text-lg font-medium text-gray-900 mb-4">
            {t(
              "Your Authenticator Apps",
              "2fa.authenticator.page.AuthenticatorSetupPage.your_authenticator_apps__4d84h3",
            )}
          </h4>
          
          {!hasExistingCodes ? (
            <div className="text-center py-8 text-gray-500">
              <Smartphone className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p className="text-sm">
                {t(
                  "No authenticator apps configured yet. Add one above to get started.",
                  "2fa.authenticator.page.AuthenticatorSetupPage.no_authenticator_apps_configured_yet__5d84h3",
                )}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {existingCodes?.map((code) => (
                <div key={code.id} className="border border-gray-200 rounded-lg p-4 flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Smartphone className="h-5 w-5 text-purple-500" />
                    <div>
                      <p className="font-medium text-gray-900">{code.name}</p>
                      <div className="flex items-center space-x-4 text-sm text-gray-500">
                        <span>Secret: {code.secret}</span>
                        <span>Created: {new Date(code.createdAt).toLocaleDateString()}</span>
                        {code.lastUsedAt && (
                          <span>Last used: {new Date(code.lastUsedAt).toLocaleDateString()}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <ConfirmRemoveDialog
                    title="Remove Authenticator Code"
                    description={`Are you sure you want to remove the authenticator code "${code.name}"? This action cannot be undone and you'll need to set it up again if you want to use it.`}
                    actionText="Remove Authenticator Code"
                    onConfirm={() => handleDeleteCode(code.id)}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
