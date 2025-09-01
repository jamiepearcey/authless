"use client";

import { t } from "@i18n-core";
import { Card, CardContent, CardHeader, CardTitle } from "@ui/base";
const Terms = () => {
  return (
    <main className="flex flex-1 pt-8 pb-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            {t("Terms of Service", "terms.page.Terms.terms_of_service__22ckfi")}
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
                  "1. Acceptance of Terms",
                  "terms.page.Terms.1_acceptance_of_terms__l6kk22",
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-gray-700">
                By accessing and using Authless ("the Service"), you accept and
                agree to be bound by the terms and provision of this agreement.
                If you do not agree to abide by the above, please do not use
                this service.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>
                {t(
                  "2. Description of Service",
                  "terms.page.Terms.2_description_of_service__hucvtg",
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-gray-700">
                {t(
                  "Authless is a service that helps users understand and potentially challenge Penalty Charge Notices (PCNs) in the UK. Our service provides information, guidance, and tools to assist with PCN appeals.",
                  "terms.page.Terms.authless_is_a_service_that_helps_users_understand_and_potentially_challenge_penalty_charge_notices_pcns_in_the_uk_our_service_provides_information_guidance_and_tools_to_assist_with_pcn_appeals__25qe8w",
                )}
              </p>
              <p className="text-gray-700">
                {t(
                  "We do not guarantee the success of any appeal and our service is for informational purposes only. Users are responsible for their own decisions and actions regarding PCN appeals.",
                  "terms.page.Terms.we_do_not_guarantee_the_success_of_any_appeal_and_our_service_is_for_informational_purposes_only_users_are_responsible_for_their_own_decisions_and_actions_regarding_pcn_appeals__2bq857",
                )}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>
                {t(
                  "3. User Responsibilities",
                  "terms.page.Terms.3_user_responsibilities__1g9f13",
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-gray-700">
                {t(
                  "As a user of our service, you agree to:",
                  "terms.page.Terms.as_a_user_of_our_service_you_agree_to__2fc3y8",
                )}
              </p>
              <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
                <li>
                  {t(
                    "Provide accurate and truthful information",
                    "terms.page.Terms.provide_accurate_and_truthful_information__13075e",
                  )}
                </li>
                <li>
                  {t(
                    "Use the service in compliance with applicable laws",
                    "terms.page.Terms.use_the_service_in_compliance_with_applicable_laws__2dhytr",
                  )}
                </li>
                <li>
                  {t(
                    "Not misuse or attempt to manipulate the service",
                    "terms.page.Terms.not_misuse_or_attempt_to_manipulate_the_service__1sjeau",
                  )}
                </li>
                <li>
                  {t(
                    "Respect the intellectual property rights of others",
                    "terms.page.Terms.respect_the_intellectual_property_rights_of_others__1s24od",
                  )}
                </li>
                <li>
                  {t(
                    "Maintain the confidentiality of your account credentials",
                    "terms.page.Terms.maintain_the_confidentiality_of_your_account_credentials__1gkasa",
                  )}
                </li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>
                {t(
                  "4. Privacy and Data Protection",
                  "terms.page.Terms.4_privacy_and_data_protection__1xkwbz",
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-gray-700">
                Your privacy is important to us. We collect, use, and protect
                your personal information in accordance with our Privacy Policy.
                By using our service, you consent to the collection and use of
                your information as described in our Privacy Policy.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>
                {t(
                  "5. Disclaimers and Limitations",
                  "terms.page.Terms.5_disclaimers_and_limitations__1ntrfn",
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-gray-700">
                {t(`The information provided through our service is for general
                informational purposes only and should not be considered as
                legal advice. We recommend consulting with a qualified legal
                professional for specific legal matters.
             `)}{" "}
              </p>
              <p className="text-gray-700">
                {t(
                  'We do not guarantee the accuracy, completeness, or usefulness of any information provided through our service. The service is provided "as is" without warranties of any kind.',
                  "terms.page.Terms.we_do_not_guarantee_the_accuracy_completeness_or_usefulness_of_any_information_provided_through_our_service_the_service_is_provided_as_is_without_warranties_of_any_kind__21bfrv",
                )}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>
                {t(
                  "6. Intellectual Property",
                  "terms.page.Terms.6_intellectual_property__18rdbj",
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-gray-700">
                {t(`The content, features, and functionality of our service are
                owned by Authless and are protected by copyright,
                trademark, and other intellectual property laws. You may not
                reproduce, distribute, or create derivative works without our
                express written consent.
             `)}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>7. Termination</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-gray-700">
                {t(`We may terminate or suspend your access to our service at any
                  time, without prior notice, for conduct that we believe violates
                  these Terms of Service or is harmful to other users, us, or
                  third parties.
              `)}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>
                {t(
                  "8. Changes to Terms",
                  "terms.page.Terms.8_changes_to_terms__ukhh55",
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-gray-700">
                {t(`We reserve the right to modify these terms at any time. We will
                notify users of any material changes by posting the new terms on
                this page. Your continued use of the service after such
                modifications constitutes your acceptance of the updated terms.
              `)}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>
                {t(
                  "9. Contact Information",
                  "terms.page.Terms.9_contact_information__8dg64y",
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-gray-700">
                {t(
                  "If you have any questions about these Terms of Service, please contact us at:",
                  "terms.page.Terms.if_you_have_any_questions_about_these_terms_of_service_please_contact_us_at__1l79q9",
                )}
              </p>
              <div className="bg-gray-100 p-4 rounded-lg">
                <p className="text-gray-700">
                  <strong>
                    {t("Email:", "terms.page.Terms.email__22n0ns")}
                  </strong>{" "}
                  legal@authless.com
                  <br />
                  <strong>
                    {t("Address:", "terms.page.Terms.address__1kv4eu")}
                  </strong>
                  {t(
                    "123 Legal Street, London, UK",
                    "privacy.page.Privacy.123_legal_street_london_uk__2eyw82",
                  )}
                  <br />
                  <strong>
                    {t("Phone:", "terms.page.Terms.phone__qzangd")}
                  </strong>
                  {t(
                    "+44 20 1234 5678",
                    "privacy.page.Privacy.44_20_1234_5678__1gbztx",
                  )}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>
                {t(
                  "10. Governing Law",
                  "terms.page.Terms.10_governing_law__1qj20r",
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-gray-700">
                {t(`These Terms of Service shall be governed by and construed in
                accordance with the laws of England and Wales. Any disputes
                arising from these terms or the use of our service shall be
                subject to the exclusive jurisdiction of the courts of England
                and Wales.
              `)}
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="mt-8 text-center">
          <p className="text-sm text-gray-500">
            {t(
              "By using our service, you acknowledge that you have read, understood, and agree to be bound by these Terms of Service.",
              "terms.page.Terms.by_using_our_service_you_acknowledge_that_you_have_read_understood_and_agree_to_be_bound_by_these_terms_of_service__zm5vk1",
            )}
          </p>
        </div>
      </div>
    </main>
  );
};
export default Terms;
