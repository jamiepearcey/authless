
"use client";

import { useSearchParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@ui/base';
import { Button } from '@ui/base';
import { AlertCircle, ArrowLeft, Home, RefreshCw } from 'lucide-react';
import Link from 'next/link';

// Error code mappings
const ERROR_MESSAGES = {
  'order_creation_failed': {
    title: 'Order Creation Failed',
    description: 'We encountered an issue while creating your order. This could be due to a temporary system problem or payment processing issue.',
    suggestion: 'Please try again or contact support if the problem persists.',
    icon: '🛒',
    severity: 'error' as const,
  },
  'payment_failed': {
    title: 'Payment Failed',
    description: 'Your payment could not be processed. This might be due to insufficient funds, an expired card, or a temporary issue with your bank.',
    suggestion: 'Please check your payment details and try again.',
    icon: '💳',
    severity: 'error' as const,
  },
  'session_expired': {
    title: 'Session Expired',
    description: 'Your session has expired for security reasons. Please log in again to continue.',
    suggestion: 'Click the button below to return to the login page.',
    icon: '⏰',
    severity: 'warning' as const,
  },
  'access_denied': {
    title: 'Access Denied',
    description: 'You do not have permission to access this resource.',
    suggestion: 'Please contact your administrator if you believe this is an error.',
    icon: '🔒',
    severity: 'error' as const,
  },
  'not_found': {
    title: 'Page Not Found',
    description: 'The page you are looking for does not exist or has been moved.',
    suggestion: 'Check the URL or use the navigation to find what you need.',
    icon: '🔍',
    severity: 'info' as const,
  },
  'server_error': {
    title: 'Server Error',
    description: 'We are experiencing technical difficulties. Our team has been notified and is working to resolve the issue.',
    suggestion: 'Please try again in a few minutes.',
    icon: '⚙️',
    severity: 'error' as const,
  },
  'network_error': {
    title: 'Network Error',
    description: 'Unable to connect to our servers. Please check your internet connection.',
    suggestion: 'Verify your connection and try again.',
    icon: '🌐',
    severity: 'warning' as const,
  },
  'validation_error': {
    title: 'Invalid Input',
    description: 'The information you provided is not valid. Please check your input and try again.',
    suggestion: 'Review the form fields and ensure all required information is provided correctly.',
    icon: '📝',
    severity: 'warning' as const,
  },
  'rate_limited': {
    title: 'Too Many Requests',
    description: 'You have made too many requests in a short period. Please wait a moment before trying again.',
    suggestion: 'Wait a few minutes and then try your request again.',
    icon: '⏳',
    severity: 'warning' as const,
  },
  'maintenance_mode': {
    title: 'System Maintenance',
    description: 'We are currently performing scheduled maintenance to improve our service.',
    suggestion: 'Please check back in a few hours.',
    icon: '🔧',
    severity: 'info' as const,
  },
} as const;

type ErrorCode = keyof typeof ERROR_MESSAGES;

interface ErrorPageProps {
  params: {
    errorCode: string;
  };
}

export default function ErrorPage({ params }: ErrorPageProps) {
  const searchParams = useSearchParams();
  const errorCode = params.errorCode as ErrorCode;
  const returnUrl = searchParams.get('returnUrl') || '/';
  const details = searchParams.get('details');

  // Get error message or default to server error
  const errorInfo = ERROR_MESSAGES[errorCode] || ERROR_MESSAGES['server_error'];

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'error':
        return 'text-red-600 bg-red-50 border-red-200';
      case 'warning':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'info':
        return 'text-blue-600 bg-blue-50 border-blue-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'error':
        return <AlertCircle className="h-6 w-6 text-red-600" />;
      case 'warning':
        return <AlertCircle className="h-6 w-6 text-yellow-600" />;
      case 'info':
        return <AlertCircle className="h-6 w-6 text-blue-600" />;
      default:
        return <AlertCircle className="h-6 w-6 text-gray-600" />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <Card className={`border-2 ${getSeverityColor(errorInfo.severity)}`}>
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              {getSeverityIcon(errorInfo.severity)}
            </div>
            <CardTitle className="text-xl">{errorInfo.title}</CardTitle>
            <CardDescription className="text-base">
              {errorInfo.description}
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-6">
            {details && (
              <div className="bg-gray-100 p-3 rounded-md">
                <p className="text-sm text-gray-600 font-mono break-all">
                  {details}
                </p>
              </div>
            )}
            
            <div className="bg-gray-50 p-4 rounded-md">
              <p className="text-sm text-gray-700">
                <strong>Suggestion:</strong> {errorInfo.suggestion}
              </p>
            </div>

          </CardContent>
        </Card>

        <div className="text-center text-sm text-gray-500">
          <p>Error Code: <code className="bg-gray-100 px-2 py-1 rounded">{errorCode}</code></p>
          <p className="mt-1">
            If this problem persists, please{' '}
            <Link href="/contact" className="text-blue-600 hover:text-blue-800 underline">
              contact support
            </Link>
            {' '}with this error code.
          </p>
        </div>
      </div>
    </div>
  );
}
