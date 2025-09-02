"use client";

import { t } from "@i18n-core";
import { Card, CardContent, CardHeader, CardTitle } from "@ui/base";
const Privacy = () => {
  return (
    <main className="pt-8 pb-8">
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Privacy Policy</h1>
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
                <CardTitle>1. Introduction</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-gray-700">
                  {t(
                    'Authless ("we", "our", or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our service.',
                    "privacy.page.Privacy.authless_we_our_or_us_is_committed_to_protecting_your_privacy_this_privacy_policy_explains_how_we_collect_use_disclose_and_safeguard_your_information_when_you_use_our_service__wzezak",
                  )}
                </p>
                <p className="text-gray-700">
                  {t(
                    "By using our service, you consent to the data practices described in this policy. If you do not agree with our policies and practices, please do not use our service.",
                    "privacy.page.Privacy.by_using_our_service_you_consent_to_the_data_practices_described_in_this_policy_if_you_do_not_agree_with_our_policies_and_practices_please_do_not_use_our_service__1s9gfn",
                  )}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>
                  {t(
                    "2. Information We Collect",
                    "privacy.page.Privacy.2_information_we_collect__1dnw6q",
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <h4 className="font-semibold text-gray-800">
                  Personal Information
                </h4>
                <p className="text-gray-700">
                  {t(
                    "We may collect personal information that you provide directly to us, including:",
                    "privacy.page.Privacy.we_may_collect_personal_information_that_you_provide_directly_to_us_including__1ckelc",
                  )}
                </p>
                <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
                  <li>
                    {t(
                      "Name and contact information (email address, phone number)",
                      "privacy.page.Privacy.name_and_contact_information_email_address_phone_number__12nzq7",
                    )}
                  </li>
                  <li>
                    {t(
                      "Account credentials and profile information",
                      "privacy.page.Privacy.account_credentials_and_profile_information__yen69y",
                    )}
                  </li>
                  <li>
                    {t(
                      "PCN details and appeal information",
                      "privacy.page.Privacy.pcn_details_and_appeal_information__56bl82",
                    )}
                  </li>
                  <li>
                    {t(
                      "Communication preferences and settings",
                      "privacy.page.Privacy.communication_preferences_and_settings__381ts5",
                    )}
                  </li>
                </ul>

                <h4 className="font-semibold text-gray-800 mt-4">
                  Usage Information
                </h4>
                <p className="text-gray-700">
                  {t(
                    "We automatically collect certain information about your use of our service:",
                    "privacy.page.Privacy.we_automatically_collect_certain_information_about_your_use_of_our_service__1l2bn6",
                  )}
                </p>
                <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
                  <li>
                    {t(
                      "Device information and IP address",
                      "privacy.page.Privacy.device_information_and_ip_address__15mw8u",
                    )}
                  </li>
                  <li>
                    {t(
                      "Browser type and operating system",
                      "privacy.page.Privacy.browser_type_and_operating_system__1jrbdz",
                    )}
                  </li>
                  <li>
                    {t(
                      "Pages visited and features used",
                      "privacy.page.Privacy.pages_visited_and_features_used__u976cr",
                    )}
                  </li>
                  <li>
                    {t(
                      "Time spent on our service",
                      "privacy.page.Privacy.time_spent_on_our_service__26blcu",
                    )}
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>
                  {t(
                    "3. How We Use Your Information",
                    "privacy.page.Privacy.3_how_we_use_your_information__iq9fz6",
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-gray-700">
                  {t(
                    "We use the information we collect to:",
                    "privacy.page.Privacy.we_use_the_information_we_collect_to__1hpl5a",
                  )}
                </p>
                <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
                  <li>
                    {t(
                      "Provide and maintain our service",
                      "privacy.page.Privacy.provide_and_maintain_our_service__11ka4b",
                    )}
                  </li>
                  <li>
                    {t(
                      "Process your PCN appeals and requests",
                      "privacy.page.Privacy.process_your_pcn_appeals_and_requests__1icgjz",
                    )}
                  </li>
                  <li>
                    {t(
                      "Send you important updates and notifications",
                      "privacy.page.Privacy.send_you_important_updates_and_notifications__29zs4s",
                    )}
                  </li>
                  <li>
                    {t(
                      "Improve our service and user experience",
                      "privacy.page.Privacy.improve_our_service_and_user_experience__16kcgq",
                    )}
                  </li>
                  <li>
                    {t(
                      "Respond to your inquiries and support requests",
                      "privacy.page.Privacy.respond_to_your_inquiries_and_support_requests__bpw49b",
                    )}
                  </li>
                  <li>
                    {t(
                      "Ensure the security and integrity of our service",
                      "privacy.page.Privacy.ensure_the_security_and_integrity_of_our_service__21zgn0",
                    )}
                  </li>
                  <li>
                    {t(
                      "Comply with legal obligations",
                      "privacy.page.Privacy.comply_with_legal_obligations__bwdacl",
                    )}
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>
                  {t(
                    "4. Information Sharing and Disclosure",
                    "privacy.page.Privacy.4_information_sharing_and_disclosure__rkoo5q",
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-gray-700">
                  {t(
                    "We do not sell, trade, or otherwise transfer your personal information to third parties without your consent, except in the following circumstances:",
                    "privacy.page.Privacy.we_do_not_sell_trade_or_otherwise_transfer_your_personal_information_to_third_parties_without_your_consent_except_in_the_following_circumstances__a1s66g",
                  )}
                </p>
                <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
                  <li>
                    {t(
                      "With your explicit consent",
                      "privacy.page.Privacy.with_your_explicit_consent__14lwsh",
                    )}
                  </li>
                  <li>
                    {t(
                      "To comply with legal requirements or court orders",
                      "privacy.page.Privacy.to_comply_with_legal_requirements_or_court_orders__z8tsmk",
                    )}
                  </li>
                  <li>
                    {t(
                      "To protect our rights, property, or safety",
                      "privacy.page.Privacy.to_protect_our_rights_property_or_safety__1img2u",
                    )}
                  </li>
                  <li>
                    {t(
                      "In connection with a business transfer or merger",
                      "privacy.page.Privacy.in_connection_with_a_business_transfer_or_merger__fxue13",
                    )}
                  </li>
                  <li>
                    {t(
                      "With trusted service providers who assist us in operating our service",
                      "privacy.page.Privacy.with_trusted_service_providers_who_assist_us_in_operating_our_service__1ke00d",
                    )}
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>
                  {t(
                    "5. Data Security",
                    "privacy.page.Privacy.5_data_security__lncyrq",
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-gray-700">
                  {t(
                    "We implement appropriate technical and organizational security measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction.",
                    "privacy.page.Privacy.we_implement_appropriate_technical_and_organizational_security_measures_to_protect_your_personal_information_against_unauthorized_access_alteration_disclosure_or_destruction__1l9z3v",
                  )}
                </p>
                <p className="text-gray-700">
                  However, no method of transmission over the internet or
                  electronic storage is 100% secure. While we strive to use
                  commercially acceptable means to protect your information, we
                  cannot guarantee its absolute security.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>
                  {t(
                    "6. Data Retention",
                    "privacy.page.Privacy.6_data_retention__26iixl",
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-gray-700">
                  {t(
                    "We retain your personal information for as long as necessary to fulfill the purposes outlined in this Privacy Policy, unless a longer retention period is required or permitted by law.",
                    "privacy.page.Privacy.we_retain_your_personal_information_for_as_long_as_necessary_to_fulfill_the_purposes_outlined_in_this_privacy_policy_unless_a_longer_retention_period_is_required_or_permitted_by_law__28o92v",
                  )}
                </p>
                <p className="text-gray-700">
                  {t(
                    "When we no longer need your information, we will securely delete or anonymize it in accordance with our data retention policies.",
                    "privacy.page.Privacy.when_we_no_longer_need_your_information_we_will_securely_delete_or_anonymize_it_in_accordance_with_our_data_retention_policies__8sq7zb",
                  )}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>
                  {t(
                    "7. Your Rights and Choices",
                    "privacy.page.Privacy.7_your_rights_and_choices__zub4pk",
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-gray-700">
                  {t(
                    "You have certain rights regarding your personal information:",
                    "privacy.page.Privacy.you_have_certain_rights_regarding_your_personal_information__jqc8kp",
                  )}
                </p>
                <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
                  <li>
                    <strong>Access:</strong>
                    {t(
                      "Request access to your personal information",
                      "privacy.page.Privacy.request_access_to_your_personal_information__ty6gno",
                    )}
                  </li>
                  <li>
                    <strong>Correction:</strong>
                    {t(
                      "Request correction of inaccurate information",
                      "privacy.page.Privacy.request_correction_of_inaccurate_information__ga7s1e",
                    )}
                  </li>
                  <li>
                    <strong>Deletion:</strong>
                    {t(
                      "Request deletion of your personal information",
                      "privacy.page.Privacy.request_deletion_of_your_personal_information__1aihrb",
                    )}
                  </li>
                  <li>
                    <strong>Portability:</strong>
                    {t(
                      "Request a copy of your data in a portable format",
                      "privacy.page.Privacy.request_a_copy_of_your_data_in_a_portable_format__25736o",
                    )}
                  </li>
                  <li>
                    <strong>Objection:</strong>
                    {t(
                      "Object to certain processing of your information",
                      "privacy.page.Privacy.object_to_certain_processing_of_your_information__h3lplj",
                    )}
                  </li>
                  <li>
                    <strong>Withdrawal:</strong>
                    {t(
                      "Withdraw consent where processing is based on consent",
                      "privacy.page.Privacy.withdraw_consent_where_processing_is_based_on_consent__2bp6j1",
                    )}
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>
                  {t(
                    "8. Cookies and Tracking Technologies",
                    "privacy.page.Privacy.8_cookies_and_tracking_technologies__7ish6x",
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

            <Card>
              <CardHeader>
                <CardTitle>
                  {t(
                    "9. Third-Party Services",
                    "privacy.page.Privacy.9_third_party_services__1h02be",
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-gray-700">
                  {t(
                    "Our service may contain links to third-party websites or integrate with third-party services. We are not responsible for the privacy practices of these third parties.",
                    "privacy.page.Privacy.our_service_may_contain_links_to_third_party_websites_or_integrate_with_third_party_services_we_are_not_responsible_for_the_privacy_practices_of_these_third_parties__atn0te",
                  )}
                </p>
                <p className="text-gray-700">
                  {t(
                    "We encourage you to review the privacy policies of any third-party services you use or visit.",
                    "privacy.page.Privacy.we_encourage_you_to_review_the_privacy_policies_of_any_third_party_services_you_use_or_visit__1b0ctr",
                  )}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>
                  {t(
                    "10. Children's Privacy",
                    "privacy.page.Privacy.10_children_s_privacy__1h70xd",
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-gray-700">
                  {t(
                    "Our service is not intended for children under the age of 13. We do not knowingly collect personal information from children under 13.",
                    "privacy.page.Privacy.our_service_is_not_intended_for_children_under_the_age_of_13_we_do_not_knowingly_collect_personal_information_from_children_under_13__1lch3a",
                  )}
                </p>
                <p className="text-gray-700">
                  {t(
                    "If you are a parent or guardian and believe your child has provided us with personal information, please contact us immediately.",
                    "privacy.page.Privacy.if_you_are_a_parent_or_guardian_and_believe_your_child_has_provided_us_with_personal_information_please_contact_us_immediately__2aivvk",
                  )}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>
                  {t(
                    "11. International Data Transfers",
                    "privacy.page.Privacy.11_international_data_transfers__11z0rs",
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-gray-700">
                  {t(
                    "Your information may be transferred to and processed in countries other than your own. We ensure that such transfers comply with applicable data protection laws.",
                    "privacy.page.Privacy.your_information_may_be_transferred_to_and_processed_in_countries_other_than_your_own_we_ensure_that_such_transfers_comply_with_applicable_data_protection_laws__taym66",
                  )}
                </p>
                <p className="text-gray-700">
                  {t(
                    "For users in the European Economic Area (EEA), we ensure adequate protection for your data when transferred outside the EEA.",
                    "privacy.page.Privacy.for_users_in_the_european_economic_area_eea_we_ensure_adequate_protection_for_your_data_when_transferred_outside_the_eea__i2dh3r",
                  )}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>
                  {t(
                    "12. Changes to This Policy",
                    "privacy.page.Privacy.12_changes_to_this_policy__37pple",
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-gray-700">
                  {t(
                    'We may update this Privacy Policy from time to time. We will notify you of any material changes by posting the new policy on this page and updating the "Last updated" date.',
                    "privacy.page.Privacy.we_may_update_this_privacy_policy_from_time_to_time_we_will_notify_you_of_any_material_changes_by_posting_the_new_policy_on_this_page_and_updating_the_last_updated_date__pjzmyr",
                  )}
                </p>
                <p className="text-gray-700">
                  {t(
                    "Your continued use of our service after such changes constitutes your acceptance of the updated Privacy Policy.",
                    "privacy.page.Privacy.your_continued_use_of_our_service_after_such_changes_constitutes_your_acceptance_of_the_updated_privacy_policy__1c5c13",
                  )}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>
                  {t(
                    "13. Contact Us",
                    "privacy.page.Privacy.13_contact_us__1svm2p",
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-gray-700">
                  {t(
                    "If you have any questions about this Privacy Policy or our data practices, please contact us:",
                    "privacy.page.Privacy.if_you_have_any_questions_about_this_privacy_policy_or_our_data_practices_please_contact_us__1iyrum",
                  )}
                </p>
                <div className="bg-gray-100 p-4 rounded-lg">
                  <p className="text-gray-700">
                    <strong>Email:</strong> privacy@authless.com
                    <br />
                    <strong>Address:</strong>
                    {t(
                      "123 Legal Street, uk, UK",
                      "privacy.page.Privacy.123_legal_street_uk_uk__2eyw82",
                    )}
                    <br />
                    <strong>Phone:</strong>
                    {t(
                      "+44 20 1234 5678",
                      "privacy.page.Privacy.44_20_1234_5678__1gbztx",
                    )}
                    <br />
                    <strong>
                      {t(
                        "Data Protection Officer:",
                        "privacy.page.Privacy.data_protection_officer__p3sb8b",
                      )}
                    </strong>{" "}
                    dpo@authless.com
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="mt-8 text-center">
            <p className="text-sm text-gray-500">
              {t(
                "This Privacy Policy is effective as of the date listed above and applies to all users of our service.",
                "privacy.page.Privacy.this_privacy_policy_is_effective_as_of_the_date_listed_above_and_applies_to_all_users_of_our_service__b9v8bk",
              )}
            </p>
          </div>
        </div>
      </div>
    </main>
  );
};
export default Privacy;
