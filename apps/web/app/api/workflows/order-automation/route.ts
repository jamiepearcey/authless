/**
 * Order Automation Workflow API Route
 * 
 * Triggers order automation workflows via HTTP POST requests.
 * Example: POST /api/workflows/order-automation
 */

import { NextRequest, NextResponse } from 'next/server';

// Import Temporal client functions
async function startOrderAutomationWorkflow(params: any, workflowId?: string) {
  try {
    const { startOrderAutomationWorkflow } = await import('@authless/workflows/client');
    return await startOrderAutomationWorkflow(params, workflowId);
  } catch (error) {
    console.error('Failed to start order automation workflow:', error);
    throw new Error('Failed to start order automation workflow. Make sure Temporal server is running.');
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate required fields
    const requiredFields = ['orderNumber', 'totalAmount', 'currency', 'description'];
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

    // Validate business logic: orders are either user-to-tenant or tenant-to-platform
    // User Order: user buying from tenant (requires tenantId, userId is the buyer)
    // Tenant Order: tenant buying from platform (requires userId for billing/admin, tenantId is the buyer)
    if (!body.userId && !body.tenantId) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Missing required field: userId or tenantId',
          message: 'Please provide either userId (for tenant orders) or tenantId (for user orders)'
        },
        { status: 400 }
      );
    }

    // Prepare workflow parameters
    const workflowParams = {
      userId: body.userId,
      tenantId: body.tenantId,
      orderNumber: body.orderNumber,
      totalAmount: Number(body.totalAmount),
      currency: body.currency,
      isSubscription: Boolean(body.isSubscription),
      subscriptionFrequency: body.subscriptionFrequency || 'MONTHLY',
      description: body.description,
      metadata: body.metadata || {},
      // Payment processing parameters
      paymentIntentId: body.paymentIntentId,
      processPayment: Boolean(body.processPayment),
    };

    // Log workflow parameters for debugging
    console.log('🚀 Starting order automation workflow with params:', {
      orderNumber: workflowParams.orderNumber,
      totalAmount: workflowParams.totalAmount,
      currency: workflowParams.currency,
      isSubscription: workflowParams.isSubscription,
      paymentIntentId: workflowParams.paymentIntentId,
      processPayment: workflowParams.processPayment,
      userId: workflowParams.userId,
      tenantId: workflowParams.tenantId,
    });

    // Validate input
    if (workflowParams.totalAmount <= 0) {
      return NextResponse.json(
        { error: 'Total amount must be greater than 0' },
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

    if (workflowParams.isSubscription && !['MONTHLY', 'QUARTERLY', 'YEARLY'].includes(workflowParams.subscriptionFrequency)) {
      return NextResponse.json(
        { error: 'Subscription frequency must be MONTHLY, QUARTERLY, or YEARLY' },
        { status: 400 }
      );
    }

    console.log('🚀 Starting Order Automation workflow:', workflowParams);

    // Start the workflow
    const { workflowId, result } = await startOrderAutomationWorkflow(
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
          message: 'Order automation workflow completed successfully',
        });
      } catch (workflowError) {
        console.error('Order automation workflow execution failed:', workflowError);
        
        return NextResponse.json({
          success: false,
          workflowId,
          status: 'failed',
          error: 'Order automation workflow execution failed',
          message: workflowError instanceof Error ? workflowError.message : 'Unknown workflow error',
        }, { status: 500 });
      }
    }

    return NextResponse.json({
      success: true,
      workflowId,
      status: 'running',
      result: null,
      message: 'Order automation workflow started successfully',
      statusUrl: `/api/workflows/order-automation/status?workflowId=${workflowId}`,
    });

  } catch (error) {
    console.error('Failed to start Order Automation workflow:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to start order automation workflow',
      message: error instanceof Error ? error.message : 'Unknown error',
      troubleshooting: 'Make sure Temporal server is running and all required fields are provided',
    }, { status: 500 });
  }
}
