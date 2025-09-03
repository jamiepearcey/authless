'use client';

/**
 * Temporal Workflows Demo Page
 * 
 * Simple interface to test Temporal workflow integration
 */

import { useState } from 'react';
import { Button, Input, Card, CardContent, CardDescription, CardHeader, CardTitle, Badge } from '@ui/base';
import { Loader2, Play, CheckCircle, XCircle, Clock } from 'lucide-react';

interface WorkflowResult {
  success: boolean;
  workflowId: string;
  status: 'running' | 'completed' | 'failed';
  result?: {
    greeting: string;
    randomFact?: string;
    executionTime: number;
    workflowId: string;
  };
  message?: string;
  error?: string;
}

export default function WorkflowsDemo() {
  const [name, setName] = useState('World');
  const [includeRandomFact, setIncludeRandomFact] = useState(true);
  const [pushToOutboxAfter, setPushToOutboxAfter] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [workflowResult, setWorkflowResult] = useState<WorkflowResult | null>(null);
  const [isPolling, setIsPolling] = useState(false);

  const startWorkflow = async (waitForResult = false) => {
    setIsLoading(true);
    setWorkflowResult(null);

    try {
      const params = new URLSearchParams({
        name,
        includeRandomFact: includeRandomFact.toString(),
        pushToOutboxAfter: pushToOutboxAfter.toString(),
        wait: waitForResult.toString(),
      });

      const response = await fetch(`/api/workflows/hello?${params}`);
      const result = await response.json();

      setWorkflowResult(result);

      // If workflow is running and we're not waiting, start polling
      if (!waitForResult && result.status === 'running') {
        pollWorkflowStatus(result.workflowId);
      }
    } catch (error) {
      setWorkflowResult({
        success: false,
        workflowId: '',
        status: 'failed',
        error: 'Network error',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const pollWorkflowStatus = async (workflowId: string) => {
    setIsPolling(true);
    
    const poll = async () => {
      try {
        const response = await fetch(`/api/workflows/hello/status?workflowId=${workflowId}`);
        const result = await response.json();
        
        setWorkflowResult(result);
        
        if (result.status === 'running') {
          // Continue polling every 2 seconds
          setTimeout(poll, 2000);
        } else {
          setIsPolling(false);
        }
      } catch (error) {
        console.error('Polling error:', error);
        setIsPolling(false);
      }
    };
    
    poll();
  };

  const getStatusIcon = (status?: string) => {
    switch (status) {
      case 'running':
        return <Clock className="h-4 w-4" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4" />;
      case 'failed':
        return <XCircle className="h-4 w-4" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'running':
        return 'bg-blue-100 text-blue-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="container mx-auto py-8 px-4 max-w-2xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Temporal Workflows Demo</h1>
        <p className="text-muted-foreground">
          Test the integration between Next.js and Temporal workflows. This demo shows how to trigger 
          workflows via HTTP requests and integrate with your existing outbox pattern.
        </p>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Hello World Workflow</CardTitle>
          <CardDescription>
            A simple workflow that demonstrates basic Temporal concepts with activities and optional outbox integration.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium mb-1">
              Name
            </label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter a name..."
              className="w-full"
            />
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="randomFact"
              checked={includeRandomFact}
              onChange={(e) => setIncludeRandomFact(e.target.checked)}
              className="rounded"
            />
            <label htmlFor="randomFact" className="text-sm">
              Include random fact about Temporal
            </label>
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="pushToOutbox"
              checked={pushToOutboxAfter}
              onChange={(e) => setPushToOutboxAfter(e.target.checked)}
              className="rounded"
            />
            <label htmlFor="pushToOutbox" className="text-sm">
              Push completion event to outbox (integrates with your existing event architecture)
            </label>
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              onClick={() => startWorkflow(false)}
              disabled={isLoading || isPolling}
              className="flex-1"
            >
              {isLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Play className="mr-2 h-4 w-4" />
              )}
              Start Workflow (Async)
            </Button>
            
            <Button
              onClick={() => startWorkflow(true)}
              disabled={isLoading || isPolling}
              variant="outline"
              className="flex-1"
            >
              {isLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Play className="mr-2 h-4 w-4" />
              )}
              Start & Wait
            </Button>
          </div>
        </CardContent>
      </Card>

      {workflowResult && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                Workflow Result
                {getStatusIcon(workflowResult.status)}
              </CardTitle>
              <Badge className={getStatusColor(workflowResult.status)}>
                {workflowResult.status}
                {isPolling && <Loader2 className="ml-1 h-3 w-3 animate-spin" />}
              </Badge>
            </div>
            <CardDescription>
              Workflow ID: <code className="text-xs bg-muted px-1 py-0.5 rounded">{workflowResult.workflowId}</code>
            </CardDescription>
          </CardHeader>
          <CardContent>
            {workflowResult.success ? (
              <div className="space-y-3">
                {workflowResult.message && (
                  <p className="text-sm text-muted-foreground">{workflowResult.message}</p>
                )}
                
                {workflowResult.result && (
                  <div className="bg-muted p-4 rounded-lg">
                    <h4 className="font-medium mb-2">Workflow Output:</h4>
                    <div className="space-y-2 text-sm">
                      <p><strong>Greeting:</strong> {workflowResult.result.greeting}</p>
                      {workflowResult.result.randomFact && (
                        <p><strong>Random Fact:</strong> {workflowResult.result.randomFact}</p>
                      )}
                      <p><strong>Execution Time:</strong> {workflowResult.result.executionTime}ms</p>
                    </div>
                  </div>
                )}

                {workflowResult.status === 'running' && (
                  <div className="bg-blue-50 border border-blue-200 p-3 rounded-lg">
                    <p className="text-sm text-blue-800">
                      🔄 Workflow is running... Status will update automatically.
                    </p>
                  </div>
                )}

                {workflowResult.status === 'completed' && pushToOutboxAfter && (
                  <div className="bg-green-50 border border-green-200 p-3 rounded-lg">
                    <p className="text-sm text-green-800">
                      ✅ Workflow completed and event pushed to outbox! Check your audit service logs.
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-red-50 border border-red-200 p-4 rounded-lg">
                <h4 className="font-medium text-red-900 mb-2">Error</h4>
                <p className="text-sm text-red-800 mb-2">{workflowResult.message}</p>
                {workflowResult.error && (
                  <p className="text-xs text-red-600 font-mono bg-red-100 p-2 rounded">
                    {workflowResult.error}
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <div className="mt-8 text-sm text-muted-foreground">
        <h3 className="font-medium mb-2">How to use:</h3>
        <ol className="list-decimal list-inside space-y-1">
          <li>Make sure Temporal is running: <code>docker compose up -d temporal</code></li>
          <li>Start the workflow worker: <code>cd workflows && pnpm run worker:dev</code></li>
          <li>Configure your parameters above and click "Start Workflow"</li>
          <li>Visit <a href="http://localhost:8233" target="_blank" className="text-blue-600 hover:underline">http://localhost:8233</a> to see the Temporal Web UI</li>
        </ol>
      </div>
    </div>
  );
}