/**
 * Payment Processing Workflow API Route
 * 
 * Triggers payment processing workflows via HTTP POST requests.
 * Example: POST /api/workflows/payment-processing
 */

import { NextRequest, NextResponse } from 'next/server';

// Import Temporal client functions
async function startPaymentProcessingWorkflow(params: any, workflowId?: string) {
  try {
    const { startPaymentProcessingWorkflow } = await import('@authless/workflows/client');
    return await startPaymentProcessingWorkflow(params, workflowId);
  } catch (error) {
    console.error('Failed to start payment processing workflow:', error);
    throw new Error('Failed to start payment processing workflow. Make sure Temporal server is running.');
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate required fields
    const requiredFields = ['userId', 'tenantId', 'amount', 'currency', 'paymentMethodId', 'description'];
    for (const field of requiredFields) {
      if (!body[field]) {
        return NextResponse.json(
          { 
            success: false,
            error: `Missing required field: ${field}`,
            message: `Please provide a ${field} in the request body`
          },
          { status: 400 }
        );
      }
    }

    // Prepare workflow parameters
    const workflowParams = {
      userId: body.userId,
      tenantId: body.tenantId,
      amount: Number(body.amount),
      currency: body.currency,
      paymentMethodId: body.paymentMethodId,
      subscriptionPlanId: body.subscriptionPlanId,
      invoiceId: body.invoiceId,
      description: body.description,
      metadata: body.metadata || {},
    };

    // Validate input
    if (workflowParams.amount <= 0) {
      return NextResponse.json(
        { error: 'Amount must be greater than 0' },
        { status: 400 }
      );
    }

    if (workflowParams.currency.length !== 3) {
      return NextResponse.json(
        { error: 'Currency must be a 3-letter code (e.g., USD, EUR)' },
        { status: 400 }
      );
    }

    if (workflowParams.description.length > 500) {
      return NextResponse.json(
        { error: 'Description too long (max 500 characters)' },
        { status: 400 }
      );
    }

    console.log('🚀 Starting Payment Processing workflow:', workflowParams);

    // Start the workflow
    const { workflowId, result } = await startPaymentProcessingWorkflow(
      workflowParams,
      body.workflowId
    );

    // POST requests can optionally wait for completion
    if (body.waitForResult) {
      try {
        const workflowResult = await result;
        
        return NextResponse.json({
          success: true,
          workflowId,
          status: 'completed',
          result: workflowResult,
          message: 'Payment processing workflow completed successfully',
        });
      } catch (workflowError) {
        console.error('Payment processing workflow execution failed:', workflowError);
        
        return NextResponse.json({
          success: false,
          workflowId,
          status: 'failed',
          error: 'Payment processing workflow execution failed',
          message: workflowError instanceof Error ? workflowError.message : 'Unknown workflow error',
        }, { status: 500 });
      }
    }

    return NextResponse.json({
      success: true,
      workflowId,
      status: 'running',
      result: null,
      message: 'Payment processing workflow started successfully',
      statusUrl: `/api/workflows/payment-processing/status?workflowId=${workflowId}`,
    });

  } catch (error) {
    console.error('Failed to start Payment Processing workflow:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to start payment processing workflow',
      message: error instanceof Error ? error.message : 'Unknown error',
      troubleshooting: 'Make sure Temporal server is running and all required fields are provided',
    }, { status: 500 });
  }
}
