"use client";
import { useState, useEffect } from "react";
import { t } from "@i18n-core";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@ui/base";
import { Button, Input, Label } from "@ui/base";
import { Badge } from "@ui/base";
import { Shield, Smartphone, CheckCircle, AlertCircle, ArrowRight, QrCode, Copy, Download } from "lucide-react";
import { trpc } from "../lib/trpc";
import { toast } from "@ui/base";

interface TwoFactorSetupProps {
  isWizard?: boolean;
  onComplete?: () => void;
  onSkip?: () => void;
}

export default function TwoFactorSetup({ isWizard = false, onComplete, onSkip }: TwoFactorSetupProps) {
  const [step, setStep] = useState<"welcome" | "setup" | "verify" | "complete">("welcome");
  const [qrCode, setQrCode] = useState<string>("");
  const [secret, setSecret] = useState<string>("");
  const [verificationCode, setVerificationCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const setup2FA = trpc.setupTwoFactor.useMutation({
    onSuccess: (data) => {
      setQrCode(data.qrCode);
      setSecret(data.secret);
      setStep("setup");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const verify2FA = trpc.verifyTwoFactor.useMutation({
    onSuccess: () => {
      setStep("complete");
      if (onComplete) {
        onComplete();
      }
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleSetup2FA = async () => {
    setIsLoading(true);
    try {
      await setup2FA.mutateAsync();
    } catch (error) {
      // Handled by mutation
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerify2FA = async () => {
    if (!verificationCode.trim()) {
      toast.error("Please enter the verification code");
      return;
    }

    setIsLoading(true);
    try {
      await verify2FA.mutateAsync({ code: verificationCode });
    } catch (error) {
      // Handled by mutation
    } finally {
      setIsLoading(false);
    }
  };

  const copySecret = () => {
    navigator.clipboard.writeText(secret);
    toast.success("Secret copied to clipboard");
  };

  const downloadSecret = () => {
    const element = document.createElement("a");
    const file = new Blob([`Your 2FA Secret: ${secret}\n\nKeep this safe and secure!`], { type: "text/plain" });
    element.href = URL.createObjectURL(file);
    element.download = "2fa-secret.txt";
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    toast.success("Secret downloaded");
  };

  if (step === "welcome") {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
            <Shield className="h-8 w-8 text-blue-600" />
          </div>
          <CardTitle className="text-2xl">Enable Two-Factor Authentication</CardTitle>
          <CardDescription className="text-lg">
            Add an extra layer of security to your account
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="text-sm font-medium text-blue-800 mb-2">How it works:</h4>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• Download an authenticator app (Google Authenticator, Authy, etc.)</li>
              <li>• Scan the QR code or enter the secret manually</li>
              <li>• Enter the 6-digit code from your app to verify</li>
              <li>• Your account will be protected with 2FA</li>
            </ul>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              onClick={handleSetup2FA}
              disabled={isLoading}
              className="flex-1"
              size="lg"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Setting up...
                </>
              ) : (
                <>
                  <Shield className="h-4 w-4 mr-2" />
                  Enable 2FA
                </>
              )}
            </Button>
            
            {isWizard && onSkip && (
              <Button
                variant="outline"
                onClick={onSkip}
                className="flex-1"
                size="lg"
              >
                Skip for now
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (step === "setup") {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
            <QrCode className="h-8 w-8 text-green-600" />
          </div>
          <CardTitle className="text-2xl">Set Up Your Authenticator App</CardTitle>
          <CardDescription>
            Scan the QR code or enter the secret manually in your authenticator app
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-center">
            {qrCode && (
              <div className="bg-white p-4 rounded-lg border inline-block mb-4">
                <img src={qrCode} alt="QR Code" className="w-48 h-48" />
              </div>
            )}
          </div>

          <div className="space-y-3">
            <Label className="text-sm font-medium text-gray-700">
              Manual Entry Secret
            </Label>
            <div className="flex items-center gap-2">
              <Input
                value={secret}
                readOnly
                className="font-mono text-sm"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={copySecret}
                className="flex items-center gap-2"
              >
                <Copy className="h-4 w-4" />
                Copy
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={downloadSecret}
                className="flex items-center gap-2"
              >
                <Download className="h-4 w-4" />
                Download
              </Button>
            </div>
            <p className="text-xs text-gray-500">
              Use this secret if you can't scan the QR code
            </p>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex">
              <AlertCircle className="h-5 w-5 text-yellow-400 mt-0.5" />
              <div className="ml-3">
                <h4 className="text-sm font-medium text-yellow-800">Important</h4>
                <p className="text-sm text-yellow-700 mt-1">
                  Save this secret in a secure location. You'll need it if you lose access to your authenticator app.
                </p>
              </div>
            </div>
          </div>

          <div className="flex justify-center">
            <Button
              onClick={() => setStep("verify")}
              className="flex items-center gap-2"
              size="lg"
            >
              I've Added the Code
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (step === "verify") {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
            <Smartphone className="h-8 w-8 text-blue-600" />
          </div>
          <CardTitle className="text-2xl">Verify Your Setup</CardTitle>
          <CardDescription>
            Enter the 6-digit code from your authenticator app
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <Label htmlFor="verificationCode" className="text-sm font-medium text-gray-700">
              Verification Code
            </Label>
            <Input
              id="verificationCode"
              type="text"
              value={verificationCode}
              onChange={(e) => setVerificationCode(e.target.value)}
              placeholder="000000"
              maxLength={6}
              className="mt-1 text-center text-lg font-mono tracking-widest"
            />
            <p className="text-xs text-gray-500 mt-1">
              Enter the 6-digit code from your authenticator app
            </p>
          </div>

          <div className="flex justify-center">
            <Button
              onClick={handleVerify2FA}
              disabled={verificationCode.length !== 6 || isLoading}
              className="flex items-center gap-2"
              size="lg"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Verifying...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4" />
                  Verify & Enable 2FA
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (step === "complete") {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
          <CardTitle className="text-2xl">Two-Factor Authentication Enabled!</CardTitle>
          <CardDescription>
            Your account is now protected with an extra layer of security
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex">
              <CheckCircle className="h-5 w-5 text-green-400 mt-0.5" />
              <div className="ml-3">
                <h4 className="text-sm font-medium text-green-800">Setup Complete</h4>
                <p className="text-sm text-green-700 mt-1">
                  From now on, you'll need to enter a verification code when signing in from new devices.
                </p>
              </div>
            </div>
          </div>

          <div className="text-center">
            <Badge variant="default" className="bg-green-100 text-green-700 border-green-200">
              <Shield className="h-3 w-3 mr-1" />
              2FA Active
            </Badge>
          </div>

          {isWizard && onComplete && (
            <div className="flex justify-center">
              <Button onClick={onComplete} size="lg">
                Continue to Dashboard
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  return null;
}
