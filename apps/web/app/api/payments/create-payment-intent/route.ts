import { NextRequest, NextResponse } from 'next/server';
import { getServerSession, getToken } from 'next-auth';
import { StripeServerClient } from '@stripe/integration/server';
import { z } from 'zod';

const CreatePaymentIntentSchema = z.object({
  amount: z.number().positive().min(30),
  currency: z.string().default('gbp'),
  customerId: z.string().optional(),
  metadata: z.record(z.any()).optional(), // Allow any type in metadata, we'll convert to strings
  description: z.string().optional(),
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

export async function POST(request: NextRequest) {
  try {
    console.log('Payment intent creation API called');
    
    // Parse request body
    const body = await request.json();
    
    // Check authentication (allow guest users if they provide email)
    const session = await getServerSession();
    const isGuestCheckout = body.metadata?.guestEmail && body.metadata?.guestName;
    
    console.log('Session data:', { 
      hasSession: !!session, 
      hasUser: !!session?.user, 
      userId: session?.user?.id,
      userEmail: session?.user?.email,
      isGuestCheckout 
    });
    
    // For authenticated users, ensure we have a valid session
    if (session?.user && !session.user.id) {
      console.error('Session user missing ID, attempting to get from token');
      // Try to get user ID from the request headers or token
      const authHeader = request.headers.get('authorization');
      if (authHeader) {
        console.log('Found authorization header:', authHeader);
      }
      
      // If we have a user email but no ID, try to look up the user
      if (session.user.email) {
        try {
          const { db } = await import('@db/base');
          const user = await db.user.findUnique({
            where: { email: session.user.email },
            select: { id: true }
          });
          
          if (user?.id) {
            console.log('Found user ID from email lookup:', user.id);
            session.user.id = user.id;
          }
        } catch (lookupError) {
          console.error('Failed to lookup user by email:', lookupError);
        }
      }
      
      // If still no user ID, try to get it from the token
      if (!session.user.id) {
        try {
          const token = await getToken({ req: request });
          if (token?.sub) {
            console.log('Found user ID from token:', token.sub);
            session.user.id = token.sub;
          }
        } catch (tokenError) {
          console.error('Failed to get token:', tokenError);
        }
      }
    }
    
    if (!session?.user && !isGuestCheckout) {
      return NextResponse.json(
        { success: false, error: { message: 'Authentication required' } },
        { status: 401 }
      );
    }
    console.log('Payment intent request:', { 
      amount: body.amount, 
      currency: body.currency,
      description: body.description 
    });
    
    const validatedData = CreatePaymentIntentSchema.parse(body);

    const stripe = getStripeClient();

    // Ensure we have valid metadata and convert all values to strings
    let metadata: Record<string, string> = {};
    
    // Helper function to convert any value to string
    const convertToStringMetadata = (obj: Record<string, any>): Record<string, string> => {
      const result: Record<string, string> = {};
      for (const [key, value] of Object.entries(obj || {})) {
        if (value !== null && value !== undefined) {
          result[key] = String(value);
        }
      }
      return result;
    };
    
    if (session?.user) {
      // Authenticated user checkout
      if (!session.user.id) {
        console.error('Session user missing ID:', session.user);
        return NextResponse.json(
          { success: false, error: { message: 'User session invalid - missing user ID' } },
          { status: 400 }
        );
      }
      
      metadata = {
        userId: session.user.id,
        userEmail: session.user.email || '',
        ...convertToStringMetadata(validatedData.metadata),
      };
    } else {
      // Guest checkout
      if (!body.metadata?.guestEmail || !body.metadata?.guestName) {
        console.error('Guest checkout missing required fields:', body.metadata);
        return NextResponse.json(
          { success: false, error: { message: 'Guest checkout requires email and name' } },
          { status: 400 }
        );
      }
      
      metadata = {
        guestEmail: String(body.metadata.guestEmail),
        guestName: String(body.metadata.guestName),
        ...convertToStringMetadata(validatedData.metadata),
      };
    }
    
    console.log('Final metadata:', metadata);

    const result = await stripe.createPaymentIntent({
      amount: validatedData.amount,
      currency: validatedData.currency,
      metadata,
      description: validatedData.description,
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

    console.log('Payment intent created:', result.data?.id);

    return NextResponse.json({
      success: true,
      clientSecret: result.data?.client_secret,
      paymentIntentId: result.data?.id,
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