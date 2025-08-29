"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@ui/base";
import Link from "next/link";
import { t } from "@i18n-core";
export default function VerifyEmailPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [token, setToken] = useState("");
  const router = useRouter();
  const searchParams = useSearchParams();
  useEffect(() => {
    const tokenParam = searchParams.get("token");
    if (tokenParam) {
      setToken(tokenParam);
      verifyEmail(tokenParam);
    }
  }, [searchParams]);
  const verifyEmail = async (verificationToken: string) => {
    setIsLoading(true);
    setError("");
    setSuccess("");
    try {
      const response = await fetch("/api/auth/verify-email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          token: verificationToken,
        }),
      });
      const data = await response.json();
      if (response.ok) {
        setSuccess(data.message);
        setTimeout(() => {
          router.push("/auth/signin");
        }, 3000);
      } else {
        setError(data.error || "Failed to verify email");
      }
    } catch (error) {
      setError("An error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };
  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            {t(
              "Invalid Verification Link",
              "verify-email.page.VerifyEmailPage.invalid_verification_link__xpufh9",
            )}
          </h2>
          <p className="text-gray-600 mb-6">
            {t(
              "This email verification link is invalid or has expired.",
              "verify-email.page.VerifyEmailPage.this_email_verification_link_is_invalid_or_has_expired__bttyjo",
            )}
          </p>
          <Link href="/auth/signin">
            <Button>
              {t(
                "Go to Sign In",
                "verify-email.page.VerifyEmailPage.go_to_sign_in__1ebst5",
              )}
            </Button>
          </Link>
        </div>
      </div>
    );
  }
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full text-center">
        <div className="mb-8">
          {isLoading ? (
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-indigo-600 mx-auto"></div>
          ) : (
            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100">
              <svg
                className="h-8 w-8 text-green-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M5 13l4 4L19 7"
                ></path>
              </svg>
            </div>
          )}
        </div>

        <h2 className="text-3xl font-bold text-gray-900 mb-4">
          {isLoading ? "Verifying Email..." : "Email Verification"}
        </h2>

        {error && <div className="text-red-600 text-sm mb-6">{error}</div>}

        {success && (
          <div className="text-green-600 text-sm mb-6">{success}</div>
        )}

        <div className="space-y-4">
          {!isLoading && !success && !error && (
            <p className="text-gray-600">
              {t(
                "Click the button below to verify your email address.",
                "verify-email.page.VerifyEmailPage.click_the_button_below_to_verify_your_email_address__284va5",
              )}
            </p>
          )}

          {!isLoading && !success && !error && (
            <Button onClick={() => verifyEmail(token)} className="w-full">
              {t(
                "Verify Email",
                "verify-email.page.VerifyEmailPage.verify_email__zyv9rx",
              )}
            </Button>
          )}

          <div className="pt-4">
            <Link
              href="/auth/signin"
              className="text-indigo-600 hover:text-indigo-500"
            >
              {t(
                "Back to Sign In",
                "verify-email.page.VerifyEmailPage.back_to_sign_in__wlrpuc",
              )}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
