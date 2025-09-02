"use client";
import { useState, useEffect, useCallback } from "react";
// import { t } from "@i18n-core";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, OtpInput } from "@ui/base";
import { Button, Input, Label } from "@ui/base";
import { Badge } from "@ui/base";
import { Shield, Smartphone, CheckCircle, AlertCircle, ArrowRight, QrCode, Copy, Download, Key, MessageCircle, Plus } from "lucide-react";

import { trpc } from "@/lib/trpc";
import { toast } from "@ui/base";
import QRCode from 'react-qr-code';
import { PhoneNumberInput } from "@/components/PhoneNumberInput";
import { useSession } from "next-auth/react";

// WebAuthn type declarations
declare global {
  interface Window {
    PublicKeyCredential: typeof PublicKeyCredential;
  }
}

interface TwoFactorSetupProps {
  isWizard?: boolean;
  onComplete?: () => void;
  onSkip?: () => void;
}

export default function TwoFactorSetup({ isWizard = false, onComplete, onSkip }: TwoFactorSetupProps) {
  const { data: session } = useSession();
  const [step, setStep] = useState<"method-selection" | "authenticator-setup" | "authenticator-verify" | "whatsapp-setup" | "whatsapp-verify" | "passkey-setup" | "complete">("method-selection");
  const [selectedMethod, setSelectedMethod] = useState<"authenticator" | "whatsapp" | "passkey" | null>(null);
  
  // Authenticator state
  const [qrCode, setQrCode] = useState<string>("");
  const [secret, setSecret] = useState<string>("");
  const [verificationCode, setVerificationCode] = useState("");
  const [authenticatorName, setAuthenticatorName] = useState("My Authenticator");
  
  // WhatsApp state
  const [phoneNumber, setPhoneNumber] = useState("");
  const [countryCode, setCountryCode] = useState("44");
  const [fullPhoneNumber, setFullPhoneNumber] = useState("");
  const [whatsappVerificationCode, setWhatsappVerificationCode] = useState("");
  const [isPhoneValid, setIsPhoneValid] = useState(false);
  
  // Passkey state
  const [passkeyName, setPasskeyName] = useState("");
  const [supportedMethods, setSupportedMethods] = useState<string[]>([]);
  
  const [isLoading, setIsLoading] = useState(false);

  // Debug logging
  console.log("TwoFactorSetup render - step:", step, "selectedMethod:", selectedMethod, "isLoading:", isLoading);

  // Check for supported passkey methods
  useEffect(() => {
    const methods = [];
    if (typeof window !== "undefined" && window.PublicKeyCredential) {
      methods.push("WebAuthn");
    }
    if (typeof navigator !== "undefined" && navigator.credentials) {
      methods.push("Credentials API");
    }
    setSupportedMethods(methods);
  }, []);

  const setup2FA = trpc.generateAuthenticatorCode.useMutation({
    onSuccess: (data) => {
      console.log("2FA setup success:", data);
      setQrCode(data.qrCodeUrl);
      setSecret(data.secret);
      // Don't change step - stay on authenticator-setup to show QR code
      console.log("State updated - qrCode:", data.qrCodeUrl, "secret:", data.secret, "step remains: authenticator-setup");
    },
    onError: (error) => {
      console.error("2FA setup mutation error:", error);
      toast.error(error.message);
    },
  });

  const verify2FA = trpc.verifyAndCreateAuthenticatorCode.useMutation({
    onSuccess: async (data) => {
      console.log("2FA verification success:", data);
      toast.success("Authenticator 2FA enabled successfully!");
      // Refetch 2FA status to update UI
      await refetchTwoFactorStatus();
      await refetchTwoFactorMethods();
      setStep("method-selection");
      // Reset form
      setVerificationCode("");
      setQrCode("");
      setSecret("");
    },
    onError: (error) => {
      console.error("2FA verification mutation error:", error);
      toast.error(error.message);
    },
  });

  // WhatsApp 2FA mutations
  const enableWhatsApp = trpc.enableWhatsapp2fa.useMutation({
    onSuccess: () => {
      toast.success("Verification code sent to your WhatsApp!");
      setStep("whatsapp-verify");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const verifyWhatsApp = trpc.verifyWhatsappActivation.useMutation({
    onSuccess: async () => {
      toast.success("WhatsApp 2FA enabled successfully!");
      // Refetch 2FA status to update UI
      await refetchTwoFactorStatus();
      await refetchTwoFactorMethods();
      setStep("method-selection");
      // Reset form
      setWhatsappVerificationCode("");
      setPhoneNumber("");
      setFullPhoneNumber("");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  // Passkey mutations
  const getRegistrationOptions = trpc.getRegistrationOptions.useMutation();
  const registerPasskey = trpc.registerPasskey.useMutation({
    onSuccess: async () => {
      toast.success("Passkey added successfully!");
      // Refetch 2FA status to update UI
      await refetchTwoFactorStatus();
      await refetchTwoFactorMethods();
      setStep("method-selection");
      // Reset form
      setPasskeyName("");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleSetup2FA = useCallback(async () => {
    console.log("handleSetup2FA called, current state:", { step, qrCode, secret, isLoading });
    
    // Prevent multiple calls
    if (isLoading || qrCode) {
      console.log("Skipping setup - already loading or QR code exists");
      return;
    }
    
    setIsLoading(true);
    try {
      console.log("Setting up 2FA...");
      const result = await setup2FA.mutateAsync({name: "My Authenticator"});
      console.log("2FA setup result:", result);
      console.log("State after setup:", { qrCode, secret, step });
    } catch (error) {
      console.error("2FA setup error:", error);
      // Handled by mutation
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, qrCode, setup2FA]);

  // Auto-generate QR code when entering authenticator setup
  useEffect(() => {
    if (step === "authenticator-setup" && !qrCode && !isLoading) {
      console.log("Auto-generating QR code for authenticator setup");
      // Small delay to ensure component is fully rendered
      const timer = setTimeout(() => {
        handleSetup2FA();
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [step, qrCode, isLoading, handleSetup2FA]);



  const handleVerify2FA = async () => {
    if (!verificationCode.trim()) {
      toast.error("Please enter the verification code");
      return;
    }

    if (!secret) {
      toast.error("No secret available for verification");
      return;
    }

    setIsLoading(true);
    try {
      console.log("Verifying 2FA code...", { code: verificationCode, secret: secret });
      const result = await verify2FA.mutateAsync({ 
        code: verificationCode,
        name: authenticatorName,
        secret: secret
      });
      console.log("2FA verification result:", result);
    } catch (error) {
      console.error("2FA verification error:", error);
      // Handled by mutation
    } finally {
      setIsLoading(false);
    }
  };

  // WhatsApp handlers
  const handlePhoneNumberChange = (value: string, code: string) => {
    console.log("Phone number changed:", value, "code:", code);
    setPhoneNumber(value);
    setCountryCode(code);
    setFullPhoneNumber(`+${code}${value}`);
  };

  const handlePhoneValidationChange = (isValid: boolean) => {
    console.log("Phone validation changed:", isValid, "for phone:", phoneNumber);
    setIsPhoneValid(isValid);
  };

  const handleWhatsAppSetup = async () => {
    if (!isPhoneValid || !fullPhoneNumber) {
      toast.error("Please enter a valid phone number");
      return;
    }
    
    setIsLoading(true);
    try {
      await enableWhatsApp.mutateAsync({
        phoneE164: fullPhoneNumber
      });
    } catch (error) {
      // Handled by mutation
    } finally {
      setIsLoading(false);
    }
  };

  const handleWhatsAppVerify = async () => {
    if (!whatsappVerificationCode || whatsappVerificationCode.length !== 6) {
      toast.error("Please enter a valid 6-digit code");
      return;
    }
    
    setIsLoading(true);
    try {
      await verifyWhatsApp.mutateAsync({
        code: whatsappVerificationCode
      });
    } catch (error) {
      // Handled by mutation
    } finally {
      setIsLoading(false);
    }
  };

  // Passkey handlers
  const handlePasskeySetup = async () => {
    if (!passkeyName.trim()) {
      toast.error("Please enter a name for your passkey");
      return;
    }

    if (!session?.user?.id) {
      toast.error("User session not found. Please log in again.");
      return;
    }

    // Check if WebAuthn is supported
    if (typeof window === "undefined" || !window.PublicKeyCredential) {
      toast.error("WebAuthn is not supported in this browser");
      return;
    }

    if (!navigator.credentials) {
      toast.error("Credentials API is not supported in this browser");
      return;
    }

    setIsLoading(true);
    try {
      // Get registration options from tRPC
      const options = await getRegistrationOptions.mutateAsync({
        userId: session.user.id,
      });

      // Ensure the page is focused before triggering WebAuthn
      if (document.hasFocus && !document.hasFocus()) {
        toast.error("Please ensure this tab is focused before adding a passkey");
        return;
      }

      // Convert base64 challenge back to ArrayBuffer
      const challenge = Uint8Array.from(atob(options.challenge), c => c.charCodeAt(0));
      
      // Convert user ID from base64 back to ArrayBuffer
      const userId = Uint8Array.from(atob(options.user.id), c => c.charCodeAt(0));

      // Create WebAuthn registration options
      const publicKeyOptions: PublicKeyCredentialCreationOptions = {
        challenge,
        rp: options.rp,
        user: {
          id: userId,
          name: options.user.name,
          displayName: options.user.displayName,
        },
        pubKeyCredParams: options.pubKeyCredParams.map(param => ({
          alg: param.alg,
          type: "public-key" as const,
        })),
        timeout: options.timeout,
        attestation: options.attestation as AttestationConveyancePreference,
        authenticatorSelection: {
          authenticatorAttachment: options.authenticatorSelection.authenticatorAttachment as AuthenticatorAttachment,
          userVerification: options.authenticatorSelection.userVerification as UserVerificationRequirement,
          requireResidentKey: options.authenticatorSelection.requireResidentKey,
        },
        excludeCredentials: options.excludeCredentials,
      };

      // Trigger WebAuthn registration
      const credential = await navigator.credentials.create({
        publicKey: publicKeyOptions,
      }) as PublicKeyCredential;

      if (!credential) {
        throw new Error("Failed to create passkey credential");
      }

      // Extract credential data
      const response = credential.response as AuthenticatorAttestationResponse;
      const credentialId = btoa(String.fromCharCode(...new Uint8Array(credential.rawId)));
      const publicKey = btoa(String.fromCharCode(...new Uint8Array(response.getPublicKey() || new ArrayBuffer(0))));

      // Get transports if available
      let transports: string[] | undefined;
      if ('getTransports' in response && typeof response.getTransports === 'function') {
        transports = response.getTransports();
      }

      // Register the passkey with our backend
      await registerPasskey.mutateAsync({
        userId: session.user.id,
        name: passkeyName,
        credentialId,
        publicKey,
        signCount: 0,
        transports,
        backupEligible: response.attestationObject ? true : false,
        backupState: false,
        userVerification: "preferred",
        rpId: options.rp.id, // Include the relying party ID (domain)
      });
    } catch (error) {
      console.error("Failed to add passkey:", error);
      
      // Handle specific WebAuthn errors
      if (error instanceof Error) {
        if (error.name === "SecurityError") {
          toast.error("Security error: Please ensure you're on the correct domain and try again");
        } else if (error.name === "NotAllowedError") {
          toast.error("Operation cancelled or not allowed. Please ensure the tab is focused and try again");
        } else if (error.name === "NotSupportedError") {
          toast.error("WebAuthn is not supported in this browser. Please use a modern browser with WebAuthn support");
        } else if (error.name === "InvalidStateError") {
          toast.error("Invalid state error. Please refresh the page and try again");
        } else {
          toast.error(`Failed to add passkey: ${error.message}`);
        }
      } else {
        toast.error("Failed to add passkey");
      }
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

  // Check current 2FA status to show progress
  const { data: twoFactorStatus, refetch: refetchTwoFactorStatus } = trpc.getTwoFactorStatus.useQuery();
  const { data: twoFactorMethods, refetch: refetchTwoFactorMethods } = trpc.get2fa.useQuery();

  const hasAuthenticator = twoFactorStatus?.hasAuthenticatorCodes || false;
  const hasWhatsApp = twoFactorMethods?.some(method => method.type === "whatsapp") || false;
  const hasPasskeys = twoFactorStatus?.hasPasskeys || false;
  const passkeySupported = supportedMethods.length > 0;

  // Check if all available methods are set up
  const allMethodsSetup = (hasAuthenticator && hasWhatsApp && (hasPasskeys || !passkeySupported)) || 
                         (hasAuthenticator && !passkeySupported && hasWhatsApp) ||
                         (hasWhatsApp && !passkeySupported && hasAuthenticator) ||
                         (hasAuthenticator && !passkeySupported && !hasWhatsApp) ||
                         (hasWhatsApp && !passkeySupported && !hasAuthenticator);

  // If all methods are set up, go to complete
  useEffect(() => {
    if (allMethodsSetup && step !== "complete") {
      setStep("complete");
    }
  }, [allMethodsSetup, step]);

  // Refetch 2FA status when returning to method selection
  useEffect(() => {
    if (step === "method-selection") {
      console.log("Refreshing 2FA status on method selection step");
      refetchTwoFactorStatus();
      refetchTwoFactorMethods();
    }
  }, [step, refetchTwoFactorStatus, refetchTwoFactorMethods]);



  if (step === "method-selection") {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
            <Shield className="h-8 w-8 text-blue-600" />
          </div>
          <CardTitle className="text-2xl">Set Up Two-Factor Authentication</CardTitle>
          <CardDescription>
            Choose your preferred 2FA method to add an extra layer of security
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Authenticator App Option */}
            <div className={`border rounded-lg p-4 transition-colors cursor-pointer ${
              hasAuthenticator 
                ? 'border-green-200 bg-green-50' 
                : 'border-gray-200 hover:border-blue-300'
            }`}
                 onClick={() => {
                   if (!hasAuthenticator) {
                     setSelectedMethod("authenticator");
                     setStep("authenticator-setup");
                     // Auto-generate QR code when entering setup
                     setTimeout(() => handleSetup2FA(), 100);
                   }
                 }}>
              <div className="text-center">
                <div className="flex items-center justify-center mb-3">
                  <QrCode className="h-12 w-12 text-indigo-600" />
                  {hasAuthenticator && (
                    <CheckCircle className="h-6 w-6 text-green-600 ml-2" />
                  )}
                </div>
                <h4 className="font-medium text-gray-900 mb-2">Authenticator App</h4>
                <p className="text-sm text-gray-600 mb-2">Use apps like Google Authenticator or Authy</p>
                {hasAuthenticator && (
                  <Badge variant="default" className="bg-green-100 text-green-700 border-green-200">
                    ✓ Set Up
                  </Badge>
                )}
              </div>
            </div>

            {/* WhatsApp Option */}
            <div className={`border rounded-lg p-4 transition-colors cursor-pointer ${
              hasWhatsApp 
                ? 'border-green-200 bg-green-50' 
                : 'border-gray-200 hover:border-blue-300'
            }`}
                 onClick={() => {
                   if (!hasWhatsApp) {
                     setSelectedMethod("whatsapp");
                     setStep("whatsapp-setup");
                   }
                 }}>
              <div className="text-center">
                <div className="flex items-center justify-center mb-3">
                  <MessageCircle className="h-12 w-12 text-green-600" />
                  {hasWhatsApp && (
                    <CheckCircle className="h-6 w-6 text-green-600 ml-2" />
                  )}
                </div>
                <h4 className="font-medium text-gray-900 mb-2">WhatsApp</h4>
                <p className="text-sm text-gray-600 mb-2">Receive codes via WhatsApp messages</p>
                {hasWhatsApp && (
                  <Badge variant="default" className="bg-green-100 text-green-700 border-green-200">
                    ✓ Set Up
                  </Badge>
                )}
              </div>
            </div>

            {/* Passkey Option - Only show if supported */}
            {passkeySupported && (
              <div className={`border rounded-lg p-4 transition-colors cursor-pointer ${
                hasPasskeys 
                  ? 'border-green-200 bg-green-50' 
                  : 'border-gray-200 hover:border-blue-300'
              }`}
                   onClick={() => {
                     if (!hasPasskeys) {
                       setSelectedMethod("passkey");
                       setStep("passkey-setup");
                     }
                   }}>
                <div className="text-center">
                  <div className="flex items-center justify-center mb-3">
                    <Key className="h-12 w-12 text-purple-600" />
                    {hasPasskeys && (
                      <CheckCircle className="h-6 w-6 text-green-600 ml-2" />
                    )}
                  </div>
                  <h4 className="font-medium text-gray-900 mb-2">Passkey</h4>
                  <p className="text-sm text-gray-600 mb-2">Use biometrics or security keys</p>
                  {hasPasskeys && (
                    <Badge variant="default" className="bg-green-100 text-green-700 border-green-200">
                      ✓ Set Up
                    </Badge>
                  )}
                </div>
              </div>
            )}
          </div>

          {isWizard && onSkip && (
            <div className="text-center mt-6">
              <Button
                variant="outline"
                onClick={onSkip}
                size="lg"
              >
                Skip for now
              </Button>
              <p className="text-sm text-gray-500 mt-2">
                You can always enable 2FA later in your account settings
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  if (step === "authenticator-setup") {
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
            {qrCode ? (
              <div className="bg-white p-4 rounded-lg border inline-block mb-4">
                <QRCode value={qrCode} size={200} />
              </div>
            ) : (
              <div className="bg-gray-100 p-4 rounded-lg border inline-block mb-4">
                <p className="text-gray-500">Generating QR code...</p>
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

          <div className="space-y-3">
            <Button
              onClick={() => setStep("authenticator-verify")}
              className="w-full flex items-center justify-center gap-2"
              size="lg"
            >
              I've Added the Code
              <ArrowRight className="h-4 w-4" />
            </Button>
            
            <div className="text-center">
              <Button
                variant="outline"
                onClick={() => setStep("method-selection")}
                size="sm"
              >
                ← Back to 2FA Options
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (step === "whatsapp-setup") {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
            <MessageCircle className="h-8 w-8 text-green-600" />
          </div>
          <CardTitle className="text-2xl">Set Up WhatsApp 2FA</CardTitle>
          <CardDescription>
            Enter your phone number to receive verification codes via WhatsApp
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <Label>Phone Number</Label>
            <PhoneNumberInput
              value={phoneNumber}
              onChange={handlePhoneNumberChange}
              onValidationChange={handlePhoneValidationChange}
              className="mt-1"
            />
            <p className="text-xs text-gray-500 mt-1">
              We'll send a verification code to this number via WhatsApp
            </p>
          </div>
          
          <Button
            onClick={handleWhatsAppSetup}
            disabled={!isPhoneValid || !phoneNumber.trim() || isLoading}
            className={`w-full ${(!isPhoneValid || !phoneNumber.trim()) ? 'opacity-50 cursor-not-allowed' : ''}`}
            size="lg"
          >
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                Sending Code...
              </>
            ) : (!isPhoneValid || !phoneNumber.trim()) ? (
              <>
                <MessageCircle className="h-4 w-4 mr-2" />
                Enter Valid Phone Number
              </>
            ) : (
              <>
                <MessageCircle className="h-4 w-4 mr-2" />
                Send Verification Code
              </>
            )}
          </Button>

          <div className="text-center">
            <Button
              variant="outline"
              onClick={() => setStep("method-selection")}
              size="sm"
            >
              ← Back to 2FA Options
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (step === "whatsapp-verify") {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
            <MessageCircle className="h-8 w-8 text-green-600" />
          </div>
          <CardTitle className="text-2xl">Verify WhatsApp Code</CardTitle>
          <CardDescription>
            Enter the 6-digit verification code sent to your WhatsApp
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <Label htmlFor="whatsappVerificationCode" className="text-sm font-medium text-gray-700">
              Verification Code
            </Label>
            <OtpInput
              value={whatsappVerificationCode}
              onChange={(value) => setWhatsappVerificationCode(value)}
              onComplete={(value) => setWhatsappVerificationCode(value)}
              autoFocus
              length={6}
              isInvalid={whatsappVerificationCode.length !== 6}
              ariaLabel="Enter the 6-digit code from WhatsApp"
              name="whatsapp-otp"
              className="w-full"
            />
            <p className="text-xs text-gray-500 mt-1">
              Enter the 6-digit code from your WhatsApp
            </p>
          </div>

          <div className="flex flex-col items-center space-y-3">
            <Button
              onClick={handleWhatsAppVerify}
              disabled={whatsappVerificationCode.length !== 6 || isLoading}
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
                  Verify & Enable WhatsApp 2FA
                </>
              )}
            </Button>
            
            <Button
              variant="outline"
              onClick={() => setStep("method-selection")}
              size="sm"
            >
              ← Back to 2FA Options
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (step === "passkey-setup") {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mb-4">
            <Key className="h-8 w-8 text-purple-600" />
          </div>
          <CardTitle className="text-2xl">Set Up Passkey</CardTitle>
          <CardDescription>
            Use biometric authentication or security keys for passwordless sign-in
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <Label htmlFor="passkeyName">Passkey Name</Label>
            <Input
              id="passkeyName"
              value={passkeyName}
              onChange={(e) => setPasskeyName(e.target.value)}
              placeholder="e.g., My Phone, Work Laptop"
              className="mt-1"
            />
            <p className="text-xs text-gray-500 mt-1">
              Choose a name to identify this passkey
            </p>
          </div>
          
          {supportedMethods.length > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-sm text-blue-800">
                ✅ WebAuthn supported: {supportedMethods.join(", ")}
              </p>
            </div>
          )}

          <Button
            onClick={handlePasskeySetup}
            disabled={!passkeyName.trim() || isLoading || supportedMethods.length === 0}
            className="w-full"
            size="lg"
          >
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                Setting Up Passkey...
              </>
            ) : (
              <>
                <Key className="h-4 w-4 mr-2" />
                Set Up Passkey
              </>
            )}
          </Button>

          <div className="text-center">
            <Button
              variant="outline"
              onClick={() => setStep("method-selection")}
              size="sm"
            >
              ← Back to 2FA Options
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (step === "authenticator-verify") {
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
            <OtpInput
                  value={verificationCode}
                  onChange={(value) => setVerificationCode(value)}
                  onComplete={(value) => setVerificationCode(value)}
                  autoFocus
                  length={6}
                  isInvalid={verificationCode.length !== 6}
                  ariaLabel="Enter the 6-digit code from your authenticator app"
                  name="otp"
                  className="w-full"
                />
                
            <p className="text-xs text-gray-500 mt-1">
              Enter the 6-digit code from your authenticator app
            </p>
          </div>

          <div className="flex flex-col items-center space-y-3">
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
            
            <Button
              variant="outline"
              onClick={() => setStep("method-selection")}
              size="sm"
            >
              ← Back to 2FA Options
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
          <CardTitle className="text-2xl">Two-Factor Authentication Setup Complete!</CardTitle>
          <CardDescription>
            Your account is now protected with multiple layers of security
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex">
              <CheckCircle className="h-5 w-5 text-green-400 mt-0.5" />
              <div className="ml-3">
                <h4 className="text-sm font-medium text-green-800">All Methods Set Up</h4>
                <p className="text-sm text-green-700 mt-1">
                  You've successfully configured all available 2FA methods for your account.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {hasAuthenticator && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-center">
                <QrCode className="h-8 w-8 text-indigo-600 mx-auto mb-2" />
                <p className="text-sm font-medium text-green-800">Authenticator App</p>
                <p className="text-xs text-green-600">✓ Configured</p>
              </div>
            )}
            
            {hasWhatsApp && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-center">
                <MessageCircle className="h-8 w-8 text-green-600 mx-auto mb-2" />
                <p className="text-sm font-medium text-green-800">WhatsApp</p>
                <p className="text-xs text-green-600">✓ Configured</p>
              </div>
            )}
            
            {hasPasskeys && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-center">
                <Key className="h-8 w-8 text-purple-600 mx-auto mb-2" />
                <p className="text-sm font-medium text-green-800">Passkey</p>
                <p className="text-xs text-green-600">✓ Configured</p>
              </div>
            )}
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
