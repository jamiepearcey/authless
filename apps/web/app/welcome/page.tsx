"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@ui/base";
import {
  Shield,
  User,
  Settings,
  CheckCircle,
  ArrowRight,
  Star,
  Zap,
  Heart,
  QrCode,
  Key,
  MessageCircle,
} from "lucide-react";
import Link from "next/link";
import { t } from "@i18n-core";
export default function WelcomePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  // Redirect if not authenticated
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/signin");
    }
  }, [status, router]);

  // Auto-advance steps
  useEffect(() => {
    if (status === "authenticated" && currentStep < 3) {
      const timer = setTimeout(() => {
        setCurrentStep((prev) => prev + 1);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [currentStep, status]);
  const handleCompleteSetup = async () => {
    setIsLoading(true);
    try {
      // TODO: Mark user as having completed onboarding
      await new Promise((resolve) => setTimeout(resolve, 1000)); // Simulate API call
      router.push("/settings");
    } catch (error) {
      console.error("Failed to complete setup:", error);
    } finally {
      setIsLoading(false);
    }
  };
  const handleSkipSetup = () => {
    router.push("/");
  };
  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 to-blue-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }
  if (status === "unauthenticated") {
    return null; // Will redirect
  }
  const steps = [
    {
      icon: CheckCircle,
      title: t(
        "Welcome to Authless!",
        "welcome.page.steps.WelcomePage.welcome_to_authless__1lzug0",
      ),
      description: t(
        "Your account has been successfully created and verified. Let's get you set up for the best experience.",
        "welcome.page.steps.WelcomePage.your_account_has_been_successfully_created_and_verified_let_s_get_you_set_up_for_the_best_experience__j520wy",
      ),
      color: "text-green-600",
      bgColor: "bg-green-100",
    },
    {
      icon: Shield,
      title: t(
        "Secure Your Account",
        "welcome.page.steps.WelcomePage.secure_your_account__10vkum",
      ),
      description: t(
        "Set up two-factor authentication to add an extra layer of security to your account.",
        "welcome.page.steps.WelcomePage.set_up_two_factor_authentication_to_add_an_extra_layer_of_security_to_your_account__17ew11",
      ),
      color: "text-blue-600",
      bgColor: "bg-blue-100",
    },
    {
      icon: User,
      title: t(
        "Complete Your Profile",
        "welcome.page.steps.WelcomePage.complete_your_profile__184y3y",
      ),
      description: t(
        "Add your personal information and preferences to personalize your experience.",
        "welcome.page.steps.WelcomePage.add_your_personal_information_and_preferences_to_personalize_your_experience__1vz45r",
      ),
      color: "text-purple-600",
      bgColor: "bg-purple-100",
    },
    {
      icon: Settings,
      title: "Customize Settings",
      description: t(
        "Configure your notification preferences and account settings.",
        "welcome.page.steps.WelcomePage.configure_your_notification_preferences_and_account_settings__bl9heq",
      ),
      color: "text-indigo-600",
      bgColor: "bg-indigo-100",
    },
  ];
  const currentStepData = steps[currentStep];
  const Icon = currentStepData.icon;
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-blue-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white rounded-full shadow-lg mb-6">
            <Star className="h-8 w-8 text-indigo-600" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Welcome, {session?.user?.name || "User"}!
          </h1>
          <p className="text-xl text-gray-600">
            {t(
              "Let's get your account set up for the best experience",
              "welcome.page.WelcomePage.let_s_get_your_account_set_up_for_the_best_experience__1sfezz",
            )}
          </p>
        </div>

        {/* Progress Bar */}
        <div className="mb-12">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-medium text-gray-700">
              Step {currentStep + 1} of {steps.length}
            </span>
            <span className="text-sm text-gray-500">
              {Math.round(((currentStep + 1) / steps.length) * 100)}% Complete
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-indigo-600 h-2 rounded-full transition-all duration-500 ease-out"
              style={{
                width: `${((currentStep + 1) / steps.length) * 100}%`,
              }}
            ></div>
          </div>
        </div>

        {/* Current Step */}
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-8">
          <div className="text-center">
            <div
              className={`inline-flex items-center justify-center w-20 h-20 ${currentStepData.bgColor} rounded-full mb-6`}
            >
              <Icon className={`h-10 w-10 ${currentStepData.color}`} />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              {currentStepData.title}
            </h2>
            <p className="text-lg text-gray-600 mb-8 max-w-2xl mx-auto">
              {currentStepData.description}
            </p>

            {/* Step-specific content */}
            {currentStep === 1 && (
              <div className="space-y-4 mb-8">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center p-4 border border-gray-200 rounded-lg">
                    <QrCode className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                    <h4 className="font-medium text-gray-900">
                      Authenticator App
                    </h4>
                    <p className="text-sm text-gray-600">
                      {t(
                        "Use apps like Google Authenticator",
                        "settings.layout.twoFactorOptions.SettingsLayout.use_apps_like_google_authenticator__26swsc",
                      )}
                    </p>
                  </div>
                  <div className="text-center p-4 border border-gray-200 rounded-lg">
                    <Key className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                    <h4 className="font-medium text-gray-900">Passkey</h4>
                    <p className="text-sm text-gray-600">
                      Biometric authentication
                    </p>
                  </div>
                  <div className="text-center p-4 border border-gray-200 rounded-lg">
                    <MessageCircle className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                    <h4 className="font-medium text-gray-900">WhatsApp</h4>
                    <p className="text-sm text-gray-600">
                      {t(
                        "Receive codes via WhatsApp",
                        "settings.layout.twoFactorOptions.SettingsLayout.receive_codes_via_whatsapp__crlcf2",
                      )}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {currentStep === 2 && (
              <div className="space-y-4 mb-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="text-center p-4 border border-gray-200 rounded-lg">
                    <User className="h-8 w-8 text-purple-600 mx-auto mb-2" />
                    <h4 className="font-medium text-gray-900">Personal Info</h4>
                    <p className="text-sm text-gray-600">
                      {t(
                        "Name, bio, location",
                        "welcome.page.WelcomePage.name_bio_location__22d2gr",
                      )}
                    </p>
                  </div>
                  <div className="text-center p-4 border border-gray-200 rounded-lg">
                    <Zap className="h-8 w-8 text-purple-600 mx-auto mb-2" />
                    <h4 className="font-medium text-gray-900">Preferences</h4>
                    <p className="text-sm text-gray-600">
                      Notifications, privacy
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center justify-center space-x-4">
              {currentStep < steps.length - 1 ? (
                <>
                  <Button
                    onClick={() => setCurrentStep((prev) => prev + 1)}
                    className="flex items-center space-x-2"
                  >
                    <span>Next Step</span>
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                  <Button onClick={handleSkipSetup} variant="outline">
                    Skip Setup
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    onClick={handleCompleteSetup}
                    disabled={isLoading}
                    className="flex items-center space-x-2"
                  >
                    <span>
                      {isLoading ? "Completing..." : "Complete Setup"}
                    </span>
                    <CheckCircle className="h-4 w-4" />
                  </Button>
                  <Button onClick={handleSkipSetup} variant="outline">
                    {t(
                      "Skip for Now",
                      "welcome.page.WelcomePage.skip_for_now__1szxbb",
                    )}
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Link href="/settings/2fa">
            <div className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow cursor-pointer">
              <div className="flex items-center space-x-3 mb-3">
                <Shield className="h-6 w-6 text-blue-600" />
                <h3 className="font-semibold text-gray-900">Security</h3>
              </div>
              <p className="text-sm text-gray-600">
                {t(
                  "Set up two-factor authentication and security preferences",
                  "welcome.page.WelcomePage.set_up_two_factor_authentication_and_security_preferences__15qc3y",
                )}
              </p>
            </div>
          </Link>

          <Link href="/settings/profile">
            <div className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow cursor-pointer">
              <div className="flex items-center space-x-3 mb-3">
                <User className="h-6 w-6 text-purple-600" />
                <h3 className="font-semibold text-gray-900">Profile</h3>
              </div>
              <p className="text-sm text-gray-600">
                {t(
                  "Complete your profile and personal information",
                  "welcome.page.WelcomePage.complete_your_profile_and_personal_information__uzb2h3",
                )}
              </p>
            </div>
          </Link>

          <Link href="/">
            <div className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow cursor-pointer">
              <div className="flex items-center space-x-3 mb-3">
                <Heart className="h-6 w-6 text-red-600" />
                <h3 className="font-semibold text-gray-900">Get Started</h3>
              </div>
              <p className="text-sm text-gray-600">
                {t(
                  "Explore the platform and start using the features",
                  "welcome.page.WelcomePage.explore_the_platform_and_start_using_the_features__dkktef",
                )}
              </p>
            </div>
          </Link>
        </div>

        {/* Footer */}
        <div className="text-center mt-12">
          <p className="text-sm text-gray-500">
            {t(
              "You can always access these settings later from your account menu",
              "welcome.page.WelcomePage.you_can_always_access_these_settings_later_from_your_account_menu__1w9e2t",
            )}
          </p>
        </div>
      </div>
    </div>
  );
}
