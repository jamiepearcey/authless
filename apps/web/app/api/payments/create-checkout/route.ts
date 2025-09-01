import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { StripeServerClient } from '@stripe/integration/server';
import { z } from 'zod';

const CreateCheckoutSchema = z.object({
  amount: z.number().positive().min(30), // Minimum £0.30 for GBP
  currency: z.string().default('gbp'),
  quantity: z.number().default(1),
  product_name: z.string().default('Payment'),
  product_description: z.string().optional(),
  customerId: z.string().optional(),
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
    console.log('Checkout session API called');
    
    // Parse request body
    const body = await request.json();
    
    // Check authentication (allow guest users if they provide email)
    const session = await getServerSession();
    const isGuestCheckout = body.metadata?.guestEmail && body.metadata?.guestName;
    
    if (!session?.user && !isGuestCheckout) {
      return NextResponse.json(
        { success: false, error: { message: 'Authentication required' } },
        { status: 401 }
      );
    }
    console.log('Checkout request:', { 
      amount: body.amount, 
      product_name: body.product_name,
      currency: body.currency 
    });
    
    const validatedData = CreateCheckoutSchema.parse(body);

    // Initialize Stripe client
    const stripe = getStripeClient();

    // Get base URL for redirects
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 
                   (process.env.NODE_ENV === 'development' ? 'http://localhost:3000' : request.headers.get('origin'));

    // Add user information to metadata
    const metadata = session?.user ? {
      userId: session.user.id,
      userEmail: session.user.email || '',
      ...validatedData.metadata,
    } : {
      // Guest checkout metadata
      guestEmail: body.metadata?.guestEmail || '',
      guestName: body.metadata?.guestName || '',
      ...validatedData.metadata,
    };

    // Create checkout session
    const result = await stripe.createCheckoutSession({
      line_items: [{
        price_data: {
          currency: validatedData.currency,
          product_data: {
            name: validatedData.product_name,
            description: validatedData.product_description,
          },
          unit_amount: validatedData.amount,
        },
        quantity: validatedData.quantity,
      }],
      mode: 'payment',
      success_url: `${baseUrl}/payments/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/payments/cancel?session_id={CHECKOUT_SESSION_ID}`,
      customer_email: session?.user?.email || body.metadata?.guestEmail || undefined,
      customer: validatedData.customerId,
      metadata,
    });

    if (!result.success) {
      return NextResponse.json(
        { 
          success: false, 
          error: { 
            message: result.error?.message || 'Failed to create checkout session',
            code: result.error?.code,
          } 
        },
        { status: 400 }
      );
    }

    console.log('Checkout session created:', result.data?.id);

    return NextResponse.json({
      success: true,
      checkoutUrl: result.data?.url,
      sessionId: result.data?.id,
    });

  } catch (error: any) {
    console.error('Checkout session creation error:', error);

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