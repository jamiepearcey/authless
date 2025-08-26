"use client";

import { t } from "@i18n-core";
import { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  User,
  Settings,
  Shield,
  QrCode,
  MessageCircle,
  Key,
} from "lucide-react";
import { AuthGuard } from "../../components/guards/AuthGuard";

interface SettingsLayoutProps {
  children: ReactNode;
}

export default function SettingsLayout({ children }: SettingsLayoutProps) {
  const pathname = usePathname();
  const navigationItems = [
    {
      name: t(
        "Profile",
        "settings.layout.navigationItems.SettingsLayout.profile__nij1kq",
      ),
      href: "/settings/profile",
      icon: User,
      description: t(
        "Manage your personal information",
        "settings.layout.navigationItems.SettingsLayout.manage_your_personal_information__2cwyos",
      ),
    },
    {
      name: t(
        "Account Settings",
        "settings.layout.navigationItems.SettingsLayout.account_settings__svtrdw",
      ),
      href: "/settings/account",
      icon: Settings,
      description: t(
        "Email, password, and account preferences",
        "settings.layout.navigationItems.SettingsLayout.email_password_and_account_preferences__1fqa3k",
      ),
    },
    {
      name: t(
        "Two-Factor Authentication",
        "settings.layout.navigationItems.SettingsLayout.two_factor_authentication__1jhuq4",
      ),
      href: "/settings/2fa",
      icon: Shield,
      description: t(
        "Secure your account with 2FA",
        "settings.layout.navigationItems.SettingsLayout.secure_your_account_with_2fa__29ix4i",
      ),
    },
  ];
  const twoFactorOptions = [
    {
      name: t(
        "Authenticator App",
        "settings.layout.twoFactorOptions.SettingsLayout.authenticator_app__j0xg13",
      ),
      href: "/settings/2fa/authenticator",
      icon: QrCode,
      description: t(
        "Use apps like Google Authenticator",
        "settings.layout.twoFactorOptions.SettingsLayout.use_apps_like_google_authenticator__26swsc",
      ),
    },
    {
      name: t(
        "Passkey",
        "settings.layout.twoFactorOptions.SettingsLayout.passkey__1uhp1i",
      ),
      href: "/settings/2fa/passkey",
      icon: Key,
      description: t(
        "Use biometric or device security",
        "settings.layout.twoFactorOptions.SettingsLayout.use_biometric_or_device_security__1lfd4d",
      ),
    },
    {
      name: t(
        "WhatsApp",
        "settings.layout.twoFactorOptions.SettingsLayout.whatsapp__imyd3r",
      ),
      href: "/settings/2fa/whatsapp",
      icon: MessageCircle,
      description: t(
        "Receive codes via WhatsApp",
        "settings.layout.twoFactorOptions.SettingsLayout.receive_codes_via_whatsapp__crlcf2",
      ),
    },
  ];
  return (
    <AuthGuard>
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="lg:grid lg:grid-cols-12 lg:gap-x-5">
            {/* Sidebar */}
            <aside className="py-6 px-2 sm:px-6 lg:col-span-3">
              <nav className="space-y-1">
                {navigationItems.map((item) => {
                  const isActive = pathname === item.href;
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      className={`group flex items-center px-3 py-2 text-sm font-medium rounded-md ${isActive ? "bg-indigo-50 border-indigo-200 text-indigo-700" : "text-gray-900 hover:text-gray-700 hover:bg-gray-50"}`}
                    >
                      <Icon
                        className={`flex-shrink-0 -ml-1 mr-3 h-5 w-5 ${isActive ? "text-indigo-500" : "text-gray-400 group-hover:text-gray-500"}`}
                      />

                      <div>
                        <div className="font-medium">{item.name}</div>
                        <div className="text-xs text-gray-500">
                          {item.description}
                        </div>
                      </div>
                    </Link>
                  );
                })}

                {/* Two-Factor Sub-options */}
                {pathname.startsWith("/settings/2fa") && (
                  <div className="mt-4 ml-4 space-y-1">
                    {twoFactorOptions.map((item) => {
                      const isActive = pathname === item.href;
                      const Icon = item.icon;
                      return (
                        <Link
                          key={item.name}
                          href={item.href}
                          className={`group flex items-center px-3 py-2 text-sm font-medium rounded-md ${isActive ? "bg-indigo-50 border-indigo-200 text-indigo-700" : "text-gray-900 hover:text-gray-700 hover:bg-gray-50"}`}
                        >
                          <Icon
                            className={`flex-shrink-0 -ml-1 mr-3 h-4 w-4 ${isActive ? "text-indigo-500" : "text-gray-400 group-hover:text-gray-500"}`}
                          />

                          <div>
                            <div className="font-medium">{item.name}</div>
                            <div className="text-xs text-gray-500">
                              {item.description}
                            </div>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </nav>
            </aside>

            {/* Main content */}
            <div className="space-y-6 sm:px-6 lg:col-span-9">{children}</div>
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}
