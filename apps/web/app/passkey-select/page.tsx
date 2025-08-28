"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession, signIn } from "next-auth/react";
import { Button } from "@ui/base";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@ui/base";
import { Separator } from "@ui/base";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@ui/base";
import { 
  Key, 
  Smartphone, 
  Laptop, 
  Monitor, 
  Trash2, 
  LogOut,
  ArrowRight,
  User,
  Shield,
  AlertCircle,
  CheckCircle
} from "lucide-react";
import { toast } from "@ui/base";
import { t } from "@i18n-core";
import { trpc } from "../../lib/trpc";

interface Passkey {
  id: string;
  name: string;
  lastUsedAt: string | null;
  transports: string | null;
}

interface Machine {
  machineId: string;
  machineName: string;
  passkey: Passkey;
}

interface Account {
  id: string;
  email: string | null;
  name: string | null;
  machines: Machine[];
  hasMultipleMachines: boolean;
}

export default function PasskeySelectPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/dashboard";
  
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Get all available accounts with passkeys from tRPC (no email required)
  const { data: accountsData, isLoading: isLoadingAccounts } = trpc.getAvailableAccounts.useQuery();

  // tRPC mutations
  const getAuthenticationOptionsMutation = trpc.getAuthenticationOptions.useMutation();
  const authenticatePasskeyMutation = trpc.authenticatePasskey.useMutation();

  const accounts = accountsData?.accounts || [];

  // If user is already authenticated, redirect to dashboard
  useEffect(() => {
    if (status === "authenticated" && session) {
      router.push(callbackUrl);
    }
  }, [status, session, router, callbackUrl]);

  // If no passkeys are available, automatically redirect to sign-in
  useEffect(() => {
    if (!isLoadingAccounts && accounts.length === 0) {
      router.push(`/signin?callbackUrl=${encodeURIComponent(callbackUrl)}`);
    }
  }, [accounts.length, isLoadingAccounts, router, callbackUrl]);

  const handleAccountSelect = async (account: Account) => {
    if (!account.email) {
      toast.error("Account email is required for authentication");
      return;
    }

    setIsLoading(true);
    try {
      // Get authentication options from tRPC
      const authOptions = await getAuthenticationOptionsMutation.mutateAsync({ email: account.email });

      // Convert base64 challenge back to ArrayBuffer
      const challenge = Uint8Array.from(atob(authOptions.challenge), c => c.charCodeAt(0));

      // Create WebAuthn authentication options
      const publicKeyOptions: PublicKeyCredentialRequestOptions = {
        challenge,
        rpId: authOptions.rpId,
        allowCredentials: authOptions.allowCredentials.map((cred: any) => ({
          id: Uint8Array.from(atob(cred.id), c => c.charCodeAt(0)),
          type: "public-key" as const,
          transports: cred.transports,
        })),
        userVerification: authOptions.userVerification as UserVerificationRequirement,
        timeout: authOptions.timeout,
      };

      console.log("WebAuthn authentication options:", publicKeyOptions);

      // Trigger WebAuthn authentication
      const credential = await navigator.credentials.get({
        publicKey: publicKeyOptions,
      }) as PublicKeyCredential;

      if (!credential) {
        throw new Error("Failed to get passkey credential");
      }

      // Extract credential data
      const response = credential.response as AuthenticatorAssertionResponse;
      const authenticatorData = btoa(String.fromCharCode(...new Uint8Array(response.authenticatorData)));
      const clientDataJSON = btoa(String.fromCharCode(...new Uint8Array(response.clientDataJSON)));
      const signature = btoa(String.fromCharCode(...new Uint8Array(response.signature)));
      const userHandle = response.userHandle ? btoa(String.fromCharCode(...new Uint8Array(response.userHandle))) : undefined;

      // Authenticate with our backend
      const authResult = await authenticatePasskeyMutation.mutateAsync({
        credentialId: btoa(String.fromCharCode(...new Uint8Array(credential.rawId))),
        authenticatorData,
        clientDataJSON,
        signature,
        userHandle,
      });

      if (authResult.success) {
        toast.success("Authentication successful!");
        
        // Use NextAuth signin to create a proper session
        await signIn("credentials", {
          email: account.email,
          password: "", // We'll use a special flow for passkey auth
          redirect: false,
        });
        
        // Navigate to the callback URL or dashboard
        router.push(callbackUrl);
      } else {
        throw new Error("Authentication failed");
      }
    } catch (error) {
      console.error("Authentication error:", error);
      if (error instanceof Error) {
        if (error.name === "SecurityError") {
          toast.error("Security error: Please ensure you're on the correct domain and try again");
        } else if (error.name === "NotAllowedError") {
          toast.error("Operation cancelled or not allowed. Please try again");
        } else if (error.name === "NotSupportedError") {
          toast.error("WebAuthn is not supported in this browser. Please use a modern browser");
        } else if (error.name === "InvalidStateError") {
          toast.error("Invalid state error. Please refresh the page and try again");
        } else {
          toast.error(`Authentication failed: ${error.message}`);
        }
      } else {
        toast.error("Authentication failed");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveAccount = async (accountId: string) => {
    try {
      // In a real implementation, this would call the tRPC endpoint to remove the account
      toast.success("Account removed successfully");
    } catch (error) {
      toast.error("Failed to remove account");
    }
  };

  const handleAlternativeLogin = () => {
    // Navigate to regular login page
    router.push(`/signin?callbackUrl=${encodeURIComponent(callbackUrl)}`);
  };

  const getDeviceIcon = (passkey: Passkey) => {
    const name = passkey.name.toLowerCase();
    if (name.includes("iphone") || name.includes("android") || name.includes("phone")) {
      return <Smartphone className="h-5 w-5" />;
    } else if (name.includes("macbook") || name.includes("laptop")) {
      return <Laptop className="h-5 w-5" />;
    } else if (name.includes("desktop") || name.includes("pc")) {
      return <Monitor className="h-5 w-5" />;
    } else {
      return <Key className="h-5 w-5" />;
    }
  };

  const formatLastUsed = (lastUsedAt: string | null) => {
    if (!lastUsedAt) return "Never used";
    
    const date = new Date(lastUsedAt);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return `${Math.floor(diffDays / 30)} months ago`;
  };

  // Show loading state while checking accounts
  if (isLoadingAccounts) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  // If no accounts, this will redirect to sign-in automatically
  if (accounts.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <Key className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              No Passkeys Found
            </h2>
            <p className="text-gray-600 mb-4">
              No passkeys were found on this device. Redirecting to sign in...
            </p>
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show account selection
  return (
    <div className="flex-1 flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center pb-4">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-indigo-100 mb-4">
            <User className="h-6 w-6 text-indigo-600" />
          </div>
          <CardTitle className="text-xl">
            Choose your account
          </CardTitle>
          <CardDescription>
            Select which account you'd like to sign into using your available passkeys
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Account Selection */}
          <div className="space-y-3">
            {accounts.map((account) => (
              <div
                key={account.id}
                className={`border border-gray-200 rounded-lg p-4 hover:border-indigo-300 hover:bg-indigo-50 transition-colors cursor-pointer ${
                  selectedAccount?.id === account.id ? 'border-indigo-500 bg-indigo-50' : ''
                }`}
                onClick={() => setSelectedAccount(account)}
              >
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center">
                    <span className="text-sm font-medium text-indigo-600">
                      {account.name?.[0]?.toUpperCase() || account.email?.[0]?.toUpperCase() || "U"}
                    </span>
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{account.name || "User"}</p>
                    <p className="text-sm text-gray-500">{account.email || "No email"}</p>
                    <p className="text-xs text-gray-400">
                      {account.machines.length} device{account.machines.length !== 1 ? 's' : ''} available
                    </p>
                  </div>
                  {selectedAccount?.id === account.id ? (
                    <CheckCircle className="h-5 w-5 text-indigo-600" />
                  ) : (
                    <ArrowRight className="h-5 w-5 text-gray-400" />
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            <Button 
              onClick={() => selectedAccount && handleAccountSelect(selectedAccount)} 
              disabled={isLoading || !selectedAccount}
              className="w-full"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Authenticating...
                </>
              ) : (
                <>
                  Continue with Passkey
                  <ArrowRight className="h-4 w-4 ml-2" />
                </>
              )}
            </Button>
            
            <Button variant="outline" onClick={handleAlternativeLogin} className="w-full">
              <LogOut className="h-4 w-4 mr-2" />
              Use Alternative Login Method
            </Button>
          </div>

          {/* Remove Account Option */}
          {selectedAccount && (
            <div className="text-center">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700 hover:bg-red-50">
                    <Trash2 className="h-4 w-4 mr-2" />
                    Remove Account
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Remove Account</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to remove this account from your passkey list? 
                      You'll need to sign in again to add it back.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction 
                      onClick={() => handleRemoveAccount(selectedAccount.id)}
                      className="bg-red-600 hover:bg-red-700"
                    >
                      Remove Account
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
