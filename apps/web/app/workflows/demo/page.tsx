'use client';

/**
 * Temporal Workflows Comprehensive Tester
 * 
 * Advanced interface to test all Temporal workflow integrations including:
 * - Hello World workflow
 * - Payment Processing workflow  
 * - User Onboarding workflow
 * - Order/Invoice/Payment automation workflows
 */

import { useState, useEffect } from 'react';
import { Button, Input, Card, CardContent, CardDescription, CardHeader, CardTitle, Badge, Textarea, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@ui/base';
import { Loader2, Play, CheckCircle, XCircle, Clock, CreditCard, User, ShoppingCart, Zap, Building } from 'lucide-react';
import { trpc } from "@/lib/trpc";

interface WorkflowResult {
  success: boolean;
  workflowId: string;
  status: 'running' | 'completed' | 'failed';
  result?: any;
  message?: string;
  error?: string;
}

interface WorkflowUser {
  id: string;
  name: string | null;
  email: string | null;
  platformRole: string | null;
}

interface WorkflowTenant {
  id: string;
  name: string;
  slug: string;
  status: string;
  plan: string | null;
}

type WorkflowType = 'hello' | 'user-onboarding' | 'order-automation' | 'recurring-billing';

// Helper component for user/tenant selector
const UserTenantSelector = ({ 
  orderType, 
  userId, 
  tenantId, 
  onUserChange, 
  onTenantChange,
  users,
  tenants,
  usersLoading,
  tenantsLoading,
  usersError,
  tenantsError
}: {
  orderType: 'user' | 'tenant';
  userId: string;
  tenantId: string;
  onUserChange: (value: string) => void;
  onTenantChange: (value: string) => void;
  users?: WorkflowUser[];
  tenants?: WorkflowTenant[];
  usersLoading: boolean;
  tenantsLoading: boolean;
  usersError: any;
  tenantsError: any;
}) => (
  <div>
    <label className="block text-sm font-medium mb-1">
      {orderType === 'user' ? 'Select User' : 'Select Tenant'}
    </label>
    {orderType === 'user' ? (
      <div>
        <Select 
          value={userId} 
          onValueChange={onUserChange}
          disabled={usersLoading}
        >
          <SelectTrigger>
            <SelectValue placeholder={usersLoading ? "Loading users..." : "Choose a user"} />
          </SelectTrigger>
          <SelectContent>
            {users?.map((user: WorkflowUser) => (
              <SelectItem key={user.id} value={user.id}>
                <div className="flex items-center space-x-2">
                  <User className="h-3 w-3" />
                  <span>{user.name || user.email}</span>
                  <span className="text-xs text-gray-500">({user.email})</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {usersError && (
          <p className="text-xs text-red-600 mt-1">Error loading users: {usersError.message}</p>
        )}
        {!usersLoading && users?.length === 0 && (
          <p className="text-xs text-yellow-600 mt-1">No users found</p>
        )}
      </div>
    ) : (
      <div>
        <Select 
          value={tenantId} 
          onValueChange={onTenantChange}
          disabled={tenantsLoading}
        >
          <SelectTrigger>
            <SelectValue placeholder={tenantsLoading ? "Loading tenants..." : "Choose a tenant"} />
          </SelectTrigger>
          <SelectContent>
            {tenants?.map((tenant: WorkflowTenant) => (
              <SelectItem key={tenant.id} value={tenant.id}>
                <div className="flex items-center space-x-2">
                  <Building className="h-3 w-3" />
                  <span>{tenant.name}</span>
                  <span className="text-xs text-gray-500">({tenant.slug})</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {tenantsError && (
          <p className="text-xs text-red-600 mt-1">Error loading tenants: {tenantsError.message}</p>
        )}
        {!tenantsLoading && tenants?.length === 0 && (
          <p className="text-xs text-yellow-600 mt-1">No tenants found</p>
        )}
      </div>
    )}
  </div>
);

export default function WorkflowsTester() {
  const [selectedWorkflow, setSelectedWorkflow] = useState<WorkflowType>('hello');
  const [isLoading, setIsLoading] = useState(false);
  const [workflowResult, setWorkflowResult] = useState<WorkflowResult | null>(null);
  const [isPolling, setIsPolling] = useState(false);

  // Fetch users and tenants for workflow testing
  const { data: users, isLoading: usersLoading, error: usersError } = trpc.getUsersForWorkflow.useQuery({ limit: 15 });
  const { data: tenants, isLoading: tenantsLoading, error: tenantsError } = trpc.getTenantsForWorkflow.useQuery({ limit: 15 });


  // Selected user and tenant for recurring billing workflow
  const [selectedUser, setSelectedUser] = useState<WorkflowUser | null>(null);
  const [selectedTenant, setSelectedTenant] = useState<WorkflowTenant | null>(null);

  // Hello World workflow params
  const [name, setName] = useState('World');
  const [includeRandomFact, setIncludeRandomFact] = useState(true);
  const [pushToOutboxAfter, setPushToOutboxAfter] = useState(true);


  // User Onboarding workflow params
  const [onboardingParams, setOnboardingParams] = useState({
    orderType: 'user' as 'user' | 'tenant',
    userId: '',
    email: 'test@example.com',
    name: 'Test User',
    tenantId: '',
    emailVerificationToken: 'verify_token_123',
    skipEmailVerification: true,
  });

  // Order Automation workflow params
  const [orderParams, setOrderParams] = useState({
    orderType: 'user' as 'user' | 'tenant',
    userId: '',
    tenantId: '',
    orderNumber: 'ORD-001',
    totalAmount: 4999,
    currency: 'USD',
    isSubscription: true,
    subscriptionFrequency: 'MONTHLY',
    description: 'Test order automation',
  });

  // Set default user/tenant when data loads
  useEffect(() => {
    if (users && users.length > 0) {
      setOnboardingParams(prev => ({ ...prev, userId: users[0].id }));
      setOrderParams(prev => ({ ...prev, userId: users[0].id }));
    }
  }, [users]);

  useEffect(() => {
    if (tenants && tenants.length > 0) {
      setOnboardingParams(prev => ({ ...prev, tenantId: tenants[0].id }));
      setOrderParams(prev => ({ ...prev, tenantId: tenants[0].id }));
    }
  }, [tenants]);

  const startWorkflow = async (waitForResult = false) => {
    setIsLoading(true);
    setWorkflowResult(null);

    try {
      let endpoint = '';
      let body: any = {};

      switch (selectedWorkflow) {
        case 'hello':
          endpoint = '/api/workflows/hello';
          body = {
            name,
            includeRandomFact,
            pushToOutboxAfter,
            wait: waitForResult,
          };
          break;


        case 'user-onboarding':
          endpoint = '/api/workflows/user-onboarding';
            body = {
              ...onboardingParams,
              // Business logic: User Onboarding = platform user registration (needs userId)
              // Tenant Onboarding = tenant user registration (needs tenantId)
              userId: onboardingParams.orderType === 'user' ? onboardingParams.userId : undefined,
              tenantId: onboardingParams.orderType === 'tenant' ? onboardingParams.tenantId : undefined,
              waitForResult,
            };
            // Remove orderType from body as it's not needed by the API
            delete body.orderType;
          break;

        case 'order-automation':
          endpoint = '/api/workflows/order-automation';
            body = {
              ...orderParams,
              // Business logic: User Order = user buying from tenant (needs tenantId)
              // Tenant Order = tenant buying from platform (needs userId for billing)
              userId: orderParams.orderType === 'tenant' ? orderParams.userId : undefined,
              tenantId: orderParams.orderType === 'user' ? orderParams.tenantId : undefined,
              totalAmount: Number(orderParams.totalAmount),
              waitForResult,
            };
            // Remove orderType from body as it's not needed by the API
            delete body.orderType;
          break;

        case 'recurring-billing':
          endpoint = '/api/workflows/recurring-billing';
            body = {
              tenantId: selectedTenant?.id,
              userId: selectedUser?.id,
              dryRun: false,
              waitForResult,
            };
          break;
      }

      const params = new URLSearchParams();
      if (selectedWorkflow === 'hello') {
        Object.entries(body).forEach(([key, value]) => {
          params.append(key, String(value));
        });
      }

      const url = selectedWorkflow === 'hello' 
        ? `${endpoint}?${params}`
        : endpoint;

      const response = selectedWorkflow === 'hello'
        ? await fetch(url)
        : await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
          });

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
        const endpoint = `/api/workflows/${selectedWorkflow}/status?workflowId=${workflowId}`;
        const response = await fetch(endpoint);
        const result = await response.json();
        
        setWorkflowResult(result);
        
        if (result.status === 'running') {
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

  const getWorkflowIcon = (type: WorkflowType) => {
    switch (type) {
      case 'hello':
        return <Zap className="h-4 w-4" />;
      case 'user-onboarding':
        return <User className="h-4 w-4" />;
      case 'order-automation':
        return <ShoppingCart className="h-4 w-4" />;
      case 'recurring-billing':
        return <CreditCard className="h-4 w-4" />;
    }
  };

  const getWorkflowDescription = (type: WorkflowType) => {
    switch (type) {
      case 'hello':
        return 'Simple workflow demonstrating basic Temporal concepts with activities and optional outbox integration.';
      case 'user-onboarding':
        return 'Complete user onboarding workflow with email verification, profile setup, welcome emails, and initial data configuration.';
      case 'order-automation':
        return 'Automated order processing workflow that creates orders, generates invoices, processes payments, and sets up subscriptions.';
      case 'recurring-billing':
        return 'Processes recurring billing for subscription orders, creates invoices, attempts automatic payments, and handles billing notifications.';
    }
  };

  const renderWorkflowForm = () => {
    switch (selectedWorkflow) {
      case 'hello':
        return (
          <div className="space-y-4">
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
          </div>
        );


      case 'user-onboarding':
        return (
          <div className="space-y-4">
            {/* Order Type Selection */}
            <div>
              <label className="block text-sm font-medium mb-2">Onboarding Context</label>
              <div className="grid grid-cols-2 gap-4">
                <div 
                  className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                    onboardingParams.orderType === 'user' 
                      ? 'border-indigo-500 bg-indigo-50' 
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => setOnboardingParams({...onboardingParams, orderType: 'user'})}
                >
                  <div className="flex items-center space-x-2">
                    <input
                      type="radio"
                      checked={onboardingParams.orderType === 'user'}
                      onChange={() => setOnboardingParams({...onboardingParams, orderType: 'user'})}
                      className="text-indigo-600"
                    />
                    <User className="h-4 w-4" />
                    <span className="font-medium">User Onboarding</span>
                  </div>
                  <p className="text-xs text-gray-600 mt-1 ml-6">Platform user registration</p>
                </div>
                <div 
                  className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                    onboardingParams.orderType === 'tenant' 
                      ? 'border-indigo-500 bg-indigo-50' 
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => setOnboardingParams({...onboardingParams, orderType: 'tenant'})}
                >
                  <div className="flex items-center space-x-2">
                    <input
                      type="radio"
                      checked={onboardingParams.orderType === 'tenant'}
                      onChange={() => setOnboardingParams({...onboardingParams, orderType: 'tenant'})}
                      className="text-indigo-600"
                    />
                    <Building className="h-4 w-4" />
                    <span className="font-medium">Tenant Onboarding</span>
                  </div>
                  <p className="text-xs text-gray-600 mt-1 ml-6">Tenant user registration</p>
                </div>
              </div>
            </div>

            {/* Dynamic ID Selector */}
            <UserTenantSelector
              orderType={onboardingParams.orderType}
              userId={onboardingParams.userId}
              tenantId={onboardingParams.tenantId}
              onUserChange={(value) => setOnboardingParams({...onboardingParams, userId: value})}
              onTenantChange={(value) => setOnboardingParams({...onboardingParams, tenantId: value})}
              users={users}
              tenants={tenants}
              usersLoading={usersLoading}
              tenantsLoading={tenantsLoading}
              usersError={usersError}
              tenantsError={tenantsError}
            />

            <div>
              <label className="block text-sm font-medium mb-1">Email</label>
              <Input
                type="email"
                value={onboardingParams.email}
                onChange={(e) => setOnboardingParams({...onboardingParams, email: e.target.value})}
                placeholder="test@example.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Name</label>
              <Input
                value={onboardingParams.name}
                onChange={(e) => setOnboardingParams({...onboardingParams, name: e.target.value})}
                placeholder="Test User"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Email Verification Token</label>
              <Input
                value={onboardingParams.emailVerificationToken}
                onChange={(e) => setOnboardingParams({...onboardingParams, emailVerificationToken: e.target.value})}
                placeholder="verify_token_123"
              />
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="skipEmailVerification"
                checked={onboardingParams.skipEmailVerification}
                onChange={(e) => setOnboardingParams({...onboardingParams, skipEmailVerification: e.target.checked})}
                className="rounded"
              />
              <label htmlFor="skipEmailVerification" className="text-sm">
                Skip email verification (for testing)
              </label>
            </div>
          </div>
        );

      case 'order-automation':
        return (
          <div className="space-y-4">
            {/* Order Type Selection */}
            <div>
              <label className="block text-sm font-medium mb-2">Order Association</label>
              <div className="grid grid-cols-2 gap-4">
                <div 
                  className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                    orderParams.orderType === 'user' 
                      ? 'border-indigo-500 bg-indigo-50' 
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => setOrderParams({...orderParams, orderType: 'user'})}
                >
                  <div className="flex items-center space-x-2">
                    <input
                      type="radio"
                      checked={orderParams.orderType === 'user'}
                      onChange={() => setOrderParams({...orderParams, orderType: 'user'})}
                      className="text-indigo-600"
                    />
                    <User className="h-4 w-4" />
                    <span className="font-medium">User Order</span>
                  </div>
                   <p className="text-xs text-gray-600 mt-1 ml-6">User buying from a tenant</p>
                </div>
                <div 
                  className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                    orderParams.orderType === 'tenant' 
                      ? 'border-indigo-500 bg-indigo-50' 
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => setOrderParams({...orderParams, orderType: 'tenant'})}
                >
                  <div className="flex items-center space-x-2">
                    <input
                      type="radio"
                      checked={orderParams.orderType === 'tenant'}
                      onChange={() => setOrderParams({...orderParams, orderType: 'tenant'})}
                      className="text-indigo-600"
                    />
                    <Building className="h-4 w-4" />
                    <span className="font-medium">Tenant Order</span>
                  </div>
                   <p className="text-xs text-gray-600 mt-1 ml-6">Tenant buying from platform</p>
                </div>
              </div>
            </div>

            {/* Dynamic ID Selector */}
            <UserTenantSelector
              orderType={orderParams.orderType}
              userId={orderParams.userId}
              tenantId={orderParams.tenantId}
              onUserChange={(value) => setOrderParams({...orderParams, userId: value})}
              onTenantChange={(value) => setOrderParams({...orderParams, tenantId: value})}
              users={users}
              tenants={tenants}
              usersLoading={usersLoading}
              tenantsLoading={tenantsLoading}
              usersError={usersError}
              tenantsError={tenantsError}
            />

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Order Number</label>
                <Input
                  value={orderParams.orderNumber}
                  onChange={(e) => setOrderParams({...orderParams, orderNumber: e.target.value})}
                  placeholder="ORD-001"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Amount (cents)</label>
                <Input
                  type="number"
                  value={orderParams.totalAmount}
                  onChange={(e) => setOrderParams({...orderParams, totalAmount: Number(e.target.value)})}
                  placeholder="4999"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Currency</label>
                <Select value={orderParams.currency} onValueChange={(value) => setOrderParams({...orderParams, currency: value})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USD">USD</SelectItem>
                    <SelectItem value="EUR">EUR</SelectItem>
                    <SelectItem value="GBP">GBP</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Subscription Frequency</label>
                <Select value={orderParams.subscriptionFrequency} onValueChange={(value) => setOrderParams({...orderParams, subscriptionFrequency: value})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MONTHLY">Monthly</SelectItem>
                    <SelectItem value="QUARTERLY">Quarterly</SelectItem>
                    <SelectItem value="YEARLY">Yearly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Description</label>
              <Input
                value={orderParams.description}
                onChange={(e) => setOrderParams({...orderParams, description: e.target.value})}
                placeholder="Test order automation"
              />
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="isSubscription"
                checked={orderParams.isSubscription}
                onChange={(e) => setOrderParams({...orderParams, isSubscription: e.target.checked})}
                className="rounded"
              />
              <label htmlFor="isSubscription" className="text-sm">
                Create subscription (recurring billing)
              </label>
            </div>
          </div>
        );

      case 'recurring-billing':
        return (
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
              <h4 className="font-medium text-blue-900 mb-2">Recurring Billing Workflow</h4>
              <p className="text-sm text-blue-800 mb-3">
                This workflow finds subscription orders that are due for billing, creates invoices, 
                attempts automatic payments via Stripe, and sends appropriate notifications.
              </p>
              <div className="text-xs text-blue-700">
                <strong>Note:</strong> This workflow processes existing subscription orders. 
                Make sure you have active subscriptions in your database to see results.
              </div>
            </div>

            {/* Scope Selection */}
            <div>
              <label className="block text-sm font-medium mb-2">Billing Scope</label>
              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-2">
                  <label className="flex items-center space-x-2">
                    <input
                      type="radio"
                      name="billingScope"
                      value="all"
                      checked={!selectedUser?.id && !selectedTenant?.id}
                      onChange={() => {
                        setSelectedUser(null);
                        setSelectedTenant(null);
                      }}
                      className="text-blue-600"
                    />
                    <span className="text-sm">Process all due subscriptions (platform-wide)</span>
                  </label>
                  
                  <label className="flex items-center space-x-2">
                    <input
                      type="radio"
                      name="billingScope"
                      value="tenant"
                      checked={!!selectedTenant?.id}
                      onChange={() => {
                        setSelectedUser(null);
                      }}
                      className="text-blue-600"
                    />
                    <span className="text-sm">Process subscriptions for specific tenant</span>
                  </label>
                  
                  <label className="flex items-center space-x-2">
                    <input
                      type="radio"
                      name="billingScope"
                      value="user"
                      checked={!!selectedUser?.id}
                      onChange={() => {
                        setSelectedTenant(null);
                      }}
                      className="text-blue-600"
                    />
                    <span className="text-sm">Process subscriptions for specific user</span>
                  </label>
                </div>
              </div>
            </div>

            {/* User/Tenant Selectors */}
            {(selectedUser?.id || selectedTenant?.id) && (
              <UserTenantSelector
                orderType={selectedTenant?.id ? 'tenant' : 'user'}
                userId={selectedUser?.id || ''}
                tenantId={selectedTenant?.id || ''}
                onUserChange={(userId) => {
                  const user = users?.find(u => u.id === userId);
                  setSelectedUser(user || null);
                }}
                onTenantChange={(tenantId) => {
                  const tenant = tenants?.find(t => t.id === tenantId);
                  setSelectedTenant(tenant || null);
                }}
                users={users}
                tenants={tenants}
                usersLoading={usersLoading}
                tenantsLoading={tenantsLoading}
                usersError={usersError}
                tenantsError={tenantsError}
              />
            )}

            <div className="bg-yellow-50 border border-yellow-200 p-3 rounded-lg">
              <p className="text-sm text-yellow-800">
                <strong>Preview Mode:</strong> This workflow will process real subscription orders and create actual invoices and payments. 
                Use with caution in production environments.
              </p>
            </div>
          </div>
        );

      default:
        return null;
    }
  };


  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Temporal Workflows Comprehensive Tester</h1>
        <p className="text-muted-foreground">
          Test all Temporal workflow integrations including payment processing, user onboarding, 
          and order automation workflows. This interface demonstrates how workflows integrate 
          with your existing outbox pattern and event-driven architecture.
        </p>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {getWorkflowIcon(selectedWorkflow)}
            Workflow Selection
          </CardTitle>
          <CardDescription>
            Choose which workflow to test and configure its parameters.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Select Workflow</label>
            <Select value={selectedWorkflow} onValueChange={(value: WorkflowType) => setSelectedWorkflow(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="hello">
                  <div className="flex items-center gap-2">
                    <Zap className="h-4 w-4" />
                    Hello World Workflow
                  </div>
                </SelectItem>
                <SelectItem value="user-onboarding">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    User Onboarding Workflow
                  </div>
                </SelectItem>
                <SelectItem value="order-automation">
                  <div className="flex items-center gap-2">
                    <ShoppingCart className="h-4 w-4" />
                    Order Automation Workflow
                  </div>
                </SelectItem>
                <SelectItem value="recurring-billing">
                  <div className="flex items-center gap-2">
                    <CreditCard className="h-4 w-4" />
                    Recurring Billing Workflow
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="bg-muted p-4 rounded-lg">
            <h4 className="font-medium mb-2">Workflow Description</h4>
            <p className="text-sm text-muted-foreground">
              {getWorkflowDescription(selectedWorkflow)}
            </p>
          </div>
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {getWorkflowIcon(selectedWorkflow)}
            {selectedWorkflow === 'hello' && 'Hello World Workflow'}
            {selectedWorkflow === 'user-onboarding' && 'User Onboarding Workflow'}
            {selectedWorkflow === 'order-automation' && 'Order Automation Workflow'}
            {selectedWorkflow === 'recurring-billing' && 'Recurring Billing Workflow'}
          </CardTitle>
          <CardDescription>
            {getWorkflowDescription(selectedWorkflow)}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {renderWorkflowForm()}

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
                    <pre className="text-sm overflow-auto">
                      {JSON.stringify(workflowResult.result, null, 2)}
                    </pre>
                  </div>
                )}

                {workflowResult.status === 'running' && (
                  <div className="bg-blue-50 border border-blue-200 p-3 rounded-lg">
                    <p className="text-sm text-blue-800">
                      🔄 Workflow is running... Status will update automatically.
                    </p>
                  </div>
                )}

                {workflowResult.status === 'completed' && (
                  <div className="bg-green-50 border border-green-200 p-3 rounded-lg">
                    <p className="text-sm text-green-800">
                      ✅ Workflow completed successfully! Check your audit service logs for event processing.
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
          <li>Ensure your database and NATS are running: <code>./dev.sh</code></li>
          <li>Select a workflow type and configure parameters above</li>
          <li>Click "Start Workflow" to test the integration</li>
          <li>Visit <a href="http://localhost:8233" target="_blank" className="text-blue-600 hover:underline">http://localhost:8233</a> to see the Temporal Web UI</li>
        </ol>
      </div>
    </div>
  );
}