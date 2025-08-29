"use client";

import { t } from "@i18n-core";
import { Card, CardContent, CardHeader, CardTitle } from "@ui/base";
const Accessibility = () => {
  return (
    <main className="flex flex-1 pt-8 pb-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            {t(
              "Accessibility",
              "accessibility.page.Accessibility.accessibility__wn0cao",
            )}
          </h1>
          <p className="text-gray-600">
            {t(
              "Last updated:",
              "accessibility.page.Accessibility.last_updated__22irpb",
            )}{" "}
            {new Date().toLocaleDateString("en-US", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>
        </div>

        {/* Sections */}
        <div className="space-y-6">
          {/* Commitment */}
          <Card>
            <CardHeader>
              <CardTitle>
                {t(
                  "Our Commitment",
                  "accessibility.page.Accessibility.our_commitment__1bk94x",
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-gray-700">
                {t(
                  "We are committed to making our product accessible to all users, including people with disabilities. Our goal is to conform to the Web Content Accessibility Guidelines (WCAG) 2.1 Level AA and to continuously improve accessibility over time.",
                  "accessibility.page.Accessibility.we_are_committed_to_making__51vn98",
                )}
              </p>
            </CardContent>
          </Card>

          {/* What we do */}
          <Card>
            <CardHeader>
              <CardTitle>
                {t(
                  "What We Do",
                  "accessibility.page.Accessibility.what_we_do__1yfxda",
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
                <li>
                  {t(
                    "Use semantic HTML and ARIA roles for clear structure.",
                    "accessibility.page.Accessibility.use_semantic_html_and_aria__tilvnj",
                  )}
                </li>
                <li>
                  {t(
                    "Maintain sufficient color contrast and support text resizing.",
                    "accessibility.page.Accessibility.maintain_sufficient_color_contrast_and__lvl7ga",
                  )}
                </li>
                <li>
                  {t(
                    "Ensure full keyboard navigation without traps.",
                    "accessibility.page.Accessibility.ensure_full_keyboard_navigation_without__v16omk",
                  )}
                </li>
                <li>
                  {t(
                    "Provide accessible labels, descriptions, and error messages for forms.",
                    "accessibility.page.Accessibility.provide_accessible_labels_descriptions_and__6ukk49",
                  )}
                </li>
                <li>
                  {t(
                    "Support screen readers and assistive technologies where possible.",
                    "accessibility.page.Accessibility.support_screen_readers_and_assistive__1ku22i",
                  )}
                </li>
                <li>
                  {t(
                    "Regularly test and audit components for accessibility issues.",
                    "accessibility.page.Accessibility.regularly_test_and_audit_components__15ojsg",
                  )}
                </li>
              </ul>
            </CardContent>
          </Card>

          {/* Supported technologies */}
          <Card>
            <CardHeader>
              <CardTitle>
                {t(
                  "Supported Browsers & Assistive Tech",
                  "accessibility.page.Accessibility.supported_browsers_assistive_tech__2g5ck1",
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-gray-700">
                {t(
                  "We aim to support current versions of major browsers and commonly used assistive technologies. Your experience may vary depending on operating system, browser configuration, and assistive tools.",
                  "accessibility.page.Accessibility.we_aim_to_support_current__1pnaq8",
                )}
              </p>
            </CardContent>
          </Card>

          {/* Keyboard navigation tips */}
          <Card>
            <CardHeader>
              <CardTitle>
                {t(
                  "Keyboard Navigation",
                  "accessibility.page.Accessibility.keyboard_navigation__11yssk",
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
                <li>
                  {t(
                    "Use Tab and Shift+Tab to move between focusable items.",
                    "accessibility.page.Accessibility.use_tab_and_shift_tab_to__1ffpkz",
                  )}
                </li>
                <li>
                  {t(
                    "Use Enter or Space to activate buttons and controls.",
                    "accessibility.page.Accessibility.use_enter_or_space_to__1joh8l",
                  )}
                </li>
                <li>
                  {t(
                    "Use Arrow keys to navigate menus, lists, and radios.",
                    "accessibility.page.Accessibility.use_arrow_keys_to_navigate__hz8fnb",
                  )}
                </li>
                <li>
                  {t(
                    "Use Esc to close dialogs and menus when available.",
                    "accessibility.page.Accessibility.use_esc_to_close_dialogs__1ljtyb",
                  )}
                </li>
              </ul>
            </CardContent>
          </Card>

          {/* Limitations */}
          <Card>
            <CardHeader>
              <CardTitle>
                {t(
                  "Known Limitations",
                  "accessibility.page.Accessibility.known_limitations__9mhnmn",
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-gray-700">
                {t(
                  "Some third-party widgets or embedded content may not fully meet our accessibility standards. We monitor these areas and look for alternatives or improvements.",
                  "accessibility.page.Accessibility.some_third_party_widgets_or_embedded__25946l",
                )}
              </p>
            </CardContent>
          </Card>

          {/* Feedback */}
          <Card>
            <CardHeader>
              <CardTitle>
                {t(
                  "Feedback & Contact",
                  "accessibility.page.Accessibility.feedback_contact__2dfze0",
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-gray-700">
                {t(
                  "We welcome your feedback on accessibility. If you encounter barriers or need assistance, please contact us and include details about the page, the issue you experienced, and your browser or assistive technology.",
                  "accessibility.page.Accessibility.we_welcome_your_feedback_on__2e43jb",
                )}
              </p>
              <p className="text-gray-700">
                {t("Email:", "accessibility.page.Accessibility.email__22n0ns")}{" "}
                <a
                  href="mailto:accessibility@example.com"
                  className="text-indigo-600 hover:underline"
                >
                  accessibility@example.com
                </a>
              </p>
            </CardContent>
          </Card>

          {/* Continuous improvement */}
          <Card>
            <CardHeader>
              <CardTitle>
                {t(
                  "Continuous Improvement",
                  "accessibility.page.Accessibility.continuous_improvement__21sw4r",
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-gray-700">
                {t(
                  "Accessibility is an ongoing effort. We review our design system, components, and content regularly and prioritize fixes based on user impact.",
                  "accessibility.page.Accessibility.accessibility_is_an_ongoing_effort__1py8cd",
                )}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Footer note */}
        <div className="mt-8 text-center">
          <p className="text-sm text-gray-500">
            {t(
              "By using our service, you acknowledge our commitment to accessibility and our ongoing work to improve the experience for everyone.",
              "accessibility.page.Accessibility.by_using_our_service_you__2fdx4u",
            )}
          </p>
        </div>
      </div>
    </main>
  );
};
export default Accessibility;
