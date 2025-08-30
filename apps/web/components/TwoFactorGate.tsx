"use client";
import { ReactNode } from "react";
import { useTwoFactorPrompt } from "@/hooks/useTwoFactorPrompt";
import TwoFactorPrompt from "./TwoFactorPrompt";

interface TwoFactorGateProps {
  children: ReactNode;
  action?: string; // Description of the sensitive action
  fallback?: ReactNode; // What to show if 2FA is required
  config?: {
    enforceAfterDays?: number;
    showReminders?: boolean;
    reminderIntervalHours?: number;
  };
}

export default function TwoFactorGate({ 
  children, 
  action = "this action",
  fallback,
  config = {}
}: TwoFactorGateProps) {
  const { isVisible, isEnforced, has2FA } = useTwoFactorPrompt({
    ...config,
    enforceAfterDays: config.enforceAfterDays || 0, // 0 means immediate enforcement for sensitive actions
  });

  // If 2FA is set up, show the children
  if (has2FA) {
    return <>{children}</>;
  }

  // If 2FA is required and visible, show the prompt
  if (isVisible) {
    return (
      <>
        <TwoFactorPrompt
          variant="modal"
          sensitiveAction={true}
          enforceAfter={config.enforceAfterDays || 0}
          showReminders={false}
        />
        {fallback || (
          <div className="p-8 text-center">
            <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
              <svg className="h-8 w-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Two-Factor Authentication Required
            </h3>
            <p className="text-gray-600 mb-4">
              To perform {action}, you must first set up two-factor authentication for your account.
            </p>
            <p className="text-sm text-gray-500">
              This helps protect your account and the sensitive data you're trying to access.
            </p>
          </div>
        )}
      </>
    );
  }

  // If 2FA is not required yet, show the children
  return <>{children}</>;
}

// Higher-order component for wrapping components that require 2FA
export function withTwoFactorRequirement<P extends object>(
  Component: React.ComponentType<P>,
  action: string,
  config?: TwoFactorGateProps["config"]
) {
  return function TwoFactorWrappedComponent(props: P) {
    return (
      <TwoFactorGate action={action} config={config}>
        <Component {...props} />
      </TwoFactorGate>
    );
  };
}
