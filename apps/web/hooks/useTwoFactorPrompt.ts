import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { trpc } from "@/lib/trpc";

interface TwoFactorPromptConfig {
  enforceAfterDays: number;
  showReminders: boolean;
  reminderIntervalHours: number;
  gracePeriodDays: number;
}

interface TwoFactorPromptState {
  isVisible: boolean;
  isEnforced: boolean;
  shouldShowReminder: boolean;
  has2FA: boolean;
  gracePeriodEnd: Date;
  isInGracePeriod: boolean;
}

export function useTwoFactorPrompt(config: Partial<TwoFactorPromptConfig> = {}) {
  const { data: session } = useSession();
  const [dismissedUntil, setDismissedUntil] = useState<Date | null>(null);
  const [lastReminder, setLastReminder] = useState<Date | null>(null);

  // Default configuration
  const defaultConfig: TwoFactorPromptConfig = {
    enforceAfterDays: 7,
    showReminders: true,
    reminderIntervalHours: 24,
    gracePeriodDays: 7,
    ...config,
  };

  // Get 2FA status
  const { data: twoFactorStatus } = trpc.getTwoFactorStatus.useQuery();
  const { data: twoFactorMethods } = trpc.get2fa.useQuery();

  // Check if 2FA is already set up
  const has2FA = twoFactorStatus?.hasAuthenticatorCodes || 
                 twoFactorStatus?.hasPasskeys || 
                 twoFactorMethods?.some(method => method.type === "whatsapp") || false;

  // Calculate grace period
  const gracePeriodEnd = new Date(Date.now() + (defaultConfig.gracePeriodDays * 24 * 60 * 60 * 1000));
  const isInGracePeriod = new Date() < gracePeriodEnd;

  // Check if enforcement should be triggered
  const shouldEnforce = !isInGracePeriod && !has2FA;

  // Check if reminder should be shown
  const shouldShowReminder = defaultConfig.showReminders && 
                            !has2FA && 
                            !dismissedUntil && 
                            (!lastReminder || 
                             new Date().getTime() - lastReminder.getTime() > (defaultConfig.reminderIntervalHours * 60 * 60 * 1000));

  // Determine if prompt should be visible
  const isVisible = !has2FA && (shouldEnforce || shouldShowReminder);
  const isEnforced = shouldEnforce;

  // Dismiss reminder until next interval
  const dismissReminder = () => {
    if (isEnforced) return;

    const nextReminder = new Date();
    nextReminder.setHours(nextReminder.getHours() + defaultConfig.reminderIntervalHours);
    setDismissedUntil(nextReminder);
    setLastReminder(new Date());
  };

  // Skip reminder (same as dismiss)
  const skipReminder = dismissReminder;

  // Reset dismissal state
  const resetDismissal = () => {
    setDismissedUntil(null);
    setLastReminder(null);
  };

  return {
    // State
    isVisible,
    isEnforced,
    shouldShowReminder,
    has2FA,
    gracePeriodEnd,
    isInGracePeriod,
    
    // Actions
    dismissReminder,
    skipReminder,
    resetDismissal,
    
    // Configuration
    config: defaultConfig,
  };
}
