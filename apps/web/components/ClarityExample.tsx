// Example usage of Microsoft Clarity integration
// This component demonstrates how to use Clarity with your existing lead tracking

'use client';

import { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useMicrosoftClarity } from './MicrosoftClarity';
import { useLeadTracking } from '@/hooks/useLeadTracking';

export function ClarityExample() {
  const { data: session } = useSession();
  const { trackEvent, identifyUser, setCustomData, setConsent } = useMicrosoftClarity();
  const { trackPageVisit } = useLeadTracking();

  useEffect(() => {
    // Example: Track page view when component mounts
    trackEvent('page_view_example');
    
    // Example: Set consent (you might want to integrate with your cookie consent)
    setConsent(true);
    
    // Example: Set custom data for segmentation
    setCustomData('user_type', session?.user ? 'authenticated' : 'anonymous');
    
    // Example: Use existing lead tracking (which now includes Clarity)
    trackPageVisit({ section: 'example_page' });
  }, [trackEvent, setConsent, setCustomData, session, trackPageVisit]);

  useEffect(() => {
    // Example: Identify user when session changes
    if (session?.user) {
      identifyUser(
        session.user.email || session.user.id || 'unknown',
        session.user.name || undefined
      );
      setCustomData('subscription_status', 'active'); // Example custom data
    }
  }, [session, identifyUser, setCustomData]);

  return (
    <div className="p-4 border rounded-md bg-gray-50">
      <h3 className="text-lg font-semibold mb-2">Microsoft Clarity Integration</h3>
      <p className="text-sm text-gray-600 mb-4">
        This example shows how Clarity is integrated with your existing analytics.
      </p>
      
      <div className="space-y-2">
        <button
          onClick={() => trackEvent('example_button_click')}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Track Custom Event
        </button>
        
        <button
          onClick={() => setCustomData('last_action', 'button_clicked')}
          className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
        >
          Set Custom Data
        </button>
      </div>
    </div>
  );
}

// Example of integrating Clarity events into your business logic
export function useEnhancedTracking() {
  const { trackEvent } = useMicrosoftClarity();
  const leadTracking = useLeadTracking();

  const trackWithBothSystems = async (eventName: string, leadParams: any) => {
    // Track in Clarity for user behavior analysis
    trackEvent(eventName);
    
    // Track in your lead system for business metrics
    await leadTracking.trackLead(leadParams);
  };

  return {
    ...leadTracking,
    trackWithBothSystems
  };
}