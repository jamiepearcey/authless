import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { StripeServerClient } from '@stripe/integration/server';
import { z } from 'zod';

const CheckoutSessionQuerySchema = z.object({
  session_id: z.string().min(1, 'Session ID is required'),
});

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

export async function GET(request: NextRequest) {
  try {
    console.log('Checkout session retrieval API called');
    
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: { message: 'Unauthorized' } },
        { status: 401 }
      );
    }

    const url = new URL(request.url);
    const sessionId = url.searchParams.get('session_id');

    if (!sessionId) {
      return NextResponse.json(
        { success: false, error: { message: 'Session ID is required' } },
        { status: 400 }
      );
    }

    const validatedData = CheckoutSessionQuerySchema.parse({ session_id: sessionId });

    const stripe = getStripeClient();

    const result = await stripe.retrieveCheckoutSession(validatedData.session_id);

    if (!result.success) {
      return NextResponse.json(
        { 
          success: false, 
          error: { 
            message: result.error?.message || 'Failed to retrieve checkout session',
            code: result.error?.code,
          } 
        },
        { status: 400 }
      );
    }

    console.log('Checkout session retrieved:', result.data?.id);

    return NextResponse.json({
      success: true,
      session: {
        id: result.data?.id,
        status: result.data?.status,
        amount_total: result.data?.amount_total,
        currency: result.data?.currency,
        customer_email: result.data?.customer_email,
        payment_status: result.data?.payment_status,
        created: result.data?.created,
        metadata: result.data?.metadata,
      },
    });

  } catch (error: any) {
    console.error('Checkout session retrieval error:', error);

    if (error.name === 'ZodError') {
      return NextResponse.json(
        { 
          success: false, 
          error: { 
            message: 'Invalid request parameters',
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