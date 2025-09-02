/**
 * Workflow Status API Route
 * 
 * Check the status and get results of running workflows.
 * Example: GET /api/workflows/hello/status?workflowId=hello-World-1234567890
 */

import { NextRequest, NextResponse } from 'next/server';

async function getWorkflowResult(workflowId: string) {
  try {
    const { getWorkflowResult } = await import('@authless/workflows/client');
    return await getWorkflowResult(workflowId);
  } catch (error) {
    console.error('Failed to get workflow result:', error);
    throw error;
  }
}

async function isWorkflowRunning(workflowId: string) {
  try {
    const { isWorkflowRunning } = await import('@authless/workflows/client');
    return await isWorkflowRunning(workflowId);
  } catch (error) {
    console.error('Failed to check workflow status:', error);
    throw error;
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
          message: 'Please provide a workflowId query parameter'
        },
        { status: 400 }
      );
    }

    console.log('🔍 Checking workflow status:', workflowId);

    // Check if workflow is still running
    const isRunning = await isWorkflowRunning(workflowId);

    if (isRunning) {
      return NextResponse.json({
        success: true,
        workflowId,
        status: 'running',
        result: null,
        message: 'Workflow is still running',
      });
    }

    // Workflow has completed, get the result
    try {
      const result = await getWorkflowResult(workflowId);
      
      return NextResponse.json({
        success: true,
        workflowId,
        status: 'completed',
        result,
        message: 'Workflow completed successfully',
      });
    } catch (resultError) {
      // Workflow might have failed
      console.error('Failed to get workflow result:', resultError);
      
      return NextResponse.json({
        success: false,
        workflowId,
        status: 'failed',
        result: null,
        error: 'Workflow failed or not found',
        message: resultError instanceof Error ? resultError.message : 'Unknown error',
      }, { status: 404 });
    }

  } catch (error) {
    console.error('Failed to check workflow status:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to check workflow status',
      message: error instanceof Error ? error.message : 'Unknown error',
      troubleshooting: 'Make sure Temporal server is running and the workflow ID is correct',
    }, { status: 500 });
  }
}