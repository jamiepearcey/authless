import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { StripeServerClient } from '@stripe/integration/server';
import { z } from 'zod';

const CreatePaymentIntentSchema = z.object({
  amount: z.number().positive().min(30), // Minimum £0.30 for GBP
  currency: z.string().default('gbp'),
  customerId: z.string().optional(),
  metadata: z.record(z.string()).optional(),
  description: z.string().optional(),
});

// Initialize Stripe client
const getStripeClient = () => {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  const publishableKey = process.env.STRIPE_PUBLISHABLE_KEY;
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
    const validatedData = CreatePaymentIntentSchema.parse(body);

    // Initialize Stripe client
    const stripe = getStripeClient();

    // Add user information to metadata
    const metadata = {
      userId: session.user.id,
      userEmail: session.user.email || '',
      ...validatedData.metadata,
    };

    // Create payment intent
    const result = await stripe.createPaymentIntent({
      amount: validatedData.amount,
      currency: validatedData.currency,
      metadata,
      description: validatedData.description || `Payment for ${session.user.email}`,
      automatic_payment_methods: {
        enabled: true,
      },
    });

    if (!result.success) {
      return NextResponse.json(
        { 
          success: false, 
          error: { 
            message: result.error?.message || 'Failed to create payment intent',
            code: result.error?.code,
          } 
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      paymentIntent: result.data,
      clientSecret: result.data?.client_secret,
    });

  } catch (error: any) {
    console.error('Payment intent creation error:', error);

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

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: { message: 'Unauthorized' } },
        { status: 401 }
      );
    }

    // Get payment intent ID from query params
    const { searchParams } = new URL(request.url);
    const paymentIntentId = searchParams.get('payment_intent');

    if (!paymentIntentId) {
      return NextResponse.json(
        { success: false, error: { message: 'Payment intent ID is required' } },
        { status: 400 }
      );
    }

    // Initialize Stripe client
    const stripe = getStripeClient();

    // Retrieve payment intent
    const result = await stripe.retrievePaymentIntent(paymentIntentId);

    if (!result.success) {
      return NextResponse.json(
        { 
          success: false, 
          error: { 
            message: result.error?.message || 'Failed to retrieve payment intent',
            code: result.error?.code,
          } 
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      paymentIntent: result.data,
    });

  } catch (error: any) {
    console.error('Payment intent retrieval error:', error);

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