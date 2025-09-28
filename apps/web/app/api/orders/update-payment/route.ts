import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@db/generated/client';

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { orderId, paymentIntentId, status } = body;

    if (!orderId || !paymentIntentId || !status) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields: orderId, paymentIntentId, status'
        },
        { status: 400 }
      );
    }

    // Update the order status
    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: { 
        status: status as any,
        updatedAt: new Date()
      },
    });

    // Find the latest invoice for this order and update it
    const invoice = await prisma.invoice.findFirst({
      where: { orderId },
      orderBy: { createdAt: 'desc' }
    });

    if (invoice) {
      // Update invoice status to PAID
      await prisma.invoice.update({
        where: { id: invoice.id },
        data: { 
          status: 'PAID',
          updatedAt: new Date()
        },
      });

      // Create payment record
      await prisma.payment.create({
        data: {
          invoiceId: invoice.id,
          paymentIntentId,
          amount: invoice.amount,
          currency: invoice.currency,
          status: 'SUCCEEDED',
          metadata: JSON.stringify({
            stripePaymentIntentId: paymentIntentId,
            paymentMethod: 'stripe_elements',
            processedAt: new Date().toISOString()
          })
        },
      });
    }

    return NextResponse.json({
      success: true,
      order: updatedOrder,
      message: 'Order updated successfully with payment information'
    });

  } catch (error) {
    console.error('Failed to update order with payment:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        message: 'Failed to update order with payment information'
      },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
