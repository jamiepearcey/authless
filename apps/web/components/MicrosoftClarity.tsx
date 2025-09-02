'use client';

import Script from 'next/script';

interface MicrosoftClarityProps {
  projectId?: string;
}

declare global {
  interface Window {
    clarity?: (action: string, ...args: any[]) => void;
  }
}

export function MicrosoftClarity({ projectId }: MicrosoftClarityProps) {
  const clarityId = projectId || process.env.NEXT_PUBLIC_CLARITY_PROJECT_ID;

  // Don't render script if no project ID
  if (!clarityId) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('Microsoft Clarity: No project ID provided. Set NEXT_PUBLIC_CLARITY_PROJECT_ID environment variable.');
    }
    return null;
  }

  return (
    <Script
      id="microsoft-clarity-init"
      strategy="afterInteractive"
      dangerouslySetInnerHTML={{
        __html: `
          (function(c,l,a,r,i,t,y){
            c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
            t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
            y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
          })(window, document, "clarity", "script", "${clarityId}");
          
          // Initialize Clarity queue
          window.clarity = window.clarity || function(){(window.clarity.q=window.clarity.q||[]).push(arguments)};
        `
      }}
    />
  );
}

// Utility functions for Clarity tracking
export const clarity = {
  identify: (userId: string, sessionId?: string, pageId?: string, friendlyName?: string) => {
    if (typeof window !== 'undefined' && window.clarity) {
      try {
        window.clarity('identify', userId, sessionId, pageId, friendlyName);
      } catch (error) {
        console.warn('Microsoft Clarity identify failed:', error);
      }
    }
  },

  consent: (hasConsent: boolean) => {
    if (typeof window !== 'undefined' && window.clarity) {
      try {
        window.clarity('consent', hasConsent);
      } catch (error) {
        console.warn('Microsoft Clarity consent failed:', error);
      }
    }
  },

  event: (eventName: string) => {
    if (typeof window !== 'undefined' && window.clarity) {
      try {
        window.clarity('event', eventName);
      } catch (error) {
        console.warn('Microsoft Clarity event tracking failed:', error);
      }
    }
  },

  set: (key: string, value: string) => {
    if (typeof window !== 'undefined' && window.clarity) {
      try {
        window.clarity('set', key, value);
      } catch (error) {
        console.warn('Microsoft Clarity set failed:', error);
      }
    }
  },

  upgrade: (reason: string) => {
    if (typeof window !== 'undefined' && window.clarity) {
      try {
        window.clarity('upgrade', reason);
      } catch (error) {
        console.warn('Microsoft Clarity upgrade failed:', error);
      }
    }
  },

  // Note: CSS capture is handled automatically by Microsoft Clarity
  // There are no public APIs to enable/disable CSS capture programmatically
  
  // Apply data attributes for masking sensitive content
  maskElement: (selector: string) => {
    if (typeof window !== 'undefined' && typeof document !== 'undefined') {
      try {
        const elements = document.querySelectorAll(selector);
        elements.forEach(element => {
          element.setAttribute('data-clarity-mask', 'true');
        });
      } catch (error) {
        console.warn('Microsoft Clarity element masking failed:', error);
      }
    }
  },

  // Remove masking from elements
  unmaskElement: (selector: string) => {
    if (typeof window !== 'undefined' && typeof document !== 'undefined') {
      try {
        const elements = document.querySelectorAll(selector);
        elements.forEach(element => {
          element.setAttribute('data-clarity-unmask', 'true');
          element.removeAttribute('data-clarity-mask');
        });
      } catch (error) {
        console.warn('Microsoft Clarity element unmasking failed:', error);
      }
    }
  },

  // Apply region masking (for larger content areas)
  maskRegion: (selector: string) => {
    if (typeof window !== 'undefined' && typeof document !== 'undefined') {
      try {
        const elements = document.querySelectorAll(selector);
        elements.forEach(element => {
          element.setAttribute('data-clarity-region', 'mask');
        });
      } catch (error) {
        console.warn('Microsoft Clarity region masking failed:', error);
      }
    }
  }
};

// Hook for easy Clarity integration
export function useMicrosoftClarity() {
  const trackEvent = (eventName: string) => {
    if (!eventName || typeof eventName !== 'string') {
      console.warn('Microsoft Clarity: Invalid event name provided');
      return;
    }
    clarity.event(eventName);
  };

  const identifyUser = (userId: string, friendlyName?: string) => {
    if (!userId || typeof userId !== 'string') {
      console.warn('Microsoft Clarity: Invalid user ID provided');
      return;
    }
    clarity.identify(userId, undefined, undefined, friendlyName);
  };

  const setCustomData = (key: string, value: string) => {
    if (!key || !value || typeof key !== 'string' || typeof value !== 'string') {
      console.warn('Microsoft Clarity: Invalid custom data provided');
      return;
    }
    clarity.set(key, value);
  };

  const setConsent = (hasConsent: boolean) => {
    if (typeof hasConsent !== 'boolean') {
      console.warn('Microsoft Clarity: Invalid consent value provided');
      return;
    }
    clarity.consent(hasConsent);
  };

  const maskElement = (selector: string) => {
    if (!selector || typeof selector !== 'string') {
      console.warn('Microsoft Clarity: Invalid selector provided for masking');
      return;
    }
    clarity.maskElement(selector);
  };

  const unmaskElement = (selector: string) => {
    if (!selector || typeof selector !== 'string') {
      console.warn('Microsoft Clarity: Invalid selector provided for unmasking');
      return;
    }
    clarity.unmaskElement(selector);
  };

  const maskRegion = (selector: string) => {
    if (!selector || typeof selector !== 'string') {
      console.warn('Microsoft Clarity: Invalid selector provided for region masking');
      return;
    }
    clarity.maskRegion(selector);
  };

  return {
    trackEvent,
    identifyUser,
    setCustomData,
    setConsent,
    maskElement,
    unmaskElement,
    maskRegion
  };
}