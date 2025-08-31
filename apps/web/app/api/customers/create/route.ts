import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { StripeServerClient } from '@stripe/integration/server';
import { z } from 'zod';

const CreateCustomerSchema = z.object({
  email: z.string().email(),
  name: z.string().optional(),
  phone: z.string().optional(),
  metadata: z.record(z.string()).optional(),
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
    const validatedData = CreateCustomerSchema.parse(body);

    // Initialize Stripe client
    const stripe = getStripeClient();

    // Add user information to metadata
    const metadata = {
      userId: session.user.id,
      source: 'web-app',
      ...validatedData.metadata,
    };

    // Create customer
    const result = await stripe.createCustomer({
      email: validatedData.email,
      name: validatedData.name,
      phone: validatedData.phone,
      metadata,
    });

    if (!result.success) {
      return NextResponse.json(
        { 
          success: false, 
          error: { 
            message: result.error?.message || 'Failed to create customer',
            code: result.error?.code,
          } 
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      customer: result.data,
    });

  } catch (error: any) {
    console.error('Customer creation error:', error);

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