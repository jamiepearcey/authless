import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { StripeServerClient } from '@stripe/integration/server';
import Stripe from 'stripe';

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
    const body = await request.text();
    const headersList = headers();
    const signature = headersList.get('stripe-signature');

    if (!signature) {
      console.error('Missing stripe-signature header');
      return NextResponse.json(
        { error: 'Missing stripe-signature header' },
        { status: 400 }
      );
    }

    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) {
      console.error('Missing STRIPE_WEBHOOK_SECRET environment variable');
      return NextResponse.json(
        { error: 'Webhook secret not configured' },
        { status: 500 }
      );
    }

    const stripe = getStripeClient();
    const eventResult = await stripe.constructWebhookEvent(body, signature, webhookSecret);

    if (!eventResult.success) {
      console.error('Webhook signature verification failed:', eventResult.error?.message);
      return NextResponse.json(
        { error: 'Webhook signature verification failed' },
        { status: 400 }
      );
    }

    const event = eventResult.data;
    console.log('Received webhook event:', event?.type);

    switch (event?.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        console.log('Checkout session completed:', {
          sessionId: session.id,
          paymentStatus: session.payment_status,
          customerEmail: session.customer_email,
          amountTotal: session.amount_total,
          metadata: session.metadata,
        });

        if (session.payment_status === 'paid') {
          console.log('Payment successful for session:', session.id);
          
          // Check if this was a guest checkout
          const guestEmail = session.metadata?.guestEmail;
          const guestName = session.metadata?.guestName;
          const plan = session.metadata?.plan;
          
          if (guestEmail && guestName && plan) {
            console.log('Processing guest invite for:', guestEmail);
            
            // Send guest invite
            try {
              await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/payments/guest-invite`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  email: guestEmail,
                  name: guestName,
                  sessionId: session.id,
                  plan: plan,
                }),
              });
            } catch (inviteError) {
              console.error('Failed to send guest invite:', inviteError);
              // Don't fail the webhook if invite fails
            }
          }
        } else if (session.payment_status === 'unpaid') {
          // Send notification to admin about checkout session failure
          try {
            await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/webhooks/notifications`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                title: 'Checkout Session Failed',
                description: `Checkout session ${session.id} completed but payment failed for ${session.customer_email || session.metadata?.guestEmail || 'Unknown customer'}`,
                type: 'error',
                priority: 'high',
                role: 'admin',
                metadata: {
                  sessionId: session.id,
                  paymentStatus: session.payment_status,
                  customerEmail: session.customer_email || session.metadata?.guestEmail || 'Unknown',
                  amount: session.amount_total?.toString() || '0',
                  currency: session.currency || 'gbp',
                  plan: session.metadata?.plan || 'Unknown plan',
                },
              }),
            });
          } catch (notificationError) {
            console.error('Failed to send checkout failure notification:', notificationError);
          }
        }
        break;
      }

      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        console.log('Payment intent succeeded:', {
          paymentIntentId: paymentIntent.id,
          amount: paymentIntent.amount,
          currency: paymentIntent.currency,
          metadata: paymentIntent.metadata,
        });

        // Check if this was a guest payment
        const guestEmail = paymentIntent.metadata?.guestEmail;
        const guestName = paymentIntent.metadata?.guestName;
        const plan = paymentIntent.metadata?.plan;
        
        if (guestEmail && guestName && plan) {
          console.log('Processing guest invite for Elements payment:', guestEmail);
          
          // Send guest invite
          try {
            await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/payments/guest-invite`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                email: guestEmail,
                name: guestName,
                sessionId: paymentIntent.id, // Use payment intent ID as session
                plan: plan,
              }),
            });
          } catch (inviteError) {
            console.error('Failed to send guest invite for Elements payment:', inviteError);
            // Don't fail the webhook if invite fails
          }
        }
        break;
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        console.log('Payment intent failed:', {
          paymentIntentId: paymentIntent.id,
          lastPaymentError: paymentIntent.last_payment_error?.message,
        });

        // Send notification to admin about payment failure
        try {
          await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/webhooks/notifications`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              title: 'Payment Failed',
              description: `Payment intent ${paymentIntent.id} failed: ${paymentIntent.last_payment_error?.message || 'Unknown error'}`,
              type: 'error',
              priority: 'high',
              role: 'admin', // Send to all admins
              metadata: {
                paymentIntentId: paymentIntent.id,
                amount: paymentIntent.amount.toString(),
                currency: paymentIntent.currency,
                customerEmail: paymentIntent.metadata?.guestEmail || paymentIntent.receipt_email || 'Unknown',
                errorMessage: paymentIntent.last_payment_error?.message || 'Unknown error',
                errorCode: paymentIntent.last_payment_error?.code || 'unknown',
              },
            }),
          });
        } catch (notificationError) {
          console.error('Failed to send payment failure notification:', notificationError);
        }
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice;
        console.log('Invoice payment succeeded:', {
          invoiceId: invoice.id,
          subscriptionId: invoice.subscription,
          amountPaid: invoice.amount_paid,
        });
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        console.log('Invoice payment failed:', {
          invoiceId: invoice.id,
          subscriptionId: invoice.subscription,
          attemptCount: invoice.attempt_count,
        });

        // Send notification to admin about invoice payment failure
        try {
          await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/webhooks/notifications`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              title: 'Invoice Payment Failed',
              description: `Invoice payment failed for ${invoice.customer_email || 'customer'} (attempt ${invoice.attempt_count})`,
              type: 'error',
              priority: 'high',
              role: 'admin',
              metadata: {
                invoiceId: invoice.id,
                subscriptionId: invoice.subscription?.toString() || 'none',
                customerEmail: invoice.customer_email || 'Unknown',
                amount: invoice.amount_due?.toString() || '0',
                currency: invoice.currency || 'gbp',
                attemptCount: invoice.attempt_count?.toString() || '0',
              },
            }),
          });
        } catch (notificationError) {
          console.error('Failed to send invoice failure notification:', notificationError);
        }
        break;
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        console.log(`Subscription ${event.type}:`, {
          subscriptionId: subscription.id,
          customerId: subscription.customer,
          status: subscription.status,
        });
        break;
      }

      default:
        console.log('Unhandled webhook event type:', event?.type);
    }

    return NextResponse.json({ received: true });

  } catch (error: any) {
    console.error('Webhook processing error:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}