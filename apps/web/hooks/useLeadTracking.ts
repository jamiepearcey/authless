import { useSession } from 'next-auth/react';
import { useCallback } from 'react';

type LeadEvent = 'page_visit' | 'plan_selection' | 'checkout_started' | 'payment_attempted' | 'payment_completed' | 'payment_failed';

interface TrackLeadParams {
  event: LeadEvent;
  email?: string;
  name?: string;
  metadata?: Record<string, string>;
}

export function useLeadTracking() {
  const { data: session } = useSession();

  const trackLead = useCallback(async ({ event, email, name, metadata }: TrackLeadParams) => {
    try {
      const response = await fetch('/api/leads/track', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          event,
          email,
          name,
          metadata,
        }),
      });

      const data = await response.json();
      
      if (!data.success) {
        console.error('Lead tracking failed:', data.error?.message);
      }

      return data;
    } catch (error) {
      console.error('Lead tracking error:', error);
      return { success: false, error: { message: 'Network error' } };
    }
  }, []);

  // Convenience methods for common events
  const trackPageVisit = useCallback((metadata?: Record<string, string>) => {
    return trackLead({ event: 'page_visit', metadata });
  }, [trackLead]);

  const trackPlanSelection = useCallback((planName: string, metadata?: Record<string, string>) => {
    return trackLead({ 
      event: 'plan_selection', 
      metadata: { plan: planName, ...metadata } 
    });
  }, [trackLead]);

  const trackCheckoutStarted = useCallback((planName: string, email?: string, name?: string, metadata?: Record<string, string>) => {
    return trackLead({ 
      event: 'checkout_started', 
      email,
      name,
      metadata: { plan: planName, ...metadata } 
    });
  }, [trackLead]);

  const trackPaymentAttempted = useCallback((planName: string, amount: number, email?: string, name?: string, metadata?: Record<string, string>) => {
    return trackLead({ 
      event: 'payment_attempted', 
      email,
      name,
      metadata: { 
        plan: planName, 
        amount: amount.toString(),
        ...metadata 
      } 
    });
  }, [trackLead]);

  const trackPaymentCompleted = useCallback((planName: string, amount: number, paymentIntentId?: string, metadata?: Record<string, string>) => {
    return trackLead({ 
      event: 'payment_completed', 
      metadata: { 
        plan: planName, 
        amount: amount.toString(),
        paymentIntentId: paymentIntentId || '',
        ...metadata 
      } 
    });
  }, [trackLead]);

  const trackPaymentFailed = useCallback((planName: string, amount: number, error: string, metadata?: Record<string, string>) => {
    return trackLead({ 
      event: 'payment_failed', 
      metadata: { 
        plan: planName, 
        amount: amount.toString(),
        error,
        ...metadata 
      } 
    });
  }, [trackLead]);

  return {
    trackLead,
    trackPageVisit,
    trackPlanSelection,
    trackCheckoutStarted,
    trackPaymentAttempted,
    trackPaymentCompleted,
    trackPaymentFailed,
  };
}