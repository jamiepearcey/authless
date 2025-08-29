"use client";

import { useState, useEffect } from "react";
import { useSession, signOut } from "next-auth/react";
import { Button, Input, Label, toast, Badge, AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@ui/base";
import { Mail, Bell, Trash2, Globe, Lock, Eye, EyeOff, Save } from "lucide-react";
import { t, useLocale } from "@i18n-core";
import { trpc } from "@/lib/trpc";

export default function AccountPage() {
  const { data: session } = useSession();
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  // NEW: preferences state
  const { locale, switchLocale } = useLocale();
  const [timezone, setTimezone] = useState<string>("UTC");
  const [isProfilePublic, setIsProfilePublic] = useState<boolean>(false);
  const [showActivity, setShowActivity] = useState<boolean>(false);
  const [securityAlerts, setSecurityAlerts] = useState<boolean>(true);
  const [marketingCommunications, setMarketingCommunications] = useState<boolean>(false);
  const [emailNotifications, setEmailNotifications] = useState<boolean>(true);
  const [activityUpdates, setActivityUpdates] = useState<boolean>(false);

  const deleteUser = trpc.deleteUser.useMutation({
    onSuccess: () => {
      toast.success("Account deleted successfully!");
      signOut({ callbackUrl: '/' });
    },
    onError: (error) => {
      toast.error(`Failed to delete account: ${error.message}`);
    },
  });
  // Password change state
  const [passwordData, setPasswordData] = useState({
    newPassword: "",
    confirmPassword: "",
  });
  const [showPasswordForm, setShowPasswordForm] = useState(false);

  // Get current user data
  const { data: userData, refetch: refetchUser } = trpc.getCurrentUser.useQuery(undefined, {
    enabled: !!session?.user?.id,
  });

  // Update user mutation
  const updateUser = trpc.updateUser.useMutation({
    onSuccess: () => {
      toast.success("Account settings updated successfully!");
      refetchUser();
    },
    onError: (error) => {
      toast.error(`Failed to update settings: ${error.message}`);
    },
  });

  // Change password mutation
  const changePassword = trpc.changePassword.useMutation({
    onSuccess: () => {
      toast.success("Password changed successfully!");
      setPasswordData({ newPassword: "", confirmPassword: "" });
      setShowPasswordForm(false);
    },
    onError: (error) => {
      toast.error(`Failed to change password: ${error.message}`);
    },
  });

  // Initialize form data when user data loads
  useEffect(() => {
    if (userData) {
      setTimezone(userData.timezone || "UTC");
      setEmailNotifications(userData.emailNotifications ?? true);
      setMarketingCommunications(userData.marketingEmails ?? false);
      setSecurityAlerts(userData.securityAlerts ?? true);
      setActivityUpdates(userData.activityUpdates ?? false);
    }
  }, [userData]);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session?.user?.id) return;

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error("New passwords do not match");
      return;
    }

    if (passwordData.newPassword.length < 8) {
      toast.error("Password must be at least 8 characters long");
      return;
    }

    setIsChangingPassword(true);
    try {
      await changePassword.mutateAsync({
        id: session.user.id,
        currentPassword: "", // Empty string since we removed the requirement
        newPassword: passwordData.newPassword,
      });
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleSavePreferences = async () => {
    if (!session?.user?.id) return;

    try {
      await updateUser.mutateAsync({
        id: session.user.id,
        timezone,
        emailNotifications,
        marketingEmails: marketingCommunications,
        securityAlerts,
        activityUpdates,
      });
    } catch (error) {
      // Error is handled by the mutation
    }
  };

  const handleDeleteAccount = async () => {
    if (!session?.user?.id) return;
    await deleteUser.mutateAsync({
      id: session?.user?.id,
    });
    setIsDeletingAccount(true);
    try {
      signOut({ callbackUrl: '/' });
    } catch (error) {
      console.error("Failed to delete account:", error);
      toast.error("Failed to delete account. Please try again.");
    } finally {
      setIsDeletingAccount(false);
      setShowDeleteDialog(false);
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

  if (!session?.user?.id) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Email Settings */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <div className="flex items-center space-x-3 mb-6">
            <Mail className="h-6 w-6 text-indigo-600" />
            <h3 className="text-lg leading-6 font-medium text-gray-900">
              Email Settings
            </h3>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-900">Email Address</p>
                <p className="text-sm text-gray-500">{session.user.email}</p>
              </div>
              <Badge variant="outline">Verified</Badge>
            </div>
          </div>
        </div>
      </div>

      {/* Password Settings */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <div className="flex items-center space-x-3 mb-6">
            <Lock className="h-6 w-6 text-indigo-600" />
            <h3 className="text-lg leading-6 font-medium text-gray-900">
              Password Settings
            </h3>
          </div>
          
          {!showPasswordForm ? (
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-900">Password</p>
                <p className="text-sm text-gray-500">Last changed: Never</p>
              </div>
              <Button onClick={() => setShowPasswordForm(true)} variant="outline">
                Change Password
              </Button>
            </div>
          ) : (
            <form onSubmit={handlePasswordChange} className="space-y-4">
              <div>
                <Label htmlFor="newPassword" className="block text-sm font-medium text-gray-700">
                  New Password
                </Label>
                <Input
                  id="newPassword"
                  type="password"
                  value={passwordData.newPassword}
                  onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                  className="mt-1"
                  required
                  minLength={8}
                  placeholder="Enter your new password"
                />
                <p className="text-xs text-gray-500 mt-1">Must be at least 8 characters</p>
              </div>
              
              <div>
                <Label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                  Confirm New Password
                </Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={passwordData.confirmPassword}
                  onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                  className="mt-1"
                  required
                  placeholder="Confirm your new password"
                />
              </div>
              
              <div className="flex items-center space-x-3">
                <Button
                  type="submit"
                  disabled={isChangingPassword}
                  className="flex items-center space-x-2"
                >
                  {isChangingPassword ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                      <span>Changing...</span>
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                      <span>Change Password</span>
                    </>
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowPasswordForm(false);
                    setPasswordData({ newPassword: "", confirmPassword: "" });
                  }}
                >
                  Cancel
                </Button>
              </div>
            </form>
          )}
        </div>
      </div>

      {/* Notification Preferences */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <div className="flex items-center space-x-3 mb-6">
            <Bell className="h-6 w-6 text-indigo-600" />
            <h3 className="text-lg leading-6 font-medium text-gray-900">
              Notification Preferences
            </h3>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-900">Email Notifications</p>
                <p className="text-sm text-gray-500">Receive notifications via email</p>
              </div>
              <Toggle
                checked={emailNotifications}
                onChange={setEmailNotifications}
                label="Email Notifications"
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-900">Security Alerts</p>
                <p className="text-sm text-gray-500">Important security notifications</p>
              </div>
              <Toggle
                checked={securityAlerts}
                onChange={setSecurityAlerts}
                label="Security Alerts"
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-900">Activity Updates</p>
                <p className="text-sm text-gray-500">Updates about your account activity</p>
              </div>
              <Toggle
                checked={activityUpdates}
                onChange={setActivityUpdates}
                label="Activity Updates"
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-900">Marketing Communications</p>
                <p className="text-sm text-gray-500">Product updates and promotional content</p>
              </div>
              <Toggle
                checked={marketingCommunications}
                onChange={setMarketingCommunications}
                label="Marketing Communications"
              />
            </div>
          </div>
          
          <div className="mt-6 flex justify-end">
            <Button onClick={handleSavePreferences} disabled={updateUser.isPending}>
              {updateUser.isPending ? "Saving..." : "Save Preferences"}
            </Button>
          </div>
        </div>
      </div>

      {/* Language & Region */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <div className="flex items-center space-x-3 mb-6">
            <Globe className="h-6 w-6 text-indigo-600" />
            <h3 className="text-lg leading-6 font-medium text-gray-900">
              Language & Region
            </h3>
          </div>
          
          <div className="grid gap-6 sm:grid-cols-2">
            <div>
              <Label htmlFor="language" className="block text-sm font-medium text-gray-700">
                Language
              </Label>
              <select
                id="language"
                value={locale ?? "en"}
                onChange={(e) => switchLocale(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 bg-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2"
              >
                <option value="en">English</option>
                <option value="de">Deutsch</option>
                <option value="fr">Français</option>
                <option value="es">Español</option>
                <option value="ja">日本語</option>
                <option value="zh">中文</option>
              </select>
              <p className="mt-1 text-xs text-gray-500">
                Choose your interface language.
              </p>
            </div>

            <div>
              <Label htmlFor="timezone" className="block text-sm font-medium text-gray-700">
                Timezone
              </Label>
              <select
                id="timezone"
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 bg-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2"
              >
                <option value="UTC">UTC</option>
                <option value="Europe/London">Europe/London (BST/GMT)</option>
                <option value="Europe/Berlin">Europe/Berlin (CET/CEST)</option>
                <option value="America/New_York">America/New_York (EST/EDT)</option>
                <option value="America/Los_Angeles">America/Los_Angeles (PST/PDT)</option>
                <option value="Asia/Tokyo">Asia/Tokyo (JST)</option>
                <option value="Australia/Sydney">Australia/Sydney (AEST/AEDT)</option>
              </select>
              <p className="mt-1 text-xs text-gray-500">
                Used for dates and times across the app.
              </p>
            </div>
          </div>
          
          <div className="mt-6 flex justify-end">
            <Button onClick={handleSavePreferences} disabled={updateUser.isPending}>
              {updateUser.isPending ? "Saving..." : "Save Preferences"}
            </Button>
          </div>
        </div>
      </div>

      {/* Account Deletion */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <div className="flex items-center space-x-3 mb-6">
            <Trash2 className="h-6 w-6 text-red-600" />
            <h3 className="text-lg leading-6 font-medium text-red-900">
              Delete Account
            </h3>
          </div>
          
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Once you delete your account, there is no going back. Please be certain.
            </p>
            
            <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
              <AlertDialogTrigger asChild>
                <Button variant="destructive">
                  Delete Account
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete your account
                    and remove all your data from our servers.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDeleteAccount}
                    disabled={isDeletingAccount}
                    className="bg-red-600 hover:bg-red-700 focus:ring-red-500"
                  >
                    {isDeletingAccount ? "Deleting..." : "Yes, delete my account"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </div>
    </div>
  );
}
