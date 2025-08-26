"use client";

import Link from "next/link";
import { Button } from "@ui/base";
import { Shield, QrCode, Key, MessageCircle, CheckCircle, XCircle, Plus, Trash2, Clock } from "lucide-react";
import { t } from "@i18n-core";
import { trpc } from "../../../lib/trpc";
import { useState } from "react";
import { toast } from "@ui/base";

export default function TwoFactorPage() {
  const [newCodeName, setNewCodeName] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

  // Get 2FA status from tRPC
  const { data: twoFactorStatus, isLoading } = trpc.getTwoFactorStatus.useQuery();
  
  // Get authenticator codes
  const { data: authenticatorCodes, refetch: refetchCodes } = trpc.getAuthenticatorCodes.useQuery();

  // tRPC mutations
  const generateCodeMutation = trpc.generateAuthenticatorCode.useMutation();
  const deleteCodeMutation = trpc.deleteAuthenticatorCode.useMutation();


  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  let status = twoFactorStatus || {
    authenticator: { enabled: false, verified: false },
    passkey: { enabled: false, verified: false },
  };

  status = {
    authenticator: { enabled: false, verified: false },
    passkey: { enabled: false, verified: false },
  };
  const getStatusIcon = (enabled: boolean, verified: boolean) => {
    if (enabled && verified) {
      return <CheckCircle className="h-6 w-6 text-green-500" />;
    } else if (enabled && !verified) {
      return <Clock className="h-6 w-6 text-yellow-500" />;
    } else {
      return <XCircle className="h-6 w-6 text-red-500" />;
    }
  };

  const getStatusColor = (enabled: boolean, verified: boolean) => {
    if (enabled && verified) {
      return "bg-green-100 text-green-800";
    } else if (enabled && !verified) {
      return "bg-yellow-100 text-yellow-800";
    } else {
      return "bg-red-100 text-red-800";
    }
  };

  const getStatusText = (enabled: boolean, verified: boolean) => {
    if (enabled && verified) {
      return "Enabled";
    } else if (enabled && !verified) {
      return "Pending Verification";
    } else {
      return "Disabled";
    }
  };

  const handleGenerateCode = async () => {
    if (!newCodeName.trim()) {
      toast.error("Please enter a name for the authenticator code");
      return;
    }

    setIsGenerating(true);
    try {
      await generateCodeMutation.mutateAsync({ name: newCodeName.trim() });
      toast.success("New authenticator code generated successfully!");
      setNewCodeName("");
      refetchCodes();
    } catch (error) {
      toast.error("Failed to generate authenticator code");
      console.error("Generate code error:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDeleteCode = async (codeId: string) => {
    try {
      await deleteCodeMutation.mutateAsync({ id: codeId });
      toast.success("Authenticator code deleted successfully!");
      refetchCodes();
    } catch (error) {
      toast.error("Failed to delete authenticator code");
      console.error("Delete code error:", error);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "Never used";
    
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return `${Math.floor(diffDays / 30)} months ago`;
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            {t(
              "Two-Factor Authentication",
              "2fa.page.TwoFactorPage.two_factor_authentication__1jhuq4",
            )}
          </h1>
          <p className="mt-2 text-gray-600">
            {t(
              "Secure your account with an additional layer of protection",
              "2fa.page.TwoFactorPage.secure_your_account_with_an_additional_layer_of_protection__1zwpp3",
            )}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Authenticator App Section */}
          <div className="bg-white shadow rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <QrCode className="h-6 w-6 text-indigo-600" />
                <h2 className="text-xl font-semibold text-gray-900">
                  {t(
                    "Authenticator App",
                    "2fa.page.TwoFactorPage.authenticator_app__j0xg13",
                  )}
                </h2>
                {getStatusIcon(
                  status.authenticator.enabled,
                  status.authenticator.verified,
                )}
              </div>
            </div>

            <div className="mb-4">
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(status.authenticator.enabled, status.authenticator.verified)}`}
              >
                {getStatusText(
                  status.authenticator.enabled,
                  status.authenticator.verified,
                )}
              </span>
            </div>

            <p className="text-gray-600 mb-6">
              {t(
                "Use authenticator apps like Google Authenticator, Authy, or 1Password to generate time-based codes",
                "2fa.page.TwoFactorPage.use_authenticator_apps_like_google_authenticator_authy_or_1password_to_generate_time_based_codes__1zwpp3",
              )}
            </p>

            {/* Generate New Code Section */}
            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <h3 className="text-sm font-medium text-gray-900 mb-3">Generate New Code</h3>
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={newCodeName}
                  onChange={(e) => setNewCodeName(e.target.value)}
                  placeholder="e.g., iPhone, Backup Code"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                />
                <Button
                  onClick={handleGenerateCode}
                  disabled={isGenerating || !newCodeName.trim()}
                  size="sm"
                >
                  {isGenerating ? "Generating..." : "Generate"}
                </Button>
              </div>
            </div>

            {/* Existing Codes */}
            {authenticatorCodes && authenticatorCodes.length > 0 && (
              <div className="mb-6">
                <h3 className="text-sm font-medium text-gray-900 mb-3">Your Authenticator Codes</h3>
                <div className="space-y-2">
                  {authenticatorCodes.map((code: any) => (
                    <div key={code.id} className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg">
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">{code.name}</p>
                        <p className="text-sm text-gray-500">Code: {code.secret}</p>
                        <p className="text-xs text-gray-400">Last used: {formatDate(code.lastUsedAt)}</p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteCode(code.id)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <Link href="/settings/2fa/authenticator">
              <Button
                variant={
                  status.authenticator.enabled ? "outline" : "default"
                }
                className="w-full"
              >
                {status.authenticator.enabled ? "Manage" : "Set Up"}
              </Button>
            </Link>
          </div>

          {/* Passkey Section */}
          <div className="bg-white shadow rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <Key className="h-6 w-6 text-indigo-600" />
                <h2 className="text-xl font-semibold text-gray-900">
                  {t(
                    "Passkey",
                    "2fa.page.TwoFactorPage.passkey__1uhp1i",
                  )}
                </h2>
                {getStatusIcon(
                  status.passkey.enabled,
                  status.passkey.verified,
                )}
              </div>
            </div>

            <div className="mb-4">
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(status.passkey.enabled, status.passkey.verified)}`}
              >
                {getStatusText(
                  status.passkey.enabled,
                  status.passkey.verified,
                )}
              </span>
            </div>

            <p className="text-gray-600 mb-6">
              {t(
                "Use biometric authentication or device security keys for passwordless sign-in",
                "2fa.page.TwoFactorPage.use_biometric_authentication_or_device_security_keys_for_passwordless_sign_in__1lfd4d",
              )}
            </p>

            <Link href="/settings/2fa/passkey">
              <Button
                variant={
                  status.passkey.enabled ? "outline" : "default"
                }
                className="w-full"
              >
                {status.passkey.enabled ? "Manage" : "Set Up"}
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
