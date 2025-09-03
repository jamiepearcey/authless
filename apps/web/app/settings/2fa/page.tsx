"use client";

import Link from "next/link";
import { Button, Badge } from "@ui/base";
import { QrCode, Key, MessageCircle, CheckCircle, XCircle, Shield, Lock, AlertTriangle, Info, Mail } from "lucide-react";
import { t } from "@i18n-core";
import { trpc } from "../../../lib/trpc";

export default function TwoFactorPage() {
  // Get 2FA status from tRPC
  const { data: twoFactorStatus, isLoading } = trpc.getTwoFactorStatus.useQuery();
  const { data: twoFactorMethods } = trpc.get2fa.useQuery();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  const whatsAppMethod = twoFactorMethods?.find(method => method.type === "whatsapp");
  const hasWhatsApp = !!whatsAppMethod;
  
  const emailMethod = twoFactorMethods?.find(method => method.type === "email");
  const hasEmail = !!emailMethod;

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
    <div className="space-y-6">
      {/* Header Section */}
      <div className="bg-white shadow-lg rounded-xl border border-gray-200">
        <div className="px-6 py-8 sm:p-8">
          <div className="flex items-start space-x-4">
            <div className="flex-shrink-0">
              <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center">
                <Shield className="h-8 w-8 text-indigo-600" />
              </div>
            </div>
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                {t(
                  "Two-Factor Authentication",
                  "2fa.page.TwoFactorPage.two_factor_authentication__1jhuq4",
                )}
              </h1>
              <p className="text-gray-600 mb-4">
                {t(
                  "Secure your account with an additional layer of protection",
                  "2fa.page.TwoFactorPage.secure_your_account_with_an_additional_layer_of_protection__1zwpp3",
                )}
              </p>
              
              {/* Security Status */}
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <Lock className="h-4 w-4 text-gray-400" />
                  <span className="text-sm text-gray-600">2FA Status:</span>
                  <Badge 
                    variant="outline" 
                    className={status.hasPasskeys || status.hasAuthenticatorCodes || hasWhatsApp || hasEmail ? "bg-green-100 text-green-800 border-green-200" : "bg-red-100 text-red-800 border-red-200"}
                  >
                    {status.hasPasskeys || status.hasAuthenticatorCodes || hasWhatsApp || hasEmail ? "Enabled" : "Disabled"}
                  </Badge>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-600">Methods:</span>
                  <span className="text-sm font-medium text-gray-900">
                    {[status.hasPasskeys, status.hasAuthenticatorCodes, hasWhatsApp, hasEmail].filter(Boolean).length} of 4
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Security Recommendations */}
      {!(status.hasPasskeys || status.hasAuthenticatorCodes || hasWhatsApp || hasEmail) && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-medium text-red-800">2FA Not Enabled</h3>
              <p className="text-sm text-red-700 mt-1">
                Your account is only protected by a password. Enable two-factor authentication to prevent unauthorized access.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Authentication Methods */}
      <div className="space-y-6">
        <div className="flex items-center space-x-3">
          <h2 className="text-lg font-semibold text-gray-900">Authentication Methods</h2>
          <div className="flex-1 h-px bg-gray-200"></div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Authenticator App Section */}
          <div className="bg-white shadow-lg rounded-xl border border-gray-200 p-6 hover:shadow-xl transition-shadow duration-200">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <QrCode className="h-5 w-5 text-blue-600" />
                </div>
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

            <p className="text-gray-600 mb-4">
              {t(
                "Use authenticator apps like Google Authenticator, Authy, or 1Password to generate time-based codes",
                "2fa.page.TwoFactorPage.use_authenticator_apps_like_google_authenticator_authy_or_1password_to_generate_time_based_codes__1zwpp3",
              )}
            </p>

            {/* Additional Info */}
            <div className="mb-6 p-3 bg-gray-50 rounded-lg">
              <div className="flex items-start space-x-2">
                <Info className="h-4 w-4 text-gray-400 flex-shrink-0 mt-0.5" />
                <div className="text-xs text-gray-600">
                  <p className="font-medium mb-1">Recommended Apps:</p>
                  <p>Google Authenticator, Authy, 1Password, Microsoft Authenticator</p>
                </div>
              </div>
            </div>

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
          <div className="bg-white shadow-lg rounded-xl border border-gray-200 p-6 hover:shadow-xl transition-shadow duration-200">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <Key className="h-5 w-5 text-green-600" />
                </div>
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

            <p className="text-gray-600 mb-4">
              {t(
                "Use biometric authentication or device security keys for passwordless sign-in",
                "2fa.page.TwoFactorPage.use_biometric_authentication_or_device_security_keys_for_passwordless_sign_in__1lfd4d",
              )}
            </p>

            {/* Additional Info */}
            <div className="mb-6 p-3 bg-gray-50 rounded-lg">
              <div className="flex items-start space-x-2">
                <Info className="h-4 w-4 text-gray-400 flex-shrink-0 mt-0.5" />
                <div className="text-xs text-gray-600">
                  <p className="font-medium mb-1">Supported Methods:</p>
                  <p>Face ID, Touch ID, Windows Hello, Security Keys (FIDO2)</p>
                </div>
              </div>
            </div>

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

          {/* WhatsApp Section */}
          <div className="bg-white shadow-lg rounded-xl border border-gray-200 p-6 hover:shadow-xl transition-shadow duration-200">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                  <MessageCircle className="h-5 w-5 text-emerald-600" />
                </div>
                <h2 className="text-xl font-semibold text-gray-900">
                  WhatsApp
                </h2>
                {getStatusIcon(hasWhatsApp)}
              </div>
            </div>

            <div className="mb-4">
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(hasWhatsApp)}`}
              >
                {getStatusText(hasWhatsApp)}
              </span>
              {hasWhatsApp && whatsAppMethod?.identifier && (
                <span className="ml-2 text-sm text-gray-500">
                  {whatsAppMethod.identifier}
                </span>
              )}
            </div>

            <p className="text-gray-600 mb-4">
              Receive verification codes via WhatsApp for secure two-factor authentication
            </p>

            {/* Additional Info */}
            <div className="mb-6 p-3 bg-gray-50 rounded-lg">
              <div className="flex items-start space-x-2">
                <Info className="h-4 w-4 text-gray-400 flex-shrink-0 mt-0.5" />
                <div className="text-xs text-gray-600">
                  <p className="font-medium mb-1">Benefits:</p>
                  <p>Instant delivery, works without internet, secure end-to-end encryption</p>
                </div>
              </div>
            </div>

            <Link href="/settings/2fa/whatsapp">
              <Button
                variant={hasWhatsApp ? "outline" : "default"}
                className="w-full"
              >
                {hasWhatsApp ? "Manage" : "Set Up"}
              </Button>
            </Link>
          </div>

          {/* Email Section */}
          <div className="bg-white shadow-lg rounded-xl border border-gray-200 p-6 hover:shadow-xl transition-shadow duration-200">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Mail className="h-5 w-5 text-blue-600" />
                </div>
                <h2 className="text-xl font-semibold text-gray-900">
                  Email
                </h2>
                {getStatusIcon(hasEmail)}
              </div>
            </div>

            <div className="mb-4">
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(hasEmail)}`}
              >
                {getStatusText(hasEmail)}
              </span>
              {hasEmail && emailMethod?.identifier && (
                <span className="ml-2 text-sm text-gray-500">
                  {emailMethod.identifier}
                </span>
              )}
            </div>

            <p className="text-gray-600 mb-4">
              Receive verification codes via email for secure two-factor authentication
            </p>

            {/* Additional Info */}
            <div className="mb-6 p-3 bg-gray-50 rounded-lg">
              <div className="flex items-start space-x-2">
                <Info className="h-4 w-4 text-gray-400 flex-shrink-0 mt-0.5" />
                <div className="text-xs text-gray-600">
                  <p className="font-medium mb-1">Benefits:</p>
                  <p>Works on any device, no app required, reliable delivery</p>
                </div>
              </div>
            </div>

            <Link href="/settings/2fa/email">
              <Button
                variant={hasEmail ? "outline" : "default"}
                className="w-full"
              >
                {hasEmail ? "Manage" : "Set Up"}
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Security Tips */}
      <div className="bg-white shadow-lg rounded-xl border border-gray-200">
        <div className="px-6 py-6 sm:p-6">
          <div className="flex items-center space-x-3 mb-4">
            <Shield className="h-5 w-5 text-indigo-600" />
            <h3 className="text-lg font-semibold text-gray-900">Important Notes</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-start space-x-3">
              <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <CheckCircle className="h-3 w-3 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">Backup Methods</p>
                <p className="text-xs text-gray-600">Set up multiple 2FA methods in case you lose access to one</p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3">
              <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <CheckCircle className="h-3 w-3 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">Recovery Codes</p>
                <p className="text-xs text-gray-600">Download and store backup codes somewhere safe</p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3">
              <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <CheckCircle className="h-3 w-3 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">Device Security</p>
                <p className="text-xs text-gray-600">Lock your phone/computer with a PIN or biometric</p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3">
              <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <CheckCircle className="h-3 w-3 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">App Updates</p>
                <p className="text-xs text-gray-600">Keep authenticator apps updated for security fixes</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
