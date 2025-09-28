import { NextRequest, NextResponse } from 'next/server';

async function startRecurringBillingWorkflowHandler(params: any, workflowId?: string) {
  try {
    const { startRecurringBillingWorkflow } = await import('@authless/workflows/client');
    return await startRecurringBillingWorkflow(params, workflowId);
  } catch (error) {
    console.error('Failed to start recurring billing workflow:', error);
    throw new Error('Failed to start recurring billing workflow. Make sure Temporal server is running.');
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate required parameters
    if (!body) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing request body',
          message: 'Please provide workflow parameters'
        },
        { status: 400 }
      );
    }

    const workflowParams = {
      tenantId: body.tenantId,
      userId: body.userId,
      dryRun: body.dryRun || false,
    };

    const { workflowId, result } = await startRecurringBillingWorkflowHandler(
      workflowParams,
      body.workflowId
    );

    return NextResponse.json({
      success: true,
      workflowId,
      message: 'Recurring billing workflow started successfully',
      result: await result, // Wait for the result
    });

  } catch (error) {
    console.error('Recurring billing workflow error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        message: 'Failed to start recurring billing workflow'
      },
      { status: 500 }
    );
  }
}
