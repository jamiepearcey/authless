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
    hasPasskeys: false,
    hasAuthenticatorCodes: false,
    passkeyCount: 0,
    authenticatorCodeCount: 0,
  };

  const getStatusIcon = (hasDevices: boolean) => {
    if (hasDevices) {
      return <CheckCircle className="h-6 w-6 text-green-500" />;
    } else {
      return <XCircle className="h-6 w-6 text-red-500" />;
    }
  };

  const getStatusColor = (hasDevices: boolean) => {
    if (hasDevices) {
      return "bg-green-100 text-green-800";
    } else {
      return "bg-red-100 text-red-800";
    }
  };

  const getStatusText = (hasDevices: boolean) => {
    if (hasDevices) {
      return "Set Up";
    } else {
      return "Not Set Up";
    }
  };

  const getDeviceCountText = (count: number) => {
    if (count === 0) return "No devices";
    if (count === 1) return "1 device";
    return `${count} devices`;
  };

  return (
    <div className="flex-1 bg-gray-50 py-8">
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
                {getStatusIcon(status.hasAuthenticatorCodes)}
              </div>
            </div>

            <div className="mb-4">
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(status.hasAuthenticatorCodes)}`}
              >
                {getStatusText(status.hasAuthenticatorCodes)}
              </span>
              {status.hasAuthenticatorCodes && (
                <span className="ml-2 text-sm text-gray-500">
                  {getDeviceCountText(status.authenticatorCodeCount)}
                </span>
              )}
            </div>

            <p className="text-gray-600 mb-6">
              {t(
                "Use authenticator apps like Google Authenticator, Authy, or 1Password to generate time-based codes",
                "2fa.page.TwoFactorPage.use_authenticator_apps_like_google_authenticator_authy_or_1password_to_generate_time_based_codes__1zwpp3",
              )}
            </p>

            <Link href="/settings/2fa/authenticator">
              <Button
                variant={
                  status.hasAuthenticatorCodes ? "outline" : "default"
                }
                className="w-full"
              >
                {status.hasAuthenticatorCodes ? "Manage" : "Set Up"}
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
                {getStatusIcon(status.hasPasskeys)}
              </div>
            </div>

            <div className="mb-4">
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(status.hasPasskeys)}`}
              >
                {getStatusText(status.hasPasskeys)}
              </span>
              {status.hasPasskeys && (
                <span className="ml-2 text-sm text-gray-500">
                  {getDeviceCountText(status.passkeyCount)}
                </span>
              )}
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
                  status.hasPasskeys ? "outline" : "default"
                }
                className="w-full"
              >
                {status.hasPasskeys ? "Manage" : "Set Up"}
              </Button>
            </Link>
          </div>

          {/* WhatsApp Section (Disabled for now) */}
          <div className="bg-white shadow rounded-lg p-6 opacity-60">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <MessageCircle className="h-6 w-6 text-gray-400" />
                <h2 className="text-xl font-semibold text-gray-400">
                  WhatsApp
                </h2>
                <XCircle className="h-6 w-6 text-gray-400" />
              </div>
            </div>

            <div className="mb-4">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                Coming Soon
              </span>
            </div>

            <p className="text-gray-400 mb-6">
              Receive verification codes via WhatsApp for secure two-factor authentication
            </p>

            <Button
              disabled
              variant="outline"
              className="w-full cursor-not-allowed"
            >
              Coming Soon
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
