"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { Button } from "@ui/base";
import { Input } from "@ui/base";
import { Label } from "@ui/base";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@ui/base";
import { Separator } from "@ui/base";
import Link from "next/link";
import { t } from "@i18n-core";
import { trpc } from "@/lib/trpc";
import { 
  Mail, 
  Lock, 
  Github, 
  Chrome, 
  AlertCircle, 
  CheckCircle,
  Eye,
  EyeOff
} from "lucide-react";

export default function SignInPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isOAuthLoading, setIsOAuthLoading] = useState<string | null>(null);
  
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/";
  const errorParam = searchParams.get("error");

  // tRPC mutation for 2FA-aware login
  const startPasswordLogin = trpc.startPasswordLogin.useMutation();

  // Handle OAuth errors from URL params
  useState(() => {
    if (errorParam) {
      switch (errorParam) {
        case "OAuthAccountNotLinked":
          setError("This email is already associated with a different account. Please sign in with the original method.");
          break;
        case "AccessDenied":
          setError("Access denied. Please try again.");
          break;
        case "Verification":
          setError("Please verify your email before signing in.");
          break;
        default:
          setError("An error occurred during sign in. Please try again.");
      }
    }
  });

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    setSuccess("");

    try {
      // First try the new 2FA-aware login flow
      const result = await startPasswordLogin.mutateAsync({
        identifier: email,
        password,
      });
      
      if (result.next === "2fa" && "nonce" in result) {
        // Redirect to 2FA verification with nonce
        const verifyUrl = new URL("/auth/2fa/verify", window.location.origin);
        verifyUrl.searchParams.set("nonce", result.nonce);
        verifyUrl.searchParams.set("callbackUrl", callbackUrl);
        router.push(verifyUrl.toString());
        return;
      } else if (result.next === "done") {
        // No 2FA required, proceed with standard NextAuth session
        const signInResult = await signIn("credentials", {
          email,
          password,
          redirect: false,
        });

        if (signInResult?.error) {
          setError(signInResult.error);
        } else if (signInResult?.ok) {
          setSuccess("Sign in successful! Redirecting...");
          setTimeout(() => {
            router.push(callbackUrl);
          }, 1000);
        }
      }
    } catch (error: any) {
      // If the new flow fails, fallback to standard NextAuth for compatibility
      console.log("2FA flow failed, falling back to standard auth:", error);
      
      try {
        const result = await signIn("credentials", {
          email,
          password,
          redirect: false,
        });

        if (result?.error) {
          setError(result.error);
        } else if (result?.ok) {
          setSuccess("Sign in successful! Redirecting...");
          setTimeout(() => {
            router.push(callbackUrl);
          }, 1000);
        }
      } catch (fallbackError) {
        setError("An error occurred during sign in");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleOAuthSignIn = async (provider: string) => {
    setIsOAuthLoading(provider);
    setError("");
    
    try {
      await signIn(provider, {
        callbackUrl,
        redirect: false,
      });
    } catch (error) {
      setError(`Failed to sign in with ${provider}`);
      setIsOAuthLoading(null);
    }
  };

  return (
    <div className="flex flex-1 items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <Card className="shadow-lg">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold text-center">
              {t("Sign in to your account", "signin.page.SignInPage.sign_in_to_your_account__1itlrq")}
            </CardTitle>
            <CardDescription className="text-center">
              {t("Welcome back! Please enter your details", "signin.page.SignInPage.welcome_back_please_enter_your_details__2bkoks")}
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-6">
            {/* OAuth Providers */}
            <div className="space-y-3">
              <Button
                variant="outline"
                className="w-full"
                onClick={() => handleOAuthSignIn("google")}
                disabled={isOAuthLoading !== null}
              >
                {isOAuthLoading === "google" ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600 mr-2" />
                ) : (
                  <Chrome className="h-4 w-4 mr-2" />
                )}
                {t("Continue with Google", "signin.page.SignInPage.continue_with_google__3ckols")}
              </Button>
              
              <Button
                variant="outline"
                className="w-full"
                onClick={() => handleOAuthSignIn("github")}
                disabled={isOAuthLoading !== null}
              >
                {isOAuthLoading === "github" ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600 mr-2" />
                ) : (
                  <Github className="h-4 w-4 mr-2" />
                )}
                {t("Continue with GitHub", "signin.page.SignInPage.continue_with_github__4ckols")}
              </Button>
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <Separator className="w-full" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-2 text-gray-500">
                  {t("Or continue with", "signin.page.SignInPage.or_continue_with__5ckols")}
                </span>
              </div>
            </div>

            {/* Error/Success Messages */}
            {error && (
              <div className="flex items-center gap-2 p-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded-md">
                <AlertCircle className="h-4 w-4" />
                {error}
              </div>
            )}

            {success && (
              <div className="flex items-center gap-2 p-3 text-sm text-green-700 bg-green-50 border border-green-200 rounded-md">
                <CheckCircle className="h-4 w-4" />
                {success}
              </div>
            )}

            {/* Sign In Form */}
            <form onSubmit={handleSignIn} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium text-gray-700">
                  {t("Email", "signin.page.SignInPage.email__6ckols")}
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    className="pl-10"
                    placeholder={t("Enter your email", "signin.page.SignInPage.enter_your_email__7ckols")}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium text-gray-700">
                  {t("Password", "signin.page.SignInPage.password__8ckols")}
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    required
                    className="pl-10 pr-10"
                    placeholder={t("Enter your password", "signin.page.SignInPage.enter_your_password__9ckols")}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <input
                    id="remember-me"
                    name="remember-me"
                    type="checkbox"
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                  />
                  <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-900">
                    {t("Remember me", "signin.page.SignInPage.remember_me__10ckols")}
                  </label>
                </div>
                <Link
                  href="/forgot-password"
                  className="text-sm text-indigo-600 hover:text-indigo-500"
                >
                  {t("Forgot password?", "signin.page.SignInPage.forgot_password__11ckols")}
                </Link>
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={isLoading || isOAuthLoading !== null}
              >
                {isLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                    {t("Signing in...", "signin.page.SignInPage.signing_in__12ckols")}
                  </>
                ) : (
                  t("Sign in", "signin.page.SignInPage.sign_in__13ckols")
                )}
              </Button>
            </form>

            {/* Sign Up Link */}
            <div className="text-center">
              <p className="text-sm text-gray-600">
                {t("Don't have an account?", "signin.page.SignInPage.dont_have_an_account__14ckols")}{" "}
                <Link
                  href="/auth/signup"
                  className="font-medium text-indigo-600 hover:text-indigo-500"
                >
                  {t("Sign up", "signin.page.SignInPage.sign_up__15ckols")}
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
