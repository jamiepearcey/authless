/**
 * User Onboarding Activities
 * 
 * Activities for the user onboarding workflow that handle external interactions
 * like email sending, database operations, and API calls.
 */

export interface SendVerificationEmailParams {
  email: string;
  name: string;
  token: string;
  userId: string;
}

export interface CreateUserProfileParams {
  userId: string;
  email: string;
  name: string;
  tenantId: string;
}

export interface SetupInitialDataParams {
  userId: string;
  tenantId: string;
}

export interface SendWelcomeEmailParams {
  email: string;
  name: string;
  userId: string;
  tenantId: string;
}

export interface NotifyAdminsParams {
  type: string;
  userId: string;
  email: string;
  tenantId: string;
}

export async function sendVerificationEmail(params: SendVerificationEmailParams): Promise<void> {
  console.log('📧 Sending verification email:', { email: params.email, userId: params.userId });
  
  // In a real implementation, you would:
  // 1. Use your email service (SendGrid, Mailgun, etc.)
  // 2. Generate a verification link with the token
  // 3. Send a templated email
  
  // Simulate email sending
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  console.log('✅ Verification email sent successfully');
}

export async function verifyEmailToken(token: string): Promise<boolean> {
  console.log('🔍 Verifying email token:', token);
  
  // In a real implementation, you would:
  // 1. Check the token in your database
  // 2. Validate token expiration
  // 3. Mark email as verified
  
  // Simulate token verification
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // For demo purposes, always return true
  // In production, you'd check the actual token
  const isValid = token.length > 10;
  
  console.log('✅ Email token verification result:', isValid);
  return isValid;
}

export async function createUserProfile(params: CreateUserProfileParams): Promise<void> {
  console.log('👤 Creating user profile:', { userId: params.userId, email: params.email });
  
  // In a real implementation, you would:
  // 1. Connect to your database
  // 2. Insert user profile data
  // 3. Set up default preferences
  // 4. Create user-specific resources
  
  // Simulate database operations
  await new Promise(resolve => setTimeout(resolve, 1500));
  
  console.log('✅ User profile created successfully');
}

export async function setupInitialData(params: SetupInitialDataParams): Promise<void> {
  console.log('📊 Setting up initial data:', { userId: params.userId, tenantId: params.tenantId });
  
  // In a real implementation, you would:
  // 1. Create default workspace/tenant settings
  // 2. Set up user permissions
  // 3. Initialize user-specific data structures
  // 4. Create default configurations
  
  // Simulate data setup
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  console.log('✅ Initial data setup completed');
}

export async function sendWelcomeEmail(params: SendWelcomeEmailParams): Promise<void> {
  console.log('🎉 Sending welcome email:', { email: params.email, userId: params.userId });
  
  // In a real implementation, you would:
  // 1. Use your email service
  // 2. Send a personalized welcome email
  // 3. Include getting started information
  // 4. Add links to important resources
  
  // Simulate email sending
  await new Promise(resolve => setTimeout(resolve, 800));
  
  console.log('✅ Welcome email sent successfully');
}

export async function notifyAdmins(params: NotifyAdminsParams): Promise<void> {
  console.log('🔔 Notifying admins:', { type: params.type, userId: params.userId });
  
  // In a real implementation, you would:
  // 1. Find admin users for the tenant
  // 2. Send notifications via email, Slack, etc.
  // 3. Log to admin dashboard
  // 4. Create support tickets if needed
  
  // Simulate admin notification
  await new Promise(resolve => setTimeout(resolve, 300));
  
  console.log('✅ Admin notification sent');
}

export async function pushToOutbox(eventData: any): Promise<void> {
  console.log('📦 Pushing to outbox:', eventData);
  
  try {
    // In a real implementation, you would:
    // 1. Connect to your database
    // 2. Insert into your OutboxEvent table
    // 3. Let your OutboxProcessor pick it up
    // 4. Publish to NATS JetStream
    // 5. Have your services consume the events
    
    const outboxEvent = {
      id: crypto.randomUUID(),
      eventType: eventData.eventType,
      aggregateType: eventData.aggregateType,
      aggregateId: eventData.aggregateId,
      tenantId: eventData.tenantId,
      payloadJson: eventData.payloadJson,
      createdAt: new Date().toISOString(),
      processed: false,
    };
    
    console.log('📝 Outbox event created:', outboxEvent);
    
    // Simulate database insertion
    await new Promise(resolve => setTimeout(resolve, 200));
    
    console.log('✅ Event pushed to outbox successfully');
    
  } catch (error) {
    console.error('❌ Failed to push to outbox:', error);
    throw new Error(`Failed to push event to outbox: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
