// Microsoft Clarity Configuration
// This file shows how to configure Microsoft Clarity with your project ID

'use client';

import { MicrosoftClarity } from './MicrosoftClarity';

// Example configuration component
export function ClarityConfig() {
  // You can either pass the project ID directly or use environment variable
  const projectId = process.env.NEXT_PUBLIC_CLARITY_PROJECT_ID;
  
  // For development/testing, you can use a placeholder project ID
  // In production, make sure to set NEXT_PUBLIC_CLARITY_PROJECT_ID in your environment
  const devProjectId = process.env.NODE_ENV === 'development' ? 'dev-project-id' : undefined;
  
  return (
    <MicrosoftClarity projectId={projectId || devProjectId} />
  );
}

// Configuration instructions:
/*
To set up Microsoft Clarity:

1. Go to https://clarity.microsoft.com/
2. Sign in with your Microsoft account
3. Create a new project
4. Copy the project ID from the setup instructions
5. Add the project ID to your environment variables:

   In your .env.local file (for development):
   NEXT_PUBLIC_CLARITY_PROJECT_ID="your-project-id-here"

   In your production environment:
   NEXT_PUBLIC_CLARITY_PROJECT_ID="your-production-project-id"

6. The MicrosoftClarity component will automatically load when the project ID is set

Example project ID format: "abc123def456" (alphanumeric string)
*/

