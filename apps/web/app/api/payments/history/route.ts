import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { StripeServerClient } from '@stripe/integration/server';

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

export async function GET() {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json(
        { success: false, error: { message: 'Unauthorized' } },
        { status: 401 }
      );
    }

    const stripe = getStripeClient();

    // Get payment intents for this user
    const paymentIntentsResult = await stripe.rawStripe.paymentIntents.list({
      limit: 50,
    });

    // Get checkout sessions for this user  
    const checkoutSessionsResult = await stripe.rawStripe.checkout.sessions.list({
      limit: 50,
    });

    // Filter and format payment data
    const userEmail = session.user.email;
    
    const payments = [];
    const orders = [];

    // Process Payment Intents (from Elements flow) - only successful ones with charges
    if (paymentIntentsResult.data) {
      for (const pi of paymentIntentsResult.data) {
        const isUserPayment = pi.metadata?.userId === session.user.id || 
                             pi.receipt_email === userEmail ||
                             pi.metadata?.guestEmail === userEmail;
        
        // Only include succeeded payments that actually have charges (complete transactions)
        if (isUserPayment && pi.status === 'succeeded' && pi.charges?.data?.length > 0) {
          payments.push({
            id: pi.id,
            type: 'payment_intent',
            amount: pi.amount,
            currency: pi.currency,
            status: pi.status,
            created: pi.created,
            description: pi.description,
            receiptUrl: pi.charges?.data?.[0]?.receipt_url,
            metadata: pi.metadata,
          });
        }
      }
    }

    // Process Checkout Sessions (from redirect flow)  
    if (checkoutSessionsResult.data) {
      for (const cs of checkoutSessionsResult.data) {
        const isUserSession = cs.metadata?.userId === session.user.id || 
                             cs.customer_email === userEmail ||
                             cs.metadata?.guestEmail === userEmail;
        
        if (isUserSession) {
          // This represents an "order" - the intent to purchase
          // Only include orders that are complete or have payment issues (exclude expired)
          const includeOrder = cs.status !== 'expired' && 
                              (cs.payment_status === 'paid' || 
                               cs.payment_status === 'unpaid' || 
                               cs.status === 'open');
                              
          if (includeOrder) {
            orders.push({
              id: cs.id,
              type: 'order',
              amount: cs.amount_total || 0,
              currency: cs.currency || 'gbp',
              status: cs.status,
              paymentStatus: cs.payment_status,
              created: cs.created,
              description: cs.metadata?.plan || 'Purchase',
              customerEmail: cs.customer_email,
              metadata: cs.metadata,
              paymentIntentId: cs.payment_intent,
              canRetry: cs.payment_status === 'unpaid' || cs.status === 'open',
            });
          }

          // If there's an associated payment that was successful, add it too
          if (cs.payment_intent && cs.payment_status === 'paid') {
            payments.push({
              id: cs.payment_intent as string,
              type: 'checkout_payment',
              orderId: cs.id,
              amount: cs.amount_total || 0,
              currency: cs.currency || 'gbp',
              status: 'succeeded',
              created: cs.created,
              description: `Payment for ${cs.metadata?.plan || 'Purchase'}`,
              metadata: cs.metadata,
            });
          }
        }
      }
    }

    // Sort by creation date (newest first)
    payments.sort((a, b) => b.created - a.created);
    orders.sort((a, b) => b.created - a.created);

    return NextResponse.json({
      success: true,
      data: {
        payments,
        orders,
        summary: {
          totalPayments: payments.length,
          totalOrders: orders.length,
          totalSpent: payments
            .filter(p => p.status === 'succeeded')
            .reduce((sum, p) => sum + p.amount, 0),
          successfulPayments: payments.filter(p => p.status === 'succeeded').length,
        }
      }
    });

  } catch (error: any) {
    console.error('Payment history error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: { 
          message: error.message || 'Failed to fetch payment history',
        } 
      },
      { status: 500 }
    );
  }
}