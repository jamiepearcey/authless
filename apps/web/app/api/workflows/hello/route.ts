/**
 * Hello World Workflow API Route
 * 
 * Triggers Temporal workflows via HTTP GET requests.
 * Example: GET /api/workflows/hello?name=World&includeRandomFact=true
 */

import { NextRequest, NextResponse } from 'next/server';

// Import Temporal client functions
async function getTemporalClient() {
  try {
    // Dynamic import to avoid bundling issues
    const { getTemporalClient } = await import('@authless/workflows/client');
    return await getTemporalClient();
  } catch (error) {
    console.error('Failed to load Temporal client:', error);
    throw new Error('Temporal client not available. Make sure the worker is running.');
  }
}

async function startHelloWorkflow(params: any, workflowId?: string) {
  try {
    const { startHelloWorkflow } = await import('@authless/workflows/client');
    return await startHelloWorkflow(params, workflowId);
  } catch (error) {
    console.error('Failed to start workflow:', error);
    throw new Error('Failed to start workflow. Make sure Temporal server is running.');
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Extract parameters from query string
    const name = searchParams.get('name') || 'Anonymous';
    const includeRandomFact = searchParams.get('includeRandomFact') === 'true';
    const pushToOutboxAfter = searchParams.get('pushToOutboxAfter') === 'true';
    const workflowId = searchParams.get('workflowId') || undefined;
    const waitForResult = searchParams.get('wait') === 'true';

    // Validate input
    if (name.length > 100) {
      return NextResponse.json(
        { error: 'Name parameter too long (max 100 characters)' },
        { status: 400 }
      );
    }

    // Prepare workflow parameters
    const workflowParams = {
      name,
      includeRandomFact,
      pushToOutboxAfter,
    };

    console.log('🚀 Starting Hello World workflow:', workflowParams);

    // Start the workflow
    const { workflowId: actualWorkflowId, result } = await startHelloWorkflow(
      workflowParams,
      workflowId
    );

    // If wait=true, wait for the workflow to complete
    if (waitForResult) {
      try {
        const workflowResult = await result;
        
        return NextResponse.json({
          success: true,
          workflowId: actualWorkflowId,
          status: 'completed',
          result: workflowResult,
          message: 'Workflow completed successfully',
        });
      } catch (workflowError) {
        console.error('Workflow execution failed:', workflowError);
        
        return NextResponse.json({
          success: false,
          workflowId: actualWorkflowId,
          status: 'failed',
          error: 'Workflow execution failed',
          message: workflowError instanceof Error ? workflowError.message : 'Unknown workflow error',
        }, { status: 500 });
      }
    }

    // Return immediately without waiting for workflow completion
    return NextResponse.json({
      success: true,
      workflowId: actualWorkflowId,
      status: 'running',
      result: null,
      message: 'Workflow started successfully',
      statusUrl: `/api/workflows/hello/status?workflowId=${actualWorkflowId}`,
    });

  } catch (error) {
    console.error('Failed to start Hello World workflow:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const isTemporalError = errorMessage.includes('Temporal');
    
    return NextResponse.json({
      success: false,
      error: 'Failed to start workflow',
      message: errorMessage,
      troubleshooting: isTemporalError 
        ? 'Make sure Temporal server is running (docker compose up -d temporal) and the worker is started (cd workflows && pnpm run worker:dev)'
        : 'Check server logs for details',
    }, { status: 500 });
  }
}

// Also support POST for more complex parameters
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const workflowParams = {
      name: body.name || 'Anonymous',
      includeRandomFact: body.includeRandomFact || false,
      pushToOutboxAfter: body.pushToOutboxAfter || false,
    };

    // Validate input
    if (workflowParams.name.length > 100) {
      return NextResponse.json(
        { error: 'Name parameter too long (max 100 characters)' },
        { status: 400 }
      );
    }

    console.log('🚀 Starting Hello World workflow (POST):', workflowParams);

    const { workflowId, result } = await startHelloWorkflow(
      workflowParams,
      body.workflowId
    );

    // POST requests can optionally wait for completion
    if (body.waitForResult) {
      const workflowResult = await result;
      
      return NextResponse.json({
        success: true,
        workflowId,
        status: 'completed',
        result: workflowResult,
      });
    }

    return NextResponse.json({
      success: true,
      workflowId,
      status: 'running',
      result: null,
      statusUrl: `/api/workflows/hello/status?workflowId=${workflowId}`,
    });

  } catch (error) {
    console.error('Failed to start Hello World workflow (POST):', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to start workflow',
      message: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}