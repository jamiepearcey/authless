import { NextRequest, NextResponse } from 'next/server';
import { getRecurringBillingWorkflowStatus } from '@authless/workflows/client';

async function getRecurringBillingWorkflowStatusHandler(workflowId: string) {
  try {
    const { getRecurringBillingWorkflowStatus } = await import('@authless/workflows/client');
    return await getRecurringBillingWorkflowStatus(workflowId);
  } catch (error) {
    console.error('Failed to get recurring billing workflow status:', error);
    throw new Error('Failed to get recurring billing workflow status. Make sure Temporal server is running.');
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const workflowId = searchParams.get('workflowId');

    if (!workflowId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing workflowId parameter',
          message: 'Please provide a workflowId to check status'
        },
        { status: 400 }
      );
    }

    const statusResult = await getRecurringBillingWorkflowStatusHandler(workflowId);

    return NextResponse.json({
      success: true,
      workflowId,
      status: statusResult.status,
      message: statusResult.message,
      result: statusResult.result,
    });

  } catch (error) {
    console.error('Recurring billing workflow status error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        message: 'Failed to get recurring billing workflow status'
      },
      { status: 500 }
    );
  }
}
