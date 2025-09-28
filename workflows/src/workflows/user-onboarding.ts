/**
 * User Onboarding Workflow
 * 
 * This workflow handles the complete user onboarding process including:
 * - Email verification
 * - Profile setup
 * - Welcome email
 * - Initial data setup
 * - Integration with existing audit system
 */

import { proxyActivities, sleep, log, condition } from '@temporalio/workflow';
import type * as activities from '../activities/user-onboarding';

// Configure activity options
const {
  sendVerificationEmail,
  verifyEmailToken,
  createUserProfile,
  sendWelcomeEmail,
  setupInitialData,
  pushToOutbox,
  notifyAdmins,
} = proxyActivities<typeof activities>({
  startToCloseTimeout: '5 minutes',
  retry: {
    initialInterval: '1s',
    maximumInterval: '60s',
    maximumAttempts: 3,
  },
});

export interface UserOnboardingParams {
  userId?: string; // For platform user onboarding
  email: string;
  name: string;
  tenantId?: string; // For tenant user onboarding
  emailVerificationToken: string;
  skipEmailVerification?: boolean;
}

export interface UserOnboardingResult {
  userId?: string;
  email: string;
  status: 'completed' | 'failed' | 'email_verification_pending';
  emailVerified: boolean;
  profileCreated: boolean;
  welcomeEmailSent: boolean;
  executionTime: number;
  workflowId: string;
}

export async function userOnboardingWorkflow(params: UserOnboardingParams): Promise<UserOnboardingResult> {
  const startTime = Date.now();
  
  // Validate business logic: onboarding is either platform user or tenant user
  // Platform User Onboarding: user registering on platform (requires userId)
  // Tenant User Onboarding: user registering within tenant (requires tenantId)
  if (!params.userId && !params.tenantId) {
    throw new Error('Either userId (for platform user onboarding) or tenantId (for tenant user onboarding) must be provided');
  }
  
  log.info('Starting User Onboarding workflow', { 
    onboardingType: params.userId ? 'platform-user' : 'tenant-user',
    userId: params.userId,
    email: params.email,
    tenantId: params.tenantId,
    skipEmailVerification: params.skipEmailVerification
  });

  let emailVerified = false;
  let profileCreated = false;
  let welcomeEmailSent = false;
  let status: 'completed' | 'failed' | 'email_verification_pending' = 'completed';

  try {
    // Step 1: Send email verification (unless skipped)
    if (!params.skipEmailVerification) {
      await sendVerificationEmail({
        email: params.email,
        name: params.name,
        token: params.emailVerificationToken,
        userId: params.userId,
      });
      
      log.info('Verification email sent', { email: params.email });
      
      // Wait for email verification (with timeout)
      const emailVerifiedResult = await condition(
        () => emailVerified,
        '24h' // 24 hour timeout for email verification
      );
      
      if (!emailVerifiedResult) {
        log.warn('Email verification timeout', { email: params.email });
        status = 'email_verification_pending';
        
        // Notify admins about pending verification
        await notifyAdmins({
          type: 'email_verification_timeout',
          userId: params.userId,
          email: params.email,
          tenantId: params.tenantId,
        });
        
        return {
          userId: params.userId,
          email: params.email,
          status,
          emailVerified: false,
          profileCreated: false,
          welcomeEmailSent: false,
          executionTime: Date.now() - startTime,
          workflowId: `user-onboarding-${params.userId}-${startTime}`,
        };
      }
    } else {
      emailVerified = true;
      log.info('Email verification skipped', { email: params.email });
    }

    // Step 2: Create user profile
    await createUserProfile({
      userId: params.userId,
      email: params.email,
      name: params.name,
      tenantId: params.tenantId,
    });
    
    profileCreated = true;
    log.info('User profile created', { userId: params.userId });

    // Step 3: Setup initial data
    await setupInitialData({
      userId: params.userId,
      tenantId: params.tenantId,
    });
    
    log.info('Initial data setup completed', { userId: params.userId });

    // Step 4: Send welcome email
    await sendWelcomeEmail({
      email: params.email,
      name: params.name,
      userId: params.userId,
      tenantId: params.tenantId,
    });
    
    welcomeEmailSent = true;
    log.info('Welcome email sent', { email: params.email });

    // Step 5: Push completion event to outbox
    await pushToOutbox({
      eventType: 'user.onboarding.completed',
      aggregateType: 'User',
      aggregateId: params.userId,
      tenantId: params.tenantId,
      payloadJson: {
        id: `onboarding-event-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        eventType: 'UserOnboardingEvent',
        eventName: 'user.onboarding.completed',
        tenantId: params.tenantId,
        userId: params.userId,
        email: params.email,
        timestamp: new Date().toISOString(),
        source: { service: 'temporal-workflows', version: '1.0.0' },
        actor: { type: 'system', id: 'temporal', name: 'Temporal Workflow' },
        resource: { type: 'User', id: params.userId },
        action: { 
          type: 'COMPLETE', 
          description: 'User onboarding completed successfully',
          outcome: 'success'
        },
        metadata: { 
          emailVerified,
          profileCreated,
          welcomeEmailSent,
          originalParams: params
        }
      }
    });

    log.info('User onboarding workflow completed successfully', { 
      userId: params.userId,
      email: params.email,
      emailVerified,
      profileCreated,
      welcomeEmailSent
    });

  } catch (error) {
    log.error('User onboarding workflow failed', { 
      userId: params.userId,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    
    status = 'failed';
    
    // Push failure event to outbox
    await pushToOutbox({
      eventType: 'user.onboarding.failed',
      aggregateType: 'User',
      aggregateId: params.userId,
      tenantId: params.tenantId,
      payloadJson: {
        id: `onboarding-event-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        eventType: 'UserOnboardingEvent',
        eventName: 'user.onboarding.failed',
        tenantId: params.tenantId,
        userId: params.userId,
        email: params.email,
        timestamp: new Date().toISOString(),
        source: { service: 'temporal-workflows', version: '1.0.0' },
        actor: { type: 'system', id: 'temporal', name: 'Temporal Workflow' },
        resource: { type: 'User', id: params.userId },
        action: { 
          type: 'FAIL', 
          description: 'User onboarding failed',
          outcome: 'failure'
        },
        metadata: { 
          error: error instanceof Error ? error.message : 'Unknown error',
          emailVerified,
          profileCreated,
          welcomeEmailSent,
          originalParams: params
        }
      }
    });
  }

  const executionTime = Date.now() - startTime;
  
  return {
    userId: params.userId,
    email: params.email,
    status,
    emailVerified,
    profileCreated,
    welcomeEmailSent,
    executionTime,
    workflowId: `user-onboarding-${params.userId}-${startTime}`,
  };
}

// Signal handler for email verification
export async function handleEmailVerificationSignal(verified: boolean): Promise<void> {
  if (verified) {
    // Note: In a real implementation, you would use a workflow signal
    // to update the emailVerified variable. For now, this is a placeholder.
    log.info('Email verification signal received', { verified });
  }
}
