/**
 * User Onboarding Workflow API Route
 * 
 * Triggers user onboarding workflows via HTTP POST requests.
 * Example: POST /api/workflows/user-onboarding
 */

import { NextRequest, NextResponse } from 'next/server';

// Import Temporal client functions
async function startUserOnboardingWorkflow(params: any, workflowId?: string) {
  try {
    const { startUserOnboardingWorkflow } = await import('@authless/workflows/client');
    return await startUserOnboardingWorkflow(params, workflowId);
  } catch (error) {
    console.error('Failed to start user onboarding workflow:', error);
    throw new Error('Failed to start user onboarding workflow. Make sure Temporal server is running.');
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate required fields
    const requiredFields = ['userId', 'email', 'name', 'tenantId', 'emailVerificationToken'];
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
      email: body.email,
      name: body.name,
      tenantId: body.tenantId,
      emailVerificationToken: body.emailVerificationToken,
      skipEmailVerification: body.skipEmailVerification || false,
    };

    // Validate input
    if (workflowParams.email.length > 255) {
      return NextResponse.json(
        { error: 'Email parameter too long (max 255 characters)' },
        { status: 400 }
      );
    }

    if (workflowParams.name.length > 100) {
      return NextResponse.json(
        { error: 'Name parameter too long (max 100 characters)' },
        { status: 400 }
      );
    }

    console.log('🚀 Starting User Onboarding workflow:', workflowParams);

    // Start the workflow
    const { workflowId, result } = await startUserOnboardingWorkflow(
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
          message: 'User onboarding workflow completed successfully',
        });
      } catch (workflowError) {
        console.error('User onboarding workflow execution failed:', workflowError);
        
        return NextResponse.json({
          success: false,
          workflowId,
          status: 'failed',
          error: 'User onboarding workflow execution failed',
          message: workflowError instanceof Error ? workflowError.message : 'Unknown workflow error',
        }, { status: 500 });
      }
    }

    return NextResponse.json({
      success: true,
      workflowId,
      status: 'running',
      result: null,
      message: 'User onboarding workflow started successfully',
      statusUrl: `/api/workflows/user-onboarding/status?workflowId=${workflowId}`,
    });

  } catch (error) {
    console.error('Failed to start User Onboarding workflow:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to start user onboarding workflow',
      message: error instanceof Error ? error.message : 'Unknown error',
      troubleshooting: 'Make sure Temporal server is running and all required fields are provided',
    }, { status: 500 });
  }
}
