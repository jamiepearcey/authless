"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { Button, PasswordSettingsCard } from "@ui/base";
import { Mail, Bell, Trash2, Globe, Lock, Eye, EyeOff } from "lucide-react";
import { t, useLocale } from "@i18n-core";
export default function AccountPage() {
  const { data: session } = useSession();

  // NEW: preferences state
  const { locale, switchLocale } = useLocale();
  const [timezone, setTimezone] = useState<string>("Europe/London");
  const [isProfilePublic, setIsProfilePublic] = useState<boolean>(false);
  const [showActivity, setShowActivity] = useState<boolean>(false);
  const [securityAlerts, setSecurityAlerts] = useState<boolean>(false);
  const [ marketingCommunications, setMarketingCommunications] = useState<boolean>(false);
  const handlePasswordChange = async () => {
    try {
      // TODO: Implement password change API
    } catch (error) {
      console.error(
        t(
          "Failed to change password:",
          "settings.account.page.handlePasswordChange.AccountPage.failed_to_change_password__2ah64s",
        ),
        error,
      );
    }
  };
  const handleDeleteAccount = async () => {
    if (
      !confirm(
        "Are you sure you want to delete your account? This action cannot be undone.",
      )
    ) {
      return;
    }
    try {
      // TODO: Implement account deletion API
      await new Promise((resolve) => setTimeout(resolve, 1000)); // Simulate API call

      // TODO: Redirect to home page and show success message
    } catch (error) {
      console.error("Failed to delete account:", error);
      // TODO: Show error message
    }
  };

  // Compact toggle matching your form styling
  const Toggle = ({
    checked,
    onChange,
    label,
    className,
  }: {
    checked: boolean;
    onChange: (v: boolean) => void;
    label: string;
    className?: string;
  }) => (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${className} ${checked ? "bg-indigo-600" : "bg-gray-200"}`}
    >
      <span
        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${checked ? "translate-x-5" : "translate-x-0"}`}
      />
      <span className="sr-only">{label}</span>
    </button>
  );
  return (
    <div className="space-y-6">
      {/* Email Settings */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <div className="flex items-center space-x-3 mb-6">
            <Mail className="h-6 w-6 text-indigo-600" />
            <h3 className="text-lg leading-6 font-medium text-gray-900">
              {t(
                "Email Settings",
                "settings.account.page.AccountPage.email_settings__27tr48",
              )}
            </h3>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                {t(
                  "Current Email",
                  "settings.account.page.AccountPage.current_email__29cjlw",
                )}
              </label>
              <p className="mt-1 text-sm text-gray-900">
                {session?.user?.email}
              </p>
              <p className="mt-1 text-sm text-gray-500">
                {t(
                  "Your email is verified and cannot be changed.",
                  "settings.account.page.AccountPage.your_email_is_verified_and_cannot_be_changed__23rjm8",
                )}
              </p>
            </div>

          </div>
        </div>
      </div>

      {/* Notification Settings */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <div className="flex items-center space-x-3 mb-6">
            <Bell className="h-6 w-6 text-indigo-600" />
            <h3 className="text-lg leading-6 font-medium text-gray-900">
              {t(
                "Notification Preferences",
                "settings.account.page.AccountPage.notification_preferences__1j89jg",
              )}
            </h3>
          </div>
          <div className="grid gap-6 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                
                    {t(
                      "Security alerts and account updates",
                      "settings.account.page.AccountPage.security_alerts_and_account_updates__umvh4l",
                    )}
              </label>
              <div className="mt-2 flex items-center gap-3">
                <Toggle
                  className="mr-2"
                  checked={securityAlerts}
                  onChange={setSecurityAlerts}
                  label={t(
                    "Security alerts",
                    "settings.account.page.AccountPage.security_alerts_and_account_updates__umvh4l",
                  )}
                />
                <span className="text-sm text-gray-700 inline-flex items-center gap-1">
                  {securityAlerts ? (
                    <>
                      {t(
                        "Allow security alerts",
                        "visibility.enabled__generic",
                      )}
                    </>
                  ) : (
                    <>
                      {t(
                        "Do not allow security alerts",
                        "visibility.disabled__generic",
                      )}
                    </>
                  )}
                </span>
              </div>
              <p className="mt-1 text-xs text-gray-500"></p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                {t(
                  "Marketing communications"
                )}
              </label>
              <div className="mt-2 flex items-center gap-3">
                <Toggle
                  className="mr-2"
                  checked={marketingCommunications}
                  onChange={setMarketingCommunications}
                  label={t(
                    "Account updates"
                  )}
                />
                <span className="text-sm text-gray-700 inline-flex items-center gap-1">
                  {marketingCommunications ? (
                    <>
                      {t(
                        "Allow account updates",
                        "visibility.enabled__generic",
                      )}
                    </>
                  ) : (
                    <>
                      {t(
                        "Do not allow account updates",
                        "visibility.disabled__generic",
                      )}
                    </>
                  )}
                </span>
              </div>
              <p className="mt-1 text-xs text-gray-500"></p>
            </div>
          </div>
        </div>
      </div>

      {/* NEW: Language & Region */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <div className="flex items-center space-x-3 mb-6">
            <Globe className="h-6 w-6 text-indigo-600" />
            <h3 className="text-lg leading-6 font-medium text-gray-900">
              {t(
                "Language & Region",
                "settings.page.Settings.customize_how_the_app_looks_and_feels__1ky92c",
              )}
            </h3>
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                {t(
                  "Language",
                  "settings.page.Settings.manage_your_account_preferences_and_language_settings__2f2fkj",
                )}
              </label>
              <select
                value={locale ?? "en"}
                onChange={(e) => switchLocale(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 bg-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2"
              >
                <option value="en">English</option>
                <option value="de">Deutsch</option>
                <option value="fr">Français</option>
              </select>
              <p className="mt-1 text-xs text-gray-500">
                {t(
                  "Choose your interface language.",
                  "settings.page.Settings.choose_how_you_want_to_be_notified_about_important_updates__2ewab0",
                )}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                {t(
                  "Timezone",
                  "settings.page.Settings.new_york_est_edt__2fpx5q",
                )}
              </label>
              <select
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 bg-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2"
              >
                <option value="Europe/London">Europe/London (BST/GMT)</option>
                <option value="Europe/Berlin">Europe/Berlin (CET/CEST)</option>
                <option value="America/New_York">
                  America/New_York (EST/EDT)
                </option>
                <option value="Asia/Tokyo">Asia/Tokyo (JST)</option>
              </select>
              <p className="mt-1 text-xs text-gray-500">
                {t(
                  "Used for dates and times across the app.",
                  "settings.page.Settings.british_pound__189t6p",
                )}
              </p>
            </div>
          </div>
        </div>
      </div>

      <PasswordSettingsCard
        onChangePassword={handlePasswordChange}
        minLength={8}
      />

      {/* NEW: Privacy */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <div className="flex items-center space-x-3 mb-6">
            <Lock className="h-6 w-6 text-indigo-600" />
            <h3 className="text-lg leading-6 font-medium text-gray-900">
              {t("Privacy", "privacy.section.header__generic")}
            </h3>
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                {t(
                  "Profile Visibility",
                  "settings.page.Settings.profile_visibility__1qfety",
                )}
              </label>
              <div className="mt-2 flex items-center gap-3">
                <Toggle
                  checked={isProfilePublic}
                  onChange={setIsProfilePublic}
                  label="Profile visibility"
                />
                <span className="text-sm text-gray-700 inline-flex items-center gap-1">
                  {isProfilePublic ? (
                    <>
                      <Eye className="h-4 w-4 text-gray-500" />{" "}
                      {t("Public", "visibility.public__generic")}
                    </>
                  ) : (
                    <>
                      <EyeOff className="h-4 w-4 text-gray-500" />{" "}
                      {t("Private", "visibility.private__generic")}
                    </>
                  )}
                </span>
              </div>
              <p className="mt-1 text-xs text-gray-500">
                {t(
                  "Control who can see your profile information.",
                  "settings.page.Settings.control_who_can_see_your_information_and_activity__i5v13r",
                )}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                {t(
                  "Show Activity",
                  "settings.page.Settings.display_recent_activity_on_your_public_profile__1footl",
                )}
              </label>
              <div className="mt-2 flex items-center gap-3">
                <Toggle
                  checked={showActivity}
                  onChange={setShowActivity}
                  label="Show activity"
                />
                <span className="text-sm text-gray-700">
                  {showActivity
                    ? t("On", "on__generic")
                    : t("Off", "off__generic")}
                </span>
              </div>
              <p className="mt-1 text-xs text-gray-500">
                {t(
                  "Display recent activity on your public profile.",
                  "settings.page.Settings.display_recent_activity_on_your_public_profile_footnote_1footl",
                )}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="bg-white shadow rounded-lg border border-red-200">
        <div className="px-4 py-5 sm:p-6">
          <div className="flex items-center space-x-3 mb-6">
            <Trash2 className="h-6 w-6 text-red-600" />
            <h3 className="text-lg leading-6 font-medium text-red-900">
              {t(
                "Danger Zone",
                "settings.account.page.AccountPage.danger_zone__1gdckz",
              )}
            </h3>
          </div>

          <div className="space-y-4">
            <p className="text-sm text-red-700">
              {t(
                "Once you delete your account, there is no going back. Please be certain.",
                "settings.account.page.AccountPage.once_you_delete_your_account_there_is_no_going_back_please_be_certain__1ip8a5",
              )}
            </p>

            <Button
              onClick={handleDeleteAccount}
              variant="outline"
              className="border-red-300 text-red-700 hover:bg-red-50"
            >
              Delete Account
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
