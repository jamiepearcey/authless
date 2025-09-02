// Microsoft Clarity CSS Configuration
// This component helps ensure proper CSS handling for session recordings and heatmaps

'use client';

import { useEffect } from 'react';
import { useMicrosoftClarity } from './MicrosoftClarity';

interface ClarityCssConfigProps {
  maskSelectors?: string[];
  unmaskSelectors?: string[];
  autoConfigure?: boolean;
}

export function ClarityCssConfig({ 
  maskSelectors = [], 
  unmaskSelectors = [],
  autoConfigure = true 
}: ClarityCssConfigProps) {
  const { maskElement, unmaskElement } = useMicrosoftClarity();

  useEffect(() => {
    if (!autoConfigure) return;

    // Note: CSS capture is handled automatically by Microsoft Clarity
    // No manual configuration is needed or available via API

    // Mask sensitive elements (common patterns)
    const defaultMaskSelectors = [
      '[data-sensitive]',
      '[data-private]',
      '.sensitive',
      '.private',
      'input[type="password"]',
      'input[type="email"]',
      '.credit-card',
      '.ssn',
      '.social-security'
    ];

    const allMaskSelectors = [...defaultMaskSelectors, ...maskSelectors];
    allMaskSelectors.forEach(selector => {
      maskElement(selector);
    });

    // Unmask specific elements if needed
    unmaskSelectors.forEach(selector => {
      unmaskElement(selector);
    });

  }, [maskSelectors, unmaskSelectors, autoConfigure, maskElement, unmaskElement]);

  return null; // This component doesn't render anything
}

// Utility hook for CSS-related Clarity operations
export function useClarityCss() {
  const { maskElement, unmaskElement, maskRegion } = useMicrosoftClarity();

  const maskSensitiveElements = (selectors: string[]) => {
    selectors.forEach(selector => maskElement(selector));
  };

  const unmaskElements = (selectors: string[]) => {
    selectors.forEach(selector => unmaskElement(selector));
  };

  const maskSensitiveRegions = (selectors: string[]) => {
    selectors.forEach(selector => maskRegion(selector));
  };

  return {
    maskSensitiveElements,
    unmaskElements,
    maskSensitiveRegions,
    maskElement,
    unmaskElement,
    maskRegion
  };
}

// CSS Best Practices for Microsoft Clarity:
/*
CSS Capture is handled automatically by Microsoft Clarity. To ensure proper CSS capture:

1. Use absolute URLs for CSS files in production (not relative paths)
2. Ensure CSS files are publicly accessible without authentication
3. Avoid blocking Microsoft's CSS fetching with firewall rules
4. Use data attributes for content masking:
   - data-clarity-mask="true" to mask elements
   - data-clarity-unmask="true" to unmask specific content
   - data-clarity-region="mask" to mask entire regions
5. Test session recordings to verify CSS is captured correctly

Common CSS capture issues:
- Relative CSS paths (use absolute paths instead)
- CSS files behind authentication
- Firewall rules blocking Microsoft's crawlers
- CDN configuration issues

Example usage:
<ClarityCssConfig 
  maskSelectors={['.sensitive-data', '.private-info']}
  unmaskSelectors={['.public-content']}
/>

// In your HTML/JSX, use data attributes:
<div data-clarity-mask="true">Sensitive content</div>
<div data-clarity-region="mask">Entire masked region</div>
*/

