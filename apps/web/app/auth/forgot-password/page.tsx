"use client";

import { useState } from "react";
import { Button } from "@ui/base";
import Link from "next/link";
import { t } from "@i18n-core";
export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    setSuccess("");
    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
        }),
      });
      const data = await response.json();
      if (response.ok) {
        setSuccess(data.message);
      } else {
        setError(data.error || "Failed to send reset email");
      }
    } catch (error) {
      setError("An error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };
  return (
    <div className="flex-1 flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            {t(
              "Reset your password",
              "forgot-password.page.ForgotPasswordPage.reset_your_password__28yjm6",
            )}
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            {t(
              "Enter your email address and we'll send you a link to reset your password.",
              "forgot-password.page.ForgotPasswordPage.enter_your_email_address_and_we_ll_send_you_a_link_to_reset_your_password__1myhgt",
            )}
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="email" className="sr-only">
              Email address
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              className="appearance-none rounded relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          {error && (
            <div className="text-red-600 text-sm text-center">{error}</div>
          )}

          {success && (
            <div className="text-green-600 text-sm text-center">{success}</div>
          )}

          <div>
            <Button
              type="submit"
              className="group relative w-full flex justify-center py-2 px-4"
              disabled={isLoading}
            >
              {isLoading ? "Sending..." : "Send Reset Link"}
            </Button>
          </div>
        </form>

        <div className="text-center space-y-2">
          <p className="text-sm text-gray-600">
            {t(
              "Remember your password?",
              "forgot-password.page.ForgotPasswordPage.remember_your_password__22wf6z",
            )}{" "}
            <Link
              href="/auth/signin"
              className="font-medium text-indigo-600 hover:text-indigo-500"
            >
              {t(
                "Sign in here",
                "forgot-password.page.ForgotPasswordPage.sign_in_here__1gmqpt",
              )}
            </Link>
          </p>
          <p className="text-sm text-gray-600">
            Or{" "}
            <Link
              href="/"
              className="font-medium text-indigo-600 hover:text-indigo-500"
            >
              {t(
                "go back home",
                "forgot-password.page.ForgotPasswordPage.go_back_home__1okxr6",
              )}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
