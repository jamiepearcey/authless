"use client";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Shield, X, AlertTriangle, CheckCircle } from "lucide-react";
import { Button } from "@ui/base";
import { Badge } from "@ui/base";
import { Card, CardContent, CardHeader, CardTitle } from "@ui/base";
import { useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc";

interface TwoFactorPromptProps {
  variant?: "banner" | "modal" | "inline";
  enforceAfter?: number; // Days until enforcement
  showReminders?: boolean;
  reminderInterval?: number; // Hours between reminders
  sensitiveAction?: boolean; // If true, blocks until 2FA is set up
  onDismiss?: () => void;
  onEnroll?: () => void;
}

interface TwoFactorConfig {
  enforceAfterDays: number;
  showReminders: boolean;
  reminderIntervalHours: number;
  gracePeriodDays: number;
}

export default function TwoFactorPrompt({
  variant = "banner",
  enforceAfter = 7,
  showReminders = true,
  reminderInterval = 24,
  sensitiveAction = false,
  onDismiss,
  onEnroll,
}: TwoFactorPromptProps) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isVisible, setIsVisible] = useState(false);
  const [dismissedUntil, setDismissedUntil] = useState<Date | null>(null);
  const [lastReminder, setLastReminder] = useState<Date | null>(null);
  const [isEnforced, setIsEnforced] = useState(false);

  // Get 2FA status only when logged in
  const { data: twoFactorStatus, isLoading: isLoadingStatus } = trpc.getTwoFactorStatus.useQuery(
    undefined,
    { enabled: !!session?.user?.id }
  );
  const { data: twoFactorMethods, isLoading: isLoadingMethods } = trpc.get2fa.useQuery(
    undefined,
    { enabled: !!session?.user?.id }
  );

  // Check if 2FA is already set up
  const has2FA = twoFactorStatus?.hasAuthenticatorCodes || 
                 twoFactorStatus?.hasPasskeys || 
                 twoFactorMethods?.some(method => method.type === "whatsapp") || false;

  // Check if user is in grace period - use current time as fallback
  // In a real implementation, you'd get this from user profile or account creation date
  const gracePeriodEnd = new Date(Date.now() + (enforceAfter * 24 * 60 * 60 * 1000));
  const isInGracePeriod = new Date() < gracePeriodEnd;

  // Check if enforcement should be triggered
  const shouldEnforce = !isInGracePeriod && !has2FA;

  // Check if reminder should be shown
  const shouldShowReminder = showReminders && 
                            !has2FA && 
                            !dismissedUntil && 
                            (!lastReminder || 
                             new Date().getTime() - lastReminder.getTime() > (reminderInterval * 60 * 60 * 1000));

  useEffect(() => {
    // Only proceed if we have a definitive state
    if (status === "loading" || !session?.user?.id || isLoadingStatus || isLoadingMethods) {
      return;
    }

    // Show prompt if 2FA is not set up
    if (!has2FA) {
      if (sensitiveAction) {
        // Always show for sensitive actions
        setIsVisible(true);
        setIsEnforced(true);
      } else if (shouldEnforce) {
        // Show enforced prompt after grace period
        setIsVisible(true);
        setIsEnforced(true);
      } else if (shouldShowReminder) {
        // Show reminder prompt
        setIsVisible(true);
        setIsEnforced(false);
      }
    } else {
      setIsVisible(false);
    }
  }, [status, session?.user?.id, has2FA, sensitiveAction, shouldEnforce, shouldShowReminder, isLoadingStatus, isLoadingMethods]);

  const handleDismiss = () => {
    if (isEnforced) {
      // Cannot dismiss enforced prompts
      return;
    }

    // Set dismissal until next reminder interval
    const nextReminder = new Date();
    nextReminder.setHours(nextReminder.getHours() + reminderInterval);
    setDismissedUntil(nextReminder);
    setLastReminder(new Date());
    setIsVisible(false);
    
    if (onDismiss) {
      onDismiss();
    }
  };

  const handleEnroll = () => {
    setIsVisible(false);
    if (onEnroll) {
      onEnroll();
    } else {
      router.push("/auth/2fa/setup");
    }
  };

  const handleSkip = () => {
    if (isEnforced) {
      // Cannot skip enforced prompts
      return;
    }
    handleDismiss();
  };

  // Don't show anything until we have a definitive authentication state
  if (status === "loading") {
    return null;
  }

  // Don't show if not logged in
  if (!session?.user?.id) {
    return null;
  }

  // Don't show if we're still loading 2FA status
  if (isLoadingStatus || isLoadingMethods) {
    return null;
  }

  // Don't show if 2FA is already set up
  if (has2FA) {
    return null;
  }

  // Don't show if not visible
  if (!isVisible) {
    return null;
  }

  const getPromptContent = () => {
    if (sensitiveAction) {
      return {
        title: "Two-Factor Authentication Required",
        description: "This action requires two-factor authentication. Please set up 2FA to continue.",
        variant: "destructive" as const,
        showSkip: false,
        showDismiss: false,
      };
    }

    if (isEnforced) {
      return {
        title: "Two-Factor Authentication Required",
        description: "Your grace period has ended. Two-factor authentication is now mandatory for account security.",
        variant: "destructive" as const,
        showSkip: false,
        showDismiss: false,
      };
    }

    return {
      title: "Enhance Your Account Security",
      description: "Protect your account with two-factor authentication. It only takes 2 minutes to set up.",
      variant: "default" as const,
      showSkip: true,
      showDismiss: true,
    };
  };

  const promptContent = getPromptContent();

  if (variant === "modal") {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
              <Shield className="h-8 w-8 text-blue-600" />
            </div>
            <CardTitle className="text-xl">{promptContent.title}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-gray-600 text-center">
              {promptContent.description}
            </p>
            
            <div className="space-y-2">
              <Button 
                onClick={handleEnroll} 
                className="w-full"
                size="lg"
              >
                <Shield className="h-4 w-4 mr-2" />
                Set Up 2FA
              </Button>
              
              {promptContent.showSkip && (
                <Button 
                  variant="outline" 
                  onClick={handleSkip}
                  className="w-full"
                >
                  Remind me later
                </Button>
              )}
            </div>

            {promptContent.showDismiss && (
              <button
                onClick={handleDismiss}
                className="text-sm text-gray-500 hover:text-gray-700 mx-auto block"
              >
                Don't show again
              </button>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (variant === "inline") {
    return (
      <Card className="border-l-4 border-l-blue-500 bg-blue-50">
        <CardContent className="p-4">
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-3">
              <Shield className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <h4 className="font-medium text-blue-900">{promptContent.title}</h4>
                <p className="text-sm text-blue-700 mt-1">{promptContent.description}</p>
                <div className="flex items-center space-x-2 mt-3">
                  <Button 
                    onClick={handleEnroll} 
                    size="sm"
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    <Shield className="h-3 w-3 mr-1" />
                    Set Up 2FA
                  </Button>
                  
                  {promptContent.showSkip && (
                    <Button 
                      variant="outline" 
                      onClick={handleSkip}
                      size="sm"
                    >
                      Later
                    </Button>
                  )}
                </div>
              </div>
            </div>
            
            {promptContent.showDismiss && (
              <button
                onClick={handleDismiss}
                className="text-blue-400 hover:text-blue-600 p-1"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Default banner variant
  return (
    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-200">
      <div className="max-w-7xl mx-auto ">
        <div className="flex items-center justify-between py-3">
          <div className="flex items-center space-x-3">
            <Shield className="h-5 w-5 text-blue-600" />
            <div>
              <p className="text-sm font-medium text-blue-900">
                {promptContent.title}
              </p>
              <p className="text-xs text-blue-700">
                {promptContent.description}
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <Button 
              onClick={handleEnroll} 
              size="sm"
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Shield className="h-3 w-3 mr-1" />
              Set Up 2FA
            </Button>
            
            {promptContent.showSkip && (
              <Button 
                variant="outline" 
                onClick={handleSkip}
                size="sm"
              >
                Later
              </Button>
            )}
            
            {promptContent.showDismiss && (
              <button
                onClick={handleDismiss}
                className="text-blue-400 hover:text-blue-600 p-1"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
