/**
 * Order Automation Workflow Status API Route
 * 
 * Gets the status of an order automation workflow.
 * Example: GET /api/workflows/order-automation/status?workflowId=123
 */

import { NextRequest, NextResponse } from 'next/server';

// Import Temporal client functions
async function getOrderAutomationWorkflowStatus(workflowId: string) {
  try {
    const { getOrderAutomationWorkflowStatus } = await import('@authless/workflows/client');
    return await getOrderAutomationWorkflowStatus(workflowId);
  } catch (error) {
    console.error('Failed to get order automation workflow status:', error);
    throw new Error('Failed to get order automation workflow status. Make sure Temporal server is running.');
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
          message: 'Please provide a workflowId in the query string'
        },
        { status: 400 }
      );
    }

    console.log('🔍 Getting Order Automation workflow status:', workflowId);

    // Get workflow status
    const result = await getOrderAutomationWorkflowStatus(workflowId);

    return NextResponse.json({
      success: true,
      workflowId,
      status: result.status,
      result: result.result,
      message: result.message || `Order automation workflow is ${result.status}`,
    });

  } catch (error) {
    console.error('Failed to get Order Automation workflow status:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to get order automation workflow status',
      message: error instanceof Error ? error.message : 'Unknown error',
      troubleshooting: 'Make sure Temporal server is running and the workflowId is valid',
    }, { status: 500 });
  }
}
