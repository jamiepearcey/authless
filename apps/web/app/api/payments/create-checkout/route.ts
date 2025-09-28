import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const body = await request.json();
    
    const {
      amount,
      currency = 'gbp',
      description,
      metadata = {},
      successUrl,
      cancelUrl,
    } = body;

    if (!amount || amount <= 0) {
      return NextResponse.json(
        { success: false, error: { message: 'Invalid amount' } },
        { status: 400 }
      );
    }

    // Add session information to metadata
    const enhancedMetadata = {
      ...metadata,
      ...(session?.user ? {
        userId: session.user.id,
        userEmail: session.user.email,
      } : {}),
    };

    // Create Stripe checkout session
    const checkoutSession = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: currency.toLowerCase(),
            product_data: {
              name: description || 'Purchase',
              description: metadata.plan || 'Payment',
            },
            unit_amount: amount,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: successUrl || `${process.env.NEXTAUTH_URL}/payments/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancelUrl || `${process.env.NEXTAUTH_URL}/checkout?cancelled=true`,
      metadata: enhancedMetadata,
      ...(session?.user ? {
        customer_email: session.user.email,
      } : metadata.guestEmail ? {
        customer_email: metadata.guestEmail,
      } : {}),
    });

    return NextResponse.json({
      success: true,
      url: checkoutSession.url,
      sessionId: checkoutSession.id,
    });

  } catch (error) {
    console.error('Stripe checkout session creation failed:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: { 
          message: error instanceof Error ? error.message : 'Failed to create checkout session' 
        } 
      },
      { status: 500 }
    );
  }
}