"use client";

import { useState, useEffect } from "react";
import { useSession, signOut } from "next-auth/react";
import { Button, Input, Label, toast, Badge, AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@ui/base";
import { Mail, Bell, Trash2, Globe, Lock, Save, MapPin, Clock, Eye, EyeOff, User, Shield, CheckCircle, Edit3, Camera, Upload, Key } from "lucide-react";
import { useLocale, t } from "@i18n-core";
import { trpc } from "@/lib/trpc";
import { ProfilePhotoUploadDialog } from "@/components/ProfilePhotoUploadDialog";

export default function AccountPage() {
  const { data: session } = useSession();
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  // NEW: preferences state
  const { locale, switchLocale } = useLocale();
  const [timezone, setTimezone] = useState<string>("UTC");
  // Removed unused state variables
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

  // Get 2FA status
  const { data: twoFactorStatus } = trpc.getTwoFactorStatus.useQuery();

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

  // Update profile photo mutation
  const updateProfilePhoto = trpc.updateProfilePhoto.useMutation({
    onSuccess: (updatedUser) => {
      // Update session with new image
      update({
        ...session,
        user: {
          ...session?.user,
          email: updatedUser.email,
          image: updatedUser.image,
        },
      });
      toast.success("Profile photo updated successfully!");
    },
    onError: (error) => {
      toast.error(`Failed to update profile photo: ${error.message}`);
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

  const handleProfilePhotoUpload = async (imageFile: File) => {
    if (!session?.user?.id) return;
    
    await updateProfilePhoto.mutateAsync({
      userId: session.user.id,
      imageFile,
    });
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
      {/* Profile Overview */}
      <div className="bg-white shadow-lg rounded-xl border border-gray-200">
        <div className="px-6 py-8 sm:p-8">
          <div className="flex items-start space-x-6">
            {/* Avatar Section with Upload */}
            <div className="flex-shrink-0">
              <div className="relative">
                <div className="w-20 h-20 rounded-full overflow-hidden bg-gray-100 border-4 border-white shadow-lg">
                  {session?.user?.image ? (
                    <img 
                      src={session.user.image} 
                      alt="Profile" 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-indigo-500 flex items-center justify-center">
                      <User className="h-10 w-10 text-white" />
                    </div>
                  )}
                </div>
                
                <ProfilePhotoUploadDialog
                  currentImageUrl={session?.user?.image}
                  onImageUpload={handleProfilePhotoUpload}
                  trigger={
                    <button
                      type="button"
                      className="absolute -bottom-1 -right-1 bg-indigo-600 text-white p-2 rounded-full hover:bg-indigo-700 transition-colors shadow-lg"
                    >
                      <Camera className="h-4 w-4" />
                    </button>
                  }
                />
              </div>
            </div>
            
            {/* Profile Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-3 mb-2">
                <h2 className="text-2xl font-bold text-gray-900 truncate">
                  {session.user.name || 'User Account'}
                </h2>
                <Badge className="bg-green-100 text-green-800 border-green-200">
                  <Shield className="h-3 w-3 mr-1" />
                  Verified
                </Badge>
              </div>
              
              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <Mail className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">{session.user.email}</p>
                    <p className="text-xs text-gray-500">Primary email address</p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3">
                  <Shield className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">Account Security</p>
                    <p className="text-xs text-gray-500">Password protected • 2FA available</p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3">
                  <Globe className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">Member since</p>
                    <p className="text-xs text-gray-500">January 2024</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Account Info */}
          <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Mail className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Email Address</p>
                  <p className="text-xs text-gray-500">{session.user.email}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
              <div className="flex items-center space-x-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  twoFactorStatus?.hasPasskeys || twoFactorStatus?.hasAuthenticatorCodes 
                    ? 'bg-green-100' 
                    : 'bg-red-100'
                }`}>
                  <Key className={`h-5 w-5 ${
                    twoFactorStatus?.hasPasskeys || twoFactorStatus?.hasAuthenticatorCodes 
                      ? 'text-green-600' 
                      : 'text-red-600'
                  }`} />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Two-Factor Auth</p>
                  <p className={`text-xs ${
                    twoFactorStatus?.hasPasskeys || twoFactorStatus?.hasAuthenticatorCodes 
                      ? 'text-green-600' 
                      : 'text-red-600'
                  }`}>
                    {twoFactorStatus?.hasPasskeys || twoFactorStatus?.hasAuthenticatorCodes 
                      ? 'Enabled' 
                      : 'Not enabled'}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                  <Globe className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Account Type</p>
                  <p className="text-xs text-gray-500">Standard User</p>
                </div>
              </div>
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
          
          {/* Animated container with smooth expand/collapse */}
          <div className="overflow-hidden transition-all duration-500 ease-in-out">
            {/* Landing state - always present */}
            <div 
              className={`transition-[opacity,transform,max-height] duration-500 ease-in-out ${
                showPasswordForm 
                  ? 'opacity-0 transform -translate-y-4 max-h-0' 
                  : 'opacity-100 transform translate-y-0 max-h-32'
              }`}
            >
              <div 
                className="flex items-center justify-between p-6 bg-gradient-to-r from-slate-50 to-slate-100 border-2 border-slate-200 rounded-xl cursor-pointer hover:border-slate-200"
                onClick={() => setShowPasswordForm(true)}
              >
                <div className="flex items-center space-x-6">
                  {/* Stylized asterisk display */}
                  <div className="flex items-center justify-center w-16 h-16 bg-white rounded-full border-2 border-slate-200">
                    <div className="flex items-center space-x-1">
                      <span className="text-indigo-600 text-lg font-bold tracking-wider">••••••</span>
                    </div>
                  </div>
                  <div>
                    <p className="text-base font-semibold text-gray-900">Password Protected</p>
                    <p className="text-sm text-gray-500 flex items-center space-x-1">
                      <Shield className="h-3 w-3" />
                      <span>Click to change your password</span>
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2 text-indigo-600">
                  <Edit3 className="h-5 w-5" />
                  <span className="text-sm font-medium">Change</span>
                </div>
              </div>
            </div>

            {/* Form state - slides in from below */}
            <div 
              className={`transition-[opacity,transform,max-height] duration-500 ease-in-out ${
                showPasswordForm 
                  ? 'opacity-100 transform translate-y-0 max-h-96' 
                  : 'opacity-0 transform translate-y-4 max-h-0'
              }`}
            >
              <div className="pt-4">
                <form onSubmit={handlePasswordChange} className="space-y-4 p-6 bg-gradient-to-r from-indigo-50 to-blue-50 border-2 border-indigo-200 rounded-xl">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="newPassword" className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                        <Key className="h-4 w-4 text-indigo-600" />
                        New Password
                      </Label>
                      <Input
                        id="newPassword"
                        type="password"
                        value={passwordData.newPassword}
                        onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                        className="h-11 border-indigo-200 focus:border-indigo-400 focus:ring-indigo-400"
                        required
                        minLength={8}
                        placeholder="Enter your new password"
                        autoFocus
                      />
                      <p className="text-xs text-gray-500 mt-1">Must be at least 8 characters</p>
                    </div>
                    
                    <div>
                      <Label htmlFor="confirmPassword" className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                        <CheckCircle className="h-4 w-4 text-indigo-600" />
                        Confirm Password
                      </Label>
                      <Input
                        id="confirmPassword"
                        type="password"
                        value={passwordData.confirmPassword}
                        onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                        className="h-11 border-indigo-200 focus:border-indigo-400 focus:ring-indigo-400"
                        required
                        placeholder="Confirm your new password"
                      />
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-end space-x-3 pt-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setShowPasswordForm(false);
                        setPasswordData({ newPassword: "", confirmPassword: "" });
                      }}
                      className="border-slate-300 text-slate-600 hover:bg-slate-50"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={isChangingPassword}
                      className="bg-indigo-600 hover:bg-indigo-700 flex items-center space-x-2"
                    >
                      {isChangingPassword ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                          <span>Saving...</span>
                        </>
                      ) : (
                        <>
                          <Save className="h-4 w-4" />
                          <span>Save Password</span>
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          </div>
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
                onChange={(checked) => {
                  setEmailNotifications(checked);
                  // Auto-save notification preferences
                  if (session?.user?.id) {
                    updateUser.mutateAsync({
                      id: session.user.id,
                      timezone,
                      emailNotifications: checked,
                      marketingEmails: marketingCommunications,
                      securityAlerts,
                      activityUpdates,
                    });
                  }
                }}
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
                onChange={(checked) => {
                  setSecurityAlerts(checked);
                  // Auto-save notification preferences
                  if (session?.user?.id) {
                    updateUser.mutateAsync({
                      id: session.user.id,
                      timezone,
                      emailNotifications,
                      marketingEmails: marketingCommunications,
                      securityAlerts: checked,
                      activityUpdates,
                    });
                  }
                }}
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
                onChange={(checked) => {
                  setActivityUpdates(checked);
                  // Auto-save notification preferences
                  if (session?.user?.id) {
                    updateUser.mutateAsync({
                      id: session.user.id,
                      timezone,
                      emailNotifications,
                      marketingEmails: marketingCommunications,
                      securityAlerts,
                      activityUpdates: checked,
                    });
                  }
                }}
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
                onChange={(checked) => {
                  setMarketingCommunications(checked);
                  // Auto-save notification preferences
                  if (session?.user?.id) {
                    updateUser.mutateAsync({
                      id: session.user.id,
                      timezone,
                      emailNotifications,
                      marketingEmails: checked,
                      securityAlerts,
                      activityUpdates,
                    });
                  }
                }}
                label="Marketing Communications"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Language & Region */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <div className="flex items-center space-x-3 mb-6">
            <Globe className="h-6 w-6 text-indigo-600" />
            <h3 className="text-lg leading-6 font-medium text-gray-900">
              {t("Language & Region", "settings.account.page.AccountPage.language_region__1abcde")}
            </h3>
          </div>
          
          <div className="grid gap-6 sm:grid-cols-2">
            <div className="space-y-3">
              <Label htmlFor="language" className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <Globe className="h-4 w-4 text-indigo-600" />
                {t("Language", "settings.account.page.AccountPage.language__2abcde")}
              </Label>
              <Select value={locale ?? "en"} onValueChange={(value) => switchLocale(value)}>
                <SelectTrigger className="w-full h-12 border-2 border-slate-200 focus:border-indigo-400 focus:ring-indigo-400 hover:border-slate-300 transition-all duration-200 bg-gradient-to-r from-slate-50 to-white">
                  <div className="flex items-center gap-3 py-1">
                    <span className="text-xl">
                      {locale === "en" ? "🇺🇸" : 
                       locale === "de" ? "🇩🇪" : 
                       locale === "fr" ? "🇫🇷" : 
                       locale === "es" ? "🇪🇸" : 
                       locale === "ja" ? "🇯🇵" : "🇺🇸"}
                    </span>
                    <div className="text-left">
                      <span className="font-medium">
                        {locale === "en" ? t("English", "settings.account.page.AccountPage.english__4abcde") :
                         locale === "de" ? t("Deutsch", "settings.account.page.AccountPage.deutsch__5abcde") :
                         locale === "fr" ? t("Français", "settings.account.page.AccountPage.francais__6abcde") :
                         locale === "es" ? t("Español", "settings.account.page.AccountPage.espanol__7abcde") :
                         locale === "ja" ? t("日本語", "settings.account.page.AccountPage.japanese__12abcde") :
                         t("English", "settings.account.page.AccountPage.english__4abcde")}
                      </span>
                      <span className="text-xs text-gray-500 block">
                        {locale === "en" ? t("United States", "settings.account.page.AccountPage.united_states__8abcde") :
                         locale === "de" ? t("Germany", "settings.account.page.AccountPage.germany__9abcde") :
                         locale === "fr" ? t("France", "settings.account.page.AccountPage.france__10abcde") :
                         locale === "es" ? t("Spain", "settings.account.page.AccountPage.spain__11abcde") :
                         locale === "ja" ? t("Japan", "settings.account.page.AccountPage.japan__13abcde") :
                         t("United States", "settings.account.page.AccountPage.united_states__8abcde")}
                      </span>
                    </div>
                  </div>
                </SelectTrigger>
                <SelectContent className="max-h-60 overflow-y-auto">
                  <SelectItem value="en" className="hover:bg-indigo-50 cursor-pointer">
                    <div className="flex items-center gap-3 py-1">
                      <span className="text-xl">🇺🇸</span>
                      <div>
                        <span className="font-medium">{t("English", "settings.account.page.AccountPage.english__4abcde")}</span>
                        <span className="text-xs text-gray-500 block">{t("United States", "settings.account.page.AccountPage.united_states__8abcde")}</span>
                      </div>
                    </div>
                  </SelectItem>
                  <SelectItem value="de" className="hover:bg-indigo-50 cursor-pointer">
                    <div className="flex items-center gap-3 py-1">
                      <span className="text-xl">🇩🇪</span>
                      <div>
                        <span className="font-medium">{t("Deutsch", "settings.account.page.AccountPage.deutsch__5abcde")}</span>
                        <span className="text-xs text-gray-500 block">{t("Germany", "settings.account.page.AccountPage.germany__9abcde")}</span>
                      </div>
                    </div>
                  </SelectItem>
                  <SelectItem value="fr" className="hover:bg-indigo-50 cursor-pointer">
                    <div className="flex items-center gap-3 py-1">
                      <span className="text-xl">🇫🇷</span>
                      <div>
                        <span className="font-medium">{t("Français", "settings.account.page.AccountPage.francais__6abcde")}</span>
                        <span className="text-xs text-gray-500 block">{t("France", "settings.account.page.AccountPage.france__10abcde")}</span>
                      </div>
                    </div>
                  </SelectItem>
                  <SelectItem value="es" className="hover:bg-indigo-50 cursor-pointer">
                    <div className="flex items-center gap-3 py-1">
                      <span className="text-xl">🇪🇸</span>
                      <div>
                        <span className="font-medium">{t("Español", "settings.account.page.AccountPage.espanol__7abcde")}</span>
                        <span className="text-xs text-gray-500 block">{t("Spain", "settings.account.page.AccountPage.spain__11abcde")}</span>
                      </div>
                    </div>
                  </SelectItem>
                  <SelectItem value="ja" className="hover:bg-indigo-50 cursor-pointer">
                    <div className="flex items-center gap-3 py-1">
                      <span className="text-xl">🇯🇵</span>
                      <div>
                        <span className="font-medium">{t("日本語", "settings.account.page.AccountPage.japanese__12abcde")}</span>
                        <span className="text-xs text-gray-500 block">{t("Japan", "settings.account.page.AccountPage.japan__13abcde")}</span>
                      </div>
                    </div>
                  </SelectItem>
                  <SelectItem value="zh" className="hover:bg-indigo-50 cursor-pointer">
                    <div className="flex items-center gap-3 py-1">
                      <span className="text-xl">🇨🇳</span>
                      <div>
                        <span className="font-medium">{t("中文", "settings.account.page.AccountPage.chinese__14abcde")}</span>
                        <span className="text-xs text-gray-500 block">{t("China", "settings.account.page.AccountPage.china__15abcde")}</span>
                      </div>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
              <div className="flex items-center space-x-2 text-xs">
                <CheckCircle className="h-3 w-3 text-green-600" />
                <span className="text-green-600 font-medium">{t("Changes apply immediately", "settings.account.page.AccountPage.changes_apply_immediately__16abcde")}</span>
              </div>
            </div>

            <div className="space-y-3">
              <Label htmlFor="timezone" className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <Clock className="h-4 w-4 text-indigo-600" />
                {t("Timezone", "settings.account.page.AccountPage.timezone__18abcde")}
              </Label>
              <Select value={timezone} onValueChange={(value) => {
                setTimezone(value);
                // Auto-save timezone preference
                if (session?.user?.id) {
                  updateUser.mutateAsync({
                    id: session.user.id,
                    timezone: value,
                    emailNotifications,
                    marketingEmails: marketingCommunications,
                    securityAlerts,
                    activityUpdates,
                  });
                }
              }}>
                <SelectTrigger className="w-full h-12 border-2 border-slate-200 focus:border-indigo-400 focus:ring-indigo-400 hover:border-slate-300 transition-all duration-200 bg-gradient-to-r from-slate-50 to-white">
                  <SelectValue placeholder={t("Select timezone", "settings.account.page.AccountPage.select_timezone__17abcde")} />
                </SelectTrigger>
                <SelectContent className="max-h-60 overflow-y-auto">
                  <SelectItem value="UTC" className="hover:bg-indigo-50 cursor-pointer">
                    <div className="flex items-center gap-3 py-1">
                      <MapPin className="h-4 w-4 text-gray-400" />
                      <div>
                        <span className="font-medium">UTC</span>
                        <span className="text-xs text-gray-500 block">Coordinated Universal Time</span>
                      </div>
                    </div>
                  </SelectItem>
                  <SelectItem value="Europe/London" className="hover:bg-indigo-50 cursor-pointer">
                    <div className="flex items-center gap-3 py-1">
                      <span className="text-xl">🇬🇧</span>
                      <div>
                        <span className="font-medium">London</span>
                        <span className="text-xs text-gray-500 block">GMT/BST</span>
                      </div>
                    </div>
                  </SelectItem>
                  <SelectItem value="Europe/Berlin" className="hover:bg-indigo-50 cursor-pointer">
                    <div className="flex items-center gap-3 py-1">
                      <span className="text-xl">🇩🇪</span>
                      <div>
                        <span className="font-medium">Berlin</span>
                        <span className="text-xs text-gray-500 block">CET/CEST</span>
                      </div>
                    </div>
                  </SelectItem>
                  <SelectItem value="America/New_York" className="hover:bg-indigo-50 cursor-pointer">
                    <div className="flex items-center gap-3 py-1">
                      <span className="text-xl">🇺🇸</span>
                      <div>
                        <span className="font-medium">New York</span>
                        <span className="text-xs text-gray-500 block">EST/EDT</span>
                      </div>
                    </div>
                  </SelectItem>
                  <SelectItem value="America/Los_Angeles" className="hover:bg-indigo-50 cursor-pointer">
                    <div className="flex items-center gap-3 py-1">
                      <span className="text-xl">🇺🇸</span>
                      <div>
                        <span className="font-medium">Los Angeles</span>
                        <span className="text-xs text-gray-500 block">PST/PDT</span>
                      </div>
                    </div>
                  </SelectItem>
                  <SelectItem value="Asia/Tokyo" className="hover:bg-indigo-50 cursor-pointer">
                    <div className="flex items-center gap-3 py-1">
                      <span className="text-xl">🇯🇵</span>
                      <div>
                        <span className="font-medium">Tokyo</span>
                        <span className="text-xs text-gray-500 block">JST</span>
                      </div>
                    </div>
                  </SelectItem>
                  <SelectItem value="Australia/Sydney" className="hover:bg-indigo-50 cursor-pointer">
                    <div className="flex items-center gap-3 py-1">
                      <span className="text-xl">🇦🇺</span>
                      <div>
                        <span className="font-medium">Sydney</span>
                        <span className="text-xs text-gray-500 block">AEST/AEDT</span>
                      </div>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
              <div className="flex items-center space-x-2 text-xs">
                <CheckCircle className="h-3 w-3 text-green-600" />
                <span className="text-green-600 font-medium">Saves automatically</span>
              </div>
            </div>
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
