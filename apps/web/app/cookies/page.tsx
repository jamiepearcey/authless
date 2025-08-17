"use client";

import { t } from "@i18n-core";
import { Card, CardContent, CardHeader, CardTitle } from "@ui/base";
const Terms = () => {
  return (
    <main className="flex flex-1 pt-8 pb-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            {t("Cookie Policy", "cookies.page.Terms.cookie_policy__10ird3")}
          </h1>
          <p className="text-gray-600">
            Last updated:{" "}
            {new Date().toLocaleDateString("en-US", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>
                {t(
                  "Cookies and Tracking Technologies",
                  "cookies.page.Terms.cookies_and_tracking_technologies__1xjjja",
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-gray-700">
                {t(
                  "We use cookies and similar tracking technologies to enhance your experience on our service. These technologies help us:",
                  "privacy.page.Privacy.we_use_cookies_and_similar_tracking_technologies_to_enhance_your_experience_on_our_service_these_technologies_help_us__ihe1e0",
                )}
              </p>
              <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
                <li>
                  {t(
                    "Remember your preferences and settings",
                    "privacy.page.Privacy.remember_your_preferences_and_settings__q62fpu",
                  )}
                </li>
                <li>
                  {t(
                    "Analyze how our service is used",
                    "privacy.page.Privacy.analyze_how_our_service_is_used__1oustl",
                  )}
                </li>
                <li>
                  {t(
                    "Provide personalized content and features",
                    "privacy.page.Privacy.provide_personalized_content_and_features__wyokma",
                  )}
                </li>
                <li>
                  {t(
                    "Improve our service performance",
                    "privacy.page.Privacy.improve_our_service_performance__1hviu8",
                  )}
                </li>
              </ul>
              <p className="text-gray-700">
                {t(
                  "You can control cookie settings through your browser preferences, though disabling certain cookies may affect the functionality of our service.",
                  "privacy.page.Privacy.you_can_control_cookie_settings_through_your_browser_preferences_though_disabling_certain_cookies_may_affect_the_functionality_of_our_service__84bgob",
                )}
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="mt-8 text-center">
          <p className="text-sm text-gray-500">
            {t(
              "By using our service, you acknowledge that you have read, understood, and agree to be bound by this Cookie Policy.",
              "cookies.page.Terms.by_using_our_service_you__23x25t",
            )}
          </p>
        </div>
      </div>
    </main>
  );
};
export default Terms;
