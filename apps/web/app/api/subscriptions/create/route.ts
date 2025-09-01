import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { StripeServerClient } from '@stripe/integration/server';
import { z } from 'zod';

const CreateSubscriptionSchema = z.object({
  customerId: z.string(),
  priceId: z.string(),
  paymentMethodId: z.string().optional(),
  trialPeriodDays: z.number().optional(),
  metadata: z.record(z.string()).optional(),
});

// Initialize Stripe client
const getStripeClient = () => {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!secretKey || !publishableKey || !webhookSecret) {
    throw new Error('Missing required Stripe environment variables');
  }

  return new StripeServerClient({
    secretKey,
    publishableKey,
    webhookSecret,
  });
};

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: { message: 'Unauthorized' } },
        { status: 401 }
      );
    }

    // Parse request body
    const body = await request.json();
    const validatedData = CreateSubscriptionSchema.parse(body);

    // Initialize Stripe client
    const stripe = getStripeClient();

    // Add user information to metadata
    const metadata = {
      userId: session.user.id,
      userEmail: session.user.email || '',
      source: 'web-app',
      ...validatedData.metadata,
    };

    // Create subscription
    const result = await stripe.createSubscription({
      customerId: validatedData.customerId,
      priceId: validatedData.priceId,
      trial_period_days: validatedData.trialPeriodDays,
      metadata,
    });

    if (!result.success) {
      return NextResponse.json(
        { 
          success: false, 
          error: { 
            message: result.error?.message || 'Failed to create subscription',
            code: result.error?.code,
          } 
        },
        { status: 400 }
      );
    }

    // Extract client secret safely
    let clientSecret: string | undefined;
    if (result.data?.latest_invoice && typeof result.data.latest_invoice === 'object') {
      const invoice = result.data.latest_invoice as any;
      clientSecret = invoice?.payment_intent?.client_secret;
    }

    return NextResponse.json({
      success: true,
      subscription: result.data,
      clientSecret,
    });

  } catch (error: any) {
    console.error('Subscription creation error:', error);

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