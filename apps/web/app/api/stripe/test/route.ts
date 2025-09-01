import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Simple test endpoint to verify API is working
    return NextResponse.json({
      success: true,
      message: 'Stripe test endpoint is working',
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Test endpoint error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Test endpoint failed' 
      },
      { status: 500 }
    );
  }
}

export async function POST() {
  try {
    // Test the environment variables
    const hasStripeKey = !!process.env.STRIPE_SECRET_KEY;
    const hasPublishableKey = !!process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
    const hasWebhookSecret = !!process.env.STRIPE_WEBHOOK_SECRET;

    return NextResponse.json({
      success: true,
      message: 'Stripe configuration test',
      config: {
        hasStripeKey,
        hasPublishableKey,
        hasWebhookSecret,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Test endpoint error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Configuration test failed' 
      },
      { status: 500 }
    );
  }
}