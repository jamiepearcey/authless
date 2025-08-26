"use client";

import Link from "next/link";
import { Button } from "@ui/base";
import { Shield, QrCode, Key, MessageCircle, CheckCircle, XCircle } from "lucide-react";
import { t } from "@i18n-core";
import { trpc } from "../../../lib/trpc";

export default function TwoFactorPage() {
  // Get 2FA status from tRPC
  const { data: twoFactorStatus, isLoading } = trpc.getTwoFactorStatus.useQuery();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  const status = twoFactorStatus || {
    authenticator: { enabled: false, verified: false },
    passkey: { enabled: false, verified: false },
  };
  const getStatusIcon = (enabled: boolean, verified: boolean) => {
    if (enabled && verified) {
      return <CheckCircle className="h-5 w-5 text-green-500" />;
    } else if (enabled && !verified) {
      return <XCircle className="h-5 w-5 text-yellow-500" />;
    } else {
      return <XCircle className="h-5 w-5 text-gray-400" />;
    }
  };
  const getStatusText = (enabled: boolean, verified: boolean) => {
    if (enabled && verified) {
      return "Active";
    } else if (enabled && !verified) {
      return "Pending Verification";
    } else {
      return "Not Set Up";
    }
  };
  const getStatusColor = (enabled: boolean, verified: boolean) => {
    if (enabled && verified) {
      return "text-green-600 bg-green-100";
    } else if (enabled && !verified) {
      return "text-yellow-600 bg-yellow-100";
    } else {
      return "text-gray-600 bg-gray-100";
    }
  };
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <div className="flex items-center space-x-3 mb-6">
            <Shield className="h-6 w-6 text-indigo-600" />
            <h3 className="text-lg leading-6 font-medium text-gray-900">
              Two-Factor Authentication
            </h3>
          </div>

          <p className="text-sm text-gray-600 mb-6">
            {t(
              "Add an extra layer of security to your account by enabling two-factor authentication. \n            You can use multiple methods simultaneously for enhanced security.",
              "settings.2fa.page.TwoFactorPage.add_an_extra_layer_of_security_to_your_account_by_enabling_two_factor_authentication_you_can_use_multiple_methods_simultaneously_for_enhanced_security__21ox6v",
            )}
          </p>

          <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <Shield className="h-5 w-5 text-blue-400" />
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-blue-800">
                  Security Recommendation
                </h3>
                <div className="mt-2 text-sm text-blue-700">
                  <p>
                    {t(
                      "We recommend enabling at least one two-factor authentication method to protect your account. \n                    You can use multiple methods for added security.",
                      "settings.2fa.page.TwoFactorPage.we_recommend_enabling_at_least_one_two_factor_authentication_method_to_protect_your_account_you_can_use_multiple_methods_for_added_security__284qor",
                    )}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2FA Methods */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Authenticator App */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <QrCode className="h-6 w-6 text-indigo-600" />
                <h4 className="text-lg font-medium text-gray-900">
                  Authenticator App
                </h4>
              </div>
              {getStatusIcon(
                status.authenticator.enabled,
                status.authenticator.verified,
              )}
            </div>

            <p className="text-sm text-gray-600 mb-4">
              {t(
                "Use apps like Google Authenticator, Authy, or Microsoft Authenticator to generate time-based codes.",
                "settings.2fa.page.TwoFactorPage.use_apps_like_google_authenticator_authy_or_microsoft_authenticator_to_generate_time_based_codes__12npvg",
              )}
            </p>

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
        </div>

        {/* Passkey */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <Key className="h-6 w-6 text-indigo-600" />
                <h4 className="text-lg font-medium text-gray-900">Passkey</h4>
              </div>
              {getStatusIcon(
                status.passkey.enabled,
                status.passkey.verified,
              )}
            </div>

            <p className="text-sm text-gray-600 mb-4">
              {t(
                "Use biometric authentication or device security keys for passwordless sign-in.",
                "settings.2fa.page.TwoFactorPage.use_biometric_authentication_or_device_security_keys_for_passwordless_sign_in__9hzkth",
              )}
            </p>

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

        {/* WhatsApp */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <MessageCircle className="h-6 w-6 text-indigo-600" />
                <h4 className="text-lg font-medium text-gray-900">WhatsApp</h4>
              </div>
              {getStatusIcon(
                status.passkey.enabled,
                status.passkey.verified,
              )}
            </div>

            <p className="text-sm text-gray-600 mb-4">
              {t(
                "Receive verification codes via WhatsApp for quick and easy authentication.",
                "settings.2fa.page.TwoFactorPage.receive_verification_codes_via_whatsapp_for_quick_and_easy_authentication__7zed6f",
              )}
            </p>

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

            <Link href="/settings/2fa/whatsapp">
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

      {/* Recovery Options */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h4 className="text-lg font-medium text-gray-900 mb-4">
            Recovery Options
          </h4>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h5 className="text-sm font-medium text-gray-900">
                  Recovery Codes
                </h5>
                <p className="text-sm text-gray-600">
                  {t(
                    "Generate backup codes to access your account if you lose your 2FA device.",
                    "settings.2fa.page.TwoFactorPage.generate_backup_codes_to_access_your_account_if_you_lose_your_2fa_device__1z6u7y",
                  )}
                </p>
              </div>
              <Button variant="outline" size="sm">
                Generate Codes
              </Button>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <h5 className="text-sm font-medium text-gray-900">
                  Trusted Devices
                </h5>
                <p className="text-sm text-gray-600">
                  {t(
                    "Manage devices that can skip 2FA verification.",
                    "settings.2fa.page.TwoFactorPage.manage_devices_that_can_skip_2fa_verification__19n0q6",
                  )}
                </p>
              </div>
              <Button variant="outline" size="sm">
                Manage Devices
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
