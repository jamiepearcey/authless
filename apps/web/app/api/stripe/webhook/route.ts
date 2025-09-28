import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { db } from '@db/index';

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = headers().get('stripe-signature');

  if (!signature) {
    return NextResponse.json({ error: 'No signature provided' }, { status: 400 });
  }

  let event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutSessionCompleted(event.data.object);
        break;
      case 'payment_intent.succeeded':
        await handlePaymentIntentSucceeded(event.data.object);
        break;
      case 'payment_intent.payment_failed':
        await handlePaymentIntentFailed(event.data.object);
        break;
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook handler error:', error);
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 });
  }
}

async function handleCheckoutSessionCompleted(session: any) {
  console.log('Processing checkout session completed:', session.id);
  
  const { invoiceId, orderId } = session.metadata || {};
  
  if (!invoiceId) {
    console.log('No invoiceId in session metadata, skipping');
    return;
  }

  try {
    // Find the invoice
    const invoice = await db.invoice.findFirst({
      where: { id: invoiceId },
      include: { order: true }
    });

    if (!invoice) {
      console.error('Invoice not found:', invoiceId);
      return;
    }

    // Update invoice status to PAID
    await db.invoice.update({
      where: { id: invoiceId },
      data: { 
        status: 'PAID',
        isPending: false
      }
    });

    // Create payment record
    await db.payment.create({
      data: {
        invoiceId: invoiceId,
        paymentIntentId: session.payment_intent,
        amount: session.amount_total,
        currency: session.currency,
        status: 'SUCCEEDED',
        paymentMethod: 'card',
        paymentProvider: 'stripe',
        providerTransactionId: session.payment_intent,
        processedAt: new Date(),
        metadata: JSON.stringify({
          sessionId: session.id,
          customerEmail: session.customer_email,
          customerName: session.customer_details?.name,
        })
      }
    });

    // Update order status if this was the only pending invoice
    const pendingInvoices = await db.invoice.count({
      where: { 
        orderId: invoice.orderId,
        status: { not: 'PAID' }
      }
    });

    if (pendingInvoices === 0) {
      // Check if this is a subscription order
      const order = await db.order.findUnique({
        where: { id: invoice.orderId },
        select: { isSubscription: true }
      });

      // Set appropriate status based on order type
      const newStatus = order?.isSubscription ? 'UP_TO_DATE' : 'COMPLETED';
      
      await db.order.update({
        where: { id: invoice.orderId },
        data: { status: newStatus }
      });
    }

    console.log('Successfully processed payment for invoice:', invoiceId);
  } catch (error) {
    console.error('Error processing checkout session completed:', error);
    throw error;
  }
}

async function handlePaymentIntentSucceeded(paymentIntent: any) {
  console.log('Processing payment intent succeeded:', paymentIntent.id);
  
  // This is handled by checkout.session.completed, but we can add additional logic here if needed
}

async function handlePaymentIntentFailed(paymentIntent: any) {
  console.log('Processing payment intent failed:', paymentIntent.id);
  
  // Find payment record and update status
  try {
    await db.payment.updateMany({
      where: { paymentIntentId: paymentIntent.id },
      data: { 
        status: 'FAILED',
        failureReason: paymentIntent.last_payment_error?.message || 'Payment failed',
        failedAt: new Date()
      }
    });
  } catch (error) {
    console.error('Error updating failed payment:', error);
  }
}
