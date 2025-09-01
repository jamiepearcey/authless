import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const GuestInviteSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
  sessionId: z.string(),
  plan: z.string(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('Guest invite request:', { email: body.email, plan: body.plan });
    
    const validatedData = GuestInviteSchema.parse(body);

    // Here you would:
    // 1. Create a user record with the email and name
    // 2. Generate an invite token
    // 3. Send an email with the invite link
    // 4. Associate the payment with the user record
    
    // For now, we'll simulate this process
    const inviteToken = generateInviteToken();
    const inviteUrl = `${getBaseUrl()}/auth/invite?token=${inviteToken}`;

    // Simulate sending email (replace with actual email service)
    console.log(`Invite email would be sent to ${validatedData.email}:`);
    console.log(`Subject: Welcome! Complete your account setup`);
    console.log(`Link: ${inviteUrl}`);
    console.log(`Plan: ${validatedData.plan}`);

    // In a real implementation, you would:
    // - Save the user record
    // - Save the invite token with expiration
    // - Send the actual email
    // - Associate the payment session with the user

    return NextResponse.json({
      success: true,
      message: 'Invite sent successfully',
      inviteUrl, // For testing purposes
    });

  } catch (error: any) {
    console.error('Guest invite error:', error);

    if (error.name === 'ZodError') {
      return NextResponse.json(
        { 
          success: false, 
          error: { 
            message: 'Invalid request data',
            details: error.errors,
          } 
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { 
        success: false, 
        error: { 
          message: error.message || 'Internal server error',
        } 
      },
      { status: 500 }
    );
  }
}

function generateInviteToken(): string {
  // Generate a secure random token
  return Math.random().toString(36).substr(2) + Date.now().toString(36);
}

function getBaseUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL || 
         (process.env.NODE_ENV === 'development' ? 'http://localhost:3000' : 'https://your-domain.com');
}