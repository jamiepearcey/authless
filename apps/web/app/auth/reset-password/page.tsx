"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@ui/base";
import Link from "next/link";
import { t } from "@i18n-core";
export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
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
    }
  }, [searchParams]);
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    setSuccess("");
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      setIsLoading(false);
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters long");
      setIsLoading(false);
      return;
    }
    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          token,
          password,
        }),
      });
      const data = await response.json();
      if (response.ok) {
        setSuccess(data.message);
        setTimeout(() => {
          router.push("/auth/signin");
        }, 3000);
      } else {
        setError(data.error || "Failed to reset password");
      }
    } catch (error) {
      setError("An error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };
  if (!token) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50 py-12 ">
        <div className="max-w-md w-full text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            {t(
              "Invalid Reset Link",
              "reset-password.page.ResetPasswordPage.invalid_reset_link__ptf8f6",
            )}
          </h2>
          <p className="text-gray-600 mb-6">
            {t(
              "This password reset link is invalid or has expired.",
              "reset-password.page.ResetPasswordPage.this_password_reset_link_is_invalid_or_has_expired__2epf0z",
            )}
          </p>
          <Link href="/auth/forgot-password">
            <Button>
              {t(
                "Request New Reset Link",
                "reset-password.page.ResetPasswordPage.request_new_reset_link__8yoyhu",
              )}
            </Button>
          </Link>
        </div>
      </div>
    );
  }
  return (
    <div className="flex-1 flex items-center justify-center bg-gray-50 py-12 ">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            {t(
              "Set new password",
              "reset-password.page.ResetPasswordPage.set_new_password__1g6eyt",
            )}
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            {t(
              "Enter your new password below.",
              "reset-password.page.ResetPasswordPage.enter_your_new_password_below__shfexs",
            )}
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label htmlFor="password" className="sr-only">
                New Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                className="appearance-none rounded relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="New Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="confirmPassword" className="sr-only">
                {t(
                  "Confirm New Password",
                  "reset-password.page.ResetPasswordPage.confirm_new_password__1dyvjo",
                )}
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                required
                className="appearance-none rounded relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="Confirm New Password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>
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
              {isLoading ? "Resetting..." : "Reset Password"}
            </Button>
          </div>
        </form>

        <div className="text-center">
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
        </div>
      </div>
    </div>
  );
}
